const {test}=require('node:test');
const assert=require('node:assert/strict');
const F=require('../fishing-duel.js'),P=require('../pet-life.js');
const {boot,seed,read,saveKey}=require('./game-harness.cjs');
const catalog=[{id:'moroko',name:'ホンモロコ',min:300,start:750,max:1200,price:300,waterLabel:'淡水'},
  {id:'aji',name:'アジ',min:500,start:1200,max:4000,price:300,waterLabel:'海水'}];
const ids=['shuu','riku','grey'],dogs=ids.map(id=>({id,name:id}));
const copy=x=>JSON.parse(JSON.stringify(x));
function pets(){const s={money:10000,caught:{moroko:1,aji:1},dogAffinity:{shuu:100},dogTricks:{shuu:800}};P.normalize(s,catalog,ids,0,{legacy:false});return s;}
const click=(w,selector)=>{const e=w.document.querySelector(selector);assert.ok(e,selector);e.click();};

test('old inventory, currency, catches and stars survive new tackle migration without invented duplicates',()=>{
  const app=boot({...seed(),ownedRods:['bamboo','starGazer'],rodParts:{expeditionJoint:6},lures:{silverSpoon:3}}),w=app.window;
  try{assert.equal(read(w,'s.fightMode'),'gauge');assert.equal(read(w,'s.rodCopies.starGazer'),1);assert.equal(read(w,'s.rodParts.expeditionJoint'),6);
    assert.equal(read(w,'s.money'),4321);assert.deepEqual(read(w,'s.caught'),seed().caught);assert.equal(read(w,'s.lures.silverSpoon'),3);assert.deepEqual(app.errors,[]);
  }finally{app.dispose();}
});

test('ten rod jackpots remain ten physical copies; deferred sale/upgrade consumes one and protects the last rod',()=>{
  const app=boot(),w=app.window;let saved;
  try{for(let i=0;i<10;i++)w.grantStarFortunePrize('starGazer');assert.equal(read(w,'s.rodCopies.starGazer'),10);
    assert.equal(read(w,'s.rodParts.expeditionJoint'),0);assert.equal(read(w,'s.ownedRods.filter(r=>r==="starGazer").length'),1);
    w.eval('openInventory("tackle")');click(w,'#inventoryTackleSummary + .duel-options [data-rod-duplicate="upgrade"]');
    assert.equal(read(w,'s.rodCopies.starGazer'),9);assert.equal(read(w,'s.rodLevels.starGazer'),1);
    const money=read(w,'s.money');click(w,'#inventoryTackleSummary + .duel-options [data-rod-duplicate="sell"]');assert.equal(read(w,'s.money'),money+12000);
    w.eval('while(s.rodCopies.starGazer>1)ShuFishing.duplicate(s,"sell");save()');saved=JSON.parse(w.localStorage.getItem(saveKey));
    assert.equal(w.eval('ShuFishing.duplicate(s,"sell").ok'),false);assert.equal(w.eval('ShuFishing.duplicate(s,"upgrade").ok'),false);
    assert.equal(read(w,'s.rodCopies.starGazer'),1);assert.deepEqual(app.errors,[]);
  }finally{app.dispose();}
  const restored=boot(saved);try{assert.equal(read(restored.window,'s.rodLevels.starGazer'),1);assert.equal(read(restored.window,'s.rodCopies.starGazer'),1);}finally{restored.dispose();}
});

test('fight setting is saved and latched per cast while both modes share bait selection and one cast charge',()=>{
  const app=boot({...seed(),money:150000}),w=app.window;
  try{w.eval('openInventory("tackle")');click(w,'#inventoryTackleSummary + .duel-options [data-fight-mode="nushi"]');w.close();
    const before=read(w,'[s.baits.worm,s.gameMinutes]');w.eval('cast();beginFishing();battle.cast=50;launchSurfaceCast();commitCastResources();settleSurfaceCast()');
    const after=read(w,'[s.baits.worm,s.gameMinutes]');assert.equal(after[0],before[0]-1);assert.ok(after[1]>before[1]);
    assert.equal(read(w,'battle.fightMode'),'nushi');w.eval('s.fightMode="gauge";battle.biteAt=Date.now();pull()');assert.equal(read(w,'battle.fightMode'),'nushi');
    assert.equal(w.document.querySelector('#fishScene').classList.contains('duel-nushi'),true);assert.deepEqual(app.errors,[]);
  }finally{app.dispose();}
});

