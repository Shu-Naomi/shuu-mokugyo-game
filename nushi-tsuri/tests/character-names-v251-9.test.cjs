const {test}=require('node:test'),assert=require('node:assert/strict');
const O=require('../player-options.js'),Slots=require('../save-slots.js');
const {boot,seed,read,saveKey}=require('./game-harness.cjs');
const click=(w,q)=>{const el=w.document.querySelector(q);assert.ok(el,q);el.click();};
const rename=(w,id,n)=>{click(w,`[data-name-target="${id}"]`);const hero=id==='player',el=w.document.querySelector(hero?'#optionsPlayerName':'#optionsDogName');el.value=n;el.dispatchEvent(new w.Event('input',{bubbles:true}));w.document.querySelector(hero?'#optionsNameForm':'#optionsDogNameForm').dispatchEvent(new w.Event('submit',{cancelable:true,bubbles:true}));};
const progress=w=>{const a=read(w,'s');for(const k of ['playerName','dogNames','dog'])delete a[k];return a;};
const names={player:'星の旅人♡',shuu:'こむぎ',riku:'風太',grey:'夜空🐾'};

test('Japanese graphemes, emoji and spacing work; blank, invisible and oversized names are rejected',()=>{
 assert.equal(O.name('  か\u3099おみ  '),'がおみ');
 for(const n of ['星の旅人','Grey Jr.','こむぎ♡','👩‍👩‍👧‍👦'.repeat(12),'あ'.repeat(12)])assert.equal(O.validName(n),true,n);
 for(const n of ['', '　 ', '\u200b\u2060', '\u200d', '\u0301', 'あ'.repeat(13)])assert.equal(O.validName(n),false,n);
 assert.equal(O.name('a\n\u202eb'),'ab');assert.deepEqual(O.dogNames(null),{shuu:'シュウ',riku:'リク',grey:'Grey'});assert.deepEqual(O.dogNames(['wrong']),O.defaultDogNames);
 assert.deepEqual(O.dogNames({shuu:'　',riku:12,grey:' 夜空 '}),{shuu:'シュウ',riku:'リク',grey:'夜空'});
});

test('legacy title reading keeps raw data; defaults, gender, progression and IDs remain intact',()=>{
 const old={...seed(),avatar:'girl',dog:'grey',dogFollowing:false,dogAffinity:{shuu:440,riku:215,grey:982},dogTricks:{shuu:72,riku:26,grey:492},extraFuture:{retain:7}},a=boot(old,undefined,{start:false}),w=a.window;
 try{assert.equal(w.localStorage.getItem(saveKey),JSON.stringify(old));assert.deepEqual(read(w,'s.dogNames'),O.defaultDogNames);require('./title-test-flow.cjs')(w);const before=progress(w);w.openOptions();assert.equal(w.document.querySelector('#optionsPlayerName').value,'旅人');for(const id of ['shuu','riku','grey'])assert.equal(read(w,`dogName('${id}')`),O.defaultDogNames[id]);w.closeOptions();assert.deepEqual(progress(w),before);assert.equal(read(w,'s.dog'),'grey');assert.equal(read(w,'s.dogFollowing'),false);assert.deepEqual(a.errors,[]);}finally{a.dispose();}
});

test('repeated renames and duplicate display names preserve all progression and resume by original dog IDs',()=>{
 const a=boot({...seed(),avatar:'girl',dogTricks:{shuu:43,riku:211,grey:900}}),w=a.window;let saved;
 try{const before=progress(w),dog=read(w,'s.dog');w.openOptions();for(const [id,n] of Object.entries(names))rename(w,id,n);for(const id of ['shuu','riku','grey'])rename(w,id,'同じ名前');assert.equal(read(w,'dogIds.length'),3);for(const id of ['shuu','riku','grey'])rename(w,id,names[id]);assert.deepEqual(progress(w),before);assert.equal(read(w,'s.dog'),dog);assert.deepEqual(read(w,'dogIds'),['shuu','riku','grey']);saved=JSON.parse(w.localStorage.getItem(saveKey));assert.deepEqual(a.errors,[]);}finally{a.dispose();}
 const b=boot(saved,undefined,{url:'http://localhost/nushi-tsuri/?play=1&avatar=boy&playerName=ignore'});try{assert.equal(read(b.window,'s.playerName'),names.player);assert.equal(read(b.window,'s.avatar'),'girl');assert.deepEqual(read(b.window,'s.dogNames'),saved.dogNames);assert.equal(read(b.window,'s.dog'),saved.dog);assert.deepEqual(b.errors,[]);}finally{b.dispose();}
});

