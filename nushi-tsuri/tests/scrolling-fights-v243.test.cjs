const {test}=require('node:test'),assert=require('node:assert/strict');
const {createCanvas}=require('@napi-rs/canvas');
const F=require('../fishing-duel.js'),Camera=require('../underwater-camera.js');
const {boot,seed,read}=require('./game-harness.cjs');

test('short and long species budgets both retrieve a meaningful distance without press-to-refill',()=>{
 for(const roll of [0,1]){
  const b={fightMode:'nushi',mood:{id:'rest',calm:true},f:{id:'namazu'},ten:18,retrieval:.1,reeling:false};
  b.nextMood=F.beginWindow(b,b.mood,520,10000,()=>roll);
  const pressAt=b.nushiWindow.warnAt-100;
  assert.equal(F.acceptPull(b,pressAt),true);b.reeling=true;
  const deadline=b.nextMood,warn=b.nushiWindow.warnAt,gear={power:38,strength:4.8,control:1.95};
  assert.equal(warn-pressAt,F.rhythm('namazu').pull[roll]);
  for(let now=pressAt;now<warn;now+=120){
   assert.equal(F.windowPhase(b,now),'pulling');F.step(b,b.mood,gear,1,now);
   F.acceptPull(b,now);assert.equal(b.nextMood,deadline);
  }
  assert.ok(b.retrieval>.3,'even the short opening retrieves a useful stretch');
  assert.equal(F.windowPhase(b,warn),'warning');assert.equal(b.nextMood,warn+F.nushiTiming.warning);
  const before=b.retrieval;F.step(b,b.mood,gear,1,warn);assert.equal(b.retrieval,before);
 }
});

test('a stalled tick cannot jump straight from pulling into the fish run without showing its warning',()=>{
 const app=boot({...seed(),hp:100,soundEnabled:false,fightMode:'nushi',ownedRods:['tideMaster'],selectedRod:'tideMaster'}),w=app.window;
 try{
  w.eval('cast();beginFishing();battle.cast=50;launchSurfaceCast();settleSurfaceCast();var testNow=10000;Date.now=()=>testNow;startFight();releaseBattleAction();stopBattleFishArt();battle.mood=fightProfiles[battle.f.id].moods.find(m=>m.calm);battle.nextMood=ShuFishing.beginWindow(battle,battle.mood,520,testNow);pressBattleAction();var fightTick;setInterval=fn=>(fightTick=fn,9001);battleTick();testNow=battle.nextMood+6000;fightTick()');
  assert.equal(w.document.querySelector('#fishScene').dataset.nushiPhase,'warning');
  assert.equal(read(w,'battle.nextMood-testNow'),F.nushiTiming.warning);
  const gained=read(w,'battle.retrieval');w.releaseBattleAction();
  w.eval('testNow+=1320;fightTick()');assert.equal(read(w,'battle.mood.calm'),true);
  assert.equal(read(w,'battle.retrieval'),gained);
  w.eval('testNow+=240;fightTick()');assert.ok(read(w,'battle.nextMood')>read(w,'testNow'));
  assert.deepEqual(app.errors,[]);
 }finally{app.dispose();}
});

test('fish chases remain visible for nearly two seconds when the spoon stops, and full-speed winding can lose a follower',()=>{
 const slow=F.newLure(20),fast=F.newLure(20);fast.speed=1;
 for(let i=0;i<12;i++)assert.equal(F.stepLure(slow,false,true).bite,false);
 let caught=false;for(let i=0;i<8;i++)caught ||= F.stepLure(slow,false,true).bite;
 assert.equal(caught,true);
 let departed=false;for(let i=0;i<60;i++)departed ||= F.stepLure(fast,true,true).depart;
 assert.equal(departed,true);assert.ok(fast.approach<1);
});

