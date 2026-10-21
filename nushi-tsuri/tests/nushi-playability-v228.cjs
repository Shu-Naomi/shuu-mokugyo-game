const {boot,seed,read}=require('./game-harness.cjs');
const {findRoute}=require('./water-routes-v220.cjs');
const M=require('../mountain-region.js');

function runFight({id='namazu',delayMs=600,tier=.5,rngSeed=301,mode='nushi',holdAlways=false}){
 const wet=id==='raigyo',sea=['utsubo','buri','hiramasa','kanpachi'].includes(id),bait=wet||sea?'liveMinnow':id==='nushi'||id==='starNushi'?'nushiSecret':'worm';
 const app=boot({...seed(),hp:100,maxHp:100,soundEnabled:false,gameMinutes:wet?600:1320,
  ...(wet?{mapRegion:'wetland',...M.regions.wetland.entry}:sea?{mapRegion:'village',x:210,y:104,direction:'down'}:{}),
  ownedRods:['tideMaster'],selectedRod:'tideMaster',fightMode:mode,selectedHook:'large',selectedBait:bait,
  baits:{worm:20,nushiSecret:20,liveMinnow:20},caught:id==='starNushi'?{streamNushi:1,coastNushi:1,caveNushi:1}:{}}),w=app.window;
 try{
  if(wet)for(const direction of findRoute(w,'wetMarsh').path)w.move(direction);
 const spot=wet?'mountain-wetMarsh-mid':sea?'sea-deep':'lake-deep',distance=wet?50:95;
  w.eval(`${sea?"cast({zone:'sea',waterZone:'sea',waterX:s.x,waterY:s.y+6})":"cast()"};beginFishing();clearInterval(timer);`);
  const encounter=read(w,`(()=>{for(let i=0;i<10000;i++){const r=(i+.5)/10000;Math.random=()=>r;
   if(pick(${distance},${JSON.stringify(spot)})?.id===${JSON.stringify(id)})return r;}return null;})()`);
  if(encounter===null)throw Error('No legal encounter for '+id);
  w.eval(`Math.random=()=>${encounter};battle.cast=${distance};launchSurfaceCast();settleSurfaceCast();
   battle.specimen=rollFishSpecimen(battle.f,()=>${tier});battle.specimenVisualScale=fishVisualScale(battle.specimen);var testNow=200000,testRng=${rngSeed};Date.now=()=>testNow;
   Math.random=()=>((testRng=Math.imul(testRng,1664525)+1013904223>>>0)/4294967296);
   battle.biteAt=testNow;syncBitePhase();pressBattleAction();releaseBattleAction();stopBattleFishArt();
   var fightTick;setInterval=fn=>(fightTick=fn,9001);battleTick();
   // Skip painting only: real mood selection, cue text, line/rod physics,
   // movement, warning clocks, input edges and landing are still executed.
   renderBattleFish=()=>{};updateWaterFx=()=>{};syncBattleFishLine=()=>{};updateTensionFeedback=()=>{};`);
  const start=read(w,'({id:battle.f.id,size:battle.specimen.cmText,mode:battle.fightMode,gear:battle.equipment})');
  const result=read(w,`(()=>{
   const scene=document.querySelector('#fishScene'),ten=document.querySelector('#ten'),queue=[];
   let observed=null,ticks=0,maxProgress=0,maxTension=0,warningCount=0,pullOpenings=0,lastPhase=null,wrongRunTicks=0;
   for(;ticks<7500&&battle?.phase==='fight';ticks++){
    const phase=scene.dataset.nushiPhase;
    const wish=${holdAlways}||(${JSON.stringify(mode)}==='gauge'?parseFloat(ten.style.width)<65:
      (phase==='slack'||phase==='pulling'))&&!scene.classList.contains('gill-wash');
    if(wish!==observed){queue.push({at:testNow+${delayMs},wish});observed=wish;}
    while(queue.length&&queue[0].at<=testNow){const action=queue.shift();if(action.wish)pressBattleAction();else releaseBattleAction();}
    testNow+=120;fightTick();if(!battle)break;
    if(scene.dataset.nushiPhase==='warning'&&lastPhase!=='warning')warningCount++;
    if(scene.dataset.nushiPhase==='slack'&&lastPhase!=='slack'&&lastPhase!=='pulling')pullOpenings++;
    if(battle.reeling&&!battle.mood.calm&&!battle.gillWash)wrongRunTicks++;
    maxProgress=Math.max(maxProgress,battle.retrieval);maxTension=Math.max(maxTension,battle.ten);lastPhase=scene.dataset.nushiPhase;
   }
   const lineBroken=battle?.phase==='escape';
   if(lineBroken)for(let i=0;i<40&&battle?.phase==='escape';i++){testNow+=120;fightTick();}
   return {lineBroken,phase:battle?.phase||'lost',seconds:ticks*.12,maxProgress,maxTension,warningCount,pullOpenings,wrongRunTicks};
  })()`);
  return {id,delayMs,tier,rngSeed,mode,holdAlways,start,...result,errors:app.errors};
 }finally{app.dispose();}
}
module.exports={runFight};
