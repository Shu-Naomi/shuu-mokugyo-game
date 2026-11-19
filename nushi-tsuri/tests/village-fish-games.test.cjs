const test = require('node:test');
const assert = require('node:assert/strict');
const { boot, seed, read, saveKey } = require('./game-harness.cjs');
const { fixture } = require('./aquarium-identity-fixture.cjs');

function enter(w, game) {
  const [x, y] = game === 'race' ? [35, 60] : [74, 39.5];
  w.eval(`s.x=${x};s.y=${y};s.direction="up";render();action()`);
  assert.ok(w.document.querySelector(`#villageFishGames.open[data-game="${game}"]`));
}

function choose(w, selector) {
  const button = w.document.querySelector(selector);
  assert.ok(button && !button.disabled, selector + ' can be selected');
  button.click();
}

const cardAction = action => `[data-card-action="${action}"]`;
const play = w => choose(w, cardAction('play'));
const verdict = w => w.document.querySelector('.card-verdict').textContent;

function clock(w) {
  let time = w.performance.now(), nextId = -1;
  const frames = new Map();
  w.requestAnimationFrame = callback => { const id = nextId--; frames.set(id, callback); return id; };
  w.cancelAnimationFrame = id => frames.delete(id);
  w.performance.now = () => time;
  return ms => {
    for (let elapsed = 0; elapsed < ms; elapsed += 40) {
      time += Math.min(40, ms - elapsed);
      const current = Array.from(frames);
      frames.clear();
      for (const [, callback] of current) callback(time);
    }
  };
}

test('the net protects a points lead; winning the tied challenge needs a different fish', () => {
  const app = boot({ ...seed(), soundEnabled: false }), w = app.window;
  try {
    const before = read(w, '[s.money,s.gameMinutes,s.caught,s.petLife.fish]');
    enter(w, 'cards');
    choose(w, '[data-card-challenge="harbor-lead"]');
    play(w);
    assert.match(verdict(w), /3対3/);
    assert.deepEqual(read(w, 's.villageFishGames?.cleared || []'), []);
    choose(w, cardAction('replay'));
    choose(w, '[data-card-tackle="net"]'); play(w);
    assert.match(verdict(w), /最終局は 4対4/);
    assert.match(verdict(w), /合計 4対2/);
    choose(w, cardAction('shop')); choose(w, '[data-card-challenge="harbor-tie"]');
    choose(w, '[data-card-tackle="net"]'); play(w);
    assert.match(verdict(w), /合計 3対3/);
    assert.deepEqual(read(w, 's.villageFishGames.cleared'), ['harbor-lead']);
    choose(w, cardAction('replay')); choose(w, '[data-card-fish="suzuki"]');
    choose(w, '[data-card-tackle="net"]'); play(w);
    assert.match(verdict(w), /最終局は 5対4/);
    assert.deepEqual(read(w, 's.villageFishGames.cleared'), ['harbor-lead', 'harbor-tie']);
    const persisted = JSON.parse(w.localStorage.getItem(saveKey));
    assert.deepEqual(persisted.villageFishGames.cleared, ['harbor-lead', 'harbor-tie']);
    assert.deepEqual(read(w, '[s.money,s.gameMinutes,s.caught,s.petLife.fish]'), before);
    assert.deepEqual(app.errors, []);
  } finally { app.dispose(); }
});

test('racing a named aquarium fish prints a chosen finish once and the same card can be played after reload', () => {
  const saved = fixture();
  const pet = saved.petLife.fish.find(f => f.uid === 'pet-33');
  pet.nickname = 'ほし丸';
  const app = boot(saved), w = app.window;
  let persisted, original;
  try {
    original = read(w, 's.petLife.fish');
    const advance = clock(w);
    enter(w, 'race');
    const picker = w.document.querySelector('#danEntrantPicker');
    assert.match([...picker.options].find(option => option.value === 'pet-34').textContent, /世代不明/);
    const own = [...picker.options].find(option => option.textContent.includes(pet.nickname));
    assert.ok(own, 'the named aquarium entrant is available');
    picker.value = own.value; picker.dispatchEvent(new w.Event('change', { bubbles: true }));
    choose(w, '#danRaceStart'); advance(2200);
    const cue = w.document.querySelector('#danRaceSpurt');
    cue.dispatchEvent(new w.KeyboardEvent('keydown', { key: 'z', bubbles: true, repeat: true }));
    assert.equal(cue.disabled, false, 'holding the key from the start preserves the one signal');
    cue.dispatchEvent(new w.KeyboardEvent('keydown', { key: 'z', bubbles: true }));
    assert.equal(cue.disabled, true);
    advance(25000);
    assert.ok(w.document.querySelector('[data-race-phase="result"]'));
    assert.deepEqual(read(w, 's.villageFishGames?.records || []'), [], 'printing is optional');
    const print = w.document.querySelector('#danRacePrint');
    w.eval('saveSuppressed=true');
    print.click();
    assert.equal(print.disabled, false, 'a failed slot write can be retried');
    assert.deepEqual(read(w, 's.villageFishGames?.records || []'), []);
    w.eval('saveSuppressed=false');
    print.click(); print.click();
    const records = read(w, 's.villageFishGames.records');
    assert.equal(records.length, 1); assert.equal(records[0].name, pet.nickname);
    assert.equal(records[0].species, pet.species);
    assert.equal(records[0].uid, pet.uid); assert.equal(records[0].generation, 3);
    assert.ok(records[0].rank >= 1 && records[0].rank <= 3);
    assert.equal(records[0].rental, false);
    assert.deepEqual(read(w, 's.petLife.fish'), original, 'racing preserves the fish and its care');
    persisted = JSON.parse(w.localStorage.getItem(saveKey));
    assert.deepEqual(persisted.villageFishGames.records, records);
    assert.deepEqual(app.errors, []);
  } finally { app.dispose(); }

  const resumed = boot(persisted), rw = resumed.window;
  try {
    const id = persisted.villageFishGames.records[0].id;
    enter(rw, 'cards'); choose(rw, cardAction('album'));
    assert.equal(rw.document.querySelector('[data-card-record]').value, id);
    assert.equal(rw.document.querySelector(cardAction('foil')).disabled, true);
    choose(rw, cardAction('practice'));
    const ownCard = () => rw.document.querySelector('.fish-playing-card[data-record-id]');
    assert.equal(ownCard().dataset.recordId, id);
    assert.match(ownCard().textContent, /ほし丸/);
    choose(rw, '[data-card-tackle="net"]'); play(rw);
    assert.equal(ownCard().dataset.recordId, id, 'the actual played card retains its race identity');
    assert.match(verdict(rw), /最終局は 4対3/);
    assert.deepEqual(read(rw, 's.petLife.fish'), original);
    assert.deepEqual(resumed.errors, []);
  } finally { resumed.dispose(); }
});

