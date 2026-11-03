const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { boot, seed } = require('./game-harness.cjs');

const iconSelector = 'svg.pixel-item-icon,svg.tackle-pixel-icon';
const serializedSvg = /<\/?(?:svg|path|rect)\b/i;
function cleanLabels(el, label) {
  assert.doesNotMatch(el.textContent, serializedSvg, label + ' serialized SVG text');
  for (const node of el.querySelectorAll('[aria-label],[title],[data-compact-action-label]')) {
    for (const attr of ['aria-label', 'title', 'data-compact-action-label']) {
      assert.doesNotMatch(node.getAttribute(attr) || '', serializedSvg, label + ' ' + attr);
    }
  }
}
function art(el, label) {
  assert.ok(el, label);
  const svg = el.querySelector(iconSelector);
  assert.ok(svg, label + ' art');
  assert.equal(svg.getAttribute('aria-hidden'), 'true');
  assert.ok(svg.querySelector('path'), label + ' visible paths');
  cleanLabels(el, label);
}
function product(button, label) {
  assert.ok(button, label + ' action exists');
  // Compact catalogs move art beside the original action button. Test the
  // resulting product, not the now text-only (often hidden) original button.
  const card = button.closest('.compact-product');
  art(card, label);
  art(card.querySelector('[data-compact-select]'), label + ' thumbnail');
}

test('every literal icon reference and static UI marker resolves to artwork', () => {
  const apis = {
    ItemArt: require('../item-art.js'), ItemObjectArt: require('../item-object-art.js'),
    UiPixelArt: require('../ui-pixel-art.js'), UiExtraArt: require('../ui-extra-art.js'),
    ShuTackleArt: require('../tackle-art.js')
  };
  const aliases = { item: 'ItemArt', object: 'ItemObjectArt', ui: 'UiPixelArt', extra: 'UiExtraArt', tackle: 'ShuTackleArt' };
  const source = fs.readFileSync(path.join(__dirname, '../index.html'), 'utf8');
  for (const [, name, method, id] of source.matchAll(/\b(ItemArt|ItemObjectArt|UiPixelArt|UiExtraArt|ShuTackleArt)\.(get|icon)\(["']([^"']+)["']\)/g)) {
    assert.ok(apis[name][method](id), `${name}.${method}(${id}) must resolve`);
  }
  for (const [, kind, id] of source.matchAll(/data-ui-art="([^:"]+):([^"]+)"/g)) {
    const api = apis[aliases[kind]];
    assert.ok(api, 'known art namespace ' + kind);
    assert.ok((api.get || api.icon)(id), `static ${kind}:${id} must resolve`);
  }
});

test('all inventory, kitchen and dog product cards keep artwork separate from names', () => {
  const app = boot({ ...seed(), items: { tomato: 2, wildGreens: 2, offeringDaikon: 1 },
    dogTreats: { samBiscuit: 2 }, ownedDogToys: ['rubberBall'], fishdexCollectibles: { tideCoin: 1 } });
  const w = app.window, doc = w.document;
  try {
    w.openInventory('items');
    for (const id of ['food', 'ingredients', 'dogTreats', 'dogToys', 'parts', 'collection', 'offerings']) {
      w.eval(`setInventoryCategory('${id}')`);
      const panel = doc.querySelector('#inventoryCategory-' + id);
      assert.equal(panel.hidden, false, id + ' can be selected');
      const cards = [...panel.querySelectorAll('.compact-product')];
      assert.ok(cards.length > 0, id + ' has products');
      for (const [i, card] of cards.entries()) {
        art(card, `${id} card ${i}`);
        art(card.querySelector('[data-compact-select]'), `${id} thumbnail ${i}`);
      }
      cleanLabels(panel, id);
    }
    w.close();
    w.openLocationInterior('diner');
    const kitchen = doc.querySelector('#locationGoods');
    for (const attr of ['data-cook-recipe', 'data-eat-prepared-meal']) {
      const buttons = [...kitchen.querySelectorAll(`[${attr}]`)];
      assert.ok(buttons.length >= 7, attr + ' covers all recipes or meals');
      for (const button of buttons) product(button, attr + ' ' + button.getAttribute(attr));
    }
    cleanLabels(doc.querySelector('#locationInterior'), 'kitchen');
    w.close();
    w.renderSamShop();
    for (const button of doc.querySelectorAll('#samDogGoods [data-buy-dog-good]')) product(button, 'dog shop ' + button.dataset.buyDogGood);
    w.openDogCare('shuu');
    for (const button of doc.querySelectorAll('#dogCareTreats .dog-care-card,#dogCareToys .dog-care-card')) art(button, 'dog care ' + button.textContent);
    w.close();
    // Repeated open/close exercises restoring moved art, not just first render.
    w.openInventory('items');
    art(doc.querySelector('#inventoryCategory-food .compact-product'), 'reopened inventory');
    assert.deepEqual(app.errors, []);
  } finally { app.dispose(); }
});

test('weather, sound, field menu, quests and toasts use decorative art with safe readable labels', () => {
  const app = boot(), w = app.window, doc = w.document;
  try {
    for (const [day, weatherId] of ['sunny', 'cloudy', 'rain'].entries()) {
      w.eval(`s.gameMinutes=${day * 1440 + 600};renderWeather()`);
      art(doc.querySelector('#weather'), weatherId);
      assert.equal(doc.querySelector('#weather').dataset.weather, weatherId);
      assert.match(doc.querySelector('#weather').getAttribute('aria-label'), /今日の天気/);
      art(doc.querySelector('#samWeatherHint'), 'weather hint');
    }
    for (const enabled of [true, false, true]) {
      w.eval(`s.soundEnabled=${enabled};renderSoundToggle()`);
      art(doc.querySelector('#soundToggle'), 'sound');
      assert.equal(doc.querySelector('#soundToggle').getAttribute('aria-pressed'), String(enabled));
      assert.equal(doc.querySelector('#soundToggle').getAttribute('aria-label'), enabled ? '音を切る' : '音を入れる');
    }
    for (const id of ['record', 'story', 'petNotebook', 'items', 'quests', 'dog', 'options', 'saveSlots']) {
      art(doc.querySelector(`[data-field-menu-target="${id}"]`), 'menu ' + id);
    }
    w.renderQuestBoard();
    const quests = [...doc.querySelectorAll('#questBoardList .quest-card')];
    assert.ok(quests.length > 0);
    for (const [i, quest] of quests.entries()) art(quest, 'quest ' + i);
    w.showRescueToast('<img src=x> 山菜を拾った', 10000, w.ItemArt.get('wildGreens'));
    const toast = doc.querySelector('#rescueToast');
    art(toast, 'toast');
    assert.equal(toast.querySelector('img'), null);
    assert.equal(toast.textContent, '<img src=x> 山菜を拾った');
    w.showRescueToast('釣り場へ戻ろう', 10000);
    assert.equal(toast.querySelector('svg'), null, 'plain toast clears the preceding icon');
    assert.equal(toast.textContent, '釣り場へ戻ろう');
    assert.deepEqual(app.errors, []);
  } finally { app.dispose(); }
});
