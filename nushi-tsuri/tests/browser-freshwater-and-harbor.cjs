// The save fixture starts at a reachable bank. Cast distance, bite, reeling,
// catch, compendium, breeding tank and reload use the shipped mobile game.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const {chromium} = require('playwright');
const {server} = require('./browser-reference-village-evidence.cjs');
const enter = require('./browser-start-adventure.cjs');
const {assertRelease, matchesSourceHtml} = require('./browser-release.cjs');
const {seed,saveKey} = require('./game-harness.cjs');
const suite = process.argv[2] || 'freshwater-and-harbor';
assert.ok(['freshwater-and-harbor','crustaceans'].includes(suite), 'unknown browser suite');
const crustaceans = suite === 'crustaceans';
const trips = crustaceans ? require('./fixtures/canal-crustaceans.cjs') : require('./fixtures/freshwater-and-harbor.cjs');
const out = path.resolve(process.env.FISH_EVIDENCE_DIR || (crustaceans ? 'canal-crustaceans-evidence' : 'freshwater-and-harbor-evidence'));
const viewport = {width:844,height:390};
const {layout} = require('../village-save-migration.js');
// The published village uses the reference painting's shore geometry.
const villageBanks = {
  aouo:{x:70,y:48,direction:'up'}, maanago:{x:134,y:102,direction:'right'},
  tenagaebi:{x:96,y:90,direction:'right'}
};

async function painted(page, selector, id) {
  await page.waitForFunction(({selector,id}) => {
    const canvas = document.querySelector(selector);
    if (!canvas || canvas.dataset.artSpecies !== id) return false;
    return canvas.getContext('2d').getImageData(0,0,canvas.width,canvas.height).data
      .some((channel,i)=>i%4===3 && channel>=128);
  },{selector,id});
}

async function reel(page, context, mode) {
  const button = await page.locator('#pull').boundingBox();
  assert.ok(button && button.width>=44 && button.height>=44);
  const cdp = await context.newCDPSession(page);
  const touch = [{x:button.x+button.width/2,y:button.y+button.height/2,id:1}];
  const queue = [];
  let intent = false, held = false;
  for (let tick=0; tick<1800; tick++) {
    const ui = await page.evaluate(()=>({
      phase:battle?.phase, cue:document.querySelector('#fishScene').dataset.nushiPhase,
      leap:document.querySelector('#fishScene').classList.contains('gill-wash'),
      tension:parseFloat(document.querySelector('#ten').style.width)||0
    }));
    if (ui.phase !== 'fight') {
      if (held) await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
      assert.equal(ui.phase,'landing','fish must be landed by normal controls');
      return tick*.12;
    }
    const pull = !ui.leap && (mode==='gauge' ? ui.tension<(intent?45:20) : ['slack','pulling'].includes(ui.cue));
    if (intent !== pull) { intent=pull; queue.push({tick:tick+5,pull}); }
    while (queue.length && queue[0].tick <= tick) {
      held=queue.shift().pull;
      await cdp.send('Input.dispatchTouchEvent',{type:held?'touchStart':'touchEnd',touchPoints:held?touch:[]});
    }
    await page.clock.runFor(120);
  }
  throw Error('Fight did not finish');
}

