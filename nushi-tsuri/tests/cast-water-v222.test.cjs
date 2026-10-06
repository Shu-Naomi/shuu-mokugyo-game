const {test}=require('node:test'),assert=require('node:assert/strict'),path=require('node:path');
const {createCanvas,loadImage}=require('@napi-rs/canvas'),Art=require('../layered-scenery.js'),Data=require('../scene-layers.js');

async function sceneView(kind,period='day'){
 const env={season:'summer',period,weather:'sunny'},definition=Data.get('surface-'+kind,env);
 const source=await loadImage(path.join(__dirname,'..',definition.source)),scene=Art.prepare(source,null,definition,env,createCanvas);
 const base=createCanvas(scene.width,scene.height),moving=createCanvas(scene.width,scene.height),phoneBase=createCanvas(844,354),phone=createCanvas(844,354);
 const scale=Math.max(844/scene.width,354/scene.height),x=(844-scene.width*scale)/2,y=(354-scene.height*scale)/2;
 Art.compose(base,scene);const staticCtx=phoneBase.getContext('2d');staticCtx.imageSmoothingEnabled=false;
 staticCtx.drawImage(base,x,y,scene.width*scale,scene.height*scale);
 const ctx=phone.getContext('2d');ctx.imageSmoothingEnabled=false;
 const render=time=>{
  Art.motion(moving,scene,time);ctx.clearRect(0,0,844,354);ctx.drawImage(phoneBase,0,0);
  ctx.drawImage(moving,x,y,scene.width*scale,scene.height*scale);
  return new Uint8ClampedArray(ctx.getImageData(0,0,844,354).data);
 };
 return {scene,render,staticPixels:staticCtx.getImageData(0,0,844,354).data};
}
function difference(a,b){
 let changed=0,total=0,peak=0;
 for(let at=0;at<a.length;at+=4){
  const amount=Math.max(Math.abs(a[at]-b[at]),Math.abs(a[at+1]-b[at+1]),Math.abs(a[at+2]-b[at+2]));
  if(amount>=3)changed++;total+=amount;peak=Math.max(peak,amount);
 }
 return {fraction:changed/(a.length/4),mean:total/(a.length/4),peak};
}

// The old v222 lower bound rewarded a large number of changing pixels. Retain
// the final phone composite check, but require sparse, low-contrast movement.
test('calm water remains visible after a phone crop without disturbing a large part of the painting',async()=>{
 for(const [kind,period] of [['lake','day'],['river','day'],['beach','day'],['mountain-marsh','day'],
  ['mountain-underground','day'],['lake','evening'],['lake','night']]){
  const {render,staticPixels}=await sceneView(kind,period),first=render(400),later=render(2400),change=difference(first,later);
  const quiet=kind==='mountain-marsh'||kind==='mountain-underground';
  assert.ok(change.fraction>=(quiet?.0001:.0005),kind+'/'+period+' still has perceptible movement over two seconds');
  assert.ok(change.fraction<.035,kind+'/'+period+' leaves most reflected texture fixed');
  assert.ok(difference(staticPixels,later).peak<=26,kind+'/'+period+' does not replace painted detail with high-contrast patches');
 }
});

test('every phone-size water tick stays smooth, including phase boundaries and the looping seam',async()=>{
 for(const kind of ['lake','river','beach','mountain-marsh','mountain-underground']){
  const {scene,render}=await sceneView(kind),interval=scene.parts.find(p=>p.waves).waves.interval;
  for(let phase=0;phase<=8;phase++){
   const at=(phase||8)*interval,first=render(at-1000/24),second=render(at+1000/24),change=difference(first,second);
   assert.ok(change.peak<=6,kind+' has no abrupt bright jump at phase '+phase+': '+change.peak);
   assert.ok(change.mean<.045,kind+' has no broad shimmer at phase '+phase);
  }
 }
});
