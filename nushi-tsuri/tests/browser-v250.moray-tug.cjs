const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),{chromium}=require('playwright');
const {seed,saveKey}=require('./game-harness.cjs'),{pressProduct}=require('./compact-ui-helpers.cjs');
module.exports=async function morayTug(url,mobile=false,options={}){
 const viewport=options.viewport||(mobile?{width:844,height:390}:{width:1280,height:720}),dir=path.join(__dirname,'browser-evidence-v250');fs.mkdirSync(dir,{recursive:true});
 const browser=await chromium.launch({headless:true}),context=await browser.newContext({viewport,isMobile:mobile,hasTouch:mobile,deviceScaleFactor:options.dpr||1,locale:'ja-JP',serviceWorkers:'block'});
 const initial={...seed(),money:50000,hp:100,maxHp:100,gameMinutes:600,soundEnabled:false,x:210,y:104,direction:'down',fightMode:'nushi',ownedRods:['bamboo','tideMaster'],selectedRod:'tideMaster',selectedHook:'large',selectedBait:'liveMinnow',baits:{liveMinnow:30}};
 await context.addInitScript(({key,state})=>{if(!localStorage.getItem(key))localStorage.setItem(key,JSON.stringify(state));localStorage.setItem('nushi-inugoya-options-v1',JSON.stringify({textSpeed:'instant'}));},{key:saveKey,state:initial});
 const page=await context.newPage(),cdp=mobile?await context.newCDPSession(page):null,errors=[],failed=[],results=[];
 page.on('pageerror',e=>errors.push(e.message));page.on('response',r=>{if(r.status()>=400)failed.push(r.status()+' '+new URL(r.url()).pathname);});
 const press=q=>page.locator(q)[mobile?'tap':'click'](),shot=name=>page.screenshot({path:path.join(dir,(options.public?'public-':'local-')+viewport.width+'x'+viewport.height+'-'+name+'.png')});
 let held=false,button;
 async function hold(value){if(value===held)return;if(mobile)await cdp.send('Input.dispatchTouchEvent',{type:value?'touchStart':'touchEnd',touchPoints:value?[{x:button.x,y:button.y,id:1}]:[]});else if(value){await page.mouse.move(button.x,button.y);await page.mouse.down();}else await page.mouse.up();held=value;}
 async function start(){await press('#start');await page.clock.runFor(240);if(await page.locator('#lakeIntroSkip').isVisible()){await press('#lakeIntroSkip');await page.clock.runFor(240);}assert.match(await page.locator('.hud').innerText(),/v250/);}
 try{
  await page.clock.install({time:new Date('2026-10-21T12:00:00Z')});await page.clock.pauseAt('2026-10-21T12:00:01Z');await page.goto(url,{waitUntil:'domcontentloaded',timeout:90000});await start();
  for(const id of ['utsubo','hiramasa','kanpachi']){
   await page.evaluate(()=>{hideCatchCard();Object.assign(s,{x:210,y:104,direction:'down',fishingMethod:'bait',fightMode:'nushi',selectedRod:'tideMaster',selectedHook:'large',selectedBait:'liveMinnow'});cast({zone:'sea',waterZone:'sea',waterX:s.x,waterY:s.y+6});});
   await press('#wait');await press('#beginCast');const bait=await page.evaluate(()=>s.baits.liveMinnow),oldCaught=await page.evaluate(id=>s.caught[id]||0,id);
   await page.evaluate(id=>{clearInterval(timer);timer=0;battle.cast=95;window.before250Random=Math.random;for(let n=0;n<10000;n++){Math.random=()=>(n+.5)/10000;if(pick(95,'sea-deep')?.id===id)return;}throw Error('no normal encounter '+id);},id);
   await press('#pull');await page.evaluate(()=>battleTick());for(let n=0;n<50&&await page.evaluate(()=>battle.phase==='cast-flight');n++)await page.clock.runFor(40);
   assert.equal(await page.evaluate(()=>battle.f.id),id);
   await page.evaluate(()=>{Math.random=window.before250Random;battle.specimen=rollFishSpecimen(battle.f,()=>.999999);battle.specimenVisualScale=fishVisualScale(battle.specimen);window.v250Rng=301;Math.random=()=>((window.v250Rng=Math.imul(window.v250Rng,1664525)+1013904223>>>0)/4294967296);battle.biteAt=Date.now();battle.biteShownAt=null;syncBitePhase();});
   await press('#pull');await page.clock.runFor(240);assert.equal(await page.evaluate(()=>battle.phase),'fight');
   const rect=await page.locator('#pull').boundingBox();assert.ok(rect&&rect.width>=44&&rect.height>=44&&rect.x>=0&&rect.y+rect.height<=viewport.height+1);button={x:rect.x+rect.width/2,y:rect.y+rect.height/2};
   const phases=new Set(),queue=[];let priorWish=null,priorPhase=null,runStart=null,runGain=0,pullGain=0,priorMeters=null,warnings=0,seconds=0;
   for(let tick=0;tick<1500;tick++){
    const ui=await page.evaluate(()=>({state:battle?.phase,phase:document.querySelector('#fishScene').dataset.nushiPhase,leap:document.querySelector('#fishScene').classList.contains('gill-wash'),meters:battle?ShuFishing.remainingMeters(battle):0}));
    if(ui.state!=='fight')break;phases.add(ui.phase);
    if(ui.phase==='running'){if(runStart===null)runStart=ui.meters;runGain=Math.max(runGain,ui.meters-runStart);}else runStart=null;
    if(priorMeters!==null&&ui.phase==='pulling')pullGain+=Math.max(0,priorMeters-ui.meters);priorMeters=ui.meters;
    if(ui.phase==='warning'&&priorPhase!=='warning'){warnings++;if(warnings===1)await shot(id+'-release-cue');}priorPhase=ui.phase;
    const wish=['slack','pulling'].includes(ui.phase)&&!ui.leap;
    if(wish!==priorWish){queue.push({at:tick*120+600,value:wish});priorWish=wish;}
    while(queue.length&&queue[0].at<=tick*120)await hold(queue.shift().value);
    await page.clock.runFor(120);seconds=(tick+1)*.12;
   }
   assert.equal(await page.evaluate(()=>battle?.phase),'landing',id+' natural landing');await hold(false);assert.ok(runGain>=2,id+' measurable fish turn '+runGain);assert.ok(pullGain>3);assert.ok(warnings>=1);assert.ok(phases.has('running')&&phases.has('pulling'));
   await page.clock.runFor(1600);assert.equal(await page.evaluate(id=>s.caught[id],id),oldCaught+1);assert.equal(await page.evaluate(()=>s.baits.liveMinnow),bait-1);await shot(id+'-caught');
   results.push({id,seconds,largestRunMeters:runGain,pulledMeters:pullGain,warnings,realInput:true,reactionMs:600});
  }
  await page.evaluate(()=>{hideCatchCard();petUi.open('shop');});
  for(const id of ['utsubo','hiramasa','kanpachi'])await pressProduct(page,'[data-pet-buy="'+id+'"]',mobile);
  await press('[data-pet-action="aquarium"]');assert.equal(await page.locator('.pet-fish-roster [data-pet-inspect]').count(),3);await shot('three-sea-fish-aquarium');
  const saved=await page.evaluate(()=>JSON.parse(JSON.stringify({caught:s.caught,fish:s.petLife.fish,money:s.money,baits:s.baits})));await press('#petLifeModal [data-pet-action="close"]');await page.reload({waitUntil:'domcontentloaded'});await start();
  assert.deepEqual(await page.evaluate(()=>JSON.parse(JSON.stringify({caught:s.caught,fish:s.petLife.fish,money:s.money,baits:s.baits}))),saved);assert.equal(await page.evaluate(()=>fish.length),57);assert.deepEqual(errors,[]);assert.deepEqual(failed,[]);
  console.log('V250_GAMEPLAY_PASS '+JSON.stringify({public:!!options.public,viewport,mobile,dpr:options.dpr||1,results,threeSeaFishHoused:true,saveReload:true,errors:errors.length,httpErrors:failed.length}));
 }finally{if(held)await hold(false).catch(()=>{});await context.close();await browser.close();}
};
