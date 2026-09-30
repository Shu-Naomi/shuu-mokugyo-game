// Render the shipped gesture painter with the actual dog atlases.
const fs=require('node:fs'),path=require('node:path');
const {createCanvas,loadImage}=require('@napi-rs/canvas');
const {boot}=require('./game-harness.cjs');
async function preview(output){
  const app=boot(),w=app.window,images={},root=path.join(__dirname,'..');
  try{
    for(const id of ['shuu','riku','grey']){
      w.ensureDogImage(id);const src=w.eval(`dogImages.${id}.src`);
      images[src]=await loadImage(path.join(root,src.split('?')[0]));
    }
    const idle=w.eval('dogIdleImage.src');images[idle]=await loadImage(path.join(root,idle.split('?')[0]));
    const sheet=createCanvas(1728,768),context=sheet.getContext('2d');context.imageSmoothingEnabled=false;
    for(const [row,id]of ['shuu','riku','grey'].entries())for(const [column,trick]of [null,...w.ShuPetLife.TRICKS].entries()){
      const canvas=createCanvas(144,128),ctx=canvas.getContext('2d'),draw=ctx.drawImage.bind(ctx);
      ctx.drawImage=(image,...args)=>draw(images[image.src]||image,...args);
      w.drawContestDog(canvas,id,{trick,success:true,elapsed:.5,phase:'performance'});
      context.fillStyle='#224754';context.fillRect(column*288,row*256,288,256);
      context.drawImage(canvas,column*288,row*256,288,256);
    }
    fs.writeFileSync(output,sheet.toBuffer('image/png'));
  }finally{app.dispose();}
}
if(require.main===module)preview(process.argv[2]).catch(e=>{console.error(e);process.exitCode=1;});
module.exports={preview};
