const assert=require('node:assert/strict'),{chromium}=require('playwright');
const {seed,saveKey}=require('./game-harness.cjs');
module.exports=async function categories(url,mobile=false){
 const browser=await chromium.launch({headless:true}),viewport=mobile?{width:844,height:390}:{width:1280,height:720};
 const context=await browser.newContext({viewport,isMobile:mobile,hasTouch:mobile,locale:'ja-JP'}),page=await context.newPage(),errors=[],failed=[];
 await context.addInitScript(({key,state})=>{if(!localStorage.getItem(key))localStorage.setItem(key,JSON.stringify(state));},
  {key:saveKey,state:{...seed(),money:200000,items:{tomato:2,wildGreens:2},dogTreats:{treeNut:1},cookingIngredients:{fishFillet:2},preparedMeals:{bigFishPlate:1},soundEnabled:false}});
 page.on('pageerror',e=>errors.push(e.message));page.on('response',r=>{if(r.status()>=400&&/item-categories\.css/.test(r.url()))failed.push(r.url());});
 const press=selector=>page.locator(selector)[mobile?'tap':'click']();
 const stock=()=>page.evaluate(()=>JSON.stringify({money:s.money,hp:s.hp,items:s.items,baits:s.baits,dogTreats:s.dogTreats,lures:s.lures,fish:s.caught,ingredients:s.cookingIngredients,toys:s.ownedDogToys}));
 const screenshot=async screen=>console.log('V217_CATEGORY_SCREENSHOT '+JSON.stringify({mobile,screen,base64:(await page.screenshot({type:'jpeg',quality:80})).toString('base64')}));
 async function bag(){await press('#menu');await press('[data-field-menu-target="items"]');await page.locator('#inventory.open').waitFor({state:'visible'});}
 async function selected(scope,id){
  const panels=await page.locator(`[data-${scope}-category-panel]`).evaluateAll((nodes,scope)=>nodes.filter(el=>getComputedStyle(el).display!=='none').map(el=>el.dataset[scope+'CategoryPanel']),scope);
  assert.deepEqual(panels,[id],scope+' shows only the selected kind');
 }
 try{
  await page.goto(url,{waitUntil:'load'});await press('#start');await bag();const before=await stock();
  for(const category of ['bait','lures','food','ingredients','dogTreats','dogToys','tackle','collection','offerings']){
   await press(`[data-inventory-category="${category}"]`);await selected('inventory',category);assert.equal(await stock(),before);
   const bounds=await page.locator(`[data-inventory-category="${category}"]`).boundingBox();assert.ok(bounds.height>=44,'category touch target');
  }
  assert.match(await page.locator('#inventoryCategory-collection').textContent(),/収集品はまだない/);
  assert.match(await page.locator('#inventoryCategory-dogToys').textContent(),/おもちゃはまだない/);
  if(!mobile){await page.locator('[data-inventory-category="food"]').focus();await page.keyboard.press('Enter');await selected('inventory','food');}
  await press('[data-inventory-category="food"]');
  const bagLayout=await page.locator('#inventory').evaluate(el=>{
   const r=el.getBoundingClientRect(),nav=el.querySelector('#inventoryCategories'),content=el.querySelector('.inventory-category-content'),n=nav.getBoundingClientRect(),c=content.getBoundingClientRect(),close=el.querySelector('[data-close]').getBoundingClientRect();
   return {inside:r.top>=0&&r.bottom<=innerHeight+1,horizontal:el.scrollWidth<=el.clientWidth+1,
    independent:n.bottom<=r.bottom&&c.bottom<=r.bottom&&getComputedStyle(nav).overflowY==='auto'&&getComputedStyle(content).overflowY==='auto',
    sideBySide:n.right<=c.left+1,closeVisible:close.bottom<=r.bottom&&close.right<=r.right};
  });assert.ok(Object.values(bagLayout).every(Boolean),'bag layout '+JSON.stringify(bagLayout));
  await press('#inventoryCategory-food [data-use-item="tomato"]');assert.equal(await page.evaluate(()=>s.items.tomato),1);assert.equal(await page.evaluate(()=>s.hp),52);await selected('inventory','food');
  await press('#inventoryCategory-food [data-eat-prepared-meal="bigFishPlate"]');assert.equal(await page.evaluate(()=>s.activeMeal.id),'bigFishPlate');await screenshot('bag-food');
  await press('[data-inventory-category="ingredients"]');assert.match(await page.locator('#inventoryCategory-ingredients').innerText(),/餌欄と共用|犬のおやつ欄と共用/);
  await press('#inventory [data-close]');await bag();await selected('inventory','ingredients');await press('#inventory [data-close]');
  // Scene setup is independent of the category UI: buy through actual buttons.
  await page.evaluate(()=>{renderSamShop();open('store');});
  await press('[data-sam-category="bait"]');await press('[data-bait-count="5"]');await press('[data-buy-bait="worm"]');assert.equal(await page.evaluate(()=>s.baits.worm),22);
  await press('[data-sam-category="rods"]');assert.equal(await page.locator('#samCategory-bait').isVisible(),false);assert.equal(await page.locator('#samCategory-rods').isVisible(),true);
  await press('[data-sam-category="lures"]');await press('[data-buy-lure="silverSpoon"]');assert.equal(await page.evaluate(()=>s.lures.silverSpoon),1);
  await press('[data-sam-shop-tab="goods"]');await press('[data-sam-category="dogTreats"]');assert.equal(await page.locator('[data-buy-dog-good="rubberBall"]').isVisible(),false);await press('[data-buy-dog-good="samBiscuit"]');
  await press('[data-sam-category="dogToys"]');await press('[data-buy-dog-good="rubberBall"]');assert.equal(await page.locator('[data-buy-dog-good="rubberBall"]').isDisabled(),true);await screenshot('sam-dog-toys');
  await press('[data-sam-category="hands"]');await press('[data-buy-hand="gloves"]');assert.equal(await page.evaluate(()=>s.money),196400);await press('#store [data-close]');
  await page.evaluate(()=>openLocationInterior('yaoya'));await selected('location','food');await press('[data-location-count="10"]');await press('[data-buy-location-item="tomato"]');
  await press('[data-location-category="offerings"]');await selected('location','offerings');assert.equal(await page.locator('[data-buy-location-item="tomato"]').isVisible(),false);await press('[data-buy-location-item="offeringDaikon"]');
  assert.equal(await page.evaluate(()=>s.items.offeringDaikon),10);assert.equal(await page.evaluate(()=>s.items.tomato),11);assert.equal(await page.evaluate(()=>s.money),194600);await screenshot('yaoya-offerings');
  await press('#locationInterior [data-close]');await page.evaluate(()=>openLocationInterior('diner'));
  await press('[data-location-category="recipes"]');await selected('location','recipes');await press('#locationInterior [data-cook-recipe="bigFishPlate"]');
  assert.equal(await page.evaluate(()=>s.cookingIngredients.fishFillet),1);assert.equal(await page.evaluate(()=>s.items.wildGreens),1);
  await press('[data-location-category="meals"]');await selected('location','meals');await press('#locationInterior [data-eat-prepared-meal="bigFishPlate"]');
  const saved=await stock();await page.reload({waitUntil:'load'});await press('#start');assert.equal(await stock(),saved);await bag();await press('[data-inventory-category="dogToys"]');assert.match(await page.locator('#inventoryCategory-dogToys').innerText(),/ゴムボール/);
  if(mobile){await page.setViewportSize({width:390,height:844});assert.equal(await page.locator('.landscape-warning').isVisible(),true);await page.setViewportSize(viewport);await selected('inventory','dogToys');}
  assert.deepEqual(errors,[]);assert.deepEqual(failed,[]);
  console.log('V217_ITEM_CATEGORIES_PASS '+JSON.stringify({mobile,bagCategories:9,shopCategories:6,foodAndIngredients:true,sharedStock:true,bulkPurchase:true,cooking:true,reload:true,bagLayout,errors,failed}));
 }finally{await browser.close();}
};
