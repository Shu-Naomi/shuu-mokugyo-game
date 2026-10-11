const {test}=require('node:test'),assert=require('node:assert/strict');
const {createCanvas,loadImage}=require('@napi-rs/canvas'),path=require('node:path'),fs=require('node:fs');
const P=require('../pet-life.js'),A=require('../aquarium-life.js'),Art=require('../fish-art.js');
const {boot,seed,read,saveKey}=require('./game-harness.cjs');
const copy=x=>JSON.parse(JSON.stringify(x));
const catalog=[{id:'moroko',name:'モロコ',start:750,min:100,max:1799,price:300,waterLabel:'淡水'},
 {id:'aji',name:'アジ',start:1000,min:500,max:4999,price:550,waterLabel:'海水'},
 ...['nushi','streamNushi','coastNushi','caveNushi','starNushi'].map(id=>({id,name:id,legendary:true,start:15000,min:10000,max:39999,price:0,waterLabel:id==='coastNushi'?'海水':'淡水'}))];
const dogs=['shuu','riku','grey'];
function state(caught={moroko:1}){const s={money:100000,caught,dogAffinity:{shuu:0}};P.normalize(s,catalog,dogs,0,{legacy:true});return s;}
function click(w,q){const b=w.document.querySelector(q);assert.ok(b,q);assert.equal(b.disabled,false,q);b.click();return b;}

test('each earned legendary uses its own water pool without displacing thirty ordinary specimens or charging money',()=>{
 const caught=Object.fromEntries(catalog.map(f=>[f.id,1])),s=state(caught);
 s.sizeRecords={starNushi:{hundredths:36543}};
 for(let tank=0;tank<6;tank++)for(let n=0;n<5;n++)assert.equal(P.acquire(s,'moroko',catalog,0,tank).ok,true);
 const ordinary=copy(s.petLife.fish),money=s.money;
 for(const spec of catalog.filter(P.isLegend)){
  assert.equal(P.acquire(s,spec.id,catalog,0,0).ok,false);
  const f=P.acquire(s,spec.id,catalog,0).fish;assert.ok(f);assert.equal(f.tank,spec.waterLabel==='海水'?7:6);
  assert.equal(P.acquire(s,spec.id,catalog,0).ok,false);
  assert.equal(P.buyBackQuote(f,catalog).eligible,false);assert.equal(P.rehome(s,f.uid,catalog,0).ok,false);
  assert.equal(P.moveFish(s,f.uid,f.tank===6?7:6,catalog,0).ok,false);
 }
 assert.deepEqual(s.petLife.fish.slice(0,30),ordinary);assert.equal(s.money,money);
 assert.equal(s.petLife.fish.find(f=>f.species==='starNushi').length,36543);
 assert.equal(P.residents(s,6).length,4);assert.equal(P.residents(s,7).length,1);assert.equal(P.totalCapacity(s),46);
 assert.equal(P.canHouse(s,'moroko',catalog,6),false);assert.equal(P.canHouse(s,'aji',catalog,7),false);
 const saved=copy(s);P.normalize(s,catalog,dogs,0);assert.deepEqual(s,saved);assert.deepEqual(s.caught,caught);
});

test('legend shop hides uncaught names and offers earned fish only in their matching free pools',()=>{
 const s=state();assert.deepEqual(P.tankIds(s),[0,1,2,3,4,5]);
 const before=copy(s);assert.equal(P.acquire(s,'starNushi',catalog,0).ok,false);assert.deepEqual(s,before);
 s.caught.coastNushi=1;P.sync(s,catalog,0);assert.deepEqual(s.petLife.legendTanks,{fresh:false,salt:true});
 assert.equal(P.selectTank(s,6),false);assert.equal(P.selectTank(s,7),true);
 const app=boot({...seed(),caught:{moroko:1}}),w=app.window;
 try{w.eval('petUi.open("shop")');click(w,'[data-pet-tab="legends"]');assert.equal(w.document.querySelector('[data-pet-nushi]'),null);assert.doesNotMatch(w.document.querySelector('.pet-content').textContent,/星湖のぬし|地底湖のぬし/);assert.deepEqual(app.errors,[]);}finally{app.dispose();}
 const earned=boot({...seed(),money:1000,caught:{nushi:1,coastNushi:1}}),ew=earned.window;
 try{
  ew.eval('petUi.open("shop")');click(ew,'[data-pet-tab="legends"]');
  assert.equal(ew.document.querySelectorAll('[data-pet-nushi]').length,2);
  click(ew,'[data-pet-nushi="nushi"]');click(ew,'[data-pet-nushi="coastNushi"]');
  assert.equal(read(ew,'s.money'),1000);assert.deepEqual(read(ew,'s.petLife.fish.map(f=>f.tank)'),[6,7]);
  assert.equal(ew.document.querySelector('[data-pet-nushi="nushi"]').disabled,true);
  assert.equal(ew.document.querySelector('[data-pet-nushi="coastNushi"]').disabled,true);
  assert.deepEqual(earned.errors,[]);
 }finally{earned.dispose();}
});

