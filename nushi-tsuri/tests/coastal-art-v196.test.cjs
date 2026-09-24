const { test } = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");
const { createCanvas, loadImage } = require("@napi-rs/canvas");
const { boot, seed, read } = require("./game-harness.cjs");
const Aquarium = require("../aquarium-life.js");

const assets = path.join(__dirname, "..", "assets");

function pixels(img, frameWidth, frameHeight, col, row = 0) {
  const canvas = createCanvas(frameWidth, frameHeight);
  const ctx = canvas.getContext("2d");
  ctx.drawImage(img, col * frameWidth, row * frameHeight,
    frameWidth, frameHeight, 0, 0, frameWidth, frameHeight);
  return Buffer.from(ctx.getImageData(0, 0, frameWidth, frameHeight).data);
}

function opaqueAndColors(data) {
  let opaque = 0;
  const colors = new Set();
  for (let p = 0; p < data.length; p += 4) {
    if (data[p + 3] < 100) continue;
    opaque++;
    colors.add(`${data[p]}:${data[p + 1]}:${data[p + 2]}`);
  }
  return { opaque, colors: colors.size };
}

test("boat atlas has readable shaded craft, seated avatars, four headings and a rowing pose", async () => {
  const boat = await loadImage(path.join(assets, "coast-boat-v196.png"));
  assert.deepEqual([boat.width, boat.height], [256, 384]);
  for (let row = 0; row < 8; row++) for (let col = 0; col < 4; col++) {
    const art = opaqueAndColors(pixels(boat, 64, 48, col, row));
    assert.ok(art.opaque > 280 && art.colors >= 14, `row ${row} facing ${col}`);
  }
  const right = pixels(boat, 64, 48, 1, 0);
  const sample = (x, y) => right[(y * 64 + x) * 4 + 3];
  assert.ok(sample(2, 27) > 100 && sample(53, 42) > 100,
    "pointed hull and wide blade are actually painted");
  assert.notDeepEqual(right, pixels(boat, 64, 48, 1, 1), "stroke bends the paddle");
  assert.notDeepEqual(right, pixels(boat, 64, 48, 1, 2), "the second avatar has their own art");
  assert.notDeepEqual(right, pixels(boat, 64, 48, 0, 0), "upward heading is drawn, not stretched");
  assert.notDeepEqual(right, pixels(boat, 64, 48, 1, 4), "the wooden tub is a separate craft");
});

test("coastal fish have individually shaded swim, turning and mouth art, including moving tails", async () => {
  const sprites = {};
  for (const species of ["shirogisu", "ainame", "madai"]) {
    const frames = {};
    for (const [mode, cells] of [["", 8], ["-turn", 5], ["-mouth", 3]]) {
      const filename = `fish-${species}${mode}-v196.png`;
      const atlas = await loadImage(path.join(assets, filename));
      assert.deepEqual([atlas.width, atlas.height], [cells * 64, 32], filename);
      frames[mode] = Array.from({ length: cells }, (_, i) => pixels(atlas, 64, 32, i));
      for (const [i, data] of frames[mode].entries()) {
        const art = opaqueAndColors(data);
        const minimum = mode === "-turn" && i === 2 ? 75 : 140;
        assert.ok(art.opaque > minimum && art.colors >= 7, `${filename} cell ${i}`);
      }
    }
    assert.notDeepEqual(frames[""][0], frames[""][2], `${species}: tail moves`);
    assert.notDeepEqual(frames["-turn"][0], frames["-turn"][2], `${species}: frontal pose exists`);
    assert.notDeepEqual(frames["-mouth"][0], frames["-mouth"][2], `${species}: lips open`);
    sprites[species] = frames[""][0];
  }
  assert.notDeepEqual(sprites.shirogisu, sprites.ainame);
  assert.notDeepEqual(sprites.ainame, sprites.madai);
});

test("coastal species have distinct fighting patterns and ship the new sprites offline", () => {
  const app = boot({ ...seed(), x: 95, y: 84, mapRegion: "coast", boatActive: true,
    hp: 90, ownedVehicles: ["canoe"], equipment: { hands: null, vehicle: "canoe" } });
  try {
    const w = app.window;
    const phases = read(w, `["shirogisu","ainame","madai"].map(id=>({
      motions:fightProfiles[id].moods.map(m=>m.motion),
      ids:fightProfiles[id].moods.map(m=>m.id),
      beat:fishMotionProfiles[id].beat,
      art:fishAssets[id]
    }))`);
    assert.deepEqual(phases.map(p => p.motions), [
      ["dart", "cling", "rest"],
      ["root", "root", "rush", "rest"],
      ["deep", "steady", "rush", "rest"],
    ]);
    assert.equal(new Set(phases.map(p => p.beat)).size, 3);
    for (const p of phases) assert.match(p.art, /-v196\.png$/);
    const sw = require("node:fs").readFileSync(path.join(__dirname, "../sw.js"), "utf8");
    assert.match(sw, /coast-boat-v196\.png/);
    for (const id of ["shirogisu", "ainame", "madai"]) {
      for (const suffix of ["", "-turn", "-mouth"])
        assert.ok(sw.includes(`fish-${id}${suffix}-v196.png`));
    }
    assert.deepEqual(app.errors, []);
  } finally { app.dispose(); }
});

test("all twenty fish retain their own swimming cadence in the aquariums", () => {
  const app = boot();
  try {
    const ids = read(app.window, "fish.map(f=>f.id)");
    assert.equal(ids.length, 20);
    const gaits = ids.map(id => Aquarium.gait(id));
    assert.equal(new Set(gaits.map(g => JSON.stringify(g))).size, ids.length);
    const fish = ids.filter(id => ["shirogisu", "ainame", "madai"].includes(id))
      .map(species => ({ uid: species, species, length: 2400 }));
    const catalog = fish.map(f => ({ id: f.species, max: 4000 }));
    const poses = Aquarium.layout(fish, catalog, 480, 280, 3, () => 2).poses;
    assert.equal(new Set(poses.map(p => Math.round(p.y))).size, 3);
    assert.ok(Aquarium.gait("shirogisu").speed > Aquarium.gait("madai").speed);
    assert.ok(Aquarium.gait("madai").speed > Aquarium.gait("ainame").speed);
    assert.deepEqual(app.errors, []);
  } finally { app.dispose(); }
});
