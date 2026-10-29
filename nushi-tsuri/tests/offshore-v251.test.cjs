const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {createCanvas,loadImage}=require('@napi-rs/canvas');
const {boot,seed,read,saveKey}=require('./game-harness.cjs'),I=require('../offshore-island.js'),Life=require('../world-life.js'),Slots=require('../save-slots.js'),A=require('../fish-art.js'),F=require('../fish-additions.js');
const cases=[['shimaaji','east','shrimp','large',50,58],['ishigakidai','west','shell','large',50,59],['akahata','cove','smallShrimp','medium',20,60]];
const copy=x=>JSON.parse(JSON.stringify(x));
const {runFight}=require('./nushi-playability-v228.cjs');
const snapshot=w=>read(w,'({region:s.mapRegion,x:s.x,y:s.y,money:s.money,minutes:s.gameMinutes,boat:s.boatActive,caught:s.caught,baits:s.baits,equipment:s.equipment,pet:s.petLife})');

test('the painted paths connect the landing, all fishing platforms, shelter and lighthouse without water walking',()=>{
 const targets=[...I.fishingPoints,I.rest,I.lighthouse],seen=new Set([`${I.entry.x},${I.entry.y}`]),queue=[I.entry];let index=0;
 while(index<queue.length){const p=queue[index++];for(const d of ['left','right','up','down']){const n=Life.moveTarget(p.x,p.y,d,4,I.walkable),key=`${n.x},${n.y}`;if(!seen.has(key)){seen.add(key);queue.push(n);}}}
 for(const t of targets)assert.ok(queue.some(p=>Math.hypot(p.x-t.x,p.y-t.y)<=2),'reachable '+JSON.stringify(t));
 for(const p of I.fishingPoints){assert.ok(I.walkable(p.x,p.y));const w=I.fishingWater(p.x,p.y,p.direction);assert.equal(w.zone,'sea');assert.equal(w.type,p.id);assert.ok(I.water(w.x,w.y));assert.equal(I.walkable(w.x,w.y),false);}
 for(const p of [[2,2],[238,133],[132,10],[103,35],[170,75]])assert.equal(I.walkable(...p),false,'sea, forest or cliff '+p);
});

test('cancel and insufficient money never charge or move; a confirmed round trip charges only once',()=>{
 const a=boot({...seed(),...I.harbor,money:1600,hp:100}),w=a.window;
 try{const before=snapshot(w);w.action();w.document.querySelector('#offshoreFerryCancel').click();assert.deepEqual(snapshot(w),before);
  w.action();w.document.querySelector('#offshoreFerryGo').click();w.document.querySelector('#offshoreFerryGo').click();
  assert.equal(read(w,'s.mapRegion'),I.id);assert.equal(read(w,'s.money'),800);assert.equal(read(w,'s.gameMinutes'),560);assert.equal(read(w,'s.boatActive'),false);
  w.eval('s.money=0;s.hp=0;save()');w.action();assert.equal(w.document.querySelector('#offshoreFerryGo').disabled,false);w.document.querySelector('#offshoreFerryGo').click();
  assert.equal(read(w,'s.mapRegion'),'village');assert.equal(read(w,'s.money'),0);assert.equal(read(w,'s.hp'),0);assert.equal(read(w,'s.gameMinutes'),620);assert.deepEqual(a.errors,[]);
 }finally{a.dispose();}
 const poor=boot({...seed(),...I.harbor,money:799});try{const before=snapshot(poor.window);poor.window.action();assert.equal(poor.window.document.querySelector('#offshoreFerryGo').disabled,true);assert.equal(poor.window.takeOffshoreFerry(),false);assert.deepEqual(snapshot(poor.window),before);assert.deepEqual(poor.errors,[]);}finally{poor.dispose();}
});

test('the ferry refuses remote calls and tournaments; personal rowing equipment cannot board on the distant island',()=>{
 const p={...seed(),mapRegion:'village',...I.harbor,money:5000,tournament:{id:'lakeFuna'}};const before=copy(p);assert.equal(I.voyage(p).ok,false);assert.deepEqual(p,before);
 p.tournament=null;p.x=10;const far=copy(p);assert.equal(I.voyage(p).ok,false);assert.deepEqual(p,far);
 const a=boot({...seed(),mapRegion:I.id,...I.entry,ownedVehicles:['canoe'],equipment:{hands:null,vehicle:'canoe'}});try{assert.equal(a.window.boardBoat(),false);assert.equal(read(a.window,'s.mapRegion'),I.id);assert.equal(read(a.window,'s.boatActive'),false);assert.deepEqual(a.errors,[]);}finally{a.dispose();}
});

