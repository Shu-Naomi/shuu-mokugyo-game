// Render every 60 Hz sample of the shipped 3.6 s petting animation.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {createCanvas,loadImage}=require('@napi-rs/canvas'),{boot}=require('./game-harness.cjs');
function skinMask(ctx){
 const data=ctx.getImageData(0,0,320,180).data,points=[];let left=320,right=-1,top=180,bottom=-1;
 for(let y=0;y<180;y++)for(let x=0;x<320;x++){const i=(y*320+x)*4;if(data[i+3]<180||data[i]<170||data[i]-data[i+2]<55||data[i+1]>220)continue;points.push([x,y]);left=Math.min(left,x);right=Math.max(right,x);top=Math.min(top,y);bottom=Math.max(bottom,y);}
 return {points,left,right,top,bottom};
}
function components(points){const remaining=new Set(points.map(([x,y])=>y*320+x));let n=0;while(remaining.size){n++;const queue=[remaining.values().next().value];remaining.delete(queue[0]);for(let i=0;i<queue.length;i++){const p=queue[i],x=p%320,y=Math.floor(p/320);for(const [dx,dy]of [[-1,0],[1,0],[0,-1],[0,1],[-1,-1],[1,-1],[-1,1],[1,1]]){const nx=x+dx,ny=y+dy,k=ny*320+nx;if(nx>=0&&nx<320&&ny>=0&&ny<180&&remaining.delete(k))queue.push(k);}}}return n;}
async function verifyFrames(output){
 const app=boot(),w=app.window,canvas=createCanvas(320,180),ctx=canvas.getContext('2d'),handCanvas=createCanvas(320,180),hc=handCanvas.getContext('2d'),rows=[];
 try{
  const source=w.eval('dogIdleImage.src'),image=await loadImage(path.join(__dirname,'..',source.split('?')[0])),draw=ctx.drawImage.bind(ctx);
  ctx.drawImage=(im,...args)=>draw(im.src===source?image:im,...args);w.document.querySelector('#dogCareSceneCanvas').getContext=()=>ctx;
  const paint=w.drawDogCareHand,portrait=w.drawDogCareCloseup;let hand,face;
  w.drawDogCareCloseup=(...args)=>{face=portrait(...args);return face;};w.drawDogCareHand=(...args)=>{hand={x:Math.round(args[1]),y:Math.round(args[2])};paint(...args);};
  const keys=createCanvas(1920,540),kc=keys.getContext('2d');kc.imageSmoothingEnabled=false;
  for(const [row,dog]of ['shuu','riku','grey'].entries()){
   const sheet=createCanvas(1920,1568),sc=sheet.getContext('2d');sc.imageSmoothingEnabled=false;let previous,shape=null,full=0,maxWidth=0;
   const folder=output&&path.join(output,'frames',dog);if(folder)fs.mkdirSync(folder,{recursive:true});
   for(let frame=0;frame<=216;frame++){
    const progress=frame/216;w.eval(`dogCareScene={mode:'pet',dogId:'${dog}',startedAt:10000,duration:3600,frame:${frame%8}}`);w.drawDogCareScene(10000+progress*3600);
    hc.clearRect(0,0,320,180);w.drawDogCareStrokingHand(hc,hand.x,hand.y);const mask=skinMask(hc);
    if(previous)assert.ok(Math.hypot(hand.x-previous.x,hand.y-previous.y)<6,dog+' smooth frame '+frame);previous=hand;
    assert.ok(mask.bottom<=face.crown.y+5,dog+' hand stays above brows, frame '+frame);
    if(hand.y>=20){
     assert.equal(components(mask.points),1,dog+' connected hand/wrist, frame '+frame);const width=mask.right-mask.left;assert.ok(width<=46,dog+' hand smaller than the head');maxWidth=Math.max(maxWidth,width);
     const silhouette=mask.points.map(([x,y])=>(x-hand.x)+','+(y-hand.y)).join(';');if(shape==null)shape=silhouette;else assert.equal(silhouette,shape,dog+' rigid fingers/palm, frame '+frame);full++;
    }
    if(output){
     const png=canvas.toBuffer('image/png'),snapshot=await loadImage(png);fs.writeFileSync(path.join(folder,String(frame).padStart(3,'0')+'.png'),png);
     const x=(frame%16)*120,y=Math.floor(frame/16)*112;sc.fillStyle='#17313e';sc.fillRect(x,y,120,112);sc.drawImage(snapshot,90,0,120,100,x,y,120,100);sc.fillStyle='#f1dba9';sc.font='10px sans-serif';sc.fillText(frame+' / '+Math.round(progress*3600)+'ms',x+3,y+109);
     if([0,43,65,108,151,194].includes(frame)){const col=[0,43,65,108,151,194].indexOf(frame);kc.drawImage(snapshot,col*320,row*180);}
    }
   }
   assert.ok(full>110,dog+' ample full contact frames');rows.push({dog,frames:217,fullHandFrames:full,maxSkinWidth:maxWidth,rigidContour:true,belowBrows:0});if(output)fs.writeFileSync(path.join(output,'all-frames-'+dog+'.png'),sheet.toBuffer('image/png'));
  }
  assert.deepEqual(app.errors,[]);if(output){fs.writeFileSync(path.join(output,'petting-key-poses.png'),keys.toBuffer('image/png'));fs.writeFileSync(path.join(output,'frame-checks.json'),JSON.stringify({frames:651,rows},null,2));}
  return {frames:651,rows};
 }finally{app.dispose();}
}
if(require.main===module)verifyFrames(process.argv[2]).then(r=>console.log('CARE_ALL_FRAMES_PASS '+JSON.stringify(r))).catch(e=>{console.error(e);process.exitCode=1;});
module.exports={verifyFrames};
