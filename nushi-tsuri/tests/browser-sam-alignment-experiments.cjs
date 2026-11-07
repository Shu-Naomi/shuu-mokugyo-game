// TESTS ONLY. Served runtime and artwork must be byte-identical to the pinned
// original. Every experiment is removable browser CSS on the WHOLE #map.
// No production camera, collision, canvas, asset or saved-state writes occur.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const { createHash } = require('node:crypto');
const { execFileSync } = require('node:child_process');
const { chromium } = require('playwright');
const { createCanvas, loadImage } = require('@napi-rs/canvas');
const { seed, saveKey } = require('./game-harness.cjs');
const enter = require('./browser-start-adventure.cjs');
const PINNED = '880817ec738f6f9dcc45dc9a3a098e7bd6676823';
const TIME = '2026-10-22T03:00:00Z';
const LAYERS = '#worldPixels, canvas.scenery-motion[data-for="worldPixels"], canvas.scenery-foreground[data-for="worldPixels"]';
const MODES = ['baseline', 'endpoint', 'per-frame', 'integer-nearest', 'integer-fit'];
const screen = { width: Number(process.env.SAM_WIDTH || 1280), height: Number(process.env.SAM_HEIGHT || 720),
  dpr: Number(process.env.SAM_DPR || 1), touch: process.env.SAM_TOUCH === '1' };
const root = path.resolve(__dirname, '..');
const output = path.join(__dirname, 'browser-evidence-sam-alignment', `${screen.width}x${screen.height}-dpr${screen.dpr}`);
const initial = () => ({ ...seed(), x: 175, y: 84, direction: 'right', money: 10000,
  gameMinutes: 600, soundEnabled: false, practiceTutorialComplete: true });
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const json = (name, value) => fs.writeFileSync(path.join(output, name), JSON.stringify(value, null, 2));
const result = { study: 'Reversible whole-map alignment and integer-source-pixel experiments', pinned: PINNED,
  screen, modes: MODES, fixture: initial(), fixedTime: TIME, errors: [], httpErrors: [], frames: [],
  regressions: [], performance: [], limitations: [
    'Tests only. No production rendering switch, artwork replacement, merge or release.',
    'Endpoint and per-frame variants retain baseline scale. Integer variants intentionally change zoom and visible source area.',
    'Integer variants correct the baseline map/source aspect mismatch using tiny independent x/y scale factors. They preserve the source image aspect, not the original distorted display ratio.',
    'All descendants move/scale together. Integer world pixels do not imply integer pixels inside independently sized actor sprites.',
    'Dense visual frames seek a real observed CSS transition at 10 ms intervals. This is not native frame pacing.',
    'Raster-width geometry is a boundary-coverage model, not a claim about the browser sampling kernel or artistic quality.',
    'Native-clock idle/moving CI samples are sequential proxies, not physical heat, battery, GPU power, or device-temperature measurements.',
    'Chromium emulation does not establish physical-device Safari behavior. Mobile landscape is the target;640x360 DPR1 exercises source downscale. The original portrait orientation guard hides all game screens, so390x844 portrait was not validated and is not bypassed.'
  ] };

function verifyRuntime() {
  const baseline = process.env.SAM_BASELINE_ROOT;
  assert.ok(baseline, 'SAM_BASELINE_ROOT is required; use the separately checked-out pinned original');
  assert.equal(execFileSync('git', ['-C', baseline, 'rev-parse', 'HEAD'], { encoding: 'utf8' }).trim(), PINNED);
  assert.equal(execFileSync('git', ['-C', baseline, 'status', '--porcelain', '--untracked-files=no'], { encoding: 'utf8' }).trim(), '');
  const files = execFileSync('git', ['-C', baseline, 'ls-tree', '-r', '--name-only', PINNED, 'nushi-tsuri'], { encoding: 'utf8' })
    .trim().split('\n').filter(file => !/\/tests\/|\/tools\/|\.md$/.test(file));
  const manifest = files.map(file => {
    const original = fs.readFileSync(path.join(baseline, file));
    assert.ok(fs.readFileSync(path.join(root, file.slice('nushi-tsuri/'.length))).equals(original), `Unchanged production bytes: ${file}`);
    return { file, bytes: original.length, sha256: hash(original) };
  });
  assert.ok(!fs.existsSync(path.join(root, 'assets/sam-sfc-pixel-pilot.png')));
  json('original-runtime-art-manifest.json', manifest);
  return { files: manifest.length, allBytesIdentical: true, manifest: 'original-runtime-art-manifest.json' };
}
async function serve() {
  const types = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8',
    '.png': 'image/png', '.webp': 'image/webp', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml', '.mp3': 'audio/mpeg', '.wav': 'audio/wav' };
  const server = http.createServer((req, res) => {
    try {
      const pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
      if (pathname === '/favicon.ico') { res.writeHead(204); return res.end(); }
      assert.ok(pathname.startsWith('/nushi-tsuri/'));
      const file = path.resolve(root, pathname.slice('/nushi-tsuri/'.length) || 'index.html');
      assert.ok(file.startsWith(root + path.sep) && fs.statSync(file).isFile());
      res.writeHead(200, { 'Content-Type': types[path.extname(file)] || 'application/octet-stream', 'Cache-Control': 'no-store' });
      fs.createReadStream(file).pipe(res);
    } catch { res.writeHead(404); res.end(); }
  });
  await new Promise((resolve, reject) => { server.once('error', reject); server.listen(0, '127.0.0.1', resolve); });
  return server;
}

