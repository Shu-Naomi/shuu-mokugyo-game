const {test}=require('node:test');
const assert=require('node:assert/strict');
const P=require('../pet-life.js');
const {boot,seed,read,saveKey}=require('./game-harness.cjs');
const catalog=[{id:'moroko',name:'モロコ',start:750,min:100,max:1799,price:300,waterLabel:'淡水'},
  {id:'aji',name:'アジ',start:1000,min:500,max:4999,price:550,waterLabel:'海水'},
  {id:'nushi',name:'ヌシ',start:12000,min:10000,max:29999,price:0,waterLabel:'淡水'}];
const ids=['shuu','riku','grey'];
const copy=value=>JSON.parse(JSON.stringify(value));
function state({legacy=false,caught={moroko:1},money=10000}={}){
  const s={money,caught,dogAffinity:{shuu:0}};P.normalize(s,catalog,ids,0,{legacy});return s;
}
const click=(w,selector)=>{const el=w.document.querySelector(selector);assert.ok(el,selector);assert.equal(el.disabled,false,selector);el.click();return el;};

test('old saves keep six occupied tanks, while a new game buys five more without losing money on invalid purchases',()=>{
  const old=state({legacy:true});P.acquire(old,'moroko',catalog,0,5);
  const before=copy(old);old.petLife.version=2;delete old.petLife.unlockedTanks;
  P.normalize(old,catalog,ids,0,{legacy:true});assert.equal(old.petLife.unlockedTanks,6);
  assert.deepEqual(old.petLife.fish,before.petLife.fish);assert.equal(old.money,before.money);
  const fresh=state({money:399});assert.equal(fresh.petLife.unlockedTanks,1);
  assert.equal(P.selectTank(fresh,1),false);assert.equal(P.canHouse(fresh,'moroko',catalog,1),false);
  const blocked=copy(fresh);assert.equal(P.buyTank(fresh).ok,false);assert.deepEqual(fresh,blocked);
  fresh.money=500;assert.equal(P.buyTank(fresh).price,400);assert.equal(fresh.petLife.unlockedTanks,2);
  P.normalize(fresh,catalog,ids,0,{legacy:true});assert.equal(fresh.petLife.unlockedTanks,2);
  fresh.money=20000;for(let i=2;i<6;i++)assert.equal(P.buyTank(fresh).ok,true);
  assert.equal(fresh.petLife.unlockedTanks,6);
  const completed=copy(fresh);assert.equal(P.buyTank(fresh).ok,false);assert.deepEqual(fresh,completed);
});

test('live sales require a self-caught fish; purchases and descendants never alter catch records',()=>{
  const s=state({caught:{}}),before=copy(s);
  assert.match(P.acquire(s,'moroko',catalog,0,0).message,/図鑑/);assert.deepEqual(s,before);
  s.caught.moroko=1;assert.equal(P.acquire(s,'moroko',catalog,0,0).ok,true);
  assert.deepEqual(s.caught,{moroko:1});
});

test('three consecutive healthy fed days produce one opposite-sex fry and reload cannot duplicate it',()=>{
  const s=state();const male=P.acquire(s,'moroko',catalog,0,0).fish;
  const female=P.acquire(s,'moroko',catalog,0,0).fish;
  assert.equal(male.sex,'male');assert.equal(female.sex,'female');
  for(let day=0;day<3;day++){
    assert.equal(P.care(s,male.uid,'feed',day,catalog).ok,true);
    P.sync(s,catalog,day+1);
    assert.equal(s.petLife.fish.length,day===2?3:2);
  }
  const child=s.petLife.fish[2];assert.equal(child.generation,1);assert.equal(child.sex,'male');
  assert.equal(child.length,600);assert.deepEqual(s.caught,{moroko:1});
  assert.deepEqual(s.petLife.lastBirth,{uid:child.uid,species:'moroko',tank:0,day:3});
  assert.equal(P.sync(s,catalog,3),false);
  const saved=copy(s);P.normalize(s,catalog,ids,3);assert.deepEqual(s,saved);
  assert.equal(P.sync(s,catalog,3),false);assert.equal(s.petLife.fish.length,3);
  assert.ok(P.starInterval(1)<P.starInterval(0));
  const first={...male,stars:1,length:male.bornSize,health:100,water:100};
  assert.equal(P.fishScore({...first,stars:2}).score-P.fishScore(first).score,2);
});

