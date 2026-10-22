const {test}=require('node:test'),assert=require('node:assert/strict'),path=require('node:path');
const {createCanvas,loadImage}=require('@napi-rs/canvas');
const P=require('../pet-life.js'),A=require('../fish-art.js'),L=require('../aquarium-life.js'),{boot,seed,read,saveKey}=require('./game-harness.cjs');
const catalog=[{id:'buri',name:'ブリ',min:1200,start:2400,max:12499,price:3600,waterLabel:'海水'},{id:'aji',name:'マアジ',min:500,start:1000,max:4999,price:500,waterLabel:'海水'}];
function state(){const s={money:30000,caught:{buri:1},dogAffinity:{shuu:0}};P.normalize(s,catalog,['shuu'],0,{legacy:false});s.petLife.food=1000;return s;}
function pair(length=2400){const s=state();for(let i=0;i<2;i++){const f=P.acquire(s,'buri',catalog,0,0).fish;f.length=length;delete f.growthHistory;}P.normalize(s,catalog,['shuu'],0);return s;}
function care(s,day){const f=s.petLife.fish[0];P.care(s,f.uid,'water',day,catalog);assert.equal(P.care(s,f.uid,'feed',day,catalog).ok,true);P.sync(s,catalog,day+1);}
const copy=x=>JSON.parse(JSON.stringify(x));

test('aquarium names change at integer boundaries, including Hamachi as an alias of Inada',()=>{
 for(const [length,id,name]of [[150,'mojako','モジャコ'],[999,'mojako','モジャコ'],[1000,'wakashi','ワカシ'],[3499,'wakashi','ワカシ'],[3500,'inada','イナダ'],[5999,'inada','イナダ'],[6000,'warasa','ワラサ'],[7999,'warasa','ワラサ'],[8000,'buri','ブリ'],[12499,'buri','ブリ']]){
  const f={species:'buri',length};assert.equal(P.growthStage(f).id,id);assert.equal(P.displayName(f,catalog),name);
 }
 assert.match(P.growthStage({species:'buri',length:3500}).alias,/ハマチ/);
 assert.equal(P.growthStage({species:'aji',length:4000}),null);assert.equal(P.maturityLength(catalog[1]),1000);
 assert.equal(P.lifeStage({species:'buri',length:2400},catalog),'juvenile');assert.equal(P.lifeStage({species:'buri',length:8000},catalog),'adult');
});

test('real cared-for growth promotes the same specimen once and preserves its identity and records',()=>{
 const s=state();let f=P.acquire(s,'buri',catalog,0,0).fish;const uid=f.uid,sex=f.sex;
 const original=copy({money:s.money,caught:s.caught,born:f.bornSize,origin:f.origin,generation:f.generation});
 assert.equal(f.length,150);assert.equal(P.displayName(f,catalog),'モジャコ');
 const purchased=copy(s);P.normalize(s,catalog,['shuu'],0);assert.deepEqual(s,purchased);f=s.petLife.fish[0];
 for(let d=0;d<3;d++)care(s,d);
 assert.equal(f.length,1050);assert.equal(P.displayName(f,catalog),'ワカシ');
 assert.deepEqual(f.growthHistory.map(h=>h.stage),['mojako','wakashi']);assert.equal(f.growthHistory[1].day,3);assert.equal(f.growthHistory[1].initial,false);
 assert.deepEqual(s.petLife.lastGrowth,{uid,from:'mojako',to:'wakashi',day:3});
 assert.equal(P.sync(s,catalog,3),false);assert.equal(f.growthHistory.length,2);assert.equal(f.uid,uid);assert.equal(f.sex,sex);
 assert.deepEqual({money:s.money,caught:s.caught,born:f.bornSize,origin:f.origin,generation:f.generation},original);
 for(let d=3;d<42;d++)care(s,d);
 assert.equal(f.length,12499);assert.deepEqual(f.growthHistory.map(h=>h.stage),['mojako','wakashi','inada','warasa','buri']);
 const before=copy(s);P.normalize(s,catalog,['shuu'],42);assert.deepEqual(s,before);
 assert.equal(L.dimensions(s.petLife.fish,catalog).widthCm,360);
});

test('young pairs cannot breed and crossing 80cm starts a fresh three-day adult period',()=>{
 const young=pair();for(let d=0;d<4;d++)care(young,d);assert.equal(young.petLife.eggs.length,0);assert.deepEqual(young.petLife.breeding,{});
 const near=pair(7900);for(let d=0;d<3;d++){care(near,d);assert.equal(near.petLife.eggs.length,0);}
 care(near,3);assert.equal(near.petLife.eggs.length,1);assert.equal(near.petLife.eggs[0].laidDay,4);assert.equal(near.petLife.eggs[0].hatchDay,7);
});

