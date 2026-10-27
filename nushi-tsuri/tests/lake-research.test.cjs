const {test}=require('node:test'),assert=require('node:assert/strict');
const Notes=require('../lake-research.js'),Regional=require('../regional-nushi.js');
const {boot,seed,read,saveKey}=require('./game-harness.cjs');
const click=(w,id)=>w.document.querySelector('#'+id).click();
const model=w=>read(w,'ShuLakeResearch.model(s,{fish,encyclopedia:fishEncyclopediaData,baits:baitData,rods:rodData,tackle:ShuTackle,legendary:ShuRegional.legendary,finalReady:ShuRegional.finalReady})');
const value=(w,id)=>w.document.querySelector('#'+id);
function choose(w,id,selected){const control=value(w,id);control.value=selected;control.dispatchEvent(new w.Event('change',{bubbles:true}));}

test('the notes reuse all 55 ordinary fish and the existing location, time, bait, rod and hook records',()=>{
 const app=boot(),w=app.window;
 try{
  const data=model(w);assert.equal(data.fish.length,55);
  for(const f of data.fish){
   assert.equal(Regional.legendary(f.id),false);
   const original=read(w,'fishEncyclopediaData['+JSON.stringify(f.id)+']');
   assert.equal(f.locations,original.locations);assert.equal(f.time,original.time);
   assert.equal(f.ecology,original.ecology);assert.equal(f.tip,original.tip);
   assert.deepEqual(f.baits,read(w,'fishEncyclopediaData['+JSON.stringify(f.id)+'].baits.map(id=>baitData[id]?.name).filter(Boolean)'));
   assert.deepEqual(f.rods,read(w,'fishEncyclopediaData['+JSON.stringify(f.id)+'].rods.map(id=>rodData[id]?.name).filter(Boolean)'));
   assert.ok(f.hook&&f.hook!=='記録なし');
  }
  assert.deepEqual(app.errors,[]);
 }finally{app.dispose();}
});
test('clues follow actual visits and catches, keep unknown names hidden and never announce ordinary completion',()=>{
 const app=boot({...seed(),caught:{},lakeStory:{version:2,introSeen:true,visited:{}}}),w=app.window;
 try{
  assert.deepEqual(model(w).clues.map(c=>c.id),['nushi']);
  w.eval('s.lakeStory.visited.stream=true;s.lakeStory.visited.coast=true;s.lakeStory.visited.cave=true');
  const before=read(w,'s'),candidates=Regional.candidates(before,'mountain-stream-deep','day');
  assert.deepEqual(model(w).clues.map(c=>c.id),['nushi','streamNushi','coastNushi','caveNushi']);
  assert.doesNotMatch(JSON.stringify(model(w).clues.map(c=>[c.name,c.tip])),/渓流のヌシ|沿岸のヌシ|地底湖のヌシ|星降るヌシ/);
  assert.deepEqual(read(w,'s'),before);assert.deepEqual(Regional.candidates(read(w,'s'),'mountain-stream-deep','day'),candidates);
  w.eval('s.caught={streamNushi:1,coastNushi:1,caveNushi:1}');
  assert.ok(model(w).clues.some(c=>c.id==='starNushi'));
  assert.equal(model(w).clues.find(c=>c.id==='streamNushi').name,'渓流のヌシ');
  assert.equal(model(w).clues.find(c=>c.id==='starNushi').name,'夜の湖');
  assert.doesNotMatch(JSON.stringify(model(w).clues),/星降るヌシ/);
 }finally{app.dispose();}
});
test('reading, filtering and selecting an uncaught fish changes no saved game state, supplies or discovery',()=>{
 const app=boot({...seed(),caught:{},extraFuture:{keep:'notes'}}),w=app.window;
 try{
  w.openLakeStory();const before=read(w,'s'),saved=w.localStorage.getItem(saveKey);
  click(w,'lakeStoryResearch');assert.equal(value(w,'lakeStoryReading').hidden,true);
  assert.match(value(w,'lakeResearchDetail').textContent,/アワセ/);
  choose(w,'lakeResearchFish','buri');assert.equal(value(w,'lakeResearchTitle').textContent,'ブリ');
  assert.match(value(w,'lakeResearchDetail').textContent,/自分の図鑑への登録は、釣り上げてから/);
  for(const region of ['lake','river','sea','all']){
   choose(w,'lakeResearchHabitat',region);
   const ids=[...value(w,'lakeResearchFish').options].map(o=>o.value);
   assert.ok(ids.length);assert.ok(ids.every(id=>region==='all'||model(w).fish.find(f=>f.id===id).habitats.includes(region)));
  }
  click(w,'lakeResearchClues');click(w,'lakeResearchBasics');
  assert.deepEqual(read(w,'s'),before);assert.equal(w.localStorage.getItem(saveKey),saved);
  click(w,'lakeStoryMemories');assert.equal(value(w,'lakeResearchPanel').hidden,true);
  assert.deepEqual(read(w,'s'),before);assert.deepEqual(app.errors,[]);
 }finally{app.dispose();}
});
test('the map returns to the same research page, while close and B still return to Sam or the fishdex',()=>{
 const app=boot(),w=app.window;
 try{
  for(const source of ['store','record']){
   if(source==='store')w.renderSamShop();w.open(source);
   click(w,source==='store'?'samStoryOffer':'fishdexStoryOffer');click(w,'lakeStoryResearch');
   choose(w,'lakeResearchFish','funa');click(w,'villageGuideJournal');
   assert.equal(value(w,'fieldGuide').classList.contains('open'),true);
   click(w,'fieldGuideClose');assert.equal(value(w,'lakeResearchPanel').hidden,false);
   assert.equal(value(w,'lakeResearchTitle').textContent,'フナ');
   w.backAction();assert.equal(value(w,source).classList.contains('open'),true);w.close();
  }
  assert.deepEqual(app.errors,[]);
 }finally{app.dispose();}
});
test('keyboard focus stays in the visible notebook section and includes the native fish selectors',()=>{
 const app=boot(),w=app.window;
 try{
  w.openLakeStory();click(w,'lakeStoryResearch');
  const article=value(w,'lakeResearchArticle'),first=value(w,'villageGuideJournal');
  article.focus();article.dispatchEvent(new w.KeyboardEvent('keydown',{key:'Tab',bubbles:true,cancelable:true}));
  assert.equal(w.document.activeElement,first);
  first.dispatchEvent(new w.KeyboardEvent('keydown',{key:'Tab',shiftKey:true,bubbles:true,cancelable:true}));
  assert.equal(w.document.activeElement,article);
  assert.equal(value(w,'lakeResearchFish').disabled,false);assert.equal(value(w,'lakeResearchPanel').hidden,false);
 }finally{app.dispose();}
});
test('all text is rendered as text and an empty or future catalogue fails safely without mutating it',()=>{
 const app=boot(),w=app.window;
 try{
  const data={fish:[{id:'sample',name:'<img src=x onerror=alert(1)>',habitats:[],locations:'<script>bad</script>',time:'記録なし',baits:[],rods:[],hook:'記録なし',tip:'<b>メモ</b>',ecology:'<svg></svg>'}],clues:[],basics:[],habitats:{}};
  w.openLakeStory();click(w,'lakeStoryResearch');
  const view=Notes.create(value(w,'lakeResearchPanel')),before=JSON.stringify(data);view.show(data);
  choose(w,'lakeResearchFish','sample');
  assert.equal(value(w,'lakeResearchTitle').textContent,data.fish[0].name);
  assert.equal(value(w,'lakeResearchDetail').querySelector('script,img,svg'),null);
  assert.equal(JSON.stringify(data),before);
  view.show({...data,fish:[]});choose(w,'lakeResearchHabitat','sea');
  assert.equal(value(w,'lakeResearchFish').disabled,true);assert.match(value(w,'lakeResearchDetail').textContent,/記録はまだない/);
 }finally{app.dispose();}
});
