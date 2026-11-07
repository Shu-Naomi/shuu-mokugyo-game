// Deterministic scheduler tests only. Mock visibility/resize signals here are
// NOT evidence of real browser visibility, resizing or native frame pacing.
const assert = require('node:assert/strict');
const test = require('node:test');
const vm = require('node:vm');
const fs = require('node:fs');
const path = require('node:path');
const text = fs.readFileSync(path.join(__dirname, 'browser-sam-alignment-experiments.cjs'), 'utf8');
const controller = text.slice(text.indexOf('function installController() {'), text.indexOf('\nfunction installMetrics('));

function fixture(beforeInstall = null) {
  const mutations = [], resizes = [], resolutions = [], rafs = new Map();
  let nextRaf = 0, time = 0;
  class Target {
    constructor() { this.listeners = new Map(); }
    addEventListener(type, callback) {
      if (!this.listeners.has(type)) this.listeners.set(type, new Set());
      this.listeners.get(type).add(callback);
    }
    removeEventListener(type, callback) { this.listeners.get(type)?.delete(callback); }
    emit(type, extra = {}) {
      for (const callback of this.listeners.get(type) || []) callback({ target: this, type, ...extra });
    }
  }
  class Style {
    constructor(node) { this.node = node; this.values = new Map(); }
    *[Symbol.iterator]() { yield* this.values.keys(); }
    getPropertyValue(property) { return this.values.get(property)?.value || ''; }
    getPropertyPriority(property) { return this.values.get(property)?.priority || ''; }
    setProperty(property, value, priority = '') {
      this.values.set(property, { value, priority }); this.node.changed();
    }
    removeProperty(property) { this.values.delete(property); this.node.changed(); }
  }
  class Node extends Target {
    constructor(box) {
      super(); this.box = box; this.style = new Style(this); this.className = ''; this.hidden = false;
      this.parentElement = null; this.clientLeft = 0; this.clientTop = 0; this.animations = [];
    }
    changed() {
      for (const observer of mutations) if (observer.targets.has(this)) observer.records.push({ target: this });
    }
    getClientRects() { return this.hidden ? [] : [this.getBoundingClientRect()]; }
    getBoundingClientRect() {
      const [x = 0, y = 0] = this.style.getPropertyValue('translate').split(' ').map(parseFloat);
      const [sx = 1, sy = sx] = this.style.getPropertyValue('scale').split(' ').filter(Boolean).map(Number);
      return { x: this.box.x + (x || 0), y: this.box.y + (y || 0), width: this.box.width * sx, height: this.box.height * sy };
    }
    getAnimations() { return this.animations; }
  }
  const map = new Node({ x: -113.27, y: -17.61, width: 1200, height: 700 });
  const world = new Node({ x: 13.27, y: 11.4, width: 600, height: 350 });
  const player = new Node({ x: 201.3, y: 177.7, width: 40, height: 50 });
  const source = new Node({ x: 0, y: 0, width: 1200, height: 700 });
  source.width = 800; source.height = 450;
  map.parentElement = world;
  const document = new Target(), window = new Target();
  document.hidden = false; document.visibilityState = 'visible';
  document.querySelector = selector => ({ '#map': map, '#world': world, '#player': player, '#worldPixels': source })[selector];
  class MutationObserver {
    constructor(callback) { this.callback = callback; this.targets = new Set(); this.records = []; mutations.push(this); }
    observe(node) { this.targets.add(node); }
    disconnect() { this.targets.clear(); this.records = []; }
  }
  class ResizeObserver {
    constructor(callback) { this.callback = callback; this.targets = new Set(); this.options = new Map(); resizes.push(this); }
    observe(node, options = {}) {
      if (node.rejectPhysicalObservation && options.box === 'device-pixel-content-box') throw Error('Unsupported box');
      this.targets.add(node); this.options.set(node, options);
    }
    disconnect() { this.targets.clear(); this.options.clear(); }
  }
  const environment = { document, window, matchMedia: () => { const query = new Target(); resolutions.push(query); return query; }, devicePixelRatio: 1.875, MutationObserver, ResizeObserver,
    getComputedStyle: () => ({ borderRightWidth: '0', borderBottomWidth: '0' }),
    performance: { now: () => (time += .001) },
    requestAnimationFrame: callback => { const id = ++nextRaf; rafs.set(id, callback); return id; },
    cancelAnimationFrame: id => rafs.delete(id) };
  beforeInstall?.({ map, world });
  vm.runInNewContext(controller + '\ninstallController();', environment);
  function flushMutations() {
    for (const observer of mutations) {
      const records = observer.records.splice(0);
      if (records.length && observer.targets.size) observer.callback(records);
    }
  }
  function frame() {
    flushMutations();
    const entries = [...rafs]; rafs.clear();
    for (const [, callback] of entries) callback(time);
    flushMutations();
  }
  function resize() { for (const observer of resizes) if (observer.targets.size) observer.callback([]); }
  const api = window.samAlignment;
  const moving = () => { map.animations = [{ transitionProperty: 'transform', playState: 'running', pending: false }]; };
  const stop = () => { map.animations = []; map.emit('transitionend', { propertyName: 'transform' }); };
  const snapped = () => {
    const box = map.getBoundingClientRect();
    for (const axis of ['x', 'y']) assert.ok(Math.abs(box[axis] * environment.devicePixelRatio - Math.round(box[axis] * environment.devicePixelRatio)) < 1e-8);
  };
  return { api, map, world, player, document, window, environment, resolutions, rafs, mutations, resizes, frame, resize, flushMutations, moving, stop, snapped };
}

