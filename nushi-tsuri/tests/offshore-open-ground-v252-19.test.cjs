const {test}=require('node:test'),assert=require('node:assert/strict'),path=require('node:path');
const I=require('../offshore-island.js'),L=require('../world-life.js'),{transits,blocked}=require('./offshore-collision-fixture.cjs');
test('fixed direction sequences cross both reported roads and the shelter forecourt without invisible walls',()=>{
 for(const trace of transits){let p=trace.from;assert.equal(I.walkable(p.x,p.y),true,trace.id+' start');
  for(const [direction,x,y]of trace.steps){p=L.moveTarget(p.x,p.y,direction,4,I.walkable);assert.deepEqual(p,{x,y},trace.id+' '+direction);}
 }
 for(const [x,y]of blocked)assert.equal(I.walkable(x,y),false,'obstacle '+x+','+y);
});
test('the independent crossing routes stay on the dirt in the actual painting, including between checkpoints',async()=>{
 const {createCanvas,loadImage}=require('@napi-rs/canvas'),im=await loadImage(path.join(__dirname,'..',I.assets.world)),canvas=createCanvas(im.width,im.height),ctx=canvas.getContext('2d');ctx.drawImage(im,0,0);
 for(const trace of transits){let p=trace.from;
  for(const [,x,y]of trace.steps){for(const t of [0,.25,.5,.75,1]){
   const px=Math.round((p.x+(x-p.x)*t)*im.width/240),py=Math.round((p.y+(y-p.y)*t)*im.height/135),data=ctx.getImageData(px-2,py-2,5,5).data;let dirt=0;
   for(let n=0;n<data.length;n+=4){const [r,g,b]=data.slice(n,n+3);if(r>145&&g>110&&r>g*1.06&&g>b*1.12)dirt++;}
   assert.ok(dirt>=13,trace.id+' crossing leaves the painted dirt at '+px+','+py);
  }p={x,y};}
 }
});
