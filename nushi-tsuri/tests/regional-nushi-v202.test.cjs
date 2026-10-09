const {test}=require('node:test'),assert=require('node:assert/strict');
const M=require('../mountain-region.js'),R=require('../regional-nushi.js');
const {boot,seed,read,saveKey}=require('./game-harness.cjs');
const finished=region=>Object.fromEntries(R.ordinary[region].map(id=>[id,1]));
const mountainSave=(region,extra={})=>({...seed(),hp:100,mapRegion:region,...M.regions[region].entry,...extra});
function reachable(region){
  const a=M.regions[region].entry,queue=[[a.x,a.y]],seen=new Set([`${a.x},${a.y}`]);
  for(let i=0;i<queue.length;i++)for(const [dx,dy]of[[4,0],[-4,0],[0,4],[0,-4]]){
    const [x,y]=queue[i],key=`${x+dx},${y+dy}`;if(seen.has(key))continue;
    if(Array.from({length:9},(_,j)=>M.walkable(x+dx*j/8,y+dy*j/8,region)).every(Boolean)){seen.add(key);queue.push([x+dx,y+dy]);}
  }return queue;
}
test('new mountain maps have connected real walking routes to every exit and fishing shore, with solid deep water',()=>{
  for(const region of ['mountainPond','mountainMarsh','cave']){
    const queue=reachable(region),data=M.regions[region],types=new Set();assert.ok(queue.length>100,region);
    for(const [x,y]of queue)for(const dir of ['up','down','left','right']){
      const water=M.fishingWater(x,y,dir,region);if(water)types.add(water.type);
    }
    assert.deepEqual([...types],Object.keys(data.waters));
    assert.ok(queue.some(([x,y])=>M.atReturnGate(x,y,region)));
    for(const p of data.landmarks)assert.ok(queue.some(([x,y])=>Math.hypot(x-p.x,y-p.y)<6),p.id);
    assert.equal(M.walkable(120,65,region),false);assert.equal(M.walkable(5,5,region),false);
  }
});
test('A connects pass, pond, marsh and cave in both directions and preserves inventory and collection',()=>{
  const app=boot(mountainSave('stream',{x:73,y:8})),w=app.window;
  try{
    const before=read(w,'({money:s.money,hp:s.hp,baits:s.baits,caught:s.caught,clock:s.gameMinutes})');
    w.action();assert.equal(read(w,'s.mapRegion'),'mountainPond');
    w.eval('s.x=224;s.y=8;render();action()');assert.equal(read(w,'s.mapRegion'),'mountainMarsh');
    w.action();assert.equal(read(w,'s.mapRegion'),'mountainPond');
    w.eval('s.x=120;s.y=128;action()');assert.equal(read(w,'s.mapRegion'),'stream');
    w.eval('s.x=219;s.y=30;render();action()');assert.equal(read(w,'s.mapRegion'),'cave');
    w.action();assert.equal(read(w,'s.mapRegion'),'stream');
    assert.deepEqual(read(w,'({money:s.money,hp:s.hp,baits:s.baits,caught:s.caught,clock:s.gameMinutes})'),before);
    assert.deepEqual(app.errors,[]);
  }finally{app.dispose();}
});
test('all new maps retain their fish pools, save in place, and return to the correct parent map',()=>{
  for(const region of ['mountainPond','mountainMarsh','cave']){
    const app=boot(mountainSave(region,{boatActive:true}));let saved;
    try{
      const w=app.window;assert.equal(read(w,'s.mapRegion'),region);assert.equal(read(w,'s.boatActive'),false);
      assert.equal(w.document.querySelector('#map').classList.contains('mountain'),true);
      const point=reachable(region).find(([x,y])=>M.fishingWater(x,y,'up',region));
      w.eval(`Object.assign(s,{x:${point[0]},y:${point[1]},direction:"up"});action();beginFishing();resolveSurfaceCast(85)`);
      assert.equal(read(w,'battle.spot'),`mountain-${Object.keys(M.regions[region].waters)[0]}-deep`);
      assert.notEqual(read(w,'battle.f.id'),'nushi');w.endBattle();
      w.eval(`Object.assign(s,${JSON.stringify(M.regions[region].entry)});save()`);
      saved=JSON.parse(w.localStorage.getItem(saveKey));w.eval('move("down");move("down")');
      assert.equal(read(w,'s.mapRegion'),region==='mountainMarsh'?'mountainPond':'stream');assert.deepEqual(app.errors,[]);
    }finally{app.dispose();}
    const restored=boot(saved);try{assert.equal(read(restored.window,'s.mapRegion'),region);assert.deepEqual(restored.errors,[]);}finally{restored.dispose();}
  }
});
test('only explicit previous regional catches migrate; unrelated village catches never unlock the stream boss',()=>{
  const state={caught:Object.fromEntries(R.ordinary.stream.map(id=>[id,5])),fishCatchRecords:{yamame:{last:{spotId:'mountain-stream-deep'}},funa:{last:{spotId:'lake-deep'}}}};
  R.normalize(state);assert.deepEqual(state.regionalCaught.stream,{yamame:1});assert.equal(R.complete(state,'stream'),false);
  const before=JSON.stringify(state);R.normalize(state);assert.equal(JSON.stringify(state),before);
  R.recordCatch(state,'funa',{spot:'mountain-pond-mid',practice:true});assert.equal(state.regionalCaught.stream.funa,undefined);
  R.recordCatch(state,'funa',{spot:'mountain-highPond-deep'});assert.equal(state.regionalCaught.stream.funa,undefined);
});
test('actual catches accumulate once in their region, silently complete the stream and persist across reload',()=>{
  const app=boot(mountainSave('stream',{x:128,y:76,direction:'left'})),w=app.window;let saved;
  try{
    for(const id of R.ordinary.stream){
      const pond=['funa','koi','bass'].includes(id);
      w.eval(`Object.assign(s,{x:${pond?60:128},y:${pond?56:76},direction:'${pond?'up':'left'}'});action();beginFishing();battle.f=fish.find(f=>f.id==='${id}');battle.specimen=null;caught();caught();hideCatchCard()`);
      assert.equal(read(w,`s.regionalCaught.stream.${id}`),1);
    }
    assert.equal(w.eval('ShuRegional.complete(s,"stream")'),true);assert.equal(read(w,'s.caught.streamNushi||0'),0);
    assert.equal(read(w,'s.log').some(line=>/解放|ヌシが現れ|ヌシの出現/.test(line)),false);
    saved=JSON.parse(w.localStorage.getItem(saveKey));assert.deepEqual(app.errors,[]);
  }finally{app.dispose();}
  const restored=boot(saved);try{assert.equal(restored.window.eval('ShuRegional.complete(s,"stream")'),true);}finally{restored.dispose();}
});
test('regional bosses bite only after ordinary completion at their own deep water and never in practice',()=>{
  const state={regionalCaught:{stream:finished('stream'),coast:finished('coast'),cave:finished('cave')},caught:{}};
  for(const [id,spot]of [['streamNushi','mountain-stream-deep'],['coastNushi','coast-reef-deep'],['caveNushi','mountain-underground-deep']]){
    assert.ok(R.candidates(state,spot,'day')[id]);assert.deepEqual(R.candidates(state,spot,'day',true),{});
    assert.deepEqual(R.candidates(state,spot.replace('deep','shallow'),'day'),{});assert.deepEqual(R.candidates({caught:{}},spot,'day'),{});
  }
  const app=boot(mountainSave('stream',{regionalCaught:state.regionalCaught,regionalCatchVersion:1})),w=app.window;
  try{
    w.eval('s.selectedBait="worm";s.selectedHook="large";let rng=123;Math.random=()=>((rng=Math.imul(rng,1664525)+1013904223>>>0)/4294967296)');
    const seen=read(w,'Array.from({length:400},()=>pick(90,"mountain-stream-deep")?.id)');
    assert.ok(seen.includes('streamNushi'));assert.equal(seen.includes('coastNushi'),false);assert.equal(seen.includes('starNushi'),false);
    assert.deepEqual(app.errors,[]);
  }finally{app.dispose();}
});
test('the final giant requires all three new bosses and night; secret bait preserves the old lake boss until then',()=>{
  const state={caught:{streamNushi:1,coastNushi:1,caveNushi:1}};
  assert.ok(R.candidates(state,'lake-deep','night').starNushi);assert.deepEqual(R.candidates(state,'lake-deep','day'),{});
  assert.deepEqual(R.candidates({caught:{streamNushi:1,coastNushi:1}},'lake-deep','night'),{});
  const app=boot(),w=app.window;
  try{
    w.eval('s.selectedBait="nushiSecret";s.selectedHook="large";s.gameMinutes=1320');assert.equal(w.pick(95,'lake-deep').id,'nushi');
    w.eval('s.caught.streamNushi=1;s.caught.coastNushi=1;s.caught.caveNushi=1');assert.equal(w.pick(95,'lake-deep').id,'starNushi');
    assert.equal(w.pick(50,'lake-mid'),null);assert.deepEqual(app.errors,[]);
  }finally{app.dispose();}
});
test('starter rods cap retrieval while the top sea rod reaches the water during a valid pull in both modes',()=>{
  const app=boot({...seed(),hp:100,baits:{worm:50},ownedRods:['bamboo','tideMaster'],selectedRod:'tideMaster'}),w=app.window;
  try{
    for(const mode of ['gauge','nushi'])for(const id of Object.keys(R.bosses)){
      w.eval(`s.fightMode='${mode}';cast();beginFishing();battle.cast=90;launchSurfaceCast();settleSurfaceCast();battle.f=fish.find(f=>f.id==='${id}');battle.specimen=rollFishSpecimen(battle.f,()=>.5);var gearNow=Date.now();Date.now=()=>gearNow;startFight();clearInterval(timer);timer=0;battle.gillWash=null;var gearCalm=fightProfiles[battle.f.id].moods.find(m=>m.calm);battle.mood=gearCalm;battle.calm=true;battle.nextMood=ShuFishing.beginWindow(battle,gearCalm,1800,gearNow);battle.awaitFightRelease=false;releaseBattleAction();pressBattleAction()`);
      // Freeze the clock to isolate rod physics within a valid calm pull.
      // Native press/release must accept it; setting reeling alone skips that.
      // Natural timed fights have their own v228 controller tests.
      assert.equal(read(w,'battle.reeling'),true,`${mode}/${id} held input`);
      if(mode==='nushi')assert.equal(read(w,'battle.nushiWindow.accepted'),true,`${mode}/${id} accepted pull`);
      w.eval('battle.equipment=ShuFishing.rod(s,"bamboo",rodData);battle.retrieval=.9995;updateRetrieval(fightProfiles[battle.f.id].moods.find(m=>m.calm))');
      assert.ok(read(w,'battle.retrieval')<=.6,`${mode}/${id} weak gear`);
      const result=read(w,'(()=>{battle.equipment=ShuFishing.rod(s,"tideMaster",rodData);battle.specimen.pullMultiplier=1;const calm=fightProfiles[battle.f.id].moods.find(m=>m.calm);battle.mood=calm;battle.calm=true;for(let i=0;i<1500;i++){updateRetrieval(calm);moveBattleFish(calm);}return [battle.retrieval,Math.hypot(battle.x-battle.surfaceX,battle.y-battle.surfaceY)];})()');
      assert.equal(result[0],1,`${mode}/${id} strong gear`);assert.ok(result[1]<=11,`${mode}/${id} landing ${result[1]}`);w.endBattle();
    }assert.deepEqual(app.errors,[]);
  }finally{app.dispose();}
});
test('new bosses have separate unknown and known encyclopedia entries and cannot be purchased as ordinary pets',()=>{
  const app=boot({...seed(),caught:{starNushi:1},money:100000}),w=app.window;
  try{
    w.open('record');w.document.querySelector('[data-fishdex-id="starNushi"]').click();
    assert.match(w.document.querySelector('#fishdexDetail').textContent,/架空/);
    assert.equal(w.document.querySelector('[data-fishdex-id="caveNushi"]').classList.contains('unknown'),true);
    const before=read(w,'({money:s.money,pets:s.petLife.fish.length})');assert.equal(w.eval('ShuPetLife.acquire(s,"starNushi",petCatalog,0).ok'),false);
    assert.deepEqual(read(w,'({money:s.money,pets:s.petLife.fish.length})'),before);assert.deepEqual(app.errors,[]);
  }finally{app.dispose();}
});
