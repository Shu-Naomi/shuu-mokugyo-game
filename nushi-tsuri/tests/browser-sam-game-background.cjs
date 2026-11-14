// TESTS ONLY. Actual original game, unchanged experimental controller, native
// clock and desktop mouse at 844x390. This is not the independent DOM fixture,
// a mobile-touch run, visual-restoration study, or performance measurement.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
const MODES = ['per-frame', 'integer-nearest', 'integer-fit'];
const WIDTH = 844, HEIGHT = 390;

function configuration(env) {
  assert.equal(env.SAM_HEADED, '1', 'Focused real-background run requires SAM_HEADED=1 under the authorized Xvfb CI');
  return { scope: 'original-game-background-and-dpr-only', headed: true, width: WIDTH, height: HEIGHT,
    pointer: 'native desktop mouse', mobileTouch: false, clock: 'native, unmocked', modes: MODES,
    notRun: ['visual-pairs', 'exact-screenshot-restoration', 'contact-sheets', 'route-shop-regression', 'performance', 'mobile-touch'] };
}

function metricsForDpr(dpr) {
  // Match the fixed desktop screen fields sent by Playwright v1.63's public
  // setViewportSize. After a screenshot, the next command changes only DPR.
  return { width: WIDTH, height: HEIGHT, deviceScaleFactor: dpr, mobile: false,
    screenWidth: WIDTH, screenHeight: HEIGHT, screenOrientation: { angle: 0, type: 'landscapePrimary' } };
}

function readViewportSnapshot() {
  return { viewport: { width: innerWidth, height: innerHeight }, dpr: devicePixelRatio,
    screen: { width: window.screen.width, height: window.screen.height,
      orientation: window.screen.orientation ? { type: window.screen.orientation.type, angle: window.screen.orientation.angle } : null } };
}

async function normalizeViewport(page, cdp) {
  const read = () => page.evaluate(readViewportSnapshot);
  const before = await read();
  // Establish the viewport through Playwright's own session before loading the
  // fixture. A custom CDP session alone leaves Playwright's capture session with
  // native-window metrics, which Chromium restores after captureScreenshot.
  // Public setViewportSize preserves the noDefaults/focus-emulation choice.
  await page.setViewportSize({ width: WIDTH, height: HEIGHT });
  await cdp.send('Emulation.setDeviceMetricsOverride', metricsForDpr(1));
  const after = await read(), playwrightViewport = page.viewportSize();
  assert.deepEqual(playwrightViewport, { width: WIDTH, height: HEIGHT });
  assert.deepEqual(after.viewport, playwrightViewport, 'Actual initial CSS viewport agrees with Playwright capture state');
  assert.equal(after.dpr, 1);
  assert.equal(after.screen.width, WIDTH); assert.equal(after.screen.height, HEIGHT);
  return { before, after, playwrightViewport, command: metricsForDpr(1), method: 'Public Playwright viewport followed by initial CDP DPR 1, before fixture navigation',
    provenance: [
      'https://github.com/microsoft/playwright/blob/v1.63.0/packages/playwright-core/src/server/chromium/crPage.ts#L962-L1014',
      'https://github.com/microsoft/playwright/blob/v1.63.0/packages/playwright-core/src/server/chromium/crPage.ts#L275-L297',
      'https://github.com/chromium/chromium/blob/153.0.8010.12/content/browser/devtools/protocol/page_handler.cc#L1453-L1468',
      'https://github.com/chromium/chromium/blob/153.0.8010.12/content/browser/devtools/protocol/page_handler.cc#L1894-L1902'
    ] };
}

function assertDprStepIsolation(before, after, expectedBeforeDpr, expectedAfterDpr) {
  assert.deepEqual(before.viewport, { width: WIDTH, height: HEIGHT }, 'DPR step starts at the expected CSS viewport');
  assert.deepEqual(after.viewport, before.viewport, 'DPR-only step must not change either CSS viewport dimension');
  assert.equal(before.dpr, expectedBeforeDpr, 'Expected DPR before the isolated change');
  assert.equal(after.dpr, expectedAfterDpr, 'Expected DPR after the isolated change');
  assert.ok(before.screen && after.screen, 'Screen metadata must be recorded on both sides');
  assert.deepEqual(after.screen, before.screen, 'DPR-only step must not change screen dimensions or orientation');
}