test('favorite selection and resume keep leave-at-home state and all stats',()=>{
 const a=boot({...seed(),dog:'shuu',dogFollowing:false}),w=a.window;let saved;
 try{const before=progress(w);w.openOptions();rename(w,'grey',names.grey);click(w,'[data-favorite-dog="grey"]');assert.equal(read(w,'s.dog'),'grey');assert.equal(read(w,'s.dogFollowing'),false);assert.deepEqual(progress(w),before);assert.equal(w.document.querySelector('[data-favorite-dog="grey"]').getAttribute('aria-pressed'),'true');saved=JSON.parse(w.localStorage.getItem(saveKey));assert.deepEqual(a.errors,[]);}finally{a.dispose();}
 const b=boot(saved);try{assert.equal(read(b.window,'s.dog'),'grey');assert.equal(read(b.window,'s.dogFollowing'),false);assert.deepEqual(b.errors,[]);}finally{b.dispose();}
});

test('walking, care, story, rescue and catch-memory catalog use current names',()=>{
 const a=boot(),w=a.window;
 try{w.openOptions();for(const [id,n] of Object.entries(names))rename(w,id,n);click(w,'[data-favorite-dog="riku"]');w.closeOptions();assert.equal(w.document.querySelector('#statusAvatar').textContent,`${names.player} · 男`);assert.equal(w.document.querySelector('#statusDog').textContent,names.riku);w.eval('renderInventory()');assert.equal(w.document.querySelector('#equipmentDog').textContent,names.riku);w.openDogCare('grey');assert.equal(w.document.querySelector('#dogCareName').textContent,names.grey);assert.match(w.document.querySelector('#dogCareDogs').textContent,/こむぎ.*風太.*夜空/s);w.close();w.eval('openLakeIntro(true);lakeIntroIndex=3;renderLakeIntro()');assert.match(w.document.querySelector('#lakeIntroPaper').textContent,new RegExp(names.riku));click(w,'#lakeIntroSkip');for(const id of ['shuu','riku','grey'])assert.match(w.eval(`s.dog='${id}';dogRescueReward().message`),new RegExp(names[id]));assert.equal(read(w,'catchMemoryCatalog.dogs.shuu.name'),names.shuu);assert.deepEqual(a.errors,[]);}finally{a.dispose();}
});

test('contest stage and results resolve renamed IDs while saved sessions, scores and names remain unchanged',()=>{
 const a=boot({...seed(),dogAffinity:{shuu:900}}),w=a.window;
 try{w.eval('petUi.open("shop")');click(w,'[data-pet-tab="contests"]');click(w,'[data-pet-action="enter"]');const session=read(w,'s.petLife.contest');assert.equal(session.subject,'shuu');click(w,'[data-pet-action="close"]');w.openOptions();rename(w,'shuu','こむぎ');rename(w,'player','直美');w.closeOptions();assert.deepEqual(read(w,'s.petLife.contest'),session);w.eval('petUi.open("shop")');assert.equal(w.document.querySelector('.pet-stage-name').textContent,'こむぎ');for(let i=0;i<3;i++)click(w,'[data-pet-action="contest-next"]');assert.match(w.document.querySelector('.pet-contest-result h3').textContent,/こむぎ/);assert.match(w.document.querySelector('.pet-standings').textContent,/直美 · こむぎ/);const result=read(w,'s.petLife.lastResult');assert.equal(result.name,session.name);assert.equal(result.subject,'shuu');click(w,'[data-pet-action="close"]');w.openOptions();rename(w,'shuu','星あかり');w.closeOptions();w.eval('petUi.open("shop")');click(w,'[data-pet-tab="contests"]');assert.match(w.document.querySelector('#petContestParticipant').textContent,/星あかり/);assert.match(w.document.querySelector('.pet-contest-result h3').textContent,/星あかり/);assert.deepEqual(read(w,'s.petLife.lastResult'),result);assert.deepEqual(a.errors,[]);}finally{a.dispose();}
});

test('title options change only the selected slot and retain its unknown legacy data and progress',()=>{
 const first={...seed(),playerName:'一人目',dogNames:{shuu:'一の犬'},extra:{v:1}},second={...seed(),playerName:'二人目',avatar:'girl',money:9876,dog:'riku',dogFollowing:false,extra:{v:2}},a=boot(first,undefined,{start:false,storage:{[Slots.keys[2]]:second}}),w=a.window;
 try{const raw=w.localStorage.getItem(saveKey);click(w,'#titleContinue');click(w,'[data-save-slot="2"]');click(w,'#titleOptions');rename(w,'player','二の主人公');rename(w,'shuu','二の犬');click(w,'[data-favorite-dog="grey"]');w.closeOptions();const changed=JSON.parse(w.localStorage.getItem(Slots.keys[2]));assert.equal(changed.playerName,'二の主人公');assert.equal(changed.dogNames.shuu,'二の犬');assert.equal(changed.dog,'grey');assert.equal(changed.dogFollowing,false);const a={...changed},b={...second};for(const key of ['playerName','dogNames','dog']){delete a[key];delete b[key];}assert.deepEqual(a,b);assert.equal(w.localStorage.getItem(saveKey),raw);click(w,'[data-save-slot="1"]');assert.match(w.document.querySelector('[data-dog="shuu"]').textContent,/一の犬/);}finally{a.dispose();}
});

