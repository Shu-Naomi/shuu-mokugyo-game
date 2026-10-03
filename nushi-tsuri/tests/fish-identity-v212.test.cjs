const {test}=require('node:test'),assert=require('node:assert/strict'),path=require('node:path');
const {createCanvas,loadImage}=require('@napi-rs/canvas');
const Art=require('../fish-art.js');

test('Honmoroko and Ayu keep one tall dorsal fin and their own colors instead of whiting anatomy',async()=>{
  for(const id of ['moroko','ayu','shirogisu']){
    const images=new Map();
    for(const src of Art.assets(id))images.set(src,await loadImage(path.join(__dirname,'..',src)));
    const ctx=createCanvas(448,224).getContext('2d');
    assert.equal(Art.draw(ctx,images.get(Art.species[id].asset),id,8,0,src=>images.get(src)),true);
    const pixels=ctx.getImageData(0,0,448,224).data,top=[];let left=448,right=0,gold=0;
    for(let x=0;x<448;x++){
      let y=0;while(y<224&&pixels[(y*448+x)*4+3]<100)y++;
      top[x]=y;if(y<224){left=Math.min(left,x);right=Math.max(right,x);}
    }
    // Find raised fins against the back line, excluding the forked tail and
    // head. A tiny adipose fin must not become whiting's second tall dorsal.
    const a=Math.round(left+(right-left)*.2),b=Math.round(left+(right-left)*.8);
    let run=0;const fins=[];
    for(let x=a;x<=b+1;x++){
      const back=top[a]+(top[b]-top[a])*(x-a)/(b-a);
      if(x<=b&&back-top[x]>(right-left)*.05)run++;
      else if(run){if(run>=8)fins.push(run);run=0;}
    }
    assert.equal(fins.length,id==='shirogisu'?2:1,id+' tall dorsal fins');
    for(let i=0;i<pixels.length;i+=4)if(pixels[i+3]>100&&pixels[i]>150&&
      pixels[i+1]>110&&pixels[i+2]<90&&pixels[i]-pixels[i+2]>60)gold++;
    if(id==='moroko')assert.equal(gold,0,'Honmoroko stays silver, with no Ayu yellow markings');
    if(id==='ayu')assert.ok(gold>100,'Ayu retains its golden shoulder and fins');
  }
});

test('a missing species source keeps the previous frame instead of cropping another fish',async()=>{
  const id='ayu',image=await loadImage(path.join(__dirname,'..',Art.species[id].asset));
  const ctx=createCanvas(448,224).getContext('2d');ctx.fillStyle='#123456';ctx.fillRect(0,0,448,224);
  const before=Buffer.from(ctx.getImageData(0,0,448,224).data);
  assert.equal(Art.draw(ctx,image,id,3,2,()=>undefined),false);
  assert.deepEqual(Buffer.from(ctx.getImageData(0,0,448,224).data),before);
});
