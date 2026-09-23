const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const Balance=require('../tackle-balance.js');
const Art=require('../tackle-art.js');
const {boot,seed,read,saveKey}=require('./game-harness.cjs');

function fixedCatches(window,spot='lake-mid',bait='corn',hook='small',casts=1000){
  return read(window,`(() => {battle={spot:${JSON.stringify(spot)},bait:${JSON.stringify(bait)},hook:${JSON.stringify(hook)},waterZone:'lake'};
    const results={},original=Math.random;
    try { for(let i=0;i<${casts};i++){ Math.random=()=> (i+.5)/${casts}; const id=pick(50,battle.spot).id;results[id]=(results[id]||0)+1; } }
    finally { Math.random=original; battle=null; }
    return results;
  })()`);
}

test('species data and hook bands favor funa with corn + small hook, carp with large hook, and still allow bycatch',()=>{
  assert.equal(Object.keys(Balance.species).length,17);
  for(const [id,profile] of Object.entries(Balance.species)){
    assert.ok(['small','medium','large'].includes(profile.band),id);
    assert.ok(Object.keys(profile.baits).length>=8,id);
    assert.ok(Balance.weight(id,'worm','medium')>0,id);
  }
  const smallFuna=Balance.weight('funa','corn','small'),smallKoi=Balance.weight('koi','corn','small');
  const largeFuna=Balance.weight('funa','corn','large'),largeKoi=Balance.weight('koi','corn','large');
  assert.ok(smallFuna>smallKoi*12,'small hook counteracts koi preference');
  assert.ok(largeKoi>largeFuna*6,'large hook strongly favors koi');
  assert.ok(Balance.weight('moroko','corn','small')>0,'non-target fish still bite');
  assert.ok(Balance.weight('bass','liveMinnow','medium')>Balance.weight('bass','corn','medium')*10);
  assert.equal(Balance.weight('moroko','nushiSecret','large'),0);
  assert.equal(Balance.weight('nushi','nushiSecret','small'),0);
  assert.equal(Balance.allowed('nushiSecret','large'),true);
  assert.equal(Balance.allowed('nushiSecret','medium'),false);
});

test('actual fishing selection follows bait, hook, fishing spot and still rolls catch size independently',()=>{
  const app=boot(),w=app.window;
  try{
    const small=fixedCatches(w),large=fixedCatches(w,'lake-mid','corn','large');
    assert.ok(small.funa>750,JSON.stringify(small));
    assert.ok(small.koi>0 && small.moroko>0,'unwanted fish remain possible');
    assert.ok(large.koi>large.funa*2,JSON.stringify(large));
    const river=fixedCatches(w,'river-shallow','river','small');
    assert.ok(river.ayu>0 && river.moroko>0);
    const before=read(w,'[rollFishSpecimen(fish.find(f=>f.id==="funa"),()=>0),rollFishSpecimen(fish.find(f=>f.id==="funa"),()=>.999)]');
    w.eval('s.selectedHook="large"');
    const after=read(w,'[rollFishSpecimen(fish.find(f=>f.id==="funa"),()=>0),rollFishSpecimen(fish.find(f=>f.id==="funa"),()=>.999)]');
    assert.deepEqual(before,after,'hook does not change the individual size lottery');
    assert.equal(before[0].tierId,'tiny');assert.equal(before[1].tierId,'giant');
    assert.deepEqual(app.errors,[]);
  }finally{app.dispose();}
});

