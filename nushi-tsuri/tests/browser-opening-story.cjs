const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),{chromium}=require('playwright');
const enter=require('./browser-start-adventure.cjs'),{fixture}=require('./aquarium-identity-fixture.cjs');
const key='nushi-inugoya-v2',key2=key+'-slot2',ids=['arrival','memory','notebook','researcher','wish','sam','invitation','refusal','push','retort','puppies','cling','care','decision','welcome','first-day'];
module.exports=async function openingStory(url,screen){
 const {width,height,mobile,dpr}=screen,browser=await chromium.launch({headless:true}),dir=path.join(__dirname,'opening-story-evidence');fs.mkdirSync(dir,{recursive:true});
 const results=[];
 try{for(const [i,dog] of ['shuu','riku','grey'].entries()){
  const context=await browser.newContext({viewport:{width,height},isMobile:mobile,hasTouch:mobile,deviceScaleFactor:dpr,locale:'ja-JP',serviceWorkers:'block'}),page=await context.newPage(),errors=[],httpErrors=[],layouts=[];
  const press=q=>page.locator(q)[mobile?'tap':'click'](),stored=k=>page.evaluate(k=>localStorage.getItem(k),k),shot=name=>page.screenshot({path:path.join(dir,`${width}x${height}-${dog}-${name}.png`)});
  page.on('pageerror',e=>errors.push(e.message));page.on('response',r=>{if(r.status()>=400&&r.url().startsWith(new URL(url).origin+'/nushi-tsuri/'))httpErrors.push(r.status()+' '+r.url());});
  const step=()=>page.evaluate(()=>s.lakeStory.introStep);
  const stats=()=>page.evaluate(()=>JSON.stringify({money:s.money,caught:s.caught,baits:s.baits,dogAffinity:s.dogAffinity,dogTricks:s.dogTricks,petLife:s.petLife}));
  async function fits(name){
   const result=await page.locator('#lakeIntro').evaluate(el=>{const p=el.querySelector('article'),r=el.getBoundingClientRect();return {step:s.lakeStory.introStep,box:r.toJSON(),paperOverflow:[p.scrollWidth-p.clientWidth,p.scrollHeight-p.clientHeight],controls:[...el.querySelectorAll('button')].map(b=>{const q=b.getBoundingClientRect();return {id:b.id,inside:q.x>=0&&q.y>=0&&q.right<=innerWidth+1&&q.bottom<=innerHeight+1,height:q.height};})};});
   assert.ok(result.box.x>=0&&result.box.y>=0&&result.box.right<=width+1&&result.box.bottom<=height+1,JSON.stringify(result));assert.ok(result.paperOverflow.every(v=>v<=1),JSON.stringify(result));for(const c of result.controls)assert.ok(c.inside&&c.height>=44,JSON.stringify(c));layouts.push(result);if(name)await shot(name);
  }
  try{
   await page.goto(url,{waitUntil:'load'});const legacy={...fixture(),playerName:'先輩',dogNames:{shuu:'先輩のシュウ',riku:'先輩のリク',grey:'先輩のGrey'},dogTricks:{shuu:321,riku:123,grey:543},extraFuture:{keep:8}};
   await page.evaluate(({key2,legacy})=>{localStorage.clear();localStorage.setItem('nushi-inugoya-options-v1',JSON.stringify({textSpeed:'instant'}));localStorage.setItem(key2,JSON.stringify(legacy));},{key2,legacy});await page.reload({waitUntil:'load'});
   const other=await stored(key2),avatar=i%2?'boy':'girl',name='星降る湖へ帰ってきた旅人';
   await enter(page,mobile,{slot:1,dog,avatar,name});await page.locator('#lakeIntro.open').waitFor();assert.equal(await step(),'arrival');const before=await stats();await fits(i===0?'arrival':null);
   assert.equal(await page.evaluate(()=>s.avatar),avatar);assert.equal(await page.locator('#lakeIntroPaper small').innerText(),name);assert.equal(await stored(key2),other);
   for(const id of ids.slice(0,10)){assert.equal(await step(),id);await fits(i===0&&id==='sam'?'sam':null);if(id!=='retort')await press('#lakeIntroNext');}
   // Going back checkpoints the actual displayed scene, and returning restores it.
   await press('#lakeIntroPrevious');assert.equal(await step(),'push');await press('#lakeIntroNext');assert.equal(await step(),'retort');assert.equal(JSON.parse(await stored(key)).lakeStory.introStep,'retort');
   await page.reload({waitUntil:'load'});assert.equal(await page.locator('#lakeIntro.open').count(),0);
   // Existing title settings edit this slot; the opening does not own a second identity store.
   await press('#titleOptions');const names={shuu:'こむぎもち',riku:'風の子',grey:'夜空'};
   for(const [id,value] of Object.entries({player:'直美♡',...names})){
    await press(`[data-name-target="${id}"]`);await page.locator(id==='player'?'#optionsPlayerName':'#optionsDogName').fill(value);await press(id==='player'?'#optionsNameForm button[type="submit"]':'#optionsDogNameForm button[type="submit"]');
   }
   await press('#optionsClose');await enter(page,mobile,{slot:1,isNew:false});assert.equal(await step(),'retort');assert.equal(await page.locator('#lakeIntroPaper small').innerText(),'直美♡');assert.equal(await page.evaluate(()=>s.avatar),avatar);assert.equal(await stats(),before);assert.equal(await stored(key2),other);
   await press('#lakeIntroNext');assert.equal(await step(),'puppies');for(const value of Object.values(names))assert.ok((await page.locator('#lakeIntroPaper').innerText()).includes(value));
   await press('#lakeIntroNext');assert.equal(await step(),'cling');assert.equal(await page.locator('#lakeIntroPaper small').innerText(),names[dog]);assert.match(await page.locator('#lakeIntroPaper').innerText(),/くぅん/);assert.equal(await page.locator('#lakeIntroPicture').getAttribute('data-dog'),dog);await fits('cling');
   const assets=await page.evaluate(async()=>Promise.all(Object.values(ShuLakeIntro.art).map(async src=>{const im=new Image();im.src=src;await im.decode();return {src,width:im.naturalWidth,height:im.naturalHeight};})));assert.ok(assets.every(a=>a.width>0&&a.height>0));
   // Real pixels must include the original scene and sprites, rather than a loading fallback.
   await page.evaluate(()=>renderLakeIntro());const colors=await page.locator('#lakeIntroPicture').evaluate(c=>{const p=c.getContext('2d').getImageData(0,0,c.width,c.height).data,s=new Set();for(let i=0;i<p.length;i+=16)s.add(`${p[i]},${p[i+1]},${p[i+2]}`);return s.size;});assert.ok(colors>200,colors);await shot('cling-loaded');
   for(const id of ids.slice(12)){await press('#lakeIntroNext');assert.equal(await step(),id);await fits(i===0&&id==='first-day'?'first-day':null);}
   await press('#lakeIntroNext');assert.equal(await page.locator('#lakeIntro.open').count(),0);assert.equal(await page.evaluate(()=>s.lakeStory.introSeen),true);assert.equal(await page.evaluate(()=>s.lakeStory.introPending),false);assert.equal(await page.evaluate(()=>document.querySelector('.controls').inert),false);assert.match(await page.locator('#rescueToast').innerText(),/家と三匹/);assert.equal(await stats(),before);await shot('free-action');
   await page.reload({waitUntil:'load'});await enter(page,mobile,{slot:1,isNew:false});assert.equal(await page.locator('#lakeIntro.open').count(),0);assert.equal(await page.evaluate(()=>s.playerName),'直美♡');assert.equal(await page.evaluate(()=>s.dog),dog);assert.equal(await stored(key2),other);assert.equal(await page.evaluate(()=>fish.length),60);assert.equal(await page.evaluate(()=>s.petLife.version),6);
   // Continue an adventure that predates the story: no forced intro, aquarium and dogs survive.
   await press('#menu');await press('[data-field-menu-target="saveSlots"]');await page.locator('#title.active').waitFor({state:'visible'});const second=new URL(url);second.searchParams.set('saveSlot','2');await page.goto(second.href,{waitUntil:'load'});await enter(page,mobile,{slot:2,isNew:false});assert.equal(await page.locator('#lakeIntro.open').count(),0);assert.equal(await page.evaluate(()=>s.playerName),'先輩');assert.deepEqual(await page.evaluate(()=>s.dogTricks),legacy.dogTricks);assert.equal(await page.evaluate(()=>s.extraFuture.keep),8);assert.equal(await page.evaluate(()=>fish.length),60);
   assert.deepEqual(errors,[]);assert.deepEqual(httpErrors,[]);results.push({dog,avatar,layouts,assets,renamed:true,resumed:'retort',finished:true,oldSave:true,slotIsolation:true,catalogue:60,errors,httpErrors});
  }catch(error){await shot('failure').catch(()=>{});fs.writeFileSync(path.join(dir,`${width}x${height}-${dog}-failure.json`),JSON.stringify({error:error.stack,errors,httpErrors},null,2));throw error;}
  finally{await context.close();}
 }
 fs.writeFileSync(path.join(dir,`${width}x${height}-result.json`),JSON.stringify({screen,results},null,2));console.log('OPENING_STORY_PASS '+JSON.stringify({screen,dogs:results.map(r=>r.dog),rename:true,resume:true,oldSave:true,slotIsolation:true,errors:results.flatMap(r=>r.errors),httpErrors:results.flatMap(r=>r.httpErrors)}));
 }finally{await browser.close();}
};