// This function is serialized into the browser. Individual transform properties
// compose with the ORIGINAL transform and do not cancel its paused CSS transition.
// Applying a separate correction to each canvas would misregister feet and is
// deliberately not offered. The correction uses measured absolute screen origin,
// including #world's position, not just the map's translation coefficients.
function installController() {
  const map = document.querySelector('#map'), world = document.querySelector('#world');
  const rect = node => { const r = node.getBoundingClientRect(); return { x: r.x, y: r.y, width: r.width, height: r.height }; };
  const owned = [[map, 'translate'], [map, 'scale'], [map, 'clip-path'], [world, 'background-color']];
  const saved = owned.map(([node, property]) => ({ node, property, value: node.style.getPropertyValue(property), priority: node.style.getPropertyPriority(property) }));
  let raf = null, listener = null, mode = 'baseline', previous = { x: 0, y: 0 }, last = null;
  const updateDurations = [];
  function measuredUpdate(callback) { const begin = performance.now(); callback(); updateDurations.push(performance.now() - begin); }
  function restore() {
    if (raf !== null) cancelAnimationFrame(raf);
    if (listener) map.removeEventListener('transitionend', listener);
    raf = null; listener = null;
    for (const { node, property, value, priority } of saved) {
      if (value) node.style.setProperty(property, value, priority); else node.style.removeProperty(property);
    }
    mode = 'baseline'; previous = { x: 0, y: 0 }; last = null;
  }
  function snapCorrection() {
    const r = rect(map), dpr = devicePixelRatio;
    const original = { x: r.x - previous.x, y: r.y - previous.y };
    previous = { x: Math.round(original.x * dpr) / dpr - original.x,
      y: Math.round(original.y * dpr) / dpr - original.y };
    map.style.setProperty('translate', `${previous.x}px ${previous.y}px`, 'important');
    last = { mode, correctionCSS: { ...previous }, originalOriginCSS: original };
  }
  function apply(requested, reference, endpointCorrection = null) {
    restore(); mode = requested;
    if (mode === 'baseline') return null;
    if (mode === 'endpoint' || mode === 'per-frame') {
      if (endpointCorrection) {
        previous = endpointCorrection;
        map.style.setProperty('translate', `${previous.x}px ${previous.y}px`, 'important');
        last = { mode, correctionCSS: { ...previous }, endpointOnlyCorrection: true };
      } else snapCorrection();
      return last;
    }
    const base = reference, dpr = devicePixelRatio;
    const source = base.layers[0], k = Math.max(1, mode === 'integer-fit'
      ? Math.floor(Math.min(source.physicalScale.x, source.physicalScale.y) + 1e-7)
      : Math.round((source.physicalScale.x + source.physicalScale.y) / 2));
    const factors = { x: k / source.physicalScale.x, y: k / source.physicalScale.y };
    map.style.setProperty('scale', `${factors.x} ${factors.y}`, 'important');
    const r = rect(map), w = rect(world);
    // Keep the sampled player's apparent source position/focal anchor. Near a
    // map edge the camera must clamp, so any unavoidable focal displacement is
    // recorded rather than hidden by a shifted or stretched screenshot crop.
    const viewport = { x: w.x + world.clientLeft, y: w.y + world.clientTop,
      width: w.width - world.clientLeft - parseFloat(getComputedStyle(world).borderRightWidth), height: w.height - world.clientTop - parseFloat(getComputedStyle(world).borderBottomWidth) };
    let clip = { ...viewport };
    if (mode === 'integer-fit') {
      clip.width = Math.min(viewport.width, base.visibleSource.width * k / dpr);
      clip.height = Math.min(viewport.height, base.visibleSource.height * k / dpr);
      clip.width = Math.floor(clip.width * dpr) / dpr;
      clip.height = Math.floor(clip.height * dpr) / dpr;
      clip.x = Math.round((viewport.x + (viewport.width - clip.width) / 2) * dpr) / dpr;
      clip.y = Math.round((viewport.y + (viewport.height - clip.height) / 2) * dpr) / dpr;
      world.style.setProperty('background-color', '#101820', 'important');
    }
    const anchor = { x: clip.x + base.player.anchorInViewport.x * clip.width,
      y: clip.y + base.player.anchorInViewport.y * clip.height };
    const desired = { x: anchor.x - base.player.sourcePose.x * k / dpr,
      y: anchor.y - base.player.sourcePose.y * k / dpr };
    function bounded(value, start, span, mapSpan) {
      if (mapSpan < span) return Math.round((start + (span - mapSpan) / 2) * dpr) / dpr;
      const low = Math.ceil((start + span - mapSpan) * dpr - 1e-7) / dpr;
      const high = Math.floor(start * dpr + 1e-7) / dpr;
      return Math.max(low, Math.min(high, Math.round(value * dpr) / dpr));
    }
    const origin = { x: bounded(desired.x, clip.x, clip.width, r.width),
      y: bounded(desired.y, clip.y, clip.height, r.height) };
    previous = { x: origin.x - r.x, y: origin.y - r.y };
    map.style.setProperty('translate', `${previous.x}px ${previous.y}px`, 'important');
    if (mode === 'integer-fit') {
      const local = { x: (clip.x - origin.x) / factors.x, y: (clip.y - origin.y) / factors.y,
        width: clip.width / factors.x, height: clip.height / factors.y };
      map.style.setProperty('clip-path', `inset(${Math.max(0, local.y)}px ${Math.max(0, base.map.rect.width - local.x - local.width)}px ${Math.max(0, base.map.rect.height - local.y - local.height)}px ${Math.max(0, local.x)}px)`, 'important');
    }
    last = { mode, integerPhysicalScale: k, factors, requestedOrigin: origin, desiredOrigin: desired,
      correctionCSS: { ...previous }, viewport: clip,
      clamped: { x: Math.abs(origin.x - desired.x) > .51 / dpr, y: Math.abs(origin.y - desired.y) > .51 / dpr },
      letterboxCSS: { left: clip.x - viewport.x, top: clip.y - viewport.y,
        right: viewport.x + viewport.width - clip.x - clip.width, bottom: viewport.y + viewport.height - clip.y - clip.height },
      requestedFocalAnchor: anchor };
    return last;
  }
  function start(requested) {
    restore(); mode = requested;
    if (requested === 'baseline') return;
    if (requested === 'endpoint') {
      measuredUpdate(snapCorrection); listener = event => { if (event.target === map && event.propertyName === 'transform') measuredUpdate(snapCorrection); }; map.addEventListener('transitionend', listener); return;
    }
    function tick() {
      const begin = performance.now();
      if (requested === 'per-frame') { mode = requested; snapCorrection(); }
      else {
        // Restore owned properties only. Read the CURRENT unmodified map and
        // player pose, then apply the same whole-map integer reference.
        restore(); apply(requested, window.samAlignmentMetrics(false));
      }
      updateDurations.push(performance.now() - begin);
      raf = requestAnimationFrame(tick);
    }
    tick();
  }
  window.samAlignment = { apply, restore, start, get last() { return last; },
    resetTiming() { updateDurations.length = 0; }, timing() {
      const sorted = [...updateDurations].sort((a, b) => a - b), total = sorted.reduce((a, b) => a + b, 0);
      return { callbacks: sorted.length, totalMs: total, meanMs: sorted.length ? total / sorted.length : 0,
        p95Ms: sorted[Math.floor(sorted.length * .95)] ?? 0, maxMs: sorted.at(-1) ?? 0 };
    } }; 
}

