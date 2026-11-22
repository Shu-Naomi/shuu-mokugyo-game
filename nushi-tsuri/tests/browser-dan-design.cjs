const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),http=require('node:http');
const {createHash} = require('node:crypto');
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
      const style = getComputedStyle(node, pseudo);
      const {width, height} = node.getBoundingClientRect();
      const match = style.backgroundImage.match(/url\("([^"]+\.svg(?:\?[^"]*)?)"\)/);
      let source = null;
      if (match) {
        const response = await fetch(match[1]);
        const svg = new DOMParser().parseFromString(await response.text(), 'image/svg+xml').documentElement;
        source = {file: new URL(match[1]).pathname.split('/').pop(), viewBox: svg.getAttribute('viewBox'),
          width: svg.getAttribute('width'), height: svg.getAttribute('height'),
          shapeRendering: svg.getAttribute('shape-rendering')};
      }
      surfaces.push({selector, width, height, source, imageRendering: style.imageRendering,
        backgroundSize: style.backgroundSize, transform: getComputedStyle(node).transform});
    }
    const fish = await Promise.all([...document.querySelectorAll('.dan-race-fish')].map(async art => {
      const frame = art.querySelector('.dan-swimmer-sprite, img.active') ||
        [...art.querySelectorAll('canvas,img')].find(node => node.checkVisibility());
      const {width, height} = art.getBoundingClientRect();
      const canvas = frame instanceof HTMLCanvasElement ? frame : null;
      const style = frame && getComputedStyle(frame);
      const sprite = frame?.matches('.dan-swimmer-sprite');
      const file = (sprite && style.backgroundImage.match(/url\("([^"]+)"\)/)?.[1]) ||
        frame?.currentSrc || canvas?.dataset.atlasKey?.match(/(?:^|\|)(assets\/[^|]+\.png)(?:\||$)/)?.[1];
      let bitmap = null;
      if (file) {
        const image = new Image();
        image.src = file;
        await image.decode();
        bitmap = {file: new URL(file, document.baseURI).pathname.split('/').pop(),
          width: image.naturalWidth, height: image.naturalHeight};
        if (sprite) {
          const [columns, rows] = style.backgroundSize.split(' ').map(value => parseFloat(value) / 100);
          bitmap.frame = [bitmap.width / columns, bitmap.height / rows];
        }
      }
      return {role: art.parentElement.dataset.racer, cssWidth: width, cssHeight: height,
        species: frame?.dataset.species || art.dataset.aquariumFrame?.split(':')[0],
        source: frame?.tagName, imageRendering: style?.imageRendering, bitmap,
        canvasSize: canvas && [canvas.width, canvas.height],
        smoothing: canvas && canvas.getContext('2d').imageSmoothingEnabled};
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
    .dan-race-runner + .dan-race-runner { left: 180px !important; }
    .dan-race-runner + .dan-race-runner + .dan-race-runner { left: 296px !important; }
    .dan-race-tag, .dan-race-runner::before, .dan-race-runner::after { visibility: hidden !important; }
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

async function run(root,label,browser,viewport,deviceScaleFactor){
 const server=http.createServer((req,res)=>{let n=decodeURIComponent(new URL(req.url,'http://localhost').pathname).replace(/^\/nushi-tsuri\//,'')||'index.html';const f=path.resolve(root,n);if(!f.startsWith(root+path.sep)||!fs.existsSync(f)){res.writeHead(404);res.end();return;}res.setHeader('Content-Type',mime[path.extname(f)]||'application/octet-stream');res.setHeader('Cache-Control','no-store');fs.createReadStream(f).pipe(res);});
 await new Promise(r=>server.listen(0,'127.0.0.1',r));
 const c=await browser.newContext({viewport,deviceScaleFactor,hasTouch:viewport.width<1000,isMobile:viewport.width<1000,serviceWorkers:'block',locale:'ja-JP'}),errors=[],bad=[];
 try{
 await c.addInitScript(({key,state})=>localStorage.setItem(key,JSON.stringify(state)),{key:saveKey,state:{...seed(),soundEnabled:false,gameMinutes:600,money:4321,petLife:{version:6,unlockedTanks:1,food:10,nextId:2,selectedTank:0,selected:'pet-1',fish:[{uid:'pet-1',species:'funa',nickname:'ほし丸',tank:0,length:1800,bornSize:1500,health:90,water:100,fedDay:-1,changedDay:-1}]}}});
 const page=await c.newPage();page.on('pageerror',e=>errors.push(e.message));page.on('response',r=>{if(r.status()>=400)bad.push(r.url());});
 await page.clock.install({time:new Date('2026-11-22T12:00:00Z')});await page.clock.pauseAt('2026-11-22T12:00:01Z');
 const ready=[], movement={};let rendering;
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
 await press('#danRaceStart');await page.clock.runFor(2400);await fit('#danRaceSpurt,#villageFishGames [data-close]');await shot('race');
 rendering = await inspectRaceArt(page);
 assert.equal(rendering.dpr, deviceScaleFactor);
 assert.deepEqual(rendering.viewport, [viewport.width, viewport.height]);
 assert.ok(rendering.surfaces[0].source?.viewBox, 'course background loaded as SVG');
 if(label==='before'){
  const diagnostic=await page.addStyleTag({content:'.dan-race-course,.dan-race-island::before,.dan-race-flow,.dan-race-wheel::before,.dan-race-fish canvas,.dan-race-fish img{image-rendering:auto!important}'});
  await shot('sampling-auto');await diagnostic.evaluate(n=>n.remove());
 }

 await press('#danRaceSpurt');assert.equal(await page.locator('#danRaceSpurt').isDisabled(),true);await page.clock.runFor(200);await shot('sprint');
 await page.clock.runFor(4200);
 await shot('mill-fork');
 if (deviceScaleFactor > 1) {
   movement.mill = await sampleFishMovement(page, label, 'mill');
   const readFoam = () => page.locator('.dan-race-flow').evaluate(node => getComputedStyle(node, '::before').animationName);
   const active = await readFoam();
   await page.emulateMedia({reducedMotion: 'reduce'});
   const reduced = await readFoam();
   await page.emulateMedia({reducedMotion: 'no-preference'});
   movement.foam = {active, reduced};
   if (label === 'after') {
     assert.notEqual(active, 'none', 'the running waterwheel has a moving foam seam');
     assert.equal(reduced, 'none', 'the foam respects reduced motion');
   }
 }
 await page.clock.runFor(26000);await page.locator('[data-race-phase="result"]').waitFor();await fit('#danRaceAgain,#villageFishGames [data-close]');await shot('result');
 const result=await page.locator('.dan-race-result').getAttribute('data-time-cs'),rank=await page.locator('#danRaceRank').getAttribute('data-rank');
 await press('#danRaceAgain');await page.locator('#danRoutePicker').selectOption('bank');await press('#danRaceStart');await page.clock.runFor(27000);await page.locator('[data-race-phase="result"]').waitFor();await fit('#danRaceAgain');await press('#danRaceAgain');await shot('rematch');
 await press('#villageFishGames [data-close]');assert.equal(await page.locator('#villageFishGames.open').count(),0);
 assert.equal(await page.evaluate(()=>JSON.stringify({money:s.money,pet:s.petLife,baits:s.baits})),before,'race does not change funds, fish training or bait');
 await press('[data-move="down"]');await press('[data-move="up"]');await press('#action');await page.locator('#villageFishGames.open[data-game="race"]').waitFor();await fit('#danRaceStart');
 if(label==='after'){assert.ok(await page.locator('.dan-race-scoreboard').isVisible());assert.match(rendering.surfaces[0].source.file,/^dan-race-water.*\.svg$/);}
 if (deviceScaleFactor > 1) {
   await page.locator('#danCoursePicker').selectOption('gate');
   await page.locator('#danEntrantPicker').selectOption('rental-ayu');
   if (label === 'after') {
     assert.equal(await page.locator('[data-racer="player"] .dan-swimmer-sprite').getAttribute('data-species'), 'ayu');
   }
   await press('#danRaceStart');
   await page.clock.runFor(2400);
   await shot('gate-race');
   movement.gate = await sampleFishMovement(page, label, 'gate');
 }
 assert.deepEqual(errors,[]);assert.deepEqual(bad,[]);return {viewport,label,result,rank,rendering,movement,entry:true,branch:true,sprint:true,rematch:true,return:true,ready,errors,bad};
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
