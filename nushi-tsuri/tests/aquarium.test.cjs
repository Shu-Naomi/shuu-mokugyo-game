// Run: cd nushi-tsuri/tests && npm install && npm test
// Loads the actual game script/DOM; Canvas and audio alone are test doubles.
const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { JSDOM, VirtualConsole } = require("jsdom");
const html = fs.readFileSync(path.join(__dirname, "../index.html"), "utf8");
const saveKey = "nushi-inugoya-v2";
const seed = () => ({
  mapVersion: 102, money: 4321, hp: 37, maxHp: 100, gameMinutes: 500,
  caught: { funa: 2, nijimasu: 3, mebaru: 1, hirame: 1 },
  baits: { worm: 7, shell: 2 }, cookingIngredients: { fishFillet: 3 },
  preparedMeals: { shellSoup: 1 }, dog: "shuu", dogAffinity: { shuu: 44 },
  questCompletions: 4, x: 10, y: 79, direction: "left",
});

function boot(saved = seed(), tankSizes = { homeAquarium: [101, 45], aquariumPreview: [440, 180] }) {
  const errors = [];
  let dispose;
  const virtualConsole = new VirtualConsole();
  virtualConsole.on("jsdomError", (error) => errors.push(error.message));
  const dom = new JSDOM(html, {
    url: "http://localhost/nushi-tsuri/", runScripts: "dangerously",
    pretendToBeVisual: true, virtualConsole,
    beforeParse(window) {
      // The game declares a global close() for its menus. Keep JSDOM's real
      // teardown before that function shadows window.close, or timers linger.
      dispose = window.close.bind(window);
      window.localStorage.setItem(saveKey, JSON.stringify(saved));
      // JSDOM has no layout engine. Supply explicit phone-sized tank boxes
      // so containment tests exercise real sizing math instead of 0x0 DOMs.
      const bounds = window.Element.prototype.getBoundingClientRect;
      window.Element.prototype.getBoundingClientRect = function () {
        const size = tankSizes[this.id];
        return size ? new window.DOMRect(0, 0, ...size) : bounds.call(this);
      };
      window.matchMedia = () => ({ matches: false, addEventListener() {}, removeEventListener() {} });
      window.ResizeObserver = class { observe() {} disconnect() {} };
      window.Path2D = class {};
      window.DOMMatrix = class {};
      window.navigator.vibrate = () => true;
      window.HTMLCanvasElement.prototype.getContext = function () {
        const gradient = { addColorStop() {} };
        return this.context ||= new Proxy({
          canvas: this, measureText: (text) => ({ width: String(text).length * 8 }),
          createLinearGradient: () => gradient, createRadialGradient: () => gradient,
          getImageData: (x, y, w, h) => ({ data: new Uint8ClampedArray(w * h * 4), width: w, height: h }),
        }, { get: (target, key) => key in target ? target[key] : () => {} });
      };
      window.Image = function () {
        const image = window.document.createElement("img");
        Object.defineProperties(image, {
          complete: { value: true }, naturalWidth: { value: 320 }, naturalHeight: { value: 160 },
          src: { get() { return this._src; }, set(value) {
            this._src = value;
            window.setTimeout(() => this.dispatchEvent(new window.Event("load")), 0);
          } },
        });
        image.decode = () => Promise.resolve();
        return image;
      };
      window.Audio = class {
        constructor(src) { Object.assign(this, { src, paused: true, currentTime: 0, volume: 1 }); }
        play() { this.paused = false; return Promise.resolve(); }
        pause() { this.paused = true; }
        load() {} setAttribute() {} addEventListener() {} removeEventListener() {}
      };
    },
  });
  dom.window.document.querySelector("#start").click();
  return { dom, window: dom.window, errors, dispose };
}
const read = (window, expression) => JSON.parse(window.eval(`JSON.stringify(${expression})`));

