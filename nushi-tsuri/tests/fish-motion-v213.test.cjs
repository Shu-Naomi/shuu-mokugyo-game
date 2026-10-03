const {test}=require('node:test'),assert=require('node:assert/strict'),path=require('node:path');
const {createCanvas,loadImage}=require('@napi-rs/canvas');
const Art=require('../fish-art.js'),{boot,read}=require('./game-harness.cjs');

test('every fish has distinct complete intermediate turn silhouettes, including the front and reversed side',async()=>{
  const images=new Map(),canvas=createCanvas(448,224),ctx=canvas.getContext('2d');
  for(const [id,species]of Object.entries(Art.species)){
    for(const src of Art.assets(id))if(!images.has(src))images.set(src,await loadImage(path.join(__dirname,'..',src)));
    let previous=null;
    for(let step=0;step<=24;step++){
      const frame=step/4;assert.equal(Art.draw(ctx,images.get(species.asset),id,7,frame,src=>images.get(src)),true);
      const bytes=Buffer.from(ctx.getImageData(0,0,448,224).data);let visible=0,edge=0;
      for(let n=0;n<448*224;n++)if(bytes[n*4+3]>100){visible++;const x=n%448,y=Math.floor(n/448);if(x<2||x>445||y<2||y>221)edge++;}
      assert.ok(visible>3500,`${id}/${frame} complete body`);assert.equal(edge,0,`${id}/${frame} unclipped`);
      if(previous)assert.notDeepEqual(bytes,previous,`${id}/${frame} changes between authored headings`);
      previous=bytes;
    }
  }
});

test('tail strokes and mouth-open swimming leave every head stationary without pitching the fish up and down',async()=>{
  const app=boot(),w=app.window,images=new Map();
  try{
    w.eval('cast();beginFishing();clearInterval(timer);battle.cast=50;launchSurfaceCast();settleSurfaceCast();startFight();stopBattleFishArt();finishHookReveal()');
    for(const [id,species]of Object.entries(Art.species)){
      const values=read(w,`(()=>{battle.f=fish.find(f=>f.id==='${id}');battle.reeling=false;battle.swimPhase=0;return Array.from({length:24},()=>{const motion=animateFishBody({calm:false},2);return [battle.visualOffsetY,motion.roll,battle.bodySquash];});})()`);
      assert.ok(values.every(v=>v[0]===0&&v[1]===0&&v[2]===1),id+' lateral beat has no vertical bob or roll');
      for(const src of Art.assets(id))if(!images.has(src))images.set(src,await loadImage(path.join(__dirname,'..',src)));
      const ctx=createCanvas(448,224).getContext('2d'),image=images.get(species.asset),resolve=src=>images.get(src);
      Art.draw(ctx,image,id,3,2,resolve,{swimFrame:2});const first=Buffer.from(ctx.getImageData(0,0,448,224).data);
      const head=Buffer.from(ctx.getImageData(345,0,103,224).data);
      Art.draw(ctx,image,id,3,2,resolve,{swimFrame:6});
      assert.notDeepEqual(Buffer.from(ctx.getImageData(0,0,448,224).data),first,id+' breathing retains the lateral stroke');
      assert.deepEqual(Buffer.from(ctx.getImageData(345,0,103,224).data),head,id+' mouth stays still during the stroke');
    }
    assert.deepEqual(app.errors,[]);
  }finally{app.dispose();}
});

test('fractional battle and tank turns use the same fractional mouth anchor without changing saves',()=>{
  const app=boot(),w=app.window;
  try{
    w.eval('cast();beginFishing();clearInterval(timer);battle.cast=50;launchSurfaceCast();settleSurfaceCast();startFight();stopBattleFishArt();finishHookReveal()');
    const before=read(w,'s');
    for(const frame of [1.25,2.5,3.75,5.5]){
      w.eval(`Object.assign(battle,{turning:{from:1,to:-1},turnSpriteFrame:${frame},artTickAt:null});renderBattleFish();drawBattle();drawAquariumSprite($('#homeAquariumFish'),'ayu',0,{spriteMode:'turn',yaw:${frame}/6*Math.PI})`);
      assert.equal(w.document.querySelector('#battleFish').dataset.spriteFrame,String(frame));
      assert.match(w.document.querySelector('#homeAquariumFish canvas').dataset.atlasKey,new RegExp('\\|7\\|'+String(frame).replace('.','\\.')+'\\|'));
      assert.ok(read(w,'Object.values(battleMouthAndHook()).filter(v=>typeof v==="number")').every(Number.isFinite));
    }
    assert.deepEqual(read(w,'s'),before);assert.deepEqual(app.errors,[]);
  }finally{app.dispose();}
});
