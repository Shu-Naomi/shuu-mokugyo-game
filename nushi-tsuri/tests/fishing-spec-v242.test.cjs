const {test}=require('node:test'),assert=require('node:assert/strict');
const {boot,seed,read}=require('./game-harness.cjs');
const F=require('../fishing-duel.js');

function fishing(mode='nushi',method='bait'){
 const app=boot({...seed(),hp:100,soundEnabled:false,fightMode:mode,
  ownedRods:['bamboo','tideMaster','lureRod'],selectedRod:method==='lure'?'lureRod':'tideMaster',
  fishingMethod:method,lures:{silverSpoon:1}}),w=app.window;
 Object.defineProperties(w.document.querySelector('#fishScene'),{clientWidth:{value:844},clientHeight:{value:326}});
 Object.defineProperties(w.document.querySelector('#battleFish'),{offsetWidth:{value:150},offsetHeight:{value:75}});
 w.eval('cast();beginFishing();battle.cast=50;launchSurfaceCast();settleSurfaceCast();clearInterval(timer)');
 return app;
}

for(const mode of ['gauge','nushi'])test('a complete quick tap between lure ticks moves the spoon and can attract a visible fish in '+mode,()=>{
 const app=fishing(mode,'lure'),w=app.window;
 try{
  const before=read(w,'[s.money,s.baits,s.lures,s.gameMinutes]');
  w.pressBattleAction();w.releaseBattleAction();w.updateLurePresentation();
  assert.ok(read(w,'battle.lureMotion.travel')>0,'a short tap must not disappear between 120ms ticks');
  assert.ok(read(w,'battle.lureMotion.attraction')>0);
  for(let tap=0;tap<12&&read(w,'battle.phase')==='lure';tap++){
   w.eval('for(let i=0;i<3&&battle.phase==="lure";i++)updateLurePresentation()');
   if(read(w,'battle.phase')==='lure'){w.pressBattleAction();w.releaseBattleAction();w.updateLurePresentation();}
  }
  assert.equal(read(w,'battle.phase'),'interest');assert.equal(w.document.querySelector('#battleFish').style.opacity,'1');
  assert.equal(read(w,'battle.reeling'),false);assert.deepEqual(read(w,'[s.money,s.baits,s.lures,s.gameMinutes]'),before);
  assert.deepEqual(app.errors,[]);
 }finally{app.dispose();}
});

for(const mode of ['gauge','nushi'])test('the first visible bite opens a full hook window even after a stalled tick in '+mode,()=>{
 const app=fishing(mode),w=app.window;
 try{
  const before=read(w,'[s.money,s.baits,s.caught,s.gameMinutes]');
  w.eval('var testNow=battle.biteAt+40000;Date.now=()=>testNow;syncBitePhase()');
  assert.equal(read(w,'battle?.phase'),'bite','never miss a bite before its first display');
  assert.equal(read(w,'battle.biteShownAt'),read(w,'testNow'));
  w.eval('testNow+=1499');assert.equal(w.syncBitePhase(),true);
  w.eval('testNow+=2');assert.equal(w.syncBitePhase(),false);assert.equal(read(w,'battle'),null);
  assert.deepEqual(read(w,'[s.money,s.baits,s.caught,s.gameMinutes]'),before);assert.deepEqual(app.errors,[]);
 }finally{app.dispose();}
});

test('an input that first reveals the bite cannot also hook, and a fresh hook input cannot also reel',()=>{
 const app=fishing(),w=app.window;
 try{
  const individual=read(w,'[battle.f.id,battle.specimen]');w.eval('battle.biteAt=Date.now()');
  w.pressBattleAction();assert.equal(read(w,'battle.phase'),'bite');
  w.pressBattleAction();assert.equal(read(w,'battle.phase'),'bite','a held or repeated event is not a new press');
  w.releaseBattleAction();w.pressBattleAction();assert.equal(read(w,'battle.phase'),'fight');assert.equal(read(w,'battle.reeling'),false);
  w.pressBattleAction();assert.equal(read(w,'battle.reeling'),false);
  w.releaseBattleAction();w.pressBattleAction();assert.equal(read(w,'battle.reeling'),true);
  assert.deepEqual(read(w,'[battle.f.id,battle.specimen]'),individual);assert.deepEqual(app.errors,[]);
 }finally{app.dispose();}
});

