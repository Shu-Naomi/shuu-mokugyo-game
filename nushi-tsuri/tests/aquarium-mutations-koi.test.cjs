const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path'),crypto=require('node:crypto');
const M=require('../aquarium-mutations.js'),P=require('../pet-life.js'),A=require('../aquarium-life.js'),Art=require('../fish-art.js');
const {boot,read}=require('./game-harness.cjs'),{fixture}=require('./aquarium-mutation-koi-fixture.cjs');
const copy=v=>JSON.parse(JSON.stringify(v)),dogs=['shuu','riku','grey'],seed='0000000000000000000000000000018b';
const catalog=[{id:'funa',name:'フナ',min:600,start:1200,max:6000,price:300,waterLabel:'淡水'},{id:'koi',name:'コイ',min:800,start:1600,max:10000,price:500,waterLabel:'淡水'}];
const egg=(generation=2,species='koi')=>({uid:'egg-1',species,tank:0,laidDay:3,hatchDay:5,generation,water:100,parents:{mother:'pet-2',father:'pet-1'}});
function pair(core=P,adventureSeed=seed){const s={money:10000,caught:{koi:1},petLife:{version:6,mutationSeed:adventureSeed,unlockedTanks:2,food:1000,nextId:3,nextEggId:1,selected:'pet-1',selectedTank:0,fish:[['pet-1','male',0],['pet-2','female',1]].map(([uid,sex,generation])=>({uid,sex,generation,species:'koi',tank:0,bornSize:generation?150:1600,length:1600,origin:generation?'bred':'shop',acquiredDay:0,lastDay:0,fedDay:-1,changedDay:-1,water:100,health:90,careDays:0,stars:1,xp:0,mutation:M.normal()}))}};core.normalize(s,catalog,dogs,0);return s;}
function lay(s,core=P){for(let d=0;d<3;d++){core.care(s,'pet-1','feed',d,catalog);core.care(s,'pet-1','water',d,catalog);core.sync(s,catalog,d+1);}assert.equal(s.petLife.eggs.length,1);return s.petLife.eggs[0];}
function counted(){let draws=0;const root={ShuAquariumMutations:{...M,draw(...args){draws++;return M.draw(...args);}}};vm.runInNewContext(fs.readFileSync(require.resolve('../pet-life.js'),'utf8'),root);return {core:root.ShuPetLife,count:()=>draws};}
test('Koi shares the exact generation and 1/1000 boundaries while existing Funa ticket and rule versions stay fixed',()=>{
 const s=pair();let wins=0,calls=0;for(let n=0;n<1000;n++)wins+=M.draw(s,egg(),()=>[n]).kind==='gold';assert.equal(wins,1);
 const hash=()=>{calls++;return [0];};for(const generation of [undefined,null,-1,0,1,1.5,21])assert.equal(M.draw(s,{...egg(),generation},hash).kind,'normal');
 for(const species of ['moroko','kajika','nushi','__proto__','toString']){assert.equal(M.draw(s,egg(2,species),hash).kind,'normal');assert.equal(M.goldForm(species),null);}
 assert.equal(calls,0);for(const species of ['funa','koi'])for(const g of [2,20])assert.equal(M.draw(s,egg(g,species),hash).kind,'gold');assert.equal(calls,4);
 assert.equal(M.ticket('00000000000000000000000000000403',egg(2,'funa')),0);assert.equal(M.ticket(seed,egg()),0);assert.equal(M.VERSION,6);assert.equal(M.RULE_VERSION,1);
});
test('real Koi breeding draws once, replays its saved pre-spawn state, and never rerolls a delayed hatch',()=>{
 const c=counted(),s=pair(c.core),before=copy(s),e=copy(lay(s,c.core));assert.equal(e.mutation.kind,'gold');assert.equal(c.count(),1);assert.deepEqual(e.parents,{mother:'pet-2',father:'pet-1'});
 const reloaded=copy(before);P.normalize(reloaded,catalog,dogs,0);assert.deepEqual(copy(lay(reloaded)),e);
 for(let n=3;n<=5;n++)s.petLife.fish.push({...copy(s.petLife.fish[0]),uid:'pet-'+n});s.petLife.nextId=6;
 c.core.sync(s,catalog,5);assert.equal(s.petLife.eggs.length,1);assert.equal(c.count(),1);
 s.petLife.fish.pop();c.core.sync(s,catalog,5);assert.equal(s.petLife.eggs.length,0);assert.equal(c.count(),1);assert.deepEqual(copy(s.petLife.fish.at(-1).mutation),e.mutation);
});
test('existing v5 and v6 normal Koi fish and eggs remain normal without retroactive draws',()=>{
 for(const version of [5,6]){const c=counted(),s=pair();s.petLife.version=version;s.petLife.eggs=[{...egg(),mutation:M.normal()}];delete s.petLife.breeding;
  c.core.normalize(s,catalog,dogs,3);c.core.sync(s,catalog,5);assert.equal(c.count(),0);assert.equal(s.petLife.eggs.length,0);assert.ok(s.petLife.fish.every(f=>f.mutation.kind==='normal'));assert.deepEqual(s.caught,{koi:1});}
});
test('golden Koi keeps its artwork through growth, movement and resume with no inherited colour or statistical bonus',()=>{
 const s=pair(),e=copy(lay(s));P.sync(s,catalog,5);const f=s.petLife.fish.find(f=>f.uid==='pet-3');assert.equal(A.appearance(f,catalog).artId,'koiGold');assert.equal(P.lifeStage(f,catalog),'fry');
 assert.equal(P.moveFish(s,f.uid,1,catalog,5).ok,true);for(let day=5;day<18;day++){P.care(s,f.uid,'feed',day,catalog);P.care(s,f.uid,'water',day,catalog);P.sync(s,catalog,day+1);}
 assert.equal(P.lifeStage(f,catalog),'adult');assert.equal(A.appearance(f,catalog).artId,'koiGold');assert.deepEqual(f.mutation,e.mutation);assert.deepEqual(P.buyBackQuote(f,catalog),P.buyBackQuote({...f,mutation:M.normal()},catalog));assert.deepEqual(P.fishScore(f),P.fishScore({...f,mutation:M.normal()}));
 const snapshot=copy(s);P.normalize(s,catalog,dogs,18);assert.deepEqual(s,snapshot);assert.deepEqual(s.caught,{koi:1});
 const gold=pair(P,'a'.repeat(32)),normal=copy(gold);P.normalize(normal,catalog,dogs,0);gold.petLife.fish.forEach(f=>f.mutation={checked:true,kind:'gold',ruleVersion:1});assert.deepEqual(copy(lay(gold)),copy(lay(normal)));assert.equal(gold.petLife.eggs[0].mutation.kind,'normal');
});
test('Funa and Koi discoveries stay independent and notifications commit together or roll back together',()=>{
 const s=pair(),gold={checked:true,kind:'gold',ruleVersion:1};for(const [species,uid]of [['funa','pet-8'],['koi','pet-9']]){M.discover(s.petLife,{species,uid,mutation:gold},5);M.discover(s.petLife,{species,uid:'pet-10',mutation:gold},6);}
 assert.deepEqual(s.petLife.mutationDiscoveries.map(d=>[d.species,d.firstUid]),[['funa','pet-8'],['koi','pet-9']]);assert.deepEqual(M.acknowledge(s,()=>false),[]);assert.ok(s.petLife.mutationDiscoveries.every(d=>!d.notified));
 const notices=M.acknowledge(s,()=>{assert.ok(s.petLife.mutationDiscoveries.every(d=>d.notified));return true;});assert.equal(notices.length,2);assert.deepEqual(M.acknowledge(s,()=>{throw Error('must not write');}),[]);
});
test('actual aquarium UI names golden Koi, preserves the prior Funa record and safely displays unknown future colours',()=>{
 const a=boot(fixture()),w=a.window;try{w.eval('petUi.open("aquarium")');assert.equal(read(w,'s.petLife.eggs[0].mutation.kind'),'gold');w.eval('s.gameMinutes=190*1440+360;ShuPetLife.sync(s,petCatalog,190);petUi.open("aquarium")');
  assert.match(w.document.querySelector('.pet-discovery').textContent,/黄金のコイ/);w.document.querySelector('[data-pet-inspect="pet-6"]').click();w.document.querySelector('[data-pet-action="records"]').click();
  assert.match(w.document.querySelector('.pet-discoveries').textContent,/黄金のフナ/);assert.match(w.document.querySelector('.pet-discoveries').textContent,/黄金のコイ/);assert.equal(read(w,'fish.length'),60);
  w.eval('s.petLife.fish.find(f=>f.uid==="pet-6").mutation={checked:true,kind:"future_pearl",ruleVersion:2}');assert.equal(read(w,'ShuAquariumLife.appearance(s.petLife.fish.find(f=>f.uid==="pet-6"),petCatalog).artId===undefined'),true);assert.deepEqual(a.errors,[]);
 }finally{a.dispose();}
});
test('golden Koi atlas draws all eight poses and 97 turn positions without changing ordinary catalogues or original artwork',async()=>{
 const {createCanvas,loadImage}=require('@napi-rs/canvas'),root=path.resolve(__dirname,'..'),sha=file=>crypto.createHash('sha256').update(fs.readFileSync(path.join(root,file))).digest('hex');
 assert.equal(sha('assets/fish-lake-v208.png'),'d15babca220116e0d0c04bf4fed6b667d373b237f7c3f9cd64c4ebe9c87dd119');assert.equal(sha('assets/aquarium-funa-gold-v251-8.png'),'602c861e1b1f7e60dc9bc84c135fd187cd56cba880580f6ce74dfb62ffc4326d');assert.equal(Art.species.koiGold,undefined);assert.equal(Object.keys(Art.species).length,60);
 const im=await loadImage(path.join(root,Art.aquarium.koiGold.asset));assert.equal(im.width,1536);assert.equal(im.height,1024);const samples=[];
 for(let i=0;i<=96;i++)samples.push([7,i/16]);samples.push([3,2]);for(const [cells,frame]of samples){const c=createCanvas(448,224),ctx=c.getContext('2d');Art.draw(ctx,im,'koiGold',cells,frame,()=>im);const d=ctx.getImageData(0,0,448,224).data;let visible=0,gold=0;for(let i=0;i<d.length;i+=4)if(d[i+3]>=128){visible++;if(d[i]>d[i+2]*1.3&&d[i+1]>d[i+2]*1.1)gold++;}assert.ok(visible>3000&&visible<448*224*.7,'visible isolated turn '+frame);assert.ok(gold/visible>.55);}
 const sw=fs.readFileSync(path.join(root,'sw.js'),'utf8');assert.ok(sw.includes('"./assets/aquarium-koi-gold-v252-9.png"'));assert.ok(sw.includes('"./assets/aquarium-funa-gold-v251-8.png"'));
});
