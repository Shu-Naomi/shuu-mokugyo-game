const test = require('node:test');
const assert = require('node:assert/strict');
const { read, boot, saveKey } = require('./game-harness.cjs');
const { runFight } = require('./nushi-playability-v228.cjs');
const mountain = require('../mountain-region.js');
const island = require('../offshore-island.js');
const additions = require('../fish-additions.js');
const art = require('../fish-art.js');

function islandBank(area) {
  return { mapRegion: island.id, ...island.fishingPoints.find(point => point.id === area) };
}
function mountainBank(region) {
  return { mapRegion: region, ...mountain.regions[region].entry };
}
const trips = [
  { id: 'kijihata', number: 68, bank: islandBank('west'), spot: 'offshore-west-deep', bait: 'liveMinnow', hook: 'medium', minutes: 420 },
  { id: 'umazurahagi', number: 69, bank: islandBank('east'), spot: 'offshore-east-mid', bait: 'smallShrimp', hook: 'small', minutes: 720 },
  { id: 'akaza', number: 70, bank: mountainBank('cave'), route: 'underground', spot: 'mountain-underground-shallow', bait: 'river', hook: 'small', minutes: 1200 },
  { id: 'kokuchibasu', number: 71, bank: mountainBank('mountainPond'), route: 'highPond', spot: 'mountain-highPond-mid', bait: 'liveMinnow', hook: 'medium', minutes: 420 },
  { id: 'juzukakehaze', number: 72, bank: mountainBank('mountainPond'), route: 'highPond', spot: 'mountain-highPond-shallow', bait: 'river', hook: 'small', minutes: 720 },
];

test('five ordinary species have unique artwork and local encounter pools', () => {
  const assets = new Set();
  for (const trip of trips) {
    const assigned = additions.definitions.find(f => f.id === trip.id);
    assert.equal(assigned.number, trip.number);
    const pools = Object.entries(additions.pools).filter(([, weights]) => weights[trip.id] > 0);
    assert.ok(pools.some(([spot]) => spot === trip.spot));
    const region = trip.spot.slice(0, trip.spot.lastIndexOf('-') + 1);
    assert.ok(pools.every(([spot]) => spot.startsWith(region)));
    const atlas = additions.art[trip.id];
    assert.equal(atlas.boxes.length, 8);
    assert.equal(atlas.heads.length, 8);
    assert.equal(art.species[trip.id].asset, atlas.asset);
    assets.add(art.species[trip.id].asset);
  }
  assert.equal(assets.size, trips.length);
});

test('runtime spot tables keep each newcomer local and vary ordinary odds by time', () => {
  const app = boot();
  try {
    for (const trip of trips) {
      const expected = Object.entries(additions.pools).filter(([, weights]) => weights[trip.id] > 0).map(([id]) => id);
      const id = JSON.stringify(trip.id);
      const actual = read(app.window, `fishingSpots.filter(spot=>spot.weights[${id}]>0).map(spot=>spot.id)`);
      assert.deepEqual(actual.sort(), expected.sort());
      const spot = JSON.stringify(trip.spot);
      const bait = JSON.stringify(trip.bait);
      const hook = JSON.stringify(trip.hook);
      const [morning, day, evening, night] = read(app.window, `['morning','day','evening','night'].map(period=>
        fishingCandidates(50,fishingSpotById(${spot}),period,${bait},${hook}).find(entry=>entry.fish.id===${id}).weight)`);
      assert.ok(Math.min(morning, day, evening, night) > 0);
      if (trip.id === 'akaza') assert.ok(evening > day && night > day);
      else if (trip.minutes === 420) assert.ok(morning > day);
      else assert.ok(day > night);
    }
  } finally { app.dispose(); }
});

for (const trip of trips) {
  for (const mode of ['gauge', 'nushi']) {
    test(trip.id + ' can be landed in ' + mode + ' and saved with the right record', () => {
      let saved;
      const result = runFight({
        id: trip.id, mode, regionalTrip: trip, rod: 'starGazer',
        delayMs: 600, waterFxSeed: 301, gaugeThreshold: 45, gaugeResumeThreshold: 20,
        onLanding(w) {
          w.eval('caught();caught();save()');
          assert.equal(read(w, 's.caught.' + trip.id), 1);
          assert.equal(read(w, 's.catchMemories.' + trip.id + '.first.fightMode'), mode);
          assert.equal(read(w, 's.fishCatchRecords.' + trip.id + '.last.spotId'), trip.spot);
          saved = JSON.parse(w.localStorage.getItem(saveKey));
        }
      });
      assert.deepEqual(result.errors, []);
      assert.equal(result.phase, 'landing', JSON.stringify(result));
      assert.ok(result.maxTension < 100 && result.seconds < 180, JSON.stringify(result));
      if (mode === 'gauge') {
        const resumed = boot(saved);
        try {
          assert.equal(read(resumed.window, 's.caught.' + trip.id), 1);
          assert.equal(read(resumed.window, "ShuPetLife.acquire(s,'" + trip.id + "',petCatalog,0).ok"), true);
          assert.deepEqual(resumed.errors, []);
        } finally { resumed.dispose(); }
      }
    });
  }
}

test('soft plastic raises ordinary target odds at cover and leaves other fish available', t => {
  const app = boot();
  try {
    for (const [id, spot, distance] of [
      ['kijihata', 'offshore-west-deep', 80],
      ['kokuchibasu', 'mountain-highPond-mid', 50],
      ['kokuchibasu', 'mountain-highPond-deep', 80],
    ]) {
      const [spoon, worm] = read(app.window, `['silverSpoon','softWorm'].map(lure=>{
        battle={method:'lure',lure};
        const spot=fishingSpotById(${JSON.stringify(spot)});
        const entries=fishingCandidates(${distance},spot,'morning','worm','medium').filter(entry=>!ShuRegional.legendary(entry.fish.id));
        const target=entries.find(entry=>entry.fish.id===${JSON.stringify(id)});
        return target.weight/entries.reduce((total,entry)=>total+entry.weight,0);
      })`);
      assert.ok(spoon > 0 && worm > spoon && worm < 1, JSON.stringify({ id, spot, spoon, worm }));
      t.diagnostic(spot + ' ' + id + ' – spoon ' + spoon.toFixed(4) + ', soft plastic ' + worm.toFixed(4));
    }
  } finally { app.dispose(); }
});
