const {test}=require('node:test'),assert=require('node:assert/strict');
const {boot,seed,read,saveKey}=require('./game-harness.cjs'),enter=require('./title-test-flow.cjs');
const Slots=require('../save-slots.js'),O=require('../player-options.js'),T=require('../title-flow.js');
const click=(w,q)=>w.document.querySelector(q).click();
const input=(w,value)=>{const e=w.document.querySelector('#titlePlayerName');e.value=value;e.dispatchEvent(new w.Event('input',{bubbles:true}));};
const phase=w=>w.document.querySelector('#title').dataset.phase;
function character(w,slot=1){click(w,'#titleNew');click(w,`[data-save-slot="${slot}"]`);click(w,'#titleSlotsNext');}
function confirm(w){click(w,'#titleCharacterNext');click(w,'#titleDogsNext');}

test('title draft reuses PR266 validation and contains no progression or storage payload',()=>{
 assert.deepEqual(T.draft(O),{avatar:'boy',playerName:'旅人',dog:'riku'});
 assert.deepEqual(T.choices({avatar:'girl',playerName:' か\u3099おみ ',dog:'grey',money:999},O),{avatar:'girl',playerName:'がおみ',dog:'grey'});
 for(const v of [{avatar:'unknown',dog:'grey',playerName:'名'},{avatar:'boy',dog:'Grey',playerName:'名'},{avatar:'boy',dog:'riku',playerName:'　'},{avatar:'boy',dog:'riku',playerName:'あ'.repeat(13)}])assert.equal(T.choices(v,O),null);
});
test('empty Continue explains no saves and all title choices stay read only',()=>{
 const a=boot(null,undefined,{start:false}),w=a.window;
 try{assert.equal(phase(w),'menu');click(w,'#titleContinue');assert.match(w.document.querySelector('#titleEmptyNote').textContent,/まだセーブがない/);assert.equal(w.document.querySelector('#titleResume').disabled,true);click(w,'[data-title-panel="slots"] [data-title-back]');click(w,'#titleOptions');w.closeOptions();assert.equal(w.localStorage.getItem(saveKey),null);assert.equal(w.localStorage.getItem(Slots.keys[2]),null);assert.deepEqual(a.errors,[]);}finally{a.dispose();}
});
test('new girl and Grey commit into slot one with all three dogs intact, then resume',()=>{
 const a=boot(null,undefined,{start:false}),w=a.window;let saved;
 try{character(w);input(w,' 直美♡ ');click(w,'[data-avatar="girl"]');assert.equal(w.localStorage.getItem(saveKey),null);click(w,'#titleCharacterNext');click(w,'[data-dog="grey"]');click(w,'#titleDogsNext');assert.match(w.document.querySelector('#titleConfirmIdentity').textContent,/直美♡.*女/);assert.equal(w.localStorage.getItem(saveKey),null);click(w,'#start');assert.equal(read(w,'gameStarted'),true);saved=JSON.parse(w.localStorage.getItem(saveKey));assert.equal(saved.playerName,'直美♡');assert.equal(saved.avatar,'girl');assert.equal(saved.dog,'grey');assert.deepEqual(Object.keys(saved.dogAffinity),['shuu','riku','grey']);assert.equal(saved.petLife.version,6);assert.equal(read(w,'fish.length'),60);assert.deepEqual(a.errors,[]);}finally{a.dispose();}
 const b=boot(saved);try{assert.equal(read(b.window,'s.playerName'),'直美♡');assert.equal(read(b.window,'s.avatar'),'girl');assert.equal(read(b.window,'s.dog'),'grey');assert.deepEqual(read(b.window,'s.dogNames'),O.defaultDogNames);assert.deepEqual(b.errors,[]);}finally{b.dispose();}
});
test('back, Escape and cancellation retain the draft and preserve the other save byte for byte',()=>{
 const old={...seed(),playerName:'残す人',extra:{keep:true}},a=boot(old,undefined,{start:false}),w=a.window;
 try{const raw=w.localStorage.getItem(saveKey);character(w,2);input(w,'星の旅人');click(w,'[data-avatar="girl"]');click(w,'#titleCharacterNext');click(w,'[data-dog="shuu"]');click(w,'#titleDogsNext');click(w,'[data-title-panel="confirm"] [data-title-back]');assert.equal(phase(w),'dogs');w.document.querySelector('#title').dispatchEvent(new w.KeyboardEvent('keydown',{key:'Escape',bubbles:true}));assert.equal(phase(w),'character');assert.equal(w.document.querySelector('#titlePlayerName').value,'星の旅人');click(w,'[data-title-panel="character"] [data-title-cancel]');assert.equal(phase(w),'menu');w.dispatchEvent(new w.Event('pagehide'));assert.equal(w.localStorage.getItem(saveKey),raw);assert.equal(w.localStorage.getItem(Slots.keys[2]),null);assert.deepEqual(a.errors,[]);}finally{a.dispose();}
});
test('blank and oversized names stop the flow; twelve emoji and literal markup use PR266 rules',()=>{
 const a=boot(null,undefined,{start:false}),w=a.window;
 try{character(w);for(const n of ['　','\u200b','あ'.repeat(13)]){input(w,n);click(w,'#titleCharacterNext');assert.equal(phase(w),'character');assert.match(w.document.querySelector('#saveSlotNotice').textContent,/1〜12/);assert.equal(w.localStorage.getItem(saveKey),null);}input(w,'👩‍👩‍👧‍👦'.repeat(12));confirm(w);assert.equal(w.document.querySelector('#start').disabled,false);click(w,'[data-title-panel="confirm"] [data-title-back]');click(w,'[data-title-panel="dogs"] [data-title-back]');input(w,'<img src=x>');confirm(w);assert.equal(w.document.querySelector('#titleConfirmIdentity img'),null);assert.match(w.document.querySelector('#titleConfirmIdentity').textContent,/<img src=x>/);assert.deepEqual(a.errors,[]);}finally{a.dispose();}
});
test('IME composition Enter and submit do not advance until conversion ends',()=>{
 const a=boot(null,undefined,{start:false}),w=a.window;
 try{character(w);input(w,'変換中');const e=w.document.querySelector('#titlePlayerName');e.dispatchEvent(new w.Event('compositionstart'));assert.equal(e.dispatchEvent(new w.KeyboardEvent('keydown',{key:'Enter',isComposing:true,bubbles:true,cancelable:true})),false);click(w,'#titleCharacterNext');assert.equal(phase(w),'character');e.dispatchEvent(new w.Event('compositionend'));click(w,'#titleCharacterNext');assert.equal(phase(w),'dogs');assert.equal(w.localStorage.getItem(saveKey),null);assert.deepEqual(a.errors,[]);}finally{a.dispose();}
});
test('full and corrupt slots cannot start new; settings and cancel never delete them',()=>{
 const old=seed(),a=boot(old,undefined,{start:false,storage:{[Slots.keys[2]]:'{broken'}}),w=a.window;
 try{click(w,'#titleNew');assert.match(w.document.querySelector('#titleEmptyNote').textContent,/空きセーブがない/);for(const id of [1,2])assert.equal(w.document.querySelector(`[data-save-slot="${id}"]`).disabled,true);click(w,'#titleSlotsNext');assert.equal(phase(w),'slots');click(w,'#titleSlotsSettings');click(w,'#optionsClose');assert.equal(w.localStorage.getItem(saveKey),JSON.stringify(old));assert.equal(w.localStorage.getItem(Slots.keys[2]),'{broken');assert.deepEqual(a.errors,[]);}finally{a.dispose();}
});
test('a slot filled in another tab during creation is never overwritten',()=>{
 const a=boot(null,undefined,{start:false}),w=a.window;
 try{character(w);input(w,'新しい人');confirm(w);const raw=JSON.stringify({...seed(),money:98765});w.localStorage.setItem(saveKey,raw);click(w,'#start');assert.equal(read(w,'gameStarted'),false);assert.equal(w.localStorage.getItem(saveKey),raw);assert.equal(phase(w),'slots');assert.match(w.document.querySelector('#saveSlotNotice').textContent,/上書きせず/);w.dispatchEvent(new w.Event('pagehide'));assert.equal(w.localStorage.getItem(saveKey),raw);assert.deepEqual(a.errors,[]);}finally{a.dispose();}
});
test('failed first save stays at confirmation, cannot autosave on unload, and can retry',()=>{
 const a=boot(null,undefined,{start:false}),w=a.window,write=w.Storage.prototype.setItem;
 try{character(w);input(w,'再挑戦');confirm(w);w.Storage.prototype.setItem=function(key,value){if(key===saveKey)throw Error('quota');return write.call(this,key,value);};click(w,'#start');assert.equal(read(w,'gameStarted'),false);assert.equal(phase(w),'confirm');assert.match(w.document.querySelector('#saveSlotNotice').textContent,/開始できなかった/);w.dispatchEvent(new w.Event('pagehide'));assert.equal(w.localStorage.getItem(saveKey),null);w.Storage.prototype.setItem=write;click(w,'#start');assert.equal(read(w,'gameStarted'),true);assert.equal(JSON.parse(w.localStorage.getItem(saveKey)).playerName,'再挑戦');assert.deepEqual(a.errors,[]);}finally{w.Storage.prototype.setItem=write;a.dispose();}
});
test('Continue reloads a save changed after title load instead of writing stale progress',()=>{
 const a=boot(seed(),undefined,{start:false}),w=a.window;let target;
 try{w.navigateToSaveSlot=url=>{target=url;};const raw=JSON.stringify({...seed(),money:99999,dog:'grey',playerName:'最新'});w.localStorage.setItem(saveKey,raw);enter(w);assert.ok(target);assert.equal(new URL(target).searchParams.get('play'),'1');assert.equal(read(w,'gameStarted'),false);assert.equal(w.localStorage.getItem(saveKey),raw);assert.deepEqual(a.errors,[]);}finally{a.dispose();}
});
test('new adventure reloads a previously loaded slot deleted by another tab and starts with fresh progress',()=>{
 const old={...seed(),playerName:'削除された冒険',money:99999,extra:{old:true}},a=boot(old,undefined,{start:false}),w=a.window;let target;
 try{w.navigateToSaveSlot=url=>{target=url;};w.localStorage.removeItem(saveKey);enter(w,{avatar:'girl',name:'新しい冒険',dog:'grey'});assert.ok(target);assert.equal(read(w,'gameStarted'),false);assert.equal(w.localStorage.getItem(saveKey),null);const u=new URL(target);assert.equal(u.searchParams.get('newGame'),'1');assert.equal(u.searchParams.get('playerName'),'新しい冒険');assert.deepEqual(a.errors,[]);}finally{a.dispose();}
 const b=boot(null,undefined,{url:target}),v=b.window;
 try{assert.equal(read(v,'gameStarted'),true);assert.equal(read(v,'s.playerName'),'新しい冒険');assert.equal(read(v,'s.avatar'),'girl');assert.equal(read(v,'s.dog'),'grey');assert.equal(read(v,'s.money'),300);assert.deepEqual(read(v,'s.caught'),{});assert.equal(v.eval('s.extra'),undefined);assert.equal(read(v,'s.dogAffinity.shuu'),0);assert.deepEqual(b.errors,[]);}finally{b.dispose();}
});
test('new-game navigation stops at an occupied slot; legacy Continue retains identity and upbringing',()=>{
 const old={...seed(),avatar:'girl',playerName:'先客',dog:'grey',dogNames:{shuu:'こむぎ',riku:'風太',grey:'夜空'},dogFollowing:false,dogTricks:{shuu:321,riku:123,grey:456},extra:{keep:1}},url='http://localhost/nushi-tsuri/?play=1&newGame=1&playerName=新人&avatar=boy&dog=shuu';
 const a=boot(old,undefined,{start:false,url}),w=a.window;
 try{assert.equal(read(w,'gameStarted'),false);assert.equal(w.localStorage.getItem(saveKey),JSON.stringify(old));assert.match(w.document.querySelector('#saveSlotNotice').textContent,/上書きせず/);enter(w);assert.equal(read(w,'s.playerName'),'先客');assert.equal(read(w,'s.avatar'),'girl');assert.equal(read(w,'s.dog'),'grey');assert.equal(read(w,'s.dogFollowing'),false);assert.deepEqual(read(w,'s.dogTricks'),old.dogTricks);assert.deepEqual(read(w,'s.dogNames'),old.dogNames);assert.deepEqual(read(w,'s.extra'),old.extra);assert.deepEqual(a.errors,[]);}finally{a.dispose();}
});
test('writeNew guards occupied roots and title URL removes launch-only flags',()=>{
 for(const raw of ['{}','null','[]','{broken']){const map=new Map([[saveKey,raw]]),store=Slots.create(()=>({getItem:k=>map.get(k)??null,setItem:(k,v)=>map.set(k,v)}));assert.equal(store.writeNew(1,{money:300}),false);assert.equal(map.get(saveKey),raw);}
 const u=new URL(Slots.titleUrl('https://example.test/?play=1&newGame=1&avatar=girl&dog=grey&playerName=x&v=252-1',2));assert.equal(u.search,'?v=252-1&saveSlot=2');
});
test('title keyboard controls cannot move the loaded world or open its menus',()=>{
 const a=boot(seed(),undefined,{start:false}),w=a.window;
 try{const before=read(w,'s'),raw=w.localStorage.getItem(saveKey);for(const key of ['ArrowUp','ArrowLeft','z','m','Enter','Escape'])w.dispatchEvent(new w.KeyboardEvent('keydown',{key,bubbles:true,cancelable:true}));assert.deepEqual(read(w,'s'),before);assert.equal(w.document.querySelector('.modal.open'),null);assert.equal(w.localStorage.getItem(saveKey),raw);assert.deepEqual(a.errors,[]);}finally{a.dispose();}
});
test('first-save guards reject a slot filled between the final choice and the storage write',()=>{
 const a=boot(null,undefined,{start:false}),w=a.window;
 try{character(w);confirm(w);const raw=JSON.stringify({...seed(),money:99999});w.eval(`{
   const original=saveSlots.writeNew;
   saveSlots.writeNew=(slot,data)=>{localStorage.setItem('nushi-inugoya-v2',${JSON.stringify(raw)});return original(slot,data);};
 }`);click(w,'#start');assert.equal(read(w,'gameStarted'),false);assert.equal(w.localStorage.getItem(saveKey),raw);assert.deepEqual(a.errors,[]);}finally{a.dispose();}
});
