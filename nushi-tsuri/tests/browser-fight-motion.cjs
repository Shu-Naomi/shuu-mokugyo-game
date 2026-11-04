// Real browser/painter, controlled encounter and phase fixtures (not a catch-rate test).
const assert=require('node:assert/strict'),{chromium}=require('playwright');
const fs=require('node:fs'),path=require('node:path'),http=require('node:http');
const {seed,saveKey}=require('./game-harness.cjs');
const root=path.resolve(process.env.MOTION_ROOT||path.join(__dirname,'..'));
const out=path.resolve(process.env.MOTION_OUT||'fight-motion-evidence');
const mime={'.html':'text/html','.js':'text/javascript','.css':'text/css','.png':'image/png','.webp':'image/webp','.svg':'image/svg+xml','.mp3':'audio/mpeg','.wav':'audio/wav'};
const server=http.createServer((req,res)=>{
 try{const p=path.resolve(root,'.'+decodeURI(req.url.split('?')[0])),file=p===root?path.join(root,'index.html'):p;
  if(!file.startsWith(root+path.sep))throw Error('path');res.setHeader('Content-Type',mime[path.extname(file)]||'application/octet-stream');res.end(fs.readFileSync(file));
 }catch{res.statusCode=404;res.end();}
});
const cases=[['starNushi','nushi',true],['moroko','nushi',true],['utsubo','nushi',true],['hirame','nushi',true],['hiramasa','nushi',true],['starNushi','nushi',false],['starNushi','gauge',false]];
(async()=>{
 fs.mkdirSync(out,{recursive:true});await new Promise(r=>server.listen(0,'127.0.0.1',r));
 const browser=await chromium.launch({headless:true,...(process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE?{executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE}:{})});
 try{for(const [id,mode,mobile]of cases){
  const label=[id,mode,mobile?'mobile':'desktop'].join('-'),size=mobile?{width:844,height:390}:{width:1280,height:720};
  const context=await browser.newContext({viewport:size,isMobile:mobile,hasTouch:mobile,deviceScaleFactor:mobile?3:1,recordVideo:{dir:out,size},serviceWorkers:'block'});
  const page=await context.newPage(),errors=[],samples=[];
  page.on('pageerror',e=>errors.push(e.message));
  await context.addInitScript(({key,state})=>{localStorage.setItem(key,JSON.stringify(state));localStorage.setItem('nushi-inugoya-options-v1',JSON.stringify({textSpeed:'instant'}));},{key:saveKey,state:{...seed(),hp:100,maxHp:100,soundEnabled:false,fightMode:mode,ownedRods:['tideMaster'],selectedRod:'tideMaster'}});
  try{
   await page.goto(process.env.MOTION_PUBLIC_URL||`http://127.0.0.1:${server.address().port}/`);await require('./browser-start-adventure.cjs')(page,mobile);
   if(await page.locator('#lakeIntroSkip').isVisible())await page.locator('#lakeIntroSkip').click();
   await page.evaluate(id=>{
    cast();beginFishing();battle.cast=50;launchSurfaceCast();settleSurfaceCast();battle.f=fish.find(f=>f.id===id);
    battle.specimen=rollFishSpecimen(battle.f,()=>.8);battle.specimenVisualScale=fishVisualScale(battle.specimen);
    startFight();clearInterval(timer);releaseBattleAction();battle.gillWash=null;
    window.motionInterval=setInterval(()=>{
     if(!battle||battle.pausedAt||document.hidden)return;
     if(battle.gillWash){updateGillWash(1.95);updateWaterFx();renderBattleFish();drawBattle();return;}
     updateRetrieval(battle.mood);moveBattleFish(battle.mood);advanceUnderwaterTravel();updateWaterFx();renderBattleFish();drawBattle();
    },120);
   },id);
   const shot=async phase=>{await page.screenshot({path:path.join(out,`${label}-${phase}.jpg`),type:'jpeg',quality:88,scale:'css'});samples.push(await page.evaluate(phase=>({phase,x:battle.x,y:battle.y,pose:battleFishVisualPose(),swim:document.querySelector('#battleFish').dataset.artSwimFrame,effort:document.querySelector('#battleFish').dataset.swimEffort||'1',cue:document.querySelector('#fishScene').dataset.nushiPhase}),phase));};
   for(const calm of [true,false]){
    await page.evaluate(calm=>{
     battle.mood=fightProfiles[battle.f.id].moods.find(m=>Boolean(m.calm)===calm);battle.calm=calm;battle.moodTick=0;setFishCourse(battle.mood);
     battle.nextMood=ShuFishing.beginWindow(battle,battle.mood,6000,Date.now(),()=>1);syncNushiFightCue();
     if(battle.f.id==='hirame'&&calm)battle.sandLifted=false;
     if(battle.f.id==='hirame'&&!calm)releaseHirameFromSand();
    },calm);
    for(let n=0;n<5;n++){await page.waitForTimeout(500);await shot((calm?'pull':'run')+'-'+n);}
   }
   if(mode==='gauge'){
    await page.evaluate(()=>{battle.turning={from:battle.facing,to:-battle.facing,frame:0,frames:12,flipped:false};});
    for(let n=0;n<5;n++){await page.waitForTimeout(250);await shot('turn-'+n);}
   }
   if(id==='starNushi'){
    assert.equal(await page.evaluate(()=>{
     battle.turning=null;battle.nushiWindow=null;battle.nushiStage=3;battle.retrieval=.3;battle.nextGillWashTick=0;
     battle.mood=fightProfiles[battle.f.id].moods.find(m=>m.danger);const random=Math.random;
     try{Math.random=()=>0;return maybeStartGillWash(battle.mood);}finally{Math.random=random;}
    }),true);
    for(let n=0;n<5;n++){await page.waitForTimeout(250);await shot('gill-'+n);}
    await page.waitForTimeout(600);
   }
   if(mode==='nushi'){
    await page.evaluate(()=>{
     battle.mood=fightProfiles[battle.f.id].moods.find(m=>m.calm);battle.moodTick=0;battle.calm=true;
     battle.nextMood=ShuFishing.beginWindow(battle,battle.mood,6000,Date.now(),()=>1);
     battle.nushiWindow.warnAt=Date.now();ShuFishing.windowPhase(battle,Date.now());syncNushiFightCue();
    });
    for(let n=0;n<3;n++){await page.waitForTimeout(300);await shot('warning-'+n);}
   }
   await page.evaluate(()=>{pauseBattle();renderBattleFish();});
   const frozen=await page.evaluate(()=>({tick:battle.swimTick,frame:document.querySelector('#battleFish').dataset.artSwimFrame}));
   await page.waitForTimeout(800);assert.deepEqual(await page.evaluate(()=>({tick:battle.swimTick,frame:document.querySelector('#battleFish').dataset.artSwimFrame})),frozen);
   await shot('paused');await page.evaluate(()=>{resumeBattle();battle.nushiWindow=null;battle.mood=fightProfiles[battle.f.id].moods.find(m=>!m.calm);battle.calm=false;battle.moodTick=0;battle.nextMood=Date.now()+6000;});
   await page.emulateMedia({reducedMotion:'reduce'});await page.waitForTimeout(400);await shot('reduced');
   if(process.env.MOTION_ENHANCED==='1')assert.equal(await page.locator('#battleFish').getAttribute('data-swim-effort'),'1');
   const metrics=await page.evaluate(()=>{
    pauseBattle();const canvas=document.createElement('canvas');canvas.width=448;canvas.height=224;
    const ctx=canvas.getContext('2d'),id=battle.f.id,image=fishAtlasImage(ShuFishArt.species[id].asset);
    const resolve=asset=>fishAtlasImage(asset),times=[];ShuFishArt.draw(ctx,image,id,8,0,resolve,{swimFrame:0,swimEffort:2.8});const before=ShuFishArt.metrics();
    for(let n=0;n<120;n++){const start=performance.now();ShuFishArt.draw(ctx,image,id,8,0,resolve,{swimFrame:n/15,swimEffort:1+n%3*.8});times.push(performance.now()-start);}
    times.sort((a,b)=>a-b);return {before,after:ShuFishArt.metrics(),medianMs:times[60],p95Ms:times[114]};
   });
   assert.equal(metrics.after.outputs,metrics.before.outputs);assert.equal(metrics.after.builds,metrics.before.builds);assert.deepEqual(errors,[]);
   fs.writeFileSync(path.join(out,label+'.json'),JSON.stringify({id,mode,mobile,samples,metrics,errors,note:'Controlled phase fixture and browser renderer timing; not physical-phone thermal measurements.'},null,2));
  }finally{
   await page.evaluate(()=>clearInterval(window.motionInterval)).catch(()=>{});const video=page.video();await context.close();await video.saveAs(path.join(out,label+'.webm'));await video.delete();
  }
 }}finally{await browser.close();server.close();}
})().catch(e=>{console.error(e);process.exitCode=1;server.close();});
