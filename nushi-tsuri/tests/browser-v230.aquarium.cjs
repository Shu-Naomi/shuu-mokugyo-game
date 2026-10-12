const assert=require('node:assert/strict'),{chromium}=require('playwright');
const {seed,saveKey}=require('./game-harness.cjs');

// Real Chromium pixels and clicks/touches; pre-existing specimen records are
// fixtures. Breeding below uses the real shop, care and game-clock routes.
module.exports=async function aquariumGrowth(url,mobile=false){
 const browser=await chromium.launch({headless:true}),errors=[],failed=[];
 const viewport=mobile?{width:844,height:390}:{width:1280,height:720};
 async function open(state){
  const context=await browser.newContext({viewport,isMobile:mobile,hasTouch:mobile,locale:'ja-JP',serviceWorkers:'block'});
  await context.addInitScript(({state,key})=>{localStorage.setItem('nushi-inugoya-options-v1',JSON.stringify({textSpeed:'instant'}));if(!localStorage.getItem(key))localStorage.setItem(key,JSON.stringify(state));},{state,key:saveKey});
  const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));
  page.on('response',r=>{if(r.status()>=400&&/nushi-tsuri/.test(r.url()))failed.push(r.status()+' '+r.url());});
  const press=q=>page.locator(q)[mobile?'tap':'click']();
  await page.goto(url,{waitUntil:'load'});await press('#start');if(await page.locator('#lakeIntroSkip').isVisible())await press('#lakeIntroSkip');
  await press('#action');assert.equal(await page.locator('#petLifeModal.open').count(),1);
  return {context,page,press};
 }
 const specimen=(uid,species,tank,length,bornSize=length)=>({uid,species,tank,length,bornSize,acquiredDay:0,lastDay:3,fedDay:3,changedDay:3,water:100,health:90,careDays:4,generation:0,stars:1,xp:40,sex:uid==='pet-2'?'female':'male'});
 const initial={...seed(),gameMinutes:4820,soundEnabled:false,money:50000,x:199,y:36,
  caught:{moroko:2,aji:1,isaki:2,nijimasu:2,nushi:1,streamNushi:1,coastNushi:1,caveNushi:1,starNushi:1},
  sizeRecords:{starNushi:{hundredths:36543,tierId:'normal'}},
  petLife:{version:4,unlockedTanks:6,food:100,selected:'pet-1',selectedTank:0,nextId:8,
   fish:[specimen('pet-1','moroko',0,750),specimen('pet-2','moroko',0,1600,750),
    specimen('pet-3','aji',1,2100),specimen('pet-4','isaki',2,1500),specimen('pet-5','isaki',2,2500,1500),
    specimen('pet-6','nijimasu',3,1500),specimen('pet-7','nijimasu',3,2500,1500)]}};
 const snap=page=>page.evaluate(()=>({money:s.money,hp:s.hp,time:s.gameMinutes,food:s.petLife.food,fish:s.petLife.fish,caught:s.caught,records:s.sizeRecords}));
 const screenshot=async(page,screen)=>{
  if(mobile){
   const subject={'tank-selection':'.pet-buyback-tanks','specimen-confirmation':'.pet-buyback-detail','juvenile-and-adult-isaki':'.pet-buyback-fish','young-nijimasu':'#petInspectStage','freshwater-legend-tank':'#petTankStage','bred-eggs':'.pet-eggs','bred-fry':'#petInspectStage'}[screen];
   await page.locator(subject).scrollIntoViewIfNeeded();
  }
  console.log('V230_SCREENSHOT '+JSON.stringify({mobile,screen,base64:(await page.screenshot({type:'jpeg',quality:85})).toString('base64')}));
 };
 try{
  const {context,page,press}=await open(initial);
  try{
   await press('[data-pet-tab="buyback"]');assert.equal(await page.locator('[data-pet-buyback]').count(),0);
   await screenshot(page,'tank-selection');
   await press('[data-pet-buyback-tank="0"]');assert.equal(await page.locator('[data-pet-buyback]').count(),2);
   const widths=await page.locator('[data-pet-specimen]').evaluateAll(els=>els.map(el=>parseFloat(el.style.width)));
   assert.ok(widths[1]>widths[0]*1.3,'portraits reflect different lengths');
   assert.match(await page.locator('.pet-card-comment').first().innerText(),/アスアル/);
   const before=await snap(page);
   await press('[data-pet-buyback="pet-2"]');await press('[data-pet-action="buyback-cancel"]');assert.deepEqual(await snap(page),before);
   await press('[data-pet-buyback="pet-2"]');assert.match(await page.locator('.pet-buyback-detail').innerText(),/#2.*16\.00cm/s);
   assert.equal(await page.locator('.pet-buyback-detail').evaluate(el=>el.scrollWidth<=el.clientWidth+1),true);
   assert.ok((await page.locator('[data-pet-action="buyback-confirm"]').boundingBox()).height>=44);
   await screenshot(page,'specimen-confirmation');
   const price=await page.evaluate(()=>ShuPetLife.buyBackQuote(s.petLife.fish.find(f=>f.uid==='pet-2'),petCatalog).price);
   await press('[data-pet-action="buyback-confirm"]');assert.equal((await snap(page)).money,before.money+price);
   assert.deepEqual(await page.evaluate(()=>s.petLife.fish.map(f=>f.uid)),['pet-1','pet-3','pet-4','pet-5','pet-6','pet-7']);
   await press('[data-pet-action="buyback-tanks"]');await press('[data-pet-buyback-tank="2"]');
   assert.equal(await page.locator('[data-pet-buyback]').count(),2);
   await page.waitForFunction(()=>[...document.querySelectorAll('[data-pet-specimen="pet-5"] canvas')].some(c=>{if(!c.dataset.atlasKey?.includes('stripes:0.000'))return false;const a=c.getContext('2d').getImageData(0,0,c.width,c.height).data;let count=0;for(let n=3;n<a.length;n+=4)if(a[n]>100)count++;return count>3000;}));
   const actual=await page.locator('[data-pet-specimen="pet-5"] canvas').evaluate(c=>{const a=c.getContext('2d').getImageData(0,0,c.width,c.height).data;let count=0;for(let n=3;n<a.length;n+=4)if(a[n]>100)count++;return {count,corner:a[3]};});
   assert.ok(actual.count>3000);assert.equal(actual.corner,0);
   await screenshot(page,'juvenile-and-adult-isaki');
   await press('[data-pet-action="aquarium"]');await press('[data-pet-action="tanks"]');await press('[data-pet-tank="3"]');
   await press('.pet-fish-roster [data-pet-inspect="pet-6"]');await page.waitForFunction(()=>document.querySelector('#petInspectFish')?.dataset.specimenLength==='1500');
   const youngWidth=await page.locator('#petInspectFish').evaluate(el=>parseFloat(el.style.width));assert.match(await page.locator('#petInspectFish').getAttribute('data-specimen-appearance'),/パーマーク/);await screenshot(page,'young-nijimasu');
   await press('.pet-fish-roster [data-pet-inspect="pet-7"]');await page.waitForFunction(()=>document.querySelector('#petInspectFish')?.dataset.specimenLength==='2500');
   assert.ok(await page.locator('#petInspectFish').evaluate(el=>parseFloat(el.style.width))>youngWidth*1.25);assert.match(await page.locator('#petInspectFish').getAttribute('data-specimen-appearance'),/幼魚斑が薄れ/);
   await press('[data-pet-action="help"]');await press('[data-pet-action="legend-shop"]');
   await press('[data-pet-tab="legends"]');const money=await page.evaluate(()=>s.money);
   for(const id of ['nushi','streamNushi','coastNushi','caveNushi','starNushi'])await press(`[data-pet-nushi="${id}"]`);
   assert.equal(await page.evaluate(()=>s.money),money);assert.equal(await page.evaluate(()=>ShuPetLife.residents(s,6).length),4);assert.equal(await page.evaluate(()=>ShuPetLife.residents(s,7).length),1);
   assert.equal(await page.locator('[data-pet-nushi="starNushi"]').isDisabled(),true);
   await press('[data-pet-action="aquarium"]');await press('[data-pet-action="tanks"]');await press('[data-pet-tank="6"]');
   await page.waitForFunction(()=>document.querySelectorAll('#petTankStage [data-pet-fish] canvas').length===4);
   assert.match(await page.locator('.pet-tank-current').innerText(),/淡水ぬし総合水槽.*4\/8/s);
   assert.equal(await page.locator('[data-pet-action="rehome"]').count(),0);await screenshot(page,'freshwater-legend-tank');
   await press('[data-pet-action="tanks"]');await press('[data-pet-tank="7"]');assert.match(await page.locator('.pet-tank-current').innerText(),/海水ぬし総合水槽.*1\/8/s);
   const saved=await snap(page);await page.reload({waitUntil:'load'});await press('#start');await press('#action');assert.deepEqual(await snap(page),saved);
   console.log('V230_SHOP_AND_LEGENDS_PASS '+JSON.stringify({mobile,oldSave:true,exactUid:true,cancel:true,portraits:widths,adultPixels:actual,waterPools:true,reload:true,errors,failed}));
  }finally{await context.close();}
  const bred=await open({...seed(),gameMinutes:500,money:50000,soundEnabled:false,x:199,y:36,caught:{moroko:1}});
  try{
   const {page,press}=bred;await press('[data-pet-buy="moroko"]');await press('[data-pet-buy="moroko"]');
   await press('[data-pet-tab="supplies"]');await press('[data-pet-action="food-10"]');await press('[data-pet-action="aquarium"]');
   async function day(){await press('[data-pet-action="feed"]');if(await page.locator('[data-pet-action="water"]').isEnabled())await press('[data-pet-action="water"]');await page.evaluate(()=>{advanceGameTime(s,1440);save();petUi.render();});}
   for(let i=0;i<3;i++)await day();assert.equal(await page.locator('.pet-eggs').count(),1);await screenshot(page,'bred-eggs');
   for(let i=0;i<2;i++)await day();
   const fry=await page.evaluate(()=>s.petLife.fish.find(f=>f.origin==='bred'));
   assert.ok(fry&&fry.length>0);assert.equal(await page.evaluate(()=>ShuPetLife.lifeStage(s.petLife.fish.find(f=>f.origin==='bred'),petCatalog)),'fry');
   await press(`.pet-fish-roster [data-pet-inspect="${fry.uid}"]`);
   await page.waitForFunction(()=>Number(document.querySelector('#petInspectFish')?.dataset.specimenLength)>0);
   const tinyWidth=await page.locator('#petInspectFish').evaluate(el=>parseFloat(el.style.width));assert.ok(tinyWidth>=14);
   assert.match(await page.locator('[data-pet-size-rank]').innerText(),/稚魚（繁殖限定）/);await screenshot(page,'bred-fry');
   const newborn=await snap(page);await page.reload({waitUntil:'load'});await press('#start');await press('#action');await press('[data-pet-action="aquarium"]');assert.deepEqual(await snap(page),newborn);
   for(let i=0;i<4;i++)await day();const grown=await page.evaluate(uid=>s.petLife.fish.find(f=>f.uid===uid),fry.uid);assert.ok(grown.length>fry.length);
   assert.equal(await page.evaluate(uid=>ShuPetLife.lifeStage(s.petLife.fish.find(f=>f.uid===uid),petCatalog),fry.uid),'juvenile');
   assert.deepEqual(await page.evaluate(()=>s.caught),{moroko:1});
   assert.deepEqual(errors,[]);assert.deepEqual(failed,[]);
   console.log('V230_BREEDING_AND_GROWTH_PASS '+JSON.stringify({mobile,eggs:true,fryCm:fry.length/100,fryWidth:tinyWidth,grownCm:grown.length/100,reload:true,wildCatchesUnchanged:true,errors,failed}));
  }finally{await bred.context.close();}
 }finally{await browser.close();}
};
