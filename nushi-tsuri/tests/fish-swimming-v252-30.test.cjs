const {test}=require('node:test'),assert=require('node:assert/strict'),path=require('node:path');
const {createCanvas,loadImage}=require('@napi-rs/canvas');
const A=require('../fish-art.js'),M=require('../fish-motion.js'),L=require('../aquarium-life.js');
const all={...A.species,...A.aquarium};
function shape(ctx){
 const px=ctx.getImageData(0,0,448,224).data;let count=0,left=448,right=0,edge=0;
 for(let n=0;n<448*224;n++)if(px[n*4+3]>100){const x=n%448,y=Math.floor(n/448);count++;left=Math.min(left,x);right=Math.max(right,x);if(x<2||x>445||y<2||y>221)edge++;}
 return {count,width:right-left+1,edge,bytes:Buffer.from(px)};
}
test('all sixty species and twelve variants use explicit cosmetic profiles; variant aliases preserve the parent style',()=>{
 assert.equal(Object.keys(A.species).length,60);assert.equal(Object.keys(A.aquarium).length,12);
 for(const id of Object.keys(A.species))assert.ok(M.profiles[id],id);
 for(const id of Object.keys(all))for(const key of ['amplitude','shoulder','falloff','wave','fin','pulse'])assert.ok(Number.isFinite(M.profile(id)[key]),id+' '+key);
 for(const [variant,id]of [['dojoAlbino','dojo'],['unagiAlbino','unagi'],['medakaGold','medaka'],['buriMojako','buri'],['tanagoGold','tanago']])assert.equal(M.profile(variant),M.profile(id));
 assert.equal(new Set(['unagi','buri','kawahagi','hirame','kasago','koi'].map(id=>M.profile(id).family)).size,6);
 assert.notDeepEqual(M.profile('unagi'),M.profile('utsubo'));assert.notDeepEqual(M.profile('buri'),M.profile('hiramasa'));
});
test('continuous individual swimming has equal elapsed poses at 10, 20, 30, 60 and 120Hz without integer or wrap pauses',()=>{
 for(const id of Object.keys(A.species)){
  const p=L.inspection(id,.051),q=L.inspection(id,.052);assert.notEqual(p.swimFrame,q.swimFrame,id+' phase advances between integer frames');
  for(const hz of [10,20,30,60,120]){
   const samples=Array.from({length:hz*4+1},(_,i)=>L.inspection(id,i/hz));
   assert.deepEqual(samples.at(-1),L.inspection(id,4),id+' '+hz+'Hz is elapsed-time based');
   for(let n=1;n<samples.length;n++)assert.ok(samples[n].swimFrame>samples[n-1].swimFrame,id+' tail does not reverse its phase');
  }
  assert.equal(L.inspection(id,4,true).swimFrame,0);
 }
 const fish=Array.from({length:6},(_,i)=>({uid:'fish'+i,species:'moroko',length:2000}));
 const poses=L.layout(fish,[{id:'moroko',max:3000}],720,350,1,()=>2).poses;
 assert.equal(new Set(poses.map(p=>p.swimFrame)).size,6,'individuals do not beat in lockstep');
});
test('all originals keep body volume, pixel count, fixed lips and original width throughout swimming and turns',async()=>{
 const images=new Map(),ctx=createCanvas(448,224).getContext('2d');
 for(const [id,spec]of Object.entries(all)){
  if(!images.has(spec.asset))images.set(spec.asset,await loadImage(path.join(__dirname,'..',spec.asset)));
  const image=images.get(spec.asset),resolve=()=>image;
  for(const heading of [0,.125,1.25,2.5,3,3.5,4.75,5.875,6]){
   let first,lip;const target=A.pose(id,7,heading).target,x=Math.round(target[0]*448)-10,y=Math.round(target[1]*224)-10;
   for(const phase of [0,.1,2,4,6,7.9,8]){
    assert.equal(A.draw(ctx,image,id,7,heading,resolve,{swimFrame:phase}),true);
    const s=shape(ctx),head=Buffer.from(ctx.getImageData(x,y,21,21).data);
    assert.ok(s.count>3500,id+'/'+heading+' complete');assert.equal(s.edge,0,id+'/'+heading+' unclipped');
    if(!first){first=s;lip=head;}else{
     assert.equal(s.count,first.count,id+'/'+heading+' volume never vanishes');assert.equal(s.width,first.width,id+'/'+heading+' no squeeze');
     assert.deepEqual(head,lip,id+'/'+heading+' lip and hook stable');
    }
    if(phase===8)assert.deepEqual(s.bytes,first.bytes,id+'/'+heading+' wraps without resetting shape');
   }
  }
 }
});
test('swim phase remains visible during a fixed turn; cached bases and output buffers do not multiply with phases',async()=>{
 const ctx=createCanvas(448,224).getContext('2d');
 for(const id of ['tanago','moroko','unagi','utsubo','buri','hirame']){
  const image=await loadImage(path.join(__dirname,'..',all[id].asset));
  A.draw(ctx,image,id,7,1.25,()=>image,{swimFrame:1});const first=shape(ctx).bytes,start=A.metrics();
  A.draw(ctx,image,id,7,1.25,()=>image,{swimFrame:5});assert.notDeepEqual(shape(ctx).bytes,first,id+' continues swimming through its turn');
  for(let n=0;n<100;n++)A.draw(ctx,image,id,7,1.25,()=>image,{swimFrame:n/13});
  const end=A.metrics();assert.equal(end.builds,start.builds,id+' phase-independent base');assert.equal(end.outputs,start.outputs,id+' reused output');
  for(let n=0;n<97;n++)A.draw(ctx,image,id,7,n/16,()=>image,{swimFrame:2});
  assert.ok(A.metrics().cachedRasters<=48);assert.ok(A.metrics().reuses>0,'eviction reuses base pixel buffers');
 }
});
test('side swimming and turn endpoints share identical pixels, including the mirrored leftward original',async()=>{
 const ctx=createCanvas(448,224).getContext('2d'),mirror=createCanvas(448,224),m=mirror.getContext('2d');
 for(const [id,spec]of Object.entries(all)){
  const image=await loadImage(path.join(__dirname,'..',spec.asset));
  for(const phase of [0,1.25,5.5]){
   A.draw(ctx,image,id,8,phase,()=>image,{swimFrame:phase});const right=shape(ctx).bytes;
   // Construct a pixel-exact reflection without adding Canvas resampling.
   const flipped=ctx.createImageData(448,224);for(let y=0;y<224;y++)for(let x=0;x<448;x++)for(let c=0;c<4;c++)flipped.data[(y*448+x)*4+c]=right[(y*448+447-x)*4+c];
   m.putImageData(flipped,0,0);
   A.draw(ctx,image,id,7,0,()=>image,{swimFrame:phase});assert.deepEqual(shape(ctx).bytes,right,id+' right endpoint');
   A.draw(ctx,image,id,7,6,()=>image,{swimFrame:phase});
   const left=shape(ctx).bytes;let changed=0;for(let n=0;n<left.length;n+=4)if(left[n]!==flipped.data[n]||left[n+1]!==flipped.data[n+1]||left[n+2]!==flipped.data[n+2]||left[n+3]!==flipped.data[n+3])changed++;
   assert.equal(changed,0,id+' mirrored left endpoint has no seam');
  }
 }
});