test('startup settles without an idle rAF or a self-mutation wake loop', () => {
  const f = fixture(); f.api.start('per-frame'); f.resize(); f.frame(); f.snapped();
  assert.equal(f.rafs.size, 0);
  assert.ok(f.api.timing().observation.ignoredMutationBatches > 0);
  f.api.resetTiming();
  for (let i = 0; i < 300; i++) f.frame();
  assert.equal(f.api.timing().callbacks, 0);
  assert.equal(Object.keys(f.api.timing().callbackSources).length, 0);
});

test('real transition-shaped scheduler input snaps every frame, handles replacement and ends', () => {
  const f = fixture(); f.api.start('per-frame'); f.frame(); f.moving();
  f.map.emit('transitionrun', { propertyName: 'transform' });
  f.map.emit('transitionstart', { propertyName: 'transform' });
  assert.equal(f.rafs.size, 1, 'wakes coalesce');
  for (let i = 0; i < 12; i++) { f.map.box.x += .47; f.frame(); f.snapped(); assert.equal(f.rafs.size, 1); }
  f.map.emit('transitioncancel', { propertyName: 'transform' });
  f.map.emit('transitionrun', { propertyName: 'transform' });
  f.frame(); assert.equal(f.rafs.size, 1, 'replacement still moves');
  f.stop(); f.frame(); f.snapped(); assert.equal(f.rafs.size, 0);
});

test('unrelated and bubbled transitions do not wake alignment', () => {
  const f = fixture(); f.api.start('per-frame'); f.frame(); f.api.resetTiming();
  f.map.emit('transitionstart', { propertyName: 'opacity' });
  f.map.emit('transitionend', { propertyName: 'transform', target: f.player });
  assert.equal(f.rafs.size, 0);
  assert.equal(f.api.timing().callbacks, 0);
  assert.equal(f.api.timing().callbackSources.event.callbacks, 2, 'ignored listener costs remain visible');
});

test('zero-duration, cancelled and paused transforms do not depend on an end event', () => {
  const f = fixture(); f.api.start('per-frame'); f.frame();
  f.map.box.x += .123; f.map.style.setProperty('transform', 'translateX(-100px)'); f.frame(); f.snapped();
  assert.equal(f.rafs.size, 0, 'no transition event is needed');
  f.moving(); f.map.emit('transitionrun', { propertyName: 'transform' }); f.frame();
  f.map.animations[0].playState = 'paused'; f.frame(); assert.equal(f.rafs.size, 0);
  f.moving(); f.map.emit('transitionrun', { propertyName: 'transform' }); f.frame();
  f.map.animations = []; f.map.emit('transitioncancel', { propertyName: 'transform' }); f.frame();
  assert.equal(f.rafs.size, 0);
});

test('mock hidden, freeze and pagehide suspend; their matching resume resnaps once', () => {
  const f = fixture(); f.api.start('per-frame'); f.frame();
  for (const [hide, show] of [
    [() => { f.document.hidden = true; f.document.emit('visibilitychange'); }, () => { f.document.hidden = false; f.document.emit('visibilitychange'); }],
    [() => f.document.emit('freeze'), () => f.document.emit('resume')],
    [() => f.window.emit('pagehide'), () => f.window.emit('pageshow')]
  ]) {
    f.moving(); f.map.emit('transitionrun', { propertyName: 'transform' }); assert.equal(f.rafs.size, 1);
    hide(); assert.equal(f.rafs.size, 0);
    f.api.resetTiming(); f.map.style.setProperty('transform', 'translateX(-123px)'); f.resize(); f.frame();
    assert.equal(f.api.timing().callbacks, 0);
    f.map.animations = []; f.map.box.x += .2; show(); f.frame(); f.snapped(); assert.equal(f.rafs.size, 0);
  }
});

