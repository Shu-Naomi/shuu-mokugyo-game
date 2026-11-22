'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require('playwright');
const { seed, saveKey } = require('./game-harness.cjs');
const { server } = require('./browser-reference-village-evidence.cjs');
const startAdventure = require('./browser-start-adventure.cjs');

const routes = [
  { name: 'bridge-bank', x:124, y:56, steps:'RRRDRRDRDR' },
  { name: 'north-fork', x:215, y:21, steps:'DD' },
  { name: 'east-bend', x:231, y:63, steps:'DDDDD' },
  { name: 'southwest-bank', x:138, y:107, steps:'RDR' },
  { name: 'lily-pond-bend', x:79, y:64, steps:'RR' },
  { name: 'reed-marsh-outer-road', x:234, y:64, steps:'DDD' },
  { name: 'wetland-shop-approach', x:177, y:37, steps:'LLLLU', shop:true },
  { name: 'sand-deck', x:115, y:77, steps:'LL', dock:'sand' },
  { name: 'reef-deck', x:88, y:92, steps:'RR', dock:'reef' }
];
const directions = { R:['right',4,0,'L'], L:['left',-4,0,'R'], U:['up',0,-4,'D'], D:['down',0,4,'U'] };
const output = path.join(__dirname, 'marsh-evidence', 'field-paths');
async function check(browser, url, mobile, route) {
  const viewport = mobile ? {width:844,height:390} : {width:1280,height:720};
  const context = await browser.newContext({ viewport, isMobile:mobile, hasTouch:mobile, serviceWorkers:'block', locale:'ja-JP' });
  try {
    const mapRegion = route.dock ? 'coast' : 'wetland';
    const fixture = {...seed(), mapRegion, x:route.x, y:route.y, hp:100, soundEnabled:false,
      ownedVehicles:['canoe'], equipment:{vehicle:'canoe',hands:null}, boatActive:false};
    await context.addInitScript(({key, fixture}) => {
      if (!localStorage.getItem(key)) localStorage.setItem(key, JSON.stringify(fixture));
      localStorage.setItem('nushi-inugoya-options-v1',JSON.stringify({textSpeed:'instant'}));
    }, {key:saveKey, fixture});
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.goto(url);
    await startAdventure(page,mobile);
    const press = selector => page.locator(selector)[mobile ? 'tap' : 'click']();
    if (await page.locator('#lakeIntroSkip').isVisible()) await press('#lakeIntroSkip');
    const position = () => page.evaluate(() => [s.mapRegion,s.x,s.y,s.boatActive]);
    let {x,y} = route;
    const expected = () => [mapRegion,x,y,false];
    assert.deepEqual(await position(),expected(),route.name+' saved start');
    const input = async key => {
      const [direction] = directions[key];
      if (mobile) await press('[data-move="'+direction+'"]');
      else await page.keyboard.press('Arrow'+direction[0].toUpperCase()+direction.slice(1));
    };
    const walk = async key => {
      await input(key);
      x += directions[key][1];
      y += directions[key][2];
      assert.deepEqual(await position(),expected(),route.name+' '+key);
    };
    for (const key of route.steps) await walk(key);
    if (route.dock) {
      await input(route.steps[0]);
      assert.deepEqual(await position(),expected(),'stop at end of boards');
    }
    await page.waitForFunction(() => !playerWalking);
    await page.screenshot({path:path.join(output,viewport.width+'-'+route.name+'.png')});
    if (route.shop) {
      assert.equal(await page.evaluate(()=>ShuWorldLife.nearby(s)?.id),'wetland-shop');
      const shop=await page.locator('[data-world-life="wetland-shop"]').boundingBox();
      const player=await page.locator('#player').boundingBox();
      assert.ok(shop.height>player.height*2,'storefront reads taller than the player');
      const inFront=await page.evaluate(()=>Number(getComputedStyle(document.querySelector('#player')).zIndex)>
        Number(getComputedStyle(document.querySelector('[data-world-life="wetland-shop"]')).zIndex));
      assert.ok(inFront,'player on the doorstep stays visible in front of the shop');
      await press('#action');await page.locator('#store.open').waitFor();
      await press('#store [data-close]');assert.deepEqual(await position(),expected());
    }
    for (const key of [...route.steps].reverse()) await walk(directions[key][3]);
    if (route.dock) {
      await press('#action');
      assert.deepEqual(await position(),['coast',route.dock==='sand'?98:106,y,true]);
      await press('#action');
      assert.deepEqual(await position(),expected(),'disembark at the original landing');
    }
    assert.deepEqual(errors,[]);
    console.log('FIELD_WALK',viewport.width,route.name,route.steps,'and back',x,y);
  } finally { await context.close(); }
}
(async () => {
  fs.mkdirSync(output,{recursive:true});
  const host=server();
  await new Promise((resolve,reject) => {host.once('error',reject);host.listen(0,'127.0.0.1',resolve);});
  try {
    const browser=await chromium.launch({headless:true});
    try {
      for (const mobile of [false,true]) for (const route of routes)
        await check(browser,'http://127.0.0.1:'+host.address().port+'/nushi-tsuri/',mobile,route);
    } finally { await browser.close(); }
  } finally { await new Promise(resolve=>host.close(resolve)); }
})().catch(error=>{console.error(error);process.exitCode=1;});
