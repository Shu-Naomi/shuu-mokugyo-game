const {test}=require('node:test'),assert=require('node:assert/strict'),path=require('node:path'),fs=require('node:fs');
const {createCanvas,loadImage}=require('@napi-rs/canvas'),Art=require('../fish-art.js'),R=require('../regional-nushi.js');
const {boot,seed,read,saveKey}=require('./game-harness.cjs');
const {findRoute}=require('./water-routes-v220.cjs');
const newFish=['ugui','oikawa','kawahagi'];

test('new fish are ungated and catchable with ordinary bait, with distinct habitats and compatible old boss unlocks',()=>{
 const app=boot(),w=app.window;
 try{
  for(const [id,spots,bait,hook]of [
   ['ugui',['river-shallow','river-mid','river-deep','mountain-stream-shallow','mountain-stream-mid','mountain-stream-deep'],'worm','medium'],
   ['oikawa',['river-shallow','river-mid','river-deep','lake-shallow'],'river','small'],
   ['kawahagi',['sea-shallow','sea-mid','coast-sand-shallow','coast-sand-mid','coast-reef-shallow','coast-reef-mid','coast-reef-deep'],'shell','small']]){
   w.eval(`let rng_${id}=221;Math.random=()=>((rng_${id}=Math.imul(rng_${id},1664525)+1013904223>>>0)/4294967296);battle={method:'bait',bait:'${bait}',hook:'${hook}',practice:false}`);
   for(const spot of spots){const picks=read(w,`Array.from({length:800},()=>pick(50,'${spot}')?.id)`);assert.ok(picks.filter(x=>x===id).length>25,id+' practical '+spot);}
   for(const spot of read(w,'fishingSpots'))assert.equal(Boolean(spot.weights[id]),spots.includes(spot.id),id+' habitat '+spot.id);
   assert.ok(w.ShuTackle.weight(id,bait,hook)>w.ShuTackle.weight(id,bait,'large')*2);
  }
  const old={regionalCatchVersion:1,regionalCaught:Object.fromEntries(Object.entries(R.ordinary).map(([region,ids])=>[region,Object.fromEntries(ids.map(id=>[id,1]))]))};R.normalize(old);
  for(const region of Object.keys(R.ordinary))assert.equal(R.complete(old,region),true,'old '+region+' boss still unlocks');
  assert.deepEqual(app.errors,[]);
 }finally{app.dispose();}
});

