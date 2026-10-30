const {test}=require('node:test'),assert=require('node:assert/strict');
const I=require('../offshore-island.js'),L=require('../world-life.js'),{boot,seed,read,saveKey}=require('./game-harness.cjs'),{verges,transits,reefTransits}=require('./offshore-collision-fixture.cjs');
function withinEdge(point,edge){
 if(edge.min!==undefined)assert.ok(point[edge.axis]>=edge.min,edge.id+' crossed the painted northern/western edge');
 if(edge.max!==undefined)assert.ok(point[edge.axis]<=edge.max,edge.id+' crossed the painted southern edge');
}
test('the old off-road landmarks and the new wide western bend stop at the painted forest boundary',()=>{
 for(const p of verges){
  assert.equal(I.walkable(p.x,p.y),true,p.id+' road');assert.equal(I.walkable(...p.blocked),false,p.id+' obstacle');
  const end=L.moveTarget(p.x,p.y,p.direction,40,I.walkable);withinEdge(end,p);assert.ok(I.walkable(end.x,end.y),p.id+' stopped on the painted road');
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
test('actual movement crosses the reported dirt and newly reached saves resume without another fare or another slot changing',()=>{
 for(const trace of transits){const other=JSON.stringify({sentinel:'other-adventure'}),a=boot({...seed(),mapRegion:I.id,...trace.from,money:788675,hp:100,baits:{shrimp:128}},{},{storage:{[saveKey+'-slot2']:other}});let saved;
  try{const w=a.window,before=read(w,'({money:s.money,hp:s.hp,time:s.gameMinutes,baits:s.baits,caught:s.caught})');assert.deepEqual(read(w,'({x:s.x,y:s.y})'),trace.from);
   for(const [index,[direction,x,y]]of trace.steps.entries()){w.move(direction);assert.deepEqual(read(w,'({x:s.x,y:s.y})'),{x,y},trace.id+' '+direction);if(index===0){w.eval('save()');saved=JSON.parse(w.localStorage.getItem(saveKey));}}
   assert.deepEqual(read(w,'({money:s.money,hp:s.hp,time:s.gameMinutes,baits:s.baits,caught:s.caught})'),before);assert.equal(w.localStorage.getItem(saveKey+'-slot2'),other);assert.deepEqual(a.errors,[]);
  }finally{a.dispose();}
  const b=boot(saved,{},{storage:{[saveKey+'-slot2']:other}});try{assert.deepEqual(read(b.window,'({x:s.x,y:s.y})'),{x:saved.x,y:saved.y});assert.equal(read(b.window,'s.money'),788675);assert.equal(read(b.window,'s.baits.shrimp'),128);assert.equal(b.window.localStorage.getItem(saveKey+'-slot2'),other);assert.deepEqual(b.errors,[]);}finally{b.dispose();}
 }
});
// Fixed rock routes above must finish first. Only the remaining walk through
// the already-tested island roads to the ferry uses route planning.
function returnFromReef(w){
 const start=read(w,'({x:s.x,y:s.y})'),queue=[{...start,parent:-1}],seen=new Set([start.x+','+start.y]);let end=-1;
 for(let i=0;i<queue.length;i++){const p=queue[i];if(Math.hypot(p.x-I.entry.x,p.y-I.entry.y)<=5){end=i;break;}
  for(const d of ['left','right','up','down']){const n=L.moveTarget(p.x,p.y,d,4,I.walkable),key=n.x+','+n.y;if(!seen.has(key)){seen.add(key);queue.push({...n,d,parent:i});}}
 }assert.ok(end>=0,'reef exit reaches ferry');const steps=[];for(let i=end;queue[i].parent>=0;i=queue[i].parent)steps.push(queue[i]);
 for(const p of steps.reverse()){w.move(p.d);assert.deepEqual(read(w,'({x:s.x,y:s.y})'),{x:p.x,y:p.y});}
 const before=read(w,'({money:s.money,time:s.gameMinutes,caught:s.caught,baits:s.baits})');w.action();w.document.querySelector('#offshoreFerryGo').click();
 assert.equal(read(w,'s.mapRegion'),'village');assert.equal(read(w,'s.money'),before.money);assert.equal(read(w,'s.gameMinutes'),before.time+60);assert.deepEqual(read(w,'s.caught'),before.caught);assert.deepEqual(read(w,'s.baits'),before.baits);
}
test('real rock-top moves and saved bridge steps resume, leave by the fixed return legs, and board the free return ferry',()=>{
 const otherKey=require('../save-slots.js').keys[2],other=JSON.stringify({...seed(),money:91827});
 for(const trace of reefTransits){const checkpoint={'reef-middle-return':{x:42,y:42},'reef-north-return':{x:54,y:30},'reef-west-return':{x:54,y:31}}[trace.id],a=boot({...seed(),mapRegion:I.id,...trace.from,money:788675,hp:100,baits:{shrimp:128}},{},{storage:{[otherKey]:other}});let saved,savedIndex;
  try{const w=a.window,before=read(w,'({money:s.money,hp:s.hp,time:s.gameMinutes,baits:s.baits,caught:s.caught})');assert.deepEqual(read(w,'({x:s.x,y:s.y})'),trace.from);
   for(const [index,[d,x,y]]of trace.steps.entries()){w.move(d);assert.deepEqual(read(w,'({x:s.x,y:s.y})'),{x,y},trace.id+' '+d);if(!saved&&x===checkpoint.x&&y===checkpoint.y){w.eval('save()');saved=JSON.parse(w.localStorage.getItem(saveKey));savedIndex=index;}}assert.ok(saved,trace.id+' bridge save');
   assert.deepEqual(read(w,'({money:s.money,hp:s.hp,time:s.gameMinutes,baits:s.baits,caught:s.caught})'),before);assert.equal(w.localStorage.getItem(otherKey),other);assert.deepEqual(a.errors,[]);
  }finally{a.dispose();}
  const b=boot(saved,{},{storage:{[otherKey]:other}});try{const w=b.window;assert.deepEqual(read(w,'({x:s.x,y:s.y})'),checkpoint);for(const [d,x,y]of trace.steps.slice(savedIndex+1)){w.move(d);assert.deepEqual(read(w,'({x:s.x,y:s.y})'),{x,y});}returnFromReef(w);assert.equal(read(w,'s.money'),788675);assert.equal(read(w,'s.baits.shrimp'),128);assert.equal(w.localStorage.getItem(otherKey),other);assert.deepEqual(b.errors,[]);}finally{b.dispose();}
 }
});
test('old saves on former invisible water paths recover to nearby dry ground and can still return without another fare',()=>{
 const otherKey=require('../save-slots.js').keys[2],other=JSON.stringify({...seed(),money:91827});
 for(const [x,y]of [[44,44],[49,44],[45,43]]){assert.equal(I.walkable(x,y),false);const a=boot({...seed(),mapRegion:I.id,x,y,money:788675,hp:100,baits:{shrimp:128}},{},{storage:{[otherKey]:other}});
  try{const w=a.window,p=read(w,'({x:s.x,y:s.y})');assert.notDeepEqual(p,{x,y});assert.ok(Math.hypot(p.x-x,p.y-y)<=8);assert.ok(I.walkable(p.x,p.y));returnFromReef(w);assert.equal(read(w,'s.money'),788675);assert.equal(read(w,'s.baits.shrimp'),128);assert.equal(w.localStorage.getItem(otherKey),other);assert.deepEqual(a.errors,[]);}finally{a.dispose();}
 }
});
