const {test}=require('node:test'),assert=require('node:assert/strict'),path=require('node:path');
const {createCanvas,loadImage}=require('@napi-rs/canvas');
const Art=require('../fish-art.js'),Scenery=require('../layered-scenery.js'),Layers=require('../scene-layers.js');

test('new stream fish keep complete volume and a continuous body position throughout all 97 turning steps',async()=>{
 for(const id of ['iwana','amago','kajika']){
  const image=await loadImage(path.join(__dirname,'..',Art.species[id].asset)),ctx=createCanvas(448,224).getContext('2d'),shapes=[];
  for(let frame=0;frame<=96;frame++){
   assert.equal(Art.draw(ctx,image,id,7,frame/16,()=>image),true);const data=ctx.getImageData(0,0,448,224).data;
   let left=448,right=0,count=0,edge=0;
   for(let n=0;n<448*224;n++)if(data[n*4+3]>100){const x=n%448,y=Math.floor(n/448);left=Math.min(left,x);right=Math.max(right,x);count++;if(x<2||x>445||y<2||y>221)edge++;}
   assert.ok(count>9000,id+' body and fins remain visible at '+frame);assert.equal(edge,0,id+' never clips');
   const shape={width:right-left+1,center:(right+left)/2},previous=shapes.at(-1);
   if(previous){assert.ok(Math.abs(shape.center-previous.center)<=10,id+' body must not jump when art changes');assert.ok(Math.abs(shape.width-previous.width)<=20,id+' gradual silhouette width');}
   shapes.push(shape);
  }
  assert.ok(shapes[48].width>shapes[0].width*.45,id+' frontal view retains volume');
  assert.ok(shapes[92].width>shapes[88].width*.9,id+' late leftward view cannot turn back to the front');
 }
});

test('cropping an odd-sized scenery atlas uses shared pixel boundaries with no adjacent panel or transparent seam',()=>{
 const source=createCanvas(5,5),ctx=source.getContext('2d'),colors=['#d53423','#32c64a','#253dde','#d4b726'];
 const cells=[[0,0,3,3],[3,0,2,3],[0,3,3,2],[3,3,2,2]];
 cells.forEach(([x,y,w,h],i)=>{ctx.fillStyle=colors[i];ctx.fillRect(x,y,w,h);});
 for(const [i,sourceRect]of [[0,[0,0,.5,.5]],[1,[.5,0,.5,.5]],[2,[0,.5,.5,.5]],[3,[.5,.5,.5,.5]]]){
  const scene=Scenery.prepare(source,null,{units:[5,5],parts:[],sourceRect},{season:'spring',period:'day'},createCanvas),result=createCanvas(scene.width,scene.height);
  Scenery.compose(result,scene);assert.equal(scene.width,cells[i][2]);assert.equal(scene.height,cells[i][3]);
  const expected=ctx.getImageData(...cells[i]).data,actual=result.getContext('2d').getImageData(0,0,result.width,result.height).data;assert.deepEqual(actual,expected);
 }
});

test('mountain cast masters have four distinct detailed water landscapes and indoor cave lighting',async()=>{
 const pixels=new Set();
 for(const type of ['stream','pond','marsh','underground']){
  const definition=Layers.get('surface-mountain-'+type),source=await loadImage(path.join(__dirname,'..',definition.source));
  assert.equal(definition.indoor,type==='underground');
  const scene=Scenery.prepare(source,null,definition,{season:'spring',period:'day'},createCanvas),c=createCanvas(scene.width,scene.height);Scenery.compose(c,scene);
  assert.ok(scene.width>=800&&scene.height>=400,'keep the detailed authored resolution');
  const data=c.getContext('2d').getImageData(0,0,c.width,c.height).data,colors=new Set();let checksum=0;
  for(let i=0;i<data.length;i+=4*101){assert.equal(data[i+3],255,'no crop seam');colors.add(data[i]+','+data[i+1]+','+data[i+2]);checksum=(Math.imul(checksum,31)+data[i]*3+data[i+1]*5+data[i+2])>>>0;}
  assert.ok(colors.size>2000,type+' retains the landscape detail');pixels.add(checksum);
 }
 assert.equal(pixels.size,4,'lake, stream, marsh and cave must not share a rendered background');
});