test('actual casts catch all three once, grant ingredients, render fight/catch/dex/tank, and reload the records',()=>{
 const cases=[['ugui','village',123,92,'left','river-mid','worm','medium'],
  ['oikawa','village',123,92,'left','river-mid','river','small'],
  ['kawahagi','coast',95,84,'up','coast-reef-mid','shell','small']];
 for(const [id,region,x,y,direction,spotId,bait,hook]of cases){
  let snapshot;const app=boot({...seed(),hp:100,mapRegion:region,x,y,direction,boatActive:region==='coast',ownedVehicles:['canoe'],equipment:{vehicle:'canoe'},
   baits:{worm:8,river:8,shell:8},selectedBait:bait,selectedHook:hook,selectedRod:'clearStream',soundEnabled:false}),w=app.window;
  try{
   const route=findRoute(w,{ugui:'river',oikawa:'river',kawahagi:'reef'}[id]);
   for(const direction of route.path)w.move(direction);
   const ingredients=read(w,'s.cookingIngredients.fishFillet');w.document.querySelector('#action').click();
   assert.equal(read(w,'battle?.phase'),'prep',id+' reachable casting entry');w.eval('beginFishing();clearInterval(timer)');
   let roll=-1;
   for(let n=0;n<1000;n++){w.eval(`Math.random=()=>${n/1000}`);if(read(w,`pick(50,'${spotId}').id`)===id){roll=n/1000;break;}}
   assert.ok(roll>=0);w.eval(`Math.random=()=>${roll};resolveSurfaceCast(50);clearInterval(timer)`);
   assert.equal(read(w,'battle.f.id'),id);assert.equal(read(w,'battle.spot'),spotId);
   w.eval('startFight();clearInterval(timer);finishHookReveal();renderBattleFish()');
   assert.equal(w.document.querySelector('#battleFish canvas').dataset.artSpecies,id);
   w.eval('caught();caught()');assert.equal(read(w,`s.caught.${id}`),1);assert.equal(read(w,'s.cookingIngredients.fishFillet'),ingredients+1);
   assert.equal(read(w,`s.fishCatchRecords.${id}.last.spotId`),spotId);
   assert.equal(w.document.querySelector('#catchFish canvas').dataset.artSpecies,id);
   w.eval(`hideCatchCard();renderRecord();drawAquariumSprite($('#homeAquariumFish'),'${id}',4,{spriteMode:'turn',yaw:Math.PI/2,turnFrame:2})`);
   assert.equal(w.document.querySelector('#homeAquariumFish canvas').dataset.artSpecies,id);
   assert.ok(read(w,'petCatalog').some(f=>f.id===id));assert.equal(read(w,`fishSizeProfiles.${id}.length`),6);
   assert.ok(read(w,`fishEncyclopediaData.${id}.number`)>=31);
   w.eval('save()');snapshot=JSON.parse(w.localStorage.getItem(saveKey));assert.deepEqual(app.errors,[]);
  }finally{app.dispose();}
  const restored=boot(snapshot);try{assert.equal(read(restored.window,`s.caught.${id}`),1);assert.equal(read(restored.window,`s.fishCatchRecords.${id}.last.spotId`),spotId);assert.deepEqual(restored.errors,[]);}finally{restored.dispose();}
 }
});

test('new originals retain their species silhouette and smooth body position across all 97 yaw samples, without clipping or low-alpha backdrop',async()=>{
 const bounds=[];
 for(const id of newFish){
  const im=await loadImage(path.join(__dirname,'..',Art.species[id].asset)),ctx=createCanvas(448,224).getContext('2d'),shapes=[];
  Art.draw(ctx,im,id,7,0,()=>im);const initial=ctx.getImageData(0,0,448,224).data;let sideArea=0;for(let i=3;i<initial.length;i+=4)if(initial[i]>100)sideArea++;
  for(let n=0;n<=96;n++){
   assert.equal(Art.draw(ctx,im,id,7,n/16,()=>im),true);const pixels=ctx.getImageData(0,0,448,224).data;
   let left=448,right=0,count=0,edge=0;
   for(let i=0;i<448*224;i++)if(pixels[i*4+3]>100){const x=i%448,y=Math.floor(i/448);left=Math.min(left,x);right=Math.max(right,x);count++;if(x<2||x>445||y<2||y>221)edge++;}
   assert.ok(count>Math.max(3000,sideArea*.25),id+' intact species silhouette '+n);assert.equal(edge,0,id+' no clipping '+n);
   const shape={width:right-left+1,center:(left+right)/2};if(shapes.length){const prev=shapes.at(-1);assert.ok(Math.abs(prev.center-shape.center)<=10,id+' no body jumps at '+n);assert.ok(Math.abs(prev.width-shape.width)<=20,id+' gradual turn at '+n);}shapes.push(shape);
  }
  assert.ok(shapes[48].width>shapes[0].width*.3,id+' rounded frontal view');
  const src=createCanvas(im.width,im.height),source=src.getContext('2d');source.drawImage(im,0,0);
  assert.equal(source.getImageData(0,0,1,1).data[3],0,id+' source is transparent');
  bounds.push({id,scale:Art.scaleFor(id)});
 }
 for(const id of newFish)assert.ok(fs.readFileSync(path.join(__dirname,'../sw.js'),'utf8').includes(Art.species[id].asset));
});
