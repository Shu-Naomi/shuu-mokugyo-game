// Standalone local/public regression evidence. This script never publishes code.
// Local installations may set PLAYWRIGHT_CHROMIUM_EXECUTABLE to an existing browser.
const assert = require('node:assert/strict');
const fs = require('node:fs'), path = require('node:path'), http = require('node:http');
const { boot, seed, read, saveKey } = require('./game-harness.cjs');
const root = path.resolve(__dirname, '..');
const directory = path.resolve(process.env.FISH_BOARDING_EVIDENCE_DIR || path.join(__dirname, 'fish-boarding-evidence'));
const screens = [
  { width: 1280, height: 720, mobile: false, dpr: 1 },
  { width: 844, height: 390, mobile: true, dpr: 1 },
  { width: 820, height: 366, mobile: true, dpr: 1.875 },
];
const startDay = 20, pausedDays = 1000, rareUid = 'pet-1';
function fixture() {
  const specimen = (uid, species, tank) => ({
    uid, species, tank, bornSize: 150, length: 1550, origin: 'bred', generation: 2,
    sex: 'female', acquiredDay: 10, lastDay: startDay, fedDay: startDay, changedDay: startDay,
    water: 100, health: 95, careDays: 10, xp: 100, stars: 3,
    mutation: { checked: true, kind: 'normal', ruleVersion: 0 },
  });
  const fish = [specimen('pet-1', 'funa', 0), specimen('pet-2', 'funa', 0), specimen('pet-3', 'funa', 0), specimen('pet-4', 'aji', 1)];
  Object.assign(fish[0], { nickname: 'こはく', mutation: { checked: true, kind: 'gold', ruleVersion: 1 } });
  for (let n = 5; n <= 9; n++) fish.push(specimen(`pet-${n}`, 'moroko', 2));
  const app = boot({ ...seed(), money: 42000, x: 199, y: 36, soundEnabled: false,
    gameMinutes: startDay * 1440 + 360, caught: { funa: 1, moroko: 1, aji: 1 },
    petLife: { version: 6, mutationSeed: '000000000000000000000000000001ea',
      unlockedTanks: 6, nextId: 10, nextEggId: 6, food: 100, selected: rareUid, selectedTank: 0,
      fish, boarded: [], breeding: {}, mutationDiscoveries: [{ species: 'funa', kind: 'gold', firstUid: rareUid, firstDay: 10, notified: true }],
      eggs: Array.from({ length: 5 }, (_, n) => ({ uid: `egg-${n + 1}`, species: 'moroko', tank: 4,
        laidDay: startDay, hatchDay: startDay + 3, generation: 2, water: 100,
        mutation: { checked: true, kind: 'normal', ruleVersion: 0 } })),
    },
    petNotebook: { version: 1, receivedDay: 10, source: 'existing', announced: true, species: [] },
  });
  try { assert.deepEqual(app.errors, []); return read(app.window, 's'); }
  finally { app.dispose(); }
}
function identity(fish) {
  return Object.fromEntries(['uid', 'species', 'nickname', 'length', 'bornSize', 'generation', 'sex', 'origin', 'acquiredDay', 'mutation'].map(key => [key, fish[key]]));
}
async function run(url, screen, state) {
  const { chromium } = require('playwright');
  const { width, height, mobile, dpr } = screen;
  const browser = await chromium.launch({ headless: true, ...(process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE } : {}) });
  const context = await browser.newContext({ viewport: { width, height }, isMobile: mobile, hasTouch: mobile,
    deviceScaleFactor: dpr, locale: 'ja-JP', serviceWorkers: 'block', reducedMotion: height === 366 ? 'reduce' : 'no-preference' });
  const errors = [], httpErrors = [], requestErrors = [], checks = [];
  const otherSlot = JSON.stringify({ sentinel: 'untouched-other-adventure' });
  let page;
  try {
    await context.addInitScript(({ key, state, otherSlot }) => {
      // Do not overwrite persisted boarding state on reload.
      if (!localStorage.getItem(key)) localStorage.setItem(key, JSON.stringify(state));
      if (!localStorage.getItem(key + '-slot2')) localStorage.setItem(key + '-slot2', otherSlot);
      localStorage.setItem('nushi-inugoya-options-v1', JSON.stringify({ textSpeed: 'instant' }));
      window.__boardingFailSave = false;
      const original = Storage.prototype.setItem;
      Storage.prototype.setItem = function (name, value) {
        if (name === key && window.__boardingFailSave) throw new DOMException('Injected storage quota failure', 'QuotaExceededError');
        return original.call(this, name, value);
      };
    }, { key: saveKey, state, otherSlot });
    page = await context.newPage();
    page.on('pageerror', error => errors.push(error.message));
    const sameApp = address => address.startsWith(new URL('./', url).href);
    page.on('response', response => { if (response.status() >= 400 && sameApp(response.url())) httpErrors.push(`${response.status()} ${response.url()}`); });
    page.on('requestfailed', request => { if (sameApp(request.url())) requestErrors.push(`${request.failure()?.errorText} ${request.url()}`); });
    const press = selector => page.locator(selector)[mobile ? 'tap' : 'click']();
    const fish = uid => page.evaluate(uid => ShuPetLife.allFish(s).find(f => f.uid === uid), uid);
    const snapshot = () => page.evaluate(() => ({ money: s.money, caught: s.caught, sizeRecords: s.sizeRecords, petLife: s.petLife, petNotebook: s.petNotebook }));
    const saved = () => page.evaluate(key => JSON.parse(localStorage.getItem(key)), saveKey);
    const selectFish = async uid => {for(let i=0;i<50&&!await page.locator(`[data-pet-boarding-fish="${uid}"]`).count();i++){if(await page.locator('[data-pet-action="boarding-next"]').isDisabled())break;await press('[data-pet-action="boarding-next"]');}await press(`[data-pet-boarding-fish="${uid}"]`);};
    async function enter() {
      await require('./browser-start-adventure.cjs')(page, mobile);
      if (await page.locator('#lakeIntroSkip').isVisible()) await press('#lakeIntroSkip');
      await press('#action');
      await press('[data-pet-tab="boarding"]');
    }
    async function shot(name, focus = '.pet-boarding-intro') {
      if (focus && !await page.locator('.pet-boarding-mode').count()) await page.locator(focus).scrollIntoViewIfNeeded();
      await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
      const layout = await page.evaluate(() => {
        const modal = document.querySelector('#petLifeModal'), content = modal.querySelector('.pet-content'), r = modal.getBoundingClientRect();
        return { x: r.x, y: r.y, width: r.width, height: r.height, clientWidth: content.clientWidth, scrollWidth: content.scrollWidth,
          buttons: [...modal.querySelectorAll('.pet-boarding-switch button,.pet-boarding-actions button,.pet-boarding-fish button,.pet-boarding-destination select')].map(element => ({ height: element.getBoundingClientRect().height, disabled: element.disabled })) };
      });
      assert.ok(layout.x >= -1 && layout.y >= -1 && layout.x + layout.width <= width + 1 && layout.y + layout.height <= height + 1, `${name}: modal fits viewport ${JSON.stringify(layout)}`);
      assert.ok(layout.scrollWidth <= layout.clientWidth + 1, `${name}: no horizontal content clipping`);
      assert.ok(layout.buttons.every(button => button.height >= 44), `${name}: boarding controls have 44px touch targets`);
      if (await page.locator('.pet-boarding-mode').count()) {
        const fit = await page.locator('.pet-boarding-mode').evaluate(modal => {
          const box=modal.getBoundingClientRect(),content=modal.querySelector('.pet-content');
          const controls=[...modal.querySelectorAll('button,select')].filter(el=>el.getClientRects().length&&getComputedStyle(el).visibility!=='hidden'&&!el.closest('[inert]'));
          const text=[...modal.querySelectorAll('.pet-boarding-card-info,.pet-boarding-identity,.pet-boarding-transfer,.pet-boarding-rules')].filter(el=>el.getClientRects().length&&getComputedStyle(el).visibility!=='hidden');
          return {text:text.map(el=>({label:el.textContent.trim(),overflow:el.scrollHeight-el.clientHeight})),scroll:content.scrollHeight-content.clientHeight,controls:controls.map(el=>{const r=el.getBoundingClientRect();return {label:el.textContent.trim(),height:r.height,fits:r.top>=box.top&&r.bottom<=box.bottom&&r.left>=box.left&&r.right<=box.right};})};
        });
        assert.ok(fit.text.every(t=>t.overflow<=1), `${name}: all fish text remains readable ${JSON.stringify(fit)}`);
        assert.ok(fit.scroll<=1, `${name}: boarding needs no vertical scroll ${JSON.stringify(fit)}`);
        assert.ok(fit.controls.every(c=>c.fits&&c.height>=44), `${name}: visible controls fit and have 44px targets ${JSON.stringify(fit)}`);
        checks.push({name,oneScreen:fit});
      }
      await page.screenshot({ path: path.join(directory, `${width}x${height}-${name}.png`) });
      checks.push({ name, layout });
    }
    async function unchanged(before, label) { assert.deepEqual(await snapshot(), before, label); }
    async function noDuplicates() {
      const all = await page.evaluate(() => ShuPetLife.allFish(s).map(f => f.uid));
      assert.equal(new Set(all).size, all.length, 'all living and boarded UIDs are unique');
    }
    async function confirmOnce(action) {
      // A stale queued second click must not move another individual or duplicate this one.
      const handle = await page.locator(`[data-pet-action="${action}"]`).elementHandle();
      await press(`[data-pet-action="${action}"]`);
      await handle.evaluate(element => element.click());
      await handle.dispose();
      await noDuplicates();
      assert.equal(await page.locator(`[data-pet-action="${action}"]`).count(), 0);
    }
    await page.goto(url, { waitUntil: 'load' }); await enter();
    const original = await fish(rareUid), initial = await snapshot();
    assert.match(await page.locator('.pet-boarding-intro').innerText(), /無料.*0円/s);
    await press('[data-pet-action="boarding-help"]');
    assert.match(await page.locator('.pet-boarding-intro').innerText(), /通常色・希少色を合わせて2匹/);
    assert.match(await page.locator('.pet-boarding-intro').innerText(), /成長・空腹・繁殖/);
    await shot('boarding-rules'); await press('[data-pet-action="boarding-help-close"]');
    assert.match(await page.locator('#petBoardingSpecies option[value="funa"]').textContent(), /0\/2$/);
    await shot('deposit-list');
    await selectFish(rareUid);
    assert.match(await page.locator('.pet-boarding-detail').innerText(), /こはく.*黄金/s);
    assert.match(await page.locator('.pet-boarding-detail').innerText(), /15\.50cm.*3代目/s);
    await page.waitForSelector(`[data-pet-specimen="${rareUid}"] canvas[data-art-variant="funaGold"]`);
    await shot('rare-confirmation', '.pet-boarding-actions');
    await press('[data-pet-action="boarding-cancel"]'); await unchanged(initial, 'Cancel is not a deposit');
    await selectFish(rareUid);
    await page.setViewportSize({width:width+1,height});await page.setViewportSize({width,height});
    await page.waitForFunction(()=>document.activeElement.id==='petBoardingHeading');
    await page.keyboard.press('Escape'); await unchanged(initial, 'Escape after resize is not a deposit');
    assert.equal(await page.locator('#petLifeModal').evaluate(el=>el.classList.contains('open')),true,'resize keeps Escape inside boarding');
    assert.equal(await page.locator('.pet-boarding-detail').count(), 0);
    await selectFish(rareUid); await page.locator('#petShopSection').selectOption('supplies'); await press('[data-pet-tab="boarding"]');
    assert.equal(await page.locator('.pet-boarding-detail').count(), 0); await unchanged(initial, 'tab navigation drops only the pending selection');
    await selectFish(rareUid); await press('[data-pet-action="close"]'); await press('#action'); await press('[data-pet-tab="boarding"]');
    assert.equal(await page.locator('.pet-boarding-detail').count(), 0); await unchanged(initial, 'Close leaves fish in place');
    await selectFish(rareUid);
    const beforeFailure = await snapshot(), savedBeforeFailure = await saved();
    await page.evaluate(() => { window.__boardingFailSave = true; });
    await press('[data-pet-action="boarding-confirm"]');
    assert.match(await page.locator('.pet-message').innerText(), /保存できなかった/);
    await unchanged(beforeFailure, 'failed deposit rolls back the complete state');
    assert.deepEqual(await saved(), savedBeforeFailure, 'failed deposit does not overwrite the save');
    await shot('deposit-save-failure', '.pet-boarding-actions');
    await page.evaluate(() => { window.__boardingFailSave = false; });
    await confirmOnce('boarding-confirm');
    assert.deepEqual(identity(await fish(rareUid)), identity(original));
    assert.equal(await page.evaluate(uid => s.petLife.fish.some(f => f.uid === uid), rareUid), false);
    const boarded = await fish(rareUid); assert.equal(boarded.boardedDay, startDay);
    await selectFish('pet-2'); await confirmOnce('boarding-confirm');
    assert.match(await page.locator('#petBoardingSpecies option[value="funa"]').textContent(), /2\/2$/);
    assert.equal(await page.locator('[data-pet-boarding-fish="pet-3"]').isDisabled(), true, 'normal and rare share one species limit');
    await selectFish('pet-5'); await confirmOnce('boarding-confirm');
    assert.match(await page.locator('#petBoardingSpecies option[value="moroko"]').textContent(), /1\/2$/, 'another species has independent capacity');
    // Put the Moroko back, retaining a genuinely full destination for the checks below.
    await press('[data-pet-boarding-view="withdraw"]'); await selectFish('pet-5');
    await page.locator('#petBoardingTank').selectOption('2'); await confirmOnce('boarding-withdraw-confirm');
    await page.reload({ waitUntil: 'load' }); await enter();
    assert.deepEqual(await fish(rareUid), boarded, 'reload retains exact boarded fish, mutation and clocks');
    await press('[data-pet-boarding-view="withdraw"]'); await selectFish(rareUid);
    assert.equal(await page.locator('[data-pet-action="boarding-withdraw-confirm"]').isDisabled(), true, 'destination is explicit');
    const destinations = await page.locator('#petBoardingTank option').evaluateAll(options => options.map(option => ({ value: option.value, disabled: option.disabled, label: option.textContent })));
    for (const tank of ['1', '2', '4']) assert.equal(destinations.find(option => option.value === tank).disabled, true, `incompatible/full/egg-reserved tank ${tank} disabled`);
    assert.equal(destinations.find(option => option.value === '3').disabled, false, 'compatible empty tank enabled');
    assert.match(destinations.find(option => option.value === '1').label, /淡水.*入れられない/);
    assert.match(destinations.find(option => option.value === '2').label, /満員/);
    assert.match(destinations.find(option => option.value === '4').label, /満員/);
    await shot('withdraw-destinations', '.pet-boarding-actions');
    const beforeWithdrawCancel = await snapshot();
    await page.locator('#petBoardingTank').selectOption('3'); await press('[data-pet-action="boarding-cancel"]');
    await unchanged(beforeWithdrawCancel, 'Cancel never returns a fish');
    await press('[data-pet-action="notebook"]'); await press('[data-notebook-species="funa"]'); await press(`[data-notebook-fish="${rareUid}"]`);
    assert.match(await page.locator('.pet-notebook-specimen').innerText(), /こはく.*お預かり中/s);
    assert.match(await page.locator('.pet-notebook-specimen').innerText(), /黄金/);
    await press(`[data-pet-name="${rareUid}"]`); await page.locator('#petNickname').fill('こはくちゃん'); await press('[data-pet-action="nickname-save"]');
    assert.equal((await fish(rareUid)).nickname, 'こはくちゃん'); await noDuplicates();
    await shot('boarded-notebook', '.pet-notebook-specimen');
    await press('[data-pet-action="close"]');
    const paused = await fish(rareUid);
    await page.evaluate(days => { s.gameMinutes += days * 1440; ShuPetLife.sync(s, petCatalog, gameClockAt(s.gameMinutes).dayIndex); save(); render(); }, pausedDays);
    assert.deepEqual(await fish(rareUid), paused, '1000 game days do not age, starve, breed or mutate a boarded fish');
    await page.reload({ waitUntil: 'load' }); await enter();
    assert.deepEqual(await fish(rareUid), paused, 'reload after a long absence still preserves paused state');
    await press('[data-pet-boarding-view="withdraw"]'); await selectFish(rareUid); await page.locator('#petBoardingTank').selectOption('3');
    const beforeReturnFailure = await snapshot(), savedBeforeReturnFailure = await saved();
    await page.evaluate(() => { window.__boardingFailSave = true; });
    await press('[data-pet-action="boarding-withdraw-confirm"]');
    assert.match(await page.locator('.pet-message').innerText(), /保存できなかった/);
    await unchanged(beforeReturnFailure, 'failed withdrawal rolls back the complete state');
    assert.deepEqual(await saved(), savedBeforeReturnFailure, 'failed withdrawal keeps last good save');
    await page.evaluate(() => { window.__boardingFailSave = false; });
    await confirmOnce('boarding-withdraw-confirm');
    const returned = await fish(rareUid);
    assert.deepEqual(identity(returned), identity(paused)); assert.equal(returned.tank, 3); assert.equal(Object.hasOwn(returned, 'boardedDay'), false);
    for (const key of ['water', 'health', 'careDays', 'xp', 'level', 'stars']) assert.equal(returned[key], paused[key], `no ${key} catch-up on return`);
    for (const key of ['lastDay', 'fedDay', 'changedDay']) assert.equal(returned[key], paused[key] + pausedDays, `${key} shifts by the paused interval`);
    assert.equal(await page.evaluate(uid => s.petLife.boarded.some(f => f.uid === uid), rareUid), false);
    await press('[data-pet-boarding-view="deposit"]'); await selectFish(rareUid); await confirmOnce('boarding-confirm');
    await press('[data-pet-boarding-view="withdraw"]'); await selectFish(rareUid); await page.locator('#petBoardingTank').selectOption('3'); await confirmOnce('boarding-withdraw-confirm');
    assert.deepEqual(await fish(rareUid), returned, 'repeat deposit/return does not drift identity or care clocks');
    await page.reload({ waitUntil: 'load' }); await enter();
    assert.deepEqual(await fish(rareUid), returned, 'returned nickname and rare colour survive reload');
    assert.equal(await page.evaluate(() => s.money), initial.money, 'all boarding and return transactions are free');
    assert.deepEqual(await page.evaluate(() => s.caught), initial.caught);
    assert.equal(await page.evaluate(key => localStorage.getItem(key + '-slot2'), saveKey), otherSlot, 'other adventure slot untouched');
    await noDuplicates(); await selectFish(rareUid); await shot('returned-rare-fish', '.pet-boarding-actions');
    assert.deepEqual(errors, []); assert.deepEqual(httpErrors, []); assert.deepEqual(requestErrors, []);
    // Stress the actual supported minimum with a full catalogue, every tank,
    // twelve-character names, and the distinct empty/egg-only states.
    await press('[data-pet-action="boarding-cancel"]');
    await page.evaluate(() => {
      s.petLife.fish=[];s.petLife.boarded=[];s.petLife.eggs=[];s.petLife.unlockedTanks=6;s.petLife.legendClaims={};
      for(const entry of petCatalog)s.caught[entry.id]=1;
      for(let t=0;t<6;t++)for(let i=0;i<5;i++)ShuPetLife.acquire(s,t%2?'aji':'funa',petCatalog,gameClockAt(s.gameMinutes).dayIndex,t);
      for(const entry of petCatalog.filter(f=>ShuPetLife.isLegend(f)))ShuPetLife.acquire(s,entry.id,petCatalog,gameClockAt(s.gameMinutes).dayIndex);
      for(const f of s.petLife.fish)ShuPetLife.renameFish(s,f.uid,'あいうえおかきくけこさし');
      s.petLife.fish[0].mutation={checked:true,kind:'gold',ruleVersion:1};s.petLife.fish[0].generation=20;
      petUi.render();
    });
    await page.locator('#petBoardingSpecies').selectOption('all');
    await shot('maximum-long-name-list');
    const longRare=await page.evaluate(()=>s.petLife.fish[0].uid);
    await selectFish(longRare);await shot('long-rare-confirmation');await confirmOnce('boarding-confirm');
    await press('[data-pet-boarding-view="withdraw"]');await selectFish(longRare);await page.locator('#petBoardingTank').selectOption('0');
    await page.evaluate(()=>{window.__boardingFailSave=true;});await press('[data-pet-action="boarding-withdraw-confirm"]');await shot('long-rare-withdraw-failure');
    await page.evaluate(()=>{window.__boardingFailSave=false;});await confirmOnce('boarding-withdraw-confirm');await press('[data-pet-boarding-view="deposit"]');
    const reached=[];
    for(let n=0;n<100;n++){
      reached.push(...await page.locator('[data-pet-boarding-fish]').evaluateAll(els=>els.map(el=>el.dataset.petBoardingFish)));
      if(await page.locator('[data-pet-action="boarding-next"]').isDisabled())break;
      await press('[data-pet-action="boarding-next"]');
    }
    assert.deepEqual(reached,await page.evaluate(()=>s.petLife.fish.map(f=>f.uid)),'every fish in maximum collection is reachable by paging');
    await shot('maximum-last-page');
    await selectFish(reached.at(-1));await shot('long-name-confirmation');
    await press('[data-pet-action="boarding-cancel"]');
    assert.equal(await page.locator(`[data-pet-boarding-fish="${reached.at(-1)}"]`).count(),1,'Cancel keeps the current page');
    await page.evaluate(()=>{s.petLife.fish=[];s.petLife.boarded=[];s.petLife.eggs=[{uid:'egg-empty-1',species:'funa',tank:0,laidDay:gameClockAt(s.gameMinutes).dayIndex,hatchDay:gameClockAt(s.gameMinutes).dayIndex+3,generation:1,water:100}];petUi.render();});
    await shot('empty-with-eggs');assert.equal(await page.locator('[data-pet-boarding-fish]').count(),0);
    await press('[data-pet-boarding-view="withdraw"]');await shot('empty-boarding');
    assert.deepEqual(errors, []);
    const result = { screen, pausedDays, checks, destinations, identityRetained: true, noCatchUp: true,
      sharedSpeciesLimit: true, saveRollbackAndRetry: ['deposit', 'withdraw'], cancellationAndRepeat: true,
      nicknameAndReload: true, slotIsolation: true, errors, httpErrors, requestErrors };
    fs.writeFileSync(path.join(directory, `${width}x${height}-result.json`), JSON.stringify(result, null, 2));
    console.log(`FISH_BOARDING_PASS ${width}x${height}: ${checks.length} screenshots, deposit/return/cancel/reload/rollback`);
  } catch (error) {
    if (page) await page.screenshot({ path: path.join(directory, `${width}x${height}-failure.png`) }).catch(() => {});
    fs.writeFileSync(path.join(directory, `${width}x${height}-failure.json`), JSON.stringify({ screen, error: error.stack, checks, errors, httpErrors, requestErrors }, null, 2));
    throw error;
  } finally { await context.close(); await browser.close(); }
}
const types = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.png': 'image/png', '.webp': 'image/webp', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml', '.mp3': 'audio/mpeg', '.wav': 'audio/wav' };
async function main() {
  fs.mkdirSync(directory, { recursive: true }); const state = fixture();
  if (process.env.FISH_BOARDING_PUBLIC_URL) { for (const screen of screens) await run(process.env.FISH_BOARDING_PUBLIC_URL, screen, state); return; }
  const server = http.createServer((request, response) => {
    try {
      const name = new URL(request.url, 'http://localhost').pathname.replace(/^\/nushi-tsuri\//, '') || 'index.html';
      const file = path.resolve(root, name);
      if (!file.startsWith(root + path.sep) || !fs.statSync(file).isFile()) throw Error('path');
      response.writeHead(200, { 'Content-Type': types[path.extname(file)] || 'application/octet-stream', 'Cache-Control': 'no-store' }); fs.createReadStream(file).pipe(response);
    } catch { response.writeHead(404); response.end(); }
  });
  await new Promise((resolve, reject) => { server.once('error', reject); server.listen(0, '127.0.0.1', resolve); });
  try { for (const screen of screens) await run(`http://127.0.0.1:${server.address().port}/nushi-tsuri/`, screen, state); }
  finally { await new Promise(resolve => server.close(resolve)); }
}
module.exports = { fixture, identity, run, screens };
if (require.main === module) main().catch(error => { console.error(error); process.exitCode = 1; });
