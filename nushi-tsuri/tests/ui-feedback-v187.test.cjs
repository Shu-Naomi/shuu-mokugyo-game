const { test } = require('node:test');
const assert = require('node:assert/strict');
const { boot, seed } = require('./game-harness.cjs');

function equipped() {
  const app = boot(seed()), w = app.window, voices = [];
  let milliseconds = 1000;
  Object.defineProperty(w.performance, 'now', { configurable: true, value: () => milliseconds });
  const param = () => ({ value: .48, setValueAtTime(v) { this.value = v; },
    exponentialRampToValueAtTime() {}, linearRampToValueAtTime() {}, cancelScheduledValues() {} });
  const context = { state: 'running', currentTime: 2,
    createOscillator() {
      const source = { frequency: param(), connect() {}, disconnect() {}, start() {},
        stop(time) { this.stops ||= []; this.stops.push(time); } };
      voices.push(source); return source;
    }, createGain() { return { gain: param(), connect() {}, disconnect() {} }; },
  };
  w.__uiContext = context;
  w.__uiDestination = { gain: param() };
  w.eval('gameAudio.context=window.__uiContext;gameAudio.master=window.__uiDestination;gameAudio.unlocked=true;gameAudio.readyCuePlayed=true;gameAudio.primed=true');
  return { app, w, voices, advance() { milliseconds += 100; } };
}

test('actual menu, shop selection and close make distinct, bounded sounds; rendering is silent', () => {
  const { app, w, voices, advance } = equipped();
  try {
    w.document.querySelector('#menu').click();
    assert.equal(voices.length, 1);
    assert.equal(voices[0].frequency.value, 780);
    advance(); w.document.querySelector('#fieldMenuClose').click();
    assert.equal(voices.length, 2);
    assert.equal(voices[1].frequency.value, 620);
    assert.ok(voices[0].stops.length >= 2, 'previous sound is retired');
    advance(); w.eval('petUi.open("shop")');
    w.document.querySelector('[data-pet-tab="contests"]').click();
    assert.equal(voices.length, 3);
    assert.equal(voices[2].frequency.value, 660);
    for (let i = 0; i < 8; i++) w.eval('petUi.render();render()');
    assert.equal(voices.length, 3, 'modal and world redraws do not play');
    assert.deepEqual(app.errors, []);
  } finally { app.dispose(); }
});

test('held movement, shortcut repeats, mute and hidden page cannot multiply a cue', () => {
  const { app, w, voices, advance } = equipped();
  try {
    const left = w.document.querySelector('[data-move="left"]');
    left.dispatchEvent(new w.MouseEvent('pointerdown', { bubbles: true, button: 0 }));
    assert.equal(voices.length, 1);
    advance(); left.dispatchEvent(new w.MouseEvent('pointerup', { bubbles: true }));
    left.dispatchEvent(new w.MouseEvent('click', { bubbles: true, detail: 1 }));
    assert.equal(voices.length, 1);
    advance(); w.dispatchEvent(new w.KeyboardEvent('keydown', { key: 'z', bubbles: true }));
    assert.equal(voices.length, 2);
    advance(); w.dispatchEvent(new w.KeyboardEvent('keydown', { key: 'z', repeat: true, bubbles: true }));
    assert.equal(voices.length, 2);
    w.setSoundEnabled(false);
    assert.ok(voices[1].stops.length >= 2, 'muting ends the active sound');
    advance(); w.document.querySelector('#menu').click();
    assert.equal(voices.length, 2);
    w.eval('s.soundEnabled=true;gameAudio.unlocked=true');
    Object.defineProperty(w.document, 'hidden', { configurable: true, value: true });
    advance(); w.document.querySelector('#menu').click();
    assert.equal(voices.length, 2);
    assert.deepEqual(app.errors, []);
  } finally { app.dispose(); }
});
