// GitHub-only native service-worker evidence. The earlier layout runner blocks
// workers and cannot prove cache migration. This runner uses the real prior
// release's HTML/CSS/worker, an unchanged asset tree and native CacheStorage.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { createHash } = require('node:crypto');
const { execFileSync } = require('node:child_process');
const BASELINE_SHA = 'b0f8e02a6004d773d3fb0dfb9ed179592d1ab054';
const BASELINE_RELEASE = '252-56';
const BASELINE_CACHE = 'nushi-tsuri-v252-island-fish-252-56';
const BASELINE_CSS = './compact-ui.css?v=251-5';
const RETIREMENT_MARKER = '/nushi-tsuri/__cache-upgrade-retirement-sentinel__';
const RETIREMENT_VALUE = 'old cache retirement: ' + BASELINE_SHA;
const CHANGED_FILES = ['index.html', 'sw.js', 'compact-ui.css'];
const alignmentSelectors = [
  '#locationInterior.compact-location-shop:not(.compact-service) .location-scene>.scenery-motion',
  '#locationInterior.compact-location-shop:not(.compact-service) .location-scene>.scenery-foreground',
];
const sha256 = text => createHash('sha256').update(text).digest('hex');
const git = (cwd, ...args) => execFileSync('git', args, { cwd, encoding: 'utf8', maxBuffer: 8 * 1024 * 1024 }).trim();

function cacheUpgradeStorageFixture() {
  const { seed, saveKey } = require('./game-harness.cjs');
  // Both adventures have no aquarium fish. An existing user's unchanged pet
  // UI has already initialized each slot's display-provenance registry.
  const identity = JSON.stringify({ version: 1, rows: [] });
  return Object.fromEntries(Object.entries({
    [saveKey]: JSON.stringify({ ...seed(), avatar: 'girl', soundEnabled: false }),
    'nushi-inugoya-v2-slot2': JSON.stringify({ ...seed(), money: 9876, dog: 'grey', avatar: 'boy', soundEnabled: false }),
    [`nushi-pet-identity-display-v1:${saveKey}`]: identity,
    'nushi-pet-identity-display-v1:nushi-inugoya-v2-slot2': identity,
    'nushi-inugoya-last-slot': '2', 'nushi-inugoya-options-v1': JSON.stringify({ textSpeed: 'instant' }),
    'unrelated-game-save': '{"level":7}',
  }).sort(([a], [b]) => a.localeCompare(b)));
}

