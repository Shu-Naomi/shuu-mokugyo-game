const {test}=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const {createCanvas,loadImage}=require('@napi-rs/canvas');
const Art=require('../layered-scenery.js'),Data=require('../scene-layers.js');
const {boot,seed,read,saveKey}=require('./game-harness.cjs');
const root=path.resolve(__dirname,'..'),rgba=c=>c.getContext('2d').getImageData(0,0,c.width,c.height).data;
const progress=w=>read(w,'({avatar:s.avatar,money:s.money,hp:s.hp,time:s.gameMinutes,caught:s.caught,baits:s.baits,items:s.items,equipment:s.equipment,pet:s.petLife,story:s.lakeStory,quests:s.questCompletions,memories:s.catchMemories,records:s.fishCatchRecords,mode:s.fightMode})');
const sprite=file=>loadImage(path.join(root,'assets',file));
function leadingBoot(canvas){
 const d=rgba(canvas),{width,height}=canvas;let bottom=0,footX=0,footN=0,bodyX=0,bodyN=0;
 for(let y=0;y<height;y++)for(let x=0;x<width;x++)if(d[(y*width+x)*4+3]>128)bottom=Math.max(bottom,y);
 for(let y=0;y<height;y++)for(let x=0;x<width;x++)if(d[(y*width+x)*4+3]>128){
  if(y>=bottom-3){footX+=x;footN++;}
  if(y>=height*.26&&y<height*.52){bodyX+=x;bodyN++;}
 }
 return {offset:footX/footN-bodyX/bodyN,bottom};
}

test('the actual girl renderer alternates the leading boot while both steps keep the same ground anchor',async()=>{
 const a=boot({...seed(),avatar:'girl',soundEnabled:false}),w=a.window;
 try{
  w.fixedWalk=await sprite('player-girl-front-walk-v252-8.png');w.oldWalk=await sprite('player-girl-walk-v35-final.png');
  w.eval('playerFrontWalkImages.girl=window.fixedWalk;playerWalkImages.girl=window.oldWalk');
  const before=progress(w),c=createCanvas(92,116),steps=[];
  for(const frame of [0,1,2,3]){w.eval('playerAnimFrame='+frame);w.drawPlayerSprite(c,'down',true);steps.push(leadingBoot(c));}
  assert.ok(steps[0].offset>1&&steps[2].offset<-3,'right and left boots take turns, not two pictures of the same step: '+JSON.stringify(steps));
  assert.deepEqual(steps[0],steps[1]);assert.deepEqual(steps[2],steps[3]);
  assert.ok(Math.abs(steps[0].bottom-steps[2].bottom)<=1,'no jump in the feet');assert.deepEqual(progress(w),before);
  // This specifically catches the reported defect; a general pixel inequality
  // would pass the old sheet because the head and arms already changed.
  const old=[];w.eval('playerFrontWalkImages.girl=null');
  for(const frame of [0,2]){w.eval('playerAnimFrame='+frame);w.drawPlayerSprite(c,'down',true);old.push(leadingBoot(c));}
  assert.ok(old.every(p=>p.offset>1),'old atlas repeats the same leading foot');assert.deepEqual(a.errors,[]);
 }finally{a.dispose();}
});

test('front correction leaves standing, side, rear and boy poses on their existing images, including a late-load fallback',()=>{
 const a=boot({...seed(),avatar:'girl'}),w=a.window,calls=[],ctx={clearRect(){},drawImage(...args){calls.push(args);}},canvas={width:92,height:116,getContext:()=>ctx};
 try{
  const before=progress(w);
  for(const avatar of ['girl','boy'])for(const direction of ['down','up','left','right'])for(const walking of [false,true]){
   w.eval(`s.avatar='${avatar}';ensureAvatarImages();playerAnimFrame=0`);w.drawPlayerSprite(canvas,direction,walking);
   const src=calls.at(-1)[0].src;
   if(avatar==='girl'&&direction==='down'&&walking)assert.match(src,/front-walk-v252-8/);
   else assert.match(src,new RegExp(walking?'player-'+avatar+'-walk-v35-final':'player-'+avatar+'\\.png'));
  }
  w.eval("s.avatar='girl';playerFrontWalkImages.girl={complete:false,naturalWidth:0}");w.drawPlayerSprite(canvas,'down',true);
  assert.match(calls.at(-1)[0].src,/player-girl-walk-v35-final/);assert.deepEqual(progress(w),before);assert.deepEqual(a.errors,[]);
 }finally{a.dispose();}
});

test('the introduction uses the same corrected front strides and retains the other girl directions',()=>{
 const a=boot({...seed(),avatar:'girl'}),w=a.window,calls=[];
 try{
  const ctx=new Proxy({drawImage(...args){calls.push(args);}}, {get:(o,k)=>k in o?o[k]:()=>{}}),canvas={getContext:()=>ctx};
  for(const direction of ['down','up','left']){
   calls.length=0;w.ShuLakeIntro.paint(canvas,'village',()=>{},{avatar:'girl'},{scene:'village',player:{x:100,y:100,direction,walking:true,frame:2},dogs:[],fade:0});
   const src=calls.at(-1)[0].src;assert.match(src,direction==='down'?/front-walk-v252-8/:/girl-walk-v35-final/);
  }
  assert.deepEqual(a.errors,[]);
 }finally{a.dispose();}
});

