// Native desktop/touch QA. Fixture selects an existing river bank and RNG only;
// cast, bite, reel, landing, aquarium and reload use shipped game paths.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),http=require('node:http');
const {chromium}=require('playwright'),{seed,saveKey}=require('./game-harness.cjs');
const species='shiokakure';
const root=path.resolve(__dirname,'..'),dir=path.resolve(process.env.SHIOKAKURE_EVIDENCE_DIR||path.join(__dirname,'shiokakure-evidence'));
async function run(url,screen){
 const browser=await chromium.launch({headless:true,...(process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE?{executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE}:{})}),context=await browser.newContext({viewport:screen,isMobile:screen.width<1000,hasTouch:screen.width<1000,deviceScaleFactor:1,locale:'ja-JP',serviceWorkers:'block',recordVideo:{dir:path.join(dir,'video'),size:screen}});
 const mobile=screen.width<1000,state={...seed(),soundEnabled:false,hp:100,money:50000,gameMinutes:720,mapRegion:'offshore',x:45,y:33,direction:'down',ownedRods:['shoreReed','lureRod'],selectedRod:'shoreReed',selectedBait:'shell',selectedHook:'large',baits:{shell:20},lures:{silverSpoon:20}},errors=[],failed=[],results=[];
 await context.addInitScript(({key,state})=>{if(!localStorage.getItem(key))localStorage.setItem(key,JSON.stringify(state));localStorage.setItem('nushi-inugoya-options-v1',JSON.stringify({textSpeed:'instant'}));},{key:saveKey,state});
 const page=await context.newPage(),cdp=mobile?await context.newCDPSession(page):null,press=q=>page.locator(q)[mobile?'tap':'click'](),value=q=>page.evaluate(q=>{const v=eval(q);return v===undefined?null:JSON.parse(JSON.stringify(v));},q),shot=name=>page.screenshot({path:path.join(dir,screen.width+'-'+name+'.png')});let held=false,button;
 page.on('pageerror',e=>errors.push(e.message));page.on('response',r=>{if(r.status()>=400&&r.url().startsWith(new URL('./',url).href))failed.push(r.status()+' '+r.url());});
 async function hold(on){if(on===held)return;if(mobile)await cdp.send('Input.dispatchTouchEvent',{type:on?'touchStart':'touchEnd',touchPoints:on?[{x:button.x,y:button.y,id:1}]:[]});else if(on){await page.mouse.move(button.x,button.y);await page.mouse.down();}else await page.mouse.up();held=on;}
 async function start(){await require('./browser-start-adventure.cjs')(page,mobile);await page.clock.runFor(240);if(await page.locator('#lakeIntroSkip').isVisible()){await press('#lakeIntroSkip');await page.clock.runFor(240);}await require('./browser-release.cjs').assertRelease(page);}
 try{
  await page.clock.install({time:new Date('2026-11-04T11:00:00Z')});await page.clock.pauseAt('2026-11-04T11:00:01Z');await page.goto(url,{waitUntil:'domcontentloaded',timeout:90000});await start();await page.evaluate(id=>window.troutSpecies=id,species);await page.evaluate(()=>fishAtlasImage(ShuFishArt.species[troutSpecies].asset).decode());
  // Position/gear/size fixtures; discovery uses the normal field clock and
  // the cast, lure, hook, reel and landing use actual pointer/touch controls.
  await page.clock.runFor(170);await shot('map-early');
  await page.clock.runFor(4800);await shot('map-observed');
  assert.equal(await value('fieldMenuIsOpen()'),false);
  assert.equal(await value('ShuShiokakure.ready(shiokakureEncounter,s,ShuOffshore.fishingWater(s.x,s.y,s.direction))'),true);
  const shape=await page.locator('#shiokakureContour').boundingBox();assert.ok(shape&&shape.width>=30&&shape.height>=15);
  await page.emulateMedia({reducedMotion:'reduce'});await page.clock.runFor(170);await shot('map-reduced');await page.emulateMedia({reducedMotion:'no-preference'});
  for(const mode of ['gauge','nushi']){
   const method=mode==='nushi'?'lure':'bait';
   await page.evaluate(({mode,method})=>{hideCatchCard();s.fightMode=mode;s.fishingMethod=method;s.selectedRod=method==='lure'?'lureRod':'shoreReed';}, {mode,method});
   // A consumed encounter returns after its cooldown; wait in the map.
   for(let n=0;n<240&&!await value('ShuShiokakure.ready(shiokakureEncounter,s,ShuOffshore.fishingWater(s.x,s.y,s.direction))');n++)await page.clock.runFor(170);
   await press('#action');await press('#wait');await press('#beginCast');
   const before=await value('({bait:s.baits.shell,caught:s.caught[troutSpecies]||0})');
   assert.equal(await value('battle.shiokakureObserved'),true);
   for(let n=0;n<120&&await value('battle.cast')<15;n++)await page.clock.runFor(120);
   assert.ok(await value('battle.cast>=0&&battle.cast<=24'));
   await page.evaluate(()=>{clearInterval(timer);timer=0;window.browntroutRandom=Math.random;Math.random=()=>.999999;});
   await press('#pull');await page.evaluate(()=>battleTick());for(let n=0;n<60&&await value('battle.phase')==='cast-flight';n++)await page.clock.runFor(40);assert.equal(await value('battle.f.id'),species);
   await page.evaluate(()=>{window.browntroutRng=301;Math.random=()=>((window.browntroutRng=Math.imul(window.browntroutRng,1664525)+1013904223>>>0)/4294967296);});
   if(method==='lure'){
    for(let n=0;n<160&&await value('battle.phase')!=='bite';n++){
     if(await value('battle.phase')==='lure')await press('#pull');
     await page.clock.runFor(240);
    }
   }else for(let n=0;n<80&&await value('battle.phase')!=='bite';n++)await page.clock.runFor(120);
   assert.equal(await value('battle.phase'),'bite');await press('#pull');await page.clock.runFor(240);assert.equal(await value('battle.phase'),'fight');
   await page.waitForFunction(()=>{const c=document.querySelector('#battleFish canvas');return c?.dataset.artSpecies===troutSpecies&&c.getContext('2d').getImageData(0,0,c.width,c.height).data.some((v,i)=>i%4===3&&v>100);});await shot(mode+'-underwater');
   const r=await page.locator('#pull').boundingBox();assert.ok(r&&r.width>=44&&r.height>=44&&r.y+r.height<=screen.height+1);button={x:r.x+r.width/2,y:r.y+r.height/2};
   const specimen=await value('battle.specimen');const queue=[];let previous=null,ticks=0,warnings=0,last=null;
   for(;ticks<1800;ticks++){
    const ui=await page.evaluate(()=>({phase:battle?.phase,cue:document.querySelector('#fishScene').dataset.nushiPhase,leap:document.querySelector('#fishScene').classList.contains('gill-wash'),tension:parseFloat(document.querySelector('#ten').style.width)||0}));if(ui.phase!=='fight')break;
    const wish=!ui.leap&&(mode==='gauge'?ui.tension<(previous?45:20):['slack','pulling'].includes(ui.cue));if(wish!==previous){queue.push({at:ticks*120+600,on:wish});previous=wish;}if(ui.cue==='warning'&&last!=='warning')warnings++;last=ui.cue;while(queue.length&&queue[0].at<=ticks*120)await hold(queue.shift().on);await page.clock.runFor(120);
   }
   assert.equal(await value('battle?.phase'),'landing',mode+' actual landing');await hold(false);await page.clock.runFor(1600);assert.equal(await value('s.caught[troutSpecies]'),before.caught+1);assert.equal(await value('s.baits.shell'),before.bait-(method==='bait'?1:0));assert.equal(await value('s.catchMemories[troutSpecies].first.spotId'),'offshore-west-shallow');await shot(mode+'-caught');results.push({mode,method,specimen,seconds:ticks*.12,realInput:true,reactionMs:600,warnings});
  }
  await page.evaluate(()=>hideCatchCard());
  await page.evaluate(()=>save());const saved=await value('({caught:s.caught[troutSpecies],fish:s.petLife.fish,memories:s.catchMemories[troutSpecies]})');await page.reload({waitUntil:'domcontentloaded'});await start();await page.evaluate(id=>window.troutSpecies=id,species);assert.deepEqual(await value('({caught:s.caught[troutSpecies],fish:s.petLife.fish,memories:s.catchMemories[troutSpecies]})'),saved);
  assert.deepEqual(errors,[]);assert.deepEqual(failed,[]);fs.writeFileSync(path.join(dir,screen.width+'-result.json'),JSON.stringify({screen,results,saveReload:true,errors,failed},null,2));console.log('SHIOKAKURE_BROWSER_PASS '+JSON.stringify({screen,results}));
 }catch(e){await shot('failure').catch(()=>{});fs.writeFileSync(path.join(dir,screen.width+'-failure.json'),JSON.stringify({error:e.stack,errors,failed,state:await value('({phase:battle?.phase,fish:battle?.f?.id,ten:battle?.ten,ret:battle?.retrieval,hp:s.hp,specimen:battle?.specimen,gear:battle?.equipment,runTicks:battle?.nushiRunTicks,mood:battle?.mood?.id,reeling:battle?.reeling,window:battle?.nushiWindow})').catch(()=>null)},null,2));throw e;}finally{if(held)await hold(false).catch(()=>{});await context.close();await browser.close();}
}
const types={'.html':'text/html','.js':'text/javascript','.css':'text/css','.png':'image/png','.webp':'image/webp','.svg':'image/svg+xml','.mp3':'audio/mpeg','.wav':'audio/wav'},server=http.createServer((req,res)=>{try{const name=new URL(req.url,'http://localhost').pathname.replace(/^\/nushi-tsuri\//,'')||'index.html',file=path.resolve(root,name);if(!file.startsWith(root+path.sep)||!fs.statSync(file).isFile())throw Error('path');res.writeHead(200,{'Content-Type':types[path.extname(file)]||'application/octet-stream','Cache-Control':'no-store'});fs.createReadStream(file).pipe(res);}catch{res.writeHead(404);res.end();}});
(async()=>{fs.mkdirSync(dir,{recursive:true});await new Promise((r,j)=>{server.once('error',j);server.listen(0,'127.0.0.1',r);});try{const url=process.env.SHIOKAKURE_PUBLIC_URL||`http://127.0.0.1:${server.address().port}/nushi-tsuri/`;for(const screen of [{width:1280,height:720},{width:844,height:390},{width:740,height:360}])await run(url,screen);}finally{await new Promise(r=>server.close(r));}})().catch(e=>{console.error(e);process.exitCode=1;});
