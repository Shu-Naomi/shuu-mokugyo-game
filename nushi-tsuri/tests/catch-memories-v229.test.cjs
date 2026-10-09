const {test}=require('node:test'),assert=require('node:assert/strict');
const {boot,seed,read,saveKey}=require('./game-harness.cjs');
const Slots=require('../save-slots.js');
const fresh=()=>({...seed(),hp:100,caught:{},sizeRecords:{},dog:'shuu',soundEnabled:false});
function catchFixture(w,{roll=.5,minutes=500,dog='shuu',method='bait',spot='lake-shallow',mode='gauge'}={}){
  w.eval(`hideCatchCard();s.gameMinutes=${minutes};
    battle={phase:'landing',f:fish.find(f=>f.id==='funa'),spot:${JSON.stringify(spot)},
      waterZone:'lake',castLocale:'lake',rod:'bamboo',bait:'worm',hook:'small',
      method:${JSON.stringify(method)},lure:'silverSpoon',fightMode:${JSON.stringify(mode)},
      catchContext:{gameMinutes:${minutes},weatherId:ShuWeather.forecast(${minutes}).id,dogId:${JSON.stringify(dog)}}};
    battle.specimen=rollFishSpecimen(battle.f,()=>${roll});caught();save();`);
  return read(w,'s.catchMemories.funa||null');
}

test('the first catch keeps its real circumstances; a larger catch replaces only the maximum',()=>{
  const app=boot(fresh()),w=app.window;
  try{
    const first=catchFixture(w,{minutes:500});
    assert.ok(first.first);assert.deepEqual(first.first,first.best);
    assert.equal(first.first.gameMinutes,500);assert.equal(first.first.hookId,'small');
    assert.equal(first.first.dogId,'shuu');assert.equal(first.first.weatherId,'sunny');
    const updated=catchFixture(w,{roll:.999999,minutes:2960,dog:'grey',mode:'nushi'});
    assert.deepEqual(updated.first,first.first);assert.ok(updated.best.hundredths>first.best.hundredths);
    assert.equal(updated.best.gameMinutes,2960);assert.equal(updated.best.weatherId,'rain');
    assert.equal(updated.best.dogId,'grey');assert.equal(updated.best.fightMode,'nushi');
    assert.deepEqual(catchFixture(w,{roll:.02,minutes:3500}),updated);
    assert.deepEqual(catchFixture(w,{roll:.999999,minutes:4000}),updated,'equal sizes keep the earlier record');
    assert.equal(read(w,'s.caught.funa'),4);w.caught();assert.equal(read(w,'s.caught.funa'),4);
    assert.deepEqual(app.errors,[]);
  }finally{app.dispose();}
});

test('the normal cast records its fishing clock and companion once, including the midnight boundary',()=>{
  const app=boot({...fresh(),gameMinutes:1435,x:123,y:92,direction:'up'}),w=app.window;
  try{
    w.eval('cast();beginFishing();battle.cast=95;Math.random=()=>.3;launchSurfaceCast();clearTimeout(castLandingTimer)');
    const context=read(w,'battle.catchContext'),id=read(w,'battle.f.id');
    assert.equal(context.gameMinutes,1445);assert.equal(context.weatherId,'cloudy');assert.equal(context.dogId,'shuu');
    w.eval('s.dog="grey";s.gameMinutes=9000;caught();save()');
    const memory=read(w,`s.catchMemories[${JSON.stringify(id)}].first`);
    assert.equal(memory.gameMinutes,1445);assert.equal(memory.weatherId,'cloudy');assert.equal(memory.dogId,'shuu');
    assert.deepEqual(app.errors,[]);
  }finally{app.dispose();}
});

test('old catches keep their count and maximum without fabricated first-catch memories',()=>{
  const app=boot({...seed(),sizeRecords:{funa:{hundredths:4999,tierId:'giant'}}}),w=app.window;
  try{
    assert.deepEqual(read(w,'s.catchMemories'),{});const old=read(w,'({count:s.caught.funa,maximum:s.sizeRecords.funa})');
    catchFixture(w,{roll:.5});assert.equal(read(w,'s.caught.funa'),old.count+1);
    assert.deepEqual(read(w,'s.sizeRecords.funa'),old.maximum);assert.equal(read(w,'s.catchMemories.funa||null'),null);
    w.eval('fishdexSelectedId="funa";open("record")');
    assert.match(w.document.querySelector('[data-catch-memory="first"]').textContent,/日時は記録されていない/);
    assert.deepEqual(app.errors,[]);
  }finally{app.dispose();}
});

