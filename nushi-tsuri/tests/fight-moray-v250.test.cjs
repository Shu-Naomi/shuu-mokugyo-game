const {test}=require('node:test'),assert=require('node:assert/strict'),path=require('node:path');
const {createCanvas,loadImage}=require('@napi-rs/canvas'),{createHash}=require('node:crypto');
const F=require('../fishing-duel.js'),A=require('../fish-art.js'),{boot,seed,read}=require('./game-harness.cjs');
const {runFight}=require('./nushi-playability-v228.cjs');
const gear={power:38,strength:4.8,control:1.95};
function running(id='bass'){return {fightMode:'nushi',f:{id},mood:{id:'run',calm:false,speedX:3.5},moodTick:0,startMeters:20,retrieval:.4,ten:18,reeling:false,nushiYielded:true};}

test('a released fish now takes several real metres in its first turn, at the right edge as well',()=>{
 for(const id of ['bass','utsubo','buri','hiramasa','kanpachi']){
  const b=running(id),start=F.remainingMeters(b);
  for(let tick=0;tick<30;tick++){F.step(b,b.mood,gear,1,10000+tick*120);b.moodTick++;}
  const payout=F.remainingMeters(b)-start;
  assert.ok(payout>=3&&payout<13,id+' first run '+payout);
  assert.ok(b.ten<20);assert.ok(b.retrieval<.4);assert.equal(b.nushiRunTicks,30);
 }
});

test('active runs tire a fish gradually without ever stopping its payout; slack is not a free win',()=>{
 const b=running('hiramasa'),fresh=F.escapePace(b,b.mood,5);
 for(let i=0;i<100;i++){F.step(b,b.mood,gear);b.moodTick++;}
 const tired=F.escapePace(b,b.mood,5),before=F.remainingMeters(b),ticks=b.nushiRunTicks;
 assert.ok(tired<fresh*.8&&tired>fresh*.7);
 F.step(b,b.mood,gear);assert.ok(F.remainingMeters(b)>before);
 const runTicks=b.nushiRunTicks;b.mood={id:'rest',calm:true};F.beginWindow(b,b.mood,500,10000,()=>1);
 const atRest=b.retrieval;for(let i=0;i<50;i++)F.step(b,b.mood,gear,1,10000+i*120);
 assert.equal(b.retrieval,atRest);assert.equal(b.nushiRunTicks,runTicks);assert.ok(runTicks>ticks);
});

test('real paused battle ticks preserve the distance, fatigue and camera',()=>{
 const a=boot({...seed(),fightMode:'nushi'}),w=a.window;
 try{
  w.eval('cast();beginFishing();battle.cast=50;launchSurfaceCast();settleSurfaceCast();startFight();clearInterval(timer);stopBattleFishArt();');
  w.pauseBattle();const before=read(w,'({retrieval:battle.retrieval,ticks:battle.nushiRunTicks,camera:battle.underwaterCamera})');
  for(let i=0;i<10;i++)w.battleTick();
  assert.deepEqual(read(w,'({retrieval:battle.retrieval,ticks:battle.nushiRunTicks,camera:battle.underwaterCamera})'),before);assert.deepEqual(a.errors,[]);
 }finally{a.dispose();}
});

for(const id of ['utsubo','hiramasa','kanpachi'])test('giant sea fish can be landed from visible cues with a 600ms reaction delay: '+id,()=>{
 const r=runFight({id,tier:.999999,delayMs:600,rngSeed:301});
 console.log('V250_FIGHT '+JSON.stringify(r));assert.deepEqual(r.errors,[]);assert.equal(r.start.id,id);assert.equal(r.phase,'landing');assert.ok(r.seconds<180);assert.ok(r.warningCount>=1);
});

test('moray waves travel along the body while the head, mouth anchor and pixel count stay stable',async()=>{
 const image=await loadImage(path.join(__dirname,'..',A.species.utsubo.asset)),ctx=createCanvas(448,224).getContext('2d');
 const hashes=new Set(),heads=[],counts=[],widths=[];
 for(const frame of [0,1,2,3,4,5,6,7]){
  A.draw(ctx,image,'utsubo',8,frame,()=>image,{swimFrame:frame});
  const head=A.pose('utsubo',8,frame).target;
  heads.push(Buffer.from(ctx.getImageData(Math.round(head[0]*448)-10,Math.round(head[1]*224)-10,21,21).data));
  const px=ctx.getImageData(0,0,448,224).data;let count=0,min=448,max=0;
  for(let i=0;i<448*224;i++)if(px[i*4+3]>100){count++;min=Math.min(min,i%448);max=Math.max(max,i%448);assert.ok(i%448>=2&&i%448<=445&&i/448>=2&&i/448<222);}
  counts.push(count);widths.push(max-min);hashes.add(createHash('sha256').update(px).digest('hex'));
 }
 assert.equal(hashes.size,8);assert.equal(new Set(counts).size,1);assert.equal(new Set(widths).size,1);
 for(const head of heads)assert.deepEqual(head,heads[0],'only the trailing body should undulate');
 for(const jaw of [0,1,2]){
  A.draw(ctx,image,'utsubo',3,jaw,()=>image,{swimFrame:2});const p=A.pose('utsubo',3,jaw),point=p.target;
  assert.ok(ctx.getImageData(Math.round(point[0]*448)-6,Math.round(point[1]*224)-6,13,13).data.some((v,i)=>i%4===3&&v>100));
  assert.equal(p.flip,jaw>0,'the authored left-facing open mouth is reflected into the right-facing swim');
 }
});

test('the new pelagic fish retain separate species, encounter rhythms and drawings from Buri growth',()=>{
 const a=boot(seed()),w=a.window;
 try{
  assert.equal(read(w,'fish.length'),57);assert.deepEqual(read(w,"fish.filter(f=>['buri','hiramasa','kanpachi'].includes(f.id)).map(f=>f.name)"),['ブリ','ヒラマサ','カンパチ']);
  for(const id of ['hiramasa','kanpachi']){assert.equal(read(w,`petCatalog.find(f=>f.id==='${id}').waterLabel`),'海水');assert.equal(read(w,`ShuPetLife.growthStage({species:'${id}',length:9000})`),null);assert.notEqual(A.species[id].asset,A.species.buri.asset);}
  assert.notDeepEqual(F.rhythm('hiramasa'),F.rhythm('kanpachi'));assert.deepEqual(a.errors,[]);
 }finally{a.dispose();}
});
