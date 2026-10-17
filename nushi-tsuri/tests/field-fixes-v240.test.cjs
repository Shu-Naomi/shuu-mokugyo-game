const {test}=require('node:test'),assert=require('node:assert/strict');
const {boot,seed,read,saveKey}=require('./game-harness.cjs');
const L=require('../world-life.js'),M=require('../mountain-region.js'),Cast=require('../pixel-cast.js');
const {createCanvas,loadImage}=require('@napi-rs/canvas');
const path=require('node:path');
test('pond saves recover from painted water or old building walls onto ground with more than one exit',()=>{
 for(const [x,y]of [[120,60],[224,12],[229,62],[120.13,105.12]]){
  const a=boot({...seed(),mapRegion:'mountainPond',x,y,hp:68,soundEnabled:false}),w=a.window;
  try{const before=read(w,'({hp:s.hp,money:s.money,baits:s.baits,time:s.gameMinutes})');
   const p=read(w,'({x:s.x,y:s.y})');assert.ok(M.walkable(p.x,p.y,'mountainPond'));
   let exits=0;for(const d of ['left','right','up','down']){
    w.eval(`s.x=${p.x};s.y=${p.y};move('${d}')`);if(read(w,'s.x')!==p.x||read(w,'s.y')!==p.y)exits++;
   }assert.ok(exits>=2,JSON.stringify({x,y,p,exits}));assert.deepEqual(read(w,'({hp:s.hp,money:s.money,baits:s.baits,time:s.gameMinutes})'),before);
   w.eval('save()');assert.ok(JSON.parse(w.localStorage.getItem(saveKey)));assert.deepEqual(a.errors,[]);
  }finally{a.dispose();}
 }
});
test('buildings leave the painted main trails and pond ring clear',()=>{
 for(const region of Object.keys(M.regions)){
  for(const trail of M.regions[region].trails)for(let i=1;i<trail.length;i++){
   const a=trail[i-1],b=trail[i],steps=Math.ceil(Math.hypot(b[0]-a[0],b[1]-a[1])*4);
   for(let n=0;n<=steps;n++){const t=n/steps,x=a[0]+(b[0]-a[0])*t,y=a[1]+(b[1]-a[1])*t;assert.equal(L.solid(x,y,region),false,region+' '+x+','+y);}
  }
 }
});
test('coastal casting always offers a short shallow cast, including the eastern quay',()=>{
 for(const [x,y]of [[210,104],[176,124],[197,120]]){
  const a=boot({...seed(),hp:100,x,y,selectedRod:'tideMaster',ownedRods:['bamboo','tideMaster']}),w=a.window;
  try{w.eval(`cast({zone:'sea',waterZone:'sea',waterX:${x},waterY:${y}});beginFishing();clearInterval(timer)`);
   assert.equal(read(w,'battle.minimumDepth'),'shallow');assert.equal(read(w,'depthForCast("sea",battle.castMin,battle.minimumDepth)'),'shallow');assert.deepEqual(a.errors,[]);
  }finally{a.dispose();}
 }
});
test('NPC walking includes closed and open feet instead of alternating two identical wide stances',async()=>{
 const image=await loadImage(path.join(__dirname,'../assets/village-residents-v238.png'));
 for(const person of L.residents){const frames=new Set();for(let t=3100;t<4500;t+=170)frames.add(L.residentPose(person,t).frame);assert.ok(frames.has(0)&&frames.has(1)&&frames.has(2));
  const canvas=createCanvas(96,128);L.drawResident(canvas,image,person.sprite,{frame:0,facing:'right'});const neutral=Buffer.from(canvas.getContext('2d').getImageData(0,85,96,43).data);
  L.drawResident(canvas,image,person.sprite,{frame:1,facing:'right'});assert.notDeepEqual(Buffer.from(canvas.getContext('2d').getImageData(0,85,96,43).data),neutral);
 }
});
test('upper harbor quay uses a front-facing avatar and casts toward the water below',()=>{
 const g=Cast.groundFor('harbor');assert.equal(g.facing,'down');
 for(const avatar of ['boy','girl'])for(const size of [[844,326],[820,302],[1280,650]]){
  const m=Cast.model(...size,0,undefined,false,avatar,false,g);assert.ok(m.tip.y>m.hand.y);assert.ok(m.leftFoot.y<size[1]*.5);assert.equal(m.leftFoot.y,m.rightFoot.y);
 }
});
