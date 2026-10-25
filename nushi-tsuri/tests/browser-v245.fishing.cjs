const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),{chromium}=require('playwright');
const {seed,saveKey}=require('./game-harness.cjs');

module.exports=async function fishingSpec(url,mobile=false,options={}){
 const viewport=options.viewport||(mobile?{width:844,height:390}:{width:1280,height:720});
 const directory=path.join(__dirname,'browser-evidence-v245');fs.mkdirSync(directory,{recursive:true});
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
   await page.goto(url,{waitUntil:'load'});await require('./browser-start-adventure.cjs')(page,mobile);await page.clock.runFor(240);
   if(await page.locator('#lakeIntroSkip').isVisible()){await press('#lakeIntroSkip');await page.clock.runFor(240);}
   assert.match(await page.locator('.hud').innerText(),/v251/);
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
   await page.evaluate(async()=>{
    const source=document.querySelector('#underwaterPixels');
    await ShuScenery.paint(source,`underwater-${battle.waterZone}-${battle.depth}-${battle.f?.id==='hirame'}`,gameSceneryEnvironment());
   });
   await page.clock.runFor(120);
   // This down/up pair completes with no simulation tick between the events.
   await press('#pull');await page.clock.runFor(180);assert.ok(await value('battle.lureMotion.travel')>0);
   assert.ok(await value('battle.underwaterCamera.offset')<0,'winding the spoon moves the background towards shore');
   assert.equal(await page.locator('#underwaterTravel').isVisible(),true);
   assert.equal(await page.locator('#underwaterTravel').getAttribute('data-scenery'),mode==='nushi'?'open-water':'gauge');
   if(!mobile&&mode==='gauge'){
    await page.emulateMedia({reducedMotion:'reduce'});await page.clock.runFor(80);
    assert.equal(await page.locator('#underwaterTravel').isVisible(),false);
    assert.equal(await page.locator('#underwaterPixels').evaluate(el=>getComputedStyle(el).opacity),'1');
    await page.emulateMedia({reducedMotion:'no-preference'});await page.clock.runFor(80);
    assert.equal(await page.locator('#underwaterTravel').isVisible(),true);
   }
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
   const shownAge=await value('Date.now()-battle.biteShownAt'),cameraShown=await page.locator('#underwaterTravel').getAttribute('data-offset');
   await page.evaluate(()=>window.dispatchEvent(new Event('blur')));
   await page.clock.fastForward(60000);await page.evaluate(()=>window.dispatchEvent(new Event('focus')));
   assert.equal(await page.locator('#underwaterTravel').getAttribute('data-offset'),cameraShown,'the background freezes while the app is behind another app');
   assert.equal(await value('Date.now()-battle.biteShownAt'),shownAge);assert.equal(await value('battle.phase'),'bite');
   const cameraAtHook=await value('battle.underwaterCamera.offset');
   await press('#pull');assert.equal(await value('battle.phase'),'fight');assert.equal(await value('battle.reeling'),false);
   assert.equal(await value('battle.underwaterCamera.offset'),cameraAtHook,'the same camera carries through a lure hook without resetting');
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
   if(mode==='nushi'){
    assert.equal(await page.locator('#battleUi').isVisible(),false);
    assert.equal(await page.locator('#nushiCue').isVisible(),true);
    assert.equal(await page.locator('#ten').isVisible(),false);
   }else assert.equal(await page.locator('#battleUi').isVisible(),true);
   const seen=new Set(),queue=[];let oldWish=null,last=null,seconds=0,rightwardTicks=0;
   let runTravel=0,pullTravel=0,pullOpened=null,longestPullMs=0;
   for(let tick=0;tick<3000;tick++){
    const ui=await page.evaluate(()=>({fight:battle?.phase,phase:document.querySelector('#fishScene').dataset.nushiPhase,
     leap:document.querySelector('#fishScene').classList.contains('gill-wash'),ten:document.querySelector('#fishScene').classList.contains('duel-nushi')?null:parseFloat(document.querySelector('#ten').style.width),x:parseFloat(document.querySelector('#battleFish').style.left),
     right:document.querySelector('#battleFish').getBoundingClientRect().right,edge:document.querySelector('#fishScene').getBoundingClientRect().right,
     bottom:document.querySelector('#battleFish').getBoundingClientRect().bottom,controls:document.querySelector('.battle-actions').getBoundingClientRect().top,
     now:Date.now(),camera:battle?.underwaterCamera?.offset||0}));
    if(ui.fight!=='fight')break;
    if(ui.phase==='pulling'){
     pullOpened??=ui.now;longestPullMs=Math.max(longestPullMs,ui.now-pullOpened);
    }else pullOpened=null;
    if(last&&ui.phase===last.phase){
     if(ui.phase==='running')runTravel+=Math.max(0,ui.camera-last.camera);
     if(mode==='gauge'||ui.phase==='pulling')pullTravel+=Math.min(0,ui.camera-last.camera);
    }
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
    const wish=(mode==='nushi'?(ui.phase==='slack'||ui.phase==='pulling'):ui.ten<65)&&!ui.leap;
    if(wish!==oldWish){queue.push({at:tick*120+(mode==='nushi'?600:0),wish});oldWish=wish;}
    while(queue.length&&queue[0].at<=tick*120)await hold(queue.shift().wish);
    if(mode==='nushi'&&!seen.has(ui.phase)&&['slack','pulling','warning'].includes(ui.phase)){
     seen.add(ui.phase);await shot(ui.phase);
     if(ui.phase==='warning'){
      const first=await page.locator('#battleFish').getAttribute('data-sprite-frame');
      await page.clock.runFor(64);assert.equal(await page.locator('#battleFish').getAttribute('data-resisting'),'true');
      assert.notEqual(await page.locator('#battleFish').getAttribute('data-sprite-frame'),first,'authored head-shake frames move visibly');
     }
     assert.equal(await page.locator('#linePath').evaluate(n=>n.classList.contains('slack')),ui.phase==='slack');
    }
    last=ui;await page.clock.runFor(120);seconds=(tick+1)*.12;
   }
   assert.equal(await value('battle?.phase'),'landing','native inputs land the fish');await hold(false);await page.clock.runFor(2000);await shot('caught');
   const after=await snapshot();assert.equal(after.caught.himemasu,(before.caught.himemasu||0)+1);assert.deepEqual(after.baits,before.baits);assert.deepEqual(after.lures,before.lures);assert.equal(after.time-before.time,10);
   const memory=await page.evaluate(()=>s.catchMemories.himemasu.first);assert.equal(memory.method,'lure');assert.equal(memory.baitId,'silverSpoon');assert.equal(memory.fightMode,mode);
   assert.ok(pullTravel<-.01,'retrieving a hooked fish scrolls the water in the return direction');
   if(mode==='nushi'){
    assert.deepEqual([...seen].sort(),['pulling','slack','warning']);assert.ok(rightwardTicks>0);
    assert.ok(runTravel>.01,'escaping fish scroll the water in the opposite direction');
    assert.ok(longestPullMs>=1400,'the randomized opening provides a useful pull after a 600 ms response');
   }
   await page.reload({waitUntil:'load'});await require('./browser-start-adventure.cjs')(page,mobile);await page.clock.runFor(240);assert.deepEqual(await snapshot(),after);
   assert.equal(await value('s.fightMode'),mode);assert.equal(await value('s.fishingMethod'),'lure');assert.deepEqual(errors,[]);assert.deepEqual(failed,[]);
   // A second natural hook: ignoring the running fish must actually break.
   if(mode==='nushi'){
    await page.evaluate(()=>hideFieldMenu());const beforeLoss=await snapshot();await openTackle();await press('#beginCast');
    await page.evaluate(()=>{battle.cast=50;const spot='mountain-'+battle.mountainType+'-mid';for(let i=0;i<10000;i++){const r=(i+.5)/10000;Math.random=()=>r;if(pick(50,spot)?.id==='himemasu')return;}throw Error('encounter');});
    await press('#pull');await finishCast();
    await page.evaluate(()=>{window.v245Rng=907;Math.random=()=>((window.v245Rng=Math.imul(window.v245Rng,1664525)+1013904223>>>0)/4294967296);});
    for(let i=0;i<18&&await value('battle.phase')==='lure';i++){await press('#pull');await page.clock.runFor(480);}
    for(let i=0;i<20&&await value('battle.phase')==='interest';i++)await page.clock.runFor(120);
    assert.equal(await value('battle.phase'),'bite');await press('#pull');assert.equal(await value('battle.phase'),'fight');
    const resistOnly=mobile&&viewport.width===844;
    const unsafeStart=resistOnly?'slack':'running';
    for(let i=0;i<100&&await page.locator('#fishScene').getAttribute('data-nushi-phase')!==unsafeStart;i++)await page.clock.runFor(120);
    assert.equal(await page.locator('#fishScene').getAttribute('data-nushi-phase'),unsafeStart);
    await hold(true);let lastUnsafePhase=null;
    for(let i=0;i<120&&await value('battle?.phase')==='fight';i++){
     lastUnsafePhase=await page.locator('#fishScene').getAttribute('data-nushi-phase');await page.clock.runFor(120);
    }
    await hold(false);assert.equal(await value('battle?.phase'),'escape','holding through resistance or escape breaks the line into the follow-camera scene');
    assert.equal(lastUnsafePhase,resistOnly?'warning':'running','the line breaks during the visible unsafe action');
    assert.match(await value('s.log[0]'),/糸が切れた/);
    const escapedIndividual=await value('JSON.stringify([battle.f.id,battle.specimen])');
    assert.equal(await page.locator('#linePath').getAttribute('d'),'');
    assert.equal(await page.locator('#fishTackleFront').isVisible(),false);
    assert.equal(await page.locator('#pull').isVisible(),false);
    assert.equal(await page.locator('#hint').isVisible(),false,'the field fishing instructions stay out of the escape scene');
    const atBreak=await value('battle.underwaterCamera.offset');
    await page.clock.runFor(720);assert.equal(await value('battle?.phase'),'escape');
    assert.equal(await page.locator('#fishEscapeCaption').innerText(),'魚は元気よく泳いで行った');
    await shot('line-break-follow');
    assert.equal(await value('JSON.stringify([battle.f.id,battle.specimen])'),escapedIndividual);
    assert.ok(await value('battle.underwaterCamera.offset')>atBreak,'camera follows the swimming fish after the line is gone');
    const tail=await page.locator('#battleFish').getAttribute('data-art-swim-frame');
    await page.clock.runFor(120);assert.notEqual(await page.locator('#battleFish').getAttribute('data-art-swim-frame'),tail,'the escaped fish still swims energetically');
    // Enable through the real sound button. Muting, blur and returning may
    // play only the remaining part of this one cue, never a queued old one.
    if(!mobile){
     await press('#soundToggle');await page.waitForTimeout(40);
     assert.equal(await value('gameAudio.context.state'),'running');
     assert.ok(await value('fishEscapeJingle.stats().sessions')>=1);
     assert.ok(await value('fishEscapeJingle.stats().voices')>0);
     await press('#soundToggle');assert.equal(await value('fishEscapeJingle.stats().voices'),0);
     await press('#soundToggle');await page.waitForTimeout(40);
    }
    const frozen=await value('JSON.stringify([battle.fishEscape.elapsed,battle.x,battle.y,battle.underwaterCamera.offset])');
    await page.evaluate(()=>window.dispatchEvent(new Event('blur')));assert.equal(await value('fishEscapeJingle.stats().voices'),0);
    await page.clock.fastForward(60000);assert.equal(await value('JSON.stringify([battle.fishEscape.elapsed,battle.x,battle.y,battle.underwaterCamera.offset])'),frozen);
    await page.evaluate(()=>window.dispatchEvent(new Event('focus')));await page.waitForTimeout(40);
    await page.clock.runFor(120);assert.equal(await value('battle?.phase'),'escape','a background pause cannot consume the escape scene');
    if(!mobile){await press('#soundToggle');assert.equal(await value('fishEscapeJingle.stats().voices'),0);}
    await page.clock.runFor(5000);assert.equal(await value('battle'),null);
    assert.equal(await page.locator('#fishEscapeCaption').isVisible(),false);assert.equal(await value('fishEscapeJingle.stats().voices'),0);
    assert.equal(await page.locator('#fishScene').evaluate(n=>n.classList.contains('line-broken')),false);
    const lost=await snapshot();assert.deepEqual(lost.caught,beforeLoss.caught);assert.deepEqual(lost.baits,beforeLoss.baits);assert.deepEqual(lost.lures,beforeLoss.lures);assert.equal(lost.time-beforeLoss.time,10);
    assert.deepEqual(errors,[]);assert.deepEqual(failed,[]);
   }
   console.log('V245_FISHING_SPEC_PASS '+JSON.stringify({mobile,viewport,dpr:options.dpr||1,mode,seconds,shortTaps:true,visibleBiteWindow:true,pausedBite:true,sameIndividual:true,rightwardTicks,runTravel,pullTravel,longestPullMs,scrolling:true,noTensionWindow:mode==='nushi',visibleHeadShake:mode==='nushi',unsafePullBreaks:mode==='nushi',escapeCamera:mode==='nushi',escapeTelop:mode==='nushi',escapePause:mode==='nushi',jingleMute:!mobile&&mode==='nushi',oneCast:true,reload:true,errors,failed}));
  }catch(e){await page.screenshot({path:path.join(directory,(mobile?'touch':'pc')+'-'+viewport.width+'x'+viewport.height+'-'+mode+'-failure.png')}).catch(()=>{});throw e;}
  finally{await context.close();}
 }}finally{await browser.close();}
};
