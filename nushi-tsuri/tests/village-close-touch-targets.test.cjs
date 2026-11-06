const { test } = require('node:test');
const assert = require('node:assert/strict');
const { boot, seed, read, saveKey } = require('./game-harness.cjs');

const progress = w => read(w, 'Object.fromEntries(Object.entries(s).filter(([key]) => !["x","y","direction","log"].includes(key)))');
function touchMinimum(w, button) {
  assert.ok(button);
  const style = w.getComputedStyle(button);
  assert.ok(parseFloat(style.minWidth) >= 44, 'close button has a 44px minimum width');
  assert.ok(parseFloat(style.minHeight) >= 44, 'close button has a 44px minimum height');
  assert.equal(style.flexShrink, '0', 'a compact or board heading cannot shrink its close control');
}

test('location and request-board close controls retain their touch minimum through compact reparenting', () => {
  const app = boot({ ...seed(), soundEnabled: false }), w = app.window;
  try {
    const location = w.document.querySelector('#locationInterior');
    const original = location.querySelector('[data-close]');
    for (const id of read(w, 'Object.keys(locationInteriors)')) {
      w.openLocationInterior(id);
      assert.equal(location.querySelector('[data-close]'), original, 'the existing close node and handler are reused');
      touchMinimum(w, original);
      if (id === 'main-shrine') {
        assert.equal(location.classList.contains('compact-window'), false, 'the failing non-compact shrine is covered');
        assert.ok(original.parentElement.classList.contains('location-panel'));
      } else {
        assert.ok(original.parentElement.classList.contains('compact-window-heading'), id + ' keeps the minimum after reparenting');
      }
      original.click();
      assert.equal(location.classList.contains('open'), false);
    }
    w.openQuestBoard();
    const boardClose = w.document.querySelector('#questBoard [data-close]');
    touchMinimum(w, boardClose);
    assert.equal(w.getComputedStyle(boardClose.parentElement).display, 'flex');
    boardClose.click();
    assert.equal(w.document.querySelector('#questBoard').classList.contains('open'), false);
    assert.deepEqual(app.errors, []);
  } finally { app.dispose(); }
  // JSDOM verifies the CSS floor and original controls, not rendered bounds.
  // The unchanged Playwright check must confirm actual 44px hit targets in CI.
});

test('repeated shrine and board close clicks restore movement without changing resources or saves', () => {
  const app = boot({ ...seed(), soundEnabled: false }), w = app.window;
  try {
    w.Math.random = () => .999999;
    w.eval('ensureDailyQuestBoard()');
    const before = progress(w), keys = read(w, 'Object.keys(s).sort()');
    for (const { id, x, y } of [
      // The real CI route arrives on this clear shrine step. Adjacent
      // (193,66) has a partial downward step beside existing decoration.
      { id: 'locationInterior', x: 194, y: 65 },
      { id: 'questBoard', x: 123, y: 76 },
    ]) {
      for (let attempt = 0; attempt < 2; attempt++) {
        w.eval(`s.x=${x};s.y=${y};s.direction='up';render()`);
        w.action();
        const modal = w.document.getElementById(id), button = modal.querySelector('[data-close]');
        assert.ok(modal.classList.contains('open'), id + ' opens through the existing A handler');
        touchMinimum(w, button);
        button.click(); button.click();
        assert.equal(w.document.querySelector('.modal.open'), null, 'repeated close does not reopen a modal');
        assert.equal(read(w, 'activeLocationId'), null);
        assert.equal(w.document.querySelector('.controls').inert, false);
        w.move('down');
        assert.deepEqual(read(w, '[s.x,s.y]'), [x, y + 4], 'field movement resumes after close');
        w.move('up');
        assert.deepEqual(read(w, '[s.x,s.y]'), [x, y]);
        assert.deepEqual(progress(w), before);
        assert.deepEqual(read(w, 'Object.keys(s).sort()'), keys);
      }
    }
    w.save();
    const saved = JSON.parse(w.localStorage.getItem(saveKey));
    assert.equal(saved.money, before.money);
    assert.equal(saved.gameMinutes, before.gameMinutes);
    assert.deepEqual(saved.baits, before.baits);
    assert.deepEqual(saved.caught, before.caught);
    assert.deepEqual(app.errors, []);
  } finally { app.dispose(); }
});
