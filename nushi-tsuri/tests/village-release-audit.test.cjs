'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const {audit, manifest, htmlUrls} = require('../tools/audit-village-release.cjs');
const html = version => `<span id="gameRelease">v${version}</span><script src="village-reference.js?v=${version}"></script><link rel="stylesheet" href="map.css?v=${version}"><script>navigator.serviceWorker.register("./sw.js?v=${version}")</script>`;
const worker = version => `const CACHE_NAME = "nushi-tsuri-test-${version}"; const CORE_ASSETS = ["./index.html", "./village-reference.js?v=${version}", "./map.css?v=${version}", "./assets/map-${version}.png"];`;
function fixture(version) {
  return {'index.html':html(version), 'sw.js':worker(version), 'village-reference.js':`const ShuVillageReference = {asset:'assets/map-${version}.png'};`, 'map.css':'body{}', [`assets/map-${version}.png`]:'image'};
}
const snapshot = files => ({exists: file => Object.hasOwn(files, file), read: file => {assert.ok(Object.hasOwn(files, file), file); return files[file];}});
function run(current, baseline = fixture('1'), changedPaths = ['index.html','sw.js','village-reference.js','map.css','assets/map-2.png']) {
  return audit({baseline:snapshot(baseline), current:snapshot(current), changedPaths});
}
const codes = result => result.findings.map(finding => finding.code);
test('versioned synthetic release passes static checks but cannot certify production', () => {
  const result = run(fixture('2'));
  assert.deepEqual(result.findings, []);
  assert.equal(result.sourceCacheReady, true);
  assert.equal(result.productionReady, false);
  assert.ok(result.pendingGates.some(text => /concurrent/.test(text)));
  assert.ok(result.pendingGates.some(text => /save migration/.test(text)));
});
test('same URL changed modules and asset are blocked despite cache namespace bump', () => {
  const current = fixture('1');
  current['sw.js'] = current['sw.js'].replace('test-1','new-1');
  current['village-reference.js'] += '//changed';
  const result = run(current, fixture('1'), ['village-reference.js','assets/map-1.png']);
  assert.equal(result.findings.filter(f => f.code === 'CHANGED_SAME_URL').length, 2);
});
test('unchanged cache namespace with changed HTML is blocked', () => {
  assert.ok(codes(run(fixture('1'))).includes('UNCHANGED_CACHE_NAMESPACE'));
});
test('unprecached module and literal pilot asset are named', () => {
  const current = fixture('2');
  current['sw.js'] = current['sw.js'].replace('"./village-reference.js?v=2", ', '').replace(', "./assets/map-2.png"', '');
  assert.deepEqual(run(current).findings.filter(f => f.code === 'MISSING_PRECACHE_DEPENDENCY').map(f => f.detail), ['village-reference.js?v=2','assets/map-2.png']);
});
test('query mismatches are not mistaken for matching precache entries', () => {
  const current = fixture('2'); current['sw.js'] = current['sw.js'].replace('map.css?v=2','map.css?v=1');
  assert.ok(codes(run(current)).includes('MISSING_PRECACHE_DEPENDENCY'));
});
test('missing physical dependencies and precache files are reported', () => {
  const current = fixture('2'); delete current['assets/map-2.png'];
  assert.ok(codes(run(current)).includes('MISSING_DEPENDENCY_FILE'));
  assert.ok(codes(run(current)).includes('MISSING_PRECACHE_FILE'));
});
test('release registration, badge and cache suffix must agree', () => {
  for (const file of ['index.html','sw.js']) {
    const current = fixture('2'); current[file] = current[file].replace(file === 'index.html' ? 'sw.js?v=2' : 'test-2', file === 'index.html' ? 'sw.js?v=3' : 'test-3');
    assert.ok(codes(run(current)).includes('RELEASE_METADATA_MISMATCH'));
  }
});
test('computed manifests fail closed without evaluation', () => {
  assert.throws(() => manifest('const CORE_ASSETS = [dangerous()];'), /Unsupported/);
  const current = fixture('2'); current['sw.js'] = 'const CORE_ASSETS = makeManifest();';
  assert.ok(codes(run(current)).includes('UNREADABLE_MANIFEST'));
});
test('worker takeover and cache deletion require explicit upgrade evidence', () => {
  const current = fixture('2'); current['sw.js'] += 'self.skipWaiting(); self.clients.claim(); caches.delete(old);';
  const result = run(current);
  assert.equal(result.sourceCacheReady, true);
  assert.equal(result.productionReady, false);
  assert.ok(result.pendingGates.some(text => /forces activation/.test(text)));
  assert.ok(result.pendingGates.some(text => /deletes old caches/.test(text)));
});
test('conflicts are blockers and audit leaves source snapshots unchanged', () => {
  const current = fixture('2'); current['index.html'] += '\n<<<<<<< HEAD\n';
  const before = JSON.stringify(current);
  assert.ok(codes(run(current)).includes('MERGE_CONFLICT'));
  assert.equal(JSON.stringify(current), before);
});
test('HTML extraction ignores remote scripts, icons and unsafe paths', () => {
  assert.deepEqual(htmlUrls('<script src="https://example.com/a.js"></script><script src="../escape.js"></script><link rel="icon" href="favicon.png"><link rel="stylesheet" href="./a.css?v=2">'), ['a.css?v=2']);
});

test('dynamic asset prefixes are not reported as concrete missing files', () => {
  const current = fixture('2');
  current['village-reference.js'] += "const dynamic = 'assets/opening-storybook-' + state + '.webp';";
  assert.deepEqual(run(current).findings, []);
});

test('new precaching cannot hide changed same-URL assets loaded by the baseline pilot', () => {
  const baseline = fixture('1'), current = fixture('2');
  baseline['village-reference.js'] = "const ShuVillageReference = {asset:'assets/map.png'};";
  baseline['assets/map.png'] = 'old image bytes';
  baseline['sw.js'] = baseline['sw.js'].replace(', "./assets/map-1.png"', '');
  delete baseline['assets/map-1.png'];
  current['village-reference.js'] = baseline['village-reference.js'];
  current['assets/map.png'] = 'changed image bytes';
  current['sw.js'] = current['sw.js'].replace('assets/map-2.png', 'assets/map.png');
  delete current['assets/map-2.png'];
  const result = run(current, baseline, ['index.html', 'sw.js', 'assets/map.png']);
  assert.equal(result.sourceCacheReady, false);
  assert.deepEqual(result.findings, [{code:'CHANGED_SAME_URL', detail:'assets/map.png changed bytes but retains a previously loaded/cacheable URL'}]);
});
