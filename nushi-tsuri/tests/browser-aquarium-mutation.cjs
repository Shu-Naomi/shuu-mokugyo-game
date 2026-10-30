const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),{chromium}=require('playwright');
const defaultFixture=require('./aquarium-mutation-fixture.cjs'),{saveKey}=require('./game-harness.cjs');
module.exports=async function mutationUI(url,screen,variant=defaultFixture){
 const {fixture,mutationSeed}=variant,species=variant.species||'funa',name=variant.name||'フナ',artId=variant.artId||species+'Gold',kind=variant.kind||'gold',label=variant.label||'黄金',title=variant.title||'黄金の'+name,childUid=variant.childUid||'pet-6',hatchDays=variant.hatchDays||2,discoveryCount=(fixture().petLife.mutationDiscoveries?.length||0)+1,otherSlot=JSON.stringify({sentinel:'untouched-other-adventure'});
 const {width,height,mobile,dpr}=screen,browser=await chromium.launch({headless:true});
 const context=await browser.newContext({viewport:{width,height},isMobile:mobile,hasTouch:mobile,deviceScaleFactor:dpr,locale:'ja-JP',serviceWorkers:'block',reducedMotion:height===366?'reduce':'no-preference'});
 const errors=[],httpErrors=[],dir=path.join(__dirname,'aquarium-mutation-evidence',species);fs.mkdirSync(dir,{recursive:true});let page;
 try{
  await context.addInitScript(({key,state,otherSlot})=>{
   if(!localStorage.getItem(key+'-slot2'))localStorage.setItem(key+'-slot2',otherSlot);
   localStorage.setItem('nushi-inugoya-options-v1',JSON.stringify({textSpeed:'instant'}));if(!localStorage.getItem(key))localStorage.setItem(key,JSON.stringify(state));
   window.__mutationWrites=[];const set=Storage.prototype.setItem;Storage.prototype.setItem=function(k,v){if(k===key){const s=JSON.parse(v);window.__mutationWrites.push({seed:s.petLife?.mutationSeed,eggs:s.petLife?.eggs?.map(e=>e.mutation)});}return set.call(this,k,v);};
  },{key:saveKey,state:fixture(),otherSlot});
  page=await context.newPage();const press=q=>page.locator(q)[mobile?'tap':'click'](),shot=name=>page.screenshot({path:path.join(dir,`${width}x${height}-${name}.png`)});
  page.on('pageerror',e=>errors.push(e.message));page.on('response',r=>{if(r.status()>=400&&r.url().startsWith(new URL(url).origin+'/nushi-tsuri/'))httpErrors.push(r.status()+' '+r.url());});
  async function enter(){await require('./browser-start-adventure.cjs')(page,mobile);if(await page.locator('#lakeIntroSkip').isVisible())await press('#lakeIntroSkip');await press('#action');await press('[data-pet-action="aquarium"]');}
  const child=()=>page.evaluate(uid=>s.petLife.fish.find(f=>f.uid===uid),childUid);
  async function night(){await press('[data-pet-action="close"]');await page.evaluate(()=>{sleepUntilNextMorning(s);save();render();});await press('#action');await press('[data-pet-action="aquarium"]');}
  async function fits(){const d=await page.evaluate(()=>{
   const info=document.querySelector('.pet-tank-info'),content=document.querySelector('.pet-content'),r=info.getBoundingClientRect(),selected=document.querySelector('.pet-fish-roster [aria-pressed="true"]'),roster=document.querySelector('.pet-fish-roster').getBoundingClientRect(),b=selected.getBoundingClientRect();
   const visible=e=>{const q=e.getBoundingClientRect();return q.width>0&&q.height>0&&q.top>=r.top-1&&q.bottom<=r.bottom+1;};
   return {scroll:content.scrollHeight-content.clientHeight,side:info.scrollHeight-info.clientHeight,xp:visible(document.querySelector('.pet-xp-line')),identity:visible(document.querySelector('.pet-profile-identity')),selectedVisible:b.left>=roster.left-1&&b.right<=roster.right+1,
    labels:[...document.querySelectorAll('[data-pet-identity]')].map(e=>e.textContent),buttons:[...document.querySelectorAll('.pet-care-dock button')].map(e=>{const x=e.getBoundingClientRect();return {x:x.x,y:x.y,w:x.width,h:x.height};})};
  });assert.ok(d.scroll<=1&&d.side<=1,JSON.stringify(d));assert.equal(d.xp,true);assert.equal(d.identity,true);assert.equal(d.selectedVisible,true);for(const b of d.buttons)assert.ok(b.h>=44&&b.x>=0&&b.x+b.w<=width+1&&b.y+b.h<=height+1,JSON.stringify(b));return d;}
  await page.goto(url,{waitUntil:'load'});assert.equal(await page.evaluate(()=>window.__mutationWrites.length),0,'title does not rewrite saves');await enter();const caughtBefore=await page.evaluate(()=>s.caught);
  const eggs=await page.evaluate(()=>s.petLife.eggs);assert.equal(eggs.length,1);assert.equal(eggs[0].generation,2);assert.equal(eggs[0].species,species);assert.equal(eggs[0].mutation.kind,kind);assert.deepEqual(eggs[0].parents,{mother:'pet-2',father:'pet-1'});
  const writes=await page.evaluate(()=>window.__mutationWrites);assert.equal(writes[0].seed,mutationSeed);assert.equal(writes[0].eggs.length,0);assert.ok(writes.some(w=>w.eggs?.[0]?.kind===kind));
  assert.equal(await page.locator('.pet-discovery').count(),0);assert.equal(await page.locator(`[data-pet-mutation="${kind}"]`).count(),0,'egg does not reveal its colour');await fits();
  const parentArt=await page.locator('[data-pet-card-art="pet-1"] canvas').evaluateAll(cs=>cs.map(c=>c.dataset.artVariant));assert.ok(parentArt.length);assert.ok(parentArt.every(id=>id===species));await shot('egg');
  for(let n=1;n<hatchDays;n++){await night();assert.equal(await page.evaluate(()=>s.petLife.eggs.length),1);}
  await night();assert.equal((await child()).mutation.kind,kind);
  // Selecting a specimen intentionally clears the transient care message.
  // Observe the hatch notice before that next player action.
  assert.equal(await page.locator('.pet-discovery').isVisible(),true);assert.match(await page.locator('.pet-discovery').innerText(),new RegExp(title));
  if(height===366)assert.equal(await page.locator('.pet-discovery').evaluate(e=>getComputedStyle(e).animationName),'none');
  await shot('discovery');
  await press(`.pet-fish-roster [data-pet-inspect="${childUid}"]`);await page.waitForSelector(`[data-pet-card-art="${childUid}"] canvas[data-art-variant="${artId}"]`);
  await page.waitForFunction(uid=>{const c=document.querySelector(`[data-pet-card-art="${uid}"] canvas`);return c&&c.getContext('2d').getImageData(0,0,c.width,c.height).data.some((x,i)=>i%4===3&&x>128);},childUid);
  assert.match(await page.locator('[data-pet-size-rank]').innerText(),new RegExp(label+'.*稚魚'));
  if(variant.labelColor)assert.equal(await page.locator(`[data-pet-size-rank] [data-pet-mutation="${kind}"]`).evaluate(e=>getComputedStyle(e).color),variant.labelColor);
  const announced=await page.evaluate(()=>s.petLife.mutationDiscoveries);assert.equal(announced.length,discoveryCount);const found=announced.find(d=>d.species===species);assert.equal(found.notified,true);assert.equal(found.firstUid,childUid);const fry=await child();const fryLayout=await fits();await shot(kind+'-fry');
  await press('.pet-fish-roster [data-pet-inspect="pet-4"]');assert.equal(await page.locator('.pet-profile-identity').innerText(),'性別不明 · 世代不明');await shot('legacy');
  await press('.pet-fish-roster [data-pet-inspect="pet-5"]');
  const normalVariants=await page.locator('[data-pet-card-art="pet-5"] canvas').evaluateAll(canvases=>canvases.map(c=>c.dataset.artVariant));
  assert.ok(normalVariants.length>=1);assert.ok(normalVariants.every(id=>id==='moroko'),'all views of the ordinary fish keep its own artwork');
  await press(`.pet-fish-roster [data-pet-inspect="${childUid}"]`);await press('[data-pet-action="records"]');assert.match(await page.locator('.pet-discoveries').innerText(),new RegExp(title));if(variant.previousDiscovery)assert.match(await page.locator('.pet-discoveries').innerText(),/黄金のフナ/);await shot('discovery-record');await press('.pet-sheet [data-pet-action="panel-close"]');
  if(variant.notebook||kind==='albino'){
   await press('[data-pet-action="close"]');if(!await page.locator('#fieldMenu').evaluate(e=>e.classList.contains('show')))await press('#menu');await press('#petNotebookMenu');
   await press(`[data-notebook-species="${species}"]`);await press(`[data-notebook-fish="${childUid}"]`);
   assert.match(await page.locator('.pet-notebook-page').innerText(),new RegExp(title));assert.equal(await page.locator(`[data-notebook-fish="${childUid}"] [data-pet-mutation="${kind}"]`).innerText(),label);
   await press(`[data-pet-name="${childUid}"]`);await page.locator('#petNickname').fill(variant.nickname||'しらたま');await press('[data-pet-action="nickname-save"]');
   assert.equal((await child()).nickname,variant.nickname||'しらたま');assert.match(await page.locator('.pet-notebook-specimen').innerText(),new RegExp(variant.nickname||'しらたま'));await shot(kind+'-notebook');
  }
  await page.reload({waitUntil:'load'});await enter();assert.deepEqual((await child()).mutation,fry.mutation);assert.equal(await page.locator('.pet-discovery').count(),0,'saved notice never repeats');
  const days=await page.evaluate(({species,childUid})=>Math.ceil((petCatalog.find(f=>f.id===species).start-s.petLife.fish.find(f=>f.uid===childUid).length)/ShuPetLife.dailyGrowth(petCatalog.find(f=>f.id===species))),{species,childUid});
  assert.ok(days>0&&days<=30);
  for(let n=0;n<days;n++){
   if(!await page.locator('[data-pet-action="feed"]').isDisabled())await press('[data-pet-action="feed"]');
   if(!await page.locator('[data-pet-action="water"]').isDisabled())await press('[data-pet-action="water"]');
   await night();
  }
  assert.equal(await page.evaluate(uid=>ShuPetLife.lifeStage(s.petLife.fish.find(f=>f.uid===uid),petCatalog),childUid),'adult');assert.deepEqual((await child()).mutation,fry.mutation);await fits();await shot(kind+'-adult');
  await press('[data-pet-action="records"]');await press('[data-pet-panel-tab="manage"]');await press('[data-pet-move-target="1"]');await press('[data-pet-action="move"]');assert.equal((await child()).tank,1);
  await page.reload({waitUntil:'load'});await enter();const adult=await child();assert.equal(adult.tank,1);assert.deepEqual(adult.mutation,fry.mutation);assert.equal(await page.locator('.pet-discovery').count(),0);await fits();await shot('moved-resumed');
  assert.equal(await page.evaluate(key=>localStorage.getItem(key+'-slot2'),saveKey),otherSlot);
  if(variant.previousDiscovery){const prior=await page.evaluate(()=>s.petLife.mutationDiscoveries.find(d=>d.species==='funa'));assert.deepEqual(prior,fixture().petLife.mutationDiscoveries[0]);const goldenFuna=await page.evaluate(()=>ShuAquariumLife.appearance(s.petLife.fish.find(f=>f.uid==='pet-3'),petCatalog).artId);assert.equal(goldenFuna,'funaGold');}
  for(const record of fixture().petLife.mutationDiscoveries||[]){const actual=await page.evaluate(r=>s.petLife.mutationDiscoveries.find(d=>d.species===r.species&&d.kind===r.kind),record);assert.deepEqual(actual,record);}
  assert.equal(await page.evaluate(()=>fish.length),60);assert.deepEqual(await page.evaluate(()=>s.caught),caughtBefore);assert.equal(await page.evaluate(()=>s.petLife.version),6);assert.deepEqual(errors,[]);assert.deepEqual(httpErrors,[]);
  const result={screen,species,artId,kind,discoveryCount,slotIsolation:true,seedBeforeEgg:true,thirdGeneration:true,eggResult:eggs[0].mutation,fry:fry.mutation,adult:adult.mutation,careDays:days,discoveryOnce:true,legacyUnknown:true,tankMoveResume:true,catalogueCount:60,fryLayout,errors,httpErrors};
  fs.writeFileSync(path.join(dir,`${width}x${height}-result.json`),JSON.stringify(result,null,2));console.log('AQUARIUM_MUTATION_PASS '+JSON.stringify(result));
 }catch(error){if(page)await page.screenshot({path:path.join(dir,`${width}x${height}-failure.png`)}).catch(()=>{});fs.writeFileSync(path.join(dir,`${width}x${height}-failure.json`),JSON.stringify({error:error.stack,screen,errors,httpErrors},null,2));throw error;}
 finally{await context.close();await browser.close();}
};
