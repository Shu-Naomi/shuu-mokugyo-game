const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),{chromium}=require('playwright');
const enter=require('./browser-start-adventure.cjs'),{fixture}=require('./aquarium-identity-fixture.cjs');
module.exports=async function research(url,screen){
 const {width,height,mobile,dpr}=screen,dir=path.join(__dirname,'lake-research-evidence');fs.mkdirSync(dir,{recursive:true});
 const browser=await chromium.launch({headless:true}),context=await browser.newContext({viewport:{width,height},hasTouch:mobile,isMobile:mobile,deviceScaleFactor:dpr,locale:'ja-JP',serviceWorkers:'block'}),page=await context.newPage();
 const key='nushi-inugoya-v2',other=key+'-slot2',fresh=width===1280,legacy={...fixture(),x:197,y:91,direction:'up',extraFuture:{keep:42}},errors=[],httpErrors=[],layouts=[],pointers=[];
 const press=q=>page.locator(q)[mobile?'tap':'click']();
 const value=q=>page.evaluate(q=>JSON.parse(JSON.stringify(eval(q))),q);
 const change=(id,v)=>page.locator('#'+id).selectOption(v);
 async function fits(label){
  const controls=await page.locator('#lakeStory button,#lakeStory select').evaluateAll(nodes=>nodes.filter(n=>n.getClientRects().length&&!n.disabled).map(n=>{const r=n.getBoundingClientRect(),p=document.elementFromPoint(r.x+r.width/2,r.y+r.height/2);return {id:n.id,width:r.width,height:r.height,inside:r.left>=0&&r.top>=0&&r.right<=innerWidth+1&&r.bottom<=innerHeight+1,unblocked:n===p||n.contains(p)};}));
  assert.ok(controls.length);assert.ok(controls.every(c=>c.width>=44&&c.height>=44&&c.inside&&c.unblocked),label+' '+JSON.stringify(controls));layouts.push({label,controls});
 }
 async function shot(name){await page.screenshot({path:path.join(dir,width+'x'+height+'-'+name+'.png')});}
 async function menu(target){await press('#menu');await press('[data-field-menu-target="'+target+'"]');}
 page.on('pageerror',e=>errors.push(e.message));page.on('response',r=>{if(r.status()>=400&&r.url().startsWith(new URL(url).origin+'/nushi-tsuri/'))httpErrors.push(r.status()+' '+new URL(r.url()).pathname);});
 try{
  await context.addInitScript(({key,other,legacy,fresh})=>{
   if(!localStorage.getItem(other))localStorage.setItem(other,JSON.stringify({...legacy,playerName:'別の冒険'}));
   if(!fresh&&!localStorage.getItem(key))localStorage.setItem(key,JSON.stringify(legacy));
   localStorage.setItem('nushi-inugoya-options-v1',JSON.stringify({textSpeed:'instant'}));
  },{key,other,legacy,fresh});
  await page.clock.install({time:new Date('2026-10-27T01:00:00Z')});await page.clock.pauseAt('2026-10-27T01:00:01Z');
  await page.goto(url,{waitUntil:'load',timeout:90000});await enter(page,mobile,{slot:1,isNew:fresh,avatar:'girl',dog:'grey',name:'祖父の村の旅人'});
  if(fresh)await press('#lakeIntroSkip');else assert.equal(await page.locator('#lakeIntro.open').count(),0);
  await page.evaluate(()=>{window.researchPointers=[];document.addEventListener('pointerdown',e=>researchPointers.push({id:e.target.closest('button,select')?.id,type:e.pointerType}));});
  const otherRaw=await page.evaluate(k=>localStorage.getItem(k),other);
  await menu('story');await press('#lakeStoryResearch');await page.evaluate(()=>document.fonts.ready);
  await fits('research basics');
  const basicFit=await page.locator('#lakeResearchArticle').evaluate(n=>({height:n.clientHeight,scroll:n.scrollHeight}));
  assert.ok(basicFit.scroll<=basicFit.height+1,'basics should fit on one page '+JSON.stringify(basicFit));
  await shot('basics');
  const before=await value('s'),raw=await page.evaluate(k=>localStorage.getItem(k),key);
  assert.equal(await page.locator('#lakeResearchFish option').count(),55);
  await change('lakeResearchHabitat','sea');await change('lakeResearchFish','buri');
  assert.equal(await page.locator('#lakeResearchTitle').textContent(),'ブリ');
  const original=await value('fishEncyclopediaData.buri');
  const text=await page.locator('#lakeResearchDetail').textContent();assert.ok(text.includes(original.locations));assert.ok(text.includes(original.time));
  assert.ok(text.includes('釣り上げてから'));await fits('fish notes');await shot('fish');
  await page.locator('.research-ecology summary').scrollIntoViewIfNeeded();await press('.research-ecology summary');
  assert.equal(await page.locator('.research-ecology[open]').count(),1);assert.ok((await page.locator('.research-ecology').textContent()).includes(original.ecology));await shot('ecology');
  for(const region of ['lake','river','sea','all']){
   await change('lakeResearchHabitat',region);
   assert.equal(await page.locator('#lakeResearchFish').evaluate((el,region)=>[...el.options].every(o=>region==='all'||fishEncyclopediaData[o.value].habitats.includes(region)),region),true);
  }
  await press('#lakeResearchClues');assert.doesNotMatch(await page.locator('#lakeResearchDetail').textContent(),/星降るヌシ|渓流のヌシ|沿岸のヌシ|地底湖のヌシ/);await fits('clues');await shot('clues');
  assert.deepEqual(await value('s'),before);assert.equal(await page.evaluate(k=>localStorage.getItem(k),key),raw);
  await change('lakeResearchHabitat','all');await change('lakeResearchFish','funa');
  await press('#villageGuideJournal');await page.locator('#fieldGuide.open').waitFor();await press('#fieldGuideClose');
  assert.equal(await page.locator('#lakeResearchPanel').isVisible(),true);assert.equal(await page.locator('#lakeResearchTitle').textContent(),'フナ');
  await press('#lakeStoryMemories');assert.equal(await page.locator('#lakeStoryReading').isVisible(),true);
  await press('#lakeStoryResearch');await fits('return from map and memories');await press('#lakeStoryClose');
  await menu('record');await press('#fishdexStoryOffer');await press('#lakeStoryResearch');await page.keyboard.press('Escape');await page.locator('#record.open').waitFor();await page.keyboard.press('Escape');
  if(!fresh){await press('#action');await page.locator('#store.open').waitFor();if(!await page.locator('#samStoryOffer').isVisible())await press('#store [data-compact-guide]');await press('#samStoryOffer');await press('#lakeStoryResearch');await press('#lakeStoryClose');await page.locator('#store.open').waitFor();await page.keyboard.press('Escape');}
  assert.deepEqual(await value('s.caught'),before.caught);assert.equal(await value('fish.length'),60);
  assert.equal(await page.evaluate(k=>localStorage.getItem(k),other),otherRaw);
  pointers.push(...await value('researchPointers'));assert.ok(pointers.some(p=>p.id==='lakeStoryResearch'&&p.type===(mobile?'touch':'mouse')));
  await page.reload({waitUntil:'load'});await enter(page,mobile,{slot:1,isNew:false});await menu('story');await press('#lakeStoryResearch');await fits('saved adventure');
  assert.deepEqual(await value('s.caught'),before.caught);if(!fresh){assert.equal(await value('s.extraFuture.keep'),42);assert.deepEqual(await value('s.petLife.fish.map(f=>f.uid)'),before.petLife.fish.map(f=>f.uid));assert.deepEqual(await value('s.petLife.eggs'),before.petLife.eggs);}
  pointers.push(...await value('researchPointers').catch(()=>[]));assert.deepEqual(errors,[]);assert.deepEqual(httpErrors,[]);
  const result={screen,fresh,readOnly:true,catalogue:55,fishCount:60,slotIsolation:true,saveResume:true,unknownNamesHidden:true,sourceReturn:true,errors,httpErrors,layouts,pointers};
  fs.writeFileSync(path.join(dir,width+'x'+height+'-result.json'),JSON.stringify(result,null,2));console.log('LAKE_RESEARCH_PASS '+JSON.stringify({...result,layouts:undefined}));
 }catch(error){await shot('failure').catch(()=>{});throw error;}finally{await context.close();await browser.close();}
};
