// Production entry and touch controls with a private legacy save. The five
// known entries are a portrait fixture; the worm catch is earned in play.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const {chromium} = require('playwright');
const {seed,saveKey} = require('./game-harness.cjs');
const {pressProduct,revealProduct} = require('./compact-ui-helpers.cjs');
const {server} = require('./browser-reference-village-evidence.cjs');
const enter = require('./browser-start-adventure.cjs');
const {assertRelease} = require('./browser-release.cjs');

const entries = {kijihata:'キジハタ',umazurahagi:'ウマヅラハギ',akaza:'アカザ',
  kokuchibasu:'コクチバス',juzukakehaze:'ジュズカケハゼ'};
const dir = path.resolve(process.env.SOFT_WORM_EVIDENCE_DIR || '/tmp/soft-worm-evidence');
const gear = () => ({money:s.money,worm:s.baits.worm,soft:s.lures.softWorm,spoon:s.lures.silverSpoon,
  lure:s.selectedLure,method:s.fishingMethod,rod:s.selectedRod});

async function run(browser,url,viewport) {
  const context = await browser.newContext({viewport,isMobile:true,hasTouch:true,locale:'ja-JP',serviceWorkers:'block'});
  const initial = {...seed(),money:480,hp:100,soundEnabled:false,selectedRod:'bamboo',selectedBait:'worm',
    baits:{worm:7},lures:{silverSpoon:1},ownedRods:['bamboo','lureRod'],fightMode:'gauge',
    caught:Object.fromEntries(Object.keys(entries).map(id=>[id,1]))};
  await context.addInitScript(({key,initial})=>{
    if(!localStorage.getItem(key))localStorage.setItem(key,JSON.stringify(initial));
    localStorage.setItem('nushi-inugoya-options-v1',JSON.stringify({textSpeed:'instant'}));
  },{key:saveKey,initial});
  const page = await context.newPage(), errors=[];
  const tap = selector=>page.locator(selector).tap();
  const shot = name=>page.screenshot({path:path.join(dir,viewport.width+'-'+name+'.png')});
  page.on('pageerror',e=>errors.push(e.message));
  page.on('response',r=>{if(r.status()>=400 && r.url().startsWith(url))errors.push(r.status()+' '+r.url());});
  async function start(){
    await enter(page,true,{slot:1,isNew:false});
    await page.clock.runFor(240);
    if(await page.locator('#lakeIntroSkip').isVisible())await tap('#lakeIntroSkip');
    await assertRelease(page);
  }
  async function menu(id){await tap('#menu');await tap('[data-field-menu-target="'+id+'"]');}
  async function fits(locator){
    const dims=await locator.evaluate(n=>{
      const r=n.getBoundingClientRect(), top=document.elementFromPoint(r.x+r.width/2,r.y+r.height/2);
      return {inside:r.x>=0&&r.y>=0&&r.right<=innerWidth+1&&r.bottom<=innerHeight+1,
        touch:r.width>=44&&r.height>=44,unblocked:n.contains(top)};
    });
    assert.deepEqual(dims,{inside:true,touch:true,unblocked:true});
  }
  try {
    await page.clock.install({time:new Date('2026-11-01T06:00:00Z')});
    await page.clock.pauseAt('2026-11-01T06:00:01Z');
    await page.goto(url,{waitUntil:'load'});await start();
    const legacy=await page.evaluate(key=>localStorage.getItem(key),saveKey);
    assert.equal((await page.evaluate(gear)).lure,'silverSpoon');
    await page.evaluate(()=>{renderSamShop();open('store');});
    const purchase=await revealProduct(page,'#store [data-buy-lure="softWorm"]',true);
    await fits(purchase);await purchase.tap();await fits(page.locator('[data-sam-confirm-buy]'));
    await shot('worm-price');await tap('[data-sam-confirm-buy]');await tap('#store [data-close]');
    await menu('items');await tap('[data-inventory-tab="tackle"]');
    await pressProduct(page,'#inventory [data-pick-lure="silverSpoon"]',true);
    const select=await revealProduct(page,'#inventory [data-pick-lure="softWorm"]',true);
    await fits(select);await select.tap();
    assert.deepEqual(await page.evaluate(gear),{money:0,worm:7,soft:1,spoon:1,lure:'softWorm',method:'lure',rod:'lureRod'});
    await shot('worm-equipped');await tap('#inventory [data-close]');

    // Fixed lake fixture; the cast distance, pause/twitch, hook and fight all
    // use the normal controls. Sampling selects an ordinary funa from the pool.
    await page.evaluate(()=>cast({id:'lake-shallow',zone:'lake',waterZone:'lake',waterX:s.x,waterY:s.y+4}));
    await tap('#wait');await tap('[data-cast-tackle="method"]');await fits(page.locator('#tackle [data-pick-lure="softWorm"]'));
    await tap('#beginCast');
    for(let i=0;i<90&&await page.evaluate(()=>battle.cast)<45;i++)await page.clock.runFor(120);
    await page.evaluate(()=>{
      if(depthForCast('lake',battle.cast)!=='mid')throw Error('mid-water cast was unreachable');
      clearInterval(timer);timer=0;
      window.savedRandom=Math.random;
      for(let n=0;n<2000;n++){
        Math.random=()=>(n+.5)/2000;
        if(pick(battle.cast,'lake-mid')?.id==='funa')return;
      }
      throw Error('No naturally eligible funa in lake-mid');
    });
    await tap('#pull');await page.evaluate(()=>{Math.random=window.savedRandom;battleTick();});
    for(let i=0;i<60&&await page.evaluate(()=>battle.phase)==='cast-flight';i++)await page.clock.runFor(40);
    assert.equal(await page.evaluate(()=>battle.f.id),'funa');
    await page.clock.runFor(4800);
    for(let i=0;i<140&&await page.evaluate(()=>battle.phase)==='lure';i++){
      await tap('#pull');await page.clock.runFor(480);
    }
    for(let i=0;i<90&&await page.evaluate(()=>battle.phase)==='interest';i++)await page.clock.runFor(120);
    assert.equal(await page.evaluate(()=>battle.phase),'bite');await tap('#pull');await page.clock.runFor(240);
    assert.equal(await page.evaluate(()=>battle.phase),'fight');await shot('worm-fight');

    const cdp=await context.newCDPSession(page),button=await page.locator('#pull').boundingBox();
    let held=false;
    async function hold(on){
      if(held===on)return;
      await cdp.send('Input.dispatchTouchEvent',{type:on?'touchStart':'touchEnd',
        touchPoints:on?[{x:button.x+button.width/2,y:button.y+button.height/2,id:1}]:[]});
      held=on;
    }
    for(let i=0;i<1500;i++){
      const ui=await page.evaluate(()=>({phase:battle?.phase,tension:parseFloat(document.querySelector('#ten').style.width)||0,
        leap:document.querySelector('#fishScene').classList.contains('gill-wash')}));
      if(ui.phase!=='fight')break;
      await hold(!ui.leap&&ui.tension<(held?45:20));await page.clock.runFor(120);
    }
    await hold(false);assert.equal(await page.evaluate(()=>battle?.phase),'landing');
    await page.clock.runFor(1600);
    assert.equal(await page.evaluate(()=>s.caught.funa),1);
    assert.equal(await page.evaluate(()=>s.fishCatchRecords.funa.last.baitId),'softWorm');
    await page.evaluate(()=>{hideCatchCard();save();});
    await page.reload({waitUntil:'load'});await start();
    assert.equal(await page.evaluate(()=>s.caught.funa),1);
    assert.equal((await page.evaluate(gear)).worm,7);
    assert.equal((await page.evaluate(gear)).lure,'softWorm');
    await menu('items');await tap('[data-inventory-tab="tackle"]');
    await pressProduct(page,'#inventory [data-pick-lure="silverSpoon"]',true);
    assert.equal((await page.evaluate(gear)).lure,'silverSpoon');await tap('#inventory [data-close]');

    await menu('record');
    const portraits=new Set();
    for(const [id,name] of Object.entries(entries)){
      await tap('[data-fishdex-id="'+id+'"]');
      assert.match(await page.locator('#fishdexDetail').innerText(),new RegExp(name));
      await page.waitForFunction(id=>{
        const c=document.querySelector('#fishdexArt canvas');
        return c?.dataset.artSpecies===id&&c.getContext('2d').getImageData(0,0,c.width,c.height).data.some((v,i)=>i%4===3&&v>100);
      },id);
      portraits.add(await page.locator('#fishdexArt canvas').evaluate(c=>c.toDataURL()));
      await shot(id);
    }
    assert.equal(portraits.size,5);assert.deepEqual(errors,[]);
    assert.equal(await page.evaluate(key=>localStorage.getItem(key),saveKey),legacy);
    console.log('WORM_TOUCH_PASS',viewport.width,viewport.height);
  } finally {await context.close();}
}

(async()=>{
  const host=server();
  fs.mkdirSync(dir,{recursive:true});
  await new Promise((resolve,reject)=>{host.once('error',reject);host.listen(0,'127.0.0.1',resolve);});
  try{
    const browser=await chromium.launch({headless:true});
    try{
      for(const viewport of [{width:844,height:390},{width:740,height:360}])
        await run(browser,'http://127.0.0.1:'+host.address().port+'/nushi-tsuri/',viewport);
    } finally {await browser.close();}
  } finally {await new Promise(resolve=>host.close(resolve));}
})().catch(e=>{console.error(e);process.exitCode=1;});
