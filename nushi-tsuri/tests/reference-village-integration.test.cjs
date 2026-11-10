const assert=require('node:assert/strict');const {boot,read,seed}=require('./game-harness.cjs');
const saved={...seed(),mapRegion:'village',x:222,y:122,money:8274};
const h=boot(saved,undefined,{url:'http://localhost/nushi-tsuri/?villageReference=1'});
try{
 assert.deepEqual(h.errors,[]);const w=h.window;assert.equal(w.ShuVillageReference.enabled,true);
 assert.equal(read(w,'s.money'),saved.money);assert.equal(read(w,'s.questCompletions'),saved.questCompletions);assert.equal(read(w,'s.referenceVillageLayout'),'source-11016-1');
 const phaseResults=w.eval(`(${function referencePhaseAudit(){
  const ref=ShuVillageReference, failures=[],representatives={};
  const predicates={
   ...Object.fromEntries(Object.keys(ref.landmarks).filter(id=>id!=='sam-shop').map(id=>[id,(x,y)=>nearbyWorldLandmark(x,y,'up')?.id===id])),
   'sam-shop':(x,y)=>isAtSamShopEntrance(x,y),practice:(x,y)=>isNearPracticePond(x,y),
   home:(x,y)=>isAtPlayerHomeMapEntrance(x,y),
   north:(x,y)=>y<=6&&ShuMountain.atVillageGate(x,y),east:(x,y)=>ShuRural.atVillageGate(x,y),
   ferry:(x,y)=>ShuOffshore.atPier({...s,x,y}),
   boat:(x,y)=>{const old=[s.x,s.y];s.x=x;s.y=y;const result=activeLandingDock()?.id==='harbor';[s.x,s.y]=old;return result;},
   bridge:(x,y)=>isOnRiverBridgeSpan(x,y),
  };
  for(let px=0;px<4;px++)for(let py=0;py<4;py++){
   const key=(x,y)=>x+','+y,start=[Math.round((ref.exits.home.return.x-px)/4)*4+px,Math.round((ref.exits.home.return.y-py)/4)*4+py];
   const seen=new Set([key(...start)]),queue=[start];
   for(let i=0;i<queue.length;i++){
    const [x,y]=queue[i];
    for(const [dx,dy]of [[4,0],[-4,0],[0,4],[0,-4]]){
     const a=x+dx,b=y+dy,k=key(a,b);
     if(!seen.has(k)&&isWalkableWorldSegment(x,y,a,b)){seen.add(k);queue.push([a,b]);}
    }
   }
   for(const [id,predicate]of Object.entries(predicates)){
    const candidates=queue.filter(([x,y])=>predicate(x,y));
    if(!candidates.length)failures.push([px,py,id]);
    if(px===0&&py===0&&candidates.length){
     const target=ref.landmarks[id]||ref.routes.offshore.harbor;
     candidates.sort((a,b)=>Math.hypot(a[0]-target.x,a[1]-target.y)-Math.hypot(b[0]-target.x,b[1]-target.y));
     representatives[id]=candidates[0];
    }
   }
  }
  return {failures,representatives};
 }.toString()})()`);
 assert.deepEqual(JSON.parse(JSON.stringify(phaseResults.failures)),[]);
 // Exercise the real A dispatcher from BFS-reachable grid points. Opening
 // menus and notices is free; never buy, rest, cast, or pay a ferry fare.
 const expected={farmhouse:'locationInterior',yaoya:'locationInterior',diner:'locationInterior','main-shrine':'locationInterior','fish-market':'locationInterior',watermill:'petLifeModal','harbor-shop':'vehicleShop','quest-board':'questBoard','sam-shop':'store',ferry:'offshoreFerry','west-shrine':null,'riao-tcg-shop':null};
 w.eval("ensureForageCycle();s.forageCycle.active=Object.fromEntries(foragePointData.map(p=>[p.id,'worm']));s.forageCycle.harvested=[];");
 const resources=read(w,'({money:s.money,hp:s.hp,gameMinutes:s.gameMinutes,baits:s.baits,caught:s.caught})');
 for(const [id,modal]of Object.entries(expected)){
  const [x,y]=phaseResults.representatives[id];
  w.eval(`close();s.x=${x};s.y=${y};s.direction='up';action();`);
  if(modal)assert.ok(w.document.querySelector('#'+modal).classList.contains('open'),id+' A opens '+modal);
  else {
   assert.equal(w.document.querySelector('.modal.open'),null,id+' remains notice-only');
   assert.match(w.document.querySelector('#rescueToast').textContent,/準備中/,id+' notice shown');
  }
  if(modal==='locationInterior')assert.equal(read(w,'activeLocationId'),id,id+' selects correct interior');
  assert.deepEqual(read(w,'({money:s.money,hp:s.hp,gameMinutes:s.gameMinutes,baits:s.baits,caught:s.caught})'),resources,id+' opening does not spend resources');
  w.eval('close()');
 }
 assert.ok(w.document.querySelector('#villageReferenceNotice'));
 assert.equal(w.document.querySelector('#offshoreShip').hidden,true);
 assert.equal(w.document.querySelector('#ruralSign').hidden,true);
}finally{h.dispose();}
const normal=boot(saved);try{assert.deepEqual(normal.errors,[]);assert.equal(normal.window.ShuVillageReference.enabled,false);assert.equal(normal.window.document.querySelector('#villageReferenceNotice'),null);assert.equal(read(normal.window,'s.referenceVillageLayout || null'),null);}finally{normal.dispose();}
console.log('Reference integration: actual collision phases, position-only migration and baseline gate pass');