function requireGitHubCI(env) {
  assert.equal(env.GITHUB_ACTIONS, 'true', 'Native cache-upgrade verification is reserved for the authorized GitHub Actions job. No local server or browser was started.');
  assert.match(env.NUSHI_EXPECTED_HEAD_SHA || '', /^[0-9a-f]{40}$/, 'exact pull request head is required');
}
function inspectRelease(files) {
  const html = files['index.html'], worker = files['sw.js'];
  const release = /id="gameRelease"[^>]*>v([0-9-]+)<\/span>/.exec(html)?.[1];
  const registration = /serviceWorker\.register\("(\.\/sw\.js\?v=([0-9-]+))"\)/.exec(html);
  const cacheName = /const CACHE_NAME = "([^"]+)"/.exec(worker)?.[1];
  const cssUrl = /href="(compact-ui\.css\?v=[0-9-]+)"/.exec(html)?.[1];
  const core = /const CORE_ASSETS = \[([\s\S]*?)\];/.exec(worker)?.[1];
  assert.ok(release && registration && cacheName && cssUrl && core, 'complete release metadata');
  assert.equal(registration[2], release, 'matching registration and badge');
  assert.ok(cacheName.endsWith('-' + release), 'matching cache release');
  const coreAssets = [...core.matchAll(/"([^"]+)"/g)].map(match => match[1]);
  assert.equal(coreAssets.filter(url => url.startsWith('./compact-ui.css?')).length, 1);
  assert.ok(coreAssets.includes('./' + cssUrl), 'CSS URL belongs to the actual install list');
  assert.equal(new Set(coreAssets).size, coreAssets.length, 'no duplicate precache entries');
  return { release, workerUrl: registration[1], cacheName, cssUrl: './' + cssUrl, coreAssets };
}
function assertReleaseUpgrade(previous, current) {
  const old = inspectRelease(previous), next = inspectRelease(current);
  assert.equal(old.release, BASELINE_RELEASE);
  assert.equal(old.cacheName, BASELINE_CACHE);
  assert.equal(old.cssUrl, BASELINE_CSS);
  assert.notEqual(next.release, old.release, 'new release identifier');
  assert.notEqual(next.cacheName, old.cacheName, 'new worker cache');
  assert.notEqual(next.cssUrl, old.cssUrl, 'new CSS cache key');
  assert.deepEqual(next.coreAssets.filter(url => url !== next.cssUrl), old.coreAssets.filter(url => url !== old.cssUrl), 'all unrelated precache URLs remain unchanged');
  const normalizeWorker = (files, release) => files['sw.js'].replace(release.cacheName, 'CACHE_ID').replace(release.cssUrl, 'CSS_URL');
  assert.equal(normalizeWorker(current, next), normalizeWorker(previous, old), 'worker behavior is unchanged');
  const normalizeHtml = (files, release) => files['index.html'].replace(`>v${release.release}</span>`, '>RELEASE</span>').replace(release.workerUrl, 'WORKER_URL').replace(release.cssUrl.slice(2), 'CSS_URL');
  assert.equal(normalizeHtml(current, next), normalizeHtml(previous, old), 'HTML changes only release and CSS URLs');
  const normalizeCss = css => css.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\s/g, '');
  let revertedCss = normalizeCss(current['compact-ui.css']);
  for (const selector of alignmentSelectors) {
    const compact = selector.replace(/\s/g, '');
    assert.ok(revertedCss.includes(',' + compact), 'new overlay selector');
    assert.ok(!normalizeCss(previous['compact-ui.css']).includes(compact), 'old CSS lacks the fix');
    revertedCss = revertedCss.replace(',' + compact, '');
  }
  assert.equal(revertedCss, normalizeCss(previous['compact-ui.css']), 'only the two reviewed selectors change');
  return { old, next };
}
function productionEntries(repository, ref) {
  return git(repository, 'ls-tree', '-r', ref + ':nushi-tsuri').split('\n')
    .filter(line => !line.split('\t')[1].startsWith('tests/'))
    .filter(line => !CHANGED_FILES.includes(line.split('\t')[1]));
}
function sourceProvenance(root, baselineRepository, expectedHead) {
  const repository = path.resolve(root, '..');
  assert.equal(git(repository, 'rev-parse', 'HEAD'), expectedHead, 'run exact PR head, never a merge ref');
  assert.equal(git(repository, 'status', '--porcelain', '--untracked-files=no'), '', 'tracked head source is clean');
  assert.equal(git(baselineRepository, 'rev-parse', 'HEAD'), BASELINE_SHA, 'immutable prior release checkout');
  assert.deepEqual(productionEntries(repository, 'HEAD'), productionEntries(baselineRepository, 'HEAD'), 'every other production asset/module is byte-identical to the baseline');
  const previous = Object.fromEntries(CHANGED_FILES.map(file => [file, execFileSync('git', ['show', `HEAD:nushi-tsuri/${file}`], { cwd: baselineRepository, encoding: 'utf8', maxBuffer: 8 * 1024 * 1024 })]));
  const current = Object.fromEntries(CHANGED_FILES.map(file => [file, fs.readFileSync(path.join(root, file), 'utf8')]));
  const versions = assertReleaseUpgrade(previous, current);
  const hashes = files => Object.fromEntries(CHANGED_FILES.map(file => [file, sha256(files[file])]));
  return {
    previous, current, ...versions,
    provenance: { head: expectedHead, tree: git(repository, 'rev-parse', 'HEAD:nushi-tsuri'), baseline: BASELINE_SHA,
      previousHashes: hashes(previous), currentHashes: hashes(current),
      runId: process.env.GITHUB_RUN_ID, runAttempt: process.env.GITHUB_RUN_ATTEMPT,
      headRepository: process.env.NUSHI_HEAD_REPOSITORY, pullRequest: process.env.NUSHI_PR_NUMBER,
      runUrl: `${process.env.GITHUB_SERVER_URL}/${process.env.GITHUB_REPOSITORY}/actions/runs/${process.env.GITHUB_RUN_ID}` },
  };
}
function resourceFor(url, phase, sources, root) {
  const parsed = new URL(url, 'http://localhost');
  if (parsed.pathname === '/favicon.ico') return { status: 204, headers: {} };
  if (parsed.pathname === '/cache-upgrade-probe.html') return { status: 200, headers: { 'Content-Type': 'text/html', 'Cache-Control': 'no-store' }, body: '<!doctype html><title>Cache upgrade storage setup</title>' };
  if (!parsed.pathname.startsWith('/nushi-tsuri/')) return { status: 404, headers: {} };
  const name = decodeURIComponent(parsed.pathname.slice('/nushi-tsuri/'.length)) || 'index.html';
  const file = path.resolve(root, name);
  if (!file.startsWith(root + path.sep) || !fs.existsSync(file) || !fs.statSync(file).isFile()) return { status: 404, headers: {} };
  const types = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.png': 'image/png', '.webp': 'image/webp', '.svg': 'image/svg+xml', '.mp3': 'audio/mpeg', '.wav': 'audio/wav', '.json': 'application/json' };
  const headers = { 'Content-Type': types[path.extname(file)] || 'application/octet-stream', 'Cache-Control': name === 'index.html' || name === 'sw.js' ? 'no-store' : 'public, max-age=31536000, immutable' };
  if (phase === 'failed-upgrade' && name === 'compact-ui.css' && './' + name + parsed.search === sources.next.cssUrl)
    return { status: 503, headers: { ...headers, 'Cache-Control': 'no-store' }, body: 'Intentional install failure' };
  const release = phase === 'baseline' ? sources.previous : sources.current;
  return { status: 200, headers, ...(Object.hasOwn(release, name) ? { body: release[name] } : { file }) };
}
async function storageSnapshot(page) {
  return page.evaluate(() => Object.fromEntries(Object.keys(localStorage).sort().map(key => [key, localStorage.getItem(key)])));
}
async function cacheSnapshot(page, release) {
  return page.evaluate(async ({ cacheName, cssUrl }) => {
    const names = await caches.keys();
    const cache = await caches.open(cacheName), response = await cache.match(cssUrl);
    const unrelated = await (await caches.open('another-game-v1')).match('/unrelated-game-sentinel');
    const registration = await navigator.serviceWorker.getRegistration();
    const worker = value => value ? { url: value.scriptURL, state: value.state } : null;
    return { names: names.sort(), keys: (await cache.keys()).map(request => new URL(request.url).pathname + new URL(request.url).search).sort(),
      css: response ? await response.text() : null, unrelated: unrelated ? await unrelated.text() : null,
      controller: navigator.serviceWorker.controller?.scriptURL,
      registration: registration ? { scope: registration.scope, active: worker(registration.active), waiting: worker(registration.waiting), installing: worker(registration.installing) } : null };
  }, release);
}
async function namedCacheInventory(client, origin, name) {
  // CDP reads the actual key inventory without caches.open(), which would
  // itself recreate a missing retired cache and invalidate the evidence.
  const { caches } = await client.send('CacheStorage.requestCacheNames', { securityOrigin: origin });
  const cache = caches.find(cache => cache.cacheName === name);
  if (!cache) return { names: caches.map(cache => cache.cacheName).sort(), present: false, keys: [] };
  const { cacheDataEntries } = await client.send('CacheStorage.requestEntries', { cacheId: cache.cacheId, skipCount: 0, pageSize: 1000 });
  assert.ok(cacheDataEntries.length < 1000, 'retired cache inventory must not be truncated');
  return { names: caches.map(cache => cache.cacheName).sort(), present: true,
    keys: cacheDataEntries.map(entry => new URL(entry.requestURL).pathname + new URL(entry.requestURL).search).sort() };
}
async function retirementEvidence(page, client, origin, release) {
  const inventory = await namedCacheInventory(client, origin, release.cacheName);
  const stored = await page.evaluate(async ({ cacheName, cssUrl, marker }) => {
    // CacheStorage.match does not create a cache. Do not use caches.open here.
    const probe = await caches.match(marker, { cacheName });
    const css = await caches.match(cssUrl, { cacheName });
    const html = await caches.match('./index.html', { cacheName });
    return { sentinel: probe ? await probe.text() : null, css: css ? await css.text() : null, html: html ? await html.text() : null };
  }, { ...release, marker: RETIREMENT_MARKER });
  return { ...inventory, sentinel: stored.sentinel, oldCssPresent: stored.css !== null,
    oldCssSha256: stored.css === null ? null : sha256(stored.css), htmlSha256: stored.html === null ? null : sha256(stored.html) };
}
function assertCacheRetirement(evidence) {
  // A late response from the already-deployed old worker can reopen its old
  // cache name after activation deleted it. Require the original contents to
  // be gone, not a permanent-name-absence guarantee that worker cannot give.
  assert.equal(evidence.sentinel, null, 'activation deleted the prior cache and its unique sentinel');
  assert.equal(evidence.oldCssPresent, false, 'activation removed the stale CSS from the prior cache');
  assert.ok(!evidence.keys.includes(RETIREMENT_MARKER), 'retired inventory has no original sentinel');
  assert.ok(!evidence.keys.includes('/nushi-tsuri/' + BASELINE_CSS.slice(2)), 'retired inventory has no stale CSS key');
}
async function releaseReady({ workerUrl, cacheName, coreAssets }) {
  const expectedUrl = new URL(workerUrl, location.href).href;
  const registration = await navigator.serviceWorker.getRegistration();
  const activated = () => {
    const controller = navigator.serviceWorker.controller, active = registration?.active;
    return controller?.scriptURL === expectedUrl && controller.state === 'activated'
      && active?.scriptURL === expectedUrl && active.state === 'activated';
  };
  // A new controller URL can appear while activation is still running, and a
  // failed installation can leave the new cache name behind. Neither is ready.
  if (!activated()) return false;
  const complete = (await Promise.all(coreAssets.map(async url => Boolean(await caches.match(url, { cacheName }))))).every(Boolean);
  // Re-read both live worker states after the asynchronous cache checks so
  // observations from separate lifecycle moments cannot satisfy the wait.
  return complete && activated();
}
async function controlledBy(page, release, { timeout = 180000, interval = 100 } = {}) {
  // Poll the resolved boolean explicitly. The pinned Playwright implementation
  // treats an async waitForFunction predicate's Promise as truthy before it
  // resolves, so a false result can end that wait prematurely.
  const deadline = Date.now() + timeout;
  for (;;) {
    if (await page.evaluate(releaseReady, release)) return;
    if (Date.now() >= deadline) throw Error('Timed out waiting for fully activated release ' + release.workerUrl + ' and its complete precache');
    await page.waitForTimeout(interval);
  }
}
async function workerCss(page, release) {
  const responsePromise = page.waitForResponse(response => response.url().endsWith(release.cssUrl.slice(2)));
  const text = await page.evaluate(async url => (await fetch(url)).text(), release.cssUrl);
  const response = await responsePromise;
  assert.equal(response.fromServiceWorker(), true, 'CSS response came from the native service worker');
  return text;
}
async function candidateOutcome(url) {
  // Attach before register(): a rejected install can disappear from
  // registration.installing before the register promise is observed.
  const registration = await navigator.serviceWorker.getRegistration();
  if (!registration) throw Error('The prior active registration is missing');
  const target = new URL(url, location.href).href;
  return new Promise((resolve, reject) => {
    const watched = new Map();
    const finish = (error, state) => {
      clearTimeout(timer);
      registration.removeEventListener('updatefound', onUpdate);
      for (const [worker, listener] of watched) worker.removeEventListener('statechange', listener);
      if (error) reject(error); else resolve(state);
    };
    const observe = worker => {
      if (!worker || worker.scriptURL !== target || watched.has(worker)) return;
      const check = () => { if (worker.state === 'redundant' || worker.state === 'activated') finish(null, worker.state); };
      watched.set(worker, check); worker.addEventListener('statechange', check); check();
    };
    const onUpdate = () => observe(registration.installing);
    const timer = setTimeout(() => finish(Error('Candidate worker did not settle within 180 seconds')), 180000);
    registration.addEventListener('updatefound', onUpdate);
    navigator.serviceWorker.register(url).then(candidate => observe(candidate.installing || candidate.waiting), error => finish(error));
  });
}
async function assertTitleAndSaves(page, release, saved) {
  assert.equal((await page.locator('#gameRelease').textContent()).trim(), 'v' + release.release);
  assert.equal(await page.locator(`link[href="${release.cssUrl.slice(2)}"]`).getAttribute('href'), release.cssUrl.slice(2));
  assert.deepEqual(await storageSnapshot(page), saved, 'all save slots, options, metadata and unrelated localStorage retain their exact bytes');
  const slots = await page.evaluate(() => [1, 2].map(slot => ShuSaveSlots.create(() => localStorage).read(slot)));
  for (const [index, slot] of slots.entries()) {
    assert.equal(slot.ok, true); assert.equal(slot.exists, true);
    assert.deepEqual(slot.data, JSON.parse(saved[index === 0 ? 'nushi-inugoya-v2' : 'nushi-inugoya-v2-slot2']), 'real save reader still opens slot ' + (index + 1));
  }
}
async function loadedSelectors(page, cssUrl, selectors) {
  return page.evaluate(({ cssUrl, selectors }) => {
    const expected = new URL(cssUrl, location.href).href;
    const sheet = [...document.styleSheets].find(sheet => sheet.href === expected);
    if (!sheet) return selectors.map(() => false);
    return selectors.map(selector => [...sheet.cssRules].some(rule => rule.selectorText?.split(',').some(part => part.replace(/\s/g, '') === selector.replace(/\s/g, ''))));
  }, { cssUrl, selectors });
}
async function run(sources, root, output, hooks = {}) {
  // This check precedes loading Playwright, creating a server or launching a browser.
  requireGitHubCI(process.env);
  const cssFile = hooks.cssFile || 'compact-ui.css';
  const { chromium } = require('playwright'), http = require('node:http');
  const report = { provenance: sources.provenance, old: sources.old, next: sources.next,
    scope: 'Native Chromium CacheStorage, production previous/current release files/workers and unchanged real assets. Save values are explicit test fixtures; no production user data. No gameplay input or layout claim.',
    checks: [], requests: [], transitions: [], cacheSnapshots: [], pageErrors: [], passed: false };
  let phase = 'baseline', browser, context, page;
  const server = http.createServer((request, response) => {
    try {
      const resource = (hooks.resourceFor || resourceFor)(request.url, phase, sources, root);
      report.requests.push({ phase, url: request.url, status: resource.status });
      response.writeHead(resource.status, resource.headers);
      if (resource.file) fs.createReadStream(resource.file).pipe(response);
      else response.end(resource.body);
    } catch (error) { response.writeHead(500); response.end(); report.requests.push({ phase, url: request.url, status: 500, error: error.message }); }
  });
  try {
    await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
    const origin = 'http://127.0.0.1:' + server.address().port, url = origin + '/nushi-tsuri/';
    browser = await chromium.launch({ headless: true });
    context = await browser.newContext({ viewport: { width: 844, height: 390 }, locale: 'ja-JP', serviceWorkers: 'allow' });
    page = await context.newPage(); page.setDefaultTimeout(30000);
    const cacheClient = await context.newCDPSession(page);
    context.on('serviceworker', worker => report.transitions.push({ phase, event: 'worker-created', url: worker.url() }));
    await page.exposeFunction('__recordCacheUpgradeController', event => report.transitions.push({ phase, ...event }));
    await page.addInitScript(() => {
      if (!('serviceWorker' in navigator)) return;
      const record = event => window.__recordCacheUpgradeController({ event, document: location.href,
        controller: navigator.serviceWorker.controller?.scriptURL || null, state: navigator.serviceWorker.controller?.state || null }).catch(() => {});
      navigator.serviceWorker.addEventListener('controllerchange', () => record('controllerchange'));
      record('document-start');
    });
    page.on('pageerror', error => report.pageErrors.push(error.message));
    const saved = cacheUpgradeStorageFixture();
    await page.goto(origin + '/cache-upgrade-probe.html');
    await page.evaluate(async saved => {
      for (const [key, value] of Object.entries(saved)) localStorage.setItem(key, value);
      await (await caches.open('another-game-v1')).put('/unrelated-game-sentinel', new Response('keep unrelated cache'));
    }, saved);
    const first = await page.goto(url, { waitUntil: 'load', timeout: 180000 });
    assert.equal(sha256(await first.text()), sources.provenance.previousHashes['index.html']);
    await controlledBy(page, sources.old);
    await assertTitleAndSaves(page, sources.old, saved);
    if (hooks.assertAssets) report.checks.push({ name: 'exact native release assets', release: sources.old.release, assets: await hooks.assertAssets(page, sources.old, sources.previous) });
    assert.equal(await workerCss(page, sources.old), sources.previous[cssFile]);
    await page.evaluate(async ({ name, marker, value }) => {
      await (await caches.open(name)).put(marker, new Response(value));
    }, { name: sources.old.cacheName, marker: RETIREMENT_MARKER, value: RETIREMENT_VALUE });
    const old = await cacheSnapshot(page, sources.old);
    const originalCache = await retirementEvidence(page, cacheClient, origin, sources.old);
    report.cacheSnapshots.push({ stage: 'baseline', retired: originalCache, registration: old.registration });
    assert.equal(originalCache.sentinel, RETIREMENT_VALUE, 'unique cleanup sentinel starts in the old cache');
    assert.equal(old.css, sources.previous[cssFile]);
    assert.equal(old.unrelated, 'keep unrelated cache');
    for (const asset of sources.old.coreAssets) assert.ok(old.keys.includes(new URL(asset, url).pathname + new URL(asset, url).search), 'baseline installed core resource: ' + asset);
    report.checks.push({ name: 'prior release installed with stale CSS', cacheKeys: old.keys.length, controller: old.controller, cssSha256: sha256(old.css) });
    await page.screenshot({ path: path.join(output, 'baseline-title.png') });

    // An unavailable changed asset must reject native addAll without replacing
    // the existing worker or deleting its usable offline cache.
    phase = 'failed-upgrade';
    const failedState = await page.evaluate(candidateOutcome, sources.next.workerUrl);
    assert.equal(failedState, 'redundant', 'a failed precache does not activate');
    const failed = await cacheSnapshot(page, sources.old);
    const failedCache = await retirementEvidence(page, cacheClient, origin, sources.old);
    report.cacheSnapshots.push({ stage: 'failed-install', retired: failedCache, registration: failed.registration });
    assert.equal(failedCache.sentinel, RETIREMENT_VALUE, 'failed installation preserves the old cleanup sentinel');
    assert.equal(failed.controller, old.controller);
    assert.equal(failed.css, old.css);
    if (hooks.assertFailed) await hooks.assertFailed(page, sources);
    assert.equal(failed.unrelated, old.unrelated);
    assert.deepEqual(await storageSnapshot(page), saved);
    assert.ok(report.requests.some(request => request.phase === phase && request.status === 503 && request.url.endsWith(sources.next.cssUrl.slice(2))), 'failure was observed by the real install fetch');
    assert.equal((await cacheSnapshot(page, sources.next)).css, null, 'failed native addAll never commits the new CSS');
    report.checks.push({ name: 'failed candidate preserves old active worker, old CSS, saves and unrelated cache', state: failedState });

    await page.waitForLoadState('networkidle');
    await context.setOffline(true);
    const beforeOldOffline = report.requests.length;
    const oldOffline = await page.reload({ waitUntil: 'load', timeout: 180000 });
    assert.equal(oldOffline.fromServiceWorker(), true);
    assert.equal(sha256(await oldOffline.text()), sources.provenance.previousHashes['index.html'], 'failed update leaves the previous offline document usable');
    await assertTitleAndSaves(page, sources.old, saved);
    if (hooks.assertAssets) report.checks.push({ name: 'exact native release assets', release: sources.old.release, assets: await hooks.assertAssets(page, sources.old, sources.previous) });
    assert.equal(await workerCss(page, sources.old), sources.previous[cssFile]);
    assert.equal((await cacheSnapshot(page, sources.old)).unrelated, old.unrelated);
    const oldOfflineCache = await retirementEvidence(page, cacheClient, origin, sources.old);
    report.cacheSnapshots.push({ stage: 'old-offline', retired: oldOfflineCache });
    assert.equal(oldOfflineCache.sentinel, RETIREMENT_VALUE, 'old offline reload preserves the cleanup sentinel');
    assert.equal(report.requests.length, beforeOldOffline, 'old offline reload made zero requests to the server');
    report.checks.push({ name: 'failed upgrade retains a working old offline reload', serverRequests: 0 });
    await page.screenshot({ path: path.join(output, 'failed-upgrade-old-offline-title.png') });
    await context.setOffline(false);

    phase = 'current';
    const upgraded = await page.reload({ waitUntil: 'load', timeout: 180000 });
    assert.equal(sha256(await upgraded.text()), sources.provenance.currentHashes['index.html'], 'old worker obtains the new network-first document');
    await controlledBy(page, sources.next);
    await assertTitleAndSaves(page, sources.next, saved);
    if (hooks.assertAssets) report.checks.push({ name: 'exact native release assets', release: sources.next.release, assets: await hooks.assertAssets(page, sources.next, sources.current) });
    assert.equal(await workerCss(page, sources.next), sources.current[cssFile]);
    const current = await cacheSnapshot(page, sources.next);
    const retired = await retirementEvidence(page, cacheClient, origin, sources.old);
    report.cacheSnapshots.push({ stage: 'activated-before-assertions', current: { ...current, css: undefined, cssSha256: current.css === null ? null : sha256(current.css) }, retired });
    (hooks.assertCacheRetirement || assertCacheRetirement)(retired);
    if (hooks.assertRetired) await hooks.assertRetired(page, sources.old);
    assert.ok(current.names.includes(sources.next.cacheName));
    assert.equal(current.unrelated, old.unrelated);
    assert.equal(current.css, sources.current[cssFile]);
    assert.ok(!current.keys.includes('/nushi-tsuri/' + sources.old.cssUrl.slice(2)), 'new cache has no old CSS URL');
    for (const asset of sources.next.coreAssets) assert.ok(current.keys.includes(new URL(asset, url).pathname + new URL(asset, url).search), 'installed core resource: ' + asset);
    const matchedSelectors = await loadedSelectors(page, sources.next.cssUrl, hooks.selectors || alignmentSelectors);
    assert.deepEqual(matchedSelectors, (hooks.selectors || alignmentSelectors).map(() => true), 'the loaded CSSOM includes all reviewed selectors');
    report.checks.push({ name: 'successful retry installs and activates new release', cacheKeys: current.keys.length, controller: current.controller, cssSha256: sha256(current.css), cacheNames: current.names, selectors: matchedSelectors });
    await page.screenshot({ path: path.join(output, 'upgraded-title.png') });

    await context.setOffline(true);
    const beforeNewOffline = report.requests.length;
    const offline = await page.reload({ waitUntil: 'load', timeout: 180000 });
    assert.equal(offline.fromServiceWorker(), true, 'offline HTML comes from the native worker');
    assert.equal(sha256(await offline.text()), sources.provenance.currentHashes['index.html']);
    await assertTitleAndSaves(page, sources.next, saved);
    if (hooks.assertAssets) report.checks.push({ name: 'exact native release assets', release: sources.next.release, assets: await hooks.assertAssets(page, sources.next, sources.current) });
    assert.equal(await workerCss(page, sources.next), sources.current[cssFile]);
    assert.equal((await cacheSnapshot(page, sources.next)).unrelated, old.unrelated);
    const finalRetired = await retirementEvidence(page, cacheClient, origin, sources.old);
    report.cacheSnapshots.push({ stage: 'new-offline', retired: finalRetired });
    (hooks.assertCacheRetirement || assertCacheRetirement)(finalRetired);
    if (hooks.assertRetired) await hooks.assertRetired(page, sources.old);
    assert.equal(report.requests.length, beforeNewOffline, 'new offline reload made zero requests to the server');
    await page.screenshot({ path: path.join(output, 'offline-title.png') });
    report.checks.push({ name: 'offline reload keeps the new release, corrected CSS, both readable saves and unrelated data', serverRequests: 0 });
    assert.deepEqual(report.pageErrors, []);
    assert.deepEqual(report.requests.filter(request => request.status >= 400 && !(request.phase === 'failed-upgrade' && request.status === 503 && request.url.endsWith(sources.next.cssUrl.slice(2)))), [], 'no unintended server errors');
    report.passed = true;
  } catch (error) {
    report.failure = error.stack;
    if (page) await page.screenshot({ path: path.join(output, 'failure.png') }).catch(() => {});
    throw error;
  } finally {
    fs.writeFileSync(path.join(output, 'report.json'), JSON.stringify(report, null, 2) + '\n');
    if (context) await context.close();
    if (browser) await browser.close();
    if (server.listening) await new Promise(resolve => server.close(resolve));
  }
  return report;
}
async function main() {
  requireGitHubCI(process.env);
  const root = path.resolve(__dirname, '..'), output = path.join(__dirname, 'browser-evidence-cache-upgrade');
  assert.ok(process.env.NUSHI_BASELINE_REPOSITORY, 'separate pinned baseline checkout is required');
  const sources = sourceProvenance(root, process.env.NUSHI_BASELINE_REPOSITORY, process.env.NUSHI_EXPECTED_HEAD_SHA);
  fs.mkdirSync(output, { recursive: true });
  fs.writeFileSync(path.join(output, 'provenance.json'), JSON.stringify(sources.provenance, null, 2) + '\n');
  await run(sources, root, output);
}
module.exports = { run, loadedSelectors, assertTitleAndSaves, sha256, BASELINE_SHA, requireGitHubCI, inspectRelease, assertReleaseUpgrade, sourceProvenance, resourceFor, candidateOutcome, cacheUpgradeStorageFixture, namedCacheInventory, assertCacheRetirement, releaseReady, controlledBy };
if (require.main === module) main().catch(error => { console.error(error); process.exitCode = 1; });
