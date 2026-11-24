const {test}=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const {createCanvas,Image,loadImage}=require('@napi-rs/canvas');
const Light=require('../outdoor-light.js'),Pixel=require('../pixel-world.js');
const {boot,seed,read}=require('./game-harness.cjs');
const root=path.join(__dirname,'..');
function fixture(){
 const pending=[];
 class LocalImage extends Image{set src(source){pending.push(new Promise((resolve,reject)=>{const done=this.onload;this.onload=()=>{done?.();resolve();};this.onerror=reject;}));super.src=path.join(root,source);}}
 const context={Image:LocalImage,OffscreenCanvas:function(w,h){return createCanvas(w,h);}};
 for(const name of ['outdoor-light','rural-canals','mountain-region','coast-voyage','offshore-island'])vm.runInNewContext(fs.readFileSync(path.join(root,name+'.js'),'utf8'),context);
 return {context,async settle(){for(let n=0;n!==pending.length;){n=pending.length;await Promise.all(pending);}}};
}
const pixels=c=>c.getContext('2d').getImageData(0,0,c.width,c.height).data;
const mean=p=>{const sums=[0,0,0];for(let i=0;i<p.length;i+=4)for(let k=0;k<3;k++)sums[k]+=p[i+k];return sums.map(v=>v/(p.length/4));};
test('night/dawn match village light and cannot leak Canvas state into another layer',()=>{
 const village=fs.readFileSync(path.join(root,'layered-scenery.js'),'utf8');
 for(const period of ['night','dawn'])assert.ok(village.includes(period+':['+Light.light[period].map(n=>String(n).replace(/^0/,'' )).join(',')+']'),'same village coefficients '+period);
 for(const [minutes,period]of [[70,'night'],[239,'night'],[240,'dawn'],[360,'morning'],[600,'day'],[1020,'evening'],[1140,'night']]){
  const c=createCanvas(4,4),g=c.getContext('2d');g.fillStyle='#c8b496';g.fillRect(0,0,4,4);g.fillStyle='#123456';g.globalCompositeOperation='source-over';
  const env=Pixel.calendar(minutes);assert.equal(env.period,period);Light.paint(g,c,env);
  assert.equal(g.globalCompositeOperation,'source-over');
  if(Light.light[period])for(let k=0;k<3;k++)assert.ok(Math.abs(pixels(c)[k]-[200,180,150][k]*Light.light[period][k])<=1.5);
  // napi's fillStyle getter retains the last assignment after restore, so inspect pixels.
  g.fillRect(0,0,1,1);assert.deepEqual([...pixels(c).subarray(0,4)],[18,52,86,255]);
 }
});
test('every decoded outdoor map darkens uniformly at 01:10, dawn recovers, day repaint has no accumulation; cave unchanged',async()=>{
 const f=fixture(),w=f.context;
 const painters=Object.keys(w.ShuMountain.regions).map(id=>[id,(c,e)=>w.ShuMountain.paint(c,e,id)]).concat([['coast',(c,e)=>w.ShuCoast.paint(c,e)],['offshore',(c,e)=>w.ShuOffshore.paint(c,e)]]);
 for(const [id,paint]of painters){
  const c=createCanvas(480,270);paint(c,Pixel.calendar(720));await f.settle();paint(c,Pixel.calendar(720));const day=pixels(c),d=mean(day);
  paint(c,Pixel.calendar(70));const night=pixels(c),n=mean(night);
  if(id==='cave')assert.deepEqual(night,day);else for(let k=0;k<3;k++)assert.ok(Math.abs(n[k]/d[k]-Light.light.night[k])<.02,`${id} channel ${k}: ${n[k]/d[k]}`);
  paint(c,Pixel.calendar(270));const dawn=mean(pixels(c));if(id!=='cave')assert.ok(dawn[0]>n[0]&&dawn[0]<d[0],id+' dawn');
  paint(c,Pixel.calendar(720));assert.deepEqual(pixels(c),day,id+' no accumulated lighting');
 }
});
test('bridge retouch changes only alpha-marked dirt in its 140x130 bounds, never bridge or rest of map',async()=>{
 const f=fixture(),w=f.context,r=w.ShuRural,repair=r.data.shadowRepair;
 const base=createCanvas(...r.size),after=createCanvas(...r.size),mask=createCanvas(...r.size);
 base.getContext('2d').drawImage(await loadImage(path.join(root,r.asset)),0,0);
 w.ShuMountain.paint(after,{period:'day'},r.id);await f.settle();w.ShuMountain.paint(after,{period:'day'},r.id);
 mask.getContext('2d').drawImage(await loadImage(path.join(root,repair.asset)),...repair.bounds);
 const a=pixels(after),b=pixels(base),m=pixels(mask);let changed=0;
 for(let i=0;i<a.length;i+=4){if(m[i+3]===0)assert.deepEqual(a.subarray(i,i+4),b.subarray(i,i+4),'outside patch pixel '+i/4);else if(a[i]!==b[i]||a[i+1]!==b[i+1]||a[i+2]!==b[i+2])changed++;}
 assert.ok(changed>5000&&changed<18200,'small bounded dirt repair: '+changed);
 // The deck and post polygons finish above/left of the repaired path.
 assert.deepEqual(a.subarray((450*r.size[0]+1120)*4,(450*r.size[0]+1120)*4+4),b.subarray((450*r.size[0]+1120)*4,(450*r.size[0]+1120)*4+4));
});
test('native clock, map-entry action, return and save/reload supply night without changing HUD/cast/control styles',()=>{
 const first=boot({...seed(),gameMinutes:70,mapRegion:'village'}),w=first.window;let saved;
 try{
  const initial=read(w,'({money:s.money,hp:s.hp,caught:s.caught,baits:s.baits})');
  w.eval(`window.__lighting=[];const before=ShuOutdoorLight.paint;ShuOutdoorLight.paint=(ctx,c,e)=>{window.__lighting.push({id:c.id,period:e.period});return before(ctx,c,e)};s.x=ShuRural.villageGate.left+1;s.y=(ShuRural.villageGate.top+ShuRural.villageGate.bottom)/2;render();action()`);
  assert.equal(read(w,'s.mapRegion'),'ruralCanals');assert.ok(read(w,'window.__lighting').some(e=>e.id==='mountainPixels'&&e.period==='night'));
  for(const [minutes,period]of [[170,'dawn'],[120,'morning'],[240,'day'],[420,'evening'],[120,'night']]){
   w.eval(`advanceGameTime(s,${minutes});render()`);assert.equal(read(w,'gameSceneryEnvironment().period'),period);assert.equal(read(w,'window.__lighting.at(-1).period'),period);
  }
  w.eval('save()');saved=JSON.parse(w.localStorage.getItem('nushi-inugoya-v2'));
  assert.deepEqual(read(w,'({money:s.money,hp:s.hp,caught:s.caught,baits:s.baits})'),initial);
  for(const id of ['world','map','action','castBackdrop'])assert.equal(w.document.getElementById(id).style.filter,'');
  assert.deepEqual(first.errors,[]);
 }finally{first.dispose();}
 const restored=boot(saved),v=restored.window;try{assert.equal(read(v,'s.mapRegion'),'ruralCanals');assert.equal(read(v,'gameSceneryEnvironment().period'),'night');v.eval('s.x=ShuRural.returnGate.left+1;s.y=ShuRural.returnGate.top+1;action()');assert.equal(read(v,'s.mapRegion'),'village');assert.equal(read(v,'gameSceneryEnvironment().period'),'night');assert.deepEqual(restored.errors,[]);}finally{restored.dispose();}
});
test('delayed art and repair use the latest period and cannot repaint a departed regional map',()=>{
 const images=[];class DelayedImage{constructor(){this.complete=false;this.naturalWidth=0;images.push(this);}set src(v){this.source=v;}finish(){this.complete=true;this.naturalWidth=1672;this.onload?.();}}
 const calls=[],ctx=new Proxy({},{get:(t,k)=>t[k]||((...a)=>{calls.push([k,...a]);}),set:(t,k,v)=>(t[k]=v,true)}),canvas={width:1672,height:941,dataset:{region:'ruralCanals'},getContext:()=>ctx};
 const sandbox={Image:DelayedImage};for(const name of ['outdoor-light','rural-canals','mountain-region'])vm.runInNewContext(fs.readFileSync(path.join(root,name+'.js'),'utf8'),sandbox);
 sandbox.ShuMountain.paint(canvas,{period:'day'},'ruralCanals');sandbox.ShuMountain.paint(canvas,{period:'night'},'ruralCanals');
 for(const image of images)image.finish();assert.equal(ctx.fillStyle,'rgb(97,125,184)');
 calls.length=0;canvas.dataset.region='stream';for(const image of images)image.finish();assert.equal(calls.length,0,'stale repair does not overwrite destination');
});
