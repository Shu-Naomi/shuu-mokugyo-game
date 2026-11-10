const {test}=require('node:test');
const assert=require('node:assert/strict');
const path=require('node:path');
const {createCanvas,loadImage}=require('@napi-rs/canvas');
const ref=require('../village-reference');
test('native connected blue lake, stream, harbor and pond cannot support player feet',async()=>{
 const image=await loadImage(path.join(__dirname,'..',ref.source.asset));
 const canvas=createCanvas(image.width,image.height),ctx=canvas.getContext('2d');
 ctx.drawImage(image,0,0);const pixels=ctx.getImageData(0,0,image.width,image.height).data;
 const blue=(x,y)=>{const i=(y*image.width+x)*4;return pixels[i+2]>pixels[i]+20&&pixels[i+1]>pixels[i]+15;};
 for(const pixel of [[710,760],[715,790],[1025,760],[1420,720],[695,130],[1475,690]])assert.equal(ref.walkable(...ref.point(pixel)),false,'reviewed water/solid '+pixel);
 const regions=[
  ['lake',[400,90,1030,340],[[700,220]],80000],
  ['river',[600,320,790,845],[[735,370],[710,460],[710,600],[690,730],[715,790]],18000],
  ['harbor',[780,600,1671,940],[[1100,850],[1550,650]],130000],
  ['pond',[1430,450,1570,550],[[1500,500]],4000],
 ];
 for(const [name,bounds,seeds,minimum]of regions){
  const [left,top,right,bottom]=bounds,queue=[],seen=new Set();
  for(const p of seeds){assert.ok(blue(...p),`${name} seed is blue`);seen.add(p[1]*image.width+p[0]);queue.push(p);}
  for(let i=0;i<queue.length;i++){
   const [x,y]=queue[i];
   for(const [dx,dy]of [[1,0],[-1,0],[0,1],[0,-1],[1,1],[1,-1],[-1,1],[-1,-1]]){
    const a=x+dx,b=y+dy,k=b*image.width+a;
    if(a>=left&&a<=right&&b>=top&&b<=bottom&&!seen.has(k)&&blue(a,b)){seen.add(k);queue.push([a,b]);}
   }
  }
  assert.ok(queue.length>minimum,`${name} substantial connected pixel coverage`);
  for(const [px,py]of queue){
   const [x,y]=ref.point([px+.5,py+.5]);
   if(ref.inside(x,y,ref.geometry.riverBridgeBounds)||ref.inside(x,y,ref.geometry.lakeDockBounds))continue;
   // The harbor component also touches the blue hanging banner. That visible
   // prop is solid, not water; it cannot be used to invent a walkable pier.
   assert.ok(ref.water(x,y)||ref.blocked(x,y),`${name} connected blue ${px},${py}`);
   assert.equal(ref.walkable(x,y),false,`${name} blocks feet ${px},${py}`);
  }
 }
});