test('an island save resumes without another fare, keeps the other adventure untouched and still returns for free',()=>{
 const other=JSON.stringify({...seed(),money:98765,caught:{buri:8}}),a=boot({...seed(),...I.harbor,money:1800},{},{storage:{[Slots.keys[2]]:other}});let saved;
 try{const w=a.window;w.action();w.document.querySelector('#offshoreFerryGo').click();saved=JSON.parse(w.localStorage.getItem(saveKey));assert.equal(saved.mapRegion,I.id);assert.equal(w.localStorage.getItem(Slots.keys[2]),other);assert.deepEqual(a.errors,[]);}finally{a.dispose();}
 const b=boot(saved,{},{storage:{[Slots.keys[2]]:other}});try{const w=b.window;assert.equal(read(w,'s.mapRegion'),I.id);assert.equal(read(w,'s.money'),1000);assert.equal(read(w,'s.equipment.vehicle'),null);assert.ok(I.walkable(read(w,'s.x'),read(w,'s.y')));w.action();w.document.querySelector('#offshoreFerryGo').click();assert.equal(read(w,'s.money'),1000);assert.equal(w.localStorage.getItem(Slots.keys[2]),other);assert.deepEqual(b.errors,[]);}finally{b.dispose();}
});

test('legacy village and coastal saves keep their original location, inventory and money; invalid island coordinates recover to a path',()=>{
 for(const saved of [seed(),{...seed(),mapRegion:'coast',boatActive:true,x:166,y:123,ownedVehicles:['canoe'],equipment:{hands:null,vehicle:'canoe'}}]){const a=boot(saved);try{assert.equal(read(a.window,'s.money'),saved.money);assert.equal(read(a.window,'s.mapRegion'),saved.mapRegion||'village');assert.deepEqual(read(a.window,'s.caught'),saved.caught);assert.deepEqual(a.errors,[]);}finally{a.dispose();}}
 const a=boot({...seed(),mapRegion:I.id,x:5,y:5,money:0});try{assert.equal(read(a.window,'s.mapRegion'),I.id);assert.ok(I.walkable(read(a.window,'s.x'),read(a.window,'s.y')));assert.equal(read(a.window,'s.money'),0);assert.deepEqual(a.errors,[]);}finally{a.dispose();}
});

for(const mode of ['gauge','nushi'])test('island fish use their real shore, normal bait odds, both modes, catch memories and saved aquarium growth: '+mode,()=>{
 for(const [id,area,bait,hook,distance,number]of cases){const point=I.fishingPoints.find(p=>p.id===area),a=boot({...seed(),mapRegion:I.id,...point,soundEnabled:false,hp:100,gameMinutes:600,money:30000,ownedRods:['bamboo','tideMaster'],selectedRod:'tideMaster',selectedBait:bait,selectedHook:hook,fightMode:mode,baits:{shrimp:10,shell:10,smallShrimp:10}}),w=a.window;let saved;
  try{w.action();assert.equal(read(w,'battle.offshoreType'),area);w.eval('beginFishing();clearInterval(timer)');const spot=`offshore-${area}-${distance<34?'shallow':distance<67?'mid':'deep'}`;let roll;
   for(let n=0;n<1000;n++){w.eval(`Math.random=()=>${n/1000}`);if(read(w,`pick(${distance},'${spot}')?.id`)===id){roll=n/1000;break;}}
   assert.notEqual(roll,undefined,id+' ordinary odds');const fillets=read(w,'s.cookingIngredients.fishFillet');w.eval(`Math.random=()=>${roll};commitCastResources();resolveSurfaceCast(${distance});clearInterval(timer);startFight();clearInterval(timer);finishHookReveal();renderBattleFish()`);
   assert.equal(read(w,'battle.spot'),spot);assert.equal(read(w,'battle.f.id'),id);assert.equal(read(w,'battle.fightMode'),mode);assert.equal(read(w,`s.baits.${bait}`),9);assert.equal(w.document.querySelector('#battleFish canvas').dataset.artSpecies,id);
   w.eval('caught();caught()');assert.equal(read(w,'s.cookingIngredients.fishFillet'),fillets+1);assert.equal(read(w,`s.caught.${id}`),1);assert.equal(read(w,`s.fishCatchRecords.${id}.last.spotId`),spot);assert.equal(read(w,`s.catchMemories.${id}.first.fightMode`),mode);assert.equal(read(w,`fishEncyclopediaData.${id}.number`),number);assert.equal(read(w,'fish.length'),60);
   w.eval(`hideCatchCard();var acquired251=ShuPetLife.acquire(s,'${id}',petCatalog,0);`);assert.equal(read(w,'acquired251.ok'),true);assert.equal(read(w,`petCatalog.find(f=>f.id==='${id}').waterLabel`),'海水');const length=read(w,'acquired251.fish.length');w.eval('ShuPetLife.care(s,acquired251.fish.uid,"feed",0,petCatalog);ShuPetLife.sync(s,petCatalog,1);save()');assert.ok(read(w,'acquired251.fish.length')>length);saved=JSON.parse(w.localStorage.getItem(saveKey));assert.deepEqual(a.errors,[]);
  }finally{a.dispose();}
  const b=boot(saved);try{assert.equal(read(b.window,`s.caught.${id}`),1);assert.ok(read(b.window,`s.petLife.fish.some(f=>f.species==='${id}')`));assert.equal(read(b.window,'s.mapRegion'),I.id);assert.deepEqual(b.errors,[]);}finally{b.dispose();}
 }
});