function assertFrame(frame, mode) {
  const near = (value, tolerance, name) => assert.ok(Number.isFinite(value) && Math.abs(value) <= tolerance, `${name}: ${value}`);
  near(frame.residual.x, .002, 'Device-grid x residual');
  near(frame.residual.y, .002, 'Device-grid y residual');
  near(frame.maxLayerDelta, .01, 'Whole-map layer registration');
  assert.ok(Number.isFinite(frame.playerFeet.x) && Number.isFinite(frame.playerFeet.y));
  assert.ok(frame.npcFeetMaximumErrorCSS < 1, 'NPC feet remain registered');
  if (mode.startsWith('integer-')) {
    near(frame.scale.x - Math.round(frame.scale.x), 1e-6, 'Integer x scale');
    near(frame.scale.y - Math.round(frame.scale.y), 1e-6, 'Integer y scale');
  }
}

function assertSuspended(before, after) {
  assert.equal(before.hidden, true, 'Suspension baseline must actually be hidden');
  assert.equal(before.status.pendingRaf, false, 'Suspension baseline has already canceled alignment work');
  assert.equal(after.hidden, true, 'Document remains genuinely hidden');
  assert.equal(after.status.pendingRaf, false, 'No alignment frame is pending while hidden');
  assert.equal(after.updates, before.updates, 'No alignment updates while suspended');
  assert.equal(after.timing.callbackSources.raf?.callbacks || 0, before.timing.callbackSources.raf?.callbacks || 0,
    'No alignment rAF callbacks while suspended');
  // Native event/observer bookkeeping is reported separately, never hidden or
  // conflated with alignment updates. The original game still owns timers/rAF.
}

function assertCleanup(snapshot, originalOwned) {
  assert.deepEqual(snapshot.owned, originalOwned, 'All controller-owned style values and priorities restored');
  assert.equal(snapshot.status.active, false);
  assert.equal(snapshot.status.listeners, 0); assert.equal(snapshot.status.observers, 0);
  assert.equal(snapshot.status.pendingRaf, false); assert.equal(snapshot.status.probeEnabled, false);
  assert.equal(snapshot.timing.allSchedulerCallbacks.callbacks, 0, 'No controller callback survives restore');
}

function summarize(modes) {
  const complete = MODES.every(mode => modes.some(result => result.mode === mode));
  return { allBackgroundCasesPassed: complete && modes.every(result => result.backgroundStatus === 'passed'),
    allDprCasesPassed: complete && modes.every(result => result.dprStatus === 'passed'),
    fullStudyPass: false, mobileTouchValidated: false };
}

async function waitForTrustedHiddenResume(read, wait = delay, { attempts = 20, intervalMs = 50 } = {}) {
  // CDP command completion does not guarantee that the document's resume event
  // has run. Observe it with bounded host waits, never a hidden-page rAF waiter.
  let last;
  for (let index = 0; index < attempts; index++) {
    if (index) await wait(intervalMs);
    last = await read();
    if (last.events.some(event => event.type === 'resume' && event.trusted && event.hidden)) {
      return { observed: true, reads: index + 1, last };
    }
  }
  return { observed: false, reads: attempts, last, timeout: `No trusted hidden resume event after ${attempts} reads and at most ${(attempts - 1) * intervalMs} ms of host waits` };
}

