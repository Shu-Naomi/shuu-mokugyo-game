const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { createCanvas, loadImage } = require('@napi-rs/canvas');
const Art = require('../ui-extra-art.js');
const expected = ['dogShuu', 'dogRiku', 'dogGrey', 'paw', 'backpack', 'fishingRod', 'trophy', 'crown', 'bed', 'island', 'sparkle', 'rainbow', 'wave', 'warning', 'question', 'gear', 'bookStack', 'lantern', 'phone', 'graduation', 'hook', 'heart'];

test('extra UI art has all companion, destination and feedback icons', () => {
  assert.deepEqual(Art.ids, expected);
  assert.ok(Object.isFrozen(Art));
  assert.ok(Object.isFrozen(Art.ids));
  assert.equal(new Set(expected.map(id => Art.get(id))).size, expected.length);
  for (const id of expected) {
    const svg = Art.get(id);
    assert.match(svg, /^<svg xmlns="http:\/\/www\.w3\.org\/2000\/svg" class="pixel-item-icon"/);
    assert.match(svg, /width="32" height="32" viewBox="0 0 32 32"/);
    assert.match(svg, /shape-rendering="crispEdges" aria-hidden="true" focusable="false"/);
    assert.match(svg, new RegExp(`data-pixel-icon="${id}"`));
    assert.ok((svg.match(/<path /g) || []).length >= 5, id + ' has multiple hand-drawn shading layers');
    assert.doesNotMatch(svg, /<(?:script|style|image|text|foreignObject|animate)|\b(?:href|onload|onclick|filter|transform|stroke|id)=|url\(/i);
    for (const [, d] of svg.matchAll(/ d="([^"]+)"/g)) assert.match(d, /^[MmHhVvZz\d \-]+$/, id + ' uses integer, axis-aligned paths only');
  }
});

test('extra icon lookup cannot resolve prototype names or execute coercion', () => {
  for (const id of ['missing', '__proto__', 'constructor', 'toString', 'hasOwnProperty', '', '<svg onload=alert(1)>', null, undefined, 3, [], {}, Symbol('paw')]) assert.equal(Art.get(id), '');
  assert.equal(Art.get({ toString() { throw new Error('must not coerce input'); } }), '');
  assert.throws(() => Art.ids.push('injected'), TypeError);
  const sandbox = {};
  vm.runInNewContext(fs.readFileSync(path.join(__dirname, '../ui-extra-art.js'), 'utf8'), sandbox);
  assert.deepEqual(Object.keys(sandbox), ['UiExtraArt']);
  assert.deepEqual(Array.from(sandbox.UiExtraArt.ids), expected);
  for (const id of expected) assert.equal(sandbox.UiExtraArt.get(id), Art.get(id));
});

test('dog portraits preserve the existing companions’ identifying fur and accessories', () => {
  const shuu = Art.get('dogShuu'), riku = Art.get('dogRiku'), grey = Art.get('dogGrey');
  // Based on the actual shuu-walk.png, riku-walk.png and grey-walk.png sprite sheets.
  for (const color of ['#d78a36', '#fff0cf', '#3e83ba', '#f5c75c']) assert.ok(shuu.includes(color), 'Shuu: orange/cream fur, blue collar, gold tag');
  for (const color of ['#394046', '#fff0cf', '#58b4cb', '#278c93']) assert.ok(riku.includes(color), 'Riku: black/white fur, blue eyes, teal bandana');
  for (const color of ['#394046', '#e9ba78', '#8c64a9', '#d6d6c0']) assert.ok(grey.includes(color), 'Grey: black/tan fur, purple collar, silver tag');
  assert.notEqual(shuu, riku);
  assert.notEqual(riku, grey);
});

test('all extra UI sprites rasterize with clean pixel edges and no clipped pixels', async () => {
  for (const id of expected) {
    const image = await loadImage(Buffer.from(Art.get(id)));
    const canvas = createCanvas(32, 32), ctx = canvas.getContext('2d');
    ctx.drawImage(image, 0, 0);
    const { data } = ctx.getImageData(0, 0, 32, 32);
    let opaque = 0;
    const colors = new Set();
    for (let n = 0; n < 32 * 32; n++) {
      const alpha = data[n * 4 + 3];
      assert.ok(alpha === 0 || alpha === 255, id + ' has no antialiased pixels');
      if (!alpha) continue;
      opaque++;
      colors.add(Array.from(data.slice(n * 4, n * 4 + 3)).join(','));
      const x = n % 32, y = Math.floor(n / 32);
      assert.ok(x > 0 && x < 31 && y > 0 && y < 31, id + ' fits its viewBox');
    }
    assert.ok(opaque > 140, id + ' has a complete silhouette');
    assert.ok(colors.size >= 5, id + ' retains shading and highlights');
    if (id.startsWith('dog')) assert.ok(colors.size >= 10, id + ' retains fur and facial detail');
  }
});

test('CSS lantern, paw and heart assets match the standalone shared sprites', () => {
  for (const id of ['lantern', 'paw', 'heart']) {
    const svg = fs.readFileSync(path.join(__dirname, `../assets/ui-${id}-v252-28.svg`), 'utf8').trim();
    assert.equal(svg, Art.get(id));
    assert.match(svg, /xmlns="http:\/\/www\.w3\.org\/2000\/svg"/);
  }
});
