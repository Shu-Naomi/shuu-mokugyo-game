const {test}=require('node:test'),assert=require('node:assert/strict'),path=require('node:path');
const M=require('../fish-motion.js'),A=require('../fish-art.js');
const {createCanvas,loadImage}=require('@napi-rs/canvas');
const {boot,seed,read}=require('./game-harness.cjs');
test('fight strokes are species-specific, bounded and monotonic at all presentation rates',()=>{
 assert.ok(M.fightProfile('starNushi').effort>M.fightProfile('nushi').effort);
 assert.ok(M.fightProfile('hiramasa').cadence>M.fightProfile('koi').cadence);
 assert.notDeepEqual(M.fightProfile('unagi'),M.fightProfile('moroko'));
 for(const id of Object.keys(A.species))for(const hz of [10,20,30,60,120]){
  let previous=-1;
  for(let step=0;step<=hz*4;step++){
   const t=step/hz,p=M.fight(id,t,{age:t,remaining:5-t});
   assert.ok(p.extraFrame>previous,id+' forward phase');previous=p.extraFrame;
   assert.ok(p.effort>=1&&p.effort<=2.8);
   assert.deepEqual(M.fight(id,t,{reduced:true}),{extraFrame:0,effort:1});
   for(const opts of [{calm:true},{quiet:true}])assert.equal(M.fight(id,t,opts).extraFrame,p.extraFrame,'no phase reset at cues');
  }
 }
});
function pixels(ctx){const bytes=ctx.getImageData(0,0,448,224).data;let count=0,edge=0;for(let y=0;y<224;y++)for(let x=0;x<448;x++)if(bytes[(y*448+x)*4+3]){count++;if(x===0||x===447||y===0||y===223)edge++;}return {bytes:Buffer.from(bytes),count,edge};}
test('maximum fight effort preserves every fish original, pixel volume, lips and raster cache',async()=>{
 const ctx=createCanvas(448,224).getContext('2d'),images=new Map();
 for(const [id,spec]of Object.entries(A.species)){
  if(!images.has(spec.asset))images.set(spec.asset,await loadImage(path.join(__dirname,'..',spec.asset)));
  const image=images.get(spec.asset);
  A.draw(ctx,image,id,8,2,()=>image,{swimFrame:2});const defaultPixels=pixels(ctx).bytes;
  A.draw(ctx,image,id,8,2,()=>image,{swimFrame:2,swimEffort:1});assert.deepEqual(pixels(ctx).bytes,defaultPixels,id+' default unchanged');
  for(const heading of [0,1.5,3,4.5,6]){
   const target=A.pose(id,7,heading).target,x=Math.round(target[0]*448)-10,y=Math.round(target[1]*224)-10;
   A.draw(ctx,image,id,7,heading,()=>image,{swimFrame:1,swimEffort:1});
   const base=pixels(ctx),lip=Buffer.from(ctx.getImageData(x,y,21,21).data),metrics=A.metrics();
   for(const phase of [0,2,4,6]){
    A.draw(ctx,image,id,7,heading,()=>image,{swimFrame:phase,swimEffort:2.8});const p=pixels(ctx);
    assert.equal(p.count,base.count,id+' volume');assert.equal(p.edge,0,id+' unclipped');
    assert.deepEqual(Buffer.from(ctx.getImageData(x,y,21,21).data),lip,id+' fixed lip');
   }
   assert.equal(A.metrics().builds,metrics.builds,'effort never rebuilds base raster');assert.equal(A.metrics().outputs,metrics.outputs);
  }
 }
});
function fixture(){const app=boot({...seed(),hp:100,fightMode:'nushi',ownedRods:['tideMaster'],selectedRod:'tideMaster'},
 {fishScene:[844,328],battleFish:[286,143]});
 const scene=app.window.document.querySelector('#fishScene'),element=app.window.document.querySelector('#battleFish');
 for(const [node,values]of [[scene,{clientWidth:844,clientHeight:328}],[element,{offsetWidth:286,offsetHeight:143}]])
  for(const [key,value]of Object.entries(values))Object.defineProperty(node,key,{configurable:true,value});
 app.window.document.querySelector('#pull').parentElement.getBoundingClientRect=()=>({top:310,width:200});
 app.window.eval('cast();beginFishing();battle.cast=50;launchSurfaceCast();settleSurfaceCast();battle.f=fish.find(f=>f.id==="starNushi");var motionNow=10000;Date.now=()=>motionNow;startFight();clearInterval(timer);stopBattleFishArt();releaseBattleAction();battle.gillWash=null;');return app;}