test('the first arrival keeps the narrow gate, while different racers benefit from different spurt timing', () => {
  const race = require('../village-fish-race.js');
  const waiting = race.createRace('launch');
  waiting.elapsed = 6; waiting.gateOwner = 1; waiting.passages = 1;
  Object.assign(waiting.runners[1], { x: 49, gateOrder: 1 });
  waiting.runners[2].x = 39.95; waiting.runners[0].x = 39.8;
  race.advance(waiting, .5);
  assert.equal(waiting.runners[2].gateOrder, 2);
  assert.equal(waiting.runners[0].gateOrder, 0, 'the earlier arrival goes next even if its index is higher');

  function run(style, signalAt) {
    const r = race.createRace(style);
    for (let frame = 0; frame < 1800 && !r.finished; frame++) {
      const player = r.runners[0];
      if (player.x >= signalAt && player.spurtAt === null) {
        assert.equal(race.spurt(r), true);
        assert.equal(race.spurt(r), false, 'one signal per race');
      }
      race.advance(r, 1 / 60);
      assert.ok(r.runners.filter(f => f.x > 40 && f.x < 50).length <= 1, 'one fish fits through the gate at a time');
    }
    assert.ok(r.finished);
    return { rank: 1 + r.runners.filter(f => f.finishTime < r.runners[0].finishTime).length,
      gate: r.runners[0].gateOrder };
  }
  assert.equal(run('launch', 24).gate, 1);
  assert.ok(run('launch', 24).rank < run('launch', 70).rank);
  assert.ok(run('finish', 70).rank < run('finish', 24).rank);
  assert.ok(run('launch', Infinity).rank > 1, 'the field also finishes without an input');
});

test('a rental ayu can earn its own souvenir, then a spare for gold foil with unchanged battle strength', () => {
  const app = boot({ ...seed(), soundEnabled: false }), w = app.window;
  try {
    const advance = clock(w);
    enter(w, 'race');
    const select = w.document.querySelector('#danEntrantPicker');
    select.value = 'rental-ayu'; select.dispatchEvent(new w.Event('change', { bubbles: true }));
    for (let i = 0; i < 2; i++) {
      if (i) choose(w, '#danRaceAgain');
      choose(w, '#danRaceStart'); advance(20000);
      choose(w, '#danRacePrint');
      assert.equal(w.document.querySelector('#danRacePrint').disabled, true);
    }
    const records = read(w, 's.villageFishGames.records');
    assert.equal(records.length, 2); assert.notEqual(records[0].id, records[1].id);
    assert.ok(records.every(record => record.species === 'ayu' && record.rental && record.generation === null));
    w.close(); enter(w, 'cards');
    choose(w, cardAction('album')); choose(w, cardAction('foil'));
    assert.equal(w.document.querySelector(cardAction('foil')).disabled, true);
    choose(w, cardAction('practice')); choose(w, '[data-card-tackle="net"]'); play(w);
    assert.ok(w.document.querySelector('.card-showdown .fish-playing-card.is-foil[data-record-id]'));
    assert.match(verdict(w), /最終局は 4対3/);
    assert.deepEqual(read(w, 's.villageFishGames.foils'), ['ayu']);
    assert.deepEqual(read(w, 's.petLife.fish'), []);
    assert.deepEqual(app.errors, []);
  } finally { app.dispose(); }
});
