// Runs the production fish painter with decoded WebP pixels, without a browser save.
const fs = require('node:fs');
const path = require('node:path');
const {createCanvas, loadImage} = require('@napi-rs/canvas');
const {boot, read} = require('./game-harness.cjs');
const ids = ['shirogisu', 'ainame', 'madai'];

async function renderer() {
  const app = boot(), w = app.window, backing = new WeakMap();
  const oldContext = w.HTMLCanvasElement.prototype.getContext;
  w.HTMLCanvasElement.prototype.getContext = function(...args) {
    if (!this.classList.contains('fish-frame-canvas')) return oldContext.apply(this,args);
    let native = backing.get(this);
    if (!native) { native = createCanvas(this.width,this.height); backing.set(this,native); }
    if (native.width !== this.width) native.width = this.width;
    if (native.height !== this.height) native.height = this.height;
    return native.getContext('2d');
  };
  for (const id of ids) {
    const asset = read(w,`fishAssets.${id}`);
    w.decodedFish = await loadImage(path.join(__dirname,'..',asset));
    w.eval(`fishAtlasImageCache.set(${JSON.stringify(asset)}, window.decodedFish)`);
  }
  delete w.decodedFish;
  const element = w.document.querySelector('#catchFish');
  function draw(id,cells=8,frame=0) {
    w.eval(`drawFishAtlasFrame($('#catchFish'),fishAssets[${JSON.stringify(id)}],${cells},${frame},${JSON.stringify(id)})`);
    return backing.get(element.querySelector('canvas'));
  }
  return {...app,draw};
}

async function preview(directory) {
  const app = await renderer();
  try {
    fs.mkdirSync(directory,{recursive:true});
    const c = createCanvas(1200,520),ctx=c.getContext('2d');
    ctx.fillStyle='#143c50';ctx.fillRect(0,0,c.width,c.height);
    ctx.font='18px sans-serif';ctx.fillStyle='#e7dec2';
    ctx.fillText('v198 / Production sprites: swim, turn, feed',24,28);
    for (let row=0;row<ids.length;row++) {
      ctx.fillStyle='#e7dec2';ctx.fillText(ids[row],24,66+row*150);
      for (const [col,[cells,frame]] of [[8,0],[8,5],[5,2],[3,2]].entries()) {
        ctx.drawImage(app.draw(ids[row],cells,frame),18+col*298,65+row*150,282,141);
      }
    }
    fs.writeFileSync(path.join(directory,'fish-v198.png'),c.toBuffer('image/png'));
    // Individual source-cell previews also reveal any clipped fins or neighbours.
    for(const id of ids) {
      const sheet=createCanvas(1024,512),x=sheet.getContext('2d');
      x.fillStyle='#205a71';x.fillRect(0,0,1024,512);
      let index=0;
      for(const cells of [8,5,3])for(let frame=0;frame<cells;frame++,index++)
        x.drawImage(app.draw(id,cells,frame),index%4*256,Math.floor(index/4)*128,256,128);
      fs.writeFileSync(path.join(directory,`${id}.png`),sheet.toBuffer('image/png'));
    }
  } finally {app.dispose();}
}
if(require.main===module) preview(process.argv[2]||'/tmp/coastal-fish-v198').catch(e=>{console.error(e);process.exitCode=1;});
module.exports={renderer,ids};
