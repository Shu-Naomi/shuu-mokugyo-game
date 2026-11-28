'use strict';

// Run against a checkout of the previous public release and the real candidate tree.
// node browser-map-update.cjs /path/to/previous/nushi-tsuri [success|corrupt|quota|fresh]
const assert = require('node:assert/strict');
const { createHash } = require('node:crypto');
const fs = require('node:fs');
const http = require('node:http');
const path = require('node:path');
const { chromium } = require('playwright');
const { legacyFixture } = require('./browser-reference-village-evidence.cjs');

const candidateRoot = path.resolve(__dirname, '..');
const baselineRoot = path.resolve(process.argv[2]);
const scenario = process.argv[3] || 'success';
assert.ok(['success', 'corrupt', 'quota', 'fresh'].includes(scenario));
const scope = '/nushi-tsuri/';
const quotaLimit = 450_000_000;
const timeout = 150_000;
function documentVersion(root) {
  const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
  const badge = /id="gameRelease"[^>]*>(v\d+-\d+)</.exec(html);
  assert.ok(badge, 'Missing release badge in ' + root);
  return badge[1];
}
const oldRelease = documentVersion(baselineRoot);
const oldReleaseEntry = 'release-' + oldRelease.slice(1) + '.html';
const hasPublishedMapRelease = fs.existsSync(path.join(baselineRoot, oldReleaseEntry));
const oldEntry = hasPublishedMapRelease ? oldReleaseEntry : 'index.html';
const newRelease = documentVersion(candidateRoot);
const candidateEntry = 'release-' + newRelease.slice(1) + '.html';
// The candidate always fetches its own entry, even when every image is reused.
const damagedFile = candidateEntry;
const media = [
  {file:'assets/player-boy.png', width:540, height:430},
  {file:'assets/player-boy-walk-v35-final.png', width:540, height:860},
  {file:'assets/pet-scenes-v19.svg', width:1200, height:160},
  {file:'assets/player-girl.png', width:500, height:430},
  {file:'assets/player-girl-walk-v35-final.png', width:500, height:860},
  {file:'assets/fish-aouo.png', width:1064, height:248},
  {file:'assets/fish-sougyo.png', width:1064, height:220},
  {file:'assets/fish-maanago.png', width:1064, height:164},
  {file:'assets/fish-gonzui.png', width:1064, height:222},
  {file:'assets/fish-itou.png', width:1064, height:214},
  {file:'assets/fish-tenagaebi.png', width:400, height:112},
  {file:'assets/fish-zarigani.png', width:400, height:112}
];
const priorMediaCount = {'v252-85':3, 'v252-92':3, 'v252-93':5, 'v252-94':10, 'v252-95':12};
assert.ok(priorMediaCount[oldRelease], 'Unrecognized baseline ' + oldRelease);
const priorMedia = media.slice(0, priorMediaCount[oldRelease]);
const sha256 = bytes => createHash('sha256').update(bytes).digest('hex');
const fileHash = (directory, file) => sha256(fs.readFileSync(path.join(directory, file)));
const mime = {html:'text/html; charset=utf-8', js:'text/javascript', css:'text/css', json:'application/json', png:'image/png', jpg:'image/jpeg', webp:'image/webp', svg:'image/svg+xml', mp3:'audio/mpeg', wav:'audio/wav'};
const report = {scenario, oldRelease, quotaLimit, storage:{}, offlineSlots:[], networkBytes:0};
const slots = [{id:1, money:4321}, {id:2, money:6789}];

function deferred() {
  let resolve;
  const promise = new Promise(done => { resolve = done; });
  return {promise, resolve};
}

