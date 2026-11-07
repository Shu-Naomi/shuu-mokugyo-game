// Real-browser evidence only. Frozen-clock visual comparisons and native-clock
// performance samples are intentionally separate pages and contexts.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require('playwright');
const { seed, saveKey } = require('./game-harness.cjs');
const enter = require('./browser-start-adventure.cjs');
const BASELINE = '880817ec738f6f9dcc45dc9a3a098e7bd6676823';
const FIXED_TIME = '2026-10-22T03:00:00Z';
const initial = () => ({ ...seed(), x:175, y:84, direction:'right', money:10000,
  gameMinutes:600, soundEnabled:false, practiceTutorialComplete:true });

module.exports = async function run(url, label, screen, output) {
  fs.mkdirSync(output, { recursive:true });
  const browser = await chromium.launch({ headless:true });
  const result = { label, baseline:BASELINE, screen, fixture:initial(), fixedTime:FIXED_TIME,
    screenshots:[], visits:[], resources:[], errors:[], httpErrors:[] };
  const options = { viewport:{width:screen.width,height:screen.height}, deviceScaleFactor:screen.dpr,
    isMobile:screen.touch, hasTouch:screen.touch, locale:'ja-JP', serviceWorkers:'block' };
  async function context() {
    const ctx = await browser.newContext(options);
    await ctx.addInitScript(({key,state}) => {
      if (!localStorage.getItem(key)) localStorage.setItem(key,JSON.stringify(state));
      localStorage.setItem('nushi-inugoya-options-v1',JSON.stringify({textSpeed:'instant'}));
      Math.random = () => .999999;
      window.pilotPointers=[];document.addEventListener('pointerdown',e=>pilotPointers.push({id:e.target.closest('button')?.id||e.target.id,type:e.pointerType}));
    }, {key:saveKey,state:initial()});
    return ctx;
  }
  function observe(page) {
    page.on('pageerror', e => result.errors.push(e.message));
    page.on('console', m => { if(m.type()==='error') result.errors.push(m.text()); });
    page.on('response', r => {
      const name = new URL(r.url()).pathname;
      if(r.status()>=400) result.httpErrors.push(`${r.status()} ${name}`);
      if(r.status()===200 && /\.(png|webp|jpg)$/.test(name)) result.resources.push(name);
    });
  }
  async function ready(page) {
    await page.waitForFunction(() => {
      const c = document.querySelector('#worldPixels');
      return c?.style.backgroundImage==='none' && c.width>0 && c.height>0 &&
        document.querySelector('canvas[data-for="worldPixels"][data-scene="world"]');
    });
    return page.evaluate(() => {
      const c=document.querySelector('#worldPixels'), d=c.getContext('2d').getImageData(0,0,c.width,c.height).data;
      let painted=0;for(let i=3;i<d.length;i+=4)if(d[i])painted++;
      return {width:c.width,height:c.height,painted};
    });
  }
  const ctx = await context(), page = await ctx.newPage();
  page.setDefaultTimeout(30000);observe(page);
  const press = selector => page.locator(selector)[screen.touch?'tap':'click']();
  const state = () => page.evaluate(() => ({x:s.x,y:s.y,direction:s.direction}));
  const progress = () => page.evaluate(() => JSON.parse(JSON.stringify({money:s.money,hp:s.hp,
    time:s.gameMinutes,caught:s.caught,baits:s.baits,equipment:s.equipment,quests:s.questCompletions})));
  async function start() {
    await enter(page,screen.touch);await page.clock.runFor(240);
    if(await page.locator('#lakeIntroSkip').isVisible()) {await press('#lakeIntroSkip');await page.clock.runFor(240);}
    const canvas=await ready(page);assert.ok(canvas.painted>canvas.width*canvas.height/2,'decoded scene is painted, not a blank canvas');
    result.canvas=canvas;
  }
  async function capture(name) {
    await page.clock.runFor(700);await page.waitForTimeout(700);
    const framing=await page.evaluate(() => {
      const m=document.querySelector('#map'),p=document.querySelector('#player'),r=m.getBoundingClientRect(),b=p.getBoundingClientRect();
      return {x:s.x,y:s.y,direction:s.direction,gameMinutes:s.gameMinutes,now:Date.now(),
        mapTransform:m.style.transform,mapWidth:m.clientWidth,mapHeight:m.clientHeight,
        mapRect:{x:r.x,y:r.y,width:r.width,height:r.height},
        feet:{dx:Math.abs(b.x+b.width/2-(r.x+r.width*s.x/240)),dy:Math.abs(b.bottom-(r.y+r.height*s.y/135))}};
    });
    assert.ok(framing.feet.dx<1&&framing.feet.dy<1,'feet match collision position');
    const filename=`${label}-${name}.png`;
    await page.screenshot({path:path.join(output,filename),animations:'disabled'});
    result.screenshots.push({name,filename,framing});
  }
  async function walk(target) {
    const route=await page.evaluate(target => {
      const queue=[{x:s.x,y:s.y,d:s.direction,path:[]}],seen=new Set([s.x+','+s.y+','+s.direction]);
      for(let i=0;i<queue.length;i++) {
        const p=queue[i];
        // Field A collects forage before offering pond practice. Reach the pond
        // through normal walking without stepping into a competing pickup.
        const arrived=target.practice
          ? isNearPracticePond(p.x,p.y)&&!nearbyForagePoint(p.x,p.y)&&!nearbyWorldLandmark(p.x,p.y,p.d)?.noticeOnly
          : Math.hypot(p.x-target.x,p.y-target.y)<=2;
        if(arrived&&(!target.direction||p.d===target.direction))return p.path;
        for(const d of ['up','right','down','left']) {
          const n={...ShuWorldLife.moveTarget(p.x,p.y,d,4,isWalkableWorld),d},key=n.x+','+n.y+','+d;
          if(!seen.has(key)){seen.add(key);queue.push({...n,path:[...p.path,d]});}
        }
      }
      throw Error('No route '+JSON.stringify(target));
    },target);
    for(const d of route) {
      const expected=await page.evaluate(d=>ShuWorldLife.moveTarget(s.x,s.y,d,4,isWalkableWorld),d);
      await press(`[data-move="${d}"]`);await page.clock.runFor(50);
      const actual=await state();assert.equal(actual.x,expected.x);assert.equal(actual.y,expected.y);
    }
    result.visits.push({target,route,actual:await state()});
  }
  try {
    await page.clock.install({time:new Date(FIXED_TIME)});await page.clock.pauseAt('2026-10-22T03:00:01Z');
    await page.goto(url,{waitUntil:'load'});await start();
    assert.deepEqual(await state(),{x:175,y:84,direction:'right'});
    const before=await progress();await capture('west-approach');
    result.worldSources=await page.evaluate(() => {const d=ShuSceneLayers.get('world');return [d.source,...(d.underlay?[d.underlay]:[]),...(d.edits||[]).map(e=>e.source)];});
    for(const source of result.worldSources)assert.ok(result.resources.some(p=>p.endsWith('/'+source)),`loaded source ${source}`);
    if(label==='after')assert.ok(result.worldSources.includes('assets/sam-sfc-pixel-pilot.png'),'pilot overlay source loaded');
    await walk({x:197,y:91,direction:'up'});
    assert.equal(await page.evaluate(()=>isAtSamShopEntrance()),true);
    await capture('shop-entrance');
    result.controls=await page.evaluate(() => ['#action',...['up','right','down','left'].map(d=>`[data-move="${d}"]`)].map(q=>{
      const n=document.querySelector(q),r=n.getBoundingClientRect(),top=document.elementFromPoint(r.x+r.width/2,r.y+r.height/2);
      return {q,width:r.width,height:r.height,inside:r.left>=0&&r.top>=0&&r.right<=innerWidth+1&&r.bottom<=innerHeight+1,unblocked:top===n||n.contains(top)};
    }));
    assert.ok(result.controls.every(c=>c.width>=44&&c.height>=44&&c.inside&&c.unblocked));
    const entrance=await state();
    for(let i=0;i<2;i++) {
      await press('#action');await page.locator('#store.open').waitFor();
      if(i===0)await capture('shop-open');
      await press('#store [data-close]');assert.deepEqual(await state(),entrance);assert.deepEqual(await progress(),before);
    }
    await walk({x:212,y:87,direction:'up',practice:true});
    assert.equal(await page.evaluate(()=>isNearPracticePond()),true);
    await press('#action');assert.equal(await page.evaluate(()=>battle?.phase),'prep');
    await press('#wait');assert.equal(await page.evaluate(()=>battle?.phase||null),null);
    assert.equal(await page.locator('#fishScene.active').count(),0);assert.deepEqual(await progress(),before);
    result.fishingCancellation=true;
    result.npcFeet=await page.evaluate(() => [...document.querySelectorAll('#worldLifeLayer .world-life-resident')].filter(n=>n.getClientRects().length).map(n=>({x:parseFloat(n.style.left)*2.4,y:parseFloat(n.style.top)*1.35,walkable:isWalkableWorld(parseFloat(n.style.left)*2.4,parseFloat(n.style.top)*1.35)})));
    assert.ok(result.npcFeet.length>0&&result.npcFeet.every(n=>n.walkable));
    await walk({x:197,y:91,direction:'up'});const saved=await state();
    await page.evaluate(()=>save());await page.reload({waitUntil:'load'});await start();
    assert.deepEqual(await state(),saved);assert.deepEqual(await progress(),before);await capture('save-reload');
    result.saveReload=true;
    // Reload resets the pointer log, so exercise the saved entrance once more.
    await press('#action');await page.locator('#store.open').waitFor();await press('#store [data-close]');
    assert.deepEqual(await state(),saved);assert.deepEqual(await progress(),before);
    result.pointers=await page.evaluate(()=>pilotPointers);
    if(screen.touch)assert.ok(result.pointers.some(p=>p.id==='action'&&p.type==='touch'));
    await ctx.close();

    // This second context NEVER installs Playwright's clock. performance.now,
    // timers and requestAnimationFrame below are the browser's native clocks.
    const perfCtx=await context(), perf=await perfCtx.newPage();observe(perf);
    await perf.goto(url,{waitUntil:'load'});await enter(perf,screen.touch);
    if(await perf.locator('#lakeIntroSkip').isVisible())await perf.locator('#lakeIntroSkip')[screen.touch?'tap':'click']();
    await ready(perf);await perf.waitForTimeout(2000);
    result.performance=await perf.evaluate(async () => {
      const longTasks=[],intervals=[];let observer=null,last=null,frames=0,id;
      if(PerformanceObserver.supportedEntryTypes.includes('longtask')) {
        observer=new PerformanceObserver(list=>longTasks.push(...list.getEntries().map(e=>e.duration)));
        observer.observe({type:'longtask',buffered:false});
      }
      const heapBefore=performance.memory?.usedJSHeapSize??null,start=performance.now();
      const frame=t=>{frames++;if(last!==null)intervals.push(t-last);last=t;id=requestAnimationFrame(frame);};
      id=requestAnimationFrame(frame);await new Promise(r=>setTimeout(r,5000));cancelAnimationFrame(id);
      const elapsed=performance.now()-start;observer?.disconnect();intervals.sort((a,b)=>a-b);
      return {clock:'native, unmocked',elapsedMs:elapsed,frames,fps:frames*1000/elapsed,
        frameP95Ms:intervals[Math.floor(intervals.length*.95)]??null,
        longTasksSupported:!!observer,longTasks:longTasks.length,longTaskTotalMs:longTasks.reduce((a,b)=>a+b,0),
        heapBefore,heapAfter:performance.memory?.usedJSHeapSize??null,
        limitation:'One CI idle sample is a performance proxy, not physical heat, battery, or device-temperature measurement.'};
    });
    assert.ok(result.performance.elapsedMs>=4900&&result.performance.frames>0);
    await perfCtx.close();assert.deepEqual(result.errors,[]);assert.deepEqual(result.httpErrors,[]);
    return result;
  } catch(error) {
    result.failure=error.stack;await page.screenshot({path:path.join(output,`${label}-failure.png`)}).catch(()=>{});throw error;
  } finally {
    fs.writeFileSync(path.join(output,`${label}-result.json`),JSON.stringify(result,null,2));await browser.close();
  }
};