test('exclusive fish do not leak to the mainland, while their island guide and offline assets are complete',()=>{
 const sw=fs.readFileSync(path.join(__dirname,'../sw.js'),'utf8');
 for(const [id,area]of cases){const d=F.definitions.find(f=>f.id===id);assert.ok(d.locations.includes(I.name));assert.ok(F.pools[`offshore-${area}-mid`][id]>0);for(const [spot,weights]of Object.entries(F.pools))if(!spot.startsWith('offshore-'))assert.ok(!weights[id],id+' excluded from '+spot);assert.notEqual(A.species[id].asset,A.species[d.base].asset);assert.ok(sw.includes(A.species[id].asset));}
 for(const a of Object.values(I.assets))assert.ok(sw.includes(a));assert.ok(sw.includes('./offshore-island.js?v=252-17'));assert.ok(sw.includes('./offshore-island.css?v=251-2'));
 const a=boot({...seed(),mapRegion:I.id,...I.entry});try{const w=a.window,before=snapshot(w);w.open('record');w.document.querySelector('#fishdexFieldGuide').click();assert.equal(w.document.querySelector('#fieldGuideRegion').textContent,I.name);assert.equal(w.document.querySelectorAll('[data-guide-place]').length,3);assert.deepEqual(snapshot(w),before);assert.deepEqual(a.errors,[]);}finally{a.dispose();}
});

test('all original island fish remain whole and attached to their lips across 97 turn headings',async()=>{
 for(const [id]of cases){const im=await loadImage(path.join(__dirname,'..',A.species[id].asset)),ctx=createCanvas(448,224).getContext('2d');for(let n=0;n<=96;n++){assert.equal(A.draw(ctx,im,id,7,n/16,()=>im),true);const p=ctx.getImageData(0,0,448,224).data;let count=0,edge=0;for(let i=0;i<448*224;i++)if(p[i*4+3]>100){count++;const x=i%448,y=Math.floor(i/448);if(x<2||x>445||y<2||y>221)edge++;}assert.ok(count>3500,id+' body '+n);assert.equal(edge,0,id+' fin '+n);const head=A.pose(id,7,n/16).target;assert.ok(ctx.getImageData(Math.round(head[0]*448)-6,Math.round(head[1]*224)-6,13,13).data.some((v,i)=>i%4===3&&v>100),id+' lip '+n);}}
});

for(const [id]of cases)for(const mode of ['gauge','nushi'])test('a giant island fish lands through real physics and visible cues with a 600ms reaction: '+id+'/'+mode,()=>{
 const result=runFight({id,mode,tier:.999999,delayMs:600,rngSeed:301,gaugeThreshold:45,gaugeResumeThreshold:20});
 console.log('V251_FIGHT '+JSON.stringify(result));assert.deepEqual(result.errors,[]);assert.equal(result.start.id,id);assert.equal(result.phase,'landing');assert.ok(result.seconds<180);assert.ok(result.maxTension<100);
});
