// The HUD reports the loaded document's release, not a newer worker's release.
// Keep these literal values synchronized so numeric registration contracts and
// offline HTML remain compatible. Asset versions are intentionally independent.
const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const crypto = require("node:crypto");
const { JSDOM } = require("jsdom");
const html = fs.readFileSync(path.join(__dirname, "../index.html"), "utf8");
const worker = fs.readFileSync(path.join(__dirname, "../sw.js"), "utf8");

const precacheSource = fs.readFileSync(path.join(__dirname, "../village-precache-252-94.js"), "utf8");
function precached(source = precacheSource) {
  const context = { self: {} }; vm.runInNewContext(source, context);
  return Array.from(context.self.SHU_VILLAGE_PRECACHE);
}

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
    const bootstrap = dom.window.document.querySelector("#villageCandidateBootstrap");
    assert.ok(bootstrap, "production bootstrap exists");
    const config = JSON.parse(/const config = (.*);/.exec(bootstrap.textContent)[1]);
    const registration = /^\.\/sw\.js\?v=([0-9-]+)$/.exec(config.workerURL)?.[1];
    assert.ok(registration, "one numeric production worker URL");
    for (const script of dom.window.document.querySelectorAll("script:not([src])")) {
      if (script.type !== "text/plain") assert.doesNotMatch(script.textContent, /serviceWorker\.register\(/, "executable document cannot register before verified startup");
    }
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

function stylesheet(documentSource, manifestSource, filename, stale, message) {
  const dom = new JSDOM(documentSource);
  try {
    const links = [...dom.window.document.querySelectorAll('link[rel="stylesheet"]')]
      .filter(link => link.getAttribute('href').startsWith(filename + '?'));
    assert.equal(links.length, 1, "one versioned " + filename);
    const href = links[0].getAttribute('href'), url = new URL(href, 'https://game.test/');
    assert.notEqual(url.searchParams.get('v'), stale, "fix must invalidate the previously cached stylesheet");
    assert.match(url.searchParams.get('v'), /^[0-9-]+$/);
    assert.match(url.searchParams.get('sha256'), /^[a-f0-9]{64}$/);
    const cached = precached(manifestSource).filter(item => item.startsWith('./' + filename + '?'));
    assert.equal(cached.length, 1, "one pinned precached stylesheet");
    assert.equal(cached[0], './' + href, message);
    const digest = crypto.createHash('sha256').update(fs.readFileSync(path.join(__dirname, '..', filename))).digest();
    assert.equal(url.searchParams.get('sha256'), digest.toString('hex'), 'URL hash matches stylesheet bytes');
    assert.equal(links[0].getAttribute('integrity'), 'sha256-' + digest.toString('base64'), 'SRI matches stylesheet bytes');
    assert.equal(links[0].getAttribute('crossorigin'), 'anonymous');
    return href;
  } finally { dom.window.close(); }
}
for (const [filename, stale, message] of [
  ['compact-ui.css', '251-5', 'HTML and worker request the same corrected CSS'],
  ['cast-tackle.css', '252-3', 'HTML and worker request the same casting CSS'],
]) test(filename + ' fix invalidates stale CSS in both document and generated precache', () => {
  const href = stylesheet(html, precacheSource, filename, stale, message);
  const old = href.replace(/v=[0-9-]+/, 'v=' + stale);
  const encoded = href.replaceAll('&', '&amp;'), oldEncoded = old.replaceAll('&', '&amp;');
  assert.throws(() => stylesheet(html.replace(encoded, oldEncoded), precacheSource, filename, stale, message), /previously cached/);
  assert.throws(() => stylesheet(html, precacheSource.replace(href, old), filename, stale, message), /same .*CSS/);
  assert.throws(() => stylesheet(html.replace(encoded, oldEncoded), precacheSource.replace(href, old), filename, stale, message), /previously cached/);
});

test('worker imports the release-specific generated precache', () => {
  const release = releaseParts(html, worker);
  assert.match(worker, new RegExp('importScripts\\("\\./village-precache-' + release + '\\.js"\\)'));
  assert.match(worker, /\.\.\.self\.SHU_VILLAGE_PRECACHE/);
});
