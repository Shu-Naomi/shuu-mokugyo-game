const {test}=require('node:test'),assert=require('node:assert/strict');
const Story=require('../lake-story.js'),Regional=require('../regional-nushi.js'),M=require('../mountain-region.js');
const {boot,seed,read,saveKey}=require('./game-harness.cjs');
const ids=s=>Story.chapters(s).map(p=>p.id);
const resources=w=>read(w,'({money:s.money,hp:s.hp,clock:s.gameMinutes,caught:s.caught,baits:s.baits,rod:s.ownedRods,affinity:s.dogAffinity,petLife:s.petLife,quests:s.questCompletions})');

test('legacy story recovery uses explicit places and real catches while preserving every existing resource',()=>{
  const state={...seed(),fishCatchRecords:{funa:{last:{spotId:'lake-deep'}},ayu:{last:{spotId:'mountain-stream-deep'}},namazu:{last:{spotId:'mountain-highMarsh-mid'}}}};
  const before=JSON.stringify(state);Story.normalize(state);
  assert.deepEqual(state.lakeStory.visited,{stream:true,mountainMarsh:true});
  const {lakeStory,...original}=state;assert.equal(JSON.stringify(original),before);
  const normalized=JSON.stringify(state);Story.normalize(state);assert.equal(JSON.stringify(state),normalized);
  assert.equal(Story.regionForSpot('coast-reef-deep'),'coast');
  assert.equal(Story.regionForSpot('mountain-highPond-mid'),'mountainPond');
  assert.equal(Story.regionForSpot('mountain-underground-shallow'),'cave');
});

test('ordinary completion and forged reading flags never reveal legendary chapters or change fish candidates',()=>{
  const state={caught:{starNushi:-1},regionalCaught:Object.fromEntries(Object.entries(Regional.ordinary).map(([r,fish])=>[r,Object.fromEntries(fish.map(id=>[id,1]))])),
    lakeStory:{visited:{unknown:true,coast:'false'},read:['ending','confluence','missing','arrival','arrival'],selected:'ending'}};
  const candidates=Regional.candidates(state,'mountain-stream-deep','day');Story.normalize(state);
  assert.deepEqual(ids(state),['arrival']);assert.deepEqual(state.lakeStory.read,['arrival']);
  assert.equal(state.lakeStory.selected,'arrival');assert.equal(Story.completed(state),false);
  assert.deepEqual(Regional.candidates(state,'mountain-stream-deep','day'),candidates);
  assert.equal(Story.markRead(state,'ending'),false);assert.equal(Story.visit(state,'not-a-map'),false);
  assert.doesNotMatch(Story.prose(Story.pages[0],'シュウ').join(''),/渓流のヌシ|沿岸のヌシ|地底湖のヌシ|星降るヌシ/);
});

test('each actual boss opens its own memory in any order; the lake conclusion needs the final catch',()=>{
  const state={caught:{}};Story.normalize(state);
  state.caught.caveNushi=1;assert.ok(ids(state).includes('cave-memory'));assert.ok(!ids(state).includes('confluence'));
  state.caught.streamNushi=1;assert.ok(ids(state).includes('stream-memory'));assert.ok(!ids(state).includes('confluence'));
  state.caught.coastNushi=1;assert.ok(ids(state).includes('confluence'));assert.ok(!ids(state).includes('ending'));
  state.caught.starNushi=1;assert.ok(ids(state).includes('ending'));assert.equal(Story.completed(state),false);
  assert.equal(Story.markRead(state,'ending'),true);assert.equal(Story.markRead(state,'ending'),false);
  assert.equal(Story.completed(state),true);assert.equal(state.lakeStory.read.filter(id=>id==='ending').length,1);
  Story.normalize(state);assert.equal(Story.completed(state),true);
});

test('real region transitions record visits, survive reload, and preserve inventory and time',()=>{
  const app=boot({...seed(),mapRegion:'stream',...M.entry,hp:100}),w=app.window;let saved;
  try{
    const before=resources(w);w.eval('s.x=73;s.y=8;action();s.x=224;s.y=8;action()');
    assert.deepEqual(read(w,'s.lakeStory.visited'),{stream:true,mountainPond:true,mountainMarsh:true});
    w.eval('action();s.x=120;s.y=128;action();s.x=219;s.y=30;action()');
    assert.equal(read(w,'s.lakeStory.visited.cave'),true);assert.deepEqual(resources(w),before);
    saved=JSON.parse(w.localStorage.getItem(saveKey));assert.deepEqual(app.errors,[]);
  }finally{app.dispose();}
  const restored=boot(saved);try{assert.equal(read(restored.window,'s.lakeStory.visited.cave'),true);assert.deepEqual(restored.errors,[]);}finally{restored.dispose();}
});