test('fight painting leaves geometry, balance and saves unchanged; pause/resume freezes its phase',()=>{
 const app=fixture(),w=app.window;
 try{
  w.eval('battle.mood=fightProfiles.starNushi.moods.find(m=>!m.calm);battle.nextMood=motionNow+10000;for(var i=0;i<12;i++){motionNow+=120;moveBattleFish(battle.mood)};motionNow+=48;renderBattleFish();');
  const before=read(w,'JSON.stringify({x:battle.x,y:battle.y,vx:battle.vx,vy:battle.vy,ten:battle.ten,retrieval:battle.retrieval,swimPhase:battle.swimPhase,swimAdvance:battle.swimAdvance,bounds:fishSwimBounds(),pose:battleFishVisualPose(),save:s})');
  w.eval('for(var i=0;i<20;i++)renderBattleFish()');
  assert.equal(read(w,'JSON.stringify({x:battle.x,y:battle.y,vx:battle.vx,vy:battle.vy,ten:battle.ten,retrieval:battle.retrieval,swimPhase:battle.swimPhase,swimAdvance:battle.swimAdvance,bounds:fishSwimBounds(),pose:battleFishVisualPose(),save:s})'),before);
  const phase=w.document.querySelector('#battleFish').dataset.artSwimFrame;
  w.eval('pauseBattle();motionNow+=60000;renderBattleFish()');assert.equal(w.document.querySelector('#battleFish').dataset.artSwimFrame,phase);
  w.eval('resumeBattle();renderBattleFish()');assert.equal(w.document.querySelector('#battleFish').dataset.artSwimFrame,phase);
  assert.equal(read(w,'battle.pausedAt'),0);assert.deepEqual(app.errors,[]);
 }finally{app.dispose();}
});

test('seeded simulation and responsive bounds match with fight effort enabled or neutral',()=>{
 const app=fixture(),w=app.window;
 try{
  w.eval('var originalMotion=ShuFishMotion, savedMotionBattle=JSON.stringify(battle);');
  function trace(enabled){return read(w,`(()=>{
   battle=JSON.parse(savedMotionBattle);motionNow=10000;let rng=310,count=0;
   Math.random=()=>{count++;rng=(Math.imul(rng,1664525)+1013904223)>>>0;return rng/4294967296};
   ShuFishMotion=${enabled?'originalMotion':'{...originalMotion,fight:()=>({extraFrame:0,effort:1})}'};
   const samples=[];
   for(let i=0;i<90;i++){
    motionNow+=120;ShuFishing.windowPhase(battle,motionNow);
    if(motionNow>battle.nextMood)chooseFishMood();
    battle.reeling=Boolean(battle.mood.calm&&!battle.nushiWindow?.warning);
    if(battle.reeling)ShuFishing.acceptPull(battle,motionNow);
    updateRetrieval(battle.mood);moveBattleFish(battle.mood);renderBattleFish();
    samples.push({x:battle.x,y:battle.y,vx:battle.vx,vy:battle.vy,ten:battle.ten,retrieval:battle.retrieval,
     bounds:fishSwimBounds(),window:battle.nushiWindow?JSON.parse(JSON.stringify(battle.nushiWindow)):null,mood:battle.mood.id,rng:count});
   }
   return samples;
  })()`);}
  const neutral=trace(false),enhanced=trace(true);assert.deepEqual(enhanced,neutral);
  assert.ok(enhanced.every(p=>p.bounds.maxY<68),'nonzero viewport limits participate');
  assert.deepEqual(app.errors,[]);
 }finally{app.dispose();}
});

test('an old cached motion module falls back safely during an interrupted update',()=>{
 const app=fixture(),w=app.window;
 try{
  w.eval('ShuFishMotion={profile:ShuFishMotion.profile,phase:ShuFishMotion.phase};renderBattleFish()');
  assert.equal(w.document.querySelector('#battleFish').dataset.swimEffort,'1');
  assert.deepEqual(app.errors,[]);
 }finally{app.dispose();}
});
