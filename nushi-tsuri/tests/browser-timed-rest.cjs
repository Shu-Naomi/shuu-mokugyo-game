// Browser regression and visual evidence for the one-shot selected-time rest.
const {chromium}=require('playwright'),http=require('node:http'),fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..'),dir=path.join(__dirname,'opening-review','rest');
async function run(url){
 fs.mkdirSync(dir,{recursive:true});
 const browser=await chromium.launch({headless:true,...(process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE?{executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE}:{})});const results=[];
 try{for(const [width,height,dog]of [[844,390,'shuu'],[820,366,'riku'],[390,844,'grey']]){
  const errors=[],httpErrors=[],context=await browser.newContext({viewport:{width,height},isMobile:true,hasTouch:true,serviceWorkers:'block'}),page=await context.newPage();
  page.on('pageerror',e=>errors.push(e.message));page.on('response',r=>{if(r.status()>=400&&r.url().includes('/nushi-tsuri/'))httpErrors.push(`${r.status()} ${r.url()}`);});
  const tap=q=>page.locator(q).tap(),shot=name=>page.screenshot({path:path.join(dir,`${width}-${name}.png`),animations:'disabled'});
  const state=()=>page.evaluate(()=>({clock:s.gameMinutes,hp:s.hp,money:s.money,baits:s.baits,x:s.x,y:s.y}));
  const fit=async()=>{for(const selector of ['#timedRestTitle','#timedRestTime','#timedRestStart','#timedRestCancel']){const box=await page.locator(selector).boundingBox();assert.ok(box&&box.x>=0&&box.y>=0&&box.x+box.width<=width+1&&box.y+box.height<=height+1,`${selector} clipped: ${JSON.stringify(box)}`);if(selector!=='#timedRestTitle')assert.ok(box.height>=44);}};
  try{
   await page.clock.install({time:new Date('2026-11-04T00:00:00Z')});await page.clock.pauseAt('2026-11-04T00:00:01Z');await page.goto(url,{waitUntil:'load'});
   await require('./browser-start-adventure.cjs')(page,true,{slot:1,avatar:'girl',dog,name:'旅人'});await tap('#lakeIntroSkip');
   await page.evaluate(async()=>{await Promise.all(['assets/interior-fishing-inn-v55.png','assets/dog-idles.png'].map(src=>{const im=new Image();im.src=src;return im.decode();}));s.gameMinutes=500;s.hp=37;save();openLocationInterior('farmhouse');});
   await tap('#locationTimedRest');await fit();await page.locator('#timedRestTime').fill('');assert.equal(await page.locator('#timedRestStart').isDisabled(),true);await page.locator('#timedRestTime').fill('12:30');await shot('inn-chooser');
   await tap('#timedRestCancel');assert.equal(await page.evaluate(()=>s.gameMinutes),500);assert.equal(await page.locator('#locationInterior.open').count(),1);
   await tap('#locationTimedRest');await page.locator('#timedRestTime').fill('12:30');await tap('#timedRestStart');await page.evaluate(()=>{window.lastRest=timedRestPresentation;beginTimedRest();beginTimedRest();});await page.clock.runFor(400);await shot('inn-shoji-light');await tap('#timedRestFilm');
   assert.equal(await page.evaluate(()=>s.gameMinutes),750);assert.equal(await page.evaluate(()=>s.hp),100);assert.equal(await page.locator('#timedRest.open').count(),0);assert.equal(await page.evaluate(()=>lastRest.snapshot().active),false);await page.clock.runFor(1500);assert.equal(await page.evaluate(()=>s.gameMinutes),750);
   const point=await page.evaluate(()=>{s.mapRegion='village';s.tournament=null;for(let x=1;x<240;x+=2)for(let y=1;y<135;y+=2){s.x=x;s.y=y;if(isWalkableWorld(x,y)&&canCampAtLake()){render();return{x,y};}}return null;});assert.ok(point);
   await tap('#menu');await tap('#lakeCampMenu');await fit();await page.locator('#timedRestTime').fill('05:00');await shot('camp-chooser');const before=await state();
   await tap('#timedRestStart');await page.evaluate(()=>{window.lastRest=timedRestPresentation;beginTimedRest();});await page.clock.runFor(400);await shot('camp-dog-lantern');await page.clock.runFor(700);
   assert.equal(await page.locator('#timedRest.open').count(),0);assert.equal(await page.evaluate(()=>s.gameMinutes),1740);const after=await state();assert.deepEqual({...after,clock:before.clock},before);assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('nushi-inugoya-v2')).gameMinutes),1740);
   // Close/navigation and simulated background lifecycle must cancel all later draws.
   for(const reason of ['close','pagehide','hidden']){
    await tap('#menu');await tap('#lakeCampMenu');await tap('#timedRestStart');await page.evaluate(reason=>{window.lastRest=timedRestPresentation;if(reason==='close')close();else if(reason==='pagehide')window.dispatchEvent(new Event('pagehide'));else{Object.defineProperty(document,'hidden',{configurable:true,value:true});document.dispatchEvent(new Event('visibilitychange'));}},reason);
    const stopped=await page.evaluate(()=>({clock:s.gameMinutes,...lastRest.snapshot()}));assert.equal(stopped.active,false);assert.equal(stopped.scheduled,false);assert.equal(await page.locator('#timedRest.open').count(),0);await page.clock.runFor(1500);assert.deepEqual(await page.evaluate(()=>({clock:s.gameMinutes,...lastRest.snapshot()})),stopped);if(reason==='hidden')await page.evaluate(()=>{delete document.hidden;document.dispatchEvent(new Event('visibilitychange'));});
   }
   await page.emulateMedia({reducedMotion:'reduce'});await tap('#menu');await tap('#lakeCampMenu');await tap('#timedRestStart');assert.equal(await page.locator('#timedRest.open').count(),0);assert.equal(await page.evaluate(()=>timedRestPresentation),null);
   // Reload must retain the committed clock, never replay or advance the rest.
   const saved=await page.evaluate(()=>s.gameMinutes);await page.reload({waitUntil:'load'});await require('./browser-start-adventure.cjs')(page,true,{slot:1,isNew:false});assert.equal(await page.evaluate(()=>s.gameMinutes),saved);assert.equal(await page.locator('#timedRest.open').count(),0);
   assert.deepEqual(errors,[]);assert.deepEqual(httpErrors,[]);results.push({width,height,dog,point,tapSkip:true,repeatedCommit:true,oneSecondAutoReturn:true,cancel:true,close:true,pagehide:true,simulatedHidden:true,reducedMotion:true,reload:true,errors,httpErrors});console.log('TIMED_REST_PASS '+JSON.stringify(results.at(-1)));
  }catch(error){await shot('failure').catch(()=>{});throw error;}finally{await context.close();}
 }}finally{await browser.close();fs.writeFileSync(path.join(dir,'results.json'),JSON.stringify(results,null,2));}
}
module.exports=run;
if(require.main===module){const types={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.png':'image/png','.webp':'image/webp','.svg':'image/svg+xml'};const server=http.createServer((req,res)=>{try{const p=new URL(req.url,'http://localhost').pathname.replace(/^\/nushi-tsuri\//,'')||'index.html',f=path.resolve(root,p);if(!f.startsWith(root+path.sep)||!fs.statSync(f).isFile())throw Error('path');res.writeHead(200,{'Content-Type':types[path.extname(f)]||'application/octet-stream'});fs.createReadStream(f).pipe(res);}catch{res.writeHead(404);res.end();}});(async()=>{await new Promise(r=>server.listen(0,'127.0.0.1',r));try{await run(`http://127.0.0.1:${server.address().port}/nushi-tsuri/`);}finally{await new Promise(r=>server.close(r));}})().catch(e=>{console.error(e);process.exitCode=1;});}
