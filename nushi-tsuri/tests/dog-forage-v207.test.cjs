const {test}=require('node:test'),assert=require('node:assert/strict');
const {boot,seed,read,saveKey}=require('./game-harness.cjs');
const secondKey=require('../save-slots.js').keys[2];
const bags=w=>read(w,'({baits:s.baits,items:s.items,treats:s.dogTreats,money:s.money,hp:s.hp,affinity:s.dogAffinity})');
const fixture=(w,destination)=>read(w,`(()=>{const cycle=ensureForageCycle(),point=foragePointData.find(p=>!cycle.harvested.includes(p.id)),itemId=Object.keys(forageData).find(id=>forageData[id].destination===${JSON.stringify(destination)}),item=forageData[itemId];delete cycle.active[point.id];return {point,itemId,name:item.name,bag:item.destination==='bait'?'baits':item.destination==='item'?'items':'dogTreats',id:item.destinationId,amount:ShuPetLife.forageCount(s,s.dog),cycle};})()`);

test('completed dog discoveries go straight into the right bag without a blue marker or a second pickup',()=>{
  const app=boot({...seed(),dog:'grey',soundEnabled:false}),w=app.window;
  try{
    for(const kind of ['bait','item','dogTreat']){
      const f=fixture(w,kind);assert.ok(f.itemId,kind);const before=read(w,`s.${f.bag}[${JSON.stringify(f.id)}]||0`);
      assert.equal(w.finishDogForageDiscovery(f.point,f.itemId,'grey',f.cycle),true);
      assert.equal(read(w,`s.${f.bag}[${JSON.stringify(f.id)}]`),before+f.amount);
      assert.equal(read(w,`ensureForageCycle().active[${JSON.stringify(f.point.id)}]||null`),null);
      assert.equal(read(w,`ensureForageCycle().harvested.filter(id=>id===${JSON.stringify(f.point.id)}).length`),1);
      assert.equal(w.document.querySelector(`[data-forage-point="${f.point.id}"]`),null);
      assert.match(w.document.querySelector('#rescueToast').textContent,/Grey.*掘り出した/);
      const after=bags(w);assert.equal(w.collectForagePoint(f.point.id),false);assert.equal(w.finishDogForageDiscovery(f.point,f.itemId,'grey',f.cycle),false);assert.deepEqual(bags(w),after);
      assert.equal(JSON.parse(w.localStorage.getItem(saveKey))[f.bag][f.id],before+f.amount);
    }
    assert.deepEqual(app.errors,[]);
  }finally{app.dispose();}
});

test('actual bark and digging finish once, autosave slot two and survive reload without granting twice',async()=>{
  const legacy=seed(),app=boot(legacy,undefined,{url:'http://localhost/nushi-tsuri/?saveSlot=2',storage:{[secondKey]:{...seed(),dog:'grey',soundEnabled:false}}}),w=app.window;
  let saved,f,after;
  try{
    f=fixture(w,'bait');const before=read(w,`s.${f.bag}[${JSON.stringify(f.id)}]||0`);
    assert.equal(w.startDogForageDiscovery(f.point,f.itemId),true);assert.equal(w.startDogForageDiscovery(f.point,f.itemId),false);
    assert.equal(read(w,`s.${f.bag}[${JSON.stringify(f.id)}]||0`),before);
    const deadline=Date.now()+6000;
    while(read(w,'forageDiscoveryInProgress')&&Date.now()<deadline)await new Promise(resolve=>setTimeout(resolve,30));
    assert.equal(read(w,'forageDiscoveryInProgress'),false);assert.equal(read(w,`s.${f.bag}[${JSON.stringify(f.id)}]`),before+f.amount);
    assert.equal(w.localStorage.getItem(saveKey),JSON.stringify(legacy));after=bags(w);saved=JSON.parse(w.localStorage.getItem(secondKey));assert.deepEqual(app.errors,[]);
  }finally{app.dispose();}
  const resumed=boot(legacy,undefined,{url:'http://localhost/nushi-tsuri/?saveSlot=2',storage:{[secondKey]:saved}});
  try{assert.equal(resumed.window.finishDogForageDiscovery(f.point,f.itemId,'grey',f.cycle),false);assert.deepEqual(bags(resumed.window),after);assert.deepEqual(resumed.errors,[]);}finally{resumed.dispose();}
});

test('an old digging callback cannot plant or collect loot in a later forage cycle',()=>{
  const app=boot({...seed(),dog:'grey',soundEnabled:false}),w=app.window;
  try{
    const f=fixture(w,'bait'),before=bags(w);w.eval('advanceGameTime(s,300);ensureForageCycle()');
    assert.equal(w.finishDogForageDiscovery(f.point,f.itemId,'grey',f.cycle),false);assert.deepEqual(bags(w),before);assert.deepEqual(app.errors,[]);
  }finally{app.dispose();}
});
