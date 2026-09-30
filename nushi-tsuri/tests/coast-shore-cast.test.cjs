const { test } = require('node:test');
const assert = require('node:assert/strict');
const { boot, seed, read } = require('./game-harness.cjs');
const Coast = require('../coast-voyage.js');

const directions = { left: [-1, 0], right: [1, 0], up: [0, -1], down: [0, 1] };
const onIsland = (x, y, direction = 'up') => ({
  ...seed(), x, y, direction, mapRegion: 'coast', boatActive: false,
  hp: 100, maxHp: 100, ownedVehicles: ['canoe'],
  equipment: { hands: null, vehicle: 'canoe' }, baits: { worm: 20 }, selectedBait: 'worm',
});

// Walk the four-unit grid from each landing point, then face every edge
// where the next step would enter the sea. No village geometry belongs here.
function shorelineDirections(type) {
  const start = Coast.docks[type].land;
  const queue = [start], seen = new Set([`${start.x},${start.y}`]), edges = [];
  for (let i = 0; i < queue.length; i++) {
    const point = queue[i];
    for (const [direction, [dx, dy]] of Object.entries(directions)) {
      const x = point.x + dx * 4, y = point.y + dy * 4, key = `${x},${y}`;
      if (Coast.shore(x, y)) {
        if (!seen.has(key)) { seen.add(key); queue.push({ x, y }); }
      } else if (Coast.water(x, y)) edges.push({ ...point, direction });
    }
  }
  return edges;
}

test('every reachable shoreline on both islands detects the sea in front', () => {
  const app = boot(onIsland(115, 77)), w = app.window;
  try {
    for (const type of ['sand', 'reef']) {
      const edges = shorelineDirections(type);
      assert.ok(edges.length >= 40, `${type}: cover the whole shoreline`);
      for (const { x, y, direction } of edges) {
        w.eval(`s.x=${x};s.y=${y};s.direction=${JSON.stringify(direction)}`);
        const spot = read(w, 'nearbyFishingSpot()');
        assert.equal(spot?.id, `coast-${type}-shallow`, `${type} ${x},${y} facing ${direction}`);
        assert.ok(Coast.water(spot.waterX, spot.waterY), 'the selected point is actual coastal water');
      }
    }
    assert.deepEqual(app.errors, []);
  } finally { app.dispose(); }
});

test('walking up to formerly blocked shores and pressing A opens the correct cast scene', () => {
  for (const [type, x, y, direction] of [
    ['sand', 151, 97, 'down'], ['sand', 183, 73, 'right'], ['sand', 163, 97, 'down'],
    ['reef', 76, 76, 'up'], ['reef', 68, 72, 'up'],
  ]) {
    const app = boot(onIsland(x, y, direction)), w = app.window;
    try {
      w.move(direction);
      assert.deepEqual(read(w, '[s.x,s.y]'), [x, y], 'the player stops at the water');
      w.action();
      assert.equal(read(w, 'battle?.phase ?? null'), 'prep');
      assert.equal(read(w, 'battle.coastType'), type);
      w.beginFishing();
      assert.equal(read(w, 'battle.phase'), 'cast');
      assert.ok(w.document.querySelector('#castSurface').classList.contains(`art-sea-coast-${type}`));
      assert.deepEqual(app.errors, []);
    } finally { app.dispose(); }
  }
});

test('island interiors, inward-facing shores and the coast harbor pier remain non-fishing land', () => {
  const app = boot(onIsland(146, 70)), w = app.window;
  try {
    for (const [x, y, direction] of [[146, 70, 'up'], [151, 97, 'up'], [76, 76, 'down'], [154, 123, 'up']]) {
      w.eval(`s.x=${x};s.y=${y};s.direction=${JSON.stringify(direction)}`);
      assert.equal(read(w, 'nearbyFishingSpot()'), null, `${x},${y} facing ${direction}`);
    }
    assert.deepEqual(app.errors, []);
  } finally { app.dispose(); }
});
