// Browser checks must expect the checked-out release, never a historic HUD label.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { createHash } = require('node:crypto');
const { JSDOM } = require('jsdom');
const source = fs.readFileSync(path.join(__dirname, '../index.html'), 'utf8');
const dom = new JSDOM(source);
const badges = dom.window.document.querySelectorAll('#gameRelease');
assert.equal(badges.length, 1, 'checkout must have exactly one release badge');
const expectedRelease = badges[0].textContent.trim();
assert.match(expectedRelease, /^v\d+-\d+$/, 'checkout must declare its full release');
dom.window.close();
const digest = (html) => createHash('sha256').update(html).digest('hex');
const expectedSourceDigest = digest(source);
async function assertRelease(page) {
  const badge = page.locator('#gameRelease');
  assert.equal(await badge.count(), 1, 'browser must have exactly one release badge');
  assert.equal((await badge.textContent()).trim(), expectedRelease,
    'browser release must match the checked-out index.html');
}
// Public evidence must be of this exact checkout, not merely a matching badge.
function matchesSourceHtml(html) {
  return digest(html) === expectedSourceDigest;
}
module.exports = { assertRelease, expectedRelease, matchesSourceHtml };
