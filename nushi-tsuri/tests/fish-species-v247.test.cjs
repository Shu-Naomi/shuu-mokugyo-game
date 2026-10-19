const {test}=require('node:test'),assert=require('node:assert/strict'),path=require('node:path');
const {createCanvas,loadImage}=require('@napi-rs/canvas');
const {boot,seed,read,saveKey}=require('./game-harness.cjs'),A=require('../fish-art.js'),F=require('../fish-additions.js'),D=require('../fishing-duel.js'),L=require('../aquarium-life.js');
const cases=[['oyanirami','river','river','small',20,50],['akakamasu','sea','liveMinnow','medium',50,51],['ishidai','sea','shell','large',80,52]];
for(const mode of ['gauge','nushi'])test('three new species encounter, hook and land once with real tackle, record, tank, growth and saved restoration: '+mode,()=>{
 for(const [id,zone,bait,hook,distance,number]of cases){
  const app=boot({...seed(),soundEnabled:false,hp:100,gameMinutes:600,money:30000,mapRegion:'village',x:zone==='sea'?210:123,y:zone==='sea'?104:92,
   ownedRods:['bamboo','tideMaster','lureRod'],selectedRod:'tideMaster',selectedBait:bait,selectedHook:hook,fightMode:mode,baits:{worm:10,river:10,liveMinnow:10,shell:10}}),w=app.window;let saved;
  try{
   w.eval(`cast({zone:'${zone}',waterZone:'${zone}',waterX:s.x,waterY:s.y+6});beginFishing();clearInterval(timer)`);
   const spot=zone+'-'+(distance<34?'shallow':distance<67?'mid':'deep');let roll;
   for(let n=0;n<1000;n++){w.eval('Math.random=()=>'+n/1000);if(read(w,`pick(${distance},'${spot}')?.id`)===id){roll=n/1000;break;}}
   assert.notEqual(roll,undefined,id+' has normal bait odds');const fillet=read(w,'s.cookingIngredients.fishFillet');
   w.eval(`Math.random=()=>${roll};commitCastResources();resolveSurfaceCast(${distance});clearInterval(timer);startFight();clearInterval(timer);finishHookReveal();renderBattleFish()`);
   assert.equal(read(w,'battle.f.id'),id);assert.equal(read(w,'battle.fightMode'),mode);assert.equal(read(w,'s.baits.'+bait),9);
   assert.equal(w.document.querySelector('#battleFish canvas').dataset.artSpecies,id);const specimen=read(w,'battle.specimen');
   w.eval('caught();caught()');assert.equal(read(w,'s.caught.'+id),1);assert.equal(read(w,'s.cookingIngredients.fishFillet'),fillet+1);
   assert.equal(read(w,'s.fishCatchRecords.'+id+'.last.spotId'),spot);assert.equal(read(w,'s.catchMemories.'+id+'.first.fightMode'),mode);
   assert.equal(read(w,'s.catchMemories.'+id+'.first.hundredths'),specimen.hundredths);
   assert.equal(read(w,'fishEncyclopediaData.'+id+'.number'),number);assert.equal(read(w,'fish.length'),52);
   assert.equal(read(w,`petCatalog.find(f=>f.id==='${id}').waterLabel`),zone==='sea'?'海水':'淡水');
   w.eval(`hideCatchCard();var newFish247=ShuPetLife.acquire(s,'${id}',petCatalog,0);`);assert.equal(read(w,'newFish247.ok'),true);
   const length=read(w,'newFish247.fish.length');w.eval('ShuPetLife.buyFood(s,1);var fed247=ShuPetLife.care(s,newFish247.fish.uid,"feed",0,petCatalog);ShuPetLife.sync(s,petCatalog,1);save()');assert.equal(read(w,'fed247.ok'),true);assert.ok(read(w,'newFish247.fish.length')>length);assert.equal(read(w,'s.caught.'+id),1);
   saved=JSON.parse(w.localStorage.getItem(saveKey));assert.ok(saved.petLife.fish.some(f=>f.species===id));assert.deepEqual(app.errors,[]);
  }finally{app.dispose();}
  const restored=boot(saved);try{assert.equal(read(restored.window,'s.caught.'+id),1);assert.ok(read(restored.window,`s.petLife.fish.some(f=>f.species==='${id}')`));assert.deepEqual(restored.errors,[]);}finally{restored.dispose();}
 }
});
test('new fish have distinct original source atlases, stable lips and unclipped complete silhouettes through every heading',async()=>{
 for(const [id]of cases){
  const d=F.definitions.find(f=>f.id===id);assert.notEqual(A.species[id].asset,A.species[d.base].asset);assert.ok(D.spoon[id]>0);assert.ok(D.fishStrength[id]>0);assert.ok(D.rhythm(id));
  const image=await loadImage(path.join(__dirname,'..',A.species[id].asset)),ctx=createCanvas(448,224).getContext('2d');
  for(let n=0;n<=96;n++){
   A.draw(ctx,image,id,7,n/16,()=>image);const pixels=ctx.getImageData(0,0,448,224).data;let count=0,edge=0;
   for(let i=0;i<448*224;i++)if(pixels[i*4+3]>100){count++;const x=i%448,y=Math.floor(i/448);if(x<2||x>445||y<2||y>221)edge++;}
   assert.ok(count>3500,id+' body '+n);assert.equal(edge,0,id+' fins '+n);
   const head=A.pose(id,7,n/16).target;assert.ok(ctx.getImageData(Math.round(head[0]*448)-6,Math.round(head[1]*224)-6,13,13).data.some((v,i)=>i%4===3&&v>100),id+' lip '+n);
  }
 }
 assert.notDeepEqual(L.gait('oyanirami'),L.gait('akakamasu'));assert.notDeepEqual(D.rhythm('oyanirami'),D.rhythm('ishidai'));assert.notDeepEqual(D.rhythm('akakamasu'),D.rhythm('ishidai'));
});

test('each addition has natural spoon odds at the documented water and depth',()=>{
 const app=boot({...seed(),soundEnabled:false,ownedRods:['bamboo','lureRod'],selectedRod:'lureRod',fishingMethod:'lure'}),w=app.window;
 try{for(const [id,zone,,,distance]of cases){
  w.eval(`cast({zone:'${zone}',waterZone:'${zone}',waterX:s.x,waterY:s.y+6});beginFishing();clearInterval(timer);battle.method="lure"`);
  const spot=zone+'-'+(distance<34?'shallow':distance<67?'mid':'deep');let found=false;
  for(let n=0;n<1000;n++){w.eval('Math.random=()=>'+n/1000);if(read(w,`pick(${distance},'${spot}')?.id`)===id){found=true;break;}}
  assert.ok(found,id+' is reachable by spoon');w.eval('endBattle()');
 }assert.deepEqual(app.errors,[]);}finally{app.dispose();}
});
