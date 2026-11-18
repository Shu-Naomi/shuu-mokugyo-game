'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),path=require('node:path'),fs=require('node:fs');
const {createCanvas,loadImage}=require('@napi-rs/canvas');
const root=path.join(__dirname,'..');
async function pixels(file){const im=await loadImage(path.join(root,'assets',file)),c=createCanvas(im.width,im.height);c.getContext('2d').drawImage(im,0,0);return {width:im.width,height:im.height,data:c.getContext('2d').getImageData(0,0,im.width,im.height).data};}
test('shared SAM sign changes only its interior; all other buildings and alpha stay exact',async()=>{
const old=await pixels('settlement-buildings-v238.png'),next=await pixels('settlement-buildings-sam-signs.png');
assert.equal(next.width,old.width);assert.equal(next.height,old.height);let changes=0;
for(let y=0;y<old.height;y++)for(let x=0;x<old.width;x++){
const i=(y*old.width+x)*4;assert.equal(old.data[i+3],next.data[i+3],`alpha at ${x},${y}`);
if(![0,1,2].some(k=>old.data[i+k]!==next.data[i+k]))continue;
assert.ok(x>=1240&&x<1368&&y>=117&&y<171,`outside sign: ${x},${y}`);changes++;
}assert.ok(changes>6000);
});
test('both distant SAM shops use the shared sprite; houses are not relabeled',()=>{
const life=require('../world-life.js'),shops=life.buildings.filter(b=>b.kind==='shop');
assert.deepEqual(shops.map(b=>[b.id,b.sprite]),[['stream-shop',1],['wetland-shop',1]]);
assert.ok(life.buildings.filter(b=>b.kind==='house').every(b=>b.sprite!==1));
assert.ok(fs.readFileSync(path.join(root,'world-life.js'),'utf8').includes("name==='settlement-buildings'?'assets/settlement-buildings-sam-signs.png'"));
});
