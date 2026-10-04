const {test}=require('node:test'),assert=require('node:assert/strict');
const Story=require('../lake-story.js'),Intro=require('../lake-intro.js');
const {boot,seed,read,saveKey}=require('./game-harness.cjs');
const resources=w=>read(w,'({money:s.money,hp:s.hp,clock:s.gameMinutes,caught:s.caught,baits:s.baits,rod:s.ownedRods,affinity:s.dogAffinity,petLife:s.petLife,quests:s.questCompletions,x:s.x,y:s.y})');
const shown=w=>w.document.querySelector('#lakeIntro').classList.contains('open');
test('a new adventure opens five short pages, blocks world inputs, and hands control back after the book',()=>{
 const app=boot(null,undefined,{keepIntro:true}),w=app.window;
 try{
  assert.equal(shown(w),true);assert.equal(w.document.activeElement.id,'lakeIntroNext');
  assert.equal(w.document.querySelector('#lakeIntroProgress').textContent,'1 / 5');
  const before=resources(w);w.move('right');w.action();assert.deepEqual(resources(w),before);
  w.document.querySelector('#lakeIntroNext').click();assert.match(w.document.querySelector('#lakeIntroPaper').textContent,/祖父|ヌシ/);
  w.document.querySelector('#lakeIntroPrevious').click();assert.equal(w.document.querySelector('#lakeIntroProgress').textContent,'1 / 5');
  for(let i=0;i<4;i++)w.document.querySelector('#lakeIntroNext').click();
  assert.match(w.document.querySelector('#lakeIntroPaper').textContent,/この子たちのため/);
  assert.equal(w.document.querySelector('#lakeIntroNext').textContent,'村へ出かける');
  w.document.querySelector('#lakeIntroNext').click();assert.equal(shown(w),false);
  assert.equal(w.document.querySelector('.controls').inert,false);assert.equal(w.document.activeElement.id,'menu');
  assert.deepEqual(resources(w),before);assert.equal(read(w,'s.lakeStory.introSeen'),true);assert.equal(read(w,'s.lakeStory.introPending'),false);
  assert.equal(read(w,'ShuLakeStory.chapters(s).length'),1);assert.deepEqual(read(w,'s.lakeStory.read'),[]);
  assert.deepEqual(app.errors,[]);
 }finally{app.dispose();}
});
test('unfinished opening resumes its page after reload; skipping survives the next reload',()=>{
 const first=boot(null,undefined,{keepIntro:true}),w=first.window;let pending,finished;
 try{w.document.querySelector('#lakeIntroNext').click();pending=JSON.parse(w.localStorage.getItem(saveKey));assert.equal(pending.lakeStory.introPage,1);}finally{first.dispose();}
 const next=boot(pending,undefined,{keepIntro:true});
 try{
  assert.equal(shown(next.window),true);assert.equal(next.window.document.querySelector('#lakeIntroProgress').textContent,'2 / 5');
  next.window.dispatchEvent(new next.window.KeyboardEvent('keydown',{key:'Escape',bubbles:true}));assert.equal(shown(next.window),false);
  finished=JSON.parse(next.window.localStorage.getItem(saveKey));assert.equal(finished.lakeStory.introSeen,true);assert.deepEqual(next.errors,[]);
 }finally{next.dispose();}
 const restored=boot(finished);try{assert.equal(shown(restored.window),false);assert.deepEqual(restored.errors,[]);}finally{restored.dispose();}
});
test('an existing adventure is uninterrupted; optional rereading returns to the same journal and preserves progress',()=>{
 const app=boot({...seed(),lakeStory:{visited:{coast:true},read:['arrival'],selected:'arrival'}}),w=app.window;
 try{
  assert.equal(shown(w),false);assert.equal(read(w,'s.lakeStory.introSeen'),false);
  w.openLakeStory();const before=resources(w),story=read(w,'s.lakeStory');
  w.document.querySelector('#lakeStoryReplayIntro').click();assert.equal(shown(w),true);
  for(let i=0;i<3;i++)w.document.querySelector('#lakeIntroNext').click();
  assert.match(w.document.querySelector('#lakeIntroPaper').textContent,/シュウ/);
  w.document.querySelector('#lakeIntroNext').click();w.document.querySelector('#lakeIntroSkip').click();
  assert.equal(w.document.querySelector('#lakeStory').classList.contains('open'),true);assert.equal(w.document.activeElement.id,'lakeStoryReplayIntro');
  assert.deepEqual(read(w,'s.lakeStory'),story);assert.deepEqual(resources(w),before);assert.deepEqual(app.errors,[]);
 }finally{app.dispose();}
});
test('opening flags normalize safely and each save keeps its own pending story',()=>{
 const state={lakeStory:{introPage:99,introPending:'true',introSeen:1}};Story.normalize(state);
 assert.equal(state.lakeStory.introPage,4);assert.equal(state.lakeStory.introPending,false);assert.equal(state.lakeStory.introSeen,false);
 state.lakeStory.introPending=true;state.lakeStory.introSeen=true;Story.normalize(state);assert.equal(state.lakeStory.introPending,false);
 const one=JSON.stringify(seed()),app=boot(null,undefined,{url:'http://localhost/nushi-tsuri/?saveSlot=2',keepIntro:true,storage:{[saveKey]:one}}),w=app.window;
 try{assert.equal(shown(w),true);w.document.querySelector('#lakeIntroSkip').click();assert.equal(w.localStorage.getItem(saveKey),one);assert.equal(JSON.parse(w.localStorage.getItem(saveKey+'-slot2')).lakeStory.introSeen,true);assert.deepEqual(app.errors,[]);}finally{app.dispose();}
});
test('the opening leaves the main story editable and mentions the selected companion without ending spoilers',()=>{
 assert.equal(Intro.pages.length,5);
 assert.match(Intro.text(Intro.pages[3],'Grey').join(''),/Grey/);
 assert.doesNotMatch(Intro.pages.flatMap(p=>Intro.text(p,'シュウ')).join(''),/渓流のヌシ|地底湖のヌシ|星降るヌシ|三つのヌシ/);
});
