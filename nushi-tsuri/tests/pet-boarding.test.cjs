const {test}=require('node:test'),assert=require('node:assert/strict');
const P=require('../pet-life.js'),M=require('../aquarium-mutations.js');
const copy=x=>JSON.parse(JSON.stringify(x)),dogs=['shuu'];
const catalog=[
 {id:'funa',name:'フナ',min:600,start:1200,max:6000,price:300,waterLabel:'淡水'},
 {id:'koi',name:'コイ',min:800,start:1600,max:10000,price:500,waterLabel:'淡水'},
 {id:'buri',name:'ブリ',min:1000,start:9000,max:12499,price:800,waterLabel:'海水'},
 {id:'nushi',name:'ぬし',min:8000,start:9000,max:15000,price:0,waterLabel:'淡水',legendary:true},
 {id:'seaNushi',name:'海ぬし',min:8000,start:9000,max:15000,price:0,waterLabel:'海水',legendary:true}
];
function empty(){const s={money:100000,caught:Object.fromEntries(catalog.map(f=>[f.id,1])),petLife:{version:6,mutationSeed:'a'.repeat(32),unlockedTanks:6,fish:[]}};P.normalize(s,catalog,dogs,0,{legacy:false});return s;}
function add(s,species='funa',tank=0){const r=P.acquire(s,species,catalog,0,tank);assert.equal(r.ok,true,r.message);return r.fish;}
const deposit=(s,uid,day=0,persist)=>P.boardFish(s,uid,catalog,day,persist);
const retrieve=(s,uid,tank=0,day=0,persist)=>P.withdrawFish(s,uid,tank,catalog,day,persist);
function unique(s){const ids=P.allFish(s).map(f=>f.uid);assert.equal(ids.length,new Set(ids).size);}

