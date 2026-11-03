const { test } = require('node:test');
const assert = require('node:assert/strict');
const { boot, seed, read } = require('./game-harness.cjs');

function clickArt(window, selector) {
  const path = window.document.querySelector(selector + ' svg path');
  assert.ok(path, selector + ' has a painted click target');
  path.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
}

function phaseArt(window, id, label) {
  const node = window.document.querySelector('#phaseLabel');
  assert.match(node.textContent, label);
  assert.doesNotMatch(node.textContent, /[◎↔↖↗↘↙⚠]/u);
  assert.equal(node.querySelector('svg')?.dataset.pixelIcon, id);
  assert.equal(node.querySelector('svg')?.getAttribute('aria-hidden'), 'true');
}

test('clicking a painted child still activates sound, inventory categories and dog selection', () => {
  const app = boot({ ...seed(), dogTreats: { samBiscuit: 2 } }), w = app.window;
  try {
    w.eval('s.soundEnabled=false;renderSoundToggle()');
    clickArt(w, '#soundToggle');
    assert.equal(read(w, 's.soundEnabled'), true);
    assert.equal(w.document.querySelector('#soundToggle').getAttribute('aria-label'), '音を切る');
    clickArt(w, '#soundToggle');
    assert.equal(read(w, 's.soundEnabled'), false);
    w.openInventory('items');
    clickArt(w, '[data-inventory-category="dogTreats"]');
    assert.equal(w.document.querySelector('#inventoryCategory-dogTreats').hidden, false);
    assert.equal(w.document.querySelector('[data-inventory-category="dogTreats"]').getAttribute('aria-pressed'), 'true');
    w.close();
    w.openDogCare('shuu');
    clickArt(w, '[data-dog-care-id="riku"]');
    assert.equal(w.document.querySelector('[data-dog-care-id="riku"]').getAttribute('aria-pressed'), 'true');
    assert.equal(w.document.querySelector('#dogCareName').textContent, read(w, 'dogName("riku")'));
    assert.deepEqual(app.errors, []);
  } finally { app.dispose(); }
});

test('frequent HUD refreshes keep existing art and restore it after a text-only transition', () => {
  const app = boot(), w = app.window, doc = w.document;
  try {
    w.eval('s.gameMinutes=600;renderWeather();renderSoundToggle()');
    const weather = doc.querySelector('#weather svg'), sound = doc.querySelector('#soundToggle svg');
    w.eval('renderWeather();renderSoundToggle()');
    assert.equal(doc.querySelector('#weather svg'), weather, 'unchanged weather does not rebuild the SVG every frame');
    assert.equal(doc.querySelector('#soundToggle svg'), sound, 'unchanged sound state does not rebuild the SVG');
    w.eval('s.gameMinutes=2040;renderWeather()');
    assert.notEqual(doc.querySelector('#weather svg'), weather);
    assert.equal(doc.querySelector('#weather svg').dataset.pixelIcon, 'cloudy');
    w.eval('setIconText(document.querySelector("#boatHud"),ItemObjectArt.get("canoe")," 37/100")');
    doc.querySelector('#boatHud').textContent = ' 37/100';
    w.eval('setIconText(document.querySelector("#boatHud"),ItemObjectArt.get("canoe")," 37/100")');
    assert.ok(doc.querySelector('#boatHud svg'), 'a stale memoized key cannot suppress restored art');
    assert.equal(doc.querySelector('#boatHud').textContent, ' 37/100');
    assert.deepEqual(app.errors, []);
  } finally { app.dispose(); }
});

test('gill-wash recovery and sand breakout keep the same pixel phase presentation', () => {
  const app = boot(), w = app.window;
  try {
    w.eval('s.soundEnabled=false;cast();beginFishing();battle.cast=50;launchSurfaceCast();settleSurfaceCast();battle.f=fish.find(f=>f.id==="bass");startFight();clearInterval(timer);timer=0;stopBattleFishArt()');
    w.eval('battle.gillWash={handled:true};finishGillWash()');
    phaseArt(w, 'phaseTarget', /疲労/);
    w.eval('battle.gillWash={handled:false};finishGillWash()');
    phaseArt(w, 'phaseBoth', /立て直し/);
    w.eval('battle.f=fish.find(f=>f.id==="hirame");battle.sandLifted=false;releaseHirameFromSand()');
    phaseArt(w, 'phaseDiagonal', /砂底から浮上/);
    assert.equal(w.document.querySelector('#phaseLabel svg').style.transform, 'rotate(-90deg)');
    assert.deepEqual(app.errors, []);
  } finally { app.dispose(); }
});
