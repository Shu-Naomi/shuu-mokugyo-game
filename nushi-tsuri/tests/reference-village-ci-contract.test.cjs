'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const {boot}=require('./game-harness.cjs');
const runner=require('./browser-reference-village-evidence.cjs');
test('CI runtime fingerprint matches the frozen runtime independently of commit metadata',()=>{
 assert.equal(runner.runtimeTreeDigest(),runner.RUNTIME_TREE_SHA256);
});
test('CI read-only route planner reaches facilities and gates without automatic village exits',()=>{
 const app=boot(undefined,undefined,{url:'http://localhost/nushi-tsuri/?villageReference=1'});
 try{
  const w=app.window;w.eval('Math.random=()=>.999999');
  const goals=[...['farmhouse','west-shrine','yaoya','diner','main-shrine','fish-market','harbor-shop','watermill','riao-tcg-shop','quest-board'].map(id=>`(x,y,d)=>{const old=[s.x,s.y,s.direction];s.x=x;s.y=y;s.direction=d;const ok=nearbyWorldLandmark(x,y,d)?.id===${JSON.stringify(id)}&&!activeLandingDock()&&!nearbyRival()&&!nearbyTournamentNpc();[s.x,s.y,s.direction]=old;return ok;}`),'(x,y)=>isAtSamShopEntrance(x,y)','(x,y)=>ShuMountain.atVillageGate(x,y)','(x,y)=>ShuRural.atVillageGate(x,y)','(x,y)=>!isAtPlayerHomeMapEntrance(x,y)&&((n)=>isAtPlayerHomeMapEntrance(n.x,n.y))(ShuWorldLife.moveTarget(x,y,"left",4,isWalkableWorld))'];
  for(const predicate of goals){
   const route=w.eval(`(${runner.planVillageRoute.toString()})(${JSON.stringify(predicate)})`);
   for(const d of route){
    const safe=w.eval(`!(${JSON.stringify(d)}==='left'&&isAtPlayerHomeMapEntrance()||${JSON.stringify(d)}==='right'&&ShuRural.atVillageGate(s.x,s.y)||${JSON.stringify(d)}==='up'&&s.y<=6&&ShuMountain.atVillageGate(s.x,s.y))`);assert.ok(safe,'planned edge cannot automatically leave village');
    // This is a planner fixture, not browser/control evidence. The CI runner
    // presses these directions through real controls and checks each result.
    w.eval(`Object.assign(s,ShuWorldLife.moveTarget(s.x,s.y,${JSON.stringify(d)},4,isWalkableWorld),{direction:${JSON.stringify(d)}})`);
   }
   assert.equal(w.eval(`(${predicate})(s.x,s.y,s.direction)`),true,predicate);
   if(predicate.includes('harbor-shop')){
    assert.equal(w.eval('s.direction'),'up','door is reached with an achievable up-facing direction');
    w.action();assert.ok(w.document.querySelector('#vehicleShop').classList.contains('open'),'actual A selects boat shop after real-direction route');w.eval('close()');
   }
  }
 }finally{app.dispose();}
});