test('separated or same-sex fish, dirty water, skipped care and full tanks cannot create free fry',()=>{
  const separated=state({legacy:true});const male=P.acquire(separated,'moroko',catalog,0,0).fish;
  P.acquire(separated,'moroko',catalog,0,1);
  for(let day=0;day<5;day++){P.care(separated,male.uid,'feed',day,catalog);P.care(separated,separated.petLife.fish[1].uid,'feed',day,catalog);P.sync(separated,catalog,day+1);}
  assert.equal(separated.petLife.fish.length,2);
  const same=state();for(let i=0;i<2;i++)P.acquire(same,'moroko',catalog,0,0).fish.sex='male';
  for(let day=0;day<3;day++){P.care(same,same.petLife.fish[0].uid,'feed',day,catalog);P.sync(same,catalog,day+1);}
  assert.equal(same.petLife.fish.length,2);
  const dirty=state();for(let i=0;i<2;i++)P.acquire(dirty,'moroko',catalog,0,0);
  dirty.petLife.fish.forEach(f=>f.water=50);
  for(let day=0;day<3;day++){P.care(dirty,dirty.petLife.fish[0].uid,'feed',day,catalog);P.sync(dirty,catalog,day+1);}
  assert.equal(dirty.petLife.fish.length,2);
  const gap=state();for(let i=0;i<2;i++)P.acquire(gap,'moroko',catalog,0,0);
  P.care(gap,gap.petLife.fish[0].uid,'feed',0,catalog);P.sync(gap,catalog,1);
  P.sync(gap,catalog,2);P.care(gap,gap.petLife.fish[0].uid,'feed',2,catalog);P.sync(gap,catalog,3);
  assert.equal(gap.petLife.fish.length,2);
  const full=state();for(let i=0;i<5;i++)P.acquire(full,'moroko',catalog,0,0);
  full.petLife.food=50;
  for(let day=0;day<3;day++){P.care(full,full.petLife.fish[0].uid,'feed',day,catalog);P.sync(full,catalog,day+1);}
  assert.equal(full.petLife.fish.length,5);assert.deepEqual(full.caught,{moroko:1});
});

test('raised descendants earn stars faster, mature for sale and pay only once through save and reload',()=>{
  const s=state(),first=P.acquire(s,'moroko',catalog,0,0).fish;
  P.acquire(s,'moroko',catalog,0,0);s.petLife.food=100;
  for(let day=0;day<3;day++){P.care(s,first.uid,'feed',day,catalog);P.sync(s,catalog,day+1);}
  const child=s.petLife.fish[2];P.rehome(s,first.uid,catalog,3);P.rehome(s,s.petLife.fish.find(f=>f.generation===0).uid,catalog,3);
  assert.equal(P.buyBackQuote(child,catalog).eligible,false);
  for(let day=3;day<8;day++){
    if(child.water<72)P.care(s,child.uid,'water',day,catalog);
    P.care(s,child.uid,'feed',day,catalog);P.sync(s,catalog,day+1);
  }
  assert.equal(child.length,1100);assert.equal(child.stars,2);
  assert.equal(P.buyBackQuote(child,catalog).eligible,true);
  const price=P.buyBackQuote(child,catalog).price,money=s.money;
  assert.equal(P.buyBack(s,child.uid,catalog,8).price,price);assert.equal(s.money,money+price);
  const paid=copy(s);assert.equal(P.buyBack(s,child.uid,catalog,8).ok,false);assert.deepEqual(s,paid);
  P.normalize(s,catalog,ids,8);assert.equal(P.buyBack(s,child.uid,catalog,8).ok,false);
  assert.equal(s.money,money+price);assert.deepEqual(s.caught,{moroko:1});
});

