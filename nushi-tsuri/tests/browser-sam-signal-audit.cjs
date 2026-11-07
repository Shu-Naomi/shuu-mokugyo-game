// TESTS ONLY. Independent Chromium signal capability audit, NOT a game or
// alignment-controller test. No runtime/artwork edits, server, or performance
// measurement. Run only in the authorized browser CI environment.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawn } = require('node:child_process');

const EXPECTED_PLAYWRIGHT = '1.63.0';
const EXPECTED_CHROMIUM = '153.0.8010.12';
const WIDTH = 844, HEIGHT = 390;
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
const provenance = [
  { subject: 'Supported noDefaults option; only the default context is affected',
    url: 'https://github.com/microsoft/playwright/blob/v1.63.0/docs/src/api/class-browsertype.md#option-browsertypeconnectovercdpnodefaults' },
  { subject: 'Playwright focus emulation is enabled unless the default-context noDefaults guard applies',
    url: 'https://github.com/microsoft/playwright/blob/v1.63.0/packages/playwright-core/src/server/chromium/crPage.ts#L542-L548' },
  { subject: 'Focus emulation increments a per-handler capturer count; false on a fresh CDP session does not release another handler',
    url: 'https://github.com/chromium/chromium/blob/153.0.8010.12/content/browser/devtools/protocol/emulation_handler.cc#L1004-L1017' },
  { subject: 'Focused-page emulation forces visible state and suppresses visibilitychange',
    url: 'https://developer.chrome.com/docs/devtools/rendering/apply-effects#emulate_a_focused_page' },
  { subject: 'DPR emulation preserves the original compositor scale separately from exposed screen metrics',
    url: 'https://github.com/chromium/chromium/blob/153.0.8010.12/third_party/blink/renderer/core/frame/screen_metrics_emulator.cc' },
  { subject: 'Unchanged forwarded emulation parameters return before media-query invalidation',
    url: 'https://github.com/chromium/chromium/blob/153.0.8010.12/third_party/blink/renderer/core/inspector/dev_tools_emulator.cc#L275-L328' },
  { subject: 'Physical ResizeObserver sizes derive from layout and paint boxes',
    url: 'https://github.com/chromium/chromium/blob/153.0.8010.12/third_party/blink/renderer/core/resize_observer/resize_observer_utilities.cc' }
];

function configuration(env) {
  assert.ok(env.SAM_HEADED === undefined || ['0', '1'].includes(env.SAM_HEADED), 'SAM_HEADED must be 0 or 1');
  return { scope: 'browser-signal-capability-audit-only', headed: env.SAM_HEADED === '1',
    width: WIDTH, height: HEIGHT, dprSequence: [1, 1.125, 1],
    notRun: ['game', 'alignment-controller', 'runtime-art-verification', 'visual-restoration', 'performance'] };
}

function chromiumArguments(profile, headed) {
  // Official bundled executable, fresh disposable profile, loopback-only CDP.
  // Deliberately no sandbox/security bypass or background-throttling switches.
  return [
    `--user-data-dir=${profile}`, '--remote-debugging-address=127.0.0.1', '--remote-debugging-port=0',
    '--no-first-run', '--no-default-browser-check', '--window-size=1000,700',
    ...(!headed ? ['--headless=new'] : []), 'about:blank'
  ];
}

async function launchStandalone(chromium, headed) {
  const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'sam-signal-audit-'));
  const args = chromiumArguments(profile, headed);
  const child = spawn(chromium.executablePath(), args, { stdio: ['ignore', 'ignore', 'pipe'] });
  let stderr = '', closed = false;
  const exited = new Promise(resolve => child.once('close', (code, signal) => {
    closed = true; resolve({ code, signal });
  }));
  // A launch failure is reported, never retried with weaker browser security.
  const endpoint = new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(Error(`Chromium did not expose CDP within 15 s: ${stderr}`)), 15000);
    const finish = (error, value) => {
      clearTimeout(timeout);
      if (error) reject(error); else resolve(value);
    };
    child.once('error', error => finish(error));
    child.once('exit', (code, signal) => finish(Error(`Chromium exited before connection (${code}, ${signal}): ${stderr}`)));
    child.stderr.on('data', chunk => {
      stderr = (stderr + chunk.toString()).slice(-8192);
      const match = stderr.match(/DevTools listening on (ws:\/\/127\.0\.0\.1:\d+\/devtools\/browser\/[^\s]+)/);
      if (match) finish(null, match[1]);
    });
  });
  const close = async () => {
    if (!closed) child.kill('SIGTERM');
    await Promise.race([exited, delay(3000)]);
    if (!closed) { child.kill('SIGKILL'); await Promise.race([exited, delay(3000)]); }
    assert.ok(closed, 'Standalone Chromium process exited before its profile is removed');
    fs.rmSync(profile, { recursive: true, force: true });
  };
  try { return { endpoint: await endpoint, args: args.map(arg => arg.startsWith('--user-data-dir=') ? '--user-data-dir=<fresh-temp-profile>' : arg), close }; }
  catch (error) { await close(); throw error; }
}

