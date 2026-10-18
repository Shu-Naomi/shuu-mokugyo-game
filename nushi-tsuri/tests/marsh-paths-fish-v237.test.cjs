const {test}=require('node:test'),assert=require('node:assert/strict');
const M=require('../mountain-region.js'),{boot,seed,read,saveKey}=require('./game-harness.cjs');
const {routeTo}=require('./wetland-v227.cjs'),{findRoute}=require('./water-routes-v220.cjs');
const {paintedLoop,decks,banks,fishCases}=require('./marsh-v237.cjs');
const fixture=extra=>({...seed(),mapRegion:'mountainMarsh',...M.regions.mountainMarsh.entry,hp:100,soundEnabled:false,...extra});
const progress=w=>read(w,'({money:s.money,hp:s.hp,time:s.gameMinutes,baits:s.baits,caught:s.caught,equipment:s.equipment,quests:s.questCompletions})');
function walk(w,region,goal){for(const d of routeTo(w,region,goal)){
  const b=w.document.querySelector('[data-move="'+d+'"]');b.onpointerdown({preventDefault(){},currentTarget:b,pointerId:1});b.onpointerup();
}assert.ok(goal(read(w,'s.x'),read(w,'s.y')));assert.equal(read(w,'s.mapRegion'),region);}

test('the marsh follows the painted ring and seven timber crossings while open water and cliffs stay blocked',()=>{
  for(const p of paintedLoop)assert.equal(M.walkable(...p,'mountainMarsh'),true,'painted path '+p);
  for(const p of decks){assert.equal(M.onBridge(...p,'mountainMarsh'),true,'deck '+p);
    assert.equal(M.waterType(...p,'mountainMarsh'),null);assert.equal(M.fishingWater(...p,'down','mountainMarsh'),null);}
  for(const p of [[120,65],[80,70],[165,60],[5,5],[230,32],[43,128]])assert.equal(M.walkable(...p,'mountainMarsh'),false,'water, cliff or former forest spawn '+p);
  for(const p of banks)assert.ok(['up','right','down','left'].some(d=>M.fishingWater(...p,d,'mountainMarsh')?.type==='highMarsh'),'bank '+p);
});

test('touch controls traverse the painted ring, side decks and all four banks, then wetland and pond; reloading retains progress',()=>{
  const app=boot(fixture()),w=app.window;let saved,before;
  try{
    before=progress(w);
    for(const [x,y]of [...paintedLoop,...decks])walk(w,'mountainMarsh',(px,py)=>Math.hypot(px-x,py-y)<=1);
    for(const [x,y]of banks){walk(w,'mountainMarsh',(px,py)=>Math.hypot(px-x,py-y)<=1);
      assert.ok(['up','right','down','left'].some(d=>read(w,'fishingWaterNearPlayer(s.x,s.y,"'+d+'")?.type ?? null')==='highMarsh'));}
    walk(w,'mountainMarsh',(x,y)=>M.exitAt(x,y,'mountainMarsh')?.region==='wetland');
    w.document.querySelector('#action').click();assert.equal(read(w,'s.mapRegion'),'wetland');
    walk(w,'wetland',(x,y)=>M.atReturnGate(x,y,'wetland'));w.document.querySelector('#action').click();
    assert.deepEqual(read(w,'({region:s.mapRegion,x:s.x,y:s.y})'),{region:'mountainMarsh',x:227,y:78});
    walk(w,'mountainMarsh',(x,y)=>M.atReturnGate(x,y,'mountainMarsh'));w.document.querySelector('#action').click();
    assert.equal(read(w,'s.mapRegion'),'mountainPond');assert.deepEqual(progress(w),before);
    w.eval('save()');saved=JSON.parse(w.localStorage.getItem(saveKey));assert.deepEqual(app.errors,[]);
  }finally{app.dispose();}
  const restored=boot(saved);try{assert.deepEqual(progress(restored.window),before);assert.equal(read(restored.window,'s.mapRegion'),'mountainPond');assert.deepEqual(restored.errors,[]);}finally{restored.dispose();}
});

test('five marsh species have normal tackle odds and catch records that survive reload; the catalogue stays at 45 fish',()=>{
  for(const [id,bait,hook,distance]of fishCases){
    const app=boot(fixture({gameMinutes:600,ownedRods:['bamboo','starGazer'],selectedRod:'starGazer',selectedBait:bait,selectedHook:hook,baits:{paste:10,river:10,liveMinnow:10,worm:10}})),w=app.window;let saved;
    try{
      const depth=distance<34?'shallow':'mid',spot='mountain-highMarsh-'+depth;
      const r=findRoute(w,'highMarsh');for(const d of r.path)w.move(d);
      w.document.querySelector('#action').click();assert.equal(read(w,'battle.phase'),'prep');
      w.eval('beginFishing();clearInterval(timer)');let roll=-1;
      for(let n=0;n<1000;n++){w.eval('Math.random=()=>'+n/1000);if(read(w,`pick(${distance},'${spot}').id`)===id){roll=n/1000;break;}}
      assert.ok(roll>=0,id+' normal bait/hook odds');
      w.eval(`Math.random=()=>${roll};commitCastResources();resolveSurfaceCast(${distance});clearInterval(timer);startFight();clearInterval(timer);finishHookReveal();renderBattleFish()`);
      assert.equal(read(w,'battle.f.id'),id);assert.equal(read(w,'battle.spot'),spot);
      assert.equal(w.document.querySelector('#battleFish canvas').dataset.artSpecies,id);
      assert.equal(read(w,`s.baits.${bait}`),9);
      w.eval('caught();caught()');assert.equal(read(w,`s.caught.${id}`),1);
      assert.equal(read(w,`s.fishCatchRecords.${id}.last.spotId`),spot);
      if(id!=='dojo')assert.match(read(w,`fishEncyclopediaData.${id}.locations`),/峠の沼/);
      assert.equal(read(w,'fish.length'),46);w.eval('hideCatchCard();save()');saved=JSON.parse(w.localStorage.getItem(saveKey));assert.deepEqual(app.errors,[]);
    }finally{app.dispose();}
    const restored=boot(saved);try{assert.equal(read(restored.window,`s.caught.${id}`),1);assert.match(read(restored.window,`s.fishCatchRecords.${id}.last.spotId`),/^mountain-highMarsh-/);assert.deepEqual(restored.errors,[]);}finally{restored.dispose();}
  }
  for(const spot of M.spots.filter(p=>p.id.startsWith('mountain-highMarsh-')))assert.ok(Math.abs(Object.values(spot.weights).reduce((a,b)=>a+b,0)-1)<1e-10);
  assert.equal(M.spots.find(p=>p.id==='mountain-highMarsh-shallow').weights.kamatsuka,undefined,'creek species stays in creek');
});

test('a save at the former marsh entrance resumes on dirt with money, fish, equipment and quests intact',()=>{
  const old=fixture({x:43,y:128}),app=boot(old),w=app.window;
  try{
    const p=read(w,'({x:s.x,y:s.y})');assert.notDeepEqual(p,{x:43,y:128});assert.ok(M.walkable(p.x,p.y,'mountainMarsh'));
    assert.equal(read(w,'s.money'),old.money);assert.equal(read(w,'s.hp'),old.hp);assert.deepEqual(read(w,'s.caught'),old.caught);assert.equal(read(w,'s.baits.worm'),old.baits.worm);assert.equal(read(w,'s.questCompletions'),old.questCompletions);
    walk(w,'mountainMarsh',(x,y)=>Math.hypot(x-50,y-79)<=1);assert.deepEqual(app.errors,[]);
  }finally{app.dispose();}
});
