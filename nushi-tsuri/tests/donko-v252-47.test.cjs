const {test}=require('node:test'),assert=require('node:assert/strict'),path=require('node:path'),fs=require('node:fs');
const {createCanvas,loadImage}=require('@napi-rs/canvas');
const {boot,seed,read,saveKey}=require('./game-harness.cjs'),A=require('../fish-art.js'),F=require('../fish-additions.js'),D=require('../fishing-duel.js'),L=require('../aquarium-life.js'),R=require('../regional-nushi.js');
const base=()=>({...seed(),soundEnabled:false,hp:100,money:50000,gameMinutes:1200,mapRegion:'village',x:123,y:92,ownedRods:['bamboo','clearStream','tideMaster'],selectedRod:'clearStream',selectedBait:'worm',selectedHook:'small',baits:{worm:20,river:20,smallShrimp:20}});
function rollFor(w,id,distance,spot){for(let n=0;n<10000;n++){w.eval('Math.random=()=>'+(n+.5)/10000);if(read(w,`pick(${distance},'${spot}')?.id`)===id)return (n+.5)/10000;}throw Error('no ordinary encounter for '+id+' at '+spot);}
for(const mode of ['gauge','nushi'])test('Donko real encounter, single award, record, aquarium care, boarding and saved restoration: '+mode,()=>{
 const app=boot({...base(),fightMode:mode}),w=app.window;let saved,identity;
 try{
  w.eval("cast({zone:'river',waterZone:'river',waterX:s.x,waterY:s.y+6});beginFishing();clearInterval(timer)");const roll=rollFor(w,'donko',20,'river-shallow'),fillet=read(w,'s.cookingIngredients.fishFillet');
  w.eval(`Math.random=()=>${roll};commitCastResources();resolveSurfaceCast(20);clearInterval(timer);startFight();clearInterval(timer);finishHookReveal();renderBattleFish()`);
  assert.equal(read(w,'battle.f.id'),'donko');assert.equal(read(w,'battle.fightMode'),mode);assert.equal(read(w,'s.baits.worm'),19);assert.equal(w.document.querySelector('#battleFish canvas').dataset.artSpecies,'donko');
  const specimen=read(w,'battle.specimen');w.eval('caught();caught()');assert.equal(read(w,'s.caught.donko'),1);assert.equal(read(w,'s.cookingIngredients.fishFillet'),fillet+1);assert.equal(read(w,'s.fishCatchRecords.donko.last.spotId'),'river-shallow');assert.equal(read(w,'s.catchMemories.donko.first.hundredths'),specimen.hundredths);
  assert.equal(read(w,'fishEncyclopediaData.donko.number'),61);assert.equal(read(w,"petCatalog.find(f=>f.id==='donko').waterLabel"),'淡水');
  w.eval("hideCatchCard();var pet45=ShuPetLife.acquire(s,'donko',petCatalog,0);");assert.equal(read(w,'pet45.ok'),true);const length=read(w,'pet45.fish.length');
  w.eval("pet45.fish.nickname='どんちゃん';ShuPetLife.buyFood(s,1);var fed45=ShuPetLife.care(s,pet45.fish.uid,'feed',0,petCatalog);ShuPetLife.sync(s,petCatalog,1)");assert.equal(read(w,'fed45.ok'),true);assert.ok(read(w,'pet45.fish.length')>length);
  w.eval('var boarded45=ShuPetLife.boardFish(s,pet45.fish.uid,petCatalog,1);');assert.equal(read(w,'boarded45.ok'),true);identity=read(w,'({uid:s.petLife.boarded[0].uid,length:s.petLife.boarded[0].length,nickname:s.petLife.boarded[0].nickname})');
  w.eval('save()');saved=JSON.parse(w.localStorage.getItem(saveKey));assert.equal(saved.petLife.boarded[0].species,'donko');assert.deepEqual(app.errors,[]);
 }finally{app.dispose();}
 const restored=boot(saved);try{const w=restored.window;assert.equal(read(w,'s.caught.donko'),1);assert.deepEqual(read(w,'({uid:s.petLife.boarded[0].uid,length:s.petLife.boarded[0].length,nickname:s.petLife.boarded[0].nickname})'),identity);w.eval('var returned45=ShuPetLife.withdrawFish(s,s.petLife.boarded[0].uid,0,petCatalog,100);');assert.equal(read(w,'returned45.ok'),true);assert.equal(read(w,'s.petLife.boarded.length'),0);assert.deepEqual(read(w,'({uid:s.petLife.fish[0].uid,length:s.petLife.fish[0].length,nickname:s.petLife.fish[0].nickname})'),identity);assert.deepEqual(restored.errors,[]);}finally{restored.dispose();}
});
test('Donko documented pools and baits are reachable without forcing the fish result',()=>{
 const app=boot(base()),w=app.window;try{for(const spot of ['river-shallow','river-mid','mountain-wetCreek-shallow','mountain-wetCreek-mid'])for(const bait of ['worm','river','smallShrimp']){
  w.eval(`s.selectedBait='${bait}';cast({zone:'river',waterZone:'river',waterX:s.x,waterY:s.y+6${spot.startsWith('mountain')?",mountainType:'wetCreek'":''}});beginFishing();clearInterval(timer)`);
  rollFor(w,'donko',spot.endsWith('shallow')?20:50,spot);w.eval('endBattle()');
 }assert.deepEqual(app.errors,[]);}finally{app.dispose();}
 const pools=Object.entries(F.pools).filter(([,p])=>p.donko>0).map(([id])=>id).sort();assert.deepEqual(pools,['mountain-wetCreek-mid','mountain-wetCreek-shallow','river-mid','river-shallow'].sort());
});
test('Donko has its own readable original atlas through all headings and breathing frames',async()=>{
 const d=F.definitions.find(f=>f.id==='donko');assert.ok(d);assert.notEqual(A.species.donko.asset,A.species[d.base].asset);assert.ok(D.fishStrength.donko>0);assert.ok(D.endurance.donko>0);assert.equal(L.layout([{uid:'test',species:'donko',length:1000}],[{id:'donko',max:3000}],720,350,1,()=>2).poses[0].bottomDweller,true);
 const image=await loadImage(path.join(__dirname,'..',A.species.donko.asset)),ctx=createCanvas(448,224).getContext('2d');
 for(const [mode,steps]of [[7,96],[8,16]])for(let n=0;n<=steps;n++){
  const frame=mode===7?n/16:n/2;A.draw(ctx,image,'donko',mode,frame,()=>image,{swimFrame:n/16});const pixels=ctx.getImageData(0,0,448,224).data;let count=0,edge=0;
  for(let i=0;i<448*224;i++)if(pixels[i*4+3]>100){count++;const x=i%448,y=Math.floor(i/448);if(x<2||x>445||y<2||y>221)edge++;}assert.ok(count>2500,'visible fish '+mode+'/'+frame);assert.equal(edge,0,'unclipped '+mode+'/'+frame);
  const head=A.pose('donko',mode,frame).target;assert.ok(ctx.getImageData(Math.round(head[0]*448)-6,Math.round(head[1]*224)-6,13,13).data.some((v,i)=>i%4===3&&v>100),'attached lip '+mode+'/'+frame);
 }
});
test('old saves retain regional and final boss availability without catching Donko',()=>{
 const s=base();s.regionalCatchVersion=1;s.regionalCaught=Object.fromEntries(Object.entries(R.ordinary).map(([area,ids])=>[area,Object.fromEntries(ids.map(id=>[id,1]))]));s.caught={...s.caught,streamNushi:1,coastNushi:1,caveNushi:1};
 const before=['mountain-stream-deep','coast-reef-deep','mountain-underground-deep','lake-deep'].map(id=>R.candidates(s,id,'night'));const app=boot(s);try{assert.equal(read(app.window,'s.caught.donko||0'),0);assert.deepEqual(read(app.window,"['mountain-stream-deep','coast-reef-deep','mountain-underground-deep','lake-deep'].map(id=>ShuRegional.candidates(s,id,'night'))"),before);assert.ok(before.every(x=>Object.keys(x).length===1));assert.deepEqual(app.errors,[]);}finally{app.dispose();}
});
test('Donko release ships the atlas and current runtime cache URLs',()=>{
 const html=fs.readFileSync(path.join(__dirname,'../index.html'),'utf8'),sw=fs.readFileSync(path.join(__dirname,'../sw.js'),'utf8');for(const file of ['fish-additions.js','fishing-duel.js','fish-motion.js','aquarium-life.js']){const url=html.match(new RegExp(file.replaceAll('.','\\.')+'\\?v=[0-9-]+'))?.[0];assert.ok(url,file);assert.ok(sw.includes(url),url);}assert.ok(sw.includes(A.species.donko.asset));
});
