// Exercise the real worker with in-memory CacheStorage and network responses.
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
    failOpen: false, failWrite: false, claimed: false,
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
      skipWaiting: async () => {}, clients: { claim: async () => { state.claimed = true; } },
    },
    caches: {
      keys: async () => [...stores.keys()], delete: async (name) => stores.delete(name),
      open: async (name) => {
        if (state.failOpen) throw new Error("Cache storage unavailable");
        return {
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
  return {
    state, stores, requests, writes, name,
    seed: (cache, resource, body) => entries(cache).set(key(resource), new Response(body)),
    cached: (resource) => entries(name).get(key(resource))?.clone(),
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
