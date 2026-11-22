const test = require('node:test');
const assert = require('node:assert/strict');
const {boot, read, seed} = require('./game-harness.cjs');

test('葦の沼の旧記録を保ち、夜の星鏡と磯のメジナを別々に狙える', () => {
  const spot = 'mountain-marsh-shallow';
  const app = boot({...seed(), caught:{nigoi:3}, fishCatchRecords:{nigoi:{last:{spotId:spot,rodId:'bamboo',baitId:'worm'}}}});
  try {
    const w = app.window;
    assert.equal(read(w, 's.caught.nigoi'), 3);
    assert.equal(read(w, 's.fishCatchRecords.nigoi.last.spotId'), spot);
    assert.deepEqual(read(w, "['nigoi','nishikigoi','mejina','hoshikagami'].map(id=>fishEncyclopediaData[id].number)"), [38,73,74,75]);
    for (const [id, water, legendary, ordinarySpots] of [
      ['nishikigoi','淡水',false,[spot]],
      ['mejina','海水',false,['offshore-west-mid']],
      ['hoshikagami','淡水',true,[]],
    ]) {
      const key = JSON.stringify(id);
      assert.deepEqual(read(w,'petCatalog.filter(f=>f.id==='+key+').map(f=>[f.waterLabel,f.legendary])'), [[water,legendary]]);
      assert.deepEqual(read(w,'fishingSpots.filter(p=>p.weights['+key+']>0).map(p=>p.id)'), ordinarySpots);
    }
    assert.deepEqual(read(w,"fishingSpots.filter(p=>ShuRegional.candidates(s,p.id,'night').hoshikagami>0).map(p=>p.id)"), [spot]);
    const candidates = (spotId, period, bait, hook) => read(w,
      'fishingCandidates(20,fishingSpotById('+JSON.stringify(spotId)+'),'+
      [period,bait,hook].map(v=>JSON.stringify(v)).join(',')+').filter(v=>v.weight>0).map(v=>v.fish.id)');
    const day = candidates(spot,'day','paste','medium');
    assert.ok(day.includes('nigoi') && day.includes('nishikigoi'));
    assert.ok(!day.includes('hoshikagami') && !day.includes('mejina'));
    assert.ok(candidates(spot,'night','paste','large').includes('hoshikagami'));
    const reef = candidates('offshore-west-mid','day','smallShrimp','medium');
    assert.ok(reef.includes('kuromejina') && reef.includes('mejina'));
    assert.ok(!reef.includes('nishikigoi'));
    assert.deepEqual(app.errors, []);
  } finally { app.dispose(); }
});
