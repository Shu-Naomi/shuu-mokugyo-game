const { test } = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { boot, seed, read, saveKey } = require('./game-harness.cjs');

// Source-pixel samples inspected in the actual final 1672 x 941 painting.
// These are open water, not blue flowers, shop signs or bridge shadows.
const waterSamples = [
  { name: 'river above the bridge', pixel: [763, 480], zone: 'river' },
  { name: 'lake outlet', pixel: [785, 382], zone: 'river' },
  { name: 'channel immediately above the stone deck', pixel: [760, 530], zone: 'river' },
  { name: 'open channel under the bridge arch', pixel: [750, 600], zone: 'river' },
  { name: 'lower river west bank', pixel: [703, 822], zone: 'river' },
  { name: 'river mouth east bank', pixel: [770, 906], zone: 'river', dryApproach: { pixel: [818, 880], direction: 'left' } },
  { name: 'east harbor pocket', pixel: [1604, 688], zone: 'sea' },
];
const worldPoint = ([x, y]) => [x / 1672 * 240, y / 941 * 135];
const progress = w => read(w, 'Object.fromEntries(Object.entries(s).filter(([key])=>!["x","y","direction","log"].includes(key)))');
const schema = w => read(w, 'Object.keys(s).sort()');
const stand = (w, x, y) => w.eval(`s.x=${x};s.y=${y};render()`);
const delta = { right: [1, 0], left: [-1, 0], down: [0, 1], up: [0, -1] };
const reverse = { right: 'left', left: 'right', down: 'up', up: 'down' };

test('inspected river and east harbor blue pixels are water, not walkable ground', async () => {
  const { createCanvas, loadImage } = require('@napi-rs/canvas');
  const definition = require('../scene-layers.js').get('world');
  const image = await loadImage(path.join(__dirname, '..', definition.source));
  assert.deepEqual([image.width, image.height], [1672, 941]);
  const canvas = createCanvas(image.width, image.height), ctx = canvas.getContext('2d');
  ctx.drawImage(image, 0, 0);
  const pixels = ctx.getImageData(0, 0, image.width, image.height).data;
  const blue = (x, y) => {
    const i = (y * image.width + x) * 4;
    return pixels[i + 2] > pixels[i] + 20 && pixels[i + 1] > pixels[i] + 15;
  };
  const app = boot({ ...seed(), soundEnabled: false }), w = app.window;
  try {
    for (const { name, pixel, zone } of waterSamples) {
      assert.ok(blue(...pixel), name + ' is genuinely blue in the loaded source');
      const [x, y] = worldPoint(pixel);
      assert.equal(w.isOnRiverBridge(x, y), false, name + ' is outside the dry bridge deck');
      assert.equal(w.waterZoneAtWorld(x, y), zone, name + ' has the correct water classification');
      assert.equal(w.isWalkableWorld(x, y), false, name + ' cannot support player feet');
    }
    // Preserve the existing river/sea population boundary at the mouth.
    // The new collision contour must not extend river fishing below y132.
    assert.equal(w.waterZoneAtWorld(110, 132), 'river');
    assert.equal(w.isWalkableWorld(110, 132), false);
    for (const y of [132.01, 133]) {
      assert.equal(w.isRiverWater(110, y), false, 'river classification still ends at y132');
      assert.equal(w.waterZoneAtWorld(110, y), 'sea', 'mouth below y132 remains sea');
      assert.equal(w.isWalkableWorld(110, y), false, 'sea at the mouth stays blocked');
    }

    // Flood only connected blue in the inspected channel and east pocket.
    // Seeding both sides of the bridge and separate outlet pools avoids
    // treating decorative blue elsewhere in the village as painted water.
    const regions = [
      { name: 'river', bounds: [640, 350, 845, 912], seeds: waterSamples.filter(p => p.zone === 'river').map(p => p.pixel), minimum: 20000 },
      { name: 'east harbor', bounds: [1510, 630, 1671, 745], seeds: [[1604, 688]], minimum: 3000 },
    ];
    for (const region of regions) {
      const [left, top, right, bottom] = region.bounds, queue = [], seen = new Set();
      for (const [x, y] of region.seeds) {
        const key = y * image.width + x;
        if (!seen.has(key)) { seen.add(key); queue.push([x, y]); }
      }
      for (let i = 0; i < queue.length; i++) {
        const [x, y] = queue[i];
        for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]]) {
          const a = x + dx, b = y + dy, key = b * image.width + a;
          if (a >= left && a <= right && b >= top && b <= bottom && !seen.has(key) && blue(a, b)) {
            seen.add(key); queue.push([a, b]);
          }
        }
      }
      assert.ok(queue.length > region.minimum, region.name + ' covers substantial connected water');
      let checked = 0;
      for (const [px, py] of queue) {
        const [x, y] = worldPoint([px + .5, py + .5]);
        // Use the measured runtime deck, not the former broad 75..88 band.
        // The fixed dry crossings below independently protect bridge access.
        if (w.isOnRiverBridge(x, y)) continue;
        // The upstream component touches the lake outlet, and the mouth
        // touches the sea. All three water classifications are legitimate.
        assert.notEqual(w.waterZoneAtWorld(x, y), null, region.name + ' paint is classified as water at ' + px + ',' + py);
        assert.equal(w.isWalkableWorld(x, y), false, region.name + ' paint blocks feet at ' + px + ',' + py);
        checked++;
      }
      assert.ok(checked > region.minimum * .8, region.name + ' cannot pass by excluding most blue paint');
    }
    assert.deepEqual(app.errors, []);
  } finally { app.dispose(); }
});

