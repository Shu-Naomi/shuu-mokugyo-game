const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),http=require('node:http');
const {createHash} = require('node:crypto');
const raceCrops = new Map();
const {chromium}=require('playwright'),{seed,saveKey}=require('./game-harness.cjs'),start=require('./browser-start-adventure.cjs');
const out=path.join(__dirname,'artifacts/dan-design');
const mime={'.html':'text/html','.js':'text/javascript','.css':'text/css','.svg':'image/svg+xml','.png':'image/png','.webp':'image/webp','.jpg':'image/jpeg','.mp3':'audio/mpeg','.woff2':'font/woff2'};
async function inspectRaceArt(page) {
  return page.evaluate(async () => {
    const surfaces = [];
    for (const [selector, pseudo] of [
      ['.dan-race-course'], ['.dan-race-island', '::before'],
      ['.dan-race-wheel', '::before'], ['.dan-race-flow']
    ]) {
      const node = document.querySelector(selector);
      if (!node) continue;
      const style = getComputedStyle(node, pseudo);
      const {width, height} = node.getBoundingClientRect();
      const match = style.backgroundImage.match(/url\("([^"]+)"\)/);
      let source = null;
      if (match) {
        const url = new URL(match[1]);
        const image = new Image();
        image.src = url.href;
        await image.decode();
        source = {file: url.pathname.split('/').pop(), width: image.naturalWidth, height: image.naturalHeight};
        if (source.file.endsWith('.svg')) {
          const svg = new DOMParser().parseFromString(await (await fetch(url)).text(), 'image/svg+xml').documentElement;
          source.viewBox = svg.getAttribute('viewBox');
          source.shapeRendering = svg.getAttribute('shape-rendering');
        }
      }
      surfaces.push({selector, width, height, source, imageRendering: style.imageRendering,
        backgroundSize: style.backgroundSize, transform: getComputedStyle(node).transform});
    }
    const fish = await Promise.all([...document.querySelectorAll('.dan-race-fish')].map(async art => {
      const frame = art.querySelector('.dan-swimmer-sprite, img.active') ||
        [...art.querySelectorAll('canvas,img')].find(node => node.checkVisibility());
      const {x, y, width, height} = art.getBoundingClientRect();
      const canvas = frame instanceof HTMLCanvasElement ? frame : null;
      const style = frame && getComputedStyle(frame);
      const sprite = frame?.matches('.dan-swimmer-sprite');
      const file = (sprite && style.backgroundImage.match(/url\("([^"]+)"\)/)?.[1]) ||
        frame?.currentSrc || canvas?.dataset.atlasKey?.match(/(?:^|\|)(assets\/[^|]+\.png)(?:\||$)/)?.[1];
      let bitmap = null, ink = null;
      if (file) {
        const image = new Image();
        image.src = file;
        await image.decode();
        bitmap = {file: new URL(file, document.baseURI).pathname.split('/').pop(),
          width: image.naturalWidth, height: image.naturalHeight};
        if (sprite) {
          const [columns, rows] = style.backgroundSize.split(' ').map(value => parseFloat(value) / 100);
          const w = bitmap.width / columns, h = bitmap.height / rows;
          bitmap.frame = [w, h];
          const cellX = Math.round(parseFloat(style.backgroundPositionX) / 100 * (columns - 1));
          const cellY = Math.round(parseFloat(style.backgroundPositionY) / 100 * (rows - 1));
          const pixels = document.createElement('canvas');
          pixels.width = w;
          pixels.height = h;
          const ctx = pixels.getContext('2d');
          ctx.drawImage(image, cellX * w, cellY * h, w, h, 0, 0, w, h);
          const data = ctx.getImageData(0, 0, w, h).data;
          let x0 = w, y0 = h, x1 = 0, y1 = 0, solid = 0;
          for (let i = 0; i < w * h; i++) {
            if (data[4 * i + 3] < 96) continue;
            const x = i % w, y = Math.floor(i / w);
            x0 = Math.min(x0, x); y0 = Math.min(y0, y);
            x1 = Math.max(x1, x + 1); y1 = Math.max(y1, y + 1);
            solid++;
          }
          const rect = frame.getBoundingClientRect(), course = art.closest('.dan-race-course');
          const edge = course.getBoundingClientRect(), sx = rect.width / w, sy = rect.height / h;
          ink = {width: (x1 - x0) * sx, height: (y1 - y0) * sy, paintedCssArea: solid * sx * sy,
            left: rect.left + x0*sx, top: rect.top + y0*sy,
            frame: [cellX, cellY], sourceBounds: [x0,y0,x1,y1],
            margins: [rect.left + x0*sx - edge.left - course.clientLeft,
              rect.top + y0*sy - edge.top - course.clientTop,
              edge.left + course.clientLeft + course.clientWidth - rect.left - x1*sx,
              edge.top + course.clientTop + course.clientHeight - rect.top - y1*sy]};

        }
      }
      return {role: art.parentElement.dataset.racer, x, y, cssWidth: width, cssHeight: height,
        species: frame?.dataset.species || art.dataset.aquariumFrame?.split(':')[0],
        source: frame?.tagName, imageRendering: style?.imageRendering, bitmap, ink, progress: Number(art.parentElement.dataset.progress),
        canvasSize: canvas && [canvas.width, canvas.height],
        smoothing: canvas && canvas.getContext('2d').imageSmoothingEnabled,
        smoothingQuality: canvas && canvas.getContext('2d').imageSmoothingQuality};
    }));
    return {dpr: devicePixelRatio, viewport: [innerWidth, innerHeight], touch: navigator.maxTouchPoints,
      surfaces, fish};
  });
}

async function sampleFishMovement(page, label, course) {
  // Pin only the screen positions and backing color during this diagnostic.
  // A changed crop must come from the fish, even while the race clock advances.
  const pin = await page.addStyleTag({content: `
    .dan-race-runner { left: 64px !important; top: 68px !important; transform: none !important; background: #234d51; }
    .dan-race-runner[data-racer="front"] { left: 180px !important; }
    .dan-race-runner[data-racer="late"] { left: 296px !important; }
    .dan-race-wake, .dan-race-tag, .dan-race-runner::before, .dan-race-runner::after { visibility: hidden !important; }
  `});
  try {
    const runners = await page.locator('.dan-race-runner').all();
    assert.equal(runners.length, 3);
    const samples = [];
    for (const runner of runners) {
      const art = runner.locator('.dan-race-fish');
      const species = await art.evaluate(node => node.querySelector('.dan-swimmer-sprite')?.dataset.species ||
        node.dataset.aquariumFrame?.split(':')[0]);
      samples.push({species, role: await runner.getAttribute('data-racer'), clip: await art.boundingBox(), pixels: new Set()});
    }
    for (let step = 0; step < 7; step++) {
      await page.clock.runFor(155);
      for (const sample of samples) {
        const png = await page.screenshot({clip: sample.clip, scale: 'device'});
        const hash = createHash('sha256').update(png).digest('hex');
        if (!sample.pixels.has(hash) && sample.pixels.size < 2) {
          fs.writeFileSync(path.join(out, `820-${label}-${course}-${sample.role}-${sample.pixels.size}.png`), png);
        }
        sample.pixels.add(hash);
      }
    }
    return samples.map(({role, species, pixels}) => {
      if (label === 'after') assert.ok(pixels.size > 1, `${course} ${role}: fish pixels never moved`);
      return {role, species, distinctPaints: pixels.size};
    });
  } finally {
    await pin.evaluate(node => node.remove());
  }
}

// These crops keep the water, wake, lane label and neighboring fish from the
// ordinary screen. Reuse the before-version clip for identical coordinates.
async function captureRacers(page, label, course) {
  const runners = await page.locator('.dan-race-runner').all();
  for (const runner of runners) {
    const art = runner.locator('.dan-swimmer-sprite');
    const species = await art.getAttribute('data-species');
    const key = course + '-' + species;
    if (label === 'before') {
      const rect = await art.boundingBox();
      raceCrops.set(key, {x: Math.floor(rect.x + rect.width / 2 - 69),
        y: Math.floor(rect.y + rect.height / 2 - 31), width: 138, height: 66});
    }
    await page.screenshot({clip: raceCrops.get(key), scale: 'device',
      path: path.join(out, `820-${label}-live-${key}.png`)});
  }
}

async function readWakes(page) {
  return page.locator('.dan-race-wake').evaluateAll(nodes => nodes.flatMap((n, index) =>
    n.hidden || !n.checkVisibility() ? [] : [{index, x:n.style.left, y:n.style.top,
      stage: Number(n.dataset.stage), spurt:n.hasAttribute('data-spurt'), width:n.offsetWidth}]));
}

async function sampleRipples(page) {
  const ripples = page.locator('.dan-race-ripple');
  const count = await ripples.count();
  if (!count) return {count, distinctPaints: 0};
  // At the fork the competitors have left the upstream water behind.
  const ripple = ripples.first(), clip = await ripple.boundingBox();
  const animation = await ripple.evaluateHandle(node => node.getAnimations()[0]);
  const hashes = new Set();
  try {
    for (const fraction of [.02,.24,.47,.71,.92]) {
      await animation.evaluate((a, tick) => {
        a.pause();
        a.currentTime = a.effect.getComputedTiming().duration * tick;
      }, fraction);
      hashes.add(createHash('sha256').update(await page.screenshot({clip, scale:'device'})).digest('hex'));
    }
  } finally {
    await animation.evaluate(a => a.play());
    await animation.dispose();
  }
  return {count, distinctPaints: hashes.size};
}

async function captureWaterway(page, label, course) {
  const clip = await page.locator('.dan-race-course').boundingBox();
  for (let i = 0; i < 9; i++) {
    await page.screenshot({clip, scale:'device',
      path:path.join(out,`820-${label}-${course}-motion-${i}.png`)});
    await page.clock.runFor(140);
  }
}

function assertFishFit(fish, label) {
  for (const f of fish) {
    assert.ok(f.ink && f.ink.width > 0 && f.ink.height > 0, `${label} missing ${f.species}`);
    assert.ok(Math.min(...f.ink.margins) >= -1, `${label} cropped ${f.species}: ${f.ink.margins}`);
  }
}

async function inspectForkTag(page) {
  const art = await inspectRaceArt(page);
  const player = art.fish.find(f => f.role === 'player');
  const tag = await page.locator('[data-racer="front"] .dan-race-tag').evaluate(node => {
    const rect = node.getBoundingClientRect(), course = node.closest('.dan-race-course');
    const boundary = course.getBoundingClientRect();
    const x = boundary.left + course.clientLeft, y = boundary.top + course.clientTop;
    return {text: node.textContent.trim(), left: rect.left, top: rect.top, right: rect.right, bottom: rect.bottom,
      visible: node.checkVisibility({opacityProperty:true, visibilityProperty:true}),
      textFits: node.scrollWidth <= node.clientWidth + 1,
      insideCourse: rect.left >= x && rect.right <= x + course.clientWidth &&
        rect.top >= y && rect.bottom <= y + course.clientHeight};
  });
  const {left, top, width, height} = player.ink;
  const overlapWidth = Math.max(0, Math.min(left + width, tag.right) - Math.max(left, tag.left));
  const overlapHeight = Math.max(0, Math.min(top + height, tag.bottom) - Math.max(top, tag.top));
  return {tag, playerProgress:player.progress, playerInk:{left, top, width, height},
    overlapCssArea:overlapWidth * overlapHeight};
}

async function run(root,label,browser,viewport,deviceScaleFactor){
 const server=http.createServer((req,res)=>{let n=decodeURIComponent(new URL(req.url,'http://localhost').pathname).replace(/^\/nushi-tsuri\//,'')||'index.html';const f=path.resolve(root,n);if(!f.startsWith(root+path.sep)||!fs.existsSync(f)){res.writeHead(404);res.end();return;}res.setHeader('Content-Type',mime[path.extname(f)]||'application/octet-stream');res.setHeader('Cache-Control','no-store');fs.createReadStream(f).pipe(res);});
 await new Promise(r=>server.listen(0,'127.0.0.1',r));
 const c=await browser.newContext({viewport,deviceScaleFactor,hasTouch:viewport.width<1000,isMobile:viewport.width<1000,serviceWorkers:'block',locale:'ja-JP'}),errors=[],bad=[];
 try{
 await c.addInitScript(({key,state})=>localStorage.setItem(key,JSON.stringify(state)),{key:saveKey,state:{...seed(),soundEnabled:false,gameMinutes:600,money:4321,petLife:{version:6,unlockedTanks:1,food:10,nextId:3,selectedTank:0,selected:'pet-1',fish:[{uid:'pet-1',species:'funa',nickname:'ほし丸',tank:0,length:1800,bornSize:1500,health:90,water:100,fedDay:-1,changedDay:-1},{uid:'pet-2',species:'iwana',nickname:'いわ丸',tank:0,length:2800,bornSize:2400,health:90,water:100,fedDay:-1,changedDay:-1}]}}});
 const page=await c.newPage();page.on('pageerror',e=>errors.push(e.message));page.on('response',r=>{if(r.status()>=400)bad.push(r.url());});
 await page.clock.install({time:new Date('2026-11-22T12:00:00Z')});await page.clock.pauseAt('2026-11-22T12:00:01Z');
 const ready=[], movement={}, edges={};let rendering;
 const press=async q=>{await page.locator(q)[viewport.width<1000?'tap':'click']();const next={'#action':'#danRaceStart','#danRaceStart':'#danRaceSpurt','#danRaceAgain':'#danRaceStart'}[q];if(next){assert.equal(await page.locator(next).isEnabled(),true,'no forced wait after '+q);ready.push({action:q,readyBeforeClockAdvance:true});}await page.clock.runFor(100);};
 const shot=async name=>{await page.screenshot({path:path.join(out,`${viewport.width}-${label}-${name}.png`)});};
 const fit=async q=>{const a=await page.locator(q).evaluateAll((nodes,minHeight)=>nodes.filter(n=>!n.hidden&&n.getClientRects().length&&!n.disabled).map(n=>{const r=n.getBoundingClientRect(),h=document.elementFromPoint(r.x+r.width/2,r.y+r.height/2);return {id:n.id,ok:r.width>0&&r.height>=minHeight&&r.left>=0&&r.top>=0&&r.right<=innerWidth&&r.bottom<=innerHeight&&(h===n||n.contains(h))};}),label==='after'?44:35);assert.ok(a.length&&a.every(x=>x.ok),JSON.stringify(a));};
 await page.goto(`http://127.0.0.1:${server.address().port}/nushi-tsuri/`);await start(page,viewport.width<1000);await page.clock.runFor(300);
 if(await page.locator('#lakeIntroSkip').isVisible())await press('#lakeIntroSkip');
 await page.evaluate(()=>{Math.random=()=>.999999;Object.assign(s,{mapRegion:'village',...ShuVillageReference.landmarks['west-shrine'],direction:'up'});render();});
 await page.waitForFunction(()=>document.querySelector('#worldPixels').style.backgroundImage==='none');await page.clock.runFor(700);await shot('shop');
 const before=await page.evaluate(()=>JSON.stringify({money:s.money,pet:s.petLife,baits:s.baits}));
 await press('#action');await page.locator('#villageFishGames.open[data-game="race"]').waitFor();await fit('#danRaceStart,#danEntrantPicker,#danCoursePicker,#villageFishGames [data-close]');await shot('entry');
 await page.locator('#danEntrantPicker').selectOption('pet-1');await page.locator('#danCoursePicker').selectOption('mill');await page.locator('#danRoutePicker').selectOption('wheel');await page.clock.runFor(100);await fit('#danRoutePicker,#danRaceStart');await shot('mill-entry');
 edges.start = (await inspectRaceArt(page)).fish;
 if (label === 'after') assertFishFit(edges.start, 'starting grid');
 await press('#danRaceStart');await page.clock.runFor(2400);await fit('#danRaceSpurt,#villageFishGames [data-close]');await shot('race');
 rendering = await inspectRaceArt(page);
 if (deviceScaleFactor > 1) {
   await captureRacers(page, label, 'mill');
   movement.beforeSpurt = await readWakes(page);
 }
 assert.equal(rendering.dpr, deviceScaleFactor);
 assert.deepEqual(rendering.viewport, [viewport.width, viewport.height]);
 assert.ok(rendering.surfaces[0].source?.width > 0, 'course artwork decoded');
 if (label === 'before') {
   // Keep compositor animation phases fixed as well as the JS race clock.
   const playing = await page.evaluateHandle(async () => {
     const animations = document.getAnimations().filter(a => a.playState === 'running');
     animations.forEach(a => a.pause());
     await Promise.all(animations.map(a => a.ready));
     return animations;
   });
   try {
     await shot('sampling-control');
     for (const [name, selectors, check] of [
       ['water', '.dan-race-course,.dan-race-island::before,.dan-race-flow,.dan-race-wheel::before', '.dan-race-course'],
       ['fish', '.dan-swimmer-sprite,.dan-race-fish canvas,.dan-race-fish img', '.dan-swimmer-sprite'],
     ]) {
       const toggle = await page.addStyleTag({content:selectors + '{image-rendering:auto!important}'});
       assert.equal(await page.locator(check).first().evaluate(n => getComputedStyle(n).imageRendering), 'auto');
       await shot('sampling-' + name + '-auto');
       await toggle.evaluate(node => node.remove());
     }
   } finally {
     await playing.evaluate(animations => animations.forEach(a => a.play()));
     await playing.dispose();
   }
 }

 await press('#danRaceSpurt');assert.equal(await page.locator('#danRaceSpurt').isDisabled(),true);await page.clock.runFor(200);await shot('sprint');
 if (deviceScaleFactor > 1) {
   movement.afterSpurt = await readWakes(page);
   if (label === 'after') {
     assert.ok(movement.afterSpurt.some(w => w.spurt), 'spurt left a wake');
     assert.ok(movement.beforeSpurt.some(before => movement.afterSpurt.some(after =>
       before.index === after.index && before.x === after.x && before.y === after.y && after.stage > before.stage)),
       'an older wake remains at its original water position while the fish moves on');
   }
 }
 await page.clock.runFor(4200);
 await shot('mill-fork');
 if (viewport.width < 1000) {
   edges.fork = await inspectForkTag(page);
   if (label === 'after') {
     const {tag, overlapCssArea} = edges.fork;
     assert.ok(tag.text && tag.visible && tag.textFits && tag.insideCourse, JSON.stringify(edges.fork));
     assert.equal(overlapCssArea, 0, 'front rival label obscured by player at mill fork: ' + JSON.stringify(edges.fork));
   }
 }
 if (deviceScaleFactor > 1) {
   await captureWaterway(page, label, 'mill');
   movement.ripples = await sampleRipples(page);
   movement.mill = await sampleFishMovement(page, label, 'mill');
   const readFoam = () => page.locator('.dan-race-flow').evaluate(node => getComputedStyle(node, '::before').animationName);
   const active = await readFoam();
   await page.emulateMedia({reducedMotion: 'reduce'});
   const reduced = await readFoam();
   const reducedRippleAnimations = await page.locator('.dan-race-ripple').evaluateAll(nodes =>
     nodes.reduce((total, node) => total + node.getAnimations().length, 0));
   const reducedWakes = await readWakes(page);
   await page.emulateMedia({reducedMotion: 'no-preference'});
   movement.foam = {active, reduced, reducedRippleAnimations, reducedWakes: reducedWakes.length};
   if (label === 'after') {
     assert.ok(movement.ripples.distinctPaints > 1, 'upstream surface changes independently of fish and wheel');
     assert.equal(reducedRippleAnimations, 0);
     assert.equal(reducedWakes.length, 0);
     assert.notEqual(active, 'none', 'the running waterwheel has a moving foam seam');
     assert.equal(reduced, 'none', 'the foam respects reduced motion');
   }
 }
 let firstFinish = false;
 for (let i = 0; i < 90 && !firstFinish; i++) {
   await page.clock.runFor(120);
   firstFinish = await page.locator('.dan-race-runner[data-progress="100.00"]').count() > 0;
 }
 assert.ok(firstFinish, 'observed a swimmer on the finish line');
 edges.finish = (await inspectRaceArt(page)).fish;
 if (label === 'after') assertFishFit(edges.finish, 'finishing stretch');
 await page.clock.runFor(26000);await page.locator('[data-race-phase="result"]').waitFor();await fit('#danRaceAgain,#villageFishGames [data-close]');await shot('result');
 const result=await page.locator('.dan-race-result').getAttribute('data-time-cs'),rank=await page.locator('#danRaceRank').getAttribute('data-rank');
 await press('#danRaceAgain');await page.locator('#danRoutePicker').selectOption('bank');await press('#danRaceStart');await page.clock.runFor(27000);await page.locator('[data-race-phase="result"]').waitFor();await fit('#danRaceAgain');await press('#danRaceAgain');await shot('rematch');
 await press('#villageFishGames [data-close]');assert.equal(await page.locator('#villageFishGames.open').count(),0);
 assert.equal(await page.evaluate(()=>JSON.stringify({money:s.money,pet:s.petLife,baits:s.baits})),before,'race does not change funds, fish training or bait');
 await press('[data-move="down"]');await press('[data-move="up"]');await press('#action');await page.locator('#villageFishGames.open[data-game="race"]').waitFor();await fit('#danRaceStart');
 if(label==='after'){assert.ok(await page.locator('.dan-race-scoreboard').isVisible());assert.match(rendering.surfaces[0].source.file,/^dan-race-water.*\.(?:png|svg)$/);}
 if (deviceScaleFactor > 1) {
   await page.locator('#danCoursePicker').selectOption('gate');
   await page.locator('#danEntrantPicker').selectOption('pet-2');
   await page.locator('[data-racer="player"] canvas[data-art-paint-key]').waitFor({state:'attached'});
   movement.ownedIwana = (await inspectRaceArt(page)).fish.find(f => f.role === 'player');
   assert.equal(movement.ownedIwana.species, 'iwana');
   assert.equal(movement.ownedIwana.source, 'CANVAS');
   assert.equal(movement.ownedIwana.imageRendering, 'pixelated');
   assert.deepEqual(movement.ownedIwana.canvasSize, label === 'after' ? [128,64] : [448,224]);
   assert.equal(movement.ownedIwana.smoothing, label === 'after');
   if (label === 'after') assert.equal(movement.ownedIwana.smoothingQuality, 'high');
   await page.locator('#danEntrantPicker').selectOption('rental-ayu');
   if (label === 'after') {
     assert.equal(await page.locator('[data-racer="player"] .dan-swimmer-sprite').getAttribute('data-species'), 'ayu');
   }
   await press('#danRaceStart');
   await page.clock.runFor(2400);
   await shot('gate-race');
   movement.gateFish = (await inspectRaceArt(page)).fish;
   await captureRacers(page, label, 'gate');
   await captureWaterway(page, label, 'gate');
   movement.gate = await sampleFishMovement(page, label, 'gate');
 }
 assert.deepEqual(errors,[]);assert.deepEqual(bad,[]);return {viewport,label,result,rank,rendering,movement,edges,entry:true,branch:true,sprint:true,rematch:true,return:true,ready,errors,bad};
 }finally{await c.close();await new Promise(r=>server.close(r));}
}
(async () => {
  fs.mkdirSync(out, {recursive: true});
  const browser = await chromium.launch({headless: true});
  try {
    for (const [width, height, dpr] of [[1280,720,1], [844,390,1], [740,360,1], [820,366,1.875]]) {
      let baseline;
      for (const [label, root] of [['before', process.env.DAN_BASELINE], ['after', path.resolve(__dirname, '..')]]) {
        assert.ok(root);
        const report = await run(path.resolve(root), label, browser, {width, height}, dpr);
        if (label === 'before') baseline = report;
        else {
          assert.equal(report.result, baseline.result);
          assert.equal(report.rank, baseline.rank);
          const boxes = art => art.surfaces.map(({width, height}) => [width, height]);
          assert.deepEqual(boxes(report.rendering), boxes(baseline.rendering), 'course geometry');
        }
        fs.writeFileSync(path.join(out, `${width}-${label}.json`), JSON.stringify(report, null, 2));
        console.log('DAN_DESIGN_PASS', JSON.stringify(report));
      }
    }
  } finally {
    await browser.close();
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
