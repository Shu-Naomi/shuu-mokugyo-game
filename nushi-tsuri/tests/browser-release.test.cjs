const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { assertRelease, expectedRelease, matchesSourceHtml } = require('./browser-release.cjs');
const html = fs.readFileSync(path.join(__dirname, '../index.html'), 'utf8');
const page = (text, count = 1) => ({ locator(selector) {
  assert.equal(selector, '#gameRelease');
  return { count: async () => count, textContent: async () => text };
} });
test('browser release assertion requires the exact checkout release', async () => {
  await assertRelease(page(expectedRelease));
  for (const wrong of ['v251', 'v252-1', expectedRelease + '-extra', '']) {
    await assert.rejects(assertRelease(page(wrong)), /browser release must match/);
  }
  await assert.rejects(assertRelease(page(expectedRelease, 0)), /exactly one/);
  await assert.rejects(assertRelease(page(expectedRelease, 2)), /exactly one/);
});
test('public source check rejects stale HTML even with the same release badge', () => {
  assert.equal(matchesSourceHtml(html), true);
  assert.equal(matchesSourceHtml(html.replace(expectedRelease, 'v251')), false);
  assert.equal(matchesSourceHtml(html + '\n<!-- changed build -->'), false);
});
test('browser evidence has no historical HUD release assertion', () => {
  for (const filename of fs.readdirSync(__dirname).filter(name => /^browser.*\.cjs$/.test(name))) {
    if (filename === path.basename(__filename)) continue;
    const source = fs.readFileSync(path.join(__dirname, filename), 'utf8');
    assert.doesNotMatch(source, /assert\.match\([^;]*locator\(['"]\.hud['"]\)[^;]*\/v\d+\//, filename);
    assert.doesNotMatch(source, /html\.includes\(['"]<span>v\d+/, filename);
  }
});
