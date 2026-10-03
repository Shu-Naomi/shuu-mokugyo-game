const {test}=require('node:test');
const assert=require('node:assert/strict');
const path=require('node:path');
const fs=require('node:fs');
const {createCanvas,loadImage}=require('@napi-rs/canvas');
const {boot,seed,read}=require('./game-harness.cjs');
const A=require('../aquarium-life.js');
const Art=require('../fish-art.js');
const specimen={uid:'fish1',species:'moroko',length:1800};
const catalog=[{id:'moroko',max:2500}];
const poseAt=(t,feed=null,reduced=false)=>A.layout([specimen],catalog,360,205,t,()=>256/110,feed,reduced).poses[0];

test('both ends of a full swim show all five headings without flattening the fish',()=>{
 const ends=[new Set(),new Set()];let previous=poseAt(0);
 for(let tick=0;tick<=1300;tick++){
  const p=poseAt(tick*.05);
  assert.ok(p.flip===1||p.flip===-1,'CSS flip keeps full width');
  assert.ok(Math.abs(p.yaw-previous.yaw)<.14,'continuous heading');
  assert.equal(p.width,previous.width,'orientation cannot squash body dimensions');
  if(p.spriteMode==='turn'){
   assert.equal(p.flip,1,'painted turn art is never mirrored');
   ends[p.x>180?0:1].add(p.turnFrame);
  }else assert.equal(p.flip,Math.sign(p.facing));
  previous=p;
 }
 for(const frames of ends)assert.deepEqual([...frames].sort(),[0,1,2,3,4]);
 const frozen=poseAt(5,null,true);
 assert.deepEqual(poseAt(45,null,true),frozen,'reduced motion stays still');
});

test('feeding turns smoothly from the current heading and rejoins the swim without a snap',()=>{
 for(const started of [2,7.85,12,23.5]){
  const origin=poseAt(started),feeding={ids:['fish1'],at:started,origins:{fish1:origin}};
  let previous=poseAt(started,feeding);
  assert.equal(previous.yaw,origin.yaw);
  let biting=0;
  for(let tick=1;tick<=380;tick++){
   const p=poseAt(started+tick*.01,feeding);
   assert.ok(Math.abs(p.yaw-previous.yaw)<.12,'no instantaneous feeding reversal');
   assert.ok(p.flip===1||p.flip===-1);
   if(p.bite){biting++;assert.equal(p.food,null);assert.equal(p.spriteMode,'swim');}
   previous=p;
  }
  assert.ok(biting>0);
  const resumed=poseAt(started+3.8);
  assert.ok(Math.abs(previous.x-resumed.x)<1e-8&&Math.abs(previous.y-resumed.y)<1e-8,'smooth position on release');
  assert.deepEqual({...previous,x:resumed.x,y:resumed.y},resumed,'feeding leaves no animation state behind');
 }
});

test('all 24 species remain visibly thick in all seven painted headings with offline assets',async()=>{
 const app=boot();let records;
 try{records=read(app.window,`fish.map(f=>({id:f.id,asset:fishTurnAssets[f.id]}))`);}
 finally{app.dispose();}
 assert.equal(records.length,24);
 const sw=fs.readFileSync(path.join(__dirname,'../sw.js'),'utf8'),images=new Map();
 for(const fish of records){
  assert.ok(sw.includes('./'+fish.asset),fish.id+' cached turn asset');
  for(const src of Art.assets(fish.id))if(!images.has(src))images.set(src,await loadImage(path.join(__dirname,'..',src)));
  for(let frame=0;frame<7;frame++){
   const img=images.get(fish.asset),width=448,height=224;
   const canvas=createCanvas(width,height),ctx=canvas.getContext('2d');
   assert.equal(Art.draw(ctx,img,fish.id,7,frame,src=>images.get(src)),true);
   const data=ctx.getImageData(0,0,width,height).data;let left=width,right=-1,pixels=0;
   for(let y=0;y<height;y++)for(let x=0;x<width;x++)if(data[(y*width+x)*4+3]>100){left=Math.min(left,x);right=Math.max(right,x);pixels++;}
   assert.ok(right-left>=width*.1,fish.id+' face retains visible thickness');
   assert.ok(pixels>width*height*.015,fish.id+' frame is not a sliver');
  }
 }
});

