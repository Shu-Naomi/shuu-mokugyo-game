const {test} = require('node:test');
const assert = require('node:assert/strict');
const {boot, seed, read, saveKey} = require('./game-harness.cjs');

function click(w, selector) {
  const button = w.document.querySelector(selector);
  assert.ok(button, selector);
  assert.equal(button.disabled, false, selector);
  button.click();
}

test('buy one reusable soft worm, equip it, reload, and switch between tackle in preparation', () => {
  const original = {...seed(), money:480, hp:100, ownedRods:['bamboo','lureRod'],
    baits:{worm:7}, selectedBait:'worm', lures:{silverSpoon:1,starMinnow:2}};
  const a = boot(original), w = a.window;
  let saved;
  try {
    assert.equal(read(w,'s.selectedLure'),'silverSpoon');
    w.eval('renderSamShop();open("store")');
    click(w,'#store [data-sam-category="lures"]');
    const purchase = '#store [data-buy-lure="softWorm"]';
    click(w,purchase);
    assert.equal(read(w,'s.money'),0);
    assert.equal(read(w,'s.lures.softWorm'),1);
    w.document.querySelector(purchase).click();
    assert.equal(read(w,'s.lures.softWorm'),1,'insufficient funds cannot buy another');
    w.close();
    w.openInventory('tackle');
    click(w,'#inventory [data-compact-group="method"]');
    click(w,'#inventory [data-fishing-method="lure"]');
    click(w,'#inventory [data-pick-lure="softWorm"]');
    assert.equal(read(w,'s.selectedRod'),'lureRod');
    assert.equal(read(w,'s.selectedLure'),'softWorm');
    assert.equal(w.document.querySelector('[data-stored-lure="softWorm"]'),null);
    saved = JSON.parse(w.localStorage.getItem(saveKey));
    assert.deepEqual(a.errors,[]);
  } finally { a.dispose(); }

  const b = boot(saved), v = b.window;
  try {
    assert.equal(read(v,'s.selectedLure'),'softWorm');
    assert.equal(read(v,'s.fishingMethod'),'lure');
    v.cast();
    click(v,'#wait');
    click(v,'#tackle [data-cast-tackle="method"]');
    for (const id of ['silverSpoon','softWorm']) {
      click(v,'#tackle [data-pick-lure="'+id+'"]');
      assert.equal(read(v,'s.selectedLure'),id);
    }
    click(v,'#beginCast');
    assert.equal(read(v,'battle.lure'),'softWorm');
    // Choose a reproducible roll from the normal pool. The fish still has
    // to notice the moving worm, swim up to it, bite and be landed.
    v.eval(`clearInterval(timer);battle.cast=50;
      for(let n=0;n<2000;n++){
        Math.random=()=>(n+.5)/2000;
        if(pick(50,'lake-mid').id==='funa')break;
      }
      launchSurfaceCast();settleSurfaceCast();clearInterval(timer);
      var rng=301;Math.random=()=>((rng=Math.imul(rng,1664525)+1013904223>>>0)/4294967296);
      var now=Date.now();Date.now=()=>now;
      for(let i=0;i<400&&battle.phase==='lure';i++){
        if(i>30&&i%6===0){pressBattleAction();releaseBattleAction();}
        now+=120;updateLurePresentation();
      }
      for(let i=0;i<100&&battle.phase==='interest';i++){now+=120;updateLurePresentation();}
    `);
    assert.equal(read(v,'battle.f.id'),'funa');
    assert.equal(read(v,'battle.phase'),'bite');
    v.eval(`pressBattleAction();releaseBattleAction();stopBattleFishArt();
      var nextTick;setInterval=fn=>(nextTick=fn,9001);battleTick();
      for(let i=0;i<1500&&battle.phase==='fight';i++){
        const hold=battle.ten<(battle.reeling?45:20)&&!battle.gillWash;
        if(hold&&!battle.reeling)pressBattleAction();
        if(!hold&&battle.reeling)releaseBattleAction();
        now+=120;nextTick();
      }`);
    assert.equal(read(v,'battle.phase'),'landing');
    assert.equal(read(v,'battle.method'),'lure');
    assert.equal(read(v,'s.baits.worm'),7);
    assert.deepEqual(read(v,'[s.lures.silverSpoon,s.lures.softWorm,s.lures.starMinnow]'),[1,1,2]);
    v.eval('caught();hideCatchCard();save()');
    saved=JSON.parse(v.localStorage.getItem(saveKey));
    assert.equal(saved.caught.funa,original.caught.funa+1);
    assert.equal(saved.fishCatchRecords.funa.last.baitId,'softWorm');
    assert.deepEqual(b.errors,[]);
  } finally { b.dispose(); }
  const c=boot(saved);
  try {
    const u=c.window;
    assert.equal(read(u,'s.selectedLure'),'softWorm');
    assert.equal(read(u,'s.caught.funa'),original.caught.funa+1);
    u.openInventory('tackle');
    click(u,'#inventory [data-compact-group="method"]');
    click(u,'#inventory [data-pick-lure="silverSpoon"]');
    assert.equal(read(u,'s.selectedLure'),'silverSpoon');
    assert.deepEqual(read(u,'[s.baits.worm,s.lures.silverSpoon,s.lures.softWorm]'),[7,1,1]);
    assert.deepEqual(c.errors,[]);
  } finally { c.dispose(); }
});
