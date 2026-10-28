const {test}=require('node:test'),assert=require('node:assert/strict');
const N=require('../pet-notebook.js'),P=require('../pet-life.js'),M=require('../aquarium-mutations.js');
const {boot,seed,read,saveKey}=require('./game-harness.cjs');
const copy=v=>JSON.parse(JSON.stringify(v)),dogs=['shuu','riku','grey'];
const catalog=[{id:'funa',name:'フナ',min:600,start:1200,max:6000,price:300,waterLabel:'淡水'},{id:'koi',name:'コイ',min:800,start:1600,max:10000,price:500,waterLabel:'淡水'},{id:'nushi',name:'ぬし',legendary:true,min:10000,start:20000,max:60000,price:0,waterLabel:'淡水'}];
function empty(){const s={money:10000,caught:{funa:1,koi:1,nushi:1},petLife:{version:6,fish:[],mutationSeed:'a'.repeat(32)}};P.normalize(s,catalog,dogs,0,{legacy:false});return s;}
const initial=()=>({...seed(),money:10000,x:199,y:36,petLife:{version:6,fish:[],mutationSeed:'a'.repeat(32)}});
const click=(w,q)=>{const b=w.document.querySelector(q);assert.ok(b,q);assert.equal(b.disabled,false,q);b.click();return b;};

