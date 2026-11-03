const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const Art = require('../tackle-art.js');

const ids = [
  'worm', 'corn', 'liveMinnow', 'nushiSecret', 'grasshopper', 'river',
  'paste', 'shrimp', 'smallShrimp', 'shell', 'crab', 'hookSmall',
  'hookMedium', 'hookLarge', 'silverSpoon', 'starMinnow', 'expeditionJoint', 'float',
];

// Rasterize the intentionally tiny M/H/V path vocabulary without a DOM or an
// image dependency. Sampling the finished layers catches details painted over
// later, unlike counting path strings or declared palette entries alone.
function polygons(d) {
  assert.match(d, /^[MmHhVvZz\d\s-]+$/, 'only integer pixel contours');
  const tokens = d.match(/[A-Za-z]|-?\d+/g);
  const result = [];
  let x = 0, y = 0, points = [];
  for (let index = 0; index < tokens.length;) {
    const command = tokens[index++];
    const value = () => {
      const token = tokens[index++];
      assert.match(token || '', /^-?\d+$/, `coordinate after ${command}`);
      return Number(token);
    };
    if (command === 'M' || command === 'm') {
      assert.equal(points.length, 0, 'each contour closes before the next');
      const dx = value(), dy = value();
      x = command === 'M' ? dx : x + dx;
      y = command === 'M' ? dy : y + dy;
      points.push([x, y]);
    } else if (command === 'H' || command === 'h') {
      x = command === 'H' ? value() : x + value();
      points.push([x, y]);
    } else if (command === 'V' || command === 'v') {
      y = command === 'V' ? value() : y + value();
      points.push([x, y]);
    } else {
      assert.ok(command === 'z' || command === 'Z', `unsupported command ${command}`);
      assert.ok(points.length >= 3, 'closed painted contour');
      result.push(points);
      [x, y] = points[0];
      points = [];
    }
    assert.ok(x >= 0 && x <= 24 && y >= 0 && y <= 24, `contour stays in viewBox at ${x},${y}`);
  }
  assert.equal(points.length, 0, 'last contour closes');
  return result;
}

function winding(points, x, y) {
  let number = 0;
  for (let i = 0; i < points.length; i++) {
    const a = points[i], b = points[(i + 1) % points.length];
    const side = (b[0] - a[0]) * (y - a[1]) - (x - a[0]) * (b[1] - a[1]);
    if (a[1] <= y && b[1] > y && side > 0) number++;
    else if (a[1] > y && b[1] <= y && side < 0) number--;
  }
  return number;
}