test('home and portable draw paths select seven-heading turn art and restore swimming for every fish',()=>{
 const app=boot(),w=app.window;
 try{
  w.eval(`playerHomeState.area='interior';document.querySelector('#aquariumModal').classList.add('open');`);
  for(const id of read(w,'fish.map(f=>f.id)')){
   w.eval(`s.caught['${id}']=1;s.homeAquariumFishId='${id}';renderHomeAquarium();stopAquariumAnimation();`);
   const travel=['hirame','kasago','namazu','unagi'].includes(id)?18:14;
   for(const t of [0,travel+.01,travel+.35,travel+.6,travel+.85,travel+1.19,travel+2]){
    w.eval(`aquariumElapsed=${t};drawAquariumFish()`);
    const pose=read(w,`aquariumFishPose('${id}',${t},homeAquariumLength())`);
    for(const selector of ['#homeAquariumFish','#aquariumPreviewFish']){
     const el=w.document.querySelector(selector);
     assert.match(el.style.transform,/scaleX\((-?1)\)/);
     assert.match(el.dataset.aquariumFrame,new RegExp(':'+pose.spriteMode+':'));
     const canvas=el.querySelector('canvas'),key=canvas.dataset.atlasKey;
     assert.equal(canvas.dataset.artSpecies,id);
     assert.equal(key.split('|')[1]==='7',pose.spriteMode==='turn',id+' correct painted heading');
    }
   }
   // A mode switch with the same numeric frame must still repaint.
   w.eval(`(()=>{const el=document.createElement('div');drawAquariumSprite(el,'${id}',0);drawAquariumSprite(el,'${id}',0,ShuAquariumLife.orientation(.01));if(!el.dataset.aquariumFrame.includes(':turn:0'))throw Error('stale frame');drawAquariumSprite(el,'${id}',0);if(!el.dataset.aquariumFrame.includes(':swim:0'))throw Error('stale turn');})()`);
  }
  assert.deepEqual(app.errors,[]);
 }finally{app.dispose();}
});

test('portable tank actually renders all seven headings and never writes a fractional horizontal scale',()=>{
 const app=boot({...seed(),caught:{...seed().caught,moroko:1},x:199,y:36},{petTankStage:[360,205]}),w=app.window;
 const callbacks=new Map();let next=1000,now=0;
 w.requestAnimationFrame=fn=>{const id=++next;callbacks.set(id,fn);return id;};w.cancelAnimationFrame=id=>callbacks.delete(id);
 const step=()=>{now+=100;const pending=[...callbacks.values()];callbacks.clear();pending.forEach(fn=>fn(now));};
 const click=selector=>w.document.querySelector(selector).click();
 try{
  click('#action');click('[data-pet-buy="moroko"]');click('[data-pet-action="aquarium"]');
  const stateBefore=read(w,'s.petLife'),frames=new Set();
  for(let tick=0;tick<330;tick++){
   step();const el=w.document.querySelector('[data-pet-fish]');
   assert.match(el.style.transform,/scaleX\((-?1)\)/);
   if(el.dataset.aquariumFrame.includes(':turn:'))frames.add(Number(el.dataset.aquariumFrame.split(':').at(-1)));
  }
  assert.deepEqual([...frames].sort(),[0,1,2,3,4,5,6]);
  assert.deepEqual(read(w,'s.petLife'),stateBefore,'rendering does not mutate fish or progress');
  click('[data-pet-action="close"]');step();
  assert.equal(w.document.querySelector('#petLifeModal').classList.contains('open'),false);
  assert.deepEqual(app.errors,[]);
 }finally{app.dispose();}
});
