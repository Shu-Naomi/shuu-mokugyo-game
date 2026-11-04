const {test}=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs');
const ready=require('./browser-opening-art-ready.cjs'),{boot,seed,read}=require('./game-harness.cjs');
function controlledPage(document){
 let pending,disposed=0;
 const invoke=(fn,arg)=>vm.runInNewContext(`(${fn.toString()})`,{document})(arg);
 const page={
  evaluate:async fn=>invoke(fn),
  waitForFunction(fn,arg,options){
   assert.deepEqual(options,{timeout:15000,polling:50});
   return new Promise((resolve,reject)=>{pending={fn,arg,resolve,reject};page.poll();});
  },
  poll(){if(!pending)return;const value=invoke(pending.fn,pending.arg);if(value){const {resolve}=pending;pending=null;resolve({jsonValue:async()=>value,dispose:async()=>{disposed++;}});}},
  timeout(){assert.ok(pending);pending.reject(new Error('controlled 15000ms timeout'));pending=null;},
  get disposed(){return disposed;},
 };
 return page;
}
const flush=()=>new Promise(resolve=>setImmediate(resolve));
function controlledDecoder(){
 const pending=new Map(),timers=new Map();let next=0;
 const env={ShuLakeIntro:{art:{home:'old-home.webp',diaryTurn:'turn.webp'}},Image:function(){this.naturalWidth=640;this.naturalHeight=360;this.decode=()=>new Promise((resolve,reject)=>pending.set(this.src,{resolve,reject}));},
  setTimeout(fn,ms){assert.equal(ms,15000);const id=++next;timers.set(id,fn);return id;},clearTimeout(id){timers.delete(id);}};
 return {pending,timers,page:{evaluate:(fn,arg)=>vm.runInNewContext(`(${fn.toString()})`,env)(arg)},resolve(src){assert.ok(pending.has(src));pending.get(src).resolve();},timeout(){assert.equal(timers.size,1);[...timers.values()][0]();}};
}

test('asset validation includes and waits for the delayed selected painting after unrelated assets decode',async()=>{
 const d=controlledDecoder();let finished=false;
 const waiting=ready.decodeAssets(d.page,'girl-cling-grey.webp').then(assets=>{finished=true;return assets;});
 d.resolve('old-home.webp');d.resolve('turn.webp');await flush();assert.equal(finished,false);
 d.resolve('girl-cling-grey.webp');const assets=await waiting;
 assert.equal(assets.length,3);assert.ok(assets.some(a=>a.src==='girl-cling-grey.webp'&&a.width===640&&a.height===360));assert.equal(d.timers.size,0);
});
test('a missing or stalled selected decode fails explicitly within the decoder deadline',async()=>{
 for(const mode of ['missing','stalled']){
  const d=controlledDecoder(),waiting=ready.decodeAssets(d.page,'missing-selected.webp'),rejection=assert.rejects(waiting,mode==='missing'?/failed to decode: missing-selected.webp/:/did not decode within 15000ms.*missing-selected.webp/);
  d.resolve('old-home.webp');d.resolve('turn.webp');
  if(mode==='missing')d.pending.get('missing-selected.webp').reject(new Error('EncodingError'));else d.timeout();
  await rejection;assert.equal(d.timers.size,0);
 }
});

