const {test}=require('node:test');
const assert=require('node:assert/strict');
const P=require('../pet-life.js');
const catalog=[{id:'moroko',name:'モロコ',price:300,min:300,start:750,max:1799},{id:'nushi',name:'ヌシ',price:0,min:10000,start:12000,max:29999}];
const dogs=[{id:'shuu',name:'シュウ'},{id:'riku',name:'リク'},{id:'grey',name:'グレイ'}],ids=dogs.map(d=>d.id);
function state(extra={}){const s={money:10000,caught:{funa:3},dogAffinity:{shuu:44,riku:100},...extra};P.normalize(s,catalog,ids,0);return s;}
const copy=v=>JSON.parse(JSON.stringify(v));

test('legacy friendship percentages migrate once; existing money, catches, trophies and display fish stay intact',()=>{
  const before={money:4567,caught:{funa:5},homeAquariumFishId:'funa',dogAffinity:{shuu:44,riku:100,grey:0},tournamentRecords:{wins:3}};
  const s=state(copy(before));
  assert.deepEqual(s.dogAffinity,{shuu:880,riku:2000,grey:0});
  for(const key of ['money','caught','homeAquariumFishId','tournamentRecords'])assert.deepEqual(s[key],before[key]);
  const saved=copy(s);P.normalize(saved,catalog,ids,0);assert.deepEqual(saved,s);
  assert.equal(P.dogGauge(saved.dogAffinity.riku).hearts.filter(c=>c==='gold').length,10);
});

test('hearts advance white to ten red then ten gold; frisbees and their progress stay independent',()=>{
  for(const [points,red,gold,progress] of [[0,0,0,0],[99,0,0,99],[100,1,0,0],[999,9,0,99],[1000,10,0,0],[1100,9,1,0],[1999,1,9,99],[2000,0,10,100]]){
    const g=P.dogGauge(points);assert.equal(g.hearts.filter(c=>c==='red').length,red);assert.equal(g.hearts.filter(c=>c==='gold').length,gold);assert.equal(g.progress,progress);
  }
  const s=state();P.addAffinity(s,'shuu',50);assert.equal(s.dogTricks.shuu,0);
  P.addTricks(s,'shuu',125);assert.equal(P.dogGauge(s.dogTricks.shuu,P.TRICK_MAX).level,1);assert.equal(s.dogAffinity.shuu,930);
});

test('each dog has its own daily petting/training limit and earned ability controls forage quantity and trick success',()=>{
  const s=state({dogAffinity:{shuu:0,riku:0,grey:0}});
  for(let i=0;i<3;i++)assert.equal(P.pet(s,'shuu',0),8);
  assert.equal(P.pet(s,'shuu',0),0);assert.equal(P.pet(s,'riku',0),8);
  assert.equal(P.train(s,'shuu',0),true);assert.equal(P.train(s,'shuu',0),false);
  assert.equal(s.dogTricks.shuu,25);assert.equal(P.train(s,'shuu',1),true);assert.equal(P.pet(s,'shuu',1),8);
  for(const [points,quantity] of [[0,1],[499,1],[500,2],[1000,3],[1500,4],[2000,5]]){s.dogAffinity.shuu=points;assert.equal(P.forageCount(s,'shuu'),quantity);}
  s.dogTricks.shuu=0;assert.equal(P.trickChance(s,'shuu'),.35);s.dogTricks.shuu=1000;assert.equal(P.trickChance(s,'shuu'),.95);
  assert.equal(P.pet(s,'unknown',1),0);assert.equal(P.train(s,'unknown',1),false);
});

test('live fish purchase is atomic, unique and separate from catches; full tanks or insufficient funds cost nothing',()=>{
  const s=state(),before=copy(s.caught);
  const a=P.acquire(s,'moroko',catalog,0);assert.equal(a.ok,true);assert.equal(a.fish.length,750);assert.equal(s.money,9700);
  for(let i=1;i<P.CAPACITY;i++)assert.equal(P.acquire(s,'moroko',catalog,0).ok,true);
  const full=copy(s);assert.equal(P.acquire(s,'moroko',catalog,0).ok,false);assert.deepEqual(s,full);
  assert.equal(new Set(s.petLife.fish.map(f=>f.uid)).size,P.CAPACITY);assert.deepEqual(s.caught,before);
  const poor=state({money:299});const original=copy(poor);assert.equal(P.acquire(poor,'moroko',catalog,0).ok,false);assert.deepEqual(poor,original);
});

test('nushi requires a catch, keeps its measured size and cannot be duplicated or resized by later records',()=>{
  const s=state();assert.equal(P.acquire(s,'nushi',catalog,0).ok,false);
  s.caught.nushi=1;s.sizeRecords={nushi:{hundredths:12345}};
  const n=P.acquire(s,'nushi',catalog,0);assert.equal(n.ok,true);assert.equal(n.fish.length,12345);assert.equal(s.money,10000);
  assert.equal(P.acquire(s,'nushi',catalog,0).ok,false);
  s.sizeRecords.nushi.hundredths=25000;
  P.normalize(s,catalog,ids,0);assert.equal(P.selected(s).length,12345);assert.equal(s.caught.nushi,1);
});