test('legacy saves start with no boarding and existing fish identities stay unchanged',()=>{
 const s=empty();add(s);const fish=copy(s.petLife.fish);delete s.petLife.boarded;delete s.petLife.boardingVersion;
 P.normalize(s,catalog,dogs,0);assert.deepEqual(s.petLife.fish,fish);assert.deepEqual(s.petLife.boarded,[]);assert.equal(s.petLife.boardingVersion,1);assert.equal(s.petLife.version,6);
});
test('two fish per species includes rare colors, but species have independent slots; deposits are free and repeated requests cannot duplicate',()=>{
 const s=empty(),a=add(s),b=add(s),c=add(s),d=add(s,'koi');b.mutation={checked:true,kind:'gold',ruleVersion:1};
 const budget={money:s.money,food:s.petLife.food,nextId:s.petLife.nextId};let writes=0;
 assert.equal(deposit(s,a.uid,0,()=>{writes++;return true;}).ok,true);assert.equal(deposit(s,b.uid).ok,true);
 const before=copy(s);assert.equal(deposit(s,c.uid,0,()=>{writes++;return true;}).ok,false);assert.deepEqual(s,before);
 assert.equal(deposit(s,a.uid).ok,false);assert.equal(deposit(s,d.uid).ok,true);assert.equal(s.petLife.boarded.length,3);assert.equal(writes,1);
 assert.deepEqual({money:s.money,food:s.petLife.food,nextId:s.petLife.nextId},budget);unique(s);
});
test('roundtrip retains UID, full Unicode nickname, generation, color, length and Buri growth history',()=>{
 const s=empty(),f=add(s,'buri',1);f.nickname='ぶり丸🐟';f.length=3600;f.generation=2;f.origin='bred';f.stars=4;f.careDays=0;f.xp=99;f.level=P.fishLevel(99);f.sex='female';f.mutation={checked:true,kind:'future-color',ruleVersion:1};
 P.normalize(s,catalog,dogs,0);const before=copy(P.selected(s)),uid=before.uid;
 assert.equal(deposit(s,uid).ok,true);P.normalize(s,catalog,dogs,70);assert.equal(s.petLife.fish.length,0);assert.equal(P.allFish(s).length,1);
 assert.equal(retrieve(s,uid,1,70).ok,true);const returned=copy(P.selected(s));returned.lastDay=0;
 assert.deepEqual(returned,before);assert.deepEqual(s.petLife.boarded,[]);unique(s);
});
test('long boarding pauses health, water, growth and food; one pending ration resumes once and never catches up',()=>{
 const s=empty(),f=add(s);P.care(s,f.uid,'feed',0,catalog);const baseline=copy(s);P.sync(baseline,catalog,1);
 assert.equal(deposit(s,f.uid).ok,true);const stored=copy(s.petLife.boarded[0]),food=s.petLife.food;
 for(const day of [1,50,100]){P.sync(s,catalog,day);P.normalize(s,catalog,dogs,day);assert.deepEqual(s.petLife.boarded[0],stored);}
 assert.equal(retrieve(s,f.uid,0,100).ok,true);let resumed=P.selected(s);assert.equal(resumed.lastDay,100);assert.equal(resumed.fedDay,100);assert.equal(resumed.changedDay,-1);assert.equal(resumed.length,stored.length);assert.equal(resumed.health,stored.health);assert.equal(resumed.water,stored.water);assert.equal(s.petLife.food,food);
 assert.equal(P.care(s,f.uid,'feed',100,catalog).ok,false);P.sync(s,catalog,101);resumed=P.selected(s);
 for(const field of ['length','water','health','careDays','stars','xp','level'])assert.equal(resumed[field],baseline.petLife.fish[0][field],field);
 const once=copy(s);P.sync(s,catalog,101);assert.deepEqual(s,once);
});
test('unfed fish stays unfed, same-day boarding does not reset care, and malformed pause clocks cannot charge a backlog',()=>{
 const s=empty(),f=add(s);assert.equal(deposit(s,f.uid).ok,true);assert.equal(retrieve(s,f.uid).ok,true);assert.equal(P.selected(s).fedDay,-1);
 P.care(s,f.uid,'feed',0,catalog);deposit(s,f.uid);retrieve(s,f.uid);assert.equal(P.care(s,f.uid,'feed',0,catalog).ok,false);
 deposit(s,f.uid);s.petLife.boarded[0].boardedDay=90;P.normalize(s,catalog,dogs,100);assert.equal(s.petLife.boarded[0].boardedDay,0);
 retrieve(s,f.uid,0,100);const before=copy(P.selected(s));P.sync(s,catalog,100);assert.deepEqual(P.selected(s),before);
});
test('only compatible unlocked free tanks accept withdrawal; eggs reserve slots and failed requests are unchanged',()=>{
 const s=empty(),f=add(s);deposit(s,f.uid);add(s,'buri',1);for(let n=0;n<4;n++)add(s,'koi',2);
 s.petLife.eggs.push({uid:'egg-1',species:'koi',tank:2,laidDay:0,hatchDay:7,generation:1,water:100,parents:null,mutation:M.normal()});
 for(const tank of [1,2,-1,99,6,7,null,NaN]){const before=copy(s);assert.equal(retrieve(s,f.uid,tank).ok,false);assert.deepEqual(s,before);}
 s.petLife.unlockedTanks=3;assert.equal(retrieve(s,f.uid,3).ok,false);assert.equal(retrieve(s,f.uid,0).ok,true);unique(s);
});
test('withdrawal rechecks after sync and a full fish tank cannot be overfilled',()=>{
 const s=empty(),f=add(s);deposit(s,f.uid);for(let n=0;n<5;n++)add(s,'koi',1);const before=copy(s);
 assert.equal(retrieve(s,f.uid,1,10).ok,false);assert.deepEqual(s,before);assert.equal(s.petLife.boarded.length,1);
});
test('transfers atomically rollback sync, eggs, notebook, selection and UID counters for false, throwing and nontrue persistence',()=>{
 for(const persist of [()=>false,()=>{throw Error('quota');},()=>undefined,()=>1]){
  const s=empty(),f=add(s);P.care(s,f.uid,'feed',0,catalog);const before=copy(s);assert.equal(deposit(s,f.uid,5,persist).ok,false);assert.deepEqual(s,before);
  assert.equal(deposit(s,f.uid).ok,true);const boarded=copy(s);assert.equal(retrieve(s,f.uid,0,5,persist).ok,false);assert.deepEqual(s,boarded);unique(s);
 }
});
test('successful persistence writes the complete transfer once, and repeats or unknown IDs never write',()=>{
 const s=empty(),f=add(s);let raw=null,writes=0;const persist=()=>{raw=copy(s);writes++;return true;};
 assert.equal(deposit(s,f.uid,0,persist).ok,true);assert.equal(raw.petLife.fish.length,0);assert.equal(raw.petLife.boarded[0].uid,f.uid);
 assert.equal(deposit(s,f.uid,0,persist).ok,false);assert.equal(retrieve(s,'pet-999',0,0,persist).ok,false);assert.equal(writes,1);
 assert.equal(retrieve(s,f.uid,0,0,persist).ok,true);assert.equal(raw.petLife.fish[0].uid,f.uid);assert.equal(raw.petLife.boarded.length,0);assert.equal(retrieve(s,f.uid,0,0,persist).ok,false);assert.equal(writes,2);
});
test('reload deduplicates across active and boarded fish, enforces species caps, and allocates beyond boarded UIDs',()=>{
 const s=empty(),f=add(s);deposit(s,f.uid);s.petLife.boarded[0].uid='pet-500';s.petLife.nextId=1;P.normalize(s,catalog,dogs,0);assert.equal(s.petLife.nextId,501);const newcomer=add(s);assert.equal(newcomer.uid,'pet-501');
 s.petLife.boarded.push(copy(newcomer),{...copy(s.petLife.boarded[0]),uid:'pet-502',mutation:{checked:true,kind:'gold',ruleVersion:1}},{...copy(s.petLife.boarded[0]),uid:'pet-503'});
 P.normalize(s,catalog,dogs,0);assert.equal(s.petLife.boarded.length,2);assert.equal(s.petLife.boarded[1].uid,'pet-502');unique(s);assert.ok(s.petLife.nextId>502);
});
test('legend boarding retains one-time claim and only returns to the correct unlocked legend tank',()=>{
 const s=empty(),f=add(s,'nushi',6);assert.equal(deposit(s,f.uid).ok,true);s.petLife.legendClaims={};s.petLife.nushiClaimed=false;P.normalize(s,catalog,dogs,20);
 assert.equal(s.petLife.legendClaims.nushi,true);assert.equal(s.petLife.nushiClaimed,true);assert.equal(P.acquire(s,'nushi',catalog,20).ok,false);
 for(const tank of [0,7])assert.equal(retrieve(s,f.uid,tank,20).ok,false);assert.equal(retrieve(s,f.uid,6,20).ok,true);unique(s);
});
test('boarding clears pair progress, pauses breeding, leaves laid eggs in tanks, and excludes boarded fish from care and contests',()=>{
 const s=empty(),a=add(s),b=add(s);a.sex='male';b.sex='female';P.care(s,a.uid,'feed',0,catalog);
 s.petLife.breeding['0:funa']={days:2,lastDay:0,mother:b.uid,father:a.uid};
 s.petLife.eggs.push({uid:'egg-1',species:'funa',tank:0,laidDay:0,hatchDay:2,generation:1,water:100,parents:{mother:b.uid,father:a.uid},mutation:{checked:true,kind:'gold',ruleVersion:1}});s.petLife.nextEggId=2;
 assert.equal(deposit(s,a.uid).ok,true);assert.equal(s.petLife.breeding['0:funa'],undefined);assert.equal(deposit(s,b.uid).ok,true);
 assert.equal(deposit(s,'egg-1').ok,false);assert.equal(P.care(s,a.uid,'feed',0,catalog).ok,false);assert.equal(P.beginContest(s,'fish','beginner',a.uid,0,catalog,[]).ok,false);
 P.sync(s,catalog,2);assert.equal(s.petLife.fish.length,1);assert.equal(s.petLife.fish[0].mutation.kind,'gold');assert.equal(s.petLife.boarded.length,2);assert.equal(s.petLife.eggs.length,0);unique(s);
 retrieve(s,a.uid,1,10);retrieve(s,b.uid,1,10);assert.equal(s.petLife.breeding['1:funa'],undefined);P.sync(s,catalog,10);assert.equal(s.petLife.eggs.length,0);
});
test('an active fish contest participant cannot be boarded until the contest finishes',()=>{
 const s=empty(),f=add(s);assert.equal(P.beginContest(s,'fish','beginner',f.uid,0,catalog,[],()=>.5).ok,true);const before=copy(s);assert.equal(deposit(s,f.uid).ok,false);assert.deepEqual(s,before);
 for(let i=0;i<3;i++)P.advanceContest(s);assert.equal(deposit(s,f.uid).ok,true);
});

