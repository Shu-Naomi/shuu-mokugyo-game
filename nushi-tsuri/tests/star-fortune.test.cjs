const { test } = require("node:test");
const assert = require("node:assert/strict");
const { boot, seed, read, saveKey } = require("./game-harness.cjs");

test("secret bait is more common than the rod across the full draw range and the shrine shows those actual chances", () => {
  const app = boot(), w = app.window;
  try {
    w.openLocationInterior("main-shrine");
    for (const [tier, offering, rodCount, baitCount] of [
      ["standard", "offeringDaikon", 50, 100],
      ["lucky", "starGrapes", 100, 300],
    ]) {
      const counts = {};
      // Evenly cover the RNG domain, including the half-percent rod slice.
      // This checks the sampler as well as the table, without flaky luck.
      for (let i = 0; i < 10000; i++) {
        const id = w.rollStarFortune(tier, () => (i + .5) / 10000);
        counts[id] = (counts[id] || 0) + 1;
      }
      assert.equal(counts.starGazer, rodCount);
      assert.equal(counts.baitNushi1, baitCount);
      const pool = w.starFortunePool(tier);
      assert.equal(pool.reduce((sum, [, weight]) => sum + weight, 0), 100);
      assert.equal(Object.keys(counts).length, pool.length);
      for (const [id, weight] of pool) assert.equal(counts[id], weight * 100);
      assert.equal(w.rollStarFortune(tier, () => 0), "starGazer");
      assert.equal(w.rollStarFortune(tier, () => rodCount / 10000), "expeditionJoint");
      assert.equal(w.rollStarFortune(tier, () => 1), "money10000");
      assert.equal(w.starFortuneChance("starGazer", tier), rodCount / 100);
      assert.equal(w.starFortuneChance("baitNushi1", tier), baitCount / 100);
      const button = w.document.querySelector(`[data-draw-fortune="${offering}"]`);
      assert.ok(button.textContent.includes(`大当たり${rodCount / 100}%`));
    }
    assert.ok(w.document.querySelector(".star-fortune-lineup").textContent.includes("通常1%／星ぶどう3%"));
    // The displayed odds must follow the draw data when it is retuned again.
    w.eval(`starFortunePool = () => [["starGazer", 2], ["baitNushi1", 8], ["money500", 40]]`);
    w.renderLocationGoods();
    assert.ok(w.document.querySelector("[data-draw-fortune]").textContent.includes("大当たり4%"));
    assert.ok(w.document.querySelector(".star-fortune-lineup").textContent.includes("通常16%／星ぶどう16%"));
    assert.deepEqual(app.errors, []);
  } finally { app.dispose(); }
});

test("draws consume one offering, prevent repeated taps, award secret bait and duplicate compensation, and survive save/reload", () => {
  const original = { ...seed(), items: { starGrapes: 4 }, baits: { worm: 7, nushiSecret: 2 }, rodParts: { expeditionJoint: 3 } };
  const app = boot(original), w = app.window;
  let saved;
  try {
    w.openLocationInterior("main-shrine");
    for (const roll of [0, .125, 0, .125]) {
      w.Math.random = () => roll;
      const before = read(w, "s.items.starGrapes");
      assert.equal(w.drawStarFortune("starGrapes"), true);
      assert.equal(read(w, "s.items.starGrapes"), before - 1);
      assert.equal(w.drawStarFortune("starGrapes"), false, "reveal blocks a second tap");
      assert.equal(read(w, "s.items.starGrapes"), before - 1);
      w.hideStarFortuneReveal();
    }
    assert.equal(w.drawStarFortune("starGrapes"), false, "no offering, no free draw");
    assert.equal(read(w, "s.ownedRods.filter(id => id === 'starGazer').length"), 1);
    assert.equal(read(w, "s.selectedRod"), "starGazer");
    assert.equal(read(w, "s.baits.nushiSecret"), 4);
    assert.equal(read(w, "s.rodParts.expeditionJoint"), 4);
    assert.equal(read(w, "s.money"), original.money);
    assert.equal(read(w, "s.caught.funa"), original.caught.funa);
    saved = JSON.parse(w.localStorage.getItem(saveKey));
    assert.deepEqual(app.errors, []);
  } finally { app.dispose(); }
  const resumed = boot(saved);
  try {
    assert.equal(read(resumed.window, "s.baits.nushiSecret"), 4);
    assert.equal(read(resumed.window, "s.items.starGrapes"), 0);
    assert.equal(read(resumed.window, "s.rodParts.expeditionJoint"), 4);
    assert.equal(read(resumed.window, "s.ownedRods.filter(id => id === 'starGazer').length"), 1);
    assert.deepEqual(resumed.errors, []);
  } finally { resumed.dispose(); }
});