test("unchanged field sparkles keep their nodes; hidden records refresh when opened", () => {
  const app = boot();
  const { window } = app;
  try {
    const layer = window.document.querySelector("#forageLayer");
    const sparkles = [...layer.children];
    assert.ok(sparkles.length > 0);
    const fieldChanges = new window.MutationObserver(() => {});
    fieldChanges.observe(layer, { childList: true });
    const bookChanges = new window.MutationObserver(() => {});
    bookChanges.observe(window.document.querySelector("#book"), { childList: true });
    window.eval('for (let i = 0; i < 20; i++) { render(); log("描画確認 " + i); } openInventory(); close();');
    assert.equal(fieldChanges.takeRecords().length, 0, "no sparkle subtree rebuilds across 20 unchanged renders");
    assert.deepEqual([...layer.children], sparkles, "CSS animation nodes survive movement renders");
    assert.equal(bookChanges.takeRecords().length, 0, "20 log updates and another menu do not rebuild a hidden book");
    window.eval('s.caught.koi = 1; open("record")');
    assert.equal(bookChanges.takeRecords().length, 1);
    assert.equal(window.document.querySelector("#fishdexDiscovered").textContent, "5 / 17");
    assert.match(window.document.querySelector('[data-fishdex-id="koi"]').textContent, /コイ.*1匹/s);
    assert.match(window.document.querySelector("#log").textContent, /描画確認 19/);
    window.eval('log("開いている図鑑の新しい記録")');
    assert.match(window.document.querySelector("#log").textContent, /開いている図鑑の新しい記録/);
    window.eval("close()");
    const pointId = sparkles[0].dataset.foragePoint;
    assert.equal(window.eval(`collectForagePoint(${JSON.stringify(pointId)})`), true);
    assert.equal(layer.querySelector(`[data-forage-point="${pointId}"]`), null, "harvest still removes the sparkle immediately");
    assert.ok(fieldChanges.takeRecords().length > 0);
    fieldChanges.disconnect(); bookChanges.disconnect();
    assert.deepEqual(app.errors, []);
  } finally { app.dispose(); }
});

test("blur, hidden pages, pagehide and lost pointer capture release held inputs", async () => {
  const app = boot();
  const { window } = app;
  try {
    for (const type of ["blur", "visibilitychange", "pagehide"]) {
      window.eval("battle = null; s.soundEnabled = false");
      const moveButton = window.document.querySelector('[data-move="right"]');
      // JSDOM does not dispatch PointerEvent properties. Invoke the installed
      // handler, then dispatch the real window/document lifecycle events.
      moveButton.onpointerdown({ preventDefault() {}, currentTarget: moveButton, pointerId: 1 });
      assert.ok(window.eval("moveHoldInterval"));
      const position = read(window, "[s.x,s.y]");
      // Isolate input handling from the battle simulation, which has its own
      // tests. No movement or reel handler is mocked here.
      window.eval('battle = { phase:"fight", reeling:true, retrievalDelta:0 }');
      if (type === "visibilitychange") {
        Object.defineProperty(window.document, "hidden", { configurable: true, value: true });
        window.document.dispatchEvent(new window.Event(type));
      } else window.dispatchEvent(new window.Event(type));
      assert.equal(window.eval("moveHoldInterval"), 0, `${type} clears movement`);
      assert.equal(window.eval("battle.reeling"), false, `${type} releases reel`);
      window.eval("battle = null");
      await new Promise((resolve) => window.setTimeout(resolve, 390));
      assert.deepEqual(read(window, "[s.x,s.y]"), position, `${type} leaves no delayed movement`);
      Object.defineProperty(window.document, "hidden", { configurable: true, value: false });
    }
    window.eval('battle = { phase:"fight", reeling:true, retrievalDelta:0 }');
    window.document.querySelector("#pull").onlostpointercapture();
    assert.equal(window.eval("battle.reeling"), false);
    window.eval("battle = null");
    assert.deepEqual(app.errors, []);
  } finally { app.dispose(); }
});

