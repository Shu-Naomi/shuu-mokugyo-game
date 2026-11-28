// Measure the pixels of the selected guide portrait after opening a saved adventure on mobile.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require('playwright');
const { server } = require('./browser-reference-village-evidence.cjs');
const enter = require('./browser-start-adventure.cjs');
const { matchesSourceHtml } = require('./browser-release.cjs');
const { seed, saveKey } = require('./game-harness.cjs');
const { layout } = require('../village-save-migration.js');

const species = ['zarigani', 'tenagaebi', 'funa', 'maanago'];
const viewport = { width: 844, height: 390 };

function measurePortrait(canvas) {
  const card = canvas.closest('.fishdex-art-card').getBoundingClientRect();
  const display = canvas.getBoundingClientRect();
  const { width, height } = canvas;
  const data = canvas.getContext('2d').getImageData(0, 0, width, height).data;
  let x0 = width, y0 = height, x1 = 0, y1 = 0;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (data[(y * width + x) * 4 + 3] === 0) continue;
      x0 = Math.min(x0, x);
      y0 = Math.min(y0, y);
      x1 = Math.max(x1, x + 1);
      y1 = Math.max(y1, y + 1);
    }
  }
  const left = display.left + x0 * display.width / width - card.left;
  const right = card.right - display.left - x1 * display.width / width;
  const top = display.top + y0 * display.height / height - card.top;
  const bottom = card.bottom - display.top - y1 * display.height / height;
  return {
    card: [card.width, card.height], canvas: [display.width, display.height],
    ink: [card.width - left - right, card.height - top - bottom],
    offset: [(left - right) / 2, (top - bottom) / 2], margins: [left, top, right, bottom]
  };
}

async function capture({ host, url, verifyHtml = matchesSourceHtml, evidenceDir }) {
  if (evidenceDir) fs.mkdirSync(evidenceDir, { recursive: true });
  if (host) {
    await new Promise((resolve, reject) => host.once('error', reject).listen(0, '127.0.0.1', resolve));
    url = 'http://127.0.0.1:' + host.address().port + '/nushi-tsuri/';
  }
  let browser;
  try {
    browser = await chromium.launch({ executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE });
    const context = await browser.newContext({
      viewport, isMobile: true, hasTouch: true, deviceScaleFactor: 1.875, locale: 'ja-JP', serviceWorkers: 'block'
    });
    const state = { ...seed(), villageLayoutVersion: layout, caught: Object.fromEntries(species.map(id => [id, 1])) };
    await context.addInitScript(({ key, state }) => {
      if (!localStorage.getItem(key)) localStorage.setItem(key, JSON.stringify(state));
      localStorage.setItem('nushi-inugoya-options-v1', JSON.stringify({ textSpeed: 'instant' }));
    }, { key: saveKey, state });
    const page = await context.newPage();
    const response = await page.goto(url);
    assert.ok(verifyHtml(await response.text()), 'guide must be opened from the expected release');
    await enter(page, true, { slot: 1, isNew: false });
    if (await page.locator('#lakeIntroSkip').isVisible()) await page.locator('#lakeIntroSkip').tap();
    await page.locator('#menu').tap();
    await page.locator('[data-field-menu-target="record"]').tap();
    const results = {};
    for (const id of species) {
      await page.locator('[data-fishdex-id="' + id + '"]').tap();
      const card = page.locator('.fishdex-art-card');
      const canvas = card.locator('canvas[data-art-species="' + id + '"]');
      await canvas.waitFor({ state: 'visible' });
      await page.waitForFunction(id => {
        const canvas = document.querySelector('#fishdexArt canvas');
        return canvas?.dataset.artSpecies === id && canvas.dataset.artPaintKey;
      }, id);
      await card.scrollIntoViewIfNeeded();
      results[id] = await canvas.evaluate(measurePortrait);
      if (evidenceDir) {
        await page.screenshot({ path: path.join(evidenceDir, id + '-screen.png'), scale: 'css' });
        await card.screenshot({ path: path.join(evidenceDir, id + '-card.png'), scale: 'device' });
      }
    }
    return results;
  } finally {
    if (browser) await browser.close();
    if (host) await new Promise(resolve => host.close(resolve));
  }
}

function check(results) {
  for (const [id, { ink, canvas, offset, margins }] of Object.entries(results)) {
    assert.ok(margins.every(v => v > 1), id + ' must fit inside the guide frame');
    assert.ok(offset.every(v => Math.abs(v) <= 2), id + ' must be centered in both axes');
    assert.ok(Math.max(ink[0] / canvas[0], ink[1] / canvas[1]) >= 0.8, id + ' must use the available canvas');
  }
}

if (require.main === module) {
  const url = process.env.FISH_BASE_URL;
  capture({ host: url ? null : server(), url, evidenceDir: process.env.FISH_EVIDENCE_DIR })
    .then(results => { console.log(JSON.stringify(results)); check(results); })
    .catch(error => { console.error(error); process.exitCode = 1; });
}

module.exports = { capture };
