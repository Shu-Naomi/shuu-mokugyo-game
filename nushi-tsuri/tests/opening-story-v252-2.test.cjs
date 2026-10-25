const {test}=require('node:test'),assert=require('node:assert/strict');
const Intro=require('../lake-intro.js'),Story=require('../lake-story.js'),O=require('../player-options.js'),Slots=require('../save-slots.js');
const {boot,seed,read,saveKey}=require('./game-harness.cjs'),enter=require('./title-test-flow.cjs');
const click=(w,q)=>w.document.querySelector(q).click(),shown=w=>w.document.querySelector('#lakeIntro').classList.contains('open');
const step=w=>w.eval('ShuLakeIntro.pages[lakeIntroIndex].id');
const resources=w=>read(w,'({money:s.money,hp:s.hp,clock:s.gameMinutes,caught:s.caught,baits:s.baits,dog:s.dog,avatar:s.avatar,playerName:s.playerName,dogNames:s.dogNames,affinity:s.dogAffinity,tricks:s.dogTricks,following:s.dogFollowing,petLife:s.petLife,quests:s.questCompletions,x:s.x,y:s.y})');
const pending=(id='arrival')=>({...seed(),playerName:'湖の旅人',avatar:'girl',dog:'grey',dogFollowing:false,dogNames:{shuu:'こむぎ',riku:'風太',grey:'夜空'},dogTricks:{shuu:321,riku:123,grey:543},extraFuture:{keep:8},lakeStory:{version:2,introVersion:2,introPending:true,introStep:id,introPage:0}});
const rename=(w,id,name)=>{click(w,`[data-name-target="${id}"]`);const player=id==='player',field=w.document.querySelector(player?'#optionsPlayerName':'#optionsDogName');field.value=name;w.document.querySelector(player?'#optionsNameForm':'#optionsDogNameForm').dispatchEvent(new w.Event('submit',{cancelable:true}));};

