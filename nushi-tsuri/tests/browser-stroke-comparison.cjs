// Repeat one hooked encounter and one tank feeding on two complete production builds.
// The fish/specimen and random stream are fixtures. Window choice, strokes, travel,
// line tension, feeding and the resulting pictures are all driven by the game.
const assert = require('node:assert/strict');
const { createHash } = require('node:crypto');
const fs = require('node:fs');
const http = require('node:http');
const path = require('node:path');
const { chromium } = require('playwright');
const { seed, saveKey } = require('./game-harness.cjs');
const enterGame = require('./browser-start-adventure.cjs');

const out = path.resolve(process.env.STROKE_OUT || 'stroke-comparison');
const viewport = { width: 844, height: 390 };
const frameMs = 50;
const mime = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png',
  '.svg': 'image/svg+xml', '.webp':'image/webp', '.jpg':'image/jpeg', '.mp3':'audio/mpeg' };
const fixture = () => ({...seed(), hp:100, gameMinutes:600, soundEnabled:false, fightMode:'nushi',
  ownedRods:['bamboo','tideMaster'], selectedRod:'tideMaster', selectedBait:'worm', selectedHook:'large',
  petLife:{version:6, unlockedTanks:1, selectedTank:0, selected:'pet-1', nextId:2, food:20,
    fish:[{uid:'pet-1',species:'koi',length:5500,bornSize:4000,tank:0,origin:'shop',generation:0,
      sex:'male',acquiredDay:0,lastDay:0,fedDay:-1,changedDay:0,water:90,health:90,careDays:0,stars:1,xp:0}],eggs:[]}});

