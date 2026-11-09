// Exercise the real worker with simulated CacheStorage and network responses.
// Native browser install/upgrade evidence lives in browser-cache-upgrade-evidence.cjs.
const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const source = fs.readFileSync(path.join(__dirname, "../sw.js"), "utf8");

function bootWorker() {
  const location = new URL("https://game.test/nushi-tsuri/sw.js");
  const listeners = {}, stores = new Map(), requests = [], writes = [];
  const state = {
    network: async () => { throw new TypeError("Offline"); },
    failOpen: false, failWrite: false, claimed: false, skippedWaiting: false,
  };
  const key = (request) => new URL(typeof request === "string" ? request : request.url, location).href;
  function entries(name) {
    if (!stores.has(name)) stores.set(name, new Map());
    return stores.get(name);
  }
  const context = vm.createContext({
    URL, Response,
    self: {
      location, addEventListener: (name, handler) => { listeners[name] = handler; },
      skipWaiting: async () => { state.skippedWaiting = true; }, clients: { claim: async () => { state.claimed = true; } },
    },
    caches: {
      keys: async () => [...stores.keys()], delete: async (name) => stores.delete(name),
      open: async (name) => {
        if (state.failOpen) throw new Error("Cache storage unavailable");
        entries(name);
        return {
          addAll: async (resources) => {
            // Cache.addAll rejects failed responses and commits the batch only
            // after every fetch succeeds. This is a double, not browser proof.
            const batch = await Promise.all(resources.map(async (resource) => {
              const request = { url: key(resource), method: "GET" };
              requests.push({ request, install: true });
              const response = await state.network(request);
              if (!response.ok || response.status === 206) throw new TypeError("Precache request failed");
              return [key(resource), response.clone()];
            }));
            if (state.failWrite) throw new Error("Cache quota exceeded");
            for (const [url, response] of batch) {
              writes.push(url);
              entries(name).set(url, response);
            }
          },
          match: async (request) => entries(name).get(key(request))?.clone(),
          put: async (request, response) => {
            if (state.failWrite) throw new Error("Cache quota exceeded");
            writes.push(key(request));
            entries(name).set(key(request), response.clone());
          },
        };
      },
    },
    fetch: async (request, options) => {
      requests.push({ request, options });
      return state.network(request, options);
    },
  });
  vm.runInContext(source, context);
  const name = vm.runInContext("CACHE_NAME", context);
  const coreAssets = Array.from(vm.runInContext("CORE_ASSETS", context));
  return {
    state, stores, requests, writes, name, coreAssets,
    seed: (cache, resource, body) => entries(cache).set(key(resource), new Response(body)),
    cached: (resource) => entries(name).get(key(resource))?.clone(),
    install: async () => {
      const pending = [];
      listeners.install({ waitUntil: (promise) => pending.push(promise) });
      await Promise.all(pending);
    },
    activate: async () => {
      const pending = [];
      listeners.activate({ waitUntil: (promise) => pending.push(promise) });
      await Promise.all(pending);
    },
    fetch: async (resource, overrides = {}) => {
      let response;
      const pending = [];
      listeners.fetch({
        request: { url: key(resource), method: "GET", mode: "cors", ...overrides },
        respondWith: (promise) => { response = promise; },
        waitUntil: (promise) => pending.push(promise),
      });
      const result = await response;
      await Promise.all(pending);
      return result;
    },
  };
}

test("installation fetches all core assets before skipWaiting and activation retires stale CSS", async () => {
  const app = bootWorker(), previous = "nushi-tsuri-v252-island-fish-252-56";
  const css = app.coreAssets.find(resource => resource.startsWith("./compact-ui.css?"));
  assert.ok(css);
  assert.notEqual(css, "./compact-ui.css?v=251-5");
  assert.notEqual(app.name, previous);
  app.seed(previous, "./compact-ui.css?v=251-5", "stale CSS");
  app.seed("another-game-v1", "./keep", "unrelated cache");
  let releaseCss, startedCss;
  const started = new Promise(resolve => { startedCss = resolve; });
  const pendingCss = new Promise(resolve => { releaseCss = resolve; });
  app.state.network = async request => {
    if (request.url.endsWith(css.slice(2))) { startedCss(); await pendingCss; }
    return new Response(request.url.endsWith(css.slice(2)) ? "corrected CSS" : "core asset");
  };
  const installing = app.install();
  await started;
  assert.equal(app.state.skippedWaiting, false, "cannot activate an incomplete precache");
  assert.equal(app.stores.has(previous), true, "previous release survives while installing");
  releaseCss();
  await installing;
  assert.equal(app.requests.length, app.coreAssets.length);
  assert.equal(new Set(app.requests.map(({request}) => request.url)).size, app.coreAssets.length);
  assert.equal(app.state.skippedWaiting, true);
  assert.equal(app.state.claimed, false);
  assert.equal(await app.cached(css).text(), "corrected CSS");
  assert.equal(app.cached("./compact-ui.css?v=251-5"), undefined);
  await app.activate();
  assert.equal(app.stores.has(previous), false);
  assert.equal(app.stores.has("another-game-v1"), true);
  assert.equal(app.state.claimed, true);
  app.state.network = async () => { throw new TypeError("Offline"); };
  const requests = app.requests.length;
  assert.equal(await (await app.fetch(css)).text(), "corrected CSS");
  assert.equal(app.requests.length, requests, "corrected stylesheet is available offline");
});

