const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {boot,seed,read,saveKey}=require('./game-harness.cjs');
const click=(w,q)=>{const n=w.document.querySelector(q);assert.ok(n,q);assert.equal(n.disabled,false,q);n.click();return n;};
function owned(){const a=boot({...seed(),money:100000,soundEnabled:false,caught:{funa:1,isaki:1,nushi:1},gameMinutes:188*1440+360,petNotebook:{version:1,receivedDay:1,source:'existing',announced:true,species:[]}});a.window.eval('petUi.open("shop")');return a;}
function notice(w,pattern){const n=w.document.querySelector('.pet-message');assert.equal(n.parentElement,w.document.querySelector('.pet-shop-host > div'));assert.equal(n.hidden,false);assert.equal(w.getComputedStyle(n).display,'block');assert.equal(n.getAttribute('role'),'status');assert.match(n.textContent,pattern);assert.equal(w.document.querySelectorAll('.pet-message').length,1);return n;}
test('food and tank notices use the host text area without changing their one-time payments',()=>{
 const a=owned(),w=a.window;try{
  assert.equal(w.document.querySelector('.pet-message').parentElement,w.document.querySelector('.pet-fish-sales'));
  w.eval('s.petLife.unlockedTanks=1;petUi.render()');click(w,'[data-pet-tab="supplies"]');const before=read(w,'({money:s.money,food:s.petLife.food,tanks:s.petLife.unlockedTanks})');
  click(w,'[data-pet-action="food-1"]');notice(w,/10食買った/);assert.equal(read(w,'s.money'),before.money-100);assert.equal(read(w,'s.petLife.food'),before.food+10);assert.ok(w.document.querySelector('.compact-selected .compact-product-actions [data-pet-action="food-1"]'));
  click(w,'[data-pet-action="tank"]');notice(w,/水槽2/);assert.equal(read(w,'s.petLife.unlockedTanks'),before.tanks+1);assert.equal(read(w,'s.money'),before.money-100-400);assert.deepEqual(a.errors,[]);
 }finally{a.dispose();}
});
test('legend and buyback notices remain in the host, while original sales and save behavior stay intact',()=>{
 const a=owned(),w=a.window;try{
  click(w,'[data-pet-tab="legends"]');const money=read(w,'s.money');click(w,'[data-pet-nushi="nushi"]');notice(w,/飼育水槽へ迎えた/);assert.equal(read(w,'s.money'),money);
  w.eval('ShuPetLife.acquire(s,"funa",petCatalog,188,0);const f=s.petLife.fish.find(f=>f.species==="funa");f.length=2000;f.careDays=4;f.health=90;petUi.render()');
  click(w,'[data-pet-tab="buyback"]');click(w,'[data-pet-buyback-tank="0"]');const uid=read(w,'s.petLife.fish.find(f=>f.species==="funa").uid');click(w,`[data-pet-buyback="${uid}"]`);const before=read(w,'s.money');click(w,'[data-pet-action="buyback-confirm"]');notice(w,/アスアルが.*買い取った/);assert.ok(read(w,'s.money')>before);assert.equal(read(w,`s.petLife.fish.some(f=>f.uid==="${uid}")`),false);assert.deepEqual(a.errors,[]);
 }finally{a.dispose();}
});
test('tab changes, boarding, aquarium, close and reopen do not leave misplaced or duplicate notices',()=>{
 const a=owned(),w=a.window;try{
  click(w,'[data-pet-tab="supplies"]');click(w,'[data-pet-action="food-1"]');notice(w,/10食買った/);const saved=w.localStorage.getItem(saveKey);
  for(let i=0;i<2;i++){
   click(w,'[data-pet-tab="boarding"]');assert.equal(w.document.querySelector('.pet-message').parentElement,w.document.querySelector('.pet-shell'));assert.equal(w.document.querySelector('.pet-message').hidden,true);assert.equal(w.document.querySelector('#petLifeModal').classList.contains('compact-pet-shop'),false);
   const section=w.document.querySelector('#petShopSection');section.value='supplies';section.dispatchEvent(new w.Event('change',{bubbles:true}));assert.equal(w.document.querySelector('.pet-message').hidden,true);assert.equal(w.document.querySelectorAll('.pet-shop-host > div > .pet-message').length,1);
   click(w,'[data-pet-tab="fish"]');assert.equal(w.document.querySelector('.pet-message').parentElement,w.document.querySelector('.pet-fish-sales'));
  }
  click(w,'[data-pet-action="aquarium"]');assert.equal(w.document.querySelectorAll('.pet-shop-host').length,0);assert.equal(w.document.querySelector('.pet-message').parentElement,w.document.querySelector('.pet-shell'));
  click(w,'[data-pet-action="close"]');w.eval('petUi.open("shop")');assert.equal(w.document.querySelectorAll('.pet-message').length,1);assert.equal(w.document.querySelector('.pet-message').parentElement,w.document.querySelector('.pet-fish-sales'));assert.equal(w.localStorage.getItem(saveKey),saved);assert.deepEqual(a.errors,[]);
 }finally{a.dispose();}
});
test('host notice CSS participates in layout rather than covering the product catalogue',()=>{
 const css=fs.readFileSync(path.join(__dirname,'../compact-ui.css'),'utf8');
 const rule=css.match(/#petLifeModal\.compact-pet-shop \.pet-shop-host>div>\.pet-message\{([^}]+)\}/)?.[1];assert.ok(rule);for(const setting of ['display:block','position:static','z-index:auto','min-height:0','max-height:41px','overflow:auto','pointer-events:auto'])assert.ok(rule.includes(setting),setting);
 assert.match(css,/\.pet-shop-host>div:has\(>\.pet-message:not\(\[hidden\]\)\)>b,/);assert.match(css,/\.pet-shop-host>div:has\(>\.pet-message:not\(\[hidden\]\)\)>small\{display:none\}/);
});
