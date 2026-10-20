const {test}=require('node:test'),assert=require('node:assert/strict');
const F=require('../fishing-duel.js'),{boot,seed,read,saveKey}=require('./game-harness.cjs');
const gear={power:38,strength:4.8,control:1.95};
for(const id of ['moroko','bass','buri','starNushi'])test('a rightward run takes real line past the cast point, including after a timely release: '+id,()=>{
 for(const released of [false,true]){
  const b={fightMode:'nushi',f:{id},mood:{id:'run',calm:false,speedX:1},startMeters:20,retrieval:0,ten:18,reeling:false,nushiYielded:released,moodTick:0};
  const start=F.remainingMeters(b),deltas=[];
  for(let i=0;i<30;i++){F.step(b,b.mood,gear);b.moodTick++;deltas.push(b.retrievalDelta);}
  assert.ok(F.remainingMeters(b)>start+.7);assert.ok(b.retrieval<0);assert.ok(deltas.every(d=>d<0));assert.ok(b.ten<20);
  const far=F.remainingMeters(b);b.mood={id:'rest',calm:true};F.beginWindow(b,b.mood,500,10000,()=>1);F.step(b,b.mood,gear,1,10000);assert.equal(F.remainingMeters(b),far);
  F.acceptPull(b,10600);b.reeling=true;F.step(b,b.mood,gear,1,10600);assert.ok(F.remainingMeters(b)<far);
 }
});
test('the distance label and camera follow the actual line at the right screen edge; pause freezes all three',()=>{
 const app=boot({...seed(),fightMode:'nushi',ownedRods:['tideMaster'],selectedRod:'tideMaster'}),w=app.window;
 try{
  w.eval('cast();beginFishing();battle.cast=50;launchSurfaceCast();settleSurfaceCast();battle.f=fish.find(f=>f.id==="bass");startFight();clearInterval(timer);timer=0;stopBattleFishArt();battle.gillWash=null;battle.retrieval=0;battle.nushiYielded=true;battle.mood=fightProfiles.bass.moods.find(m=>!m.calm);battle.x=fishSwimBounds().maxX;drawBattle()');
  const before=read(w,'ShuFishing.remainingMeters(battle)'),label=w.document.querySelector('#distanceLabel').textContent;
  for(let i=0;i<30;i++)w.eval('updateRetrieval(battle.mood);moveBattleFish(battle.mood);advanceUnderwaterTravel();drawBattle()');
  assert.ok(read(w,'ShuFishing.remainingMeters(battle)')>before+1);assert.notEqual(w.document.querySelector('#distanceLabel').textContent,label);
  assert.ok(read(w,'battle.underwaterCamera.offset')>0);assert.ok(parseFloat(w.document.querySelector('#distanceMeter').style.width)<=100);
  const bounds=read(w,'fishSwimBounds()');assert.ok(bounds.minX>=7&&bounds.maxX<=96);
  w.pauseBattle();const frozen=read(w,'({distance:ShuFishing.remainingMeters(battle),camera:battle.underwaterCamera,x:battle.x})');w.advanceUnderwaterTravel();assert.deepEqual(read(w,'({distance:ShuFishing.remainingMeters(battle),camera:battle.underwaterCamera,x:battle.x})'),frozen);assert.deepEqual(app.errors,[]);
 }finally{app.dispose();}
});
test('one field menu entry opens supplies; all live tackle controls remain in their own tab and save once',()=>{
 const app=boot({...seed(),money:100000,items:{tomato:2},lures:{silverSpoon:1,starMinnow:3},ownedRods:['bamboo','starGazer','lureRod'],rodCopies:{starGazer:3}}),w=app.window;let saved;
 const click=q=>{const n=w.document.querySelector(q);assert.ok(n,q);assert.equal(n.disabled,false,q);n.click();};
 try{
  assert.equal(w.document.querySelectorAll('[data-field-menu-target="tackle"]').length,0);click('[data-field-menu-target="items"]');
  assert.equal(w.document.querySelectorAll('#inventoryCategories button').length,7);assert.equal(w.document.querySelector('#inventoryCategory-bait'),null);assert.equal(w.document.querySelector('#inventoryCategory-lures'),null);assert.equal(w.document.querySelector('#inventoryCategory-tackle'),null);
  const before=read(w,'({money:s.money,hp:s.hp,baits:s.baits,lures:s.lures,copies:s.rodCopies,items:s.items,rod:s.selectedRod})');
  for(const id of ['food','ingredients','dogTreats','dogToys','parts','collection','offerings'])click('[data-inventory-category="'+id+'"]');
  assert.equal(w.document.querySelector('#inventoryCategory-parts [data-stored-lure="starMinnow"] strong').textContent,'×3');assert.match(w.document.querySelector('[data-inventory-category="parts"]').getAttribute('aria-label'),/所持1種類/);
  click('[data-inventory-tab="tackle"]');for(const id of ['bait','hook','rod','method','fight','copies'])click('[data-compact-group="'+id+'"]');assert.deepEqual(read(w,'({money:s.money,hp:s.hp,baits:s.baits,lures:s.lures,copies:s.rodCopies,items:s.items,rod:s.selectedRod})'),before);
  click('[data-compact-group="method"]');assert.match(w.document.querySelector('[data-compact-group-panel="method"]').textContent,/銀のスプーン ×1/);click('#inventory [data-fishing-method="lure"]');assert.equal(read(w,'s.selectedRod'),'lureRod');assert.equal(read(w,'s.lures.silverSpoon'),1);
  click('[data-compact-group="copies"]');click('#inventory [data-rod-duplicate="sell"]');assert.equal(read(w,'s.rodCopies.starGazer'),2);assert.equal(read(w,'s.money'),112000);
  saved=JSON.parse(w.localStorage.getItem(saveKey));assert.deepEqual(app.errors,[]);
 }finally{app.dispose();}
 const b=boot(saved);try{assert.equal(read(b.window,'s.fishingMethod'),'lure');assert.equal(read(b.window,'s.rodCopies.starGazer'),2);assert.equal(read(b.window,'s.money'),112000);assert.equal(read(b.window,'s.lures.starMinnow'),3);}finally{b.dispose();}
});
