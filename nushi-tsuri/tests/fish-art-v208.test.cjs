const {test}=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const {createCanvas,loadImage}=require('@napi-rs/canvas');
const Art=require('../fish-art.js'),{boot,read}=require('./game-harness.cjs');

test('all 27 fish paint complete, unclipped silhouettes in every swim, turn and jaw pose',async()=>{
  const images=new Map(),canvas=createCanvas(448,224),ctx=canvas.getContext('2d');
  assert.equal(Object.keys(Art.species).length,27);
  for(const [id,species]of Object.entries(Art.species)){
    for(const asset of Art.assets(id))if(!images.has(asset))images.set(asset,await loadImage(path.join(__dirname,'..',asset)));
    const image=images.get(species.asset);
    for(const cells of [8,7,3])for(let frame=0;frame<cells;frame++){
      assert.equal(Art.draw(ctx,image,id,cells,frame,src=>images.get(src)),true);
      const data=ctx.getImageData(0,0,448,224).data;let opaque=0,edge=0;
      for(let n=0;n<448*224;n++)if(data[n*4+3]>100){
        opaque++;const x=n%448,y=Math.floor(n/448);if(x<2||x>445||y<2||y>221)edge++;
      }
      assert.ok(opaque>3500,`${id} ${cells}/${frame}: visible body, fins and tail`);
      assert.equal(edge,0,`${id} ${cells}/${frame}: no clipping`);
    }
  }
});

test('real tail beats change the rear projection while every fish keeps its head still',async()=>{
  const images=new Map();
  for(const [id,species]of Object.entries(Art.species)){
    for(const asset of Art.assets(id))if(!images.has(asset))images.set(asset,await loadImage(path.join(__dirname,'..',asset)));
    const canvas=createCanvas(448,224),ctx=canvas.getContext('2d'),image=images.get(species.asset);
    Art.draw(ctx,image,id,8,2,src=>images.get(src));const first=Buffer.from(ctx.getImageData(0,0,448,224).data);
    Art.draw(ctx,image,id,8,6,src=>images.get(src));const second=Buffer.from(ctx.getImageData(0,0,448,224).data);
    assert.notDeepEqual(first,second,id+' has an actual animated tail');
    const head=()=>Buffer.from(ctx.getImageData(345,0,103,224).data);
    Art.draw(ctx,image,id,8,2,src=>images.get(src));const a=head();Art.draw(ctx,image,id,8,6,src=>images.get(src));
    assert.deepEqual(head(),a,id+' has a stationary head and lip');
  }
});

test('battle, catch, aquarium and dex use the new species cells and seven headings without mutating progress',()=>{
  const app=boot(),w=app.window;
  try{
    w.eval('cast(fishingSpots[0]);beginFishing();clearInterval(timer);battle.cast=50;launchSurfaceCast();settleSurfaceCast();startFight();clearInterval(timer);finishHookReveal()');
    const before=read(w,'s');
    for(const id of read(w,'fish.map(f=>f.id)')){
      for(const mode of ['swim','turn','mouth']){
        w.eval(`Object.assign(battle,{f:fish.find(f=>f.id==='${id}'),mouthState:'${mode==='mouth'?'open':'closed'}',turning:${mode==='turn'?'{from:1,to:-1}':'null'},turnSpriteFrame:3,sandLifted:true});renderBattleFish()`);
        const el=w.document.querySelector('#battleFish'),c=el.querySelector('canvas');
        assert.equal(el.dataset.spriteMode,mode);assert.equal(c.dataset.artSpecies,id);
        assert.equal(c.width,448);assert.equal(c.height,224);assert.equal(c.style.display,'block');
        assert.doesNotMatch(w.getComputedStyle(el).backgroundImage,/url\(/);
        if(mode==='turn')assert.match(c.dataset.atlasKey,/\|7\|3\|/);
      }
      w.eval(`renderCatchFishLife(fish.find(f=>f.id==='${id}'),5);drawAquariumSprite($('#homeAquariumFish'),'${id}',4,{spriteMode:'turn',yaw:Math.PI/2,turnFrame:2})`);
      assert.equal(w.document.querySelector('#catchFish canvas').dataset.artSpecies,id);
      assert.match(w.document.querySelector('#homeAquariumFish canvas').dataset.atlasKey,/\|7\|3\|/);
    }
    assert.deepEqual(read(w,'s'),before);assert.deepEqual(app.errors,[]);
  }finally{app.dispose();}
});

test('new fish sources and painter are available offline; original fight strengths remain intact',()=>{
  const sw=fs.readFileSync(path.join(__dirname,'../sw.js'),'utf8');
  assert.ok(sw.includes('fish-art.js?v=219-1'));
  for(const asset of new Set(Object.keys(Art.species).flatMap(id=>Art.assets(id))))assert.ok(sw.includes(asset),asset);
  const app=boot();try{
    assert.deepEqual(read(app.window,'fish.map(f=>f.id).sort()'),Object.keys(Art.species).sort());
    assert.equal(read(app.window,'fish.find(f=>f.id==="shirogisu").resistance'),84);
    assert.equal(read(app.window,'fish.find(f=>f.id==="nushi").resistance'),210);
    assert.deepEqual(app.errors,[]);
  }finally{app.dispose();}
});
