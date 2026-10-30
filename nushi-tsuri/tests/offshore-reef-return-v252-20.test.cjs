const {test}=require('node:test'),assert=require('node:assert/strict'),path=require('node:path');
const I=require('../offshore-island.js'),L=require('../world-life.js'),{reefTransits,blocked}=require('./offshore-collision-fixture.cjs');
test('the northwestern rock tops have fixed outward and return routes to the sandy road while tide pools stay closed',()=>{
 for(const trace of reefTransits){let p=trace.from;assert.equal(I.walkable(p.x,p.y),true,trace.id+' start');for(const [d,x,y]of trace.steps){p=L.moveTarget(p.x,p.y,d,4,I.walkable);assert.deepEqual(p,{x,y},trace.id+' '+d);}}
 for(const [x,y]of blocked)assert.equal(I.walkable(x,y),false,'obstacle '+x+','+y);
 for(const [x,y]of [[31,30],[45,36.5],[42,40.5],[47,43.5],[51,44]])assert.equal(I.water(x,y),true,'tide pool '+x+','+y);
});
test('rock crossings and their return legs stay on visible dry rock or planks, including between checkpoints',async()=>{
 const {createCanvas,loadImage}=require('@napi-rs/canvas'),im=await loadImage(path.join(__dirname,'..',I.assets.world)),c=createCanvas(im.width,im.height),ctx=c.getContext('2d');ctx.drawImage(im,0,0);I.paintBridges(ctx,im.width,im.height);
 for(const trace of reefTransits){let p=trace.from;for(const [,x,y]of trace.steps){for(const t of [0,.25,.5,.75,1]){
  const px=Math.round((p.x+(x-p.x)*t)*im.width/240),py=Math.round((p.y+(y-p.y)*t)*im.height/135),data=ctx.getImageData(px-2,py-2,5,5).data;let dry=0;
  // The shaded rock palette is blue-grey; the pools are saturated cyan.
  for(let n=0;n<data.length;n+=4){const [r,g,b]=data.slice(n,n+3);if(r>=25&&g>=25&&r>=b*.65&&g>=b*.82)dry++;}
  assert.ok(dry>=13,trace.id+' crosses blue water at '+px+','+py);
 }p={x,y};}}
 // Submerged grey stones can share the rock palette. These are clear cyan
 // samples; the pool geometry is checked independently above.
 for(const [x,y]of [[31,30],[45,36.5],[47,43.5],[51,44]]){
  const data=ctx.getImageData(Math.round(x*im.width/240)-2,Math.round(y*im.height/135)-2,5,5).data;let dry=0;
  for(let n=0;n<data.length;n+=4){const [r,g,b]=data.slice(n,n+3);if(r>=25&&g>=25&&r>=b*.65&&g>=b*.82)dry++;}assert.ok(dry<13,'pool painted as dry '+x+','+y);
 }
});
