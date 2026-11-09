// Source/fixture unit regressions, not native-browser evidence.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const shared = require('./browser-cache-upgrade-evidence.cjs');
const asual = require('./browser-asual-cache-upgrade-evidence.cjs');
const root = path.resolve(__dirname, '..');
// Independent miniature releases, deliberately not loaded from production.
// The native entry point still uses the pinned reviewed hashes, never these fixtures.
function fixture(release, cssVersion, jsVersion, cacheLabel, assetLabel) {
  return {
    'index.html': `<span id="gameRelease">v${release}</span><link href="compact-ui.css?v=${cssVersion}"><script src="compact-ui.js?v=${jsVersion}"></script><script>navigator.serviceWorker.register("./sw.js?v=${release}")</script>`,
    'sw.js': `const CACHE_NAME = "nushi-tsuri-v252-${cacheLabel}-${release}";\nconst CORE_ASSETS = ["./index.html", "./compact-ui.css?v=${cssVersion}", "./compact-ui.js?v=${jsVersion}", "./rural-canals.js?v=252-55"];`,
    'compact-ui.js': `// ${assetLabel} JS fixture\nwindow.notice = '${assetLabel}';\n`,
    'compact-ui.css': `/* ${assetLabel} CSS fixture */\n.notice { color: ${assetLabel === 'old' ? 'red' : 'blue'}; }\n`,
  };
}
const previous = fixture('252-57', '252-57', '252-53', 'location-layers', 'old');
const current = fixture('252-58', '252-58', '252-58', 'asual-notices', 'next');
const fixtureHashes = Object.fromEntries([['old', previous], ['next', current]].map(([label, files]) => [label,
  Object.fromEntries(['compact-ui.js', 'compact-ui.css'].map(file => [file, shared.sha256(files[file])]))]));
