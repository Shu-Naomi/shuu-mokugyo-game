// Exercise the real worker with simulated CacheStorage and network responses.
// Native browser install/upgrade evidence lives in browser-cache-upgrade-evidence.cjs.
const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const { webcrypto, createHash } = require("node:crypto");
const path = require("node:path");
const vm = require("node:vm");
const source = fs.readFileSync(path.join(__dirname, "../sw.js"), "utf8");
const scope = "https://game.test/nushi-tsuri/";

// Keep the real worker, URL inventory and WebCrypto verification. Give each
// physical file a small, unique body so the cache double need not hold all art.
function assetPath(resource) {
  const pathname = new URL(resource.url ?? resource, scope).pathname.slice("/nushi-tsuri/".length);
  return !pathname || /^release-[0-9-]+\.html$/.test(pathname) ? "index.html" : pathname;
}
const bodyFor = resource => "fixture bytes for " + assetPath(resource);
const assetResponse = resource => new Response(bodyFor(resource));

function bootWorker({ workerSource = source, stores = new Map() } = {}) {
  const location = new URL("https://game.test/nushi-tsuri/sw.js");
  const listeners = {}, requests = [], writes = [], deletions = [];
  const state = {
    network: async () => { throw new TypeError("Offline"); },
    failOpen: false, failWrite: false, claimed: false, skippedWaiting: false,
  };
  const key = (request) => new URL(request.url ?? request, location).href;
  function entries(name) {
    if (!stores.has(name)) stores.set(name, new Map());
    return stores.get(name);
  }
  const context = vm.createContext({
    URL, Request, Response, Headers, crypto: webcrypto,
    self: {
      location, crypto: webcrypto, registration: { scope: "https://game.test/nushi-tsuri/" }, addEventListener: (name, handler) => { listeners[name] = handler; },
      skipWaiting: async () => { state.skippedWaiting = true; }, clients: { claim: async () => { state.claimed = true; } },
    },
    caches: {
      has: async name => stores.has(name),
      keys: async () => [...stores.keys()], delete: async (name) => { deletions.push(name); return stores.delete(name); },
      open: async (name) => {
        if (state.failOpen) throw new Error("Cache storage unavailable");
        entries(name);
        return {
          match: async (request) => entries(name).get(key(request))?.clone(),
          keys: async () => [...entries(name).keys()].map(url => new Request(url)),
          delete: async request => entries(name).delete(key(request)),
          put: async (request, response) => {
            if (state.failWrite === true || state.failWrite === assetPath(request)) throw new Error("Cache quota exceeded");
            writes.push(key(request));
            entries(name).set(key(request), response.clone());
          },
        };
      },
    },
    fetch: async (resource, options) => {
      const request = resource.url ? resource : new Request(key(resource), options);
      requests.push({ request, options });
      return state.network(request, options);
    },
  });
  context.importScripts = (...urls) => {
    for (const url of urls) {
      assert.match(url, /^\.\/village-precache-[0-9-]+\.js$/);
      vm.runInContext(fs.readFileSync(path.join(__dirname, "..", url), "utf8"), context);
      if (context.self.SHU_VILLAGE_DIGESTS) {
        context.self.SHU_VILLAGE_DIGESTS = Object.fromEntries(
          Object.keys(context.self.SHU_VILLAGE_DIGESTS).map(file => [
            file, createHash("sha256").update(bodyFor(file)).digest("hex"),
          ]),
        );
      }
    }
  };
  vm.runInContext(workerSource, context);
  const name = vm.runInContext("CACHE_NAME", context);
  const coreAssets = Array.from(vm.runInContext("CORE_ASSETS", context));
  return {
    state, stores, requests, writes, deletions, name, coreAssets,
    seed: (cache, resource, body) => entries(cache).set(key(resource), new Response(body)),
    cached: (resource) => entries(name).get(key(resource))?.clone(),
    install: async () => {
      const pending = [];
      listeners.install({ waitUntil: (promise) => pending.push(promise) });
      await Promise.all(pending);
    },
    activate: async () => {
      const pending = [];
      listeners.activate?.({ waitUntil: (promise) => pending.push(promise) });
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

test("installation precaches all assets without taking over old tabs or deleting their CSS", async () => {
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
    if (assetPath(request) === "compact-ui.css") { startedCss(); await pendingCss; }
    return assetResponse(request);
  };
  const installing = app.install();
  await Promise.race([started, installing.then(() => { throw new Error("installer never requested its stylesheet"); })]);
  assert.equal(app.state.skippedWaiting, false, "cannot activate an incomplete precache");
  assert.equal(app.stores.has(previous), true, "previous release survives while installing");
  releaseCss();
  await installing;
  const fetchedFiles = app.requests.map(({request}) => assetPath(request));
  assert.deepEqual(new Set(fetchedFiles), new Set(app.coreAssets.map(assetPath)));
  assert.equal(fetchedFiles.length, new Set(fetchedFiles).size, "aliases share one network download");
  assert.equal(app.state.skippedWaiting, false);
  assert.equal(app.state.claimed, false);
  assert.equal(app.cached("./compact-ui.css?v=251-5"), undefined);
  await app.activate();
  assert.equal(app.stores.has(previous), true);
  assert.equal(app.stores.has("another-game-v1"), true);
  assert.equal(app.state.claimed, false);
  assert.ok(app.deletions.every(name => name === app.name));
  app.state.network = async () => { throw new TypeError("Offline"); };
  const requests = app.requests.length;
  assert.equal(await (await app.fetch(css)).text(), bodyFor(css));
  assert.equal(app.requests.length, requests, "corrected stylesheet is available offline");
});

test("failed precache cannot skip waiting or delete the previous working release", async () => {
  for (const failure of ["network", "http", "corrupt", "partial", "failOpen", "failWrite"]) {
    const app = bootWorker(), previous = "nushi-tsuri-v252-island-fish-252-56";
    app.seed(previous, "./compact-ui.css?v=251-5", "stale but working CSS");
    app.seed("another-game-v1", "./keep", "unrelated cache");
    if (failure === "failOpen") app.state.failOpen = true;
    if (failure === "failWrite") app.state.failWrite = "compact-ui.css";
    app.state.network = async request => {
      if (assetPath(request) === "compact-ui.css") {
        if (failure === "network") throw new TypeError("Offline");
        if (failure === "http") return new Response("unavailable", { status: 503 });
        if (failure === "partial") return new Response("partial", { status: 206 });
        if (failure === "corrupt") return new Response("wrong bytes");
      }
      return assetResponse(request);
    };
    await assert.rejects(app.install(), undefined, failure);
    assert.equal(app.state.skippedWaiting, false, failure);
    assert.equal(app.state.claimed, false, failure);
    assert.equal(app.stores.has(previous), true, failure);
    assert.equal(app.stores.has("another-game-v1"), true, failure);
    assert.ok(!app.stores.get(app.name)?.size, failure + ": no partially installed release survives");
    assert.ok(app.deletions.every(name => name === app.name), failure + ": only candidate data may be discarded");
    assert.equal(await [...app.stores.get(previous).values()][0].clone().text(), "stale but working CSS");
  }
});

test("a restarted worker serves unchanged earlier bytes offline once and repairs stale files on update", async () => {
  const stores = new Map(), app = bootWorker({ stores });
  const baseline = "nushi-tsuri-v252-shiokakure-display-252-85";
  const fish = "./assets/fish-aji-v68.png", map = "./assets/marsh-bridge-north.webp";
  const css = app.coreAssets.find(url => url.startsWith("./compact-ui.css?"));
  const unrelatedOnly = "./assets/fish-buri-v248.png";
  app.seed(baseline, fish, bodyFor(fish));
  app.seed(baseline, "./compact-ui.css?v=older", bodyFor(css));
  app.seed(baseline, map, "stale map at the same URL");
  app.seed(baseline, "./index.html", "v252-85 game");
  app.seed("another-game-v1", unrelatedOnly, bodyFor(unrelatedOnly));
  app.state.network = async request => assetResponse(request);
  await app.install();
  const requested = new Set(app.requests.map(({request}) => assetPath(request)));
  assert.equal(requested.has(assetPath(fish)), false, "identical sprite needs no download");
  assert.equal(requested.has(assetPath(css)), false, "identical CSS can reuse its old query key");
  assert.ok(requested.has(assetPath(map)), "same URL with stale bytes must be replaced");
  assert.ok(requested.has(assetPath(unrelatedOnly)), "never depend on an unrelated app's cache");
  assert.equal(app.cached(fish), undefined, "unchanged art is not duplicated in the new release");
  const restarted = bootWorker({ stores });
  await restarted.install();
  assert.equal(restarted.writes.length, 0, "reinstalling a committed release does not rewrite it");
  await restarted.activate();
  for (const url of [fish, css, map, unrelatedOnly]) {
    assert.equal(await (await restarted.fetch(url)).text(), bodyFor(url));
  }
  assert.equal(await (await restarted.fetch("./?offline", { mode: "navigate" })).text(), bodyFor("./index.html"));
  assert.equal(restarted.requests.length, 0, "offline lookups use the committed cache mapping");
  const previousCache = stores.get(baseline);
  assert.equal(await previousCache.get(new URL(map, scope).href).clone().text(), "stale map at the same URL");
  assert.equal(await previousCache.get(new URL("./index.html", scope).href).clone().text(), "v252-85 game");
});

test("retry after a partial update retains the old release and commits only verified files", async () => {
  const stores = new Map(), app = bootWorker({ stores });
  const baseline = "nushi-tsuri-v252-shiokakure-display-252-85";
  const changed = "./assets/marsh-bridge-north.webp";
  app.seed(baseline, "./index.html", "playable old release");
  app.state.network = async request => assetPath(request) === assetPath(changed)
    ? new Response("wrong image", { status: 200 }) : assetResponse(request);
  await assert.rejects(app.install());
  assert.ok(!stores.get(app.name)?.size);
  const retry = bootWorker({ stores });
  retry.state.network = async request => assetResponse(request);
  await retry.install();
  retry.state.network = async () => { throw new TypeError("Offline"); };
  assert.equal(await (await retry.fetch(changed)).text(), bodyFor(changed));
  assert.equal(await stores.get(baseline).get(new URL("./index.html", scope).href).clone().text(), "playable old release");
});

test("activation preserves all old caches while resource lookup stays isolated", async () => {
  const app = bootWorker();
  app.seed("another-game-v1", "./assets/fish.png", "another game's fish");
  app.seed("nushi-tsuri-v156-old", "./index.html", "old game");
  app.seed(app.name, "./index.html", "current game");
  await app.activate();
  assert.equal(app.stores.has("another-game-v1"), true);
  assert.equal(app.stores.has("nushi-tsuri-v156-old"), true);
  assert.equal(app.stores.has(app.name), true);
  assert.equal(app.state.claimed, false);
  app.state.network = async () => new Response("correct fish");
  assert.equal(await (await app.fetch("./assets/fish.png")).text(), "correct fish");
  assert.equal(app.requests.length, 1);
});

test("a late old-worker response stays isolated while its original cache remains intact", async () => {
  const stores = new Map(), current = bootWorker({ stores });
  const oldCss = "./compact-ui.css?v=251-5";
  const newCss = current.coreAssets.find(url => url.startsWith("./compact-ui.css?"));
  const previous = bootWorker({
    stores,
    workerSource: fs.readFileSync(path.join(__dirname, "fixtures/prior-sw-252-65.js"), "utf8"),
  });
  previous.seed(previous.name, oldCss, "old CSS");
  previous.seed(previous.name, "./retirement-sentinel", "must survive");
  current.state.network = async request => assetResponse(request);
  await current.install();
  current.state.network = async () => { throw new TypeError("Offline"); };
  let started, finish;
  const networkStarted = new Promise(resolve => { started = resolve; });
  const responseReady = new Promise(resolve => { finish = resolve; });
  previous.state.network = async () => { started(); await responseReady; return new Response("late old-worker response"); };
  const inFlight = previous.fetch("./late-request.png");
  await networkStarted;
  await current.activate();
  assert.ok(current.deletions.every(name => name === current.name), "other caches survive activation");
  assert.equal(current.state.claimed, false);
  assert.equal(stores.has(previous.name), true);
  finish();
  assert.equal(await (await inFlight).text(), "late old-worker response");
  assert.equal(await previous.cached(oldCss).text(), "old CSS");
  assert.equal(await previous.cached("./retirement-sentinel").text(), "must survive");
  assert.equal(await (await current.fetch(newCss)).text(), bodyFor(newCss));
  assert.equal((await current.fetch("./late-request.png")).type, "error", "new worker never reads old-worker writes");
  assert.equal((await current.fetch(oldCss)).type, "error", "new worker never reads preserved old CSS");
});

test("navigation keeps the installed release while the server changes or goes offline", async () => {
  const app = bootWorker();
  app.state.network = async request => assetResponse(request);
  await app.install();
  const writes = app.writes.length;
  for (const status of [200, 404, 503]) {
    app.state.network = async () => new Response("different page", { status });
    assert.equal(await (await app.fetch("./", {mode: "navigate"})).text(), bodyFor("./index.html"));
  }
  app.state.network = async () => { throw new TypeError("Offline"); };
  assert.equal(await (await app.fetch("./index.html", {mode: "navigate"})).text(), bodyFor("./index.html"));
  assert.equal(app.writes.length, writes, "server or error pages never replace the installed page");
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

test("an uncached pinned asset requires the release bytes even for online recovery", async () => {
  const app = bootWorker();
  const fish = "./assets/fish-aji-v68.png";
  app.state.network = async () => new Response("incorrect online bytes");
  assert.equal((await app.fetch(fish)).type, "error");
  app.state.network = async request => assetResponse(request);
  assert.equal(await (await app.fetch(fish)).text(), bodyFor(fish));
});

test("cache failures cannot discard successful network responses or reject worker lifetime promises", async () => {
  for (const failure of ["failOpen", "failWrite"]) {
    const app = bootWorker();
    app.state[failure] = true;
    app.state.network = async request => assetResponse(request);
    for (const resource of ["./index.html", "./assets/fish.png"])
      assert.equal(await (await app.fetch(resource)).text(), bodyFor(resource), `${failure}: ${resource}`);
    assert.equal(app.writes.length, 0);
  }
});

test("POST, cross-origin and out-of-scope requests pass through without cache interception", async () => {
  const app = bootWorker();
  assert.equal(await app.fetch("./index.html", { method: "POST" }), undefined);
  assert.equal(await app.fetch("https://other.test/index.html", { mode: "navigate" }), undefined);
  assert.equal(await app.fetch("https://game.test/nushi-tsuri-other/index.html"), undefined);
  assert.equal(app.requests.length, 0);
  assert.equal(app.writes.length, 0);
});

test("noncanonical navigations never overwrite or receive the canonical offline fallback", async () => {
  const app = bootWorker();
  app.state.network = async request => assetResponse(request);
  await app.install();
  app.state.network = async () => new Response("other page");
  for (const url of ["./village-release-rehearsal.html", "./nested/index.html", "./not-found"]) {
    assert.equal(await (await app.fetch(url, { mode: "navigate" })).text(), "other page");
    assert.equal(await (await app.fetch("./", {mode: "navigate"})).text(), bodyFor("./index.html"));
  }
  app.state.network = async () => { throw new TypeError("Offline"); };
  assert.equal((await app.fetch("./uncached-page", { mode: "navigate" })).type, "error");
  assert.equal(await (await app.fetch("./?v=252-67", { mode: "navigate" })).text(), bodyFor("./index.html"));
});