test('backgrounding freezes the displayed hook window and cancels an unconsumed lure tap',()=>{
 for(const method of ['bait','lure']){
  const app=fishing('nushi',method),w=app.window;
  try{
   w.eval('var testNow=10000;Date.now=()=>testNow');
   if(method==='bait')w.eval('battle.biteAt=testNow;syncBitePhase();testNow+=600');
   else{w.pressBattleAction();w.releaseBattleAction();}
   w.pauseBattle();w.eval('testNow+=60000');w.resumeBattle();
   if(method==='bait'){
    assert.equal(read(w,'testNow-battle.biteShownAt'),600);w.pressBattleAction();assert.equal(read(w,'battle.phase'),'fight');
   }else{
    w.updateLurePresentation();assert.equal(read(w,'battle.lureMotion.attraction'),0);assert.equal(read(w,'battle.lureMotion.travel'),0);
    w.pressBattleAction();w.releaseBattleAction();w.updateLurePresentation();assert.ok(read(w,'battle.lureMotion.travel')>0);
   }
   assert.deepEqual(app.errors,[]);
  }finally{app.dispose();}
 }
});

test('spoon distance uses cast meters and its remaining distance and position carry into the hooked fight',()=>{
 for(const id of ['bass','hirame'])for(const travel of [.83,.995]){
  const app=fishing('nushi','lure'),w=app.window;
  try{
   assert.equal(read(w,'battle.lureMotion.distance'),read(w,'castMetersForDistance(50)'));
   assert.match(w.document.querySelector('#distanceLabel').textContent,/20m/);
   w.eval(`battle.f=fish.find(f=>f.id===${JSON.stringify(id)});revealLureFish();battle.lureMotion.travel=${travel};battle.lureMotion.approach=1;updateLurePresentation()`);
   assert.equal(read(w,'battle.phase'),'bite');
   const before=read(w,'({x:battle.x,y:battle.y,meters:battle.lureMotion.distance*(1-battle.lureMotion.travel),id:battle.f.id,specimen:battle.specimen})');
   w.pressBattleAction();assert.equal(read(w,'battle.phase'),'fight');
   assert.equal(read(w,'battle.startMeters'),before.meters);assert.deepEqual(read(w,'[battle.startX,battle.startY]'),[before.x,before.y]);
   assert.equal(read(w,'battle.f.id'),before.id);assert.deepEqual(read(w,'battle.specimen'),before.specimen);
   const bounds=read(w,'fishSwimBounds()');assert.ok(before.x>=bounds.minX&&before.x<=bounds.maxX,'no snap back to the original cast');
   assert.ok(before.y>=bounds.minY&&before.y<=bounds.maxY);assert.ok(w.document.querySelector('#distanceLabel').textContent.includes(Math.ceil(before.meters)+'m'));
   assert.deepEqual(app.errors,[]);
  }finally{app.dispose();}
 }
});

test('nushi escape motions never drift left against their right-facing cue, including slow bottom fish and near landing',()=>{
 const app=fishing(),w=app.window;
 try{
  w.startFight();w.eval('clearInterval(timer)');
  const failures=read(w,`(()=>{const failures=[];for(const f of fish)for(const mood of fightProfiles[f.id].moods.filter(m=>!m.calm))for(const progress of [0,.5,.9]){
   Object.assign(battle,{f,mood,retrieval:progress,reeling:false,sandLifted:true,moodTick:0,swimTick:0,vx:0,vy:0,motionX:1,motionY:1,startX:74,startY:55,turning:null,facing:1});
   const bounds=fishSwimBounds();battle.x=bounds.maxX-1;battle.y=(bounds.minY+bounds.maxY)/2;setFishCourse(mood);const before=battle.x;moveBattleFish(mood);
   if(battle.x<before-.001)failures.push({id:f.id,mood:mood.id,progress,before,after:battle.x});
  }return failures;})()`);
  assert.deepEqual(failures,[]);assert.deepEqual(app.errors,[]);
 }finally{app.dispose();}
});

