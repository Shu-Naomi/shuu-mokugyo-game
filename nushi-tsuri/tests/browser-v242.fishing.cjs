const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),{chromium}=require('playwright');
const {seed,saveKey}=require('./game-harness.cjs');

module.exports=async function fishingSpec(url,mobile=false,options={}){
 const viewport=options.viewport||(mobile?{width:844,height:390}:{width:1280,height:720});
 const directory=path.join(__dirname,'browser-evidence-v242');fs.mkdirSync(directory,{recursive:true});
 const browser=await chromium.launch({headless:true});
 try{for(const mode of ['gauge','nushi']){
  const context=await browser.newContext({viewport,deviceScaleFactor:options.dpr||1,isMobile:mobile,hasTouch:mobile,locale:'ja-JP',serviceWorkers:'block'});
  const initial={...seed(),mapRegion:'mountainPond',x:120,y:109,direction:'up',hp:100,soundEnabled:false,gameMinutes:600,
   ownedRods:['bamboo','tideMaster','lureRod'],selectedRod:'tideMaster',fishingMethod:'bait',fightMode:'gauge',baits:{worm:10,river:10},lures:{silverSpoon:1}};
  await context.addInitScript(({key,state})=>{localStorage.setItem('nushi-inugoya-options-v1',JSON.stringify({textSpeed:'instant'}));if(!localStorage.getItem(key))localStorage.setItem(key,JSON.stringify(state));},{key:saveKey,state:initial});
  const page=await context.newPage(),errors=[],failed=[],cdp=mobile?await context.newCDPSession(page):null;
  page.on('pageerror',e=>errors.push(e.message));page.on('response',r=>{if(r.status()>=400)failed.push(r.status()+' '+new URL(r.url()).pathname);});
  const press=q=>page.locator(q)[mobile?'tap':'click'](),value=expression=>page.evaluate(expression);
  const snapshot=()=>page.evaluate(()=>JSON.parse(JSON.stringify({baits:s.baits,lures:s.lures,time:s.gameMinutes,caught:s.caught,money:s.money})));
  const shot=async name=>{await page.evaluate(()=>hideFieldMenu());await page.screenshot({path:path.join(directory,(mobile?'touch':'pc')+'-'+viewport.width+'x'+viewport.height+'-'+mode+'-'+name+'.png')});};
  async function finishCast(){for(let i=0;i<40&&await value('battle?.phase')==='cast-flight';i++)await page.clock.runFor(40);}
  async function openTackle(){await press('#action');assert.equal(await value('battle?.phase'),'prep');await press('#wait');await page.locator('#tackle.open').waitFor();}
  try{
   await page.clock.install({time:new Date('2026-10-19T00:00:00Z')});await page.clock.pauseAt('2026-10-19T00:00:01Z');
   await page.goto(url,{waitUntil:'load'});await press('#start');await page.clock.runFor(240);
   if(await page.locator('#lakeIntroSkip').isVisible()){await press('#lakeIntroSkip');await page.clock.runFor(240);}
   assert.match(await page.locator('.hud').innerText(),/v242/);
   if(mode==='gauge'){
    // A stalled real timer must first show the bite, then give its full window.
    const old=await snapshot();await openTackle();await press('#beginCast');await page.evaluate(()=>battle.cast=50);await press('#pull');await finishCast();
    assert.equal(await value('battle.phase'),'wait');await page.clock.fastForward(40000);assert.equal(await value('battle?.phase'),'bite');
    await page.clock.runFor(1440);assert.equal(await value('battle?.phase'),'bite');await page.clock.runFor(240);assert.equal(await value('battle'),null);
    const after=await snapshot();assert.equal(after.baits.worm,old.baits.worm-1);assert.equal(after.time-old.time,10);assert.deepEqual(after.caught,old.caught);
    await page.evaluate(()=>hideFieldMenu());
   }
   const before=await snapshot();await openTackle();
   await press('#tackle [data-cast-tackle="method"]');await press('#tackle [data-fishing-method="lure"]');
   await press('#tackle [data-cast-tackle="fight"]');await press('#tackle [data-fight-mode="'+mode+'"]');await press('#beginCast');
   assert.equal(await value('battle.fightMode'),mode);assert.equal(await value('battle.method'),'lure');
   await page.evaluate(()=>{battle.cast=50;const spot='mountain-'+battle.mountainType+'-mid';window.v242Random=Math.random;
    for(let i=0;i<10000;i++){const roll=(i+.5)/10000;Math.random=()=>roll;if(pick(50,spot)?.id==='himemasu')return;}
    throw Error('no legal spoon encounter for himemasu');});
   await press('#pull');await finishCast();assert.equal(await value('battle.phase'),'lure');
   await page.evaluate(()=>{window.v242Rng=301;Math.random=()=>((window.v242Rng=Math.imul(window.v242Rng,1664525)+1013904223>>>0)/4294967296);});
   assert.match(await page.locator('#distanceLabel').innerText(),/20m/);
   // This down/up pair completes with no simulation tick between the events.
   await press('#pull');await page.clock.runFor(120);assert.ok(await value('battle.lureMotion.travel')>0);
   for(let i=0;i<12&&await value('battle.phase')==='lure';i++){
    await page.clock.runFor(360);if(await value('battle.phase')!=='lure')break;
    await press('#pull');await page.clock.runFor(120);
   }
   assert.equal(await value('battle.phase'),'interest');assert.equal(await value('battle.f.id'),'himemasu');
   await page.evaluate(async()=>{await Promise.all(ShuFishArt.assets(battle.f.id).map(src=>fishAtlasImage(src).decode()));renderBattleFish();});
   const individual=await page.evaluate(()=>JSON.stringify([battle.f.id,battle.specimen]));await shot('interested-fish');
   for(let i=0;i<20&&await value('battle.phase')==='interest';i++)await page.clock.runFor(120);
   assert.equal(await value('battle.phase'),'bite');assert.match(await page.locator('#pull').innerText(),/アワセ/);await shot('bite');
   const remaining=Number((await page.locator('#distanceLabel').innerText()).match(/\d+/)[0]);
   const shownAge=await value('Date.now()-battle.biteShownAt');await page.evaluate(()=>window.dispatchEvent(new Event('blur')));
   await page.clock.fastForward(60000);await page.evaluate(()=>window.dispatchEvent(new Event('focus')));
   assert.equal(await value('Date.now()-battle.biteShownAt'),shownAge);assert.equal(await value('battle.phase'),'bite');
   await press('#pull');assert.equal(await value('battle.phase'),'fight');assert.equal(await value('battle.reeling'),false);
   assert.equal(await page.locator('#castSurface').isVisible(),false,'hooking a lure fish never brings the shore view back');
   assert.ok(await page.locator('#battleFish').evaluate(el=>Number(getComputedStyle(el).opacity)>.9),'the fish remains visible through the hook set');
   assert.equal(await page.evaluate(()=>JSON.stringify([battle.f.id,battle.specimen])),individual);
   assert.equal(Number((await page.locator('#distanceLabel').innerText()).match(/\d+/)[0]),remaining);
   const boxes=await page.locator('#pull,#wait').evaluateAll(nodes=>nodes.map(n=>{const r=n.getBoundingClientRect();return {inside:r.left>=0&&r.right<=innerWidth+1&&r.top>=0&&r.bottom<=innerHeight+1,w:r.width,h:r.height};}));
   assert.ok(boxes.every(b=>b.inside&&b.w>=44&&b.h>=44));
   const box=await page.locator('#pull').boundingBox(),button={x:box.x+box.width/2,y:box.y+box.height/2};
   let held=false;
   async function hold(next){if(next===held)return;if(mobile)await cdp.send('Input.dispatchTouchEvent',{type:next?'touchStart':'touchEnd',touchPoints:next?[{...button,id:1}]:[]});
    else if(next){await page.mouse.move(button.x,button.y);await page.mouse.down();}else await page.mouse.up();held=next;}
   const seen=new Set(),queue=[];let oldWish=null,last=null,seconds=0,rightwardTicks=0;
   for(let tick=0;tick<3000;tick++){
    const ui=await page.evaluate(()=>({fight:battle?.phase,phase:document.querySelector('#fishScene').dataset.nushiPhase,
     leap:document.querySelector('#fishScene').classList.contains('gill-wash'),ten:parseFloat(document.querySelector('#ten').style.width),x:parseFloat(document.querySelector('#battleFish').style.left),
     right:document.querySelector('#battleFish').getBoundingClientRect().right,edge:document.querySelector('#fishScene').getBoundingClientRect().right,
     bottom:document.querySelector('#battleFish').getBoundingClientRect().bottom,controls:document.querySelector('.battle-actions').getBoundingClientRect().top}));
    if(ui.fight!=='fight')break;
    if(mode==='nushi'&&ui.phase==='running'&&last?.phase==='running'&&!ui.leap&&!last.leap){assert.ok(ui.x>=last.x-.02,'escape must move right');rightwardTicks++;}
    if(mode==='nushi'&&!ui.leap)assert.ok(ui.right<=ui.edge+1,'the fish remains visible at the right edge');
    if(!ui.leap)assert.ok(ui.bottom<=ui.controls+1,'the fish remains above the action buttons');
    if(tick%7===0){
     await page.evaluate(()=>{window.v242LineGap=null;requestAnimationFrame(()=>{
      if(battle?.phase!=='fight'){window.v242LineGap=0;return;}
      const line=document.querySelector('#linePath'),p=line.getPointAtLength(line.getTotalLength());
      const eye=document.querySelector('#fishTackleBack .hook-eye'),point=new DOMPoint(eye.cx.baseVal.value,eye.cy.baseVal.value).matrixTransform(eye.getScreenCTM()),end=new DOMPoint(p.x,p.y).matrixTransform(line.getScreenCTM());
      window.v242LineGap=Math.hypot(end.x-point.x,end.y-point.y);
     });});
     await page.clock.runFor(20);const gap=await value('window.v242LineGap');assert.notEqual(gap,null);
     assert.ok(gap<2,`the line and visible hook eye stay joined (${gap}px at tick ${tick})`);
    }
    const wish=(mode==='nushi'?(ui.phase==='slack'||ui.phase==='pulling')&&ui.ten<65:ui.ten<65)&&!ui.leap;
    if(wish!==oldWish){queue.push({at:tick*120+(mode==='nushi'?600:0),wish});oldWish=wish;}
    while(queue.length&&queue[0].at<=tick*120)await hold(queue.shift().wish);
    if(mode==='nushi'&&!seen.has(ui.phase)&&['slack','pulling','warning'].includes(ui.phase)){
     seen.add(ui.phase);await shot(ui.phase);assert.equal(await page.locator('#linePath').evaluate(n=>n.classList.contains('slack')),ui.phase==='slack');
    }
    last=ui;await page.clock.runFor(120);seconds=(tick+1)*.12;
   }
   assert.equal(await value('battle?.phase'),'landing','native inputs land the fish');await hold(false);await page.clock.runFor(2000);await shot('caught');
   const after=await snapshot();assert.equal(after.caught.himemasu,(before.caught.himemasu||0)+1);assert.deepEqual(after.baits,before.baits);assert.deepEqual(after.lures,before.lures);assert.equal(after.time-before.time,10);
   const memory=await page.evaluate(()=>s.catchMemories.himemasu.first);assert.equal(memory.method,'lure');assert.equal(memory.baitId,'silverSpoon');assert.equal(memory.fightMode,mode);
   if(mode==='nushi'){assert.deepEqual([...seen].sort(),['pulling','slack','warning']);assert.ok(rightwardTicks>0);}
   await page.reload({waitUntil:'load'});await press('#start');await page.clock.runFor(240);assert.deepEqual(await snapshot(),after);
   assert.equal(await value('s.fightMode'),mode);assert.equal(await value('s.fishingMethod'),'lure');assert.deepEqual(errors,[]);assert.deepEqual(failed,[]);
   console.log('V242_FISHING_SPEC_PASS '+JSON.stringify({mobile,viewport,dpr:options.dpr||1,mode,seconds,shortTaps:true,visibleBiteWindow:true,pausedBite:true,sameIndividual:true,rightwardTicks,oneCast:true,reload:true,errors,failed}));
  }catch(e){await page.screenshot({path:path.join(directory,(mobile?'touch':'pc')+'-'+viewport.width+'x'+viewport.height+'-'+mode+'-failure.png')}).catch(()=>{});throw e;}
  finally{await context.close();}
 }}finally{await browser.close();}
};