test('adult Buri produce eggs then Mojako; generation, size and water survive restore without new catches',()=>{
 const s=pair(8000);for(let d=0;d<3;d++)care(s,d);
 assert.equal(s.petLife.eggs.length,1);assert.equal(s.petLife.eggs[0].hatchDay,6);
 for(let d=3;d<6;d++)care(s,d);
 const child=s.petLife.fish.find(f=>f.origin==='bred');assert.ok(child);assert.equal(child.length,150);assert.equal(child.generation,1);
 assert.equal(P.displayName(child,catalog),'モジャコ');assert.equal(P.lifeStage(child,catalog),'fry');assert.equal(P.sync(s,catalog,6),false);
 const saved=copy(s);P.normalize(saved,catalog,['shuu'],6);assert.deepEqual(saved,s);assert.deepEqual(s.caught,{buri:1});
 assert.equal(P.canHouse(saved,'buri',[...catalog,{id:'moroko',waterLabel:'淡水'}],0),true);
});

test('same-sex, dirty, separated and full adult tanks still prevent Buri eggs',()=>{
 for(const kind of ['same-sex','dirty','separated','full']){
  const s=pair(8000);
  if(kind==='same-sex')s.petLife.fish.forEach(f=>f.sex='male');
  if(kind==='separated'){s.petLife.unlockedTanks=2;s.petLife.fish[1].tank=1;}
  if(kind==='full')for(let i=0;i<3;i++)P.acquire(s,'buri',catalog,0,0);
  for(let d=0;d<3;d++){
   if(kind==='dirty')s.petLife.fish.forEach(f=>f.water=50);
   for(const tank of [0,1]){const f=s.petLife.fish.find(f=>f.tank===tank);if(f)P.care(s,f.uid,'feed',d,catalog);}
   P.sync(s,catalog,d+1);
  }
  assert.equal(s.petLife.eggs.length,0,kind);
 }
});

test('old Buri keep their size, eggs and identity without invented promotions or immature breeding credit',()=>{
 const s=pair(7900);for(const f of s.petLife.fish)delete f.growthHistory;
 s.petLife.breeding={'0:buri':{days:2,lastDay:0,mother:'pet-2',father:'pet-1'}};
 s.petLife.eggs=[{uid:'egg-1',species:'buri',tank:0,laidDay:0,hatchDay:3,generation:1,water:100}];s.petLife.nextEggId=2;
 P.normalize(s,catalog,['shuu'],0);
 assert.deepEqual(s.petLife.breeding,{});assert.equal(s.petLife.eggs.length,1);assert.equal(s.petLife.lastGrowth,null);
 for(const f of s.petLife.fish){assert.equal(f.length,7900);assert.deepEqual(f.growthHistory,[{stage:'warasa',day:0,length:7900,initial:true}]);}
 P.sync(s,catalog,3);assert.ok(s.petLife.fish.some(f=>f.origin==='bred'&&f.length===150));
});

test('legacy shop Buri keep their 24cm birth size, growth, eggs and adult breeding credit',()=>{
 for(const length of [2400,8000]){
  const s=pair(length);s.petLife.fish.forEach(f=>{f.bornSize=2400;});
  s.petLife.eggs=[{uid:'egg-1',species:'buri',tank:0,laidDay:0,hatchDay:3,generation:1,water:100}];s.petLife.nextEggId=2;
  if(length===8000)s.petLife.breeding={'0:buri':{days:2,lastDay:0,mother:'pet-2',father:'pet-1'}};
  const before=copy(s);P.normalize(s,catalog,['shuu'],0);assert.deepEqual(s,before);
  care(s,0);assert.equal(s.petLife.fish[0].bornSize,2400);assert.equal(s.petLife.fish[0].length,length+300);
  assert.deepEqual(s.petLife.eggs[0],before.petLife.eggs[0]);assert.equal(s.petLife.eggs.length,length===8000?2:1);
 }
 assert.equal(P.purchaseSize(catalog[1]),catalog[1].start);
});