test('old owned nushi migrates with its uid, size, care and contest history; repeat loading is stable',()=>{
 const s=state({moroko:1,nushi:1}),normal=P.acquire(s,'moroko',catalog,0,0).fish,nushi=P.acquire(s,'nushi',catalog,0).fish;
 normal.lastDay=8;nushi.lastDay=8;nushi.tank=0;nushi.length=25321;nushi.xp=99;nushi.level=P.fishLevel(99);nushi.careDays=8;nushi.health=94;nushi.stars=3;
 s.petLife.version=4;delete s.petLife.legendClaims;delete s.petLife.legendTanks;s.petLife.selected=nushi.uid;s.petLife.selectedTank=0;
 s.petLife.best['fish:advanced']=91;const previous=copy(nushi),other=copy(normal);
 P.normalize(s,catalog,dogs,8);assert.deepEqual(s.petLife.fish.find(f=>f.uid===nushi.uid),{...previous,tank:6});
 assert.deepEqual(s.petLife.fish.find(f=>f.uid===normal.uid),other);assert.equal(s.petLife.selectedTank,6);
 assert.equal(s.petLife.best['fish:advanced'],91);assert.equal(P.acquire(s,'nushi',catalog,8).ok,false);
 const loaded=copy(s);P.normalize(s,catalog,dogs,8);assert.deepEqual(s,loaded);
});

test('breeding alone creates below-extreme-tiny fry, then feeding changes the stage without changing wild tiers or catches',()=>{
 const s=state(),mother=P.acquire(s,'moroko',catalog,0,0).fish;P.acquire(s,'moroko',catalog,0,0);s.petLife.food=100;
 for(let d=0;d<3;d++){P.care(s,mother.uid,'feed',d,catalog);if(d===2)P.care(s,mother.uid,'water',d,catalog);P.sync(s,catalog,d+1);}
 P.sync(s,catalog,5);const fry=s.petLife.fish.find(f=>f.generation===1);
 assert.ok(fry.length>0&&fry.length<catalog[0].min);assert.equal(P.lifeStage(fry,catalog),'fry');assert.equal(fry.origin,'bred');assert.equal(fry.changedDay,2);
 const born=copy(s);P.normalize(s,catalog,dogs,5);assert.deepEqual(s,born);
 assert.equal(P.buyBackQuote(fry,catalog).eligible,false);
 P.care(s,fry.uid,'feed',5,catalog);P.sync(s,catalog,6);const grown=s.petLife.fish.find(f=>f.uid===fry.uid);
 assert.equal(grown.length,125);assert.equal(P.lifeStage(grown,catalog),'juvenile');assert.deepEqual(s.caught,{moroko:1});
 assert.equal(P.acquire(s,'moroko',catalog,6,1).fish.length,750);
});

test('v4 descendants keep their already-grown size while malformed shop fry and duplicate legendary claims are repaired',()=>{
 const s=state({moroko:1,nushi:1}),f=P.acquire(s,'moroko',catalog,0,0).fish;
 f.generation=1;f.origin='bred';f.bornSize=600;f.length=900;s.petLife.version=4;
 P.normalize(s,catalog,dogs,0);assert.equal(s.petLife.fish[0].bornSize,600);assert.equal(s.petLife.fish[0].length,900);
 const purchased=P.acquire(s,'moroko',catalog,0,1).fish;purchased.bornSize=1;purchased.length=1;
 const legend=P.acquire(s,'nushi',catalog,0).fish;s.petLife.fish.push({...legend,uid:'pet-100'});
 P.normalize(s,catalog,dogs,0);assert.equal(s.petLife.fish.filter(f=>f.species==='nushi').length,1);
 assert.equal(s.petLife.fish.find(f=>f.uid===purchased.uid).length,catalog[0].min);
});

test('individual portraits visibly distinguish fry, juveniles and big adults without clipping in phone or PC boxes',()=>{
 for(const [w,h]of [[360,175],[620,330],[180,104]]){
  const widths=[25,300,750,1700].map(length=>A.specimenDimensions({length},catalog[0],w,h,2).width);
  assert.ok(widths.every((n,i)=>!i||n>widths[i-1]));assert.ok(widths[0]>=14);assert.ok(widths.at(-1)<=w*.76&&widths.at(-1)/2<=h*.6);
 }
});

