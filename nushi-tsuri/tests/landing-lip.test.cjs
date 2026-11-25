const { test } = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { createCanvas, loadImage } = require('@napi-rs/canvas');
const art = require('../fish-art.js');

test('all catchable fish keep the hook contact on painted pixels through swimming and the three jaw poses', async () => {
  const ctx = createCanvas(448, 224).getContext('2d');
  const images = new Map();
  for (const id of Object.keys(art.species)) {
    const artId = art.fightVariants[id] || id;
    const [asset] = art.assets(artId);
    if (!images.has(asset)) images.set(asset, await loadImage(path.join(__dirname, '..', asset)));
    const image = images.get(asset);
    for (const [cells, frame] of [[8, 0], [8, 3.5], [8, 7.5], [3, 0], [3, 1], [3, 2]]) {
      const motion = { swimDrive: 1, swimEffort: 2.8, swimFrame: frame, resistanceBend: 1.6 };
      assert.equal(art.draw(ctx, image, artId, cells, frame, () => image, motion), true);
      const [u, v] = art.sideLip(artId, cells, frame);
      const x = Math.floor(u * 448), y = Math.floor(v * 224);
      const alpha = ctx.getImageData(x, y, 1, 1).data[3];
      assert.ok(alpha >= 96, id + ' ' + cells + '/' + frame + ' hook in transparent space at ' + [x, y, alpha]);
    }
  }
});

test('landmarks meet the illustrated lip crease, including small upturned mouths, long jaws, and barbels', () => {
  // Independently inspected front lip pixels in the painted landing canvas.
  // The surrounding patch allows subpixel placement inside the same feature.
  const examples = {
    medaka: [[366, 111], [363, 146]],
    herabuna: [[367, 117], [366, 147]],
    hirame: [[368, 135], [368, 128]],
    utsubo: [[366, 138], [360, 168]],
    namazu: [[368, 137], [364, 153]],
    mebaru: [[369, 128], [368, 136]],
    kasago: [[370, 139], [370, 142]],
    starNushi: [[368, 129], [366, 140]],
    shiokakureFight: [[365, 139], [365, 148]],
  };
  for (const [id, references] of Object.entries(examples)) {
    for (const [index, cells, frame] of [[0, 8, 4], [1, 3, 2]]) {
      const [u, v] = art.sideLip(id, cells, frame);
      const [x, y] = references[index];
      assert.ok(Math.hypot(u * 448 - x - .5, v * 224 - y - .5) <= 2, id + ' ' + cells + '/' + frame);
    }
  }
  assert.deepEqual(art.sideLip('future-species', 3, 1), art.pose('future-species', 3, 1).target);
});

test('the lateral jaw stays on the artwork at both ends of a turn before the lift', async () => {
  const ctx = createCanvas(448, 224).getContext('2d');
  for (const id of ['medaka', 'mebaru', 'namazu', 'kasago', 'utsubo', 'starNushi', 'hirame', 'iwana']) {
    const image = await loadImage(path.join(__dirname, '..', art.assets(id)[0]));
    const [right, down] = art.sideLip(id, 8, 0);
    for (const heading of [0, .125, .25, 5.75, 5.875, 6]) {
      const [u, v] = art.sideLip(id, 7, heading);
      assert.equal(art.draw(ctx, image, id, 7, heading, () => image), true);
      const px = ctx.getImageData(Math.floor(u*448)-1, Math.floor(v*224)-1, 3, 3).data;
      assert.ok(px.some((value, i) => i%4 === 3 && value >= 96), id + ' near-side turn ' + heading);
      if (heading === 0 || heading === 6) {
        assert.ok(Math.abs(u - (heading === 0 ? right : 1-right)) < 1e-9);
        assert.ok(Math.abs(v - down) < 1e-9);
      }
    }
  }
});