async function capture(browser,url,trip,mode) {
  const context = await browser.newContext({viewport,isMobile:true,hasTouch:true,deviceScaleFactor:1.875,locale:'ja-JP',serviceWorkers:'block'});
  const state={...seed(),...trip.bank,...villageBanks[trip.id],villageLayoutVersion:layout,hp:100,maxHp:100,money:30000,gameMinutes:trip.minutes,soundEnabled:false,
    caught:{raigyo:4},ownedRods:['bamboo','starGazer'],selectedRod:'starGazer',selectedBait:trip.bait,
    selectedHook:trip.hook,baits:{[trip.bait]:20},fightMode:mode};
  await context.addInitScript(({key,state})=>{
    if (!localStorage.getItem(key)) localStorage.setItem(key,JSON.stringify(state));
    localStorage.setItem('nushi-inugoya-options-v1',JSON.stringify({textSpeed:'instant'}));
  },{key:saveKey,state});
  const page=await context.newPage(), errors=[];
  const tap=selector=>page.locator(selector).tap();
  const shot=phase=>page.screenshot({path:path.join(out,trip.id+'-'+phase+'.png'),scale:'css'});
  page.on('pageerror',e=>errors.push(e.message));
  page.on('response',r=>{if(r.url().startsWith(url)&&r.status()>=400)errors.push(r.status()+' '+r.url());});
  async function start() {
    await enter(page,true,{slot:1,isNew:false});
    await page.clock.runFor(240);
    if (await page.locator('#lakeIntroSkip').isVisible()) await tap('#lakeIntroSkip');
    await assertRelease(page);
  }
  try {
    await page.clock.install({time:new Date('2026-11-23T00:00:00Z')});
    await page.clock.pauseAt('2026-11-23T00:00:01Z');
    const response = await page.goto(url);
    assert.ok(matchesSourceHtml(await response.text()), 'browser must load the exact candidate');
    await start();
    const mouthPixels = await page.evaluate(async id => {
      const image = fishAtlasImage(ShuFishArt.species[id].asset);
      await image.decode();
      const sheet = document.createElement('canvas');
      sheet.width = image.naturalWidth;
      sheet.height = image.naturalHeight;
      const ctx = sheet.getContext('2d');
      ctx.drawImage(image,0,0);
      return ShuFishAdditions.art[id].boxes.map(([x,y,w,h],cell) => {
        const [u,v] = ShuFishArt.sourceHead(id,cell);
        return ctx.getImageData(Math.floor(x+w*u),Math.floor(y+h*v),1,1).data[3];
      });
    },trip.id);
    assert.equal(mouthPixels.length,8);
    assert.ok(mouthPixels.every(alpha=>alpha>=128),trip.id+' every authored hook point meets the painted fish');
    assert.equal(await page.evaluate(()=>nearbyFishingSpot()?.id),trip.spot.replace(/-(mid|deep)$/,'-shallow'));
    await tap('#action'); await tap('#wait'); await tap('#beginCast');
    const depth=trip.spot.split('-').at(-1);
    let ready=false;
    for (let i=0;i<120;i++) {
      ready = await page.evaluate(depth=>depthForCast(battle.waterZone,battle.cast,battle.minimumDepth)===depth,depth);
      if (ready) break;
      await page.clock.runFor(120);
    }
    assert.ok(ready,trip.id+' target depth reachable');
    const cast = await page.evaluate(({id,spot})=>{
      clearInterval(timer);timer=0;
      const choices=fishingCandidates(battle.cast,fishingSpotById(spot),gameClockAt(sceneGameMinutes()).period,battle.bait,battle.hook);
      const i=choices.findIndex(x=>x.fish.id===id&&x.weight>0);
      if (i<0) throw Error('Not eligible at '+spot);
      const total=choices.reduce((n,x)=>n+x.weight,0);
      const roll=(choices.slice(0,i).reduce((n,x)=>n+x.weight,0)+choices[i].weight/2)/total;
      Math.random=()=>roll;
      if (pick(battle.cast,spot)?.id!==id) throw Error('Normal catch selection failed');
      return battle.cast;
    },trip);
    await tap('#pull'); await page.evaluate(()=>battleTick());
    for (let i=0;i<60 && await page.evaluate(()=>battle.phase)==='cast-flight';i++) await page.clock.runFor(40);
    if (crustaceans) {
      await page.evaluate(() => syncBitePhase(battle.nibbleAt));
      assert.match(await page.locator('#battleMsg').innerText(),/ちょんちょん/u);
    }
    const hooked=await page.evaluate(()=>{
      let rng=301;Math.random=()=>((rng=Math.imul(rng,1664525)+1013904223>>>0)/4294967296);
      battle.specimen=rollFishSpecimen(battle.f,()=>.5);battle.specimenVisualScale=fishVisualScale(battle.specimen);
      battle.biteAt=Date.now();battle.biteShownAt=null;syncBitePhase();
      return [battle.f.id,battle.spot];
    });
    assert.deepEqual(hooked,[trip.id,trip.spot]);
    if (crustaceans) {
      assert.match(await page.locator('#battleMsg').innerText(), trip.id === 'tenagaebi' ? /横へ走った/u : /しっかり掴んだ/u);
      assert.equal(await page.locator('#castSurface').evaluate(el => el.classList.contains('shrimp-side-bite')), trip.id === 'tenagaebi');
      await shot('bite');
    }
    await tap('#pull'); await page.clock.runFor(240);
    await painted(page,'#battleFish canvas',trip.id); await shot('fight');
    const seconds=await reel(page,context,mode);
    await page.clock.runFor(1600); await painted(page,'#catchFish canvas',trip.id);
    assert.ok((await page.locator('#catchTitle').innerText()).includes(trip.name)); await shot('catch');
    await tap('#catchClose'); await tap('#menu'); await tap('[data-field-menu-target="record"]');
    await tap('[data-fishdex-id="raigyo"]');
    assert.match(await page.locator('#fishdexDetail').innerText(),/カムルチー/u);
    await tap('[data-fishdex-id="'+trip.id+'"]'); await painted(page,'#fishdexArt canvas',trip.id);
    assert.ok((await page.locator('#fishdexDetail').innerText()).includes(trip.name)); await shot('guide');
    await tap('.fishdex-close');
    const uid = await page.evaluate(id=>{
      const acquired=ShuPetLife.acquire(s,id,petCatalog,Math.floor(s.gameMinutes/1440));
      if (!acquired.ok) throw Error(acquired.message);
      save(); return acquired.fish.uid;
    },trip.id);
    await tap('#menu'); await tap('[data-field-menu-target="items"]'); await tap('#openPetAquarium');
    await tap('.pet-fish-roster [data-pet-inspect="'+uid+'"]');
    await page.clock.runFor(720); await painted(page,'#petInspectFish canvas',trip.id); await shot('tank');
    await page.reload(); await start();
    const restored = await page.evaluate(id=>[s.caught[id],s.fishCatchRecords[id].last.spotId,
      s.catchMemories[id].first.fightMode,s.petLife.fish.find(f=>f.species===id)?.uid,s.caught.raigyo],trip.id);
    assert.deepEqual(restored,[1,trip.spot,mode,uid,4]); assert.deepEqual(errors,[]);
    return {id:trip.id,mode,cast,spot:trip.spot,bait:trip.bait,hook:trip.hook,mouthPoses:mouthPixels.length,seconds,restored:true};
  } catch(error) {
    await shot('failure').catch(()=>{});
    throw new Error(trip.id+' '+String(error),{cause:error});
  } finally { await context.close(); }
}

(async()=>{
  const publicURL = process.env.FISH_BASE_URL;
  const host = publicURL ? null : server();
  fs.mkdirSync(out,{recursive:true});
  if (host) await new Promise((resolve,reject)=>host.once('error',reject).listen(0,'127.0.0.1',resolve));
  const url = publicURL || 'http://127.0.0.1:'+host.address().port+'/nushi-tsuri/';
  try {
    const executablePath = process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE;
    const browser = await chromium.launch({headless:true, ...(executablePath ? {executablePath} : {})});
    try {
      const results=[];
      for (const [i,trip] of trips.entries()) {
        if (process.env.FISH_SPECIES && process.env.FISH_SPECIES !== trip.id) continue;
        results.push(await capture(browser,url,trip,i%2?'gauge':'nushi'));
        fs.writeFileSync(path.join(out,'results.json'),JSON.stringify({viewport,dpr:1.875,results},null,2));
      }
      assert.ok(results.length, 'select a known fish');
    } finally { await browser.close(); }
  } finally { if (host) await new Promise(resolve=>host.close(resolve)); }
})().catch(e=>{console.error(e);process.exitCode=1;});
