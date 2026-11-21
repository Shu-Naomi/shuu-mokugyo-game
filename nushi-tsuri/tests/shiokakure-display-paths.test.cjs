const {test}=require('node:test'),assert=require('node:assert/strict'),path=require('node:path');
const {createCanvas,loadImage}=require('@napi-rs/canvas'),A=require('../fish-art'),I=require('../offshore-island'),L=require('../world-life');
test('dex and aquarium reuse the adopted atlas with all headings and jaw, preserving the fight renderer',async()=>{
 assert.equal(A.species.shiokakure.asset,'assets/shiokakure-fight.png');
 const im=await loadImage(path.join(__dirname,'..',A.species.shiokakure.asset)),c=createCanvas(448,224),ctx=c.getContext('2d');
 for(const cells of [8,7,3])for(let frame=0;frame<cells;frame++){
  A.draw(ctx,im,'shiokakure',cells,frame,()=>im);const actual=Buffer.from(ctx.getImageData(0,0,448,224).data);
  assert.deepEqual(A.sourceHead('shiokakure',Math.min(frame,7)),A.sourceHead('shiokakureFight',Math.min(frame,7)),'adopted mouth coordinates');
  let opaque=0,edge=0;for(let i=0;i<448*224;i++)if(actual[i*4+3]>100){opaque++;const x=i%448,y=Math.floor(i/448);if(x<2||x>445||y<2||y>221)edge++;}
  assert.ok(opaque>3500);assert.equal(edge,0);
 }
});
const route=[['up',95,54],['left',91,54],['down',91,58],['left',87,58],['right',91,58],['up',91,54],['right',95,54],['down',95,58]];
test('screenshot-adjacent western shelter fork allows a round trip on painted dirt and blocks crowns and water',async()=>{
 const im=await loadImage(path.join(__dirname,'..',I.assets.world)),c=createCanvas(im.width,im.height),ctx=c.getContext('2d');ctx.drawImage(im,0,0);
 let p={x:95,y:58};for(const [direction,x,y]of route){
  assert.deepEqual(L.moveTarget(p.x,p.y,direction,4,I.walkable),{x,y});
  for(let t=0;t<=1;t+=.125){const px=Math.round((p.x+(x-p.x)*t)*im.width/240),py=Math.round((p.y+(y-p.y)*t)*im.height/135),d=ctx.getImageData(px-2,py-2,5,5).data;let dirt=0;for(let n=0;n<d.length;n+=4)if(d[n]>145&&d[n+1]>110&&d[n]>d[n+1]*1.06&&d[n+1]>d[n+2]*1.12)dirt++;assert.ok(dirt>=13,'painted dirt '+[px,py]);}
  p={x,y};
 }
 for(const point of [[92,59],[94,60],[97,61],[97,62],[88,60],[45,36],[130,50],[170,75]])assert.equal(I.walkable(...point),false,'obstacle '+point);
 assert.deepEqual(L.moveTarget(91,58,'down',4,I.walkable),{x:91,y:58});
 for(const f of I.fishingPoints){assert.ok(I.walkable(f.x,f.y));assert.ok(I.fishingWater(f.x,f.y,f.direction));}
 assert.ok(I.atPier({mapRegion:'offshore',...I.entry}));assert.ok(I.walkable(I.rest.x,I.rest.y));
});
module.exports={route};
