const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {createCanvas,loadImage}=require('@napi-rs/canvas');
const {boot,seed,read,saveKey}=require('./game-harness.cjs'),I=require('../offshore-island.js'),Life=require('../world-life.js'),Slots=require('../save-slots.js'),A=require('../fish-art.js'),F=require('../fish-additions.js');
const cases=[['takabe','east','shrimp','small',50,62],['kuromejina','west','shrimp','medium',50,63],['houraihimeji','cove','smallShrimp','medium',80,64]];
const copy=x=>JSON.parse(JSON.stringify(x));
const {runFight}=require('./nushi-playability-v228.cjs');
const snapshot=w=>read(w,'({region:s.mapRegion,x:s.x,y:s.y,money:s.money,minutes:s.gameMinutes,boat:s.boatActive,caught:s.caught,baits:s.baits,equipment:s.equipment,pet:s.petLife})');

for(const mode of ['gauge','nushi'])test('island fish use their real shore, normal bait odds, both modes, catch memories and saved aquarium growth: '+mode,()=>{
 for(const [id,area,bait,hook,distance,number]of cases){const point=I.fishingPoints.find(p=>p.id===area),a=boot({...seed(),mapRegion:I.id,...point,soundEnabled:false,hp:100,gameMinutes:600,money:30000,ownedRods:['bamboo','tideMaster'],selectedRod:'tideMaster',selectedBait:bait,selectedHook:hook,fightMode:mode,baits:{shrimp:10,shell:10,smallShrimp:10}}),w=a.window;let saved;
  try{w.action();assert.equal(read(w,'battle.offshoreType'),area);w.eval('beginFishing();clearInterval(timer)');const spot=`offshore-${area}-${distance<34?'shallow':distance<67?'mid':'deep'}`;let roll;
   for(let n=0;n<1000;n++){w.eval(`Math.random=()=>${n/1000}`);if(read(w,`pick(${distance},'${spot}')?.id`)===id){roll=n/1000;break;}}
   assert.notEqual(roll,undefined,id+' ordinary odds');const fillets=read(w,'s.cookingIngredients.fishFillet');w.eval(`Math.random=()=>${roll};commitCastResources();resolveSurfaceCast(${distance});clearInterval(timer);startFight();clearInterval(timer);finishHookReveal();renderBattleFish()`);
   assert.equal(read(w,'battle.spot'),spot);assert.equal(read(w,'battle.f.id'),id);assert.equal(read(w,'battle.fightMode'),mode);assert.equal(read(w,`s.baits.${bait}`),9);assert.equal(w.document.querySelector('#battleFish canvas').dataset.artSpecies,id);
   w.eval('caught();caught()');assert.equal(read(w,'s.cookingIngredients.fishFillet'),fillets+1);assert.equal(read(w,`s.caught.${id}`),1);assert.equal(read(w,`s.fishCatchRecords.${id}.last.spotId`),spot);assert.equal(read(w,`s.catchMemories.${id}.first.fightMode`),mode);assert.equal(read(w,`fishEncyclopediaData.${id}.number`),number);assert.equal(read(w,'fish.length'),64);
   w.eval(`hideCatchCard();var acquired251=ShuPetLife.acquire(s,'${id}',petCatalog,0);`);assert.equal(read(w,'acquired251.ok'),true);assert.equal(read(w,`petCatalog.find(f=>f.id==='${id}').waterLabel`),'海水');const length=read(w,'acquired251.fish.length');w.eval('ShuPetLife.care(s,acquired251.fish.uid,"feed",0,petCatalog);ShuPetLife.sync(s,petCatalog,1);save()');assert.ok(read(w,'acquired251.fish.length')>length);saved=JSON.parse(w.localStorage.getItem(saveKey));assert.deepEqual(a.errors,[]);
  }finally{a.dispose();}
  const b=boot(saved);try{assert.equal(read(b.window,`s.caught.${id}`),1);assert.ok(read(b.window,`s.petLife.fish.some(f=>f.species==='${id}')`));assert.equal(read(b.window,'s.mapRegion'),I.id);assert.deepEqual(b.errors,[]);}finally{b.dispose();}
 }
});

