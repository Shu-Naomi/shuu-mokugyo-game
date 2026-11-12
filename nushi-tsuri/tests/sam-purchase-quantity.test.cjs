const {test}=require('node:test'),assert=require('node:assert/strict');
const {boot,seed,read,saveKey}=require('./game-harness.cjs');
const click=(w,q)=>{const b=w.document.querySelector(q);assert.ok(b,q);b.click();};
const row=(w,id)=>w.document.querySelector(`[data-buy-bait="${id}"]`).closest('.compact-product');
for(const count of [1,5,10,20,100])test(`Sam labels packs, actual units and total consistently for ${count} packs`,()=>{
 const a=boot({...seed(),money:100000,baits:{corn:92,river:7}}),w=a.window;
 try{
  w.eval('renderSamShop();open("store")');w.setSamBaitPurchaseCount(count);
  for(const [id,name,size,price]of [['corn','トウモロコシ',3,260],['river','川虫',2,180]]){
   const r=row(w,id);r.querySelector('[data-compact-select]').click();
   assert.equal(r.querySelector('.compact-product-name').textContent,name);
   assert.match(r.querySelector('.compact-product-stock').textContent,new RegExp(`1セット${size}個 · ${price}円`));
   assert.equal(r.querySelector('[data-buy-bait]').dataset.compactActionLabel,`${name} ${size*count}個を購入\n${count}セット · 合計${(price*count).toLocaleString('ja-JP')}円`);
   assert.equal(w.document.querySelector('#samBaitPurchaseCount').textContent,`${String(count).padStart(3,"0")}セット`);
  }
  assert.equal(read(w,'s.money'),100000);assert.equal(read(w,'s.baits.corn'),92);
  assert.equal(w.document.querySelectorAll('[data-bait-count-step]').length,6);
  assert.deepEqual(a.errors,[]);
 }finally{a.dispose();}
});
test('Sam 20-pack corn purchase charges 5200 once, adds 60, and survives reopening and reload',()=>{
 const a=boot({...seed(),money:10000,baits:{corn:92}}),w=a.window;let saved;
 try{
  w.eval('renderSamShop();open("store")');w.setSamBaitPurchaseCount(20);row(w,'corn').querySelector('[data-compact-select]').click();
  click(w,'[data-sam-more]');assert.match(w.document.querySelector('.compact-detail-actions button').textContent,/60個を購入\s*20セット · 合計5,200円/);
  click(w,'[data-compact-sheet-close]');assert.equal(read(w,'s.money'),10000);
  click(w,'[data-buy-bait="corn"]');assert.equal(read(w,'s.money'),4800);assert.equal(read(w,'s.baits.corn'),152);
  saved=JSON.parse(w.localStorage.getItem(saveKey));
  w.close();w.eval('renderSamShop();open("store")');assert.equal(w.document.querySelectorAll('.bait-quantity-picker').length,1);
  click(w,'[data-sam-category="rods"]');click(w,'[data-sam-category="bait"]');
  w.setSamBaitPurchaseCount(5);assert.equal(w.document.querySelector('#samBaitPurchaseCount').textContent,'005セット');
  assert.match(row(w,'corn').querySelector('.compact-product-stock').textContent,/1セット3個 · 260円/);assert.deepEqual(a.errors,[]);
 }finally{a.dispose();}
 const b=boot(saved);try{assert.equal(read(b.window,'s.money'),4800);assert.equal(read(b.window,'s.baits.corn'),152);assert.deepEqual(b.errors,[]);}finally{b.dispose();}
});
test('insufficient funds do not change stock or balance for a visibly priced bulk purchase',()=>{
 const a=boot({...seed(),money:100,baits:{corn:92}}),w=a.window;
 try{w.eval('renderSamShop();open("store")');w.setSamBaitPurchaseCount(20);row(w,'corn').querySelector('[data-compact-select]').click();click(w,'[data-buy-bait="corn"]');assert.equal(read(w,'s.money'),100);assert.equal(read(w,'s.baits.corn'),92);assert.match(row(w,'corn').querySelector('.compact-product-stock').textContent,/1セット3個 · 260円/);assert.deepEqual(a.errors,[]);}finally{a.dispose();}
});