test('spoon reveals an interested fish before bite, held input cannot auto-hook and hook input cannot also reel',()=>{
  const app=boot({...seed(),ownedRods:['bamboo','lureRod'],selectedRod:'lureRod',fishingMethod:'lure',lures:{silverSpoon:1}}),w=app.window;
  try{const before=read(w,'[s.baits.worm,s.lures.silverSpoon,s.gameMinutes]');w.eval('cast();beginFishing();battle.cast=50;launchSurfaceCast();settleSurfaceCast()');
    assert.equal(read(w,'battle.phase'),'lure');assert.equal(w.document.querySelector('#battleFish').style.opacity,'0');
    w.pressBattleAction();w.eval('for(let i=0;i<12;i++)updateLurePresentation()');assert.equal(read(w,'battle.phase'),'interest');
    const fish=read(w,'[battle.f.id,battle.specimen]');assert.equal(w.document.querySelector('#battleFish').style.opacity,'1');
    w.eval('battle.biteAt=Date.now();updateLurePresentation()');assert.equal(read(w,'battle.phase'),'bite');w.pressBattleAction();assert.equal(read(w,'battle.phase'),'bite');
    w.releaseBattleAction();w.pressBattleAction();assert.equal(read(w,'battle.phase'),'fight');assert.equal(read(w,'battle.reeling'),false);
    w.pressBattleAction();assert.equal(read(w,'battle.reeling'),false);w.releaseBattleAction();w.pressBattleAction();assert.equal(read(w,'battle.reeling'),true);
    assert.deepEqual(read(w,'[battle.f.id,battle.specimen]'),fish);const after=read(w,'[s.baits.worm,s.lures.silverSpoon,s.gameMinutes]');assert.deepEqual(after.slice(0,2),before.slice(0,2));assert.ok(after[2]>before[2]);
    w.eval('updateFishdexCatchRecord(s,battle.f,battle.specimen,battle);save()');assert.equal(read(w,'s.fishCatchRecords[battle.f.id].last.baitId'),'silverSpoon');
    assert.deepEqual(app.errors,[]);
  }finally{app.dispose();}
});

test('bite window pauses through app backgrounding, clears holds and still fails a genuinely missed hook-set',()=>{
  const app=boot(),w=app.window;
  try{w.eval('cast();beginFishing();battle.cast=50;launchSurfaceCast();settleSurfaceCast();window.testClock=10000;Date.now=()=>window.testClock;battle.biteScheduledAt=10000;battle.biteAt=11000;battle.nibbleAt=10600');
    w.pauseBattle();w.testClock=30000;assert.equal(w.syncBitePhase(),false);w.resumeBattle();assert.equal(read(w,'battle.biteAt'),31000);
    w.testClock=31000;assert.equal(w.syncBitePhase(),true);assert.equal(read(w,'battle.phase'),'bite');assert.equal(read(w,'battle.reeling'),false);
    w.testClock=32501;assert.equal(w.syncBitePhase(),false);assert.equal(read(w,'battle'),null);assert.deepEqual(app.errors,[]);
  }finally{app.dispose();}
});

test('movement-led fight rewards slack pulls, punishes pulling during a run and requires strong gear for nushi',()=>{
  const rods={bamboo:{power:16,control:1},tideMaster:{power:38,control:1.95}};
  const calm={calm:true},run={calm:false,danger:true};
  const starter=F.rod({rodLevels:{}},'bamboo',rods),master=F.rod({rodLevels:{}},'tideMaster',rods);
  const b={f:{id:'nushi'},retrieval:0,ten:18,reeling:true,distanceFactor:1,sandLifted:true};
  for(let i=0;i<500;i++)F.step(b,calm,starter);assert.ok(b.retrieval<=.6);
  b.retrieval=0;b.ten=18;for(let i=0;i<100;i++)F.step(b,calm,master);assert.equal(b.retrieval,1);
  const before=b.ten;F.step(b,run,master);assert.ok(b.ten>before);const position=b.retrieval;
  b.reeling=false;F.step(b,run,master);assert.ok(b.ten<110);assert.ok(b.retrieval<position);
  F.step(b,calm,master);assert.equal(b.lineSlack,true);assert.ok(F.spoon.bass>F.spoon.funa*10);
});

