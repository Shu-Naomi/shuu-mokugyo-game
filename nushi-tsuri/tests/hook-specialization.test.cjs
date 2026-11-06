const {test}=require('node:test'),assert=require('node:assert/strict');
const Balance=require('../tackle-balance.js');
const {boot,seed,read,saveKey}=require('./game-harness.cjs');
const hooks=['small','medium','large','micro','carp'];
function specimens(w,id,hook){return read(w,`(()=>{const counts={};let sum=0;for(let i=0;i<5000;i++){let calls=0;const p=rollFishSpecimen(fish.find(f=>f.id===${JSON.stringify(id)}),()=>calls++?.5:(i+.5)/5000,${JSON.stringify(hook)});if(calls!==2)throw Error('RNG draw count');const t=fishSizeTierById(${JSON.stringify(id)},p.tierId);if(p.hundredths<t.minHundredths||p.hundredths>t.maxHundredths)throw Error('size bounds');counts[p.tierId]=(counts[p.tierId]||0)+1;sum+=p.hundredths;}return {counts,mean:sum/5000};})()`);}
test('specialists are useful alternatives, never universal upgrades or hard bycatch bans',()=>{
 assert.deepEqual(Object.keys(Balance.hooks),hooks);
 for(const [id,p] of Object.entries(Balance.species))for(const hook of hooks){assert.ok(Balance.weight(id,'worm',hook)>0,`${id}/${hook}`);if(p.band==='large')assert.ok(Balance.weight(id,'worm','small')<Balance.weight(id,'worm','medium')*.1,id);}
 assert.ok(Balance.weight('koi','corn','carp')>Balance.weight('koi','corn','large'));
 assert.ok(Balance.weight('raigyo','liveMinnow','carp')<Balance.weight('raigyo','liveMinnow','large'));
 assert.ok(Balance.weight('medaka','river','micro')>Balance.weight('medaka','river','small'));
 assert.ok(Balance.weight('funa','corn','micro')<Balance.weight('funa','corn','small')*.1);
 for(const hook of hooks)assert.equal(Balance.allowed('nushiSecret',hook),hook==='large');
 for(const hook of ['small','micro']){const weights=[10,30,60,100,200].map(cm=>Balance.specimenWeight('koi',hook,{minHundredths:cm*100,maxHundredths:cm*100}));assert.ok(weights.every(x=>x>0&&x<=1));assert.ok(weights.every((x,i)=>!i||x<weights[i-1]));}
});
test('real specimen lottery reduces large individuals, preserves general tackle and meals, and uses two draws',()=>{
 const app=boot({...seed(),preparedMeals:{bigFishPlate:1}}),w=app.window;
 try{
  const plain=specimens(w,'koi',null),small=specimens(w,'koi','small'),micro=specimens(w,'koi','micro');
  assert.ok(small.mean<plain.mean*.95);assert.ok(micro.mean<small.mean);
  for(const hook of ['medium','large','carp'])assert.deepEqual(specimens(w,'koi',hook),plain);
  assert.deepEqual(specimens(w,'funa','small'),specimens(w,'funa',null));
  const before=specimens(w,'medaka','micro');w.eatPreparedMeal('bigFishPlate');const after=specimens(w,'medaka','micro');
  const big=d=>(d.counts.large||0)+(d.counts.giant||0);assert.ok(big(after)>big(before)+400);assert.ok(after.counts.tiny>0);const fedSmall=specimens(w,'koi','small');assert.ok(big(fedSmall)>big(small)+400);assert.ok(fedSmall.mean<specimens(w,'koi',null).mean);
  assert.deepEqual(app.errors,[]);
 }finally{app.dispose();}
});
test('actual cast resolution supplies the bait hook, excludes lure hooks, and spends only its normal resources',()=>{
 const app=boot({...seed(),hp:100,x:123,y:92,direction:'up',baits:{worm:20},ownedRods:['bamboo','lureRod'],lures:{silverSpoon:1}}),w=app.window;
 try{
  w.eval('window.originalSpecimen=rollFishSpecimen;window.receivedHooks=[];rollFishSpecimen=function(f,r,h){receivedHooks.push(h);return originalSpecimen(f,r,h)}');
  for(const method of ['bait','lure'])for(const hook of ['micro','carp']){
   w.eval(`s.fishingMethod=${JSON.stringify(method)};s.selectedRod=${JSON.stringify(method==='lure'?'lureRod':'bamboo')};s.selectedHook=${JSON.stringify(hook)};cast();beginFishing();battle.cast=50`);
   const before=read(w,'({bait:s.baits.worm,time:s.gameMinutes,caught:s.caught,lure:s.lures.silverSpoon})');
   assert.equal(w.launchSurfaceCast(),true);assert.equal(read(w,'receivedHooks.at(-1)'),method==='bait'?hook:null);
   assert.equal(read(w,'battle.hook'),hook);assert.ok(read(w,'battle.specimen.hundredths')>0);
   assert.equal(read(w,'s.baits.worm'),before.bait-(method==='bait'?1:0));assert.equal(read(w,'s.gameMinutes'),before.time+10);assert.deepEqual(read(w,'s.caught'),before.caught);assert.equal(read(w,'s.lures.silverSpoon'),before.lure);
   w.eval('clearTimeout(castLandingTimer);endBattle()');
  }assert.deepEqual(app.errors,[]);
 }finally{app.dispose();}
});
test('new and old saved hook IDs and valid catch memories survive normalization without granting resources',()=>{
 for(const hook of hooks){const saved={...seed(),selectedHook:hook,extraFuture:{keep:8}},app=boot(saved),w=app.window;
  try{
   assert.equal(read(w,'s.selectedHook'),hook);assert.equal(read(w,'s.money'),saved.money);assert.deepEqual(read(w,'s.caught'),saved.caught);
   const memory=read(w,`(()=>{const t=fishSizeProfiles.funa[0],m={hundredths:t.minHundredths,gameMinutes:500,spotId:'lake-shallow',rodId:'bamboo',baitId:'worm',hookId:${JSON.stringify(hook)},method:'bait',fightMode:'gauge'};return ShuCatchMemories.normalize({funa:{first:m}},s,catchMemoryCatalog).funa.first})()`);
   assert.equal(memory.hookId,hook);w.save();const persisted=JSON.parse(w.localStorage.getItem(saveKey));assert.equal(persisted.selectedHook,hook);assert.deepEqual(persisted.extraFuture,saved.extraFuture);assert.equal(persisted.baits.worm,saved.baits.worm);assert.deepEqual(app.errors,[]);
  }finally{app.dispose();}
 }
});
test('real weighted species selection favors carp without excluding other lake fish',()=>{
 const app=boot(),w=app.window;
 try{
  const result=read(w,`(()=>{const out={},original=Math.random;try{for(const hook of ['small','large','micro','carp']){const counts={};battle={spot:'lake-mid',bait:'corn',hook,waterZone:'lake'};for(let i=0;i<10000;i++){Math.random=()=>(i+.5)/10000;const id=pick(50,battle.spot).id;counts[id]=(counts[id]||0)+1;}out[hook]=counts;}}finally{Math.random=original;battle=null;}return out;})()`);
  assert.ok(result.carp.koi>result.large.koi);assert.ok(result.small.koi<result.large.koi*.1);
  assert.ok(result.carp.funa>0&&result.small.koi>0);assert.ok(result.small.funa>result.micro.funa);
  assert.deepEqual(app.errors,[]);
 }finally{app.dispose();}
});
test('real inventory and casting menu handlers expose five icons and retain hook category on repeated choices',()=>{
 const app=boot({...seed(),hp:100,mapRegion:'village',x:127,y:56,direction:'up',baits:{worm:20,nushiSecret:2}}),w=app.window,d=w.document;
 try{
  const valid=read(w,`fish.every(f=>Object.keys(ShuTackle.hooks).every(h=>{const n=ShuTackle.weight(f.id,'worm',h);return Number.isFinite(n)&&n>0}))`);assert.equal(valid,true);
  const notes=read(w,'ShuLakeResearch.model(s,{fish,encyclopedia:fishEncyclopediaData,baits:baitData,rods:rodData,tackle:ShuTackle,legendary:ShuRegional.legendary,finalReady:ShuRegional.finalReady})');assert.match(notes.fish.find(f=>f.id==="koi").hook,/ハリ大.*コイ針/);assert.match(notes.fish.find(f=>f.id==="medaka").hook,/小魚針/);
  w.openInventory('tackle');
  for(const scope of ['#inventory','#tackle']){
   if(scope==='#tackle'){w.close();d.querySelector('#action').click();assert.equal(read(w,'battle.phase'),'prep');d.querySelector('#wait').click();w.setCastTackleCategory('hook');}
   const buttons=[...d.querySelectorAll(`${scope} [data-pick-hook]`)];assert.equal(buttons.length,5);
   assert.ok(buttons.every(b=>b.querySelector('svg')||b.closest('.compact-product')?.querySelector('svg')));
   for(const hook of ['micro','carp','carp']){
    d.querySelector(`${scope} [data-pick-hook="${hook}"]`).click();assert.equal(read(w,'s.selectedHook'),hook);
    assert.equal(d.querySelector(`${scope} [data-pick-hook="${hook}"]`).getAttribute('aria-pressed'),'true');
    if(scope==='#tackle')assert.equal(d.querySelector('#castTackle-hook').hidden,false);
   }
   d.querySelector(`${scope} [data-pick-bait="nushiSecret"]`).click();
   for(const hook of hooks)assert.equal(d.querySelector(`${scope} [data-pick-hook="${hook}"]`).disabled,hook!=='large');
   d.querySelector(`${scope} [data-pick-bait="worm"]`).click();
  }assert.deepEqual(app.errors,[]);
 }finally{app.dispose();}
});
