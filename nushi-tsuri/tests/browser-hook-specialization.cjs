// Real pointer/touch regression. Fixtures seed equipment only; no fish outcomes are written.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),http=require('node:http');
const {chromium}=require('playwright');
const {seed,saveKey}=require('./game-harness.cjs');
const {pressProduct}=require('./compact-ui-helpers.cjs');
const enter=require('./browser-start-adventure.cjs');
const root=path.resolve(__dirname,'..'),dir=path.resolve(process.env.HOOK_SPECIALIZATION_EVIDENCE_DIR||'/tmp/hook-specialization-evidence');
const screens=[{width:1280,height:720,mobile:false},{width:844,height:390,mobile:true},{width:820,height:366,mobile:true}];
async function run(url,screen){
 const {width,height,mobile}=screen,browser=await chromium.launch({headless:true,...(process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE?{executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE}:{})});
 const context=await browser.newContext({viewport:{width,height},isMobile:mobile,hasTouch:mobile,locale:'ja-JP',serviceWorkers:'block'}),page=await context.newPage(),errors=[],httpErrors=[];
 page.setDefaultTimeout(15000);page.on('pageerror',e=>errors.push(e.message));page.on('response',r=>{if(r.status()>=400&&r.url().startsWith(url))httpErrors.push(r.status()+' '+r.url());});
 const press=q=>page.locator(q)[mobile?'tap':'click'](),act=q=>pressProduct(page,q,mobile),shot=name=>page.screenshot({path:path.join(dir,`${width}x${height}-${name}.png`)});
 const stock=()=>page.evaluate(()=>JSON.stringify({money:s.money,hp:s.hp,time:s.gameMinutes,baits:s.baits,lures:s.lures,caught:s.caught,sizeRecords:s.sizeRecords}));
 async function start(){await enter(page,mobile,{slot:1,isNew:false});await page.clock.runFor(240);if(await page.locator('#lakeIntroSkip').isVisible())await press('#lakeIntroSkip');}
 async function settle(){for(let i=0;i<60&&await page.evaluate(()=>battle?.phase)==='cast-flight';i++)await page.clock.runFor(40);}
 async function selected(scope,id){const button=page.locator(`${scope} [data-pick-hook="${id}"]`);assert.equal(await button.getAttribute('aria-pressed'),'true');assert.ok((await button.getAttribute('class')).includes('selected'));assert.equal(await page.evaluate(()=>s.selectedHook),id);}
 async function inspect(scope){
  assert.equal(await page.locator(`${scope} [data-pick-hook]`).count(),5);
  const icons=await page.locator(`${scope} [data-pick-hook]`).evaluateAll(buttons=>buttons.map(b=>b.closest('.compact-product')?.querySelector('svg')?.outerHTML||b.querySelector('svg')?.outerHTML));
  assert.ok(icons.every(Boolean));assert.equal(new Set(icons).size,5);
  assert.match(await page.locator(`${scope} [data-pick-hook="micro"]`).textContent(),/小魚針/);assert.match(await page.locator(`${scope} [data-pick-hook="carp"]`).textContent(),/コイ針/);
 }
 try{
  // Forage takes priority over fishing on field A. Seed an empty, valid morning
  // cycle so unrelated random shoreline pickups cannot consume the test action.
  await context.addInitScript(({key,state})=>{if(!localStorage.getItem(key))localStorage.setItem(key,JSON.stringify(state));localStorage.setItem('nushi-inugoya-options-v1',JSON.stringify({textSpeed:'instant'}));},{key:saveKey,state:{...seed(),forageCycle:{version:1,dayIndex:0,period:'morning',expiresAt:620,active:{},harvested:[],dogFound:[]},mapRegion:'village',x:127,y:56,direction:'up',hp:100,dogFollowing:false,soundEnabled:false,ownedRods:['bamboo','lureRod'],selectedRod:'bamboo',baits:{worm:20,corn:20,nushiSecret:2},lures:{silverSpoon:1},selectedHook:'small',selectedBait:'worm',fishingMethod:'bait'}});
  await page.clock.install({time:new Date('2026-11-06T00:00:00Z')});await page.clock.pauseAt('2026-11-06T00:00:01Z');await page.goto(url,{waitUntil:'load'});await start();
  await context.addInitScript(()=>{window.hookPointers=[];document.addEventListener('pointerdown',e=>hookPointers.push(e.pointerType));});await page.evaluate(()=>{window.hookPointers=[];document.addEventListener('pointerdown',e=>hookPointers.push(e.pointerType));});
  const before=await stock();await press('#menu');await press('[data-field-menu-target="items"]');await press('[data-inventory-tab="tackle"]');await inspect('#inventory');
  for(const id of ['small','medium','large','micro','carp','carp','micro']){await act(`#inventory [data-pick-hook="${id}"]`);await selected('#inventory',id);assert.equal(await page.locator('[data-compact-group-panel="hook"]').isVisible(),true);}
  await shot('inventory-micro');await press('#inventory [data-close]');await press('#menu');await press('[data-field-menu-target="items"]');await act('#inventory [data-pick-hook="carp"]');await selected('#inventory','carp');await shot('inventory-carp');await press('#inventory [data-close]');assert.equal(await stock(),before);
  await page.reload({waitUntil:'load'});await start();assert.equal(await page.evaluate(()=>s.selectedHook),'carp');assert.equal(await stock(),before);assert.equal(await page.evaluate(()=>nearbyForagePoint()),null,'fixture forage must not intercept field A');
  await press('#action');assert.equal(await page.evaluate(()=>battle?.phase),'prep','fixture must face fishable water');await press('#wait');await press('[data-cast-tackle="hook"]');await inspect('#tackle');
  for(const id of ['micro','carp','carp']){await press(`#tackle [data-pick-hook="${id}"]`);await selected('#tackle',id);assert.equal(await page.locator('#castTackle-hook').isVisible(),true);}
  assert.match(await page.locator('#castTackle-hook').textContent(),/5種類.*消耗なし/);await shot('cast-hooks');
  await press('[data-cast-tackle="bait"]');await press('#tackle [data-pick-bait="nushiSecret"]');await press('[data-cast-tackle="hook"]');
  for(const id of ['small','medium','large','micro','carp'])assert.equal(await page.locator(`#tackle [data-pick-hook="${id}"]`).isDisabled(),id!=='large');await selected('#tackle','large');await shot('secret-bait');
  await press('[data-cast-tackle="bait"]');await press('#tackle [data-pick-bait="worm"]');await press('[data-cast-tackle="hook"]');await press('#tackle [data-pick-hook="micro"]');await press('#tackle [data-close]');assert.equal(await page.evaluate(()=>battle.phase),'prep');await press('#wait');await selected('#tackle','micro');await press('#cancelTacklePreparation');assert.equal(await page.evaluate(()=>battle),null);assert.equal(await stock(),before);
  // Real casts, with no selectedHook assignments or fake catches.
  for(const hook of ['carp','micro']){
   await page.clock.fastForward(2800);await press('#action');assert.equal(await page.evaluate(()=>battle?.phase),'prep','fixture must face fishable water');await press('#wait');await press('[data-cast-tackle="hook"]');await press(`#tackle [data-pick-hook="${hook}"]`);await press('#beginCast');assert.equal(await page.evaluate(()=>battle.phase),'cast');await page.clock.runFor(240);await press('#pull');
   assert.equal(await page.evaluate(()=>battle.hook),hook);assert.equal(await page.evaluate(()=>s.selectedHook),hook);assert.ok(await page.evaluate(()=>!!battle.specimen));await settle();await shot('actual-cast-'+hook);await press('#wait');
  }
  // Lure mode leaves the stored bait hook untouched and consumes no bait.
  await page.clock.fastForward(2800);await press('#action');assert.equal(await page.evaluate(()=>battle?.phase),'prep','fixture must face fishable water');await press('#wait');await press('[data-cast-tackle="method"]');await press('#tackle [data-fishing-method="lure"]');await press('[data-cast-tackle="bait"]');assert.match(await page.locator('#castBaitHint').textContent(),/抽選に影響しない/);const bait=await page.evaluate(()=>s.baits.worm);await press('#beginCast');await page.clock.runFor(240);await press('#pull');assert.equal(await page.evaluate(()=>battle.method),'lure');assert.equal(await page.evaluate(()=>s.baits.worm),bait);assert.equal(await page.evaluate(()=>s.lures.silverSpoon),1);await settle();await shot('lure-unaffected');await press('#wait');
  const pointers=await page.evaluate(()=>hookPointers);if(mobile)assert.ok(pointers.includes('touch'));assert.deepEqual(errors,[]);assert.deepEqual(httpErrors,[]);
  fs.writeFileSync(path.join(dir,`${width}x${height}-result.json`),JSON.stringify({screen,errors,httpErrors,realPointerSelection:true,actualCasts:['carp','micro'],lure:true},null,2));console.log('HOOK_SPECIALIZATION_PASS',width,height);
 }catch(e){await shot('failure').catch(()=>{});fs.writeFileSync(path.join(dir,`${width}x${height}-failure.json`),JSON.stringify({error:e.stack,errors,httpErrors},null,2));throw e;}finally{await context.close();await browser.close();}
}
const types={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.png':'image/png','.webp':'image/webp','.svg':'image/svg+xml','.mp3':'audio/mpeg','.wav':'audio/wav'};
const server=http.createServer((req,res)=>{try{const name=new URL(req.url,'http://localhost').pathname.replace(/^\/nushi-tsuri\//,'')||'index.html',file=path.resolve(root,name);if(!file.startsWith(root+path.sep)||!fs.statSync(file).isFile())throw Error('path');res.writeHead(200,{'Content-Type':types[path.extname(file)]||'application/octet-stream','Cache-Control':'no-store'});fs.createReadStream(file).pipe(res);}catch{res.writeHead(404);res.end();}});
(async()=>{fs.mkdirSync(dir,{recursive:true});await new Promise(r=>server.listen(0,'127.0.0.1',r));const failures=[];try{for(const screen of screens)try{await run(`http://127.0.0.1:${server.address().port}/nushi-tsuri/`,screen);}catch(e){failures.push(e.stack);fs.writeFileSync(path.join(dir,`${screen.width}x${screen.height}-run-failure.json`),JSON.stringify({error:e.stack},null,2));}if(failures.length)throw Error(failures.join('\n'));}finally{await new Promise(r=>server.close(r));}})().catch(e=>{console.error(e);process.exitCode=1;});
