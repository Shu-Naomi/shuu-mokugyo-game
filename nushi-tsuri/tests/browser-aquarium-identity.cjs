const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),{chromium}=require('playwright');
const {fixture}=require('./aquarium-identity-fixture.cjs'),{saveKey}=require('./game-harness.cjs');
module.exports=async function identityUI(url,screen){
 const {width,height,mobile,dpr}=screen,viewport={width,height},browser=await chromium.launch({headless:true});
 const context=await browser.newContext({viewport,isMobile:mobile,hasTouch:mobile,deviceScaleFactor:dpr,locale:'ja-JP',serviceWorkers:'block'});
 const errors=[],httpErrors=[],directory=path.join(__dirname,'aquarium-identity-evidence');fs.mkdirSync(directory,{recursive:true});
 let page;
 try{
  await context.addInitScript(({key,state})=>{localStorage.setItem('nushi-inugoya-options-v1',JSON.stringify({textSpeed:'instant'}));if(!localStorage.getItem(key))localStorage.setItem(key,JSON.stringify(state));},{key:saveKey,state:fixture()});
  page=await context.newPage();const press=q=>page.locator(q)[mobile?'tap':'click']();
  page.on('pageerror',e=>errors.push(e.message));page.on('response',r=>{if(r.status()>=400&&r.url().startsWith(new URL(url).origin+'/nushi-tsuri/'))httpErrors.push(r.status()+' '+r.url());});
  const shot=async name=>page.screenshot({path:path.join(directory,`${width}x${height}-${name}.png`)});
  const snapshot=()=>page.evaluate(()=>({fish:s.petLife.fish,eggs:s.petLife.eggs,money:s.money,food:s.petLife.food,time:s.gameMinutes,caught:s.caught}));
  async function enter(){await press('#start');if(await page.locator('#lakeIntroSkip').isVisible())await press('#lakeIntroSkip');await press('#action');await press('[data-pet-action="aquarium"]');}
  async function fits(){
   const layout=await page.evaluate(()=>{
    const box=e=>{const r=e.getBoundingClientRect();return {x:r.x,y:r.y,w:r.width,h:r.height};},sidebar=document.querySelector('.pet-tank-info'),content=document.querySelector('.pet-content');
    const visible=e=>{const r=e.getBoundingClientRect(),s=sidebar.getBoundingClientRect();return r.width>0&&r.height>0&&r.top>=s.top-1&&r.bottom<=s.bottom+1;};
    return {scroll:content.scrollHeight-content.clientHeight,sideScroll:sidebar.scrollHeight-sidebar.clientHeight,stage:box(document.querySelector('#petTankStage,#petInspectStage')),
     profile:box(sidebar),identity:{text:document.querySelector('.pet-profile-identity').textContent,visible:visible(document.querySelector('.pet-profile-identity')),font:parseFloat(getComputedStyle(document.querySelector('.pet-profile-identity')).fontSize)},
     rosterFont:parseFloat(getComputedStyle(document.querySelector('[data-pet-identity]')).fontSize),xpVisible:visible(document.querySelector('.pet-xp-line'))&&getComputedStyle(document.querySelector('.pet-xp-line')).display!=='none',
     controls:[...document.querySelectorAll('.pet-care-dock button')].map(e=>({action:e.dataset.petAction,...box(e)})),gauges:[...document.querySelectorAll('.pet-gauge')].map(e=>({text:e.textContent,visible:visible(e)})),
     card:[...document.querySelectorAll('.pet-fish-roster button')].filter(e=>e.getAttribute('aria-pressed')==='true').map(e=>({...box(e),labelWidth:e.querySelector('small').scrollWidth,labelClient:e.querySelector('small').clientWidth}))};
   });
   assert.ok(layout.scroll<=1&&layout.sideScroll<=1,'no hidden details or main scrolling '+JSON.stringify(layout));
   assert.ok(layout.stage.w>=260&&layout.stage.h>=130,'tank retains its display area '+JSON.stringify(layout));
   assert.equal(layout.identity.visible,true);assert.ok(layout.identity.font>=12&&layout.rosterFont>=12);assert.equal(layout.xpVisible,true);assert.ok(layout.gauges.every(g=>g.visible));
   for(const b of layout.controls)assert.ok(b.h>=44&&b.x>=0&&b.x+b.w<=width+1&&b.y>=0&&b.y+b.h<=height+1,'care hit target '+JSON.stringify(b));
   for(const c of layout.card)assert.ok(c.h>=44&&c.labelWidth<=c.labelClient+1,'roster text and touch target '+JSON.stringify(c));
   return layout;
  }
  await page.goto(url,{waitUntil:'load'});await enter();
  await page.waitForFunction(()=>[...document.querySelectorAll('[data-pet-card-art="pet-23"] canvas')].some(c=>{const a=c.getContext('2d').getImageData(0,0,c.width,c.height).data;let n=0;for(let i=3;i<a.length;i+=4)if(a[i]>100)n++;return n>500;}));
  assert.equal(await page.locator('.pet-fish-roster button').count(),5);const before=await snapshot(),overview=await fits();await shot('overview');
  const checked=[];
  for(const [uid,compact,detail] of [['pet-23','#23 ♂ 初代','♂ オス · 初代'],['pet-32','#32 ♀ 2代目','♀ メス · 2代目'],['pet-33','#33 ♂ 3代目','♂ オス · 3代目'],['pet-34','#34 性別不明 世代不明','性別不明 · 世代不明'],['pet-35','#35 ♀ 21代目','♀ メス · 21代目']]){
   await press('.pet-fish-roster [data-pet-inspect="'+uid+'"]');await page.waitForFunction(id=>document.querySelector('.pet-fish-roster button[aria-pressed="true"]')?.dataset.petInspect===id,uid);
   assert.ok((await page.locator('[data-pet-identity="'+uid+'"]').innerText()).startsWith(compact));assert.equal(await page.locator('.pet-profile-identity').innerText(),detail);
   await fits();await shot(uid);checked.push({uid,compact,detail});
   if(uid==='pet-33')assert.match(await page.locator('[data-pet-size-rank]').innerText(),/稚魚/);
  }
  await press('.pet-fish-roster [data-pet-inspect="pet-34"]');await press('[data-pet-action="records"]');
  assert.match(await page.locator('.pet-stats').innerText(),/性別\s*性別不明.*世代・星\s*世代不明/s);await shot('legacy-records');await press('.pet-sheet [data-pet-action="panel-close"]');
  assert.deepEqual(await snapshot(),before);
  const saved=await page.evaluate(key=>JSON.parse(localStorage.getItem(key)),saveKey);assert.equal(saved.petLife.version,5);
  await page.reload({waitUntil:'load'});await enter();assert.deepEqual(await snapshot(),before);assert.equal(await page.locator('.pet-profile-identity').innerText(),'性別不明 · 世代不明');await fits();await shot('legacy-resumed');
  // Existing care operations still apply once to the same five fish and survive resume.
  await press('[data-pet-action="feed"]');assert.equal(await page.evaluate(()=>s.petLife.food),before.food-5);assert.equal(await page.locator('[data-pet-action="feed"]').isDisabled(),true);
  await press('[data-pet-action="water"]');assert.equal(await page.locator('[data-pet-action="water"]').isDisabled(),true);assert.equal(await page.locator('[aria-label="水質"]').getAttribute('aria-valuenow'),'100');
  const cared=await snapshot();await page.reload({waitUntil:'load'});await enter();assert.deepEqual(await snapshot(),cared);assert.equal(await page.locator('.pet-profile-identity').innerText(),'性別不明 · 世代不明');await fits();await shot('cared-resumed');
  assert.deepEqual(errors,[]);assert.deepEqual(httpErrors,[]);
  const result={screen,overview,checked,legacyResume:true,careOnce:true,careResume:true,unchangedEggs:true,errors,httpErrors};
  fs.writeFileSync(path.join(directory,`${width}x${height}-result.json`),JSON.stringify(result,null,2));console.log('AQUARIUM_IDENTITY_PASS '+JSON.stringify(result));
 }catch(error){
  if(page)await page.screenshot({path:path.join(directory,`${width}x${height}-failure.png`)}).catch(()=>{});
  fs.writeFileSync(path.join(directory,`${width}x${height}-failure.json`),JSON.stringify({error:error.stack,screen,errors,httpErrors},null,2));throw error;
 }finally{await context.close();await browser.close();}
};
