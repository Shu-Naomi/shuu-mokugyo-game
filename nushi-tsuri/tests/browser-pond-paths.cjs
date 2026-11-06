const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),http=require('node:http'),{createHash}=require('node:crypto');
const {chromium}=require('playwright'),{seed,saveKey}=require('./game-harness.cjs'),{route,stops,samples}=require('./pond-paths.cjs');
const root=path.resolve(__dirname,'..'),directory=path.resolve(process.env.POND_EVIDENCE_DIR||'/tmp/pond-evidence');
const screens=[{width:1280,height:720,mobile:false,dpr:1},{width:844,height:390,mobile:true,dpr:3},{width:820,height:366,mobile:true,dpr:3}];
async function run(url,screen){
 const {width,height,mobile,dpr}=screen,browser=await chromium.launch({headless:true,...(process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE?{executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE}:{})});
 const context=await browser.newContext({viewport:{width,height},isMobile:mobile,hasTouch:mobile,deviceScaleFactor:dpr,locale:'ja-JP',serviceWorkers:'block'}),errors=[],failures=[];
 try{
  await context.addInitScript(({key,state})=>{if(!localStorage.getItem(key))localStorage.setItem(key,JSON.stringify(state));},{key:saveKey,state:{...seed(),mapRegion:'mountainPond',x:120,y:128,direction:'up',hp:100,soundEnabled:false,gameMinutes:600}});
  const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));page.on('response',r=>{if(r.status()>=400&&r.url().startsWith(url))failures.push(r.url());});
  const press=q=>page.locator(q)[mobile?'tap':'click'](),state=()=>page.evaluate(()=>({region:s.mapRegion,x:s.x,y:s.y,direction:s.direction}));
  const progress=()=>page.evaluate(()=>({money:s.money,hp:s.hp,baits:s.baits,caught:s.caught,time:s.gameMinutes,equipment:s.equipment}));
  const start=async()=>{await require('./browser-start-adventure.cjs')(page,mobile);await page.evaluate(()=>{Math.random=()=>.999999;});};
  const shot=async name=>{await page.waitForTimeout(120);await page.screenshot({path:path.join(directory,`${width}x${height}-${name}.png`)});};
  const walk=async (target,exact=false)=>{const p=await state();const directions=route(p,target,p.region,exact?.1:1.1);for(const direction of directions){if(mobile)await press(`[data-move="${direction}"]`);else await page.keyboard.press({up:'ArrowUp',right:'ArrowRight',down:'ArrowDown',left:'ArrowLeft'}[direction]);}const after=await state();assert.equal(after.region,p.region);assert.ok(Math.hypot(after.x-target[0],after.y-target[1])<=1.1,JSON.stringify({target,after}));return {...after,steps:directions.length};};
  await page.goto(url,{waitUntil:'load'});await start();await page.waitForTimeout(800);await require('./browser-release.cjs').assertRelease(page);
  const sourceDigests={};for(const file of ['mountain-region.js','world-life.js','lake-story.js','assets/pass-pond-v252-51.png']){const response=await context.request.get(new URL(file,url).href);assert.ok(response.ok());const actual=createHash('sha256').update(await response.body()).digest('hex'),expected=createHash('sha256').update(fs.readFileSync(path.join(root,file))).digest('hex');assert.equal(actual,expected,file);sourceDigests[file]=actual;}
  assert.ok(await page.evaluate(samples=>samples.every(([px,py])=>ShuMountain.walkable(px/1672*240,py/941*135,'mountainPond')),samples));
  const before=await progress(),evidence=[];await shot('arrival');
  for(const [name,x,y]of stops){evidence.push({name,...await walk([x,y])});await shot(name);if(name.endsWith('shore')){const direction=await page.evaluate(()=>['up','right','down','left'].find(d=>ShuMountain.fishingWater(s.x,s.y,d,s.mapRegion)?.type==='highPond'));assert.ok(direction);await page.evaluate(d=>{s.direction=d;render();},direction);await press('#action');assert.equal(await page.evaluate(()=>battle?.phase),'prep');await shot(name+'-cast');await press('#cancelCastPreparation');assert.deepEqual(await progress(),before);}if(name==='house'){if(mobile)await press('[data-move="up"]');else await page.keyboard.press('ArrowUp');await press('#action');assert.equal(await page.locator('#worldHouseTitle').textContent(),'峠の釣り人の小屋');await shot('house-dialog');await page.evaluate(()=>close());}}
  // Independent fixed control sequences, not only routes derived from collision.
  for(const check of [{name:'west-road-width',start:[28,69],direction:'left',taps:2,end:[20,69]},{name:'northeast-road-width',start:[170,34],direction:'down',taps:1,end:[170,38]},{name:'east-road-width',start:[216,62],direction:'down',taps:3,end:[216,74]}]){
   await walk(check.start,true);const p=await state();assert.deepEqual([p.x,p.y],check.start);
   for(let i=0;i<check.taps;i++){if(mobile)await press('[data-move="'+check.direction+'"]');else await page.keyboard.press({up:'ArrowUp',left:'ArrowLeft',down:'ArrowDown',right:'ArrowRight'}[check.direction]);}
   const end=await state();assert.deepEqual([end.x,end.y],check.end);await shot(check.name);
  }
  await walk([112,128],true);
  if(mobile){
   const cdp=await context.newCDPSession(page),box=await page.locator('[data-move="up"]').boundingBox();
   await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:box.x+box.width/2,y:box.y+box.height/2}]});await page.waitForTimeout(800);
   await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await cdp.detach();
   const held=await state();assert.equal(held.x,112);assert.ok(held.y<=116&&held.y>=104,JSON.stringify(held));await page.waitForTimeout(500);assert.deepEqual(await state(),held);await shot('held-touch-entrance');
  }else{for(let i=0;i<6;i++)await page.keyboard.press('ArrowUp');const p=await state();assert.deepEqual([p.x,p.y],[112,104]);await shot('keyboard-wide-entrance');}
  await walk([219,8]);await press('#action');assert.equal((await state()).region,'mountainMarsh');await shot('marsh-arrival');await press('#action');assert.equal((await state()).region,'mountainPond');const returned=await state();assert.deepEqual([returned.x,returned.y],[212,10]);
  await walk([120,128]);await press('#action');assert.equal((await state()).region,'stream');await shot('stream-return');await press('#action');assert.equal((await state()).region,'mountainPond');
  await walk([117,118]);await page.evaluate(()=>save());const saved=await state();await page.reload({waitUntil:'load'});await start();assert.deepEqual(await state(),saved);assert.deepEqual(await progress(),before);await shot('reload-west-entrance');
  await page.evaluate(()=>openOptions());await shot('options');await press('#optionsClose');assert.deepEqual(await state(),saved);await walk([120,106]);await shot('resume');
  assert.deepEqual(errors,[]);assert.deepEqual(failures,[]);fs.writeFileSync(path.join(directory,`${width}x${height}-result.json`),JSON.stringify({url,screen,sourceDigests,evidence,progressPreserved:true,saveReload:true,errors,failures},null,2));console.log('POND_PATHS_BROWSER_PASS',width,height,dpr);
 }finally{await context.close();await browser.close();}
}
const types={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.png':'image/png','.webp':'image/webp','.svg':'image/svg+xml','.mp3':'audio/mpeg','.wav':'audio/wav'};
const server=http.createServer((req,res)=>{try{const name=new URL(req.url,'http://localhost').pathname.replace(/^\/nushi-tsuri\//,'')||'index.html',file=path.resolve(root,name);if(!file.startsWith(root+path.sep)||!fs.statSync(file).isFile())throw Error('path');res.writeHead(200,{'Content-Type':types[path.extname(file)]||'application/octet-stream','Cache-Control':'no-store'});fs.createReadStream(file).pipe(res);}catch{res.writeHead(404);res.end();}});
(async()=>{fs.mkdirSync(directory,{recursive:true});await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(0,'127.0.0.1',resolve);});try{for(const screen of screens)await run(process.env.POND_BASE_URL||`http://127.0.0.1:${server.address().port}/nushi-tsuri/`,screen);}finally{await new Promise(resolve=>server.close(resolve));}})().catch(error=>{console.error(error);process.exitCode=1;});