function createHost() {
  const host = {phase:'old', workerRequest:deferred(), releaseWorker:deferred(), injectedCorruption:false};
  host.server = http.createServer(async (req, res) => {
    if (host.phase === 'offline') return req.socket.destroy();
    const pathname = new URL(req.url, 'http://localhost').pathname;
    if (pathname === '/observe') {
      res.writeHead(200, {'Content-Type':mime.html});
      return res.end('<!doctype html><title>Disposable save fixture</title>');
    }
    if (!pathname.startsWith(scope)) {res.writeHead(404); return res.end();}
    const relative = decodeURIComponent(pathname.slice(scope.length)) || 'index.html';
    const candidate = host.phase === 'candidate';
    const directory = candidate ? candidateRoot : baselineRoot;
    const file = path.resolve(directory, relative);
    const stat = file.startsWith(directory + path.sep) && fs.statSync(file, {throwIfNoEntry:false});
    if (!stat?.isFile()) {res.writeHead(404); return res.end();}
    if (candidate && relative === 'sw.js') {
      host.workerRequest.resolve();
      await host.releaseWorker.promise;
    }
    if (candidate && scenario === 'corrupt' && relative === damagedFile) {
      host.injectedCorruption = true;
      res.writeHead(200, {'Content-Type':mime.html, 'Cache-Control':'no-store'});
      return res.end('intentionally corrupt candidate entry');
    }
    res.writeHead(200, {'Content-Type':mime[path.extname(file).slice(1)] || 'application/octet-stream', 'Cache-Control':'no-store'});
    if (candidate) res.once('finish', () => { report.networkBytes += stat.size; });
    fs.createReadStream(file).on('error', () => res.destroy()).pipe(res);
  });
  return host;
}

function saveSnapshot() {
  return Object.fromEntries(Object.keys(localStorage).filter(key =>
    /^nushi-(production-reference|inugoya-v2)/.test(key)
  ).sort().map(key => [key, localStorage.getItem(key)]));
}

async function gameReady(page, controlled = true) {
  try {
    await page.waitForFunction(required => (!required || navigator.serviceWorker.controller) && globalThis.ShuVillageReleaseGate?.started, controlled, {timeout:45_000});
  } catch (error) {
    console.error(await page.evaluate(() => ({
      gate:document.getElementById('villageSaveGate')?.textContent,
      controller:navigator.serviceWorker.controller?.scriptURL
    })));
    throw error;
  }
}

async function cachedEntry(page, name, file) {
  const hash = await page.evaluate(async ({name, file}) => {
    const cache = await caches.open(name);
    const cached = await cache.match('/nushi-tsuri/' + file);
    if (!cached) return null;
    const digest = await crypto.subtle.digest('SHA-256', await cached.arrayBuffer());
    return Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, '0')).join('');
  }, {name, file});
  return hash;
}

async function checkMedia(page, files, root) {
  const results = [];
  for (const {file, width, height} of files) {
    const measured = await page.evaluate(async file => {
      const response = await fetch(file, {cache:'no-store'});
      if (!response.ok) throw Error('Could not read ' + file + ' (' + response.status + ')');
      const bytes = await response.arrayBuffer();
      const rawHash = await crypto.subtle.digest('SHA-256', bytes);
      const hash = Array.from(new Uint8Array(rawHash), byte => byte.toString(16).padStart(2, '0')).join('');
      const image = new Image();
      image.src = file;
      await image.decode();
      return {hash, width:image.naturalWidth, height:image.naturalHeight};
    }, file);
    assert.deepEqual(measured, {hash:fileHash(root, file), width, height}, file);
    results.push({file, ...measured});
  }
  return results;
}

async function resumeOffline(context, url, expected, before, completedUpdate) {
  for (const slot of slots) {
    const page = await context.newPage();
    // Both normal entry URLs must resolve when every network request is denied.
    const start = slot.id === 1 ? url + 'index.html' : url;
    const response = await page.goto(start);
    assert.ok(response.fromServiceWorker(), 'offline entry was served by the worker');
    const responseHash = sha256(await response.body());
    assert.ok(expected.hashes.includes(responseHash), 'Unexpected offline navigation response: ' + responseHash);
    await gameReady(page);
    assert.equal(await page.locator('#gameRelease').textContent(), expected.version);
    if (slot.id === 1) {
      assert.deepEqual(await page.evaluate(saveSnapshot), before);
      report.offlineMedia = await checkMedia(page, completedUpdate ? media : priorMedia, completedUpdate ? candidateRoot : baselineRoot);
    }
    await page.locator('#titleContinue').click();
    await page.locator('[data-save-slot="' + slot.id + '"]').click();
    await page.locator('#titleResume').click();
    // Switching slots can reload the game before its HUD has been attached.
    await page.waitForFunction(({id, money}) => {
      const active = document.getElementById('activeSaveSlot');
      const balance = document.getElementById('money');
      return active?.textContent === 'セーブ' + id && balance &&
        Number(balance.textContent.replaceAll(',', '')) === money;
    }, slot);
    report.offlineSlots.push({...slot, release:expected.version, sha256:responseHash});
    await page.close();
  }
}

