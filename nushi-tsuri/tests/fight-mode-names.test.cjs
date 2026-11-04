const {test}=require('node:test'),assert=require('node:assert/strict');
const {boot,seed,read,saveKey}=require('./game-harness.cjs');
const Fishing=require('../fishing-duel.js');
const names={gauge:'テンション方式',nushi:'クラシック方式'};
test('fight labels change without changing persisted mode identifiers',()=>{
 assert.deepEqual(Fishing.modes,names);
 for(const mode of ['gauge','nushi']){
  const app=boot({...seed(),fightMode:mode});
  try{
   const w=app.window;
   assert.equal(read(w,'s.fightMode'),mode);
   w.eval('openInventory("tackle");renderTackle()');
   for(const [id,name]of Object.entries(names)){
    assert.equal(w.document.querySelector(`#inventory [data-fight-mode="${id}"]`).textContent,name);
    assert.equal(w.document.querySelector(`#castFightOptions [data-fight-mode="${id}"]`).textContent,name);
   }
   assert.match(w.document.querySelector('#inventoryTackleSummary').textContent,new RegExp(names[mode]));
   const other=mode==='gauge'?'nushi':'gauge';
   w.document.querySelector(`#inventory [data-fight-mode="${other}"]`).click();
   assert.equal(read(w,'s.fightMode'),other);
   const saved=JSON.parse(w.localStorage.getItem(saveKey));
   assert.equal(saved.fightMode,other);
   const again=boot(saved);
   try{assert.equal(read(again.window,'s.fightMode'),other);assert.deepEqual(again.errors,[]);}finally{again.dispose();}
   assert.deepEqual(app.errors,[]);
  }finally{app.dispose();}
 }
});
test('legacy catch memories display current names without rewriting their IDs',()=>{
 const first={hundredths:2150,tierId:'normal',gameMinutes:500,spotId:'lake-shallow',castLocale:'lake',rodId:'bamboo',baitId:'worm',hookId:'small',method:'bait',fightMode:'gauge',weatherId:'sunny',dogId:'shuu'};
 const best={...first,hundredths:4999,tierId:'giant',fightMode:'nushi'};
 const app=boot({...seed(),sizeRecords:{funa:{hundredths:4999,tierId:'giant'}},catchMemories:{funa:{first,best}}});
 try{
  const w=app.window;w.eval('fishdexSelectedId="funa";open("record")');
  assert.match(w.document.querySelector('[data-catch-memory="first"]').textContent,/テンション方式/);
  assert.match(w.document.querySelector('[data-catch-memory="best"]').textContent,/クラシック方式/);
  assert.deepEqual(read(w,'s.catchMemories.funa'),{first,best});
  assert.deepEqual(app.errors,[]);
 }finally{app.dispose();}
});
test('player help contains only the new mode names',()=>{
 const fs=require('node:fs'),path=require('node:path');
 const help=fs.readFileSync(path.join(__dirname,'../lake-research.js'),'utf8');
 assert.match(help,/クラシック方式/);assert.match(help,/テンション方式/);
 assert.doesNotMatch(help,/ぬし釣り式|ゲージ式/);
});
