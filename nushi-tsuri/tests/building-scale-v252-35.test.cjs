const {test}=require('node:test'),assert=require('node:assert/strict');
const M=require('../mountain-region.js'),Life=require('../world-life.js');
const {boot,seed,read,saveKey}=require('./game-harness.cjs');
const valley=Life.buildings.filter(b=>b.region==='stream');
test('valley doors are human-sized without changing artwork or scaling residents',()=>{
 for(const b of valley){
  const [, , width,height]=Life.art.buildings[b.sprite];
  const scale=Math.min(b.w/width,b.h/height);
  // Door panels measured in the original atlas, excluding steps and canopy.
  const doorHeight=140*scale;
  assert.ok(doorHeight>=6.4&&doorHeight<=9,b.id+' door height '+doorHeight);
  assert.equal(M.waterType(b.x,b.y,'stream'),null);
  assert.ok(M.walkable(b.x,b.y,'stream'));
  assert.equal(Life.nearby({mapRegion:'stream',x:b.x,y:b.y,direction:'up'})?.id,b.id);
  const f=Life.footprint(b);
  assert.ok(!M.walkable((f.left+f.right)/2,(f.top+f.bottom)/2,'stream'));
  assert.ok(M.moveTarget(b.x,b.y,'up',40,'stream').y>f.bottom);
 }
 assert.deepEqual(valley.map(b=>b.sprite),[1,0]);
});
function route(start,goal){const q=[{...start,parent:-1}],seen=new Set([start.x+','+start.y]);for(let i=0;i<q.length;i++){const p=q[i];if(goal(p.x,p.y)){const out=[];for(let j=i;q[j].parent>=0;j=q[j].parent)out.push(q[j].direction);return out.reverse();}for(const direction of ['up','right','down','left']){const n=M.moveTarget(p.x,p.y,direction,4,'stream'),key=n.x+','+n.y;if(!seen.has(key)){seen.add(key);q.push({...n,parent:i,direction});}}}throw Error('Unreachable entrance');}
test('both doors connect to the valley and a legacy house save safely resumes with progress intact',()=>{
 for(const b of valley)assert.ok(route(M.entry,(x,y)=>Math.hypot(x-b.x,y-b.y)<=1).length);
 const house=valley.find(b=>b.kind==='house'),f=Life.footprint(house),original={...seed(),mapRegion:'stream',x:190,y:38,soundEnabled:false},app=boot(original),w=app.window;
 try{
  w.Math.random=()=>.999999;
  assert.ok(M.walkable(read(w,'s.x'),read(w,'s.y'),'stream'));
  const steps=route(read(w,'({x:s.x,y:s.y})'),(x,y)=>Life.nearby({mapRegion:'stream',x,y,direction:'up'})?.id===house.id);
  for(const d of steps)w.move(d);
  w.eval("s.direction='up';render()");w.document.querySelector('#action').click();
  assert.ok(w.document.querySelector('.modal.open'),'house dialogue opens');w.close();w.save();
  const saved=JSON.parse(w.localStorage.getItem(saveKey));
  for(const key of ['money','hp','caught'])assert.deepEqual(saved[key],original[key],key);
  assert.equal(saved.baits.worm,original.baits.worm);assert.equal(saved.baits.shell,original.baits.shell);
  assert.deepEqual(app.errors,[]);
 }finally{app.dispose();}
});