test('normal movement still traverses the board lane, both bridge rows and all harbor connectors', () => {
  const app = boot({ ...seed(), soundEnabled: false }), w = app.window;
  const routes = [
    { name: 'board-side river lane', from: [119, 64], to: [119, 80], direction: 'down' },
    { name: 'north bridge crossing', from: [95, 80], to: [123, 80], direction: 'right' },
    { name: 'south bridge crossing', from: [95, 84], to: [123, 84], direction: 'right' },
    { name: 'lower pier connector', from: [155, 108], to: [155, 124], direction: 'down' },
    { name: 'lower stone quay', from: [131, 124], to: [155, 124], direction: 'right' },
    { name: 'east pier connector', from: [220, 96], to: [220, 108], direction: 'down' },
    { name: 'east timber pier', from: [212, 108], to: [232, 108], direction: 'right' },
  ];
  try {
    w.Math.random = () => .999999;
    const expected = progress(w), keys = schema(w);
    for (const route of routes) {
      assert.equal(w.isWalkableWorldSegment(...route.from, ...route.to), true, route.name + ' remains continuous');
      stand(w, ...route.from);
      assert.deepEqual(read(w, '[s.x,s.y]'), route.from, route.name + ' starts on genuine ground');
      const steps = Math.hypot(route.to[0] - route.from[0], route.to[1] - route.from[1]) / 4;
      for (const direction of [route.direction, reverse[route.direction]]) {
        const [dx, dy] = delta[direction];
        for (let i = 0; i < steps; i++) {
          const [x, y] = read(w, '[s.x,s.y]');
          w.move(direction);
          assert.deepEqual(read(w, '[s.x,s.y]'), [x + dx * 4, y + dy * 4], route.name + ' ' + direction);
        }
      }
      assert.deepEqual(read(w, '[s.x,s.y]'), route.from, route.name + ' returns without teleporting');
    }
    assert.deepEqual(progress(w), expected);
    assert.deepEqual(schema(w), keys);
    assert.deepEqual(app.errors, []);
  } finally { app.dispose(); }
});

