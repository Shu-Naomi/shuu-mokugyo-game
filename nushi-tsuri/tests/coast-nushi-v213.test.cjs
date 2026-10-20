const {test}=require('node:test'),assert=require('node:assert/strict');
const R=require('../regional-nushi.js'),F=require('../fishing-duel.js');
const {boot,seed,read,saveKey}=require('./game-harness.cjs');
const ready=rod=>({...seed(),hp:100,soundEnabled:false,mapRegion:'coast',boatActive:true,x:95,y:84,direction:'up',
  ownedVehicles:['canoe'],equipment:{hands:null,vehicle:'canoe'},ownedRods:[rod],selectedRod:rod,
  fightMode:'nushi',baits:{shrimp:40},selectedBait:'shrimp',selectedHook:'large',
  regionalCaught:{coast:Object.fromEntries(R.ordinary.coast.map(id=>[id,1]))},regionalCatchVersion:1});

test('species pull windows overcome real escape distance with a suitable sea rod and timely release',()=>{
  const b={fightMode:'nushi',f:{id:'coastNushi'},retrieval:.2,startMeters:29,ten:18,distanceFactor:1.55};let now=10000;
  const gear={strength:F.strengths.shoreReed,power:32,control:1.65};
  // Secure an actual species opening, release, then let the next run take line.
  for(let cycle=0;cycle<8;cycle++){
    b.mood={id:'rest',calm:true};F.beginWindow(b,b.mood,500,now,()=>.3);F.acceptPull(b,now);b.reeling=true;
    const end=b.nushiWindow.warnAt;for(;now<end;now+=120)F.step(b,b.mood,gear,1,now);
    F.releasePull(b,now);b.reeling=false;const gained=b.retrieval;b.mood={id:'run',calm:false,danger:true};
    for(let i=0;i<36;i++){F.step(b,b.mood,gear,1,now);b.moodTick=(b.moodTick||0)+1;now+=120;}
    assert.ok(b.retrieval<gained,'a running fish really takes line after release');
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
        battle.biteAt=testNow;syncBitePhase();pull();releaseBattleAction();stopBattleFishArt();
        var fightTick;setInterval=callback=>(fightTick=callback,9001);battleTick();
        renderBattleFish=()=>{};syncBattleFishLine=()=>{};updateTensionFeedback=()=>{};updateWaterFx=()=>{}`);
      assert.equal(read(w,'battle.phase'),'fight');
      const result=read(w,`(()=>{let ticks=0;for(;ticks<6000&&battle?.phase==="fight";ticks++){testNow+=120;
        const scene=document.querySelector('#fishScene'),phase=scene.dataset.nushiPhase;
        if(!scene.classList.contains('gill-wash')&&(phase==='slack'||phase==='pulling'))pull();else releaseBattleAction();fightTick();}
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
