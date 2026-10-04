const {test}=require('node:test'),assert=require('node:assert/strict');
const {createCanvas}=require('@napi-rs/canvas'),Art=require('../fish-art.js');
const boxes=Art.groups.swimmers.boxes.slice(0,8);
function original(shift=0){
 const atlas=createCanvas(1280,1280),ctx=atlas.getContext('2d');
 const colors=boxes.map((box,i)=>[30+i*23+shift,50+i*17,220-i*19]);
 boxes.forEach((b,i)=>{ctx.fillStyle=`rgb(${colors[i]})`;ctx.fillRect(...b);});
 return {atlas,colors};
}
function palette(ctx){
 const data=ctx.getImageData(0,0,448,224).data,colors=new Set();let visible=0;
 for(let i=0;i<data.length;i+=4)if(data[i+3]>100){visible++;colors.add(Array.from(data.slice(i,i+3)).join(','));assert.equal(data[i+3],255,'opaque scales do not become translucent');}
 assert.ok(visible>3500);return colors;
}
test('turns and partial-open mouths use one intact original without mixed scales or doubled translucent anatomy',()=>{
 const {atlas,colors}=original(),ctx=createCanvas(448,224).getContext('2d');
 for(let n=0;n<=24;n++){
  const frame=n/4,heading=Math.min(6,Math.floor(frame+.5)),cell=heading===6?0:heading;
  Art.draw(ctx,atlas,'bass',7,frame);
  assert.deepEqual([...palette(ctx)],[colors[cell].join(',')],`clean turn ${frame}`);
 }
 Art.draw(ctx,atlas,'bass',3,1,null,{swimFrame:2});assert.deepEqual([...palette(ctx)],[colors[7].join(',')],'partial mouth contains one body');
 for(const phase of [1.1,2.4,5.6]){Art.draw(ctx,atlas,'bass',8,phase);assert.deepEqual([...palette(ctx)],[colors[0].join(',')],'tail has no overlapping resampled strips');}
});
test('a turn cache never substitutes a frame from another source image',()=>{
 const a=original(),b=original(7),ctx=createCanvas(448,224).getContext('2d');
 Art.draw(ctx,a.atlas,'bass',7,1.25);assert.deepEqual([...palette(ctx)],[a.colors[1].join(',')]);
 Art.draw(ctx,b.atlas,'bass',7,1.25);assert.deepEqual([...palette(ctx)],[b.colors[1].join(',')]);
});
