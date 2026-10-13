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
  click(w,'[data-compact-group="fight"]');click(w,'#inventory [data-fight-mode="nushi"]');assert.equal(read(w,'s.fightMode'),'nushi');assert.equal(w.document.querySelector('#inventory [data-fight-mode="nushi"]').getAttribute('data-compact-action-label'),'選択中');assert.deepEqual(a.errors,[]);
 }finally{a.dispose();}
});
test('cursor selection and keyboard navigation reveal the native action without buying or changing a save',()=>{
 const a=boot(fixture()),w=a.window;try{w.eval('renderSamShop();open("store")');const before=snapshot(w),saved=w.localStorage.getItem(saveKey),native=w.document.querySelector('[data-buy-bait="river"]'),row=native.closest('.compact-product').querySelector('[data-compact-select]');
  row.click();assert.equal(row.getAttribute('aria-selected'),'true');assert.equal(native.closest('.compact-selection-panel').hidden,false);assert.deepEqual(snapshot(w),before);assert.equal(w.localStorage.getItem(saveKey),saved);
  row.dispatchEvent(new w.KeyboardEvent('keydown',{key:'ArrowDown',bubbles:true}));const selected=w.document.querySelector('#samCategory-bait [aria-selected="true"]');assert.match(selected.getAttribute('aria-label'),/練りエサ/);assert.equal(w.document.activeElement,selected);assert.deepEqual(snapshot(w),before);assert.equal(w.localStorage.getItem(saveKey),saved);
  row.click();assert.equal(w.document.querySelector('[data-buy-bait="river"]'),native);native.click();assert.equal(read(w,'s.baits.river'),before.baits.river+2);assert.equal(read(w,'s.money'),before.money-180);assert.deepEqual(a.errors,[]);
 }finally{a.dispose();}
});
test('a one-item shelf has no pager and keeps its action and explanation in the selected pane',()=>{
 const a=boot(fixture()),w=a.window;try{w.eval('renderSamShop();open("store")');click(w,'[data-sam-category="lures"]');const shelf=w.document.querySelector('#samCategory-lures'),before=snapshot(w);assert.equal(shelf.querySelector('.compact-pager').hidden,true);assert.equal(shelf.querySelectorAll('[data-compact-select]').length,1);assert.equal(shelf.querySelector('.compact-selection-panel').hidden,false);assert.match(shelf.querySelector('.compact-selection-name').textContent,/銀のスプーン/);assert.match(shelf.querySelector('.compact-selection-description').textContent,/繰り返し使用/);assert.deepEqual(snapshot(w),before);assert.deepEqual(a.errors,[]);
 }finally{a.dispose();}
});
test('Sam describes each choice without buying, keeps the quantity controls, and retains the purchase receipt',()=>{
 const a=boot(fixture()),w=a.window;try{w.eval('renderSamShop();open("store")');const before=snapshot(w),saved=w.localStorage.getItem(saveKey),picker=w.document.querySelector('.bait-quantity-picker');
  for(const [id,role] of Object.entries({worm:'万能',river:'渓流魚',paste:'雑食魚',corn:'コイ科',shrimp:'回遊魚',liveMinnow:'肉食魚'})){const native=w.document.querySelector('[data-buy-bait="'+id+'"]');native.closest('.compact-product').querySelector('[data-compact-select]').click();assert.match(w.document.querySelector('#shopDialogue').dataset.dialogueText,new RegExp(role));assert.equal(native.closest('.compact-selection-panel').querySelector('.bait-quantity-picker'),picker);assert.deepEqual(snapshot(w),before);assert.equal(w.localStorage.getItem(saveKey),saved);}
  click(w,'[data-bait-count="10"]');assert.equal(w.document.querySelector('.bait-quantity-picker'),picker);assert.equal(w.document.querySelector('#samBaitPurchaseCount').textContent,'10セット');assert.match(w.document.querySelector('[data-buy-bait="liveMinnow"]').getAttribute('aria-label'),/合計20個.*4800円/);assert.equal(w.document.querySelector('[data-buy-bait="liveMinnow"]').closest('.compact-product').querySelector('[data-compact-select]').getAttribute('aria-selected'),'true');assert.deepEqual(snapshot(w),before);
  click(w,'[data-buy-bait="liveMinnow"]');assert.equal(read(w,'s.money'),before.money-4800);assert.equal(read(w,'s.baits.liveMinnow'),before.baits.liveMinnow+20);const receipt=w.document.querySelector('#shopDialogue').dataset.dialogueText;assert.match(receipt,/活き小魚を10セット、20個/);w.ShuCompactUI.refresh(read(w,'s.money'));assert.equal(w.document.querySelector('#shopDialogue').dataset.dialogueText,receipt);assert.equal(w.document.querySelectorAll('.bait-quantity-picker').length,1);click(w,'[data-sam-category="rods"]');const rod=w.document.querySelector('[data-buy-rod="youngBamboo"]');rod.closest('.compact-product').querySelector('[data-compact-select]').click();rod.focus();rod.click();const purchased=w.document.querySelector('[data-buy-rod="youngBamboo"]');assert.equal(purchased.disabled,true);assert.equal(w.document.activeElement,purchased.closest('.compact-product').querySelector('[data-compact-select]'));assert.deepEqual(a.errors,[]);
 }finally{a.dispose();}
});
test('Sam welcomes, gives short factual advice, and opens the selected product catalogue without changing the save',()=>{
 const a=boot(fixture()),w=a.window;try{w.eval('renderSamShop();open("store")');const before=snapshot(w),saved=w.localStorage.getItem(saveKey);assert.match(w.document.querySelector('#shopDialogue').dataset.dialogueText,/いらっしゃい/);assert.equal(w.document.querySelectorAll('.sam-category-icon').length,6);
  const native=w.document.querySelector('[data-buy-bait="worm"]');native.closest('.compact-product').querySelector('[data-compact-select]').click();assert.match(w.document.querySelector('#shopDialogue').dataset.dialogueText,/万能.*迷ったら/);click(w,'[data-sam-more]');assert.match(w.document.querySelector('.compact-sheet-body').textContent,/万能.*1セット → 3個/s);assert.deepEqual(snapshot(w),before);assert.equal(w.localStorage.getItem(saveKey),saved);click(w,'[data-compact-sheet-close]');assert.equal(w.document.activeElement,w.document.querySelector('[data-sam-more]'));
  click(w,'[data-sam-category="dogToys"]');click(w,'[data-sam-more]');assert.match(w.document.querySelector('.compact-sheet-heading').textContent,/ゴムボール/);assert.deepEqual(snapshot(w),before);click(w,'[data-compact-sheet-close]');assert.deepEqual(a.errors,[]);
 }finally{a.dispose();}
});
test('Sam one, five and ten sets use native prices and counts, and an unaffordable purchase leaves resources and gameplay data intact',()=>{
 const a=boot(fixture()),w=a.window;try{w.eval('renderSamShop();open("store")');const native=w.document.querySelector('[data-buy-bait="worm"]');
  for(const count of [1,5,10]){const before=snapshot(w);click(w,'[data-bait-count="'+count+'"]');assert.deepEqual(snapshot(w),before);assert.equal(w.document.querySelector('[data-buy-bait="worm"]'),native);assert.match(native.getAttribute('data-compact-action-label'),new RegExp(String(120*count).replace(/\B(?=(\d{3})+(?!\d))/g,',')));native.click();assert.equal(read(w,'s.money'),before.money-120*count);assert.equal(read(w,'s.baits.worm'),before.baits.worm+3*count);assert.match(w.document.querySelector('#shopDialogue').dataset.dialogueText,new RegExp('ミミズを'+count+'セット、'+3*count+'個'));}
  w.eval('s.money=0;renderSamShop();save()');const before=snapshot(w),saved=JSON.parse(w.localStorage.getItem(saveKey));w.document.querySelector('[data-buy-bait="worm"]').click();assert.deepEqual(snapshot(w),before);const after=JSON.parse(w.localStorage.getItem(saveKey));delete saved.log;delete after.log;assert.deepEqual(after,saved);assert.match(w.document.querySelector('#shopDialogue').dataset.dialogueText,/足りん/);assert.deepEqual(a.errors,[]);
 }finally{a.dispose();}
});
