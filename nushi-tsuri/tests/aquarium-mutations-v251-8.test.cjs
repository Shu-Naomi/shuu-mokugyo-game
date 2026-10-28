const {test}=require('node:test'),assert=require('node:assert/strict'),crypto=require('node:crypto'),fs=require('node:fs'),vm=require('node:vm');
const M=require('../aquarium-mutations.js'),P=require('../pet-life.js'),A=require('../aquarium-life.js');
const {boot,seed,read,saveKey}=require('./game-harness.cjs');
const copy=v=>JSON.parse(JSON.stringify(v)),dogs=['shuu','riku','grey'];
const catalog=[{id:'funa',name:'フナ',min:600,start:1200,max:6000,price:300,waterLabel:'淡水'},{id:'koi',name:'コイ',min:800,start:1600,max:10000,price:500,waterLabel:'淡水'}];
const GOLD_SEED='00000000000000000000000000000403',NORMAL_SEED='a'.repeat(32);
const egg=(generation=2,species='funa')=>({uid:'egg-1',species,tank:0,laidDay:3,hatchDay:5,generation,water:100,parents:{mother:'pet-2',father:'pet-1'}});
function pair(seed=GOLD_SEED,motherGeneration=1,fatherGeneration=0,core=P){
 const s={money:10000,caught:{funa:1},dogAffinity:{shuu:0},petLife:{version:6,mutationSeed:seed,unlockedTanks:2,food:1000,nextId:3,nextEggId:1,selected:'pet-1',selectedTank:0,
  fish:[['pet-1','male',fatherGeneration],['pet-2','female',motherGeneration]].map(([uid,sex,generation])=>({uid,sex,generation,species:'funa',tank:0,bornSize:generation?150:1200,length:1200,origin:generation?'bred':'shop',acquiredDay:0,lastDay:0,fedDay:-1,changedDay:-1,water:100,health:90,careDays:0,stars:1,xp:0,mutation:M.normal()}))}};
 core.normalize(s,catalog,dogs,0);return s;
}
function careDay(s,day,core=P){assert.equal(core.care(s,s.petLife.fish[0].uid,'feed',day,catalog).ok,true);core.care(s,s.petLife.fish[0].uid,'water',day,catalog);}
function lay(s,core=P){for(let day=0;day<3;day++){careDay(s,day,core);core.sync(s,catalog,day+1);}assert.equal(s.petLife.eggs.length,1);return s.petLife.eggs[0];}
function countedCore(){let draws=0;const root={ShuAquariumMutations:{...M,draw(...args){draws++;return M.draw(...args);}}};vm.runInNewContext(fs.readFileSync(require.resolve('../pet-life.js'),'utf8'),root);return {core:root.ShuPetLife,count:()=>draws};}