test('normal move handler stops on shore rather than entering newly blocked river and harbor paint', () => {
  const app = boot({ ...seed(), soundEnabled: false }), w = app.window;
  try {
    w.Math.random = () => .999999;
    const expected = progress(w), keys = schema(w);
    for (const { name, pixel, dryApproach } of waterSamples) {
      const [targetX, targetY] = worldPoint(pixel);
      assert.equal(w.isWalkableWorld(targetX, targetY), false, name + ' target is blocked');
      // Find a nearby cardinal approach, preserving the sample's fractional
      // grid phase so an unrestricted four-unit step would reach it exactly.
      let approach;
      // The widening river mouth has a diagonal stone bank: no nearby dry
      // point shares the deep sample's cardinal grid phase. Probe from its
      // inspected stone shore toward blue water in the same river instead.
      if (dryApproach) {
        const [x, y] = worldPoint(dryApproach.pixel);
        approach = { x, y, direction: dryApproach.direction, steps: 1 };
      }
      for (let steps = 1; steps <= 4 && !approach; steps++) {
        for (const [direction, [dx, dy]] of Object.entries(delta)) {
          const x = targetX - dx * steps * 4, y = targetY - dy * steps * 4;
          if (w.isWalkableWorld(x, y)) { approach = { x, y, direction, steps }; break; }
        }
      }
      assert.ok(approach, name + ' has a local dry approach');
      assert.equal(w.isWalkableWorld(approach.x, approach.y), true, name + ' approach stays on the painted shore');
      stand(w, approach.x, approach.y);
      assert.deepEqual(read(w, '[s.x,s.y]'), [approach.x, approach.y]);
      const [dx, dy] = delta[approach.direction];
      const probeX = approach.x + dx * approach.steps * 4, probeY = approach.y + dy * approach.steps * 4;
      assert.equal(w.isWalkableWorld(probeX, probeY), false, name + ' attempted endpoint is blocked');
      assert.notEqual(w.waterZoneAtWorld(probeX, probeY), null, name + ' approach targets water rather than a prop');
      let stopped = false;
      for (let i = 0; i < approach.steps + 2; i++) {
        const [beforeX, beforeY] = read(w, '[s.x,s.y]');
        w.move(approach.direction);
        const [x, y] = read(w, '[s.x,s.y]');
        assert.equal(w.isWalkableWorld(x, y), true, name + ' ends each step on dry ground');
        assert.equal(w.isWalkableWorldSegment(beforeX, beforeY, x, y), true, name + ' never tunnels through water');
        assert.ok(Math.hypot(x - targetX, y - targetY) > 1e-6, name + ' cannot end on the blue sample');
        assert.ok(Math.hypot(x - probeX, y - probeY) > 1e-6, name + ' cannot end on the attempted water point');
        if (Math.hypot(x - beforeX - dx * 4, y - beforeY - dy * 4) > 1e-6) stopped = true;
      }
      // Partial one-unit approaches are intentional; zero movement is not
      // required until the player has reached the last safe shoreline step.
      assert.ok(stopped, name + ' collision interrupts the attempted crossing');
    }
    assert.deepEqual(progress(w), expected);
    assert.deepEqual(schema(w), keys);
    assert.deepEqual(app.errors, []);
  } finally { app.dispose(); }
});

