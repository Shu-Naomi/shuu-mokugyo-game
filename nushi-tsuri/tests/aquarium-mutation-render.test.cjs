const {test}=require('node:test'),assert=require('node:assert/strict'),{createCanvas,loadImage}=require('@napi-rs/canvas'),fs=require('fs'),path=require('path'),crypto=require('crypto');
const Art=require('../fish-art.js'),Life=require('../aquarium-life.js'),M=require('../aquarium-mutations.js');
const root=path.resolve(__dirname,'..');
test('gold uses one additional aquarium-only atlas with eight isolated poses, preserving catalogue and source artwork',async()=>{
 assert.equal(crypto.createHash('sha256').update(fs.readFileSync(path.join(root,'assets/fish-lake-v208.png'))).digest('hex'),'d15babca220116e0d0c04bf4fed6b667d373b237f7c3f9cd64c4ebe9c87dd119');
 assert.equal(Art.species.funaGold,undefined);assert.equal(Object.keys(Art.species).length,60);
 const image=await loadImage(path.join(root,Art.aquarium.funaGold.asset));assert.ok(image.width>0&&image.height>0);
 for(let n=0;n<8;n++){
  const canvas=createCanvas(448,224),ctx=canvas.getContext('2d');Art.draw(ctx,image,'funaGold',n===7?3:7,n===7?2:n,()=>image);
  const d=ctx.getImageData(0,0,448,224).data;let visible=0,gold=0;
  for(let i=0;i<d.length;i+=4)if(d[i+3]>=128){visible++;if(d[i]>d[i+2]*1.3&&d[i+1]>d[i+2]*1.1)gold++;}
  assert.ok(visible>3000,'pose '+n+' is not empty');assert.ok(visible<448*224*.7,'no coloured backdrop in pose '+n);assert.ok(gold/visible>.55,'gold remains distinct in pose '+n);
 }
 const gold={species:'funa',generation:2,origin:'bred',length:150,mutation:{checked:true,kind:'gold',ruleVersion:1}},catalog=[{id:'funa',min:800,start:1300,max:4999}];
 assert.equal(Life.appearance(gold,catalog).artId,'funaGold');assert.equal(Life.appearance({...gold,length:4000},catalog).artId,'funaGold');assert.equal(Life.appearance({...gold,mutation:M.normal()},catalog).artId,undefined);
});
