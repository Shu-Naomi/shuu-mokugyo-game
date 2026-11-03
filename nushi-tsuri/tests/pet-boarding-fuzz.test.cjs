const {test}=require('node:test');
const assert=require('node:assert/strict');
const P=require('../pet-life.js');

const catalog=[
  {id:'funa',name:'フナ',price:0,min:600,start:1200,max:6000,waterLabel:'淡水'},
  {id:'koi',name:'コイ',price:0,min:800,start:1600,max:10000,waterLabel:'淡水'},
  {id:'buri',name:'ブリ',price:0,min:1000,start:9000,max:12499,waterLabel:'海水'},
];
const copy=value=>JSON.parse(JSON.stringify(value));

test('fixed-seed mixed transfers, care, reloads and skipped days preserve boarding invariants',()=>{
  let state={money:10000,caught:{funa:1,koi:1,buri:1},petLife:{
    version:6,fish:[],mutationSeed:'a'.repeat(32),unlockedTanks:6,food:99999,
  }};
  let day=0,seed=42,boards=0,withdrawals=0,rollbacks=0,reloads=0;
  // Fixed 32-bit LCG: a failed assertion reports the exact reproducible step.
  const random=limit=>{seed=(seed*1664525+1013904223)>>>0;return seed%limit;};
  P.normalize(state,catalog,[],day,{legacy:false});

  for(let step=0;step<2000;step++){
    const active=state.petLife.fish,boarded=state.petLife.boarded;
    const before=JSON.stringify(state);
    const frozen=new Map(boarded.map(f=>[f.uid,JSON.stringify(f)]));
    const operation=random(7),saved=random(5)!==0;
    const context=`seed=42 step=${step} operation=${operation} day=${day}`;
    let result;

    if(operation===0){
      const species=catalog[random(catalog.length)].id;
      P.acquire(state,species,catalog,day,random(6));
    }
    if(operation===1&&active.length){
      result=P.boardFish(state,active[random(active.length)].uid,catalog,day,()=>saved);
      if(result.ok)boards++;
    }
    if(operation===2&&boarded.length){
      const uid=boarded[random(boarded.length)].uid;
      result=P.withdrawFish(state,uid,random(6),catalog,day,()=>saved);
      if(result.ok){
        withdrawals++;
        assert.equal(state.petLife.fish.find(f=>f.uid===uid).lastDay,day,context);
      }
    }
    if(operation===3){day+=random(10);P.sync(state,catalog,day);}
    if(operation===4){state=copy(state);P.normalize(state,catalog,[],day);reloads++;}
    if(operation===5&&active.length){
      P.care(state,active[random(active.length)].uid,random(2)?'feed':'water',day,catalog);
    }
    if(operation===6&&active.length){
      P.rehome(state,active[random(active.length)].uid,catalog,day);
    }
    if(result&&!result.ok){
      rollbacks++;
      assert.equal(JSON.stringify(state),before,`transaction rollback: ${context}`);
    }

    const all=P.allFish(state);
    assert.equal(new Set(all.map(f=>f.uid)).size,all.length,`unique UIDs: ${context}`);
    for(const species of catalog){
      assert.ok(state.petLife.boarded.filter(f=>f.species===species.id).length<=P.BOARDING_CAPACITY,`boarding capacity: ${context}`);
    }
    for(const fish of state.petLife.boarded){
      if(frozen.has(fish.uid))assert.equal(JSON.stringify(fish),frozen.get(fish.uid),`paused specimen ${fish.uid}: ${context}`);
    }
    for(const tank of P.tankIds(state)){
      assert.ok(P.residents(state,tank).length+P.eggsIn(state,tank).length<=P.tankCapacity(tank),`tank ${tank} capacity: ${context}`);
    }
  }
  assert.ok(boards>0&&withdrawals>0&&rollbacks>0&&reloads>0,'exercise successful transfers, failed/rejected transfers and reloads');
  assert.ok(day>1000,'exercise long accumulated boarding intervals');
});
