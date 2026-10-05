const assert=require('node:assert/strict'),{chromium}=require('playwright');
const {seed,saveKey}=require('./game-harness.cjs'),Slots=require('../save-slots.js'),Options=require('../player-options.js');
module.exports=async function optionsAndStream(url,mobile=false){
 const browser=await chromium.launch({headless:true}),viewport=mobile?{width:844,height:390}:{width:1280,height:720};
 const context=await browser.newContext({viewport,isMobile:mobile,hasTouch:mobile,locale:'ja-JP'}),page=await context.newPage(),errors=[],failed=[];
 const original={...seed(),avatar:'girl',playerName:'昔の冒険',soundEnabled:false};
 await context.addInitScript(({key,state,settingsKey})=>{
  if(!localStorage.getItem('v218-fixture-ready')){
   localStorage.setItem(key,JSON.stringify(state));localStorage.removeItem(key+'-slot2');
   localStorage.setItem(settingsKey,JSON.stringify({textSpeed:'normal'}));localStorage.setItem('v218-fixture-ready','1');
  }
 },{key:saveKey,state:original,settingsKey:Options.key});
 page.on('pageerror',e=>errors.push(e.message));page.on('response',r=>{if(r.status()>=400&&/player-options|fish-iwana-v218/.test(r.url()))failed.push(r.status()+' '+r.url());});
 const press=selector=>page.locator(selector)[mobile?'tap':'click']();
 const screenshot=async screen=>console.log('V218_OPTIONS_SCREENSHOT '+JSON.stringify({mobile,screen,base64:(await page.screenshot({type:'jpeg',quality:79})).toString('base64')}));
 async function containment(){
  const layout=await page.locator('#options').evaluate(el=>{
   const r=el.getBoundingClientRect(),body=el.querySelector('.options-body'),close=el.querySelector('#optionsClose').getBoundingClientRect();
   return {inside:r.x>=0&&r.y>=0&&r.right<=innerWidth+1&&r.bottom<=innerHeight+1,horizontal:el.scrollWidth<=el.clientWidth+1,close:close.right<=r.right&&close.bottom<=r.bottom,scroll:getComputedStyle(body).overflowY==='auto'};
  });assert.ok(Object.values(layout).every(Boolean),'options layout '+JSON.stringify(layout));
 }
 const stored=key=>page.evaluate(key=>localStorage.getItem(key),key);
 async function openOptions(){await press('#menu');await press('[data-field-menu-target="options"]');await page.locator('#options.open').waitFor({state:'visible'});}
 async function rename(value){await page.locator('#optionsPlayerName').fill(value);await press('#optionsRename');assert.equal(await page.evaluate(()=>s.playerName),value);}
 try{
  await page.goto(url,{waitUntil:'load'});
  assert.equal(await page.locator('[data-avatar="boy"]').isDisabled(),true);
  await press('[data-save-slot="2"]');await page.locator('#titlePlayerName').fill('直美');await press('[data-avatar="girl"]');
  for(const selector of ['#titlePlayerName','[data-avatar="girl"]','#start','#titleOptions']){
   const b=await page.locator(selector).boundingBox();assert.ok(b.height>=44,selector+' touch size');
  }
  await screenshot('new-player');await press('#start');await page.locator('#lakeIntro.open').waitFor({state:'visible'});
  assert.equal(await page.evaluate(()=>s.playerName),'直美');assert.equal(await page.evaluate(()=>s.avatar),'girl');assert.equal(await stored(saveKey),JSON.stringify(original));
  await press('#lakeIntroNext');assert.equal(await page.locator('#lakeIntroProgress').innerText(),'1 / 5');assert.match(await page.locator('#lakeIntroPaper').innerText(),/元の暮らしへ帰る/);
  await press('#lakeIntroNext');assert.equal(await page.locator('#lakeIntroProgress').innerText(),'2 / 5');await press('#lakeIntroSkip');
  await openOptions();await containment();await rename('なおみ');await rename('直美♡');assert.equal(await page.evaluate(()=>s.avatar),'girl');assert.equal(await stored(saveKey),JSON.stringify(original));
  await press('[data-text-speed="slow"]');const slow=await page.locator('#optionsTextPreview').textContent();await page.waitForTimeout(150);const later=await page.locator('#optionsTextPreview').textContent();assert.ok(later.length>slow.length&&later.length<30,'slow speed reveals progressively');
  await press('[data-text-speed="instant"]');assert.match(await page.locator('#optionsTextPreview').innerText(),/どの魚に会えるかな/);
  await press('[data-text-speed="fast"]');assert.equal(await page.locator('[data-text-speed="fast"]').getAttribute('aria-pressed'),'true');
  assert.equal(JSON.parse(await stored(Options.key)).textSpeed,'fast');await screenshot('options');
  await press('[data-delete-save="1"]');assert.equal(await page.locator('#optionsDeleteConfirm').isDisabled(),true);assert.match(await page.locator('#optionsDeleteSummary').innerText(),/昔の冒険/);await screenshot('delete-confirm');
  await press('#optionsDeleteCancel');assert.equal(await stored(saveKey),JSON.stringify(original));await press('#optionsClose');
  await page.reload({waitUntil:'load'});assert.equal(await page.locator('[data-avatar="boy"]').isDisabled(),true);await press('#start');assert.equal(await page.evaluate(()=>s.playerName),'直美♡');assert.equal(await page.evaluate(()=>s.avatar),'girl');
  // Cast from the real stream bank. The seeded random roll chooses the first
  // positive candidate, which is Iwana; no catch record unlock is supplied.
  await page.evaluate(()=>{
   Object.assign(s,{mapRegion:'stream',x:128,y:76,direction:'left',selectedBait:'worm',selectedHook:'medium'});s.baits.worm=99;render();action();beginFishing();
   const random=Math.random;Math.random=()=>0;resolveSurfaceCast(50);Math.random=random;clearInterval(timer);startFight();clearInterval(timer);finishHookReveal();renderBattleFish();
  });assert.equal(await page.evaluate(()=>battle.f.id),'iwana');
  await page.waitForFunction(()=>{const canvas=document.querySelector('#battleFish canvas');if(!canvas)return false;const data=canvas.getContext('2d').getImageData(0,0,canvas.width,canvas.height).data;let n=0;for(let i=3;i<data.length;i+=4)if(data[i]>100)n++;return n>3500;});
  await screenshot('iwana-fight');await page.evaluate(()=>{caught();hideCatchCard();save();});assert.equal(await page.evaluate(()=>s.caught.iwana),1);
  assert.equal(await page.evaluate(()=>s.fishCatchRecords.iwana.last.spotId),'mountain-stream-mid');
  await openOptions();await press('[data-delete-save="1"]');await page.locator('#optionsDeleteCheck').check();await press('#optionsDeleteConfirm');assert.equal(await stored(saveKey),null);assert.ok(await stored(Slots.keys[2]));
  await press('[data-delete-save="2"]');await page.locator('#optionsDeleteCheck').check();await press('#optionsDeleteConfirm');await page.locator('#title.active').waitFor({state:'visible'});
  await page.waitForTimeout(850);assert.equal(await stored(Slots.keys[2]),null);assert.equal(JSON.parse(await stored(Options.key)).textSpeed,'fast');
  await page.reload({waitUntil:'load'});assert.equal(await stored(Slots.keys[2]),null);assert.equal(await page.locator('#titlePlayerName').isDisabled(),false);assert.equal(await page.locator('[data-avatar="boy"]').isDisabled(),false);
  assert.deepEqual(errors,[]);assert.deepEqual(failed,[]);console.log('V218_PLAYER_OPTIONS_STREAM_PASS '+JSON.stringify({mobile,identity:true,genderFixed:true,speed:true,deleteIsolation:true,noResurrection:true,iwana:true,errors}));
 }finally{await context.close();await browser.close();}
};
