const {test}=require('node:test'),assert=require('node:assert/strict');
const F=require('../fishing-duel.js'),{boot,seed,read}=require('./game-harness.cjs');
const gear={power:38,strength:4.8,control:1.95};
function fish(id='namazu',calm=true){return {fightMode:'nushi',mood:{id:calm?'rest':'rush',calm,danger:!calm},f:{id},ten:18,retrieval:.2,reeling:false};}

test('every fish has an explicit trait rhythm; random short/long windows vary within it',()=>{
 for(const id of Object.keys(F.fishStrength)){
  const b=fish(id),p=F.rhythm(id),ends=[];
  for(const roll of [0,.3,.7,1]){F.beginWindow(b,b.mood,500,10000,()=>roll);ends.push(b.nushiWindow.pullBudget);}
  assert.equal(ends[0],p.pull[0]);assert.equal(ends.at(-1),p.pull[1]);assert.equal(new Set(ends).size,4);
 }
 assert.ok(F.rhythm('moroko').pull[1]>F.rhythm('ayu').pull[1]);
 assert.ok(F.rhythm('raigyo').speed>F.rhythm('koi').speed);
 assert.ok(F.rhythm('starNushi').shake>F.rhythm('moroko').shake);
});

for(const id of ['moroko','namazu','raigyo','starNushi']){
 test('sustained pulling during escape breaks the line even with top gear: '+id,()=>{
  const b=fish(id,false);b.reeling=true;F.beginWindow(b,b.mood,500,10000,()=>0);
  for(let tick=0;tick<14;tick++)F.step(b,b.mood,gear,1,10000+tick*120);
  assert.ok(b.ten>=100);assert.ok(b.retrieval<=.2);
 });
 test('head-shake reaction time is safe, but sustained force against it breaks: '+id,()=>{
  const b=fish(id);F.beginWindow(b,b.mood,500,10000,()=>0);F.acceptPull(b,10600);b.reeling=true;
  const warn=b.nushiWindow.warnAt;F.windowPhase(b,warn);const tension=b.ten;
  for(let dt=0;dt<=600;dt+=120)F.step(b,b.mood,gear,1,warn+dt);
  assert.equal(b.ten,tension,'600 ms to see and release is safe');
  for(let dt=720;dt<F.nushiTiming.warning;dt+=120)F.step(b,b.mood,gear,1,warn+dt);
  assert.ok(b.ten>=100);
 });
}

test('timely release clears strain, preserves the gain and lets the line recover; practice stays forgiving',()=>{
 const b=fish();F.beginWindow(b,b.mood,500,10000,()=>.3);F.acceptPull(b,10600);b.reeling=true;
 const warn=b.nushiWindow.warnAt;F.windowPhase(b,warn);F.step(b,b.mood,gear,1,warn+720);
 assert.ok(b.nushiStrain>0);F.releasePull(b,warn+800);b.reeling=false;const gain=b.retrieval;
 for(let i=0;i<15;i++)F.step(b,{id:'rush',calm:false},gear,1,warn+840+i*120);
 assert.equal(b.nushiStrain,0);assert.equal(b.retrieval,gain);assert.ok(b.ten<10);
 b.practice=true;b.reeling=true;for(let i=0;i<30;i++)F.step(b,{id:'rush',calm:false},gear);
 assert.ok(b.ten<100);
});

test('natural turns alternate pull openings with runs, and head-shake frames move the actual hook pose',()=>{
 const app=boot({...seed(),fightMode:'nushi',ownedRods:['tideMaster'],selectedRod:'tideMaster'}),w=app.window;
 try{
  w.eval('cast();beginFishing();battle.cast=50;launchSurfaceCast();settleSurfaceCast();var testNow=10000;Date.now=()=>testNow;startFight();clearInterval(timer);stopBattleFishArt();releaseBattleAction();');
  for(let i=0;i<10;i++){
   const calm=read(w,'Boolean(battle.mood.calm)');w.chooseFishMood();assert.notEqual(read(w,'Boolean(battle.mood.calm)'),calm);
  }
  w.eval('if(!battle.mood.calm)chooseFishMood();pressBattleAction();testNow=battle.nushiWindow.warnAt;ShuFishing.windowPhase(battle,testNow);renderBattleFish();');
  const frames=[];
  for(let i=0;i<10;i++){w.eval('testNow+=32;renderBattleFish()');frames.push(Number(w.document.querySelector('#battleFish').dataset.spriteFrame));assert.equal(w.document.querySelector('#battleFish').dataset.resisting,'true');assert.equal(w.document.querySelector('#battleFish').dataset.spriteMode,'turn');}
  assert.ok(Math.max(...frames)-Math.min(...frames)>.9);
  assert.ok(read(w,'Number.isFinite(battleMouthAndHook(false).lineX)'));
  w.endBattle();assert.equal(w.document.querySelector('#fishScene').dataset.nushiPhase,undefined);
  assert.equal(w.document.querySelector('#nushiCue').textContent,'');assert.deepEqual(app.errors,[]);
 }finally{app.dispose();}
});

test('escape surges also vary the background speed when a fish reaches the right edge',()=>{
 const app=boot({...seed(),fightMode:'nushi'}),w=app.window;
 try{
  w.eval('cast();beginFishing();battle.cast=50;launchSurfaceCast();settleSurfaceCast();battle.f=fish.find(f=>f.id==="bass");var testNow=10000;Date.now=()=>testNow;startFight();clearInterval(timer);stopBattleFishArt();battle.gillWash=null;battle.mood=fightProfiles[battle.f.id].moods.find(m=>!m.calm);battle.x=fishSwimBounds().maxX;');
  const speeds=[],travel=[];
  for(let i=0;i<20;i++){w.eval('testNow+=120;moveBattleFish(battle.mood);advanceUnderwaterTravel()');speeds.push(read(w,'battle.escapeSpeed'));travel.push(read(w,'battle.underwaterCamera.velocity'));}
  assert.ok(Math.max(...speeds)>Math.min(...speeds)*1.4);assert.ok(Math.max(...travel)>.01);assert.ok(Math.max(...travel)-Math.min(...travel)>.002);
  assert.deepEqual(app.errors,[]);
 }finally{app.dispose();}
});

test('a flatfish still on the bottom visibly shakes its head before dangerous resistance',()=>{
 const app=boot({...seed(),fightMode:'nushi'}),w=app.window;
 try{
  w.eval('cast();beginFishing();battle.cast=50;launchSurfaceCast();settleSurfaceCast();battle.f=fish.find(f=>f.id==="hirame");var testNow=10000;Date.now=()=>testNow;startFight();clearInterval(timer);stopBattleFishArt();battle.sandLifted=false;battle.mood=fightProfiles.hirame.moods.find(m=>m.calm);battle.nextMood=ShuFishing.beginWindow(battle,battle.mood,500,testNow);testNow=battle.nushiWindow.warnAt;ShuFishing.windowPhase(battle,testNow);renderBattleFish()');
  assert.equal(read(w,'Boolean(battle.sandLifted)'),false);assert.equal(w.document.querySelector('#battleFish').dataset.spriteMode,'turn');
  assert.equal(w.document.querySelector('#battleFish').dataset.resisting,'true');assert.deepEqual(app.errors,[]);
 }finally{app.dispose();}
});
