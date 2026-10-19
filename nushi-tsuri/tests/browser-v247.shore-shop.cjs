const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),{chromium}=require('playwright');
const {seed,saveKey}=require('./game-harness.cjs'),{revealProduct}=require('./compact-ui-helpers.cjs');
module.exports=async function shoreShop(url,mobile=false,options={}){
 const viewport=options.viewport||(mobile?{width:844,height:390}:{width:1280,height:720}),directory=path.join(__dirname,'browser-evidence-v247');fs.mkdirSync(directory,{recursive:true});
 const browser=options.browser||await chromium.launch({headless:true}),context=await browser.newContext({viewport,deviceScaleFactor:options.dpr||1,isMobile:mobile,hasTouch:mobile,locale:'ja-JP',serviceWorkers:'block',ignoreHTTPSErrors:true});
 const initial={...seed(),soundEnabled:false,hp:100,money:100000,gameMinutes:600,x:210,y:104,mapRegion:'village',ownedRods:['bamboo','tideMaster','lureRod'],selectedRod:'tideMaster',selectedBait:'river',selectedHook:'small',baits:{river:30,liveMinnow:30,shell:30}};
 await context.addInitScript(({key,state})=>{if(!localStorage.getItem(key))localStorage.setItem(key,JSON.stringify(state));localStorage.setItem('nushi-inugoya-options-v1',JSON.stringify({textSpeed:'instant'}));},{key:saveKey,state:initial});
 const page=await context.newPage(),errors=[],failed=[],press=q=>page.locator(q)[mobile?'tap':'click'](),value=exp=>page.evaluate(exp),shot=name=>page.screenshot({path:path.join(directory,(mobile?'touch':'pc')+'-'+viewport.width+'x'+viewport.height+'-'+name+'.png')});
 page.on('pageerror',e=>errors.push(e.message));page.on('response',r=>{if(r.status()>=400)failed.push(r.status()+' '+new URL(r.url()).pathname);});
 const snapshot=()=>page.evaluate(()=>JSON.parse(JSON.stringify({money:s.money,time:s.gameMinutes,hp:s.hp,baits:s.baits,caught:s.caught,fish:s.petLife.fish})));
 async function start(){await press('#start');await page.clock.runFor(240);if(await page.locator('#lakeIntroSkip').isVisible()){await press('#lakeIntroSkip');await page.clock.runFor(240);}assert.match(await page.locator('.hud').innerText(),/v247/);}
 async function begin(){await press('#wait');await press('#beginCast');await page.evaluate(()=>{clearInterval(timer);timer=0;battle.cast=50;});}
 async function finishFlight(){for(let i=0;i<40&&await value('battle?.phase')==='cast-flight';i++)await page.clock.runFor(40);assert.equal(await value('battle.phase'),'wait');}
 const casts=[];
 try{
  await page.clock.install({time:new Date('2026-10-20T00:00:00Z')});await page.clock.pauseAt('2026-10-20T00:00:01Z');await page.goto(url,{waitUntil:'domcontentloaded',timeout:90000});await start();await page.evaluate(()=>ShuCast.preload());
  for(const avatar of ['boy','girl'])for(const locale of ['harbor','beach']){
   await page.evaluate(({avatar,locale})=>{Object.assign(s,{avatar,x:locale==='harbor'?210:83,y:104,fishingMethod:'bait',selectedBait:'river',selectedHook:'small'});cast({zone:'sea',waterZone:'sea',waterX:s.x,waterY:s.y+6});},{avatar,locale});
   await begin();const old=await snapshot();await press('#pull');await page.evaluate(()=>battleTick());assert.equal(await value('battle.phase'),'cast-flight');assert.equal(await page.locator('#hint').isVisible(),false);
   const poses=[];for(const [delta,name]of [[400,'backswing'],[300,'release']]){
    await page.clock.runFor(delta);const m=await page.evaluate(()=>({frame:pixelCastModel.frame,hand:pixelCastModel.hand,feet:[pixelCastModel.leftFoot.y,pixelCastModel.rightFoot.y],tip:pixelCastModel.tip,locale:surfaceSceneryKind(),detailed:pixelCastModel.detailed,line:document.querySelector('#castLinePath').getAttribute('d')}));
    assert.equal(m.locale,locale);assert.ok(m.detailed&&m.tip.y>=0);assert.match(m.line,/^M [\d.-]+ [\d.-]+ L [\d.-]+ [\d.-]+$/);poses.push(m);await shot(avatar+'-'+locale+'-'+name);
   }
   assert.notEqual(poses[0].frame,poses[1].frame);assert.deepEqual(poses[0].feet,poses[1].feet);assert.ok(Math.hypot(poses[0].hand.x-poses[1].hand.x,poses[0].hand.y-poses[1].hand.y)>10);
   await finishFlight();assert.equal(await value('s.baits.river'),old.baits.river-1);casts.push({avatar,locale,frames:poses.map(p=>p.frame)});await page.evaluate(()=>endBattle());
  }
  const cases=[['oyanirami','river','river','small',20],['akakamasu','sea','liveMinnow','medium',50],['ishidai','sea','shell','large',80]];
  for(const mode of ['gauge','nushi'])for(const [id,zone,bait,hook,distance]of cases){
   await page.evaluate(({mode,zone,bait,hook})=>{hideCatchCard();Object.assign(s,{avatar:'boy',fightMode:mode,selectedBait:bait,selectedHook:hook,x:zone==='sea'?210:123,y:zone==='sea'?104:92});cast({zone,waterZone:zone,waterX:s.x,waterY:s.y+6});},{mode,zone,bait,hook});await begin();const old=await snapshot();
   await page.evaluate(({id,zone,distance})=>{battle.cast=distance;const spot=zone+'-'+(distance<34?'shallow':distance<67?'mid':'deep');window.v247Random=Math.random;for(let n=0;n<10000;n++){Math.random=()=>(n+.5)/10000;if(pick(distance,spot)?.id===id)return;}throw Error('no normal odds for '+id);},{id,zone,distance});
   await press('#pull');await page.evaluate(()=>battleTick());await finishFlight();await page.evaluate(()=>{Math.random=window.v247Random;startFight();clearInterval(timer);timer=0;finishHookReveal();renderBattleFish();});assert.equal(await value('battle.f.id'),id);assert.equal(await value('battle.fightMode'),mode);
   await page.waitForFunction(id=>{const c=document.querySelector('#battleFish canvas');return c?.dataset.artSpecies===id&&c.getContext('2d').getImageData(0,0,c.width,c.height).data.some((v,i)=>i%4===3&&v>100);},id);await shot(id+'-'+mode);
   await page.evaluate(()=>{battle.retrieval=1;surfaceCatch();});await page.clock.runFor(1250);assert.equal(await value('s.caught.'+id),(old.caught[id]||0)+1);assert.equal(await value('s.baits.'+bait),old.baits[bait]-1);assert.equal(await value('s.catchMemories.'+id+'.best.method'),'bait');
  }
  await page.evaluate(()=>{hideCatchCard();save();});await page.reload({waitUntil:'domcontentloaded'});await start();for(const [id]of cases)assert.equal(await value('s.caught.'+id),2);assert.equal(await value('fish.length'),52);
  await page.evaluate(()=>{for(const f of fish)s.caught[f.id]=1;s.petLife.unlockedTanks=2;petUi.open('shop');});
  await page.waitForFunction(()=>[...document.querySelectorAll('.pet-fish-sales [data-compact-select]')].filter(n=>n.getClientRects().length).every(n=>{const c=n.querySelector('canvas');return c&&c.getContext('2d').getImageData(0,0,c.width,c.height).data.some((v,i)=>i%4===3&&v>100);}));
  const baseline=await snapshot(),layout=await page.locator('.pet-fish-sales').evaluate(n=>({visible:[...n.querySelectorAll('[data-compact-select]')].filter(x=>x.getClientRects().length).length,scroll:n.scrollHeight-n.clientHeight,columns:getComputedStyle(n).getPropertyValue('--compact-list-columns')}));
  assert.ok(layout.visible>=(mobile?6:18),JSON.stringify(layout));assert.equal(layout.scroll,0);assert.equal(await page.locator('[data-pet-buy]').count(),47);
  for(const [category,label,id]of [['fresh','淡水','oyanirami'],['sea','海水','ishidai']]){
   await press('[data-pet-water="'+category+'"]');assert.equal(await page.locator('[data-pet-water="'+category+'"]').getAttribute('aria-pressed'),'true');
   const actual=await page.locator('[data-pet-buy]').evaluateAll(ns=>ns.map(n=>n.dataset.petBuy)),expected=await page.evaluate(label=>petCatalog.filter(f=>!f.legendary&&f.waterLabel===label).map(f=>f.id),label);assert.deepEqual(actual,expected);
   await revealProduct(page,'[data-pet-buy="'+id+'"]',mobile);const selected=page.locator('[data-pet-buy="'+id+'"]').locator('xpath=ancestor::article[contains(@class,"compact-product")][1]');
   await selected.locator('[data-compact-info]')[mobile?'tap':'click']();assert.match(await page.locator('.compact-sheet-body').innerText(),new RegExp(label));const hero=await page.locator('.compact-detail-art>.pet-fish-thumb').boundingBox();assert.ok(hero.width>=100&&hero.height>=80);await press('[data-compact-sheet-close]');assert.deepEqual(await snapshot(),baseline);await shot('asual-'+category);
  }
  await press('[data-pet-water="fresh"]');const preserved=page.locator('[data-pet-buy="oyanirami"]').locator('xpath=ancestor::article[contains(@class,"compact-product")][1]').locator('[data-compact-select]');assert.equal(await preserved.getAttribute('aria-selected'),'true');
  const price=await value('petCatalog.find(f=>f.id==="oyanirami").price');await press('[data-pet-buy="oyanirami"]');assert.equal(await value('s.money'),baseline.money-price);assert.equal(await value('s.petLife.fish.length'),1);assert.equal(await page.locator('[data-pet-water="fresh"]').getAttribute('aria-pressed'),'true');
  await press('[data-pet-water="sea"]');await revealProduct(page,'[data-pet-buy="ishidai"]',mobile);assert.equal(await page.locator('[data-pet-buy="ishidai"]').isDisabled(),true);assert.match(await page.locator('.compact-selected .compact-selection-description').innerText(),/この水槽は淡水/);await shot('asual-water-mismatch');
  await page.locator('#petTankSelect').selectOption('1');assert.equal(await page.locator('[data-pet-water="sea"]').getAttribute('aria-pressed'),'true');const seaPrice=await value('petCatalog.find(f=>f.id==="ishidai").price');await press('[data-pet-buy="ishidai"]');assert.equal(await value('s.money'),baseline.money-price-seaPrice);
  const saved=await snapshot();await press('[data-pet-action="close"]');await page.reload({waitUntil:'domcontentloaded'});await start();assert.deepEqual(await value('JSON.parse(JSON.stringify({money:s.money,fish:s.petLife.fish,caught:s.caught}))'),{money:saved.money,fish:saved.fish,caught:saved.caught});
  assert.deepEqual(errors,[]);assert.deepEqual(failed,[]);console.log('V247_PASS '+JSON.stringify({viewport,mobile,dpr:options.dpr||1,casts,layout,species:3,modes:2,waterCategories:2,purchaseAndReload:true,errors:errors.length,httpErrors:failed.length}));
 }finally{await context.close();if(!options.browser)await browser.close();}
};
