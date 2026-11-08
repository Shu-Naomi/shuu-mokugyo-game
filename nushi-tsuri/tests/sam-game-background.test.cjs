// Non-browser contract tests. These do not prove genuine browser visibility,
// freeze/resume or DPR notifications; only authorized CI can provide that evidence.
const assert = require('node:assert/strict');
const test = require('node:test');
const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const { configuration, assertFrame, assertSuspended, assertCleanup, summarize, waitForTrustedHiddenResume } = require('./browser-sam-game-background.cjs');

test('focused game runner and shared helpers import without Playwright, process launch or HTTP server', () => {
  const files = ['browser-sam-game-background.cjs', 'browser-sam-signal-audit.cjs', 'browser-sam-alignment-experiments.cjs'];
  execFileSync(process.execPath, ['-e', `
    const Module = require('node:module');
    const original = Module._load;
    Module._load = function (name, ...args) {
      if (name.includes('playwright')) throw Error('Playwright must not load on import');
      return original.call(this, name, ...args);
    };
    require('node:child_process').spawn = () => { throw Error('Import must not launch a process'); };
    require('node:http').createServer = () => { throw Error('Import must not create a server'); };
    for (const file of ${JSON.stringify(files.map(file => path.join(__dirname, file)))}) require(file);
  `], { encoding: 'utf8' });
});

test('focused game run explicitly requires headed CI and labels mouse and unrun study cases', () => {
  for (const value of [undefined, '0', 'true', '']) assert.throws(() => configuration({ SAM_HEADED: value }), /requires SAM_HEADED=1/);
  const result = configuration({ SAM_HEADED: '1' });
  assert.equal(result.scope, 'original-game-background-and-dpr-only');
  assert.equal(result.pointer, 'native desktop mouse'); assert.equal(result.mobileTouch, false);
  assert.equal(result.clock, 'native, unmocked');
  assert.deepEqual(result.modes, ['per-frame', 'integer-nearest', 'integer-fit']);
  assert.deepEqual(result.notRun, ['visual-pairs', 'exact-screenshot-restoration', 'contact-sheets',
    'route-shop-regression', 'performance', 'mobile-touch']);
});

function frame() {
  return { residual: { x: 0, y: 0 }, maxLayerDelta: 0, playerFeet: { x: .4, y: .5 },
    npcFeetMaximumErrorCSS: .01, scale: { x: 2, y: 2 } };
}
test('actual controller post-update geometry rejects fractional grid, layer drift and noninteger alternatives', () => {
  for (const mode of ['per-frame', 'integer-nearest', 'integer-fit']) assert.doesNotThrow(() => assertFrame(frame(), mode));
  assert.throws(() => assertFrame({ ...frame(), residual: { x: .1, y: 0 } }, 'per-frame'), /grid x/);
  assert.throws(() => assertFrame({ ...frame(), maxLayerDelta: .1 }, 'per-frame'), /registration/);
  assert.throws(() => assertFrame({ ...frame(), npcFeetMaximumErrorCSS: 1.1 }, 'per-frame'), /NPC feet/);
  assert.throws(() => assertFrame({ ...frame(), scale: { x: 1.5, y: 2 } }, 'integer-fit'), /Integer x/);
  assert.throws(() => assertFrame({ ...frame(), residual: { x: NaN, y: 0 } }, 'per-frame'));
});

function suspended() {
  return { hidden: true, updates: 3, status: { pendingRaf: false },
    timing: { callbackSources: { raf: { callbacks: 3 }, event: { callbacks: 1 } } } };
}
test('hidden/frozen gates require genuine hidden state and zero new updates or rAF, while keeping event accounting separate', () => {
  const before = suspended(), after = suspended();
  after.timing.callbackSources.event.callbacks = 3;
  assert.doesNotThrow(() => assertSuspended(before, after));
  assert.throws(() => assertSuspended({ ...before, hidden: false }, after), /actually be hidden/);
  assert.throws(() => assertSuspended(before, { ...after, hidden: false }), /genuinely hidden/);
  assert.throws(() => assertSuspended(before, { ...after, updates: 4 }), /No alignment updates/);
  const scheduled = suspended(); scheduled.status.pendingRaf = true;
  assert.throws(() => assertSuspended(scheduled, after), /already canceled/);
  assert.throws(() => assertSuspended(before, scheduled), /pending/);
  const callback = suspended(); callback.timing.callbackSources.raf.callbacks++;
  assert.throws(() => assertSuspended(before, callback), /rAF callbacks/);
});

