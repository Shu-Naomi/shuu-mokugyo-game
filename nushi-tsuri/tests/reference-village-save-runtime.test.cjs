'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const {boot,seed,read,saveKey}=require('./game-harness.cjs');
const url='http://localhost/nushi-tsuri/?villageReference=1';
const keep=w=>read(w,'({money:s.money,hp:s.hp,maxHp:s.maxHp,gameMinutes:s.gameMinutes,caught:s.caught,baits:s.baits,cookingIngredients:s.cookingIngredients,preparedMeals:s.preparedMeals,dog:s.dog,dogAffinity:s.dogAffinity,questCompletions:s.questCompletions,mapVersion:s.mapVersion})');

test('old village coordinates migrate only in isolated preview and preserve original slot bytes and progress',()=>{
 const original={...seed(),mapRegion:'village',x:74,y:39.5,soundEnabled:false},raw=JSON.stringify(original);
 const normal=boot(original),preview=boot(original,undefined,{url});let snapshot,serialized;
 try{
  const w=preview.window;assert.deepEqual(preview.errors,[]);assert.deepEqual(keep(w),keep(normal.window));
  const pos=read(w,'[s.x,s.y]');assert.notDeepEqual(pos,[74,39.5]);assert.equal(w.isWalkableWorld(...pos),true);
  assert.equal(read(w,'s.referenceVillageLayout'),'source-11016-1');
  assert.equal(w.localStorage.getItem(saveKey),raw);
  w.save();snapshot=keep(w);serialized=w.localStorage.getItem(w.ShuSaveSlots.keyFor(1));
  assert.equal(w.localStorage.getItem(saveKey),raw);assert.ok(serialized);
 }finally{normal.dispose();preview.dispose();}
 const restarted=boot(original,undefined,{url,storage:{'nushi-reference-village-pilot-v1-slot1':serialized}});
 try{assert.deepEqual(keep(restarted.window),snapshot);assert.deepEqual(restarted.errors,[]);assert.equal(restarted.window.localStorage.getItem(saveKey),raw);}finally{restarted.dispose();}
});

test('reopening a migrated preview does not teleport an already valid play position again',()=>{
 const saved={...seed(),mapRegion:'village',referenceVillageLayout:'source-11016-1',x:115,y:79,soundEnabled:false};
 const app=boot(saved,undefined,{url});try{
  assert.equal(app.window.isWalkableWorld(saved.x,saved.y),true);assert.deepEqual(read(app.window,'[s.x,s.y]'),[115,79]);
  assert.deepEqual(app.errors,[]);
 }finally{app.dispose();}
});

test('old-save reference migration leaves offshore coordinates and progress alone',()=>{
 const saved={...seed(),mapRegion:'offshore',x:118,y:104,soundEnabled:false};
 const normal=boot(saved),preview=boot(saved,undefined,{url});try{
  assert.deepEqual(read(preview.window,'[s.x,s.y,s.mapRegion]'),read(normal.window,'[s.x,s.y,s.mapRegion]'));
  assert.deepEqual(keep(preview.window),keep(normal.window));assert.deepEqual(preview.errors,[]);
  assert.equal(preview.window.localStorage.getItem(saveKey),JSON.stringify(saved));
 }finally{normal.dispose();preview.dispose();}
});

test('second-slot preview writes and remembers only its private keys',()=>{
 const one={...seed(),money:1111},two={...seed(),money:2222,mapRegion:'village',x:109,y:82};
 const key2='nushi-inugoya-v2-slot2',app=boot(one,undefined,{url:url+'&saveSlot=2',storage:{[key2]:JSON.stringify(two),'nushi-inugoya-last-slot':'1'}});
 try{
  assert.equal(read(app.window,'s.money'),2222);app.window.save();
  assert.equal(app.window.localStorage.getItem(saveKey),JSON.stringify(one));assert.equal(app.window.localStorage.getItem(key2),JSON.stringify(two));
  assert.equal(app.window.localStorage.getItem('nushi-inugoya-last-slot'),'1');
  assert.equal(JSON.parse(app.window.localStorage.getItem(app.window.ShuSaveSlots.keyFor(2))).money,2222);
  assert.deepEqual(app.errors,[]);
 }finally{app.dispose();}
});

test('imported offshore, mountain, rural and canoe saves return to their new anchors instead of being rescued home',()=>{
 const cases=[
  {region:'offshore',x:130,y:96,run:w=>w.eval('ShuOffshore.voyage(s,true);render()'),target:w=>w.ShuOffshore.harbor},
  {region:'stream',x:152,y:128,run:w=>w.action(),target:w=>w.ShuMountain.villageReturn},
  {region:'ruralCanals',x:114,y:129,run:w=>w.action(),target:w=>w.ShuRural.villageReturn},
  {region:'coast',x:166,y:123,run:w=>w.landBoat(),target:w=>w.ShuVillageReference.routes.boat.land,
   extra:{boatActive:true,ownedVehicles:['canoe'],equipment:{vehicle:'canoe'}}},
 ];
 for(const c of cases){
  const saved={...seed(),mapRegion:c.region,x:c.x,y:c.y,direction:'down',soundEnabled:false,...c.extra};
  const app=boot(saved,undefined,{url});try{
   const w=app.window,original=JSON.stringify(saved);assert.equal(read(w,'s.mapRegion'),c.region);
   assert.equal(read(w,'s.referenceVillageLayout'),'source-11016-1');
   c.run(w);const target=c.target(w);assert.equal(read(w,'s.mapRegion'),'village');
   assert.deepEqual(read(w,'[s.x,s.y]'),[target.x,target.y],c.region+' return uses its painted arrival');
   for(let i=0;i<3;i++)w.render();assert.deepEqual(read(w,'[s.x,s.y]'),[target.x,target.y]);
   assert.equal(w.isWalkableWorld(target.x,target.y),true);assert.equal(w.localStorage.getItem(saveKey),original);
   if(c.region==='coast')for(let i=0;i<3;i++){
    assert.equal(w.boardBoat(),true);assert.deepEqual(read(w,'[s.x,s.y,s.mapRegion]'),[166,123,'coast']);
    assert.equal(w.landBoat(),true);assert.deepEqual(read(w,'[s.x,s.y,s.mapRegion]'),[target.x,target.y,'village']);
   }
   assert.deepEqual(app.errors,[]);
  }finally{app.dispose();}
 }
});