function installSignalProbe() {
  const events = [], removers = [], observers = [], queries = [];
  let sequence = 0, droppedEvents = 0;
  const push = (kind, data = {}) => {
    events.push({ sequence: ++sequence, time: performance.now(), kind,
      dpr: devicePixelRatio, hidden: document.hidden, visibilityState: document.visibilityState, ...data });
    if (events.length > 256) { events.shift(); droppedEvents++; }
  };
  const listen = (target, name, kind = name) => {
    const handler = event => push(kind, { isTrusted: event.isTrusted, matches: event.matches,
      propertyName: event.propertyName, targetId: event.target?.id || null });
    target.addEventListener(name, handler);
    removers.push(() => target.removeEventListener(name, handler));
  };
  for (const name of ['visibilitychange', 'freeze', 'resume']) listen(document, name);
  for (const name of ['resize', 'pagehide', 'pageshow', 'focus', 'blur']) listen(window, name);
  if (visualViewport) listen(visualViewport, 'resize', 'visual-viewport-resize');
  const watchQuery = (label, dpr) => {
    const query = matchMedia(`(resolution: ${dpr}dppx)`);
    queries.push({ label, dpr, query });
    listen(query, 'change', `media-query:${label}`);
  };
  watchQuery('original-1', 1);
  watchQuery('original-1.125', 1.125);
  const fixed = document.querySelector('#fixed-probe'), physicalSupport = { observeAccepted: false, error: null };
  const dimensions = box => {
    const value = Array.isArray(box) ? box[0] : box;
    return value ? { inlineSize: value.inlineSize, blockSize: value.blockSize } : null;
  };
  const observe = box => {
    const observer = new ResizeObserver(entries => {
      for (const entry of entries) push(`resize-observer:${box}`, {
        targetId: entry.target.id, contentBox: dimensions(entry.contentBoxSize),
        physicalBox: dimensions(entry.devicePixelContentBoxSize),
        contentRect: { width: entry.contentRect.width, height: entry.contentRect.height }
      });
    });
    observers.push(observer);
    observer.observe(fixed, { box });
  };
  observe('content-box');
  try { observe('device-pixel-content-box'); physicalSupport.observeAccepted = true; }
  catch (error) { physicalSupport.error = String(error); }
  const mover = document.querySelector('#mover');
  for (const name of ['transitionrun', 'transitionstart', 'transitionend', 'transitioncancel']) listen(mover, name);
  const canvas = document.querySelector('canvas'), ctx = canvas.getContext('2d');
  ctx.fillStyle = '#0984e3'; ctx.fillRect(0, 0, 16, 32);
  ctx.fillStyle = '#fdcb6e'; ctx.fillRect(16, 0, 16, 32);
  window.signalProbe = {
    snapshot() {
      const rect = fixed.getBoundingClientRect();
      // Read every retained query before constructing any fresh one. This
      // distinguishes cached matches from a newly evaluated query result.
      const retainedQueries = queries.map(({ label, dpr, query }) => ({ label, dpr, existingMatches: query.matches }));
      return { sequence, droppedEvents, dpr: devicePixelRatio, hidden: document.hidden,
        visibilityState: document.visibilityState, focused: document.hasFocus(),
        viewport: { width: innerWidth, height: innerHeight },
        visualViewport: visualViewport ? { width: visualViewport.width, height: visualViewport.height, scale: visualViewport.scale } : null,
        fixedBox: { x: rect.x, y: rect.y, width: rect.width, height: rect.height }, physicalSupport: { ...physicalSupport },
        queries: retainedQueries.map(({ label, dpr, existingMatches }) => ({ label, dpr, existingMatches,
          freshMatches: matchMedia(`(resolution: ${dpr}dppx)`).matches })), events: events.slice() };
    },
    addCurrentQuery(label) { watchQuery(label, devicePixelRatio); },
    cleanup() { for (const remove of removers) remove(); for (const observer of observers) observer.disconnect(); }
  };
}

