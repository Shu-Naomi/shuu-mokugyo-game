const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { createCanvas, loadImage } = require('@napi-rs/canvas');
const Art = require('../ui-pixel-art.js');
const expected = ['sunny', 'cloudy', 'rain', 'sound', 'muted', 'book', 'bag', 'pin', 'save', 'coin', 'bolt', 'phaseTarget', 'phaseDown', 'phaseRight', 'phaseBoth', 'phaseLow', 'phaseWave', 'phaseDiagonal', 'phaseTurn'];

test('core UI art exposes every weather, utility and fishing phase icon', () => {
  assert.deepEqual(Art.ids, expected);
  assert.ok(Object.isFrozen(Art));
  assert.ok(Object.isFrozen(Art.ids));
  assert.equal(new Set(Art.ids.map(id => Art.get(id))).size, expected.length);
  for (const id of expected) {
    const svg = Art.get(id);
    assert.match(svg, /^<svg xmlns="http:\/\/www\.w3\.org\/2000\/svg" class="pixel-item-icon"/);
    assert.match(svg, /width="24" height="24" viewBox="0 0 24 24"/);
    assert.match(svg, /shape-rendering="crispEdges" aria-hidden="true" focusable="false"/);
    assert.match(svg, new RegExp(`data-pixel-icon="${id}"`));
    assert.ok((svg.match(/<path /g) || []).length >= 5, id + ' has shaded pixel layers');
    assert.doesNotMatch(svg, /<(?:script|style|image|text|foreignObject|animate)|\b(?:href|onload|onclick|filter|transform|stroke|id)=|url\(/i);
    for (const [, d] of svg.matchAll(/ d="([^"]+)"/g)) assert.match(d, /^[MmHhVvZz\d \-]+$/, id + ' uses integer, axis-aligned paths only');
    assert.equal(Art.get(id), svg, id + ' returns stable static markup');
  }
});

test('core icon lookup ignores inherited names, malformed IDs and coercion', () => {
  for (const id of ['missing', '__proto__', 'constructor', 'toString', 'hasOwnProperty', '', '<img src=x onerror=alert(1)>', null, undefined, 1, [], {}, Symbol('sunny')]) {
    assert.equal(Art.get(id), '');
  }
  assert.equal(Art.get({ toString() { throw new Error('must not coerce unknown input'); } }), '');
  assert.throws(() => Art.ids.push('injected'), TypeError);
});

test('core icons work as a dependency-free browser script and CommonJS module', () => {
  const sandbox = {};
  vm.runInNewContext(fs.readFileSync(path.join(__dirname, '../ui-pixel-art.js'), 'utf8'), sandbox);
  assert.deepEqual(Object.keys(sandbox), ['UiPixelArt']);
  assert.deepEqual(Array.from(sandbox.UiPixelArt.ids), expected);
  for (const id of expected) assert.equal(sandbox.UiPixelArt.get(id), Art.get(id));
});

test('all core UI sprites rasterize with clean pixel edges and no clipped pixels', async () => {
  for (const id of expected) {
    const image = await loadImage(Buffer.from(Art.get(id)));
    const canvas = createCanvas(24, 24), ctx = canvas.getContext('2d');
    ctx.drawImage(image, 0, 0);
    const { data } = ctx.getImageData(0, 0, 24, 24);
    let opaque = 0;
    const colors = new Set();
    for (let n = 0; n < 24 * 24; n++) {
      const alpha = data[n * 4 + 3];
      assert.ok(alpha === 0 || alpha === 255, id + ' has no antialiased pixels');
      if (!alpha) continue;
      opaque++;
      colors.add(Array.from(data.slice(n * 4, n * 4 + 3)).join(','));
      const x = n % 24, y = Math.floor(n / 24);
      assert.ok(x > 0 && x < 23 && y > 0 && y < 23, id + ' fits its viewBox');
    }
    assert.ok(opaque > 60, id + ' has a complete silhouette');
    assert.ok(colors.size >= 4, id + ' retains shading and highlights');
  }
});