test('a new maximum in an old adventure gains its own memory while first-catch history stays unknown',()=>{
  const app=boot({...seed(),sizeRecords:{funa:{hundredths:2100,tierId:'normal'}}}),w=app.window;
  try{
    const value=catchFixture(w,{roll:.999999,minutes:2000});assert.equal(value.first,null);
    assert.equal(value.best.hundredths,4999);assert.equal(value.best.gameMinutes,2000);
    const stored=JSON.parse(w.localStorage.getItem(saveKey)),again=boot(stored);
    try{assert.deepEqual(read(again.window,'s.catchMemories.funa'),value);assert.deepEqual(again.errors,[]);}finally{again.dispose();}
    assert.deepEqual(app.errors,[]);
  }finally{app.dispose();}
});

test('practice catches and unsuccessful fights cannot create memories',()=>{
  const app=boot(fresh()),w=app.window;
  try{
    w.eval('openPracticePond();beginFishing();battle.f=fish.find(f=>f.id==="funa");caught()');
    assert.deepEqual(read(w,'s.catchMemories'),{});assert.deepEqual(read(w,'s.caught'),{});
    w.eval('hideCatchCard();battle={phase:"fight",f:fish.find(f=>f.id==="funa")};lose("fixture failure")');
    assert.deepEqual(read(w,'s.catchMemories'),{});assert.deepEqual(read(w,'s.caught'),{});
    assert.deepEqual(app.errors,[]);
  }finally{app.dispose();}
});

test('lure memories describe the actual lure rather than an unused bait hook',()=>{
  const app=boot(fresh()),w=app.window;
  try{
    const value=catchFixture(w,{method:'lure'});assert.equal(value.first.baitId,'silverSpoon');assert.equal(value.first.hookId,'');
    w.eval('fishdexSelectedId="funa";open("record")');
    const text=w.document.querySelector('[data-catch-memory="first"]').textContent;
    assert.match(text,/銀のスプーン/);assert.doesNotMatch(text,/ミミズ|ハリ小/);assert.deepEqual(app.errors,[]);
  }finally{app.dispose();}
});

test('invalid memories and undiscovered species are discarded without touching existing progress',()=>{
  const app=boot(fresh()),w=app.window;
  try{
    const good=catchFixture(w),state=JSON.parse(w.localStorage.getItem(saveKey));
    state.catchMemories.funa.first.rodId='<img src=x onerror=alert(1)>';
    state.catchMemories.funa.best.hundredths=4999;
    state.catchMemories.starNushi={first:good.first,best:good.best};
    const again=boot(state);
    try{
      assert.deepEqual(read(again.window,'s.catchMemories'),{});
      assert.equal(read(again.window,'s.caught.funa'),state.caught.funa);
      assert.deepEqual(read(again.window,'s.sizeRecords'),state.sizeRecords);
      again.window.eval('fishdexSelectedId="starNushi";open("record")');
      assert.equal(again.window.document.querySelector('.fishdex-memories'),null);
      assert.deepEqual(again.errors,[]);
    }finally{again.dispose();}
    assert.deepEqual(app.errors,[]);
  }finally{app.dispose();}
});

test('saved memories survive reload, remain isolated in two adventures and reading changes no resources',()=>{
  const second={...seed(),dog:'grey',money:9876},app=boot(fresh(),undefined,{storage:{[Slots.keys[2]]:second}}),w=app.window;
  try{
    const other=w.localStorage.getItem(Slots.keys[2]),value=catchFixture(w);
    const before=read(w,'({money:s.money,hp:s.hp,clock:s.gameMinutes,baits:s.baits,caught:s.caught})');
    w.eval('fishdexSelectedId="funa";open("record")');w.document.querySelector('.fishdex-memories').open=true;
    w.backAction();assert.deepEqual(read(w,'({money:s.money,hp:s.hp,clock:s.gameMinutes,baits:s.baits,caught:s.caught})'),before);
    w.dispatchEvent(new w.Event('pagehide'));assert.equal(w.localStorage.getItem(Slots.keys[2]),other);
    const again=boot(JSON.parse(w.localStorage.getItem(saveKey)));
    try{assert.deepEqual(read(again.window,'s.catchMemories.funa'),value);assert.deepEqual(again.errors,[]);}finally{again.dispose();}
    const slot2=boot(fresh(),undefined,{url:'http://localhost/nushi-tsuri/?saveSlot=2',storage:{[Slots.keys[2]]:second}});
    try{assert.deepEqual(read(slot2.window,'s.catchMemories'),{});assert.deepEqual(slot2.errors,[]);}finally{slot2.dispose();}
    assert.deepEqual(app.errors,[]);
  }finally{app.dispose();}
});
