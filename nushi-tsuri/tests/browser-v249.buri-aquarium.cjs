const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),{chromium}=require('playwright');
const {seed,saveKey}=require('./game-harness.cjs'),{revealProduct,pressProduct}=require('./compact-ui-helpers.cjs');
module.exports=async function buriAquarium(url,mobile=false,options={}){
 const viewport=options.viewport||(mobile?{width:844,height:390}:{width:1280,height:720}),dir=path.join(__dirname,'browser-evidence-v249');fs.mkdirSync(dir,{recursive:true});
 const fish=(n)=>({uid:'pet-'+n,species:'buri',tank:0,length:150,bornSize:150,origin:'bred',generation:1,sex:n===1?'male':'female',acquiredDay:0,lastDay:0,fedDay:-1,changedDay:-1,water:100,health:90,careDays:0,stars:1,xp:0,level:1});
 const initial={...seed(),money:30000,gameMinutes:600,soundEnabled:false,caught:{...seed().caught,buri:1},petLife:{version:5,unlockedTanks:1,selected:'pet-1',selectedTank:0,nextId:3,food:1000,fish:[fish(1),fish(2)],eggs:[]}};
 const browser=options.browser||await chromium.launch({headless:true}),context=await browser.newContext({viewport,isMobile:mobile,hasTouch:mobile,deviceScaleFactor:options.dpr||1,locale:'ja-JP',serviceWorkers:'block',ignoreHTTPSErrors:true});
 await context.addInitScript(({key,state})=>{if(!localStorage.getItem(key))localStorage.setItem(key,JSON.stringify(state));localStorage.setItem('nushi-inugoya-options-v1',JSON.stringify({textSpeed:'instant'}));},{key:saveKey,state:initial});
 const page=await context.newPage(),errors=[],failed=[],milestones=[];
 page.on('pageerror',e=>errors.push(e.message));page.on('response',r=>{if(r.status()>=400)failed.push(r.status()+' '+new URL(r.url()).pathname);});
 const press=q=>page.locator(q)[mobile?'tap':'click'](),shot=name=>page.screenshot({path:path.join(dir,(mobile?'touch':'pc')+'-'+viewport.width+'x'+viewport.height+'-'+name+'.png')});
 async function start(){await require('./browser-start-adventure.cjs')(page,mobile);await page.clock.runFor(200);if(await page.locator('#lakeIntroSkip').isVisible()){await press('#lakeIntroSkip');await page.clock.runFor(200);}assert.match(await page.locator('.hud').innerText(),/v251/);}
 async function openNative(){await press('#menu');await press('[data-field-menu-target="items"]');await press('#openPetAquarium');await page.clock.runFor(240);}
 async function fit(){const r=await page.evaluate(()=>{const modal=document.querySelector('#petLifeModal'),content=modal.querySelector('.pet-content'),side=modal.querySelector('.pet-tank-info'),box=modal.getBoundingClientRect(),buttons=[...modal.querySelectorAll('.pet-care-dock button')];return {inside:box.left>=0&&box.top>=0&&box.right<=innerWidth+1&&box.bottom<=innerHeight+1,scroll:content.scrollHeight-content.clientHeight,sideScroll:side.scrollHeight-side.clientHeight,controls:buttons.every(b=>{const r=b.getBoundingClientRect(),top=document.elementFromPoint(r.x+r.width/2,r.y+r.height/2);return r.height>=44&&r.width>=44&&r.right<=innerWidth+1&&r.bottom<=innerHeight+1&&(b.disabled||b===top||b.contains(top));})};});assert.ok(r.inside&&r.scroll<=1&&r.sideScroll<=1&&r.controls,JSON.stringify(r));}
 async function art(variant){await page.waitForFunction(({variant})=>[...document.querySelectorAll('[data-pet-card-art="pet-1"] canvas')].some(c=>c.dataset.artSpecies==='buri'&&c.dataset.artVariant===variant&&c.getContext('2d').getImageData(0,0,c.width,c.height).data.some((v,i)=>i%4===3&&v>100)),{variant});}
 try{
  await page.clock.install({time:new Date('2026-10-21T00:00:00Z')});await page.clock.pauseAt('2026-10-21T00:00:01Z');await page.goto(url,{waitUntil:'domcontentloaded',timeout:90000});await start();await openNative();await fit();await art('buriMojako');assert.match(await page.locator('.pet-tank-info h3').innerText(),/モジャコ/);await shot('mojako');
  const original=await page.evaluate(()=>JSON.parse(JSON.stringify({caught:s.caught,records:s.sizeRecords,money:s.money,identity:s.petLife.fish.map(({uid,bornSize,sex,generation,origin})=>({uid,bornSize,sex,generation,origin}))})));
  const checks={3:['wakashi','ワカシ','buriYoung'],12:['inada','イナダ','buriYoung'],20:['warasa','ワラサ','buri'],27:['buri','ブリ','buri']};
  for(let day=0;day<33;day++){
   if(!await page.locator('[data-pet-action="water"]').isDisabled())await press('[data-pet-action="water"]');
   const food=await page.evaluate(()=>s.petLife.food);await press('[data-pet-action="feed"]');assert.equal(await page.evaluate(()=>s.petLife.food),food-2);assert.equal(await page.locator('[data-pet-action="feed"]').isDisabled(),true);
   await press('#petLifeModal [data-pet-action="close"]');assert.equal(await page.evaluate(()=>sleepAtPlayerHome()),true);await page.evaluate(()=>petUi.open('aquarium'));await page.clock.runFor(100);
   if(day+1<30)assert.equal(await page.evaluate(()=>s.petLife.eggs.length),0);
   if(day+1===30){assert.equal(await page.evaluate(()=>s.petLife.eggs.length),1);await shot('buri-eggs');}
   const check=checks[day+1];if(check){const [id,name,variant]=check;assert.match(await page.locator('.pet-tank-info h3').innerText(),new RegExp(name));await art(variant);await fit();assert.match(await page.locator('.pet-growth-notice').innerText(),new RegExp(name+'に育った'));await shot(name+'-promoted');await press('[data-pet-action="records"]');assert.equal(await page.locator('[data-pet-growth]').getAttribute('data-pet-growth'),id);if(id==='inada')assert.match(await page.locator('[data-pet-growth]').innerText(),/ハマチ/);await shot(name+'-records');await press('.pet-sheet [data-pet-action="panel-close"]');milestones.push({day:day+1,name,variant,length:await page.evaluate(()=>s.petLife.fish[0].length)});}
  }
  const child=await page.evaluate(()=>s.petLife.fish.find(f=>f.generation===2));assert.ok(child);assert.equal(child.length,150);assert.equal(child.species,'buri');await press('.pet-fish-roster [data-pet-inspect="'+child.uid+'"]');await page.clock.runFor(240);assert.match(await page.locator('.pet-tank-info h3').innerText(),/モジャコ/);await fit();await shot('next-generation-mojako');
  const after=await page.evaluate(()=>JSON.parse(JSON.stringify({caught:s.caught,records:s.sizeRecords,money:s.money,identity:s.petLife.fish.filter(f=>f.generation===1).map(({uid,bornSize,sex,generation,origin})=>({uid,bornSize,sex,generation,origin}))})));assert.deepEqual(after,original);
  const saved=await page.evaluate(()=>JSON.parse(JSON.stringify(s.petLife)));await press('#petLifeModal [data-pet-action="close"]');await page.reload({waitUntil:'domcontentloaded'});await start();await openNative();assert.deepEqual(await page.evaluate(()=>JSON.parse(JSON.stringify(s.petLife))),saved);await fit();assert.equal(await page.evaluate(()=>fish.length),60);assert.equal(await page.evaluate(()=>fish.find(f=>f.id==='buri').name),'ブリ');assert.deepEqual(errors,[]);assert.deepEqual(failed,[]);
  // A fresh shop fish now starts at Mojako too, independently of these bred parents.
  await press('[data-pet-action="shop"]');await revealProduct(page,'[data-pet-buy="buri"]',mobile);
  assert.match(await page.locator('.compact-product:has([data-pet-buy="buri"]) .compact-selection-description').innerText(),/1\.50cm.*モジャコから育てる/s);
  await pressProduct(page,'[data-pet-buy="buri"]',mobile);await press('[data-pet-action="aquarium"]');
  const purchased=await page.evaluate(()=>JSON.parse(JSON.stringify(s.petLife.fish.find(f=>f.origin==='shop'))));
  assert.equal(purchased.length,150);assert.equal(purchased.bornSize,150);assert.equal(purchased.generation,0);
  assert.match(await page.locator('.pet-tank-info h3').innerText(),/モジャコ/);assert.equal(await page.locator('[data-pet-size-rank]').innerText(),'稚魚');await fit();await shot('purchased-mojako');
  await press('#petLifeModal [data-pet-action="close"]');await page.reload({waitUntil:'domcontentloaded'});await start();await openNative();
  assert.deepEqual(await page.evaluate(uid=>JSON.parse(JSON.stringify(s.petLife.fish.find(f=>f.uid===uid))),purchased.uid),purchased);
  assert.match(await page.locator('.pet-tank-info h3').innerText(),/モジャコ/);await fit();assert.deepEqual(errors,[]);assert.deepEqual(failed,[]);
  console.log('V249_BURI_PASS '+JSON.stringify({viewport,mobile,dpr:options.dpr||1,milestones,firstEggDay:30,hatchDay:33,child:{uid:child.uid,length:child.length,generation:child.generation},sameParents:true,purchasedMojako:true,purchasedMojakoReload:true,catchRecordsUnchanged:true,saveReload:true,errors:errors.length,httpErrors:failed.length}));
 }finally{await context.close();if(!options.browser)await browser.close();}
};