function installMetrics(selector) {
  const rect = n => { const r = n.getBoundingClientRect(); return { x: r.x, y: r.y, width: r.width, height: r.height }; };
  window.samAlignmentMetrics = function metrics(includePixels = false) {
    const map = document.querySelector('#map'), world = document.querySelector('#world'), dpr = devicePixelRatio;
    const r = rect(map), w = rect(world), canvas = document.querySelector('#worldPixels');
    const viewport = window.samAlignment?.last?.viewport || { x: w.x + world.clientLeft, y: w.y + world.clientTop, width: w.width - world.clientLeft - parseFloat(getComputedStyle(world).borderRightWidth), height: w.height - world.clientTop - parseFloat(getComputedStyle(world).borderBottomWidth) };
    const physical = v => v * dpr, distanceToInteger = v => Math.abs(v - Math.round(v));
    const p = rect(document.querySelector('#player')), feet = { x: p.x + p.width / 2, y: p.y + p.height };
    const sourcePose = { x: (feet.x - r.x) / r.width * canvas.width, y: (feet.y - r.y) / r.height * canvas.height };
    const sourceView = { x: Math.max(0, (viewport.x - r.x) / r.width * canvas.width),
      y: Math.max(0, (viewport.y - r.y) / r.height * canvas.height),
      right: Math.min(canvas.width, (viewport.x + viewport.width - r.x) / r.width * canvas.width),
      bottom: Math.min(canvas.height, (viewport.y + viewport.height - r.y) / r.height * canvas.height) };
    sourceView.width = Math.max(0, sourceView.right - sourceView.x); sourceView.height = Math.max(0, sourceView.bottom - sourceView.y);
    const layers = [...document.querySelectorAll(selector)].map(c => {
      const b = rect(c), css = getComputedStyle(c);
      return { id: c.id || c.className, width: c.width, height: c.height, rect: b,
        physicalOrigin: { x: physical(b.x), y: physical(b.y) },
        originResidual: { x: distanceToInteger(physical(b.x)), y: distanceToInteger(physical(b.y)) },
        physicalScale: { x: physical(b.width) / c.width, y: physical(b.height) / c.height },
        imageRendering: css.imageRendering, display: css.display,
        ...(includePixels ? { rgba: Array.from(c.getContext('2d').getImageData(0, 0, c.width, c.height).data) } : {}) };
    });
    const npcFeet = [...document.querySelectorAll('#worldLifeLayer .world-life-resident')]
      .filter(n => n.getClientRects().length).map(n => {
        const b = rect(n), x = parseFloat(n.style.left) / 100, y = parseFloat(n.style.top) / 100;
        return { id: n.dataset.worldLife, world: { x: x * 240, y: y * 135 }, walkable: isWalkableWorld(x * 240, y * 135),
          normalizedFeet: { x: (b.x + b.width / 2 - r.x) / r.width, y: (b.y + b.height - r.y) / r.height },
          errorCSS: { x: Math.abs(b.x + b.width / 2 - (r.x + x * r.width)), y: Math.abs(b.y + b.height - (r.y + y * r.height)) } };
      });
    const definition = ShuSceneLayers.get('world'), sam = definition.parts.find(p => p.id === 'sam-shop');
    const points = sam.polygons.flat(), xs = points.map(p => p[0]), ys = points.map(p => p[1]);
    const samSource = { x: Math.min(...xs) / definition.units[0] * canvas.width,
      y: Math.min(...ys) / definition.units[1] * canvas.height,
      width: (Math.max(...xs) - Math.min(...xs)) / definition.units[0] * canvas.width,
      height: (Math.max(...ys) - Math.min(...ys)) / definition.units[1] * canvas.height };
    return { dpr, game: { x: s.x, y: s.y, direction: s.direction, time: s.gameMinutes, now: Date.now() },
      map: { rect: r, inlineStyle: map.getAttribute('style'), computedTransform: getComputedStyle(map).transform,
        translate: getComputedStyle(map).translate, scale: getComputedStyle(map).scale, clientWidth: map.clientWidth, clientHeight: map.clientHeight },
      world: w, viewport, layers, visibleSource: sourceView,
      sourceAspect: canvas.width / canvas.height, renderedAspect: r.width / r.height,
      player: { rect: p, feet, sourcePose,
        normalizedFeet: { x: (feet.x - r.x) / r.width, y: (feet.y - r.y) / r.height },
        anchorInViewport: { x: (feet.x - viewport.x) / viewport.width, y: (feet.y - viewport.y) / viewport.height },
        targetFeetErrorCSS: { x: Math.abs(feet.x - (r.x + r.width * s.x / 240)), y: Math.abs(feet.y - (r.y + r.height * s.y / 135)) } },
      npcFeet, samSource, overlay: window.samAlignment?.last || null,
      edgeGapsCSS: { left: Math.max(0, r.x - viewport.x), top: Math.max(0, r.y - viewport.y),
        right: Math.max(0, viewport.x + viewport.width - r.x - r.width), bottom: Math.max(0, viewport.y + viewport.height - r.y - r.height) } };
  };
}
async function metrics(page) { return page.evaluate(() => samAlignmentMetrics()); }
async function sourceHashes(page) {
  return page.evaluate(async selector => Promise.all([...document.querySelectorAll(selector)].map(async c => {
    const rgba = c.getContext('2d').getImageData(0, 0, c.width, c.height).data;
    const digest = await crypto.subtle.digest('SHA-256', rgba);
    return { id: c.id || c.className, width: c.width, height: c.height,
      sha256: [...new Uint8Array(digest)].map(x => x.toString(16).padStart(2, '0')).join('') };
  })), LAYERS);
}
function near(actual, expected, tolerance, message) { assert.ok(Math.abs(actual - expected) <= tolerance, `${message}: ${actual} vs ${expected} (tolerance ${tolerance})`); }
function assertGeometry(base, candidate, mode, settled) {
  assert.deepEqual(candidate.game, base.game, `${mode}: no player/state/clock mutation`);
  assert.equal(candidate.layers.length, 3);
  const b = base.layers[0], c = candidate.layers[0];
  for (let i = 0; i < candidate.layers.length; i++) {
    const layer = candidate.layers[i], original = base.layers[i];
    assert.equal(layer.imageRendering, 'pixelated');
    assert.equal(layer.display, original.display, `${mode}: do not reveal hidden scenery`);
    if (layer.display === 'none' || !original.rect.width || !original.rect.height) {
      assert.deepEqual(layer.rect, original.rect, `${mode}: hidden layer geometry unchanged`);
    } else for (const key of ['x', 'y', 'width', 'height']) near(layer.rect[key], c.rect[key], .01, `${mode}: synchronized ${layer.id} ${key}`);
  }
  for (const axis of ['x', 'y']) {
    near(candidate.player.normalizedFeet[axis], base.player.normalizedFeet[axis], .00003, `${mode}: player registration at sampled pose`);
    if (mode === 'endpoint' || mode === 'per-frame') near(c.physicalScale[axis], b.physicalScale[axis], 1e-7, `${mode}: same nominal scale`);
    if (mode === 'per-frame' || mode.startsWith('integer-') || (mode === 'endpoint' && settled)) {
      near(c.originResidual[axis], 0, .002, `${mode}: measured absolute device-grid origin`);
    }
    if (mode.startsWith('integer-')) near(c.physicalScale[axis], candidate.overlay.integerPhysicalScale, 1e-6, `${mode}: measured integer source scale`);
  }
  if (mode.startsWith('integer-')) near(candidate.renderedAspect, candidate.sourceAspect, 1e-6, `${mode}: original source aspect`);
  assert.equal(candidate.npcFeet.length, base.npcFeet.length);
  candidate.npcFeet.forEach((npc, i) => {
    assert.equal(npc.id, base.npcFeet[i].id); assert.equal(npc.walkable, true);
    for (const axis of ['x', 'y']) near(npc.normalizedFeet[axis], base.npcFeet[i].normalizedFeet[axis], .00003, `${mode}: NPC registration ${npc.id}`);
  });
  if (settled) {
    assert.ok(candidate.player.targetFeetErrorCSS.x < 1 && candidate.player.targetFeetErrorCSS.y < 1, `${mode}: settled player feet`);
    assert.ok(candidate.npcFeet.every(n => n.errorCSS.x < 1 && n.errorCSS.y < 1), `${mode}: NPC feet`);
  }
}
function widthModel(pipeline) {
  const layer = pipeline.layers[0], region = pipeline.samSource, output = {};
  for (const axis of ['x', 'y']) {
    const count = Math.min(128, Math.floor(axis === 'x' ? region.width : region.height)), start = Math.ceil(region[axis]);
    const scale = layer.physicalScale[axis], origin = layer.physicalOrigin[axis], widths = [];
    for (let i = start; i < start + count; i++) widths.push(Math.round(origin + (i + 1) * scale) - Math.round(origin + i * scale));
    output[axis] = { start, count, scale, widths, histogram: widths.reduce((a, value) => { a[value] = (a[value] || 0) + 1; return a; }, {}) };
  }
  return output;
}