test('strong gear actually brings each species left and up using its original moving sprite and landing conditions',()=>{
  const app=boot({...seed(),ownedRods:['bamboo','tideMaster'],selectedRod:'tideMaster',fightMode:'nushi'}),w=app.window;
  try{for(const id of ['funa','koi','hirame','nijimasu','nushi']){
    const landed=read(w,`(()=>{cast();beginFishing();battle.cast=60;launchSurfaceCast();settleSurfaceCast();battle.f=fish.find(f=>f.id==="${id}");battle.sandLifted=battle.f.id!=="hirame";startFight();battle.awaitFightRelease=false;battle.reeling=true;
      const mood=fightProfiles[battle.f.id].moods.find(m=>m.calm);battle.mood=mood;battle.calm=true;
      for(let i=0;i<500;i++){updateRetrieval(mood);moveBattleFish(mood);renderBattleFish();drawBattle();}
      const result=[battle.retrieval,Math.hypot(battle.x-battle.surfaceX,battle.y-battle.surfaceY),battle.sandLifted];endBattle();return result;})()`);
    assert.equal(landed[0],1,id);assert.ok(landed[1]<=(id==='nushi'?11:7),`${id}: ${landed[1]}`);assert.equal(landed[2],true,id);
  }assert.deepEqual(app.errors,[]);}finally{app.dispose();}
});

test('daily fish XP is per individual and cannot be earned twice; level makes advanced exhibition a long-term goal',()=>{
  const s=pets(),f=P.acquire(s,'moroko',catalog,0).fish;
  assert.equal(P.fishScore(f).score<65,true);P.care(s,f.uid,'feed',0,catalog);assert.equal(f.xp,6);
  P.care(s,f.uid,'feed',0,catalog);assert.equal(f.xp,6);P.sync(s,catalog,1);P.care(s,f.uid,'water',1,catalog);assert.equal(f.xp,10);
  P.care(s,f.uid,'water',1,catalog);assert.equal(f.xp,10);const old=copy(s);P.normalize(s,catalog,ids,1);assert.deepEqual(s,old);
  f.xp=1083;f.length=catalog[0].max;f.stars=5;f.health=100;f.water=100;assert.equal(P.fishScore(f).score,100);
});

test('healthy parents lay visible eggs; capacity is reserved until hatch and reload/time leaps never duplicate fry',()=>{
  const s=pets(),parent=P.acquire(s,'moroko',catalog,0).fish;P.acquire(s,'moroko',catalog,0);
  for(let day=0;day<3;day++){P.care(s,parent.uid,'feed',day,catalog);P.sync(s,catalog,day+1);}
  assert.equal(s.petLife.fish.length,2);assert.equal(s.petLife.eggs.length,1);assert.equal(s.petLife.eggs[0].hatchDay,5);
  P.acquire(s,'moroko',catalog,3);P.acquire(s,'moroko',catalog,3);const money=s.money;
  assert.equal(P.acquire(s,'moroko',catalog,3).ok,false);assert.equal(s.money,money);
  const before=copy(s);P.normalize(s,catalog,ids,3);assert.deepEqual(s,before);P.sync(s,catalog,4);assert.equal(s.petLife.fish.length,4);
  P.sync(s,catalog,8);assert.equal(s.petLife.fish.length,5);assert.equal(s.petLife.eggs.length,0);const hatched=copy(s);
  P.sync(s,catalog,8);P.normalize(s,catalog,ids,8);assert.deepEqual(s,hatched);assert.equal(s.petLife.fish.at(-1).generation,1);
  assert.deepEqual(s.caught,{moroko:1,aji:1});
});

test('reserved eggs keep water compatibility even after all parents move away',()=>{
  const s=pets(),f=P.acquire(s,'moroko',catalog,0).fish;P.acquire(s,'moroko',catalog,0);P.buyTank(s);
  for(let day=0;day<3;day++){P.care(s,f.uid,'feed',day,catalog);P.sync(s,catalog,day+1);}
  for(const fish of [...s.petLife.fish])P.moveFish(s,fish.uid,1,catalog,3);
  assert.equal(P.canHouse(s,'aji',catalog,0),false);P.sync(s,catalog,5);assert.equal(P.residents(s,0).length,1);
});