test('mirrored scenery loops cover wide and narrow screens through positive, negative and complete turns without gaps',()=>{
 const source=createCanvas(11,8),c=source.getContext('2d');
 for(let x=0;x<11;x++){c.fillStyle=`rgb(${20+x*18},80,130)`;c.fillRect(x,0,1,8);}
 for(const [width,height]of [[90,30],[37,73],[128,67]]){
  const canvas=createCanvas(width,height);
  for(const offset of [-21.01,-2,-.999,-.01,0,.499,.999,1,1.999,22.01]){
   Camera.paint(canvas,[source],offset);const first=canvas.getContext('2d').getImageData(0,0,width,height).data;
   assert.ok(first.every((value,index)=>index%4!==3||value===255),'every output pixel is covered');
   Camera.paint(canvas,[source],offset+2);const repeated=canvas.getContext('2d').getImageData(0,0,width,height).data;
   assert.deepEqual(repeated,first,'a complete loop has no reset cut');
  }
 }
});

test('camera travel reverses smoothly, and resume starts at the last shown frame without a time jump',()=>{
 const camera=Camera.create(0);
 for(let i=1;i<=20;i++)Camera.advance(camera,.005,i*120);
 const away=camera.offset;assert.ok(away>0);
 for(let i=21;i<=50;i++)Camera.advance(camera,-.005,i*120);
 assert.ok(camera.offset<away);
 camera.shown=Camera.position(camera,6050);const shown=camera.shown;
 Camera.resume(camera,66050);assert.equal(Camera.position(camera,66050),shown);
 assert.ok(Math.abs(Camera.position(camera,66170)-shown)<.006);
});

for(const method of ['bait','lure'])test('background travel reflects fish escape and retrieval without changing a specimen, resources or real meters: '+method,()=>{
 const app=boot({...seed(),hp:100,soundEnabled:false,fightMode:'nushi',fishingMethod:method,ownedRods:['tideMaster','lureRod'],selectedRod:method==='lure'?'lureRod':'tideMaster',lures:{silverSpoon:1}}),w=app.window;
 try{
  w.eval('cast();beginFishing();battle.cast=50;launchSurfaceCast();settleSurfaceCast();battle.f=fish.find(f=>f.id==="bass");battle.specimen=rollFishSpecimen(battle.f,()=>.5);startFight();clearInterval(timer);stopBattleFishArt();battle.mood=fightProfiles[battle.f.id].moods.find(m=>!m.calm);battle.vx=1;battle.retrievalDelta=-.01;advanceUnderwaterTravel()');
  const before=read(w,'[battle.f.id,battle.specimen,battle.startMeters,battle.retrieval,s.baits,s.lures,s.gameMinutes,s.caught]');
  assert.ok(read(w,'battle.underwaterCamera.offset')>0);
  w.eval('battle.mood=fightProfiles[battle.f.id].moods.find(m=>m.calm);battle.retrievalDelta=.01;for(let i=0;i<20;i++)advanceUnderwaterTravel()');
  assert.ok(read(w,'battle.underwaterCamera.offset')<0);
  assert.deepEqual(read(w,'[battle.f.id,battle.specimen,battle.startMeters,battle.retrieval,s.baits,s.lures,s.gameMinutes,s.caught]'),before);
  w.pauseBattle();const paused=read(w,'battle.underwaterCamera');w.advanceUnderwaterTravel();assert.deepEqual(read(w,'battle.underwaterCamera'),paused);
  w.endBattle();assert.equal(w.document.querySelector('#fishScene').classList.contains('underwater-travel'),false);
  assert.deepEqual(app.errors,[]);
 }finally{app.dispose();}
});

test('a nearly retrieved fish cannot escape across the full viewport while the meter says zero',()=>{
 const app=boot({...seed(),fightMode:'nushi'}),w=app.window;
 try{
  w.eval('cast();beginFishing();battle.cast=50;launchSurfaceCast();settleSurfaceCast();startFight();clearInterval(timer);stopBattleFishArt()');
  const bounds=read(w,'(()=>{battle.retrieval=0;const far=fishSwimBounds();battle.retrieval=.9;const close=fishSwimBounds();battle.retrieval=1;return {far,close,land:fishSwimBounds(),x:battle.surfaceX,y:battle.surfaceY};})()');
  assert.ok(bounds.close.maxX<bounds.far.maxX*.5);assert.ok(bounds.close.maxY<bounds.far.maxY*.5);
  assert.ok(bounds.land.maxX-bounds.x<7);assert.ok(bounds.land.maxY-bounds.y<7);
  assert.deepEqual(app.errors,[]);
 }finally{app.dispose();}
});
