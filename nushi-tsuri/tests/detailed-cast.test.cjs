const {test}=require('node:test');
const assert=require('node:assert/strict');
const path=require('node:path');
const {createCanvas,loadImage}=require('@napi-rs/canvas');
const Cast=require('../pixel-cast.js');
const {boot}=require('./game-harness.cjs');

test('both detailed characters keep a closed rod grip and a relaxed free hand',async()=>{
  for(const avatar of ['boy','girl']){
    const sprite=await loadImage(path.join(__dirname,'..',Cast.artwork[avatar].src));
    for(const height of [384,640,1920]){
      const canvas=createCanvas(1280,height),ctx=canvas.getContext('2d');
      for(let frame=0;frame<=30;frame++){
        const m=Cast.draw(canvas,{avatar,sprite,progress:frame/30,env:{season:'spring',period:'day'}});
        assert.equal(m.detailed,true);
        for(const [name,grip] of [['hand',m.hand],['support',m.support]]){
          const radius=Math.ceil(m.box.scale*2);
          const pixels=ctx.getImageData(Math.round(grip.x)-radius,Math.round(grip.y)-radius,radius*2+1,radius*2+1).data;
          let skin=0;
          for(let i=0;i<pixels.length;i+=4)
            if(pixels[i+3]>180&&pixels[i]>110&&pixels[i]>pixels[i+1]*1.05&&pixels[i+1]>pixels[i+2]*1.1)skin++;
          assert.ok(skin>0,`${avatar}, ${height}, frame ${frame}: painted ${name} matches its joint`);
        }
      }
    }
  }
});

test('casting preserves anatomical arm lengths, a lowered elbow and continuous wrist motion',()=>{
  const distance=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
  for(const avatar of ['boy','girl']){
    let previous;
    for(let frame=0;frame<=360;frame++){
      const [free,arm]=Cast.armPose(avatar,frame/360);
      assert.ok(Math.abs(distance(arm.shoulderPoint,arm.elbowPoint)-arm.upperLength)<1e-8,'upper arm cannot stretch');
      assert.ok(Math.abs(distance(arm.elbowPoint,arm.handPoint)-arm.lowerLength)<1e-8,'forearm and palm cannot stretch');
      assert.ok(Math.abs(distance(arm.wristPoint,arm.handPoint)-1.5)<1e-8,'the closed grip joins its wrist');
      const forearmAngle=Math.atan2(arm.handPoint.y-arm.elbowPoint.y,arm.handPoint.x-arm.elbowPoint.x)*180/Math.PI;
      const wristTurn=Math.abs(((forearmAngle-Cast.pose(frame/360).angle+540)%360)-180);
      assert.ok(wristTurn<45,'the grip cannot force the wrist through a sharp bend');
      assert.ok(arm.elbowPoint.y>arm.handPoint.y+1,'elbow bends below the grip instead of across the back');
      assert.ok(free.handPoint.x<free.shoulderPoint.x&&free.handPoint.y>free.shoulderPoint.y+15,'the free hand rests beside the thigh');
      if(previous)for(const joint of ['shoulderPoint','elbowPoint','wristPoint','handPoint'])
        assert.ok(distance(arm[joint],previous[joint])<.3,'no elbow flip or hand teleport');
      previous=arm;
    }
    assert.deepEqual(Cast.armPose(avatar,0),Cast.armPose(avatar,1),'landing returns to the same relaxed stance');
  }
});

test('extra actor resolution preserves framing, rod position and float flight',()=>{
  for(const height of [192,274,320,960])for(const progress of [0,.18,.41,.58,.81,1]){
    const a=Cast.model(640,height,progress,{x:448,y:height*.5},true);
    const b=Cast.model(1280,height*2,progress,{x:896,y:height},true);
    for(const key of ['hand','tip','support','bobber','leftFoot','rightFoot']){
      assert.ok(Math.abs(a[key].x-b[key].x/2)<.6,key+' horizontal framing');
      assert.ok(Math.abs(a[key].y-b[key].y/2)<.6,key+' vertical framing');
    }
  }
});

test('preparation and reentry have no placeholder arc; loaded artwork refreshes the idle actor',async()=>{
  const app=boot(),w=app.window;
  try{
    w.eval('s.soundEnabled=false;cast(fishingSpots[0]);clearInterval(timer)');
    const line=w.document.querySelector('#castLinePath');
    assert.equal(line.getAttribute('d'),'');
    await w.eval('ShuCast.preload()');
    assert.equal(w.eval('pixelCastModel.detailed'),true,'asset completion redraws even before casting starts');
    assert.equal(w.document.querySelector('#castActor').width,1280);
    w.eval('beginFishing();clearInterval(timer)');
    assert.match(line.getAttribute('d'),/^M [-\d.]+ [-\d.]+ L [-\d.]+ [-\d.]+$/);
    assert.equal(w.getComputedStyle(line).filter,'none','the line has no white glow');
    w.eval('endBattle();cast(fishingSpots[0]);clearInterval(timer)');
    assert.equal(line.getAttribute('d'),'');
    assert.deepEqual(app.errors,[]);
  }finally{app.dispose();}
});
