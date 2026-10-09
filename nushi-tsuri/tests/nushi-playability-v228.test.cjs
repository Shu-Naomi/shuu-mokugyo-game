const {test}=require('node:test'),assert=require('node:assert/strict');
const F=require('../fishing-duel.js'),{boot,seed,read}=require('./game-harness.cjs');
const {runFight}=require('./nushi-playability-v228.cjs');

test('a late correct pull gets time to retrieve, then a readable warning; repeated presses cannot refill it',()=>{
 const b={fightMode:'nushi',mood:{id:'rest',calm:true},f:{id:'namazu'},retrieval:.2,ten:18,reeling:false};
 b.nextMood=F.beginWindow(b,b.mood,520,10000);
 assert.equal(F.acceptPull(b,11600),true);const deadline=b.nextMood;
 assert.ok(b.nushiWindow.warnAt-11600>=1200);
 for(let now=11600;now<12800;now+=120){b.reeling=true;assert.equal(F.acceptPull(b,now),true);assert.equal(b.nextMood,deadline);b.reeling=false;}
 b.reeling=true;assert.equal(F.windowPhase(b,12800),'warning');
 assert.ok(b.nextMood-12800>=900);const before=b.retrieval;
 F.step(b,b.mood,{power:38,strength:4.8,control:1.95});assert.equal(b.retrieval,before);
 b.reeling=false;F.step(b,b.mood,{power:38,strength:4.8,control:1.95});assert.equal(b.lineSlack,false);
 assert.equal(F.acceptPull(b,12800),false);
 const gauge={fightMode:'gauge'};assert.equal(F.beginWindow(gauge,b.mood,520,10000),10520);assert.equal(gauge.nushiWindow,null);
});

test('releasing a successful pull before a run retains distance, while a late release still loses it',()=>{
 const b={fightMode:'nushi',mood:{id:'rest',calm:true},f:{id:'starNushi'},retrieval:.4,ten:18,reeling:false};
 b.nextMood=F.beginWindow(b,b.mood,520,10000);F.acceptPull(b,10600);b.reeling=true;
 assert.equal(F.releasePull(b,11900),true);b.reeling=false;b.mood={id:'rush',calm:false,danger:true};
 F.beginWindow(b,b.mood,1000,12700);const before=b.retrieval;
 for(let i=0;i<40;i++)F.step(b,b.mood,{power:38,strength:4.8,control:1.95},1.75);
 assert.equal(b.retrieval,before);F.acceptPull(b,14000);b.reeling=true;
 F.step(b,b.mood,{power:38,strength:4.8,control:1.95},1.75);assert.ok(b.retrieval<before);
 b.reeling=false;const late={fightMode:'nushi',mood:{id:'rest',calm:true},reeling:false};
 late.nextMood=F.beginWindow(late,late.mood,520,10000);F.acceptPull(late,10600);late.reeling=true;
 assert.equal(F.releasePull(late,late.nextMood+120),false);assert.equal(late.nushiYielded,false);
});

test('a hold carried over from a run cannot count as a newly timed slack pull',()=>{
 const b={fightMode:'nushi',mood:{id:'rest',calm:true},f:{id:'namazu'},retrieval:.2,ten:18,reeling:true};
 b.nextMood=F.beginWindow(b,b.mood,520,10000);
 for(let i=0;i<10;i++)F.step(b,b.mood,{power:38,strength:4.8,control:1.95});
 assert.equal(b.retrieval,.2);assert.equal(b.nushiWindow.accepted,false);
});

test('backgrounding preserves pull and warning clocks, clears the hold, and cannot skip the warning on resume',()=>{
 const app=boot({...seed(),fightMode:'nushi'}),w=app.window;
 try{
  w.eval('cast();beginFishing();battle.cast=50;launchSurfaceCast();settleSurfaceCast();var testNow=10000;Date.now=()=>testNow;startFight();releaseBattleAction();battle.mood=fightProfiles[battle.f.id].moods.find(m=>m.calm);battle.nextMood=ShuFishing.beginWindow(battle,battle.mood,520,testNow);pressBattleAction();drawBattle()');
  const before=read(w,'({warn:battle.nushiWindow.warnAt-testNow,end:battle.nextMood-testNow})');
  w.pauseBattle();w.eval('testNow+=60000');w.resumeBattle();w.drawBattle();
  assert.deepEqual(read(w,'({warn:battle.nushiWindow.warnAt-testNow,end:battle.nextMood-testNow})'),before);
  assert.equal(read(w,'battle.reeling'),false);assert.equal(w.document.querySelector('#fishScene').dataset.nushiPhase,'slack');
  assert.deepEqual(app.errors,[]);
 }finally{app.dispose();}
});

test('a regional boss phase transition waits for the current pull and warning instead of abruptly attacking',()=>{
 const app=boot({...seed(),fightMode:'nushi'}),w=app.window;
 try{
  w.eval('cast();beginFishing();battle.cast=50;launchSurfaceCast();settleSurfaceCast();battle.f=fish.find(f=>f.id==="starNushi");var testNow=10000;Date.now=()=>testNow;startFight();releaseBattleAction();battle.mood=fightProfiles.starNushi.moods.find(m=>m.calm);battle.nextMood=ShuFishing.beginWindow(battle,battle.mood,520,testNow);pressBattleAction();battle.retrieval=.33');
  const deadline=read(w,'battle.nextMood');assert.equal(w.updateNushiFightStage(),true);
  assert.equal(read(w,'battle.nushiStage'),2);assert.equal(read(w,'battle.nushiStageChanged'),true);assert.equal(read(w,'battle.nextMood'),deadline);
  assert.deepEqual(app.errors,[]);
 }finally{app.dispose();}
});

const conditions=[];
for(const delayMs of [0,360,600])for(const rngSeed of [301,907,1717])conditions.push({id:'namazu',tier:.5,delayMs,rngSeed});
for(const id of ['namazu','koi','raigyo','nushi','starNushi'])for(const tier of [.5,.999999])for(const rngSeed of [301,907,1717])
 if(id!=='namazu'||tier!==.5)conditions.push({id,tier,delayMs:600,rngSeed});
for(const condition of conditions)test(`visible cues with ${condition.delayMs}ms input delay land ${condition.id} tier ${condition.tier} seed ${condition.rngSeed}`,()=>{
 const r=runFight(condition);console.log('V228_FIGHT '+JSON.stringify(r));
 assert.deepEqual(r.errors,[]);assert.equal(r.start.id,condition.id);assert.equal(r.phase,'landing');
 assert.ok(r.warningCount>0,'observed the release cue before runs');
});

test('holding A throughout a natural heavyweight fight still loses instead of automatically landing it',()=>{
 const r=runFight({id:'namazu',delayMs:0,holdAlways:true});console.log('V228_HOLD '+JSON.stringify(r));
 assert.deepEqual(r.errors,[]);assert.equal(r.phase,'lost');assert.equal(r.maxProgress,0);
});