async function newPage(browser, url, frozen = true) {
  const context = await browser.newContext({ viewport: { width: screen.width, height: screen.height },
    deviceScaleFactor: screen.dpr, isMobile: screen.touch, hasTouch: screen.touch, locale: 'ja-JP', serviceWorkers: 'block' });
  await context.addInitScript(({ key, state }) => {
    if (!localStorage.getItem(key)) localStorage.setItem(key, JSON.stringify(state));
    localStorage.setItem('nushi-inugoya-options-v1', JSON.stringify({ textSpeed: 'instant' }));
    Math.random = () => .999999;
    window.alignmentPointers = [];
    document.addEventListener('pointerdown', e => alignmentPointers.push({ id: e.target.closest('button')?.id || e.target.id, type: e.pointerType }));
  }, { key: saveKey, state: initial() });
  const page = await context.newPage(); page.setDefaultTimeout(30000);
  page.on('pageerror', e => result.errors.push(e.message));
  page.on('console', message => { if (message.type() === 'error') result.errors.push(message.text()); });
  page.on('response', response => { if (response.status() >= 400) result.httpErrors.push(`${response.status()} ${response.url()}`); });
  if (frozen) { await page.clock.install({ time: new Date(TIME) }); await page.clock.pauseAt('2026-10-22T03:00:01Z'); }
  await page.goto(url, { waitUntil: 'load' }); await start(page, frozen);
  return { context, page };
}
const press = (page, selector) => page.locator(selector)[screen.touch ? 'tap' : 'click']();
async function start(page, frozen) {
  if (await page.locator('.landscape-warning').isVisible()) {
    await page.screenshot({ path: path.join(output, 'unsupported-portrait-orientation-guard.png'), scale: 'device' });
    throw Error('Original portrait orientation guard hides .screen; use a supported landscape viewport. Portrait gameplay is not validated and the guard is not bypassed.');
  }
  await enter(page, screen.touch);
  if (frozen) await page.clock.runFor(240);
  if (await page.locator('#lakeIntroSkip').isVisible()) { await press(page, '#lakeIntroSkip'); if (frozen) await page.clock.runFor(240); }
  await page.waitForFunction(() => {
    const c = document.querySelector('#worldPixels');
    return c?.style.backgroundImage === 'none' && c.width > 0 && c.height > 0 && document.querySelector('canvas[data-for="worldPixels"][data-scene="world"]');
  });
  await page.evaluate(installController); await page.evaluate(installMetrics, LAYERS);
  if (frozen) await settle(page); else await page.waitForTimeout(1500);
}
async function settle(page) {
  await page.clock.runFor(700); await page.waitForTimeout(400);
  await page.evaluate(async () => {
    await document.fonts.ready;
    for (const animation of document.getAnimations()) {
      if (animation.effect?.getTiming().iterations === Infinity) { animation.pause(); animation.currentTime = 0; }
      else animation.finish();
    }
  });
}
const state = page => page.evaluate(() => ({ x: s.x, y: s.y, direction: s.direction }));
const progress = page => page.evaluate(() => JSON.parse(JSON.stringify({ money: s.money, hp: s.hp,
  time: s.gameMinutes, caught: s.caught, baits: s.baits, equipment: s.equipment, quests: s.questCompletions })));
async function walk(page, target, check = null) {
  const route = await page.evaluate(target => {
    const queue = [{ x: s.x, y: s.y, d: s.direction, path: [] }], seen = new Set([s.x + ',' + s.y + ',' + s.direction]);
    for (let i = 0; i < queue.length; i++) {
      const p = queue[i], arrived = target.practice
        ? isNearPracticePond(p.x, p.y) && !nearbyForagePoint(p.x, p.y) && !nearbyWorldLandmark(p.x, p.y, p.d)?.noticeOnly
        : Math.hypot(p.x - target.x, p.y - target.y) <= 2;
      if (arrived && (!target.direction || p.d === target.direction)) return p.path;
      for (const d of ['up', 'right', 'down', 'left']) {
        const n = { ...ShuWorldLife.moveTarget(p.x, p.y, d, 4, isWalkableWorld), d }, key = n.x + ',' + n.y + ',' + d;
        if (!seen.has(key)) { seen.add(key); queue.push({ ...n, path: [...p.path, d] }); }
      }
    }
    throw Error('No real walk route to ' + JSON.stringify(target));
  }, target);
  for (const direction of route) {
    const expected = await page.evaluate(d => ShuWorldLife.moveTarget(s.x, s.y, d, 4, isWalkableWorld), direction);
    await press(page, `[data-move="${direction}"]`); await page.clock.runFor(50);
    const actual = await state(page); assert.equal(actual.x, expected.x); assert.equal(actual.y, expected.y);
    if (check) await check();
  }
  return { target, route, actual: await state(page) };
}
async function cameraChangingMove(page) {
  return page.evaluate(() => {
    const map = document.querySelector('#map'), world = document.querySelector('#world');
    const vw = 240 * world.clientWidth / map.clientWidth, vh = 135 * world.clientHeight / map.clientHeight;
    const camera = p => ({ x: Math.max(0, Math.min(240 - vw, p.x - vw / 2)), y: Math.max(0, Math.min(135 - vh, p.y - vh / 2)) });
    const before = camera(s);
    for (const direction of ['down', 'up', 'left', 'right']) {
      const to = ShuWorldLife.moveTarget(s.x, s.y, direction, 4, isWalkableWorld), after = camera(to);
      if ((to.x !== s.x || to.y !== s.y) && (before.x !== after.x || before.y !== after.y)) return { direction, from: { x: s.x, y: s.y }, to, before, after };
    }
    throw Error('Fixture has no reachable camera-changing move; do not fabricate moving-camera evidence');
  });
}

