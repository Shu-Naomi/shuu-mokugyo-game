const {test}=require('node:test'),assert=require('node:assert/strict');
const {boot,seed,read,saveKey}=require('./game-harness.cjs');
const M=require('../mountain-region.js'),L=require('../world-life.js'),F=require('../fishing-duel.js'),A=require('../fish-art.js');
const {routeTo}=require('./wetland-v227.cjs');

test('pond movement follows independently sampled dirt pixels on both shores and rejects the former outer forest ring',()=>{
  // Pixel coordinates read from the original 1672 x 941 painting, not from
  // the collision polyline. Include the reported right-hand shortcut.
  for(const [x,y] of [[836,137],[1280,271],[1424,357],[1489,443],[1498,482],[1481,526],[1306,633],[1057,716],[491,661],[192,469]])
    assert.ok(M.walkable(x/1672*240,y/941*135,'mountainPond'),`painted dirt ${x},${y}`);
  for(const [x,y] of [[130,12],[219,59],[180,104],[120,60]])
    assert.equal(M.walkable(x,y,'mountainPond'),false,`old forest or water ${x},${y}`);
  const house=L.buildings.find(b=>b.id==='pond-house');assert.ok(house.w>=20&&house.h>=16);
  for(const p of [[213,75],[227,75]])assert.ok(M.walkable(...p,'mountainPond'));
});

test('a v240 save on the old right shore recovers and can reach the larger house, both exits and reload without losing progress',()=>{
  const original={...seed(),mapRegion:'mountainPond',x:219,y:66,hp:100,soundEnabled:false},app=boot(original),w=app.window;let saved;
  try{
    assert.notDeepEqual(read(w,'[s.x,s.y]'),[219,66]);
    const before=read(w,'[s.hp,s.money,s.baits,s.caught,s.gameMinutes]');
    const walk=goal=>{for(const d of routeTo(w,'mountainPond',goal))w.move(d);assert.ok(goal(read(w,'s.x'),read(w,'s.y')));};
    walk((x,y)=>Math.hypot(x-227,y-75)<1.5);w.move('up');w.action();assert.equal(w.document.querySelector('#worldHouseTitle').textContent,'峠の釣り人の小屋');w.close();
    walk((x,y)=>M.atReturnGate(x,y,'mountainPond'));
    walk((x,y)=>M.exitAt(x,y,'mountainPond')?.region==='mountainMarsh');
    assert.deepEqual(read(w,'[s.hp,s.money,s.baits,s.caught,s.gameMinutes]'),before);w.save();saved=JSON.parse(w.localStorage.getItem(saveKey));assert.deepEqual(app.errors,[]);
  }finally{app.dispose();}
  const restored=boot(saved);try{assert.ok(M.walkable(read(restored.window,'s.x'),read(restored.window,'s.y'),'mountainPond'));assert.deepEqual(restored.errors,[]);}finally{restored.dispose();}
});

test('gigi is naturally catchable with bait, has distinct art and dex, enters the aquarium and survives save restoration',()=>{
  const app=boot({...seed(),mapRegion:'cave',x:120,y:112,hp:100,soundEnabled:false,ownedRods:['bamboo','starGazer'],selectedRod:'starGazer',selectedBait:'river',selectedHook:'medium',baits:{river:20}}),w=app.window;let saved;
  try{
    w.eval('cast({zone:"lake",waterZone:"lake",waterX:120,waterY:100,mountainType:"underground"});beginFishing();clearInterval(timer)');
    let roll;for(let i=0;i<1000;i++){w.eval('Math.random=()=>'+i/1000);if(read(w,'pick(50,"mountain-underground-mid").id')==='gigi'){roll=i/1000;break;}}
    assert.notEqual(roll,undefined);w.eval('Math.random=()=>'+roll+';commitCastResources();resolveSurfaceCast(50);clearInterval(timer);startFight();clearInterval(timer);finishHookReveal();renderBattleFish()');
    assert.equal(read(w,'battle.f.id'),'gigi');assert.equal(read(w,'s.baits.river'),19);assert.equal(w.document.querySelector('#battleFish canvas').dataset.artSpecies,'gigi');
    w.eval('caught();caught()');assert.equal(read(w,'s.caught.gigi'),1);assert.equal(read(w,'s.fishCatchRecords.gigi.last.spotId'),'mountain-underground-mid');
    assert.equal(read(w,'fishEncyclopediaData.gigi.number'),46);assert.match(read(w,'fishEncyclopediaData.gigi.scientific'),/Tachysurus nudiceps/);
    assert.equal(read(w,'petCatalog.find(f=>f.id==="gigi").waterLabel'),'淡水');
    w.eval('hideCatchCard();drawAquariumSprite($("#homeAquariumFish"),"gigi",4,{spriteMode:"turn",yaw:Math.PI/2,turnFrame:2});save()');
    assert.equal(w.document.querySelector('#homeAquariumFish canvas').dataset.artSpecies,'gigi');assert.notEqual(A.species.gigi.asset,A.species.namazu.asset);
    saved=JSON.parse(w.localStorage.getItem(saveKey));assert.deepEqual(app.errors,[]);
    const cave=new Set(read(w,'fishingSpots.filter(p=>p.id.startsWith("mountain-underground-")).flatMap(p=>Object.keys(p.weights))'));
    assert.equal(cave.size,9);assert.ok(cave.has('gigi')&&cave.has('kajika')&&cave.has('dojo'));
    for(const id of read(w,'fish.map(f=>f.id)'))assert.ok(Number.isFinite(F.spoon[id])&&Number.isFinite(F.fishStrength[id]),id+' explicit lure and rod balance');
  }finally{app.dispose();}
  const restored=boot(saved);try{assert.equal(read(restored.window,'s.caught.gigi'),1);assert.deepEqual(restored.errors,[]);}finally{restored.dispose();}
});

