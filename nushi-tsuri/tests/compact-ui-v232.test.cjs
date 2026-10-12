const {test}=require('node:test'),assert=require('node:assert/strict'),{boot,seed,read,saveKey}=require('./game-harness.cjs');
const fixture=()=>({...seed(),money:596209,items:{tomato:2,wildGreens:3,offeringDaikon:12},cookingIngredients:{fishFillet:3},preparedMeals:{bigFishPlate:1},ownedRods:['bamboo','starGazer'],rodCopies:{starGazer:3},rodLevels:{starGazer:0}});
const click=(w,q)=>{const n=w.document.querySelector(q);assert.ok(n,q);assert.equal(n.disabled,false,q);n.click();return n;};
const snapshot=w=>read(w,'({money:s.money,time:s.gameMinutes,hp:s.hp,baits:s.baits,items:s.items,meals:s.preparedMeals,ingredients:s.cookingIngredients,toys:s.ownedDogToys,treats:s.dogTreats,rods:s.ownedRods,copies:s.rodCopies,levels:s.rodLevels,fish:s.petLife.fish,food:s.petLife.food,equipment:s.equipment,vehicles:s.ownedVehicles,caught:s.caught})');
test('bag pages and details do not consume or equip anything; Escape closes only the detail and returns focus',()=>{
 const a=boot(fixture()),w=a.window;try{w.openInventory('items');click(w,'[data-inventory-category="food"]');const before=snapshot(w);
  const next=w.document.querySelector('#inventoryCategory-food [data-compact-page="next"]');assert.equal(next.disabled,false);next.click();assert.deepEqual(snapshot(w),before);click(w,'#inventoryCategory-food [data-compact-page="previous"]');
  const item=w.document.querySelector('#inventory [data-use-item="tomato"]').closest('.compact-product');const opener=item.querySelector('[data-compact-info]');opener.click();
  assert.equal(w.document.querySelectorAll('.compact-sheet').length,1);assert.deepEqual(snapshot(w),before);
  w.document.querySelector('.compact-sheet').dispatchEvent(new w.KeyboardEvent('keydown',{key:'Escape',bubbles:true}));
  assert.equal(w.document.querySelector('.compact-sheet'),null);assert.equal(w.document.activeElement,opener);assert.ok(w.document.querySelector('#inventory.open'));assert.deepEqual(snapshot(w),before);assert.deepEqual(a.errors,[]);
 }finally{a.dispose();}
});
test('a detail action invokes the existing food operation once and the consumed item survives reload',()=>{
 const a=boot(fixture()),w=a.window;let saved;try{w.openInventory('items');click(w,'[data-inventory-category="food"]');
  w.document.querySelector('[data-use-item="tomato"]').closest('.compact-product').querySelector('[data-compact-info]').click();click(w,'.compact-detail-actions button');
  assert.equal(read(w,'s.items.tomato'),1);assert.equal(read(w,'s.hp'),52);assert.equal(read(w,'s.money'),596209);assert.equal(w.document.querySelector('.compact-sheet'),null);
  saved=JSON.parse(w.localStorage.getItem(saveKey));assert.deepEqual(a.errors,[]);
 }finally{a.dispose();}const b=boot(saved);try{assert.equal(read(b.window,'s.items.tomato'),1);assert.equal(read(b.window,'s.hp'),52);assert.deepEqual(b.errors,[]);}finally{b.dispose();}
});
test('Sam has one live category control per shelf and retains the same native bulk-purchase button',()=>{
 const a=boot(fixture()),w=a.window;try{w.eval('renderSamShop();open("store")');const before=snapshot(w),native=w.document.querySelector('[data-buy-bait="worm"]');
  assert.equal(w.document.querySelectorAll('#store [data-sam-category]').length,6);
  for(const id of ['rods','lures','hands','dogTreats','dogToys','bait']){click(w,'#store [data-sam-category="'+id+'"]');assert.equal(w.document.querySelectorAll('#store [data-compact-sam-tab][aria-pressed="true"]').length,1);assert.deepEqual(snapshot(w),before);}
  click(w,'[data-bait-count="10"]');assert.equal(w.document.querySelector('[data-buy-bait="worm"]'),native);assert.deepEqual(snapshot(w),before);
  click(w,'[data-buy-bait="worm"]');assert.equal(read(w,'s.money'),before.money-1200);assert.equal(read(w,'s.baits.worm'),before.baits.worm+30);assert.deepEqual(a.errors,[]);
 }finally{a.dispose();}
});
test('Sam guide keeps event and conversation buttons, remains read-only and returns every node on close',()=>{
 const a=boot(fixture()),w=a.window;try{w.eval('renderSamShop();open("store")');const before=snapshot(w),offer=w.document.querySelector('#tournamentOffer');
  click(w,'#store [data-compact-guide]');assert.ok(w.document.querySelector('.compact-sheet-body #tournamentOffer'));assert.equal(w.document.querySelector('#tournamentOffer'),offer);assert.deepEqual(snapshot(w),before);
  click(w,'[data-compact-sheet-close]');assert.equal(w.document.querySelector('.compact-sheet'),null);assert.equal(w.document.querySelector('#tournamentOffer'),offer);assert.deepEqual(snapshot(w),before);
  w.close();w.eval('renderSamShop();open("store")');assert.equal(w.document.querySelectorAll('#tournamentOffer').length,1);assert.equal(w.document.querySelectorAll('#store [data-sam-category]').length,6);assert.deepEqual(a.errors,[]);
 }finally{a.dispose();}
});
test('vegetable count changes preserve shared stock and purchase the exact count at the native price',()=>{
 const a=boot(fixture()),w=a.window;try{w.openLocationInterior('yaoya');const before=snapshot(w);click(w,'[data-location-count="10"]');click(w,'[data-location-category="offerings"]');click(w,'[data-location-category="food"]');assert.deepEqual(snapshot(w),before);
  click(w,'[data-buy-location-item="tomato"]');assert.equal(read(w,'s.items.tomato'),12);assert.equal(read(w,'s.money'),before.money-800);
  w.close();w.openLocationInterior('main-shrine');assert.equal(w.document.querySelector('#locationInterior').classList.contains('compact-window'),false);assert.ok(w.document.querySelector('[data-draw-fortune]'));assert.deepEqual(a.errors,[]);
 }finally{a.dispose();}
});
test('owned boat cards display equip and reuse the native free equip branch rather than charging twice',()=>{
 const a=boot(fixture()),w=a.window;try{w.openVehicleShop();click(w,'[data-buy-vehicle="tarai"]');const paid=read(w,'s.money');assert.equal(paid,595609);
  assert.equal(w.document.querySelector('[data-buy-vehicle="tarai"]').getAttribute('data-compact-action-label'),'装備中');click(w,'[data-buy-vehicle="tarai"]');assert.equal(read(w,'s.money'),paid);assert.equal(read(w,'s.equipment.vehicle'),'tarai');assert.deepEqual(a.errors,[]);
 }finally{a.dispose();}
});
test('tackle groups preserve duplicate-rod rules and cast settings while browsing remains free',()=>{
 const a=boot(fixture()),w=a.window;try{w.openInventory('tackle');const before=snapshot(w);assert.equal(w.document.querySelector('#inventory [data-pick-rod="starGazer"]').closest('.compact-product').querySelector('.compact-product-name').textContent,'星見の竿');for(const id of ['bait','hook','rod','method','fight','copies']){click(w,'[data-compact-group="'+id+'"]');assert.deepEqual(snapshot(w),before);}
  click(w,'#inventory [data-rod-duplicate="upgrade"]');assert.equal(read(w,'s.rodCopies.starGazer'),2);assert.equal(read(w,'s.rodLevels.starGazer'),1);assert.equal(read(w,'s.money'),before.money);
  click(w,'[data-compact-group="fight"]');click(w,'#inventory [data-fight-mode="nushi"]');assert.equal(read(w,'s.fightMode'),'nushi');assert.deepEqual(a.errors,[]);
 }finally{a.dispose();}
});
