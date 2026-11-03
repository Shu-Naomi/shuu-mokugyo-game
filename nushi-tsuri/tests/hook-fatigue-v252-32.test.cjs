const {test}=require('node:test'),assert=require('node:assert/strict');
const F=require('../fishing-duel.js'),{boot,seed,read}=require('./game-harness.cjs');
const rod={power:38,strength:4.8,control:1.95};
const rest={id:'rest',calm:true},run={id:'rush',calm:false,speedX:.6};
const fish=(id='bass')=>({fightMode:'nushi',f:{id},mood:rest,ten:18,retrieval:.3,reeling:true});
function warning(b,now=0){
 b.mood=rest;F.beginWindow(b,rest,520,now,()=>0);
 F.acceptPull(b,now);F.windowPhase(b,b.nushiWindow.warnAt);return b.nushiWindow.warnAt;
}
test('all supported fish have longer endurance, with distinct species values and fresh reserve',()=>{
 for(const id of Object.keys(F.fishStrength)){
  assert.ok(F.endurance[id]>100,id);
  assert.equal(F.fatigue({...fish(id),nushiRunTicks:0}),0);
  assert.ok(F.fatigue({...fish(id),nushiRunTicks:100})<1);
  assert.equal(F.fatigue({...fish(id),nushiRunTicks:F.endurance[id]}),1);
 }
 assert.ok(F.endurance.medaka<F.endurance.koi);
 assert.ok(F.endurance.koi<F.endurance.starNushi);
 assert.notEqual(F.endurance.yamame,F.endurance.iwana);
});
test('fatigue advances only on active run steps, not slack or reading the cue',()=>{
 const b=fish();b.reeling=false;
 for(let i=0;i<200;i++){F.step(b,rest,rod);F.windowPhase(b,100000);}
 assert.equal(b.nushiRunTicks,undefined);assert.equal(F.fatigue(b),0);
 F.step(b,run,rod);assert.equal(b.nushiRunTicks,1);
});
test('warning has reaction margin; one episode charges once, repeated episodes accumulate and show danger before loss',()=>{
 const b=fish('starNushi');let shownDanger=false;
 for(let n=0;n<10&&!b.nushiHookLost;n++){
  const now=warning(b,n*10000);b.reeling=true;b.ten=3;
  const before=b.nushiHookWear||0;
  F.step(b,rest,rod,1,now+600);assert.equal(b.nushiHookWear||0,before);
  F.step(b,rest,rod,1,now+720);
  if(b.nushiHookLost)assert.ok(shownDanger);
  shownDanger ||= F.hookState(b)==='危険';
  const wear=b.nushiHookWear;
  b.reeling=false;F.step(b,rest,rod,1,now+840);
  b.reeling=true;F.step(b,rest,rod,1,now+960);assert.equal(b.nushiHookWear,wear);
 }
 assert.ok(b.nushiHookLost);assert.ok(shownDanger);
});
test('safe yielding restores gradually, but idle slack and tap releases do not erase damage',()=>{
 const b=fish();b.nushiHookWear=.6;const now=warning(b);
 b.nushiYielded=true;b.reeling=false;
 F.step(b,rest,rod,1,now);assert.equal(b.nushiHookWear,.6);
 F.step(b,run,rod,1,now+1500);assert.ok(b.nushiHookWear<.6&&b.nushiHookWear>.59);
 b.nushiHookCharged=true;const before=b.nushiHookWear;
 F.step(b,run,rod,1,now+1620);assert.equal(b.nushiHookWear,before);
});
test('species and rod control affect hook wear, practice cannot lose its hook',()=>{
 function wear(id,control,practice=false){
  const b=fish(id);b.practice=practice;const now=warning(b);
  F.step(b,rest,{...rod,control},1,now+720);return b.nushiHookWear;
 }
 assert.ok(wear('bass',1)>wear('tanago',1));
 assert.ok(wear('bass',1)>wear('bass',1.95));
 const b=fish();b.practice=true;b.nushiHookWear=1;warning(b);F.step(b,rest,rod,1,1e5);
 assert.equal(b.nushiHookLost,false);
});
test('runtime displays hook condition only in nushi and starts fresh each battle',()=>{
 const app=boot({...seed(),fightMode:'nushi'}),w=app.window;
 try{
  w.eval('cast();beginFishing();battle.cast=50;launchSurfaceCast();settleSurfaceCast();startFight();battle.nushiHookWear=.8;drawBattle()');
  assert.match(w.document.querySelector('#battleMsg').textContent,/針：危険/);
  assert.equal(read(w,'battle.nushiHookLost'),false);
  w.eval('battle.fightMode="gauge";battle.nushiHookWear=.8;drawBattle()');
  assert.equal(w.document.querySelector('#fishScene').dataset.nushiPhase,undefined);
  assert.deepEqual(app.errors,[]);
 }finally{app.dispose();}
});
test('real fight ticks accumulate separate warned mistakes, escape via hook loss, and reset next fight',()=>{
 const app=boot({...seed(),fightMode:'nushi'}),w=app.window;
 try{
  w.eval('cast();beginFishing();battle.cast=50;launchSurfaceCast();settleSurfaceCast();startFight();clearInterval(timer);var testNow=10000;Date.now=()=>testNow;var hookTick;setInterval=fn=>(hookTick=fn,9001);battleTick();battle.practice=false;');
  for(let n=0;n<12&&read(w,'battle.phase')==='fight';n++){
   w.eval(`battle.mood=fightProfiles[battle.f.id].moods.find(m=>m.calm);battle.gillWash=null;
    battle.nextMood=ShuFishing.beginWindow(battle,battle.mood,520,testNow,()=>0);
    releaseBattleAction();pressBattleAction();testNow=battle.nushiWindow.warnAt;
    ShuFishing.windowPhase(battle,testNow);drawBattle();testNow+=720;battle.ten=3;hookTick();
    if(battle.phase==='fight'){releaseBattleAction();testNow+=120;hookTick();testNow+=5000;}`);
  }
  assert.equal(read(w,'battle.phase'),'escape');
  assert.equal(read(w,'battle.nushiHookLost'),true);
  assert.ok(read(w,'battle.ten')<100,'loss was hook wear, not broken line');
  assert.match(w.document.querySelector('#fishEscapeCaption').textContent,/針が外れた/);
  w.eval('endBattle();cast();beginFishing();battle.cast=50;launchSurfaceCast();settleSurfaceCast();startFight()');
  assert.equal(read(w,'battle.nushiHookWear'),0);
  assert.equal(read(w,'battle.nushiHookLost'),false);
  assert.equal(read(w,'battle.nushiRunTicks'),0);
  assert.deepEqual(app.errors,[]);
 }finally{app.dispose();}
});