test('exclusive fish do not leak to the mainland, while their island guide and offline assets are complete',()=>{
 const sw=fs.readFileSync(path.join(__dirname,'../sw.js'),'utf8');
 for(const [id,area]of cases){const d=F.definitions.find(f=>f.id===id);assert.ok(d.locations.includes(I.name));assert.ok(F.pools[`offshore-${area}-mid`][id]>0);for(const [spot,weights]of Object.entries(F.pools))if(!spot.startsWith('offshore-'))assert.ok(!weights[id],id+' excluded from '+spot);assert.notEqual(A.species[id].asset,A.species[d.base].asset);assert.ok(sw.includes(A.species[id].asset));}
 for(const a of Object.values(I.assets))assert.ok(sw.includes(a));
 const a=boot({...seed(),mapRegion:I.id,...I.entry});try{const w=a.window,before=snapshot(w);w.open('record');w.document.querySelector('#fishdexFieldGuide').click();assert.equal(w.document.querySelector('#fieldGuideRegion').textContent,I.name);assert.equal(w.document.querySelectorAll('[data-guide-place]').length,3);assert.deepEqual(snapshot(w),before);assert.deepEqual(a.errors,[]);}finally{a.dispose();}
});

test('all new island fish remain whole and attached to their lips across 97 turn headings',async()=>{
 for(const [id]of cases){const im=await loadImage(path.join(__dirname,'..',A.species[id].asset)),ctx=createCanvas(448,224).getContext('2d');for(let n=0;n<=96;n++){assert.equal(A.draw(ctx,im,id,7,n/16,()=>im),true);const p=ctx.getImageData(0,0,448,224).data;let count=0,edge=0;for(let i=0;i<448*224;i++)if(p[i*4+3]>100){count++;const x=i%448,y=Math.floor(i/448);if(x<2||x>445||y<2||y>221)edge++;}assert.ok(count>3500,id+' body '+n);assert.equal(edge,0,id+' fin '+n);const head=A.pose(id,7,n/16).target;assert.ok(ctx.getImageData(Math.round(head[0]*448)-6,Math.round(head[1]*224)-6,13,13).data.some((v,i)=>i%4===3&&v>100),id+' lip '+n);}}
});

for(const [id]of cases)for(const mode of ['gauge','nushi'])test('a giant island fish lands through real physics and visible cues with a 600ms reaction: '+id+'/'+mode,()=>{
 const result=runFight({id,mode,tier:.999999,delayMs:600,rngSeed:301,gaugeThreshold:45,gaugeResumeThreshold:20});
 console.log('V252_56_FIGHT '+JSON.stringify(result));assert.deepEqual(result.errors,[]);assert.equal(result.start.id,id);assert.equal(result.phase,'landing');assert.ok(result.seconds<180);assert.ok(result.maxTension<100);
});

