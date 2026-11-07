const {test}=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const {createCanvas,loadImage}=require('@napi-rs/canvas');
const Data=require('../scene-layers.js'),Art=require('../layered-scenery.js');
const root=path.resolve(__dirname,'..'),d=Data.get('world');
const pixels=c=>c.getContext('2d').getImageData(0,0,c.width,c.height).data;
const pointInside=(x,y,poly)=>{let inside=false;for(let i=0,j=poly.length-1;i<poly.length;j=i++){
 const a=poly[i],b=poly[j];if((a[1]>y)!==(b[1]>y)&&x<(b[0]-a[0])*(y-a[1])/(b[1]-a[1])+a[0])inside=!inside;
}return inside;};
async function setup(){const source=await loadImage(path.join(root,d.source)),overlay=await loadImage(path.join(root,d.edits[0].source)),underlay=await loadImage(path.join(root,d.underlay));const before=createCanvas(source.width,source.height);before.getContext('2d').drawImage(source,0,0);const after=Art.assembleSource(source,d,[overlay],createCanvas);return{source,overlay,underlay,before,after};}

test('Sam pilot is original 120×96 binary pixel art with a small deliberate palette',async()=>{
 assert.equal(d.edits.length,1);assert.equal(d.edits[0].id,'sam-sfc-pilot');
 const image=await loadImage(path.join(root,d.edits[0].source));assert.deepEqual([image.width,image.height],[120,96]);
 const c=createCanvas(120,96);c.getContext('2d').drawImage(image,0,0);const p=pixels(c),colors=new Set();
 for(let i=0;i<p.length;i+=4){assert.equal(p[i+3],255);colors.add(p.slice(i,i+3).join(','));}
 assert.ok(colors.size<=30,'not a high-color resample: '+colors.size);
 const author=fs.readFileSync(path.join(root,'tools/draw-sam-pixel-pilot.cjs'),'utf8');
 assert.doesNotMatch(author,/loadImage\(|drawImage\(|filter\s*=|Math\.random/,'authored primitive artwork does not sample or filter the old picture');
 const native=d.edits[0].to.map((v,i)=>v*(i%2?941/864:1672/1536));native.forEach((v,i)=>assert.ok(Math.abs(v-[1240,472,240,192][i])<1e-8));
 assert.ok(Math.abs(native[2]/image.width-2)<1e-8);assert.ok(Math.abs(native[3]/image.height-2)<1e-8);
 assert.ok(fs.statSync(path.join(root,d.edits[0].source)).size<12000,'tiny one-time asset');
});

test('only the explicit stepped Sam contour changes; clipped edges introduce no blended colors',async()=>{
 const{before,after,overlay}=await setup(),a=pixels(before),b=pixels(after),poly=d.edits[0].clip.map(([x,y])=>[x*1672/1536,y*941/864]);
 // Every clip edge is horizontal/vertical and integer aligned, avoiding an AA fringe.
 for(let i=0;i<poly.length;i++){const p=poly[i],q=poly[(i+1)%poly.length];assert.ok(Math.abs(p[0]-Math.round(p[0]))<1e-8&&Math.abs(p[1]-Math.round(p[1]))<1e-8);assert.ok(Math.abs(p[0]-q[0])<1e-8||Math.abs(p[1]-q[1])<1e-8);}
 const tile=createCanvas(120,96);tile.getContext('2d').drawImage(overlay,0,0);const t=pixels(tile);let changed=0,outside=0;
 for(let y=0;y<941;y++)for(let x=0;x<1672;x++){
  const i=(y*1672+x)*4,inside=pointInside(x+.5,y+.5,poly);
  if(!inside){for(let k=0;k<4;k++)assert.equal(b[i+k],a[i+k],'outside '+x+','+y);outside++;}
  else{const j=(Math.floor((y-472)/2)*120+Math.floor((x-1240)/2))*4;for(let k=0;k<4;k++)assert.equal(b[i+k],t[j+k],'exact 2× pixel '+x+','+y);}
  if(a[i]!==b[i]||a[i+1]!==b[i+1]||a[i+2]!==b[i+2])changed++;
 }
 assert.ok(changed>20000&&changed<44000);assert.ok(outside>1530000,'more than 97% of master untouched');
});

test('day, night and rain composition leave every non-pilot pixel unchanged and preserve scene budgets',async()=>{
 const{before,after,underlay}=await setup(),poly=d.edits[0].clip.map(([x,y])=>[x*1672/1536,y*941/864]);
 for(const env of [{season:'spring',period:'day',weather:'sunny'},{season:'summer',period:'night',weather:'sunny'},{season:'autumn',period:'day',weather:'rain'}]){
  const base=Art.prepare(before,underlay,d,env,createCanvas),pilot=Art.prepare(after,underlay,d,env,createCanvas);
  assert.equal(pilot.width,base.width);assert.equal(pilot.height,base.height);
  assert.equal(pilot.parts.length,base.parts.length);assert.equal(pilot.parts.filter(p=>p.motion||p.effect).length,base.parts.filter(p=>p.motion||p.effect).length);
  const ca=createCanvas(1672,941),cb=createCanvas(1672,941);Art.compose(ca,base,{staticOnly:true});Art.compose(cb,pilot,{staticOnly:true});const a=pixels(ca),b=pixels(cb);
  for(let y=0;y<941;y++)for(let x=0;x<1672;x++)if(x<1240||x>=1480||y<472||y>=664||!pointInside(x+.5,y+.5,poly)){const i=(y*1672+x)*4;for(let k=0;k<4;k++)assert.equal(b[i+k],a[i+k]);}
 }
});

// Main-thread and unchanged worker URLs are distinct exact cache keys.
test('cold offline preparation keeps the worker scene-metadata import precached',()=>{
 const worker=fs.readFileSync(path.join(root,'scenery-worker.js'),'utf8'),sw=fs.readFileSync(path.join(root,'sw.js'),'utf8');
 for(const url of [...worker.matchAll(/['"]([^'"]+\.js\?v=[^'"]+)['"]/g)].map(m=>m[1]))assert.ok(sw.includes('"./'+url+'"'),'offline worker import '+url);
 assert.ok(sw.includes('"./scene-layers.js?v=252-5501"'));
 assert.ok(sw.includes('"./assets/sam-sfc-pixel-pilot.png"'));
});
