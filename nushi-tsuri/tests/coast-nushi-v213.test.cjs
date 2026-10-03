const {test}=require('node:test'),assert=require('node:assert/strict');
const R=require('../regional-nushi.js'),F=require('../fishing-duel.js');
const {boot,seed,read,saveKey}=require('./game-harness.cjs');
const ready=rod=>({...seed(),hp:100,soundEnabled:false,mapRegion:'coast',boatActive:true,x:95,y:84,direction:'up',
  ownedVehicles:['canoe'],equipment:{hands:null,vehicle:'canoe'},ownedRods:[rod],selectedRod:rod,
  fightMode:'nushi',baits:{shrimp:40},selectedBait:'shrimp',selectedHook:'large',
  regionalCaught:{coast:Object.fromEntries(R.ordinary.coast.map(id=>[id,1]))},regionalCatchVersion:1});

test('correctly yielding then pulling short slack windows makes net progress with a suitable sea rod',()=>{
  const b={f:{id:'coastNushi'},retrieval:.2,ten:18,distanceFactor:1.55};
  const gear={strength:F.strengths.shoreReed,power:32,control:1.65};
  // A sustained run followed by a brief slack window, with no pulling while it runs.
  for(let cycle=0;cycle<8;cycle++){
    b.reeling=false;for(let i=0;i<36;i++)F.step(b,{calm:false,danger:true},gear,1);
    b.reeling=true;for(let i=0;i<5;i++)F.step(b,{calm:true},gear,1);
  }
  assert.ok(b.retrieval>.2,'earned distance survives the next run');assert.ok(b.ten<100);
  b.ten=70;b.reeling=true;for(let i=0;i<10;i++)F.step(b,{calm:false,danger:true},gear,1);
  assert.ok(b.ten>=100,'pulling a running boss still breaks the line');
});

test('actual sea boss bites, hook sets and seeded changing moods reach landing with the sea rods and persist exactly once',()=>{
  for(const [rod,tier]of [['shoreReed',.5],['tideMaster',.5],['tideMaster',.999]])for(const rngSeed of [301,907,1717]){
    const app=boot(ready(rod)),w=app.window;let saved;
    try{
      w.eval('action();beginFishing();clearInterval(timer);Math.random=()=>.999999;battle.cast=85;launchSurfaceCast();settleSurfaceCast()');
      assert.equal(read(w,'battle.spot'),'coast-reef-deep');assert.equal(read(w,'battle.f.id'),'coastNushi');
      w.eval(`battle.specimen=rollFishSpecimen(battle.f,()=>${tier});var testNow=200000,testRng=${rngSeed};Date.now=()=>testNow;
        Math.random=()=>((testRng=Math.imul(testRng,1664525)+1013904223>>>0)/4294967296);
        battle.biteAt=testNow;pull();releaseBattleAction();stopBattleFishArt();
        var fightTick;setInterval=callback=>(fightTick=callback,9001);battleTick();
        renderBattleFish=()=>{};drawBattle=()=>{};updateWaterFx=()=>{}`);
      assert.equal(read(w,'battle.phase'),'fight');
      const result=read(w,`(()=>{let ticks=0;for(;ticks<6000&&battle?.phase==="fight";ticks++){testNow+=120;
        if(!battle.mood||testNow>battle.nextMood)chooseFishMood();
        if(!battle.gillWash&&battle.mood.calm&&battle.ten<75)pull();else releaseBattleAction();fightTick();}
        return {ticks,phase:battle?.phase,retrieval:battle?.retrieval,ten:battle?.ten};})()`);
      assert.equal(result.phase,'landing',`${rod}/${tier}/${rngSeed}: ${JSON.stringify(result)}`);
      assert.ok(result.retrieval>=.999);assert.ok(result.ten<100);
      const before=read(w,'({count:s.caught.coastNushi||0,money:s.money,price:battle.specimen.price})');
      w.caught();w.caught();assert.equal(read(w,'s.caught.coastNushi'),before.count+1);
      assert.equal(read(w,'s.money'),before.money+before.price);assert.equal(read(w,'s.baits.shrimp'),39);
      saved=JSON.parse(w.localStorage.getItem(saveKey));assert.deepEqual(app.errors,[]);
    }finally{app.dispose();}
    const restored=boot(saved);try{assert.equal(read(restored.window,'s.caught.coastNushi'),1);}finally{restored.dispose();}
  }
});