function crop(image, pipeline, fixedBounds = null) {
  const layer = pipeline.layers[0], s = pipeline.samSource, dpr = pipeline.dpr;
  const requested = fixedBounds || { x: Math.floor((layer.rect.x + s.x / layer.width * layer.rect.width) * dpr),
    y: Math.floor((layer.rect.y + s.y / layer.height * layer.rect.height) * dpr),
    right: Math.ceil((layer.rect.x + (s.x + s.width) / layer.width * layer.rect.width) * dpr),
    bottom: Math.ceil((layer.rect.y + (s.y + s.height) / layer.height * layer.rect.height) * dpr) };
  const view = pipeline.viewport;
  const bounds = { x: Math.max(0, requested.x, Math.ceil(view.x * dpr)), y: Math.max(0, requested.y, Math.ceil(view.y * dpr)),
    right: Math.min(image.width, requested.right, Math.floor((view.x + view.width) * dpr)),
    bottom: Math.min(image.height, requested.bottom, Math.floor((view.y + view.height) * dpr)) };
  if (bounds.right <= bounds.x || bounds.bottom <= bounds.y) return { clippedEntirely: true, requested, bounds };
  const canvas = createCanvas(bounds.right - bounds.x, bounds.bottom - bounds.y), context = canvas.getContext('2d');
  context.imageSmoothingEnabled = false;
  context.drawImage(image, bounds.x, bounds.y, canvas.width, canvas.height, 0, 0, canvas.width, canvas.height);
  return { canvas, requested, bounds, clipped: Object.keys(bounds).some(key => bounds[key] !== requested[key]) };
}
async function actorHash(page) {
  return page.evaluate(async () => {
    const c = document.querySelector('#playerSprite'), rgba = c.getContext('2d').getImageData(0, 0, c.width, c.height).data;
    const digest = await crypto.subtle.digest('SHA-256', rgba);
    return { width: c.width, height: c.height, sha256: [...new Uint8Array(digest)].map(x => x.toString(16).padStart(2, '0')).join(''),
      direction: s.direction, walking: typeof playerWalking === 'undefined' ? null : playerWalking,
      frame: typeof playerAnimFrame === 'undefined' ? null : playerAnimFrame };
  });
}
async function captureFrame(page, name, settled, endpointCorrection = null, time = null) {
  checkpoint(`capture:${name}:start`);
  await page.evaluate(() => samAlignment.restore());
  const original = await metrics(page), pixels = await sourceHashes(page), actor = await actorHash(page);
  const baseBuffer = await page.screenshot({ animations: 'allow', scale: 'device' });
  const baseImage = await loadImage(baseBuffer), baseCrop = crop(baseImage, original);
  // The preliminary crop supplies only its exact bounds. Release its raster
  // immediately rather than waiting for GC to discover native allocations.
  if (baseCrop.canvas) { baseCrop.canvas.width = 1; baseCrop.canvas.height = 1; }
  const frame = { name, timeMs: time, settled, hashes: pixels, actor, variants: [] };
  result.frames.push(frame);
  for (const mode of MODES) {
    const overlay = await page.evaluate(({ mode, original, correction }) => samAlignment.apply(mode, original, correction),
      { mode, original, correction: mode === 'endpoint' ? endpointCorrection : null });
    const pipeline = await metrics(page);
    assertGeometry(original, pipeline, mode, settled);
    assert.deepEqual(await sourceHashes(page), pixels, `${name}/${mode}: no source-canvas writes`);
    assert.deepEqual(await actorHash(page), actor, `${name}/${mode}: identical player canvas and animation state`);
    const buffer = mode === 'baseline' ? baseBuffer : await page.screenshot({ animations: 'allow', scale: 'device' });
    const image = mode === 'baseline' ? baseImage : await loadImage(buffer);
    const fullFile = `${name}-${mode}.png`, cropFile = `${name}-${mode}-sam-native.png`;
    if (settled || time === 0 || time === 150 || time === 300) fs.writeFileSync(path.join(output, fullFile), buffer);
    const sampled = crop(image, pipeline, mode === 'endpoint' || mode === 'per-frame' ? baseCrop.requested : null);
    const cropBuffer = sampled.canvas ? sampled.canvas.toBuffer('image/png') : null;
    if (cropBuffer) fs.writeFileSync(path.join(output, cropFile), cropBuffer);
    frame.variants.push({ mode, pipeline, overlay, widthModel: widthModel(pipeline),
      fullScreenshot: settled || time === 0 || time === 150 || time === 300 ? fullFile : null,
      nativeCrop: sampled.canvas ? cropFile : null, crop: { requested: sampled.requested, bounds: sampled.bounds,
        clipped: sampled.clipped || false, clippedEntirely: sampled.clippedEntirely || false },
      visibleSourceAreaRatio: pipeline.visibleSource.width * pipeline.visibleSource.height / (original.visibleSource.width * original.visibleSource.height),
      sourceViewDelta: { x: pipeline.visibleSource.x - original.visibleSource.x, y: pipeline.visibleSource.y - original.visibleSource.y,
        width: pipeline.visibleSource.width - original.visibleSource.width, height: pipeline.visibleSource.height - original.visibleSource.height },
      focalDisplacementCSS: { x: pipeline.player.feet.x - original.player.feet.x, y: pipeline.player.feet.y - original.player.feet.y },
      screenshotSha256: hash(buffer), cropSha256: cropBuffer ? hash(cropBuffer) : null });
    if (sampled.canvas) { sampled.canvas.width = 1; sampled.canvas.height = 1; }
    if (mode !== 'baseline') image.src = Buffer.alloc(0);
    await page.evaluate(() => samAlignment.restore());
    assert.deepEqual(await metrics(page), original, `${name}/${mode}: exact pipeline restoration`);
  }
  assert.deepEqual(await sourceHashes(page), pixels); assert.deepEqual(await actorHash(page), actor);
  const repeat = await page.screenshot({ animations: 'allow', scale: 'device' });
  // Never format megabytes of Buffer contents inside an assertion failure.
  // Keep exact byte equality, but save both PNGs and compact diagnostic hashes.
  const identical = repeat.equals(baseBuffer);
  if (!identical) {
    fs.writeFileSync(path.join(output, `${name}-restoration-baseline.png`), baseBuffer);
    fs.writeFileSync(path.join(output, `${name}-restoration-actual.png`), repeat);
    frame.restorationFailure = { baselineSha256: hash(baseBuffer), actualSha256: hash(repeat),
      baselineBytes: baseBuffer.length, actualBytes: repeat.length };
    json('alignment-results.json', result);
  }
  baseImage.src = Buffer.alloc(0);
  // Collect independent candidate evidence before enforcing this exact gate
  // at the end. A mismatch remains an explicit failure, never a tolerated pass.
  frame.restoredScreenshotByteIdentical = identical;
  json('alignment-results.json', result);
  checkpoint(`capture:${name}:complete`);
}
async function visuals(browser, url) {
  const { context, page } = await newPage(browser, url);
  try {
    const sources = await page.evaluate(() => { const d = ShuSceneLayers.get('world'); return [d.source, ...(d.underlay ? [d.underlay] : []), ...(d.edits || []).map(e => e.source)]; });
    assert.deepEqual(sources, ['assets/village-world-v252-55-riao-clear.png', 'assets/village-underlay-v252-55-riao.png']);
    result.worldSources = sources;
    const source = await page.evaluate(() => document.querySelector('#worldPixels').toDataURL('image/png'));
    fs.writeFileSync(path.join(output, 'original-world-canvas.png'), Buffer.from(source.split(',')[1], 'base64'));
    await captureFrame(page, 'west-approach', true);
    if (screen.width === 640 && screen.height === 360 && screen.dpr === 1) {
      const base = result.frames[0].variants[0].pipeline.layers[0];
      assert.ok(base.physicalScale.x < 1 && base.physicalScale.y < 1, '640x360 landscape really exercises <1 source downscale');
    }
    const move = await cameraChangingMove(page); result.motion = { move, clock: 'Paused real CSS transitions, 31 samples at 10 ms spacing' };
    await press(page, `[data-move="${move.direction}"]`);
    const transitions = await page.evaluate(() => {
      window.alignmentAnimations = ['#map', '#player', '#dog'].flatMap(q => document.querySelector(q).getAnimations());
      return alignmentAnimations.map(animation => {
        animation.pause(); animation.currentTime = 0;
        return { target: animation.effect.target.id, property: animation.transitionProperty || animation.animationName || null,
          timing: animation.effect.getTiming(), keyframes: animation.effect.getKeyframes() };
      });
    });
    const normalizationPixels = await sourceHashes(page), normalizationActor = await actorHash(page);
    const motionSetup = await page.evaluate(() => {
      const before = JSON.stringify({ state: s, now: Date.now() });
      // The real move also starts #idleStatus's180ms exit fade. Wall time
      // would otherwise advance that unrelated UI between paired screenshots.
      // Normalize finite UI animations only, without hiding HUD nodes or
      // touching any animation on the map, player, dog, or their descendants.
      const map = document.querySelector('#map'), normalized = [];
      for (const animation of document.getAnimations()) {
        const target = animation.effect?.target, end = animation.effect?.getComputedTiming().endTime;
        if (!(target instanceof Element) || target === map || map.contains(target) || !Number.isFinite(end)) continue;
        const fromTimeMs = animation.currentTime;
        animation.pause(); animation.currentTime = end;
        normalized.push({ target: target.id || target.className, property: animation.transitionProperty || animation.animationName || null,
          fromTimeMs, toTimeMs: end, action: 'paused-at-finite-end' });
      }
      return { normalized, before, after: JSON.stringify({ state: s, now: Date.now() }) };
    });
    assert.equal(motionSetup.after, motionSetup.before, 'UI animation normalization does not change game state or JS time');
    assert.deepEqual(await sourceHashes(page), normalizationPixels, 'UI normalization preserves source canvas bytes');
    assert.deepEqual(await actorHash(page), normalizationActor, 'UI normalization preserves player canvas/state');
    result.motion.uiAnimationNormalization = { scope: 'Finite animations outside #map only; paused at terminal visual phase before the first motion pair', animations: motionSetup.normalized };
    result.motion.transitions = transitions;
    assert.ok(transitions.some(t => t.target === 'map' && t.property === 'transform' && Number(t.timing.duration) > 0), 'Real button created observed map transition');
    async function seek(time) {
      await page.evaluate(time => { samAlignment.restore(); for (const animation of alignmentAnimations) animation.currentTime = time; }, time);
      return metrics(page);
    }
    const a = await seek(0), b = await seek(300);
    assert.ok(a.map.rect.x !== b.map.rect.x || a.map.rect.y !== b.map.rect.y, 'Real camera displacement observed');
    const correction = value => ({ x: Math.round(value.map.rect.x * screen.dpr) / screen.dpr - value.map.rect.x,
      y: Math.round(value.map.rect.y * screen.dpr) / screen.dpr - value.map.rect.y });
    const from = correction(a), to = correction(b);
    result.motion.endpointCorrection = { from, to, explanation: 'Hold the snapped starting offset throughout the transition, then snap the final origin on transform transitionend. Intermediate origins are intentionally not forced to integer pixels; this is the same behavior measured in native performance.' };
    let previous = 0;
    for (let time = 0; time <= 300; time += 10) {
      if (time > previous) await page.clock.runFor(time - previous);
      await seek(time);
      await captureFrame(page, `motion-${String(time).padStart(3, '0')}ms`, false,
        time < 300 ? from : to, time);
      previous = time;
    }
    result.motion.cameraMotionObserved = true;
    await settle(page);
    result.visualRoute = await walk(page, { x: 197, y: 91, direction: 'up' });
    await settle(page); await captureFrame(page, 'shop-entrance', true);
    result.motion.widthPatternStability = MODES.map(mode => {
      const frames = result.frames.filter(f => f.timeMs !== null).map(f => f.variants.find(v => v.mode === mode));
      return { mode, frames: frames.length, axes: Object.fromEntries(['x', 'y'].map(axis => {
        const patterns = frames.map(f => f.widthModel[axis].widths), first = patterns[0];
        return [axis, { distinctPatterns: new Set(patterns.map(p => p.join(','))).size,
          changedWidthsFromFirst: patterns.map(p => p.filter((value, i) => value !== first[i]).length),
          minWidth: Math.min(...patterns.flat()), maxWidth: Math.max(...patterns.flat()) }];
      })) };
    });
  } finally { await context.close(); }
}

