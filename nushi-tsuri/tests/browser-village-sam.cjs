const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),{chromium}=require('playwright');
const {seed,saveKey}=require('./game-harness.cjs');
module.exports=async function villageSam(url,mobile=false,options={}){
 const viewport=options.viewport||(mobile?{width:844,height:390}:{width:1280,height:720}),dir=path.join(__dirname,'browser-evidence-village-sam');fs.mkdirSync(dir,{recursive:true});
 const browser=await chromium.launch({headless:true}),context=await browser.newContext({viewport,isMobile:mobile,hasTouch:mobile,deviceScaleFactor:options.dpr||1,locale:'ja-JP',serviceWorkers:'block'});
 const initial={...seed(),x:10,y:79,direction:'right',money:10000,gameMinutes:600,soundEnabled:false};
 await context.addInitScript(({key,state})=>{if(!localStorage.getItem(key))localStorage.setItem(key,JSON.stringify(state));localStorage.setItem('nushi-inugoya-options-v1',JSON.stringify({textSpeed:'instant'}));},{key:saveKey,state:initial});
 const page=await context.newPage(),errors=[],failed=[],resources=[],visits=[];let walked=0;
 page.on('pageerror',e=>errors.push(e.message));page.on('response',r=>{const name=new URL(r.url()).pathname;if(r.status()>=400)failed.push(r.status()+' '+name);if(name.endsWith('/village-sam-v251-3.png')&&r.status()===200)resources.push(name);});
 const press=q=>page.locator(q)[mobile?'tap':'click'](),value=q=>page.evaluate(q=>JSON.parse(JSON.stringify(eval(q))),q);
 const state=()=>value('({x:s.x,y:s.y,direction:s.direction})');
 const progress=()=>value('({money:s.money,hp:s.hp,time:s.gameMinutes,caught:s.caught,baits:s.baits,equipment:s.equipment,pet:s.petLife,story:s.lakeStory,quests:s.questCompletions,memories:s.catchMemories,records:s.fishCatchRecords,mode:s.fightMode})');
 const shot=name=>page.screenshot({path:path.join(dir,viewport.width+'x'+viewport.height+'-'+name+'.png')});
 async function start(){await press('#start');await page.clock.runFor(240);if(await page.locator('#lakeIntroSkip').isVisible()){await press('#lakeIntroSkip');await page.clock.runFor(240);}await page.waitForFunction(()=>document.querySelector('#worldPixels').style.backgroundImage==='none');await page.evaluate(()=>{Math.random=()=>.999999;});}
 async function walkTo(target){
  const route=await page.evaluate(target=>{
   const queue=[{x:s.x,y:s.y,d:s.direction,path:[]}],seen=new Set([s.x+','+s.y+','+s.direction]);
   for(let i=0;i<queue.length;i++){const p=queue[i];if(Math.hypot(p.x-target.x,p.y-target.y)<=2&&(!target.direction||p.d===target.direction))return p.path;
    for(const d of ['up','right','down','left']){const n={...ShuWorldLife.moveTarget(p.x,p.y,d,4,isWalkableWorld),d},key=n.x+','+n.y+','+d;if(!seen.has(key)){seen.add(key);queue.push({...n,path:[...p.path,d]});}}
   }throw Error('No village route '+JSON.stringify(target));
  },target);
  for(const d of route){const expected=await page.evaluate(d=>ShuWorldLife.moveTarget(s.x,s.y,d,4,isWalkableWorld),d);await press('[data-move="'+d+'"]');await page.clock.runFor(50);const actual=await state();assert.equal(actual.x,expected.x);assert.equal(actual.y,expected.y);walked++;}
  const at=await state();assert.ok(Math.hypot(at.x-target.x,at.y-target.y)<=2);visits.push({name:target.name,...at});await page.clock.runFor(700);
  // CSS transitions use the real rendering clock. Let feet and the following
  // dog finish their normal motion before measuring or recording a screen.
  await page.waitForTimeout(700);
  const feet=await page.evaluate(()=>{const p=document.querySelector('#player').getBoundingClientRect(),m=document.querySelector('#map').getBoundingClientRect();return {dx:Math.abs(p.x+p.width/2-(m.x+m.width*s.x/240)),dy:Math.abs(p.bottom-(m.y+m.height*s.y/135))};});
  assert.ok(feet.dx<1&&feet.dy<1,'visible player feet reach the actual collision position '+JSON.stringify(feet));
 }
 try{
  await page.clock.install({time:new Date('2026-10-22T03:00:00Z')});await page.clock.pauseAt('2026-10-22T03:00:01Z');await page.goto(url,{waitUntil:'domcontentloaded',timeout:90000});await start();
  const before=await progress();assert.ok(resources.length,'new shop art actually loaded');
  await walkTo({name:'sam-from-home',x:197,y:91,direction:'up'});assert.equal(await value('isAtSamShopEntrance()'),true);
  const controls=await page.evaluate(()=>['#action',...['up','right','down','left'].map(d=>'[data-move="'+d+'"]')].map(q=>{const b=document.querySelector(q),r=b.getBoundingClientRect(),top=document.elementFromPoint(r.x+r.width/2,r.y+r.height/2);return {q,width:r.width,height:r.height,inside:r.left>=0&&r.top>=0&&r.right<=innerWidth+1&&r.bottom<=innerHeight+1,unblocked:top===b||b.contains(top)};}));
  const controlFit=controls.every(c=>c.width>=44&&c.height>=44&&c.inside&&c.unblocked);assert.ok(controlFit,'landscape controls fit and accept touches '+JSON.stringify(controls));
  const at=await state();await shot('sam-step-arrival');await press('#action');await page.locator('#store.open').waitFor();assert.deepEqual(await progress(),before);
  const fit=await page.locator('#store').evaluate(n=>{const r=n.getBoundingClientRect(),b=n.querySelector('[data-close]').getBoundingClientRect();return r.top>=0&&r.bottom<=innerHeight+1&&b.width>=44&&b.height>=44&&b.bottom<=innerHeight+1;});assert.ok(fit,'shop and exit fit');
  await require('./compact-ui-helpers.cjs').pressProduct(page,'#store [data-buy-bait="worm"]',mobile);const bought=await progress();assert.equal(bought.money,before.money-120);assert.equal(bought.baits.worm,before.baits.worm+3);assert.deepEqual({...bought,money:before.money,baits:before.baits},before);await shot('sam-buy');
  await press('#store [data-close]');assert.deepEqual(await state(),at);
  await walkTo({name:'fish-market-delivery-route',x:158,y:104,direction:'up'});assert.equal(await value('nearbyWorldLandmark().id'),'fish-market');const market=await state();await press('#action');await page.locator('#locationInterior.open').waitFor();assert.equal(await value('activeLocationId'),'fish-market');await press('#locationInterior [data-close]');assert.deepEqual(await state(),market);
  await walkTo({name:'sam-from-market',x:197,y:91,direction:'up'});await shot('sam-harbor-path');
  await walkTo({name:'east-quay',x:220,y:108,direction:'down'});await shot('east-quay');
  const feet=await page.evaluate(()=>[...document.querySelectorAll('#worldLifeLayer .world-life-resident')].filter(n=>n.getClientRects().length).every(n=>isWalkableWorld(parseFloat(n.style.left)*2.4,parseFloat(n.style.top)*1.35)));assert.ok(feet,'NPC feet stay on walkable land');
  await walkTo({name:'sam-before-save',x:197,y:91,direction:'up'});assert.deepEqual(await progress(),bought);const savedAt=await state();await page.evaluate(()=>save());await page.reload({waitUntil:'domcontentloaded'});await start();assert.deepEqual(await state(),savedAt);assert.deepEqual(await progress(),bought);await shot('sam-reloaded');
  await press('#action');await page.locator('#store.open').waitFor();await press('#store [data-close]');assert.deepEqual(await state(),savedAt);assert.deepEqual(errors,[]);assert.deepEqual(failed,[]);
  console.log('VILLAGE_SAM_PASS '+JSON.stringify({viewport,mobile,dpr:options.dpr||1,walked,visits,newShopArt:true,controlsFit:controlFit,realMovement:true,purchase:true,exitFeetPreserved:true,marketConnection:true,npcFeet:true,saveReload:true,progressPreserved:true,errors:0,httpErrors:0}));
 }catch(error){await shot('failure').catch(()=>{});console.error('VILLAGE_SAM_FAILURE '+JSON.stringify({state:await state().catch(()=>null),errors,failed}));throw error;}finally{await context.close();await browser.close();}
};
