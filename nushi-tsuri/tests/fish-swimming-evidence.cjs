// Real decoded artwork, deterministic before/after temporal evidence. No saves or network writes.
const fs=require('node:fs'),path=require('node:path'),{execFileSync}=require('node:child_process'),Module=require('node:module');
const {createCanvas,loadImage}=require('@napi-rs/canvas'),A=require('../fish-art.js'),M=require('../fish-motion.js'),L=require('../aquarium-life.js');
const root=path.resolve(__dirname,'..'),directory=path.resolve(process.env.FISH_SWIM_EVIDENCE_DIR||path.join(__dirname,'fish-swimming-evidence'));
const baselineRef=process.env.FISH_SWIM_BASE_REF||'a67f76b6e7072478a098d25ba3200fff9b39f4d4';
const source=execFileSync('git',['show',baselineRef+':nushi-tsuri/fish-art.js'],{cwd:root,encoding:'utf8'});
const beforeModule=new Module(path.join(root,'fish-art-baseline.cjs'));beforeModule.paths=module.paths;beforeModule._compile(source,path.join(root,'fish-art-baseline.cjs'));
const Before=beforeModule.exports;
const ids=['unagi','utsubo','dojoAlbino','moroko','buri','kawahagi','namazu','medakaGold','hirame'];
const baseId=id=>id==='dojoAlbino'?'dojo':id==='medakaGold'?'medaka':id;
const all={...A.species,...A.aquarium},smooth=t=>t*t*(3-2*t);
function pose(seconds){const t=seconds%8;return t<2?{heading:0,turn:false}:t<4?{heading:6*smooth((t-2)/2),turn:true}:t<6?{heading:6,turn:false}:{heading:6*(1-smooth((t-6)/2)),turn:true};}
(async()=>{
 fs.mkdirSync(directory,{recursive:true});const frames=path.join(directory,'frames');fs.mkdirSync(frames,{recursive:true});
 const images=new Map();for(const id of ids)images.set(id,await loadImage(path.join(root,all[id].asset)));
 const cells=ids.map(()=>[createCanvas(448,224),createCanvas(448,224)]),sheet=createCanvas(1440,900),ctx=sheet.getContext('2d');
 const stats=[];const rgbaCopies=[0,0],readbacks=[0,0];
 for(let row=0;row<ids.length;row++)for(let side=0;side<2;side++){
  const c=cells[row][side].getContext('2d'),create=c.createImageData.bind(c),read=c.getImageData.bind(c);
  c.createImageData=(...a)=>{rgbaCopies[side]++;return create(...a);};c.getImageData=(...a)=>{readbacks[side]++;return read(...a);};
 }
 for(let frame=0;frame<240;frame++){
  const seconds=frame/30,p=pose(seconds),sample=[];ctx.fillStyle='#173f50';ctx.fillRect(0,0,1440,900);
  ctx.font='16px sans-serif';ctx.fillStyle='#eaf2eb';
  for(let i=0;i<ids.length;i++){
   const id=ids[i],b=baseId(id),g=L.gait(b),phase=M.phase(b,seconds,g.speed,['unagi','utsubo','dojo','namazu','hirame'].includes(b));
   const x=i%3*480,y=Math.floor(i/3)*300;ctx.fillText(id+' / '+M.profile(id).family,x+12,y+24);
   ctx.fillText('Before',x+12,y+52);ctx.fillText('After',x+252,y+52);
   for(let side=0;side<2;side++){
    const art=side?A:Before,c=cells[i][side],q=c.getContext('2d'),image=images.get(id);
    const swim=side?phase:Math.floor(seconds*g.speed/(['unagi','utsubo','dojo','namazu','hirame'].includes(b)?.24:.18));
    const start=performance.now();art.draw(q,image,id,p.turn?7:8,p.turn?p.heading:swim,()=>image,{swimFrame:swim});sample.push({side,ms:performance.now()-start});
    // Materialize each frame before compositing. This also catches a native
    // Canvas implementation's deferred putImageData/texture upload behavior.
    const snapshot=await loadImage(c.toBuffer('image/png'));
    ctx.save();ctx.translate(x+side*240,y+65);if(!p.turn&&p.heading===6){ctx.translate(240,0);ctx.scale(-1,1);}ctx.drawImage(snapshot,0,0,240,120);ctx.restore();
   }
   ctx.fillText('t='+seconds.toFixed(2)+'  yaw='+p.heading.toFixed(2),x+12,y+220);
   ctx.fillText('continuous phase '+phase.toFixed(2),x+12,y+248);
  }
  stats.push(...sample);fs.writeFileSync(path.join(frames,String(frame).padStart(4,'0')+'.png'),sheet.toBuffer('image/png'));
  if([0,59,75,90,105,119,120,179,210,239].includes(frame))fs.writeFileSync(path.join(directory,'sample-'+String(frame).padStart(4,'0')+'.png'),sheet.toBuffer('image/png'));
 }
 const summarize=side=>{const s=stats.filter(n=>n.side===side).map(n=>n.ms).sort((a,b)=>a-b);return {renders:s.length,medianMs:s[Math.floor(s.length*.5)],p95Ms:s[Math.floor(s.length*.95)],totalMs:s.reduce((a,b)=>a+b,0),destinationImageDataAllocations:rgbaCopies[side],destinationReadbacks:readbacks[side]};};
 const report={baseline:baselineRef,harness:'Node native Canvas, same decoded source images and deterministic 8-second nine-fish before/after sequence at 30 samples/sec; not device thermal measurements',before:summarize(0),after:summarize(1),cache:A.metrics()};
 fs.writeFileSync(path.join(directory,'raster-measurements.json'),JSON.stringify(report,null,2));console.log(JSON.stringify(report));
})().catch(e=>{console.error(e);process.exitCode=1;});