function installEvidence() {
  const frames = [], events = [], removers = [];
  let droppedFrames = 0, droppedEvents = 0, phase = 'startup';
  const owned = () => [[document.querySelector('#map'), ['translate', 'scale', 'clip-path']],
    [document.querySelector('#world'), ['background-color']]].flatMap(([node, properties]) => properties.map(property =>
      [node.id, property, node.style.getPropertyValue(property), node.style.getPropertyPriority(property)]));
  const snapshot = () => ({ hidden: document.hidden, visibilityState: document.visibilityState,
    updates: frames.length + droppedFrames, status: samAlignment.status(), timing: samAlignment.timing(),
    owned: owned(), world: { x: s.x, y: s.y, direction: s.direction },
    viewport: { width: innerWidth, height: innerHeight }, dpr: devicePixelRatio,
    screen: { width: window.screen.width, height: window.screen.height,
      orientation: window.screen.orientation ? { type: window.screen.orientation.type, angle: window.screen.orientation.angle } : null },
    menu: fieldMenuIsOpen(), modal: !!document.querySelector('.modal.open'),
    moving: document.querySelector('#map').getAnimations().some(animation =>
      animation.transitionProperty === 'transform' && (animation.playState === 'running' || animation.pending)) });
  const probe = () => {
    const p = samAlignmentMetrics(), base = p.layers[0];
    const visible = p.layers.filter(layer => layer.display !== 'none' && layer.rect.width);
    frames.push({ phase, time: performance.now(), dpr: p.dpr, residual: base.originResidual,
      scale: base.physicalScale, transform: p.map.computedTransform,
      maxLayerDelta: Math.max(0, ...visible.flatMap(layer => ['x', 'y', 'width', 'height'].map(key => Math.abs(layer.rect[key] - base.rect[key])))),
      playerFeet: p.player.normalizedFeet,
      npcFeetMaximumErrorCSS: Math.max(0, ...p.npcFeet.flatMap(npc => [npc.errorCSS.x, npc.errorCSS.y])) });
    if (frames.length > 2000) { frames.shift(); droppedFrames++; }
  };
  window.samBackgroundEvidence = {
    snapshot, probe, owned,
    setPhase(value) { phase = value; },
    attachEvents() {
      // Called after controller start, so status reflects the controller's
      // synchronous cancellation/recovery for the same native event.
      for (const type of ['visibilitychange', 'freeze', 'resume']) {
        const listener = event => {
          events.push({ type, trusted: event.isTrusted, phase, ...snapshot() });
          if (events.length > 128) { events.shift(); droppedEvents++; }
        };
        document.addEventListener(type, listener);
        removers.push(() => document.removeEventListener(type, listener));
      }
    },
    all() { return { frames, events, droppedFrames, droppedEvents }; },
    cleanup() { for (const remove of removers.splice(0)) remove(); }
  };
}

