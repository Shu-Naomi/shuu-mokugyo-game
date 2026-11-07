// Tests-only same-art rendering study. Production remains the pinned pixelated build.
// CSS variants never redraw or change canvas pixels, assets, player, camera or scale.
// Frozen-clock visual comparisons and optional native-clock performance use separate contexts.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require('playwright');
const { seed, saveKey } = require('./game-harness.cjs');
const enter = require('./browser-start-adventure.cjs');
const BASELINE = '880817ec738f6f9dcc45dc9a3a098e7bd6676823';
const FIXED_TIME = '2026-10-22T03:00:00Z';
const WORLD_SELECTOR = '#worldPixels, canvas.scenery-motion[data-for="worldPixels"], canvas.scenery-foreground[data-for="worldPixels"]';
const EXPERIMENT_STYLE = 'same-art-rendering-study-only';
const initial = () => ({ ...seed(), x:175, y:84, direction:'right', money:10000,
  gameMinutes:600, soundEnabled:false, practiceTutorialComplete:true });

module.exports = async function run(url, label, screen, output, experiments=false) {
  fs.mkdirSync(output, { recursive:true });
  const browser = await chromium.launch({ headless:true });
  const result = { label, baseline:BASELINE, screen, fixture:initial(), fixedTime:FIXED_TIME,
    screenshots:[], visits:[], resources:[], errors:[], httpErrors:[],
    experiments, cssScope:WORLD_SELECTOR, productionRendering:'pixelated',
    visualClock:'Fixed JS clock; completed finite CSS animations; infinite CSS animations paused at time zero.' };
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
  async function setRendering(target, value) {
    assert.ok(['crisp-edges','auto'].includes(value));
    const supported=await target.evaluate(value=>CSS.supports('image-rendering',value),value);
    if(!supported)return false;
    await target.addStyleTag({content:`${WORLD_SELECTOR} { image-rendering: ${value} !important; }`})
      .then(style=>style.evaluate((node,id)=>node.id=id,EXPERIMENT_STYLE));
    return true;
  }
  async function pipeline() {
    return page.evaluate(async selector => {
      const rect=n=>{const r=n.getBoundingClientRect();return {x:r.x,y:r.y,width:r.width,height:r.height};};
      const fractional=v=>v-Math.floor(v), dpr=devicePixelRatio;
      const hash=async bytes=>[...new Uint8Array(await crypto.subtle.digest('SHA-256',bytes))].map(x=>x.toString(16).padStart(2,'0')).join('');
      const map=document.querySelector('#map'),p=document.querySelector('#player'),r=rect(map),b=rect(p);
      const layers=await Promise.all([...document.querySelectorAll(selector)].map(async c=>{
        const bounds=rect(c),css=getComputedStyle(c),context=c.getContext('2d');
        const rgba=context.getImageData(0,0,c.width,c.height).data;
        return {id:c.id||c.className,for:c.dataset.for||null,intrinsic:{width:c.width,height:c.height},
          rgbaSha256:await hash(rgba),cssSize:{width:css.width,height:css.height},rendered:bounds,
          cssPixelsPerSourcePixel:{x:bounds.width/c.width,y:bounds.height/c.height},
          devicePixelsPerSourcePixel:{x:bounds.width*dpr/c.width,y:bounds.height*dpr/c.height},
          deviceOrigin:{x:bounds.x*dpr,y:bounds.y*dpr},
          fractionalDeviceOrigin:{x:fractional(bounds.x*dpr),y:fractional(bounds.y*dpr)},
          imageRendering:css.imageRendering,imageSmoothingEnabled:context.imageSmoothingEnabled,
          cssTransform:css.transform,filter:css.filter,display:css.display,opacity:css.opacity};
      }));
      const definition=ShuSceneLayers.get('world'),sam=definition.parts.find(p=>p.id==='sam-shop');
      const points=sam.polygons.flat(),xs=points.map(p=>p[0]),ys=points.map(p=>p[1]);
      const padding=24,art={x:Math.min(...xs)-padding,y:Math.min(...ys)-padding,
        width:Math.max(...xs)-Math.min(...xs)+padding*2,height:Math.max(...ys)-Math.min(...ys)+padding*2};
      const source=layers.find(l=>l.id==='worldPixels').rendered;
      return {dpr,viewport:{width:innerWidth,height:innerHeight},
        supports:Object.fromEntries(['pixelated','crisp-edges','auto'].map(v=>[v,CSS.supports('image-rendering',v)])),
        mapCompositor:{inlineTransform:map.style.transform,transform:getComputedStyle(map).transform,
          willChange:getComputedStyle(map).willChange,backfaceVisibility:getComputedStyle(map).backfaceVisibility},
        framing:{x:s.x,y:s.y,direction:s.direction,gameMinutes:s.gameMinutes,now:Date.now(),
          cameraMatrix:Array.from(new DOMMatrix(getComputedStyle(map).transform).toFloat64Array()),
          mapWidth:map.clientWidth,mapHeight:map.clientHeight,mapRect:r,
          feet:{dx:Math.abs(b.x+b.width/2-(r.x+r.width*s.x/240)),dy:Math.abs(b.y+b.height-(r.y+r.height*s.y/135))}},
        samCrop:{artSpace:art,units:definition.units,css:{x:source.x+art.x/definition.units[0]*source.width,
          y:source.y+art.y/definition.units[1]*source.height,
          width:art.width/definition.units[0]*source.width,height:art.height/definition.units[1]*source.height}},layers};
    },WORLD_SELECTOR);
  }
  function immutablePixels(value) {
    return value.layers.map(({id,for:owner,intrinsic,rgbaSha256,imageSmoothingEnabled})=>
      ({id,for:owner,intrinsic,rgbaSha256,imageSmoothingEnabled}));
  }
  async function capture(name, settled=true) {
    if(settled) {
      await page.clock.runFor(700);await page.waitForTimeout(700);
      await page.evaluate(async()=>{
        await document.fonts.ready;
        // Normalize decorative CSS animations, without touching canvas content.
        for(const animation of document.getAnimations()) {
          if(animation.effect?.getTiming().iterations===Infinity){animation.pause();animation.currentTime=0;}
          else animation.finish();
        }
      });
    }
    const original=await pipeline();
    if(settled)assert.ok(original.framing.feet.dx<1&&original.framing.feet.dy<1,'feet match collision position');
    assert.equal(original.layers.length,3,'original world, motion and foreground canvases exist');
    assert.ok(original.layers.every(l=>l.imageRendering==='pixelated'),'unaltered baseline computed image-rendering is pixelated');
    const filename=`${label}-${name}-pixelated.png`;
    await page.screenshot({path:path.join(output,filename),animations:'allow',scale:'device'});
    const shot={name,filename,settled,framing:original.framing,pipeline:original,variants:[]};
    result.screenshots.push(shot);
    if(!experiments)return;
    for(const value of ['crisp-edges','auto',...(settled?['compositor-auto']:[])]) {
      let previousMapStyle=null;
      if(value==='compositor-auto') {
        previousMapStyle=await page.locator('#map').evaluate(map=>{
          const previous=map.getAttribute('style');
          const transform=map.style.transform;
          if(!/^translate3d\([^,]+,[^,]+,\s*0(?:px)?\)$/.test(transform))throw Error('Unexpected map transform: '+transform);
          map.style.setProperty('transform',transform.replace('translate3d(','translate(').replace(/,\s*0(?:px)?\)$/ ,')'),'important');
          map.style.setProperty('will-change','auto','important');
          map.style.setProperty('backface-visibility','visible','important');
          return previous;
        });
      } else if(!await setRendering(page,value)) {
        shot.variants.push({value,skipped:true,reason:'CSS.supports(image-rendering, value) is false'});
        continue;
      }
      try {
        const candidate=await pipeline();
        assert.deepEqual(candidate.framing,original.framing,`${value}: identical player, time, camera and scale`);
        assert.deepEqual(immutablePixels(candidate),immutablePixels(original),`${value}: every source canvas RGBA byte is unchanged`);
        assert.deepEqual(candidate.layers.map(l=>l.rendered),original.layers.map(l=>l.rendered),`${value}: identical layer bounds`);
        assert.ok(candidate.layers.every(l=>l.imageRendering===(value==='compositor-auto'?'pixelated':value)),`${value}: expected computed image-rendering`);
        if(value==='compositor-auto') {
          assert.equal(candidate.mapCompositor.willChange,'auto');
          assert.equal(candidate.mapCompositor.backfaceVisibility,'visible');
        }
        const variantFile=`${label}-${name}-${value}.png`;
        await page.screenshot({path:path.join(output,variantFile),animations:'allow',scale:'device'});
        assert.deepEqual(immutablePixels(await pipeline()),immutablePixels(original),`${value}: capture did not repaint source pixels`);
        shot.variants.push({value,filename:variantFile,pipeline:candidate,
          status:value==='auto'?'diagnostic only':value==='compositor-auto'
            ?'test-only compositor option; layer promotion is browser-dependent; possible CPU/movement cost; not shipped'
            :'experimental review option; not shipped'});
      } finally {
        if(value==='compositor-auto')await page.locator('#map').evaluate((map,previous)=>{
          if(previous===null)map.removeAttribute('style');else map.setAttribute('style',previous);
        },previousMapStyle);
        else await page.locator(`#${EXPERIMENT_STYLE}`).evaluate(node=>node.remove());
      }
    }
    const restored=await pipeline();
    assert.deepEqual(restored,original,'removing the test CSS restores the exact original pipeline');
    const repeat=await page.screenshot({animations:'allow',scale:'device'});
    assert.deepEqual(repeat,fs.readFileSync(path.join(output,filename)),'pixelated repeat is byte-identical after experiments');
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
    assert.deepEqual(result.worldSources,['assets/village-world-v252-55-riao-clear.png','assets/village-underlay-v252-55-riao.png'],'original art sources only');
    assert.ok(!result.resources.some(p=>p.includes('sam-sfc-pixel-pilot')),'no rejected art overlay requested');
    result.sourceImages=await page.evaluate(async sources=>Promise.all(sources.map(async source=>{
      const image=new Image();image.src=source;await image.decode();
      return {source,width:image.naturalWidth,height:image.naturalHeight};
    })),result.worldSources);
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
    // Separate actual-button movement diagnostic. Real CSS transitions are
    // paused and sought through their Web Animations API, not approximated by
    // sleep timings or mistaken for the JS clock. The game/canvas clock advances
    // by the same elapsed time on both builds. This is not a native-FPS test.
    const movement=await page.evaluate(()=>{
      for(const direction of ['left','right','down','up']) {
        const target=ShuWorldLife.moveTarget(s.x,s.y,direction,4,isWalkableWorld);
        if(target.x!==s.x||target.y!==s.y)return {direction,from:{x:s.x,y:s.y},to:target};
      }
      throw Error('No reachable neighboring position for camera diagnostic');
    });
    await press(`[data-move="${movement.direction}"]`);
    const transitions=await page.evaluate(()=>{
      const nodes=['#map','#player','#dog'].map(q=>document.querySelector(q));
      window.sameArtMotionAnimations=nodes.flatMap(node=>node.getAnimations());
      return sameArtMotionAnimations.map(animation=>{
        const effect=animation.effect,timing=effect.getTiming();animation.pause();animation.currentTime=0;
        return {target:effect.target.id,property:animation.transitionProperty||animation.animationName||null,
          duration:timing.duration,delay:timing.delay,keyframes:effect.getKeyframes()};
      });
    });
    result.movementDiagnostic={...movement,transitions,timesMs:[0,75,150,300],
      clock:'Actual direction button, then deterministic Web Animations API transition seeking and matching JS-clock steps.',
      limitation:'If no map transition is active, these are settled snapshots; they do not show moving-camera interpolation or native frame pacing.'};
    let previousTime=0;
    for(const time of result.movementDiagnostic.timesMs) {
      if(time>previousTime)await page.clock.runFor(time-previousTime);
      await page.evaluate(time=>{for(const animation of sameArtMotionAnimations)animation.currentTime=time;},time);
      await capture(`camera-motion-${time}ms`,false);previousTime=time;
    }
    await ctx.close();

    if(process.env.SAM_SAMPLE_PERF==='1') {
    // This second context NEVER installs Playwright's clock. performance.now,
    // timers and requestAnimationFrame below are the browser's native clocks.
    const perfCtx=await context(), perf=await perfCtx.newPage();observe(perf);
    await perf.goto(url,{waitUntil:'load'});await enter(perf,screen.touch);
    if(await perf.locator('#lakeIntroSkip').isVisible())await perf.locator('#lakeIntroSkip')[screen.touch?'tap':'click']();
    await ready(perf);
    const perfRendering=experiments&&await setRendering(perf,'crisp-edges')?'crisp-edges':'pixelated';
    await perf.waitForTimeout(2000);
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
    result.performance.rendering=perfRendering;
    result.performance.status=experiments?'experimental CSS option only; not production':'original production CSS';
    await perfCtx.close();
    }
    assert.deepEqual(result.errors,[]);assert.deepEqual(result.httpErrors,[]);
    return result;
  } catch(error) {
    result.failure=error.stack;await page.screenshot({path:path.join(output,`${label}-failure.png`)}).catch(()=>{});throw error;
  } finally {
    fs.writeFileSync(path.join(output,`${label}-result.json`),JSON.stringify(result,null,2));await browser.close();
  }
};
