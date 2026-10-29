const {test}=require('node:test'),assert=require('node:assert/strict');
const I=require('../offshore-island.js'),L=require('../world-life.js'),{boot,seed,read,saveKey}=require('./game-harness.cjs'),{verges}=require('./offshore-collision-fixture.cjs');
function withinEdge(point,edge){
 if(edge.min!==undefined)assert.ok(point[edge.axis]>=edge.min,edge.id+' crossed the painted northern/western edge');
 if(edge.max!==undefined)assert.ok(point[edge.axis]<=edge.max,edge.id+' crossed the painted southern edge');
}
test('the reported bushes and six neighboring off-road landmarks are blocked while the painted road remains open',()=>{
 for(const p of verges){
  assert.equal(I.walkable(p.x,p.y),true,p.id+' road');assert.equal(I.walkable(...p.blocked),false,p.id+' obstacle');
  const end=L.moveTarget(p.x,p.y,p.direction,40,I.walkable);withinEdge(end,p);assert.ok(Math.hypot(end.x-p.x,end.y-p.y)<3,p.id+' leaves the road');
 }
});
test('repeated real game direction inputs stop at each independently identified road edge without changing travel resources',()=>{
 for(const p of verges){const other=JSON.stringify({sentinel:'untouched-slot'}),a=boot({...seed(),mapRegion:I.id,x:p.x,y:p.y,money:739575,hp:100},{},{storage:{[saveKey+'-slot2']:other}});
  try{const w=a.window,before=read(w,'({money:s.money,hp:s.hp,time:s.gameMinutes,baits:s.baits,caught:s.caught})');
   for(let n=0;n<10;n++){w.move(p.direction);const at=read(w,'({x:s.x,y:s.y})');withinEdge(at,p);assert.notDeepEqual(at,{x:p.blocked[0],y:p.blocked[1]},p.id);}
   assert.deepEqual(read(w,'({money:s.money,hp:s.hp,time:s.gameMinutes,baits:s.baits,caught:s.caught})'),before);assert.equal(w.localStorage.getItem(saveKey+'-slot2'),other);assert.deepEqual(a.errors,[]);
  }finally{a.dispose();}
 }
});
test('old saves in the reported vegetation recover to a nearby path and keep money, bait and the other adventure',()=>{
 for(const [x,y,keep]of [[143,52,false],[150,47,false],[88,60,false],[143,56,true]]){
  const other=JSON.stringify({sentinel:'other-adventure'}),initial={...seed(),mapRegion:I.id,x,y,money:739575,hp:100,baits:{shrimp:128}},a=boot(initial,{},{storage:{[saveKey+'-slot2']:other}});let saved;
  try{const w=a.window,at=read(w,'({x:s.x,y:s.y})');assert.equal(read(w,'s.mapRegion'),I.id);assert.equal(I.walkable(at.x,at.y),true);assert.ok(Math.hypot(at.x-x,at.y-y)<=8,'nearby path recovery');if(keep)assert.deepEqual(at,{x,y});else assert.notDeepEqual(at,{x,y});
   assert.equal(read(w,'s.money'),739575);assert.equal(read(w,'s.hp'),100);assert.equal(read(w,'s.baits.shrimp'),128);assert.equal(w.localStorage.getItem(saveKey+'-slot2'),other);w.eval('save()');saved=JSON.parse(w.localStorage.getItem(saveKey));assert.deepEqual(a.errors,[]);
  }finally{a.dispose();}
  const b=boot(saved);try{assert.deepEqual(read(b.window,'({x:s.x,y:s.y})'),{x:saved.x,y:saved.y});assert.equal(read(b.window,'s.money'),739575);assert.equal(read(b.window,'s.baits.shrimp'),128);assert.deepEqual(b.errors,[]);}finally{b.dispose();}
 }
});