test('a slack line and the warning cue agree immediately when drawn, before the next physics tick',()=>{
 const app=fishing(),w=app.window;
 try{
  w.eval('var testNow=10000;Date.now=()=>testNow;startFight();clearInterval(timer);releaseBattleAction();battle.mood=fightProfiles[battle.f.id].moods.find(m=>m.calm);battle.nextMood=ShuFishing.beginWindow(battle,battle.mood,520,testNow);battle.lineSlack=false;drawBattle()');
  assert.equal(w.document.querySelector('#fishScene').dataset.nushiPhase,'slack');assert.equal(w.document.querySelector('#linePath').classList.contains('slack'),true);
  w.eval('testNow=battle.nushiWindow.warnAt;drawBattle()');assert.equal(w.document.querySelector('#fishScene').dataset.nushiPhase,'warning');assert.equal(w.document.querySelector('#linePath').classList.contains('slack'),false);
  assert.deepEqual(app.errors,[]);
 }finally{app.dispose();}
});

test('lure travel represents equal meters per second at different cast distances',()=>{
 const short=F.newLure(7),far=F.newLure(33);
 for(let i=0;i<20;i++){F.stepLure(short,true);F.stepLure(far,true);}
 assert.ok(Math.abs(short.distance*short.travel-far.distance*far.travel)<1e-9);
 assert.equal(short.distance,7);
});

test('the hook follows the displayed CSS pose while the fish is moving between ticks',()=>{
 const app=fishing(),w=app.window;
 try{
  w.eval('startFight();clearInterval(timer);finishHookReveal();Object.assign(battle,{x:60,y:55,facing:1,turning:null,mouthState:"closed",visualOffsetX:0,visualOffsetY:0,renderAngle:0,turnRoll:0});renderBattleFish()');
  const scene=w.document.querySelector('#fishScene'),sprite=w.document.querySelector('#battleFish');
  scene.getBoundingClientRect=()=>({left:20,top:30,width:844,height:326});
  sprite.getBoundingClientRect=()=>({left:20+844*.44-75,top:30+326*.5-37.5,width:150,height:75});
  const style=w.getComputedStyle;
  w.getComputedStyle=node=>node===sprite?{transform:'matrix(1, 0, 0, 1, 0, 0)'}:style(node);
  for(const [degrees,facing]of [[0,1],[-25,-1],[32,1]]){
   const rad=degrees*Math.PI/180,cos=Math.cos(rad),sin=Math.sin(rad),a=cos*1.2*facing,b=sin*1.2*facing,c=-sin*.8,d=cos*.8;
   w.DOMMatrix=class{constructor(){Object.assign(this,{a,b,c,d});}};
   const data=read(w,'({actual:battleMouthAndHook(),target:battleMouthAndHook(false),profile:fishMouthProfiles[battle.f.id]})'),p=data.profile;
   const x=844*.44+a*p.x*150+c*p.y*75-facing*cos*p.inset-sin*p.drop;
   const y=326*.5+b*p.x*150+d*p.y*75-facing*sin*p.inset+cos*p.drop;
   assert.ok(Math.abs(data.actual.rootX*844/1000-x)<1e-6);
   assert.ok(Math.abs(data.actual.rootY*326/500-y)<1e-6);
   assert.ok(Math.abs(data.actual.rootX-data.target.rootX)>100,'displayed position differs from the next simulation target');
  }
  assert.deepEqual(app.errors,[]);
 }finally{app.dispose();}
});

test('nushi right bounds reserve room for the whole displayed fish, including giant specimens',()=>{
 const app=fishing(),w=app.window;
 try{
  w.startFight();w.eval('clearInterval(timer)');
  for(const scale of [1,1.8])for(const angle of [0,30,-30]){
   w.eval(`Object.assign(battle,{f:fish.find(f=>f.id==="himemasu"),sandLifted:true,retrieval:.9,renderScale:1,specimenVisualScale:${scale},bodyStretch:1.05,bodySquash:1,renderAngle:${angle},turnRoll:0,visualOffsetX:2})`);
   const data=read(w,'({bounds:fishSwimBounds(),pose:battleFishVisualPose()})'),p=data.pose,rad=p.rotation*Math.PI/180;
   const half=(Math.abs(Math.cos(rad))*150*p.stretch+Math.abs(Math.sin(rad))*75*p.squash)*p.displayScale/2;
   assert.ok(data.bounds.maxX*844/100+half+Math.abs(p.offsetX)<=840.0001,'body stays inside the right edge');
  }
  assert.deepEqual(app.errors,[]);
 }finally{app.dispose();}
});
