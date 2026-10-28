const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),{chromium}=require('playwright');
const {seed,saveKey}=require('./game-harness.cjs'),old=require('./aquarium-mutation-koi-fixture.cjs'),{pressProduct}=require('./compact-ui-helpers.cjs');
const fresh=()=>({...seed(),money:10000,x:199,y:36,soundEnabled:false,petLife:{version:6,fish:[],mutationSeed:'a'.repeat(32)}});
module.exports=async function notebookUI(url,screen,scenario){
 const {width,height,mobile,dpr}=screen,browser=await chromium.launch({headless:true}),context=await browser.newContext({viewport:{width,height},isMobile:mobile,hasTouch:mobile,deviceScaleFactor:dpr,locale:'ja-JP',serviceWorkers:'block'});
 const dir=path.join(__dirname,'pet-notebook-evidence',scenario);fs.mkdirSync(dir,{recursive:true});const errors=[],httpErrors=[];let page;
 const state=scenario==='new'?fresh():old.fixture(),other=JSON.stringify({...fresh(),money:7654,petNotebook:{version:1,receivedDay:0,source:'existing',announced:true,species:[{id:'koi',firstRecordedDay:0}]}});
 try{
  await context.addInitScript(({key,state,other})=>{if(!localStorage.getItem(key))localStorage.setItem(key,JSON.stringify(state));if(!localStorage.getItem(key+'-slot2'))localStorage.setItem(key+'-slot2',other);localStorage.setItem('nushi-inugoya-options-v1',JSON.stringify({textSpeed:'instant'}));window.__notebookWrites=0;const set=Storage.prototype.setItem;Storage.prototype.setItem=function(k,v){if(k===key)window.__notebookWrites++;return set.call(this,k,v);};},{key:saveKey,state,other});
  page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));page.on('response',r=>{if(r.status()>=400&&r.url().startsWith(new URL(url).origin+'/nushi-tsuri/'))httpErrors.push(r.status()+' '+r.url());});
  const press=q=>page.locator(q)[mobile?'tap':'click'](),shot=name=>page.screenshot({path:path.join(dir,`${width}x${height}-${name}.png`)});
  async function painted(){await page.waitForFunction(()=>{const c=document.querySelector('.pet-notebook-portrait canvas');return c&&c.getContext('2d').getImageData(0,0,c.width,c.height).data.some((v,i)=>i%4===3&&v>128);});}
  async function start(){await require('./browser-start-adventure.cjs')(page,mobile);if(await page.locator('#lakeIntroSkip').isVisible())await press('#lakeIntroSkip');}
  async function menuBook(){if(!await page.locator('#fieldMenu').evaluate(e=>e.classList.contains('show')))await press('#menu');await press('#petNotebookMenu');await page.waitForSelector('#petLifeModal.pet-notebook');}
  async function editName(uid,value,{cancel=false,invalidFirst=false}={}){
   const before=await page.evaluate(()=>JSON.stringify(s)),writes=await page.evaluate(()=>window.__notebookWrites),selected=await page.evaluate(()=>s.petLife.selected);
   await press('[data-pet-name="'+uid+'"]');await page.waitForSelector('#petNameForm');await page.locator('#petNickname').fill(value);
   const form=await page.locator('#petNameForm').evaluate(e=>{const r=e.getBoundingClientRect();return {inside:r.left>=0&&r.top>=0&&r.right<=innerWidth+1&&r.bottom<=innerHeight+1,controls:[...e.querySelectorAll('input,button')].map(b=>{const a=b.getBoundingClientRect();return {w:a.width,h:a.height};})};});assert.ok(form.inside);assert.ok(form.controls.every(b=>b.w>=44&&b.h>=44),JSON.stringify(form));
   assert.equal(await page.evaluate(()=>JSON.stringify(s)),before);assert.equal(await page.evaluate(()=>window.__notebookWrites),writes);await shot('nickname-editor');
   if(cancel){await page.keyboard.press('x');assert.equal(await page.locator('#petNameForm').isVisible(),true);await page.keyboard.press('Escape');assert.equal(await page.evaluate(()=>JSON.stringify(s)),before);assert.equal(await page.evaluate(()=>window.__notebookWrites),writes);return;}
   if(invalidFirst){await page.locator('#petNickname').fill('あ'.repeat(13));await press('[data-pet-action="nickname-save"]');assert.match(await page.locator('#petNameError').innerText(),/1〜12文字/);assert.equal(await page.evaluate(()=>JSON.stringify(s)),before);await page.locator('#petNickname').fill(value);}
   await press('[data-pet-action="nickname-save"]');await page.waitForSelector('#petNameForm',{state:'detached'});assert.equal(await page.evaluate(()=>s.petLife.selected),selected);
   assert.equal(await page.evaluate(uid=>s.petLife.fish.find(f=>f.uid===uid).nickname??'',uid),value);assert.equal(await page.evaluate(()=>window.__notebookWrites),writes+1);
   const unchanged=await page.evaluate(()=>{const a=JSON.parse(JSON.stringify(s));for(const f of a.petLife.fish)delete f.nickname;return JSON.stringify(a);}),oldState=JSON.parse(before);for(const f of oldState.petLife.fish)delete f.nickname;assert.equal(unchanged,JSON.stringify(oldState));
  }
  async function layout(){const r=await page.evaluate(()=>{const modal=document.querySelector('#petLifeModal'),c=modal.querySelector('.pet-content'),rect=modal.getBoundingClientRect();return {scroll:c.scrollHeight-c.clientHeight,inside:rect.left>=0&&rect.top>=0&&rect.right<=innerWidth+1&&rect.bottom<=innerHeight+1,buttons:[...modal.querySelectorAll('.pet-heading button,.pet-notebook-toolbar button,.pet-notebook-species button,.pet-notebook-roster button')].map(b=>{const x=b.getBoundingClientRect();return {w:x.width,h:x.height};})};});assert.ok(r.inside);assert.ok(r.scroll<=1,JSON.stringify(r));assert.ok(r.buttons.every(b=>b.w>=44&&b.h>=44),JSON.stringify(r));return r;}
  await page.goto(url,{waitUntil:'load'});assert.equal(await page.evaluate(()=>window.__notebookWrites),0);await start();assert.equal(await page.locator('#petNotebookMenu').isHidden(),true);await press('#action');
  const before=await page.evaluate(()=>({money:s.money,caught:s.caught,seed:s.petLife.mutationSeed}));
  if(scenario==='new')await pressProduct(page,'[data-pet-buy="funa"]',mobile);else await press('[data-pet-action="notebook-receive"]');
  await page.waitForFunction(()=>s.petNotebook?.announced===true);assert.match(await page.locator('.pet-message').innerText(),/育成ノートをどうぞ/);await shot('gift');
  assert.equal(await page.evaluate(()=>s.petNotebook.source),scenario==='new'?'purchase':'existing');assert.deepEqual(await page.evaluate(()=>s.caught),before.caught);assert.equal(await page.evaluate(()=>s.petLife.mutationSeed),before.seed);
  if(scenario==='new'){
   assert.equal(await page.evaluate(()=>s.money),before.money-await page.evaluate(()=>petCatalog.find(f=>f.id==='funa').price));
   await pressProduct(page,'[data-pet-buy="nijimasu"]',mobile);await press('[data-pet-action="notebook"]');await painted();await layout();await shot('first-page');
   await editName('pet-2','あ'.repeat(12),{invalidFirst:true});await layout();await shot('named-page');
   await press('[data-notebook-species="funa"]');assert.match(await page.locator('.pet-notebook-specimen').innerText(),/フナ/);await editName('pet-1','キャンセル🐟',{cancel:true});await editName('pet-1','ふな🐟');await editName('pet-1','');await press('[data-pet-action="notebook-back"]');
   await press('[data-pet-action="aquarium"]');await press('.pet-fish-roster [data-pet-inspect="pet-1"]');await press('[data-pet-action="records"]');await press('[data-pet-panel-tab="manage"]');await press('[data-pet-action="rehome"]');await press('[data-pet-action="rehome-confirm"]');
   await press('[data-pet-action="close"]');await menuBook();await press('[data-notebook-species="funa"]');assert.match(await page.locator('.pet-notebook-empty').innerText(),/ページ.*残って/);await layout();await shot('species-kept');
  }else{
   assert.equal(await page.evaluate(()=>s.money),before.money);await press('[data-pet-action="aquarium"]');
   for(let d=0;d<2;d++){await press('[data-pet-action="close"]');await page.evaluate(()=>{sleepUntilNextMorning(s);save();render();});await press('#action');await press('[data-pet-action="aquarium"]');}
   assert.equal(await page.evaluate(()=>s.petLife.fish.find(f=>f.uid==='pet-6').mutation.kind),'gold');await press('[data-pet-action="close"]');await menuBook();
   await press('[data-notebook-species="koi"]');await press('[data-notebook-fish="pet-6"]');await page.waitForSelector('.pet-notebook-portrait canvas[data-art-variant="koiGold"]');assert.match(await page.locator('.pet-notebook-specimen').innerText(),/3代目/);await editName('pet-6','こがね🐟');await painted();await layout();await shot('gold-koi');
   await press('[data-notebook-species="funa"]');await press('[data-notebook-fish="pet-4"]');await editName('pet-4','むかしの子');assert.match(await page.locator('.pet-notebook-specimen').innerText(),/性別不明.*世代不明/s);await shot('legacy-unknown');
   await press('[data-notebook-fish="pet-3"]');await page.waitForSelector('.pet-notebook-portrait canvas[data-art-variant="funaGold"]');await painted();await shot('gold-funa');
  }
  const beforeRead=await page.evaluate(()=>JSON.stringify(s));const writes=await page.evaluate(()=>window.__notebookWrites);await press('[data-notebook-species="funa"]');assert.equal(await page.evaluate(()=>JSON.stringify(s)),beforeRead);assert.equal(await page.evaluate(()=>window.__notebookWrites),writes,'reading does not save');
  await page.reload({waitUntil:'load'});await start();await menuBook();await layout();await shot('resumed');const book=await page.evaluate(()=>s.petNotebook);assert.equal(book.announced,true);assert.equal(await page.evaluate(uid=>s.petLife.fish.find(f=>f.uid===uid).nickname,scenario==='new'?'pet-2':'pet-6'),scenario==='new'?'あ'.repeat(12):'こがね🐟');await page.keyboard.press('Escape');assert.equal(await page.locator('#petLifeModal').isVisible(),false);
  await press('#action');assert.doesNotMatch(await page.locator('.pet-message').innerText(),/育成ノートをどうぞ/);assert.equal(await page.locator('[data-pet-action="notebook-receive"]').count(),0);
  assert.equal(await page.evaluate(key=>localStorage.getItem(key+'-slot2'),saveKey),other);assert.equal(await page.evaluate(()=>fish.length),60);assert.deepEqual(errors,[]);assert.deepEqual(httpErrors,[]);
  const result={screen,scenario,nicknames:true,nicknameResume:true,nicknameCancel:scenario==='new',giftOnce:true,menu:true,readonly:true,legacyUnknown:scenario==='legacy',goldColours:scenario==='legacy',speciesKept:scenario==='new',slotIsolation:true,receivedDay:book.receivedDay,pages:book.species.length,errors,httpErrors};fs.writeFileSync(path.join(dir,`${width}x${height}-result.json`),JSON.stringify(result,null,2));console.log('PET_NOTEBOOK_PASS '+JSON.stringify(result));
 }catch(error){if(page)await page.screenshot({path:path.join(dir,`${width}x${height}-failure.png`)}).catch(()=>{});throw error;}finally{await context.close();await browser.close();}
};
