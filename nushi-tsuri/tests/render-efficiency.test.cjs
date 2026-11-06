const {test} = require('node:test');
const assert = require('node:assert/strict');
const {createCanvas} = require('@napi-rs/canvas');
const {boot, read} = require('./game-harness.cjs');
const fixture = require('./browser-render-efficiency-fixture.cjs');
const Art = require('../layered-scenery.js');
const run = (window, fn, arg) => window.eval(`(${fn})(${JSON.stringify(arg)})`);
const hidden = (w, value) => Object.defineProperty(w.document, 'hidden', {configurable: true, value});
function home() {const app = boot(); run(app.window, fixture.enterHomeFixture); return app;}
function assertCounts(result) {
  assert.equal(result.beforePaints, result.hz + 1);
  assert.equal(result.dogPaints, 31); assert.equal(result.aquariumPaints, 31);
  assert.equal(result.movementSteps, result.hz);
  assert.equal(result.elapsed, result.referenceElapsed);
  assert.deepEqual(result.dogs, result.referenceDogs, 'elapsed-time motion exactly matches the original every-RAF update');
  assert.equal(result.saveUnchanged, true);
}
for (const hz of [60, 120]) test(`${hz} Hz home RAF: original ${hz + 1} paints become 31 with identical motion and save state`, () => {
  const app = home();
  try {const result = run(app.window, fixture.measureHomePaints, hz); assertCounts(result); assert.deepEqual(app.errors, []);}
  finally {app.dispose();}
});

test('home loops stop when hidden and resume immediately without catching up hidden time', () => {
  const app = home(), w = app.window;
  try {
    w.eval('stopAquariumAnimation();stopHomeDogAnimation();');
    w.requestAnimationFrame = () => 12345;
    w.eval('advanceAquariumAnimation(0);animateHomeDogs(0);advanceAquariumAnimation(1000/60);animateHomeDogs(1000/60)');
    const before = read(w, '({elapsed:aquariumElapsed,dogs:homeDogs.map(({spriteKey,...motion})=>motion)})');
    hidden(w, true); w.document.dispatchEvent(new w.Event('visibilitychange'));
    assert.equal(w.eval('aquariumAnimationTimer+homeDogAnimationTimer'), 0);
    w.eval('advanceAquariumAnimation(60000);animateHomeDogs(60000)');
    assert.deepEqual(read(w, '({elapsed:aquariumElapsed,dogs:homeDogs.map(({spriteKey,...motion})=>motion)})'), before);
    assert.equal(w.eval('aquariumLastTime'), null); assert.equal(w.eval('homeDogLastTime'), null);
    hidden(w, false); w.document.dispatchEvent(new w.Event('visibilitychange'));
    assert.ok(w.eval('aquariumAnimationTimer')); assert.ok(w.eval('homeDogAnimationTimer'));
    const beforeResume = read(w, '({elapsed:aquariumElapsed,dogs:homeDogs.map(({spriteKey,...motion})=>motion)})');
    w.eval('advanceAquariumAnimation(60000);animateHomeDogs(60000)');
    assert.deepEqual(read(w, '({elapsed:aquariumElapsed,dogs:homeDogs.map(({spriteKey,...motion})=>motion)})'), beforeResume);
    assert.equal(w.eval('aquariumLastPaintAt'), 60000); assert.equal(w.eval('homeDogLastPaintAt'), 60000);
    assert.deepEqual(app.errors, []);
  } finally {app.dispose();}
});

