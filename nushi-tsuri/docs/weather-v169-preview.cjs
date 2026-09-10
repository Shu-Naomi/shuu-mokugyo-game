// Generate a comparison using the actual game compositor, without alternate art.
const fs=require('node:fs'),path=require('node:path');
const {createCanvas,loadImage}=require('@napi-rs/canvas');
const Art=require('../layered-scenery.js'),Data=require('../scene-layers.js'),Cast=require('../pixel-cast.js');
(async()=>{
  const base=path.join(__dirname,'..'),env={season:'summer',period:'day'};
  const definition=Data.get('surface-lake',env),source=await loadImage(path.join(base,definition.source));
  const sprite=await loadImage(path.join(base,Cast.artwork.boy.src));
  const panelWidth=600,panelHeight=338,output=createCanvas(panelWidth*3,panelHeight+42),ctx=output.getContext('2d');
  ctx.fillStyle='#172434';ctx.fillRect(0,0,output.width,output.height);
  for(const [index,weather] of ['sunny','cloudy','rain'].entries()){
    const e={...env,weather},scene=Art.prepare(source,null,definition,e,createCanvas);
    const canvas=createCanvas(scene.width,scene.height),overlay=createCanvas(scene.width,scene.height),actor=createCanvas(1280,720);
    Art.compose(canvas,scene,{staticOnly:true});Art.motion(overlay,scene,1750);canvas.getContext('2d').drawImage(overlay,0,0);
    Cast.draw(actor,{avatar:'boy',sprite,progress:0,flying:false,env:e});
    canvas.getContext('2d').drawImage(actor,0,0,canvas.width,canvas.height);
    ctx.imageSmoothingEnabled=true;ctx.drawImage(canvas,index*panelWidth,42,panelWidth,panelHeight);
    ctx.fillStyle='#f2e4bc';ctx.font='bold 18px sans-serif';ctx.fillText(['SUNNY','CLOUDY','LIGHT RAIN'][index],index*panelWidth+20,28);
    if(weather==='rain'&&process.argv[2]){
      fs.mkdirSync(process.argv[2],{recursive:true});
      for(let frame=0;frame<30;frame++){
        Art.compose(canvas,scene,{staticOnly:true});Art.motion(overlay,scene,frame*100+1000);canvas.getContext('2d').drawImage(overlay,0,0);
        canvas.getContext('2d').drawImage(actor,0,0,canvas.width,canvas.height);
        const small=createCanvas(800,450);small.getContext('2d').drawImage(canvas,0,0,800,450);
        fs.writeFileSync(path.join(process.argv[2],`rain-${String(frame).padStart(2,'0')}.png`),small.toBuffer('image/png'));
      }
    }
  }
  fs.writeFileSync(path.join(__dirname,'weather-v169-preview.png'),output.toBuffer('image/png'));
  console.log('Wrote weather comparison'+(process.argv[2]?' and 30 animation frames':''));
})();
