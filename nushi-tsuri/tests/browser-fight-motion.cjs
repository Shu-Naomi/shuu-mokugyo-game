// Controlled real-browser fight presentation clips; encounter setup is a fixture.
const {chromium}=require('playwright'),fs=require('fs'),path=require('path'),http=require('http');
const {seed,saveKey}=require('./game-harness.cjs');
const root=path.resolve(process.env.MOTION_ROOT||path.join(__dirname,'..')),out=path.resolve(process.env.MOTION_OUT||'fight-motion-evidence');
const server=http.createServer((req,res)=>{const p=path.join(root,decodeURI(req.url.split('?')[0]));try{const f=fs.readFileSync(p.endsWith('/')?p+'index.html':p);res.setHeader('Content-Type',p.endsWith('.js')?'text/javascript':p.endsWith('.css')?'text/css':p.endsWith('.png')?'image/png':p.endsWith('.webp')?'image/webp':'text/html');res.end(f)}catch{res.statusCode=404;res.end()}});
(async()=>{fs.mkdirSync(out,{recursive:true});await new Promise(r=>server.listen(0,'127.0.0.1',r));const browser=await chromium.launch({headless:true,...(process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE?{executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE}:{})});try{
 for(const id of (process.env.MOTION_IDS||'starNushi,moroko,utsubo').split(',')){
 const context=await browser.newContext({viewport:{width:844,height:390},isMobile:true,hasTouch:true,recordVideo:{dir:out,size:{width:844,height:390}},serviceWorkers:'block'});
 await context.addInitScript(({key,state})=>{localStorage.setItem(key,JSON.stringify(state));localStorage.setItem('nushi-inugoya-options-v1',JSON.stringify({textSpeed:'instant'}))},{key:saveKey,state:{...seed(),hp:100,maxHp:100,soundEnabled:false,fightMode:'nushi',ownedRods:['tideMaster'],selectedRod:'tideMaster'}});
 const page=await context.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));await page.goto(`http://127.0.0.1:${server.address().port}/`);await require('./browser-start-adventure.cjs')(page,true);
 if(await page.locator('#lakeIntroSkip').isVisible())await page.locator('#lakeIntroSkip').click();
 await page.evaluate(id=>{cast();beginFishing();battle.cast=50;launchSurfaceCast();settleSurfaceCast();battle.f=fish.find(f=>f.id===id);startFight();clearInterval(timer);releaseBattleAction();battle.gillWash=null;window.motionInterval=setInterval(()=>{if(!battle)return;moveBattleFish(battle.mood);renderBattleFish();syncBattleFishLine();},120);},id);
 const samples=[];
 for(const calm of [true,false]){
 await page.evaluate(calm=>{battle.mood=fightProfiles[battle.f.id].moods.find(m=>Boolean(m.calm)===calm);battle.moodTick=0;setFishCourse(battle.mood);ShuFishing.beginWindow(battle,battle.mood,500,Date.now());if(battle.nushiWindow)battle.nushiWindow.warning=false;syncNushiFightCue();},calm);
 for(let n=0;n<5;n++){await page.waitForTimeout(600);samples.push(await page.evaluate(()=>({x:battle.x,y:battle.y,pose:battleFishVisualPose(),frame:document.querySelector('#battleFish').dataset.artSwimFrame})));await page.screenshot({path:path.join(out,`${id}-${calm?'pull':'run'}-${n}.png`)});}
 }
 await page.evaluate(()=>clearInterval(window.motionInterval));const video=page.video();await context.close();await video.saveAs(path.join(out,id+'.webm'));fs.writeFileSync(path.join(out,id+'.json'),JSON.stringify({samples,errors},null,2));if(errors.length)throw Error(errors.join('\n'));
 }
 }finally{await browser.close();server.close();}})().catch(e=>{console.error(e);process.exitCode=1;server.close()});
