const {test}=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const {createCanvas,loadImage}=require('@napi-rs/canvas');
const Art=require('../layered-scenery.js'),Data=require('../scene-layers.js');
const {boot,seed,read,saveKey}=require('./game-harness.cjs');
const root=path.resolve(__dirname,'..'),pixels=c=>c.getContext('2d').getImageData(0,0,c.width,c.height).data;
const snapshot=w=>read(w,'({money:s.money,hp:s.hp,time:s.gameMinutes,caught:s.caught,baits:s.baits,equipment:s.equipment,pet:s.petLife,story:s.lakeStory,quests:s.questCompletions,memories:s.catchMemories,records:s.fishCatchRecords,mode:s.fightMode})');

test('Sam district source art is preserved, and the assembled village changes no pixel outside the shop district',async()=>{
 const d=Data.get('world'),original=await loadImage(path.join(root,d.source));
 const raw=fs.readFileSync(path.join(root,d.edits[0].source));
 assert.equal(crypto.createHash('sha256').update(raw).digest('hex'),'88d868055afb912bc4054cbc286e9d774891225b5086a411ae70d294acf6b372');
 const edits=await Promise.all(d.edits.map(e=>loadImage(path.join(root,e.source))));
 const assembled=Art.assembleSource(original,d,edits,createCanvas),before=createCanvas(original.width,original.height);
 before.getContext('2d').drawImage(original,0,0);assert.deepEqual([assembled.width,assembled.height],[1536,864]);
 const a=pixels(before),b=pixels(assembled);let changed=0;
 for(let y=0;y<864;y++)for(let x=0;x<1536;x++){
  const i=(y*1536+x)*4;if(a[i]===b[i]&&a[i+1]===b[i+1]&&a[i+2]===b[i+2]&&a[i+3]===b[i+3])continue;
  changed++;assert.ok(x>=1150&&x<=1355&&y>=437&&y<=604,`unrelated scenery changed at ${x},${y}`);
 }
 assert.ok(changed>18000&&changed<35000,'a detailed shop district, preserving the rest of the village');
 assert.ok(Data.assets().includes(d.edits[0].source));
 const sw=fs.readFileSync(path.join(root,'sw.js'),'utf8');assert.ok(sw.includes('./'+d.edits[0].source));
 for(const period of ['day','evening','night']){
  const scene=Art.prepare(assembled,null,d,{season:'spring',period},createCanvas),c=createCanvas(1536,864);
  Art.compose(c,scene,{patches:false});const rgba=pixels(c),colors=new Set();for(let i=0;i<rgba.length;i+=64)colors.add((rgba[i]<<16)|(rgba[i+1]<<8)|rgba[i+2]);assert.ok(colors.size>1000,'keep tonal detail at '+period);
 }
});

test('the browser controller loads and assembles the shop edit before preparing world pixels',async()=>{
 const seen=[],d=Data.get('world'),canvas=createCanvas(1536,864);
 const controller=Art.createController({canvasFactory:createCanvas,loadImage:async url=>{seen.push(url);return loadImage(path.join(root,url));},
  createMotionCanvas:()=>{const overlay=createCanvas(1536,864);overlay.dataset={};return overlay;},visible:()=>true,isHidden:()=>false,reducedMotion:()=>true,
  requestFrame:()=>1,cancelFrame:()=>{},onError:e=>{throw e;}});
 try{assert.equal(await controller.paint(canvas,'world',{season:'spring',period:'day'}),true);
  assert.ok(seen.includes(d.edits[0].source));
  const original=await loadImage(path.join(root,d.source)),expected=Art.assembleSource(original,d,await Promise.all(d.edits.map(e=>loadImage(path.join(root,e.source)))),createCanvas);
  assert.deepEqual(canvas.getContext('2d').getImageData(1230,475,60,80).data,expected.getContext('2d').getImageData(1230,475,60,80).data);
 }finally{controller.dispose();}
});

for(const mode of ['gauge','nushi'])test('Sam shop steps, side props, buying and a legacy save keep the same entrance and progress: '+mode,()=>{
 const app=boot({...seed(),x:197,y:99,direction:'up',fightMode:mode,soundEnabled:false}),w=app.window;let saved,expected,at;
 try{
  w.Math.random=()=>.999999;
  for(const [x,y]of [[189,91],[192,92],[197,80],[184,87],[208,87]])assert.equal(w.isWalkableWorld(x,y),false,'shop/prop is solid');
  for(const [ax,ay,bx,by]of [[179,93,197,93],[180,96,212,96],[220,96,220,108],[197,99,197,88]])assert.equal(w.isWalkableWorldSegment(ax,ay,bx,by),true,'open approach or quay');
  const before=snapshot(w);w.move('up');w.move('up');at=read(w,'({x:s.x,y:s.y,direction:s.direction})');
  assert.deepEqual(at,{x:197,y:91,direction:'up'});assert.equal(w.isAtSamShopEntrance(),true);
  w.action();assert.ok(w.document.querySelector('#store.open'));assert.deepEqual(snapshot(w),before);
  w.document.querySelector('[data-buy-bait="worm"]').click();expected=snapshot(w);
  assert.equal(expected.money,before.money-120);assert.equal(expected.baits.worm,before.baits.worm+3);
  assert.deepEqual({...expected,money:before.money,baits:before.baits},before);
  w.close();assert.deepEqual(read(w,'({x:s.x,y:s.y,direction:s.direction})'),at);w.save();saved=JSON.parse(w.localStorage.getItem(saveKey));assert.deepEqual(app.errors,[]);
 }finally{app.dispose();}
 const resumed=boot(saved);try{assert.deepEqual(snapshot(resumed.window),expected);assert.deepEqual(read(resumed.window,'({x:s.x,y:s.y,direction:s.direction})'),at);assert.deepEqual(resumed.errors,[]);}finally{resumed.dispose();}
});