test('a newly purchased Mojako survives an actual game save and reload at 1.5cm',()=>{
 const app=boot({...seed(),caught:{buri:1},money:30000,gameMinutes:600});let saved,fresh;
 try{
  const w=app.window;w.eval("petUi.open('shop')");w.document.querySelector('[data-pet-buy="buri"]').click();
  fresh=read(w,'s.petLife.fish[0]');w.eval('save()');saved=JSON.parse(w.localStorage.getItem(saveKey));assert.deepEqual(app.errors,[]);
 }finally{app.dispose();}
 const restored=boot(saved);try{
  const w=restored.window;assert.deepEqual(read(w,'s.petLife.fish[0]'),fresh);assert.equal(fresh.length,150);assert.equal(fresh.bornSize,150);
  w.eval("petUi.open('aquarium')");assert.match(w.document.querySelector('.pet-tank-info h3').textContent,/モジャコ/);
  assert.deepEqual(read(w,'s.caught'),saved.caught);assert.deepEqual(restored.errors,[]);
 }finally{restored.dispose();}
});

test('the actual shop, aquarium records and reload use stage names but the wild encyclopedia stays one Buri',()=>{
 const app=boot({...seed(),caught:{...seed().caught,buri:1},money:30000,gameMinutes:600}),w=app.window;let saved;
 try{
  w.eval("petUi.open('shop')");
  const stock=w.document.querySelector('[data-pet-buy="buri"]').closest('article');assert.match(stock.textContent,/1\.50cm.*モジャコから育てる/s);
  w.document.querySelector('[data-pet-buy="buri"]').click();w.eval("s.petLife.food=100;petUi.open('aquarium')");
  assert.match(w.document.querySelector('.pet-tank-info h3').textContent,/モジャコ/);assert.equal(w.document.querySelector('[data-pet-size-rank]').textContent,'稚魚');
  const fresh=read(w,'s.petLife.fish[0]');assert.equal(fresh.length,150);assert.equal(fresh.bornSize,150);assert.equal(fresh.origin,'shop');assert.equal(fresh.generation,0);
  for(let d=0;d<12;d++)w.eval("ShuPetLife.care(s,s.petLife.fish[0].uid,'water',"+d+",petCatalog);ShuPetLife.care(s,s.petLife.fish[0].uid,'feed',"+d+",petCatalog);sleepAtPlayerHome()");
  w.eval("petUi.open('aquarium')");
  assert.match(w.document.querySelector('.pet-tank-info h3').textContent,/イナダ/);assert.match(w.document.querySelector('.pet-growth-notice').textContent,/イナダに育った/);
  w.document.querySelector('[data-pet-action="records"]').click();const record=w.document.querySelector('[data-pet-growth="inada"]');
  assert.ok(record);assert.match(record.textContent,/ハマチ/);assert.match(record.textContent,/モジャコ.*ワカシ.*イナダ/s);assert.match(record.textContent,/80.00cm/);
  assert.match(w.document.querySelector('#rescueToast').textContent,/イナダに育った/);
  assert.equal(read(w,"fish.find(f=>f.id==='buri').name"),'ブリ');assert.equal(read(w,'fish.length'),60);assert.equal(Object.keys(A.species).length,60);assert.equal(read(w,"s.caught.buri"),1);
  w.eval('save()');saved=JSON.parse(w.localStorage.getItem(saveKey));assert.deepEqual(app.errors,[]);
 }finally{app.dispose();}
 const restored=boot(saved);try{restored.window.eval("petUi.open('aquarium')");assert.match(restored.window.document.querySelector('.pet-tank-info h3').textContent,/イナダ/);assert.equal(read(restored.window,'s.petLife.fish[0].growthHistory.length'),3);assert.deepEqual(restored.errors,[]);}finally{restored.dispose();}
});

test('aquarium age drawings remain unclipped and distinct at all 97 headings without replacing wild Buri',async()=>{
 const canvas=createCanvas(448,224),ctx=canvas.getContext('2d'),wild=A.species.buri.asset;
 for(const [id,def] of Object.entries(A.aquarium)){
  assert.notEqual(def.asset,wild);const im=await loadImage(path.join(__dirname,'..',def.asset));
  for(let n=0;n<=96;n++){
   assert.equal(A.draw(ctx,im,id,7,n/16,()=>im),true);const px=ctx.getImageData(0,0,448,224).data;let count=0,edge=0;
   for(let i=0;i<448*224;i++)if(px[i*4+3]>100){count++;const x=i%448,y=Math.floor(i/448);if(x<2||x>445||y<2||y>221)edge++;}
   assert.ok(count>3500,id+' heading '+n);assert.equal(edge,0,id+' edges '+n);
  }
 }
 for(const [length,id] of [[150,'buriMojako'],[2400,'buriYoung'],[3500,'buriYoung'],[6000,'buri'],[8000,'buri']])assert.equal(L.appearance({species:'buri',length,origin:'bred',generation:1},catalog).artId,id);
 assert.equal(A.species.buri.asset,wild);assert.equal(A.assets('buri')[0],wild);
});

