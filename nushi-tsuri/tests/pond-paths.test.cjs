const {test}=require('node:test'),assert=require('node:assert/strict');
const M=require('../mountain-region.js'),L=require('../world-life.js');
const {boot,seed,read,saveKey}=require('./game-harness.cjs'),{samples,stops,route}=require('./pond-paths.cjs');
const region='mountainPond';
const progress=w=>read(w,'({money:s.money,hp:s.hp,baits:s.baits,caught:s.caught,time:s.gameMinutes,equipment:s.equipment})');
function touch(w,direction){const node=w.document.querySelector(`[data-move="${direction}"]`);node.onpointerdown({preventDefault(){},currentTarget:node,pointerId:1});node.onpointerup();}
function walk(w,target,map=region){for(const direction of route(read(w,'({x:s.x,y:s.y})'),target,map)){touch(w,direction);const p=read(w,'({x:s.x,y:s.y})');assert.ok(M.walkable(p.x,p.y,map));}const p=read(w,'({x:s.x,y:s.y})');assert.ok(Math.hypot(p.x-target[0],p.y-target[1])<=1.1,JSON.stringify({target,p,map}));}

test('independently sampled painted dirt edges are usable, including the west half of the entrance',()=>{
 // Source pixels are from the unchanged 1672 x 941 artwork, not the route data.
 for(const [px,py] of samples){const x=px/1672*240,y=py/941*135;assert.equal(M.waterType(x,y,region),null);assert.ok(M.walkable(x,y,region),`painted dirt ${px},${py}`);}
 for(const x of [117,119,121,123,125])for(const y of [116,118,120])assert.ok(M.walkable(x,y,region),`wide entrance ${x},${y}`);
 for(const x of [117,121,125])assert.deepEqual(M.moveTarget(x,120,'up',4,region),{x,y:116});
 assert.deepEqual(M.moveTarget(218,65,'down',4,region),{x:218,y:69});
});

test('wider bends do not open the cliff, forest, house walls, or water',()=>{
 for(const [x,y] of [[224,12],[225,23],[224,31],[200,31],[210,15],[130,12],[219,59],[180,104],[120,60]])assert.equal(M.walkable(x,y,region),false,`${x},${y}`);
 const b=L.buildings.find(b=>b.id==='pond-house');assert.equal(M.walkable(b.x,b.y-3,region),false);assert.equal(M.walkable(b.x,b.y,region),true);
 const stopped=M.moveTarget(120,106,'up',20,region);assert.equal(M.waterType(stopped.x,stopped.y,region),null);assert.ok(stopped.y>102);
});

test('touch walks both road edges, the complete ring, shores, house and both exits without changing progress',()=>{
 const app=boot({...seed(),mapRegion:region,...M.regions[region].entry,hp:100,soundEnabled:false}),w=app.window;let saved,before;
 try{
  before=progress(w);w.eval('Math.random=()=>.999999');
  for(const [name,x,y] of stops){walk(w,[x,y]);if(name.endsWith('shore'))assert.ok(['up','right','down','left'].some(d=>M.fishingWater(read(w,'s.x'),read(w,'s.y'),d,region)?.type==='highPond'));if(name==='house'){touch(w,'up');w.document.querySelector('#action').click();assert.equal(w.document.querySelector('#worldHouseTitle').textContent,'峠の釣り人の小屋');w.close();}}
  walk(w,[219,8]);w.document.querySelector('#action').click();assert.equal(read(w,'s.mapRegion'),'mountainMarsh');
  w.document.querySelector('#action').click();assert.equal(read(w,'s.mapRegion'),region);assert.deepEqual(read(w,'[s.x,s.y]'),[212,10]);
  walk(w,[120,128]);w.document.querySelector('#action').click();assert.equal(read(w,'s.mapRegion'),'stream');
  w.document.querySelector('#action').click();assert.equal(read(w,'s.mapRegion'),region);
  walk(w,[117,118]);assert.deepEqual(progress(w),before);w.save();saved=JSON.parse(w.localStorage.getItem(saveKey));assert.deepEqual(app.errors,[]);
 }finally{app.dispose();}
 const resumed=boot(saved);try{assert.deepEqual(read(resumed.window,'[s.mapRegion,s.x,s.y]'),[region,saved.x,saved.y]);assert.deepEqual(progress(resumed.window),before);walk(resumed.window,[120,106]);assert.deepEqual(resumed.errors,[]);}finally{resumed.dispose();}
});
