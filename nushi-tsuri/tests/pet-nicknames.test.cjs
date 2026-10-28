const {test}=require('node:test'),assert=require('node:assert/strict');
const P=require('../pet-life.js'),Options=require('../player-options.js');
const {boot,seed,read,saveKey}=require('./game-harness.cjs');
const copy=x=>JSON.parse(JSON.stringify(x)),dogs=['shuu','riku','grey'];
const catalog=[{id:'funa',name:'フナ',min:600,start:1200,max:6000,price:300,waterLabel:'淡水'},{id:'koi',name:'コイ',min:800,start:1600,max:10000,price:500,waterLabel:'淡水'},{id:'moroko',name:'ホンモロコ',min:300,start:800,max:1500,price:200,waterLabel:'淡水'},{id:'buri',name:'ブリ',min:1000,start:9000,max:12499,price:800,waterLabel:'海水'}];
function empty(){const s={money:10000,caught:{funa:1,koi:1,buri:1},petLife:{version:6,fish:[],mutationSeed:'a'.repeat(32)}};P.normalize(s,catalog,dogs,0,{legacy:false});return s;}
const initial=()=>({...seed(),money:10000,x:199,y:36,petLife:{version:6,fish:[],mutationSeed:'a'.repeat(32)}});
function click(w,q){const b=w.document.querySelector(q);assert.ok(b,q);assert.equal(b.disabled,false,q);b.click();}
function type(w,value){const input=w.document.querySelector('#petNickname');assert.ok(input);input.value=value;input.dispatchEvent(new w.Event('input',{bubbles:true}));}
function submit(w){const form=w.document.querySelector('#petNameForm');assert.ok(form);form.dispatchEvent(new w.Event('submit',{bubbles:true,cancelable:true}));}
function owned(){const a=boot(initial()),w=a.window;w.eval('petUi.open("shop")');click(w,'[data-pet-buy="funa"]');click(w,'[data-pet-buy="nijimasu"]');click(w,'[data-pet-action="notebook"]');return a;}
function withoutNames(s){const a=copy(s);for(const f of a.petLife.fish)delete f.nickname;return a;}

