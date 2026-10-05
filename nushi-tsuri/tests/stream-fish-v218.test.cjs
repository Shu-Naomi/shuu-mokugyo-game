const {test}=require('node:test'),assert=require('node:assert/strict');
const {boot,seed,read,saveKey}=require('./game-harness.cjs');
const R=require('../regional-nushi.js'),M=require('../mountain-region.js');
const saved=()=>({...seed(),hp:100,mapRegion:'stream',x:128,y:76,direction:'left',selectedBait:'worm',selectedHook:'medium'});
test('stream casts reach the new fish in every depth with normal bait and spoon, without any completion gate',()=>{
 const app=boot(saved()),w=app.window;
 try{
  w.eval('let streamRng=58;Math.random=()=>((streamRng=Math.imul(streamRng,1664525)+1013904223>>>0)/4294967296)');
  for(const depth of ['shallow','mid','deep']){
   for(const method of ['bait','lure']){
    w.eval(`battle={method:'${method}',bait:'worm',hook:'medium',practice:false}`);
    const picks=read(w,`Array.from({length:400},()=>pick(50,'mountain-stream-${depth}')?.id)`);
    assert.ok(picks.filter(id=>id==='iwana').length>40,method+' '+depth+' has practical new-species odds');
    assert.equal(picks.includes('streamNushi'),false);
   }
  }
  w.eval('battle=null');for(const id of ['lake-mid','river-mid','mountain-pond-mid','mountain-marsh-mid','mountain-highPond-mid','mountain-underground-mid'])assert.equal(read(w,`fishingSpotById('${id}').weights.iwana||0`),0,id);
  assert.deepEqual(app.errors,[]);
 }finally{app.dispose();}
});
test('an actual stream cast selects Iwana, records it once, paints each screen, joins the tank catalog and resumes with the catch',()=>{
 const app=boot(saved()),w=app.window;let snapshot;
 try{
  assert.equal(read(w,'s.caught.iwana||0'),0);assert.match(w.document.querySelector('#hint').textContent,/イワナ.*ミミズ/);
  w.eval('action();beginFishing();Math.random=()=>0;resolveSurfaceCast(50);clearInterval(timer)');
  assert.equal(read(w,'battle.f.id'),'iwana');assert.equal(read(w,'battle.spot'),'mountain-stream-mid');
  w.eval('startFight();clearInterval(timer);finishHookReveal();renderBattleFish()');
  assert.match(w.document.querySelector('#battleFish canvas').dataset.atlasKey,/fish-iwana-v219\.png.*iwana/);
  w.eval('caught();caught()');assert.equal(read(w,'s.caught.iwana'),1);
  assert.equal(read(w,'s.fishCatchRecords.iwana.last.spotId'),'mountain-stream-mid');
  w.eval("hideCatchCard();renderRecord();drawAquariumSprite($('#homeAquariumFish'),'iwana',1,{spriteMode:'swim'})");
  assert.match(w.document.querySelector('#homeAquariumFish canvas').dataset.atlasKey,/fish-iwana-v219\.png/);
  assert.ok(read(w,'petCatalog').some(f=>f.id==='iwana'));assert.equal(read(w,'fishSizeProfiles.iwana.length'),6);
  w.eval('save()');snapshot=JSON.parse(w.localStorage.getItem(saveKey));assert.deepEqual(app.errors,[]);
 }finally{app.dispose();}
 const resumed=boot(snapshot);try{assert.equal(read(resumed.window,'s.caught.iwana'),1);assert.equal(read(resumed.window,'s.fishCatchRecords.iwana.last.spotId'),'mountain-stream-mid');assert.deepEqual(resumed.errors,[]);}finally{resumed.dispose();}
});
test('new Iwana does not make old completed stream records lose their boss eligibility',()=>{
 const state={regionalCatchVersion:1,regionalCaught:{stream:Object.fromEntries(R.ordinary.stream.map(id=>[id,1]))}};R.normalize(state);
 assert.equal(R.ordinary.stream.length,9);assert.equal(R.complete(state,'stream'),true);assert.ok(R.candidates(state,'mountain-stream-deep','day').streamNushi);
 for(const depth of ['shallow','mid','deep'])assert.ok(M.spots.find(s=>s.id===`mountain-stream-${depth}`).weights.iwana>0);
});
