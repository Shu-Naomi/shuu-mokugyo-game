// Real game UI and Canvas checks on desktop/touch. No production saves or remote writes.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),http=require('node:http');
const {chromium}=require('playwright'),{seed,saveKey}=require('./game-harness.cjs');
const {execFileSync}=require('node:child_process');
const root=path.resolve(__dirname,'..'),dir=path.resolve(process.env.FISH_SWIM_EVIDENCE_DIR||path.join(__dirname,'fish-swimming-evidence'));
const ids=['unagi','moroko','tanago','dojo','namazu','medaka'];
function fixture(){return {...seed(),money:50000,soundEnabled:false,gameMinutes:600,
 caught:Object.fromEntries(ids.map(id=>[id,1])),petLife:{version:6,unlockedTanks:1,selected:'pet-1',selectedTank:0,nextId:7,food:100,
 fish:ids.slice(0,5).map((species,i)=>({uid:'pet-'+(i+1),species,tank:0,length:species==='medaka'?350:species==='tanago'?700:2000,bornSize:2000,origin:'shop',generation:0,sex:'male',acquiredDay:0,lastDay:0,fedDay:-1,changedDay:-1,water:100,health:90,careDays:0,stars:1,xp:0})),eggs:[]}};}
async function run(url,screen){
 const browser=await chromium.launch({headless:true,...(process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE?{executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE}:{})});
 const context=await browser.newContext({viewport:{width:screen.width,height:screen.height},isMobile:screen.mobile,hasTouch:screen.mobile,deviceScaleFactor:screen.dpr,locale:'ja-JP',serviceWorkers:'block',recordVideo:{dir:path.join(dir,'video'),size:{width:screen.width,height:screen.height}}});
 const errors=[],failures=[],checks=[];let page;
 try{
  await context.addInitScript(({state,key})=>{localStorage.setItem(key,JSON.stringify(state));localStorage.setItem('nushi-inugoya-options-v1',JSON.stringify({textSpeed:'instant'}));},{state:fixture(),key:saveKey});
  page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));
  page.on('response',r=>{if(r.status()>=400&&r.url().startsWith(new URL('./',url).href))failures.push(r.status()+' '+r.url());});
  const press=q=>page.locator(q)[screen.mobile?'tap':'click'](),shot=name=>page.screenshot({path:path.join(dir,screen.width+'-'+name+'.png')});
  await page.goto(url,{waitUntil:'load',timeout:90000});await require('./browser-start-adventure.cjs')(page,screen.mobile);
  if(await page.locator('#lakeIntroSkip').isVisible())await press('#lakeIntroSkip');
  await press('#menu');await press('[data-field-menu-target="items"]');await press('#openPetAquarium');
  await page.waitForFunction(()=>document.querySelectorAll('#petTankStage [data-pet-fish] canvas[data-art-paint-key]').length===5);
  const state=await page.evaluate(()=>JSON.stringify({caught:s.caught,money:s.money,fish:s.petLife.fish}));
  await shot('five-fish');
  const keys=await page.locator('#petTankStage [data-pet-fish] canvas').evaluateAll(nodes=>nodes.map(n=>n.dataset.artPaintKey));
  await page.waitForTimeout(300);
  const next=await page.locator('#petTankStage [data-pet-fish] canvas').evaluateAll(nodes=>nodes.map(n=>n.dataset.artPaintKey));
  assert.ok(next.every((k,i)=>k!==keys[i]),'all five native fish continue fractional swimming');
  await press('.pet-fish-roster [data-pet-inspect="pet-1"]');
  await page.waitForSelector('#petInspectFish canvas[data-art-paint-key]');
  for(let n=0;n<4;n++){await page.waitForTimeout(2300);await shot('inspection-'+n);}
  await press('[data-pet-action="focus-close"]');
  const baseline=execFileSync('git',['show','a67f76b6e7072478a098d25ba3200fff9b39f4d4:nushi-tsuri/fish-art.js'],{cwd:root,encoding:'utf8'});
  await page.addScriptTag({content:baseline.replace('root.ShuFishArt=api','root.__BeforeFishArt=api')});
  const measured=await page.evaluate(async()=>{
   const ids=['unagi','moroko','tanago','dojo','namazu','medaka'];
   await Promise.all(ids.map(id=>fishAtlasImage(ShuFishArt.species[id].asset).decode()));
   const fish=ids.map((species,i)=>({uid:'measure-'+i,species,length:2000}));
   const canvases=ids.map(()=>{const c=document.createElement('canvas');c.width=448;c.height=224;return c;});
   const beforeCanvases=ids.map(()=>{const c=document.createElement('canvas');c.width=448;c.height=224;return c;});
   const summaries=[];let creates=0,reads=0;
   for(const c of canvases){const ctx=c.getContext('2d'),create=ctx.createImageData.bind(ctx),read=ctx.getImageData.bind(ctx);ctx.createImageData=(...a)=>{creates++;return create(...a);};ctx.getImageData=(...a)=>{reads++;return read(...a);};}
   for(const hz of [10,20,30,60]){
    const times=[],beforeTimes=[];let final;
    for(let step=0;step<=hz*2;step++){
     const poses=ShuAquariumLife.layout(fish,petCatalog,720,350,step/hz,()=>2).poses;final=poses;
     for(let i=0;i<poses.length;i++){
      const p=poses[i],id=p.species,im=fishAtlasImage(ShuFishArt.species[id].asset),before=performance.now();
      __BeforeFishArt.draw(beforeCanvases[i].getContext('2d'),im,id,p.spriteMode==='turn'?7:8,p.spriteMode==='turn'?p.yaw/Math.PI*6:Math.floor(p.swimFrame),()=>im,{swimFrame:Math.floor(p.swimFrame)});beforeTimes.push(performance.now()-before);
      const start=performance.now();ShuFishArt.draw(canvases[i].getContext('2d'),im,id,p.spriteMode==='turn'?7:8,p.spriteMode==='turn'?p.yaw/Math.PI*6:p.swimFrame,()=>im,{swimFrame:p.swimFrame});times.push(performance.now()-start);
     }
    }
    times.sort((a,b)=>a-b);beforeTimes.sort((a,b)=>a-b);summaries.push({hz,samples:times.length,beforeMedianMs:beforeTimes[Math.floor(beforeTimes.length*.5)],beforeP95Ms:beforeTimes[Math.floor(beforeTimes.length*.95)],medianMs:times[Math.floor(times.length*.5)],p95Ms:times[Math.floor(times.length*.95)],final});
   }
   const starting=ShuFishArt.metrics();
   for(let n=0;n<100;n++){const id=ids[0],im=fishAtlasImage(ShuFishArt.species[id].asset);ShuFishArt.draw(canvases[0].getContext('2d'),im,id,7,1.25,()=>im,{swimFrame:n/16});}
   return {summaries,creates,reads,starting,ending:ShuFishArt.metrics()};
  });
  for(const sample of measured.summaries)assert.deepEqual(sample.final,measured.summaries[0].final,'same elapsed pose across presentation rates');
  assert.equal(measured.reads,0,'destination pixels are not read back per frame');assert.ok(measured.creates<=54,'bounded base pool plus six outputs');
  assert.ok(measured.ending.cachedRasters<=48);assert.equal(measured.ending.outputs,measured.starting.outputs,'phase changes reuse output');
  checks.push({name:'six-fish-canvas-trace',note:'Synchronous Canvas trace at sampled presentation rates, not battery/thermal measurements',...measured});
  assert.equal(await page.evaluate(()=>JSON.stringify({caught:s.caught,money:s.money,fish:s.petLife.fish})),state,'animation leaves gameplay state unchanged');
  assert.deepEqual(errors,[]);assert.deepEqual(failures,[]);await shot('return-to-tank');
  fs.writeFileSync(path.join(dir,screen.width+'-browser.json'),JSON.stringify({screen,checks,errors,failures},null,2));
  console.log('FISH_SWIMMING_BROWSER_PASS '+screen.width);
 }finally{await context.close();await browser.close();}
}
const types={'.html':'text/html','.js':'text/javascript','.css':'text/css','.png':'image/png','.webp':'image/webp','.svg':'image/svg+xml','.mp3':'audio/mpeg','.wav':'audio/wav'};
const server=http.createServer((req,res)=>{try{const name=new URL(req.url,'http://localhost').pathname.replace(/^\/nushi-tsuri\//,'')||'index.html',file=path.resolve(root,name);if(!file.startsWith(root+path.sep)||!fs.statSync(file).isFile())throw Error('path');res.writeHead(200,{'Content-Type':types[path.extname(file)]||'application/octet-stream','Cache-Control':'no-store'});fs.createReadStream(file).pipe(res);}catch{res.writeHead(404);res.end();}});
(async()=>{fs.mkdirSync(dir,{recursive:true});await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(0,'127.0.0.1',resolve);});try{const url=process.env.FISH_SWIM_PUBLIC_URL||`http://127.0.0.1:${server.address().port}/nushi-tsuri/`;for(const screen of [{width:1280,height:720,mobile:false,dpr:1},{width:844,height:390,mobile:true,dpr:3}])await run(url,screen);}finally{await new Promise(resolve=>server.close(resolve));}})().catch(e=>{console.error(e);process.exitCode=1;});