test('real shop hides unseen species, buys a tank, shows sex and confirms a single buyback across reload',()=>{
  const app=boot(null),w=app.window;let saved;
  try{
    assert.equal(read(w,'s.petLife.unlockedTanks'),1);
    w.eval('s.money=3000;save()');assert.equal(w.eval('petUi.open("shop")'),true);
    assert.equal(w.document.querySelector('[data-pet-buy="moroko"]'),null);
    w.eval('s.caught.moroko=1;save();petUi.render()');
    click(w,'[data-pet-buy="moroko"]');click(w,'[data-pet-action="aquarium"]');
    assert.match(w.document.querySelector('.pet-stats').textContent,/性別.*世代・星/s);
    click(w,'[data-pet-action="close"]');w.eval('petUi.open("shop")');click(w,'[data-pet-tab="supplies"]');
    click(w,'[data-pet-action="tank"]');assert.equal(read(w,'s.petLife.unlockedTanks'),2);
    click(w,'[data-pet-action="aquarium"]');assert.equal(w.document.querySelectorAll('#petTankSelect option').length,2);
    click(w,'[data-pet-action="close"]');w.eval('petUi.open("shop")');
    w.eval('s.petLife.fish[0].careDays=3;s.petLife.fish[0].health=85;save()');click(w,'[data-pet-tab="buyback"]');
    click(w,'[data-pet-buyback="pet-1"]');const money=read(w,'s.money');
    const confirm=click(w,'[data-pet-action="buyback-confirm"]');confirm.click();
    assert.equal(read(w,'s.petLife.fish.length'),0);assert.ok(read(w,'s.money')>money);
    saved=JSON.parse(w.localStorage.getItem(saveKey));assert.deepEqual(app.errors,[]);
  }finally{app.dispose();}
  const reload=boot(saved);
  try{
    assert.equal(read(reload.window,'s.petLife.unlockedTanks'),2);
    assert.equal(read(reload.window,'s.petLife.fish.length'),0);
    assert.equal(read(reload.window,'s.money'),saved.money);
    assert.deepEqual(reload.errors,[]);
  }finally{reload.dispose();}
});

test('three real home sleeps announce the fry and save the new family without awarding a catch',()=>{
  const app=boot({...seed(),caught:{...seed().caught,moroko:1},money:5000}),w=app.window;let saved;
  try{
    w.eval('petUi.open("shop")');click(w,'[data-pet-buy="moroko"]');click(w,'[data-pet-buy="moroko"]');
    click(w,'[data-pet-action="aquarium"]');assert.match(w.document.querySelector('#petFishSelect').textContent,/モロコ/);
    for(let day=0;day<3;day++){
      click(w,'[data-pet-action="feed"]');click(w,'[data-pet-action="close"]');
      assert.equal(w.eval('sleepAtPlayerHome()'),true);
      w.eval('petUi.open("aquarium")');
    }
    assert.equal(read(w,'s.petLife.fish.length'),3);
    assert.match(w.document.querySelector('#rescueToast').textContent,/稚魚が生まれた/);
    assert.match(w.document.querySelector('.pet-birth').textContent,/稚魚が生まれた/);
    saved=JSON.parse(w.localStorage.getItem(saveKey));assert.equal(saved.caught.moroko,1);
    assert.deepEqual(app.errors,[]);
  }finally{app.dispose();}
  const reload=boot(saved);
  try{assert.equal(read(reload.window,'s.petLife.fish.length'),3);assert.deepEqual(reload.errors,[]);}finally{reload.dispose();}
});
