const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),http=require('node:http'),{createHash}=require('node:crypto');
const {chromium}=require('playwright'),{seed,saveKey}=require('./game-harness.cjs'),M=require('../mountain-region.js');
const {planMarshRoute,marshRing,marshFeet}=require('./marsh-retreat-route.cjs');
const root=path.resolve(__dirname,'..'),directory=path.resolve(process.env.MARSH_EVIDENCE_DIR||'/tmp/marsh-retreat-evidence');
const screens=[{width:1280,height:720,mobile:false,dpr:1},{width:844,height:390,mobile:true,dpr:3},{width:820,height:366,mobile:true,dpr:1.875}];
const digest=data=>createHash('sha256').update(data).digest('hex');
async function run(url,screen){
 const {width,height,mobile,dpr}=screen,browser=await chromium.launch({headless:true,...(process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE?{executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE}:{})}),context=await browser.newContext({viewport:{width,height},isMobile:mobile,hasTouch:mobile,deviceScaleFactor:dpr,locale:'ja-JP',serviceWorkers:'block'}),errors=[],failures=[],evidence=[];
 try{
 await context.addInitScript(({key,state})=>{if(!localStorage.getItem(key))localStorage.setItem(key,JSON.stringify(state));localStorage.setItem('nushi-inugoya-options-v1',JSON.stringify({textSpeed:'instant'}));window.__marshImages=[];const src=Object.getOwnPropertyDescriptor(HTMLImageElement.prototype,'src');Object.defineProperty(HTMLImageElement.prototype,'src',{...src,set(value){if(String(value).includes('pass-marsh-v'))window.__marshImages.push(this);return src.set.call(this,value);}});},{key:saveKey,state:{...seed(),mapRegion:'mountainMarsh',...M.regions.mountainMarsh.entry,hp:100,dogFollowing:true,soundEnabled:false}});
 const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});page.on('response',r=>{if(r.status()>=400&&r.url().startsWith(url))failures.push(r.status()+' '+r.url());});page.on('requestfailed',r=>{if(r.url().startsWith(url))failures.push(r.failure()?.errorText+' '+r.url());});
 const press=q=>page.locator(q)[mobile?'tap':'click']();
 const state=()=>page.evaluate(()=>({region:s.mapRegion,x:s.x,y:s.y,direction:s.direction}));
 const progress=()=>page.evaluate(()=>JSON.parse(JSON.stringify({money:s.money,hp:s.hp,baits:s.baits,caught:s.caught,equipment:s.equipment,questCompletions:s.questCompletions,gameMinutes:s.gameMinutes,dog:s.dog,dogAffinity:s.dogAffinity})));
 const shot=async name=>{await page.evaluate(async()=>{await Promise.all(['map','player'].flatMap(id=>document.getElementById(id).getAnimations().filter(a=>a.effect.getComputedTiming().iterations!==Infinity).map(a=>a.finished.catch(()=>{}))));await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));});await page.screenshot({path:path.join(directory,`${width}x${height}-${name}.png`)});};
 async function start(){await require('./browser-start-adventure.cjs')(page,mobile);if(await page.locator('#lakeIntroSkip').isVisible())await press('#lakeIntroSkip');}
 let feetChecks=0;
 async function walk(target){const route=await page.evaluate(planMarshRoute,target);for(const direction of route){if(mobile)await press('[data-move="'+direction+'"]');else await page.keyboard.press('Arrow'+direction[0].toUpperCase()+direction.slice(1));const feet=await page.evaluate(marshFeet);assert.ok(feet.player,'player feet '+JSON.stringify(target));if(Array.isArray(target)&&target[1]===70&&target[0]>38){const p=await state();assert.ok(p.y>=63.5&&p.y<=77,'bridge crossing must not detour around ring');}assert.ok(feet.dog,'dog feet '+JSON.stringify(feet));for(const n of feet.npcs)assert.ok(n.walkable,'NPC feet '+JSON.stringify(n));feetChecks++;}assert.equal((await page.evaluate(planMarshRoute,target)).length,0,'native controls reach planned target');evidence.push({target,steps:route.length,...await state()});console.log('MARSH_ROUTE',width,height,JSON.stringify(target),route.length);return route.length;}
 const sourceDigests={};for(const file of ['index.html','mountain-region.js','world-life.js','sw.js',M.regions.mountainMarsh.asset]){const response=await context.request.get(new URL(file,url).href);assert.ok(response.ok(),'available '+file);sourceDigests[file]=digest(await response.body());assert.equal(sourceDigests[file],digest(fs.readFileSync(path.join(root,file))),'exact local source '+file);}
 await page.goto(url,{waitUntil:'load'});await start();await require('./browser-release.cjs').assertRelease(page);await page.waitForFunction(()=>window.__marshImages.some(i=>i.complete&&i.naturalWidth>0));const image=await page.evaluate(()=>window.__marshImages.filter(i=>i.complete&&i.naturalWidth).map(i=>({src:i.src,width:i.naturalWidth,height:i.naturalHeight})));assert.ok(image.some(i=>i.src.includes(M.regions.mountainMarsh.asset)));const before=await progress();await shot('arrival');
 const layout=await page.evaluate(()=>Object.fromEntries(['world','map','player','action'].map(id=>{const e=document.getElementById(id),r=e.getBoundingClientRect();return [id,{x:r.x,y:r.y,width:r.width,height:r.height,right:r.right,bottom:r.bottom,display:getComputedStyle(e).display,visibility:getComputedStyle(e).visibility}];})));
 for(const id of ['world','action']){const r=layout[id];assert.ok(r.width>0&&r.height>0&&r.x>=-1&&r.right<=width+1&&r.y>=-1&&r.bottom<=height+1,'visible '+id);}assert.ok(layout.map.width>=layout.world.width);assert.ok(layout.player.width>=12&&layout.player.height>=18);assert.notEqual(layout.player.display,'none');assert.equal(layout.player.visibility,'visible');
 for(const [name,p] of [['west-bank',[38,70]],['west-bridge',[52,70]],['terrace',[120,70]],['east-bridge',[208,70]],['east-bank',[221,70]]]){const steps=await walk(p);if(name==='east-bank')assert.ok(steps<=8,'direct bridge-to-bank crossing');await shot(name);}
 for(const p of [[208,70],[120,70],[52,70],[38,70]])await walk(p);await shot('west-bank-return');
 for(const p of marshRing)await walk(p);await shot('ring-complete');
 await walk('house');await press('#action');assert.equal(await page.locator('#worldHouse.open').count(),1);await shot('house');await press('#worldHouse [data-close]');
 for(const [bay,locale] of [['northFish','marsh-bridge-north'],['southFish','marsh-bridge-south'],['shoreFish','mountain-highMarsh']]){
  await walk(bay);assert.equal(await page.evaluate(()=>nearbyFishingSpot()?.mountainType),'highMarsh');
  await shot(bay+'-bank');await press('#action');assert.equal(await page.evaluate(()=>battle.phase),'prep');
  await press('#pull');
  await page.waitForFunction(id=>document.querySelector('.scenery-motion[data-for="castBackdrop"]').dataset.scene==='surface-'+id,locale);
  assert.equal(await page.locator('#castBackdrop').getAttribute('data-locale'),locale);
  const aim=await page.evaluate(()=>({near:castSurfacePoint(0),far:castSurfacePoint(100),feet:pixelCastModel.box.ground,origin:[battle.playerX,battle.playerY]}));
  for(const p of [aim.near,aim.far])assert.ok(p.x>0&&p.x<100&&p.y>0&&p.y<100,'cast aim in viewport');
  assert.equal(aim.far.y>aim.near.y,bay==='southFish','outward casting direction');
  await shot(bay+'-cast');
  // Freeze only the distance meter for the existing middle-depth regression.
  await page.evaluate(()=>{clearInterval(timer);timer=0;battle.cast=50;});
  await press('#pull');await page.waitForFunction(()=>battle.phase==='wait');
  assert.equal(await page.evaluate(()=>battle.spot),'mountain-highMarsh-mid');await shot(bay+'-landed');
  evidence.push({bay,locale,aim,fish:await page.evaluate(()=>battle.f.id)});await press('#wait');
 }
 const after=await progress();assert.equal(after.baits.worm,before.baits.worm-3);assert.equal(after.gameMinutes,before.gameMinutes+30);assert.equal(after.money,before.money);assert.deepEqual(after.caught,before.caught);
 await page.evaluate(()=>save());const saved=await state();await page.reload({waitUntil:'load'});await start();assert.deepEqual(await state(),saved);assert.deepEqual(await progress(),after);await shot('reload');
 for(const foot of [[224,72],[230,82],[236,82]]){
  await walk(foot);assert.match(await page.locator('#hint').innerText(),/湿地へ下る道.*Aで先へ進む/);
  assert.equal(await page.evaluate(()=>ShuMountain.exitAt(s.x,s.y,s.mapRegion)?.region),'wetland');
 }
 await shot('wetland-painted-exit');await press('#action');assert.equal((await state()).region,'wetland');await shot('wetland');await walk('return');await press('#action');assert.deepEqual(await state(),{region:'mountainMarsh',x:227,y:78,direction:'up'});await shot('wetland-return');await walk('return');await press('#action');assert.equal((await state()).region,'mountainPond');assert.deepEqual(await progress(),after);await shot('pond-return');await page.evaluate(()=>save());await page.reload({waitUntil:'load'});await start();assert.equal((await state()).region,'mountainPond');assert.deepEqual(await progress(),after);
 assert.deepEqual(errors,[]);assert.deepEqual(failures,[]);fs.writeFileSync(path.join(directory,`${width}x${height}-result.json`),JSON.stringify({screen,url,release:require('./browser-release.cjs').expectedRelease,sourceDigests,image,layout,evidence,feetChecks,wholeRing:true,bridgeWestToEast:true,bridgeEastToWest:true,shoreCast:true,house:true,terraceBays:true,reload:true,exits:true,errors,failures},null,2));console.log('MARSH_RETREAT_BROWSER_PASS',width,height,dpr);
 }finally{await context.close();await browser.close();}
}
const types={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.png':'image/png','.webp':'image/webp','.svg':'image/svg+xml','.mp3':'audio/mpeg','.wav':'audio/wav'};
const server=http.createServer((req,res)=>{if(req.url==='/favicon.ico'){res.writeHead(204);res.end();return;}try{const name=new URL(req.url,'http://localhost').pathname.replace(/^\/nushi-tsuri\//,'')||'index.html',file=path.resolve(root,name);if(!file.startsWith(root+path.sep)||!fs.statSync(file).isFile())throw Error('path');res.writeHead(200,{'Content-Type':types[path.extname(file)]||'application/octet-stream','Cache-Control':'no-store'});fs.createReadStream(file).pipe(res);}catch{res.writeHead(404);res.end();}});
(async()=>{fs.mkdirSync(directory,{recursive:true});await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(0,'127.0.0.1',resolve);});try{const url=process.env.MARSH_BASE_URL||`http://127.0.0.1:${server.address().port}/nushi-tsuri/`;for(const screen of screens)await run(url,screen);}finally{await new Promise(resolve=>server.close(resolve));}})().catch(e=>{console.error(e);process.exitCode=1;});
