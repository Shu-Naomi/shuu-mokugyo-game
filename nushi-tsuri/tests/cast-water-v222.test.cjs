const {test}=require('node:test'),assert=require('node:assert/strict'),path=require('node:path');
const {createCanvas,loadImage}=require('@napi-rs/canvas'),Art=require('../layered-scenery.js'),Data=require('../scene-layers.js');

// Compare the final painted landscape after the same cover crop/downscale as
// a short landscape phone. Native overlay hashes alone miss imperceptible waves.
test('water movement remains perceptible in the final phone-size scene, including evening and night',async()=>{
 for(const [kind,period,minimum] of [['lake','day',.06],['river','day',.03],['beach','day',.07],
  ['mountain-marsh','day',.01],['mountain-underground','day',.025],['lake','evening',.02],['lake','night',.05]]){
  const env={season:'summer',period,weather:'sunny'},definition=Data.get('surface-'+kind,env);
  const source=await loadImage(path.join(__dirname,'..',definition.source)),scene=Art.prepare(source,null,definition,env,createCanvas);
  const render=time=>{
   const full=createCanvas(scene.width,scene.height),moving=createCanvas(scene.width,scene.height);
   Art.compose(full,scene);Art.motion(moving,scene,time);full.getContext('2d').drawImage(moving,0,0);
   const phone=createCanvas(844,354),ctx=phone.getContext('2d'),scale=Math.max(844/scene.width,354/scene.height);
   ctx.imageSmoothingEnabled=false;ctx.drawImage(full,(844-scene.width*scale)/2,(354-scene.height*scale)/2,scene.width*scale,scene.height*scale);
   return ctx.getImageData(0,0,844,354).data;
  };
  const first=render(180),second=render(780);let noticeable=0;
  for(let at=0;at<first.length;at+=4)if(Math.max(Math.abs(first[at]-second[at]),Math.abs(first[at+1]-second[at+1]),Math.abs(first[at+2]-second[at+2]))>=12)noticeable++;
  assert.ok(noticeable/(844*354)>=minimum,kind+'/'+period+' has meaningful visible motion after scaling');
 }
});
