const {test}=require('node:test'),assert=require('node:assert/strict'),path=require('node:path');
const {createCanvas,loadImage}=require('@napi-rs/canvas');
const {boot}=require('./game-harness.cjs');

test('real walk and standing pixels keep each dogs paws on the same ground in both directions',async()=>{
  const app=boot(),w=app.window;
  try{
    const images={};
    for(const dog of ['shuu','riku','grey']){
      w.ensureDogImage(dog);const source=w.eval(`dogImages.${dog}.src`);
      images[source]=await loadImage(path.join(__dirname,'..',source.split('?')[0]));
    }
    for(const dog of ['shuu','riku','grey']){
      const bottoms=[];
      for(const pose of ['walk-a','walk-b','stand','walk-left-a','walk-left-b','stand-left']){
        const canvas=createCanvas(320,180),ctx=canvas.getContext('2d'),draw=ctx.drawImage.bind(ctx);
        ctx.drawImage=(image,...args)=>draw(images[image.src]||image,...args);
        w.drawDogCareSprite(ctx,dog,90,20,pose,160);
        const pixels=ctx.getImageData(0,0,320,180).data;let top=180,bottom=0;
        for(let y=0;y<180;y++)for(let x=0;x<320;x++)if(pixels[(y*320+x)*4+3]>100){top=Math.min(top,y);bottom=Math.max(bottom,y);}
        assert.ok(bottom-top>85,dog+' complete body '+pose);bottoms.push(bottom);
      }
      assert.ok(Math.max(...bottoms)-Math.min(...bottoms)<=2,dog+' floating between frames: '+bottoms);
      assert.ok(bottoms.every(y=>y>=162&&y<=165),dog+' paws touch the lawn: '+bottoms);
    }
    assert.deepEqual(app.errors,[]);
  }finally{app.dispose();}
});

test('feeding keeps food at the mouth until eaten, then moves the empty hand away',()=>{
  const app=boot(),w=app.window,mouth={x:144,y:90};
  try{
    let lastFood=1,withdrawn=false;
    for(let i=0;i<=240;i++){
      const hand=w.dogCareTreatHand(mouth,i/240);
      assert.ok(hand.food<=lastFood+.00001&&hand.food>=0);lastFood=hand.food;
      if(hand.food>0&&hand.phase==='feed'){
        assert.ok(Math.abs(hand.x-11-mouth.x)<.01,'food stays at the mouth');
        assert.ok(Math.abs(hand.y+1-mouth.y)<.01);
      }
      if(hand.phase==='withdraw'){assert.equal(hand.food,0);withdrawn=true;}
    }
    assert.ok(withdrawn);assert.ok(w.dogCareTreatHand(mouth,0).x>320);assert.ok(w.dogCareTreatHand(mouth,1).x>320);
  }finally{app.dispose();}
});

test('petting gently moves the intact head and ears and returns to its original pose',()=>{
  const app=boot(),w=app.window;
  try{
    const ctx=w.document.createElement('canvas').getContext('2d');
    for(const dog of ['shuu','riku','grey']){
      let first,previous,last,min=Infinity,max=-Infinity;
      for(let i=0;i<=216;i++){
        const crown=w.drawDogCareCloseup(ctx,dog,'pet',i/216,10000+i*3600/216).crown;
        if(previous)assert.ok(Math.hypot(crown.x-previous.x,crown.y-previous.y)<1,'no head jump');
        first||=crown;last=crown;previous=crown;min=Math.min(min,crown.x);max=Math.max(max,crown.x);
      }
      assert.ok(max-min>4&&max-min<12,dog+' small reaction');
      assert.ok(Math.hypot(last.x-first.x,last.y-first.y)<.001,dog+' returns to rest');
    }
    assert.deepEqual(app.errors,[]);
  }finally{app.dispose();}
});