test('optional saved nicknames share Unicode rules and do not invent names for old or malformed records',()=>{
 const s=empty();P.acquire(s,'funa',catalog,0);P.acquire(s,'koi',catalog,0);s.petLife.fish[0].nickname='  か\u3099🐟  ';
 const raw=copy(s);P.normalize(s,catalog,dogs,0);assert.equal(s.petLife.fish[0].nickname,'が🐟');assert.equal('nickname' in s.petLife.fish[1],false);assert.equal(s.petLife.version,6);
 for(const value of [null,{},123,'\u202e','あ'.repeat(13),'a'.repeat(513)]){const a=copy(raw);a.petLife.fish[0].nickname=value;P.normalize(a,catalog,dogs,0);assert.equal('nickname' in a.petLife.fish[0],false);assert.equal(a.petLife.fish[0].uid,'pet-1');}
});
test('renaming identifies one fish by immutable UID, bounds graphemes, permits duplicates and changes no other progress',()=>{
 const s=empty();P.acquire(s,'funa',catalog,0);P.acquire(s,'funa',catalog,0);const before=withoutNames(s),family='👨‍👩‍👧‍👦'.repeat(12);
 assert.equal(Options.split(family).length,12);assert.equal(P.renameFish(s,'pet-1',family).ok,true);assert.equal(P.nickname(s.petLife.fish[0]),family);assert.deepEqual(withoutNames(s),before);
 const stable=copy(s);for(const bad of ['あ'.repeat(13),'x'.repeat(513),null,{}]){assert.equal(P.renameFish(s,'pet-1',bad).ok,false);assert.deepEqual(s,stable);}assert.equal(P.renameFish(s,'missing','名前').ok,false);
 P.renameFish(s,'pet-1','ちび');P.renameFish(s,'pet-2','ちび');assert.equal(P.rehome(s,'pet-1',catalog,0).ok,true);assert.equal(s.petLife.fish.length,1);assert.equal(s.petLife.fish[0].uid,'pet-2');assert.equal(s.petLife.fish[0].nickname,'ちび');
 assert.equal(P.renameFish(s,'pet-2','　 ').changed,true);assert.equal('nickname' in s.petLife.fish[0],false);assert.equal(P.individualName(s.petLife.fish[0],catalog),'フナ');assert.equal(P.renameFish(s,'pet-2','').changed,false);
});
test('named parents produce the same real golden Koi hatch and give the newborn its own unnamed identity',()=>{
 const {fixture,day}=require('./aquarium-mutation-koi-fixture.cjs'),a=fixture(),b=copy(a);
 for(const s of [a,b])P.normalize(s,catalog,dogs,day,{deferSync:true});P.renameFish(a,'pet-1','こいパパ');P.renameFish(a,'pet-2','こいママ');
 for(const d of [day,day+1,day+2]){P.sync(a,catalog,d);P.sync(b,catalog,d);}
 assert.deepEqual(withoutNames(a),b);const child=a.petLife.fish.find(f=>f.uid==='pet-6');assert.equal(child.mutation.kind,'gold');assert.equal('nickname' in child,false);assert.equal(child.generation,2);
});
test('a Buri keeps its nickname through growth while stage names, scores and buyback valuation remain independent',()=>{
 const s=empty();P.acquire(s,'buri',catalog,0);const f=P.selected(s);f.length=990;const score=P.fishScore(f),quote=P.buyBackQuote(f,catalog);P.renameFish(s,f.uid,'ぶり丸');
 assert.deepEqual(P.fishScore(f),score);assert.deepEqual(P.buyBackQuote(f,catalog),quote);assert.equal(P.displayName(f,catalog),'モジャコ');f.fedDay=0;P.sync(s,catalog,1);assert.equal(P.displayName(f,catalog),'ワカシ');assert.equal(P.individualName(f,catalog),'ぶり丸');assert.equal(f.uid,'pet-1');
});
test('contest entry and result retain the entry nickname, including full emoji, after another rename and reload',()=>{
 const s=empty();P.acquire(s,'funa',catalog,0);const uid=P.selected(s).uid,name='👨‍👩‍👧‍👦'.repeat(12);P.renameFish(s,uid,name);
 assert.equal(P.beginContest(s,'fish','beginner',uid,0,catalog,[],()=>.5).ok,true);P.normalize(s,catalog,dogs,0);assert.equal(s.petLife.contest.name,name);assert.equal(s.petLife.contest.participant,uid);assert.equal(s.petLife.contest.subject,'funa');
 P.renameFish(s,uid,'あとからの名前');for(let i=0;i<3;i++)P.advanceContest(s);assert.equal(s.petLife.lastResult.name,name);P.normalize(s,catalog,dogs,0);assert.equal(s.petLife.lastResult.name,name);assert.equal(P.selected(s).nickname,'あとからの名前');
});
test('the notebook edits its displayed fish, cancels without writes, and preserves names and species on reload',()=>{
 const a=owned(),w=a.window;let stored;try{
  click(w,'[data-notebook-species="funa"]');const before=read(w,'s'),bytes=w.localStorage.getItem(saveKey);click(w,'[data-pet-name="pet-1"]');type(w,'x');w.document.querySelector('#petNickname').dispatchEvent(new w.KeyboardEvent('keydown',{key:'x',bubbles:true}));assert.ok(w.document.querySelector('#petNameForm'));assert.deepEqual(read(w,'s'),before);click(w,'[data-pet-action="nickname-cancel"]');assert.equal(w.localStorage.getItem(saveKey),bytes);assert.deepEqual(read(w,'s'),before);
  click(w,'[data-pet-name="pet-1"]');w.document.querySelector('#petNickname').value='ふなちゃん🐟';submit(w);assert.equal(read(w,'s.petLife.fish.find(f=>f.uid==="pet-1").nickname'),'ふなちゃん🐟');assert.equal(read(w,'s.petLife.selected'),'pet-2');assert.equal(read(w,'s.petLife.fish[1].nickname??null'),null);assert.match(w.document.querySelector('.pet-notebook-specimen').textContent,/ふなちゃん🐟（フナ） #1/);stored=JSON.parse(w.localStorage.getItem(saveKey));assert.deepEqual(a.errors,[]);
 }finally{a.dispose();}
 const b=boot(stored);try{b.window.eval('petUi.open("notebook")');click(b.window,'[data-notebook-species="funa"]');assert.match(b.window.document.querySelector('.pet-notebook-specimen').textContent,/ふなちゃん🐟（フナ） #1/);click(b.window,'[data-pet-name="pet-1"]');type(b.window,'');submit(b.window);assert.equal(read(b.window,'Object.hasOwn(s.petLife.fish[0],"nickname")'),false);assert.deepEqual(b.errors,[]);}finally{b.dispose();}
});
test('failed name saves restore the previous name, keep the draft and retry once without saving an unchanged name',()=>{
 const a=owned(),w=a.window,proto=w.Storage.prototype,set=proto.setItem;let writes=0;try{
  click(w,'[data-pet-name="pet-2"]');type(w,'にじ丸');const before=read(w,'s'),bytes=w.localStorage.getItem(saveKey);proto.setItem=function(k,v){if(k===saveKey)throw Error('quota');return set.call(this,k,v);};submit(w);assert.deepEqual(read(w,'s'),before);assert.equal(w.localStorage.getItem(saveKey),bytes);assert.equal(w.document.querySelector('#petNickname').value,'にじ丸');assert.match(w.document.querySelector('#petNameError').textContent,/元の愛称を保って/);
  proto.setItem=function(k,v){if(k===saveKey)writes++;return set.call(this,k,v);};submit(w);assert.equal(writes,1);assert.equal(read(w,'s.petLife.fish[1].nickname'),'にじ丸');click(w,'[data-pet-name="pet-2"]');submit(w);assert.equal(writes,1);assert.equal(w.document.querySelector('#petNameForm'),null);
  const counting=proto.setItem;click(w,'[data-pet-name="pet-2"]');type(w,'変更後');proto.setItem=function(k,v){if(k===saveKey)throw Error('quota');return set.call(this,k,v);};submit(w);assert.equal(read(w,'s.petLife.fish[1].nickname'),'にじ丸');assert.equal(JSON.parse(w.localStorage.getItem(saveKey)).petLife.fish[1].nickname,'にじ丸');proto.setItem=counting;click(w,'[data-pet-action="nickname-cancel"]');assert.equal(writes,1);assert.deepEqual(a.errors,[]);
 }finally{proto.setItem=set;a.dispose();}
});
test('IME confirmation does not submit or close the editor; Escape cancels only the name draft',()=>{
 const a=owned(),w=a.window;try{click(w,'[data-pet-name="pet-2"]');type(w,'にじいろ');const bytes=w.localStorage.getItem(saveKey),input=w.document.querySelector('#petNickname');input.dispatchEvent(new w.CompositionEvent('compositionstart',{bubbles:true}));submit(w);input.dispatchEvent(new w.KeyboardEvent('keydown',{key:'Escape',isComposing:true,bubbles:true}));assert.ok(w.document.querySelector('#petNameForm'));assert.equal(w.localStorage.getItem(saveKey),bytes);input.dispatchEvent(new w.CompositionEvent('compositionend',{bubbles:true}));input.dispatchEvent(new w.KeyboardEvent('keydown',{key:'Escape',bubbles:true}));assert.equal(w.document.querySelector('#petNameForm'),null);assert.equal(read(w,'petUi.mode'),'notebook');assert.equal(w.localStorage.getItem(saveKey),bytes);assert.deepEqual(a.errors,[]);}finally{a.dispose();}
});
test('nickname markup stays text in notebook, tank attributes, records and contest choice labels',()=>{
 const a=owned(),w=a.window;try{const name='"><x-x>';click(w,'[data-pet-name="pet-2"]');type(w,name);submit(w);assert.equal(w.document.querySelector('#petLifeModal x-x'),null);assert.match(w.document.querySelector('.pet-notebook-specimen').textContent,/"><x-x>/);w.eval('petUi.open("aquarium")');assert.match(w.document.querySelector('#petTankStage').getAttribute('aria-label'),/"><x-x>/);assert.equal(w.document.querySelector('#petLifeModal x-x'),null);click(w,'[data-pet-action="records"]');assert.match(w.document.querySelector('.pet-record-hero').textContent,/"><x-x>/);click(w,'[data-pet-action="panel-close"]');click(w,'[data-pet-action="shop"]');click(w,'[data-pet-tab="contests"]');const select=w.document.querySelector('#petContestKind');select.value='fish';select.dispatchEvent(new w.Event('change',{bubbles:true}));assert.match(w.document.querySelector('#petContestParticipant').textContent,/"><x-x>/);assert.equal(w.document.querySelector('#petLifeModal x-x'),null);assert.deepEqual(a.errors,[]);}finally{a.dispose();}
});
test('old unknown identities and other adventure slots survive naming from aquarium records and a title reload',()=>{
 const old=initial();old.petLife.fish=[{uid:'pet-9',species:'funa',tank:0,length:1400,bornSize:1400,origin:'shop',health:90,water:100}];const other=JSON.stringify({...initial(),money:7654}),a=boot(old,undefined,{storage:{[saveKey+'-slot2']:other}}),w=a.window;let stored,memo;
 try{w.eval('petUi.open("aquarium")');click(w,'[data-pet-action="records"]');click(w,'[data-pet-name="pet-9"]');type(w,'むかしの子');submit(w);assert.match(w.document.querySelector('.pet-sheet-body').textContent,/性別不明.*世代不明/s);assert.equal(w.localStorage.getItem(saveKey+'-slot2'),other);stored=JSON.parse(w.localStorage.getItem(saveKey));memo=w.localStorage.getItem('nushi-pet-identity-display-v1:'+saveKey);assert.deepEqual(a.errors,[]);}finally{a.dispose();}
 const b=boot(stored,undefined,{start:false,storage:{['nushi-pet-identity-display-v1:'+saveKey]:memo}});try{assert.equal(b.window.localStorage.getItem(saveKey),JSON.stringify(stored));assert.equal(read(b.window,'s.petLife.fish[0].nickname'),'むかしの子');assert.deepEqual(b.errors,[]);}finally{b.dispose();}
});
