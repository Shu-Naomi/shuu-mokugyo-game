const {test}=require('node:test'),assert=require('node:assert/strict');
const M=require('../mountain-region.js');
const {boot,seed,read,saveKey}=require('./game-harness.cjs');
const {routeTo}=require('./wetland-v227.cjs');
const fixture=(extra={})=>({...seed(),mapRegion:'mountainPond',x:196,y:40,hp:100,soundEnabled:false,...extra});
const resources=w=>read(w,'({hp:s.hp,money:s.money,baits:s.baits,caught:s.caught,equipment:s.equipment,time:s.gameMinutes})');
function touch(w,d){const b=w.document.querySelector('[data-move="'+d+'"]');b.onpointerdown({preventDefault(){},currentTarget:b,pointerId:1});b.onpointerup();}
function walk(w,region,goal){for(const d of routeTo(w,region,goal))touch(w,d);assert.equal(read(w,'s.mapRegion'),region);assert.ok(goal(read(w,'s.x'),read(w,'s.y')));}

test('the painted pond switchbacks are walkable while the former route through the cliff and open water stay solid',()=>{
  for(const p of [[198,36],[185,29],[202,25],[211,22],[193,15],[200,11],[213,9],[219,4]])
    assert.equal(M.walkable(...p,'mountainPond'),true,'painted dirt '+p);
  for(const p of [[224,12],[225,23],[224,31],[120,60]])
    assert.equal(M.walkable(...p,'mountainPond'),false,'cliff or water '+p);
  const exit=M.exitAt(M.regions.mountainMarsh.entry.x,M.regions.mountainMarsh.entry.y,'mountainMarsh');
  assert.ok(M.walkable(exit.x,exit.y,exit.region));assert.equal(M.waterType(exit.x,exit.y,exit.region),null);
});

test('touch arrows follow both visible switchbacks into the marsh and wetland, then return and reload without spending progress',()=>{
  const app=boot(fixture()),w=app.window;let saved;
  try{
    const before=resources(w);
    for(const [x,y] of [[198,36],[185,29],[211,22],[193,15]])
      walk(w,'mountainPond',(px,py)=>Math.hypot(px-x,py-y)<=1.5);
    walk(w,'mountainPond',(x,y)=>M.exitAt(x,y,'mountainPond')?.region==='mountainMarsh');
    w.document.querySelector('#action').click();assert.equal(read(w,'s.mapRegion'),'mountainMarsh');
    walk(w,'mountainMarsh',(x,y)=>M.exitAt(x,y,'mountainMarsh')?.region==='wetland');
    w.document.querySelector('#action').click();assert.equal(read(w,'s.mapRegion'),'wetland');
    for(const type of ['wetPond','wetCreek','wetMarsh']){
      walk(w,'wetland',(x,y)=>['up','right','down','left'].some(d=>M.fishingWater(x,y,d,'wetland')?.type===type));
      const p=read(w,'({x:s.x,y:s.y})'),d=['up','right','down','left'].find(d=>M.fishingWater(p.x,p.y,d,'wetland')?.type===type);
      assert.equal(read(w,'fishingWaterNearPlayer(s.x,s.y,"'+d+'").type'),type);
    }
    walk(w,'wetland',(x,y)=>M.atReturnGate(x,y,'wetland'));
    w.document.querySelector('#action').click();assert.equal(read(w,'s.mapRegion'),'mountainMarsh');
    walk(w,'mountainMarsh',(x,y)=>M.atReturnGate(x,y,'mountainMarsh'));
    w.document.querySelector('#action').click();assert.equal(read(w,'s.mapRegion'),'mountainPond');
    assert.deepEqual(read(w,'({x:s.x,y:s.y,direction:s.direction})'),{x:212,y:10,direction:'left'});
    assert.deepEqual(resources(w),before);w.eval('save()');saved=JSON.parse(w.localStorage.getItem(saveKey));assert.deepEqual(app.errors,[]);
  }finally{app.dispose();}
  const restored=boot(saved);
  try{assert.deepEqual(read(restored.window,'({region:s.mapRegion,x:s.x,y:s.y})'),{region:'mountainPond',x:212,y:10});assert.deepEqual(restored.errors,[]);}
  finally{restored.dispose();}
});

test('an old save on the former cliff return resumes on nearby dirt with its fish, money and bait intact',()=>{
  const old=fixture({x:224,y:12}),app=boot(old),w=app.window;
  try{
    const p=read(w,'({x:s.x,y:s.y})');assert.notDeepEqual(p,{x:224,y:12});
    assert.ok(M.walkable(p.x,p.y,'mountainPond'));assert.equal(read(w,'s.mapRegion'),'mountainPond');
    assert.equal(read(w,'s.money'),old.money);assert.equal(read(w,'s.hp'),old.hp);
    assert.deepEqual(read(w,'s.caught'),old.caught);assert.equal(read(w,'s.baits.worm'),old.baits.worm);
    walk(w,'mountainPond',(x,y)=>Math.hypot(x-193,y-15)<=1.5);assert.deepEqual(app.errors,[]);
  }finally{app.dispose();}
});
