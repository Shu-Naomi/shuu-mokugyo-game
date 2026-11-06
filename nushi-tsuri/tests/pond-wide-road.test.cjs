const {test}=require('node:test'),assert=require('node:assert/strict');
const path=require('node:path'),{createCanvas,loadImage}=require('@napi-rs/canvas');
const M=require('../mountain-region.js'),L=require('../world-life.js');
const {boot,seed,read}=require('./game-harness.cjs');
const region='mountainPond';
const touch=(w,d)=>{const n=w.document.querySelector(`[data-move="${d}"]`);n.onpointerdown({preventDefault(){},currentTarget:n,pointerId:1});n.onpointerup();};

test('the visibly wider final artwork has no invisible walls on clear dirt',async()=>{
 const image=await loadImage(path.join(__dirname,'..',M.regions[region].asset));
 assert.equal(image.width,1671);assert.equal(image.height,941);
 const canvas=createCanvas(image.width,image.height),ctx=canvas.getContext('2d');ctx.drawImage(image,0,0);
 const pixels=ctx.getImageData(0,0,image.width,image.height).data;let audited=0;
 // Source-image colour and independent 10px grid, never the collision centreline.
 // A dense 11×11 patch excludes isolated yellow flowers and rock highlights.
 for(let py=20;py<920;py+=10)for(let px=20;px<1650;px+=10){
  let dirt=0;for(let dy=-5;dy<=5;dy++)for(let dx=-5;dx<=5;dx++){
   const i=((py+dy)*image.width+px+dx)*4,[r,g,b]=pixels.slice(i,i+3);
   if(r>180&&g>125&&b<195&&r>g*1.08&&g>b*1.15)dirt++;
  }
  if(dirt<=108)continue;
  const x=px/image.width*240,y=py/image.height*135;
  // The visible house is drawn over this background, and must remain solid.
  if(L.solid(x,y,region))continue;
  audited++;assert.ok(M.walkable(x,y,region),`clear dirt ${px},${py} (${x},${y})`);
 }
 assert.ok(audited>1800,`audited ${audited} independent dirt patches`);
});

test('fixed touch sequences cross the actual road width, without pathfinder steering',()=>{
 const cases=[{start:[28,69],direction:'left',taps:2,end:[20,69]},
  {start:[170,34],direction:'down',taps:1,end:[170,38]},
  {start:[112,128],direction:'up',taps:6,end:[112,104]},
  {start:[216,62],direction:'down',taps:3,end:[216,74]}];
 for(const c of cases){const app=boot({...seed(),mapRegion:region,x:c.start[0],y:c.start[1],hp:100,soundEnabled:false});
  try{const w=app.window,before=read(w,'[s.hp,s.money,s.gameMinutes,s.baits,s.caught]');
   for(let n=0;n<c.taps;n++)touch(w,c.direction);
   assert.deepEqual(read(w,'[s.x,s.y]'),c.end,JSON.stringify(c));assert.deepEqual(read(w,'[s.hp,s.money,s.gameMinutes,s.baits,s.caught]'),before);assert.deepEqual(app.errors,[]);
  }finally{app.dispose();}
 }
});

test('wider switchbacks still require turns around each cliff face',()=>{
 for(const p of [[205,15],[214,15],[200,22],[199,22],[195,30],[192,31],[183,37]])assert.equal(M.walkable(...p,region),false,p.join(','));
 assert.ok(M.moveTarget(200,26,'up',12,region).y>=23);
 assert.ok(M.moveTarget(192,33,'up',10,region).y>=32);
 for(const x of [106,110,120,130,134])assert.equal(M.exitAt(x,130,region)?.region,'stream',`wide entrance ${x}`);
 for(const p of [[224,12],[225,23],[224,31],[210,15],[130,10],[219,56],[180,113],[120,60]])assert.equal(M.walkable(...p,region),false,`forest, cliff or water ${p}`);
});