test('only full settings containment stops aquarium; open, resize and close reevaluate coverage', () => {
  const app = home(), w = app.window, options = w.document.querySelector('#options'), tank = w.document.querySelector('#homeAquarium');
  try {
    let box = {left: 0, top: 0, right: 300, bottom: 200, width: 300, height: 200};
    tank.getBoundingClientRect = () => ({left: 50, top: 50, right: 151, bottom: 95, width: 101, height: 45});
    options.getBoundingClientRect = () => box;
    const raf = new Map(); let sequence = 0;
    w.eval('stopAquariumAnimation();stopHomeDogAnimation()');
    w.requestAnimationFrame = callback => {raf.set(++sequence, callback); return sequence;};
    w.cancelAnimationFrame = id => raf.delete(id);
    assert.equal(w.openOptions(), true);
    assert.equal(w.homeAquariumCoveredByOptions(), true); assert.equal(w.eval('aquariumAnimationTimer'), 0);
    box = {...box, right: 130, width: 130};
    assert.equal(w.homeAquariumCoveredByOptions(), false, 'partly visible fish must keep moving');
    w.dispatchEvent(new w.Event('resize'));
    const callbacks = [...raf.values()]; raf.clear(); callbacks.forEach(fn => fn(100));
    assert.equal(w.eval('aquariumCovered'), false); assert.ok(w.eval('aquariumAnimationTimer'));
    box = {...box, right: 300, width: 300}; w.renderHomeAquarium();
    assert.equal(w.eval('aquariumAnimationTimer'), 0);
    assert.equal(w.closeOptions(), true); assert.ok(w.eval('aquariumAnimationTimer'));
    assert.equal(w.eval('aquariumLastTime'), null);
    options.classList.add('open');
    box = {left: 40, top: 40, right: 200, bottom: 140, width: 160, height: 100};
    assert.equal(w.homeAquariumCoveredByOptions(), false, 'rounded border safety margin is not opaque coverage');
    assert.deepEqual(app.errors, []);
  } finally {app.dispose();}
});

test('hidden care drawing stops while catch deadlines and timed actions keep their gameplay progression', () => {
  const app = boot(), w = app.window;
  try {
    w.openDogCare('shuu');
    const context = w.document.querySelector('#dogCareSceneCanvas').getContext('2d');
    let paints = 0; context.clearRect = () => {paints++;};
    hidden(w, true);
    w.eval("setDogCareScene('pet','shuu',null,100);dogCareScene.startedAt=Date.now()-101;advanceDogCareScene()");
    assert.equal(w.eval('dogCareScene.mode'), 'idle'); assert.equal(paints, 0);
    w.eval("beginDogCatchGame('shuu','rubberBall',0);dogCatchGame.throwStartedAt=Date.now()-3000;advanceDogCareScene()");
    assert.equal(w.eval('dogCatchGame.phase'), 'result'); assert.equal(w.eval('dogCatchGame.lastSuccess'), false);
    w.eval('dogCatchGame.resultStartedAt=Date.now()-651;advanceDogCareScene()');
    assert.equal(w.eval('dogCatchGame.phase'), 'throw'); assert.equal(w.eval('dogCatchGame.throwIndex'), 1);
    assert.equal(paints, 0, 'gameplay still advances without any canvas clear/raster');
    hidden(w, false); w.advanceDogCareScene(); assert.ok(paints > 0);
    assert.deepEqual(app.errors, []);
  } finally {app.dispose();}
});

test('hidden companion pet ticks neither advance decorative frames nor paint; visible tick resumes', () => {
  const app = boot(), w = app.window;
  try {
    let paints = 0; w.drawPetScene = () => {paints++;};
    w.eval("companionReaction='pet';$('#petScene').classList.add('active');petSceneFrame=0");
    hidden(w, true); for (let i = 0; i < 8; i++) w.advancePetSceneFrame();
    assert.equal(paints, 0); assert.equal(w.eval('petSceneFrame'), 0);
    hidden(w, false); w.advancePetSceneFrame(); assert.equal(paints, 1); assert.equal(w.eval('petSceneFrame'), 1);
    assert.deepEqual(app.errors, []);
  } finally {app.dispose();}
});

test('exact raster keys dedupe; load/decode races, latest frame, failed draw, size and appearance/yaw stay fresh', async () => {
  const app = boot();
  try {
    const r = await run(app.window, fixture.checkFishRasterKeys);
    assert.deepEqual(JSON.parse(JSON.stringify(r)), {first: 1, repeated: 1, changedFrame: 2, appearance: 3,
      yaw: 4, changedAppearance: 5, resized: 6, failedMemoized: false, retried: true,
      incompletePaints: 0, incompleteMemoized: false, afterLoad: 1, afterRepeat: 1,
      latestFrame: 4, wrapperYawPaints: 2, wrapperTailPaints: 2, size: [448, 224]});
    assert.deepEqual(app.errors, []);
  } finally {app.dispose();}
});