const FIXTURE = `<!doctype html><meta charset="utf-8"><title>Sam browser signal audit only</title>
<style>body{margin:0}#fixed-probe{position:absolute;left:12px;top:12px;width:100px;height:80px;background:#ddd}
#mover{position:absolute;left:12px;top:110px;width:32px;height:32px;transition:transform 160ms linear}
canvas{display:block;width:32px;height:32px;image-rendering:pixelated}</style>
<div id="fixed-probe"></div><div id="mover"><canvas width="32" height="32"></canvas></div>`;

function dprEvidence(before, after, expectedDpr) {
  const delivered = after.events.filter(event => event.sequence > before.sequence);
  const browserSignals = delivered.filter(event => event.isTrusted &&
    (event.kind.startsWith('media-query:') || ['resize', 'visual-viewport-resize'].includes(event.kind)));
  const lastPhysical = before.events.filter(event => event.kind === 'resize-observer:device-pixel-content-box').at(-1)?.physicalBox;
  const physicalChanges = delivered.filter(event => event.kind === 'resize-observer:device-pixel-content-box' &&
    event.physicalBox && lastPhysical && (event.physicalBox.inlineSize !== lastPhysical.inlineSize ||
      event.physicalBox.blockSize !== lastPhysical.blockSize));
  return { expectedDpr, actualDpr: after.dpr, sameCssViewport: before.viewport.width === after.viewport.width &&
    before.viewport.height === after.viewport.height, sameCssProbeBox: before.fixedBox.width === after.fixedBox.width &&
      before.fixedBox.height === after.fixedBox.height, delivered, browserSignals, physicalChanges,
    notificationObserved: browserSignals.length + physicalChanges.length > 0,
    queries: after.queries, limitation: 'A changed JS DPR without a native notification is recorded as unsupported, not fixed.' };
}

