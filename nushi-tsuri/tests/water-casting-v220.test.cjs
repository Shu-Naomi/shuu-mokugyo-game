const {test}=require('node:test'),assert=require('node:assert/strict');
const {boot,seed,read}=require('./game-harness.cjs'),C=require('../coast-voyage.js');
const {cases,findRoute}=require('./water-routes-v220.cjs');

test('all water types have an actual walking or rowing route from their entrance and A opens the correct cast',()=>{
 for(const sample of cases){
  const app=boot({...seed(),hp:100,maxHp:100,mapRegion:sample.region,x:sample.start[0],y:sample.start[1],boatActive:Boolean(sample.boat),
   ownedVehicles:['canoe'],equipment:{vehicle:'canoe'},baits:{worm:20},selectedBait:'worm',selectedHook:'small',soundEnabled:false});
  const w=app.window;
  try{
   const route=findRoute(w,sample.type);
   for(const direction of route.path)w.move(direction);
   assert.deepEqual(read(w,'({x:s.x,y:s.y,direction:s.direction})'),{x:route.x,y:route.y,direction:route.direction});
   assert.ok(w.isWalkableWorld(route.x,route.y));
   const before=read(w,'({baits:s.baits,money:s.money,hp:s.hp,time:s.gameMinutes})');
   w.document.querySelector('#action').click();
   const prefix=sample.region==='village'?sample.type:sample.region==='coast'?'coast-'+sample.type:'mountain-'+sample.type;
   const spot=read(w,'battle?.spot');assert.equal(spot,prefix+'-shallow');
   assert.equal(read(w,'battle.phase'),'prep');
   assert.deepEqual(read(w,'({baits:s.baits,money:s.money,hp:s.hp,time:s.gameMinutes})'),before,'preparing a cast never spends stock');
   w.eval('beginFishing();clearInterval(timer)');assert.equal(read(w,'battle.phase'),'cast');
   assert.deepEqual(app.errors,[]);
  }finally{app.dispose();}
 }
});

test('waterborne casts stop at island tips and the harbor pier, while open-water and island-bank casts still work',()=>{
 for(const [x,y,direction]of [[121.5,52.5,'right'],[121,53,'right'],[168,53.5,'left'],[181,63,'down'],[61,71.5,'right'],[82,74,'left'],[147.5,123,'right']]){
  assert.ok(C.water(x,y));assert.equal(C.fishingWater(x,y,direction),null,[x,y,direction].join('/'));
 }
 for(const [x,y,direction]of [[145,110,'down'],[95,84,'up'],[115,60,'up'],[88,80,'up']])assert.ok(C.fishingWater(x,y,direction),[x,y,direction].join('/'));
 for(const p of [[NaN,77],[100,Infinity],[0,0],[154,123]])assert.equal(C.fishingWater(...p),null,'invalid or pier start');
 const app=boot({...seed(),hp:100,mapRegion:'coast',boatActive:true,x:121.5,y:52.5,direction:'right',ownedVehicles:['canoe'],equipment:{vehicle:'canoe'}});
 try{
  assert.equal(app.window.fishingWaterNearPlayer(),null);assert.match(app.window.document.querySelector('#hint').textContent,/岸や桟橋/);
  app.window.document.querySelector('#action').click();assert.equal(read(app.window,'battle'),null);
  app.window.eval("s.direction='left';render()");assert.ok(app.window.fishingWaterNearPlayer());app.window.document.querySelector('#action').click();assert.equal(read(app.window,'battle.waterZone'),'sea');
  assert.deepEqual(app.errors,[]);
 }finally{app.dispose();}
});