test("failed precache cannot skip waiting or delete the previous working release", async () => {
  for (const failure of ["network", "http", "failOpen", "failWrite"]) {
    const app = bootWorker(), previous = "nushi-tsuri-v252-island-fish-252-56";
    app.seed(previous, "./compact-ui.css?v=251-5", "stale but working CSS");
    app.seed("another-game-v1", "./keep", "unrelated cache");
    app.state[failure] = true;
    app.state.network = async request => {
      if (request.url.includes("/compact-ui.css?")) {
        if (failure === "network") throw new TypeError("Offline");
        if (failure === "http") return new Response("unavailable", { status: 503 });
      }
      return new Response("core asset");
    };
    await assert.rejects(app.install(), undefined, failure);
    assert.equal(app.state.skippedWaiting, false, failure);
    assert.equal(app.state.claimed, false, failure);
    assert.equal(app.stores.has(previous), true, failure);
    assert.equal(app.stores.has("another-game-v1"), true, failure);
    assert.equal(app.writes.length, 0, failure + ": no partial precache batch");
  }
});

test("activation deletes only this game's old caches; resource lookup stays isolated", async () => {
  const app = bootWorker();
  app.seed("another-game-v1", "./assets/fish.png", "another game's fish");
  app.seed("nushi-tsuri-v156-old", "./index.html", "old game");
  app.seed(app.name, "./index.html", "current game");
  await app.activate();
  assert.equal(app.stores.has("another-game-v1"), true);
  assert.equal(app.stores.has("nushi-tsuri-v156-old"), false);
  assert.equal(app.stores.has(app.name), true);
  assert.equal(app.state.claimed, true);
  app.state.network = async () => new Response("correct fish");
  assert.equal(await (await app.fetch("./assets/fish.png")).text(), "correct fish");
  assert.equal(app.requests.length, 1);
});

test("navigation stores a good page and recovers it offline or on server failure", async () => {
  const app = bootWorker();
  app.state.network = async () => new Response("game page");
  assert.equal(await (await app.fetch("./", { mode: "navigate" })).text(), "game page");
  assert.equal(app.requests[0].options.cache, "no-store");
  assert.equal(await app.cached("./index.html").text(), "game page");
  app.state.network = async () => new Response("server error", { status: 503 });
  assert.equal(await (await app.fetch("./", { mode: "navigate" })).text(), "game page");
  app.state.network = async () => { throw new TypeError("Offline"); };
  assert.equal(await (await app.fetch("./index.html")).text(), "game page");
  app.state.network = async () => new Response("not found", { status: 404 });
  assert.equal((await app.fetch("./index.html")).status, 404);
  assert.equal(await app.cached("./index.html").text(), "game page");
  assert.equal(app.writes.length, 1, "errors never replace the saved page");
  assert.equal((await bootWorker().fetch("./", { mode: "navigate" })).type, "error");
});

test("offline assets never receive HTML; cached assets work and partial/error responses stay uncached", async () => {
  const app = bootWorker();
  app.seed(app.name, "./index.html", "<!doctype html>game");
  app.seed(app.name, "./assets/known.png", "cached fish");
  assert.equal(await (await app.fetch("./assets/known.png")).text(), "cached fish");
  assert.equal(app.requests.length, 0);
  for (const file of ["fish.png", "water.mp3"])
    assert.equal((await app.fetch(`./assets/${file}`)).type, "error");
  for (const status of [206, 404, 503]) {
    app.state.network = async () => new Response("partial or failed", { status });
    assert.equal((await app.fetch("./assets/water.mp3")).status, status);
    assert.equal(app.cached("./assets/water.mp3"), undefined);
  }
  app.state.network = async () => new Response("complete audio");
  assert.equal(await (await app.fetch("./assets/water.mp3")).text(), "complete audio");
  app.state.network = async () => { throw new TypeError("Offline"); };
  assert.equal(await (await app.fetch("./assets/water.mp3")).text(), "complete audio");
  assert.equal(app.writes.length, 1);
});

test("cache failures cannot discard successful network responses or reject worker lifetime promises", async () => {
  for (const failure of ["failOpen", "failWrite"]) {
    const app = bootWorker();
    app.state[failure] = true;
    app.state.network = async () => new Response("network success");
    for (const resource of ["./index.html", "./assets/fish.png"])
      assert.equal(await (await app.fetch(resource)).text(), "network success", `${failure}: ${resource}`);
    assert.equal(app.writes.length, 0);
  }
});

test("POST and cross-origin requests pass through without cache interception", async () => {
  const app = bootWorker();
  assert.equal(await app.fetch("./index.html", { method: "POST" }), undefined);
  assert.equal(await app.fetch("https://other.test/index.html", { mode: "navigate" }), undefined);
  assert.equal(app.requests.length, 0);
  assert.equal(app.writes.length, 0);
});
