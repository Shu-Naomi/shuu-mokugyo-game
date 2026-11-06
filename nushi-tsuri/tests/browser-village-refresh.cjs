// LOCAL-ONLY browser regression draft. Syntax-checked, not browser-validated.
// Run through browser-village-refresh-evidence.cjs only after browser approval.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {chromium}=require('playwright'),{seed,saveKey}=require('./game-harness.cjs');
const startAdventure=require('./browser-start-adventure.cjs');
const {planRuralRoute}=require('./rural-canals-route.cjs');
const worldArt=require('../scene-layers.js').get('world');

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
 const dir=path.join(__dirname,'browser-evidence-village-refresh'),prefix=`${width}x${height}-dpr${dpr}`;
 fs.mkdirSync(dir,{recursive:true});
 const errors=[],httpErrors=[],requestErrors=[],aborted=[],resources=new Set(),visits=[],feetChecks=[],pointerTypes=new Set();
 let browser,context,page,buttonPresses=0,walked=0;
 const value=q=>page.evaluate(q=>JSON.parse(JSON.stringify(eval(q))),q);
 const state=()=>value('({region:s.mapRegion,x:s.x,y:s.y,direction:s.direction})');
 const progress=()=>value('Object.fromEntries(Object.entries(s).filter(([key])=>!["x","y","direction","log"].includes(key)))');
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
 async function assertNotice(front,expected){
  assert.equal(await value('nearbyWorldLandmark()?.id||null'),front.id);
  assert.equal((await state()).direction,'up');
  assert.match(await page.locator('#hint').textContent(),new RegExp(front.name+'.*準備中'));
  await press('#action');await fieldReady();
  assert.match(await page.locator('#rescueToast.show').textContent(),new RegExp(front.name+'.*準備中'));
  assert.match(await page.locator('#rescueToast.show').textContent(),/今はまだ.*できません/);
  const notice=await page.locator('#rescueToast.show').evaluate(n=>{const r=n.getBoundingClientRect();return {visible:r.width>0&&r.height>0,inside:r.left>=-1&&r.top>=-1&&r.right<=innerWidth+1&&r.bottom<=innerHeight+1};});
  assert.ok(notice.visible&&notice.inside,'notice remains readable on this viewport');
  assert.notEqual(await value('currentSoundScene().music'),'shrine');
  assert.deepEqual(await progress(),expected,'notice cannot alter resources, story, quests, pet inventory or schema');
 }
 async function visitNotice(front){
  await walkTo({name:front.key+'-arrival',x:front.x,y:front.y,direction:'up',landmark:front.id});
  await controlsFit('#action,[data-move]','field controls');const before=await progress();
  await shot(front.key+'-front');
  for(let i=0;i<3;i++)await assertNotice(front,before);
  await shot(front.key+'-prepared-notice');
  const savedAt=await state(),saved=await page.evaluate(key=>JSON.parse(localStorage.getItem(key)),saveKey);
  assert.deepEqual({x:saved.x,y:saved.y,direction:saved.direction},{x:savedAt.x,y:savedAt.y,direction:savedAt.direction},'A autosaved the actual approach');
  for(const type of await value('window.__villageRefreshPointers'))pointerTypes.add(type);
  await page.reload({waitUntil:'domcontentloaded'});await start();
  assert.deepEqual(await state(),savedAt);assert.deepEqual(await progress(),before);
  await feetAt(front.key+'-reload');await assertNotice(front,before);await shot(front.key+'-reloaded');
  const moved=await step('down');assert.notDeepEqual([moved.actual.x,moved.actual.y],[moved.before.x,moved.before.y],'repeat A never traps movement');
  assert.notEqual(await value('nearbyWorldLandmark()?.id||null'),front.id,'turning away stops targeting the front');
  await fieldReady();assert.deepEqual(await progress(),before);await feetAt(front.key+'-walk-away');
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
  await context.addInitScript(({key,state})=>{if(!localStorage.getItem(key))localStorage.setItem(key,JSON.stringify(state));localStorage.setItem('nushi-inugoya-options-v1',JSON.stringify({textSpeed:'instant'}));},
   {key:saveKey,state:{...seed(),x:10,y:79,direction:'right',gameMinutes:600,soundEnabled:false}});
  page=await context.newPage();page.setDefaultTimeout(15000);
  page.on('pageerror',e=>errors.push(e.message));
  page.on('response',r=>{if(!r.url().startsWith(parsed.origin+'/'))return;const file=new URL(r.url()).pathname;if(r.status()>=400)httpErrors.push(r.status()+' '+file);if(r.status()===200)resources.add(file);});
  page.on('requestfailed',r=>{if(!r.url().startsWith(parsed.origin+'/'))return;const detail=r.failure()?.errorText+' '+r.url();(r.failure()?.errorText==='net::ERR_ABORTED'?aborted:requestErrors).push(detail);});
  await page.clock.install({time:new Date('2026-11-07T03:00:00Z')});await page.clock.pauseAt('2026-11-07T03:00:01Z');
  await page.goto(url,{waitUntil:'domcontentloaded',timeout:90000});await start();await fieldReady();await feetAt('home-road-start');
  assert.equal(await value('ShuSceneLayers.get("world").source'),worldArt.source);
  assert.ok(resources.has('/nushi-tsuri/'+worldArt.source),'the final facility master was loaded');
  const initial=await economy();
  await visitNotice({key:'dan',id:'west-shrine',name:'ダンの魚レース場',x:36,y:59});
  await visitNotice({key:'riao',id:'riao-tcg-shop',name:'リアオの魚TCGショップ',x:74,y:40});
  // Walk the public strip beside the shop rather than passing through it.
  await walkTo({name:'riao-public-forecourt',x:86,y:44,direction:'right'});await shot('riao-road-clear');
  await openExisting({name:'asuar',x:198,y:33,direction:'up',landmark:'watermill'},'#petLifeModal','#petLifeModal [data-pet-action="close"]',async()=>{
   assert.equal(await value('petUi.mode'),'shop');assert.match(await page.locator('#petLifeTitle').textContent(),/アスアル/);
   assert.ok(await page.locator('#petLifeModal [data-pet-buy]').count(),'existing fish shop contents remain available');
  });
  await openExisting({name:'right-shrine',x:193,y:66,direction:'up',landmark:'main-shrine'},'#locationInterior','#locationInterior [data-close]',async()=>{
   assert.equal(await value('activeLocationId'),'main-shrine');assert.equal(await value('currentSoundScene().music'),'shrine');
   assert.ok(await page.locator('[data-draw-fortune="starGrapes"]').count(),'existing offering/fortune controls remain available');
  });
  await openExisting({name:'request-board',x:123,y:79,direction:'up',landmark:'quest-board'},'#questBoard','#questBoard [data-close]',async()=>{
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
  const result={status:'passed',screen,art:worldArt.source,buttonPresses,walked,visits,feetChecks,pointerTypes:[...pointerTypes],noticeReloads:2,asuarShop:true,rightShrine:true,requestBoard:true,ruralRoundTrip:true,resourcesPreserved:true,npcFeet,errors,httpErrors,requestErrors,aborted};
  fs.writeFileSync(path.join(dir,prefix+'-result.json'),JSON.stringify(result,null,2));console.log('VILLAGE_REFRESH_PASS '+JSON.stringify(result));
 }catch(error){
  const failure={status:'failed',screen,message:error.message,at:page?await state().catch(()=>null):null,buttonPresses,walked,visits,errors,httpErrors,requestErrors,aborted};
  if(page)await shot('failure').catch(()=>{});fs.writeFileSync(path.join(dir,prefix+'-failure.json'),JSON.stringify(failure,null,2));
  console.error('VILLAGE_REFRESH_FAILURE '+JSON.stringify(failure));throw error;
 }finally{if(context)await context.close();if(browser)await browser.close();}
};