function serve(root) {
  return http.createServer((req,res) => {
    const pathname = decodeURIComponent(new URL(req.url,'http://localhost').pathname);
    const file = path.resolve(root,pathname.replace(/^\/nushi-tsuri\//,'') || 'index.html');
    if (!file.startsWith(root + path.sep) || !fs.existsSync(file) || !fs.statSync(file).isFile()) {
      res.writeHead(404); return res.end();
    }
    res.setHeader('Content-Type',mime[path.extname(file)] || 'application/octet-stream');
    fs.createReadStream(file).pipe(res);
  });
}
async function prepare(browser, url) {
  const context = await browser.newContext({viewport,isMobile:true,hasTouch:true,deviceScaleFactor:1.875,
    locale:'ja-JP',serviceWorkers:'block'});
  await context.addInitScript(({key,state}) => {
    localStorage.setItem(key,JSON.stringify(state));
    localStorage.setItem('nushi-inugoya-options-v1',JSON.stringify({textSpeed:'instant'}));
  },{key:saveKey,state:fixture()});
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror',e=>errors.push(e.message));
  page.on('response',r=>{if(r.url().startsWith(url) && r.status()>=400) errors.push(r.status()+' '+r.url());});
  await page.clock.install({time:new Date('2026-11-22T12:00:00Z')});
  await page.clock.pauseAt('2026-11-22T12:00:01Z');
  await page.goto(url); await enterGame(page,true);
  if (await page.locator('#lakeIntroSkip').isVisible()) await page.locator('#lakeIntroSkip').tap();
  await page.clock.runFor(350);
  return {context,page,errors};
}
async function sample(page,selector) {
  return page.locator(selector).first().evaluate(canvas => {
    const box=canvas.getBoundingClientRect();
    return {x:box.x,y:box.y,width:box.width,height:box.height,pixels:canvas.toDataURL()};
  });
}
async function series(page,dir,count,read) {
  fs.mkdirSync(dir,{recursive:true});
  const frames=[];
  for(let i=0;i<count;i++){
    await page.clock.runFor(frameMs);
    const frame=await read(i);
    frame.imageHash=createHash('sha256').update(frame.body.pixels).digest('hex');
    delete frame.body.pixels;
    await page.screenshot({path:path.join(dir,String(i).padStart(3,'0')+'.jpg'),
      scale:'css',type:'jpeg',quality:94});
    frames.push(frame);
  }
  assert.ok(new Set(frames.map(f=>f.imageHash)).size>8,'distinct painted poses in '+dir);
  return frames;
}
async function fight(page,dir) {
  const selector='#battleFish canvas.fish-frame-canvas';
  await page.evaluate(async () => {
    let rng=301;
    Math.random=()=>((rng=Math.imul(rng,1664525)+1013904223>>>0)/4294967296);
    cast(); beginFishing(); battle.cast=50; launchSurfaceCast(); settleSurfaceCast();
    battle.f=fish.find(f=>f.id==='namazu');
    battle.specimen=rollFishSpecimen(battle.f,()=>.8);
    battle.specimenVisualScale=fishVisualScale(battle.specimen);
    await fishAtlasImage(ShuFishArt.species.namazu.asset).decode();
    startFight(); releaseBattleAction();
  });
  await page.clock.runFor(900);
  const frames=await series(page,dir,132,async () => {
    const state=await page.evaluate(()=>{
      if(battle?.phase!=='fight') throw Error('fight stopped at '+battle?.phase);
      const cue=document.querySelector('#fishScene').dataset.nushiPhase;
      const hold=cue==='slack'||cue==='pulling';
      if(hold&&!battleActionHeld) pressBattleAction();
      if(!hold&&battleActionHeld) releaseBattleAction();
      const el=document.querySelector('#battleFish');
      return {mood:battle.mood.id,cue,hold,mode:el.dataset.spriteMode,effort:Number(el.dataset.swimEffort),
        drive:Number(el.dataset.swimDrive||0),tick:battle.swimTick,x:battle.x,y:battle.y,vx:battle.vx,vy:battle.vy,
        stamina:battle.stamina,ten:battle.ten,retrieval:battle.retrieval};
    });
    return {...state,body:await sample(page,selector)};
  });
  assert.ok(frames.some(f=>f.cue==='running') && frames.some(f=>f.cue==='warning'),'run and head-shake shown');
  await page.evaluate(()=>{pauseBattle();renderBattleFish();});
  const frozen=await sample(page,selector);
  await page.clock.runFor(400);
  assert.equal((await sample(page,selector)).pixels,frozen.pixels,'pause preserves the body');
  await page.emulateMedia({reducedMotion:'reduce'});
  await page.evaluate(()=>{resumeBattle();});
  await page.clock.runFor(160);
  assert.equal(await page.locator('#battleFish').getAttribute('data-swim-effort'),'1');
  return frames;
}
async function aquarium(page,dir) {
  const tap=selector=>page.locator(selector).tap();
  await tap('#menu'); await tap('[data-field-menu-target="items"]'); await tap('#openPetAquarium');
  await page.clock.runFor(500);
  const selector='#petTankStage [data-pet-fish] canvas';
  const stock=await page.evaluate(()=>s.petLife.food);
  const frames=await series(page,dir,72,async i=>{
    if(i===18) await tap('[data-pet-action="feed"]');
    return {body:await sample(page,selector),food:await page.evaluate(()=>s.petLife.food)};
  });
  assert.equal(frames[0].food,stock);
  assert.equal(frames.at(-1).food,stock-1,'one feed consumes one pellet for this single fish');
  return frames;
}
async function collect(browser,root,label) {
  const server=serve(root);
  await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(0,'127.0.0.1',resolve);});
  const url='http://127.0.0.1:'+server.address().port+'/nushi-tsuri/';
  const results={};
  try {
    for(const [scene,capture] of [['classic',fight],['tank',aquarium]]){
      const {context,page,errors}=await prepare(browser,url);
      try {
        results[scene]=await capture(page,path.join(out,label,scene));
        assert.deepEqual(errors,[]);
        fs.writeFileSync(path.join(out,label,scene+'.json'),JSON.stringify(results[scene]));
      } finally { await context.close(); }
    }
  } finally { await new Promise(r=>server.close(r)); }
  return results;
}
(async()=>{
  assert.ok(process.env.STROKE_BEFORE,'path to the original production runtime');
  const browser=await chromium.launch({headless:true});
  try {
    const before=await collect(browser,path.resolve(process.env.STROKE_BEFORE),'before');
    const after=await collect(browser,path.resolve(__dirname,'..'),'after');
    const mechanics=frames=>frames.map(({tick,mood,cue,hold,x,y,vx,vy,ten,retrieval})=>
      [tick,mood,cue,hold,x,y,vx,vy,ten,retrieval]);
    assert.deepEqual(mechanics(after.classic),mechanics(before.classic),'same fight state every 50 ms');
    for(const scene of ['classic','tank']){
      assert.ok(after[scene].filter((v,i)=>v.imageHash!==before[scene][i].imageHash).length>8,
        'changed body visible in '+scene);
    }
    console.log('PASS: deterministic 20 fps, matching classic trajectory, tension, retrieval and controls.');
  } finally { await browser.close(); }
})().catch(error=>{console.error(error);process.exitCode=1;});
