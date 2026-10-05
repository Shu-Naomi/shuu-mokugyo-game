const {test}=require('node:test'),assert=require('node:assert/strict');
const {boot,seed,read,saveKey}=require('./game-harness.cjs');
const state=()=>({...seed(),hp:100,gameMinutes:420,mapRegion:'stream',x:128,y:76,direction:'left',selectedBait:'worm',selectedHook:'medium',ownedRods:['bamboo','clearStream','lureRod'],lures:{silverSpoon:1},baits:{worm:40,river:40,nushiSecret:1,shell:2}});
const click=(w,q)=>{const b=w.document.querySelector(q);assert.ok(b,q);b.click();};
const pages=w=>[...w.document.querySelectorAll('[data-cast-tackle-page]')].filter(p=>!p.hidden).map(p=>p.dataset.castTacklePage);

test('cast tackle categories keep equipment, stock and the start button available; selections save without spending bait',()=>{
 const app=boot(state()),w=app.window;let saved;
 try{
  w.eval('action();wait()');assert.ok(w.document.querySelector('#tackle.open'));
  const before=read(w,'({baits:s.baits,money:s.money,hp:s.hp,clock:s.gameMinutes})');
  for(const category of ['method','bait','hook','rod','fight']){
   click(w,`[data-cast-tackle="${category}"]`);assert.deepEqual(pages(w),[category]);
   assert.equal(w.document.querySelectorAll('.cast-tackle-nav [aria-pressed="true"]').length,1);
   assert.deepEqual(read(w,'({baits:s.baits,money:s.money,hp:s.hp,clock:s.gameMinutes})'),before);
   assert.ok(w.document.querySelector('#castTackleSummary'));assert.ok(w.document.querySelector('#beginCast'));
  }
  click(w,'[data-cast-tackle="bait"]');click(w,'#baitOptions [data-pick-bait="river"]');assert.deepEqual(pages(w),['bait']);
  click(w,'[data-cast-tackle="hook"]');const hook=w.document.querySelector('#hookOptions [data-pick-hook="small"]');hook.focus();hook.click();
  assert.equal(w.document.activeElement.dataset.pickHook,'small','keyboard focus survives the selected-button repaint');
  click(w,'[data-cast-tackle="rod"]');click(w,'#rodOptions [data-pick-rod="clearStream"]');
  click(w,'[data-cast-tackle="fight"]');click(w,'#castFightOptions [data-fight-mode="gauge"]');
  assert.deepEqual(read(w,'[s.selectedBait,s.selectedHook,s.selectedRod,s.fightMode]'),['river','small','clearStream','gauge']);
  assert.match(w.document.querySelector('#castTackleSummary').textContent,/川虫.*ハリ小/);
  assert.deepEqual(read(w,'({baits:s.baits,money:s.money,hp:s.hp,clock:s.gameMinutes})'),before);
  w.close();w.wait();assert.deepEqual(pages(w),['fight']);
  click(w,'#beginCast');w.eval('clearInterval(timer)');assert.equal(read(w,'battle.phase'),'cast');
  assert.equal(read(w,'battle.bait'),'river');assert.equal(read(w,'battle.hook'),'small');assert.deepEqual(read(w,'s.baits'),before.baits);
  w.eval('save()');saved=JSON.parse(w.localStorage.getItem(saveKey));assert.deepEqual(app.errors,[]);
 }finally{app.dispose();}
 const resumed=boot(saved);try{assert.deepEqual(read(resumed.window,'[s.selectedBait,s.selectedHook,s.selectedRod,s.fightMode]'),['river','small','clearStream','gauge']);assert.deepEqual(resumed.errors,[]);}finally{resumed.dispose();}
});

test('cast controls retain lure-rod and exclusive-bait restrictions',()=>{
 const app=boot({...state(),ownedRods:['bamboo'],lures:{silverSpoon:0}}),w=app.window;
 try{
  w.eval('action();wait()');click(w,'[data-cast-tackle="method"]');assert.equal(w.document.querySelector('#castTackleMethods [data-fishing-method="lure"]').disabled,true);
  click(w,'[data-cast-tackle="bait"]');click(w,'#baitOptions [data-pick-bait="nushiSecret"]');
  assert.equal(read(w,'s.selectedHook'),'large');click(w,'[data-cast-tackle="hook"]');
  for(const id of ['small','medium'])assert.equal(w.document.querySelector(`#hookOptions [data-pick-hook="${id}"]`).disabled,true);
  click(w,'[data-cast-tackle="bait"]');click(w,'#baitOptions [data-pick-bait="river"]');
  w.eval('s.ownedRods.push("lureRod");s.lures.silverSpoon=1;renderTackle()');click(w,'[data-cast-tackle="method"]');click(w,'#castTackleMethods [data-fishing-method="lure"]');
  assert.equal(read(w,'s.selectedRod'),'lureRod');assert.equal(read(w,'s.fishingMethod'),'lure');assert.match(w.document.querySelector('#castTackleSummary').textContent,/銀のスプーン/);
  click(w,'#beginCast');w.eval('clearInterval(timer)');assert.equal(read(w,'battle.method'),'lure');assert.equal(read(w,'s.lures.silverSpoon'),1);assert.deepEqual(app.errors,[]);
 }finally{app.dispose();}
});

