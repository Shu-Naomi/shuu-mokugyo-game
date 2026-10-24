const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const {boot,read,saveKey}=require('./game-harness.cjs'),{fixture,fish}=require('./aquarium-identity-fixture.cjs');
const registryKey='nushi-pet-identity-display-v1:'+saveKey;
const click=(w,q)=>{const el=w.document.querySelector(q);assert.ok(el,q);assert.equal(el.disabled,false,q);el.click();};
const profile=w=>w.document.querySelector('.pet-profile-identity').textContent;
const open=a=>{a.window.eval('petUi.open("aquarium")');return a.window;};
const displayStorage=w=>({[registryKey]:w.localStorage.getItem(registryKey)});

test('identity labels distinguish stored founders, descendants and unknown legacy fields without guessing',()=>{
 const scope={};vm.runInNewContext(fs.readFileSync(path.join(__dirname,'../pet-life-ui.js'),'utf8'),scope);
 const labels=scope.ShuPetUI.identityLabels;
 assert.equal(labels({sex:'male',generation:0}).sexText,'♂ オス');assert.equal(labels({sex:'female',generation:1}).generation,'2代目');
 assert.equal(labels({sex:'female',generation:'2'}).generation,'3代目');assert.equal(labels({generation:20}).generation,'21代目');
 for(const sex of [undefined,null,'',0,'unknown'])assert.equal(labels({sex}).sex,'性別不明');
 for(const generation of [undefined,null,'',-1,1.5,21,NaN])assert.equal(labels({generation}).generation,'世代不明');
 assert.equal(labels({sex:'male',generation:0},{sex:true,generation:true}).sex,'性別不明');
});

test('five roster choices and the always visible profile agree on sex, generations and fry; inspecting never changes fish or eggs',()=>{
 const a=boot(fixture()),w=open(a);try{
  const before=read(w,'({fish:s.petLife.fish,eggs:s.petLife.eggs,food:s.petLife.food,money:s.money,time:s.gameMinutes})');
  for(const [uid,compact,detail] of [['pet-23','#23 ♂ 初代','♂ オス · 初代'],['pet-32','#32 ♀ 2代目','♀ メス · 2代目'],['pet-33','#33 ♂ 3代目','♂ オス · 3代目'],['pet-34','#34 性別不明 世代不明','性別不明 · 世代不明'],['pet-35','#35 ♀ 21代目','♀ メス · 21代目']]){
   const card=w.document.querySelector('[data-pet-identity="'+uid+'"]');assert.ok(card.textContent.startsWith(compact));
   click(w,'.pet-fish-roster [data-pet-inspect="'+uid+'"]');assert.equal(profile(w),detail);
   assert.match(w.document.querySelector('.pet-tank-info h3').textContent,new RegExp('イサキ #'+uid.slice(4)+'.*Lv\\.'));
   assert.ok(w.document.querySelector('.pet-xp-line').textContent.includes('40/'));
  }
  click(w,'.pet-fish-roster [data-pet-inspect="pet-33"]');assert.match(w.document.querySelector('[data-pet-size-rank]').textContent,/稚魚/);
  click(w,'.pet-fish-roster [data-pet-inspect="pet-34"]');click(w,'[data-pet-action="records"]');
  assert.match(w.document.querySelector('.pet-stats').textContent,/性別\s*性別不明.*世代・星\s*世代不明/s);
  assert.deepEqual(read(w,'({fish:s.petLife.fish,eggs:s.petLife.eggs,food:s.petLife.food,money:s.money,time:s.gameMinutes})'),before);
  assert.deepEqual(a.errors,[]);
 }finally{a.dispose();}
});

test('missing legacy identity remains unknown after the unchanged game save and resume, without adding identity provenance to game fields',()=>{
 const a=boot(fixture()),w=open(a);let saved,storage;try{
  click(w,'.pet-fish-roster [data-pet-inspect="pet-34"]');assert.equal(profile(w),'性別不明 · 世代不明');
  saved=JSON.parse(w.localStorage.getItem(saveKey));storage=displayStorage(w);
  assert.equal(saved.petLife.version,6);assert.equal(saved.petLife.fish.find(f=>f.uid==='pet-34').sex,'female');
  assert.equal(Object.keys(saved.petLife.fish[0]).some(k=>/identity|unknown/i.test(k)),false);
 }finally{a.dispose();}
 const b=boot(saved,undefined,{storage}),v=open(b);try{
  assert.equal(profile(v),'性別不明 · 世代不明');assert.deepEqual(read(v,'s.petLife.fish'),saved.petLife.fish);
  click(v,'.pet-fish-roster [data-pet-inspect="pet-23"]');assert.equal(profile(v),'♂ オス · 初代');assert.deepEqual(b.errors,[]);
 }finally{b.dispose();}
});

test('legacy display notes survive growth and moving, but do not override a different stored identity or a new fish',()=>{
 const a=boot(fixture()),w=open(a);let saved,storage;try{
  click(w,'.pet-fish-roster [data-pet-inspect="pet-34"]');saved=JSON.parse(w.localStorage.getItem(saveKey));storage=displayStorage(w);
 }finally{a.dispose();}
 const old=saved.petLife.fish.find(f=>f.uid==='pet-34');old.length+=100;old.tank=4;saved.petLife.selectedTank=4;
 const b=boot(saved,undefined,{storage}),v=open(b);try{assert.equal(profile(v),'性別不明 · 世代不明');}finally{b.dispose();}
 old.sex='male';old.generation=2;old.origin='bred';
 const c=boot(saved,undefined,{storage}),u=open(c);try{assert.equal(profile(u),'♂ オス · 3代目');}finally{c.dispose();}
 saved.petLife.fish=[fish('pet-36','female',0)];saved.petLife.selected='pet-36';saved.petLife.selectedTank=1;
 const d=boot(saved,undefined,{storage}),z=open(d);try{assert.equal(profile(z),'♀ メス · 初代');assert.deepEqual(JSON.parse(z.localStorage.getItem(registryKey)).rows,[]);}finally{d.dispose();}
});

test('display notes are isolated by save slot; already stored identities stay authoritative without notes',()=>{
 const a=boot(fixture()),w=open(a);let saved,storage;try{
  click(w,'.pet-fish-roster [data-pet-inspect="pet-34"]');saved=JSON.parse(w.localStorage.getItem(saveKey));storage=displayStorage(w);
 }finally{a.dispose();}
 const b=boot(saved,undefined,{storage:{...storage,[saveKey+'-slot2']:saved},url:'http://localhost/nushi-tsuri/?saveSlot=2'}),v=open(b);
 try{assert.equal(profile(v),'♀ メス · 初代');assert.deepEqual(b.errors,[]);}finally{b.dispose();}
});

test('bad optional display metadata never prevents opening a legacy aquarium',()=>{
 for(const value of ['broken JSON',JSON.stringify({version:1,rows:[null,{},'bad']})]){
  const a=boot(fixture(),undefined,{storage:{[registryKey]:value}}),w=open(a);try{
   click(w,'.pet-fish-roster [data-pet-inspect="pet-34"]');assert.equal(profile(w),'性別不明 · 世代不明');assert.deepEqual(a.errors,[]);
  }finally{a.dispose();}
 }
});
