const {test}=require('node:test'),assert=require('node:assert/strict'),path=require('node:path');
const {boot,seed,read,saveKey}=require('./game-harness.cjs'),M=require('../mountain-region.js'),F=require('../fish-additions.js'),A=require('../fish-art.js');
const {findRoute}=require('./water-routes-v220.cjs'),{runFight}=require('./nushi-playability-v228.cjs');
const {createCanvas,loadImage}=require('@napi-rs/canvas');
test('brown trout is a new, unique regional fish, not another island duplicate',()=>{
 const a=boot();try{assert.equal(read(a.window,'fish.length'),66);assert.equal(read(a.window,"fish.filter(f=>f.id==='browntrout').length"),1);assert.equal(read(a.window,'fishEncyclopediaData.browntrout.number'),65);assert.equal(read(a.window,"petCatalog.find(f=>f.id==='browntrout').waterLabel"),'淡水');assert.deepEqual(Object.entries(F.pools).filter(([,p])=>p.browntrout).map(([id])=>id),['mountain-highPond-mid','mountain-highPond-deep']);assert.deepEqual(a.errors,[]);}finally{a.dispose();}
});
for(const mode of ['gauge','nushi'])test('walk to the pond, ordinary encounter, single catch, boarding and legacy save reload: '+mode,()=>{
 const a=boot({...seed(),mapRegion:'mountainPond',...M.regions.mountainPond.entry,hp:100,selectedRod:'starGazer',ownedRods:['starGazer'],selectedHook:'medium',selectedBait:'liveMinnow',baits:{liveMinnow:20},fightMode:mode}),w=a.window;let saved,uid;
 try{for(const dir of findRoute(w,'highPond').path)w.move(dir);w.action();w.eval('beginFishing();clearInterval(timer)');
 for(const bait of ['liveMinnow','river','worm']){w.eval(`s.selectedBait='${bait}'`);let found=false;for(let i=0;i<1000;i++){w.eval(`Math.random=()=>${(i+.5)/1000}`);if(read(w,"pick(80,'mountain-highPond-deep')?.id")==='browntrout'){found=true;break;}}assert.ok(found,bait);}
 w.eval("s.selectedBait='liveMinnow'");let roll;for(let i=0;i<1000;i++){w.eval(`Math.random=()=>${(i+.5)/1000}`);if(read(w,"pick(80,'mountain-highPond-deep')?.id")==='browntrout'){roll=(i+.5)/1000;break;}}assert.ok(roll!==undefined);
 w.eval(`Math.random=()=>${roll};commitCastResources();resolveSurfaceCast(80);clearInterval(timer);startFight();clearInterval(timer);finishHookReveal();renderBattleFish()`);
 assert.equal(read(w,'battle.f.id'),'browntrout');assert.equal(read(w,'s.baits.liveMinnow'),19);assert.equal(w.document.querySelector('#battleFish canvas').dataset.artSpecies,'browntrout');w.eval('caught();caught()');assert.equal(read(w,'s.caught.browntrout'),1);assert.equal(read(w,'s.catchMemories.browntrout.first.fightMode'),mode);
 w.eval("hideCatchCard();var newTrout=ShuPetLife.acquire(s,'browntrout',petCatalog,0);newTrout.fish.nickname='赤い星';ShuPetLife.care(s,newTrout.fish.uid,'feed',0,petCatalog);ShuPetLife.sync(s,petCatalog,1);var boarded=ShuPetLife.boardFish(s,newTrout.fish.uid,petCatalog,1);save()");assert.equal(read(w,'boarded.ok'),true);uid=read(w,'newTrout.fish.uid');saved=JSON.parse(w.localStorage.getItem(saveKey));assert.deepEqual(a.errors,[]);
 }finally{a.dispose();}
 const b=boot(saved);try{assert.equal(read(b.window,'s.caught.browntrout'),1);assert.equal(read(b.window,'s.petLife.boarded[0].nickname'),'赤い星');b.window.eval(`var withdrawn=ShuPetLife.withdrawFish(s,'${uid}',0,petCatalog,100)`);assert.equal(read(b.window,'withdrawn.ok'),true);assert.deepEqual(b.errors,[]);}finally{b.dispose();}
});
for(const mode of ['gauge','nushi'])for(const tier of [.5,.999999])test('brown trout physics, '+mode+', size roll '+tier,()=>{
 const r=runFight({id:'browntrout',mode,tier,rod:tier>.9?'starGazer':'clearStream',delayMs:600,rngSeed:301,gaugeThreshold:45,gaugeResumeThreshold:20});console.log('BROWN_TROUT_FIGHT '+JSON.stringify(r));assert.deepEqual(r.errors,[]);assert.equal(r.start.id,'browntrout');assert.equal(r.phase,'landing');assert.ok(r.seconds<180);assert.ok(r.maxTension<100);
});
// Real water-particle RNG changes the authored window sequence. Keep it active.
for(const tier of [.5,.8])test('brown trout with live water FX, size roll '+tier,()=>{
 const r=runFight({id:'browntrout',mode:'nushi',tier,rod:'clearStream',delayMs:600,rngSeed:301,waterFxSeed:301});console.log('BROWN_TROUT_WATER_FX '+JSON.stringify(r));assert.deepEqual(r.errors,[]);assert.equal(r.phase,'landing');assert.ok(r.seconds<180);assert.ok(r.maxTension<100);
});
for(const id of ['browntrout','laketrout'])test(id+' atlas stays within bounds and mouth remains connected through 97 headings',async()=>{
 const im=await loadImage(path.join(__dirname,'..',A.species[id].asset)),ctx=createCanvas(448,224).getContext('2d');for(let n=0;n<=96;n++){A.draw(ctx,im,id,7,n/16,()=>im);const data=ctx.getImageData(0,0,448,224).data;let count=0,edge=0;for(let i=0;i<448*224;i++)if(data[i*4+3]>100){count++;const x=i%448,y=Math.floor(i/448);if(x<2||x>445||y<2||y>221)edge++;}assert.ok(count>3500,'body '+n);assert.equal(edge,0,'edge '+n);const h=A.pose(id,7,n/16).target;assert.ok(ctx.getImageData(Math.round(h[0]*448)-6,Math.round(h[1]*224)-6,13,13).data.some((v,i)=>i%4===3&&v>100),'mouth '+n);}
});