test('element/window resize and ancestor presentation changes wake finite work', () => {
  const f = fixture(); f.api.start('per-frame'); f.frame();
  for (const change of [() => f.resize(), () => f.window.emit('resize'),
    () => { f.world.className = 'field-menu-active'; f.world.changed(); },
    () => { f.world.style.setProperty('border-left-width', '3px'); }]) {
    f.map.box.x += .31; change(); f.frame(); f.snapped(); assert.equal(f.rafs.size, 0);
  }
  f.map.hidden = true; f.map.changed(); f.frame(); assert.equal(f.rafs.size, 0);
  f.map.hidden = false; f.map.changed(); f.frame(); f.snapped(); assert.equal(f.rafs.size, 0);
});

test('restore/repeated start remove every resource and restore owned styles exactly', () => {
  const f = fixture();
  for (const mode of ['per-frame', 'integer-nearest', 'integer-fit', 'endpoint', 'per-frame']) {
    f.api.start(mode); f.frame(); f.moving(); f.map.emit('transitionrun', { propertyName: 'transform' });
    f.api.restore();
    assert.equal(f.rafs.size, 0);
    assert.equal(f.api.status().observers, 0); assert.equal(f.api.status().listeners, 0);
    assert.ok(f.mutations.every(observer => observer.targets.size === 0));
    assert.ok(f.resizes.every(observer => observer.targets.size === 0));
    for (const node of [f.map, f.world, f.player, f.window, f.document]) {
      assert.ok([...node.listeners.values()].every(listeners => listeners.size === 0));
    }
    assert.equal([...f.map.style].length, 0); assert.equal([...f.world.style].length, 0);
    f.api.resetTiming(); f.map.emit('transitionrun', { propertyName: 'transform' });
    f.window.emit('resize'); f.document.emit('resume'); f.resize(); f.frame();
    assert.equal(f.api.timing().callbacks, 0); assert.equal(f.rafs.size, 0);
  }
});

test('integer modes run without diagnostic metrics and follow player-only movement', () => {
  for (const mode of ['integer-nearest', 'integer-fit']) {
    const f = fixture();
    Object.defineProperty(f.window, 'samAlignmentMetrics', { get() { throw Error('diagnostics reached hot path'); } });
    f.api.start(mode); f.frame(); f.snapped(); assert.equal(f.rafs.size, 0);
    f.player.animations = [{ transitionProperty: 'left', playState: 'running' }];
    f.player.emit('transitionstart', { propertyName: 'left' }); f.frame(); assert.equal(f.rafs.size, 1);
    f.player.animations = []; f.player.emit('transitionend', { propertyName: 'left' }); f.frame();
    assert.equal(f.rafs.size, 0); f.snapped();
  }
});

test('legacy comparator deliberately retains perpetual idle work and remains removable', () => {
  const f = fixture(); f.api.start('legacy-per-frame'); f.api.resetTiming();
  for (let i = 0; i < 300; i++) f.frame();
  assert.equal(f.api.timing().callbacks, 300); assert.equal(f.rafs.size, 1);
  f.api.restore(); assert.equal(f.rafs.size, 0);
});

test('DPR changes re-arm exactly one resolution listener and restore removes it', () => {
  const f = fixture(); f.api.start('per-frame'); f.frame();
  for (const dpr of [1, 2, 1.875]) {
    f.environment.devicePixelRatio = dpr;
    f.resolutions.at(-1).emit('change'); f.frame(); f.snapped();
    assert.equal(f.rafs.size, 0);
    assert.equal(f.resolutions.reduce((n, query) => n + (query.listeners.get('change')?.size || 0), 0), 1);
  }
  f.api.restore();
  assert.ok(f.resolutions.every(query => query.listeners.get('change').size === 0));
});

test('starting hidden schedules nothing; pending transitions wake and finish cleanly', () => {
  const f = fixture(); f.document.hidden = true;
  f.api.start('per-frame'); f.frame(); assert.equal(f.rafs.size, 0); assert.equal(f.api.timing().callbacks, 0);
  f.document.hidden = false; f.document.emit('visibilitychange'); f.frame(); f.snapped();
  f.map.animations = [{ transitionProperty: 'transform', playState: 'idle', pending: true }];
  f.map.emit('transitionrun', { propertyName: 'transform' }); f.frame(); assert.equal(f.rafs.size, 1);
  f.map.animations = []; f.map.emit('transitioncancel', { propertyName: 'transform' });
  f.frame(); f.snapped(); assert.equal(f.rafs.size, 0);
});

