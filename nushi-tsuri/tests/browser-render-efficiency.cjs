// Real Chromium checks and screenshots. No publishing, remote writes, or long stress loop.
const assert = require('node:assert/strict');
const fs = require('node:fs'), path = require('node:path'), http = require('node:http');
const {chromium} = require('playwright');
const {seed, saveKey} = require('./game-harness.cjs');
const fixture = require('./browser-render-efficiency-fixture.cjs');
const root = path.resolve(__dirname, '..');
const directory = path.resolve(process.env.RENDER_EFFICIENCY_EVIDENCE_DIR || path.join(__dirname, 'render-efficiency-evidence'));
const screens = [{width: 1280, height: 720, mobile: false, dpr: 1}, {width: 844, height: 390, mobile: true, dpr: 3}];
async function run(url, screen) {
  const {width, height, mobile, dpr} = screen;
  const browser = await chromium.launch({headless: true, ...(process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE ? {executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE} : {})});
  const context = await browser.newContext({viewport: {width, height}, isMobile: mobile, hasTouch: mobile,
    deviceScaleFactor: dpr, locale: 'ja-JP', serviceWorkers: 'block', reducedMotion: 'no-preference'});
  const errors = [], assetFailures = [], checks = []; let page;
  try {
    await context.addInitScript(({state, key}) => {
      localStorage.setItem(key, JSON.stringify(state));
      localStorage.setItem('nushi-inugoya-options-v1', JSON.stringify({textSpeed: 'instant'}));
      window.__paintCounts = {};
      const clear = CanvasRenderingContext2D.prototype.clearRect;
      CanvasRenderingContext2D.prototype.clearRect = function (...args) {
        const canvas = this.canvas;
        const name = canvas.classList?.contains('scenery-motion') ? `motion:${canvas.dataset.for}` : canvas.id;
        if (name) window.__paintCounts[name] = (window.__paintCounts[name] || 0) + 1;
        return clear.apply(this, args);
      };
    }, {key: saveKey, state: {...seed(), soundEnabled: false, homeAquariumFishId: 'funa'}});
    page = await context.newPage();
    page.on('pageerror', error => errors.push(error.message));
    const sameApp = address => address.startsWith(new URL('./', url).href);
    page.on('response', response => {if (response.status() >= 400 && sameApp(response.url())) assetFailures.push(`${response.status()} ${response.url()}`);});
    page.on('requestfailed', request => {if (sameApp(request.url())) assetFailures.push(`${request.failure()?.errorText} ${request.url()}`);});
    const press = selector => page.locator(selector)[mobile ? 'tap' : 'click']();
    const shot = name => page.screenshot({path: path.join(directory, `${width}x${height}-${name}.png`)});
    const sample = milliseconds => page.evaluate(async ms => {
      window.__paintCounts = {}; window.__homePaints = {dogs: 0, aquarium: 0};
      const start = performance.now(); await new Promise(resolve => setTimeout(resolve, ms));
      return {milliseconds: performance.now() - start, home: {...window.__homePaints}, canvas: {...window.__paintCounts}};
    }, milliseconds);
    const setHidden = value => page.evaluate(value => {
      Object.defineProperty(document, 'hidden', {configurable: true, value});
      document.dispatchEvent(new Event('visibilitychange'));
    }, value);
    await page.goto(url, {waitUntil: 'load', timeout: 90000});
    await require('./browser-start-adventure.cjs')(page, mobile);
    if (await page.locator('#lakeIntroSkip').isVisible()) await press('#lakeIntroSkip');
    await page.waitForFunction(() => document.querySelector('#worldPixels').style.backgroundImage === 'none');
    await shot('field');
    const field = await sample(300);
    assert.ok(field.canvas['motion:worldPixels'] > 0, 'real visible world layer animates'); checks.push({name: 'field', ...field});

    await page.evaluate(fixture.enterHomeFixture);
    await page.waitForFunction(() => document.querySelector('#homeBackdrop').style.backgroundImage === 'none' && document.querySelector('#homeAquariumFish canvas')?.dataset.artPaintKey);
    await page.evaluate(() => {
      const dogs = drawHomeDogs, fish = drawAquariumFish;
      window.__homePaints = {dogs: 0, aquarium: 0};
      drawHomeDogs = (...args) => {window.__homePaints.dogs++; return dogs(...args);};
      drawAquariumFish = (...args) => {window.__homePaints.aquarium++; return fish(...args);};
    });
    const home = await sample(400);
    for (const kind of ['dogs', 'aquarium']) {
      assert.ok(home.home[kind] > 0, `${kind} is still animated`);
      assert.ok(home.home[kind] <= Math.ceil(home.milliseconds * 30 / 1000) + 2, `${kind} is capped at 30 paints/sec: ${JSON.stringify(home)}`);
    }
    assert.equal(home.canvas['motion:worldPixels'] || 0, 0, 'world behind the full home does not repaint');
    const homeArt = await page.evaluate(() => {
      const scene = document.querySelector('#homeBackdrop'), fish = document.querySelector('#homeAquariumFish canvas');
      const rgba = fish.getContext('2d').getImageData(0, 0, fish.width, fish.height).data;
      let opaque = 0; for (let i = 3; i < rgba.length; i += 4) if (rgba[i]) opaque++;
      return {scene: [scene.width, scene.height], fish: [fish.width, fish.height], opaque, dogs: document.querySelectorAll('[data-home-dog] canvas').length};
    });
    assert.ok(homeArt.scene[0] >= 1536 && homeArt.scene[1] >= 864, 'native artwork resolution remains intact');
    assert.deepEqual(homeArt.fish, [448, 224]); assert.ok(homeArt.opaque > 100); assert.equal(homeArt.dogs, 3);
    await shot('home'); checks.push({name: 'home-native-timers', ...home, artwork: homeArt});
    for (const hz of [60, 120]) {
      const r = await page.evaluate(fixture.measureHomePaints, hz);
      assert.equal(r.beforePaints, hz + 1); assert.equal(r.dogPaints, 31); assert.equal(r.aquariumPaints, 31);
      assert.equal(r.movementSteps, hz); assert.deepEqual(r.dogs, r.referenceDogs);
      assert.equal(r.elapsed, r.referenceElapsed); assert.equal(r.saveUnchanged, true);
      checks.push({name: `deterministic-${hz}hz`, beforePaints: r.beforePaints, afterDogPaints: r.dogPaints, afterAquariumPaints: r.aquariumPaints, movementSteps: r.movementSteps, elapsed: r.elapsed});
    }
    await page.evaluate(() => {renderHomeDogs(); renderHomeAquarium();});
    await setHidden(true); const hidden = await sample(180);
    assert.equal(hidden.home.dogs, 0); assert.equal(hidden.home.aquarium, 0);
    assert.equal(hidden.canvas['motion:homeBackdrop'] || 0, 0);
    await setHidden(false); const resumed = await sample(180);
    assert.ok(resumed.home.dogs > 0 && resumed.home.aquarium > 0); checks.push({name: 'synthetic-visibility-event', hidden, resumed});

    await page.evaluate(() => openOptions());
    async function checkCoverage(label) {
      const state = await page.evaluate(() => {
        const tank = document.querySelector('#homeAquarium').getBoundingClientRect(), options = document.querySelector('#options').getBoundingClientRect();
        const contained = tank.width > 0 && tank.height > 0 && tank.left >= options.left + 16 && tank.right <= options.right - 16 && tank.top >= options.top + 16 && tank.bottom <= options.bottom - 16;
        return {contained, reported: homeAquariumCoveredByOptions(), running: !!aquariumAnimationTimer, tank: tank.toJSON(), options: options.toJSON()};
      });
      assert.equal(state.reported, state.contained); assert.equal(state.running, !state.contained);
      const measured = await sample(180);
      if (state.contained) assert.equal(measured.home.aquarium, 0); else assert.ok(measured.home.aquarium > 0);
      assert.equal(measured.home.dogs, 0, 'settings pauses home dog loop');
      checks.push({name: label, ...state, measured}); return state.contained;
    }
    const firstCoverage = await checkCoverage('settings'); await shot('settings');
    const otherSize = mobile ? {width: 1280, height: 720} : {width: 844, height: 390};
    await page.setViewportSize(otherSize);
    await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
    const resizedCoverage = await checkCoverage('resized-settings');
    assert.notEqual(firstCoverage, resizedCoverage, 'desktop exposed tank and landscape phone fully covered tank both exercised');
    await page.setViewportSize({width, height});
    await press('#optionsClose');
    const afterOptions = await sample(180); assert.ok(afterOptions.home.aquarium > 0 && afterOptions.home.dogs > 0);
    checks.push({name: 'settings-closed', ...afterOptions});

    const raster = await page.evaluate(fixture.checkFishRasterKeys);
    assert.deepEqual(raster, {first: 1, repeated: 1, changedFrame: 2, appearance: 3, yaw: 4, changedAppearance: 5, resized: 6,
      failedMemoized: false, retried: true, incompletePaints: 0, incompleteMemoized: false,
      afterLoad: 1, afterRepeat: 1, latestFrame: 4, wrapperYawPaints: 2, wrapperTailPaints: 2, size: [448, 224]});
    checks.push({name: 'real-raster-key-load-decode', ...raster});

    await page.evaluate(() => openDogCare('shuu'));
    await page.waitForFunction(() => dogIdleImage.complete && dogIdleImage.naturalWidth > 0 && petSceneImage.complete && petSceneImage.naturalWidth > 0);
    await shot('dog-care');
    await setHidden(true);
    await page.evaluate(() => {
      setDogCareScene('pet', 'shuu', null, 90);
      companionReaction = 'pet'; document.querySelector('#petScene').classList.add('active'); petSceneFrame = 0;
    });
    const careHidden = await sample(180);
    assert.equal(careHidden.canvas.dogCareSceneCanvas || 0, 0); assert.equal(careHidden.canvas.petSceneCanvas || 0, 0);
    assert.equal(await page.evaluate(() => dogCareScene.mode), 'idle', 'real 60ms timer still completes the action while hidden');
    assert.equal(await page.evaluate(() => petSceneFrame), 0);
    await setHidden(false); const careVisible = await sample(180);
    assert.ok(careVisible.canvas.dogCareSceneCanvas > 0); assert.ok(careVisible.canvas.petSceneCanvas > 0);
    checks.push({name: 'care-native-timers', hidden: careHidden, resumed: careVisible});
    await page.evaluate(() => {companionReaction = null; document.querySelector('#petScene').classList.remove('active'); close(); playerHomeState.area = null; render();});
    const returned = await sample(300); assert.ok(returned.canvas['motion:worldPixels'] > 0);
    checks.push({name: 'returned-world', ...returned});

    // Enter through existing fishing functions, then freeze only battle physics
    // so this short visual test cannot randomly land/lose a fish while sampling.
    await page.evaluate(() => {
      cast(fishingSpots[0]); beginFishing(); clearInterval(timer);
      battle.cast = 50; launchSurfaceCast(); settleSurfaceCast(); startFight(); clearInterval(timer); finishHookReveal();
      stopBattleFishArt(); stopSurfaceCastAnimation();
      battle.fightMode = 'nushi'; advanceUnderwaterTravel(); renderBattleFish(); renderUnderwaterTravel(); renderPixelScenery();
    });
    await page.waitForFunction(() => document.querySelector('#underwaterPixels').dataset.travelReady === 'true' && nushiWaterImage.complete && nushiWaterImage.naturalWidth > 0);
    // Warm scenery can be ready before the existing 360ms dive finishes.
    await page.waitForFunction(() => !document.querySelector('#fishScene').classList.contains('surface-diving'), null, {timeout: 2000});
    await page.evaluate(() => renderUnderwaterTravel());
    assert.equal(await page.evaluate(() => document.querySelector('#underwaterTravel').dataset.scenery), 'open-water');
    assert.equal(await page.evaluate(() => document.querySelector('#fishScene').classList.contains('nushi-water')), true);
    const nushi = await sample(300);
    assert.equal(nushi.canvas['motion:worldPixels'] || 0, 0); assert.equal(nushi.canvas['motion:underwaterPixels'] || 0, 0);
    // The fixture freezes battle RAF; settle its line after the final pose.
    await page.evaluate(() => syncBattleFishLine());
    await shot('nushi'); checks.push({name: 'nushi', ...nushi});
    await page.evaluate(() => {battle.fightMode = 'gauge'; battle.method = 'lure'; renderUnderwaterTravel();});
    const lureState = await page.evaluate(() => ({nushi: document.querySelector('#fishScene').classList.contains('nushi-water'),
      composite: document.querySelector('#fishScene').classList.contains('underwater-travel'), opacity: getComputedStyle(document.querySelector('#underwaterPixels')).opacity,
      animationVisible: ShuScenery.animationVisible(document.querySelector('#underwaterPixels')), scenery: document.querySelector('#underwaterTravel').dataset.scenery}));
    assert.equal(lureState.nushi, false); assert.equal(lureState.composite, true); assert.equal(lureState.opacity, '0');
    assert.equal(lureState.animationVisible, true); assert.equal(lureState.scenery, 'gauge');
    const lure = await sample(300); assert.ok(lure.canvas['motion:underwaterPixels'] > 0, 'opacity-zero layer still feeds the visible lure composite');
    await page.evaluate(() => {renderUnderwaterTravel(); syncBattleFishLine();}); await shot('lure'); checks.push({name: 'lure', ...lureState, ...lure});
    await page.evaluate(() => endBattle());
    const afterFishing = await sample(300); assert.ok(afterFishing.canvas['motion:worldPixels'] > 0);
    assert.deepEqual(errors, []); assert.deepEqual(assetFailures, []);
    fs.writeFileSync(path.join(directory, `${width}x${height}-result.json`), JSON.stringify({screen, checks, errors, assetFailures}, null, 2));
    console.log(`RENDER_EFFICIENCY_PASS ${width}x${height} DPR ${dpr}: ${checks.length} checks`);
  } catch (error) {
    if (page) await page.screenshot({path: path.join(directory, `${width}x${height}-failure.png`)}).catch(() => {});
    fs.writeFileSync(path.join(directory, `${width}x${height}-failure.json`), JSON.stringify({screen, checks, errors, assetFailures, error: error.stack}, null, 2));
    throw error;
  } finally {await context.close(); await browser.close();}
}
const types = {'.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.png': 'image/png', '.webp': 'image/webp', '.svg': 'image/svg+xml', '.mp3': 'audio/mpeg', '.wav': 'audio/wav'};
const server = http.createServer((req, res) => {
  try {
    const name = new URL(req.url, 'http://localhost').pathname.replace(/^\/nushi-tsuri\//, '') || 'index.html';
    const file = path.resolve(root, name);
    if (!file.startsWith(root + path.sep) || !fs.statSync(file).isFile()) throw Error('path');
    res.writeHead(200, {'Content-Type': types[path.extname(file)] || 'application/octet-stream', 'Cache-Control': 'no-store'});
    fs.createReadStream(file).pipe(res);
  } catch {res.writeHead(404); res.end();}
});
(async () => {
  fs.mkdirSync(directory, {recursive: true});
  await new Promise((resolve, reject) => {server.once('error', reject); server.listen(0, '127.0.0.1', resolve);});
  try {for (const screen of screens) await run(`http://127.0.0.1:${server.address().port}/nushi-tsuri/`, screen);}
  finally {await new Promise(resolve => server.close(resolve));}
})().catch(error => {console.error(error); process.exitCode = 1;});
