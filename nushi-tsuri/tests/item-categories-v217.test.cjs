const {test}=require('node:test'),assert=require('node:assert/strict');
const {boot,seed,read,saveKey}=require('./game-harness.cjs');
const click=(w,selector)=>{const button=w.document.querySelector(selector);assert.ok(button,selector);button.click();};
const visible=(w,scope)=>[...w.document.querySelectorAll(`[data-${scope}-category-panel]`)].filter(p=>!p.hidden).map(p=>p.dataset[scope+'CategoryPanel']);
const resources=w=>read(w,'({money:s.money,hp:s.hp,items:s.items,baits:s.baits,dogTreats:s.dogTreats,ownedDogToys:s.ownedDogToys,lures:s.lures,caught:s.caught,cookingIngredients:s.cookingIngredients,preparedMeals:s.preparedMeals,rod:s.selectedRod})');

test('bag categories separate food, ingredients, dog toys and collections without changing resources',()=>{
 const app=boot({...seed(),items:{tomato:2,wildGreens:1,offeringDaikon:3},lures:{silverSpoon:1},dogTreats:{treeNut:2}}),w=app.window;
 try{
  w.openInventory('items');const before=resources(w);
  for(const category of ['bait','lures','food','ingredients','dogTreats','dogToys','tackle','collection','offerings']){
   click(w,`[data-inventory-category="${category}"]`);assert.deepEqual(visible(w,'inventory'),[category]);
   assert.equal(w.document.querySelectorAll('#inventoryCategories [aria-pressed="true"]').length,1);
   assert.deepEqual(resources(w),before);
  }
  assert.match(w.document.querySelector('#inventoryCategory-dogToys').textContent,/おもちゃはまだない/);
  assert.match(w.document.querySelector('#inventoryCategory-collection').textContent,/収集品はまだない/);
  assert.match(w.document.querySelector('#inventoryCategory-food').textContent,/朝採れトマト/);
  const foodNames=[...w.document.querySelectorAll('#inventoryCategory-food .inventory-card b')].map(b=>b.textContent);
  for(const name of ['奉納だいこん','山菜','ゴムボール'])assert.equal(foodNames.includes(name),false,name+' belongs in its own category');
  assert.match(w.document.querySelector('#inventoryCategory-ingredients').textContent,/山菜|魚の切り身/);
  w.close();w.openInventory('items');assert.deepEqual(visible(w,'inventory'),['offerings']);
  click(w,'[data-inventory-tab="equipment"]');assert.equal(w.document.querySelector('[data-inventory-panel="equipment"]').classList.contains('active'),true);
  click(w,'[data-inventory-tab="tackle"]');click(w,'#inventoryHookOptions [data-pick-hook="large"]');assert.equal(read(w,'s.selectedHook'),'large');
  assert.deepEqual(app.errors,[]);
 }finally{app.dispose();}
});

test('eating from the selected food category consumes exactly one item and survives save/reload',()=>{
 const app=boot({...seed(),items:{tomato:2},preparedMeals:{bigFishPlate:1}}),w=app.window;let saved;
 try{
  w.openInventory('items');click(w,'[data-inventory-category="food"]');const money=read(w,'s.money');
  click(w,'#inventoryCategory-food [data-use-item="tomato"]');assert.equal(read(w,'s.hp'),52);assert.equal(read(w,'s.items.tomato'),1);assert.equal(read(w,'s.money'),money);
  assert.deepEqual(visible(w,'inventory'),['food']);
  click(w,'#inventoryCategory-food [data-eat-prepared-meal="bigFishPlate"]');assert.equal(read(w,'s.preparedMeals.bigFishPlate'),0);assert.equal(read(w,'s.activeMeal.id'),'bigFishPlate');
  assert.match(w.document.querySelector('[data-inventory-category="food"]').getAttribute('aria-label'),/所持1種類/);
  saved=JSON.parse(w.localStorage.getItem(saveKey));assert.deepEqual(app.errors,[]);
 }finally{app.dispose();}
 const restored=boot(saved);
 try{assert.equal(read(restored.window,'s.hp'),52);assert.equal(read(restored.window,'s.items.tomato'),1);assert.equal(read(restored.window,'s.activeMeal.id'),'bigFishPlate');assert.deepEqual(restored.errors,[]);}finally{restored.dispose();}
});

