'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),path=require('node:path');
const {createCanvas,loadImage}=require('@napi-rs/canvas');
const root=path.join(__dirname,'..');
async function pixels(file){const im=await loadImage(path.join(root,file)),c=createCanvas(im.width,im.height);c.getContext('2d').drawImage(im,0,0);return {width:im.width,height:im.height,data:c.getContext('2d').getImageData(0,0,im.width,im.height).data};}
test('fish-market sign changes only the approved 43 x 15 source-pixel interior; terrain remains exact',async()=>{
 const old=await pixels('assets/village-reference-pilot.png'),next=await pixels('assets/village-fishmarket-sign-v252-68.png');
 assert.equal(next.width,1672);assert.equal(next.height,941);let changed=0;
 for(let y=0;y<941;y++)for(let x=0;x<1672;x++){const i=(y*1672+x)*4;for(let k=0;k<4;k++)if(old.data[i+k]!==next.data[i+k]){assert.ok(x>=1025&&x<1068&&y>=597&&y<612,`changed outside sign at ${x},${y}`);changed++;break;}}
 assert.ok(changed>0);assert.ok(changed<=645);
});
