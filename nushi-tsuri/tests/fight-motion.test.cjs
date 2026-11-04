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
