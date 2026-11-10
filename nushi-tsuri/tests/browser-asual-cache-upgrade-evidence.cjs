// Native evidence is GitHub-only. Diner's independent source contract is unchanged.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const shared = require('./browser-cache-upgrade-evidence.cjs');
const BASELINE_SHA = '6f56aa6f869bdd344a038c09cf42512dda919cb5';
const FILES = ['index.html', 'sw.js', 'compact-ui.js', 'compact-ui.css'];
// Exact reviewed asset bytes, including whitespace/comments; no normalized-code escape hatch.
const HASHES = {
  old: { 'compact-ui.js': '9508b409079d864d7f3010d1a3ff4a312cb90d980da168a1f85da40295def27e', 'compact-ui.css': '8f913fa4ccb18ef24913cc9018d65af372d805ee96f787278e8b880dc1e1a672' },
  next: { 'compact-ui.js': '585b7f2183cb0fd2acb6e57d1d036f59847436ced61d2fcc93c69f8863cfec8e', 'compact-ui.css': '63d76ae3134b22b8cde1ea22b74e32fe0151e5f61825dd7f53eb87c018edb836' },
};
const selectors = ['#petLifeModal.compact-pet-shop .pet-shop-host>div>.pet-message', '#petLifeModal.compact-pet-shop .pet-shop-host>div:has(>.pet-message:not([hidden]))>b', '#petLifeModal.compact-pet-shop .pet-shop-host>div:has(>.pet-message:not([hidden]))>small'];
const git = (repo, ...args) => execFileSync('git', args, { cwd: repo, encoding: 'utf8', maxBuffer: 8 * 1024 * 1024 });
function inspectRelease(files) {
  const release = shared.inspectRelease(files);
  release.jsUrl = './' + /src="(compact-ui\.js\?v=[0-9-]+)"/.exec(files['index.html'])?.[1];
  assert.equal(release.coreAssets.filter(url => url.startsWith('./compact-ui.js?')).length, 1);
  assert.ok(release.coreAssets.includes(release.jsUrl), 'JS URL belongs to actual install list');
  return release;
}
function assertReleaseContract(previous, current, expectedHashes) {
  const old = inspectRelease(previous), next = inspectRelease(current);
  assert.equal(old.release, '252-57'); assert.equal(next.release, '252-58');
  assert.equal(old.cacheName, 'nushi-tsuri-v252-location-layers-252-57');
  assert.equal(next.cacheName, 'nushi-tsuri-v252-asual-notices-252-58');
  assert.equal(old.cssUrl, './compact-ui.css?v=252-57'); assert.equal(old.jsUrl, './compact-ui.js?v=252-53');
  assert.equal(next.cssUrl, './compact-ui.css?v=252-58'); assert.equal(next.jsUrl, './compact-ui.js?v=252-58');
  const normalize = (files, version, file) => files[file].replace(version.cacheName, 'CACHE').replace(version.workerUrl, 'WORKER').replace(`>v${version.release}</span>`, '>VERSION</span>').replace(version.cssUrl.slice(2), 'CSS').replace(version.jsUrl.slice(2), 'JS');
  for (const file of ['index.html', 'sw.js']) assert.equal(normalize(current, next, file), normalize(previous, old, file), file + ' only approved release metadata changes');
  for (const [label, files] of [['old', previous], ['next', current]]) for (const file of ['compact-ui.js', 'compact-ui.css']) assert.equal(shared.sha256(files[file]), expectedHashes[label][file], label + ' exact reviewed ' + file);
  return { old, next };
}
function assertReleaseUpgrade(previous, current) {
  return assertReleaseContract(previous, current, HASHES);
}
function sourceProvenance(root, baselineRepository, expectedHead) {
  const repo = path.resolve(root, '..');
  assert.match(expectedHead || '', /^[0-9a-f]{40}$/);
  assert.equal(git(repo, 'rev-parse', 'HEAD').trim(), expectedHead, 'exact PR head');
  assert.equal(git(repo, 'status', '--porcelain', '--untracked-files=no').trim(), '', 'clean tracked head');
  assert.equal(git(baselineRepository, 'rev-parse', 'HEAD').trim(), BASELINE_SHA, 'immutable merged diner baseline');
  assert.equal(git(baselineRepository, 'status', '--porcelain', '--untracked-files=no').trim(), '', 'clean baseline');
  const entries = repository => git(repository, 'ls-tree', '-r', 'HEAD:nushi-tsuri').trim().split('\n').filter(line => { const name = line.split('\t')[1]; return !name.startsWith('tests/') && !FILES.includes(name); });
  assert.deepEqual(entries(repo), entries(baselineRepository), 'all other production files byte-identical');
  const previous = Object.fromEntries(FILES.map(file => [file, git(baselineRepository, 'show', 'HEAD:nushi-tsuri/' + file)]));
  const current = Object.fromEntries(FILES.map(file => [file, fs.readFileSync(path.join(root, file), 'utf8')]));
  const hashes = files => Object.fromEntries(FILES.map(file => [file, shared.sha256(files[file])]));
  return { previous, current, ...assertReleaseUpgrade(previous, current), provenance: {
    head: expectedHead, tree: git(repo, 'rev-parse', 'HEAD:nushi-tsuri').trim(), baseline: BASELINE_SHA,
    previousHashes: hashes(previous), currentHashes: hashes(current),
    runId: process.env.GITHUB_RUN_ID, runAttempt: process.env.GITHUB_RUN_ATTEMPT,
    headRepository: process.env.NUSHI_HEAD_REPOSITORY, pullRequest: process.env.NUSHI_PR_NUMBER,
    runUrl: `${process.env.GITHUB_SERVER_URL}/${process.env.GITHUB_REPOSITORY}/actions/runs/${process.env.GITHUB_RUN_ID}`,
  } };
}
async function assertAssets(page, release, files) {
  const evidence = [];
  assert.equal(await page.locator('script[src^="compact-ui.js"]').getAttribute('src'), release.jsUrl.slice(2));
  for (const [file, url] of [['compact-ui.js', release.jsUrl], ['compact-ui.css', release.cssUrl]]) {
    const responsePromise = page.waitForResponse(response => response.url().endsWith(url.slice(2)));
    const bytes = await page.evaluate(async url => (await fetch(url)).text(), url);
    const response = await responsePromise;
    assert.equal(response.fromServiceWorker(), true, file + ' served by native worker');
    assert.match(response.headers()['content-type'] || '', file.endsWith('.js') ? /(?:java|ecma)script/i : /text\/css/i, file + ' correct response MIME type');
    assert.equal(bytes, files[file], file + ' exact served bytes');
    const cached = await page.evaluate(async ({ cacheName, url }) => { const response = await caches.match(url, { cacheName }); return response ? response.text() : null; }, { cacheName: release.cacheName, url });
    assert.equal(cached, files[file], file + ' exact cached bytes');
    evidence.push({ file, url, servedSha256: shared.sha256(bytes), cachedSha256: shared.sha256(cached), fromServiceWorker: true });
  }
  return evidence;
}
async function assertFailed(page, sources) {
  await assertAssets(page, sources.old, sources.previous);
  for (const url of [sources.next.jsUrl, sources.next.cssUrl]) assert.equal(await page.evaluate(async ({ cacheName, url }) => Boolean(await caches.match(url, { cacheName })), { cacheName: sources.next.cacheName, url }), false, 'failed addAll commits neither changed asset');
}
function assertCacheRetirement(evidence) {
  assert.equal(evidence.sentinel, null); assert.equal(evidence.oldCssPresent, false);
  for (const key of ['/nushi-tsuri/__cache-upgrade-retirement-sentinel__', '/nushi-tsuri/compact-ui.css?v=252-57', '/nushi-tsuri/compact-ui.js?v=252-53']) assert.ok(!evidence.keys.includes(key), 'old asset or sentinel retired: ' + key);
}
async function assertRetired(page, old) {
  for (const url of [old.jsUrl, old.cssUrl]) assert.equal(await page.evaluate(async ({ cacheName, url }) => Boolean(await caches.match(url, { cacheName })), { cacheName: old.cacheName, url }), false, 'retired old asset is absent');
}
async function main() {
  shared.requireGitHubCI(process.env);
  assert.ok(process.env.NUSHI_BASELINE_REPOSITORY, 'separate immutable baseline checkout required');
  const root = path.resolve(__dirname, '..'), output = path.join(__dirname, 'browser-evidence-asual-cache-upgrade');
  const sources = sourceProvenance(root, process.env.NUSHI_BASELINE_REPOSITORY, process.env.NUSHI_EXPECTED_HEAD_SHA);
  fs.mkdirSync(output, { recursive: true });
  fs.writeFileSync(path.join(output, 'provenance.json'), JSON.stringify(sources.provenance, null, 2) + '\n');
  await shared.run(sources, root, output, { selectors, assertAssets, assertFailed, assertCacheRetirement, assertRetired });
}
module.exports = { BASELINE_SHA, HASHES, inspectRelease, assertReleaseContract, assertReleaseUpgrade, sourceProvenance, assertCacheRetirement, assertAssets, assertFailed, assertRetired };
if (require.main === module) main().catch(error => { console.error(error); process.exitCode = 1; });