test('the journal is accessible from menu, archive and Sam; close and B restore the source menu',()=>{
  const app=boot(),w=app.window;
  try{
    const before=resources(w);w.openFieldMenuTarget('story');
    assert.equal(w.document.querySelector('#lakeStory').classList.contains('open'),true);
    assert.match(w.document.querySelector('#lakeStoryPage').textContent,/空白の手帳|シュウ/);
    assert.equal(w.document.querySelector('[data-story-page="ending"]'),null);w.backAction();
    assert.equal(w.document.querySelector('.modal.open'),null);
    w.open('record');w.document.querySelector('#fishdexStoryOffer').click();w.document.querySelector('#lakeStoryClose').click();
    assert.equal(w.document.querySelector('#record').classList.contains('open'),true);w.close();
    w.renderSamShop();w.open('store');w.document.querySelector('#samStoryOffer').click();w.backAction();
    assert.equal(w.document.querySelector('#store').classList.contains('open'),true);
    assert.match(w.document.querySelector('#samStoryLine').textContent,/自分の一冊/);
    assert.deepEqual(resources(w),before);assert.deepEqual(app.errors,[]);
  }finally{app.dispose();}
});

test('a real final catch records once, offers the ending and keeps read status across reload',()=>{
  const app=boot({...seed(),hp:100,ownedRods:['bamboo','tideMaster'],selectedRod:'tideMaster',caught:{streamNushi:1,coastNushi:1,caveNushi:1}}),w=app.window;let saved;
  try{
    w.eval('cast();beginFishing();battle.f=fish.find(f=>f.id==="starNushi");battle.specimen=rollFishSpecimen(battle.f,()=>.5);caught()');
    const before=resources(w);w.caught();assert.equal(read(w,'s.caught.starNushi'),1);assert.deepEqual(resources(w),before);
    assert.equal(w.document.querySelector('#catchStoryButton').hidden,false);w.document.querySelector('#catchStoryButton').click();
    assert.match(w.document.querySelector('#lakeStoryPage').textContent,/星の帰る場所|白い頁/);
    assert.equal(read(w,'ShuLakeStory.completed(s)'),true);assert.deepEqual(resources(w),before);
    w.document.querySelector('#lakeStoryClose').click();saved=JSON.parse(w.localStorage.getItem(saveKey));assert.deepEqual(app.errors,[]);
  }finally{app.dispose();}
  const restored=boot(saved);try{assert.equal(read(restored.window,'ShuLakeStory.completed(s)'),true);assert.equal(read(restored.window,'s.caught.starNushi'),1);assert.deepEqual(restored.errors,[]);}finally{restored.dispose();}
});

test('practice catches never open story memories, and visits do not alter quiet ordinary completion',()=>{
  const app=boot(),w=app.window;
  try{
    w.eval('openPracticePond();beginFishing();battle.f=fish.find(f=>f.id==="starNushi");caught()');
    assert.equal(read(w,'s.caught.starNushi||0'),0);assert.equal(w.document.querySelector('#catchStoryButton').hidden,true);
    assert.equal(w.eval('ShuLakeStory.chapters(s).some(p=>p.id==="ending")'),false);assert.deepEqual(app.errors,[]);
  }finally{app.dispose();}
});

test('the villagers respond to known adventures and text substitutions are escaped',()=>{
  const state={caught:{},lakeStory:{visited:{},read:[]}};
  assert.equal(Story.dialogue(state,'farmhouse'),'');Story.visit(state,'stream');assert.match(Story.dialogue(state,'farmhouse'),/足音/);
  state.caught.streamNushi=1;assert.match(Story.dialogue(state,'farmhouse'),/あの流れ/);
  state.caught.starNushi=1;assert.match(Story.dialogue(state,'sam'),/村の灯り/);assert.match(Story.dialogue(state,'fish-market'),/港まで/);
  assert.equal(Story.escape('<img src=x>"&'), '&lt;img src=x&gt;&quot;&amp;');
  assert.ok(Story.prose(Story.pages[0],'Grey').some(p=>p.includes('Grey')));
});