test('spoon speed ramps up, a stop sinks it and draws a chasing fish, continuous fast reeling lets it leave, and retrieval has an end',()=>{
  const lure=F.newLure(50);for(let i=0;i<12;i++)F.stepLure(lure,true);
  assert.equal(lure.speed,1);const before={x:lure.x,y:lure.y};assert.ok(lure.x<78);
  const fast={...lure},pause={...lure};let fastResult,pausedResult;
  for(let i=0;i<36;i++){fastResult=F.stepLure(fast,true,true);if(fastResult.depart)break;}
  for(let i=0;i<16;i++){pausedResult=F.stepLure(pause,false,true);if(pausedResult.bite)break;}
  assert.ok(fastResult.depart);assert.ok(pausedResult.bite);assert.ok(pause.y>before.y);assert.equal(pause.speed,0);
  let result;for(let i=0;i<1000;i++){result=F.stepLure(lure,true);if(result.recovered)break;}assert.ok(result.recovered);assert.equal(lure.travel,1);
});

for(const mode of ['gauge','nushi'])test('native lure input keeps one specimen and one cast charge through a pause, hook and '+mode+' fight',()=>{
  const app=boot({...seed(),hp:100,fightMode:mode,ownedRods:['bamboo','lureRod'],selectedRod:'lureRod',fishingMethod:'lure',lures:{silverSpoon:1},soundEnabled:false}),w=app.window;
  try{
    Object.defineProperties(w.document.querySelector('#fishScene'),{clientWidth:{value:844},clientHeight:{value:326}});
    Object.defineProperties(w.document.querySelector('#battleFish'),{offsetWidth:{value:150},offsetHeight:{value:75}});
    const before=read(w,'[s.baits,s.lures,s.gameMinutes]');w.eval('cast();beginFishing();battle.cast=50;launchSurfaceCast();settleSurfaceCast();clearInterval(timer)');
    assert.equal(w.document.querySelector('#distanceLabel').style.display,'block');
    assert.equal(w.document.querySelector('#distanceMeter').parentElement.style.display,'block');
    assert.match(w.document.querySelector('#distanceLabel').textContent,/スプーンまで/);
    w.pressBattleAction();w.eval('for(let i=0;i<12;i++)updateLurePresentation()');assert.equal(read(w,'battle.phase'),'interest');
    const specimen=read(w,'[battle.f.id,battle.specimen]'),position=read(w,'battle.lureMotion');w.pauseBattle();w.eval('for(let i=0;i<100;i++)updateLurePresentation()');assert.deepEqual(read(w,'battle.lureMotion'),position);w.resumeBattle();
    w.eval('for(let i=0;i<16&&battle.phase!=="bite";i++)updateLurePresentation()');assert.equal(read(w,'battle.phase'),'bite');
    const root=read(w,'battleMouthAndHook()'),motion=read(w,'battle.lureMotion');assert.ok(Math.abs(root.rootX/10-motion.x)<.1&&Math.abs(root.rootY/5-motion.y)<.1);
    w.pressBattleAction();assert.equal(read(w,'battle.phase'),'fight');assert.equal(read(w,'battle.reeling'),false);w.pressBattleAction();assert.equal(read(w,'battle.reeling'),false);
    w.releaseBattleAction();w.pressBattleAction();assert.equal(read(w,'battle.reeling'),true);assert.equal(read(w,'battle.fightMode'),mode);assert.deepEqual(read(w,'[battle.f.id,battle.specimen]'),specimen);
    const after=read(w,'[s.baits,s.lures,s.gameMinutes]');assert.deepEqual(after.slice(0,2),before.slice(0,2));assert.equal(after[2]-before[2],10);assert.deepEqual(app.errors,[]);
  }finally{app.dispose();}
});

test('retrieving the spoon and missing its hook preserve reusable tackle, charge no second cast and award no fish',()=>{
  for(const outcome of ['retrieve','miss']){
    const app=boot({...seed(),hp:100,ownedRods:['bamboo','lureRod'],selectedRod:'lureRod',fishingMethod:'lure',lures:{silverSpoon:1},soundEnabled:false}),w=app.window;
    try{w.eval('cast();beginFishing();battle.cast=50;launchSurfaceCast();settleSurfaceCast();clearInterval(timer)');
      const before=read(w,'[s.money,s.baits,s.lures,s.caught,s.gameMinutes]');
      if(outcome==='retrieve')w.eval('battle.lureMotion.travel=.9999;battle.lureHeld=true;updateLurePresentation()');
      else w.eval('battle.phase="bite";battle.biteAt=Date.now()-1600;syncBitePhase()');
      assert.equal(read(w,'battle'),null);assert.deepEqual(read(w,'[s.money,s.baits,s.lures,s.caught,s.gameMinutes]'),before);assert.deepEqual(app.errors,[]);
    }finally{app.dispose();}
  }
});
