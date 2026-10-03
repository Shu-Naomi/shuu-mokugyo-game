const {test}=require('node:test'),assert=require('node:assert/strict'),path=require('node:path');
const {createCanvas,loadImage}=require('@napi-rs/canvas');
const {boot}=require('./game-harness.cjs');

test('the relaxed hand rests across the crown without fingers hanging down the face',()=>{
  const app=boot(),w=app.window;
  try{
    const canvas=createCanvas(320,180),ctx=canvas.getContext('2d'),x=150,y=40;
    w.drawDogCareHand(ctx,x,y,null,1,'stroke');
    const pixels=ctx.getImageData(0,0,320,180).data;
    let upper=0,side=0,below=0,contact=0,left=320,right=0;
    for(let py=0;py<180;py++)for(let px=0;px<320;px++){
      const i=(py*320+px)*4;
      if(pixels[i+3]<180)continue;
      if(!py)upper++;if(px===319)side++;
      if(pixels[i]>170&&pixels[i]-pixels[i+2]>55&&pixels[i+1]<220){
        if(py>y+11)below++;
        if(py>=y-2&&py<=y+2){contact++;left=Math.min(left,px);right=Math.max(right,px);}
      }
    }
    assert.ok(right-left>40&&contact>90,'broad palm and fingers lie across the head');
    assert.equal(below,0,'no fingers point down over the brows and eyes');
    assert.ok(upper>10,'the sleeve enters from above');assert.equal(side,0,'no side-only arm');
    assert.deepEqual(app.errors,[]);
  }finally{app.dispose();}
});

test('both Shibas keep real coat texture under the closed lids and preserve their eyebrows',async()=>{
  const app=boot(),w=app.window;
  try{
    const source=w.eval('dogIdleImage.src'),image=await loadImage(path.join(__dirname,'..',source.split('?')[0]));
    for(const [dog,row,eyes]of [['shuu',0,[[135,106],[184,106]]],['grey',2,[[132,94],[182,94]]]]){
      const canvas=createCanvas(320,320),ctx=canvas.getContext('2d'),draw=ctx.drawImage.bind(ctx);
      ctx.drawImage=(im,...args)=>draw(im.src===source?image:im,...args);
      ctx.drawImage(image,0,row*320,320,320,0,0,320,320);
      const before=ctx.getImageData(0,0,320,320).data;
      w.drawDogCareShibaEyelids(ctx,w.eval('dogIdleImage'),dog,row,1);
      const after=ctx.getImageData(0,0,320,320).data;
      for(const [x,y]of eyes){
        const colors=new Set();
        for(let dy=-6;dy<=-2;dy++)for(let dx=-5;dx<=5;dx++){
          const i=((y+dy)*320+x+dx)*4;colors.add(Array.from(after.slice(i,i+3)).join(','));
        }
        assert.ok(colors.size>3,dog+' lid must use coat texture, not a flat colored disc');
        const browTop=dog==='shuu'?72:61,browBottom=dog==='shuu'?90:79;
        for(let by=browTop;by<=browBottom;by++)for(let bx=x-13;bx<=x+13;bx++){
          const i=(by*320+bx)*4;
          assert.deepEqual(after.slice(i,i+4),before.slice(i,i+4),dog+' original eyebrow');
        }
      }
    }
  }finally{app.dispose();}
});

test('relaxed eyes ease shut and reopen, while a normal blink also returns to the original',()=>{
  const app=boot(),w=app.window;
  try{
    // Isolate eyelid opacity from the portrait and chewing render calls.
    const closures=[];
    w.drawDogCareShibaEyelids=(_ctx,_image,_dog,_row,closure)=>closures.push(closure);
    const ctx=w.document.createElement('canvas').getContext('2d');
    const sample=(mode,progress,now)=>{
      closures.length=0;w.drawDogCareCloseup(ctx,'shuu',mode,progress,now);return closures[0]||0;
    };
    const closing=[.12,.15,.18,.21,.24].map(p=>sample('pet',p,10000));
    const opening=[.8,.83,.86,.9,.93,1].map(p=>sample('pet',p,10000));
    assert.equal(closing[0],0);assert.equal(closing.at(-1),1);
    assert.ok(closing.every((x,i)=>!i||x>=closing[i-1]));
    assert.equal(opening[0],1);assert.equal(opening.at(-1),0);
    assert.ok(opening.every((x,i)=>!i||x<=opening[i-1]));
    assert.equal(sample('idle',0,4499),0);assert.ok(sample('idle',0,4535)>0);
    assert.equal(sample('idle',0,4570),1);assert.equal(sample('idle',0,4700),0);
  }finally{app.dispose();}
});