test('all six delayed selected paintings remain loading after the legacy preload and cannot reach the pixel check early',async()=>{
 for(const avatar of ['boy','girl'])for(const dog of ['shuu','riku','grey']){
  const a=boot({...seed(),avatar,dog},undefined,{start:false}),w=a.window,c=w.document.querySelector('#lakeIntroPicture'),images=[],painted=[];
  try{
   w.Image=function(){this.complete=false;this.naturalWidth=0;this.naturalHeight=0;this.decode=async()=>{this.complete=true;this.naturalWidth=640;this.naturalHeight=360;};images.push(this);};
   c.getContext('2d').drawImage=im=>painted.push(im.src);
   const state=read(w,'s'),step='cling',panel=w.ShuLakeIntro.panelFor(step,state),source=w.ShuLakeIntro.sourceFor(panel),expected={step,panel,source};
   const options={clock:{now:()=>0,request:()=>1,cancel:()=>{}},timers:{set:()=>1,clear:()=>{}}};
   let director=w.ShuLakeIntro.present(c,step,state,options);
   assert.ok(!Object.values(w.ShuLakeIntro.art).includes(source));
   for(const src of Object.values(w.ShuLakeIntro.art)){const im=new w.Image();im.src=src;await im.decode();}
   director.cancel();director=w.ShuLakeIntro.present(c,step,state,options);
   const page=controlledPage(w.document);let pixelsChecked=false;
   const waiting=ready(page,expected).then(()=>{pixelsChecked=true;});
   await flush();assert.equal(pixelsChecked,false);assert.equal(c.dataset.artState,'loading');assert.equal(painted.length,0);
   // A separately decoded Image still does not prove the cached director Image
   // has loaded and painted. Reproduce that callback gap without wall-clock sleeps.
   const separate=new w.Image();separate.src=source;await separate.decode();page.poll();await flush();assert.equal(pixelsChecked,false);
   const selected=images.find(im=>im.src===source);selected.complete=true;selected.naturalWidth=640;selected.naturalHeight=360;selected.onload();
   page.poll();await waiting;assert.equal(pixelsChecked,true);assert.equal(c.dataset.artState,'ready');assert.equal(painted.at(-1),source);assert.equal(page.disposed,1);director.cancel();
  }finally{a.dispose();}
 }
});
test('a missing or indefinitely loading painting fails with the expected panel and bounded timeout',async()=>{
 for(const canvas of [null,{dataset:{step:'cling',panel:'girl-cling-grey',artState:'loading'}}]){
  const page=controlledPage({querySelector:()=>canvas}),expected={step:'cling',panel:'girl-cling-grey',source:'selected.webp'};
  const waiting=ready(page,expected),rejection=assert.rejects(waiting,/did not become ready within 15000ms.*selected.webp/);
  page.timeout();await rejection;
 }
});
test('ready pixels from the wrong panel or wrong step cannot satisfy readiness',async()=>{
 for(const dataset of [{step:'cling',panel:'girl-cling-riku',artState:'ready'},{step:'care',panel:'girl-cling-grey',artState:'ready'}]){
  const page=controlledPage({querySelector:()=>({dataset})});let passed=false;
  const waiting=ready(page,{step:'cling',panel:'girl-cling-grey'}).then(()=>{passed=true;}),rejection=assert.rejects(waiting,/did not become ready.*actual/);
  await flush();assert.equal(passed,false);page.timeout();await rejection;
 }
});
test('a failed selected painting is an immediate explicit error, not a color-threshold pass or timeout',async()=>{
 const page=controlledPage({querySelector:()=>({dataset:{step:'cling',panel:'girl-cling-grey',artState:'error'}})});
 await assert.rejects(ready(page,{step:'cling',panel:'girl-cling-grey',source:'missing.webp'}),/Opening painting failed to load.*missing.webp/);
 assert.equal(page.disposed,1);
});
test('legacy browser check decodes the selected source, waits after rendering, and preserves its original pixel threshold',()=>{
 const source=fs.readFileSync(require.resolve('./browser-opening-story.cjs'),'utf8');
 assert.match(source,/panel=ShuLakeIntro\.panelFor\(step,s\).*source:ShuLakeIntro\.sourceFor\(panel\)/);
 assert.match(source,/openingArtReady\.decodeAssets\(page,expectedArt\.source\);assert\.ok\(assets\.every/);
 assert.match(source,/renderLakeIntro\(\)\);await openingArtReady\(page,expectedArt\);const colors=/);
 assert.match(source,/assert\.ok\(colors>200,colors\)/);
});