async function runMode(chromium, helpers, url, mode, output, checkpoint) {
  const { launchStandalone, EXPECTED_CHROMIUM } = require('./browser-sam-signal-audit.cjs');
  const { saveKey } = require('./game-harness.cjs');
  const enter = require('./browser-start-adventure.cjs');
  const report = { mode, failures: [], stages: [], inputs: [], background: {}, dpr: [], errors: [], httpErrors: [],
    backgroundStatus: 'not-completed', dprStatus: 'not-completed',
    accounting: 'Zero suspended alignment work means zero updates and rAF callbacks. All event/observer callbacks remain in timing; lifecycle bookkeeping and original game timers are not claimed to be zero.' };
  const validate = (name, check, scope = 'background') => {
    try { check(); } catch (error) { report.failures.push({ name, scope, error: error.stack || String(error) }); }
  };
  let launched, browser, page, foreground, cdp, freezeRequested = false;
  const snapshot = () => page.evaluate(() => samBackgroundEvidence.snapshot());
  async function press(selector) {
    const target = page.locator(selector);
    const before = await target.evaluate(node => ({ sequence: samInputEvidence.sequence,
      target: node.dataset.move ? `move:${node.dataset.move}` : node.id || null,
      expected: node.dataset.move ? ShuWorldLife.moveTarget(s.x, s.y, node.dataset.move, 4, isWalkableWorld) : null }));
    await target.click();
    const after = await page.evaluate(sequence => ({ events: samInputEvidence.events.filter(event => event.sequence > sequence),
      world: { x: s.x, y: s.y }, released: samInputEvidence.snapshot() }), before.sequence);
    helpers.assertPressReleased(after.events, before.target, 'mouse');
    assert.deepEqual(after.released.down, []); assert.deepEqual(after.released.captured, []);
    assert.equal(after.released.moveHoldInterval, 0);
    if (before.expected) assert.deepEqual(after.world, before.expected, 'Native pointer input follows original collision/movement logic');
    report.inputs.push({ selector, before, events: after.events, world: after.world });
  }
  async function stage(name, action, wait = 800, scope = 'background') {
    await page.evaluate(name => samBackgroundEvidence.setPhase(name), name);
    const before = await snapshot();
    try { if (action) await action(); }
    catch (error) { report.failures.push({ name, scope, error: error.stack || String(error) }); }
    await delay(wait);
    const after = await snapshot();
    report.stages.push({ name, before, after }); checkpoint(report);
    return { before, after };
  }
  const unchangedState = () => page.evaluate(() => JSON.parse(JSON.stringify({ money: s.money, hp: s.hp,
    time: s.gameMinutes, caught: s.caught, baits: s.baits, equipment: s.equipment, quests: s.questCompletions })));
  const sourceHash = () => page.evaluate(async () => {
    const canvas = document.querySelector('#worldPixels');
    const rgba = canvas.getContext('2d').getImageData(0, 0, canvas.width, canvas.height).data;
    const digest = await crypto.subtle.digest('SHA-256', rgba);
    return { width: canvas.width, height: canvas.height,
      sha256: [...new Uint8Array(digest)].map(value => value.toString(16).padStart(2, '0')).join('') };
  });
  try {
    launched = await launchStandalone(chromium, true); report.launchArguments = launched.args;
    browser = await chromium.connectOverCDP(launched.endpoint, { noDefaults: true, timeout: 15000 });
    report.browserVersion = browser.version(); assert.equal(report.browserVersion, EXPECTED_CHROMIUM);
    const context = browser.contexts()[0]; assert.ok(context, 'Use existing default context only');
    await context.addInitScript(helpers.installInputEvidence);
    await context.addInitScript(({ key, state }) => {
      // Fresh disposable profile. Normal fixture setup, no visibility/clock or
      // game movement overrides. Identical seed/random source to the full study.
      if (location.protocol === 'http:') {
        if (!localStorage.getItem(key)) localStorage.setItem(key, JSON.stringify(state));
        localStorage.setItem('nushi-inugoya-options-v1', JSON.stringify({ textSpeed: 'instant' }));
      }
      Math.random = () => .999999;
    }, { key: saveKey, state: helpers.initial() });
    page = context.pages()[0] || await context.newPage(); page.setDefaultTimeout(15000);
    page.on('pageerror', error => report.errors.push(error.message));
    page.on('console', message => { if (message.type() === 'error') report.errors.push(message.text()); });
    page.on('response', response => { if (response.status() >= 400) report.httpErrors.push(`${response.status()} ${response.url()}`); });
    cdp = await context.newCDPSession(page);
    report.viewportSetup = await normalizeViewport(page, cdp);
    await page.goto(url, { waitUntil: 'load' }); await page.bringToFront();
    report.fixtureViewport = await page.evaluate(readViewportSnapshot);
    assertDprStepIsolation(report.viewportSetup.after, report.fixtureViewport, 1, 1);
    assert.equal(await page.locator('.landscape-warning').isVisible(), false, 'Original orientation guard is not bypassed');
    await enter(page, false);
    if (await page.locator('#lakeIntroSkip').isVisible()) await press('#lakeIntroSkip');
    await page.waitForFunction(() => {
      const canvas = document.querySelector('#worldPixels');
      return canvas?.style.backgroundImage === 'none' && canvas.width > 0 && canvas.height > 0 &&
        document.querySelector('canvas[data-for="worldPixels"][data-scene="world"]');
    }, null, { polling: 50 });
    await delay(1500);
    if (await page.locator('#fieldMenu.show').count()) await press('#fieldMenuClose');
    await page.evaluate(helpers.installController); await page.evaluate(helpers.installMetrics, helpers.LAYERS);
    await page.evaluate(installEvidence);
    report.originalOwned = await page.evaluate(() => samBackgroundEvidence.owned());
    report.originalState = await unchangedState(); report.originalSource = await sourceHash();
    const startup = await stage('startup', () => page.evaluate(mode => {
      samAlignment.start(mode, { diagnostics: true }); samAlignment.observeUpdates(samBackgroundEvidence.probe);
      samBackgroundEvidence.attachEvents();
    }, mode));
    validate('startup-update-and-stop', () => {
      assert.ok(startup.after.updates > startup.before.updates); assert.equal(startup.after.status.pendingRaf, false);
    });
    const move = await helpers.cameraChangingMove(page), opposite = { up: 'down', down: 'up', left: 'right', right: 'left' };
    const movement = await stage('native-repeated-interrupted-movement', async () => {
      for (const direction of [move.direction, opposite[move.direction], move.direction, opposite[move.direction]]) {
        await press(`[data-move="${direction}"]`); await delay(65);
      }
    });
    validate('native-moving-controller-updates', () => {
      assert.ok(movement.after.updates > movement.before.updates + 2);
      assert.ok(movement.after.timing.wakes.transitioncancel > 0, 'Real transitions were interrupted/replaced');
      assert.equal(movement.after.status.pendingRaf, false);
    });

    foreground = await context.newPage(); await foreground.setContent('<!doctype html><title>Foreground for original-game background test</title>Foreground tab');
    const foregroundCdp = await context.newCDPSession(foreground), browserCdp = await browser.newBrowserCDPSession();
    const originalTarget = (await cdp.send('Target.getTargetInfo')).targetInfo.targetId;
    const foregroundTarget = (await foregroundCdp.send('Target.getTargetInfo')).targetInfo.targetId;
    report.background.windows = { original: await browserCdp.send('Browser.getWindowForTarget', { targetId: originalTarget }),
      foreground: await browserCdp.send('Browser.getWindowForTarget', { targetId: foregroundTarget }) };
    validate('same-window-tabs', () => assert.equal(report.background.windows.original.windowId, report.background.windows.foreground.windowId));
    await page.bringToFront(); await delay(100);
    await page.evaluate(() => samBackgroundEvidence.setPhase('background-interruption'));
    report.background.eventStart = await page.evaluate(() => samBackgroundEvidence.all().events.length);
    await press(`[data-move="${move.direction}"]`); await delay(50);
    report.background.before = await snapshot();
    validate('background-interrupts-real-moving-frame', () => {
      assert.equal(report.background.before.hidden, false); assert.equal(report.background.before.moving, true);
      assert.equal(report.background.before.status.pendingRaf, true);
    });
    await foreground.bringToFront();
    for (let attempt = 0; attempt < 10; attempt++) {
      await delay(100); report.background.hidden = await snapshot(); report.background.hostReads = attempt + 1;
      if (report.background.hidden.hidden) break;
    }
    const eventsNow = await page.evaluate(start => samBackgroundEvidence.all().events.slice(start), report.background.eventStart);
    const hiddenEvent = eventsNow.find(event => event.type === 'visibilitychange' && event.hidden);
    validate('genuine-hidden-event-and-cancellation', () => {
      assert.ok(hiddenEvent?.trusted); assert.equal(hiddenEvent.status.pendingRaf, false);
      assertSuspended(hiddenEvent, report.background.hidden);
    });
    if (report.background.hidden.hidden) {
      await delay(300); report.background.hiddenIdle = await snapshot();
      validate('stable-hidden-no-alignment-callbacks', () => assertSuspended(report.background.hidden, report.background.hiddenIdle));
      freezeRequested = true;
      await cdp.send('Page.setWebLifecycleState', { state: 'frozen' }); await delay(350);
      await cdp.send('Page.setWebLifecycleState', { state: 'active' }); freezeRequested = false;
      // Other tab stays foreground. Do not evaluate the page while frozen.
      report.background.resumeObservation = await waitForTrustedHiddenResume(() => page.evaluate(start => ({
        snapshot: samBackgroundEvidence.snapshot(), events: samBackgroundEvidence.all().events.slice(start)
      }), report.background.eventStart));
      validate('trusted-hidden-resume-delivery', () => assert.equal(report.background.resumeObservation.observed, true,
        report.background.resumeObservation.timeout || 'Genuine hidden resume event observed'));
      report.background.resumedHidden = report.background.resumeObservation.last.snapshot;
      const events = report.background.resumeObservation.last.events;
      const freeze = events.find(event => event.type === 'freeze'), resume = events.find(event => event.type === 'resume');
      validate('genuine-freeze-resume-and-zero-alignment', () => {
        assert.ok(freeze?.trusted && resume?.trusted);
        assert.equal(freeze.status.frozen, true); assert.equal(resume.status.frozen, false);
        assertSuspended(freeze, resume); assertSuspended(report.background.hiddenIdle, report.background.resumedHidden);
      });
    } else validate('genuine-freeze-resume-and-zero-alignment', () => assert.fail('Document never became hidden; freeze was not attempted.'));
    const recovery = await stage('foreground-recovery', async () => {
      await page.bringToFront(); await foreground.close(); foreground = null;
    });
    report.background.recovery = recovery;
    report.background.events = await page.evaluate(start => samBackgroundEvidence.all().events.slice(start), report.background.eventStart);
    validate('genuine-foreground-recovery', () => {
      assert.ok(report.background.events.some(event => event.type === 'visibilitychange' && event.trusted && !event.hidden));
      assert.equal(recovery.after.hidden, false); assert.equal(recovery.after.status.frozen, false);
      assert.ok(recovery.after.updates > recovery.before.updates);
      assert.equal(recovery.after.status.pendingRaf, false);
      assert.ok(recovery.after.timing.wakes.visible > 0);
    });
    const idle = await stage('stable-recovered-idle', null, 300);
    validate('stable-recovered-idle', () => {
      assert.equal(idle.after.updates, idle.before.updates); assert.equal(idle.after.status.pendingRaf, false);
      assert.equal(idle.after.timing.callbackSources.raf?.callbacks || 0, idle.before.timing.callbackSources.raf?.callbacks || 0);
    });
    report.recoveredState = await unchangedState(); report.recoveredSource = await sourceHash();
    validate('protected-state-and-original-canvas', () => {
      assert.deepEqual(report.recoveredState, report.originalState); assert.deepEqual(report.recoveredSource, report.originalSource);
    });
    report.recoveryScreenshot = { before: await snapshot(), file: `${mode}-recovered.png` };
    await page.screenshot({ path: path.join(output, report.recoveryScreenshot.file), scale: 'device' });
    await delay(250); // Let any capture-induced native resize appear before measuring DPR.
    report.recoveryScreenshot.after = await snapshot();
    validate('recovery-screenshot-viewport-isolation', () => assertDprStepIsolation(
      report.recoveryScreenshot.before, report.recoveryScreenshot.after, 1, 1), 'dpr');

    // Retain the original real DPR-only update/signal/restore gates, separately
    // from genuine-background results. No dispatch, polling wake or manual apply.
    for (const dpr of [1.125, 1]) {
      const name = dpr === 1 ? 'actual-dpr-restore' : 'actual-dpr-change';
      await page.evaluate(() => samAlignment.resetTiming());
      const test = await stage(name, () => cdp.send('Emulation.setDeviceMetricsOverride', metricsForDpr(dpr)), 350, 'dpr');
      report.dpr.push({ name, command: metricsForDpr(dpr), ...test });
      validate(`${name}-css-viewport-isolation`, () => assertDprStepIsolation(
        test.before, test.after, dpr === 1 ? 1.125 : 1, dpr), 'dpr');
      validate(name, () => {
        assert.equal(test.after.dpr, dpr); assert.deepEqual(test.after.viewport, { width: WIDTH, height: HEIGHT });
        assert.ok(test.after.updates > test.before.updates, 'DPR-only change must reach a real controller update');
      }, 'dpr');
      if (dpr !== 1) validate('actual-dpr-change-signal', () => assert.ok(
        test.after.timing.wakes['dpr-change'] || test.after.timing.wakes['device-pixel-resize'] || test.after.timing.wakes['window-resize'],
        'Same-CSS-size DPR change requires a genuine resolution/device-pixel/window signal'), 'dpr');
    }
    await page.evaluate(() => { samAlignment.restore(); samAlignment.resetTiming(); });
    await stage('restored-native-input-and-resize', async () => {
      await press(`[data-move="${opposite[move.direction]}"]`);
      await cdp.send('Emulation.setDeviceMetricsOverride', { width: WIDTH - 32, height: HEIGHT - 16, deviceScaleFactor: 1, mobile: false });
    });
    report.cleanup = await snapshot();
    validate('complete-controller-cleanup', () => assertCleanup(report.cleanup, report.originalOwned));
    report.evidence = await page.evaluate(() => samBackgroundEvidence.all());
    validate('native-post-update-geometry-and-complete-evidence', () => {
      assert.equal(report.evidence.droppedFrames + report.evidence.droppedEvents, 0);
      for (const frame of report.evidence.frames.filter(frame => !frame.phase.startsWith('actual-dpr-'))) assertFrame(frame, mode);
      assert.ok(new Set(report.evidence.frames.filter(frame => frame.phase === 'native-repeated-interrupted-movement')
        .map(frame => frame.transform)).size > 2, 'Native transform changes sampled by the actual controller');
      assert.ok(report.evidence.frames.some(frame => frame.phase === 'foreground-recovery'), 'Recovery reached actual post-update geometry probe');
    });
    validate('dpr-post-update-geometry', () => {
      for (const frame of report.evidence.frames.filter(frame => frame.phase.startsWith('actual-dpr-'))) assertFrame(frame, mode);
    }, 'dpr');
    validate('browser-and-http-errors', () => { assert.deepEqual(report.errors, []); assert.deepEqual(report.httpErrors, []); });
    await page.evaluate(() => samBackgroundEvidence.cleanup());
    report.dprStatus = report.failures.some(failure => failure.scope === 'dpr') ? 'failed' : 'passed';
    report.backgroundStatus = report.failures.some(failure => failure.scope !== 'dpr') ? 'failed' : 'passed';
  } catch (error) {
    report.failures.push({ name: 'terminal-game-background-error', scope: 'background', error: error.stack || String(error) });
    report.backgroundStatus = 'failed';
  } finally {
    if (freezeRequested && cdp) await cdp.send('Page.setWebLifecycleState', { state: 'active' }).catch(() => {});
    if (page) await page.evaluate(() => { window.samAlignment?.restore(); window.samBackgroundEvidence?.cleanup(); }).catch(() => {});
    if (browser) {
      try { await (await browser.newBrowserCDPSession()).send('Browser.close'); } catch { /* Standalone cleanup remains mandatory. */ }
      await browser.close().catch(() => {});
    }
    if (launched) {
      try { await launched.close(); report.processCleanup = 'exited-and-profile-removed'; }
      catch (error) { report.failures.push({ name: 'process-cleanup', scope: 'background', error: error.message }); report.backgroundStatus = 'failed'; }
    }
    checkpoint(report);
  }
  return report;
}

