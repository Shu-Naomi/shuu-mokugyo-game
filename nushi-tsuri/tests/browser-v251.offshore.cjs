const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),{chromium}=require('playwright');
const {seed,saveKey}=require('./game-harness.cjs'),I=require('../offshore-island.js'),collision=require('./offshore-collision-fixture.cjs');
module.exports=async function offshore(url,mobile=false,options={}){
 const viewport=options.viewport||(mobile?{width:844,height:390}:{width:1280,height:720}),directory=path.join(__dirname,'browser-evidence-v251');fs.mkdirSync(directory,{recursive:true});
 const browser=await chromium.launch({headless:true}),context=await browser.newContext({viewport,isMobile:mobile,hasTouch:mobile,deviceScaleFactor:options.dpr||1,locale:'ja-JP',serviceWorkers:'block'});
 const initial={...seed(),...I.harbor,money:30000,hp:100,maxHp:100,gameMinutes:600,soundEnabled:false,ownedRods:['bamboo','tideMaster'],selectedRod:'tideMaster',fightMode:'nushi',baits:{smallShrimp:12,shell:12,shrimp:12}};
 await context.addInitScript(({key,state})=>{if(!localStorage.getItem(key))localStorage.setItem(key,JSON.stringify(state));localStorage.setItem('nushi-inugoya-options-v1',JSON.stringify({textSpeed:'instant'}));},{key:saveKey,state:initial});
 const page=await context.newPage(),cdp=mobile?await context.newCDPSession(page):null,errors=[],failed=[],results=[];
 page.on('pageerror',e=>errors.push(e.message));page.on('response',r=>{if(r.status()>=400)failed.push(r.status()+' '+new URL(r.url()).pathname);});
 const press=q=>page.locator(q)[mobile?'tap':'click'](),value=q=>page.evaluate(q=>{const v=eval(q);return v===undefined?null:JSON.parse(JSON.stringify(v));},q);
 const shot=async name=>{
  // The virtual gameplay clock does not finish CSS movement transitions.
  // Capture the settled foot position rather than a frame still sliding
  // from the previous location while the camera has already moved.
  await page.locator('#player').evaluate(n=>Promise.all(n.getAnimations().filter(a=>Number.isFinite(a.effect?.getComputedTiming().endTime)).map(a=>a.finished.catch(()=>{}))));
  return page.screenshot({path:path.join(directory,(options.public?'public-':'local-')+viewport.width+'x'+viewport.height+'-'+name+'.png')});
 };
 const snapshot=()=>value('({region:s.mapRegion,x:s.x,y:s.y,direction:s.direction,money:s.money,time:s.gameMinutes,hp:s.hp,caught:s.caught,records:s.fishCatchRecords,memories:s.catchMemories,baits:s.baits,equipment:s.equipment,pet:s.petLife})');
 let held=false,button,walked=0,lastFightTrace=[];
 async function hold(on){if(on===held)return;if(mobile)await cdp.send('Input.dispatchTouchEvent',{type:on?'touchStart':'touchEnd',touchPoints:on?[{x:button.x,y:button.y,id:1}]:[]});else if(on){await page.mouse.move(button.x,button.y);await page.mouse.down();}else await page.mouse.up();held=on;}
 async function start(){await require('./browser-start-adventure.cjs')(page,mobile);await page.clock.runFor(240);if(await page.locator('#lakeIntroSkip').isVisible()){await press('#lakeIntroSkip');await page.clock.runFor(240);}assert.match(await page.locator('.hud').innerText(),/v251/);}
 async function fitFerry(){const result=await page.locator('.ferry-window').evaluate(n=>{const r=n.getBoundingClientRect();return {inside:r.left>=0&&r.top>=0&&r.right<=innerWidth+1&&r.bottom<=innerHeight+1,scroll:n.scrollHeight-n.clientHeight,buttons:[...n.querySelectorAll('button')].every(b=>{const q=b.getBoundingClientRect();return q.width>=44&&q.height>=44&&q.top>=r.top&&q.bottom<=r.bottom+1;})};});assert.ok(result.inside&&result.buttons&&result.scroll<=1,JSON.stringify(result));}
 async function walkTo(target){
  // Plan from the shipped collision function; execute every step through
  // actual directional buttons. Never assign the player's map or position.
  const route=await page.evaluate(target=>{
   const radius=target.radius||3,fishingArea=Object.hasOwn(ShuOffshore.names,target.id),key=p=>`${p.x},${p.y},${p.d}`,first={x:s.x,y:s.y,d:s.direction,path:[]},queue=[first],seen=new Set([key(first)]);
   for(let i=0;i<queue.length;i++){const p=queue[i];if(Math.hypot(p.x-target.x,p.y-target.y)<=radius&&(!target.direction||p.d===target.direction)&&(!fishingArea||ShuOffshore.fishingWater(p.x,p.y,p.d)?.type===target.id))return p.path;
    for(const d of ['left','right','up','down']){const n={...ShuWorldLife.moveTarget(p.x,p.y,d,4,ShuOffshore.walkable),d},k=key(n);if(!seen.has(k)){seen.add(k);queue.push({...n,path:[...p.path,d]});}}
   }throw Error('No island path '+JSON.stringify(target));
  },target);
  for(const d of route){const expected=await page.evaluate(d=>ShuWorldLife.moveTarget(s.x,s.y,d,4,ShuOffshore.walkable),d);await press('[data-move="'+d+'"]');await page.clock.runFor(50);assert.deepEqual(await value('({x:s.x,y:s.y})'),expected,'actual directional movement '+d);walked++;}
  assert.equal(await value('s.mapRegion'),'offshore');assert.ok(await page.evaluate(t=>Math.hypot(s.x-t.x,s.y-t.y)<=(t.radius||3),target));await page.clock.runFor(400);
 }
 try{
  await page.clock.install({time:new Date('2026-10-22T03:00:00Z')});await page.clock.pauseAt('2026-10-22T03:00:01Z');await page.goto(url,{waitUntil:'domcontentloaded',timeout:90000});await start();
  assert.equal(await value('s.equipment.vehicle'),null);const original=await snapshot();await press('#action');await fitFerry();await shot('harbor-fare');await press('#offshoreFerryCancel');assert.deepEqual(await snapshot(),original);
  await press('#action');await press('#offshoreFerryGo');assert.equal(await value('s.mapRegion'),'offshore');assert.equal(await value('s.money'),original.money-800);assert.equal(await value('s.gameMinutes'),original.time+60);assert.equal(await value('s.boatActive'),false);
  await page.waitForFunction(()=>{const p=document.querySelector('#offshorePixels').getContext('2d').getImageData(0,0,1672,941).data;return p[0]!==20||p[1]!==92||p[2]!==124;});await shot('island-arrival');
  for(const [x,y]of collision.blocked)assert.equal(await page.evaluate(([x,y])=>ShuOffshore.walkable(x,y),[x,y]),false,'blocked terrain '+x+','+y);
  for(const target of collision.floors){await walkTo(target);if(['beach-middle','quay-right','east-low-path','lighthouse-west','reported-road','wide-west-reported','wide-west-inner-lane','wide-west-lower-lane','upper-west-reported','junction-reported','forecourt-wide-lane'].includes(target.id))await shot('floor-'+target.id);}
  for(const trace of collision.transits){
   await walkTo({...trace.from,id:trace.id,radius:.4});assert.deepEqual(await value('({x:s.x,y:s.y})'),trace.from);const before=await snapshot();await shot('transit-'+trace.id+'-before');
   for(const [direction,x,y]of trace.steps){await press('[data-move="'+direction+'"]');await page.clock.runFor(50);walked++;assert.deepEqual(await value('({x:s.x,y:s.y})'),{x,y},trace.id+' fixed crossing '+direction);}
   const after=await snapshot();for(const key of ['money','hp','time','baits','caught'])assert.deepEqual(after[key],before[key],trace.id+' '+key);await shot('transit-'+trace.id+'-after');
  }
  for(const edge of collision.verges){
   await walkTo({id:edge.id,x:edge.x,y:edge.y,radius:.4});
   for(let n=0;n<5;n++){
    await press('[data-move="'+edge.direction+'"]');await page.clock.runFor(50);walked++;
    const at=await value('({x:s.x,y:s.y})');
    if(edge.min!==undefined)assert.ok(at[edge.axis]>=edge.min,edge.id+' northern/western boundary');
    if(edge.max!==undefined)assert.ok(at[edge.axis]<=edge.max,edge.id+' southern boundary');
    assert.notDeepEqual(at,{x:edge.blocked[0],y:edge.blocked[1]},edge.id+' blocked ground');
   }
   if(['reported-bushes','western-forest','lighthouse-rock','wide-west-forest-edge','upper-west-lower-fence','upper-west-left-fence','junction-branch'].includes(edge.id))await shot('verge-'+edge.id);
  }
  await walkTo(I.rest);await shot('rest-shelter');await walkTo(I.lighthouse);await shot('lighthouse');
  for(const [id,area,bait,hook,distance,mode]of [['akahata','cove','smallShrimp','medium',20,'nushi'],['ishigakidai','west','shell','large',50,'gauge'],['shimaaji','east','shrimp','large',50,'nushi']]){
   const point=I.fishingPoints.find(p=>p.id===area);await walkTo(point);await shot(area+'-fishing-platform');await press('#action');assert.equal(await value('battle.offshoreType'),area);
   await press('#wait');await press('#tackle [data-cast-tackle="bait"]');await press('#tackle [data-pick-bait="'+bait+'"]');await press('#tackle [data-cast-tackle="hook"]');await press('#tackle [data-pick-hook="'+hook+'"]');await press('#tackle [data-cast-tackle="fight"]');await press('#tackle [data-fight-mode="'+mode+'"]');await press('#beginCast');
   const baitBefore=await value('s.baits.'+bait),caughtBefore=await value('s.caught.'+id+'||0'),spot='offshore-'+area+'-'+(distance<34?'shallow':'mid');
   await page.evaluate(({id,distance,spot})=>{clearInterval(timer);timer=0;battle.cast=distance;window.v251OriginalRandom=Math.random;for(let n=0;n<10000;n++){Math.random=()=>(n+.5)/10000;if(pick(distance,spot)?.id===id)return;}throw Error('No ordinary island encounter '+id);},{id,distance,spot});
   await press('#pull');await page.evaluate(()=>battleTick());for(let n=0;n<60&&await value('battle.phase')==='cast-flight';n++)await page.clock.runFor(40);assert.equal(await value('battle.f.id'),id);assert.equal(await value('battle.spot'),spot);
   // Maximum size and bite timing are explicit fixtures. The fight, visible
   // cues, distance, line pressure, landing and award remain the real game.
   await page.evaluate(()=>{Math.random=window.v251OriginalRandom;battle.specimen=rollFishSpecimen(battle.f,()=>.999999);battle.specimenVisualScale=fishVisualScale(battle.specimen);window.v251Rng=301;Math.random=()=>((window.v251Rng=Math.imul(window.v251Rng,1664525)+1013904223>>>0)/4294967296);battle.biteAt=Date.now();battle.biteShownAt=null;syncBitePhase();});
   await press('#pull');await page.clock.runFor(240);assert.equal(await value('battle.phase'),'fight');assert.equal(await value('battle.fightMode'),mode);const r=await page.locator('#pull').boundingBox();assert.ok(r&&r.width>=44&&r.height>=44&&r.y+r.height<=viewport.height+1);button={x:r.x+r.width/2,y:r.y+r.height/2};
   const queue=[];let previous=null,ticks=0,warnings=0,last=null;lastFightTrace=[];
   for(;ticks<1800;ticks++){
    const ui=await page.evaluate(()=>({phase:battle?.phase,cue:document.querySelector('#fishScene').dataset.nushiPhase,leap:document.querySelector('#fishScene').classList.contains('gill-wash'),tension:parseFloat(document.querySelector('#ten').style.width)||0}));if(ui.phase!=='fight')break;
    // Strong reef fish need an early release and a low-tension restart.
    // Both decisions use the visible bar, with the same 600 ms reaction time.
    const wish=!ui.leap&&(mode==='gauge'?ui.tension<(previous?45:20):['slack','pulling'].includes(ui.cue));if(wish!==previous){queue.push({at:ticks*120+600,on:wish});previous=wish;}if(ui.cue==='warning'&&last!=='warning')warnings++;last=ui.cue;while(queue.length&&queue[0].at<=ticks*120)await hold(queue.shift().on);lastFightTrace.push({tick:ticks,held,...ui});if(lastFightTrace.length>35)lastFightTrace.shift();await page.clock.runFor(120);
   }
   assert.equal(await value('battle?.phase'),'landing',id+' actual landing');await hold(false);if(mode==='nushi')assert.ok(warnings>0);await page.clock.runFor(1600);assert.equal(await value('s.caught.'+id),caughtBefore+1);assert.equal(await value('s.baits.'+bait),baitBefore-1);assert.equal(await value('s.fishCatchRecords.'+id+'.last.spotId'),spot);await shot(id+'-caught');await page.evaluate(()=>hideCatchCard());results.push({id,area,mode,seconds:ticks*.12,realInput:true,reactionMs:600,warnings});
  }
  const onIsland=await snapshot();await page.reload({waitUntil:'domcontentloaded'});await start();assert.deepEqual(await snapshot(),onIsland);assert.equal(await value('fish.length'),60);await walkTo(I.entry);await press('#action');await fitFerry();assert.match(await page.locator('#offshoreFerryNote').innerText(),/追加料金なし/);await shot('paid-return');const beforeReturn=await snapshot();await press('#offshoreFerryGo');assert.equal(await value('s.mapRegion'),'village');assert.equal(await value('s.money'),beforeReturn.money);assert.equal(await value('s.gameMinutes'),beforeReturn.time+60);assert.deepEqual(await value('s.caught'),beforeReturn.caught);await shot('returned-to-harbor');assert.deepEqual(errors,[]);assert.deepEqual(failed,[]);
  console.log('V251_OFFSHORE_PASS '+JSON.stringify({public:!!options.public,viewport,mobile,dpr:options.dpr||1,roundTripFare:800,departureOnce:true,cancelFree:true,noPersonalBoat:true,walked,visited:['shelter','lighthouse','cove','west','east'],repairedFloors:collision.floors.map(p=>p.id),blockedTerrain:collision.blocked.length,checkedVerges:collision.verges.map(p=>p.id),fixedCrossings:collision.transits.map(p=>p.id),actualMovementChecked:true,results,islandSaveReload:true,freeReturn:true,catchRecordsPreserved:true,errors:0,httpErrors:0}));
 }catch(error){
  await shot('failure').catch(()=>{});const state=await value('({region:s.mapRegion,x:s.x,y:s.y,log:s.log.slice(0,4),phase:battle?.phase,tension:battle?.ten})').catch(()=>null);
  fs.writeFileSync(path.join(directory,'failure-'+viewport.width+'.json'),JSON.stringify({error:error.stack,state,lastFightTrace,errors,failed},null,2));console.error('V251_FAILURE '+JSON.stringify({state,lastFightTrace}));throw error;
 }finally{if(held)await hold(false).catch(()=>{});await context.close();await browser.close();}
};