test("storage failure preserves current progress and page cleanup; a later save recovers", async () => {
  const app = boot();
  const { window } = app;
  const setItem = window.Storage.prototype.setItem;
  try {
    await enterHome(window);
    choose(window, "nijimasu");
    const previousSave = window.localStorage.getItem(saveKey);
    window.Storage.prototype.setItem = () => { throw new window.DOMException("Storage full", "QuotaExceededError"); };
    choose(window, "funa");
    assert.equal(window.eval("s.homeAquariumFishId"), "funa", "the fish replacement completes in memory");
    assert.equal(window.localStorage.getItem(saveKey), previousSave, "the last stored save stays intact");
    assert.equal(window.document.querySelector("#saveStatus").hidden, false);
    assert.equal(window.eval("save()"), false);
    window.eval('log("保存失敗後も操作できる"); gameAudio.unlocked = true');
    assert.ok(window.eval("aquariumAnimationTimer"));
    window.dispatchEvent(new window.Event("pagehide"));
    assert.equal(window.eval("aquariumAnimationTimer"), 0, "save failure cannot skip animation cleanup");
    assert.equal(window.eval("gameAudio.unlocked"), false, "save failure cannot skip audio cleanup");
    assert.equal(window.eval("s.log[0]"), "保存失敗後も操作できる");
    window.Storage.prototype.setItem = setItem;
    assert.equal(window.eval("save()"), true);
    assert.equal(window.document.querySelector("#saveStatus").hidden, true);
    assert.equal(JSON.parse(window.localStorage.getItem(saveKey)).homeAquariumFishId, "funa");
    assert.deepEqual(app.errors, []);
  } finally { window.Storage.prototype.setItem = setItem; app.dispose(); }
});

async function finishTransition(window) {
  for (let count = 0; count < 80; count += 1) {
    if (!window.eval("playerHomeState.transitioning")) return;
    await new Promise((resolve) => window.setTimeout(resolve, 10));
  }
  throw new Error("Home fade transition did not finish");
}
function walkTo(window, eventId) {
  // Find a path, then follow it through the real movement handler (no teleport).
  return window.eval(`(() => {
    const queue = [{ x: playerHomeState.x, y: playerHomeState.y, path: [] }];
    const seen = new Set();
    while (queue.length) {
      const point = queue.shift();
      const key = point.x + "," + point.y;
      if (seen.has(key)) continue;
      seen.add(key);
      if (nearbyPlayerHomeEvent(playerHomeState.area, point.x, point.y)?.id === ${JSON.stringify(eventId)}) {
        for (const direction of point.path) {
          if (!movePlayerHome(direction)) throw new Error("Movement blocked on route");
        }
        return true;
      }
      for (const direction of ["left", "right", "up", "down"]) {
        const { x, y } = playerHomeMoveTarget(playerHomeState.area, point.x, point.y, direction);
        if (x !== point.x || y !== point.y)
          queue.push({ x, y, path: [...point.path, direction] });
      }
    }
    return false;
  })()`);
}
async function enterHome(window) {
  window.eval('move("left")');
  await finishTransition(window);
  assert.equal(window.eval("playerHomeState.area"), "exterior");
  window.eval('for (let i = 0; i < 9; i++) move("right"); for (let i = 0; i < 3; i++) move("up");');
  assert.equal(window.eval("nearbyPlayerHomeEvent()?.id"), "front-door");
  window.document.querySelector("#action").click();
  await finishTransition(window);
  assert.equal(window.eval("playerHomeState.area"), "interior");
  assert.equal(walkTo(window, "aquarium"), true);
  window.document.querySelector("#action").click();
  assert.equal(window.document.querySelector("#aquariumModal").classList.contains("open"), true);
}
function choose(window, id) {
  const select = window.document.querySelector("#aquariumFishSelect");
  select.value = id;
  select.dispatchEvent(new window.Event("change"));
  window.document.querySelector("#aquariumPlaceFish").click();
}

