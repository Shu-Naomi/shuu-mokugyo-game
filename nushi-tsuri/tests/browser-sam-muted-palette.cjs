// Actual Chromium screenshots. The game is unmodified; the opt-in experiment
// changes Canvas colors only between a before/after/restored capture.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),http=require('node:http');
const {createHash}=require('node:crypto'),{execFileSync}=require('node:child_process');
const {chromium}=require('playwright'),{createCanvas,loadImage}=require('@napi-rs/canvas');
const {seed,saveKey}=require('./game-harness.cjs'),enter=require('./browser-start-adventure.cjs');
const root=path.resolve(__dirname,'..'),output=path.join(__dirname,'browser-evidence-sam-muted-palette');
const sha=b=>createHash('sha256').update(b).digest('hex');
const screens=[{width:844,height:390,dpr:1},{width:820,height:366,dpr:1.875},{width:640,height:360,dpr:1}];
const types={'.html':'text/html; charset=utf-8','.js':'text/javascript','.cjs':'text/javascript','.css':'text/css','.png':'image/png','.webp':'image/webp','.jpg':'image/jpeg','.svg':'image/svg+xml','.mp3':'audio/mpeg'};
const server=http.createServer((req,res)=>{try{
 const file=path.resolve(root,decodeURIComponent(new URL(req.url,'http://localhost').pathname).replace(/^\/nushi-tsuri\//,'')||'index.html');
 assert.ok(file.startsWith(root+path.sep)&&fs.statSync(file).isFile());res.writeHead(200,{'Content-Type':types[path.extname(file)]||'application/octet-stream','Cache-Control':'no-store'});fs.createReadStream(file).pipe(res);
}catch{res.writeHead(404);res.end();}});
async function pair(before,after,file){
 const images=await Promise.all([before,after].map(loadImage)),[a,b]=images;assert.equal(a.width,b.width);assert.equal(a.height,b.height);
 const c=createCanvas(a.width*2,a.height+32),ctx=c.getContext('2d');ctx.fillStyle='#172127';ctx.fillRect(0,0,c.width,c.height);ctx.fillStyle='white';ctx.font='16px sans-serif';
 ctx.fillText('ORIGINAL · same position / scale',8,22);ctx.fillText('PILOT · only Sam area / no zoom',a.width+8,22);
 ctx.imageSmoothingEnabled=false;ctx.drawImage(a,0,32);ctx.drawImage(b,a.width,32);fs.writeFileSync(file,c.toBuffer('image/png'));
}
async function run(screen,url,browser){
 const id=`${screen.width}x${screen.height}-dpr${screen.dpr}`,dir=path.join(output,id);fs.mkdirSync(dir,{recursive:true});
 const context=await browser.newContext({viewport:{width:screen.width,height:screen.height},deviceScaleFactor:screen.dpr,isMobile:true,hasTouch:true,locale:'ja-JP',serviceWorkers:'block'});
 await context.addInitScript(({key,initial})=>{if(!localStorage.getItem(key))localStorage.setItem(key,JSON.stringify(initial));localStorage.setItem('nushi-inugoya-options-v1',JSON.stringify({textSpeed:'instant'}));Math.random=()=>.999999;},{key:saveKey,initial:{...seed(),x:175,y:84,direction:'right',hp:100,money:10000,gameMinutes:600,soundEnabled:false,practiceTutorialComplete:true}});
 const page=await context.newPage(),result={screen,browser:browser.version(),device:'Chromium touch/viewport emulation, not a physical phone',pairs:[],errors:[],failed:[],route:[]};
 page.on('pageerror',e=>result.errors.push(e.message));page.on('response',r=>{if(r.status()>=400)result.failed.push(r.status()+' '+new URL(r.url()).pathname);});
 const persist=()=>fs.writeFileSync(path.join(dir,'result.json'),JSON.stringify(result,null,2));
 const press=s=>page.locator(s).tap();
 async function start(){await enter(page,true);await page.clock.runFor(240);if(await page.locator('#lakeIntroSkip').isVisible()){await press('#lakeIntroSkip');await page.clock.runFor(240);}await page.waitForFunction(()=>document.querySelector('#worldPixels').style.backgroundImage==='none');}
 const state=()=>page.evaluate(()=>({x:s.x,y:s.y,direction:s.direction}));
 const progress=()=>page.evaluate(()=>JSON.stringify({money:s.money,hp:s.hp,time:s.gameMinutes,caught:s.caught,baits:s.baits,equipment:s.equipment,pet:s.petLife,story:s.lakeStory,quests:s.questCompletions,records:s.fishCatchRecords}));
 async function metrics(){return page.evaluate(()=>{
  const rect=n=>{const b=n.getBoundingClientRect();return {x:b.x,y:b.y,width:b.width,height:b.height};};
  const canvas=document.querySelector('#worldPixels'),c=canvas.getContext('2d'),r=rect(canvas),map=document.querySelector('#map');
  return {state:{x:s.x,y:s.y,direction:s.direction},canvas:{width:canvas.width,height:canvas.height,imageSmoothingEnabled:c.imageSmoothingEnabled},map:rect(map),transform:getComputedStyle(map).transform,player:rect(document.querySelector('#player')),imageRendering:getComputedStyle(canvas).imageRendering,physicalScale:{x:r.width*devicePixelRatio/canvas.width,y:r.height*devicePixelRatio/canvas.height},dpr:devicePixelRatio};
 });}
 async function capture(name){
  await page.clock.runFor(750);await page.waitForTimeout(750);
  await page.evaluate(async()=>{await document.fonts.ready;for(const a of document.getAnimations()){if(a.effect?.getTiming().iterations===Infinity){a.pause();a.currentTime=0;}else a.finish();}});
  await page.addScriptTag({path:path.join(__dirname,'sam-muted-palette-pilot.cjs')});
  const geometry=await metrics(),saved=await progress();
  await page.evaluate(()=>{window.pilotOriginalLayers=[...document.querySelectorAll('#worldPixels, canvas.scenery-motion[data-for="worldPixels"], canvas.scenery-foreground[data-for="worldPixels"]')].map(c=>({canvas:c,bytes:c.getContext('2d').getImageData(0,0,c.width,c.height).data}));});
  const before=await page.screenshot({path:path.join(dir,name+'-original.png'),scale:'device',animations:'allow'});
  const stats=await page.evaluate(()=>{window.pilot=SamMutedPalettePilot.install(document);return pilot.summary;});
  assert.deepEqual(await metrics(),geometry,'camera, scale, player and CSS cannot move');assert.equal(await progress(),saved);
  const after=await page.screenshot({path:path.join(dir,name+'-pilot.png'),scale:'device',animations:'allow'});
  assert.notDeepEqual(after,before,'pilot must visibly change the rendered scene');
  await page.evaluate(()=>pilot.restore());
  const restoredPixels=await page.evaluate(()=>pilotOriginalLayers.every(({canvas,bytes})=>{const now=canvas.getContext('2d').getImageData(0,0,canvas.width,canvas.height).data;return bytes.every((v,i)=>v===now[i]);}));
  assert.equal(restoredPixels,true,'every canvas restores byte-for-byte');
  const restored=await page.screenshot({path:path.join(dir,name+'-restored.png'),scale:'device',animations:'allow'});
  const entry={name,geometry,stats,sourcePixelsRestored:restoredPixels,fullScreenshotRestored:before.equals(restored),hashes:{original:sha(before),pilot:sha(after),restored:sha(restored)}};
  result.pairs.push(entry);persist();
  await pair(before,after,path.join(dir,name+'-comparison.png'));
  assert.deepEqual(restored,before,'full screenshot exact restoration, no mask or tolerance');
 }
 async function walk(target){
  const directions=await page.evaluate(target=>{const queue=[{x:s.x,y:s.y,d:s.direction,path:[]}],seen=new Set();for(let i=0;i<queue.length;i++){const p=queue[i];if(Math.hypot(p.x-target.x,p.y-target.y)<=2&&p.d===target.direction)return p.path;for(const d of ['up','right','down','left']){const n={...ShuWorldLife.moveTarget(p.x,p.y,d,4,isWalkableWorld),d},key=n.x+','+n.y+','+d;if(!seen.has(key)){seen.add(key);queue.push({...n,path:[...p.path,d]});}}}throw Error('No route');},target);
  for(const direction of directions){const expected=await page.evaluate(d=>ShuWorldLife.moveTarget(s.x,s.y,d,4,isWalkableWorld),direction);await press('[data-move="'+direction+'"]');await page.clock.runFor(50);const actual=await state();assert.equal(actual.x,expected.x);assert.equal(actual.y,expected.y);result.route.push(direction);}
 }
 try{
  await page.clock.install({time:new Date('2026-11-09T04:00:00Z')});await page.clock.pauseAt('2026-11-09T04:00:01Z');await page.goto(url,{waitUntil:'domcontentloaded'});await start();
  await capture('sam-approach');await walk({x:197,y:91,direction:'up'});await capture('sam-door');
  assert.equal(await page.evaluate(()=>isAtSamShopEntrance()),true);
  const at=await state(),saved=await progress();
  for(let i=0;i<3;i++){await press('#action');await page.locator('#store.open').waitFor();await press('#store [data-close]');assert.deepEqual(await state(),at);assert.equal(await progress(),saved);}
  // Check the actual normalized save against reload; user save data is never read.
  await page.evaluate(()=>save());await page.reload({waitUntil:'domcontentloaded'});await start();assert.deepEqual(await state(),at);assert.equal(await progress(),saved);
  result.interactions={realTouchRoute:true,shopOpenClose:3,saveReload:true,progressPreserved:true};
  assert.deepEqual(result.errors,[]);assert.deepEqual(result.failed,[]);result.status='passed';console.log('SAM_MUTED_PALETTE_PASS '+JSON.stringify({id,pairs:result.pairs.length,routeSteps:result.route.length,interactions:result.interactions}));
 }catch(error){result.status='failed';result.error=error.stack;await page.screenshot({path:path.join(dir,'failure.png')}).catch(()=>{});throw error;}finally{persist();await context.close();}
}
(async()=>{
 fs.mkdirSync(output,{recursive:true});
 const baseline=execFileSync('git',['rev-parse','HEAD'],{cwd:root,encoding:'utf8'}).trim();
 fs.writeFileSync(path.join(output,'provenance.json'),JSON.stringify({head:baseline,pilotOnly:true,productionAssetsReplaced:false,physicalPhone:false},null,2));
 await new Promise(r=>server.listen(0,'127.0.0.1',r));const browser=await chromium.launch({headless:true});
 let failures=0;
 try{for(const screen of screens){try{await run(screen,'http://127.0.0.1:'+server.address().port+'/nushi-tsuri/',browser);}catch(e){failures++;console.error(e);}}}finally{await browser.close();await new Promise(r=>server.close(r));}
 if(failures)process.exitCode=1;
})().catch(e=>{console.error(e);server.close();process.exitCode=1;});
