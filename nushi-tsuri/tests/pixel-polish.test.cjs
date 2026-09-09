const {test}=require('node:test');
const assert=require('node:assert/strict');
const path=require('node:path');
const {createCanvas,loadImage}=require('@napi-rs/canvas');
const Pixel=require('../pixel-world.js'),Cast=require('../pixel-cast.js');
const {boot,read}=require('./game-harness.cjs');

test('the released float continues from its hanging position on every screen ratio',()=>{
  for(const [width,height] of [[640,192],[640,320],[640,960]]){
    const target={x:width*.7,y:height*.45};
    const before=Cast.model(width,height,Cast.RELEASE-1e-7,target,true);
    const after=Cast.model(width,height,Cast.RELEASE+1e-7,target,true);
    assert.ok(Math.hypot(after.bobber.x-before.bobber.x,after.bobber.y-before.bobber.y)<.01,'release must not teleport to the rod tip');
  }
});

test('cast rendering advances between gameplay ticks, owns one bounded loop and cleans up',()=>{
  const app=boot(),w=app.window,frames=new Map();let id=0,now=1700000000000;
  w.Date.now=()=>now;
  w.requestAnimationFrame=callback=>{frames.set(++id,callback);return id;};
  w.cancelAnimationFrame=key=>frames.delete(key);
  const step=ms=>{now+=ms;const pending=[...frames];frames.clear();for(const [,callback] of pending)callback(now-1700000000000);};
  try{
    w.eval('s.soundEnabled=false;cast(fishingSpots[0]);beginFishing();clearInterval(timer);battle.cast=60;launchSurfaceCast()');
    const resources=read(w,'({bait:s.baits,minutes:s.gameMinutes})'),paints=w.eval('pixelScenePaints');
    let moving=0,last=-1;
    for(let i=0;i<35;i++){
      step(1000/60);
      const progress=w.eval('pixelCastModel.pose.t');
      if(progress!==last)moving++;
      last=progress;
    }
    assert.ok(last>.45&&last<.51,'RAF timestamps must not be confused with the epoch cast clock');
    assert.ok(moving>=12,'the actor must animate without waiting for a 120ms gameplay tick');
    assert.ok(frames.size<=1,'only one cast animation is pending');
    assert.equal(w.eval('pixelScenePaints'),paints,'motion reuses the scenery');
    Object.defineProperty(w.document,'hidden',{configurable:true,value:true});
    w.document.dispatchEvent(new w.Event('visibilitychange'));
    assert.equal(frames.size,0,'hidden pages release the frame callback');
    Object.defineProperty(w.document,'hidden',{configurable:true,value:false});
    w.document.dispatchEvent(new w.Event('visibilitychange'));
    step(20);assert.ok(w.eval('pixelCastModel.pose.t')>last,'visible flight resumes at the same clock');
    w.eval('settleSurfaceCast()');
    assert.equal(frames.size,0,'landing ends the animation loop');
    const after=w.document.querySelector('#castLinePath').getAttribute('d');
    w.eval('syncSurfaceCastRig()');
    assert.equal(w.document.querySelector('#castLinePath').getAttribute('d'),after,'landing and subsequent waiting use one line shape');
    assert.deepEqual(read(w,'({bait:s.baits,minutes:s.gameMinutes})'),resources);
    w.eval('endBattle();cast(fishingSpots[0]);beginFishing();clearInterval(timer);launchSurfaceCast();endBattle()');
    assert.equal(frames.size,0,'cancelled fishing leaves no animation behind');
    assert.deepEqual(app.errors,[]);
  }finally{app.dispose();}
});

test('detailed fishing masters and motion overlays preserve their aspect on phone rotation',()=>{
  const app=boot(),w=app.window;
  try {
    for(const id of ['castBackdrop','underwaterPixels']) {
      const canvas=w.document.querySelector('#'+id);
      assert.equal(w.getComputedStyle(canvas).objectFit,'cover');
      const overlay=w.document.createElement('canvas');overlay.className='scenery-motion';overlay.dataset.for=id;canvas.after(overlay);
      assert.equal(w.getComputedStyle(overlay).objectFit,'cover');
    }
    assert.equal(w.getComputedStyle(w.document.querySelector('#homeAquarium')).top,'53.6%');
  } finally {app.dispose();}
});

test('dog idle effects preserve the ground anchor and the pet scene stays proportional',()=>{
  const app=boot(),w=app.window,dog=w.document.querySelector('#dog');
  try{
    for(const pose of ['idle-sleep','idle-beg'])for(const facing of ['', 'face-player-right']){
      dog.className=`companion canvas-dog shuu ${pose} ${facing}`;
      const style=w.getComputedStyle(dog);
      assert.equal(style.animation,'none','breathing and begging must not translate the ground container');
      assert.equal(style.transform,'translate(-50%, -100%)');
      assert.equal(w.getComputedStyle(dog.querySelector('canvas')).transformOrigin,'center bottom');
    }
    const style=w.getComputedStyle(w.document.querySelector('#petScene'));
    assert.equal(style.height,'auto');assert.equal(style.aspectRatio,'5 / 4');
  }finally{app.dispose();}
});

test('digging and begging sprites use the same floor as standing dogs',async()=>{
  const app=boot(),w=app.window,c=createCanvas(320,320),ctx=c.getContext('2d');
  try{
    const images={};
    for(const name of ['dog-idles.png','shuu-walk.png','riku-walk.png','grey-walk.png'])
      images['assets/'+name]=await loadImage(path.join(__dirname,'../assets',name));
    const bridge=new Proxy(ctx,{get(t,k){if(k==='drawImage')return(image,...args)=>t.drawImage(images[image.src.split('?')[0]],...args);const value=t[k];return typeof value==='function'?value.bind(t):value;},set(t,k,v){t[k]=v;return true;}});
    w.document.querySelector('#dogSprite').getContext=()=>bridge;
    for(const dog of ['shuu','riku','grey'])for(const pose of ['idle-dig','idle-beg'])for(const frame of [0,1]){
      w.eval(`s.dog='${dog}';dogIdleMode='${pose}';dogWalking=false;dogAnimFrame=${frame};drawDog()`);
      const pixels=ctx.getImageData(0,0,320,320).data;let bottom=0;
      for(let y=0;y<320;y++)for(let x=0;x<320;x++)if(pixels[(y*320+x)*4+3]>100)bottom=Math.max(bottom,y);
      assert.ok(bottom>=314&&bottom<=319,`${dog} ${pose} frame ${frame} rests on the floor: ${bottom}`);
    }
    for(const dog of ['shuu','riku','grey']){
      w.eval(`ensureDogImage('${dog}');s.dog='${dog}';dogWalking=true;dogIdleMode='';dogAnimFrame=1;drawDog()`);
      const walking=ctx.getImageData(0,0,320,320).data;
      for(const pose of ['idle-dig','idle-beg']){
        w.eval(`dogIdleMode='${pose}';drawDog()`);
        assert.deepEqual(ctx.getImageData(0,0,320,320).data,walking,'walking out of an idle pose cannot retain its old ground offset');
      }
    }
  }finally{app.dispose();}
});
