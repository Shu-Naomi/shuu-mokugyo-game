const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {createCanvas,loadImage}=require('@napi-rs/canvas');
const {boot,seed,read,saveKey}=require('./game-harness.cjs'),{findRoute}=require('./water-routes-v220.cjs');
const {cases,routeTo}=require('./wetland-v227.cjs'),M=require('../mountain-region.js'),Art=require('../fish-art.js'),Layers=require('../scene-layers.js');
const root=path.join(__dirname,'..');
test('wetland is reachable on foot from the marsh; all three banks and the return remain usable after reload',()=>{
 const app=boot({...seed(),hp:100,soundEnabled:false,mapRegion:'mountainMarsh',...M.regions.mountainMarsh.entry}),w=app.window;let snapshot;
 try{
  const before=read(w,'s.gameMinutes'),route=routeTo(w,'mountainMarsh',(x,y)=>M.landmarkAt(x,y,'mountainMarsh')?.id==='wetland');
  assert.ok(route.length>20);for(const d of route)w.move(d);w.document.querySelector('#action').click();
  assert.equal(read(w,'s.mapRegion'),'wetland');assert.equal(read(w,'s.lakeStory.visited.wetland'),true);
  for(const type of ['wetPond','wetCreek','wetMarsh']){
   const r=findRoute(w,type);for(const d of r.path)w.move(d);assert.equal(read(w,'nearbyFishingSpot().mountainType'),type);
  }
  assert.equal(read(w,'s.gameMinutes'),before,'ordinary walking follows the existing clock rule');
  w.eval('save()');snapshot=JSON.parse(w.localStorage.getItem(saveKey));assert.deepEqual(app.errors,[]);
 }finally{app.dispose();}
 const restored=boot(snapshot),r=restored.window;
 try{assert.equal(read(r,'s.mapRegion'),'wetland');for(const d of routeTo(r,'wetland',(x,y)=>M.atReturnGate(x,y,'wetland')))r.move(d);
  r.document.querySelector('#action').click();assert.equal(read(r,'s.mapRegion'),'mountainMarsh');assert.ok(M.walkable(read(r,'s.x'),read(r,'s.y'),'mountainMarsh'));assert.deepEqual(restored.errors,[]);
 }finally{restored.dispose();}
});
test('wetland water cannot be walked through; the single bridge crosses the creek safely',()=>{
 for(const [x,y,type]of [[50,40,'wetPond'],[116,35,'wetCreek'],[185,78,'wetMarsh']]){
  assert.equal(M.waterType(x,y,'wetland'),type);assert.equal(M.walkable(x,y,'wetland'),false);
 }
 for(let x=100;x<=125;x++)assert.ok(M.walkable(x,58,'wetland'),'bridge '+x);
 assert.equal(M.waterType(112,58,'wetland'),null);assert.equal(M.fishingWater(112,58,'down','wetland'),null);
});
test('all six ordinary fish can be cast, hooked, caught once, rendered in the tank and restored with their records',()=>{
 for(const [id,type,bait,hook]of cases){
  const app=boot({...seed(),hp:100,gameMinutes:600,soundEnabled:false,mapRegion:'wetland',...M.regions.wetland.entry,
   baits:{worm:10,river:10,paste:10,liveMinnow:10},selectedBait:bait,selectedHook:hook,selectedRod:'starGazer',ownedRods:['bamboo','starGazer']}),w=app.window;let snapshot;
  try{
   for(const d of findRoute(w,type).path)w.move(d);const fillets=read(w,'s.cookingIngredients.fishFillet');
   w.document.querySelector('#action').click();assert.equal(read(w,'battle?.phase'),'prep');w.eval('beginFishing();clearInterval(timer)');
   const spot='mountain-'+type+'-mid';let roll=-1;
   for(let n=0;n<1000;n++){w.eval('Math.random=()=>'+n/1000);if(read(w,`pick(50,'${spot}').id`)===id){roll=n/1000;break;}}
   assert.ok(roll>=0,id+' has nonzero odds');w.eval(`Math.random=()=>${roll};commitCastResources();resolveSurfaceCast(50);clearInterval(timer);startFight();clearInterval(timer);finishHookReveal();renderBattleFish()`);
   assert.equal(read(w,'battle.f.id'),id);assert.equal(read(w,'battle.spot'),spot);assert.equal(w.document.querySelector('#battleFish canvas').dataset.artSpecies,id);
   const ownName=read(w,`fish.find(f=>f.id==='${id}').name`),moods=read(w,`fightProfiles.${id}.moods`);
   for(const other of read(w,'fish').filter(f=>f.id!==id))assert.ok(!moods.some(m=>[m.hold,m.loose].some(text=>text?.includes(other.name))),ownName+' instructions name the hooked fish');
   assert.equal(read(w,`s.baits.${bait}`),9);w.eval('caught();caught()');assert.equal(read(w,`s.caught.${id}`),1);assert.equal(read(w,'s.cookingIngredients.fishFillet'),fillets+1);
   assert.equal(w.document.querySelector('#catchFish canvas').dataset.artSpecies,id);assert.equal(read(w,`s.fishCatchRecords.${id}.last.spotId`),spot);
   w.eval(`hideCatchCard();renderRecord();drawAquariumSprite($('#homeAquariumFish'),'${id}',4,{spriteMode:'turn',yaw:Math.PI/2,turnFrame:2});save()`);
   assert.equal(w.document.querySelector('#homeAquariumFish canvas').dataset.artSpecies,id);assert.ok(read(w,'petCatalog').some(f=>f.id===id));
   assert.equal(read(w,`fishSizeProfiles.${id}.length`),6);
   const dex=w.document.createElement('div');dex.innerHTML=read(w,`fishdexKnownDetail(fish.find(f=>f.id==='${id}'))`);
   assert.ok([...dex.querySelectorAll('.fishdex-chip')].some(el=>el.textContent.trim().endsWith(w.ShuTackle.hooks[hook].name)),ownName+' recommends the preferred hook');
   if(id==='nigoi'){assert.equal(w.ShuTackle.species.nigoi.band,'large');assert.ok(w.ShuTackle.weight(id,bait,hook)>w.ShuTackle.weight(id,bait,'large'));}
   snapshot=JSON.parse(w.localStorage.getItem(saveKey));assert.deepEqual(app.errors,[]);
  }finally{app.dispose();}
  const restored=boot(snapshot);try{assert.equal(read(restored.window,`s.caught.${id}`),1);assert.equal(read(restored.window,`s.fishCatchRecords.${id}.last.spotId`),spotName(type));assert.deepEqual(restored.errors,[]);}finally{restored.dispose();}
 }
});
function spotName(type){return 'mountain-'+type+'-mid';}
test('six native atlases preserve a visible continuous silhouette through 97 turning samples',async()=>{
 for(const [id]of cases){
  const image=await loadImage(path.join(root,Art.species[id].asset)),ctx=createCanvas(448,224).getContext('2d');let prev,sideArea=0,front=0;
  for(let n=0;n<=96;n++){
   assert.equal(Art.draw(ctx,image,id,7,n/16,()=>image),true);const data=ctx.getImageData(0,0,448,224).data;let left=448,right=0,count=0,edges=0;
   for(let i=0;i<448*224;i++)if(data[i*4+3]>100){const x=i%448,y=Math.floor(i/448);left=Math.min(left,x);right=Math.max(right,x);count++;if(x<2||x>445||y<2||y>221)edges++;}
   if(n===0)sideArea=count;assert.ok(count>Math.max(2500,sideArea*.22),id+' visible '+n);assert.equal(edges,0,id+' no clipping '+n);
   const shape={width:right-left+1,center:(left+right)/2};if(prev){assert.ok(Math.abs(shape.width-prev.width)<=20,id+' width continuity '+n);assert.ok(Math.abs(shape.center-prev.center)<=10,id+' body continuity '+n);}prev=shape;
   if(n===48)front=shape.width;if(n===96)assert.ok(front>shape.width*.3,id+' rounded frontal body');
  }
 }
});
test('39 stable catalogue entries, distinct wetland surfaces and offline art work with an existing save',()=>{
 const app=boot(),w=app.window;
 try{
  assert.equal(read(w,'fish.length'),39);assert.equal(read(w,'fishEncyclopediaData.ugui.number'),31);
  assert.deepEqual(read(w,'[fishEncyclopediaData.tanago.number,fishEncyclopediaData.motsugo.number,fishEncyclopediaData.medaka.number,fishEncyclopediaData.kamatsuka.number,fishEncyclopediaData.nigoi.number,fishEncyclopediaData.raigyo.number]'),[34,35,36,37,38,39]);
  for(const spot of read(w,'fishingSpots'))for(const [id]of cases)if(spot.weights[id])assert.match(spot.id,/^mountain-wet/);
  const sw=fs.readFileSync(path.join(root,'sw.js'),'utf8');for(const f of ['wetland-world','wetland-cast',...cases.map(([id])=>'fish-'+id)])assert.ok(sw.includes('assets/'+f+'-v227.png'));
  assert.equal(new Set(['wetPond','wetCreek','wetMarsh'].map(k=>JSON.stringify(Layers.get('surface-mountain-'+k).sourceRect))).size,3);
  for(const type of ['wetPond','wetCreek','wetMarsh'])assert.equal(Layers.get('surface-mountain-'+type).source,'assets/wetland-cast-v227.png');
  assert.deepEqual(app.errors,[]);
 }finally{app.dispose();}
});