test('only a successful ordinary fish purchase grants the free notebook, never supplies, an unsuccessful purchase or a free legendary claim',()=>{
 const s=empty();assert.equal(N.owned(s),false);assert.equal(N.canReceive(s,catalog),false);assert.equal(N.grant(s,catalog,0,'existing'),false);
 P.buyFood(s,1);P.buyTank(s);assert.equal(s.petNotebook,undefined);
 s.money=0;assert.equal(P.acquire(s,'funa',catalog,0).ok,false);assert.equal(s.petNotebook,undefined);
 assert.equal(P.acquire(s,'nushi',catalog,0).ok,true);assert.equal(s.petNotebook,undefined);assert.equal(N.canReceive(s,catalog),false);
 s.money=10000;assert.equal(P.acquire(s,'funa',catalog,0,0).ok,true);assert.equal(s.money,9700);assert.equal(N.owned(s),true);assert.equal(s.petNotebook.source,'purchase');assert.deepEqual(s.petNotebook.species.map(r=>r.id).sort(),['funa','nushi']);assert.ok(s.petNotebook.species.every(r=>r.firstRecordedDay===0));
 const received=s.petNotebook.receivedDay;assert.equal(P.acquire(s,'koi',catalog,0,0).ok,true);assert.equal(s.money,9200);assert.equal(s.petNotebook.receivedDay,received);assert.equal(s.petNotebook.species.length,3);
});
test('gift notice is saved before display, retries after failed writes, and cannot announce twice',()=>{
 const s=empty();P.acquire(s,'funa',catalog,0);let writes=0;
 assert.equal(N.acknowledge(s,()=>false),false);assert.equal(s.petNotebook.announced,false);
 assert.equal(N.acknowledge(s,()=>{throw Error('quota');}),false);assert.equal(s.petNotebook.announced,false);
 assert.equal(N.acknowledge(s,()=>{writes++;assert.equal(s.petNotebook.announced,true);return true;}),true);
 assert.equal(N.acknowledge(s,()=>{writes++;return true;}),false);assert.equal(writes,1);
});
test('species pages survive rehoming and reload while the living individuals remain solely in petLife',()=>{
 const s=empty();P.acquire(s,'funa',catalog,0);const uid=s.petLife.selected;assert.equal(P.rehome(s,uid,catalog,0).ok,true);assert.equal(s.petLife.fish.length,0);
 assert.deepEqual(s.petNotebook.species,[{id:'funa',firstRecordedDay:0}]);P.normalize(s,catalog,dogs,0);assert.deepEqual(s.petNotebook.species,[{id:'funa',firstRecordedDay:0}]);assert.equal('fish' in s.petNotebook,false);
});
test('normalization bounds the ledger to catalogue IDs, deduplicates dates and preserves an unknown future notebook',()=>{
 const s=empty();s.petNotebook={version:1,receivedDay:5,announced:true,species:[{id:'funa',firstRecordedDay:1},{id:'funa',firstRecordedDay:7},{id:'__proto__',firstRecordedDay:5},{id:'koi',firstRecordedDay:9000},null]};
 N.normalize(s,catalog,10);assert.deepEqual(s.petNotebook.species,[{id:'funa',firstRecordedDay:5},{id:'koi',firstRecordedDay:10}]);const stable=copy(s.petNotebook);N.normalize(s,catalog,10);assert.deepEqual(s.petNotebook,stable);
 const future={version:7,receivedDay:0,newPages:{id:'unrecognized',note:'kept'}};s.petNotebook=copy(future);P.normalize(s,catalog,dogs,10);assert.deepEqual(s.petNotebook,future);assert.equal(N.owned(s),false);assert.equal(N.grant(s,catalog,10),false);
});
test('recording an existing aquarium and a real golden Koi hatch changes neither breeding, mutation results nor other game progress',()=>{
 const {fixture,day}=require('./aquarium-mutation-koi-fixture.cjs'),a=fixture(),b=copy(a),full=[...catalog,{id:'moroko',name:'モロコ',min:300,start:800,max:1500,price:300,waterLabel:'淡水'}];
 for(const s of [a,b])P.normalize(s,full,dogs,day,{deferSync:true});assert.equal(N.grant(a,full,day,'existing'),true);
 for(const d of [day,day+1,day+2]){P.sync(a,full,d);P.sync(b,full,d);}
 const {petNotebook,...rest}=a;assert.deepEqual(rest,b);assert.equal(a.petLife.fish.find(f=>f.uid==='pet-6').mutation.kind,'gold');assert.equal(a.petLife.version,6);assert.equal(M.RULE_VERSION,1);assert.equal(petNotebook.species.find(r=>r.id==='koi').firstRecordedDay,day);
});
test('the title remains read-only and an old aquarium does not receive the notebook on load',()=>{
 const old=initial();old.petLife.fish=[{uid:'pet-1',species:'funa',tank:0,length:1400,bornSize:1400,origin:'shop',health:90,water:100}];const a=boot(old,undefined,{start:false});try{assert.equal(a.window.localStorage.getItem(saveKey),JSON.stringify(old));assert.equal(read(a.window,'ShuPetNotebook.owned(s)'),false);assert.equal(a.window.document.querySelector('#petNotebookMenu').hidden,true);assert.deepEqual(a.errors,[]);}finally{a.dispose();}
});
test('the first actual shop purchase awards once, shows the gift, and unlocks the field menu without registering a wild catch',()=>{
 const a=boot(initial()),w=a.window;try{const caught=read(w,'s.caught');w.eval('petUi.open("shop")');click(w,'[data-pet-buy="funa"]');assert.match(w.document.querySelector('.pet-message').textContent,/育成ノートをどうぞ/);assert.equal(w.document.querySelector('.pet-message').hidden,false);assert.equal(w.document.querySelector('#petNotebookMenu').hidden,false);assert.equal(read(w,'s.petNotebook.announced'),true);
 click(w,'[data-pet-action="notebook"]');assert.equal(w.document.querySelector('#petLifeTitle').textContent,'育成ノート');assert.match(w.document.querySelector('.pet-notebook-page').textContent,/フナ.*記録開始/s);assert.deepEqual(read(w,'s.caught'),caught);assert.equal(read(w,'fish.length'),60);assert.deepEqual(a.errors,[]);
 }finally{a.dispose();}
});
test('returning owners explicitly receive the notebook for free, retaining unknown sex and generation on its individual page',()=>{
 const old=initial();old.petLife.fish=[{uid:'pet-9',species:'funa',tank:0,length:1400,bornSize:1400,origin:'shop',health:90,water:100}];const a=boot(old),w=a.window;let stored,memo;try{const before=read(w,'({money:s.money,fish:s.petLife.fish,caught:s.caught})');w.eval('petUi.open("shop")');click(w,'[data-pet-action="notebook-receive"]');assert.deepEqual(read(w,'({money:s.money,fish:s.petLife.fish,caught:s.caught})'),before);assert.equal(read(w,'s.petNotebook.source'),'existing');click(w,'[data-pet-action="notebook"]');assert.match(w.document.querySelector('.pet-notebook-specimen').textContent,/性別不明.*世代不明/);stored=JSON.parse(w.localStorage.getItem(saveKey));memo=w.localStorage.getItem('nushi-pet-identity-display-v1:'+saveKey);assert.deepEqual(a.errors,[]);}finally{a.dispose();}
 const b=boot(stored,undefined,{storage:{['nushi-pet-identity-display-v1:'+saveKey]:memo}});try{b.window.eval('petUi.open("notebook")');assert.match(b.window.document.querySelector('.pet-notebook-specimen').textContent,/性別不明.*世代不明/);b.window.eval('petUi.open("shop")');assert.doesNotMatch(b.window.document.querySelector('.pet-message').textContent,/育成ノートをどうぞ/);assert.equal(b.window.document.querySelector('[data-pet-action="notebook-receive"]'),null);assert.deepEqual(b.errors,[]);}finally{b.dispose();}
});
test('notebook browsing, species selection and returning to the shop leave the save and selected tank specimen unchanged',()=>{
 const a=boot(initial()),w=a.window;try{w.eval('petUi.open("shop")');click(w,'[data-pet-buy="funa"]');click(w,'[data-pet-buy="nijimasu"]');const before=read(w,'s'),bytes=w.localStorage.getItem(saveKey);click(w,'[data-pet-action="notebook"]');click(w,'[data-notebook-species="nijimasu"]');assert.match(w.document.querySelector('.pet-notebook-page').textContent,/ニジマス/);click(w,'[data-pet-action="notebook-back"]');assert.equal(read(w,'petUi.mode'),'shop');assert.deepEqual(read(w,'s'),before);assert.equal(w.localStorage.getItem(saveKey),bytes);assert.deepEqual(a.errors,[]);}finally{a.dispose();}
});
test('a failed purchase save leaves the gift pending and a successful retry commits one fish and one notebook',()=>{
 const a=boot(initial()),w=a.window,proto=w.Storage.prototype,set=proto.setItem;try{w.eval('petUi.open("shop")');proto.setItem=function(k,v){if(k===saveKey)throw Error('quota');return set.call(this,k,v);};click(w,'[data-pet-buy="funa"]');assert.equal(read(w,'s.petNotebook.announced'),false);assert.doesNotMatch(w.document.querySelector('.pet-message').textContent,/育成ノートをどうぞ/);proto.setItem=set;w.eval('petUi.render()');assert.equal(read(w,'s.petNotebook.announced'),true);assert.equal(JSON.parse(w.localStorage.getItem(saveKey)).petLife.fish.length,1);assert.match(w.document.querySelector('.pet-message').textContent,/育成ノートをどうぞ/);assert.deepEqual(a.errors,[]);}finally{proto.setItem=set;a.dispose();}
});
test('notebook ownership, ledger and purchase never leak into a different adventure slot',()=>{
 const other=initial();other.petNotebook={version:1,receivedDay:0,source:'existing',announced:true,species:[{id:'koi',firstRecordedDay:0}]};const bytes=JSON.stringify(other),a=boot(null,undefined,{url:'http://localhost/nushi-tsuri/?saveSlot=2',storage:{[saveKey]:bytes,[saveKey+'-slot2']:initial()}}),w=a.window;
 try{assert.equal(read(w,'ShuPetNotebook.owned(s)'),false);w.eval('petUi.open("shop")');click(w,'[data-pet-buy="funa"]');assert.deepEqual(read(w,'s.petNotebook.species.map(r=>r.id)'),['funa']);assert.equal(w.localStorage.getItem(saveKey),bytes);assert.equal(JSON.parse(w.localStorage.getItem(saveKey+'-slot2')).petNotebook.source,'purchase');assert.deepEqual(a.errors,[]);}finally{a.dispose();}
});
