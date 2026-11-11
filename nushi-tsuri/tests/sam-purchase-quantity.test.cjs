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
   assert.equal(r.querySelector('.compact-product-name').textContent,`${name}（1セット${size}個）`);
   assert.match(r.querySelector('.compact-product-stock').textContent,new RegExp(`${size*count}個 · 合計${(price*count).toLocaleString('ja-JP')}円`));
   assert.equal(r.querySelector('[data-buy-bait]').dataset.compactActionLabel,`${size*count}個を購入\n合計${(price*count).toLocaleString('ja-JP')}円`);
   assert.equal(w.document.querySelector('#samBaitPurchaseCount').textContent,`${count}セット`);
  }
  assert.equal(read(w,'s.money'),100000);assert.equal(read(w,'s.baits.corn'),92);
  assert.equal(w.document.querySelector('[data-bait-count="5"]').textContent,'5セット');
  assert.equal(w.document.querySelector('[data-bait-count="5"]').getAttribute('aria-label'),'購入数を5セットにする');
  assert.deepEqual(a.errors,[]);
 }finally{a.dispose();}
});
test('Sam 20-pack corn purchase charges 5200 once, adds 60, and survives reopening and reload',()=>{
 const a=boot({...seed(),money:10000,baits:{corn:92}}),w=a.window;let saved;
 try{
  w.eval('renderSamShop();open("store")');w.setSamBaitPurchaseCount(20);row(w,'corn').querySelector('[data-compact-select]').click();
  click(w,'[data-sam-more]');assert.match(w.document.querySelector('.compact-detail-actions button').textContent,/60個を購入\s*合計5,200円/);
  click(w,'[data-compact-sheet-close]');assert.equal(read(w,'s.money'),10000);
  click(w,'[data-buy-bait="corn"]');assert.equal(read(w,'s.money'),4800);assert.equal(read(w,'s.baits.corn'),152);
  saved=JSON.parse(w.localStorage.getItem(saveKey));
  w.close();w.eval('renderSamShop();open("store")');assert.equal(w.document.querySelectorAll('.bait-quantity-picker').length,1);
  click(w,'[data-sam-category="rods"]');click(w,'[data-sam-category="bait"]');
  click(w,'[data-bait-count="5"]');assert.equal(w.document.querySelector('#samBaitPurchaseCount').textContent,'5セット');
  assert.match(row(w,'corn').querySelector('.compact-product-stock').textContent,/15個 · 合計1,300円/);assert.deepEqual(a.errors,[]);
 }finally{a.dispose();}
 const b=boot(saved);try{assert.equal(read(b.window,'s.money'),4800);assert.equal(read(b.window,'s.baits.corn'),152);assert.deepEqual(b.errors,[]);}finally{b.dispose();}
});
test('insufficient funds do not change stock or balance for a visibly priced bulk purchase',()=>{
 const a=boot({...seed(),money:100,baits:{corn:92}}),w=a.window;
 try{w.eval('renderSamShop();open("store")');w.setSamBaitPurchaseCount(20);row(w,'corn').querySelector('[data-compact-select]').click();click(w,'[data-buy-bait="corn"]');assert.equal(read(w,'s.money'),100);assert.equal(read(w,'s.baits.corn'),92);assert.match(row(w,'corn').querySelector('.compact-product-stock').textContent,/60個 · 合計5,200円/);assert.deepEqual(a.errors,[]);}finally{a.dispose();}
});
