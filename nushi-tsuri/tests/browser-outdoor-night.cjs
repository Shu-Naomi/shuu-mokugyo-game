// Real generated production page + native Canvas, not a composited mock viewport.
const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),assert=require('node:assert/strict');
const {createHash}=require('node:crypto'),{chromium}=require('playwright'),{seed,saveKey}=require('./game-harness.cjs');
const M=require('../mountain-region.js'),R=require('../rural-canals.js'),O=require('../offshore-island.js');
const root=path.resolve(__dirname,'..'),dir=path.resolve(process.env.RURAL_EVIDENCE_DIR||'/tmp/rural-canals-evidence','outdoor-night');
const types={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.png':'image/png','.webp':'image/webp','.svg':'image/svg+xml','.mp3':'audio/mpeg','.wav':'audio/wav'};
const server=http.createServer((req,res)=>{try{const name=new URL(req.url,'http://localhost').pathname.replace(/^\/nushi-tsuri\//,'')||'index.html',file=path.resolve(root,name);if(!file.startsWith(root+path.sep)||!fs.statSync(file).isFile())throw Error('path');res.writeHead(200,{'Content-Type':types[path.extname(file)]||'application/octet-stream','Cache-Control':'no-store'});fs.createReadStream(file).pipe(res);}catch{res.writeHead(404);res.end();}});
const digest=b=>createHash('sha256').update(b).digest('hex');
(async()=>{
 fs.mkdirSync(dir,{recursive:true});await new Promise(r=>server.listen(0,'127.0.0.1',r));
 const url=`http://127.0.0.1:${server.address().port}/nushi-tsuri/`,browser=await chromium.launch({headless:true}),results=[];
 try{
  const places=[...Object.entries(M.regions).map(([id,data])=>({id,...data.entry,canvas:'mountainPixels'})),{id:'coast',x:146,y:70,canvas:'coastPixels'},{id:'offshore',...O.entry,canvas:'offshorePixels'}];
  for(const place of places){
   const context=await browser.newContext({viewport:{width:844,height:390},deviceScaleFactor:2,isMobile:true,hasTouch:true,locale:'ja-JP',serviceWorkers:'block'}),page=await context.newPage(),errors=[];
   page.on('pageerror',e=>errors.push(e.message));
   await context.addInitScript(({key,saved})=>{localStorage.setItem(key,JSON.stringify(saved));localStorage.setItem('nushi-inugoya-options-v1',JSON.stringify({textSpeed:'instant'}));},{key:saveKey,saved:{...seed(),mapRegion:place.id,x:place.x,y:place.y,direction:'up',hp:100,gameMinutes:720,soundEnabled:false}});
   try{
    await page.goto(url);await require('./browser-start-adventure.cjs')(page,true);if(await page.locator('#lakeIntroSkip').isVisible())await page.locator('#lakeIntroSkip').tap();
    await require('./browser-release.cjs').assertRelease(page);
    assert.equal(await page.evaluate(()=>s.mapRegion),place.id);
    const stats=()=>page.evaluate(id=>{const c=document.getElementById(id),d=c.getContext('2d').getImageData(0,0,c.width,c.height).data,sums=[0,0,0],colors=new Set();for(let i=0;i<d.length;i+=4){for(let k=0;k<3;k++)sums[k]+=d[i+k];if(i%188===0)colors.add(d[i]+','+d[i+1]+','+d[i+2]);}return {mean:sums.map(n=>n/(d.length/4)),colors:colors.size,period:gameSceneryEnvironment().period,clock:document.querySelector('#time').textContent};},place.canvas);
    await page.waitForFunction(id=>{const c=document.getElementById(id),d=c.getContext('2d').getImageData(0,0,c.width,c.height).data,colors=new Set();for(let i=0;i<d.length;i+=188)colors.add(d[i]+','+d[i+1]+','+d[i+2]);return colors.size>300;},place.canvas);
    if(place.canvas==='mountainPixels')await page.waitForFunction(id=>pixelSceneCache.get(document.getElementById('mountainPixels'))?.startsWith(id+':'),place.id);
    if(place.id===R.id){
     // Native move buttons from a valid saved bridge approach into the visible path.
     await page.evaluate(()=>{s.x=171;s.y=72;s.direction='left';render();});
     assert.ok(await page.evaluate(()=>isWalkableWorld(s.x,s.y)));
    }
    const settle=()=>page.evaluate(async()=>{await Promise.all(document.getElementById('map').getAnimations().filter(a=>a.effect.getComputedTiming().iterations!==Infinity).map(a=>a.finished.catch(()=>{})));await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));});
    await settle();const day=await stats();assert.equal(day.period,'day');await page.screenshot({path:path.join(dir,place.id+'-day.png')});
    // Actual game clock advancement and render entry point, not painter-only injection.
    await page.evaluate(()=>{advanceGameTime(s,790);render();});await settle();const night=await stats();assert.equal(night.period,'night');assert.ok(night.clock.includes('01:10'));
    if(place.id==='cave')assert.deepEqual(night.mean,day.mean);else for(let k=0;k<3;k++)assert.ok(Math.abs(night.mean[k]/day.mean[k]-[.38,.49,.72][k])<.025,place.id+' channel '+k);
    await page.screenshot({path:path.join(dir,place.id+'-night.png')});
    const untouched=await page.evaluate(()=>['world','map','action','castBackdrop','time'].map(id=>({id,filter:getComputedStyle(document.getElementById(id)).filter})));
    for(const item of untouched)assert.equal(item.filter,'none','map-only grade, no DOM ancestor tint '+item.id);
    if(place.id===R.id){
     const before=await page.evaluate(()=>({x:s.x,y:s.y}));await page.locator('[data-move="right"]').tap();assert.notDeepEqual(await page.evaluate(()=>({x:s.x,y:s.y})),before,'movement still works at night');
     await page.evaluate(()=>{save();});await page.reload();await require('./browser-start-adventure.cjs')(page,true);assert.equal(await page.evaluate(()=>s.mapRegion),R.id);assert.equal(await page.evaluate(()=>gameSceneryEnvironment().period),'night');
     // Transition uses the same real A handler as the player, without advancing time.
     await page.evaluate(()=>{s.x=ShuRural.returnGate.left+1;s.y=ShuRural.returnGate.top+1;render();});await page.locator('#action').tap();assert.equal(await page.evaluate(()=>s.mapRegion),'village');assert.equal(await page.evaluate(()=>gameSceneryEnvironment().period),'night');
     await page.evaluate(()=>{s.x=ShuRural.villageGate.left+1;s.y=(ShuRural.villageGate.top+ShuRural.villageGate.bottom)/2;render();});await page.locator('#action').tap();assert.equal(await page.evaluate(()=>s.mapRegion),R.id);assert.equal(await page.evaluate(()=>gameSceneryEnvironment().period),'night');
     await page.evaluate(()=>{advanceGameTime(s,170);render();});await settle();assert.equal((await stats()).period,'dawn');await page.screenshot({path:path.join(dir,'ruralCanals-dawn.png')});
    }
    assert.deepEqual(errors,[]);results.push({place:place.id,day,night,untouched,errors});
   }finally{await context.close();}
  }
  const sourceFiles=['index.html','outdoor-light.js','mountain-region.js','coast-voyage.js','offshore-island.js','rural-canals.js',R.data.shadowRepair.asset];
  const sourceDigests=Object.fromEntries(sourceFiles.map(name=>[name,digest(fs.readFileSync(path.join(root,name)))]));
  fs.writeFileSync(path.join(dir,'results.json'),JSON.stringify({sourceDigests,viewport:{width:844,height:390,dpr:2},results},null,2));console.log('OUTDOOR_NIGHT_BROWSER_PASS',results.length,'maps');
 }finally{await browser.close();await new Promise(r=>server.close(r));}
})().catch(e=>{console.error(e);process.exitCode=1;server.close();});