test('invalid names leave the save alone; markup is literal in dog care and saved logs',()=>{
 const a=boot(),w=a.window;
 try{w.openOptions();const raw=w.localStorage.getItem(saveKey);for(const n of ['', '　', '\u200b', 'あ'.repeat(13)]){rename(w,'shuu',n);assert.equal(w.localStorage.getItem(saveKey),raw);}rename(w,'shuu','<img src=x>');w.closeOptions();w.openDogCare('shuu');assert.equal(w.document.querySelector('#dogCareDogs img'),null);assert.match(w.document.querySelector('#dogCareDogs').textContent,/<img src=x>/);w.takeDogFishing();w.eval('renderRecord()');assert.equal(w.document.querySelector('#log img'),null);assert.match(w.document.querySelector('#log').textContent,/<img src=x>/);assert.deepEqual(a.errors,[]);}finally{a.dispose();}
});

test('storage failure rolls back both names and favorite selection, then a retry persists',()=>{
 const a=boot(),w=a.window,write=w.Storage.prototype.setItem;
 try{w.openOptions();const before=read(w,'s'),raw=w.localStorage.getItem(saveKey);w.Storage.prototype.setItem=()=>{throw Error('quota');};rename(w,'grey','未保存');assert.match(w.document.querySelector('#optionsNotice').textContent,/名前を保存できなかった/);click(w,'[data-favorite-dog="grey"]');assert.match(w.document.querySelector('#optionsNotice').textContent,/お気に入りを保存できなかった/);assert.deepEqual(read(w,'s'),before);assert.equal(w.localStorage.getItem(saveKey),raw);w.Storage.prototype.setItem=write;rename(w,'grey','保存成功');click(w,'[data-favorite-dog="grey"]');assert.equal(read(w,'s.dogNames.grey'),'保存成功');assert.equal(read(w,'s.dog'),'grey');assert.deepEqual(a.errors,[]);}finally{w.Storage.prototype.setItem=write;a.dispose();}
});

test('IME Enter does not save an unfinished name; closing discards unsubmitted input',()=>{
 const a=boot(),w=a.window;
 try{w.openOptions();click(w,'[data-name-target="shuu"]');const el=w.document.querySelector('#optionsDogName'),form=w.document.querySelector('#optionsDogNameForm');el.value='変換中';el.dispatchEvent(new w.Event('compositionstart',{bubbles:true}));assert.equal(el.dispatchEvent(new w.KeyboardEvent('keydown',{key:'Enter',isComposing:true,cancelable:true,bubbles:true})),false);form.dispatchEvent(new w.Event('submit',{cancelable:true}));assert.equal(read(w,'s.dogNames.shuu'),'シュウ');el.dispatchEvent(new w.Event('compositionend',{bubbles:true}));form.dispatchEvent(new w.Event('submit',{cancelable:true}));assert.equal(read(w,'s.dogNames.shuu'),'変換中');el.value='まだ保存しない';w.closeOptions();w.openOptions();click(w,'[data-name-target="shuu"]');assert.equal(el.value,'変換中');assert.deepEqual(a.errors,[]);}finally{a.dispose();}
});

test('pending deletion blocks renames and favorites; damaged saves cannot be replaced by name editing',()=>{
 const a=boot(),w=a.window;
 try{w.openOptions();click(w,'[data-delete-save="1"]');const raw=w.localStorage.getItem(saveKey);rename(w,'shuu','停止');click(w,'[data-favorite-dog="grey"]');assert.equal(w.localStorage.getItem(saveKey),raw);assert.equal(read(w,'s.dogNames.shuu'),'シュウ');assert.equal(read(w,'s.dog'),'shuu');assert.deepEqual(a.errors,[]);}finally{a.dispose();}
 const b=boot(null,undefined,{start:false,storage:{[saveKey]:'{damaged'}});try{click(b.window,'#titleOptions');assert.equal(b.window.document.querySelector('#optionsRename').disabled,true);assert.equal(b.window.document.querySelector('[data-favorite-dog="grey"]').disabled,true);assert.equal(b.window.localStorage.getItem(saveKey),'{damaged');assert.deepEqual(b.errors,[]);}finally{b.dispose();}
});
