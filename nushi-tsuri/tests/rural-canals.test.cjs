const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {boot,seed,read,saveKey}=require('./game-harness.cjs');
const {planRuralRoute}=require('./rural-canals-route.cjs');
const M=require('../mountain-region.js'),R=require('../rural-canals.js');
const fixture=extra=>({...seed(),mapRegion:'village',x:210,y:43,hp:100,soundEnabled:false,...extra});
const resources=w=>read(w,'({money:s.money,hp:s.hp,baits:s.baits,caught:s.caught,equipment:s.equipment,questCompletions:s.questCompletions,gameMinutes:s.gameMinutes})');
function walk(w,target){const steps=w.eval('('+planRuralRoute.toString()+')('+JSON.stringify(target)+')');for(const direction of steps){const b=w.document.querySelector('[data-move="'+direction+'"]');b.onpointerdown({preventDefault(){},currentTarget:b,pointerId:1});b.onpointerup();}return steps.length;}
test('village approach, A entry, bridge, both banks, return and region reload use actual walking controls',()=>{
 const app=boot(fixture()),w=app.window;let saved,before;
 try{
  before=resources(w);assert.ok(walk(w,'villageGate')>0);w.document.querySelector('#action').click();
  assert.equal(read(w,'s.mapRegion'),R.id);assert.deepEqual(read(w,'({x:s.x,y:s.y,direction:s.direction})'),R.entry);
  assert.ok(walk(w,'bridge')>0);assert.ok(M.onBridge(read(w,'s.x'),read(w,'s.y'),R.id));
  for(const type of ['canalCurrent','canalBackwater']){walk(w,type);assert.equal(read(w,'nearbyFishingSpot().mountainType'),type);}
  assert.deepEqual(resources(w),before);w.eval('save()');saved=JSON.parse(w.localStorage.getItem(saveKey));assert.deepEqual(app.errors,[]);
 }finally{app.dispose();}
 const restored=boot(saved),r=restored.window;
 try{assert.equal(read(r,'s.mapRegion'),R.id);assert.deepEqual(resources(r),before);assert.deepEqual(read(r,'({x:s.x,y:s.y,direction:s.direction})'),{x:saved.x,y:saved.y,direction:saved.direction});
  walk(r,'return');r.document.querySelector('#action').click();assert.equal(read(r,'s.mapRegion'),'village');assert.deepEqual(read(r,'({x:s.x,y:s.y,direction:s.direction})'),R.villageReturn);assert.deepEqual(resources(r),before);assert.deepEqual(restored.errors,[]);
 }finally{restored.dispose();}
});
test('both banks cast with distinct existing fish populations and retain their regional identity at distance',()=>{
 const all=[];
 for(const type of ['canalCurrent','canalBackwater']){
  const app=boot(fixture({mapRegion:R.id,...R.entry})),w=app.window;
  try{walk(w,type);w.document.querySelector('#action').click();assert.equal(read(w,'battle.phase'),'prep');w.eval('beginFishing();clearInterval(timer);resolveSurfaceCast(50);clearInterval(timer)');assert.equal(read(w,'battle.mountainType'),type);assert.equal(read(w,'battle.spot'),'mountain-'+type+'-mid');
   assert.ok(['funa','dojo','namazu'].includes(read(w,'battle.f.id')));const spots=M.spots.filter(p=>p.id.startsWith('mountain-'+type+'-'));assert.equal(spots.length,3);for(const spot of spots)assert.deepEqual(Object.keys(spot.weights).sort(),['dojo','funa','namazu']);all.push(spots.map(p=>p.weights));assert.deepEqual(app.errors,[]);
  }finally{app.dispose();}
 }
 assert.notDeepEqual(all[0],all[1]);
});
test('invalid rural saves recover onto land and old village saves preserve progress',()=>{
 for(const saved of [fixture({mapRegion:R.id,x:0,y:0,boatActive:true}),seed()]){
  const app=boot(saved),w=app.window;
  try{assert.equal(read(w,'s.mapRegion'),saved.mapRegion||'village');assert.equal(read(w,'s.money'),saved.money);assert.deepEqual(read(w,'s.caught'),saved.caught);assert.equal(read(w,'s.baits.worm'),saved.baits.worm);if(saved.mapRegion===R.id){assert.ok(M.walkable(read(w,'s.x'),read(w,'s.y'),R.id));assert.equal(read(w,'s.boatActive'),false);}assert.deepEqual(app.errors,[]);}finally{app.dispose();}
 }
});
test('rural scene is registered and packaged for offline reload',()=>{
 assert.ok(M.isRegion(R.id));assert.equal(M.regions[R.id].asset,R.asset);
 const root=path.join(__dirname,'..'),html=fs.readFileSync(path.join(root,'index.html'),'utf8'),sw=fs.readFileSync(path.join(root,'sw.js'),'utf8');
 assert.match(html,/rural-canals.js\?v=/);assert.ok(sw.includes(R.asset));assert.ok(fs.existsSync(path.join(root,R.asset)));
 const script=html.match(/rural-canals.js\?v=[^"']+/)[0];assert.ok(sw.includes(script));
});
test('ordinary rural funa, dojo and namazu can be landed once and their catch records survive reload',()=>{
 const app=boot(fixture({mapRegion:R.id,...R.entry,baits:{worm:10},selectedBait:'worm',selectedHook:'medium',ownedRods:['bamboo','starGazer'],selectedRod:'starGazer'})),w=app.window;let saved;
 try{
  walk(w,'canalBackwater');
  for(const id of ['funa','dojo','namazu']){
   const before=read(w,`({count:s.caught.${id}||0,bait:s.baits.worm,time:s.gameMinutes})`);
   w.document.querySelector('#action').click();w.eval('beginFishing();clearInterval(timer);window.originalRandom=Math.random');let roll=-1;
   for(let n=0;n<1000;n++){w.eval('Math.random=()=>'+n/1000);if(read(w,"pick(50,'mountain-canalBackwater-mid').id")===id){roll=n/1000;break;}}
   assert.ok(roll>=0,'normal population includes '+id);
   w.eval(`Math.random=()=>${roll};battle.cast=50;launchSurfaceCast();settleSurfaceCast();clearInterval(timer);startFight();clearInterval(timer);finishHookReveal();Math.random=window.originalRandom;renderBattleFish()`);
   assert.equal(read(w,'battle.f.id'),id);assert.equal(read(w,'s.baits.worm'),before.bait-1);assert.equal(read(w,'s.gameMinutes'),before.time+10);
   w.eval('caught();caught();hideCatchCard()');assert.equal(read(w,`s.caught.${id}`),before.count+1);assert.equal(read(w,`s.fishCatchRecords.${id}.last.spotId`),'mountain-canalBackwater-mid');
  }
  w.eval('save()');saved=JSON.parse(w.localStorage.getItem(saveKey));assert.deepEqual(app.errors,[]);
 }finally{app.dispose();}
 const restored=boot(saved);try{assert.equal(read(restored.window,'s.mapRegion'),R.id);for(const id of ['funa','dojo','namazu'])assert.equal(read(restored.window,`s.caught.${id}`),saved.caught[id]);assert.deepEqual(restored.errors,[]);}finally{restored.dispose();}
});
test('canal water, flooded paddies and the mill stay solid while the painted bridge remains walkable',()=>{
 const seen=new Set();let waterSamples=0;
 for(let x=4;x<236;x+=4)for(let y=4;y<131;y+=4){const type=M.waterType(x,y,R.id);if(type){seen.add(type);waterSamples++;assert.equal(M.walkable(x,y,R.id),false,'solid canal '+x+','+y);}}
 assert.deepEqual([...seen].sort(),['canalBackwater','canalCurrent']);assert.ok(waterSamples>50);
 for(const point of [[800,150],[350,660],[1100,700],[1500,600],[500,370]]){const p=R.point(point);assert.equal(M.walkable(p.x,p.y,R.id),false,'solid paddy/mill '+point);}
 const bridge=R.point([1115,450]);assert.ok(M.onBridge(bridge.x,bridge.y,R.id));assert.ok(M.walkable(bridge.x,bridge.y,R.id));assert.equal(M.fishingWater(bridge.x,bridge.y,'up',R.id),null,'bridge is not a fishing bank');
});
