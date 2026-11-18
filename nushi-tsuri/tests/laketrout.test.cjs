const {test}=require('node:test');
const assert=require('node:assert/strict');
const {boot,seed,read,saveKey}=require('./game-harness.cjs');
const {runFight}=require('./nushi-playability-v228.cjs');
const {definitions,pools}=require('../fish-additions.js');
test('lake trout is number 66 and lives in the high pond deep pool',()=>{
 const fish=definitions.find(f=>f.id==='laketrout');
 assert.equal(fish.number,66);
 assert.deepEqual(Object.keys(pools).filter(id=>pools[id].laketrout),['mountain-highPond-deep']);
});
for(const mode of ['gauge','nushi'])for(const tier of [.5,.999999]){
 test('lake trout with water FX and 600 ms reaction: '+mode+' '+tier,()=>{
  const r=runFight({id:'laketrout',mode,tier,rod:tier>.9?'starGazer':'clearStream',delayMs:600,rngSeed:301,waterFxSeed:301,gaugeThreshold:45,gaugeResumeThreshold:20});
  assert.deepEqual(r.errors,[]);
  assert.equal(r.phase,'landing',JSON.stringify(r));
  assert.ok(r.seconds<180 && r.maxTension<100,JSON.stringify(r));
 });
}

test('a legacy slot can board, reload and withdraw its first lake trout',()=>{
 const a=boot({...seed(),caught:{browntrout:2,laketrout:1}});
 let saved;
 try{
  const w=a.window;
  assert.equal(read(w,'fish.length'),67);
  assert.equal(read(w,"petCatalog.find(f=>f.id==='laketrout').waterLabel"),'淡水');
  w.eval("var trout=ShuPetLife.acquire(s,'laketrout',petCatalog,0);trout.fish.nickname='白星';var boarded=ShuPetLife.boardFish(s,trout.fish.uid,petCatalog,0);save()");
  assert.equal(read(w,'boarded.ok'),true);
  saved=JSON.parse(w.localStorage.getItem(saveKey));
 }finally{a.dispose();}
 const b=boot(saved);
 try{
  const w=b.window;
  assert.equal(read(w,'s.petLife.boarded[0].nickname'),'白星');
  assert.equal(read(w,'ShuPetLife.withdrawFish(s,s.petLife.boarded[0].uid,0,petCatalog,1).ok'),true);
  assert.deepEqual(read(w,'[s.caught.browntrout,s.caught.laketrout]'),[2,1]);
  assert.deepEqual(b.errors,[]);
 }finally{b.dispose();}
});
