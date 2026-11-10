// GitHub-only native v252-58 -> v252-59 evidence. Historical source guards stay pinned.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const shared = require('./browser-cache-upgrade-evidence.cjs');
const BASELINE_SHA = '71b8139ffc3f30ebb28c35bec9a20814ea3ea722';
const FILES = ['index.html', 'sw.js', 'cast-tackle.css'];
const HASHES = { old: '96b661ade35d680ffb97bee945e00ac1145d9426db41b943b141a5ab9027dc16', next: 'ada4cb9c77c38c7a6bc26ac3b35b41e0225416a6d1e2094cd434e11fcf0708e7' };
const SELECTOR = '.world:has(#fishScene.active) .field-notices>.hint';
const git = (repo, ...args) => execFileSync('git', args, { cwd: repo, encoding: 'utf8', maxBuffer: 8 * 1024 * 1024 });
function inspectRelease(files) {
  const release = shared.inspectRelease(files);
  const css = [...files['index.html'].matchAll(/href="(cast-tackle\.css\?v=[0-9-]+)"/g)];
  assert.equal(css.length, 1, 'one versioned cast stylesheet');
  release.compactCssUrl = release.cssUrl;
  release.cssUrl = './' + css[0][1];
  assert.equal(release.coreAssets.filter(url => url.startsWith('./cast-tackle.css?')).length, 1);
  assert.ok(release.coreAssets.includes(release.cssUrl), 'cast CSS belongs to the actual install list');
  return release;
}
function assertReleaseContract(previous, current, expectedHashes) {
  const old = inspectRelease(previous), next = inspectRelease(current);
  assert.equal(old.release, '252-58'); assert.equal(next.release, '252-59');
  assert.equal(old.cacheName, 'nushi-tsuri-v252-asual-notices-252-58');
  assert.equal(next.cacheName, 'nushi-tsuri-v252-cast-hints-252-59');
  assert.equal(old.cssUrl, './cast-tackle.css?v=252-3'); assert.equal(next.cssUrl, './cast-tackle.css?v=252-59');
  assert.equal(old.compactCssUrl, './compact-ui.css?v=252-58'); assert.equal(next.compactCssUrl, old.compactCssUrl);
  const normalize = (files, version, file) => files[file].replace(version.cacheName, 'CACHE').replace(version.workerUrl, 'WORKER').replace(`>v${version.release}</span>`, '>VERSION</span>').replace(version.cssUrl.slice(2), 'CAST_CSS');
  for (const file of ['index.html', 'sw.js']) assert.equal(normalize(current, next, file), normalize(previous, old, file), file + ' only approved release metadata changes');
  for (const [label, files] of [['old', previous], ['next', current]]) assert.equal(shared.sha256(files['cast-tackle.css']), expectedHashes[label], label + ' exact reviewed cast CSS');
  return { old, next };
}
const assertReleaseUpgrade = (previous, current) => assertReleaseContract(previous, current, HASHES);
function sourceProvenance(root, baselineRepository, expectedHead) {
  const repo = path.resolve(root, '..');
  assert.match(expectedHead || '', /^[0-9a-f]{40}$/);
  assert.equal(git(repo, 'rev-parse', 'HEAD').trim(), expectedHead, 'exact PR head');
  assert.equal(git(repo, 'status', '--porcelain', '--untracked-files=no').trim(), '', 'clean tracked head');
  assert.equal(git(baselineRepository, 'rev-parse', 'HEAD').trim(), BASELINE_SHA, 'immutable merged Asual baseline');
  assert.equal(git(baselineRepository, 'status', '--porcelain', '--untracked-files=no').trim(), '', 'clean baseline');
  const entries = repository => git(repository, 'ls-tree', '-r', 'HEAD:nushi-tsuri').trim().split('\n').filter(line => { const name = line.split('\t')[1]; return !name.startsWith('tests/') && !FILES.includes(name); });
  assert.deepEqual(entries(repo), entries(baselineRepository), 'all other production files byte-identical, including Asual JS/CSS');
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
function resourceFor(url, phase, sources, root) {
  const parsed = new URL(url, 'http://localhost');
  if (phase === 'failed-upgrade' && parsed.pathname + parsed.search === '/nushi-tsuri/' + sources.next.cssUrl.slice(2))
    return { status: 503, headers: { 'Content-Type': 'text/css; charset=utf-8', 'Cache-Control': 'no-store' }, body: 'Intentional cast stylesheet install failure' };
  return shared.resourceFor(url, phase, sources, root);
}
async function assertAssets(page, release, files) {
  assert.equal(await page.locator(`link[href="${release.cssUrl.slice(2)}"]`).getAttribute('href'), release.cssUrl.slice(2));
  const responsePromise = page.waitForResponse(response => response.url().endsWith(release.cssUrl.slice(2)));
  const bytes = await page.evaluate(async url => (await fetch(url)).text(), release.cssUrl);
  const response = await responsePromise;
  assert.equal(response.fromServiceWorker(), true, 'cast CSS served by native worker');
  assert.match(response.headers()['content-type'] || '', /text\/css/i, 'correct CSS MIME type');
  assert.equal(bytes, files['cast-tackle.css'], 'exact served cast CSS');
  const cached = await page.evaluate(async ({ cacheName, url }) => { const response = await caches.match(url, { cacheName }); return response ? response.text() : null; }, { cacheName: release.cacheName, url: release.cssUrl });
  assert.equal(cached, files['cast-tackle.css'], 'exact cached cast CSS');
  return [{ file: 'cast-tackle.css', url: release.cssUrl, servedSha256: shared.sha256(bytes), cachedSha256: shared.sha256(cached), fromServiceWorker: true }];
}
async function assertFailed(page, sources) {
  await assertAssets(page, sources.old, sources.previous);
  assert.equal(await page.evaluate(async ({ cacheName, url }) => Boolean(await caches.match(url, { cacheName })), { cacheName: sources.next.cacheName, url: sources.next.cssUrl }), false, 'failed addAll commits no cast CSS');
}
function assertCacheRetirement(evidence) {
  assert.equal(evidence.sentinel, null); assert.equal(evidence.oldCssPresent, false);
  for (const key of ['/nushi-tsuri/__cache-upgrade-retirement-sentinel__', '/nushi-tsuri/cast-tackle.css?v=252-3']) assert.ok(!evidence.keys.includes(key), 'old cast asset or sentinel retired: ' + key);
}
async function main() {
  shared.requireGitHubCI(process.env);
  assert.ok(process.env.NUSHI_BASELINE_REPOSITORY, 'separate immutable baseline checkout required');
  const root = path.resolve(__dirname, '..'), output = path.join(__dirname, 'browser-evidence-cast-cache-upgrade');
  const sources = sourceProvenance(root, process.env.NUSHI_BASELINE_REPOSITORY, process.env.NUSHI_EXPECTED_HEAD_SHA);
  fs.mkdirSync(output, { recursive: true });
  fs.writeFileSync(path.join(output, 'provenance.json'), JSON.stringify(sources.provenance, null, 2) + '\n');
  await shared.run(sources, root, output, { cssFile: 'cast-tackle.css', selectors: [SELECTOR], resourceFor, assertAssets, assertFailed, assertCacheRetirement });
}
module.exports = { BASELINE_SHA, HASHES, SELECTOR, inspectRelease, assertReleaseContract, assertReleaseUpgrade, sourceProvenance, resourceFor, assertCacheRetirement, assertAssets, assertFailed };
if (require.main === module) main().catch(error => { console.error(error); process.exitCode = 1; });
