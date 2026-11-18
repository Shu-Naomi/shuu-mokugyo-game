'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),{JSDOM,VirtualConsole}=require('jsdom');
const read=name=>fs.readFileSync(path.join(__dirname,'..',name),'utf8');
const html=read('index.html');
const registration=html.match(/      if \([^\n]*"serviceWorker" in navigator\)\n        navigator\.serviceWorker\.register\("\.\/sw\.js\?v=[0-9-]+"\)\.catch\(\(\) => \{\}\);/g);
function register(search,supported=true,production=false){
 assert.equal(registration?.length,1,'one guarded legacy registration in deferred runtime');
 const calls=[],navigator=supported?{serviceWorker:{register:url=>{calls.push(url);return Promise.resolve();}}}:{};
 vm.runInNewContext(registration[0],{URLSearchParams,location:{search},navigator,ShuVillageProductionSession:production?{}:undefined});
 return calls;
}
test('production session suppresses legacy runtime registration for every query mode',()=>{
 for(const search of ['', '?villageReference=0','?villageReference=false','?villageReference=1'])assert.deepEqual(register(search,true,true),[]);
 assert.deepEqual(register('',false),[]);
});
test('legacy fallback uses the current worker only outside reference mode',()=>{
 for(const search of ['', '?villageReference=0','?villageReference=false'])assert.deepEqual(register(search),['./sw.js?v=252-71']);
});
test('unmigrated reference rehearsal never registers production worker',()=>{
 for(const search of ['?villageReference=1','?v=252-59&villageReference=1'])assert.deepEqual(register(search),[]);
 assert.deepEqual(register('?villageReference=1',false),[]);
});
async function boot({verified=true,acquired=true,supported=true,production=true,runtime="success"}={}){
 const runtimeTail={success:'window.ShuVillageRuntimeReady=true;',missing:'',error:'throw new Error("runtime failure");',lateError:'window.ShuVillageRuntimeReady=true;throw new Error("after marker failure");',blocked:'window.blockStartup("read-failed");window.ShuVillageRuntimeReady=true;'}[runtime];
 const dom=new JSDOM('<body><script type="text/plain" id="villageDeferredRuntime">window.gameRan=true;window.suspendCount=0;window.ShuVillageSaveRuntime={suspend:()=>window.suspendCount++};' + runtimeTail + '</script></body>',{url:'https://game.test/nushi-tsuri/',runScripts:'dangerously',virtualConsole:new VirtualConsole()}),w=dom.window,calls=[],order=[];
 const candidate=JSON.parse(/const config = (.*);/.exec(html)[1]);
 if(production)w.ShuVillageReleaseCandidate=candidate;
 if(supported)Object.defineProperty(w.navigator,'serviceWorker',{value:{register:(url,options)=>{calls.push({url,options:{...options},gameRan:w.gameRan});order.push('register');return Promise.resolve();}}});
 w.ShuVillageReleaseVerifier={verify:async()=>{order.push('verify');return {ok:verified,reason:'verification-failed'};}};
 w.ShuVillageReference={enabled:true};w.ShuVillageSaveMigration={};w.ShuSaveSlots={};
 w.ShuVillageSaveStore={acquire:async()=>{order.push('acquire');return {ok:acquired,reason:'another-tab-open',importSlot:()=>({ok:true}),read:()=>({ok:true}),close:()=>{}};}};
 w.ShuVillageSaveAdapter={create:(session,storage,blocked)=>{w.blockStartup=blocked;return {};}};
 w.eval(read('village-release-gate.js'));await new Promise(resolve=>setImmediate(resolve));
 return {dom,w,calls,order};
}
test('production registers the configured current worker only after verified save-safe runtime startup',async()=>{
 const app=await boot();try{
  assert.deepEqual(app.order,['verify','acquire','register']);
  assert.deepEqual(app.calls,[{url:'./sw.js?v=252-71',options:{updateViaCache:'none'},gameRan:true}]);
  assert.equal(app.w.ShuVillageReleaseGate.started,true);
 }finally{app.dom.window.close();}
});
test('verification and save-lock failures never start or register production',async()=>{
 for(const options of [{verified:false},{acquired:false}]){
  const app=await boot(options);try{assert.equal(app.w.gameRan,undefined);assert.deepEqual(app.calls,[]);if(options.verified===false)assert.deepEqual(app.order,['verify']);}finally{app.dom.window.close();}
 }
});
test('unsupported browsers and rehearsal without a production URL do not register',async()=>{
 for(const options of [{supported:false},{production:false}]){
  const app=await boot(options);try{assert.equal(app.w.gameRan,true);assert.deepEqual(app.calls,[]);}finally{app.dom.window.close();}
 }
});

test('incomplete, throwing, and synchronously blocked runtime cannot claim startup or register worker',async()=>{
 for(const runtime of ['missing','error','lateError','blocked']){
  const app=await boot({runtime});try{
   assert.equal(app.w.gameRan,true, runtime + ': runtime was attempted');
   assert.equal(app.w.ShuVillageReleaseGate,undefined,runtime);
   assert.deepEqual(app.calls,[],runtime);
   assert.ok(app.w.suspendCount>=1,runtime + ': partial runtime suspended');
   assert.match(app.w.document.querySelector('#villageSaveGate').textContent,/runtime-startup-incomplete/,runtime);
  }finally{app.dom.window.close();}
 }
});