test('the preserved fishmonger art changes only its own outline, keeping the delivery road, Sam and inn pixels intact',async()=>{
 const d=Data.get('world'),market=d.edits.find(e=>e.id==='fish-market-front');assert.ok(market);
 const raw=fs.readFileSync(path.join(root,market.source));assert.equal(crypto.createHash('sha256').update(raw).digest('hex'),'a3c822324b50350eb044a00366ac4a011ee190d785fc9e04bb378fdd38fdc32d');
 const original=await loadImage(path.join(root,d.source)),previous={...d,edits:d.edits.filter(e=>e!==market)};
 const before=Art.assembleSource(original,previous,await Promise.all(previous.edits.map(e=>loadImage(path.join(root,e.source)))),createCanvas);
 const after=Art.assembleSource(original,d,await Promise.all(d.edits.map(e=>loadImage(path.join(root,e.source)))),createCanvas),a=rgba(before),b=rgba(after);let changed=0;
 for(let y=0;y<864;y++)for(let x=0;x<1536;x++){
  const i=(y*1536+x)*4;if(a[i]===b[i]&&a[i+1]===b[i+1]&&a[i+2]===b[i+2]&&a[i+3]===b[i+3])continue;
  changed++;assert.ok(x>=924&&x<=1108&&y>=543&&y<=656,'unrelated village pixel '+x+','+y);
 }
 assert.ok(changed>10000&&changed<22000,'a bounded shop edit');
 for(const [x,y,width,height]of [[1115,532,300,150],[912,660,224,70],[120,48,272,216]])
  assert.deepEqual(after.getContext('2d').getImageData(x,y,width,height).data,before.getContext('2d').getImageData(x,y,width,height).data,'delivery road or completed district changed');
 assert.ok(Data.assets().includes(market.source));
 console.log('MARKET_ART_BOUNDS_PASS '+JSON.stringify({changed,outsideDistrict:0,deliveryRoadPreserved:true}));
});

test('all district originals are loaded by the actual scenery controller in day, rain and night',async()=>{
 const seen=[],canvas=createCanvas(1536,864),d=Data.get('world');
 const controller=Art.createController({canvasFactory:createCanvas,loadImage:async url=>{seen.push(url);return loadImage(path.join(root,url));},
  createMotionCanvas:()=>{const c=createCanvas(1536,864);c.dataset={};return c;},visible:()=>true,isHidden:()=>false,reducedMotion:()=>true,
  requestFrame:()=>1,cancelFrame(){},onError:e=>{throw e;}});
 try{
  for(const env of [{season:'spring',period:'day',weather:'sunny'},{season:'summer',period:'evening',weather:'rain'},{season:'winter',period:'night',weather:'cloudy'}])assert.equal(await controller.paint(canvas,'world',env),true);
  for(const e of d.edits)assert.ok(seen.includes(e.source),'loaded '+e.source);
  const sw=fs.readFileSync(path.join(root,'sw.js'),'utf8');
  for(const file of [d.edits.at(-1).source,'assets/player-girl-front-walk-v252-8.png'])assert.ok(sw.includes('./'+file));
 }finally{controller.dispose();}
});

for(const mode of ['gauge','nushi'])test('the fishmonger keeps the existing doorway, conversation, port passage and legacy save: '+mode,()=>{
 const a=boot({...seed(),avatar:'girl',x:158,y:108,direction:'up',fightMode:mode,soundEnabled:false}),w=a.window;let expected,saved,at;
 try{
  w.Math.random=()=>.999999;const before=progress(w);
  for(const [x,y]of [[150,90],[160,95],[170,98]])assert.equal(w.isWalkableWorld(x,y),false,'old shop walls remain solid');
  for(const p of [[158,104,178,104],[178,104,178,96],[178,96,212,96]])assert.equal(w.isWalkableWorldSegment(...p),true,'harbor delivery route remains open: '+p);
  w.move('up');at=read(w,'({x:s.x,y:s.y,direction:s.direction})');assert.deepEqual(at,{x:158,y:104,direction:'up'});assert.equal(w.nearbyWorldLandmark().id,'fish-market');
  w.action();assert.equal(read(w,'activeLocationId'),'fish-market');assert.match(w.document.querySelector('#locationAction').textContent,/水揚げ/);assert.deepEqual(progress(w),before);
  w.document.querySelector('#locationAction').click();assert.match(w.document.querySelector('#locationDialogue').textContent,/冷たい潮/);assert.deepEqual(progress(w),before);
  w.close();assert.deepEqual(read(w,'({x:s.x,y:s.y,direction:s.direction})'),at);expected=progress(w);w.save();saved=JSON.parse(w.localStorage.getItem(saveKey));assert.deepEqual(a.errors,[]);
 }finally{a.dispose();}
 const b=boot(saved);try{assert.deepEqual(progress(b.window),expected);assert.deepEqual(read(b.window,'({x:s.x,y:s.y,direction:s.direction})'),at);assert.deepEqual(b.errors,[]);}finally{b.dispose();}
});
