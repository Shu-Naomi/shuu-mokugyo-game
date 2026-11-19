const {test}=require('node:test'),assert=require('node:assert/strict');
const H=require('../shiokakure.js'),I=require('../offshore-island.js'),R=require('../regional-nushi.js');
const {boot,seed,read,saveKey}=require('./game-harness.cjs');
const {runFight}=require('./nushi-playability-v228.cjs');
const shore={mapRegion:'offshore',x:45,y:33,direction:'down'};
function observe(e,s=shore,n=30){for(let i=0;i<n;i++)H.step(e,s);}
test('reachable tide-pool, sustained observation, movement scare and repeating appearance',()=>{
 assert.ok(I.walkable(45,33));const water=I.fishingWater(45,33,'down');assert.ok(I.water(water.x,water.y));
 const e=H.create();assert.equal(H.ready(e,shore,water),false);observe(e);assert.ok(H.ready(e,shore,water));
 assert.equal(H.ready(e,{...shore,x:54},water),false);assert.equal(H.ready(e,shore,{x:25,y:40}),false);
 H.step(e,{...shore,x:46});assert.equal(H.visible(e),false);observe(e,shore,80);assert.ok(H.ready(e,shore,water));
 const cycle=H.create();observe(cycle,shore,145);assert.equal(H.visible(cycle),false);observe(cycle,shore,40);assert.ok(H.visible(cycle));
 assert.equal(H.ready(e,{...shore,tournament:{}},water),false);
});
for(const [x,y,route,endX] of [[43,29,['down'],43],[39,33,['right','down'],43],[47,29,['down'],47]])test('short bait cast after walking from '+x+','+y,()=>{
 const app=boot({...seed(),...shore,x,y,hp:100,ownedRods:['tideMaster'],selectedRod:'tideMaster',selectedBait:'smallShrimp',selectedHook:'medium',baits:{smallShrimp:20}}),w=app.window;
 try{
  for(const direction of route)w.eval('move('+JSON.stringify(direction)+')');
  assert.deepEqual(read(w,'[s.x,s.y,s.direction]'),[endX,33,'down']);
  w.eval('for(let i=0;i<30;i++)ShuShiokakure.step(shiokakureEncounter,s)');
  assert.equal(read(w,"ShuShiokakure.ready(shiokakureEncounter,s,ShuOffshore.fishingWater(s.x,s.y,'up'))"),false);
  w.eval('action();beginFishing();clearInterval(timer)');
  assert.equal(read(w,'battle.cast'),18);
  w.eval('launchSurfaceCast();settleSurfaceCast()');
  assert.deepEqual(read(w,'[battle.f.id,battle.phase]'),['shiokakure','wait']);
  assert.deepEqual(app.errors,[]);
 }finally{app.dispose();}
});
for(const method of ['bait','lure'])test('gentle drop is exclusive to observed pool: '+method,()=>{
 const app=boot({...seed(),...shore,hp:100,ownedRods:['tideMaster','lureRod'],selectedRod:method==='lure'?'lureRod':'tideMaster',fishingMethod:method,lures:{silverSpoon:10},selectedBait:'shell',selectedHook:'large',baits:{shell:10}}),w=app.window;
 try{
  w.eval('for(let i=0;i<30;i++)ShuShiokakure.step(shiokakureEncounter,s);action();beginFishing();clearInterval(timer)');
  assert.equal(read(w,'battle.shiokakureObserved'),true);
  w.eval('battle.cast=20;launchSurfaceCast();settleSurfaceCast()');assert.equal(read(w,'battle.f.id'),'shiokakure');
  assert.equal(read(w,'battle.shiokakureObserved'),false);assert.ok(read(w,'shiokakureEncounter.cooldown')>0);
  assert.ok(read(w,'Object.values(fishMotionProfiles.shiokakure).filter(v=>typeof v==="number").every(Number.isFinite)'));
  if(method==='lure'){
   const residents=read(w,'battle.lureMotion.residents.map(r=>r.id)');
   assert.equal(residents[0],'shiokakure','the observed fish at splash is the hookable individual');
   assert.equal(residents.filter(id=>id==='shiokakure').length,1,'no second shy boss in the school');
   w.eval("for(let i=0;i<240&&battle?.phase!=='bite';i++){battle.lurePulse=battle.phase==='lure'&&i%2===0;updateLurePresentation()}");
   assert.equal(read(w,'battle.phase'),'bite');
   assert.equal(read(w,'battle.lureMotion.inContact'),true);
   assert.equal(read(w,'battle.shiokakureFast||0'),0);
  }
  w.eval('endBattle();save()');const saved=JSON.parse(w.localStorage.getItem(saveKey));assert.equal(saved.shiokakureEncounter,undefined);
  assert.deepEqual(app.errors,[]);
 }finally{app.dispose();}
});
test('far casts, practice, tournament and normal pools do not offer the hidden fish',()=>{
 const e=H.create();assert.equal(H.claim(e,true,{practice:true,method:'bait',bait:'shell'},20),false);
 assert.equal(H.claim(e,true,{method:'bait',bait:'shell'},25),false);
 assert.equal(H.claim(e,false,{method:'lure'},20),false);
 assert.equal(H.claim(e,true,{method:'bait',bait:'nushiSecret'},20),false);
 assert.deepEqual(R.candidates({},'offshore-west-shallow','day'),{});
 assert.equal(R.finalReady({caught:{streamNushi:1,coastNushi:1,caveNushi:1}}),true);
});
for(const mode of ['gauge','nushi'])for(const tier of [.5,.999999])test('shy boss catch with water FX / 600ms '+mode+' '+tier,()=>{
 const r=runFight({id:'shiokakure',mode,tier,rod:'shoreReed',delayMs:600,waterFxSeed:301,gaugeThreshold:45,gaugeResumeThreshold:20});
 assert.deepEqual(r.errors,[]);assert.equal(r.phase,'landing',JSON.stringify(r));assert.ok(r.seconds<180&&r.maxTension<100,JSON.stringify(r));
});
test('old save, hidden dex, unique 67, crowns and unchanged 61 ordinary fish',()=>{
 const app=boot(seed()),w=app.window;
 try{
  assert.equal(read(w,'fish.length'),67);assert.equal(read(w,'fish.at(-1).id'),'shiokakure');assert.equal(read(w,'fish.filter(f=>!ShuRegional.legendary(f.id)).length'),61);
  assert.equal(read(w,'new Set(fish.map(f=>fishEncyclopediaData[f.id].number)).size'),67);
  assert.equal(read(w,'fishEncyclopediaData.shiokakure.number'),67);
  assert.equal(read(w,'fishdexIsKnown(fish.find(f=>f.id==="shiokakure"))'),false);
  assert.equal(read(w,'petCatalog.find(f=>f.id==="shiokakure").waterLabel'),'海水');
  assert.equal(read(w,'petCatalog.find(f=>f.id==="shiokakure").legendary'),true);
  w.eval('s.caught.shiokakure=1;s.fishCrowns.shiokakure={tiny:true,giant:true};save()');
  const saved=JSON.parse(w.localStorage.getItem(saveKey)),b=boot(saved);try{assert.equal(read(b.window,'s.caught.shiokakure'),1);assert.deepEqual(read(b.window,'s.fishCrowns.shiokakure'),{tiny:true,giant:true});}finally{b.dispose();}
  assert.deepEqual(app.errors,[]);
 }finally{app.dispose();}
});
test('observation does not invalidate scenery cache and reduced-motion still permits discovery',()=>{
 const app=boot({...seed(),...shore}),w=app.window;
 try{
  w.eval("hideFieldMenu();var sceneryPaints=0;ShuOffshore.paint=()=>sceneryPaints++;pixelSceneCache.delete(document.querySelector('#offshorePixels'));renderPixelScenery();matchMedia=()=>({matches:true});for(let i=0;i<40;i++)renderShiokakure(true);renderPixelScenery()");
  assert.notEqual(w.getComputedStyle(w.document.querySelector('#shiokakureContour')).display,'none');
  assert.equal(read(w,'sceneryPaints'),1);assert.ok(read(w,'ShuShiokakure.ready(shiokakureEncounter,s,ShuOffshore.fishingWater(s.x,s.y,s.direction))'));
  assert.equal(w.document.querySelector('#shiokakureContour').getAttribute('aria-hidden'),'true');
  w.eval('battle={phase:"prep"};renderShiokakure(true)');assert.equal(w.document.querySelector('#shiokakureContour').hidden,true);
 }finally{app.dispose();}
});
test('ordinary spoons at the hidden tide pool never reveal Shiokakure among the resident fish',()=>{
 const app=boot({...seed(),...shore,hp:100,ownedRods:['lureRod'],selectedRod:'lureRod',fishingMethod:'lure',lures:{silverSpoon:1}}),w=app.window;
 try{
  // Try both an unobserved gentle drop and a cast too far after observation.
  for(const [observeFirst,distance] of [[false,20],[true,65]]){
   if(observeFirst)w.eval('for(let i=0;i<80;i++)ShuShiokakure.step(shiokakureEncounter,s)');
   w.action();w.beginFishing();
   assert.equal(read(w,'battle.shiokakureObserved'),observeFirst);
   w.eval('battle.cast='+distance+';launchSurfaceCast();settleSurfaceCast();clearInterval(timer)');
   const residents=read(w,'battle.lureMotion.residents.map(r=>r.id)');
   assert.ok(residents.length>=2&&residents.length<=3);
   assert.ok(!residents.includes('shiokakure'),'the restricted fish cannot be a focal or background resident');
   assert.equal(read(w,'battle.f.id'),residents[0]);
   w.endBattle();
  }
  assert.deepEqual(app.errors,[]);
 }finally{app.dispose();}
});