test('malformed unsafe UIDs cannot poison allocation and exhaustion never creates duplicates',()=>{
 const s=empty(),f=add(s);deposit(s,f.uid);s.petLife.boarded[0].uid='pet-9007199254740991';s.petLife.nextId=1;P.normalize(s,catalog,dogs,0);
 assert.equal(s.petLife.boarded.length,0);assert.equal(add(s).uid,'pet-1');assert.equal(add(s).uid,'pet-2');unique(s);
 s.petLife.nextId=1e9;assert.equal(add(s).uid,'pet-1000000000');const money=s.money;
 assert.equal(P.acquire(s,'koi',catalog,0,1).ok,false);assert.equal(s.money,money);
 P.normalize(s,catalog,dogs,0);assert.equal(s.petLife.nextId,1e9+1);assert.equal(P.acquire(s,'koi',catalog,0,1).ok,false);unique(s);
 s.petLife.eggs.push({uid:'egg-1',species:'funa',tank:1,laidDay:0,hatchDay:1,generation:1,water:100,parents:null,mutation:M.normal()});P.sync(s,catalog,1);assert.equal(s.petLife.eggs.length,1);unique(s);
});
test('malformed raw active and boarded lists remain bootable instead of spreading noniterables',()=>{
 const {boot,seed}=require('./game-harness.cjs');
 for(const invalid of [{},3,'not-a-list']){
  const app=boot({...seed(),petLife:{version:6,fish:invalid,boarded:invalid}});
  try{assert.deepEqual(app.errors,[]);assert.equal(app.window.eval('s.petLife.boarded.length'),0);assert.equal(app.window.eval('s.petLife.fish.length'),0);}finally{app.dispose();}
 }
});
test('all changed boarding modules have matching fresh cache URLs',()=>{
 const fs=require('node:fs'),path=require('node:path'),html=fs.readFileSync(path.join(__dirname,'../index.html'),'utf8'),sw=fs.readFileSync(path.join(__dirname,'../sw.js'),'utf8');
 for(const file of ['pet-life.js','pet-life.css','pet-notebook.js']){assert.ok(html.includes(file+'?v=252-27'),file);assert.ok(sw.includes(file+'?v=252-27'),file);}
 assert.ok(html.includes('pet-life-ui.js?v=252-28'));assert.ok(sw.includes('pet-life-ui.js?v=252-28'));
 assert.match(sw,/nushi-tsuri-v252-render-efficiency-252-29/);
});
