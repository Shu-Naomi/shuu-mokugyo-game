// These are source/fixture checks, not native-browser upgrade evidence.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { requireGitHubCI, inspectRelease, assertReleaseUpgrade, resourceFor, candidateOutcome, cacheUpgradeStorageFixture, namedCacheInventory, assertCacheRetirement } = require('./browser-cache-upgrade-evidence.cjs');
const root = path.resolve(__dirname, '..');
const files = Object.fromEntries(['index.html', 'sw.js', 'compact-ui.css'].map(name => [name, fs.readFileSync(path.join(root, name), 'utf8')]));
const current = inspectRelease(files);
// Deliberately synthetic old fixture; CI uses the actual pinned prior commit.
const previous = {
  'index.html': files['index.html'].replace(`>v${current.release}</span>`, '>v252-56</span>').replace(current.workerUrl, './sw.js?v=252-56').replace(current.cssUrl.slice(2), 'compact-ui.css?v=251-5'),
  'sw.js': files['sw.js'].replace(current.cacheName, 'nushi-tsuri-v252-island-fish-252-56').replace(current.cssUrl, './compact-ui.css?v=251-5'),
  'compact-ui.css': files['compact-ui.css'].replace(',\n#locationInterior.compact-location-shop:not(.compact-service) .location-scene>.scenery-motion', '').replace(',\n#locationInterior.compact-location-shop:not(.compact-service) .location-scene>.scenery-foreground', ''),
};

test('native cache-upgrade runner refuses non-CI and unspecified heads before starting anything', () => {
  for (const env of [{}, { GITHUB_ACTIONS: 'false' }, { GITHUB_ACTIONS: 'true' }, { GITHUB_ACTIONS: 'true', NUSHI_EXPECTED_HEAD_SHA: 'main' }])
    assert.throws(() => requireGitHubCI(env));
  assert.doesNotThrow(() => requireGitHubCI({ GITHUB_ACTIONS: 'true', NUSHI_EXPECTED_HEAD_SHA: 'a'.repeat(40) }));
});

test('upgrade source guard requires new CSS, complete metadata and only the reviewed production changes', () => {
  assertReleaseUpgrade(previous, files);
  assert.throws(() => assertReleaseUpgrade(previous, previous), /new release/);
  assert.throws(() => inspectRelease({ ...files, 'sw.js': files['sw.js'].replace(current.cssUrl, './compact-ui.css?v=251-5') }), /actual install list/);
  assert.throws(() => assertReleaseUpgrade(previous, { ...files, 'index.html': files['index.html'] + '<!-- unrelated change -->' }), /HTML changes only/);
  assert.throws(() => assertReleaseUpgrade(previous, { ...files, 'sw.js': files['sw.js'] + '\n// changed behavior' }), /worker behavior/);
  assert.throws(() => assertReleaseUpgrade(previous, { ...files, 'compact-ui.css': files['compact-ui.css'] + '\nbody{display:none}' }), /two reviewed selectors/);
  const unrelatedUrl = './compact-ui.js?v=252-53';
  assert.throws(() => assertReleaseUpgrade(previous, { ...files, 'sw.js': files['sw.js'].replace(unrelatedUrl, './compact-ui.js?v=252-57') }), /unrelated precache URLs/);
});

test('native installation fixture serves old bytes, targeted failure and corrected immutable CSS at distinct URLs', () => {
  const sources = { previous, current: files, ...assertReleaseUpgrade(previous, files) };
  const old = resourceFor('/nushi-tsuri/compact-ui.css?v=251-5', 'baseline', sources, root);
  assert.equal(old.status, 200); assert.equal(old.body, previous['compact-ui.css']);
  assert.match(old.headers['Cache-Control'], /immutable/);
  const failingUrl = '/nushi-tsuri/' + current.cssUrl.slice(2);
  const failed = resourceFor(failingUrl, 'failed-upgrade', sources, root);
  assert.equal(failed.status, 503); assert.equal(failed.headers['Cache-Control'], 'no-store');
  assert.equal(resourceFor('/nushi-tsuri/compact-ui.css?v=251-5', 'failed-upgrade', sources, root).status, 200, 'only new CSS fails');
  const corrected = resourceFor(failingUrl, 'current', sources, root);
  assert.equal(corrected.status, 200); assert.equal(corrected.body, files['compact-ui.css']);
  assert.match(corrected.headers['Cache-Control'], /immutable/);
  for (const phase of ['baseline', 'current']) {
    const expected = phase === 'baseline' ? previous : files;
    assert.equal(resourceFor('/nushi-tsuri/', phase, sources, root).body, expected['index.html']);
    assert.equal(resourceFor('/nushi-tsuri/sw.js?v=anything', phase, sources, root).body, expected['sw.js']);
    assert.equal(resourceFor('/nushi-tsuri/sw.js?v=anything', phase, sources, root).headers['Cache-Control'], 'no-store');
  }
  assert.equal(resourceFor('/nushi-tsuri/../../README.md', 'current', sources, root).status, 404);
});