test('restore preserves existing owned values and priorities, even with queued mutations', () => {
  const f = fixture(({ map, world }) => {
    map.style.setProperty('translate', '1px 2px', 'important');
    map.style.setProperty('scale', '1.2 1.3');
    map.style.setProperty('clip-path', 'inset(1px)', 'important');
    world.style.setProperty('background-color', 'rgb(1, 2, 3)');
  });
  f.api.start('integer-fit'); f.frame();
  f.map.style.setProperty('transform', 'translateX(3px)');
  assert.ok(f.mutations.some(observer => observer.records.length));
  f.api.restore(); f.flushMutations();
  for (const [node, property, value, priority] of [
    [f.map, 'translate', '1px 2px', 'important'], [f.map, 'scale', '1.2 1.3', ''],
    [f.map, 'clip-path', 'inset(1px)', 'important'], [f.world, 'background-color', 'rgb(1, 2, 3)', '']
  ]) {
    assert.equal(node.style.getPropertyValue(property), value);
    assert.equal(node.style.getPropertyPriority(property), priority);
  }
  assert.equal(f.map.style.getPropertyValue('transform'), 'translateX(3px)', 'External changes are not reverted');
  assert.equal(f.rafs.size, 0);
});

test('physical-content resize observes a DPR-only change without resolution or viewport events', () => {
  const f = fixture(); f.api.start('per-frame', { diagnostics: true }); f.frame(); f.api.resetTiming();
  const observer = f.resizes.find(candidate => candidate.options.get(f.world)?.box === 'device-pixel-content-box');
  assert.ok(observer, 'A dedicated physical-content observation is registered');
  f.environment.devicePixelRatio = 1.125;
  observer.callback([{ target: f.world, devicePixelContentBoxSize: [{ inlineSize: 675, blockSize: 394 }] }]);
  assert.equal(f.rafs.size, 1); f.frame(); f.snapped(); assert.equal(f.rafs.size, 0);
  assert.equal(f.api.timing().wakes['device-pixel-resize'], 1);
  assert.equal(f.api.timing().callbackSources.event, undefined, 'No resolution/window event manufactured');
  assert.equal(f.api.diagnostics().devicePixelBox.last.dpr, 1.125);
  f.api.restore(); assert.equal(observer.targets.size, 0);
});

test('an unsupported physical-content observation stays explicit and adds no polling', () => {
  const f = fixture(({ world }) => { world.rejectPhysicalObservation = true; });
  f.api.start('per-frame', { diagnostics: true }); f.frame(); f.api.resetTiming();
  f.environment.devicePixelRatio = 1.125;
  for (let i = 0; i < 300; i++) f.frame();
  assert.equal(f.api.diagnostics().devicePixelBox.requested, false);
  assert.equal(f.api.timing().callbacks, 0); assert.equal(f.rafs.size, 0);
  f.api.restore(); assert.ok(f.resizes.every(observer => observer.targets.size === 0));
});

test('equivalent class serialization is diagnosed but does not wake integer alignment', () => {
  const f = fixture(({ map }) => { map.className = 'map v54-map'; });
  f.player.className = 'player boy face-down';
  f.api.start('integer-nearest', { diagnostics: true }); f.frame(); f.api.resetTiming();
  f.player.className = 'player boy  face-down  '; f.player.changed(); f.frame();
  assert.equal(f.api.timing().callbacks, 0); assert.equal(f.rafs.size, 0);
  assert.equal(f.api.timing().callbackSources.mutation.callbacks, 1, 'Real observer work is still counted');
  const change = f.api.diagnostics().changes.find(entry => entry.kind === 'external-mutation');
  assert.equal(change.before[0], 'player boy face-down'); assert.equal(change.after[0], 'player boy  face-down  ');
  assert.equal(change.semanticChange, false);
  f.player.className += ' companion-sit'; f.player.changed(); f.frame();
  assert.equal(f.api.timing().callbacks, 1, 'Actual class-token changes still wake a finite correction');
  assert.equal(f.rafs.size, 0);
});

test('real game dog completion rewrites only player class whitespace after player completion', () => {
  // Execute the original game functions with explicit timer callbacks. This
  // establishes the source of the late mutation, not real browser rendering.
  const { boot, seed } = require('./game-harness.cjs');
  const app = boot({ ...seed(), x: 175, y: 84, direction: 'right', gameMinutes: 600 });
  try {
    const timers = [], w = app.window;
    w.setTimeout = (callback, delay) => { timers.push({ callback, delay }); return timers.length; };
    w.eval("move('down')");
    const player = w.document.querySelector('#player');
    timers.find(timer => timer.delay === 365).callback(); const playerComplete = player.className;
    timers.find(timer => timer.delay === 660).callback(); const dogComplete = player.className;
    assert.notEqual(dogComplete, playerComplete);
    const tokens = value => [...new Set(value.split(/\s+/).filter(Boolean))].sort();
    assert.deepEqual(tokens(dogComplete), tokens(playerComplete));
    assert.equal(w.eval('playerWalking'), false);
    assert.equal(w.eval('dogWalking'), false);
    assert.deepEqual(app.errors, []);
  } finally { app.dispose(); }
});
