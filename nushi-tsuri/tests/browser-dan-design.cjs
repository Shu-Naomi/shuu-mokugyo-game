const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),http=require('node:http');
const {chromium}=require('playwright'),{seed,saveKey}=require('./game-harness.cjs'),start=require('./browser-start-adventure.cjs');
const out=path.join(__dirname,'artifacts/dan-design');
const mime={'.html':'text/html','.js':'text/javascript','.css':'text/css','.svg':'image/svg+xml','.png':'image/png','.webp':'image/webp','.jpg':'image/jpeg','.mp3':'audio/mpeg','.woff2':'font/woff2'};
async function run(root,label,browser,viewport){
 const server=http.createServer((req,res)=>{let n=decodeURIComponent(new URL(req.url,'http://localhost').pathname).replace(/^\/nushi-tsuri\//,'')||'index.html';const f=path.resolve(root,n);if(!f.startsWith(root+path.sep)||!fs.existsSync(f)){res.writeHead(404);res.end();return;}res.setHeader('Content-Type',mime[path.extname(f)]||'application/octet-stream');res.setHeader('Cache-Control','no-store');fs.createReadStream(f).pipe(res);});
 await new Promise(r=>server.listen(0,'127.0.0.1',r));
 const c=await browser.newContext({viewport,hasTouch:viewport.width<1000,isMobile:viewport.width<1000,serviceWorkers:'block',locale:'ja-JP'}),errors=[],bad=[];
 try{
 await c.addInitScript(({key,state})=>localStorage.setItem(key,JSON.stringify(state)),{key:saveKey,state:{...seed(),soundEnabled:false,gameMinutes:600,money:4321,petLife:{version:6,unlockedTanks:1,food:10,nextId:2,selectedTank:0,selected:'pet-1',fish:[{uid:'pet-1',species:'funa',nickname:'ほし丸',tank:0,length:1800,bornSize:1500,health:90,water:100,fedDay:-1,changedDay:-1}]}}});
 const page=await c.newPage();page.on('pageerror',e=>errors.push(e.message));page.on('response',r=>{if(r.status()>=400)bad.push(r.url());});
 await page.clock.install({time:new Date('2026-11-22T12:00:00Z')});await page.clock.pauseAt('2026-11-22T12:00:01Z');
 const ready=[];let rendering;
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
 rendering=await page.evaluate(()=>({dpr:devicePixelRatio,viewport:[innerWidth,innerHeight],surfaces:['.dan-race-course','.dan-race-island','.dan-race-wheel','.dan-race-flow'].map(q=>{const n=document.querySelector(q),r=n.getBoundingClientRect(),s=getComputedStyle(n);return {selector:q,width:r.width,height:r.height,imageRendering:s.imageRendering,backgroundSize:s.backgroundSize,transform:s.transform};}),canvasCount:document.querySelectorAll('.dan-race-course canvas').length}));
 if(label==='before'){
  const diagnostic=await page.addStyleTag({content:'.dan-race-course,.dan-race-island::before,.dan-race-flow,.dan-race-wheel::before{image-rendering:auto!important}'});
  await shot('sampling-auto');await diagnostic.evaluate(n=>n.remove());
 }

 await press('#danRaceSpurt');assert.equal(await page.locator('#danRaceSpurt').isDisabled(),true);await page.clock.runFor(200);await shot('sprint');
 await page.clock.runFor(26000);await page.locator('[data-race-phase="result"]').waitFor();await fit('#danRaceAgain,#villageFishGames [data-close]');await shot('result');
 const result=await page.locator('.dan-race-result').getAttribute('data-time-cs'),rank=await page.locator('#danRaceRank').getAttribute('data-rank');
 await press('#danRaceAgain');await page.locator('#danRoutePicker').selectOption('bank');await press('#danRaceStart');await page.clock.runFor(27000);await page.locator('[data-race-phase="result"]').waitFor();await fit('#danRaceAgain');await press('#danRaceAgain');await shot('rematch');
 await press('#villageFishGames [data-close]');assert.equal(await page.locator('#villageFishGames.open').count(),0);
 assert.equal(await page.evaluate(()=>JSON.stringify({money:s.money,pet:s.petLife,baits:s.baits})),before,'race does not change funds, fish training or bait');
 await press('[data-move="down"]');await press('[data-move="up"]');await press('#action');await page.locator('#villageFishGames.open[data-game="race"]').waitFor();await fit('#danRaceStart');
 if(label==='after'){assert.ok(await page.locator('.dan-race-scoreboard').isVisible());assert.ok(await page.locator('.dan-race-course').evaluate(n=>getComputedStyle(n).backgroundImage.includes('dan-race-water-v252-86.svg')));}
 assert.deepEqual(errors,[]);assert.deepEqual(bad,[]);return {viewport,label,result,rank,rendering,entry:true,branch:true,sprint:true,rematch:true,return:true,ready,errors,bad};
 }finally{await c.close();await new Promise(r=>server.close(r));}
}
(async()=>{fs.mkdirSync(out,{recursive:true});const browser=await chromium.launch({headless:true});try{for(const viewport of [{width:1280,height:720},{width:844,height:390},{width:740,height:360}]){let baseline;for(const [label,root]of [['before',process.env.DAN_BASELINE],['after',path.resolve(__dirname,'..')]]){assert.ok(root);const r=await run(path.resolve(root),label,browser,viewport);if(label==='before')baseline=r;else{assert.equal(r.result,baseline.result);assert.equal(r.rank,baseline.rank);}fs.writeFileSync(path.join(out,`${viewport.width}-${label}.json`),JSON.stringify(r,null,2));console.log('DAN_DESIGN_PASS',JSON.stringify(r));}}}finally{await browser.close();}})().catch(e=>{console.error(e);process.exitCode=1});