test('every real precache resource exists for the native install test', () => {
  for (const asset of current.coreAssets) {
    const name = asset.split('?')[0];
    assert.ok(fs.existsSync(path.join(root, name)), asset);
  }
});

test('candidate observer captures a failed install even before register resolves', async () => {
  const registration = new EventTarget(), worker = new EventTarget();
  worker.scriptURL = 'https://game.test/nushi-tsuri/sw.js?v=252-57';
  worker.state = 'installing';
  const context = vm.createContext({
    URL, setTimeout, clearTimeout, location: { href: 'https://game.test/nushi-tsuri/' },
    navigator: { serviceWorker: {
      getRegistration: async () => registration,
      register: async () => {
        registration.installing = worker;
        registration.dispatchEvent(new Event('updatefound'));
        worker.state = 'redundant';
        worker.dispatchEvent(new Event('statechange'));
        registration.installing = null;
        return registration;
      },
    } },
  });
  assert.equal(await vm.runInContext(`(${candidateOutcome.toString()})('./sw.js?v=252-57')`, context), 'redundant');
});

test('existing-user upgrade fixture includes valid identity metadata and preserves every stored byte for either title slot', () => {
  const { boot, saveKey } = require('./game-harness.cjs');
  const saved = cacheUpgradeStorageFixture(), identityKeys = [saveKey, 'nushi-inugoya-v2-slot2'].map(key => 'nushi-pet-identity-display-v1:' + key);
  const snapshot = window => Object.fromEntries(Object.keys(window.localStorage).sort().map(key => [key, window.localStorage.getItem(key)]));
  for (const key of identityKeys) assert.equal(saved[key], '{"version":1,"rows":[]}');
  for (const slot of [1, 2]) {
    // Reproduce the incomplete fixture: normal title initialization adds only
    // the selected slot's legitimate provenance registry, not a save rewrite.
    const incomplete = { ...saved };
    for (const key of identityKeys) delete incomplete[key];
    const options = { start: false, url: `http://localhost/nushi-tsuri/?saveSlot=${slot}` };
    const first = boot(JSON.parse(saved[saveKey]), undefined, { ...options, storage: incomplete });
    try {
      assert.deepEqual(snapshot(first.window), { ...incomplete, [identityKeys[slot - 1]]: saved[identityKeys[slot - 1]] });
      assert.deepEqual(first.errors, []);
    } finally { first.dispose(); }
    const existing = boot(JSON.parse(saved[saveKey]), undefined, { ...options, storage: saved });
    try {
      assert.deepEqual(snapshot(existing.window), saved, 'complete snapshot, including both identity registries, remains byte-identical for slot ' + slot);
      assert.deepEqual(existing.errors, []);
    } finally { existing.dispose(); }
  }
});

test('retired cache inventory uses only read-only protocol calls and never creates a missing cache', async () => {
  const calls = [], origin = 'https://game.test';
  const client = { send: async (method, params) => {
    calls.push({ method, params });
    if (method === 'CacheStorage.requestCacheNames') return { caches: [{ cacheName: 'recreated-old', cacheId: 'existing-id' }] };
    assert.equal(method, 'CacheStorage.requestEntries', 'only read-only cache inventory methods are allowed');
    assert.deepEqual(params, { cacheId: 'existing-id', skipCount: 0, pageSize: 1000 });
    return { cacheDataEntries: [{ requestURL: origin + '/nushi-tsuri/late-request.png' }] };
  } };
  assert.deepEqual(await namedCacheInventory(client, origin, 'absent-old'), { names: ['recreated-old'], present: false, keys: [] });
  assert.deepEqual(calls, [{ method: 'CacheStorage.requestCacheNames', params: { securityOrigin: origin } }]);
  assert.deepEqual(await namedCacheInventory(client, origin, 'recreated-old'), { names: ['recreated-old'], present: true, keys: ['/nushi-tsuri/late-request.png'] });
});

test('cleanup guard requires actual sentinel and stale-CSS deletion even when late work recreates the name', () => {
  const absent = { present: false, keys: [], sentinel: null, oldCssPresent: false };
  assertCacheRetirement(absent);
  const recreated = { ...absent, present: true, keys: ['/nushi-tsuri/late-request.png'] };
  assertCacheRetirement(recreated);
  assert.throws(() => assertCacheRetirement({ ...recreated, sentinel: 'old marker survives' }), /unique sentinel/);
  assert.throws(() => assertCacheRetirement({ ...recreated, oldCssPresent: true }), /stale CSS/);
  assert.throws(() => assertCacheRetirement({ ...recreated, keys: ['/nushi-tsuri/__cache-upgrade-retirement-sentinel__'] }), /original sentinel/);
  assert.throws(() => assertCacheRetirement({ ...recreated, keys: ['/nushi-tsuri/compact-ui.css?v=251-5'] }), /stale CSS key/);
});
