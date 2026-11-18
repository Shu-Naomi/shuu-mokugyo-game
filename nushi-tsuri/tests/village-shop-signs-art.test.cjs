'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),path=require('node:path');
const {createCanvas,loadImage}=require('@napi-rs/canvas');
const root=path.join(__dirname,'..');
const interiors=[['race',205,304,76,18],['inn',309,146,13,18],['pet',1323,126,21,20],['tcg',1493,120,34,18],['greengrocer',490,409,37,20],['diner',929,398,48,19],['sam',1287,503,58,17],['fishmarket',1025,597,43,15],['harbor',886,720,27,19]];
async function pixels(file){const im=await loadImage(path.join(root,'assets',file)),c=createCanvas(im.width,im.height);c.getContext('2d').drawImage(im,0,0);return {width:im.width,height:im.height,data:c.getContext('2d').getImageData(0,0,im.width,im.height).data};}
test('nine facility sign interiors change while terrain, building frames and prior map remain pixel exact',async()=>{
const old=await pixels('village-fishmarket-sign-v252-68.png'),next=await pixels('village-shop-signs-v252-73.png');
assert.equal(next.width,old.width);assert.equal(next.height,old.height);const changes=new Set();
for(let y=0;y<old.height;y++)for(let x=0;x<old.width;x++){const i=(y*old.width+x)*4;if(![0,1,2,3].some(k=>old.data[i+k]!==next.data[i+k]))continue;const interior=interiors.find(([,l,t,w,h])=>x>=l&&x<l+w&&y>=t&&y<t+h);assert.ok(interior,`outside sign: ${x},${y}`);changes.add(interior[0]);}
assert.equal(changes.size,interiors.length);
});