const assertFixtureUpgrade = (old, next) => asual.assertReleaseContract(old, next, fixtureHashes);
test('Asual contract checks exact expected old/new fixture assets and metadata', () => {
  const versions = assertFixtureUpgrade(previous, current);
  assert.equal(versions.old.release, '252-57'); assert.equal(versions.next.release, '252-58');
  for (const file of ['compact-ui.js', 'compact-ui.css']) for (const side of ['old', 'next']) {
    const changed = { ...(side === 'old' ? previous : current), [file]: (side === 'old' ? previous : current)[file] + '\n' };
    assert.throws(() => assertFixtureUpgrade(side === 'old' ? changed : previous, side === 'next' ? changed : current), /exact reviewed/);
  }
});
test('independent stale JS/CSS/HUD/worker and unrelated behaviors are rejected', () => {
  for (const [file, from, to] of [
    ['index.html', 'compact-ui.js?v=252-58', 'compact-ui.js?v=252-53'],
    ['sw.js', 'compact-ui.js?v=252-58', 'compact-ui.js?v=252-53'],
    ['index.html', 'compact-ui.css?v=252-58', 'compact-ui.css?v=252-57'],
    ['sw.js', 'compact-ui.css?v=252-58', 'compact-ui.css?v=252-57'],
    ['index.html', '>v252-58</span>', '>v252-57</span>'],
    ['index.html', './sw.js?v=252-58', './sw.js?v=252-57'],
    ['sw.js', 'asual-notices-252-58', 'asual-notices-252-57'],
  ]) assert.throws(() => assertFixtureUpgrade(previous, { ...current, [file]: current[file].replace(from, to) }), `${file}: ${from}`);
  for (const file of ['index.html', 'sw.js']) assert.throws(() => assertFixtureUpgrade(previous, { ...current, [file]: current[file] + '\n// unreviewed behavior' }), /approved release metadata/);
  const unrelated = asual.inspectRelease(current).coreAssets.find(url => url.includes('rural-canals.js'));
  assert.throws(() => assertFixtureUpgrade(previous, { ...current, 'sw.js': current['sw.js'].replace(unrelated, unrelated + '-different') }), /approved release metadata/);
});
test('native fixture serves exact old and new JS/CSS with isolated failed CSS install', () => {
  const sources = { previous, current, ...assertFixtureUpgrade(previous, current) };
  for (const [phase, version, files] of [['baseline', sources.old, previous], ['current', sources.next, current]]) {
    for (const [file, url] of [['compact-ui.js', version.jsUrl], ['compact-ui.css', version.cssUrl]]) {
      const response = shared.resourceFor('/nushi-tsuri/' + url.slice(2), phase, sources, root);
      assert.equal(response.status, 200); assert.equal(response.body, files[file]); assert.match(response.headers['Cache-Control'], /immutable/);
    }
  }
  assert.equal(shared.resourceFor('/nushi-tsuri/' + sources.next.cssUrl.slice(2), 'failed-upgrade', sources, root).status, 503);
  assert.equal(shared.resourceFor('/nushi-tsuri/' + sources.next.jsUrl.slice(2), 'failed-upgrade', sources, root).body, current['compact-ui.js']);
});
test('retirement rejects either old asset, original marker or original bytes', () => {
  const clean = { sentinel: null, oldCssPresent: false, keys: [] };
  asual.assertCacheRetirement(clean);
  for (const key of ['/nushi-tsuri/compact-ui.js?v=252-53', '/nushi-tsuri/compact-ui.css?v=252-57', '/nushi-tsuri/__cache-upgrade-retirement-sentinel__']) assert.throws(() => asual.assertCacheRetirement({ ...clean, keys: [key] }));
  assert.throws(() => asual.assertCacheRetirement({ ...clean, sentinel: 'retained' }));
  assert.throws(() => asual.assertCacheRetirement({ ...clean, oldCssPresent: true }));
});
test('entry point refuses local execution before importing a browser or starting a server', () => {
  const { spawnSync } = require('node:child_process');
  const result = spawnSync(process.execPath, [path.join(__dirname, 'browser-asual-cache-upgrade-evidence.cjs')], { env: { ...process.env, GITHUB_ACTIONS: 'false' }, encoding: 'utf8' });
  assert.equal(result.status, 1); assert.match(result.stderr, /No local server or browser was started/);
});
test('native asset hook checks typed worker responses and exact cached and served JS/CSS', async () => {
  const release = asual.inspectRelease(current);
  const makePage = ({ cachedBad = false, servedBad = false, native = true, mimeBad = false } = {}) => ({
    locator: () => ({ getAttribute: async () => release.jsUrl.slice(2) }),
    waitForResponse: async predicate => {
      const url = release.jsUrl;
      // The hook invokes this once per asset. Return the matching typed response.
      const file = predicate({ url: () => 'https://example.test/' + url.slice(2) }) ? 'compact-ui.js' : 'compact-ui.css';
      return { fromServiceWorker: () => native, headers: () => ({ 'content-type': mimeBad ? 'text/html' : file.endsWith('.js') ? 'text/javascript' : 'text/css' }) };
    },
    evaluate: async (fn, value) => {
      const url = typeof value === 'string' ? value : value.url;
      const file = url.includes('.js?') ? 'compact-ui.js' : 'compact-ui.css';
      return current[file] + ((typeof value === 'string' ? servedBad : cachedBad) ? 'corrupt' : '');
    },
  });
  const evidence = await asual.assertAssets(makePage(), release, current);
  assert.equal(evidence.length, 2);
  assert.equal(evidence[0].cachedSha256, fixtureHashes.next['compact-ui.js']);
  for (const options of [{ cachedBad: true }, { servedBad: true }, { native: false }, { mimeBad: true }]) await assert.rejects(asual.assertAssets(makePage(options), release, current));
});

test('synthetic contract stays independent of future production releases; native default remains pinned', () => {
  // A later release is not an input to the historical 57→58 fixture test.
  const unrelatedProduction = fixture('252-59', '252-59', '252-59', 'future', 'future');
  assert.equal(asual.inspectRelease(unrelatedProduction).release, '252-59');
  assertFixtureUpgrade(previous, current);
  assert.throws(() => asual.assertReleaseUpgrade(previous, current), /exact reviewed/, 'native default cannot accept synthetic asset hashes');
  assert.throws(() => assertFixtureUpgrade(previous, unrelatedProduction));
  assert.match(current['compact-ui.js'], /next JS fixture/);
});
