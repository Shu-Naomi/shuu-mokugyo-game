const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),{chromium}=require('playwright');
const {seed,saveKey}=require('./game-harness.cjs'),{pressProduct}=require('./compact-ui-helpers.cjs');
module.exports=async function villageInn(url,mobile=false,options={}){
 const viewport=options.viewport||(mobile?{width:844,height:390}:{width:1280,height:720}),dir=path.join(__dirname,'browser-evidence-village-inn');fs.mkdirSync(dir,{recursive:true});
 const browser=await chromium.launch({headless:true}),context=await browser.newContext({viewport,isMobile:mobile,hasTouch:mobile,deviceScaleFactor:options.dpr||1,locale:'ja-JP',serviceWorkers:'block'});
 const initial={...seed(),x:10,y:79,direction:'right',items:{wildGreens:2},gameMinutes:600,soundEnabled:false};
 await context.addInitScript(({key,state})=>{if(!localStorage.getItem(key))localStorage.setItem(key,JSON.stringify(state));localStorage.setItem('nushi-inugoya-options-v1',JSON.stringify({textSpeed:'instant'}));},{key:saveKey,state:initial});
 const page=await context.newPage(),errors=[],failed=[],resources=[],visits=[];let walked=0;
 page.on('pageerror',e=>errors.push(e.message));page.on('response',r=>{const name=new URL(r.url()).pathname;if(r.status()>=400)failed.push(r.status()+' '+name);if(name.endsWith('.png')&&r.status()===200)resources.push(name);});
 const press=q=>page.locator(q)[mobile?'tap':'click'](),value=q=>page.evaluate(q=>JSON.parse(JSON.stringify(eval(q))),q);
 const state=()=>value('({x:s.x,y:s.y,direction:s.direction})');
 const progress=()=>value('({money:s.money,hp:s.hp,time:s.gameMinutes,caught:s.caught,baits:s.baits,items:s.items,ingredients:s.cookingIngredients,meals:s.preparedMeals,equipment:s.equipment,pet:s.petLife,story:s.lakeStory,quests:s.questCompletions,memories:s.catchMemories,records:s.fishCatchRecords,mode:s.fightMode})');
 const shot=name=>page.screenshot({path:path.join(dir,viewport.width+'x'+viewport.height+'-'+name+'.png')});
 async function start(){await require('./browser-start-adventure.cjs')(page,mobile);await page.clock.runFor(240);if(await page.locator('#lakeIntroSkip').isVisible()){await press('#lakeIntroSkip');await page.clock.runFor(240);}await page.waitForFunction(()=>document.querySelector('#worldPixels').style.backgroundImage==='none');await page.evaluate(()=>{Math.random=()=>.999999;});}
 async function walkTo(target){
  const predicate=`(x,y,d)=>Math.hypot(x-${target.x},y-${target.y})<=1&&d===${JSON.stringify(target.direction)}`;
  const route=await page.evaluate(require('./browser-reference-village-evidence.cjs').planVillageRoute,predicate);
  for(const d of route){const expected=await page.evaluate(d=>ShuWorldLife.moveTarget(s.x,s.y,d,4,isWalkableWorld),d);await press('[data-move="'+d+'"]');await page.clock.runFor(50);const actual=await state();assert.equal(await value('s.mapRegion'),'village');assert.equal(await value('playerHomeIsActive()'),false);assert.equal(actual.x,expected.x);assert.equal(actual.y,expected.y);walked++;}
  const at=await state();assert.ok(Math.hypot(at.x-target.x,at.y-target.y)<=1);visits.push({name:target.name,...at});await page.clock.runFor(700);await page.waitForTimeout(700);
  const feet=await page.evaluate(()=>{const p=document.querySelector('#player').getBoundingClientRect(),m=document.querySelector('#map').getBoundingClientRect(),dog=safeDogDisplayPosition();return {dx:Math.abs(p.x+p.width/2-(m.x+m.width*s.x/240)),dy:Math.abs(p.bottom-(m.y+m.height*s.y/135)),dogWalkable:isWalkableWorld(dog.left*2.4,dog.top*1.35)};});
  assert.ok(feet.dx<1&&feet.dy<1,'visible feet agree with the collision position '+JSON.stringify(feet));assert.ok(feet.dogWalkable,'the following dog stays on land');
 }
 try{
  await page.clock.install({time:new Date('2026-10-23T03:00:00Z')});await page.clock.pauseAt('2026-10-23T03:00:01Z');await page.goto(url,{waitUntil:'domcontentloaded',timeout:90000});await start();
  const before=await progress();
  const master=await page.evaluate(()=>({path:new URL(ShuVillageReleaseCandidate.mapURL,location.href).pathname,source:ShuSceneLayers.get('world').source,verified:ShuVillageReference.source.asset}));
  assert.ok(resources.includes(master.path),'verified village master loaded into the real world controller');assert.match(master.verified,/^blob:/);assert.equal(master.source,master.verified,'world controller uses verified map bytes');
  // Measured source-image road and doorstep points for the production village.
  const point=(name,x,y,direction)=>({name,x:x/1672*240,y:y/941*135,direction});
  await walkTo(point('front-road-from-home',242,260,'right'));await walkTo(point('inn-gate-and-steps',242,203,'up'));assert.equal(await value('nearbyWorldLandmark().id'),'farmhouse');
  const controls=await page.evaluate(()=>['#action',...['up','right','down','left'].map(d=>'[data-move="'+d+'"]')].map(q=>{const b=document.querySelector(q),r=b.getBoundingClientRect(),top=document.elementFromPoint(r.x+r.width/2,r.y+r.height/2);return {q,width:r.width,height:r.height,inside:r.left>=0&&r.top>=0&&r.right<=innerWidth+1&&r.bottom<=innerHeight+1,unblocked:top===b||b.contains(top)};}));
  assert.ok(controls.every(c=>c.width>=44&&c.height>=44&&c.inside&&c.unblocked),'44px controls fit '+JSON.stringify(controls));await shot('inn-gate-arrival');
  const at=await state();await press('#action');await page.locator('#locationInterior.open').waitFor();assert.equal(await value('activeLocationId'),'farmhouse');assert.deepEqual(await progress(),before);
  const fit=await page.locator('#locationInterior').evaluate(n=>{const r=n.getBoundingClientRect();return r.top>=0&&r.bottom<=innerHeight+1&&['[data-close]','#locationAction'].every(q=>{const b=n.querySelector(q).getBoundingClientRect(),hit=document.elementFromPoint(b.x+b.width/2,b.y+b.height/2);return b.width>=44&&b.height>=44&&b.left>=0&&b.top>=0&&b.right<=innerWidth+1&&b.bottom<=innerHeight+1&&(hit===n.querySelector(q)||n.querySelector(q).contains(hit));});});assert.ok(fit,'inn, exit and overnight service fit the landscape viewport');await shot('inn-interior');
  await pressProduct(page,'#locationInterior [data-cook-recipe="bigFishPlate"]',mobile);const cooked=await progress();assert.equal(cooked.ingredients.fishFillet,before.ingredients.fishFillet-1);assert.equal(cooked.items.wildGreens,before.items.wildGreens-1);assert.equal(cooked.meals.bigFishPlate,(before.meals.bigFishPlate||0)+1);assert.equal(cooked.money,before.money);await shot('inn-kitchen');
  await press('#locationAction');const rested=await progress();assert.equal(rested.hp,await value('s.maxHp'));assert.equal(rested.time,(Math.floor(cooked.time/1440)+1)*1440+360);
  for(const key of ['money','caught','baits','items','ingredients','meals','equipment','story','quests','memories','records','mode'])assert.deepEqual(rested[key],cooked[key],'overnight keeps '+key);
  await press('#locationInterior [data-close]');assert.deepEqual(await state(),at);
  assert.equal(await page.evaluate(()=>{const p=ShuVillageReference.landmarks.farmhouse,b=ShuVillageReference.geometry.structureBounds.find(b=>b.id==='farmhouse');return isWalkableWorldSegment(p.x,p.y,(b.left+b.right)/2,(b.top+b.bottom)/2);}),false,'the inn walls remain solid');
  await walkTo(point('gate-to-front-road',242,260,'down'));await walkTo(point('west-road',120,260,'left'));await shot('inn-west-road');await walkTo(point('east-road',380,260,'right'));await shot('inn-east-road');
  const npcFeet=await page.evaluate(()=>[...document.querySelectorAll('#worldLifeLayer .world-life-resident')].filter(n=>n.getClientRects().length).every(n=>isWalkableWorld(parseFloat(n.style.left)*2.4,parseFloat(n.style.top)*1.35)));assert.ok(npcFeet,'NPC feet stay on walkable ground');
  await walkTo(point('front-road-before-save',242,260,'left'));await walkTo(point('inn-before-save',242,203,'up'));assert.deepEqual(await progress(),rested);const savedAt=await state();await page.evaluate(()=>save());await page.reload({waitUntil:'domcontentloaded'});await start();assert.deepEqual(await state(),savedAt);assert.deepEqual(await progress(),rested);await shot('inn-reloaded');
  await press('#action');await page.locator('#locationInterior.open').waitFor();assert.equal(await value('activeLocationId'),'farmhouse');await press('#locationInterior [data-close]');assert.deepEqual(await state(),savedAt);assert.deepEqual(errors,[]);assert.deepEqual(failed,[]);
  console.log('VILLAGE_INN_PASS '+JSON.stringify({public:!!options.public,viewport,mobile,dpr:options.dpr||1,walked,visits,newInnArt:true,realMovement:true,entranceExit:true,cooking:true,nextMorning:true,exitFeetPreserved:true,sideRoads:true,solidWalls:true,npcFeet:true,dogFeet:true,controlsFit:true,saveReload:true,progressPreserved:true,errors:0,httpErrors:0}));
 }catch(error){await shot('failure').catch(()=>{});console.error('VILLAGE_INN_FAILURE '+JSON.stringify({state:await state().catch(()=>null),errors,failed}));throw error;}finally{await context.close();await browser.close();}
};
