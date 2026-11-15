// Source contracts only: exact production install URLs and byte-pinned page assets.
// This does not claim native browser installation or upgrade evidence.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { createHash } = require('node:crypto');
const { JSDOM } = require('jsdom');
const { inspectRelease } = require('./browser-cache-upgrade-evidence.cjs');
const root = path.resolve(__dirname, '..');
function releaseAssets() {
  const read = name => fs.readFileSync(path.join(root, name), 'utf8');
  const files = Object.fromEntries(['index.html', 'sw.js', 'compact-ui.css'].map(name => [name, read(name)]));
  for (const [, name] of files['sw.js'].matchAll(/importScripts\("\.\/([^"/]+)"\)/g)) files[name] = read(name);
  const assets = new Set(inspectRelease(files).coreAssets);
  const assertCached = url => assert.ok(assets.has(url.startsWith('./') ? url : './' + url), url + ': exact URL is installed');
  const assertPageAsset = name => {
    const dom = new JSDOM(files['index.html']);
    try {
      const nodes = [...dom.window.document.querySelectorAll('script[src],link[href]')]
        .filter(node => (node.getAttribute('src') || node.getAttribute('href')).startsWith(name + '?'));
      assert.equal(nodes.length, 1, name + ': loaded once');
      const node = nodes[0], href = node.getAttribute('src') || node.getAttribute('href');
      assertCached(href);
      const digest = createHash('sha256').update(fs.readFileSync(path.join(root, name))).digest();
      assert.equal(new URL(href, 'https://game.test/').searchParams.get('sha256'), digest.toString('hex'), name + ': URL pins bytes');
      assert.equal(node.getAttribute('integrity'), 'sha256-' + digest.toString('base64'), name + ': SRI pins bytes');
      assert.equal(node.getAttribute('crossorigin'), 'anonymous');
      return href;
    } finally { dom.window.close(); }
  };
  return { assets, assertCached, assertPageAsset };
}
module.exports = { releaseAssets };
