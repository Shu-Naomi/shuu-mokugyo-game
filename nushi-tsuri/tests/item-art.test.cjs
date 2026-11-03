const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const Art = require('../item-art.js');

const ids = [
  'vegetableOnigiri', 'fishBento', 'tomato', 'apple', 'offeringDaikon',
  'starGrapes', 'wildGreens', 'fishFillet', 'shirogisuFillet', 'ayuFillet',
  'madaiFillet', 'bigFishPlate', 'shellSoup', 'mountainPlate', 'shrimpRice',
  'shirogisuTempura', 'ayuShioyaki', 'madaiUshiojiru', 'nutFishJerky'
];

function pixels(svg) {
  const raster = Array.from({ length: 32 }, () => Array(32).fill(null));
  for (const path of svg.matchAll(/<path fill="(#[a-f0-9]{6})" d="([^"]+)"\/>/g)) {
    const [, fill, data] = path;
    const runs = [...data.matchAll(/M(\d+) (\d+)h(\d+)v1h-(\d+)z/g)];
    assert.equal(runs.map(run => run[0]).join(''), data, 'all runs use integer pixel coordinates');
    for (const run of runs) {
      const [x, y, width, back] = run.slice(1).map(Number);
      assert.equal(width, back);
      assert.ok(x >= 0 && y >= 0 && x + width <= 32 && y < 32, 'pixel run stays inside the viewBox');
      for (let dx = 0; dx < width; dx++) {
        assert.equal(raster[y][x + dx], null, 'opaque pixels are emitted only once');
        raster[y][x + dx] = fill;
      }
    }
  }
  return raster;
}

test('food artwork covers all 19 ingredients and recipes with immutable exports', () => {
  assert.deepEqual(Art.ids, ids);
  assert.equal(Object.isFrozen(Art), true);
  assert.equal(Object.isFrozen(Art.ids), true);
  assert.throws(() => Art.ids.push('untrusted'), TypeError);
  assert.equal(new Set(ids.map(id => Art.get(id))).size, ids.length, 'every item has distinct artwork');
});

test('trusted SVGs are decorative, crisp, dependency-free 32px pixel art', () => {
  for (const id of ids) {
    const svg = Art.get(id);
    assert.match(svg, /^<svg xmlns="http:\/\/www\.w3\.org\/2000\/svg"/);
    assert.match(svg, /class="pixel-item-icon"/);
    assert.match(svg, /width="32" height="32" viewBox="0 0 32 32"/);
    assert.match(svg, /shape-rendering="crispEdges" aria-hidden="true" focusable="false"/);
    assert.doesNotMatch(svg, /<(?:script|image|text|foreignObject|use)\b|\bon\w+=|(?:href|style)=|[\u{1f300}-\u{1faff}]/u);
    assert.equal(svg.replace(/^<svg[^>]+>/, '').replace(/<path fill="#[a-f0-9]{6}" d="[M0-9 hvz-]+"\/>/g, ''), '</svg>');
    const raster = pixels(svg);
    const filled = raster.flat().filter(Boolean);
    assert.ok(filled.length >= 180, `${id} has a complete, substantial silhouette`);
    assert.ok(filled.length < 800, `${id} keeps transparent breathing room`);
    assert.ok(new Set(filled).size >= 7, `${id} has outlines, shaded materials and highlights`);
    assert.ok(raster[0].every(pixel => pixel === null), `${id} top edge is not clipped`);
    assert.ok(raster[31].every(pixel => pixel === null), `${id} bottom edge is not clipped`);
    assert.ok(raster.every(row => row[0] === null && row[31] === null), `${id} side edges are not clipped`);
    assert.equal(Art.get(id), svg, 'cached artwork is deterministic');
  }
});

test('unknown, inherited and malicious item IDs never produce markup or get coerced', () => {
  for (const id of ['missing', '', '__proto__', 'constructor', 'toString', 'hasOwnProperty',
    '<img src=x onerror=alert(1)>', 'tomato" onload="alert(1)', null, undefined, 0, false, [],
    Symbol('tomato'), new String('tomato'), { toString() { throw new Error('must not coerce'); } }]) {
    assert.equal(Art.get(id), '');
  }
});

test('browser script exposes the same ItemArt API without CommonJS or DOM dependencies', () => {
  const browser = vm.createContext({});
  vm.runInContext('window = globalThis', browser);
  vm.runInContext(fs.readFileSync(path.join(__dirname, '../item-art.js'), 'utf8'), browser);
  assert.equal(browser.window.ItemArt, browser.ItemArt);
  assert.deepEqual(Array.from(browser.ItemArt.ids), ids);
  for (const id of ids) assert.equal(browser.ItemArt.get(id), Art.get(id));
  assert.equal(browser.ItemArt.get('__proto__'), '');
});
