const {boot,seed,read}=require('./game-harness.cjs');
const {findRoute}=require('./water-routes-v220.cjs');
const M=require('../mountain-region.js');
const I=require('../offshore-island.js');

function runFight({id='namazu',delayMs=600,tier=.5,rngSeed=301,mode='nushi',holdAlways=false,gaugeThreshold=65,gaugeResumeThreshold=gaugeThreshold,waterFxSeed=null,rod='tideMaster',regionalTrip=null,onLanding=null}){
 const island={shiokakure:{area:'west',bait:'shell',distance:20,hook:'large'},takabe:{area:'east',bait:'shrimp',distance:50,hook:'small'},kuromejina:{area:'west',bait:'shrimp',distance:50,hook:'medium'},houraihimeji:{area:'cove',bait:'smallShrimp',distance:80,hook:'medium'},shimaaji:{area:'east',bait:'shrimp',distance:50},ishigakidai:{area:'west',bait:'shell',distance:50},akahata:{area:'cove',bait:'smallShrimp',distance:20}}[id];
 const upland=id==='browntrout'||id==='laketrout';
 const wet=id==='raigyo',sea=['utsubo','buri','hiramasa','kanpachi'].includes(id),bait=regionalTrip?.bait||island?.bait||(wet||sea?'liveMinnow':id==='nushi'||id==='starNushi'?'nushiSecret':'worm');
 const app=boot({...seed(),hp:100,maxHp:100,soundEnabled:false,gameMinutes:regionalTrip?.minutes??(wet?600:1320),
  ...(regionalTrip?regionalTrip.bank:upland?{mapRegion:'mountainPond',...M.regions.mountainPond.entry}:island?{mapRegion:I.id,...(id==='shiokakure'?{x:45,y:33,direction:'down'}:I.fishingPoints.find(p=>p.id===island.area))}:wet?{mapRegion:'wetland',...M.regions.wetland.entry}:sea?{mapRegion:'village',x:210,y:104,direction:'down'}:{}),
  ownedRods:[rod],selectedRod:rod,fightMode:mode,selectedHook:regionalTrip?.hook||(upland?'medium':island?.hook||(island?.area==='cove'?'medium':'large')),selectedBait:bait,
  baits:{river:20,worm:20,nushiSecret:20,liveMinnow:20,shrimp:20,shell:20,smallShrimp:20,[bait]:20},caught:id==='starNushi'?{streamNushi:1,coastNushi:1,caveNushi:1}:{}}),w=app.window;
 try{
  if(id==='shiokakure')w.eval('for(let i=0;i<30;i++)ShuShiokakure.step(shiokakureEncounter,s)');
  if(regionalTrip?.route)for(const direction of findRoute(w,regionalTrip.route).path)w.move(direction);
  if(upland)for(const direction of findRoute(w,'highPond').path)w.move(direction);
  if(wet)for(const direction of findRoute(w,'wetMarsh').path)w.move(direction);
 const spot=regionalTrip?.spot||(upland?'mountain-highPond-deep':island?'offshore-'+island.area+'-'+(island.distance<34?'shallow':island.distance<67?'mid':'deep'):wet?'mountain-wetMarsh-mid':sea?'sea-deep':'lake-deep');
  w.eval(`${regionalTrip||upland||island?'action()':sea?"cast({zone:'sea',waterZone:'sea',waterX:s.x,waterY:s.y+6})":"cast()"};beginFishing();clearInterval(timer);`);
  const distance=regionalTrip||id==='laketrout'?read(w,`(()=>{
   let tick;const original=setInterval;
   try{setInterval=fn=>(tick=fn,0);battleTick();}finally{setInterval=original;}
   for(let n=0;n<120;n++){
    if(depthForCast(battle.waterZone,battle.cast,battle.minimumDepth)===${JSON.stringify(spot.split('-').at(-1))})return battle.cast;
    tick();
   }
   throw Error('Selected rod cannot reach '+${JSON.stringify(spot)});
  })()`):upland?80:island?.distance||(wet?50:95);
  const encounter=id==='shiokakure'?.5:read(w,`(()=>{for(let i=0;i<10000;i++){const r=(i+.5)/10000;Math.random=()=>r;
   if(pick(${distance},${JSON.stringify(spot)})?.id===${JSON.stringify(id)})return r;}return null;})()`);
  if(encounter===null)throw Error('No legal encounter for '+id);
  w.eval(`Math.random=()=>${encounter};battle.cast=${distance};launchSurfaceCast();settleSurfaceCast();
   battle.specimen=rollFishSpecimen(battle.f,()=>${tier});battle.specimenVisualScale=fishVisualScale(battle.specimen);var testNow=200000,testRng=${rngSeed};Date.now=()=>testNow;
   Math.random=()=>((testRng=Math.imul(testRng,1664525)+1013904223>>>0)/4294967296);
   ${waterFxSeed===null?'':`var gameRandom=Math.random,particleRng=${Number(waterFxSeed)};Math.random=()=>((particleRng=Math.imul(particleRng,1664525)+1013904223>>>0)/4294967296);resetWaterFx();Math.random=gameRandom;`}
   battle.biteAt=testNow;syncBitePhase();pressBattleAction();releaseBattleAction();stopBattleFishArt();
   var fightTick;setInterval=fn=>(fightTick=fn,9001);battleTick();
   // Skip painting only: real mood selection, cue text, line/rod physics,
   // movement, warning clocks, input edges and landing are still executed.
   renderBattleFish=()=>{};${waterFxSeed===null?'updateWaterFx=()=>{};':'drawWaterFx=()=>{};'}syncBattleFishLine=()=>{};updateTensionFeedback=()=>{};`);
  if(read(w,'battle.f.id')!==id)throw Error('Unexpected encounter');
  const start=read(w,'({id:battle.f.id,size:battle.specimen.cmText,mode:battle.fightMode,gear:battle.equipment})');
  const result=read(w,`(()=>{
   const scene=document.querySelector('#fishScene'),ten=document.querySelector('#ten'),queue=[];
   let observed=null,ticks=0,maxProgress=0,maxTension=0,warningCount=0,pullOpenings=0,lastPhase=null,wrongRunTicks=0;
   for(;ticks<7500&&battle?.phase==='fight';ticks++){
    const phase=scene.dataset.nushiPhase;
    const wish=${holdAlways}||(${JSON.stringify(mode)}==='gauge'?parseFloat(ten.style.width)<(observed?${gaugeThreshold}:${gaugeResumeThreshold}):
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
  if(onLanding&&result.phase==='landing')onLanding(w);
  return {id,delayMs,tier,rngSeed,mode,holdAlways,start,...result,errors:app.errors};
 }finally{app.dispose();}
}
module.exports={runFight};
