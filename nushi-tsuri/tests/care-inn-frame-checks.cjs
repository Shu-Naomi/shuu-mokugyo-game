// Render every 60 Hz sample of the shipped 3.6 s, hand-free petting reaction.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {createCanvas,loadImage}=require('@napi-rs/canvas'),{boot,read}=require('./game-harness.cjs');
async function verifyFrames(output){
 const app=boot(),w=app.window,canvas=createCanvas(320,180),ctx=canvas.getContext('2d'),reference=createCanvas(320,180),ref=reference.getContext('2d'),rows=[];
 try{
  const source=w.eval('dogIdleImage.src'),image=await loadImage(path.join(__dirname,'..',source.split('?')[0]));
  for(const c of [ctx,ref]){const draw=c.drawImage.bind(c);c.drawImage=(im,...args)=>draw(im.src===source?image:im,...args);}
  w.document.querySelector('#dogCareSceneCanvas').getContext=()=>ctx;
  assert.equal(typeof w.dogCarePetHand,'undefined');assert.equal(typeof w.drawDogCareStrokingHand,'undefined');
  let handCalls=0;w.drawDogCareHand=()=>{handCalls++;throw Error('human hand in petting');};
  const before=read(w,'s'),poses=[0,43,65,108,151,194,216],keys=createCanvas(poses.length*320,540),kc=keys.getContext('2d');kc.imageSmoothingEnabled=false;
  for(const [row,dog]of ['shuu','riku','grey'].entries()){
   const sheet=createCanvas(1920,1568),sc=sheet.getContext('2d');sc.imageSmoothingEnabled=false;let previous,first,last,min=Infinity,max=-Infinity;
   const folder=output&&path.join(output,'frames',dog);if(folder)fs.mkdirSync(folder,{recursive:true});
   for(let frame=0;frame<=216;frame++){
    const progress=frame/216,now=10000+progress*3600;w.eval(`dogCareScene={mode:'pet',dogId:'${dog}',startedAt:10000,duration:3600,frame:${frame%8}}`);
    w.document.querySelector('#dogCareSceneCanvas').dataset.handPhase='feed';w.drawDogCareScene(now);
    assert.equal(w.document.querySelector('#dogCareSceneCanvas').dataset.handPhase,undefined);
    assert.match(w.document.querySelector('#dogCareSceneLabel').textContent,/目を細め/);
    // The entire scene may contain only the original dog reaction, background and hearts.
    ref.clearRect(0,0,320,180);ref.imageSmoothingEnabled=false;w.drawDogCareBackdrop(ref,frame%8);
    const face=w.drawDogCareCloseup(ref,dog,'pet',progress,now);w.drawDogCareHearts(ref,frame%8,-18);
    const actual=ctx.getImageData(0,0,320,180).data,expected=ref.getImageData(0,0,320,180).data;
    assert.deepEqual(actual,expected,dog+' unexpected overlay at frame '+frame);
    let hearts=0;for(let i=0;i<actual.length;i+=4)if(actual[i]===255&&actual[i+1]===143&&actual[i+2]===168)hearts++;
    assert.ok(hearts>0,dog+' visible hearts at frame '+frame);
    const crown=face.crown;if(previous)assert.ok(Math.hypot(crown.x-previous.x,crown.y-previous.y)<1,dog+' gentle head motion '+frame);
    first||=crown;last=crown;previous=crown;min=Math.min(min,crown.x);max=Math.max(max,crown.x);
    if(output){
     const png=canvas.toBuffer('image/png'),snapshot=await loadImage(png);fs.writeFileSync(path.join(folder,String(frame).padStart(3,'0')+'.png'),png);
     const x=(frame%16)*120,y=Math.floor(frame/16)*112;sc.fillStyle='#17313e';sc.fillRect(x,y,120,112);sc.drawImage(snapshot,90,0,120,100,x,y,120,100);sc.fillStyle='#f1dba9';sc.font='10px sans-serif';sc.fillText(frame+' / '+Math.round(progress*3600)+'ms',x+3,y+109);
     if(poses.includes(frame))kc.drawImage(snapshot,poses.indexOf(frame)*320,row*180);
    }
   }
   assert.ok(Math.abs(last.x-first.x)<.001&&Math.abs(last.y-first.y)<.001,dog+' returns to original pose');
   assert.ok(max-min>4&&max-min<12,dog+' small face and ear sway');
   rows.push({dog,frames:217,humanHandCalls:0,unexpectedOverlayPixels:0,heartsFrames:217,headSwayPixels:max-min,returnsToRest:true});
   if(output)fs.writeFileSync(path.join(output,'all-frames-'+dog+'.png'),sheet.toBuffer('image/png'));
  }
  assert.equal(handCalls,0);assert.deepEqual(read(w,'s'),before,'drawing never awards or changes save data');assert.deepEqual(app.errors,[]);
  if(output){fs.writeFileSync(path.join(output,'petting-key-poses.png'),keys.toBuffer('image/png'));fs.writeFileSync(path.join(output,'frame-checks.json'),JSON.stringify({frames:651,rows},null,2));}
  return {frames:651,rows};
 }finally{app.dispose();}
}
if(require.main===module)verifyFrames(process.argv[2]).then(r=>console.log('CARE_ALL_FRAMES_PASS '+JSON.stringify(r))).catch(e=>{console.error(e);process.exitCode=1;});
module.exports={verifyFrames};
