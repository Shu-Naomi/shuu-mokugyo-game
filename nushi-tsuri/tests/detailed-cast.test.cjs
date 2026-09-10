const {test}=require('node:test');
const assert=require('node:assert/strict');
const path=require('node:path');
const {createCanvas,loadImage}=require('@napi-rs/canvas');
const Cast=require('../pixel-cast.js');
const {boot}=require('./game-harness.cjs');

test('painted full-body frames retain their grip, opaque clothing and clean transparent surroundings',async()=>{
  for(const avatar of ['boy','girl']){
    const sprite=await loadImage(path.join(__dirname,'..',Cast.artwork[avatar].src));
    for(const height of [384,548,1920]){
      const shapes=new Set(),canvas=createCanvas(1280,height),ctx=canvas.getContext('2d');
      const atlas=Cast.prepareAtlas(sprite,canvas);
      assert.equal(Cast.prepareAtlas(sprite,canvas),atlas,'decode the background once, not on every paint');
      assert.equal(atlas.getContext('2d').getImageData(0,0,1,1).data[3],0,'the atlas background is actually transparent in the renderer');
      for(let frame=0;frame<12;frame++){
        const m=Cast.draw(canvas,{avatar,sprite,progress:(Cast.timeline[frame]+1)/Cast.DURATION,env:{season:'summer',period:'day'}});
        assert.equal(m.detailed,true);assert.equal(m.frame,frame);
        const radius=Math.ceil(m.box.scale*1.5),grip=m.hand;
        const pixels=ctx.getImageData(Math.round(grip.x)-radius,Math.round(grip.y)-radius,radius*2+1,radius*2+1).data;
        let skin=0;
        for(let i=0;i<pixels.length;i+=4)
          if(pixels[i+3]>200&&pixels[i]>160&&pixels[i]>pixels[i+1]+20&&pixels[i+1]>pixels[i+2]+20)skin++;
        assert.ok(skin>0,avatar+', '+height+', frame '+frame+': the drawn fingers close on the rod grip');
        const torso=ctx.getImageData(Math.round(m.box.x+49*m.box.scale),Math.round(m.box.y+45*m.box.scale),Math.ceil(28*m.box.scale),Math.ceil(37*m.box.scale)).data;
        shapes.add(require('node:crypto').createHash('sha256').update(torso).digest('hex'));
        const all=ctx.getImageData(0,0,canvas.width,canvas.height).data;
        for(let i=0;i<all.length;i+=4)assert.ok(!(all[i+3]>150&&all[i]>all[i+1]+80&&all[i+2]>all[i+1]+70),'no chroma background leaks into the lake');
      }
      assert.equal(shapes.size,12,'torso and shoulders have distinct whole-body drawings throughout the cast');
    }
  }
});

test('the cast plays every painted pose once, holds anticipation, and returns to the exact ready drawing',()=>{
  for(const avatar of ['boy','girl']){
    const frames=new Set();
    for(let ms=0;ms<=Cast.DURATION;ms++)frames.add(Cast.pose(ms/Cast.DURATION,avatar).frame);
    assert.deepEqual([...frames],[0,1,2,3,4,5,6,7,8,9,10,11]);
    for(let i=0;i<12;i++)assert.equal(Cast.frameAt(Cast.timeline[i]/Cast.DURATION),i,'frame boundary '+i);
    const first=Cast.pose(0,avatar),last=Cast.pose(1,avatar);
    assert.deepEqual({...last,t:0},first,'ending uses the original ready cell with identical hand and foot positions');
    assert.equal(Cast.frameAt(Cast.RELEASE-1e-7),Cast.frameAt(Cast.RELEASE+1e-7),'release happens within one painted pose, avoiding a launch jump');
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