test('shared ingredients use the original bait/treat stock and cooking updates both category views',()=>{
 const app=boot({...seed(),baits:{shell:2},dogTreats:{treeNut:1},cookingIngredients:{fishFillet:2}}),w=app.window;
 try{
  w.openInventory('items');click(w,'[data-inventory-category="ingredients"]');assert.match(w.document.querySelector('#inventoryCategory-ingredients').textContent,/餌欄と共用|犬のおやつ欄と共用/);
  w.close();w.openLocationInterior('player-home');assert.deepEqual(visible(w,'location'),['recipes']);
  click(w,'#locationGoods [data-cook-recipe="nutFishJerky"]');assert.equal(read(w,'s.dogTreats.treeNut'),0);assert.equal(read(w,'s.dogTreats.nutFishJerky'),1);
  click(w,'#locationGoods [data-cook-recipe="shellSoup"]');assert.equal(read(w,'s.baits.shell'),1);assert.equal(read(w,'s.cookingIngredients.fishFillet'),0);
  click(w,'[data-location-category="meals"]');assert.deepEqual(visible(w,'location'),['meals']);click(w,'#locationGoods [data-eat-prepared-meal="shellSoup"]');
  w.close();w.openInventory('items');assert.deepEqual(visible(w,'inventory'),['ingredients']);
  assert.match(w.document.querySelector('[data-inventory-category="ingredients"]').getAttribute('aria-label'),/所持1種類/);
  assert.equal(read(w,'s.preparedMeals.shellSoup'),1,'one original soup plus one cooked, then one eaten');assert.deepEqual(app.errors,[]);
 }finally{app.dispose();}
});

test('Sam shelves preserve bulk bait prices, reusable lures, unique toys and equipped gear',()=>{
 const app=boot({...seed(),money:100000}),w=app.window;
 try{
  w.eval('renderSamShop();open("store")');const before=resources(w);
  click(w,'[data-sam-category="rods"]');assert.equal(w.document.querySelector('#samCategory-bait').hidden,true);assert.deepEqual(resources(w),before);
  click(w,'[data-sam-category="bait"]');click(w,'[data-bait-count="5"]');click(w,'[data-buy-bait="worm"]');assert.equal(read(w,'s.baits.worm'),22);assert.equal(read(w,'s.money'),99400);
  click(w,'[data-sam-category="lures"]');click(w,'[data-buy-lure="silverSpoon"]');assert.equal(read(w,'s.lures.silverSpoon'),1);assert.equal(read(w,'s.money'),98800);
  click(w,'[data-sam-shop-tab="goods"]');click(w,'[data-sam-category="dogTreats"]');click(w,'[data-buy-dog-good="samBiscuit"]');assert.equal(read(w,'s.dogTreats.samBiscuit'),1);
  click(w,'[data-sam-category="dogToys"]');click(w,'[data-buy-dog-good="rubberBall"]');const toyMoney=read(w,'s.money');click(w,'[data-buy-dog-good="rubberBall"]');assert.equal(read(w,'s.money'),toyMoney);assert.deepEqual(read(w,'s.ownedDogToys'),['rubberBall']);
  click(w,'[data-sam-category="hands"]');click(w,'[data-buy-hand="gloves"]');assert.equal(read(w,'s.money'),96400);w.close();w.openInventory('equipment');click(w,'[data-equip-hand="gloves"]');assert.equal(read(w,'s.equipment.hands'),'gloves');
  const saved=JSON.parse(w.localStorage.getItem(saveKey));assert.equal(saved.money,96400);assert.deepEqual(saved.ownedDogToys,['rubberBall']);assert.deepEqual(app.errors,[]);
 }finally{app.dispose();}
});

test('vegetable-shop food and offerings keep the selected quantity and stock across category changes',()=>{
 const app=boot({...seed(),money:10000,items:{}}),w=app.window;
 try{
  w.openLocationInterior('yaoya');assert.deepEqual(visible(w,'location'),['food']);const before=resources(w);
  click(w,'[data-location-category="offerings"]');assert.deepEqual(resources(w),before);click(w,'[data-location-count="10"]');click(w,'[data-buy-location-item="offeringDaikon"]');
  assert.equal(read(w,'s.items.offeringDaikon'),10);assert.equal(read(w,'s.money'),9000);assert.deepEqual(visible(w,'location'),['offerings']);
  click(w,'[data-location-category="food"]');assert.match(w.document.querySelector('[data-buy-location-item="tomato"]').textContent,/×10/);click(w,'[data-buy-location-item="tomato"]');assert.equal(read(w,'s.items.tomato'),10);assert.equal(read(w,'s.money'),8200);
  const saved=JSON.parse(w.localStorage.getItem(saveKey));assert.equal(saved.items.offeringDaikon,10);assert.equal(saved.items.tomato,10);assert.deepEqual(app.errors,[]);
 }finally{app.dispose();}
});