async function main() {
  const output = path.join(__dirname, 'browser-evidence-sam-alignment', 'original-game-background-headed');
  fs.mkdirSync(output, { recursive: true });
  const result = { study: 'original-game-background-and-dpr-only', modes: [], failures: [],
    limitations: ['Actual game with unmodified experimental controller and original art. Desktop mouse only, not mobile touch.',
      'Background success and DPR-only failures are separate results. Neither implies a complete visual/performance study pass.',
      'No physical-device, Safari, battery, temperature, or hardware-DPR migration claim.'] };
  const write = (name, data) => fs.writeFileSync(path.join(output, name), JSON.stringify(data, null, 2));
  const checkpoint = report => {
    const index = result.modes.findIndex(entry => entry.mode === report.mode);
    if (index < 0) result.modes.push(report); else result.modes[index] = report;
    write('game-background-results.json', result);
  };
  let server;
  try {
    result.configuration = configuration(process.env);
    const { EXPECTED_PLAYWRIGHT } = require('./browser-sam-signal-audit.cjs');
    result.playwrightVersion = require('playwright/package.json').version; assert.equal(result.playwrightVersion, EXPECTED_PLAYWRIGHT);
    const { chromium } = require('playwright');
    const helpers = require('./browser-sam-alignment-experiments.cjs');
    result.pinnedRuntime = helpers.PINNED;
    result.runtime = helpers.verifyRuntime({ writeManifest: write });
    assert.equal(result.runtime.files, 676, 'Verify every pinned runtime/art file before serving the game');
    server = await helpers.serve(); const url = `http://127.0.0.1:${server.address().port}/nushi-tsuri/`;
    for (const mode of MODES) await runMode(chromium, helpers, url, mode, output, checkpoint);
    result.findings = summarize(result.modes);
    result.failures = result.modes.flatMap(report => report.failures.map(failure => ({ mode: report.mode, ...failure })));
  } catch (error) { result.failures.push({ name: 'focused-setup', error: error.stack || String(error) }); }
  finally { if (server) await new Promise(resolve => server.close(resolve)); }
  result.status = result.failures.length ? 'failed-focused-game-background-or-dpr' : 'passed-focused-game-background-and-dpr-only';
  write('game-background-results.json', result);
  console.log(JSON.stringify({ status: result.status, findings: result.findings, failures: result.failures, output }, null, 2));
  if (result.failures.length) process.exitCode = 1;
}

module.exports = { configuration, assertFrame, assertSuspended, assertCleanup, summarize, waitForTrustedHiddenResume,
  normalizeViewport, assertDprStepIsolation, metricsForDpr };
if (require.main === module) main().catch(error => { console.error(error); process.exitCode = 1; });
