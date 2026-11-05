const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),http=require('node:http');
const {chromium}=require('playwright'),{seed,saveKey}=require('./game-harness.cjs');
const {planRuralRoute}=require('./rural-canals-route.cjs');
const {createHash}=require('node:crypto'),R=require('../rural-canals.js');
const sourceFiles=['index.html','rural-canals.js','mountain-region.js','scene-layers.js','layered-scenery.js','sw.js',R.asset,'assets/rural-canal-cast-v252-48.webp','assets/rural-backwater-cast-v252-48.webp'];
const digest=data=>createHash('sha256').update(data).digest('hex');
const root=path.resolve(__dirname,'..'),directory=path.resolve(process.env.RURAL_EVIDENCE_DIR||'/tmp/rural-canals-evidence');
const screens=[{width:1280,height:720,mobile:false,dpr:1},{width:844,height:390,mobile:true,dpr:3},{width:820,height:366,mobile:true,dpr:1.875}];
async function run(url,screen){
 const {width,height,mobile,dpr}=screen,browser=await chromium.launch({headless:true,...(process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE?{executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE}:{})});
 const context=await browser.newContext({viewport:{width,height},isMobile:mobile,hasTouch:mobile,deviceScaleFactor:dpr,locale:'ja-JP',serviceWorkers:'block'}),errors=[],failures=[],evidence=[];
 try{
 await context.addInitScript(({key,state})=>{
  if(!localStorage.getItem(key))localStorage.setItem(key,JSON.stringify(state));
  localStorage.setItem('nushi-inugoya-options-v1',JSON.stringify({textSpeed:'instant'}));
  window.__paints={};
  for(const method of ['clearRect','fillRect','drawImage']){const original=CanvasRenderingContext2D.prototype[method];CanvasRenderingContext2D.prototype[method]=function(...args){const c=this.canvas,name=c.classList.contains('scenery-motion')?'motion:'+c.dataset.for:c.id;if(name){const key=name+':'+method;window.__paints[key]=(window.__paints[key]||0)+1;}return original.apply(this,args);};}
  window.__ruralImages=[];const src=Object.getOwnPropertyDescriptor(HTMLImageElement.prototype,'src');
  Object.defineProperty(HTMLImageElement.prototype,'src',{...src,set(value){if(String(value).includes('rural-canals-v'))window.__ruralImages.push(this);return src.set.call(this,value);}});
 },{key:saveKey,state:{...seed(),mapRegion:'village',x:210,y:43,hp:100,soundEnabled:false}});
 const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));page.on('response',r=>{if(r.status()>=400&&r.url().startsWith(url))failures.push(r.status()+' '+r.url());});page.on('requestfailed',r=>{if(r.url().startsWith(url))failures.push(r.failure()?.errorText+' '+r.url());});
 const press=q=>page.locator(q)[mobile?'tap':'click']();
 const state=()=>page.evaluate(()=>({region:s.mapRegion,x:s.x,y:s.y,direction:s.direction}));
 const progress=()=>page.evaluate(()=>JSON.parse(JSON.stringify({money:s.money,hp:s.hp,baits:s.baits,caught:s.caught,equipment:s.equipment,questCompletions:s.questCompletions,gameMinutes:s.gameMinutes})));
 const settleCamera=()=>page.evaluate(async()=>{await Promise.all(['map','player'].flatMap(id=>document.getElementById(id).getAnimations().filter(a=>a.effect.getComputedTiming().iterations!==Infinity).map(a=>a.finished.catch(()=>{}))));await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));});
 const surfaceReady=type=>page.waitForFunction(type=>{const c=document.querySelector('#castBackdrop'),motion=document.querySelector('.scenery-motion[data-for="castBackdrop"]');if(c.dataset.locale!=='mountain-'+type||c.style.backgroundImage!=='none'||motion?.dataset.scene!=='surface-mountain-'+type)return false;const data=c.getContext('2d').getImageData(0,0,c.width,c.height).data,colors=new Set();for(let i=0;i<data.length;i+=4*47)if(data[i+3])colors.add(data[i]+','+data[i+1]+','+data[i+2]);return colors.size>100;},type);
 const shot=async name=>{await settleCamera();await page.screenshot({path:path.join(directory,`${width}x${height}-${name}.png`)});};
 async function start(){await require('./browser-start-adventure.cjs')(page,mobile);if(await page.locator('#lakeIntroSkip').isVisible())await press('#lakeIntroSkip');}
 async function walk(target){const route=await page.evaluate(planRuralRoute,target);for(const d of route){if(mobile)await press('[data-move="'+d+'"]');else await page.keyboard.press('Arrow'+d[0].toUpperCase()+d.slice(1));assert.ok(await page.evaluate(()=>isWalkableWorld(s.x,s.y)),'walkable native step '+target);}evidence.push({target,steps:route.length,...await state()});}
 const sample=async()=>page.evaluate(async()=>{window.__paints={};await new Promise(r=>setTimeout(r,300));return window.__paints;});
 async function delayRuralImage(){let release,requested;const gate=new Promise(r=>release=r),seen=new Promise(r=>requested=r);await page.route('**/'+R.asset+'*',async route=>{requested();await gate;await route.continue();});return {release,seen};}
 const assertNoRegionalPaint=(counts,label)=>{for(const [name,count]of Object.entries(counts))if(/mountainPixels|rural/i.test(name))assert.equal(count,0,label+' '+name);};
 const waitForRuralImage=()=>page.waitForFunction(()=>window.__ruralImages.some(i=>i.complete&&i.naturalWidth>0));
 const initialImage=await delayRuralImage();
 const sourceDigests={};for(const file of sourceFiles){const response=await context.request.get(new URL(file,url).href);assert.ok(response.ok(),'source available '+file);const hash=digest(await response.body());assert.equal(hash,digest(fs.readFileSync(path.join(root,file))),'exact checkout source '+file);sourceDigests[file]=hash;}
 await page.goto(url,{waitUntil:'load'});await start();await require('./browser-release.cjs').assertRelease(page);const before=await progress();await walk('villageGate');await shot('entrance');await press('#action');assert.equal((await state()).region,'ruralCanals');
 await initialImage.seen;const arrivalBeforeImage=await state();await page.evaluate(()=>showFieldMenu());assert.equal(await page.evaluate(()=>fieldMenuIsOpen()),true);
 await page.evaluate(()=>{window.__paints={};});initialImage.release();await waitForRuralImage();await page.waitForTimeout(100);
 const delayedMenuPaints=await page.evaluate(()=>window.__paints);assertNoRegionalPaint(delayedMenuPaints,'initial image finishes under field menu without painting');
 await press('#fieldMenuClose');assert.deepEqual(await state(),arrivalBeforeImage,'menu dismissal paints without moving player');
 await page.waitForFunction(()=>{const c=document.querySelector('#mountainPixels'),d=c.getContext('2d').getImageData(0,0,c.width,c.height).data,colors=new Set();for(let i=0;i<d.length;i+=4*47)colors.add(d[i]+','+d[i+1]+','+d[i+2]);return colors.size>100;});
 assert.ok(await page.evaluate(()=>window.__paints['mountainPixels:drawImage']>0),'menu close performs a real image paint');await shot('arrival');await page.unroute('**/'+R.asset+'*');
 const layout=await page.evaluate(()=>{const ids=['world','map','player','action'];return Object.fromEntries(ids.map(id=>{const e=document.getElementById(id),r=e.getBoundingClientRect();return [id,{x:r.x,y:r.y,width:r.width,height:r.height,right:r.right,bottom:r.bottom,display:getComputedStyle(e).display,visibility:getComputedStyle(e).visibility,opacity:getComputedStyle(e).opacity}];}));});
 for(const id of ['world','action']){assert.ok(layout[id].width>0&&layout[id].height>0);assert.ok(layout[id].x>=-1&&layout[id].right<=width+1&&layout[id].y>=-1&&layout[id].bottom<=height+1,'visible '+id);}
 assert.ok(layout.map.width>=layout.world.width,'map is the scrolling world, not the viewport');
 assert.ok(layout.player.width>=12&&layout.player.height>=18,'player remains readable');assert.notEqual(layout.player.display,'none');assert.equal(layout.player.visibility,'visible');assert.ok(Number(layout.player.opacity)>.5);
 assert.ok(layout.player.x>=layout.world.x-1&&layout.player.right<=layout.world.right+1&&layout.player.y>=layout.world.y-1&&layout.player.bottom<=layout.world.bottom+1,'settled player is visible inside world viewport');
 await walk('bridge');await shot('bridge');
 for(const type of ['canalCurrent','canalBackwater']){
  await walk(type);assert.equal(await page.evaluate(()=>nearbyFishingSpot()?.mountainType),type);await shot(type+'-bank');await press('#action');assert.equal(await page.evaluate(()=>battle.phase),'prep');
  await page.evaluate(()=>{beginFishing();clearInterval(timer);timer=0;});await surfaceReady(type);await shot(type+'-cast');
  await page.evaluate(()=>{battle.cast=50;launchSurfaceCast();settleSurfaceCast();clearInterval(timer);timer=0;});assert.equal(await page.evaluate(()=>battle.spot),'mountain-'+type+'-mid');
  evidence.push({spot:await page.evaluate(()=>battle.spot),fish:await page.evaluate(()=>battle.f.id)});
  await page.evaluate(()=>{endBattle();});
 }
 const afterFishing=await progress();assert.equal(afterFishing.baits.worm,before.baits.worm-2);assert.equal(afterFishing.gameMinutes,before.gameMinutes+20);assert.equal(afterFishing.money,before.money);assert.deepEqual(afterFishing.caught,before.caught);
 await page.evaluate(()=>save());const saved=await state();await page.reload({waitUntil:'load'});await start();assert.deepEqual(await state(),saved);assert.deepEqual(await progress(),afterFishing);await shot('reload');
 const visible=await sample();await page.evaluate(()=>openOptions());await page.waitForTimeout(150);const menu=await sample();await shot('menu');
 for(const [name,count]of Object.entries(menu))if(/mountainPixels|rural/i.test(name))assert.equal(count,0,'covered region pauses '+name);
 await press('#optionsClose');await page.evaluate(()=>{Object.defineProperty(document,'hidden',{configurable:true,value:true});document.dispatchEvent(new Event('visibilitychange'));});const hidden=await sample();
 for(const [name,count]of Object.entries(hidden))if(/mountainPixels|rural/i.test(name))assert.equal(count,0,'hidden region pauses '+name);
 await page.evaluate(()=>{Object.defineProperty(document,'hidden',{configurable:true,value:false});document.dispatchEvent(new Event('visibilitychange'));});const resumed=await sample();
 await walk('return');await press('#action');assert.equal((await state()).region,'village');assert.deepEqual(await progress(),afterFishing);await shot('return');await page.evaluate(()=>save());await page.reload({waitUntil:'load'});await start();assert.equal((await state()).region,'village');assert.deepEqual(await progress(),afterFishing);
 // A second cold load returns to the village before its delayed regional image arrives.
 const staleImage=await delayRuralImage();await page.reload({waitUntil:'load'});await start();await walk('villageGate');await press('#action');await staleImage.seen;assert.equal((await state()).region,'ruralCanals');await press('#action');assert.equal((await state()).region,'village');
 await page.evaluate(()=>{window.__paints={};});staleImage.release();await waitForRuralImage();await page.waitForTimeout(100);const staleVillagePaints=await page.evaluate(()=>window.__paints);assertNoRegionalPaint(staleVillagePaints,'late regional image must not repaint hidden canvas in village');await page.unroute('**/'+R.asset+'*');
 assert.deepEqual(errors,[]);assert.deepEqual(failures,[]);const result={screen,url,sourceDigests,layout,evidence,paintCounts:{visible,menu,hidden,resumed,delayedMenuPaints,staleVillagePaints},delayedFirstImage:true,areaReload:true,returnReload:true,legacyProgress:true,errors,failures};fs.writeFileSync(path.join(directory,`${width}x${height}-result.json`),JSON.stringify(result,null,2));console.log('RURAL_CANALS_BROWSER_PASS',width,height,dpr);
 }finally{await context.close();await browser.close();}
}
const types={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.png':'image/png','.webp':'image/webp','.svg':'image/svg+xml','.mp3':'audio/mpeg','.wav':'audio/wav'};
const server=http.createServer((req,res)=>{try{const name=new URL(req.url,'http://localhost').pathname.replace(/^\/nushi-tsuri\//,'')||'index.html',file=path.resolve(root,name);if(!file.startsWith(root+path.sep)||!fs.statSync(file).isFile())throw Error('path');res.writeHead(200,{'Content-Type':types[path.extname(file)]||'application/octet-stream','Cache-Control':'no-store'});fs.createReadStream(file).pipe(res);}catch{res.writeHead(404);res.end();}});
(async()=>{fs.mkdirSync(directory,{recursive:true});await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(0,'127.0.0.1',resolve);});try{const url=process.env.RURAL_BASE_URL||`http://127.0.0.1:${server.address().port}/nushi-tsuri/`;for(const screen of screens)await run(url,screen);}finally{await new Promise(resolve=>server.close(resolve));}})().catch(e=>{console.error(e);process.exitCode=1;});