async function auditArm(chromium, config, noDefaults) {
  const arm = { noDefaults, setup: 'Fresh standalone official Chromium; supported connectOverCDP; existing default context only',
    failures: [], dpr: [], metricsCommands: [], background: {},
    limitations: ['No game or alignment controller is loaded. No hardware-display migration is performed.'] };
  const validate = (name, assertion) => {
    try { assertion(); } catch (error) { arm.failures.push({ name, error: error.message }); }
  };
  let launched, browser;
  try {
    launched = await launchStandalone(chromium, config.headed);
    arm.launchArguments = launched.args;
    browser = await chromium.connectOverCDP(launched.endpoint, { noDefaults, timeout: 15000 });
    arm.browserVersion = browser.version();
    validate('pinned-chromium', () => assert.equal(arm.browserVersion, EXPECTED_CHROMIUM));
    const context = browser.contexts()[0];
    assert.ok(context, 'Use the existing default context; new contexts would re-enable Playwright overrides');
    const page = context.pages()[0] || await context.newPage();
    page.setDefaultTimeout(5000);
    const cdp = await context.newCDPSession(page);
    const metrics = deviceScaleFactor => ({ width: WIDTH, height: HEIGHT, deviceScaleFactor, mobile: false });
    // This session changes metrics only. Sending focus=false here would not
    // release the capturer handle held by Playwright's original CDP session.
    arm.metricsCommands.push(metrics(1));
    await cdp.send('Emulation.setDeviceMetricsOverride', arm.metricsCommands.at(-1));
    await page.setContent(FIXTURE);
    await page.evaluate(installSignalProbe);
    await page.bringToFront();
    await delay(250);
    arm.initial = await page.evaluate(() => window.signalProbe.snapshot());
    validate('initial-dpr', () => assert.equal(arm.initial.dpr, 1));
    validate('initial-physical-observation', () => assert.ok(arm.initial.events.some(event =>
      event.kind === 'resize-observer:device-pixel-content-box' && event.physicalBox)));
    for (const [index, expectedDpr] of [1.125, 1].entries()) {
      const before = await page.evaluate(() => window.signalProbe.snapshot());
      arm.metricsCommands.push(metrics(expectedDpr));
      await cdp.send('Emulation.setDeviceMetricsOverride', arm.metricsCommands.at(-1));
      await delay(300); // Finite observation window, not a DPR watcher or controller wake.
      const after = await page.evaluate(() => window.signalProbe.snapshot());
      const evidence = dprEvidence(before, after, expectedDpr);
      arm.dpr.push({ ...evidence, before, after });
      validate(`dpr-${index}-value-and-fixed-css-size`, () => {
        assert.equal(evidence.actualDpr, expectedDpr); assert.equal(evidence.sameCssViewport, true);
        assert.equal(evidence.sameCssProbeBox, true);
      });
      validate(`dpr-${index}-native-notification`, () => assert.equal(evidence.notificationObserved, true));
      await page.evaluate(label => window.signalProbe.addCurrentQuery(label), `created-after-step-${index}`);
    }
    const beforeMotion = await page.evaluate(() => window.signalProbe.snapshot());
    await page.evaluate(() => { document.querySelector('#mover').style.transform = 'translateX(64px)'; });
    await delay(300);
    const afterMotion = await page.evaluate(() => window.signalProbe.snapshot());
    arm.transition = { events: afterMotion.events.filter(event => event.sequence > beforeMotion.sequence),
      transform: await page.locator('#mover').evaluate(node => getComputedStyle(node).transform) };
    validate('native-transform-transition', () => assert.ok(arm.transition.events.some(event =>
      event.kind === 'transitionend' && event.isTrusted && event.propertyName === 'transform')));

    const foreground = await context.newPage();
    foreground.setDefaultTimeout(5000);
    await foreground.setContent('<!doctype html><title>Foreground tab for visibility audit</title><p>Foreground tab</p>');
    const foregroundCdp = await context.newCDPSession(foreground);
    const browserCdp = await browser.newBrowserCDPSession();
    const originalTarget = (await cdp.send('Target.getTargetInfo')).targetInfo.targetId;
    const foregroundTarget = (await foregroundCdp.send('Target.getTargetInfo')).targetInfo.targetId;
    arm.background.windows = {
      original: await browserCdp.send('Browser.getWindowForTarget', { targetId: originalTarget }),
      foreground: await browserCdp.send('Browser.getWindowForTarget', { targetId: foregroundTarget })
    };
    await page.bringToFront();
    await delay(100);
    arm.background.before = await page.evaluate(() => window.signalProbe.snapshot());
    await foreground.bringToFront();
    // Host polling of genuine state is bounded and diagnostic only. A hidden
    // document's rAF is not a reliable waitForFunction scheduler.
    for (let attempt = 0; attempt < 10; attempt++) {
      await delay(100);
      arm.background.afterTabSwitch = await page.evaluate(() => window.signalProbe.snapshot());
      arm.background.hostReads = attempt + 1;
      if (arm.background.afterTabSwitch.hidden) break;
    }
    const hidden = arm.background.afterTabSwitch.hidden;
    const switchEvents = arm.background.afterTabSwitch.events.filter(event => event.sequence > arm.background.before.sequence);
    arm.background.hiddenObserved = hidden;
    arm.background.trustedHiddenEvent = switchEvents.some(event => event.kind === 'visibilitychange' && event.isTrusted && event.hidden);
    arm.background.freezeAttempted = hidden;
    if (hidden) {
      try {
        await cdp.send('Page.setWebLifecycleState', { state: 'frozen' });
        await delay(250); // No page evaluation while frozen.
      } finally {
        await cdp.send('Page.setWebLifecycleState', { state: 'active' });
      }
    } else arm.background.freezeSkippedReason = 'Actual document.hidden never became true; visible-page freeze would not test background suspension.';
    await page.bringToFront();
    await delay(250);
    arm.background.afterResume = await page.evaluate(() => window.signalProbe.snapshot());
    const lifecycleEvents = arm.background.afterResume.events.filter(event => event.sequence > arm.background.before.sequence);
    arm.background.events = lifecycleEvents;
    arm.background.trustedFreeze = lifecycleEvents.some(event => event.kind === 'freeze' && event.isTrusted && event.hidden);
    arm.background.trustedResume = lifecycleEvents.some(event => event.kind === 'resume' && event.isTrusted);
    validate('complete-bounded-event-record', () => assert.equal(arm.background.afterResume.droppedEvents, 0));
    // The default-overrides arm is a control, not expected to have genuine
    // hidden events. The noDefaults candidate must satisfy every assertion.
    if (noDefaults) {
      validate('same-window-background-tabs', () => assert.equal(arm.background.windows.original.windowId, arm.background.windows.foreground.windowId));
      validate('actual-hidden-event', () => {
        assert.equal(hidden, true); assert.equal(arm.background.trustedHiddenEvent, true);
      });
      validate('actual-frozen-and-resumed-events', () => {
        assert.equal(arm.background.trustedFreeze, true); assert.equal(arm.background.trustedResume, true);
        assert.equal(arm.background.afterResume.hidden, false);
      });
    }
    await page.evaluate(() => window.signalProbe.cleanup());
    arm.cleanup = 'Fixture event listeners and observers removed; standalone browser is closed below.';
  } catch (error) { arm.failures.push({ name: 'terminal-audit-error', error: error.stack || String(error) }); }
  finally {
    if (browser) {
      try { await (await browser.newBrowserCDPSession()).send('Browser.close'); } catch { /* Process cleanup remains mandatory. */ }
      await browser.close().catch(() => {});
    }
    if (launched) {
      try { await launched.close(); arm.processCleanup = 'exited-and-profile-removed'; }
      catch (error) { arm.failures.push({ name: 'process-cleanup', error: error.message }); }
    }
  }
  return arm;
}

