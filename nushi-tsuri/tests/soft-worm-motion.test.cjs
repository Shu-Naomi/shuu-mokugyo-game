const currentScripts = require('./fixtures/current-game-scripts.cjs');
const test = require('node:test');
const assert = require('node:assert/strict');
const fishing = currentScripts.load('fishing-duel');

test('short hops near the bottom attract a fish; the same worm wound straight in does not', () => {
  const worm = fishing.newLure(24, ['bass'], 'softWorm');
  for (let i = 0; i < 25; i++) fishing.stepLure(worm, false);
  const bottom = worm.depth;
  fishing.stepLure(worm, false, false, true);
  assert.ok(worm.depth < bottom);
  let noticed = false;
  for (let i = 0; i < 60 && !noticed; i++)
    noticed = fishing.stepLure(worm, false, false, i % 5 === 4).reveal;
  assert.ok(noticed);
  let bite = false;
  for (let i = 0; i < 90 && !bite; i++) bite = fishing.stepLure(worm, false, true).bite;
  assert.ok(bite);

  const fast = fishing.newLure(24, ['bass'], 'softWorm');
  let result;
  do {
    result = fishing.stepLure(fast, true);
    assert.equal(result.reveal, false);
  } while (!result.recovered);
});

test('soft plastic favors bottom fish locally and the spoon retains its original weights', () => {
  const weight = fishing.lureWeight;
  assert.ok(weight('softWorm','bass','lake-deep') > weight('softWorm','bass','lake-shallow'));
  assert.ok(weight('softWorm','akahata','offshore-west-deep') > weight('softWorm','takabe','offshore-west-deep'));
  for (const [id, value] of Object.entries(fishing.spoon))
    assert.equal(weight('silverSpoon',id,'lake-deep'),value || .1);
});