async function run() {
  const baselineHash = fileHash(baselineRoot, oldEntry);
  const candidateHash = fileHash(candidateRoot, candidateEntry);
  const guardedEntryHash = fileHash(candidateRoot, 'index.html');
  assert.notEqual(fileHash(candidateRoot, 'sw.js'), fileHash(baselineRoot, 'sw.js'), 'expected a different candidate worker');
  const host = createHost();
  await new Promise(resolve => host.server.listen(0, '127.0.0.1', resolve));
  const origin = 'http://127.0.0.1:' + host.server.address().port;
  const gameURL = origin + scope;
  let browser;
  try {
    const executablePath = process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE || process.env.CHROMIUM_EXECUTABLE_PATH;
    browser = await chromium.launch({headless:true, ...(executablePath ? {executablePath} : {})});
    const context = await browser.newContext({viewport:{width:844, height:390}, isMobile:true, hasTouch:true, deviceScaleFactor:2});
    // This monitoring page is outside the game scope. It never owns a save lock
    // or keeps either worker waiting once the last gameplay tab closes.
    const probe = await context.newPage();
    await probe.goto(origin + '/observe');
    const devtools = await context.newCDPSession(probe);
    const quota = size => devtools.send('Storage.overrideQuotaForOrigin', {origin, quotaSize:size});
    const usage = async () => (await devtools.send('Storage.getUsageAndQuota', {origin})).usage;
    await quota(quotaLimit);
    await probe.evaluate(async saves => {
      localStorage.setItem('nushi-inugoya-v2', JSON.stringify(saves[0]));
      localStorage.setItem('nushi-inugoya-v2-slot2', JSON.stringify(saves[1]));
    }, slots.map(({money}) => ({...legacyFixture(), money})));
    if (scenario === 'fresh') {
      assert.deepEqual(await probe.evaluate(() => caches.keys()), []);
      assert.equal(await probe.evaluate(async () => (await navigator.serviceWorker.getRegistrations()).length), 0);
      host.phase = 'candidate';
      host.releaseWorker.resolve();
      const first = await context.newPage();
      await first.goto(gameURL);
      await gameReady(first, false);
      assert.equal(await first.locator('#gameRelease').textContent(), newRelease);
      const saved = await first.evaluate(saveSnapshot);
      await first.evaluate(() => {
        navigator.serviceWorker.ready.then(registration => { window.freshRegistration = registration; });
      });
      await first.waitForFunction(() => window.freshRegistration?.active?.state === 'activated', null, {timeout});
      report.storage.afterInstall = await usage();
      await first.close();
      host.phase = 'offline';
      await context.setOffline(true);
      await resumeOffline(context, gameURL, {hashes:[candidateHash], version:newRelease}, saved, true);
      report.storage.afterResume = await usage();
      assert.ok(report.storage.afterResume > 0 && report.storage.afterResume <= quotaLimit);
      await context.close();
      return;
    }
    await probe.evaluate(async version => {
      window.registration = await navigator.serviceWorker.register('/nushi-tsuri/sw.js?v=' + version);
    }, oldRelease.slice(1));
    await probe.waitForFunction(() => registration.active?.state === 'activated', null, {timeout});
    const old = await context.newPage();
    const oldResponse = await old.goto(gameURL + 'index.html');
    assert.equal(sha256(await oldResponse.body()), baselineHash);
    await gameReady(old);
    assert.equal(await old.locator('#gameRelease').textContent(), oldRelease);
    const before = await old.evaluate(saveSnapshot);
    for (const slot of slots) assert.ok(Object.keys(before).some(key => key.endsWith('-slot' + slot.id)));
    // The existing player visited one avatar, while the other avatar has never
    // been requested. Cover both borrowing a cached image and installing a new one.
    await checkMedia(old, priorMedia, baselineRoot);
    const cacheNames = await probe.evaluate(() => caches.keys());
    const oldCache = cacheNames.find(name => name.endsWith(oldRelease.slice(1)));
    assert.ok(oldCache);
    const cachedFile = hasPublishedMapRelease ? oldEntry : '';
    assert.equal(await cachedEntry(probe, oldCache, cachedFile), baselineHash);
    report.storage.before = await usage();
    assert.ok(report.storage.before > 0 && report.storage.before < quotaLimit);
    if (scenario === 'quota') {
      report.storage.imposed = report.storage.before + 524288;
      await quota(report.storage.imposed);
    }
    await probe.evaluate(() => {
      registration.addEventListener('updatefound', () => {
        window.installingCandidate = registration.installing;
      });
    });
    host.phase = 'candidate';
    await probe.evaluate(() => { registration.update().catch(error => { window.updateError = String(error); }); });
    let timer;
    try {
      await Promise.race([host.workerRequest.promise, new Promise((_, reject) => {
        timer = setTimeout(() => reject(Error('Old registration never requested the candidate worker')), 30_000);
      })]);
    } finally { clearTimeout(timer); }
    // Reopen under the previous worker during installation. The v252-85 worker
    // writes online navigation responses back into its old cache.
    await old.close(); // release the single-tab save lock while the old worker is still active
    const secondTab = await context.newPage();
    await secondTab.goto(gameURL);
    await gameReady(secondTab);
    assert.equal(await secondTab.locator('#gameRelease').textContent(), oldRelease);
    assert.deepEqual(await secondTab.evaluate(saveSnapshot), before);
    host.releaseWorker.resolve();
    const success = scenario === 'success';
    await probe.waitForFunction(expected =>
      window.installingCandidate?.state === expected,
      success ? 'installed' : 'redundant', {timeout});
    report.storage.afterInstall = await usage();
    assert.deepEqual(await secondTab.evaluate(saveSnapshot), before);
    assert.equal(await cachedEntry(probe, oldCache, cachedFile), baselineHash, 'the old worker must retain a usable offline entry');
    if (success) {
      assert.ok(await probe.evaluate(() => registration.waiting === window.installingCandidate));
      assert.ok(report.storage.afterInstall <= quotaLimit);
    } else if (scenario === 'corrupt') {
      assert.ok(host.injectedCorruption, 'candidate requested the deliberately damaged file');
    }
    await secondTab.close();
    if (success) {
      await probe.waitForFunction(() => window.installingCandidate.state === 'activated', null, {timeout});
    }
    host.phase = 'offline';
    await context.setOffline(true);
    await resumeOffline(context, gameURL, success
      ? {hashes:[candidateHash], version:newRelease} : {hashes:[baselineHash, guardedEntryHash], version:oldRelease}, before, success);
    if (!success) {
      // An online navigation can trigger another real install immediately after
      // the first rejection. Check cleanup after the offline restart has settled.
      await probe.waitForFunction(() => !registration.installing && !registration.waiting, null, {timeout});
      assert.deepEqual(await probe.evaluate(() => caches.keys()), cacheNames, 'failed update must remove only its partial cache');
    }
    report.storage.afterResume = await usage();
    report.storage.added = report.storage.afterInstall - report.storage.before;
    await context.close();
  } finally {
    host.releaseWorker.resolve();
    await browser?.close();
    host.server.closeAllConnections();
    await new Promise(resolve => host.server.close(resolve));
  }
}

run().catch(error => {
  report.failure = String(error);
  console.error(error);
  process.exitCode = 1;
}).finally(() => {
  console.log(JSON.stringify(report));
  if (process.env.MAP_UPDATE_REPORT) fs.writeFileSync(process.env.MAP_UPDATE_REPORT, JSON.stringify(report, null, 2) + '\n');
});