async function regression(browser, url, mode) {
  const { context, page } = await newPage(browser, url), report = { mode, routes: [], shopCycles: 0 };
  result.regressions.push(report);
  try {
    await page.evaluate(mode => samAlignment.start(mode), mode);
    const before = await progress(page);
    const check = async () => {
      const p = await metrics(page);
      assert.equal(p.layers.length, 3);
      assert.ok(p.npcFeet.every(n => n.walkable));
    };
    report.routes.push(await walk(page, { x: 197, y: 91, direction: 'up' }, check));
    assert.equal(await page.evaluate(() => isAtSamShopEntrance()), true);
    report.controls = await page.evaluate(() => ['#action', ...['up', 'right', 'down', 'left'].map(d => `[data-move="${d}"]`)].map(q => {
      const n = document.querySelector(q), r = n.getBoundingClientRect(), top = document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2);
      return { q, width: r.width, height: r.height, inside: r.left >= 0 && r.top >= 0 && r.right <= innerWidth + 1 && r.bottom <= innerHeight + 1, unblocked: top === n || n.contains(top) };
    }));
    assert.ok(report.controls.every(c => c.width >= 44 && c.height >= 44 && c.inside && c.unblocked));
    const entrance = await state(page);
    for (let i = 0; i < 2; i++) {
      await press(page, '#action'); await page.locator('#store.open').waitFor();
      await press(page, '#store [data-close]'); assert.deepEqual(await state(page), entrance); assert.deepEqual(await progress(page), before); report.shopCycles++;
    }
    report.routes.push(await walk(page, { x: 212, y: 87, direction: 'up', practice: true }, check));
    await press(page, '#action'); assert.equal(await page.evaluate(() => battle?.phase), 'prep');
    await press(page, '#wait'); assert.equal(await page.evaluate(() => battle?.phase || null), null);
    assert.equal(await page.locator('#fishScene.active').count(), 0); assert.deepEqual(await progress(page), before); report.fishingCancel = true;
    report.routes.push(await walk(page, { x: 197, y: 91, direction: 'up' }, check));
    report.pointerTypes = await page.evaluate(() => [...new Set(alignmentPointers.map(p => p.type))]);
    if (screen.touch) assert.ok(report.pointerTypes.includes('touch'));
    const saved = await state(page); await page.evaluate(() => save());
    await page.reload({ waitUntil: 'load' }); await start(page, true);
    assert.deepEqual(await state(page), saved); assert.deepEqual(await progress(page), before);
    assert.equal(await page.evaluate(() => document.querySelector('#map').style.scale), '', 'No experiment persisted after save/reload');
    report.saveReload = true;
    if (result.regressions.length > 1) assert.deepEqual(report.routes, result.regressions[0].routes, `${mode}: same route/collision results as baseline`);
  } finally { await context.close(); }
}

