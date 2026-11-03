const {test}=require('node:test'),assert=require('node:assert/strict');
const M=require('../mountain-region.js'),Life=require('../world-life.js');
const {boot,seed,read,saveKey}=require('./game-harness.cjs');
// Search the same quarter-unit swept movement as the field, without a DOM
// render per search edge. Actual routes below still execute through touch UI.
function routeTo(w,region,goal){
  const start=read(w,'({x:s.x,y:s.y})'),queue=[{...start,parent:-1}],seen=new Set([start.x+','+start.y]);
  for(let i=0;i<queue.length;i++){
    const p=queue[i];
    if(goal(p.x,p.y)){const route=[];for(let j=i;queue[j].parent>=0;j=queue[j].parent)route.push(queue[j].direction);return route.reverse();}
    for(const direction of ['up','right','down','left']){
      const n=M.moveTarget(p.x,p.y,direction,4,region),key=n.x+','+n.y;
      if(!seen.has(key)){seen.add(key);queue.push({...n,parent:i,direction});}
    }
  }
  throw Error('No field route in '+region);
}
const directions=['up','right','down','left'];
const shop=Life.buildings.find(b=>b.id==='stream-shop');
const fixture=(extra={})=>({...seed(),mapRegion:'stream',...M.regions.stream.entry,soundEnabled:false,...extra});
const progress=w=>read(w,'({hp:s.hp,money:s.money,caught:s.caught,baits:s.baits,equipment:s.equipment,ownedRods:s.ownedRods,items:s.items,time:s.gameMinutes})');
function touch(w,d){const b=w.document.querySelector('[data-move="'+d+'"]');b.onpointerdown({preventDefault(){},currentTarget:b,pointerId:1});b.onpointerup();}
function walk(w,goal,label){
  for(const d of routeTo(w,'stream',goal)){
    touch(w,d);
    const p=read(w,'({x:s.x,y:s.y})');
    assert.ok(M.walkable(p.x,p.y,'stream'),label+' remains on walkable ground');
  }
  assert.equal(read(w,'s.mapRegion'),'stream');
  assert.ok(goal(read(w,'s.x'),read(w,'s.y')),label);
}

test('the valley shop has a dry connected entrance and a solid footprint; widening roads never opens water',()=>{
  assert.ok(shop);
  const f=Life.footprint(shop),cx=(f.left+f.right)/2,cy=(f.top+f.bottom)/2;
  assert.equal(Life.solid(cx,cy,'stream'),true);
  assert.equal(M.walkable(cx,cy,'stream'),false);
  assert.equal(M.waterType(shop.x,shop.y,'stream'),null,'door is on dry ground');
  assert.equal(M.walkable(shop.x,shop.y,'stream'),true,'door is reachable ground');
  assert.equal(Life.nearby({mapRegion:'stream',x:shop.x,y:shop.y,direction:'up'})?.id,shop.id);
  const stopped=M.moveTarget(cx,shop.y+1,'up',40,'stream');
  assert.ok(stopped.y>f.bottom,'cannot tunnel through the shop');
  assert.ok(M.walkable(stopped.x,stopped.y,'stream'));
  const sampled=new Set();
  for(let x=2;x<=238;x+=2)for(let y=2;y<=133;y+=2){
    const type=M.waterType(x,y,'stream');
    if(type){sampled.add(type);assert.equal(M.walkable(x,y,'stream'),false,'water '+x+','+y);}
  }
  assert.deepEqual([...sampled].sort(),Object.keys(M.regions.stream.waters).sort());
  const b=M.regions.stream.bridges[0];
  for(let x=Math.ceil(b.left);x<=b.right;x++)assert.ok(M.walkable(x,(b.top+b.bottom)/2,'stream'),'bridge deck '+x);
});

test('touch walking connects valley entry, shop, bridge, pass, cave and every fishing bank, then preserves save progress',()=>{
  const app=boot(fixture()),w=app.window;let saved,before,position;
  try{
    w.Math.random=()=>.999999;
    before=progress(w);
    walk(w,(x,y)=>Math.hypot(x-shop.x,y-shop.y)<=1,'shop entrance');
    touch(w,'up');
    assert.equal(read(w,'ShuWorldLife.nearby(s)?.id ?? null'),shop.id);
    w.document.querySelector('#action').click();
    assert.ok(w.document.querySelector('#store').classList.contains('open'),'shop opens from its front');
    w.close();
    walk(w,(x,y)=>M.onBridge(x,y,'stream'),'bridge');
    for(const id of ['pass','cave'])walk(w,(x,y)=>M.landmarkAt(x,y,'stream')?.id===id,id);
    for(const type of Object.keys(M.regions.stream.waters)){
      walk(w,(x,y)=>directions.some(d=>M.fishingWater(x,y,d,'stream')?.type===type),type+' fishing bank');
      const p=read(w,'({x:s.x,y:s.y})'),d=directions.find(d=>M.fishingWater(p.x,p.y,d,'stream')?.type===type);
      assert.equal(read(w,'fishingWaterNearPlayer(s.x,s.y,"'+d+'").type'),type);
    }
    walk(w,(x,y)=>M.atReturnGate(x,y,'stream'),'return gate');
    position=read(w,'({mapRegion:s.mapRegion,x:s.x,y:s.y,direction:s.direction})');
    assert.deepEqual(progress(w),before);
    w.save();saved=JSON.parse(w.localStorage.getItem(saveKey));assert.deepEqual(app.errors,[]);
  }finally{app.dispose();}
  const restored=boot(saved);
  try{
    assert.deepEqual(read(restored.window,'({mapRegion:s.mapRegion,x:s.x,y:s.y,direction:s.direction})'),position);
    assert.deepEqual(progress(restored.window),before);
    assert.deepEqual(restored.errors,[]);
  }finally{restored.dispose();}
});

test('legacy valley saves keep inventory and resume on walkable ground after the shop relocation',()=>{
  const f=Life.footprint(shop);
  for(const [x,y] of [[160,66],[Math.round((f.left+f.right)/2),Math.round((f.top+f.bottom)/2)]]){
    const original=fixture({x,y}),app=boot(original),w=app.window;
    try{
      w.Math.random=()=>.999999;
      const p=read(w,'({x:s.x,y:s.y})');
      assert.equal(read(w,'s.mapRegion'),'stream');
      assert.ok(M.walkable(p.x,p.y,'stream'),'legacy save resolves to safe ground');
      assert.equal(read(w,'s.money'),original.money);assert.equal(read(w,'s.hp'),original.hp);
      assert.deepEqual(read(w,'s.caught'),original.caught);assert.equal(read(w,'s.baits.worm'),original.baits.worm);
      walk(w,(px,py)=>Life.nearby({mapRegion:'stream',x:px,y:py,direction:'up'})?.id===shop.id,'shop from legacy position');
      assert.deepEqual(app.errors,[]);
    }finally{app.dispose();}
  }
});
