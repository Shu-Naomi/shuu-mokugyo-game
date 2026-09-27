// QA render: the real shop actor viewports/mask and decoded sprites, without a browser save.
const fs=require('node:fs'),path=require('node:path');
const {createCanvas,loadImage,Path2D}=require('@napi-rs/canvas');
const {boot}=require('./game-harness.cjs');
async function preview(output){
  const root=path.join(__dirname,'..'),app=boot();
  try {
    const actors=app.window.document.querySelector('#shopActors');
    const room=await loadImage(path.join(root,'assets/interior-sam-shop-v55.png'));
    const canvas=createCanvas(1024,768),ctx=canvas.getContext('2d');ctx.imageSmoothingEnabled=false;
    ctx.drawImage(room,0,0,1024,768);ctx.scale(1024/1536,768/1152);
    // Native SVG decoding omits embedded images. Read the production SVG's
    // actual viewBox, meet placement and counter mask instead of duplicating constants.
    for(const viewport of actors.querySelectorAll('svg')){
      const image=await loadImage(path.join(root,viewport.querySelector('image').getAttribute('href')));
      const [sx,sy,sw,sh]=viewport.getAttribute('viewBox').split(' ').map(Number);
      const x=Number(viewport.getAttribute('x')),y=Number(viewport.getAttribute('y'));
      const w=Number(viewport.getAttribute('width')),h=Number(viewport.getAttribute('height'));
      const scale=Math.min(w/sw,h/sh);
      ctx.save();
      if(viewport.closest('[mask]')){
        const mask=new Path2D();mask.rect(0,0,1536,1152);
        mask.addPath(new Path2D(actors.querySelector('#samBehindCounter path').getAttribute('d')));
        ctx.clip(mask,'evenodd');
      }
      ctx.drawImage(image,sx,sy,sw,sh,x+(w-sw*scale)/2,y+h-sh*scale,sw*scale,sh*scale);
      ctx.restore();
    }
    fs.writeFileSync(output,canvas.toBuffer('image/png'));
  } finally { app.dispose(); }
}
if(require.main===module) preview(process.argv[2]).catch(error=>{console.error(error);process.exitCode=1;});
module.exports={preview};
