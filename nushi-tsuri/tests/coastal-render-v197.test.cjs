const { test }=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const {createCanvas}=require('@napi-rs/canvas');
const {renderer,viewport}=require('./coastal-render-harness.cjs');

test('decoded canoe sprites render all headings without clipped paddle tips or neighbour sprites',async()=>{
  const coast=await renderer();
  const signatures=new Set();
  for(const avatar of ['boy','girl'])for(const direction of ['up','right','down','left']) {
    const resting=createCanvas(192,144),stroke=createCanvas(192,144);
    coast.paintBoat(resting,'canoe',direction,0,avatar,false);
    coast.paintBoat(stroke,'canoe',direction,1,avatar,true);
    const data=resting.getContext('2d').getImageData(0,0,192,144).data;
    let occupied=0;
    for(let y=0;y<144;y++)for(let x=0;x<192;x++) {
      const alpha=data[(y*192+x)*4+3];
      if(alpha>100)occupied++;
      if(x===0||x===191||y===0||y===143)assert.ok(alpha<20,`${avatar}/${direction}: clipped at ${x},${y}`);
    }
    assert.ok(occupied>3500,`${avatar}/${direction}: empty or incomplete sprite`);
    const a=resting.toBuffer('image/png'),b=stroke.toBuffer('image/png');
    assert.notDeepEqual(a,b,`${avatar}/${direction}: paddle stroke must be visible`);
    signatures.add(a.toString('base64'));
  }
  assert.equal(signatures.size,8,'each avatar and view has separate, unflipped art');
});

test('finished coast painting and night tint render at the actual camera scale',async()=>{
  const coast=await renderer();
  const day=viewport(coast),night=viewport(coast,{period:'night'});
  const a=day.getContext('2d').getImageData(0,0,1536,630).data;
  const b=night.getContext('2d').getImageData(0,0,1536,630).data;
  let lightDay=0,lightNight=0;const colors=new Set();
  for(let i=0;i<a.length;i+=4*17) {
    assert.equal(a[i+3],255);
    colors.add(`${a[i]},${a[i+1]},${a[i+2]}`);
    lightDay+=a[i]+a[i+1]+a[i+2];lightNight+=b[i]+b[i+1]+b[i+2];
  }
  assert.ok(colors.size>1000,'finished scene, not fallback blocks');
  assert.ok(lightNight<lightDay*.8 && lightNight>lightDay*.4,'night remains dark but readable');
});

test('late image loads repaint the latest heading, avatar and environment without blocking startup',()=>{
  const images=[];
  class DelayedImage {
    constructor(){images.push(this);this.complete=false;this.naturalWidth=0;}
    set src(src){this.url=src;}
    finish(){this.complete=true;this.naturalWidth=1254;this.onload();}
  }
  const context={Image:DelayedImage};
  vm.runInNewContext(fs.readFileSync(path.join(__dirname,'../coast-voyage.js'),'utf8'),context);
  const coast=context.ShuCoast,calls=[],tints=[];
  const ctx=new Proxy({drawImage(...args){calls.push(args)},fillRect(){tints.push(this.fillStyle)}},{get:(obj,key)=>key in obj?obj[key]:()=>{}});
  const canvas={width:192,height:144,getContext:()=>ctx};
  coast.paintBoat(canvas,'canoe','up',0,'boy');
  coast.paintBoat(canvas,'canoe','left',1,'girl',true);
  coast.paint(canvas,{period:'day'});coast.paint(canvas,{period:'night'});
  const atlas=images.find(i=>i.url.includes('coast-rowboat-v201'));
  atlas.finish();
  assert.equal(calls.at(-1)[1],940.5,'load must not restore the obsolete upward view');
  assert.equal(calls.at(-1)[2],914,'load must keep the selected girl stroke');
  assert.equal(calls.at(-1)[0],atlas,'latest pose is taken from the two-oar atlas');
  images.find(i=>i.url.includes('coast-world')).finish();
  assert.equal(tints.at(-1),'rgba(9,20,48,.49)','late map load keeps the latest night palette');
});