test('equipment and bait equip separately, persist, and secret bait uses only a large hook and the nushi lake spot',()=>{
  const app=boot({...seed(),baits:{worm:8,corn:15,nushiSecret:2},selectedHook:'small'}),w=app.window;let saved;
  try{
    w.eval('openInventory("tackle")');
    const doc=w.document;
    assert.equal(doc.querySelectorAll('#inventoryHookOptions button').length,3);
    assert.equal(doc.querySelectorAll('#inventoryBaitOptions button').length,11);
    assert.match(doc.querySelector('#inventoryTackleSummary').textContent,/ミミズ.*ハリ小/);
    doc.querySelector('#inventoryBaitOptions [data-pick-bait="corn"]').click();
    assert.equal(read(w,'s.selectedHook'),'small');
    assert.equal(read(w,'s.selectedBait'),'corn');
    assert.match(doc.querySelector('#inventoryTackleSummary').textContent,/トウモロコシ.*ハリ小/);
    doc.querySelector('#inventoryHookOptions [data-pick-hook="large"]').click();
    assert.equal(read(w,'s.selectedBait'),'corn');
    assert.equal(read(w,'s.selectedHook'),'large');
    doc.querySelector('#inventoryBaitOptions [data-pick-bait="nushiSecret"]').click();
    assert.equal(doc.querySelector('#inventoryHookOptions [data-pick-hook="small"]').disabled,true);
    assert.equal(doc.querySelector('#inventoryHookOptions [data-pick-hook="medium"]').disabled,true);
    assert.equal(read(w,'s.selectedHook'),'large');
    w.eval('battle={spot:"lake-deep",bait:"nushiSecret",hook:"large"}');
    for(let i=0;i<25;i++)assert.equal(w.pick(85,'lake-deep').id,'nushi');
    assert.equal(w.pick(85,'river-deep'),null,'secret bait never catches other species in another water body');
    const resources=read(w,'({bait:s.baits.nushiSecret,minutes:s.gameMinutes})');
    w.eval('battle={phase:"cast",practice:false,waterZone:"lake",minimumDepth:"deep",cast:95,bait:"nushiSecret",hook:"small"}');
    assert.equal(w.launchSurfaceCast(),false);
    assert.deepEqual(read(w,'({bait:s.baits.nushiSecret,minutes:s.gameMinutes})'),resources);
    assert.match(doc.querySelector('#battleMsg').textContent,/ハリ大/);
    w.eval('battle=null;save()');saved=JSON.parse(w.localStorage.getItem(saveKey));
    assert.equal(saved.selectedHook,'large');assert.equal(saved.baits.nushiSecret,2);
    assert.ok(doc.querySelector('#inventoryBaitOptions [data-pick-bait="nushiSecret"] svg'));
    assert.ok(doc.querySelector('#inventoryHookOptions [data-pick-hook="large"] svg'));
    assert.match(w.fishdexKnownDetail(w.eval('fish.find(f=>f.id==="funa")')),/ハリ小.*基本サイズ帯は標準/s);
    assert.deepEqual(app.errors,[]);
  }finally{app.dispose();}
  const reload=boot(saved);
  try{assert.equal(read(reload.window,'s.selectedHook'),'large');assert.equal(read(reload.window,'s.selectedBait'),'nushiSecret');
    assert.deepEqual(reload.errors,[]);}
  finally{reload.dispose();}
  const legacy=boot({...seed(),baits:{worm:5,nushiSecret:1},selectedBait:'nushiSecret'});
  try{assert.equal(read(legacy.window,'s.selectedHook'),'large','old saves with secret bait get the only compatible hook');}
  finally{legacy.dispose();}
});

test('18 unique pixel icons appear for all bait, hooks, small tackle, collectibles and the shop',()=>{
  const ids=['worm','corn','liveMinnow','nushiSecret','grasshopper','river','paste','shrimp','smallShrimp','shell','crab','hookSmall','hookMedium','hookLarge','silverSpoon','starMinnow','expeditionJoint','float'];
  assert.deepEqual(Object.keys(Art.sprites).sort(),ids.sort());
  const variants=new Set();
  for(const id of ids){const sprite=Art.sprites[id],markup=Art.icon(id);variants.add(markup);
    assert.ok(sprite.length>=4,`${id} has detailed color layers`);
    assert.match(markup,/viewBox="0 0 24 24"/);
    assert.match(markup,/shape-rendering="crispEdges"/);
    assert.equal((markup.match(/<path /g)||[]).length,sprite.length);
  }
  assert.equal(variants.size,ids.length);
  const app=boot({...seed(),fishdexCollectibles:{ancientFloat:1,glassHook:1}}),w=app.window;
  try{w.eval('openInventory("items")');assert.equal(w.document.querySelectorAll('[data-inventory-panel="items"] .tackle-pixel-icon').length,19);
    w.eval('renderSamShop()');assert.equal(w.document.querySelectorAll('#samTackleWindow .shop-item-art svg').length,6);
    w.eval('renderFishdexCollection()');assert.equal(w.document.querySelectorAll('#fishdexCollection .tackle-pixel-icon').length,2);
    assert.deepEqual(app.errors,[]);
  }finally{app.dispose();}
});

test('release references and offline cache contain both pixel and balance modules',()=>{
  const root=path.join(__dirname,'..'),html=fs.readFileSync(path.join(root,'index.html'),'utf8'),sw=fs.readFileSync(path.join(root,'sw.js'),'utf8');
  for(const id of ['tackle-balance','tackle-art']){
    assert.ok(html.includes(`${id}.js?v=191-1`));assert.ok(sw.includes(`./${id}.js?v=191-1`));
  }
});
