const assert=require('node:assert/strict'),{chromium}=require('playwright');
const {seed,saveKey}=require('./game-harness.cjs'),{findRoute}=require('./water-routes-v220.cjs'),M=require('../mountain-region.js');

module.exports=async function fightControls(url,mobile=false){
 const cases=mobile?[['namazu','nushi'],['raigyo','nushi'],['starNushi','nushi'],['starNushi','gauge']]:
  [['namazu','nushi'],['koi','nushi'],['nushi','nushi'],['nushi','gauge']];
 const browser=await chromium.launch({headless:true});
 try{for(const [id,mode] of cases){
  const wet=id==='raigyo',bait=wet?'liveMinnow':id==='nushi'||id==='starNushi'?'nushiSecret':'worm',errors=[],failed=[];
  const context=await browser.newContext({viewport:mobile?{width:844,height:390}:{width:1280,height:720},isMobile:mobile,hasTouch:mobile,locale:'ja-JP',serviceWorkers:'block'});
  const initial={...seed(),hp:100,maxHp:100,soundEnabled:false,gameMinutes:wet?600:1320,
   mapRegion:wet?'wetland':'village',...(wet?M.regions.wetland.entry:{x:123,y:92,direction:'up'}),
   ownedRods:['bamboo','tideMaster'],selectedRod:'tideMaster',fightMode:mode,selectedHook:'large',selectedBait:bait,
   baits:{worm:20,nushiSecret:20,liveMinnow:20},caught:id==='starNushi'?{streamNushi:1,coastNushi:1,caveNushi:1}:{}};
  await context.addInitScript(({key,state})=>{localStorage.setItem('nushi-inugoya-options-v1',JSON.stringify({textSpeed:'instant'}));if(!localStorage.getItem(key))localStorage.setItem(key,JSON.stringify(state));},{key:saveKey,state:initial});
  const page=await context.newPage(),cdp=mobile?await context.newCDPSession(page):null;
  page.on('pageerror',e=>errors.push(e.message));page.on('response',r=>{if(r.status()>=400&&/nushi-tsuri/.test(r.url()))failed.push(r.status()+' '+r.url());});
  const press=q=>page.locator(q)[mobile?'tap':'click']({force:true,noWaitAfter:true});
  const shot=async name=>console.log('V228_SCREENSHOT '+JSON.stringify({mobile,id,mode,screen:name,base64:(await page.screenshot({type:'jpeg',quality:82})).toString('base64')}));
  let held=false,button;
  async function setHeld(value){
   if(value===held)return;
   if(mobile)await cdp.send('Input.dispatchTouchEvent',{type:value?'touchStart':'touchEnd',touchPoints:value?[{x:button.x,y:button.y,id:1}]:[]});
   else if(value){await page.mouse.move(button.x,button.y);await page.mouse.down();}else await page.mouse.up();
   held=value;
  }
  try{
   await page.clock.install({time:new Date('2026-10-09T06:00:00Z')});await page.clock.pauseAt('2026-10-09T06:00:01Z');
   await page.goto(url,{waitUntil:'load'});assert.match(await page.locator('.hud').innerText(),/v228/);await press('#start');
   await page.clock.runFor(240);if(await page.locator('#lakeIntroSkip').isVisible()){await press('#lakeIntroSkip');await page.clock.runFor(240);}
   const route=await page.evaluate(({fn,type})=>(0,eval)('('+fn+')')(window,type),{fn:findRoute.toString(),type:wet?'wetMarsh':'lake'});
   async function fieldReady(){
    // A real dog discovery temporarily blocks field inputs. Let its normal
    // timers finish instead of dropping route steps or disabling the event.
    for(let i=0;i<80&&await page.evaluate(()=>forageDiscoveryInProgress||rescueInProgress||playerHomeState.transitioning);i++)await page.clock.runFor(120);
    assert.equal(await page.evaluate(()=>forageDiscoveryInProgress||rescueInProgress||playerHomeState.transitioning),false);
   }
   for(const direction of route.path){
    await fieldReady();const old=await page.evaluate(()=>({x:s.x,y:s.y}));
    await press('[data-move="'+direction+'"]');await page.clock.runFor(120);
    const next=await page.evaluate(()=>({x:s.x,y:s.y}));
    assert.ok(old.x!==next.x||old.y!==next.y,'native field input '+direction+' '+JSON.stringify({old,next}));
   }
   await fieldReady();assert.deepEqual(await page.evaluate(()=>({x:s.x,y:s.y,direction:s.direction})),{x:route.x,y:route.y,direction:route.direction});
   assert.equal(await page.evaluate(()=>Boolean(fishingWaterNearPlayer())),true);await press('#action');
   assert.equal(await page.evaluate(()=>battle?.phase),'prep');await press('#wait');await press('#beginCast');
   const spot=wet?'mountain-wetMarsh-mid':'lake-deep',distance=wet?50:95;
   await page.evaluate(({id,spot,distance})=>{let roll=null;for(let n=0;n<10000;n++){Math.random=()=>(n+.5)/10000;if(pick(distance,spot)?.id===id){roll=(n+.5)/10000;break;}}
    if(roll===null)throw Error('No legal encounter: '+id);Math.random=()=>roll;battle.cast=distance;},{id,spot,distance});
   // Native cast/hook inputs spend bait through the normal game code.
   await press('#pull');for(let i=0;i<30&&await page.evaluate(()=>battle?.phase==='cast-flight');i++)await page.clock.runFor(120);
   assert.equal(await page.evaluate(()=>battle.f.id),id);
   await page.evaluate(()=>{battle.specimen=rollFishSpecimen(battle.f,()=>.999999);battle.specimenVisualScale=fishVisualScale(battle.specimen);window.v228Rng=301;
    Math.random=()=>((window.v228Rng=Math.imul(window.v228Rng,1664525)+1013904223>>>0)/4294967296);});
   const size=await page.evaluate(()=>battle.specimen.cmText);
   for(let i=0;i<100&&await page.evaluate(()=>battle?.phase!=='bite');i++)await page.clock.runFor(120);
   assert.equal(await page.evaluate(()=>battle.phase),'bite');await press('#pull');assert.equal(await page.evaluate(()=>battle.phase),'fight');
   await page.clock.runFor(120);
   const bounds=await page.locator('#pull').boundingBox();assert.ok(bounds&&bounds.x>=0&&bounds.y>=0);
   button={x:bounds.x+bounds.width/2,y:bounds.y+bounds.height/2};
   const observed=new Set(),queue=[];let wishBefore=null,seconds=0,warningCount=0,oldPhase=null;
   const inputDelay=mode==='nushi'?600:0;
   for(let tick=0;tick<7500;tick++){
    const ui=await page.evaluate(()=>({fight:battle?.phase,phase:document.querySelector('#fishScene').dataset.nushiPhase,
     leap:document.querySelector('#fishScene').classList.contains('gill-wash'),ten:parseFloat(document.querySelector('#ten').style.width)}));
    if(ui.fight!=='fight')break;
    const wish=(mode==='nushi'?(ui.phase==='slack'||ui.phase==='pulling')&&ui.ten<65:ui.ten<65)&&!ui.leap;
    if(wish!==wishBefore){queue.push({at:tick*120+inputDelay,value:wish});wishBefore=wish;}
    while(queue.length&&queue[0].at<=tick*120)await setHeld(queue.shift().value);
    if(mode==='nushi'&&ui.phase==='warning'&&oldPhase!=='warning')warningCount++;
    if(mode==='nushi'&&id==='namazu'&&!observed.has(ui.phase)&&['slack','pulling','warning'].includes(ui.phase)){
     observed.add(ui.phase);await shot(ui.phase);
     if(ui.phase==='warning')assert.equal(await page.locator('#linePath').evaluate(e=>getComputedStyle(e).stroke),'rgb(233, 182, 93)');
    }
    oldPhase=ui.phase;await page.clock.runFor(120);seconds=(tick+1)*.12;
   }
   assert.equal(await page.evaluate(()=>battle?.phase),'landing',id+' natural landing');await setHeld(false);await page.clock.runFor(2000);
   const outcome=await page.evaluate(({id,bait,key})=>({caught:s.caught[id],bait:s.baits[bait],saved:JSON.parse(localStorage.getItem(key)).caught[id],giant:s.fishCrowns[id]?.giant}),{id,bait,key:saveKey});
   assert.equal(outcome.caught,1);assert.equal(outcome.saved,1);assert.equal(outcome.bait,19);
   assert.equal(outcome.giant,true);
   if(mode==='nushi')assert.ok(warningCount>0);if(id==='namazu'&&mode==='nushi')assert.deepEqual([...observed].sort(),['pulling','slack','warning']);
   assert.equal(await page.locator('#catchCard').evaluate(e=>e.classList.contains('show')),true);
   await shot('caught');await page.reload({waitUntil:'load'});await press('#start');await page.clock.runFor(240);
   assert.equal(await page.evaluate(id=>s.caught[id],id),1);assert.deepEqual(errors,[]);assert.deepEqual(failed,[]);
   console.log('V228_BROWSER_FIGHT_PASS '+JSON.stringify({mobile,id,mode,size,inputDelay,seconds,warningCount,...outcome,savedAfterReload:true,errors,failed}));
  }finally{await context.close();}
 }}finally{await browser.close();}
};
