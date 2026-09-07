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

function boot(saved = seed()) {
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
      for (const [direction, dx, dy] of [["left", -4, 0], ["right", 4, 0], ["up", 0, -4], ["down", 0, 4]]) {
        const x = point.x + dx, y = point.y + dy;
        if (isPlayerHomePositionWalkable(playerHomeState.area, x, y))
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
