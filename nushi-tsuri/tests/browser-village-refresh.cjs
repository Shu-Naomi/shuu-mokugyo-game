// LOCAL-ONLY browser regression draft. Syntax-checked, not browser-validated.
// Run through browser-village-refresh-evidence.cjs only after browser approval.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {chromium}=require('playwright'),{seed,saveKey}=require('./game-harness.cjs');
const startAdventure=require('./browser-start-adventure.cjs');
const {planRuralRoute}=require('./rural-canals-route.cjs');
const reference=require('../village-reference.js');
const {createHash}=require('node:crypto');

// Read-only planning: every returned direction is subsequently pressed on the
// real D-pad. No route, reload or assertion assigns player coordinates.
function planVillageRoute(target){
 const queue=[{x:s.x,y:s.y,direction:s.direction,parent:-1}],seen=new Set([s.x+','+s.y+','+s.direction]);
 const goal=p=>Math.hypot(p.x-target.x,p.y-target.y)<=(target.radius||1.5)&&
  (!target.direction||p.direction===target.direction)&&
  (!target.landmark||nearbyWorldLandmark(p.x,p.y,p.direction)?.id===target.landmark);
 for(let i=0;i<queue.length;i++){
  const p=queue[i];if(goal(p)){
   const route=[];for(let j=i;queue[j].parent>=0;j=queue[j].parent)route.push(queue[j].direction);
   return route.reverse();
  }
  for(const direction of ['up','right','down','left']){
   // Do not plan through automatic exits while walking within the village.
   if(direction==='left'&&inWorldRect(p.x,p.y,PLAYER_HOME_MAP_ENTRY)||
      direction==='right'&&ShuRural.atVillageGate(p.x,p.y)||
      direction==='up'&&p.y<=6&&ShuMountain.atVillageGate(p.x,p.y))continue;
   const n=ShuWorldLife.moveTarget(p.x,p.y,direction,4,isWalkableWorld),key=n.x+','+n.y+','+direction;
   if(!seen.has(key)&&isWalkableWorldSegment(p.x,p.y,n.x,n.y)){
    seen.add(key);queue.push({...n,direction,parent:i});
   }
  }
 }
 throw Error('No button-walking route to '+JSON.stringify(target));
}

