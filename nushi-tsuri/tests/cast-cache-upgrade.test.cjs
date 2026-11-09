// Independent fixture/source checks. Native evidence is produced only in authorized CI.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const vm = require('node:vm');
const shared = require('./browser-cache-upgrade-evidence.cjs');
const cast = require('./browser-cast-cache-upgrade-evidence.cjs');
const root = path.resolve(__dirname, '..');
function fixture(release, cssVersion, cacheLabel, assetLabel) {
  return {
    'index.html': `<span id="gameRelease">v${release}</span><link href="compact-ui.css?v=252-58"><link href="cast-tackle.css?v=${cssVersion}"><script src="compact-ui.js?v=252-58"></script><script>navigator.serviceWorker.register("./sw.js?v=${release}")</script>`,
    'sw.js': `const CACHE_NAME = "nushi-tsuri-v252-${cacheLabel}-${release}";\nconst CORE_ASSETS = ["./index.html", "./compact-ui.css?v=252-58", "./compact-ui.js?v=252-58", "./cast-tackle.css?v=${cssVersion}"];`,
    'cast-tackle.css': `/* ${assetLabel} fixture */ .hint { visibility: ${assetLabel === 'old' ? 'visible' : 'hidden'}; }\n`,
  };
}
const previous = fixture('252-58', '252-3', 'asual-notices', 'old');
const current = fixture('252-59', '252-59', 'cast-hints', 'next');
const hashes = { old: shared.sha256(previous['cast-tackle.css']), next: shared.sha256(current['cast-tackle.css']) };
const upgrade = (old, next) => cast.assertReleaseContract(old, next, hashes);
test('strict cast contract invalidates only casting CSS and release metadata', () => {
  const versions = upgrade(previous, current);
  assert.equal(versions.old.cssUrl, './cast-tackle.css?v=252-3');
  assert.equal(versions.next.cssUrl, './cast-tackle.css?v=252-59');
  assert.equal(versions.next.compactCssUrl, './compact-ui.css?v=252-58');
  for (const [side, files] of [['old', previous], ['next', current]]) assert.throws(() => upgrade(side === 'old' ? { ...files, 'cast-tackle.css': files['cast-tackle.css'] + '\n' } : previous, side === 'next' ? { ...files, 'cast-tackle.css': files['cast-tackle.css'] + '\n' } : current), /exact reviewed/);
  assert.throws(() => cast.assertReleaseUpgrade(previous, current), /exact reviewed/, 'native entry point never accepts fixture hashes');
});
test('stale cast references, independent metadata and unreviewed Asual or worker changes fail closed', () => {
  for (const [file, from, to] of [
    ['index.html', 'cast-tackle.css?v=252-59', 'cast-tackle.css?v=252-3'],
    ['sw.js', 'cast-tackle.css?v=252-59', 'cast-tackle.css?v=252-3'],
    ['index.html', '>v252-59</span>', '>v252-58</span>'],
    ['index.html', './sw.js?v=252-59', './sw.js?v=252-58'],
    ['sw.js', 'cast-hints-252-59', 'cast-hints-252-58'],
    ['index.html', 'compact-ui.css?v=252-58', 'compact-ui.css?v=252-59'],
    ['index.html', 'compact-ui.js?v=252-58', 'compact-ui.js?v=252-59'],
    ['sw.js', 'compact-ui.js?v=252-58', 'compact-ui.js?v=252-59'],
    ['sw.js', 'compact-ui.css?v=252-58', 'compact-ui.css?v=252-59'],
  ]) assert.throws(() => upgrade(previous, { ...current, [file]: current[file].replace(from, to) }), `${file}: ${from}`);
  for (const file of ['index.html', 'sw.js']) assert.throws(() => upgrade(previous, { ...current, [file]: current[file] + '\n// unrelated' }), /approved release metadata/);
  assert.throws(() => upgrade(previous, fixture('252-60', '252-60', 'cast-hints', 'next')));
});
test('resource hook fails the new cast CSS only, serves exact old/new bytes and leaves compact CSS intact', () => {
  const sources = { previous, current, ...upgrade(previous, current) };
  for (const [phase, version, files] of [['baseline', sources.old, previous], ['current', sources.next, current]]) {
    const response = cast.resourceFor('/nushi-tsuri/' + version.cssUrl.slice(2), phase, sources, root);
    assert.equal(response.status, 200); assert.equal(response.body, files['cast-tackle.css']); assert.match(response.headers['Cache-Control'], /immutable/);
  }
  assert.equal(cast.resourceFor('/nushi-tsuri/cast-tackle.css?v=252-59', 'failed-upgrade', sources, root).status, 503);
  assert.equal(cast.resourceFor('/nushi-tsuri/cast-tackle.css?v=252-3', 'failed-upgrade', sources, root).status, 200);
  assert.equal(cast.resourceFor('/nushi-tsuri/compact-ui.css?v=252-58', 'failed-upgrade', sources, root).status, 200);
});
test('retirement rejects old casting CSS and original sentinel but not unrelated late keys', () => {
  const clean = { sentinel: null, oldCssPresent: false, keys: ['/nushi-tsuri/late.png'] };
  cast.assertCacheRetirement(clean);
  for (const key of ['/nushi-tsuri/cast-tackle.css?v=252-3', '/nushi-tsuri/__cache-upgrade-retirement-sentinel__']) assert.throws(() => cast.assertCacheRetirement({ ...clean, keys: [key] }));
  assert.throws(() => cast.assertCacheRetirement({ ...clean, sentinel: 'retained' }));
  assert.throws(() => cast.assertCacheRetirement({ ...clean, oldCssPresent: true }));
});
test('cast entry point refuses local execution before browser import or server creation', () => {
  const { spawnSync } = require('node:child_process');
  const result = spawnSync(process.execPath, [path.join(__dirname, 'browser-cast-cache-upgrade-evidence.cjs')], { env: { ...process.env, GITHUB_ACTIONS: 'false' }, encoding: 'utf8' });
  assert.equal(result.status, 1); assert.match(result.stderr, /No local server or browser was started/);
});
test('native cast asset hook checks exact typed served and cached worker responses', async () => {
  const release = cast.inspectRelease(current);
  const makePage = ({ cachedBad = false, servedBad = false, native = true, mimeBad = false } = {}) => ({
    locator: selector => { assert.equal(selector, 'link[href="cast-tackle.css?v=252-59"]'); return { getAttribute: async () => release.cssUrl.slice(2) }; },
    waitForResponse: async predicate => { assert.equal(predicate({ url: () => 'https://example.test/' + release.cssUrl.slice(2) }), true); return { fromServiceWorker: () => native, headers: () => ({ 'content-type': mimeBad ? 'text/html' : 'text/css' }) }; },
    evaluate: async (fn, value) => current['cast-tackle.css'] + ((typeof value === 'string' ? servedBad : cachedBad) ? 'corrupt' : ''),
  });
  assert.equal((await cast.assertAssets(makePage(), release, current))[0].cachedSha256, hashes.next);
  for (const options of [{ cachedBad: true }, { servedBad: true }, { native: false }, { mimeBad: true }]) await assert.rejects(cast.assertAssets(makePage(options), release, current));
});
test('shared CSSOM lookup selects the exact cast or compact URL and rejects matching rules in the wrong sheet', async () => {
  const cssUrl = './cast-tackle.css?v=252-59', selector = cast.SELECTOR;
  const page = sheets => ({ evaluate: async (fn, value) => JSON.parse(JSON.stringify(vm.runInNewContext(`(${fn.toString()})(value)`, { URL, value, location: { href: 'https://game.test/nushi-tsuri/' }, document: { styleSheets: sheets } }))) });
  const sheet = (name, selectors) => ({ href: 'https://game.test/nushi-tsuri/' + name, cssRules: selectors.map(selectorText => ({ selectorText })) });
  assert.deepEqual(await shared.loadedSelectors(page([sheet('cast-tackle.css?v=252-59', [selector])]), cssUrl, [selector]), [true]);
  assert.deepEqual(await shared.loadedSelectors(page([sheet('compact-ui.css?v=252-58', [selector])]), cssUrl, [selector]), [false]);
  assert.deepEqual(await shared.loadedSelectors(page([sheet('cast-tackle.css?v=252-3', [selector])]), cssUrl, [selector]), [false]);
  assert.deepEqual(await shared.loadedSelectors(page([sheet('compact-ui.css?v=252-58', ['.old-selector'])]), './compact-ui.css?v=252-58', ['.old-selector']), [true]);
});
test('shared title/save assertion follows either stylesheet without changing save expectations', async () => {
  const saved = shared.cacheUpgradeStorageFixture();
  for (const cssUrl of ['./cast-tackle.css?v=252-59', './compact-ui.css?v=252-58']) {
    const release = { release: '252-59', cssUrl }; let calls = 0;
    const page = {
      locator: selector => selector === '#gameRelease' ? { textContent: async () => 'v252-59' } : { getAttribute: async () => { assert.equal(selector, `link[href="${cssUrl.slice(2)}"]`); return cssUrl.slice(2); } },
      evaluate: async () => ++calls === 1 ? saved : ['nushi-inugoya-v2', 'nushi-inugoya-v2-slot2'].map(key => ({ ok: true, exists: true, data: JSON.parse(saved[key]) })),
    };
    await shared.assertTitleAndSaves(page, release, saved); assert.equal(calls, 2);
  }
});