function summarize(arms) {
  const control = arms.find(arm => !arm.noDefaults), candidate = arms.find(arm => arm.noDefaults);
  const sameWindow = arm => !!arm?.background.windows &&
    arm.background.windows.original.windowId === arm.background.windows.foreground.windowId;
  return {
    focusOverrideSuppressionDemonstrated: !!control && !!candidate &&
      control.background.hiddenObserved === false && candidate.background.hiddenObserved === true &&
      candidate.background.trustedHiddenEvent === true && sameWindow(control) && sameWindow(candidate),
    noDefaultsRealFreezeResumeObserved: candidate?.background.trustedFreeze === true && candidate?.background.trustedResume === true,
    dprOnlyNativeNotifications: arms.map(arm => ({ noDefaults: arm.noDefaults,
      steps: arm.dpr.map(step => ({ expectedDpr: step.expectedDpr, actualDpr: step.actualDpr,
        notificationObserved: step.notificationObserved })) })),
    gameOrControllerPass: false
  };
}

async function main() {
  const config = configuration(process.env);
  const output = path.join(__dirname, 'browser-evidence-sam-alignment', `browser-signal-audit-${config.headed ? 'headed' : 'headless'}`);
  fs.mkdirSync(output, { recursive: true });
  const result = { study: config.scope, configuration: config, expectedPlaywright: EXPECTED_PLAYWRIGHT,
    expectedChromium: EXPECTED_CHROMIUM, provenance, arms: [], failures: [],
    limitations: [
      'Capability audit only. The game, alignment controller, artwork, screenshots, and performance are not tested.',
      'No fake DOM visibility, dispatched events, controller wakes, or software polling substitutes for native signals.',
      'Headed Xvfb is not a physical display change or a mobile browser.',
      'Both arms use identical launch flags. noDefaults changes documented focus, media, and download defaults; this fixture has no media-dependent styles or downloads.',
      'DPR diagnostics use fixed CSS dimensions and real CDP emulation. A changed exposed DPR is not proof of a hardware/compositor pixel-size change.',
      'Unsupported DPR or background signals remain explicit failures; collecting diagnostic JSON does not make them pass.'
    ] };
  try {
    result.actualPlaywright = require('playwright/package.json').version;
    assert.equal(result.actualPlaywright, EXPECTED_PLAYWRIGHT, 'Source audit is pinned to this exact Playwright version');
    const { chromium } = require('playwright');
    for (const noDefaults of [false, true]) result.arms.push(await auditArm(chromium, config, noDefaults));
    result.findings = summarize(result.arms);
    result.failures = result.arms.flatMap(arm => arm.failures.map(failure => ({ noDefaults: arm.noDefaults, ...failure })));
  } catch (error) { result.failures.push({ name: 'audit-setup', error: error.stack || String(error) }); }
  result.status = result.failures.length ? 'completed-with-failed-or-unsupported-capabilities' : 'capability-checks-passed-only';
  fs.writeFileSync(path.join(output, 'browser-signal-results.json'), JSON.stringify(result, null, 2));
  console.log(JSON.stringify({ status: result.status, findings: result.findings, failures: result.failures, output }, null, 2));
  if (result.failures.length) process.exitCode = 1;
}

module.exports = { configuration, chromiumArguments, dprEvidence, summarize };
if (require.main === module) main().catch(error => { console.error(error); process.exitCode = 1; });