test('animation occlusion is separate from cache visibility and syncVisibility resumes the same prepared scene', async () => {
  const frames = new Map(); let serial = 0, time = 0, covered = false, hidden = false, loads = 0, builds = 0, paints = 0;
  const canvas = createCanvas(16, 16), overlay = createCanvas(16, 16); overlay.dataset = {};
  const clear = overlay.getContext('2d').clearRect.bind(overlay.getContext('2d'));
  overlay.getContext('2d').clearRect = (...args) => {paints++; clear(...args);};
  const controller = Art.createController({canvasFactory: createCanvas,
    loadImage: async () => {
      loads++;
      // The village now keeps trees static. Give the retained water effect
      // real water-coloured pixels instead of relying on empty tree masks.
      const image=createCanvas(16,16),ctx=image.getContext('2d');
      ctx.fillStyle='#306c98';ctx.fillRect(0,0,16,16);return image;
    },
    buildScene: (...args) => {builds++; return Art.prepare(...args);},
    requestFrame: fn => {frames.set(++serial, fn); return serial;}, cancelFrame: id => frames.delete(id),
    now: () => time, visible: () => true, animationVisible: () => !covered, isHidden: () => hidden,
    reducedMotion: () => false, createMotionCanvas: () => overlay, onError: error => {throw error;}});
  const tick = () => {time += 100; const callbacks = [...frames.values()]; frames.clear(); callbacks.forEach(fn => fn(time));};
  try {
    await controller.paint(canvas, 'world', {season: 'spring', period: 'day'});
    assert.equal(frames.size, 1); tick(); const before = {loads, builds, paints, stats: controller.stats()};
    covered = true; controller.syncVisibility(); assert.equal(frames.size, 0);
    for (let i = 0; i < 5; i++) tick();
    assert.equal(paints, before.paints); assert.equal(controller.stats().prepared, before.stats.prepared);
    assert.equal(controller.stats().sessions, before.stats.sessions);
    // A second scene must not evict a covered-but-layout-visible session.
    const other = createCanvas(16, 16);
    await controller.paint(other, 'home-interior', {season: 'spring', period: 'day'});
    const cachedBuilds = builds, cachedLoads = loads;
    covered = false; controller.syncVisibility(); assert.equal(frames.size, 1);
    const beforeRefreshPaints = paints;
    await controller.refresh(canvas); await controller.paint(canvas, 'world', {season: 'spring', period: 'day'});
    assert.equal(builds, cachedBuilds); assert.equal(loads, cachedLoads);
    assert.equal(paints, beforeRefreshPaints, 'the original live session resumes without recomposing its cached bitmap');
    tick(); assert.ok(paints > before.paints);
    hidden = true; controller.syncVisibility(); assert.equal(frames.size, 0);
    hidden = false; controller.syncVisibility(); assert.equal(frames.size, 1);
  } finally {controller.dispose();}
  assert.equal(frames.size, 0);
});

test('world stops behind home/fishing; nushi hides underwater motion but opacity-zero lure sources stay live', () => {
  const app = boot(), d = app.window.document;
  try {
    const world = d.querySelector('#worldPixels'), water = d.querySelector('#underwaterPixels'), home = d.querySelector('#playerHomeArea'), scene = d.querySelector('#fishScene');
    assert.equal(Art.animationVisible(world), true);
    home.classList.add('active'); assert.equal(Art.animationVisible(world), false);
    home.classList.remove('active'); scene.classList.add('active'); assert.equal(Art.animationVisible(world), false);
    water.style.opacity = '0'; scene.classList.add('underwater-travel');
    assert.equal(Art.animationVisible(water), true, 'opacity-zero source is still sampled by the lure composite');
    scene.classList.add('nushi-water'); assert.equal(Art.animationVisible(water), false);
    scene.classList.remove('nushi-water'); assert.equal(Art.animationVisible(water), true);
    scene.classList.remove('active'); assert.equal(Art.animationVisible(world), true);
    assert.deepEqual(app.errors, []);
  } finally {app.dispose();}
});
