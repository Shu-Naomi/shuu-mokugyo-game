// The HUD reports the loaded document's release, not a newer worker's release.
// Keep these literal values synchronized so numeric registration contracts and
// offline HTML remain compatible. Asset versions are intentionally independent.
const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { JSDOM } = require("jsdom");
const html = fs.readFileSync(path.join(__dirname, "../index.html"), "utf8");
const worker = fs.readFileSync(path.join(__dirname, "../sw.js"), "utf8");

function releaseParts(documentSource, workerSource) {
  const dom = new JSDOM(documentSource);
  try {
    const badges = dom.window.document.querySelectorAll("#gameRelease");
    assert.equal(badges.length, 1, "one visible loaded-release badge");
    const badge = badges[0];
    assert.equal(badge.hidden, false);
    assert.ok(badge.closest("#game"), "release is part of the game HUD");
    const display = /^v(\d+-\d+)$/.exec(badge.textContent.trim())?.[1];
    assert.ok(display, "badge includes the full numeric release, not just its major version");
    const registrations = [...documentSource.matchAll(/serviceWorker\.register\("\.\/sw\.js\?v=([0-9-]+)"\)/g)];
    assert.equal(registrations.length, 1, "one numeric service worker registration");
    const registration = registrations[0][1];
    const cache = /const CACHE_NAME = "([^"]+)";/.exec(workerSource)?.[1];
    assert.ok(cache?.startsWith("nushi-tsuri-"), "cache belongs to this game");
    assert.equal(display, registration, "HUD and registration releases match");
    assert.ok(cache.endsWith("-" + registration), "worker cache and registration releases match");
    return display;
  } finally {
    dom.window.close();
  }
}

test("visible release matches the worker registration and cache", () => {
  releaseParts(html, worker);
});

test("release guard detects stale HUD, registration, and worker independently", () => {
  const release = releaseParts(html, worker);
  const stale = "1-0";
  assert.throws(() => releaseParts(html.replace(`>v${release}</span>`, ">v251</span>"), worker));
  assert.throws(() => releaseParts(html.replace(`sw.js?v=${release}`, `sw.js?v=${stale}`), worker));
  assert.throws(() => releaseParts(html, worker.replace(`-${release}";`, `-${stale}";`)));
});
