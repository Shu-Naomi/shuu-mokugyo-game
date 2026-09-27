// Render the shipped coastal painter with decoded assets, rather than Canvas mocks.
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { Image, createCanvas } = require('@napi-rs/canvas');
const root = path.join(__dirname, '..');

async function renderer() {
  const pending = [];
  class LocalImage extends Image {
    set src(source) {
      pending.push(new Promise((resolve, reject) => {
        const paint = this.onload;
        this.onload = () => { paint?.(); resolve(); };
        this.onerror = reject;
      }));
      super.src = path.join(root, source);
    }
  }
  const context = { Image: LocalImage };
  vm.runInNewContext(fs.readFileSync(path.join(root, 'coast-voyage.js'), 'utf8'), context);
  await Promise.all(pending);
  return context.ShuCoast;
}

function viewport(coast, { x=193, y=77, direction='up', avatar='boy', frame=0, rowing=false,
  period='day', width=1536, height=630 }={}) {
  const map=createCanvas(1536,864),boat=createCanvas(192,144);
  coast.paint(map,{period});
  coast.paintBoat(boat,'canoe',direction,frame,avatar,rowing);
  const canvas=createCanvas(width,height),ctx=canvas.getContext('2d');
  const mapWidth=width*2.4,mapHeight=mapWidth*9/16;
  const cameraX=Math.max(0,Math.min(240-240*width/mapWidth,x-240*width/mapWidth/2));
  const cameraY=Math.max(0,Math.min(135-135*height/mapHeight,y-135*height/mapHeight/2));
  ctx.imageSmoothingEnabled=false;
  ctx.drawImage(map,-cameraX/240*mapWidth,-cameraY/135*mapHeight,mapWidth,mapHeight);
  const bw=mapWidth*.065,bh=mapHeight*.09;
  ctx.drawImage(boat,(x-cameraX)/240*mapWidth-bw/2,(y-cameraY)/135*mapHeight-bh*.55,bw,bh);
  return canvas;
}

module.exports={renderer,viewport};

if(require.main===module) {
  renderer().then(coast=>{
    const output=process.argv[2];
    if(!output)throw new Error('Pass an output directory for the visual review');
    fs.mkdirSync(output,{recursive:true});
    for(const [name,options] of Object.entries({
      coast:{},
      reef:{x:104,y:100,direction:'left',avatar:'girl'},
      night:{x:170,y:111,direction:'right',period:'night'},
    }))fs.writeFileSync(path.join(output,`${name}.png`),viewport(coast,options).toBuffer('image/png'));
    const sheet=createCanvas(768,288),ctx=sheet.getContext('2d');
    ctx.fillStyle='#145875';ctx.fillRect(0,0,768,288);
    for(const [row,avatar] of ['boy','girl'].entries())for(const [col,direction] of ['up','right','down','left'].entries()) {
      const boat=createCanvas(192,144);coast.paintBoat(boat,'canoe',direction,0,avatar);
      ctx.drawImage(boat,col*192,row*144);
    }
    fs.writeFileSync(path.join(output,'headings.png'),sheet.toBuffer('image/png'));
    console.log(`Rendered coastal review to ${output}`);
  }).catch(error=>{console.error(error);process.exitCode=1;});
}