module.exports=async function villageRefresh(url,screen){
 const parsed=new URL(url);
 assert.ok(parsed.protocol==='http:'&&['127.0.0.1','localhost','[::1]'].includes(parsed.hostname),'this draft only exercises a local checkout');
 const {width,height,mobile,dpr}=screen,viewport={width,height};
 const legacyRaw=JSON.stringify({...seed(),x:10,y:79,direction:'right',gameMinutes:600,soundEnabled:false});
 const originalUnchanged=async()=>assert.equal(await page.evaluate(key=>localStorage.getItem(key),saveKey),legacyRaw,'legacy JSON remains byte-identical');
 const front=(name,id)=>({name,...reference.landmarks[id],direction:reference.landmarks[id].facing,landmark:id});
 let master;
 const dir=path.join(__dirname,'browser-evidence-village-refresh'),prefix=`${width}x${height}-dpr${dpr}`;
 fs.mkdirSync(dir,{recursive:true});
 const errors=[],httpErrors=[],requestErrors=[],aborted=[],resources=new Set(),visits=[],feetChecks=[],pointerTypes=new Set();
 let browser,context,page,buttonPresses=0,walked=0;
 const value=q=>page.evaluate(q=>JSON.parse(JSON.stringify(eval(q))),q);
 const state=()=>value('({region:s.mapRegion,x:s.x,y:s.y,direction:s.direction})');
 // Rural travel legitimately records a story visit. Resource checks still
 // include time, inventory, pet stock, quest completions and equipment.
 const economy=()=>value('({money:s.money,hp:s.hp,time:s.gameMinutes,baits:s.baits,caught:s.caught,items:s.items,ingredients:s.cookingIngredients,meals:s.preparedMeals,ownedRods:s.ownedRods,rodCopies:s.rodCopies,rodParts:s.rodParts,equipment:s.equipment,lures:s.lures,dogTreats:s.dogTreats,dogToys:s.dogToys,pet:s.petLife,quests:s.questCompletions,memories:s.catchMemories,records:s.fishCatchRecords,mode:s.fightMode})');
 const press=async q=>{await page.locator(q)[mobile?'tap':'click']();await page.clock.runFor(50);};
 const shot=name=>page.screenshot({path:path.join(dir,prefix+'-'+name+'.png'),timeout:15000});
 async function start(){
  await startAdventure(page,mobile);await page.clock.runFor(240);
  if(await page.locator('#lakeIntroSkip').isVisible()){await press('#lakeIntroSkip');await page.clock.runFor(240);}
  if(await value('s.mapRegion')==='village')await page.waitForFunction(()=>{
   const c=document.querySelector('#worldPixels');return c.style.backgroundImage==='none'&&c.width===1672&&c.height===941;
  });
  // As in the existing village browser fixtures, prevent incidental random
  // dog-foraging events from changing supplies during a path-only test.
  await page.evaluate(()=>{Math.random=()=>.999999;window.__villageRefreshPointers=[];
   document.addEventListener('pointerdown',e=>{if(e.target.closest('#action,[data-move]'))window.__villageRefreshPointers.push(e.pointerType);});
  });
 }
 async function controlsFit(selectors,label){
  const checks=await page.locator(selectors).evaluateAll(nodes=>nodes.map(n=>{
   const r=n.getBoundingClientRect(),hit=document.elementFromPoint(r.x+r.width/2,r.y+r.height/2);
   return {id:n.id||n.dataset.move||n.dataset.petAction,width:r.width,height:r.height,
    inside:r.left>=-1&&r.top>=-1&&r.right<=innerWidth+1&&r.bottom<=innerHeight+1,
    unblocked:hit===n||n.contains(hit),enabled:!n.disabled};
  }));
  assert.ok(checks.length&&checks.every(c=>c.width>=44&&c.height>=44&&c.inside&&c.unblocked&&c.enabled),label+' '+JSON.stringify(checks));
 }
 async function fieldReady(){
  assert.equal(await page.locator('.modal.open').count(),0);
  assert.equal(await value('battle'),null);assert.equal(await value('petUi.active'),false);
  assert.equal(await page.locator('#fishScene.active').count(),0);
  assert.equal(await page.locator('.controls').evaluate(n=>n.inert),false);
 }
 async function feetAt(name){
  await page.clock.runFor(700);await page.waitForTimeout(700);
  const feet=await page.evaluate(()=>{
   const player=document.querySelector('#player'),p=player.getBoundingClientRect(),m=document.querySelector('#map').getBoundingClientRect(),v=document.querySelector('#world').getBoundingClientRect(),style=getComputedStyle(player),dog=safeDogDisplayPosition();
   return {x:s.x,y:s.y,dx:Math.abs(p.x+p.width/2-(m.x+m.width*s.x/240)),dy:Math.abs(p.bottom-(m.y+m.height*s.y/135)),
    visible:p.width>0&&p.height>0&&style.visibility==='visible'&&style.display!=='none'&&Number(style.opacity)>.5&&p.left>=v.left-1&&p.right<=v.right+1&&p.top>=v.top-1&&p.bottom<=v.bottom+1,
    walkable:isWalkableWorld(s.x,s.y),dogWalkable:isWalkableWorld(dog.left*2.4,dog.top*1.35)};
  });
  assert.ok(feet.visible&&feet.walkable&&feet.dx<1&&feet.dy<1,name+' visible feet match collision position '+JSON.stringify(feet));
  assert.ok(feet.dogWalkable,name+' following dog remains on land');feetChecks.push({name,...feet});
 }
 async function step(direction){
  const before=await state();assert.equal(before.region,'village');
  const expected=await page.evaluate(direction=>ShuWorldLife.moveTarget(s.x,s.y,direction,4,isWalkableWorld),direction);
  await press('[data-move="'+direction+'"]');buttonPresses++;
  const actual=await state();assert.equal(actual.region,'village');assert.equal(actual.x,expected.x);assert.equal(actual.y,expected.y);assert.equal(actual.direction,direction);
  if(actual.x!==before.x||actual.y!==before.y)walked++;
  assert.equal(await value('isWalkableWorld(s.x,s.y)'),true);return {before,actual};
 }
 async function walkTo(target){
  await fieldReady();const route=await page.evaluate(planVillageRoute,target);
  for(const direction of route)await step(direction);
  const at=await state();assert.ok(Math.hypot(at.x-target.x,at.y-target.y)<=(target.radius||1.5));
  if(target.direction)assert.equal(at.direction,target.direction);
  if(target.landmark)assert.equal(await value('nearbyWorldLandmark()?.id||null'),target.landmark);
  visits.push({name:target.name,steps:route.length,...at});await feetAt(target.name);
 }
 const gameModal='#villageFishGames',exitGame=gameModal+' [data-close]';
 async function openGame(front){
  assert.equal(await value('nearbyWorldLandmark()?.id||null'),front.id);
  assert.equal((await state()).direction,'up');
  assert.match(await page.locator('#hint').textContent(),new RegExp(front.name));
  await press('#action');
  await page.locator(gameModal+'.open[data-game="'+front.game+'"]').waitFor();
  assert.notEqual(await value('currentSoundScene().music'),'shrine');
 }
 async function canPress(q){
  const visible=await page.locator(q).evaluate(n=>{
   const r=n.getBoundingClientRect(),hit=document.elementFromPoint(r.x+r.width/2,r.y+r.height/2);
   return !n.disabled&&r.width>0&&r.height>0&&r.left>=-1&&r.top>=-1&&r.right<=innerWidth+1&&r.bottom<=innerHeight+1&&(hit===n||n.contains(hit));
  });
  assert.ok(visible,'button should be visible without scrolling: '+q);
 }
 async function race(){
  await page.locator('#danEntrantPicker').selectOption('rental-funa');
  await canPress('#danRaceStart');await press('#danRaceStart');
  await page.clock.runFor(2200);
  await canPress('#danRaceSpurt');
  if(mobile)await press('#danRaceSpurt');
  else {await page.keyboard.press('z');await page.clock.runFor(50);}
  assert.equal(await page.locator('#danRaceSpurt').isDisabled(),true,'the single signal is spent');
  await shot('race-running');
  await page.clock.runFor(24000);
  await page.locator('[data-race-phase="result"]').waitFor();
  assert.match(await page.locator('#danRaceRank').innerText(),/[1-3一二三]/);
  await canPress('#danRacePrint');await press('#danRacePrint');
  assert.equal(await value('s.villageFishGames.records.length'),1);
  assert.equal(await value('s.villageFishGames.records[0].species'),'funa');
  return await value('s.villageFishGames.records[0].id');
 }
 async function cards(recordId){
  const action=name=>'[data-card-action="'+name+'"]';
  await press('[data-card-challenge="harbor-lead"]');
  await canPress('[data-card-tackle="net"]');await press('[data-card-tackle="net"]');
  await canPress(action('play'));await press(action('play'));
  assert.ok(await value('s.villageFishGames.cleared.includes("harbor-lead")'));
  await shot('cards-net-verdict');
  await press(action('shop'));await press(action('album'));
  await page.locator('select[data-card-record]').selectOption(recordId);
  await canPress(action('practice'));await press(action('practice'));
  const ownCard=page.locator('.fish-playing-card[data-record-id="'+recordId+'"]');
  assert.ok((await ownCard.innerText()).includes(await value('s.villageFishGames.records[0].name')));
  await shot('cards-race-keepsake');
  await press('[data-card-tackle="net"]');await canPress(action('play'));await press(action('play'));
  await page.locator('.card-verdict').waitFor();assert.equal(await ownCard.count(),1);
 }
 async function visitActivity(front,play){
  await walkTo({name:front.key+'-arrival',x:front.x,y:front.y,direction:'up',landmark:front.id});
  await controlsFit('#action,[data-move]','field controls');const before=await economy();
  await shot(front.key+'-front');await openGame(front);await shot(front.key+'-inside');
  const result=await play();
  await canPress(exitGame);await press(exitGame);await fieldReady();
  const savedAt=await state(),record=await page.evaluate(()=>ShuVillageProductionSession.read(1));
  assert.equal(record.ok,true);assert.ok(record.raw,'modern-slot save exists');
  const saved=JSON.parse(record.raw),games=await value('s.villageFishGames');await originalUnchanged();
  assert.deepEqual(saved.villageFishGames,games,'minigame progress is saved in the active slot');
  assert.deepEqual({x:saved.x,y:saved.y,direction:saved.direction},{x:savedAt.x,y:savedAt.y,direction:savedAt.direction});
  for(const type of await value('window.__villageRefreshPointers'))pointerTypes.add(type);
  await page.reload({waitUntil:'domcontentloaded'});await start();
  assert.deepEqual(await state(),savedAt);assert.deepEqual(await economy(),before);await originalUnchanged();
  assert.deepEqual(await value('s.villageFishGames'),games);
  await feetAt(front.key+'-reload');await openGame(front);
  if(mobile)await press(exitGame);else {await page.keyboard.press('Escape');await page.clock.runFor(60);}
  await fieldReady();
  const moved=await step('down');assert.notDeepEqual([moved.actual.x,moved.actual.y],[moved.before.x,moved.before.y],'leaving the venue restores field movement');
  assert.notEqual(await value('nearbyWorldLandmark()?.id||null'),front.id,'turning away stops targeting the front');
  await fieldReady();assert.deepEqual(await economy(),before);await feetAt(front.key+'-walk-away');
  return result;
 }
 async function openExisting(target,modal,closeSelector,inspect){
  await walkTo(target);const at=await state(),before=await economy();await shot(target.name+'-front');
  await press('#action');await page.locator(modal+'.open').waitFor({state:'visible'});await inspect();
  await controlsFit(closeSelector,target.name+' exit');await shot(target.name+'-inside');await press(closeSelector);
  await fieldReady();assert.deepEqual(await state(),at);assert.deepEqual(await economy(),before);await feetAt(target.name+'-exit');
 }
 try{
  browser=await chromium.launch({headless:true});
  context=await browser.newContext({viewport,isMobile:mobile,hasTouch:mobile,deviceScaleFactor:dpr,locale:'ja-JP',serviceWorkers:'block'});
  await context.addInitScript(({key,raw})=>{if(!localStorage.getItem(key))localStorage.setItem(key,raw);localStorage.setItem('nushi-inugoya-options-v1',JSON.stringify({textSpeed:'instant'}));},
   {key:saveKey,raw:legacyRaw});
  page=await context.newPage();page.setDefaultTimeout(15000);
  page.on('pageerror',e=>errors.push(e.message));
  page.on('response',r=>{if(!r.url().startsWith(parsed.origin+'/'))return;const file=new URL(r.url()).pathname;if(r.status()>=400)httpErrors.push(r.status()+' '+file);if(r.status()===200)resources.add(file);});
  page.on('requestfailed',r=>{if(!r.url().startsWith(parsed.origin+'/'))return;const detail=r.failure()?.errorText+' '+r.url();(r.failure()?.errorText==='net::ERR_ABORTED'?aborted:requestErrors).push(detail);});
  await page.clock.install({time:new Date('2026-11-07T03:00:00Z')});await page.clock.pauseAt('2026-11-07T03:00:01Z');
  await page.goto(url,{waitUntil:'domcontentloaded',timeout:90000});await start();await fieldReady();await feetAt('home-road-start');
  master=await page.evaluate(async()=>{
   const config=ShuVillageReleaseCandidate,verified=ShuVillageReference.source.asset;
   const response=await fetch(verified);const bytes=await response.arrayBuffer();
   const digest=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes)),v=>v.toString(16).padStart(2,'0')).join('');
   return {path:new URL(config.mapURL,location.href).pathname,expected:config.mapSHA256,verified,rendered:ShuSceneLayers.get('world').source,digest,bytes:bytes.byteLength,started:ShuVillageReleaseGate.started};
  });
  assert.equal(master.started,true);assert.match(master.verified,/^blob:/);
  assert.equal(master.rendered,master.verified,'world renderer consumes verified blob, not a second unverified request');
  assert.equal(master.digest,master.expected,'rendered blob bytes match production manifest');
  const mapBytes=fs.readFileSync(path.join(__dirname,'..',master.path.replace(/^\/nushi-tsuri\//,'')));
  assert.equal(master.digest,createHash('sha256').update(mapBytes).digest('hex'),'production manifest identifies checked-out painting');
  assert.equal(master.bytes,mapBytes.length);assert.ok(resources.has(master.path),'manifest-selected painting was fetched');
  await originalUnchanged();assert.equal(await value('s.villageLayoutVersion'),'reference-11016-v1');
  assert.deepEqual(await value('({x:s.x,y:s.y,direction:s.direction})'),reference.exits.home.return,'legacy position migrates to connected source-image road');
  const initial=await economy();
  const printed=await visitActivity({...front('ダンの魚レース場','west-shrine'),key:'dan',id:'west-shrine',game:'race'},race);
  await visitActivity({...front('リアオの魚TCGショップ','riao-tcg-shop'),key:'riao',id:'riao-tcg-shop',game:'cards'},()=>cards(printed));
  // Walk the public strip beside the shop rather than passing through it.
  await walkTo({name:'riao-public-forecourt',...reference.anchor(1568,250),direction:'right'});await shot('riao-road-clear');
  await openExisting(front('asuar','watermill'),'#petLifeModal','#petLifeModal [data-pet-action="close"]',async()=>{
   assert.equal(await value('petUi.mode'),'shop');assert.match(await page.locator('#petLifeTitle').textContent(),/アスアル/);
   assert.ok(await page.locator('#petLifeModal [data-pet-buy]').count(),'existing fish shop contents remain available');
  });
  await openExisting(front('right-shrine','main-shrine'),'#locationInterior','#locationInterior [data-close]',async()=>{
   assert.equal(await value('activeLocationId'),'main-shrine');assert.equal(await value('currentSoundScene().music'),'shrine');
   assert.ok(await page.locator('[data-draw-fortune="starGrapes"]').count(),'existing offering/fortune controls remain available');
  });
  await openExisting(front('request-board','quest-board'),'#questBoard','#questBoard [data-close]',async()=>{
   assert.match(await page.locator('#questBoard').textContent(),/依頼掲示板/);
  });
  assert.deepEqual(await economy(),initial,'ordinary visits never buy, charge, award or consume anything');
  const ruralRoute=await page.evaluate(planRuralRoute,'villageGate');for(const direction of ruralRoute)await step(direction);
  assert.equal(await value('ShuRural.atVillageGate(s.x,s.y)'),true);visits.push({name:'rural-gate',steps:ruralRoute.length,...await state()});
  await feetAt('rural-gate');await shot('rural-gate');const beforeRural=await economy();
  await press('#action');assert.equal(await value('s.mapRegion'),'ruralCanals');await fieldReady();
  assert.equal(await value('ShuMountain.atReturnGate(s.x,s.y,s.mapRegion)'),true);
  await press('#action');assert.equal(await value('s.mapRegion'),'village');
  assert.deepEqual(await value('({x:s.x,y:s.y,direction:s.direction})'),await value('ShuRural.villageReturn'));
  assert.deepEqual(await economy(),beforeRural);await feetAt('rural-return');await shot('rural-return');
  const npcFeet=await page.evaluate(()=>[...document.querySelectorAll('#worldLifeLayer .world-life-resident')].filter(n=>n.getClientRects().length).every(n=>isWalkableWorld(parseFloat(n.style.left)*2.4,parseFloat(n.style.top)*1.35)));
  assert.ok(npcFeet,'existing NPC routes remain on dry ground');
  for(const type of await value('window.__villageRefreshPointers'))pointerTypes.add(type);
  assert.ok(pointerTypes.has(mobile?'touch':'mouse'),'real '+(mobile?'touch':'mouse')+' controls were exercised');
  assert.ok(walked>20,'routes must contain real movement');assert.deepEqual(errors,[]);assert.deepEqual(httpErrors,[]);assert.deepEqual(requestErrors,[]);
  await originalUnchanged();
  const result={status:'passed',screen,art:master.path,verifiedArt:master,legacyBytesPreserved:true,saveGeneration:'reference-11016-v1',buttonPresses,walked,visits,feetChecks,pointerTypes:[...pointerTypes],activityReloads:2,printedAndPlayedRaceCard:true,asuarShop:true,rightShrine:true,requestBoard:true,ruralRoundTrip:true,resourcesPreserved:true,npcFeet,errors,httpErrors,requestErrors,aborted};
  fs.writeFileSync(path.join(dir,prefix+'-result.json'),JSON.stringify(result,null,2));console.log('VILLAGE_REFRESH_PASS '+JSON.stringify(result));
 }catch(error){
  const failure={status:'failed',screen,message:error.message,at:page?await state().catch(()=>null):null,buttonPresses,walked,visits,errors,httpErrors,requestErrors,aborted};
  if(page)await shot('failure').catch(()=>{});fs.writeFileSync(path.join(dir,prefix+'-failure.json'),JSON.stringify(failure,null,2));
  console.error('VILLAGE_REFRESH_FAILURE '+JSON.stringify(failure));throw error;
 }finally{if(context)await context.close();if(browser)await browser.close();}
};
