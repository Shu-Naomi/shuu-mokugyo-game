const { test } = require("node:test");
const assert = require("node:assert/strict");
const { boot, read } = require("./game-harness.cjs");

function setup(surface) {
  const app = boot(), { window } = app;
  if (surface === "battle") window.eval(`
    cast(fishingSpots[0]); beginFishing(); clearInterval(timer);
    battle.cast=50; launchSurfaceCast(); settleSurfaceCast();
    startFight(); clearInterval(timer); finishHookReveal();
  `);
  const element = window.document.querySelector(surface === "battle" ? "#battleFish" : "#catchFish");
  window.eval(`fishAtlasCanvas($("#${element.id}"))`);
  const canvas = element.querySelector("canvas"), context = canvas.getContext("2d");
  let pixels = null;
  context.clearRect = () => { pixels = null; };
  context.drawImage = (image) => { pixels = image.src; };
  function render(id, step = 0) {
    // Both real fight/catch entry points reuse the element and reset its class.
    if (element.dataset.testFish !== id) {
      element.className = `${surface === "battle" ? "battle" : "catch"}-fish fish-${id}`;
      element.dataset.testFish = id;
    }
    if (surface === "battle") window.eval(`
      Object.assign(battle, { f:fish.find(f=>f.id===${JSON.stringify(id)}),
        frame:${step}, mouthState:"closed", turning:null, sandLifted:true });
      renderBattleFish();
    `);
    else window.eval(`renderCatchFishLife(fish.find(f=>f.id===${JSON.stringify(id)}), ${step})`);
  }
  function delayed(asset) {
    const image = window.document.createElement("img");
    let ready = false;
    Object.defineProperties(image, {
      complete: { get: () => ready },
      naturalWidth: { get: () => ready ? 320 : 0 },
      naturalHeight: { get: () => ready ? 160 : 0 },
    });
    image.src = asset;
    window.testDelayedFishImage = image;
    window.eval(`fishAtlasImageCache.set(${JSON.stringify(asset)}, window.testDelayedFishImage)`);
    delete window.testDelayedFishImage;
    return () => { ready = true; image.dispatchEvent(new window.Event("load")); };
  }
  return { ...app, element, canvas, render, delayed, pixels: () => pixels };
}

function assertSingleMebaru(app, label) {
  assert.equal(app.element.querySelectorAll(".fish-frame-canvas").length, 1, label);
  for (const layer of [app.element, app.canvas]) {
    assert.doesNotMatch(app.window.getComputedStyle(layer).backgroundImage, /url\(/,
      `${label}: no old fish underneath the transparent bitmap`);
  }
  assert.equal(app.window.getComputedStyle(app.canvas).display, "block", label);
  assert.match(app.pixels(), /mebaru-v144\//, label);
  for (const layer of app.element.querySelectorAll(".fish-life-slice, .fish-direct-frame")) {
    const style = app.window.getComputedStyle(layer);
    assert.ok(style.display === "none" || style.visibility === "hidden" || style.opacity === "0", label);
  }
}

test("mebaru replaces every previous species in both battle and catch without another fish behind it", () => {
  for (const surface of ["battle", "catch"]) {
    const app = setup(surface);
    try {
      const state = read(app.window, "s");
      for (const id of read(app.window, "fish.map(f=>f.id).filter(id=>id!=='mebaru')")) {
        app.render(id);
        app.render("mebaru");
        assertSingleMebaru(app, `${surface}: ${id} → mebaru`);
      }
      assert.deepEqual(read(app.window, "s"), state, "rendering cannot change the save or fishing resources");
      assert.deepEqual(app.errors, []);
    } finally { app.dispose(); }
  }
});

test("a slow first mebaru frame clears the previous fish, while a slow next frame preserves mebaru", () => {
  for (const surface of ["battle", "catch"]) {
    const app = setup(surface);
    try {
      app.render("funa");
      assert.match(app.pixels(), /fish-funa/);
      const loadFirst = app.delayed("assets/mebaru-v144/swim-00.png");
      app.render("mebaru");
      assert.equal(app.pixels(), null, `${surface}: the previous species must not survive while decoding`);
      assert.doesNotMatch(app.window.getComputedStyle(app.canvas).backgroundImage, /url\(/);
      loadFirst();
      assertSingleMebaru(app, `${surface}: first decoded frame`);
      const firstPixels = app.pixels();
      const loadNext = app.delayed("assets/mebaru-v144/swim-02.png");
      app.render("mebaru", surface === "battle" ? 2 : 1);
      assert.equal(app.pixels(), firstPixels, `${surface}: do not blink between mebaru frames`);
      loadNext();
      assert.match(app.pixels(), /mebaru-v144\/swim-02\.png$/);
      assert.deepEqual(app.errors, []);
    } finally { app.dispose(); }
  }
});

test("late image loads cannot restore a previous species over the current fish", () => {
  for (const surface of ["battle", "catch"]) {
    const app = setup(surface);
    try {
      const loadOldAtlas = app.delayed("assets/fish-funa-v124.png");
      app.render("funa");
      app.render("mebaru");
      const mebaruPixels = app.pixels();
      loadOldAtlas();
      assert.equal(app.pixels(), mebaruPixels, `${surface}: the old atlas callback is ignored`);
      assertSingleMebaru(app, `${surface}: old atlas completed late`);
      const loadOldMebaru = app.delayed("assets/mebaru-v144/swim-02.png");
      app.render("mebaru", surface === "battle" ? 2 : 1);
      app.render("bora");
      const boraPixels = app.pixels();
      assert.match(boraPixels, /fish-bora/);
      loadOldMebaru();
      assert.equal(app.pixels(), boraPixels, `${surface}: the old mebaru callback is ignored`);
      assert.deepEqual(app.errors, []);
    } finally { app.dispose(); }
  }
});