test('cleanup requires zero remaining resources and callbacks plus exact owned styles and priorities', () => {
  const original = [['map', 'translate', '2px 3px', 'important'], ['world', 'background-color', 'red', '']];
  const clean = { owned: original, status: { active: false, listeners: 0, observers: 0, pendingRaf: false, probeEnabled: false },
    timing: { allSchedulerCallbacks: { callbacks: 0 } } };
  assert.doesNotThrow(() => assertCleanup(clean, original));
  assert.throws(() => assertCleanup({ ...clean, owned: [] }, original), /styles|style/);
  for (const key of ['active', 'pendingRaf', 'probeEnabled']) assert.throws(() => assertCleanup({ ...clean, status: { ...clean.status, [key]: true } }, original));
  for (const key of ['listeners', 'observers']) assert.throws(() => assertCleanup({ ...clean, status: { ...clean.status, [key]: 1 } }, original));
  assert.throws(() => assertCleanup({ ...clean, timing: { allSchedulerCallbacks: { callbacks: 1 } } }, original), /survives restore/);
});

test('background success never relabels failed DPR or incomplete modes as an overall study pass', () => {
  const results = ['per-frame', 'integer-nearest', 'integer-fit'].map(mode => ({ mode, backgroundStatus: 'passed', dprStatus: 'failed' }));
  assert.deepEqual(summarize(results), { allBackgroundCasesPassed: true, allDprCasesPassed: false,
    fullStudyPass: false, mobileTouchValidated: false });
  assert.equal(summarize(results.slice(0, 2)).allBackgroundCasesPassed, false);
  results[1].backgroundStatus = 'not-completed';
  assert.equal(summarize(results).allBackgroundCasesPassed, false);
});

test('resume delivery waits on the host for a trusted hidden document event, not CDP completion', async () => {
  const states = [[], [{ type: 'resume', trusted: false, hidden: true }],
    [{ type: 'resume', trusted: true, hidden: false }], [{ type: 'resume', trusted: true, hidden: true }]];
  const waits = []; let reads = 0;
  const result = await waitForTrustedHiddenResume(async () => ({ events: states[reads++] }),
    async ms => waits.push(ms), { attempts: 5, intervalMs: 50 });
  assert.equal(result.observed, true); assert.equal(result.reads, 4);
  assert.deepEqual(waits, [50, 50, 50]);
  assert.deepEqual(result.last.events, states[3]);
});

test('missing resume delivery has a bounded explicit failed outcome and retains last evidence', async () => {
  let reads = 0, waits = 0;
  const result = await waitForTrustedHiddenResume(async () => ({ events: [], read: ++reads }),
    async () => waits++, { attempts: 3, intervalMs: 50 });
  assert.equal(result.observed, false); assert.equal(result.reads, 3);
  assert.equal(reads, 3); assert.equal(waits, 2); assert.equal(result.last.read, 3);
  assert.match(result.timeout, /No trusted hidden resume event/);
});

test('focused actual-game source preserves supported connection, real input, DPR gates and original controller', () => {
  const source = fs.readFileSync(path.join(__dirname, 'browser-sam-game-background.cjs'), 'utf8');
  assert.match(source, /chromium\.connectOverCDP\(launched\.endpoint, \{ noDefaults: true, timeout: 15000 \}\)/);
  assert.match(source, /const context = browser\.contexts\(\)\[0\]/);
  assert.doesNotMatch(source, /browser\.newContext\(|\.dispatchEvent\(|Object\.defineProperty\(|page\.clock\.|samAlignment\.apply\(/);
  assert.match(source, /await target\.click\(\)/);
  assert.match(source, /page\.evaluate\(helpers\.installController\)/);
  assert.match(source, /result\.runtime\.files, 676/);
  for (const name of ['actual-dpr-change', 'actual-dpr-change-signal', 'actual-dpr-restore',
    'genuine-hidden-event-and-cancellation', 'genuine-freeze-resume-and-zero-alignment', 'complete-controller-cleanup']) {
    assert.ok(source.includes(name), `Required gate retained: ${name}`);
  }
  assert.match(source, /if \(report\.background\.hidden\.hidden\) \{/);
  assert.match(source, /if \(require\.main === module\) main\(\)/);
});