test('one ration grows a fish by exactly 0.10 cm the next day, once; skipped days never multiply that ration',()=>{
  const s=state(),f=P.acquire(s,'moroko',catalog,0).fish;
  assert.equal(P.care(s,f.uid,'feed',0,catalog).ok,true);assert.equal(s.petLife.food,9);
  assert.equal(P.care(s,f.uid,'feed',0,catalog).ok,false);
  assert.equal(P.sync(s,catalog,0),false);assert.equal(f.length,750);
  P.sync(s,catalog,1);assert.equal(f.length,760);assert.equal(f.water,92);assert.equal(f.careDays,1);
  assert.equal(P.sync(s,catalog,1),false);
  P.care(s,f.uid,'feed',1,catalog);P.sync(s,catalog,10);assert.equal(f.length,770);assert.equal(f.careDays,2);
  P.sync(s,catalog,20);assert.equal(f.length,770);assert.equal(f.water,0);assert.ok(f.health>=20);
  const saved=copy(s);P.normalize(saved,catalog,ids,20);assert.equal(P.selected(saved).length,770);
});

test('dirty water prevents growth; water changes and food stock are bounded and maximum size cannot overflow',()=>{
  const s=state(),f=P.acquire(s,'moroko',catalog,0).fish;
  f.water=39;P.care(s,f.uid,'feed',0,catalog);P.sync(s,catalog,1);assert.equal(f.length,750);
  assert.equal(P.care(s,f.uid,'water',1,catalog).ok,true);assert.equal(f.water,100);assert.equal(P.care(s,f.uid,'water',1,catalog).ok,false);
  f.length=1795;P.care(s,f.uid,'feed',1,catalog);P.sync(s,catalog,2);assert.equal(f.length,1799);
  const money=s.money;assert.equal(P.buyFood(s,10),true);assert.equal(s.money,money-1000);assert.equal(s.petLife.food,108);
  s.petLife.food=99999;const before=copy(s);assert.equal(P.buyFood(s,1),false);assert.deepEqual(s,before);
});

test('malformed pet saves cannot create an unearned nushi, duplicate specimens or invalid sizes',()=>{
  const s={money:123,caught:{},dogAffinity:{shuu:Infinity,riku:-5,grey:'bad'},petLife:{version:1,food:-2,nextId:-5,fish:[
    {uid:'pet-1',species:'moroko',bornSize:-20,length:Infinity,water:500,health:-7,lastDay:99},
    {uid:'pet-1',species:'moroko'},null,{uid:'pet-2',species:'nushi'},
  ],entries:{'bad-key':1,'bond:beginner':'bad'},lastResult:{kind:'bad'}}};
  P.normalize(s,catalog,ids,3);assert.equal(s.petLife.fish.length,1);assert.equal(s.petLife.fish[0].length,300);
  assert.equal(s.petLife.fish[0].water,100);assert.equal(s.petLife.fish[0].health,20);assert.equal(s.petLife.lastResult,null);
  assert.equal(s.petLife.nextId,2);assert.equal(s.petLife.food,0);assert.deepEqual(s.petLife.entries,{});
});

test('all three courses charge once, award fixed prizes and preserve participation through reload',()=>{
  const s=state({dogAffinity:{shuu:100}});
  for(const c of P.courses){
    const before=s.money,result=P.enter(s,'bond',c.id,'shuu',0,catalog,dogs);
    assert.equal(result.ok,true);assert.equal(result.result.score,100);assert.equal(result.result.rank,1);assert.equal(s.money,before-c.fee+c.prize);
    const saved=copy(s);assert.equal(P.enter(s,'bond',c.id,'riku',0,catalog,dogs).ok,false);assert.deepEqual(s,saved);
    P.normalize(s,catalog,ids,0);assert.equal(P.enter(s,'bond',c.id,'shuu',0,catalog,dogs).ok,false);
  }
  assert.equal(P.enter(s,'bond','beginner','shuu',1,catalog,dogs).ok,true);
});

test('trick level changes actual contest outcomes; a stored result cannot reroll or pay twice',()=>{
  const s=state();let rolls=0;const rng=()=>{rolls++;return .8;};
  const low=P.enter(s,'tricks','beginner','shuu',0,catalog,dogs,rng);assert.equal(low.result.score,0);assert.equal(low.result.reward,0);
  s.dogTricks.shuu=1000;const high=P.enter(s,'tricks','advanced','shuu',0,catalog,dogs,rng);assert.equal(high.result.score,100);assert.equal(high.result.rank,1);
  const original=copy(s);assert.equal(P.enter(s,'tricks','advanced','shuu',0,catalog,dogs,rng).ok,false);assert.deepEqual(s,original);assert.equal(rolls,10);
});

test('fish judging rewards growth and care independently of species; invalid entry or active fishing tournament charges nothing',()=>{
  const s=state(),f=P.acquire(s,'moroko',catalog,0).fish;
  const initial=P.fishScore(f).score;f.length+=75;f.health=100;f.water=100;assert.ok(P.fishScore(f).score>initial);assert.equal(P.fishScore(f).score,100);
  assert.equal(P.enter(s,'fish','advanced',f.uid,0,catalog,dogs).result.rank,1);
  for(const args of [['fish','beginner','pet-99'],['bond','invalid','shuu'],['tricks','beginner','missing']]){const before=copy(s);assert.equal(P.enter(s,...args,0,catalog,dogs).ok,false);assert.deepEqual(s,before);}
  s.tournament={active:true};const before=copy(s);assert.equal(P.enter(s,'bond','beginner','shuu',0,catalog,dogs).ok,false);assert.deepEqual(s,before);
  s.tournament=null;s.money=99;assert.equal(P.enter(s,'bond','beginner','shuu',0,catalog,dogs).ok,false);assert.equal(s.money,99);
});
