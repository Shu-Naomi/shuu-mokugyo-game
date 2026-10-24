const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),{chromium}=require('playwright');
const key='nushi-inugoya-v2',key2=key+'-slot2';
const fixture=(slot=1)=>({mapVersion:102,money:4321,hp:80,maxHp:100,gameMinutes:500,caught:{funa:2},baits:{worm:7},dog:slot===1?'shuu':'riku',avatar:slot===1?'girl':'boy',playerName:slot===1?'旅人':'二人目',dogFollowing:slot===1,dogAffinity:{shuu:440,riku:215,grey:982},dogTricks:{shuu:72,riku:26,grey:492},x:10,y:79,direction:'left',lakeStory:{introSeen:true},extraFuture:{keep:slot}});
const chosen={player:'なおみなおみなおみなおみ',shuu:'しゅうしゅうしゅうしゅう',riku:'りくりくりくりくりくりく',grey:'ぐれいぐれいぐれいぐれい'};
module.exports=async function characterNames(url,screen){
 const {width,height,mobile,dpr}=screen,browser=await chromium.launch({headless:true}),context=await browser.newContext({viewport:{width,height},isMobile:mobile,hasTouch:mobile,deviceScaleFactor:dpr,locale:'ja-JP',serviceWorkers:'block'});
 const errors=[],httpErrors=[],dir=path.join(__dirname,'character-names-evidence');fs.mkdirSync(dir,{recursive:true});let page;
 try{
  await context.addInitScript(({key,key2,one,two})=>{if(!localStorage.getItem(key))localStorage.setItem(key,JSON.stringify(one));if(!localStorage.getItem(key2))localStorage.setItem(key2,JSON.stringify(two));localStorage.setItem('nushi-inugoya-options-v1',JSON.stringify({textSpeed:'instant'}));},{key,key2,one:fixture(),two:fixture(2)});
  page=await context.newPage();const cdp=mobile?await context.newCDPSession(page):null,press=q=>page.locator(q)[mobile?'tap':'click'](),shot=name=>page.screenshot({path:path.join(dir,`${width}x${height}-${name}.png`)});
  page.on('pageerror',e=>errors.push(e.message));page.on('response',r=>{if(r.status()>=400&&r.url().startsWith(new URL(url).origin+'/nushi-tsuri/'))httpErrors.push(r.status()+' '+r.url());});
  async function start(){await press('#start');if(await page.locator('#lakeIntroSkip').isVisible())await press('#lakeIntroSkip');}
  async function options(){await press('#menu');await press('[data-field-menu-target="options"]');}
  async function rename(target,name){await press(`[data-name-target="${target}"]`);const hero=target==='player';await page.locator(hero?'#optionsPlayerName':'#optionsDogName').fill(name);await press(hero?'#optionsRename':'#optionsDogRename');}
  const progress=()=>page.evaluate(()=>{const a=JSON.parse(JSON.stringify(s));delete a.playerName;delete a.dogNames;delete a.dog;return a;});
  async function fits(){const d=await page.evaluate(()=>{
   const body=document.querySelector('.options-body'),b=body.getBoundingClientRect(),nodes=[...document.querySelectorAll('#optionsNameTargets button,.options-identity form:not([hidden]) input,.options-identity form:not([hidden]) button,#optionsFavoriteDogs button,#optionsClose')];
   return {horizontal:body.scrollWidth-body.clientWidth,controls:nodes.map(el=>{const r=el.getBoundingClientRect();return {id:el.id||el.dataset.nameTarget||el.dataset.favoriteDog,x:r.x,y:r.y,w:r.width,h:r.height,inside:r.top>=0&&r.bottom<=innerHeight&&r.left>=0&&r.right<=innerWidth,body:el.id==='optionsClose'||r.top>=b.top-1&&r.bottom<=b.bottom+1};})};
  });assert.ok(d.horizontal<=1,JSON.stringify(d));for(const c of d.controls)assert.ok(c.h>=44&&c.inside&&c.body,JSON.stringify(c));return d;}
  await page.goto(url,{waitUntil:'load'});assert.equal(await page.evaluate(k=>localStorage.getItem(k),key),JSON.stringify(fixture()),'title reading never rewrites the old save');await start();const original=await progress(),otherRaw=await page.evaluate(k=>localStorage.getItem(k),key2);
  await options();await fits();
  await rename('player','👩‍👩‍👧‍👦'.repeat(12));assert.equal(await page.evaluate(()=>s.playerName),'👩‍👩‍👧‍👦'.repeat(12));
  for(const [target,n] of Object.entries(chosen))await rename(target,n);
  const beforeInvalid=await page.evaluate(k=>localStorage.getItem(k),key);for(const value of ['　','あ'.repeat(13)]){await rename('grey',value);assert.equal(await page.evaluate(k=>localStorage.getItem(k),key),beforeInvalid);}
  await rename('grey','<img src=x>');assert.equal(await page.locator('.options-identity img').count(),0);await rename('grey',chosen.grey);
  await press('[data-name-target="shuu"]');await page.locator('#optionsDogName').fill('変換中');await page.locator('#optionsDogName').dispatchEvent('compositionstart');await page.locator('#optionsDogName').press('Enter');assert.equal(await page.evaluate(()=>s.dogNames.shuu),chosen.shuu);await page.locator('#optionsDogName').dispatchEvent('compositionend');await page.locator('#optionsDogName').fill(chosen.shuu);
  await press('[data-favorite-dog="grey"]');const layout=await fits();await shot('names');
  // The pre-existing audio controls remain operable below the new name editor.
  const drag=require('./browser-range-input.cjs');
  await drag(page,'#optionsBgmVolume',.45,0,cdp);assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('nushi-inugoya-options-v1')).bgmVolume),0);
  await drag(page,'#optionsSeVolume',.8,1,cdp);assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('nushi-inugoya-options-v1')).seVolume),100);
  await shot('audio-preserved');assert.deepEqual(await progress(),original);assert.equal(await page.evaluate(k=>localStorage.getItem(k),key2),otherRaw);await press('#optionsClose');assert.equal(await page.locator('#statusDog').innerText(),chosen.grey);
  await press('#menu');await press('[data-field-menu-target="dog"]');for(const id of ['shuu','riku','grey']){await press(`[data-dog-care-id="${id}"]`);assert.equal(await page.locator('#dogCareName').innerText(),chosen[id]);}await shot('care');await press('#dogCare [data-close]');
  await page.reload({waitUntil:'load'});await start();assert.deepEqual(await page.evaluate(()=>s.dogNames),{shuu:chosen.shuu,riku:chosen.riku,grey:chosen.grey});assert.equal(await page.evaluate(()=>s.playerName),chosen.player);assert.equal(await page.evaluate(()=>s.dog),'grey');assert.equal(await page.evaluate(()=>s.avatar),'girl');await options();await press('[data-name-target="grey"]');await fits();await shot('resumed');await press('#optionsClose');
  const firstRaw=await page.evaluate(k=>localStorage.getItem(k),key),secondURL=new URL(url);secondURL.searchParams.set('saveSlot','2');await page.goto(secondURL.href,{waitUntil:'load'});await start();assert.equal(await page.evaluate(()=>s.playerName),'二人目');assert.equal(await page.evaluate(()=>s.dogFollowing),false);await options();await rename('shuu','二の犬');await rename('player','二の主人公');await press('[data-favorite-dog="shuu"]');assert.equal(await page.evaluate(()=>s.dogFollowing),false);assert.equal(await page.evaluate(k=>localStorage.getItem(k),key),firstRaw);await shot('slot-two');await press('#optionsClose');
  await page.reload({waitUntil:'load'});await start();assert.equal(await page.evaluate(()=>s.dogNames.shuu),'二の犬');assert.equal(await page.evaluate(()=>s.playerName),'二の主人公');assert.equal(await page.evaluate(()=>s.dog),'shuu');assert.equal(await page.evaluate(()=>s.dogFollowing),false);assert.equal(await page.evaluate(k=>localStorage.getItem(k),key),firstRaw);assert.equal(await page.evaluate(()=>fish.length),60);assert.equal(await page.evaluate(()=>s.petLife.version),6);assert.deepEqual(errors,[]);assert.deepEqual(httpErrors,[]);
  const result={screen,names:chosen,layout,legacy:true,ime:true,slotIsolation:true,resume:true,leaveAtHome:true,progressUnchanged:true,audioSliders:true,catalogueCount:60,errors,httpErrors};fs.writeFileSync(path.join(dir,`${width}x${height}-result.json`),JSON.stringify(result,null,2));console.log('CHARACTER_NAMES_PASS '+JSON.stringify(result));
 }catch(error){if(page)await page.screenshot({path:path.join(dir,`${width}x${height}-failure.png`)}).catch(()=>{});fs.writeFileSync(path.join(dir,`${width}x${height}-failure.json`),JSON.stringify({error:error.stack,screen,errors,httpErrors},null,2));throw error;}
 finally{await context.close();await browser.close();}
};
