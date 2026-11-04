// Actual source pixels, independent expected final composition, no browser clock.
const {test}=require('node:test'),assert=require('node:assert/strict'),path=require('node:path'),crypto=require('node:crypto');
const {createCanvas,loadImage}=require('@napi-rs/canvas'),Intro=require('../lake-intro.js');
const root=path.resolve(__dirname,'..');
const paper=[[134,92],[145,81],[264,77],[307,81],[324,88],[343,81],[462,77],[504,81],[518,94],[520,281],[513,295],[334,300],[324,303],[310,297],[139,297],[132,289]];
const hand=[[20,360],[30,332],[38,287],[46,255],[64,230],[85,216],[109,207],[119,202],[126,203],[130,210],[137,212],[143,220],[141,234],[132,253],[130,267],[139,264],[146,266],[151,273],[147,286],[140,301],[133,314],[120,330],[106,343],[99,360]];
function outline(ctx,points){ctx.beginPath();points.forEach(([x,y],i)=>ctx[i?'lineTo':'moveTo'](x,y));ctx.closePath();}
function pixels(c){return c.getContext('2d').getImageData(0,0,640,360).data;}
function equalPixels(actual,expected,message){let mismatches=0,first=-1;for(let i=0;i<actual.length;i++)if(actual[i]!==expected[i]){mismatches++;if(first<0)first=i;}assert.equal(mismatches,0,`${message}; first channel mismatch ${first}: ${actual[first]} vs ${expected[first]}`);}
function protectedPixel(x,y){return (x<128||x>=522||y<15||y>=303)||(x>=20&&x<=120&&y>=220)||(x>=549&&y>=211)||(x>=124&&x<=132&&y>=216&&y<=230)||(x>=138&&x<=144&&y>=270&&y<=278);}
test('the printed leaf rises, crosses the fixed spine, and lands on the other page',()=>{
 const phases=new Set(),edges=[];
 for(let i=0;i<=100;i++){const leaf=Intro.diaryLeaf(i/100);phases.add(leaf.phase);edges.push(leaf.edgeX);assert.ok(Number.isInteger(leaf.edgeX));assert.ok(leaf.lift>=0&&leaf.lift<=64);if(i)assert.ok(edges[i]<=edges[i-1],'edge must never reverse or snap back');}
 assert.deepEqual([...phases],['start','rise','cross','settle','settled']);assert.equal(edges[0],516);assert.equal(edges.at(-1),136);
 assert.equal(Intro.diaryLeaf(.5).edgeX,324);assert.equal(Intro.diaryLeaf(.5).lift,64);
});
test('real painted paper has many opaque poses, stationary hands/background, and the complete flat final spread',async()=>{
 const loaded={};for(const source of [Intro.sourceFor('diary'),Intro.art.diaryTurn,Intro.art.diarySettled])loaded[source]=await loadImage(path.join(root,source));
 const old=global.Image,sources=Object.keys(loaded);let created=0;global.Image=function(){const source=sources[created++],image=loaded[source];Object.defineProperty(image,'src',{get:()=>source,set(value){assert.equal(value,source);}});return image;};
 try{
  const base=createCanvas(640,360);base.getContext('2d').drawImage(loaded[Intro.sourceFor('diary')],0,0);const original=pixels(base);
  const nextPage=loaded[Intro.art.diarySettled];
  const expected=createCanvas(640,360),e=expected.getContext('2d');e.imageSmoothingEnabled=false;e.drawImage(base,0,0);e.beginPath();e.rect(128,15,394,288);e.clip();e.save();outline(e,paper);e.clip();e.drawImage(nextPage,0,0,640,360,0,0,640,360);e.restore();e.save();outline(e,hand);e.clip();e.drawImage(loaded[Intro.sourceFor('diary')],0,0,640,360,0,0,640,360);e.restore();
  const finalPixels=pixels(expected),avatarFinals=[],handMask=createCanvas(640,360),handCtx=handMask.getContext('2d');outline(handCtx,hand);handCtx.fill();const handPixels=pixels(handMask);
  for(const avatar of ['boy','girl'])for(const id of ['notebook','researcher','wish']){
   const c=createCanvas(640,360);c.dataset={};const ctx=c.getContext('2d'),draw=ctx.drawImage.bind(ctx);let calls=0;
   ctx.drawImage=(...args)=>{calls++;return draw(...args);};const hashes=new Set(),poses=[];
   for(let index=0;index<=20;index++){
    calls=0;const progress=index/20;Intro.paint(c,id,()=>{},{avatar},Intro.pose(id,progress*1.6,{avatar}));const actual=pixels(c);
    assert.ok(calls<=110,`small paper mesh must be bounded: ${calls} draw calls`);assert.equal(ctx.imageSmoothingEnabled,false);
    let changed=0,leftChanged=0,rightChanged=0,transparent=0,protectedChanged=0,firstProtected=null;
    for(let y=0;y<360;y++)for(let x=0;x<640;x++){
     const i=(y*640+x)*4;if(actual[i+3]!==255)transparent++;
     if(actual[i]===original[i]&&actual[i+1]===original[i+1]&&actual[i+2]===original[i+2])continue;
     changed++;if(x<324)leftChanged++;else rightChanged++;
     if(protectedPixel(x,y)||handPixels[i+3]===255){protectedChanged++;firstProtected||=[x,y];}
    }
    assert.equal(transparent,0,'leaf must never expose transparent ink');assert.equal(protectedChanged,0,`stationary foreground/background changed at ${firstProtected}, progress ${progress}`);
    hashes.add(crypto.createHash('sha256').update(actual).digest('hex'));poses.push({changed,leftChanged,rightChanged});
    if(index===0)equalPixels(actual,original,'initial source');
    if(index===20){equalPixels(actual,finalPixels,'final must contain both newly settled pages, with original hands restored');avatarFinals.push(Buffer.from(actual));}
   }
   assert.ok(hashes.size>=16,`expected a visible trajectory, not 3 held drawings: ${hashes.size}`);
   assert.ok(poses[13].leftChanged>8000,'the reverse leaf must cross onto the left page');
   assert.ok(poses[20].leftChanged>20000&&poses[20].rightChanged>25000,'finish must reveal the complete new spread');
  }
  for(const final of avatarFinals)equalPixels(final,avatarFinals[0],'diary artwork must be equally correct for both avatars and all diary steps');
 }finally{global.Image=old;}
});
