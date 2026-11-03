const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const filename = path.join(__dirname, '..', 'item-object-art.js');
const art = require(filename);
const expected = [
  'samBiscuit', 'lakeFishJerky', 'treeNut', 'mushroom', 'rubberBall',
  'tugRope', 'stardustCookie', 'moonlightJerky', 'starFrisbee', 'squeakyNushi',
  'worm', 'grasshopper', 'shell', 'crab', 'smallShrimp', 'moonScale',
  'ancientFloat', 'rainbowStone', 'glassHook', 'tideCoin', 'nushiSketch',
  'gloves', 'tarai', 'canoe', 'expeditionJoint', 'silverSpoon', 'starMinnow',
];

test('the complete object catalog has unique, immutable, deterministic sprites', () => {
  assert.deepEqual([...art.ids].sort(), [...expected].sort());
  assert.equal(new Set(art.ids.map(id => art.get(id))).size, expected.length);
  assert.ok(Object.isFrozen(art));
  assert.ok(Object.isFrozen(art.ids));
  for (const id of expected) assert.equal(art.get(id), art.get(id));
  assert.throws(() => art.ids.push('unknown'), TypeError);
});

test('unknown, inherited and non-string IDs never return or inject markup', () => {
  for (const id of ['unknown', 'constructor', '__proto__', 'prototype', 'toString',
    'hasOwnProperty', 'valueOf', '<svg onload="alert(1)">', '', null, undefined,
    1, {}, [], Symbol('samBiscuit'), new String('samBiscuit')]) {
    assert.equal(art.get(id), '');
  }
  assert.equal(art.get({ toString() { throw new Error('must not coerce input'); } }), '');
});

test('every SVG is decorative, self-contained and made only from crisp in-bounds pixels', () => {
  for (const id of expected) {
    const svg = art.get(id);
    assert.match(svg, /^<svg xmlns="http:\/\/www\.w3\.org\/2000\/svg" /, id);
    assert.match(svg, /class="pixel-item-icon item-object-pixel-icon"/, id);
    assert.match(svg, /width="32" height="32" viewBox="0 0 32 32"/, id);
    assert.match(svg, /shape-rendering="crispEdges" aria-hidden="true" focusable="false"/, id);
    assert.doesNotMatch(svg, /<(?:script|foreignObject|image|use|style)|\bon\w+=|\bhref=|url\(|<text|<title/, id);
    const paths = [...svg.matchAll(/<path fill="(#[0-9a-f]{6})" d="([^"]+)"\/>/g)];
    assert.ok(paths.length >= 5, `${id} needs a shaded material palette`);
    const occupied = new Set();
    for (const [, , d] of paths) {
      const runs = [...d.matchAll(/M(\d+) (\d+)h(\d+)v1h-(\d+)z/g)];
      assert.equal(runs.map(run => run[0]).join(''), d, `${id} contains only whole-pixel runs`);
      for (const [, xText, yText, widthText, backText] of runs) {
        const x = Number(xText), y = Number(yText), width = Number(widthText);
        assert.equal(widthText, backText, `${id} has a closed rectangle`);
        assert.ok(x >= 0 && y >= 0 && width > 0 && x + width <= 32 && y < 32, id);
        for (let xx = x; xx < x + width; xx++) {
          const key = `${xx},${y}`;
          assert.ok(!occupied.has(key), `${id}: final pixels must not overlap`);
          occupied.add(key);
        }
      }
    }
    assert.ok(occupied.size > 110 && occupied.size < 800, `${id}: readable silhouette with transparent margin (${occupied.size})`);
    assert.equal(svg.replace(/^<svg [^>]+>/, '').replace(/<\/svg>$/, ''), paths.map(p => p[0]).join(''), id);
  }
});

test('the same public API works in a browser without CommonJS or a DOM', () => {
  const context = { window: {} };
  vm.runInNewContext(fs.readFileSync(filename, 'utf8'), context, { filename });
  assert.equal(typeof context.window.ItemObjectArt.get, 'function');
  assert.deepEqual(Array.from(context.window.ItemObjectArt.ids).sort(), [...expected].sort());
  for (const id of expected) assert.equal(context.window.ItemObjectArt.get(id), art.get(id));
  assert.equal(context.window.ItemObjectArt.get('constructor'), '');
});

test('standalone workers can load the catalog using globalThis', () => {
  const context = {};
  vm.runInNewContext(fs.readFileSync(filename, 'utf8'), context, { filename });
  assert.equal(context.ItemObjectArt.get('nushiSketch'), art.get('nushiSketch'));
});