test("A → select one → replace → swim → leave/return → save/reload; existing systems preserved", async () => {
  const app = boot();
  const { window } = app;
  let reloaded;
  try {
    assert.equal(window.eval("s.homeAquariumFishId"), null);
    const before = read(window, "({ caught:s.caught, money:s.money, baits:s.baits, ingredients:s.cookingIngredients, meals:s.preparedMeals, dog:s.dogAffinity, dex:s.fishCatchRecords, crowns:s.fishCrowns, quests:s.questCompletions })");
    assert.equal(window.eval('placeAquariumFish("funa")'), false);
    await enterHome(window);
    assert.deepEqual([...window.document.querySelectorAll("#aquariumFishSelect option")].map((x) => x.value).sort(), ["funa", "hirame", "mebaru", "nijimasu"]);
    assert.equal(window.eval('placeAquariumFish("nushi")'), false);
    choose(window, "nijimasu");
    assert.equal(window.eval("s.homeAquariumFishId"), "nijimasu");
    assert.equal(JSON.parse(window.localStorage.getItem(saveKey)).homeAquariumFishId, "nijimasu");
    assert.equal(window.document.querySelector("#aquariumPlaceFish").disabled, true);
    const position = window.document.querySelector("#aquariumPreviewFish").style.left;
    await new Promise((resolve) => window.setTimeout(resolve, 260));
    assert.notEqual(window.document.querySelector("#aquariumPreviewFish").style.left, position);
    assert.match(window.document.querySelector("#aquariumPreviewFish canvas").dataset.atlasKey, /nijimasu/);
    choose(window, "mebaru");
    assert.equal(window.eval("s.homeAquariumFishId"), "mebaru");
    assert.equal(window.document.querySelectorAll("#aquariumPreview > .aquarium-fish:not([hidden])").length, 1);
    assert.equal(window.document.querySelector("#aquariumPreviewFish").classList.contains("standalone-frame"), true);
    choose(window, "funa");
    assert.equal(window.document.querySelector("#aquariumPreviewFish").classList.contains("standalone-frame"), false);
    assert.equal(window.document.querySelectorAll("#aquariumPreviewFish img").length, 0);
    assert.deepEqual(read(window, "({ caught:s.caught, money:s.money, baits:s.baits, ingredients:s.cookingIngredients, meals:s.preparedMeals, dog:s.dogAffinity, dex:s.fishCatchRecords, crowns:s.fishCrowns, quests:s.questCompletions })"), before);
    window.document.querySelector("#back").click();
    assert.equal(walkTo(window, "interior-door"), true);
    window.document.querySelector("#action").click();
    await finishTransition(window);
    assert.equal(window.eval("s.homeAquariumFishId"), "funa");
    assert.equal(window.eval("aquariumAnimationTimer"), 0);
    assert.equal(walkTo(window, "front-door"), true);
    window.document.querySelector("#action").click();
    await finishTransition(window);
    assert.equal(window.eval("s.homeAquariumFishId"), "funa");
    assert.ok(window.eval("aquariumAnimationTimer"));
    assert.equal(walkTo(window, "kitchen"), true);
    window.document.querySelector("#action").click();
    assert.equal(window.eval('cookRecipe("shellSoup")'), true);
    window.document.querySelector("#back").click();
    assert.equal(walkTo(window, "bed"), true);
    window.document.querySelector("#action").click();
    assert.equal(window.eval("s.hp"), 100);
    assert.equal(window.eval("s.homeAquariumFishId"), "funa");
    assert.equal(walkTo(window, "interior-door"), true);
    window.document.querySelector("#action").click();
    await finishTransition(window);
    assert.equal(walkTo(window, "map-exit"), true);
    window.document.querySelector("#action").click();
    await finishTransition(window);
    assert.equal(window.eval("playerHomeState.area"), null);
    assert.equal(window.eval("s.homeAquariumFishId"), "funa");
    await enterHome(window);
    assert.equal(window.eval("s.homeAquariumFishId"), "funa");
    window.eval("save()");
    const saved = JSON.parse(window.localStorage.getItem(saveKey));
    reloaded = boot(saved);
    assert.equal(reloaded.window.eval("s.homeAquariumFishId"), "funa");
    await enterHome(reloaded.window);
    assert.match(reloaded.window.document.querySelector("#aquariumStatus").textContent, /フナ/);
    assert.equal(reloaded.window.document.querySelector("#homeAquariumFish").hidden, false);
    assert.deepEqual(app.errors, []);
    assert.deepEqual(reloaded.errors, []);
  } finally { app.dispose(); reloaded?.dispose(); }
});