test('ordinary Amago and Kajika are reachable without boss records and bait/depth select different fish',()=>{
 const app=boot(state()),w=app.window;
 try{
  const counts={};
  for(const depth of ['shallow','mid','deep']){
   w.eval(`Math.random=(()=>{let n=519;return ()=>((n=Math.imul(n,1664525)+1013904223>>>0)/4294967296)})();battle={method:'bait',bait:'river',hook:'small',practice:false}`);
   const picks=read(w,`Array.from({length:1200},()=>pick(50,'mountain-stream-${depth}')?.id)`);
   counts[depth]=Object.fromEntries(['amago','kajika'].map(id=>[id,picks.filter(p=>p===id).length]));
   for(const id of ['amago','kajika'])assert.ok(counts[depth][id]>90,id+' practical odds '+depth);
   assert.equal(picks.includes('streamNushi'),false);
  }
  assert.ok(counts.mid.amago>counts.deep.amago*1.25,'Amago favours middle water');
  assert.ok(counts.deep.kajika>counts.mid.kajika*1.3,'Kajika favours deep water');
  for(const id of ['amago','kajika']){
   assert.ok(w.ShuTackle.weight(id,'river','small')>w.ShuTackle.weight(id,'corn','small')*10);
   assert.ok(w.ShuTackle.weight(id,'river','small')>w.ShuTackle.weight(id,'river','large'));
   for(const spot of ['lake-mid','river-mid','mountain-pond-mid','mountain-marsh-mid','mountain-underground-mid'])assert.equal(read(w,`fishingSpotById('${spot}').weights.${id}||0`),0,id+' '+spot);
  }
  assert.equal(w.ShuRegional.ordinary.stream.length,9,'new ordinary fish do not reset old boss completion');assert.deepEqual(app.errors,[]);
 }finally{app.dispose();}
});

test('real stream casts record new species once and connect their art, sizes, tank, cooking and saved records',()=>{
 const app=boot(state()),w=app.window;let saved;
 try{
  for(const id of ['amago','kajika']){
   w.eval(`s.selectedBait='river';s.selectedHook='small';s.selectedRod='clearStream';action();beginFishing();clearInterval(timer);let roll_${id}=0;for(let n=0;n<1000;n++){Math.random=()=>n/1000;if(pick(50,'mountain-stream-mid').id==='${id}'){roll_${id}=n/1000;break;}}Math.random=()=>roll_${id};resolveSurfaceCast(50);clearInterval(timer)`);
   assert.equal(read(w,'battle.f.id'),id);w.eval('startFight();clearInterval(timer);finishHookReveal();renderBattleFish()');
   assert.match(w.document.querySelector('#battleFish canvas').dataset.atlasKey,new RegExp('fish-'+id+'-v219'));
   const portions=read(w,'s.cookingIngredients.fishFillet');w.eval('caught();caught();hideCatchCard()');assert.equal(read(w,`s.caught.${id}`),1);assert.equal(read(w,'s.cookingIngredients.fishFillet'),portions+1);
   assert.equal(read(w,`s.fishCatchRecords.${id}.last.spotId`),'mountain-stream-mid');assert.equal(read(w,`fishSizeProfiles.${id}.length`),6);
   assert.ok(read(w,'petCatalog').some(f=>f.id===id));w.eval(`renderRecord();drawAquariumSprite($('#homeAquariumFish'),'${id}',1,{spriteMode:'swim'})`);
   assert.match(w.document.querySelector('#homeAquariumFish canvas').dataset.atlasKey,new RegExp('fish-'+id+'-v219'));
   assert.ok(w.document.querySelector(`#fishRecordRows [data-record-fish="${id}"]`)||w.document.querySelector('#record').textContent.includes(id==='amago'?'アマゴ':'カジカ'));
  }
  w.openLocationInterior('diner');assert.equal(w.cookRecipe('shellSoup'),true);w.close();w.eval('save()');saved=JSON.parse(w.localStorage.getItem(saveKey));assert.deepEqual(app.errors,[]);
 }finally{app.dispose();}
 const resumed=boot(saved);try{for(const id of ['amago','kajika'])assert.equal(read(resumed.window,`s.caught.${id}`),1);assert.deepEqual(resumed.errors,[]);}finally{resumed.dispose();}
});

test('mountain casting preparation chooses scenery by the exact location, while lake and practice retain their own art',()=>{
 const app=boot(state()),w=app.window;
 try{
  for(const type of ['stream','pond','marsh','highPond','highMarsh','underground']){
   w.eval(`battle={phase:'prep',mountainType:'${type}',waterZone:'${type==='stream'?'river':'lake'}',spot:'mountain-${type}-shallow'};prepareSurfaceCastScene()`);
   assert.equal(read(w,'surfaceSceneryKind()'),'mountain-'+type);assert.equal(w.document.querySelector('#castBackdrop').dataset.locale,'mountain-'+type);
   assert.ok(w.document.querySelector('#castSurface').classList.contains('art-mountain-'+type));assert.equal(w.document.querySelector('#castSurface').classList.contains('art-lake'),false);
   assert.match(w.document.querySelector('#castZoneName').textContent,new RegExp(w.ShuMountain.names[type]));
   for(const distance of [0,50,100]){const p=read(w,`castSurfacePoint(${distance})`);assert.ok(p.x>=40&&p.x<=75&&p.y>=35&&p.y<=80,'float stays in open water');}
  }
  w.eval("battle={phase:'prep',waterZone:'lake',spot:'lake-shallow'};prepareSurfaceCastScene()");assert.equal(read(w,'surfaceSceneryKind()'),'lake');
  w.openPracticePond();assert.equal(read(w,'surfaceSceneryKind()'),'pond');assert.deepEqual(app.errors,[]);
 }finally{app.dispose();}
});
