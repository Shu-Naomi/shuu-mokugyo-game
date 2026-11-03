const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),http=require('node:http');
const {chromium}=require('playwright');
const {seed,saveKey}=require('./game-harness.cjs');
const root=path.resolve(__dirname,'..'),directory=path.resolve(process.env.HOOK_EVIDENCE_DIR||'/tmp/hook-evidence');
const screens=[{width:1280,height:720,mobile:false,dpr:1},{width:844,height:390,mobile:true,dpr:3}];
async function run(url,screen){
 const {width,height,mobile,dpr}=screen,browser=await chromium.launch({headless:true,...(process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE?{executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE}:{})});
 const context=await browser.newContext({viewport:{width,height},isMobile:mobile,hasTouch:mobile,deviceScaleFactor:dpr,locale:'ja-JP',serviceWorkers:'block'});
 const errors=[],failures=[];
 try{
 await context.addInitScript(({key,state})=>localStorage.setItem(key,JSON.stringify(state)),{key:saveKey,state:{...seed(),mapRegion:'stream',x:168,y:69,direction:'up',soundEnabled:false}});
 const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));page.on('response',r=>{if(r.status()>=400&&r.url().startsWith(url))failures.push(r.url());});
 await page.goto(url,{waitUntil:'load'});await require('./browser-start-adventure.cjs')(page,mobile);
 await page.evaluate(()=>{
   s.fightMode='nushi';cast();beginFishing();battle.cast=50;launchSurfaceCast();settleSurfaceCast();startFight();clearInterval(timer);
   battle.mood=fightProfiles[battle.f.id].moods.find(m=>m.calm);
   battle.nextMood=ShuFishing.beginWindow(battle,battle.mood,520,Date.now());drawBattle();
 });
 for(const [label,wear] of [['stable',0],['loose',.4],['danger',.8]]){
   await page.evaluate(wear=>{battle.nushiHookWear=wear;syncNushiFightCue();},wear);
   const cue=await page.locator('#battleMsg').textContent();
   assert.ok(cue.includes('針：'+({stable:'安定',loose:'緩みかけ',danger:'危険'}[label])));
   await page.screenshot({path:path.join(directory,width+'x'+height+'-'+label+'.png')});
 }
 await page.evaluate(()=>{battle.nushiHookLost=true;breakFishingLine('ピンッ……針が外れた！');stopBattleFishArt();});
 assert.match(await page.locator('#fishEscapeCaption').textContent(),/針が外れた/);
 await page.screenshot({path:path.join(directory,width+'x'+height+'-hook-escape.png')});
 assert.deepEqual(errors,[]);assert.deepEqual(failures,[]);
 fs.writeFileSync(path.join(directory,width+'x'+height+'-result.json'),JSON.stringify({screen,errors,failures},null,2));
 console.log('HOOK_BROWSER_PASS',width,height);
 }finally{await context.close();await browser.close();}
}
const types = {'.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.png': 'image/png', '.webp': 'image/webp', '.svg': 'image/svg+xml', '.mp3': 'audio/mpeg', '.wav': 'audio/wav'};
const server = http.createServer((req, res) => {
  try {
    const name = new URL(req.url, 'http://localhost').pathname.replace(/^\/nushi-tsuri\//, '') || 'index.html';
    const file = path.resolve(root, name);
    if (!file.startsWith(root + path.sep) || !fs.statSync(file).isFile()) throw Error('path');
    res.writeHead(200, {'Content-Type': types[path.extname(file)] || 'application/octet-stream', 'Cache-Control': 'no-store'});
    fs.createReadStream(file).pipe(res);
  } catch {res.writeHead(404); res.end();}
});
(async () => {
  fs.mkdirSync(directory, {recursive: true});
  await new Promise((resolve, reject) => {server.once('error', reject); server.listen(0, '127.0.0.1', resolve);});
  try {for (const screen of screens) await run(`http://127.0.0.1:${server.address().port}/nushi-tsuri/`, screen);}
  finally {await new Promise(resolve => server.close(resolve));}
})().catch(error => {console.error(error); process.exitCode = 1;});