test('staged contests save registration, randomized competitors, commands and prize exactly once across reload',()=>{
  const s=pets(),result=P.beginContest(s,'tricks','advanced','shuu',0,catalog,dogs,()=>.2);assert.equal(result.ok,true);assert.equal(s.money,9200);
  assert.deepEqual(result.session.judges.map(j=>j.art),['liao','asual','dancer']);assert.equal(P.commandTrick(s,'お手').ok,false);
  P.advanceContest(s);assert.equal(P.commandTrick(s,'お手').success,true);const original=copy(s);
  assert.equal(P.commandTrick(s,'お手').ok,false);assert.deepEqual(s,original);P.normalize(s,catalog,ids,0);assert.deepEqual(s,original);
  assert.equal(P.beginContest(s,'bond','beginner','shuu',0,catalog,dogs).ok,false);
  for(const trick of P.TRICKS.slice(1))assert.equal(P.commandTrick(s,trick).ok,true);
  assert.equal(s.petLife.contest.phase,'judging');assert.equal(s.money,9200);
  assert.equal(P.advanceContest(s).result.rank,1);assert.equal(s.money,10800);assert.equal(s.petLife.contest,null);
  assert.equal(P.advanceContest(s).ok,false);assert.equal(s.money,10800);P.normalize(s,catalog,ids,0);assert.equal(s.money,10800);
});

test('bond contest includes ±5 audience judgment and distinct village entrants; slower affection never removes existing progress',()=>{
  const s=pets();s.dogAffinity.shuu=1000;const original=s.dogAffinity.shuu;
  assert.equal(P.addAffinity(s,'shuu',40),20);assert.equal(s.dogAffinity.shuu,original+20);
  const a=P.beginContest(s,'bond','beginner','shuu',0,catalog,dogs,()=>0).session;
  assert.equal(new Set(a.judges.map(j=>j.art)).size,3);assert.equal(new Set(a.judges.map(j=>j.dog)).size,3);assert.equal(a.audience,-5);
  P.advanceContest(s);P.advanceContest(s);const result=P.advanceContest(s).result;assert.equal(result.score,46);assert.equal(result.baseScore,51);
});

test('real pet UI shows individual level, eggs, staged dog tricks with success/failure and a final standings table',()=>{
  const app=boot({...seed(),dogTricks:{shuu:1000},money:10000}),w=app.window;
  try{w.eval('petUi.open("shop")');click(w,'[data-pet-buy="funa"]');click(w,'[data-pet-action="aquarium"]');
    assert.match(w.document.querySelector('.pet-stats').textContent,/レベル.*Lv\.1.*経験値/s);click(w,'[data-pet-action="close"]');
    w.eval('petUi.open("shop")');click(w,'[data-pet-tab="contests"]');const select=w.document.querySelector('#petContestKind');select.value='tricks';select.dispatchEvent(new w.Event('change',{bubbles:true}));
    w.Math.random=()=>.1;click(w,'[data-pet-action="enter"]');assert.ok(w.document.querySelector('.pet-stage-dog'));assert.equal(w.document.querySelector('[data-pet-action="enter"]'),null);
    click(w,'[data-pet-action="contest-next"]');assert.equal(w.document.querySelectorAll('[data-pet-trick]').length,5);
    for(const trick of P.TRICKS)click(w,`[data-pet-trick="${trick}"]`);
    assert.ok(w.document.querySelector('.is-cheering'));click(w,'[data-pet-action="contest-next"]');assert.equal(w.document.querySelectorAll('.pet-standings li').length,4);
    assert.match(w.document.querySelector('.pet-trick-results').textContent,/お手.*おかわり.*チンチン.*伏せ.*ハイタッチ/s);
    click(w,'[data-pet-action="close"]');w.eval('s.gameMinutes+=1440;s.dogTricks.shuu=0;petUi.open("shop")');click(w,'[data-pet-tab="contests"]');
    w.Math.random=()=>.9;click(w,'[data-pet-action="enter"]');click(w,'[data-pet-action="contest-next"]');click(w,'[data-pet-trick="お手"]');
    assert.ok(w.document.querySelector('.is-puzzled'));assert.match(w.document.querySelector('.pet-stage-reaction').textContent,/〰/);assert.equal(read(w,'s.petLife.contest.marks[0]'),false);assert.deepEqual(app.errors,[]);
  }finally{app.dispose();}
});