test('new island species keep the mainland pools and 31 freshwater ordinary fish unchanged',()=>{
 const app=boot(seed());try{const w=app.window;assert.equal(read(w,'fish.length'),64);assert.equal(read(w,'petCatalog.filter(f=>!f.legendary).length'),59);assert.equal(read(w,"petCatalog.filter(f=>!f.legendary&&f.waterLabel==='淡水').length"),31);assert.equal(read(w,"petCatalog.filter(f=>!f.legendary&&f.waterLabel==='海水').length"),28);
 for(const [id]of cases){assert.equal(read(w,`fish.filter(f=>f.id==='${id}').length`),1);assert.equal(read(w,`petCatalog.filter(f=>f.id==='${id}').length`),1);for(const [spot,weights]of Object.entries(F.pools))if(weights[id])assert.ok(spot.startsWith('offshore-'),id+' '+spot);}
 assert.deepEqual(app.errors,[]);}finally{app.dispose();}
});
test('new encounter pools support their listed baits using the real candidate picker',()=>{
 for(const [id,area,,hook]of cases){const definition=F.definitions.find(f=>f.id===id);assert.ok(definition);for(const [spot,weights]of Object.entries(F.pools).filter(([,p])=>p[id]>0))for(const bait of definition.baits){
 const app=boot({...seed(),hp:100,mapRegion:I.id,...I.fishingPoints.find(p=>p.id===area),gameMinutes:600,selectedBait:bait,selectedHook:hook,ownedRods:['tideMaster'],selectedRod:'tideMaster',baits:{shrimp:20,smallShrimp:20,worm:20}});try{const w=app.window;w.action();w.eval('beginFishing();clearInterval(timer)');const distance=spot.endsWith('shallow')?20:spot.endsWith('deep')?80:50;let found=false;for(let i=0;i<1000;i++){w.eval(`Math.random=()=>${(i+.5)/1000}`);if(read(w,`pick(${distance},'${spot}')?.id`)===id){found=true;break;}}assert.ok(found,`${id} ${spot} ${bait}`);assert.deepEqual(app.errors,[]);}finally{app.dispose();}
 }}
});
test('boarding and restoring all new aquarium identities preserves other adventures',()=>{
 const other=JSON.stringify({...seed(),playerName:'別の冒険',money:98765,caught:{donko:4}}),app=boot({...seed(),playerName:'島の釣り人',money:99999,caught:{takabe:1,kuromejina:1,houraihimeji:1}},{},{storage:{[Slots.keys[2]]:other}});let saved,identities;
 try{const w=app.window;for(const [id]of cases){w.eval(`var pet=ShuPetLife.acquire(s,'${id}',petCatalog,0);if(!pet.ok)throw Error(pet.message);pet.fish.nickname='島っ子${cases.findIndex(c=>c[0]===id)+1}';ShuPetLife.care(s,pet.fish.uid,'feed',0,petCatalog);ShuPetLife.sync(s,petCatalog,1);var boarded=ShuPetLife.boardFish(s,pet.fish.uid,petCatalog,1);`);assert.equal(read(w,'boarded.ok'),true);}
 identities=read(w,'s.petLife.boarded.map(f=>({uid:f.uid,species:f.species,nickname:f.nickname,length:f.length}))');w.eval('save()');saved=JSON.parse(w.localStorage.getItem(saveKey));assert.equal(w.localStorage.getItem(Slots.keys[2]),other);assert.deepEqual(app.errors,[]);}finally{app.dispose();}
 const restored=boot(saved,{},{storage:{[Slots.keys[2]]:other}});try{const w=restored.window;assert.equal(read(w,'s.playerName'),'島の釣り人');assert.deepEqual(read(w,'s.petLife.boarded.map(f=>({uid:f.uid,species:f.species,nickname:f.nickname,length:f.length}))'),identities);for(const identity of identities){w.eval(`var restoredPet=ShuPetLife.withdrawFish(s,'${identity.uid}',0,petCatalog,100)`);assert.equal(read(w,'restoredPet.ok'),true);}assert.equal(w.localStorage.getItem(Slots.keys[2]),other);assert.deepEqual(restored.errors,[]);}finally{restored.dispose();}
});
for(const [id,rod]of [['takabe','youngBamboo'],['kuromejina','shoreReed'],['houraihimeji','clearStream']])for(const mode of ['gauge','nushi'])test('recommended rod lands a normal island fish with 600ms reactions: '+id+'/'+mode,()=>{
 const result=runFight({id,mode,rod,tier:.5,delayMs:600,rngSeed:301,gaugeThreshold:45,gaugeResumeThreshold:20});console.log('ISLAND_RECOMMENDED_ROD '+JSON.stringify(result));assert.deepEqual(result.errors,[]);assert.equal(result.start.id,id);assert.equal(result.phase,'landing');assert.ok(result.seconds<180);assert.ok(result.maxTension<100);
});
test('new island profiles have distinct strength, motion and bottom habitat',()=>{
 const D=require('../fishing-duel.js'),L=require('../aquarium-life.js');for(const [id]of cases){assert.ok(D.fishStrength[id]>0,id);assert.ok(D.endurance[id]>0,id);const pose=L.layout([{uid:id,species:id,length:1000}],[{id,max:4000}],720,350,1,()=>2).poses[0];assert.equal(pose.bottomDweller,id==='houraihimeji',id+' swimming layer');}assert.ok(D.fishStrength.kuromejina>D.fishStrength.takabe);
});
test('new island release caches current runtime modules and every original atlas',()=>{
 const html=fs.readFileSync(path.join(__dirname,'../index.html'),'utf8'),sw=fs.readFileSync(path.join(__dirname,'../sw.js'),'utf8');for(const file of ['fish-additions.js','fish-art.js','fishing-duel.js','fish-motion.js','aquarium-life.js','offshore-island.js']){const url=html.match(new RegExp(file.replaceAll('.','\\.')+'\\?v=[0-9-]+'))?.[0];assert.ok(url,file);assert.ok(sw.includes(url),url);}for(const [id]of cases)assert.ok(sw.includes(A.species[id].asset));
});

test('home aquarium keeps the goatfish on the bottom and both other newcomers in midwater',()=>{
 const app=boot(),w=app.window;try{
  for(const t of [0,5,20,40]){const bottom=read(w,`aquariumFishPose('houraihimeji',${t})`);assert.equal(bottom.bottomDweller,true);assert.ok(bottom.y>63);for(const id of ['takabe','kuromejina']){const p=read(w,`aquariumFishPose('${id}',${t})`);assert.equal(p.bottomDweller,false);assert.ok(p.y<50);}}
  assert.deepEqual(app.errors,[]);
 }finally{app.dispose();}
});
