const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const I=require('../offshore-island.js'),L=require('../world-life.js'),{boot,seed,read,saveKey}=require('./game-harness.cjs'),{floors,blocked}=require('./offshore-collision-fixture.cjs');
function route(from,target){
 const queue=[{x:from.x,y:from.y,parent:-1}],seen=new Set([from.x+','+from.y]);
 for(let i=0;i<queue.length;i++){const p=queue[i];if(Math.hypot(p.x-target.x,p.y-target.y)<=(target.radius||1.2)){
  const result=[];for(let n=i;queue[n].parent>=0;n=queue[n].parent)result.push(queue[n]);return result.reverse();
 }
 for(const d of ['left','right','up','down']){const next=L.moveTarget(p.x,p.y,d,4,I.walkable),key=next.x+','+next.y;if(!seen.has(key)){seen.add(key);queue.push({...next,d,parent:i});}}
 }throw Error('Unreachable painted floor '+JSON.stringify(target));
}

test('the painted beach, quay, forecourt, lighthouse and eastern detour are open and connected to the ferry',()=>{
 for(const point of floors){assert.equal(I.walkable(point.x,point.y),true,point.id);const steps=route(I.entry,point);assert.ok(steps.length>0,point.id);for(const step of steps)assert.equal(I.walkable(step.x,step.y),true);}
});

test('the former forest shortcut, sea and cliffs stay blocked and long steps cannot tunnel off the pier or platform',()=>{
 for(const [x,y]of blocked)assert.equal(I.walkable(x,y),false,'blocked '+x+','+y);
 for(const [x,y]of [[NaN,60],[100,Infinity],[-1,80],[240,60],[100,136]])assert.equal(I.walkable(x,y),false);
 for(const [from,d]of [[{x:130,y:100},'down'],[{x:218,y:55},'right'],[{x:94,y:80},'down']]){
  const end=L.moveTarget(from.x,from.y,d,200,I.walkable);assert.ok(I.walkable(end.x,end.y));assert.ok(Math.hypot(end.x-from.x,end.y-from.y)<10);
 }
});

test('actual game movement traverses the repaired beach, east detour and quay and returns without changing fare or another save',()=>{
 const sentinel=JSON.stringify({sentinel:'other-adventure'}),a=boot({...seed(),mapRegion:I.id,...I.entry,money:1234},{},{storage:{[saveKey+'-slot2']:sentinel}}),w=a.window;
 try{const before=read(w,'({money:s.money,hp:s.hp,time:s.gameMinutes,caught:s.caught})');
  for(const target of [floors[1],floors[6],floors[2],I.entry]){const from=read(w,'({x:s.x,y:s.y})');for(const step of route(from,target)){
   const previous=read(w,'({x:s.x,y:s.y})');w.move(step.d);const actual=read(w,'({x:s.x,y:s.y})');assert.deepEqual(actual,{x:step.x,y:step.y});
   assert.equal(read(w,`isWalkableWorldSegment(${previous.x},${previous.y},s.x,s.y)`),true);
  }assert.ok(read(w,`Math.hypot(s.x-${target.x},s.y-${target.y})`)<=1.2);}
  assert.deepEqual(read(w,'({money:s.money,hp:s.hp,time:s.gameMinutes,caught:s.caught})'),before);assert.equal(w.localStorage.getItem(saveKey+'-slot2'),sentinel);assert.deepEqual(a.errors,[]);
 }finally{a.dispose();}
});

test('saves on newly opened floors keep their position and a save in the old forest shortcut recovers without another fare',()=>{
 for(const [x,y,keep]of [[104,79,true],[148,86,true],[181,51,false]]){const initial={...seed(),mapRegion:I.id,x,y,money:1234},a=boot(initial);let saved;
  try{const w=a.window;assert.equal(read(w,'s.mapRegion'),I.id);assert.equal(read(w,'s.money'),1234);assert.ok(I.walkable(read(w,'s.x'),read(w,'s.y')));if(keep)assert.deepEqual(read(w,'({x:s.x,y:s.y})'),{x,y});w.eval('save()');saved=JSON.parse(w.localStorage.getItem(saveKey));assert.deepEqual(a.errors,[]);}finally{a.dispose();}
  const b=boot(saved);try{assert.equal(read(b.window,'s.money'),1234);assert.deepEqual(read(b.window,'({x:s.x,y:s.y})'),{x:saved.x,y:saved.y});assert.deepEqual(b.errors,[]);}finally{b.dispose();}
 }
});

test('all three fishing shores and service landmarks remain reachable and the free ferry return still works',()=>{
 for(const point of [...I.fishingPoints,I.rest,I.lighthouse]){assert.ok(route(I.entry,point).length);assert.ok(I.walkable(point.x,point.y));if(point.id){const water=I.fishingWater(point.x,point.y,point.direction);assert.equal(water.type,point.id);assert.equal(water.zone,'sea');assert.equal(I.walkable(water.x,water.y),false);}}
 const s={mapRegion:I.id,...I.entry,money:0,hp:0,boatActive:false};assert.deepEqual(I.voyage(s,true),{ok:true,cost:0,minutes:60});assert.equal(s.money,0);assert.equal(s.hp,0);assert.equal(s.mapRegion,'village');
});

test('the original map painting stays unchanged and the HTML and offline cache select the repaired collision module',()=>{
 const root=path.resolve(__dirname,'..'),sha=file=>crypto.createHash('sha256').update(fs.readFileSync(path.join(root,file))).digest('hex');
 assert.equal(sha('assets/offshore-world-v251.png'),'58cb82c22b3ae8cc4b10b4ba6e72720d206458b8b2f7e9f2abb2ef2c7e17b9c9');
 for(const file of ['index.html','sw.js'])assert.match(fs.readFileSync(path.join(root,file),'utf8'),/offshore-island\.js\?v=252-16/);
});
