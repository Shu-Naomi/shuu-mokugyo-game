const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),cp=require('node:child_process');
const {chromium}=require('playwright'),{seed,saveKey}=require('./game-harness.cjs'),care=require('./browser-care-inn-ui.cjs');
const main='ee62f999a679d9b88efba28958c7282e04ee1282',url='https://shu-naomi.github.io/shuu-mokugyo-game/nushi-tsuri/?v=251-6',base=new URL('./',url).href;
const output=path.join(__dirname,'ui-evidence-v251-6-public');fs.mkdirSync(output,{recursive:true});
const blob=data=>crypto.createHash('sha1').update('blob '+data.length+'\0').update(data).digest('hex');
const git=(...args)=>cp.execFileSync('git',args,{encoding:'utf8'}).trim();
async function files(phase){
 const rows=[];
 for(const file of ['index.html','sw.js','compact-ui.css','compact-ui.js','pet-life.js','save-slots.js','assets/dog-idles.png']){
  const response=await fetch(new URL(file+'?nohand='+main,base),{headers:{'Cache-Control':'no-cache'}});assert.equal(response.status,200,file);
  const data=Buffer.from(await response.arrayBuffer()),expected=git('rev-parse','HEAD:nushi-tsuri/'+file);assert.equal(blob(data),expected,file+' published Git blob');
  rows.push({file,bytes:data.length,sha:expected});
 }
 fs.writeFileSync(path.join(output,phase+'-files.json'),JSON.stringify({main,rows},null,2));
 console.log('NOHAND_PUBLIC_FILES_PASS '+JSON.stringify({main,phase,matched:rows.length}));
}
async function cacheUpdate(){
 const legacyResponse=await fetch('https://raw.githubusercontent.com/Shu-Naomi/shuu-mokugyo-game/a594ba14808985e6219b473d44efd812885cc2c1/nushi-tsuri/index.html');assert.equal(legacyResponse.status,200);
 const legacyBytes=Buffer.from(await legacyResponse.arrayBuffer());assert.equal(blob(legacyBytes),'c2d88c2a8f279199d9074c7e230c389e1d34bf22');const legacy=legacyBytes.toString('utf8');assert.ok(legacy.includes('function dogCarePetHand('));
 const browser=await chromium.launch({headless:true}),context=await browser.newContext({viewport:{width:820,height:366},isMobile:true,hasTouch:true,deviceScaleFactor:1.875,serviceWorkers:'allow',locale:'ja-JP',recordVideo:{dir:path.join(output,'cache-video'),size:{width:820,height:366}}});
 const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
 const initial={...seed(),soundEnabled:false,dogAffinity:{shuu:25,riku:30,grey:35}};
 await context.addInitScript(({key,initial})=>{if(!localStorage.getItem(key))localStorage.setItem(key,JSON.stringify(initial));localStorage.setItem('nushi-inugoya-options-v1',JSON.stringify({textSpeed:'instant'}));},{key:saveKey,initial});
 async function start(){await page.locator('#start').tap();await page.waitForTimeout(300);if(await page.locator('#lakeIntroSkip').isVisible())await page.locator('#lakeIntroSkip').tap();await page.waitForFunction(()=>typeof openDogCare==='function');}
 try{
  // A same-origin image document lets us seed a real legacy CacheStorage entry
  // before this fresh browser context installs the current site's worker.
  await page.goto(new URL('assets/dog-idles.png',base).href,{waitUntil:'load'});
  await page.evaluate(async({legacy,base})=>{
   if((await navigator.serviceWorker.getRegistrations()).length)throw Error('expected fresh worker context');
   const old=await caches.open('nushi-tsuri-v251-care-inn-ui-251-5');await old.put(new URL('index.html',base),new Response(legacy,{headers:{'Content-Type':'text/html; charset=utf-8'}}));
   await (await caches.open('unrelated-app-preserved')).put(new URL('unrelated',base),new Response('keep'));
   if(!(await (await old.match(new URL('index.html',base))).text()).includes('function dogCarePetHand('))throw Error('legacy hand was not cached');
  },{legacy,base});
  await page.goto(url,{waitUntil:'domcontentloaded',timeout:90000});
  await page.waitForFunction(async()=>{const names=await caches.keys();return navigator.serviceWorker.controller?.state==='activated'&&names.includes('nushi-tsuri-v251-pet-reaction-251-6')&&!names.includes('nushi-tsuri-v251-care-inn-ui-251-5');},null,{timeout:180000});
  const installed=await page.evaluate(async base=>{
   const names=await caches.keys(),cache=await caches.open('nushi-tsuri-v251-pet-reaction-251-6'),r=await cache.match(new URL('index.html',base));
   return {names,html:await r.text(),worker:navigator.serviceWorker.controller.scriptURL};
  },base);
  assert.ok(installed.names.includes('unrelated-app-preserved'));assert.equal(blob(Buffer.from(installed.html)),git('rev-parse','HEAD:nushi-tsuri/index.html'));assert.equal(installed.html.includes('function dogCarePetHand('),false);
  await context.setOffline(true);await page.reload({waitUntil:'domcontentloaded'});await start();
  assert.equal(await page.evaluate(()=>typeof dogCarePetHand==='undefined'&&typeof drawDogCareStrokingHand==='undefined'),true);
  await page.evaluate(()=>{window.__petHandCalls=0;drawDogCareHand=()=>{window.__petHandCalls++;throw Error('cached petting hand');};});
  for(const dog of ['shuu','riku','grey']){
   await page.evaluate(dog=>openDogCare(dog),dog);await page.waitForFunction(()=>dogIdleImage.complete&&dogIdleImage.naturalWidth>0);
   await page.locator('#dogCarePet').tap();await page.waitForFunction(()=>dogCareScene.mode==='pet'&&Number(document.querySelector('#dogCareSceneCanvas').dataset.careProgress)>=.3);
   assert.equal(await page.locator('#dogCareSceneCanvas').getAttribute('data-hand-phase'),null);assert.match(await page.locator('#dogCareSceneLabel').textContent(),/目を細め/);
   await page.screenshot({path:path.join(output,'offline-'+dog+'.png')});await page.waitForFunction(()=>!dogCareIsBusy());assert.equal(await page.evaluate(()=>dogCareScene.mode),'idle');
  }
  assert.equal(await page.evaluate(()=>window.__petHandCalls),0);
  const saved=await page.evaluate(()=>{save();return {affinity:s.dogAffinity,daily:s.petLife.dogDaily};});await page.reload({waitUntil:'domcontentloaded'});await start();
  assert.deepEqual(await page.evaluate(()=>({affinity:s.dogAffinity,daily:s.petLife.dogDaily})),saved);assert.equal(await page.evaluate(()=>typeof dogCarePetHand==='undefined'),true);assert.deepEqual(errors,[]);
  const result={main,legacyHtmlSeeded:true,legacyCacheRemoved:true,otherCachePreserved:true,currentCachedHtmlMatches:true,offlineReload:true,dogs:['shuu','riku','grey'],humanHandCalls:0,returnsToIdle:true,saveReload:true,errors:0};
  fs.writeFileSync(path.join(output,'cache-result.json'),JSON.stringify(result,null,2));console.log('NOHAND_PUBLIC_CACHE_PASS '+JSON.stringify(result));
 }finally{await context.close();await browser.close();}
}
(async()=>{
 assert.equal(git('rev-parse','HEAD^'),main,'the public-check commit directly follows the tested main');
 await files('before');
 for(const screen of [{width:1280,height:720,mobile:false,dpr:1},{width:844,height:390,mobile:true,dpr:1},{width:820,height:366,mobile:true,dpr:1.875}]){await care(url,screen);console.log('NOHAND_PUBLIC_PASS '+JSON.stringify({...screen,main,dailyCap:true,public:true}));}
 await cacheUpdate();await files('after');
})().catch(e=>{console.error(e);process.exitCode=1;});
