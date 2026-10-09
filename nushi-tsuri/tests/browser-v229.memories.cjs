const assert=require('node:assert/strict'),{chromium}=require('playwright');
const {seed,saveKey}=require('./game-harness.cjs');

module.exports=async function memories(url,mobile=false){
 const browser=await chromium.launch({headless:true});
 const context=await browser.newContext({viewport:mobile?{width:844,height:390}:{width:1280,height:720},isMobile:mobile,hasTouch:mobile,locale:'ja-JP',serviceWorkers:'block'});
 const first={hundredths:2150,gameMinutes:500,spotId:'lake-shallow',castLocale:'lake',rodId:'bamboo',baitId:'worm',hookId:'small',method:'bait',fightMode:'gauge',weatherId:'sunny',dogId:'shuu'};
 const best={...first,hundredths:4999,gameMinutes:2960,rodId:'tideMaster',baitId:'corn',hookId:'large',fightMode:'nushi',weatherId:'rain',dogId:'grey'};
 const initial={...seed(),soundEnabled:false,caught:{funa:3},sizeRecords:{funa:{hundredths:4999,tierId:'giant'}},catchMemories:{funa:{first,best}}};
 await context.addInitScript(({state,key})=>{localStorage.setItem('nushi-inugoya-options-v1',JSON.stringify({textSpeed:'instant'}));if(!localStorage.getItem(key))localStorage.setItem(key,JSON.stringify(state));},{state:initial,key:saveKey});
 const page=await context.newPage(),errors=[],failed=[];
 page.on('pageerror',e=>errors.push(e.message));page.on('response',r=>{if(r.status()>=400&&/catch-memories/.test(r.url()))failed.push(r.status()+' '+r.url());});
 const press=q=>page.locator(q)[mobile?'tap':'click']();
 const resources=()=>page.evaluate(()=>({money:s.money,hp:s.hp,time:s.gameMinutes,caught:s.caught,baits:s.baits,memories:s.catchMemories}));
 try{
  await page.goto(url,{waitUntil:'load'});await press('#start');if(await page.locator('#lakeIntroSkip').isVisible())await press('#lakeIntroSkip');
  await press('#menu');await press('[data-field-menu-target="record"]');await press('[data-fishdex-id="funa"]');
  const before=await resources(),summary=page.locator('.fishdex-memories > summary');
  assert.ok((await summary.boundingBox()).height>=42,'touch target');
  await press('.fishdex-memories > summary');assert.equal(await page.locator('.fishdex-memories').evaluate(el=>el.open),true);
  const one=await page.locator('[data-catch-memory="first"]').innerText(),maximum=await page.locator('[data-catch-memory="best"]').innerText();
  assert.match(one,/21\.50cm/);assert.match(one,/1日目 08:20/);assert.match(one,/晴れ/);assert.match(one,/シュウ/);assert.match(one,/ゲージ式/);
  assert.match(maximum,/49\.99cm/);assert.match(maximum,/3日目 01:20/);assert.match(maximum,/小雨/);assert.match(maximum,/Grey/);assert.match(maximum,/ぬし釣り式/);
  assert.equal(await page.locator('#record').evaluate(el=>el.scrollWidth<=el.clientWidth+1),true);
  for(const selector of ['.fishdex-memory-pages','.fishdex-memory-page','.fishdex-memory-facts'])
    assert.equal(await page.locator(selector).evaluateAll(els=>els.every(el=>el.scrollWidth<=el.clientWidth+1)),true,selector+' wraps');
  console.log('V229_SCREENSHOT '+JSON.stringify({mobile,screen:'memories',base64:(await page.screenshot({type:'jpeg',quality:85})).toString('base64')}));
  await page.locator('[data-catch-memory="best"] .fishdex-memory-facts').scrollIntoViewIfNeeded();
  console.log('V229_SCREENSHOT '+JSON.stringify({mobile,screen:'memories-detail',base64:(await page.screenshot({type:'jpeg',quality:85})).toString('base64')}));
  if(!mobile){await summary.focus();await page.keyboard.press('Space');assert.equal(await page.locator('.fishdex-memories').evaluate(el=>el.open),false);await page.keyboard.press('Enter');assert.equal(await page.locator('.fishdex-memories').evaluate(el=>el.open),true);}
  await press('[data-fishdex-id="starNushi"]');assert.equal(await page.locator('.fishdex-memories').count(),0);assert.match(await page.locator('#fishdexDetail').innerText(),/未発見/);
  await press('[data-fishdex-id="funa"]');await press('.fishdex-close');assert.deepEqual(await resources(),before);
  await page.reload({waitUntil:'load'});await press('#start');assert.deepEqual(await resources(),before);
  assert.deepEqual(errors,[]);assert.deepEqual(failed,[]);
  console.log('V229_MEMORIES_PASS '+JSON.stringify({mobile,first:true,best:true,reloaded:true,resourcesUnchanged:true,errors,failed}));
 }finally{await context.close();await browser.close();}
};
