const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),{chromium}=require('playwright');
const {fixture}=require('./aquarium-identity-fixture.cjs'),enter=require('./browser-start-adventure.cjs');
const key='nushi-inugoya-v2',key2=key+'-slot2';
module.exports=async function titleFlow(url,screen){
 const {width,height,mobile,dpr}=screen,browser=await chromium.launch({headless:true});let context=await browser.newContext({viewport:{width,height},isMobile:mobile,hasTouch:mobile,deviceScaleFactor:dpr,locale:'ja-JP',serviceWorkers:'block'});
 const dir=path.join(__dirname,'title-flow-evidence');fs.mkdirSync(dir,{recursive:true});const errors=[],httpErrors=[],layouts=[];let page;
 const legacy={...fixture(),playerName:'湖の先輩',avatar:'girl',dog:'grey',dogNames:{shuu:'こむぎ',riku:'風太',grey:'夜空'},dogFollowing:false,dogTricks:{shuu:543,riku:210,grey:777},extraFuture:{keep:true}};
 try{
  page=await context.newPage();const press=q=>page.locator(q)[mobile?'tap':'click']();
  page.on('pageerror',e=>errors.push(e.message));page.on('response',r=>{if(r.status()>=400&&r.url().startsWith(new URL(url).origin+'/nushi-tsuri/'))httpErrors.push(r.status()+' '+r.url());});
  const shot=name=>page.screenshot({path:path.join(dir,`${width}x${height}-${name}.png`)});
  const stored=k=>page.evaluate(k=>localStorage.getItem(k),k);
  const current=id=>page.evaluate(id=>ShuVillageProductionSession.read(id).raw,id);
  async function resetScenario(values={}){
   // A new isolated browser storage profile, never deletion of live generation data.
   await context.close();context=await browser.newContext({viewport:{width,height},isMobile:mobile,hasTouch:mobile,deviceScaleFactor:dpr,locale:'ja-JP',serviceWorkers:'block'});
   await context.addInitScript(values=>{if(!sessionStorage.getItem('fixture-seeded')){for(const [k,v] of Object.entries(values))localStorage.setItem(k,v);sessionStorage.setItem('fixture-seeded','1');}},values);
   page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));page.on('response',r=>{if(r.status()>=400&&r.url().startsWith(new URL(url).origin+'/nushi-tsuri/'))httpErrors.push(r.status()+' '+r.url());});
   await page.goto(url,{waitUntil:'load'});await page.waitForFunction(()=>globalThis.ShuVillageReleaseGate?.started===true);
  }
  async function fits(name){
   const layout=await page.locator('#title').evaluate(el=>{
    const box=el.querySelector('.title-box'),pages=el.querySelector('.title-pages'),r=box.getBoundingClientRect();
    return {phase:el.dataset.phase,box:r.toJSON(),viewport:[innerWidth,innerHeight],horizontal:pages.scrollWidth-pages.clientWidth,vertical:pages.scrollHeight-pages.clientHeight,controls:[...el.querySelectorAll('button,input')].filter(b=>b.getClientRects().length).map(b=>{const v=b.getBoundingClientRect();return {id:b.id||b.dataset.saveSlot||b.dataset.avatar||b.dataset.dog||b.textContent,x:v.x,y:v.y,width:v.width,height:v.height,inside:v.x>=0&&v.y>=0&&v.right<=innerWidth+1&&v.bottom<=innerHeight+1};})};
   });assert.ok(layout.box.x>=0&&layout.box.y>=0&&layout.box.bottom<=height+1);assert.ok(layout.horizontal<=1&&layout.vertical<=1,JSON.stringify(layout));
   for(const c of layout.controls)assert.ok(c.inside&&c.height>=44,JSON.stringify(c));layouts.push(layout);await shot(name);
  }
  await resetScenario({'nushi-inugoya-options-v1':JSON.stringify({textSpeed:'instant'})});
  await fits('menu');assert.equal(await stored(key),null);await press('#titleContinue');await fits('no-save');assert.match(await page.locator('#titleEmptyNote').innerText(),/まだセーブがない/);await press('[data-title-panel="slots"] [data-title-back]');
  await press('#titleOptions');await page.locator('#optionsBgmVolume').fill('0');await page.locator('#optionsBgmVolume').dispatchEvent('input');await press('#optionsClose');assert.equal(await stored(key),null);
  await press('#titleNew');await fits('empty-slots');await press('[data-save-slot="1"]');await press('#titleSlotsNext');
  await press('[data-avatar="girl"]');await page.locator('#titlePlayerName').fill('あ'.repeat(13));await press('#titleCharacterNext');assert.equal(await page.locator('#title').getAttribute('data-phase'),'character');assert.equal(await stored(key),null);
  await page.locator('#titlePlayerName').fill('👩‍👩‍👧‍👦'.repeat(12));await fits('character');await page.locator('#titlePlayerName').dispatchEvent('compositionstart');await page.locator('#titlePlayerName').press('Enter');assert.equal(await page.locator('#title').getAttribute('data-phase'),'character');await page.locator('#titlePlayerName').dispatchEvent('compositionend');await page.locator('#titlePlayerName').fill('直美♡');await press('#titleCharacterNext');
  await fits('dogs');for(const id of ['shuu','riku','grey']){await press(`[data-dog="${id}"]`);assert.equal(await page.locator(`[data-dog="${id}"]`).getAttribute('aria-pressed'),'true');}
  const assets=await page.evaluate(async()=>{const sources=['assets/shuu-walk.png?v=12','assets/riku-walk.png?v=12','assets/grey-walk.png?v=12'];return Promise.all(sources.map(async src=>{const im=new Image();im.src=src;await im.decode();return {src,width:im.naturalWidth,height:im.naturalHeight};}));});assert.ok(assets.every(a=>a.width>0&&a.height>0));
  await press('#titleDogsNext');await fits('confirm');await press('[data-title-panel="confirm"] [data-title-back]');await press('[data-title-panel="dogs"] [data-title-back]');assert.equal(await page.locator('#titlePlayerName').inputValue(),'直美♡');await press('[data-title-panel="character"] [data-title-cancel]');assert.equal(await stored(key),null);
  await enter(page,mobile,{slot:1,avatar:'girl',dog:'grey',name:'直美♡'});await page.locator('#game.active').waitFor();if(await page.locator('#lakeIntroSkip').isVisible())await press('#lakeIntroSkip');
  const fresh=JSON.parse(await current(1));assert.equal(await stored(key),null,'new production save does not write legacy raw');assert.equal(fresh.playerName,'直美♡');assert.equal(fresh.avatar,'girl');assert.equal(fresh.dog,'grey');assert.equal(Object.keys(fresh.dogAffinity).length,3);assert.equal(fresh.petLife.version,6);assert.equal(await page.evaluate(()=>fish.length),66);await shot('new-game');
  await page.reload({waitUntil:'load'});await enter(page,mobile);assert.equal(await page.evaluate(()=>s.playerName),'直美♡');assert.equal(await page.evaluate(()=>s.avatar),'girl');assert.equal(await page.evaluate(()=>s.dog),'grey');assert.equal(await page.evaluate(()=>audioOptions.bgmVolume),0);
  // A real old aquarium save in slot one survives a new second adventure byte for byte.
  await press('#menu');await press('[data-field-menu-target="saveSlots"]');await page.locator('#title.active').waitFor();
  await resetScenario({[key]:JSON.stringify(legacy)});const before=await stored(key);
  await enter(page,mobile,{slot:2,avatar:'boy',dog:'shuu',name:'二の旅人'});await page.locator('#game.active').waitFor();if(await page.locator('#lakeIntroSkip').isVisible())await press('#lakeIntroSkip');assert.equal(await stored(key),before);assert.equal(await page.evaluate(()=>activeSaveSlot),2);assert.equal(await page.evaluate(()=>s.dog),'shuu');const secondRaw=await current(2);assert.equal(await stored(key2),null);
  const one=new URL(url);one.searchParams.set('saveSlot','1');await page.goto(one.href,{waitUntil:'load'});assert.equal(await stored(key),before);await enter(page,mobile,{slot:1});assert.equal(await page.evaluate(()=>s.playerName),'湖の先輩');assert.equal(await page.evaluate(()=>s.avatar),'girl');assert.equal(await page.evaluate(()=>s.dog),'grey');assert.equal(await page.evaluate(()=>s.dogFollowing),false);assert.deepEqual(await page.evaluate(()=>s.dogNames),legacy.dogNames);assert.deepEqual(await page.evaluate(()=>s.dogTricks),legacy.dogTricks);assert.equal(await current(2),secondRaw);assert.equal(await stored(key),before);await shot('legacy-resume');
  await press('#menu');await press('[data-field-menu-target="options"]');await press('[data-favorite-dog="riku"]');assert.equal(await page.evaluate(()=>s.dog),'riku');assert.equal(await page.evaluate(()=>s.dogFollowing),false);assert.equal(Object.keys(await page.evaluate(()=>s.dogAffinity)).length,3);await press('#optionsClose');
  await page.reload({waitUntil:'load'});await press('#titleNew');await fits('slots-full');assert.match(await page.locator('#titleEmptyNote').innerText(),/空きセーブがない/);
  // A second tab occupying a draft is rechecked at the final commit.
  await resetScenario({[key]:JSON.stringify(legacy)});await press('#titleNew');await press('[data-save-slot="2"]');await press('#titleSlotsNext');await press('#titleCharacterNext');await press('#titleDogsNext');
  await page.evaluate(({key2,legacy})=>localStorage.setItem(key2,JSON.stringify(legacy)),{key2,legacy});await press('#start');assert.equal(await page.evaluate(()=>gameStarted),false);assert.equal(await stored(key2),JSON.stringify(legacy));await fits('race-protected');
  assert.equal(await page.evaluate(()=>ShuVillageSaveRuntime.isSuspended()),true,'unexpected legacy change blocks production writes');await resetScenario({[key]:JSON.stringify(legacy),[key2]:'{broken'});await press('#titleContinue');assert.equal(await page.locator('[data-save-slot="2"]').isDisabled(),true);assert.equal(await stored(key2),'{broken');
  // A different legacy tab deleting an occupied slot is a conflict, not consent
  // to overwrite a production generation. Preserve both records and stop.
  await page.goto(one.href,{waitUntil:'load'});await page.waitForFunction(()=>globalThis.ShuVillageReleaseGate?.started===true);
  const protectedRaw=await current(1);await page.evaluate(k=>localStorage.removeItem(k),key);
  await press('#titleNew');assert.equal(await page.evaluate(()=>ShuVillageSaveRuntime.isSuspended()),true);
  assert.equal(await page.evaluate(()=>ShuVillageProductionSession.inspectRecovery(1).currentRaw),protectedRaw);assert.equal(await stored(key2),'{broken');await shot('deleted-slot-protected');
  // A genuinely empty first slot can still start, with a corrupt second slot kept.
  await resetScenario({[key2]:'{broken'});await enter(page,mobile,{slot:1,isNew:true,avatar:'girl',dog:'grey',name:'新しい冒険'});
  assert.equal(await page.evaluate(()=>s.playerName),'新しい冒険');assert.equal(await page.evaluate(()=>s.money),300);assert.deepEqual(await page.evaluate(()=>s.caught),{});assert.equal(await page.evaluate(()=>s.dogAffinity.shuu),0);assert.equal(await page.evaluate(()=>s.extraFuture),undefined);assert.equal(await stored(key2),'{broken');await shot('empty-slot-new');
  assert.deepEqual(errors,[]);assert.deepEqual(httpErrors,[]);
  const result={screen,layouts,assets,newGame:true,continue:true,oldSave:true,slotIsolation:true,cancel:true,ime:true,fullSlots:true,changedSlot:true,deletedSlot:true,corruptSave:true,settings:true,catalogue:66,errors,httpErrors};fs.writeFileSync(path.join(dir,`${width}x${height}-result.json`),JSON.stringify(result,null,2));console.log('TITLE_FLOW_PASS '+JSON.stringify({screen,newGame:true,continue:true,oldSave:true,slotIsolation:true,cancel:true,ime:true,fullSlots:true,changedSlot:true,deletedSlot:true,corruptSave:true,settings:true,errors,httpErrors}));
 }catch(error){if(page)await page.screenshot({path:path.join(dir,`${width}x${height}-failure.png`)}).catch(()=>{});fs.writeFileSync(path.join(dir,`${width}x${height}-failure.json`),JSON.stringify({screen,error:error.stack,errors,httpErrors},null,2));throw error;}
 finally{await context.close();await browser.close();}
};
