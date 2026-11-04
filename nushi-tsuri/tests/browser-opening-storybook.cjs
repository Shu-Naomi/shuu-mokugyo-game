const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),{chromium}=require('playwright');
const enter=require('./browser-start-adventure.cjs'),feedbackEvidence=require('./browser-opening-feedback.cjs'),nativeEvidence=require('./browser-opening-realtime.cjs');
const ids=['arrival','memory','notebook','researcher','wish','sam','invitation','refusal','push','retort','puppies','cling','care','decision','welcome','first-day'];
module.exports=async function storybook(url,screen){
 const {width,height,mobile,dpr=1}=screen,dir=path.resolve(process.env.STORYBOOK_EVIDENCE||path.join(__dirname,'storybook-evidence'));
 fs.mkdirSync(dir,{recursive:true});const browser=await chromium.launch({headless:true}),results=[];
 try{for(const avatar of ['boy','girl'])for(const dog of ['shuu','riku','grey']){
  const prefix=`${width}x${height}-${avatar}-${dog}`;
  const context=await browser.newContext({viewport:{width,height},deviceScaleFactor:dpr,isMobile:mobile,hasTouch:mobile,locale:'ja-JP',serviceWorkers:'block'}),page=await context.newPage(),errors=[],httpErrors=[],layouts=[],panels=[],diaryFrames=[];
  page.setDefaultTimeout(15000);
  page.on('pageerror',e=>errors.push(e.message));page.on('response',r=>{if(r.status()>=400&&r.url().startsWith(new URL(url).origin+'/nushi-tsuri/'))httpErrors.push(`${r.status()} ${r.url()}`);});
  const press=q=>page.locator(q)[mobile?'tap':'click'](),step=()=>page.locator('#lakeIntroPicture').getAttribute('data-step');
  const snapshot=()=>page.evaluate(()=>lakeIntroPresentation.snapshot());
  const stats=()=>page.evaluate(()=>JSON.stringify({money:s.money,hp:s.hp,time:s.gameMinutes,baits:s.baits,caught:s.caught,petLife:s.petLife,dogs:s.dogAffinity,tricks:s.dogTricks,x:s.x,y:s.y,avatar:s.avatar,dog:s.dog,player:s.playerName,names:s.dogNames}));
  const hash=()=>page.locator('#lakeIntroPicture').evaluate(c=>{const a=c.getContext('2d').getImageData(0,0,c.width,c.height).data;let h=2166136261;for(let i=0;i<a.length;i++)h=Math.imul(h^a[i],16777619);return h>>>0;});
  const shot=name=>page.screenshot({path:path.join(dir,`${prefix}-${name}.png`)});
  async function next(){await page.evaluate(()=>window.oldStorybook=lakeIntroPresentation);await press('#lakeIntroNext');assert.equal(await page.evaluate(()=>oldStorybook.snapshot().active),false,'page change must cancel the old director');}
  async function go(id){for(let limit=0;await step()!==id;limit++){assert.ok(limit<ids.length);await next();}}
  async function ready(){
   for(let i=0;i<200;i++){
    const state=await page.locator('#lakeIntroPicture').getAttribute('data-art-state');
    assert.notEqual(state,'error','requested storybook art must decode successfully');
    if(state==='ready'&&await page.locator('#lakeIntroPicture').getAttribute('data-motion')!=='loading')return;
    await new Promise(resolve=>setTimeout(resolve,40));await page.clock.runFor(50);
   }
   assert.fail('storybook art did not become ready');
  }
  async function fits(){
   const layout=await page.locator('#lakeIntro').evaluate(el=>{
    const p=el.querySelector('article'),c=el.querySelector('canvas'),b=c.getBoundingClientRect(),r=p.getBoundingClientRect(),m=el.getBoundingClientRect(),style=getComputedStyle(c);
    return {step:c.dataset.step,panel:c.dataset.panel,art:c.dataset.artState,inside:m.left>=0&&m.top>=0&&m.right<=innerWidth+1&&m.bottom<=innerHeight+1,overflow:[p.scrollWidth-p.clientWidth,p.scrollHeight-p.clientHeight],image:[b.width,b.height],objectFit:style.objectFit,noOverlap:b.right<=r.left+1||r.right<=b.left+1||b.bottom<=r.top+1||r.bottom<=b.top+1,controls:[...el.querySelectorAll('button')].map(x=>{const q=x.getBoundingClientRect();return {id:x.id,height:q.height,inside:q.left>=0&&q.top>=0&&q.right<=innerWidth+1&&q.bottom<=innerHeight+1};})};
   });
   assert.ok(layout.inside&&layout.noOverlap,JSON.stringify(layout));assert.ok(layout.overflow.every(x=>x<=1),JSON.stringify(layout));assert.ok(layout.image.every(x=>x>80),JSON.stringify(layout));assert.notEqual(layout.objectFit,'cover','storybook image must not crop hands or puppy faces');for(const button of layout.controls)assert.ok(button.inside&&button.height>=44,JSON.stringify(button));layouts.push(layout);
  }
  const feedback=feedbackEvidence({page,dir,prefix,ready,next,press,go});
  try{
   await page.clock.install({time:new Date('2026-11-04T00:00:00Z')});await page.clock.pauseAt('2026-11-04T00:00:01Z');await page.goto(url,{waitUntil:'load'});
   await page.evaluate(()=>{localStorage.clear();localStorage.setItem('nushi-inugoya-options-v1',JSON.stringify({textSpeed:'instant'}));localStorage.setItem('storybook-other-slot','untouched');});await page.reload();
   await enter(page,mobile,{slot:1,avatar,dog,name:'直美♡'});const before=await stats();assert.equal(await step(),'arrival');
   // Loading must finish before checking pixels. Fast navigation is tested separately.
   await ready();
   for(const id of ids){
    assert.equal(await step(),id);assert.equal(await page.locator('#lakeIntroPicture').getAttribute('data-avatar'),avatar);assert.equal(await page.locator('#lakeIntroPicture').getAttribute('data-dog'),dog);
    await ready();
    if(feedback.diaryIds.includes(id))diaryFrames.push(await feedback.diary(id));
    await page.clock.runFor(2200);await fits();
    const model=await snapshot();assert.equal(model.scheduled,false);assert.equal(model.pose.settled,true);panels.push({id,hash:await hash(),pose:model.pose});await shot(id);
    if(feedback.reviewIds.includes(id))await feedback.capture(`${id}-dialogue`);
    if(id==='puppies'){const text=await page.locator('#lakeIntroPaper').innerText();assert.match(text,/小さな足音/);assert.ok(text.indexOf('小さな足音')<text.indexOf('三匹'),'introduce footsteps before identifying the dogs');}
    if(id==='refusal'){await press('#lakeIntroPrevious');assert.equal(await step(),'invitation');await next();assert.equal(await step(),'refusal');}
    if(id==='cling'){
     assert.equal(await page.locator('#lakeIntroPaper small').innerText(),await page.evaluate(()=>s.dogNames[s.dog]));
     await page.reload();await enter(page,mobile,{slot:1,isNew:false});assert.equal(await step(),'cling');assert.equal(await stats(),before);
    }
    if(id!=='first-day')await next();
   }
   assert.notEqual(panels.find(x=>x.id==='sam').hash,panels.find(x=>x.id==='refusal').hash,'refusal needs a different held-diary composition');
   assert.notEqual(panels.find(x=>x.id==='retort').hash,panels.find(x=>x.id==='puppies').hash,'nose peek and threshold are distinct story beats');
   assert.notEqual(panels.find(x=>x.id==='puppies').hash,panels.find(x=>x.id==='cling').hash,'threshold and nuzzle are distinct story beats');
   await next();assert.equal(await page.locator('#lakeIntro.open').count(),0);assert.equal(await page.evaluate(()=>s.lakeStory.introSeen),true);assert.equal(await page.evaluate(()=>document.querySelector('.controls').inert),false);assert.equal(await stats(),before);
   await page.reload();await enter(page,mobile,{slot:1,isNew:false});assert.equal(await page.locator('#lakeIntro.open').count(),0);
   await press('#menu');await press('[data-field-menu-target="story"]');const story=await page.evaluate(()=>JSON.stringify(s.lakeStory));await press('#lakeStoryReplayIntro');
   // Text reveal remains user-paced: first press reveals, second advances.
   await page.evaluate(()=>{textSpeed='normal';renderLakeIntro();});
   await press('#lakeIntroNext');assert.equal(await step(),'arrival');
   await press('#lakeIntroNext');assert.equal(await step(),'memory');
   await page.evaluate(()=>{textSpeed='instant';});await press('#lakeIntroPrevious');assert.equal(await step(),'arrival');
   const feedbackTransitions=await feedback.transitions();
   // Rapid advances/back navigation do not wait for art animation or leak late paints.
   await page.evaluate(()=>{for(let i=0;i<10;i++)document.querySelector('#lakeIntroNext').click();});assert.equal(await step(),'puppies');await press('#lakeIntroPrevious');assert.equal(await step(),'retort');await next();
   await ready();await page.emulateMedia({reducedMotion:'reduce'});await page.clock.runFor(120);assert.equal((await snapshot()).scheduled,false);const still=await hash();await page.clock.runFor(1500);assert.equal(await hash(),still);await page.emulateMedia({reducedMotion:'no-preference'});assert.equal((await snapshot()).scheduled,false);
   await next();await page.evaluate(()=>window.skippedStorybook=lakeIntroPresentation);await press('#lakeIntroSkip');assert.equal(await page.evaluate(()=>skippedStorybook.snapshot().active),false);assert.equal(await page.locator('#lakeStory.open').count(),1);assert.equal(await page.evaluate(()=>JSON.stringify(s.lakeStory)),story);const stopped=await hash();await page.clock.runFor(2500);assert.equal(await hash(),stopped,'skipped art cannot repaint');
   await press('#lakeStoryReplayIntro');await page.keyboard.press('Escape');assert.equal(await page.locator('#lakeIntro.open').count(),0);assert.equal(await page.locator('#lakeStory.open').count(),1);
   assert.equal(await page.evaluate(()=>localStorage.getItem('storybook-other-slot')),'untouched');assert.equal(await stats(),before);assert.deepEqual(errors,[]);assert.deepEqual(httpErrors,[]);
   const visualReview=feedback.writeReview();
   results.push({avatar,dog,layouts,panels,diaryFrames,feedbackTransitions,visualSignoff:visualReview.visualSignoff,resume:true,replay:true,skip:true,fastAdvance:true,reducedMotion:true,errors,httpErrors});console.log('STORYBOOK_CASE_PASS '+prefix);
  }catch(error){await shot('failure').catch(()=>{});fs.writeFileSync(path.join(dir,`${prefix}-failure.json`),JSON.stringify({error:error.stack,errors,httpErrors,layouts},null,2));throw error;}finally{await context.close();}
 }
 fs.writeFileSync(path.join(dir,`${width}x${height}-result.json`),JSON.stringify({screen,results,nativeStatus:'pending'},null,2));
 const native=await nativeEvidence(browser,url,screen,dir);
 fs.writeFileSync(path.join(dir,`${width}x${height}-result.json`),JSON.stringify({screen,results,native},null,2));return results;
 }finally{await browser.close();}
};
