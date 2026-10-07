const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const {createCanvas}=require('@napi-rs/canvas');
const {renderer}=require('./coastal-render-harness.cjs');

test('the round tub retains detailed seated heroes, complete paddle tips and transparent gutters in all sixteen poses',async()=>{
  const coast=await renderer(),signatures=new Set();
  for(const avatar of ['boy','girl'])for(const direction of ['up','right','down','left'])for(const frame of [0,1]){
    const canvas=createCanvas(192,144);coast.paintBoat(canvas,'tarai',direction,frame,avatar,Boolean(frame));
    const data=canvas.getContext('2d').getImageData(0,0,192,144).data,colors=new Set();let painted=0;
    for(let y=0;y<144;y++)for(let x=0;x<192;x++){
      const i=(y*192+x)*4,alpha=data[i+3];
      if(alpha>100){painted++;colors.add(`${data[i]},${data[i+1]},${data[i+2]}`);}
      if(x===0||x===191||y===0||y===143)assert.ok(alpha<20,`${avatar}/${direction}/${frame}: a cap or paddle touches the canvas edge`);
    }
    assert.ok(painted>6500,`${avatar}/${direction}/${frame}: a complete seated hero and wooden tub`);
    assert.ok(colors.size>500,`${avatar}/${direction}/${frame}: must not regress to the coarse placeholder`);
    signatures.add(canvas.toBuffer('image/png').toString('base64'));
  }
  assert.equal(signatures.size,16,'both heroes have four headings and a separate stroke');
});

test('changing boat and hero before image decoding keeps the latest pose when either boat atlas finishes',()=>{
  const images=[];
  class DelayedImage{
    constructor(){images.push(this);this.complete=false;this.naturalWidth=0;}
    set src(url){this.url=url;}
    finish(){this.complete=true;this.naturalWidth=1254;this.onload();}
  }
  const context={Image:DelayedImage};
  vm.runInNewContext(fs.readFileSync(path.join(__dirname,'../coast-voyage.js'),'utf8'),context);
  const calls=[],ctx=new Proxy({drawImage(...args){calls.push(args)}},{get:(o,k)=>k in o?o[k]:()=>{}});
  const canvas={width:192,height:144,getContext:()=>ctx},coast=context.ShuCoast;
  coast.paintBoat(canvas,'canoe','up',0,'boy',false);
  coast.paintBoat(canvas,'tarai','left',1,'girl',true);
  const tub=images.find(i=>i.url.includes('coast-tarai-v224')),boat=images.find(i=>i.url.includes('coast-rowboat-v225'));
  tub.finish();const latest=calls.at(-1);
  assert.equal(latest[0],tub);assert.equal(latest[1],934);assert.equal(latest[2],944);
  boat.finish();assert.deepEqual(calls.at(-1),latest,'late rowboat must not restore the old boy/up selection');
  coast.paintBoat(canvas,'canoe','right',0,'boy',false);
  tub.finish();assert.equal(calls.at(-1)[0],boat,'late tub must not replace the equipped rowboat');
});

test('the detailed tub is supplied by the released renderer and its offline cache',()=>{
  const root=path.join(__dirname,'..'),sw=fs.readFileSync(path.join(root,'sw.js'),'utf8');
  assert.ok(sw.includes('./assets/coast-tarai-v224.png'));
  assert.ok(sw.includes('./coast-voyage.js?v=225-1'));
  assert.ok(fs.existsSync(path.join(root,'assets/coast-tarai-v224.png')));
});
