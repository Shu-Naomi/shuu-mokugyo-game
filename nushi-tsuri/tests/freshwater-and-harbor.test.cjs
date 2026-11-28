const {test} = require('node:test');
const assert = require('node:assert/strict');
const {boot, read, seed, saveKey} = require('./game-harness.cjs');
const {runFight} = require('./nushi-playability-v228.cjs');
const trips = require('./fixtures/freshwater-and-harbor.cjs');

test('each newcomer has one distinct local encounter, and Kamuruchi keeps its original record', () => {
  const app = boot({...seed(), caught:{raigyo:4}});
  try {
    const w = app.window;
    const portraits = new Set();
    for (const {id, number, name, water, spot} of trips) {
      const key = JSON.stringify(id);
      const info = read(w, `({number:fishEncyclopediaData[${key}].number, name:fish.find(f=>f.id===${key}).name,
        water:petCatalog.find(f=>f.id===${key}).waterLabel, legendary:ShuRegional.legendary(${key}),
        spots:fishingSpots.filter(s=>s.weights[${key}]>0).map(s=>s.id), asset:ShuFishArt.species[${key}].asset})`);
      assert.equal(info.number,number);
      assert.equal(info.name, name);
      assert.equal(info.water,water);
      assert.equal(info.legendary,false);
      assert.deepEqual(info.spots,[spot]);
      assert.ok(info.asset);
      portraits.add(info.asset);
    }
    assert.equal(portraits.size,trips.length);
    assert.deepEqual(read(w,"[fishEncyclopediaData.raigyo.number,s.caught.raigyo]"),[39,4]);
    assert.match(read(w,"fishEncyclopediaData.raigyo.scientific"),/Channa argus.*カムルチー/u);
    assert.deepEqual(read(w,"fish.filter(f=>fishEncyclopediaData[f.id].scientific.includes('Channa argus')).map(f=>f.id)"),['raigyo']);
    assert.deepEqual(app.errors,[]);
  } finally { app.dispose(); }
});

function keepAndPrint(w, id) {
  // Use the measured, earned specimen at the same home tank hotspot as the field UI.
  w.eval(`playerHomeState.area='interior';{
    const tank=playerHomeAreaData.interior.events.find(e=>e.id==='aquarium');
    playerHomeState.x=tank.x;playerHomeState.y=tank.y;
  } renderPlayerHome();playerHomeAction()`);
  assert.ok(w.document.querySelector('#aquariumModal.open'));
  const picker = w.document.getElementById('aquariumFishSelect');
  picker.value = id;
  picker.dispatchEvent(new w.Event('change'));
  w.document.getElementById('aquariumPlaceFish').click();
  assert.equal(read(w,'s.homeAquariumSpecimen.species'),id);
  w.close();
  w.eval("playerHomeState.area=null;openVillageFishGame('cards')");
  for (const action of ['catch-print','print-catch','duel-with-catch']) {
    const button = w.document.querySelector('[data-card-action="'+action+'"]');
    assert.ok(button && !button.disabled,action+' on earned '+id);
    button.click();
  }
  assert.equal(read(w,'s.villageFishGames.catchCards[0].species'),id);
  assert.ok([...w.document.querySelectorAll('[data-card-slot]')].some(n=>n.value===read(w,'s.villageFishGames.catchCards[0].id')));
  w.close();
}

for (const trip of trips) for (const mode of ['gauge','nushi']) {
  test(trip.id+' can be targeted, landed and reloaded using '+mode, () => {
    let saved;
    const result = runFight({
      id:trip.id, mode, regionalTrip:trip, rod:'starGazer', delayMs:600, waterFxSeed:301,
      gaugeThreshold:45, gaugeResumeThreshold:20,
      onLanding(w) {
        w.eval('caught();caught();hideCatchCard();save()');
        const key = JSON.stringify(trip.id);
        assert.equal(read(w,'s.caught['+key+']'),1);
        const memory = read(w,'s.catchMemories['+key+'].first');
        assert.deepEqual([memory.spotId,memory.baitId,memory.hookId,memory.fightMode],
          [trip.spot,trip.bait,trip.hook,mode]);
        if (mode==='gauge') {
          assert.equal(read(w,`ShuPetLife.acquire(s,${key},petCatalog,Math.floor(s.gameMinutes/1440)).ok`),true);
          keepAndPrint(w,trip.id);
        }
        w.eval('save()');
        saved = JSON.parse(w.localStorage.getItem(saveKey));
      }
    });
    assert.equal(result.phase,'landing',JSON.stringify(result));
    assert.deepEqual(result.errors,[]);
    const resumed=boot(saved);
    try {
      const w=resumed.window, key=JSON.stringify(trip.id);
      assert.equal(read(w,'s.caught['+key+']'),1);
      assert.equal(read(w,'s.fishCatchRecords['+key+'].last.spotId'),trip.spot);
      if (mode==='gauge') {
        assert.ok(read(w,'s.petLife.fish.some(f=>f.species==='+key+')'));
        assert.equal(read(w,'s.homeAquariumSpecimen.uid'),read(w,'s.villageFishGames.catchCards[0].uid'));
      }
      assert.deepEqual(resumed.errors,[]);
    } finally { resumed.dispose(); }
  });
}
