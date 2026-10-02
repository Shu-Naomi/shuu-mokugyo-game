const {test}=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const {createCanvas,loadImage,Image}=require('@napi-rs/canvas');
const {boot,seed,read}=require('./game-harness.cjs');
const R=require('../regional-nushi.js'),M=require('../mountain-region.js');
test('real production boss painters isolate all swim, turn and jaw frames and correctly animate catch cards',async()=>{
  const app=boot(),w=app.window,backing=new WeakMap(),old=w.HTMLCanvasElement.prototype.getContext;
  w.HTMLCanvasElement.prototype.getContext=function(...args){
    if(!this.classList.contains('fish-frame-canvas'))return old.apply(this,args);
    let native=backing.get(this);if(!native){native=createCanvas(this.width,this.height);backing.set(this,native);}
    if(native.width!==this.width)native.width=this.width;if(native.height!==this.height)native.height=this.height;
    return native.getContext('2d');
  };
  try{
    for(const [id,data]of Object.entries(R.bosses)){
      const asset=read(w,`fishAssets.${id}`);
      w.decodedFish=await loadImage(path.join(__dirname,'..',asset));
      w.eval(`fishAtlasImageCache.set('${asset}',window.decodedFish)`);
      for(const [cells,count]of [[8,8],[7,7],[3,3]])for(let frame=0;frame<count;frame++){
        w.eval(`drawFishAtlasFrame($('#catchFish'),fishAssets.${id},${cells},${frame},'${id}')`);
        const canvas=w.document.querySelector('#catchFish canvas'),native=backing.get(canvas);
        assert.equal(canvas.width,448);assert.equal(canvas.height,224);
        const pixels=native.getContext('2d').getImageData(0,0,448,224).data;let opaque=0,border=0;
        for(let i=3;i<pixels.length;i+=4)if(pixels[i]>100){opaque++;const n=(i-3)/4,x=n%448,y=Math.floor(n/448);if(x===0||x===447||y===0||y===223)border++;}
        assert.ok(opaque>(cells===7?3500:10000),`${id}/${cells}/${frame} must paint a complete fish`);
        assert.equal(border,0,`${id}/${cells}/${frame} clips fins or contains a neighbour`);
      }
      w.eval(`renderCatchFishLife(fish.find(f=>f.id==='${id}'),5)`);
      assert.equal(w.document.querySelector('#catchFish canvas').width,448);
    }assert.deepEqual(app.errors,[]);
  }finally{app.dispose();}
});
test('decoded mountain backgrounds are opaque and detailed; underground navigation stays equally bright at night',async()=>{
  const pending=[];
  class LocalImage extends Image{set src(source){pending.push(new Promise((resolve,reject)=>{
    const paint=this.onload;this.onload=()=>{paint?.();resolve();};this.onerror=reject;
  }));super.src=path.join(__dirname,'..',source);}}
  const context={Image:LocalImage};vm.runInNewContext(fs.readFileSync(path.join(__dirname,'../mountain-region.js'),'utf8'),context);
  for(const region of ['mountainPond','mountainMarsh','cave']){
    const canvas=createCanvas(960,540);context.ShuMountain.paint(canvas,{period:'day'},region);await Promise.all(pending);
    const pixels=canvas.getContext('2d').getImageData(0,0,960,540).data,colors=new Set();
    for(let i=0;i<pixels.length;i+=4*29){assert.equal(pixels[i+3],255);colors.add(`${pixels[i]},${pixels[i+1]},${pixels[i+2]}`);}
    assert.ok(colors.size>1000,region);
    if(region==='cave'){context.ShuMountain.paint(canvas,{period:'night'},region);assert.deepEqual(canvas.getContext('2d').getImageData(0,0,960,540).data,pixels);}
  }
  const sw=fs.readFileSync(path.join(__dirname,'../sw.js'),'utf8');
  for(const region of Object.values(M.regions))assert.ok(sw.includes(region.asset));
  for(const data of Object.values(R.bosses))assert.ok(sw.includes(data.asset));
});
test('mountain gates redraw immediately even when time and weather have not changed',()=>{
  const app=boot({...seed(),mapRegion:'stream',x:73,y:8}),w=app.window;
  try{
    const first=read(w,'pixelSceneCache.get($("#mountainPixels"))');w.action();
    const pond=read(w,'pixelSceneCache.get($("#mountainPixels"))');assert.notEqual(pond,first);assert.ok(pond.startsWith('mountainPond:'));
    w.eval('s.x=224;s.y=8;action()');const marsh=read(w,'pixelSceneCache.get($("#mountainPixels"))');
    assert.notEqual(marsh,pond);assert.ok(marsh.startsWith('mountainMarsh:'));assert.deepEqual(app.errors,[]);
  }finally{app.dispose();}
});