test('all actual facility fronts, village exits and piers remain reachable on all sixteen movement phases', () => {
  const app = boot({ ...seed(), soundEnabled: false }), w = app.window;
  try {
    const failures = read(w, `(() => {
      const failures = [];
      const targets = worldLandmarks.map(p => p.id).concat([
        'sam-shop','practice-pond','home','lower-pier','east-pier',
        'mountain-exit','rural-exit','offshore-ferry','coast-boat'
      ]);
      for (let ox = 0; ox < 4; ox++) for (let oy = 0; oy < 4; oy++) {
        const queue = [[120 + ox, 92 + oy]], visited = new Set(), reached = new Set();
        for (let i = 0; i < queue.length; i++) {
          const [x, y] = queue[i], key = x + ',' + y;
          if (visited.has(key)) continue;
          visited.add(key);
          if (!isWalkableWorld(x, y)) continue;
          // Use each real interaction predicate, including notice-facing
          // restrictions. An old landmark radius is not proof of access.
          for (const direction of ['up','down','left','right']) {
            const landmark = nearbyWorldLandmark(x, y, direction);
            if (landmark) reached.add(landmark.id);
          }
          if (isAtSamShopEntrance(x, y)) reached.add('sam-shop');
          if (isNearPracticePond(x, y)) reached.add('practice-pond');
          if (inWorldRect(x, y, PLAYER_HOME_MAP_ENTRY)) reached.add('home');
          if (x >= 149 && x <= 157 && y >= 120 && y <= 127) reached.add('lower-pier');
          if (x >= 224 && x <= 232 && y >= 106 && y <= 113) reached.add('east-pier');
          if (ShuMountain.atVillageGate(x, y)) reached.add('mountain-exit');
          if (ShuRural.atVillageGate(x, y)) reached.add('rural-exit');
          if (ShuOffshore.atPier({ mapRegion:'village',x,y })) reached.add('offshore-ferry');
          if (Math.hypot(x - ShuCoast.docks.harbor.land.x, y - ShuCoast.docks.harbor.land.y) < 8) reached.add('coast-boat');
          for (const [dx, dy] of [[4,0],[-4,0],[0,4],[0,-4]]) {
            if (!visited.has((x + dx) + ',' + (y + dy)) && isWalkableWorldSegment(x, y, x + dx, y + dy))
              queue.push([x + dx, y + dy]);
          }
        }
        const missing = targets.filter(id => !reached.has(id));
        if (missing.length) failures.push({ ox, oy, missing });
      }
      return failures;
    })()`);
    assert.deepEqual(failures, []);
    assert.deepEqual(app.errors, []);
  } finally { app.dispose(); }
});

for (const mode of ['gauge', 'nushi']) test('legacy saves on newly blocked water recover locally without resource or schema changes: ' + mode, () => {
  const baseline = boot({ ...seed(), fightMode: mode, soundEnabled: false });
  let saved, expected, keys, savedKeys;
  try {
    baseline.window.save();
    saved = JSON.parse(baseline.window.localStorage.getItem(saveKey));
    expected = progress(baseline.window);
    keys = schema(baseline.window);
    savedKeys = Object.keys(saved).sort();
    assert.equal(saveKey, 'nushi-inugoya-v2');
    assert.deepEqual(baseline.errors, []);
  } finally { baseline.dispose(); }
  for (const { name, pixel } of waterSamples) {
    const [x, y] = worldPoint(pixel), app = boot({ ...saved, x, y }), w = app.window;
    let recovered, persisted;
    try {
      assert.equal(w.isWalkableWorld(x, y), false, name + ' old save position is now water');
      recovered = read(w, '[s.x,s.y]');
      assert.notDeepEqual(recovered, [x, y], name + ' is moved off water on load');
      assert.equal(w.isWalkableWorld(...recovered), true, name + ' recovery is dry');
      assert.ok(Math.hypot(recovered[0] - x, recovered[1] - y) <= 12, name + ' recovery stays local');
      assert.ok(Object.values(delta).filter(([dx, dy]) =>
        w.isWalkableWorldSegment(...recovered, recovered[0] + dx, recovered[1] + dy)).length >= 2,
      name + ' recovery does not strand the player on an isolated point');
      assert.deepEqual(progress(w), expected, name + ' retains all resources, progress and mode');
      assert.deepEqual(schema(w), keys, name + ' retains the complete state schema');
      assert.equal(w.save(), true);
      persisted = JSON.parse(w.localStorage.getItem(saveKey));
      assert.deepEqual(Object.keys(persisted).sort(), savedKeys, name + ' retains the persisted schema');
      assert.deepEqual(app.errors, []);
    } finally { app.dispose(); }
    const resumed = boot(persisted);
    try {
      assert.deepEqual(read(resumed.window, '[s.x,s.y]'), recovered, name + ' recovery persists after reload');
      assert.deepEqual(progress(resumed.window), expected, name + ' resources survive the second load');
      assert.deepEqual(schema(resumed.window), keys);
      assert.deepEqual(resumed.errors, []);
    } finally { resumed.dispose(); }
  }
});