test('the short script follows the childhood, notebook, refusal, dogs and tentative decision in order',()=>{
 const ids=Intro.pages.map(p=>p.id),at=id=>ids.indexOf(id),all=Intro.pages.flatMap(p=>Intro.text(p,{playerName:'直美'})).join('');
 assert.equal(new Set(ids).size,ids.length);assert.ok(ids.length>=10&&ids.length<=20);
 for(const [a,b] of [['memory','notebook'],['researcher','sam'],['invitation','refusal'],['refusal','puppies'],['puppies','cling'],['cling','care'],['care','decision'],['decision','first-day']])assert.ok(at(a)<at(b),a+' before '+b);
 for(const re of [/子どもの頃/,/何度も/,/生物研究員/,/引退後/,/釣り上げたという頁は見つからない/,/それ、じいさんの手帳/,/あれだけヌシに会いたがって/,/遺品整理に来ただけ/,/人の話、聞いてます/,/くぅん/,/誰が面倒見る/,/ヌシを釣る約束までは/])assert.match(all,re);
 assert.doesNotMatch(all,/この村.*よく知らない|一攫千金|地底湖のヌシ|星降るヌシ/);
});
test('v1 numeric checkpoints migrate to the corresponding scene with other progress intact',()=>{
 for(const [page,id] of ['arrival','notebook','sam','puppies','decision'].entries()){
  const s={...seed(),extraFuture:{keep:true},lakeStory:{version:1,introPending:true,introPage:page,visited:{coast:true},read:['arrival'],selected:'arrival'}},before={...s};delete before.lakeStory;
  Story.normalize(s);assert.equal(s.lakeStory.version,2);assert.equal(s.lakeStory.introVersion,2);assert.equal(s.lakeStory.introStep,id);assert.equal(s.lakeStory.introPending,true);assert.deepEqual(s.lakeStory.read,['arrival']);assert.equal(s.lakeStory.visited.coast,true);const after={...s};delete after.lakeStory;assert.deepEqual(after,before);
  const raw=JSON.stringify(s);Story.normalize(s);assert.equal(JSON.stringify(s),raw);
 }
});
test('stable scene IDs outrank numeric positions and malformed checkpoint fields remain safe',()=>{
 assert.equal(Intro.progress({version:2,introStep:'cling',introPage:999}).introStep,'cling');
 for(const old of [null,[],5,{version:2,introStep:{toString:0},introPage:NaN},{introVersion:{toString:0,valueOf:0},version:{toString:0,valueOf:0},introPage:null}])assert.doesNotThrow(()=>Intro.progress(old));
 assert.equal(Intro.progress({version:2,introStep:'unknown',introPage:-1}).introStep,'arrival');
 const s={lakeStory:{version:1,introSeen:true,introPending:true,introPage:3}};Story.normalize(s);assert.equal(s.lakeStory.introPending,false);assert.equal(s.lakeStory.introSeen,true);
});
test('every live scene is saved and reload resumes that exact scene rather than the first page',()=>{
 const a=boot(null,undefined,{keepIntro:true}),w=a.window,saves=[];
 try{for(let i=0;i<Intro.pages.length;i++){assert.equal(step(w),Intro.pages[i].id);const saved=JSON.parse(w.localStorage.getItem(saveKey));assert.equal(saved.lakeStory.introStep,Intro.pages[i].id);assert.equal(saved.lakeStory.introVersion,2);assert.equal(saved.lakeStory.introPending,true);saves.push(saved);if(i<Intro.pages.length-1)click(w,'#lakeIntroNext');}assert.deepEqual(a.errors,[]);}finally{a.dispose();}
 for(const saved of saves){const b=boot(saved,undefined,{keepIntro:true});try{assert.equal(shown(b.window),true);assert.equal(step(b.window),saved.lakeStory.introStep);assert.deepEqual(b.errors,[]);}finally{b.dispose();}}
});
for(const [i,dog] of ['shuu','riku','grey'].entries())test('the saved '+dog+' and its current name receive the scene, using the saved avatar and all three original dogs',()=>{
 const state={...pending('cling'),dog,avatar:i%2?'boy':'girl'},a=boot(state,undefined,{keepIntro:true}),w=a.window;
 try{assert.equal(step(w),'cling');const before=resources(w),paper=w.document.querySelector('#lakeIntroPaper');assert.equal(paper.querySelector('small').textContent,state.dogNames[dog]);assert.match(paper.textContent,/くぅん/);assert.ok(paper.textContent.includes(state.dogNames[dog]));const canvas=w.document.querySelector('#lakeIntroPicture');assert.equal(canvas.dataset.dog,dog);assert.equal(canvas.dataset.avatar,state.avatar);const ctx=canvas.getContext('2d'),sources=[];ctx.drawImage=im=>sources.push(im._src);w.renderLakeIntro();assert.ok(sources.includes(Intro.art[state.avatar]));for(const id of ['shuu','riku','grey'])assert.ok(sources.includes(Intro.art[id]));assert.deepEqual(resources(w),before);assert.deepEqual(a.errors,[]);}finally{a.dispose();}
});
test('title renames and favorite changes apply to the pending opening while gender, stats and another slot survive',()=>{
 const old={...pending(),lakeStory:{version:1,introPending:true,introPage:3}},second={...seed(),playerName:'もう一人',money:87654},a=boot(old,undefined,{start:false,storage:{[Slots.keys[2]]:second}}),w=a.window;let saved,target;
 try{const raw=w.localStorage.getItem(Slots.keys[2]);w.navigateToSaveSlot=url=>{target=url;};click(w,'#titleOptions');rename(w,'player','直美♡');rename(w,'shuu','こむぎもち');rename(w,'riku','風の子');rename(w,'grey','<img src=x>');click(w,'[data-favorite-dog="grey"]');w.closeOptions();saved=JSON.parse(w.localStorage.getItem(saveKey));assert.equal(saved.lakeStory.introPage,3);assert.equal(saved.lakeStory.version,1);assert.deepEqual(saved.dogTricks,old.dogTricks);assert.equal(w.localStorage.getItem(Slots.keys[2]),raw);enter(w);assert.ok(target);assert.deepEqual(a.errors,[]);}finally{a.dispose();}
 const b=boot(saved,undefined,{url:target,keepIntro:true}),v=b.window;
 try{assert.equal(step(v),'puppies');assert.match(v.document.querySelector('#lakeIntroPaper').textContent,/こむぎもち.*風の子.*<img src=x>/s);assert.equal(v.document.querySelector('#lakeIntroPaper img'),null);click(v,'#lakeIntroNext');assert.equal(step(v),'cling');assert.equal(v.document.querySelector('#lakeIntroPaper small').textContent,'<img src=x>');assert.equal(read(v,'s.avatar'),'girl');assert.equal(read(v,'s.dogFollowing'),false);assert.deepEqual(read(v,'s.dogTricks'),old.dogTricks);assert.deepEqual(read(v,'s.extraFuture'),old.extraFuture);assert.deepEqual(b.errors,[]);}finally{b.dispose();}
});
test('old adventures with no opening, completed flags or inactive cursors are never forced into it',()=>{
 for(const lakeStory of [undefined,{version:1},{version:1,introPage:3,introPending:false},{version:1,introSeen:true,introPending:true},{version:2,introVersion:2,introStep:'care',introSeen:true}]){
  const old={...seed(),lakeStory,extraFuture:{keep:true}},a=boot(old,undefined,{start:false}),w=a.window;
  try{assert.equal(w.localStorage.getItem(saveKey),JSON.stringify(old));enter(w);assert.equal(shown(w),false);assert.equal(read(w,'s.money'),old.money);assert.deepEqual(read(w,'s.caught'),old.caught);assert.deepEqual(read(w,'s.extraFuture'),old.extraFuture);assert.deepEqual(a.errors,[]);}finally{a.dispose();}
 }
});
test('finishing or skipping releases control once, shows a brief objective and never reopens on resume',()=>{
 for(const skip of [true,false]){const a=boot(pending('decision'),undefined,{keepIntro:true}),w=a.window;let saved;
  try{const before=resources(w);if(skip)click(w,'#lakeIntroSkip');else{while(step(w)!=='first-day')click(w,'#lakeIntroNext');click(w,'#lakeIntroNext');}assert.equal(shown(w),false);assert.equal(w.document.querySelector('.controls').inert,false);assert.equal(read(w,'s.lakeStory.introSeen'),true);assert.equal(read(w,'s.lakeStory.introPending'),false);assert.match(w.document.querySelector('#rescueToast').textContent,/家と三匹/);assert.equal(w.finishLakeIntro(),false);assert.deepEqual(resources(w),before);saved=JSON.parse(w.localStorage.getItem(saveKey));assert.deepEqual(a.errors,[]);}finally{a.dispose();}
  const b=boot(saved,undefined,{keepIntro:true});try{assert.equal(shown(b.window),false);assert.deepEqual(b.errors,[]);}finally{b.dispose();}
 }
});
test('rereading uses current names without altering completion, cursor, visited pages or resources',()=>{
 const a=boot({...pending('decision'),lakeStory:{version:1,introSeen:true,visited:{coast:true},read:['arrival']} }),w=a.window;
 try{w.openLakeStory();const before=resources(w),story=read(w,'s.lakeStory');click(w,'#lakeStoryReplayIntro');while(step(w)!=='cling')click(w,'#lakeIntroNext');assert.match(w.document.querySelector('#lakeIntroPaper').textContent,/夜空/);click(w,'#lakeIntroPrevious');click(w,'#lakeIntroSkip');assert.deepEqual(read(w,'s.lakeStory'),story);assert.deepEqual(resources(w),before);assert.equal(w.document.querySelector('#lakeStory').classList.contains('open'),true);assert.deepEqual(a.errors,[]);}finally{a.dispose();}
});
test('failed scene saves show an unsaved notice and recovery persists the current checkpoint',()=>{
 const a=boot(null,undefined,{keepIntro:true}),w=a.window,set=w.Storage.prototype.setItem;
 try{const raw=w.localStorage.getItem(saveKey);w.Storage.prototype.setItem=function(key,value){if(key===saveKey)throw Error('quota');return set.call(this,key,value);};click(w,'#lakeIntroNext');assert.equal(step(w),'memory');assert.equal(w.localStorage.getItem(saveKey),raw);assert.match(w.document.querySelector('#lakeIntroHint').textContent,/未保存/);w.Storage.prototype.setItem=set;click(w,'#lakeIntroNext');assert.equal(JSON.parse(w.localStorage.getItem(saveKey)).lakeStory.introStep,'notebook');assert.equal(w.document.querySelector('#lakeIntroHint').hasAttribute('data-unsaved'),false);assert.deepEqual(a.errors,[]);}finally{w.Storage.prototype.setItem=set;a.dispose();}
});
test('a failed completion save cannot trap control or corrupt the last checkpoint; a later save completes it',()=>{
 const a=boot(pending('first-day'),undefined,{keepIntro:true}),w=a.window,set=w.Storage.prototype.setItem;let last;
 try{last=JSON.parse(w.localStorage.getItem(saveKey));w.Storage.prototype.setItem=function(key,value){if(key===saveKey)throw Error('quota');return set.call(this,key,value);};click(w,'#lakeIntroNext');assert.equal(shown(w),false);assert.equal(w.document.querySelector('.controls').inert,false);assert.equal(w.document.querySelector('#saveStatus').hidden,false);assert.match(w.document.querySelector('#rescueToast').textContent,/未保存/);assert.equal(w.localStorage.getItem(saveKey),JSON.stringify(last));w.Storage.prototype.setItem=set;assert.equal(w.save(),true);assert.equal(JSON.parse(w.localStorage.getItem(saveKey)).lakeStory.introSeen,true);assert.deepEqual(a.errors,[]);}finally{w.Storage.prototype.setItem=set;a.dispose();}
 const b=boot(last,undefined,{keepIntro:true});try{assert.equal(shown(b.window),true);assert.equal(step(b.window),'first-day');assert.deepEqual(b.errors,[]);}finally{b.dispose();}
});
test('reading and painting reuse assets and never manufacture dog IDs or change ending eligibility',()=>{
 const s={...pending('puppies'),caught:{starNushi:1},lakeStory:{version:1,introSeen:true,read:['ending'],selected:'ending'}};Story.normalize(s);assert.equal(Story.completed(s),true);assert.equal(Intro.cast(s).player,s.playerName);assert.deepEqual(Object.keys(Intro.cast(s).names),['shuu','riku','grey']);assert.equal(Intro.art.home,'assets/player-home-interior-v160.webp');assert.equal(Intro.art.sam,'assets/sam-sprites-v199.webp');const before=JSON.stringify(s);for(const p of Intro.pages){Intro.text(p,s);Intro.speaker(p,s);}assert.equal(JSON.stringify(s),before);assert.equal(Story.completed(s),true);
});