test("empty catch history and malformed aquarium IDs are safe", async () => {
  for (const id of [undefined, null, "missing-fish", "nushi", {}, ["funa", "nijimasu"], 7]) {
    const app = boot({ ...seed(), homeAquariumFishId: id });
    try {
      assert.equal(app.window.eval("s.homeAquariumFishId"), null);
      assert.equal(app.window.eval("s.money"), 4321);
      assert.deepEqual(app.errors, []);
    } finally { app.dispose(); }
  }
  const app = boot({ ...seed(), caught: {} });
  try {
    await enterHome(app.window);
    assert.equal(app.window.document.querySelector("#aquariumFishSelect").disabled, true);
    assert.equal(app.window.document.querySelector("#aquariumPlaceFish").disabled, true);
    assert.equal(app.window.document.querySelector("#homeAquariumFish").hidden, true);
    assert.equal(app.window.eval("aquariumAnimationTimer"), 0);
    assert.equal(app.window.eval('placeAquariumFish("funa")'), false);
    assert.deepEqual(app.errors, []);
  } finally { app.dispose(); }
});

test("all existing fish use one reused sprite; hidden pages stop/resume animation", async () => {
  const app = boot();
  const { window } = app;
  try {
    // A test-only complete catch history, not a player-facing unlock feature.
    window.eval("for (const f of fish) s.caught[f.id] = 1");
    await enterHome(window);
    assert.equal(window.getComputedStyle(window.document.querySelector("#aquariumModal")).display, "flex");
    for (const id of read(window, "fish.map(f => f.id)")) {
      choose(window, id);
      assert.equal(window.eval("s.homeAquariumFishId"), id);
      const sprite = window.document.querySelector("#aquariumPreviewFish");
      assert.equal(sprite.hidden, false);
      assert.ok(sprite.querySelector("canvas, img"));
      assert.equal(window.document.querySelectorAll("#homeAquarium > .aquarium-fish").length, 1);
    }
    const timer = window.eval("aquariumAnimationTimer");
    window.eval("renderHomeAquarium(); renderHomeAquarium()");
    assert.equal(window.eval("aquariumAnimationTimer"), timer);
    Object.defineProperty(window.document, "hidden", { value: true, configurable: true });
    window.document.dispatchEvent(new window.Event("visibilitychange"));
    assert.equal(window.eval("aquariumAnimationTimer"), 0);
    Object.defineProperty(window.document, "hidden", { value: false, configurable: true });
    window.document.dispatchEvent(new window.Event("visibilitychange"));
    assert.ok(window.eval("aquariumAnimationTimer"));
    window.dispatchEvent(new window.Event("pagehide"));
    assert.equal(window.eval("aquariumAnimationTimer"), 0);
    window.dispatchEvent(new window.Event("pageshow"));
    assert.ok(window.eval("aquariumAnimationTimer"));
    assert.deepEqual(app.errors, []);
  } finally { app.dispose(); }
});

