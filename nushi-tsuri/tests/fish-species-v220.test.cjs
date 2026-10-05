const {test}=require('node:test'),assert=require('node:assert/strict'),path=require('node:path'),fs=require('node:fs');
const {createCanvas,loadImage}=require('@napi-rs/canvas'),Art=require('../fish-art.js'),R=require('../regional-nushi.js');
const {boot,seed,read,saveKey}=require('./game-harness.cjs');
const {findRoute}=require('./water-routes-v220.cjs');
const newFish=['wakasagi','dojo','isaki'];

test('new fish have practical ungated bait odds in their own waters and do not spread to unrelated waters',()=>{
 const app=boot(),w=app.window;
 try{
  w.eval('let addedFishRng=220;Math.random=()=>((addedFishRng=Math.imul(addedFishRng,1664525)+1013904223>>>0)/4294967296)');
  for(const [id,prefixes,bait,hook]of [
   ['wakasagi',['lake','mountain-pond','mountain-highPond'],'river','small'],
   ['dojo',['river','mountain-marsh','mountain-highMarsh'],'worm','small'],
   ['isaki',['coast-reef'],'shrimp','medium']]){
   for(const prefix of prefixes)for(const depth of ['shallow','mid','deep']){
    w.eval(`battle={method:'bait',bait:'${bait}',hook:'${hook}',practice:false}`);
    const picks=read(w,`Array.from({length:500},()=>pick(50,'${prefix}-${depth}')?.id)`);
    assert.ok(picks.filter(v=>v===id).length>20,id+' can be caught in '+prefix+'/'+depth);
   }
  }
  for(const spot of read(w,'fishingSpots')){
   for(const id of newFish){const allowed=id==='wakasagi'?/^(lake|mountain-(pond|highPond))-/.test(spot.id):id==='dojo'?/^(river|mountain-(marsh|highMarsh))-/.test(spot.id):/^coast-reef-/.test(spot.id);
    assert.equal(Boolean(spot.weights[id]),allowed,id+' habitat '+spot.id);
   }
  }
  const old={regionalCatchVersion:1,regionalCaught:Object.fromEntries(Object.entries(R.ordinary).map(([region,ids])=>[region,Object.fromEntries(ids.map(id=>[id,1]))]))};R.normalize(old);
  for(const region of Object.keys(R.ordinary))assert.equal(R.complete(old,region),true,'legacy '+region+' boss still unlocks');
  assert.deepEqual(app.errors,[]);
 }finally{app.dispose();}
});

test('actual casts catch all three once, grant ingredients, render fight/catch/dex/tank, and reload the records',()=>{
 const cases=[['wakasagi','village',125,58,'up','lake-mid','river','small'],
  ['dojo','stream',172,96,'right','mountain-marsh-mid','worm','small'],
  ['isaki','coast',95,84,'up','coast-reef-mid','shrimp','medium']];
 for(const [id,region,x,y,direction,spotId,bait,hook]of cases){
  let snapshot;const app=boot({...seed(),hp:100,mapRegion:region,x,y,direction,boatActive:region==='coast',ownedVehicles:['canoe'],equipment:{vehicle:'canoe'},
   baits:{worm:8,river:8,shrimp:8},selectedBait:bait,selectedHook:hook,selectedRod:'clearStream',soundEnabled:false}),w=app.window;
  try{
   const route=findRoute(w,{wakasagi:'lake',dojo:'marsh',isaki:'reef'}[id]);
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
   assert.ok(read(w,`fishEncyclopediaData.${id}.number`)>=28);
   w.eval('save()');snapshot=JSON.parse(w.localStorage.getItem(saveKey));assert.deepEqual(app.errors,[]);
  }finally{app.dispose();}
  const restored=boot(snapshot);try{assert.equal(read(restored.window,`s.caught.${id}`),1);assert.equal(read(restored.window,`s.fishCatchRecords.${id}.last.spotId`),spotId);assert.deepEqual(restored.errors,[]);}finally{restored.dispose();}
 }
});

test('new originals retain volume and smooth body position across all 97 yaw samples, without clipping or low-alpha backdrop',async()=>{
 const bounds=[];
 for(const id of newFish){
  const im=await loadImage(path.join(__dirname,'..',Art.species[id].asset)),ctx=createCanvas(448,224).getContext('2d'),shapes=[];
  for(let n=0;n<=96;n++){
   assert.equal(Art.draw(ctx,im,id,7,n/16,()=>im),true);const pixels=ctx.getImageData(0,0,448,224).data;
   let left=448,right=0,count=0,edge=0;
   for(let i=0;i<448*224;i++)if(pixels[i*4+3]>100){const x=i%448,y=Math.floor(i/448);left=Math.min(left,x);right=Math.max(right,x);count++;if(x<2||x>445||y<2||y>221)edge++;}
   assert.ok(count>5000,id+' full silhouette '+n);assert.equal(edge,0,id+' no clipping '+n);
   const shape={width:right-left+1,center:(left+right)/2};if(shapes.length){const prev=shapes.at(-1);assert.ok(Math.abs(prev.center-shape.center)<=10,id+' no body jumps at '+n);assert.ok(Math.abs(prev.width-shape.width)<=20,id+' gradual turn at '+n);}shapes.push(shape);
  }
  assert.ok(shapes[48].width>shapes[0].width*.3,id+' rounded frontal view');
  const src=createCanvas(im.width,im.height),source=src.getContext('2d');source.drawImage(im,0,0);
  assert.equal(source.getImageData(0,0,1,1).data[3],0,id+' source is transparent');
  bounds.push({id,scale:Art.scaleFor(id)});
 }
 for(const id of newFish)assert.ok(fs.readFileSync(path.join(__dirname,'../sw.js'),'utf8').includes(Art.species[id].asset));
});