test('buyback selects one tank and one exact uid, shows sized portraits and comments, and cancels or pays once across reload',()=>{
 const app=boot({...seed(),caught:{moroko:1,aji:1},money:20000}),w=app.window;let saved;
 try{
  w.eval('petUi.open("shop")');click(w,'[data-pet-buy="moroko"]');click(w,'[data-pet-buy="moroko"]');
  w.eval('ShuPetLife.acquire(s,"aji",petCatalog,0,1);s.petLife.fish.forEach(f=>{f.careDays=4;f.health=90;});s.petLife.fish[1].length=1600;save();');
  const before=read(w,'({money:s.money,time:s.gameMinutes,food:s.petLife.food,fish:s.petLife.fish,caught:s.caught,records:s.sizeRecords})');
  click(w,'[data-pet-tab="buyback"]');assert.equal(w.document.querySelector('[data-pet-buyback]'),null);
  click(w,'[data-pet-buyback-tank="0"]');assert.equal(w.document.querySelectorAll('[data-pet-buyback]').length,2);assert.equal(w.document.querySelector('[data-pet-buyback="pet-3"]'),null);
  const images=[...w.document.querySelectorAll('[data-pet-specimen]')];assert.ok(parseFloat(images[1].style.width)>parseFloat(images[0].style.width));assert.match(w.document.querySelector('.pet-card-comment').textContent,/アスアル/);
  click(w,'[data-pet-buyback="pet-2"]');assert.match(w.document.querySelector('.pet-buyback-detail').textContent,/#2.*16\.00cm/s);
  click(w,'[data-pet-action="buyback-cancel"]');assert.deepEqual(read(w,'({money:s.money,time:s.gameMinutes,food:s.petLife.food,fish:s.petLife.fish,caught:s.caught,records:s.sizeRecords})'),before);
  click(w,'[data-pet-buyback="pet-2"]');const quote=read(w,'ShuPetLife.buyBackQuote(s.petLife.fish.find(f=>f.uid==="pet-2"),petCatalog).price');
  const button=click(w,'[data-pet-action="buyback-confirm"]');button.click();assert.equal(read(w,'s.money'),before.money+quote);
  assert.deepEqual(read(w,'s.petLife.fish.map(f=>f.uid)'),['pet-1','pet-3']);assert.equal(w.document.querySelectorAll('[data-pet-buyback]').length,1);
  saved=JSON.parse(w.localStorage.getItem(saveKey));assert.deepEqual(app.errors,[]);
 }finally{app.dispose();}
 const reload=boot(saved);try{assert.equal(read(reload.window,'s.money'),saved.money);assert.deepEqual(read(reload.window,'s.petLife.fish.map(f=>f.uid)'),['pet-1','pet-3']);assert.deepEqual(reload.errors,[]);}finally{reload.dispose();}
});

test('growth appearance is restricted to specimens and adult isaki retains all native headings with genuinely transparent background',async()=>{
 const root=path.resolve(__dirname,'..'),young=await loadImage(path.join(root,'assets/fish-isaki-v220.png')),adult=await loadImage(path.join(root,'assets/aquarium-isaki-adult-v230.png'));
 assert.equal(adult.width,young.width);assert.equal(adult.height,young.height);
 const c=createCanvas(448,224),ctx=c.getContext('2d');let differs=0;
 for(let f=0;f<=6;f+=.25){
  Art.draw(ctx,adult,'isaki',7,f,()=>adult);const data=ctx.getImageData(0,0,448,224).data;
  let count=0;for(let p=3;p<data.length;p+=4)if(data[p]>100)count++;
  assert.ok(count>3000,'visible adult silhouette at heading '+f);assert.equal(data[3],0,'no rectangle behind the fish');
  const hash=Buffer.from(data).toString('base64');Art.draw(ctx,young,'isaki',7,f,()=>young);const other=ctx.getImageData(0,0,448,224).data;let originalCount=0;for(let p=3;p<other.length;p+=4)if(other[p]>100)originalCount++;assert.ok(count/originalCount>.85&&count/originalCount<1.15,'atlas keeps the original silhouette area at '+f);if(hash!==Buffer.from(other).toString('base64'))differs++;
 }
 assert.equal(differs,25);
 assert.equal(A.appearance({species:'isaki',length:2399},[{id:'isaki',min:100,start:1000}]).adultIsaki,false);
 assert.equal(A.appearance({species:'isaki',length:2400},[{id:'isaki',min:100,start:1000}]).adultIsaki,true);
 assert.ok(A.appearance({species:'nijimasu',length:1200},catalog).strength>A.appearance({species:'nijimasu',length:2500},catalog).strength);
 const app=boot(seed()),w=app.window;try{
  w.eval('prepareAquariumFish("isaki");petUi.open("shop");s.caught.isaki=1;petUi.render();');click(w,'[data-pet-buy="isaki"]');
  w.eval('s.petLife.fish[0].length=2500;petUi.render()');click(w,'[data-pet-tab="buyback"]');click(w,'[data-pet-buyback-tank="0"]');
  const picture=w.document.querySelector('[data-pet-specimen]');assert.match(picture.dataset.specimenAppearance,/縞が目立たなく/);assert.equal(picture.dataset.specimenLength,'2500');
  assert.match(picture.querySelector('canvas').dataset.atlasKey,/stripes:0\.000/);
  const el=w.document.createElement('div');w.drawAquariumSprite(el,'isaki',0);assert.doesNotMatch(el.dataset.aquariumFrame,/stripes/);assert.deepEqual(app.errors,[]);
 }finally{app.dispose();}
 assert.match(fs.readFileSync(path.join(root,'sw.js'),'utf8'),/aquarium-isaki-adult-v230/);
});