test("painted aisles are reachable, furniture stays solid, and A works from the tank's exposed front", async () => {
  const app = boot();
  const { window } = app;
  try {
    // Coordinates come from visible floor/objects in player-home-v153.jpg,
    // not from the collision rectangles under test.
    const floor = {
      interior: [[30, 41], [33, 55], [39, 68], [39, 85], [52, 75], [64, 75], [68, 75], [70, 70], [70, 86], [52, 33]],
      exterior: [[12, 80], [28, 83], [38, 80], [58, 82], [64, 84], [76, 84], [86, 88], [49, 73]],
    };
    const solid = {
      interior: [[14, 67], [86, 60], [44, 25], [20, 40], [40, 45], [46, 58], [60, 65], [62, 32], [79, 30], [79, 48], [79, 70], [79, 91], [60, 85], [30, 85], [17, 60]],
      exterior: [[50, 60], [68, 70], [80, 68], [20, 60], [36, 71], [60, 75], [79, 79]],
    };
    for (const [area, points] of Object.entries(floor)) {
      for (const [x, y] of points)
        assert.equal(window.eval(`isPlayerHomePositionWalkable("${area}", ${x}, ${y})`), true, `floor ${area} ${x},${y}`);
    }
    for (const [area, points] of Object.entries(solid)) {
      for (const [x, y] of points)
        assert.equal(window.eval(`isPlayerHomePositionWalkable("${area}", ${x}, ${y})`), false, `solid ${area} ${x},${y}`);
    }
    await enterHome(window);
    window.document.querySelector("#back").click();
    // A direct, repeatable thumb-pad route from the entrance: four up,
    // then six right along the floor beneath the tackle rack.
    window.eval("Object.assign(playerHomeState, { x:44, y:91 })");
    for (let i = 0; i < 4; i++) assert.equal(window.eval('movePlayerHome("up")'), true);
    for (let i = 0; i < 6; i++) assert.equal(window.eval('movePlayerHome("right")'), true);
    assert.deepEqual(read(window, "({x:playerHomeState.x,y:playerHomeState.y})"), { x:68, y:75 });
    window.document.querySelector("#action").click();
    assert.equal(window.document.querySelector("#aquariumModal").classList.contains("open"), true);
    window.document.querySelector("#back").click();
    // One more right tap uses the clear part of a stride, stops at the
    // cabinet, and still permits A; it cannot jump through the cabinet.
    assert.equal(window.eval('movePlayerHome("right")'), true);
    assert.equal(window.eval("playerHomeState.x"), 70);
    assert.equal(window.eval('movePlayerHome("right")'), false);
    window.document.querySelector("#action").click();
    assert.equal(window.document.querySelector("#aquariumModal").classList.contains("open"), true);
    window.document.querySelector("#back").click();
    for (const [x, y] of [[68, 61], [68, 75], [69, 72], [70, 75]])
      assert.equal(window.eval(`nearbyPlayerHomeEvent("interior", ${x}, ${y})?.id`), "aquarium");
    for (const [x, y] of [[64, 75], [79, 66], [79, 91], [70, 86]])
      assert.notEqual(window.eval(`nearbyPlayerHomeEvent("interior", ${x}, ${y})?.id`), "aquarium");
    for (const id of ["bed", "kitchen", "interior-door", "aquarium"])
      assert.equal(walkTo(window, id), true, `reachable ${id}`);
    assert.deepEqual(app.errors, []);
  } finally { app.dispose(); }
});

