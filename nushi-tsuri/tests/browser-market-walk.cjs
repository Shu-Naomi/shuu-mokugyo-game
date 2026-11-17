const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),{chromium}=require('playwright');
const {seed,saveKey}=require('./game-harness.cjs');
const reference=require('../village-reference.js'),{planVillageRoute}=require('./browser-reference-village-evidence.cjs');
const {createHash}=require('node:crypto');
module.exports=async function marketWalk(url,screen){
 const {width,height,mobile,dpr}=screen,viewport={width,height},dir=path.join(__dirname,'market-walk-evidence');fs.mkdirSync(dir,{recursive:true});
 const browser=await chromium.launch({headless:true}),context=await browser.newContext({viewport,isMobile:mobile,hasTouch:mobile,deviceScaleFactor:dpr,locale:'ja-JP',serviceWorkers:'block'});
 const initial={...seed(),avatar:'girl',x:10,y:79,direction:'right',gameMinutes:600,soundEnabled:false},other=JSON.stringify({...seed(),avatar:'boy',money:7654,playerName:'別の冒険'});
 await context.addInitScript(({key,state,other})=>{if(!localStorage.getItem(key))localStorage.setItem(key,JSON.stringify(state));if(!localStorage.getItem(key+'-slot2'))localStorage.setItem(key+'-slot2',other);localStorage.setItem('nushi-inugoya-options-v1',JSON.stringify({textSpeed:'instant'}));},{key:saveKey,state:initial,other});
 const page=await context.newPage(),errors=[],failed=[],resources=new Set(),visits=[],pointers=[];let walked=0;
 const legacyRaw=JSON.stringify(initial),point=(name,x,y,direction)=>({name,...reference.anchor(x,y),direction});
 const legacyUnchanged=async()=>{assert.equal(await page.evaluate(key=>localStorage.getItem(key),saveKey),legacyRaw);assert.equal(await page.evaluate(key=>localStorage.getItem(key+'-slot2'),saveKey),other);};
 let verifiedArt;
 page.on('pageerror',e=>errors.push(e.message));page.on('response',r=>{const file=new URL(r.url()).pathname;if(r.status()>=400)failed.push(r.status()+' '+file);if(r.status()===200)resources.add(file);});
 const press=q=>page.locator(q)[mobile?'tap':'click'](),value=q=>page.evaluate(q=>JSON.parse(JSON.stringify(eval(q))),q);
 const state=()=>value('({x:s.x,y:s.y,direction:s.direction,avatar:s.avatar})');
 const progress=()=>value('({money:s.money,hp:s.hp,time:s.gameMinutes,caught:s.caught,baits:s.baits,items:s.items,equipment:s.equipment,pet:s.petLife,story:s.lakeStory,quests:s.questCompletions,memories:s.catchMemories,records:s.fishCatchRecords,mode:s.fightMode})');
 const shot=name=>page.screenshot({path:path.join(dir,width+'x'+height+'-'+name+'.png')});
 async function start(){
  await require('./browser-start-adventure.cjs')(page,mobile);await page.clock.runFor(240);
  if(await page.locator('#lakeIntroSkip').isVisible()){await press('#lakeIntroSkip');await page.clock.runFor(240);}
  await page.waitForFunction(()=>document.querySelector('#worldPixels').style.backgroundImage==='none');
  await page.waitForFunction(()=>playerFrontWalkImages.girl?.complete&&playerFrontWalkImages.girl.naturalWidth>0);
  await page.evaluate(()=>{Math.random=()=>.999999;window.testPointers=[];document.addEventListener('pointerdown',e=>window.testPointers.push(e.pointerType),true);});
 }
 async function movementReady(){
  for(let elapsed=0;await value('forageDiscoveryInProgress');elapsed+=100){assert.ok(elapsed<8000,'dog discovery must finish naturally');await page.clock.runFor(100);}
  assert.equal(await value('forageDiscoveryInProgress||rescueInProgress||playerHomeState.transitioning||playerHomeIsActive()||!!battle||ShuVillageSaveRuntime.isSuspended()'),false,'route accepts input before each real tap');
 }
 async function walkTo(target){
  const predicate=`(x,y,d)=>Math.hypot(x-${target.x},y-${target.y})<=2&&d===${JSON.stringify(target.direction)}`;
  const route=await page.evaluate(planVillageRoute,predicate);
  for(const d of route){await movementReady();const expected=await page.evaluate(d=>ShuWorldLife.moveTarget(s.x,s.y,d,4,isWalkableWorld),d);await press('[data-move="'+d+'"]');await page.clock.runFor(50);const actual=await state();assert.equal(await value('s.mapRegion'),'village');assert.equal(actual.x,expected.x);assert.equal(actual.y,expected.y);assert.equal(await value('isWalkableWorld(s.x,s.y)'),true);walked++;}
  const at=await state();assert.ok(Math.hypot(at.x-target.x,at.y-target.y)<=2);visits.push({name:target.name,...at});await page.clock.runFor(700);await page.waitForTimeout(700);
  const feet=await page.evaluate(()=>{const p=document.querySelector('#player').getBoundingClientRect(),m=document.querySelector('#map').getBoundingClientRect();return {dx:Math.abs(p.x+p.width/2-(m.x+m.width*s.x/240)),dy:Math.abs(p.bottom-(m.y+m.height*s.y/135))};});
  assert.ok(feet.dx<1&&feet.dy<1,'visible player feet agree with the actual position '+JSON.stringify(feet));
 }
 async function bootPose(label){
  const result=await page.evaluate(()=>{
   const c=document.querySelector('#playerSprite'),{width,height}=c,d=c.getContext('2d').getImageData(0,0,width,height).data;
   let bottom=0,footX=0,footN=0,bodyX=0,bodyN=0;
   for(let y=0;y<height;y++)for(let x=0;x<width;x++)if(d[(y*width+x)*4+3]>128)bottom=Math.max(bottom,y);
   for(let y=0;y<height;y++)for(let x=0;x<width;x++)if(d[(y*width+x)*4+3]>128){if(y>=bottom-3){footX+=x;footN++;}if(y>=height*.26&&y<height*.52){bodyX+=x;bodyN++;}}
   return {frame:playerAnimFrame,walking:playerWalking,direction:s.direction,offset:footX/footN-bodyX/bodyN,bottom,png:c.toDataURL('image/png').split(',')[1]};
  });
  fs.writeFileSync(path.join(dir,width+'x'+height+'-'+label+'.png'),Buffer.from(result.png,'base64'));delete result.png;return result;
 }
 try{
  await page.clock.install({time:new Date('2026-10-27T03:00:00Z')});await page.clock.pauseAt('2026-10-27T03:00:01Z');await page.goto(url,{waitUntil:'domcontentloaded',timeout:90000});await start();
  assert.equal((await state()).avatar,'girl');verifiedArt=await page.evaluate(async()=>{
   const source=ShuVillageReference.source.asset,bytes=await(await fetch(source)).arrayBuffer();
   return {source,rendered:ShuSceneLayers.get('world').source,path:new URL(ShuVillageReleaseCandidate.mapURL,location.href).pathname,expected:ShuVillageReleaseCandidate.mapSHA256,sha256:Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes)),v=>v.toString(16).padStart(2,'0')).join('')};
  });
  assert.match(verifiedArt.source,/^blob:/);assert.equal(verifiedArt.rendered,verifiedArt.source);assert.equal(verifiedArt.sha256,verifiedArt.expected);
  assert.equal(verifiedArt.sha256,createHash('sha256').update(fs.readFileSync(path.join(__dirname,'..',verifiedArt.path.replace(/^\/nushi-tsuri\//,'')))).digest('hex'));
  assert.ok(resources.has(verifiedArt.path),'manifest-selected painting really loaded');
  assert.ok(resources.has('/nushi-tsuri/assets/player-girl-front-walk-v252-8.png'),'girl walking sprite really loaded');
  await legacyUnchanged();const before=await progress();
  await walkTo(point('downward-walk-start',242,260,'down'));const from=await state(),expected=await page.evaluate(()=>ShuWorldLife.moveTarget(s.x,s.y,'down',4,isWalkableWorld));
  await movementReady();await press('[data-move="down"]');walked++;const moved=await state();assert.equal(moved.y,expected.y);assert.ok(moved.y>from.y);assert.equal(moved.x,from.x);
  const right=await bootPose('girl-step-right');await shot('girl-down-right');await page.clock.runFor(180);const left=await bootPose('girl-step-left');await shot('girl-down-left');
  assert.equal(right.frame,0);assert.equal(left.frame,2);assert.ok(right.walking&&left.walking);assert.equal(left.direction,'down');
  assert.ok(right.offset>1&&left.offset<-3,'actual walking switches the leading boot '+JSON.stringify({right,left}));assert.ok(Math.abs(right.bottom-left.bottom)<=1);
  await page.clock.runFor(200);assert.equal(await value('playerWalking'),false,'stopping returns to the standing pose');
  await walkTo(point('market-front',1045,681,'up'));assert.equal(await value('nearbyWorldLandmark().id'),'fish-market');const market=await state();await shot('fish-market-front');
  const controls=await page.evaluate(()=>['#action',...['up','right','down','left'].map(d=>'[data-move="'+d+'"]')].map(q=>{const n=document.querySelector(q),r=n.getBoundingClientRect(),top=document.elementFromPoint(r.x+r.width/2,r.y+r.height/2);return {q,width:r.width,height:r.height,inside:r.left>=0&&r.top>=0&&r.right<=innerWidth+1&&r.bottom<=innerHeight+1,unblocked:top===n||n.contains(top)};}));
  assert.ok(controls.every(c=>c.width>=44&&c.height>=44&&c.inside&&c.unblocked),'controls fit '+JSON.stringify(controls));
  await movementReady();await press('#action');await page.locator('#locationInterior.open').waitFor();assert.equal(await value('activeLocationId'),'fish-market');assert.deepEqual(await progress(),before);
  await press('#locationAction');assert.match(await page.locator('#locationDialogue').textContent(),/冷たい潮/);assert.deepEqual(await progress(),before);await shot('market-conversation');
  await press('#locationInterior [data-close]');assert.deepEqual(await state(),market);
  await walkTo(point('delivery-lane',1190,625,'right'));await walkTo(point('sam-from-market',1330,604,'up'));
  await movementReady();await press('#action');await page.locator('#store.open').waitFor();await press('#store [data-close]');
  await walkTo(point('east-quay',1455,625,'down'));await shot('harbor-delivery-route');
  assert.equal(await page.evaluate(()=>[...document.querySelectorAll('#worldLifeLayer .world-life-resident')].filter(n=>n.getClientRects().length).every(n=>isWalkableWorld(parseFloat(n.style.left)*2.4,parseFloat(n.style.top)*1.35))),true,'resident feet stay on land');
  await walkTo(point('market-before-save',1045,681,'up'));assert.deepEqual(await progress(),before);const savedAt=await state();pointers.push(...await page.evaluate(()=>window.testPointers));
  await page.evaluate(()=>save());const current=await page.evaluate(()=>ShuVillageProductionSession.read(1));assert.equal(current.ok,true);assert.ok(current.raw);const saved=JSON.parse(current.raw);assert.deepEqual({x:saved.x,y:saved.y,direction:saved.direction,avatar:saved.avatar},savedAt);await legacyUnchanged();assert.equal(await page.evaluate(key=>localStorage.getItem(key+'-slot2'),saveKey),other);await page.reload({waitUntil:'domcontentloaded'});await start();
  assert.deepEqual(await state(),savedAt);assert.deepEqual(await progress(),before);await legacyUnchanged();assert.equal(await page.evaluate(key=>localStorage.getItem(key+'-slot2'),saveKey),other);await shot('market-save-resume');
  await movementReady();await press('#action');await page.locator('#locationInterior.open').waitFor();await press('#locationInterior [data-close]');assert.deepEqual(await state(),savedAt);
  assert.ok(pointers.length&&pointers.every(p=>p===(mobile?'touch':'mouse')));assert.deepEqual(errors,[]);assert.deepEqual(failed,[]);
  const result={screen,verifiedArt,legacyBytesPreserved:true,modernSaveResume:true,walked,visits,boots:{right,left},newArtLoaded:true,marketEntry:true,marketConversation:true,exitFeetPreserved:true,deliveryRoute:true,saveResume:true,slotIsolation:true,progressPreserved:true,controlsFit:true,pointerType:mobile?'touch':'mouse',errors,httpErrors:failed};
  fs.writeFileSync(path.join(dir,width+'x'+height+'-result.json'),JSON.stringify(result,null,2));console.log('MARKET_WALK_PASS '+JSON.stringify(result));
 }catch(error){await shot('failure').catch(()=>{});console.error('MARKET_WALK_FAILURE '+JSON.stringify({state:await state().catch(()=>null),errors,failed}));throw error;}finally{await context.close();await browser.close();}
};
