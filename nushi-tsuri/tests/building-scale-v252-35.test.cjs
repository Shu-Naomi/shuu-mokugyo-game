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

test('the hillside through-road stays dry, walkable and clear of building walls at every quarter unit',()=>{
 const cave=M.regions.stream.landmarks.find(p=>p.id==='cave');
 const road=M.regions.stream.trails.find(points=>points.some(([x,y])=>x===cave.x&&y===cave.y));
 assert.ok(road,'explicit bridge-to-cave through-road');
 for(let i=1;i<road.length;i++){
  const [a,b]=[road[i-1],road[i]],steps=Math.ceil(Math.hypot(b[0]-a[0],b[1]-a[1])*4);
  for(let j=0;j<=steps;j++){
   const t=j/steps,x=a[0]+(b[0]-a[0])*t,y=a[1]+(b[1]-a[1])*t,label=`road ${x},${y}`;
   assert.equal(Life.solid(x,y,'stream'),false,label+' clear of buildings');
   assert.equal(M.waterType(x,y,'stream'),null,label+' dry');
   assert.ok(M.walkable(x,y,'stream'),label+' walkable');
  }
 }
});

test('relocated house saves recover safely and cave travel returns to a connected valley',()=>{
 const house=valley.find(b=>b.kind==='house'),footprint=Life.footprint(house);
 const positions=[[190,40],[190,38],[(footprint.left+footprint.right)/2,(footprint.top+footprint.bottom)/2]];
 for(const [x,y] of positions){
  const original={...seed(),mapRegion:'stream',x,y,soundEnabled:false},app=boot(original),w=app.window;
  try{
   w.Math.random=()=>.999999;
   const at=()=>read(w,'({x:s.x,y:s.y})'),normalizedAffinity=read(w,'s.dogAffinity');
   assert.ok(M.walkable(at().x,at().y,'stream'),'old save resumes on safe ground');
   for(const d of route(at(),(px,py)=>Life.nearby({mapRegion:'stream',x:px,y:py,direction:'up'})?.id===house.id))w.move(d);
   w.eval("s.direction='up';render()");w.document.querySelector('#action').click();
   assert.ok(w.document.querySelector('#worldHouse.open'),'relocated house dialogue opens');w.close();
   for(const d of route(at(),(px,py)=>M.exitAt(px,py,'stream')?.region==='cave'))w.move(d);
   w.document.querySelector('#action').click();assert.equal(read(w,'s.mapRegion'),'cave');
   w.document.querySelector('#action').click();assert.equal(read(w,'s.mapRegion'),'stream');
   assert.ok(M.walkable(at().x,at().y,'stream'),'cave return is safe');
   for(const d of route(at(),(px,py)=>M.onBridge(px,py,'stream')))w.move(d);
   assert.ok(M.onBridge(at().x,at().y,'stream'),'return route reaches bridge');w.save();
   const saved=JSON.parse(w.localStorage.getItem(saveKey));
   for(const key of ['money','hp','questCompletions'])assert.deepEqual(saved[key],original[key],key);
   for(const key of ['caught','baits','cookingIngredients','preparedMeals'])for(const [item,value] of Object.entries(original[key]))assert.deepEqual(saved[key][item],value,key+'.'+item);
   assert.deepEqual(saved.dogAffinity,normalizedAffinity,'normalized legacy dog affinity is preserved');
   assert.deepEqual(app.errors,[]);
  }finally{app.dispose();}
 }
});

test('the terrace retaining wall blocks shortcuts and residents stay on walkable forecourt ground',()=>{
 const walls=M.regions.stream.walls;
 assert.ok(walls?.length,'terrace retaining face has collision');
 for(const polygon of walls){
  const x=polygon.reduce((sum,p)=>sum+p[0],0)/polygon.length,y=polygon.reduce((sum,p)=>sum+p[1],0)/polygon.length;
  assert.equal(M.walkable(x,y,'stream'),false,'cannot stand in retaining face');
  const north=Math.min(...polygon.map(p=>p[1]))-2;
  assert.ok(M.walkable(x,north,'stream'),'upper terrace is reachable');
  assert.ok(M.moveTarget(x,north,'down',20,'stream').y<y,'swept movement stops at retaining wall');
 }
 for(const resident of Life.residents.filter(p=>p.region==='stream'))for(let time=0;time<=30000;time+=100){
  const p=Life.residentPose(resident,time);assert.ok(M.walkable(p.x,p.y,'stream'),resident.id+' at '+time);
 }
});

test('runtime hillside compositing preserves every pixel outside the clip and uses terrain without baked buildings',async()=>{
 const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),crypto=require('node:crypto');
 const {createCanvas,Image,loadImage}=require('@napi-rs/canvas'),pending=[];
 class LocalImage extends Image{
  set src(source){pending.push(new Promise((resolve,reject)=>{const paint=this.onload;this.onload=()=>{paint?.();resolve();};this.onerror=reject;}));super.src=path.join(__dirname,'..',source);}
 }
 const context={Image:LocalImage,OffscreenCanvas:function(width,height){return createCanvas(width,height);}};
 vm.runInNewContext(fs.readFileSync(path.join(__dirname,'../mountain-region.js'),'utf8'),context);
 const mountain=context.ShuMountain,overlay=mountain.regions.stream.overlay;
 // This exact terrain-only image was visually reviewed with both terraces empty.
 // A replacement requires another visual review, not silently accepting baked sprites.
 const terrain=fs.readFileSync(path.join(__dirname,'..',overlay.asset));
 assert.equal(crypto.createHash('sha256').update(terrain).digest('hex'),'2fa0ec9b6c5f4d8dbe71ab1597c1c4042f0a4345083cea2463b346414fbbd764','reviewed terrain-only asset');
 const original=await loadImage(path.join(__dirname,'..',mountain.asset));
 const width=original.width,height=original.height,rendered=createCanvas(width,height),base=createCanvas(width,height),mask=createCanvas(width,height);
 base.getContext('2d').drawImage(original,0,0);
 mountain.paint(rendered,{period:'day'},'stream');await Promise.all(pending);
 const g=mask.getContext('2d');g.beginPath();overlay.clip.forEach(([x,y],i)=>i?g.lineTo(x/240*width,y/135*height):g.moveTo(x/240*width,y/135*height));g.closePath();g.fill();
 const a=rendered.getContext('2d').getImageData(0,0,width,height).data,b=base.getContext('2d').getImageData(0,0,width,height).data,m=mask.getContext('2d').getImageData(0,0,width,height).data;
 let outside=0,changed=0;
 for(let i=0;i<a.length;i+=4){
  const same=a[i]===b[i]&&a[i+1]===b[i+1]&&a[i+2]===b[i+2]&&a[i+3]===b[i+3];
  if(m[i+3]===0){outside++;assert.ok(same,'original pixel outside hillside '+i/4);}else if(!same)changed++;
 }
 assert.ok(outside>width*height*.6,'most of the map remains original');assert.ok(changed>20000,'actual terrain patch is rendered');
 const repeat=Buffer.from(a);mountain.paint(rendered,{period:'day'},'stream');
 assert.deepEqual(Buffer.from(rendered.getContext('2d').getImageData(0,0,width,height).data),repeat,'cached feathered layer repaints identically');
});