test("every fish cruises slowly, turns while stopped, and stays inside both phone-sized tanks", async () => {
  for (const sizes of [
    { homeAquarium: [101, 45], aquariumPreview: [440, 180] },
    { homeAquarium: [78, 28], aquariumPreview: [310, 100] },
    { homeAquarium: [164, 76], aquariumPreview: [740, 300] },
  ]) {
    const app = boot(seed(), sizes);
    const { window } = app;
    try {
      await enterHome(window);
      window.eval("stopAquariumAnimation(); for (const f of fish) s.caught[f.id] = 1");
      const motion = read(window, `fish.map(f => {
        let previous = aquariumFishPose(f.id, 0), previousVelocity = 0;
        let maxSpeed = 0, maxAcceleration = 0, wrongFacing = 0, turningInMotion = 0, escapes = 0;
        let minY = 100, maxY = 0;
        const headings = new Set();
        for (let step = 1; step <= 1600; step++) {
          const pose = aquariumFishPose(f.id, step * .05);
          const dx = pose.x - previous.x;
          const velocity = dx / .05;
          maxSpeed = Math.max(maxSpeed, Math.abs(velocity));
          maxAcceleration = Math.max(maxAcceleration, Math.abs(velocity - previousVelocity) / .05);
          if (Math.abs(dx) > .0001 && Math.sign(dx) !== Math.sign(pose.facing)) wrongFacing++;
          if (Math.abs(pose.facing) < .99 && Math.abs(dx) > .0001) turningInMotion++;
          if (pose.x - pose.width / 2 < 3.99 || pose.x + pose.width / 2 > 96.01) escapes++;
          if (Math.abs(pose.facing) > .99) headings.add(Math.sign(pose.facing));
          minY = Math.min(minY, pose.y); maxY = Math.max(maxY, pose.y);
          previous = pose; previousVelocity = velocity;
        }
        return { id:f.id, maxSpeed, maxAcceleration, wrongFacing, turningInMotion, escapes, headings:[...headings], sway:maxY-minY };
      })`);
      for (const row of motion) {
        assert.ok(row.maxSpeed > 0 && row.maxSpeed < 8, `${row.id} slow speed`);
        assert.ok(row.maxAcceleration < 3, `${row.id} gentle acceleration`);
        assert.equal(row.wrongFacing, 0, `${row.id} facing travel direction`);
        assert.equal(row.turningInMotion, 0, `${row.id} turns at rest`);
        assert.equal(row.escapes, 0, `${row.id} horizontal bounds`);
        assert.equal(row.headings.length, 2, `${row.id} both directions`);
        assert.ok(row.sway <= 2.501, `${row.id} small vertical sway`);
      }
      assert.ok(window.eval('aquariumFishPose("moroko",0).width < aquariumFishPose("suzuki",0).width'));
      for (const id of read(window, "fish.map(f => f.id)")) {
        window.eval(`s.homeAquariumFishId = "${id}"; renderHomeAquarium(); stopAquariumAnimation()`);
        for (const time of [0, 7, 14, 14.35, 14.7, 22, 29.05, 37.05]) {
          window.eval(`aquariumElapsed=${time}; drawAquariumFish()`);
          for (const selector of ["homeAquariumFish", "aquariumPreviewFish"]) {
            const element = window.document.getElementById(selector);
            const [w, h] = sizes[element.parentElement.id];
            const fw = parseFloat(element.style.width), fh = parseFloat(element.style.height);
            const x = parseFloat(element.style.left) / 100 * w, y = parseFloat(element.style.top) / 100 * h;
            assert.ok(fw > 0 && fh > 0);
            assert.ok(x - fw/2 >= 0 && x + fw/2 <= w, `${id} ${selector} horizontal containment`);
            assert.ok(y - fh/2 >= 0 && y + fh/2 <= h, `${id} ${selector} vertical containment`);
            const [sourceW, sourceH] = read(window, `fishFrameFallbackSizes["${id}"] || [320,160]`);
            assert.ok(Math.abs(fw/fh - sourceW/sourceH) < .00001, `${id} undistorted aspect ratio`);
          }
        }
      }
      // Long stalls advance at most one short step, and resuming a stopped
      // animation excludes all time spent outside/hidden.
      window.eval("aquariumElapsed=7; stopAquariumAnimation(); advanceAquariumAnimation(1000); cancelAnimationFrame(aquariumAnimationTimer); advanceAquariumAnimation(11000); cancelAnimationFrame(aquariumAnimationTimer)");
      assert.ok(Math.abs(window.eval("aquariumElapsed") - 7.05) < .00001);
      window.eval("stopAquariumAnimation(); advanceAquariumAnimation(1000000); cancelAnimationFrame(aquariumAnimationTimer)");
      assert.ok(Math.abs(window.eval("aquariumElapsed") - 7.05) < .00001);
      assert.deepEqual(app.errors, []);
    } finally { app.dispose(); }
  }
});