test('fast lure startles the fish, recovers the spoon and allows a later encounter',()=>{
 const app=boot({...seed(),...shore,hp:100,ownedRods:['lureRod'],selectedRod:'lureRod',fishingMethod:'lure',lures:{silverSpoon:10}}),w=app.window;
 try{
  w.eval('for(let i=0;i<30;i++)ShuShiokakure.step(shiokakureEncounter,s);action();beginFishing();clearInterval(timer);battle.cast=20;launchSurfaceCast();settleSurfaceCast();battle.lureHeld=true;for(let i=0;i<20&&battle;i++)updateLurePresentation()');
  assert.equal(read(w,'battle'),null);assert.equal(read(w,'s.lures.silverSpoon'),10);
  w.eval('for(let i=0;i<80;i++)ShuShiokakure.step(shiokakureEncounter,s)');assert.ok(read(w,'ShuShiokakure.ready(shiokakureEncounter,s,ShuOffshore.fishingWater(s.x,s.y,s.direction))'));
 }finally{app.dispose();}
});
test('the gentle drop remains available after 600 ms on each recommended rod',()=>{
 for(const rod of ['shoreReed','tideMaster','lureRod']){
  const app=boot({...seed(),...shore,hp:100,ownedRods:[rod],selectedRod:rod,selectedBait:'shell',selectedHook:'large',baits:{shell:10}}),w=app.window;
  try{
   w.eval('for(let i=0;i<30;i++)ShuShiokakure.step(shiokakureEncounter,s);action();beginFishing();clearInterval(timer);var nearTick;setInterval=fn=>(nearTick=fn,0);battleTick();for(let i=0;i<5;i++)nearTick()');
   assert.ok(read(w,'battle.cast<=24'),rod+' comfortable near cast');
   const before=read(w,'battle.cast');w.eval('battle.shiokakureObserved=false;nearTick()');assert.ok(Math.abs(read(w,'battle.cast')-before-read(w,'battle.castSpeed'))<1e-9,rod+' ordinary meter unchanged');
  }finally{app.dispose();}
 }
});

for(const rngSeed of [301,735,191])test('largest shy boss with lure rod / varied water FX / 600ms '+rngSeed,()=>{
 const r=runFight({id:'shiokakure',mode:'nushi',tier:.999999,rod:'lureRod',delayMs:600,rngSeed,waterFxSeed:rngSeed});
 assert.deepEqual(r.errors,[]);assert.equal(r.phase,'landing',JSON.stringify(r));assert.ok(r.seconds<180&&r.maxTension<100,JSON.stringify(r));
});