function raster(id) {
  const pixels = Array(24 * 24).fill(null);
  for (const [color, d] of Art.sprites[id]) {
    assert.match(color, /^#[0-9a-f]{6}$/i, `${id}: opaque authored color`);
    const contours = polygons(d);
    for (let y = 0; y < 24; y++) for (let x = 0; x < 24; x++) {
      if (contours.reduce((n, p) => n + winding(p, x + .5, y + .5), 0)) {
        pixels[y * 24 + x] = color;
      }
    }
  }
  return pixels;
}

function detailClusters(pixels) {
  const seen = new Set(), sizes = [];
  for (let index = 0; index < pixels.length; index++) {
    if (!pixels[index] || seen.has(index)) continue;
    const pending = [index];
    let size = 0;
    seen.add(index);
    while (pending.length) {
      const point = pending.pop(), x = point % 24, y = Math.floor(point / 24);
      size++;
      for (const [nx, ny] of [[x - 1, y], [x + 1, y], [x, y - 1], [x, y + 1]]) {
        const next = ny * 24 + nx;
        if (nx < 0 || nx >= 24 || ny < 0 || ny >= 24 || seen.has(next) || pixels[next] !== pixels[point]) continue;
        seen.add(next);
        pending.push(next);
      }
    }
    sizes.push(size);
  }
  return sizes;
}

const rendered = Object.fromEntries(ids.map(id => [id, raster(id)]));
const pixel = (id, x, y) => rendered[id][y * 24 + x];

test('all 18 tackle sprite IDs keep the small SVG API and browser export', () => {
  assert.deepEqual(Object.keys(Art.sprites), ids);
  assert.equal(Art.icon('missing-item'), '');
  for (const id of ids) {
    const svg = Art.icon(id);
    assert.match(svg, /^<svg class="tackle-pixel-icon" viewBox="0 0 24 24" shape-rendering="crispEdges" aria-hidden="true">/);
    assert.equal((svg.match(/<path /g) || []).length, Art.sprites[id].length);
    assert.doesNotMatch(svg, /<(?:image|text|foreignObject|filter)\b|href=|opacity=|gradient/i);
    assert.ok(svg.endsWith('</svg>'));
  }
  const context = vm.createContext({});
  vm.runInContext(fs.readFileSync(path.join(__dirname, '../tackle-art.js'), 'utf8'), context);
  for (const id of ids) assert.equal(context.ShuTackleArt.icon(id), Art.icon(id));
});

test('every finished sprite has visible fine shading, small accents and a transparent margin', () => {
  const unique = new Set();
  for (const id of ids) {
    const pixels = rendered[id];
    const counts = new Map();
    for (const color of pixels) if (color) counts.set(color, (counts.get(color) || 0) + 1);
    const painted = [...counts.values()].reduce((sum, value) => sum + value, 0);
    assert.ok(painted >= 35 && painted < 300, `${id}: readable silhouette, ${painted} pixels`);
    assert.ok(counts.size >= 8, `${id}: at least eight visible material shades, got ${counts.size}`);
    assert.ok(detailClusters(pixels).filter(size => size <= 3).length >= 6, `${id}: small glints or texture accents survive compositing`);
    for (let edge = 0; edge < 24; edge++) {
      assert.equal(pixel(id, edge, 0), null, `${id}: top margin`);
      assert.equal(pixel(id, edge, 23), null, `${id}: bottom margin`);
      assert.equal(pixel(id, 0, edge), null, `${id}: left margin`);
      assert.equal(pixel(id, 23, edge), null, `${id}: right margin`);
    }
    unique.add(pixels.join(','));
  }
  assert.equal(unique.size, ids.length, 'each bait and tool retains its own artwork');
});

test('material details and identifying markings survive in the finished pixels', () => {
  assert.equal(pixel('worm', 16, 3), '#facf9f', 'moist segmented highlight');
  assert.equal(pixel('corn', 10, 5), '#fff2b0', 'individual kernel highlight');
  assert.equal(pixel('corn', 15, 5), '#9d641e', 'kernel shadow edge');
  assert.equal(pixel('liveMinnow', 18, 10), '#ffffff', 'living bait eye glint');
  assert.equal(pixel('nushiSecret', 11, 7), '#fffbe2', 'secret bait central glow');
  assert.equal(pixel('grasshopper', 18, 4), '#273e30', 'fine antenna');
  assert.equal(pixel('river', 10, 13), '#3f4238', 'aquatic insect segmentation');
  assert.equal(pixel('paste', 14, 12), '#be985e', 'grain texture');
  assert.equal(pixel('shrimp', 9, 8), '#8f4753', 'shell segment seam');
  assert.equal(pixel('smallShrimp', 10, 12), '#fff0d3', 'pale translucent shell highlight');
  assert.equal(pixel('shell', 10, 8), '#ad745f', 'radial shell rib');
  assert.equal(pixel('crab', 9, 8), '#fff0be', 'eye highlight');
  for (const id of ['hookSmall', 'hookMedium', 'hookLarge']) {
    assert.equal(pixel(id, 12, 8), '#e9f5e2', `${id}: polished shank`);
    assert.equal(pixel(id, 13, 8), '#55747f', `${id}: steel shadow`);
    assert.equal(pixel(id, 9, 12), null, `${id}: open hook center`);
  }
  assert.equal(pixel('silverSpoon', 17, 4), '#faffeb', 'polished silver face');
  assert.equal(pixel('silverSpoon', 19, 5), '#466578', 'curved metal shadow');
  assert.equal(pixel('starMinnow', 11, 9), '#fff5bd', 'gold star marking');
  assert.equal(pixel('expeditionJoint', 6, 7), '#c9d4c5', 'metal fastener');
  assert.equal(pixel('float', 10, 7), '#fffbe7', 'glossy white top');
  assert.equal(pixel('float', 14, 12), '#a34248', 'red lower half shading');
});

test('hook sizes stay distinct and consistently grow in length and painted area', () => {
  const hooks = ['hookSmall', 'hookMedium', 'hookLarge'].map(id => {
    const coords = rendered[id].flatMap((color, index) => color ? [[index % 24, Math.floor(index / 24)]] : []);
    return {
      area: coords.length,
      height: Math.max(...coords.map(p => p[1])) - Math.min(...coords.map(p => p[1])) + 1,
    };
  });
  assert.ok(hooks[0].area < hooks[1].area && hooks[1].area < hooks[2].area);
  assert.ok(hooks[0].height < hooks[1].height && hooks[1].height < hooks[2].height);
});