test('egg-key SHA-256 matches the independent Node implementation across block and padding boundaries',()=>{
 for(const text of ['', 'abc', 'a'.repeat(55),'a'.repeat(56),'a'.repeat(64),'a'.repeat(1000),JSON.stringify(egg())])
  assert.equal(M.hashWords(text).map(w=>w.toString(16).padStart(8,'0')).join(''),crypto.createHash('sha256').update(text).digest('hex'));
});
test('one of the 1000 accepted tickets wins; rejection sampling removes the 32-bit modulo remainder',()=>{
 const s=pair();let wins=0,calls=0;
 for(let n=0;n<1000;n++){const result=M.draw(s,egg(),()=>{calls++;return [n];});assert.equal(result.checked,true);assert.equal(result.ruleVersion,1);wins+=result.kind==='gold';}
 assert.equal(wins,1);assert.equal(calls,1000);
 assert.equal(M.ticket(GOLD_SEED,egg(),()=>[M.WORD_LIMIT-1]),999);
 assert.equal(M.ticket(GOLD_SEED,egg(),()=>[M.WORD_LIMIT,0xffffffff,1000]),0);
 let blocks=0;assert.equal(M.ticket(GOLD_SEED,egg(),()=>++blocks===1?Array(8).fill(0xffffffff):[1]),1);assert.equal(blocks,2);
 assert.equal(M.draw(s,egg(),()=>[0]).kind,'gold');assert.equal(M.draw(s,egg(),()=>[1]).kind,'normal');assert.equal(M.draw(s,egg(),()=>[999]).kind,'normal');
});
test('gold Funa and Koi children in generation 2 through 20 are eligible, without waiting for both parents to reach generation 2',()=>{
 const s=pair();let calls=0;const hash=()=>{calls++;return [0];};
 for(const generation of [undefined,null,-1,0,1,1.5,21])assert.equal(M.draw(s,{...egg(),generation},hash).kind,'normal');
 for(const species of ['unagi','moroko','nushi'])assert.equal(M.draw(s,egg(2,species),hash).kind,'normal');
 assert.equal(calls,0);assert.equal(M.draw(s,egg(2),hash).kind,'gold');assert.equal(M.draw(s,egg(20),hash).kind,'gold');assert.equal(M.draw(s,egg(2,'koi'),hash).kind,'gold');assert.equal(M.draw(s,egg(20,'koi'),hash).kind,'gold');assert.equal(calls,4);
 assert.equal(lay(pair(GOLD_SEED,1,0)).generation,2);assert.equal(lay(pair(NORMAL_SEED,0,0)).generation,1);assert.equal(lay(pair(NORMAL_SEED,19,20)).generation,20);
});
test('a new seed is prepared once and cannot be used until it has actually been saved',()=>{
 const s=pair();s.petLife.mutationSeed=null;let made=0;
 assert.equal(M.prepare(s,()=>{made++;return GOLD_SEED;}),true);assert.equal(M.seedIsSaved(s),false);
 let draws=0;assert.equal(M.draw(s,egg(),()=>{draws++;return [0];}).checked,false);assert.equal(draws,0);
 M.prepare(s,()=>{made++;return NORMAL_SEED;});assert.equal(made,1);assert.equal(s.petLife.mutationSeed,GOLD_SEED);
 M.confirmSaved(s);assert.equal(M.seedIsSaved(s),true);assert.equal(M.draw(s,egg(),()=>[0]).kind,'gold');
 const bad=pair();bad.petLife.mutationSeed=null;assert.equal(M.prepare(bad,()=>null),false);assert.equal(M.seedIsSaved(bad),false);
});
test('real three-day breeding stores exactly one result and its parents, including losing results',()=>{
 for(const seed of [GOLD_SEED,NORMAL_SEED]){
  const c=countedCore(),s=pair(seed,1,0,c.core),e=lay(s,c.core);assert.equal(c.count(),1);
  assert.deepEqual(copy(e.parents),{mother:'pet-2',father:'pet-1'});assert.equal(e.mutation.kind,seed===GOLD_SEED?'gold':'normal');assert.equal(e.mutation.checked,true);
  const saved=copy(s);c.core.sync(s,catalog,3);c.core.normalize(s,catalog,dogs,3);c.core.sync(s,catalog,4);
  assert.equal(c.count(),1);assert.deepEqual(copy(s.petLife.eggs[0].mutation),saved.petLife.eggs[0].mutation);
 }
});
test('v6 fish and eggs keep their serialized field order across normalization and reload',()=>{
 const bought=pair();P.acquire(bought,'funa',catalog,0,1);
 const boughtBytes=JSON.stringify(bought.petLife.fish);P.normalize(bought,catalog,dogs,0);assert.equal(JSON.stringify(bought.petLife.fish),boughtBytes);
 const s=pair();lay(s);const eggBytes=JSON.stringify(s.petLife.eggs);P.normalize(s,catalog,dogs,3);assert.equal(JSON.stringify(s.petLife.eggs),eggBytes);
 P.sync(s,catalog,5);const fishBytes=JSON.stringify(s.petLife.fish);P.normalize(s,catalog,dogs,5);assert.equal(JSON.stringify(s.petLife.fish),fishBytes);
});
test('reloading the same pre-spawn save recreates exactly the same gold or normal egg',()=>{
 for(const seed of [GOLD_SEED,NORMAL_SEED]){
  const s=pair(seed);for(let day=0;day<2;day++){careDay(s,day);P.sync(s,catalog,day+1);}careDay(s,2);
  const before=copy(s);P.sync(s,catalog,3);const first=copy(s.petLife.eggs[0]);
  const reloaded=copy(before);P.normalize(reloaded,catalog,dogs,2);P.sync(reloaded,catalog,3);assert.deepEqual(reloaded.petLife.eggs[0],first);
  assert.deepEqual(reloaded.caught,{funa:1});
 }
});
test('the deterministic key distinguishes egg IDs, parents, days and adventure seeds even when their colour results coincide',()=>{
 const keys=[];const capture=key=>{keys.push(key);return [1];};
 M.ticket(GOLD_SEED,egg(),capture);M.ticket(NORMAL_SEED,egg(),capture);M.ticket(GOLD_SEED,{...egg(),uid:'egg-2'},capture);
 M.ticket(GOLD_SEED,{...egg(),laidDay:4},capture);M.ticket(GOLD_SEED,{...egg(),parents:{mother:'pet-4',father:'pet-1'}},capture);
 assert.equal(new Set(keys).size,5);assert.equal(M.ticket(GOLD_SEED,egg()),M.ticket(GOLD_SEED,egg()));
});
test('gold survives egg reload, a delayed hatch, fry growth, tank movement and adult save/resume without bonuses',()=>{
 const s=pair();const result=copy(lay(s).mutation);P.sync(s,catalog,5);const child=s.petLife.fish.find(f=>f.uid==='pet-3');
 assert.deepEqual(child.mutation,result);assert.equal(P.lifeStage(child,catalog),'fry');assert.equal(A.appearance(child,catalog).artId,'funaGold');
 assert.equal(P.moveFish(s,child.uid,1,catalog,5).ok,true);
 for(let day=5;day<17;day++){P.care(s,child.uid,'feed',day,catalog);P.care(s,child.uid,'water',day,catalog);P.sync(s,catalog,day+1);}
 assert.equal(P.lifeStage(child,catalog),'adult');assert.deepEqual(child.mutation,result);
 assert.deepEqual(P.buyBackQuote(child,catalog),P.buyBackQuote({...child,mutation:M.normal()},catalog));assert.deepEqual(P.fishScore(child),P.fishScore({...child,mutation:M.normal()}));
 const saved=copy(s);P.normalize(s,catalog,dogs,17);assert.deepEqual(s,saved);assert.deepEqual(s.caught,{funa:1});
 const c=countedCore(),waiting=pair(GOLD_SEED,1,0,c.core);lay(waiting,c.core);
 for(let n=3;n<=5;n++)waiting.petLife.fish.push({...copy(waiting.petLife.fish[0]),uid:'pet-'+n});waiting.petLife.nextId=6;
 c.core.sync(waiting,catalog,5);assert.equal(waiting.petLife.eggs.length,1);assert.equal(c.count(),1);
 waiting.petLife.fish.pop();c.core.sync(waiting,catalog,5);assert.equal(waiting.petLife.eggs.length,0);assert.equal(c.count(),1);assert.equal(waiting.petLife.fish.at(-1).mutation.kind,'gold');
});
test('gold is not inherited and does not change food, growth, water, stars, length caps, prices or scoring',()=>{
 const goldParents=pair(NORMAL_SEED),normalParents=copy(goldParents);P.normalize(normalParents,catalog,dogs,0);
 for(const f of goldParents.petLife.fish)f.mutation={checked:true,kind:'gold',ruleVersion:1};
 const a=lay(goldParents),b=lay(normalParents);assert.equal(a.mutation.kind,'normal');assert.deepEqual(a,b);
 const strip=s=>({...s,petLife:{...s.petLife,fish:s.petLife.fish.map(({mutation,...f})=>f)}});assert.deepEqual(strip(goldParents),strip(normalParents));
});
test('v5 and older fish and existing eggs stay normal, retain identities and never receive retroactive rolls',()=>{
 for(const version of [undefined,1,4,5]){
  const c=countedCore(),s=pair();s.petLife.version=version;s.petLife.eggs=[{...egg(),mutation:{checked:true,kind:'gold',ruleVersion:1}}];s.petLife.mutationDiscoveries=[{species:'funa',kind:'gold',firstUid:'pet-1',firstDay:0,notified:false}];
  for(const f of s.petLife.fish)f.mutation={checked:true,kind:'gold',ruleVersion:1};
  c.core.normalize(s,catalog,dogs,0);assert.equal(s.petLife.version,6);assert.ok(s.petLife.fish.every(f=>f.mutation.kind==='normal'));assert.equal(s.petLife.eggs[0].mutation.kind,'normal');assert.deepEqual(copy(s.petLife.mutationDiscoveries),[]);
  c.core.sync(s,catalog,5);assert.equal(c.count(),0);assert.equal(s.petLife.fish.at(-1).mutation.kind,'normal');
 }
});
test('unknown future colour IDs survive fish/egg normalization and hatching while rendering ordinary art safely',()=>{
 const s=pair(),future={checked:true,kind:'future_pearl',ruleVersion:2};s.petLife.fish[0].mutation=future;s.petLife.eggs=[{...egg(),mutation:future}];P.normalize(s,catalog,dogs,0);
 assert.deepEqual(s.petLife.fish[0].mutation,future);assert.deepEqual(s.petLife.eggs[0].mutation,future);assert.equal(A.appearance(s.petLife.fish[0],catalog).artId,undefined);
 P.sync(s,catalog,5);assert.deepEqual(s.petLife.fish.at(-1).mutation,future);assert.equal(s.petLife.mutationDiscoveries.length,0);
 s.petLife.mutationRuleVersion=2;const result=M.draw(s,egg());assert.equal(result.checked,false);assert.equal(result.reason,'unsupported-rule');assert.deepEqual(M.normalize(result),result);
});
test('first-discovery notification is saved before display, retries safely on write failure, and remains recorded after selling',()=>{
 const s=pair();lay(s);P.sync(s,catalog,5);const record=s.petLife.mutationDiscoveries[0];assert.equal(record.notified,false);
 assert.deepEqual(M.acknowledge(s,()=>false),[]);assert.equal(record.notified,false);
 let saved;const notices=M.acknowledge(s,()=>{assert.equal(record.notified,true);saved=copy(s);return true;});assert.equal(notices.length,1);
 P.normalize(saved,catalog,dogs,5);assert.deepEqual(M.acknowledge(saved,()=>{throw Error('must not save twice');}),[]);
 saved.petLife.fish=saved.petLife.fish.filter(f=>f.uid!==record.firstUid);P.normalize(saved,catalog,dogs,5);assert.equal(saved.petLife.mutationDiscoveries.length,1);
});
test('the title is read-only and Start saves a seed before catching up an eligible spawn',()=>{
 const initial={...seed(),gameMinutes:3*1440+360,petLife:copy(pair().petLife)};initial.petLife.version=5;delete initial.petLife.mutationSeed;
 for(const f of initial.petLife.fish){f.length=4000;f.lastDay=2;f.fedDay=2;f.changedDay=2;}initial.petLife.breeding={'0:funa':{days:2,lastDay:2,mother:'pet-2',father:'pet-1'}};
 const a=boot(initial,undefined,{start:false}),w=a.window;
 try{
  assert.equal(w.localStorage.getItem(saveKey),JSON.stringify(initial));assert.equal(read(w,'s.petLife.eggs.length'),0);
  w.crypto.getRandomValues=bytes=>{bytes.fill(1);return bytes;};require('./title-test-flow.cjs')(w);
  const saved=JSON.parse(w.localStorage.getItem(saveKey));assert.equal(saved.petLife.version,6);assert.equal(saved.petLife.mutationSeed,'01'.repeat(16));assert.equal(saved.petLife.eggs.length,1);assert.equal(saved.petLife.eggs[0].mutation.checked,true);assert.equal(read(w,'fish.length'),60);assert.deepEqual(a.errors,[]);
 }finally{a.dispose();}
});
test('a failed first seed save blocks entry and spawning, preserves the stored adventure and retries with the same seed',()=>{
 const initial={...seed(),gameMinutes:3*1440+360,petLife:copy(pair().petLife)};initial.petLife.version=5;delete initial.petLife.mutationSeed;
 for(const f of initial.petLife.fish){f.length=4000;f.lastDay=2;f.fedDay=2;f.changedDay=2;}initial.petLife.breeding={'0:funa':{days:2,lastDay:2,mother:'pet-2',father:'pet-1'}};
 const a=boot(initial,undefined,{start:false}),w=a.window,proto=w.Storage.prototype,set=proto.setItem;
 try{
  proto.setItem=function(key,value){if(key===saveKey)throw Error('quota');return set.call(this,key,value);};require('./title-test-flow.cjs')(w);
  assert.equal(w.localStorage.getItem(saveKey),JSON.stringify(initial));assert.equal(read(w,'s.petLife.eggs.length'),0);assert.equal(read(w,'gameStarted'),false);const prepared=read(w,'s.petLife.mutationSeed');assert.equal(w.document.querySelector('#saveStatus').hidden,false);
  proto.setItem=set;require('./title-test-flow.cjs')(w);assert.equal(read(w,'s.petLife.mutationSeed'),prepared);assert.equal(read(w,'s.petLife.eggs[0].mutation.checked'),true);const mutation=read(w,'s.petLife.eggs[0].mutation');w.eval('ShuPetLife.sync(s,petCatalog,3)');assert.deepEqual(read(w,'s.petLife.eggs[0].mutation'),mutation);assert.deepEqual(a.errors,[]);
 }finally{proto.setItem=set;a.dispose();}
});
test('two adventure slots persist independent seeds and do not write into the other adventure',()=>{
 const first=boot(seed(),undefined,{start:false});let saved;
 try{first.window.crypto.getRandomValues=bytes=>{bytes.fill(1);return bytes;};require('./title-test-flow.cjs')(first.window);saved=JSON.parse(first.window.localStorage.getItem(saveKey));assert.equal(saved.petLife.mutationSeed,'01'.repeat(16));}finally{first.dispose();}
 const second=boot(null,undefined,{start:false,url:'http://localhost/nushi-tsuri/?saveSlot=2',storage:{[saveKey]:saved,[saveKey+'-slot2']:seed()}});
 try{second.window.crypto.getRandomValues=bytes=>{bytes.fill(2);return bytes;};require('./title-test-flow.cjs')(second.window);assert.deepEqual(JSON.parse(second.window.localStorage.getItem(saveKey)),saved);assert.equal(JSON.parse(second.window.localStorage.getItem(saveKey+'-slot2')).petLife.mutationSeed,'02'.repeat(16));assert.deepEqual(second.errors,[]);}finally{second.dispose();}
});
test('the first seed checkpoint resumes the opening even if all following save writes fail',()=>{
 const a=boot(null,undefined,{start:false,keepIntro:true}),w=a.window,proto=w.Storage.prototype,set=proto.setItem;let snapshot,writes=0;
 try{
  proto.setItem=function(key,value){if(key===saveKey){if(++writes>1)throw Error('quota after first checkpoint');snapshot=JSON.parse(value);}return set.call(this,key,value);};
  require('./title-test-flow.cjs')(w);assert.ok(M.validSeed(snapshot.petLife.mutationSeed));assert.equal(snapshot.lakeStory.introPending,true);assert.equal(snapshot.lakeStory.introSeen,false);
 }finally{proto.setItem=set;a.dispose();}
 const b=boot(snapshot,undefined,{keepIntro:true});try{assert.equal(b.window.document.querySelector('#lakeIntro').classList.contains('open'),true);assert.deepEqual(b.errors,[]);}finally{b.dispose();}
});