test('digit arrows are exact +/-1,10,100 with bounds, persistent selection and stable catalog',()=>{
 const a=boot({...seed(),money:100000}),w=a.window;
 try{
  w.eval('renderSamShop();open("store")');w.setSamBaitPurchaseCount(9);
  const fixed=row(w,'worm').querySelector('.compact-product-stock').textContent;
  for(const [step,count] of [[1,10],[1,11],[10,21],[-10,11],[-1,10],[100,100],[-1,99],[-100,1]]){
   click(w,`[data-bait-count-step="${step}"]`);
   assert.equal(w.document.querySelector('#samBaitPurchaseCount').textContent,`${String(count).padStart(3,'0')}セット`);
   assert.equal([...w.document.querySelectorAll('[data-bait-digit]')].map(n=>n.textContent).join(''),String(count).padStart(3,'0'));
   assert.equal(row(w,'worm').querySelector('.compact-product-stock').textContent,fixed);
  }
  assert.equal(w.document.querySelector('[data-bait-count-step="-1"]').disabled,true);
  w.setSamBaitPurchaseCount(100);assert.equal(w.document.querySelector('[data-bait-count-step="1"]').disabled,true);
  row(w,'worm').querySelector('[data-compact-select]').click();click(w,'[data-buy-bait="worm"]');
  assert.equal(read(w,'s.money'),88000);assert.equal(read(w,'s.baits.worm'),307);
  assert.deepEqual(a.errors,[]);
 }finally{a.dispose();}
});

const openConfirm=(w,id)=>row(w,id).querySelector('[data-sam-confirm-open]').click();
test('purchase tab separates choosing, quantity, cancellation and one-time payment',()=>{
 const a=boot({...seed(),money:20000,baits:{corn:92}}),w=a.window;
 try{
  w.eval('renderSamShop();open("store")');const before=read(w,'({money:s.money,baits:s.baits})');
  row(w,'corn').querySelector('[data-compact-select]').click();assert.equal(w.ShuCompactUI.hasSheet(),false);
  assert.equal(w.document.querySelector('.compact-quantity-parking').hidden,true);openConfirm(w,'corn');
  assert.match(w.document.querySelector('.sam-purchase-name').textContent,/トウモロコシ/);
  assert.ok(w.document.querySelector('.sam-purchase-layer .bait-quantity-picker'));
  click(w,'[data-bait-count-step="10"]');assert.equal(w.document.querySelector('#samBaitPurchaseCount').textContent,'011セット');
  assert.match(w.document.querySelector('.sam-purchase-units').textContent,/33個（11セット）/);
  assert.match(w.document.querySelector('.sam-purchase-total').textContent,/2,860円/);
  assert.deepEqual(read(w,'({money:s.money,baits:s.baits})'),before);
  click(w,'[data-sam-confirm-cancel]');assert.equal(w.ShuCompactUI.hasSheet(),false);
  assert.equal(w.document.querySelector('.compact-quantity-parking').hidden,true);
  assert.equal(w.document.activeElement,row(w,'corn').querySelector('[data-sam-confirm-open]'));
  openConfirm(w,'corn');const action=w.document.querySelector('[data-sam-confirm-buy]');action.click();action.click();
  assert.equal(read(w,'s.money'),17140);assert.equal(read(w,'s.baits.corn'),125);
  assert.equal(w.ShuCompactUI.hasSheet(),false);assert.equal(w.document.querySelectorAll('.bait-quantity-picker').length,1);
  assert.deepEqual(a.errors,[]);
 }finally{a.dispose();}
});
test('unaffordable, Escape, detail action and category transitions cannot buy accidentally',()=>{
 const a=boot({...seed(),money:100,baits:{corn:92}}),w=a.window;
 try{
  w.eval('renderSamShop();open("store")');openConfirm(w,'corn');
  assert.equal(w.document.querySelector('[data-sam-confirm-buy]').disabled,true);assert.match(w.document.querySelector('.sam-purchase-shortfall').textContent,/160円/);
  w.document.querySelector('.compact-sheet').dispatchEvent(new w.KeyboardEvent('keydown',{key:'Escape',bubbles:true}));assert.equal(w.ShuCompactUI.hasSheet(),false);
  row(w,'corn').querySelector('[data-compact-select]').click();click(w,'[data-sam-more]');click(w,'.compact-detail-actions button');
  assert.ok(w.document.querySelector('.sam-purchase-layer'));assert.equal(read(w,'s.money'),100);assert.equal(read(w,'s.baits.corn'),92);
  w.close();w.eval('renderSamShop();open("store")');assert.equal(w.ShuCompactUI.hasSheet(),false);assert.equal(w.document.querySelectorAll('.bait-quantity-picker').length,1);
  assert.deepEqual(a.errors,[]);
 }finally{a.dispose();}
});