async function performanceSample(browser, url, mode, activity) {
  // Intentionally no Playwright clock, screenshot, pixel readback or hashing in
  // the measured interval. Report actual camera changes for the moving sample.
  const { context, page } = await newPage(browser, url, false);
  try {
    const move = activity === 'moving' ? await cameraChangingMove(page) : null;
    await page.evaluate(mode => samAlignment.start(mode), mode); await page.waitForTimeout(2000);
    await page.evaluate(({ mode, activity }) => {
      // Return immediately while the native sampler remains active. Input is
      // supplied through Playwright's real pointer route below, because the
      // game's direction buttons handle pointerdown, not HTMLElement.click().
      window.samNativePerfPromise = (async () => {
        const durations = [], intervals = [], positions = [], longTasks = [], inputs = [];
        let last = null, raf, observer = null;
        if (PerformanceObserver.supportedEntryTypes.includes('longtask')) {
          observer = new PerformanceObserver(list => longTasks.push(...list.getEntries().map(e => e.duration)));
          observer.observe({ type: 'longtask', buffered: false });
        }
        samAlignment.resetTiming();
        const heapBefore = performance.memory?.usedJSHeapSize ?? null, start = performance.now();
        const input = event => {
          const button = event.target.closest('[data-move]');
          if (button) inputs.push({ direction: button.dataset.move, pointerType: event.pointerType,
            timeMs: performance.now() - start, world: { x: s.x, y: s.y } });
        };
        document.addEventListener('pointerdown', input);
        const frame = time => {
          const begin = performance.now();
          if (last !== null) intervals.push(time - last); last = time;
          const r = document.querySelector('#map').getBoundingClientRect(); positions.push([r.x, r.y]);
          durations.push(performance.now() - begin); raf = requestAnimationFrame(frame);
        };
        raf = requestAnimationFrame(frame); await new Promise(resolve => setTimeout(resolve, 5000)); cancelAnimationFrame(raf);
        document.removeEventListener('pointerdown', input); observer?.disconnect();
        const elapsed = performance.now() - start, sorted = [...intervals].sort((a, b) => a - b);
        return { mode, activity, clock: 'native, unmocked', elapsedMs: elapsed, frames: positions.length,
          fps: positions.length * 1000 / elapsed, frameP95Ms: sorted[Math.floor(sorted.length * .95)] ?? null,
          longTasksSupported: !!observer, longTasks: longTasks.length, longTaskTotalMs: longTasks.reduce((a, b) => a + b, 0),
          heapBefore, heapAfter: performance.memory?.usedJSHeapSize ?? null,
          inputs, clicks: inputs.length, distinctInputPositions: new Set(inputs.map(i => `${i.world.x},${i.world.y}`)).size,
          distinctCameraOrigins: new Set(positions.map(p => p.join(','))).size,
          maxFrameProbeMs: Math.max(...durations), controllerTiming: samAlignment.timing(), endState: { x: s.x, y: s.y },
          limitation: 'Single sequential CI sample per mode/activity. Controller read/modify/layout cost and real pointer input are included; no physical heat or battery claim.' };
      })();
    }, { mode, activity });
    if (move) {
      const opposite = { up: 'down', down: 'up', left: 'right', right: 'left' }, hostStart = Date.now();
      // Identical10-event target schedule for every mode. Actual browser event
      // times are reported, since scheduling/CI delays are not hidden.
      for (let i = 0; i < 10; i++) {
        await page.waitForTimeout(Math.max(0, (i + 1) * 420 - (Date.now() - hostStart)));
        await press(page, `[data-move="${i % 2 ? opposite[move.direction] : move.direction}"]`);
      }
    }
    const sample = await page.evaluate(() => window.samNativePerfPromise);
    sample.inputProtocol = { source: 'Playwright real tap/click pointer events', targetCount: move ? 10 : 0, intervalMs: 420,
      firstEventTargetMs: move ? 420 : null, touch: screen.touch };
    result.performance.push(sample);
    json('alignment-results.json', result);
    assert.ok(sample.elapsedMs >= 4900 && sample.frames > 0);
    if (activity === 'moving') {
      assert.ok(sample.clicks > 0 && sample.distinctInputPositions > 1 && sample.distinctCameraOrigins > 1, 'Native performance sample must actually move the camera');
      assert.ok(sample.inputs.every(input => input.pointerType === (screen.touch ? 'touch' : 'mouse')), 'Native sample uses actual requested pointer type');
    }
  } finally { await context.close(); }
}
async function contactSheets() {
  for (const mode of MODES) {
    const entries = result.frames.filter(f => f.timeMs !== null).map(f => ({ time: f.timeMs, ...f.variants.find(v => v.mode === mode) })).filter(v => v.nativeCrop);
    assert.ok(entries.length, `${mode}: motion crops exist`);
    // Read one crop at a time. Frame metadata already records native dimensions,
    // so sizing the sheet does not need31 simultaneously decoded images.
    const cellW = Math.max(...entries.map(e => e.crop.bounds.right - e.crop.bounds.x)) + 8;
    const cellH = Math.max(...entries.map(e => e.crop.bounds.bottom - e.crop.bounds.y)) + 28;
    const columns = 4, canvas = createCanvas(cellW * columns, cellH * Math.ceil(entries.length / columns)), ctx = canvas.getContext('2d');
    ctx.fillStyle = '#101820'; ctx.fillRect(0, 0, canvas.width, canvas.height); ctx.font = '14px sans-serif'; ctx.imageSmoothingEnabled = false;
    for (let i = 0; i < entries.length; i++) {
      const image = await loadImage(path.join(output, entries[i].nativeCrop));
      const x = i % columns * cellW, y = Math.floor(i / columns) * cellH;
      ctx.fillStyle = '#fff'; ctx.fillText(`${mode}: ${entries[i].time} ms | native pixels`, x + 4, y + 18);
      ctx.drawImage(image, x + 4, y + 24); image.src = Buffer.alloc(0);
    }
    fs.writeFileSync(path.join(output, `motion-contact-${mode}-native.png`), canvas.toBuffer('image/png'));
    canvas.width = 1; canvas.height = 1; checkpoint(`contact-sheet:${mode}`);
  }
}
function checkpoint(stage) {
  const memory = process.memoryUsage();
  result.lastCheckpoint = { stage, time: new Date().toISOString(), nodeMemory: memory };
  console.log('SAM_ALIGNMENT_CHECKPOINT ' + JSON.stringify(result.lastCheckpoint));
  // This identifies where a killed process stopped, without assuming its cause.
  json('alignment-progress.json', result.lastCheckpoint);
}
async function main() {
  fs.mkdirSync(output, { recursive: true }); result.runtime = verifyRuntime();
  const server = await serve(), browser = await chromium.launch({ headless: true });
  result.browserVersion = browser.version();
  const url = `http://127.0.0.1:${server.address().port}/nushi-tsuri/`;
  try {
    checkpoint('visuals:start'); await visuals(browser, url); await contactSheets();
    for (const mode of MODES) { checkpoint(`regression:${mode}`); await regression(browser, url, mode); }
    if (process.env.SAM_SAMPLE_PERF === '1') for (const mode of MODES) for (const activity of ['idle', 'moving']) {
      checkpoint(`performance:${mode}:${activity}`); await performanceSample(browser, url, mode, activity);
    }
    assert.deepEqual(result.errors, []); assert.deepEqual(result.httpErrors, []);
    const restorationFailures = result.frames.filter(frame => !frame.restoredScreenshotByteIdentical).map(frame => frame.name);
    assert.deepEqual(restorationFailures, [], 'Exact screenshot restoration gate failed; see saved baseline/actual PNGs and compact hashes');
    result.status = 'passed';
    fs.writeFileSync(path.join(output, 'README.txt'), `Original-art whole-map alignment study\n\nThe served runtime and assets are verified against ${PINNED}. All mutations are removable browser-only #map individual translate/scale and clip-path styles; integer-fit also supplies a dark viewport background. No canvas pixels are rewritten.\n\nBaseline, endpoint and per-frame use the same state and nominal scale. Endpoint holds the initial snapped correction during the transition and snaps again only on the map transform transitionend, so intermediate origins remain fractional. Per-frame snaps each measured absolute map origin to device pixels. Both include parent #world position and move ALL scenery/actors together.\n\nInteger-nearest changes zoom to the nearest >=1 physical source-pixel scale. Integer-fit chooses the lower >=1 integer and narrows/letterboxes the viewport to retain the original visible source extent when possible. A sub1 source downscale cannot retain that extent at integer1; cropped source area and focus/clamp deltas are explicit in JSON. Integer variants account for visual dimensions rather than trusting unchanged clientWidth camera bounds.\n\nEvery paired frame checks source-canvas hashes, player sprite hash/state, actor relative foot registration, synchronized layers, unchanged game state and exact restoration of pipeline and screenshot. The original source aspect is preserved by integer variants, not stretched to16:9. Actor sprites have separate fractional internal sizing.\n\n31 motion frames seek the actual button-generated 300ms transition at10ms spacing. Native Sam crops and contact sheets are unresized device pixels. The same-scale variants use identical screenshot crop bounds. Integer alternatives use their own transformed Sam bounds, with clipping disclosed; do not mistake their changed zoom for a matched-scale improvement. Full screenshots are retained at settled endpoints and motion0/150/300ms.\n\nwidthModel is geometry-only predicted boundary coverage, not actual browser raster widths. Consult actual PNGs/source correspondence for sampling evidence. Native-clock idle and moving performance samples are separate contexts without pixel readback; they cannot measure physical heat.\n`);
    console.log('SAM_ALIGNMENT_EXPERIMENTS_PASS ' + JSON.stringify({ screen, frames: result.frames.length, regressions: result.regressions.length,
      performanceSamples: result.performance.length, motion: result.motion.widthPatternStability }));
  } catch (error) { result.status = 'failed'; result.failure = error.stack; throw error; }
  finally {
    json('alignment-results.json', result); await browser.close(); await new Promise(resolve => server.close(resolve));
  }
}
if (require.main === module) main().catch(error => { console.error(error); process.exitCode = 1; });
module.exports = { widthModel, crop, MODES };
