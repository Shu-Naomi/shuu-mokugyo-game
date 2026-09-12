const { test } = require('node:test');
const assert = require('node:assert/strict');
const T = require('../tournament.js');
const { boot, seed, read, saveKey } = require('./game-harness.cjs');

test('the fish-market east paving leads to Sam and back on every four-unit grid, including a resumed save', () => {
  const app = boot({ ...seed(), x: 171, y: 107 }), w = app.window;
  let saved;
  try {
    w.Math.random = () => .999999;
    const inventory = read(w, '({money:s.money,baits:s.baits,caught:s.caught,items:s.items,minutes:s.gameMinutes})');
    for (let ox = 0; ox < 4; ox++) for (let oy = 0; oy < 4; oy++) {
      let x = 171 + ox, y = 105 + oy;
      w.eval(`s.x=${x};s.y=${y};render()`);
      const legs = [['right', 1, 4, 0], ['up', 3, 0, -4], ['right', 5, 4, 0]];
      for (const [direction, count, dx, dy] of legs) for (let i = 0; i < count; i++) {
        w.move(direction); x += dx; y += dy;
        assert.deepEqual(read(w, '[s.x,s.y]'), [x, y], `outbound grid ${ox},${oy}`);
      }
      assert.equal(w.isAtSamShopEntrance(), true);
      w.action();
      assert.equal(w.document.querySelector('#store').classList.contains('open'), true);
      w.close();
      for (const [direction, count, dx, dy] of [['left', 5, -4, 0], ['down', 3, 0, 4], ['left', 1, -4, 0]]) {
        for (let i = 0; i < count; i++) {
          w.move(direction); x += dx; y += dy;
          assert.deepEqual(read(w, '[s.x,s.y]'), [x, y], `return grid ${ox},${oy}`);
        }
      }
    }
    w.eval('s.x=171;s.y=107;render()'); w.save();
    saved = JSON.parse(w.localStorage.getItem(saveKey));
    assert.deepEqual(read(w, '({money:s.money,baits:s.baits,caught:s.caught,items:s.items,minutes:s.gameMinutes})'), inventory);
    assert.deepEqual(app.errors, []);
  } finally { app.dispose(); }
  const resumed = boot(saved);
  try {
    resumed.window.move('right');
    assert.deepEqual(read(resumed.window, '[s.x,s.y]'), [175, 107]);
    assert.deepEqual(resumed.errors, []);
  } finally { resumed.dispose(); }
});

test('the open stone corner does not open the neighboring water, boats or shop walls', () => {
  const app = boot(), w = app.window;
  try {
    for (const [x, y] of [[182,103],[185,104],[190,108],[180,112],[179.5,107],[171,100],[197,80]])
      assert.equal(w.isWalkableWorld(x,y), false, `solid/water ${x},${y}`);
    assert.equal(w.isWalkableWorldSegment(175,107,183,107), false, 'cannot walk from the paving onto the boat');
    assert.equal(w.isWalkableWorldSegment(171,107,171,99), false, 'cannot walk through the fish market');
    assert.deepEqual(app.errors, []);
  } finally { app.dispose(); }
});

test('bottom dialogue owns A/Z/Enter and B without casting, moving or changing a saved tournament', () => {
  const app = boot({ ...seed(), x: 155, y: 28, direction: 'down', tournament: T.create('lakeFuna',500,94) });
  const w = app.window;
  try {
    const world = w.document.querySelector('#world'); world.scrollLeft = 250; world.scrollTop = 190;
    const before = read(w, '({money:s.money,baits:s.baits,minutes:s.gameMinutes,tournament:s.tournament})');
    w.action();
    const modal = w.document.querySelector('#tournamentTalk'), line = w.document.querySelector('#tournamentTalkLine');
    assert.equal(modal.classList.contains('open'), true);
    assert.equal(modal.style.transform, 'none', 'the fixed dialogue does not move with the scrolled map');
    for (const advance of [
      () => w.document.querySelector('#action').click(),
      () => w.dispatchEvent(new w.KeyboardEvent('keydown',{key:'z',bubbles:true})),
      () => w.dispatchEvent(new w.KeyboardEvent('keydown',{key:'Enter',bubbles:true})),
      () => w.document.querySelector('#tournamentTalkMore').click(),
    ]) {
      const previous = line.textContent; advance();
      assert.notEqual(line.textContent, previous);
      assert.equal(modal.classList.contains('open'), true);
      assert.equal(read(w, 'battle'), null);
    }
    w.move('down');
    assert.deepEqual(read(w, '[s.x,s.y]'), [155,28]);
    w.document.querySelector('#back').click();
    assert.equal(modal.classList.contains('open'), false);
    assert.deepEqual(read(w, '({money:s.money,baits:s.baits,minutes:s.gameMinutes,tournament:s.tournament})'), before);
    w.move('down');
    assert.deepEqual(read(w, '[s.x,s.y]'), [155,32]);
    assert.deepEqual(app.errors, []);
  } finally { app.dispose(); }
});
