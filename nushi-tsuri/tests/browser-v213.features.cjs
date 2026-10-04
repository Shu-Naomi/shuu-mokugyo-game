const assert=require('node:assert/strict'),{chromium}=require('playwright');
const {seed,saveKey}=require('./game-harness.cjs'),R=require('../regional-nushi.js');
module.exports=async function motionAndCoast(url,mobile){
  const browser=await chromium.launch({headless:true}),errors=[],failedAssets=[];
  const context=await browser.newContext({viewport:mobile?{width:844,height:390}:{width:1280,height:720},
    isMobile:mobile,hasTouch:mobile,locale:'ja-JP'});
  const state={...seed(),hp:100,soundEnabled:false,mapRegion:'coast',boatActive:true,x:95,y:84,direction:'up',
    ownedVehicles:['canoe'],equipment:{hands:null,vehicle:'canoe'},ownedRods:['shoreReed'],selectedRod:'shoreReed',
    fightMode:'nushi',baits:{shrimp:40},selectedBait:'shrimp',selectedHook:'large',
    regionalCaught:{coast:Object.fromEntries(R.ordinary.coast.map(id=>[id,1]))},regionalCatchVersion:1};
  await context.addInitScript(({key,state})=>{if(!localStorage.getItem(key))localStorage.setItem(key,JSON.stringify(state));},{key:saveKey,state});
  const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));
  page.on('response',r=>{if(r.status()>=400&&/fish-art|fishing-duel|\/assets\/fish-/.test(r.url()))failedAssets.push(r.status()+' '+r.url());});
  const press=selector=>page.locator(selector)[mobile?'tap':'click']();
  try{
    await page.goto(url,{waitUntil:'domcontentloaded'});await press('#start');await press('#action');
    assert.equal(await page.evaluate(()=>battle.phase),'prep');await press('#pull');
    await page.evaluate(()=>{Math.random=()=>.999999;battle.cast=85;});await press('#pull');
    await page.waitForFunction(()=>battle?.phase==='wait');
    assert.equal(await page.evaluate(()=>battle.f.id),'coastNushi');
    assert.equal(await page.evaluate(()=>battle.spot),'coast-reef-deep');
    await page.evaluate(()=>{battle.specimen=rollFishSpecimen(battle.f,()=>.5);battle.biteAt=Date.now()+180;});
    await page.waitForFunction(()=>battle?.phase==='bite');await press('#pull');
    assert.equal(await page.evaluate(()=>battle.phase),'fight');
    assert.equal(await page.evaluate(()=>battle.awaitFightRelease),false,'pointer release completes the hook set');
    await page.waitForFunction(()=>{
      const c=document.querySelector('#battleFish canvas');if(!c)return false;
      const data=c.getContext('2d').getImageData(0,0,448,224).data;let opaque=0;
      for(let i=3;i<data.length;i+=4)if(data[i]>100)opaque++;return opaque>3500;
    });
    // Keep the actual animation loop running while the physics clock is held.
    const smoothFrames=await page.evaluate(async()=>{
      clearInterval(timer);timer=0;finishHookReveal();
      const desired=-battle.facing;
      battle.turning=null;battle.turnIntent=desired;battle.turnHold=99;
      updateFishTurn(desired,fishMotionProfiles[battle.f.id]);
      // Warm the first original before measuring. Observe inside the page,
      // so transport delays cannot consume the whole 120ms logical tick.
      renderBattleFish();battle.artTickAt=Date.now();
      const sample=()=>{
        const el=document.querySelector('#battleFish');
        const bytes=el.querySelector('canvas').getContext('2d').getImageData(0,0,448,224).data;let hash=2166136261;
        for(let n=0;n<bytes.length;n+=61)hash=Math.imul(hash^bytes[n],16777619);
        return {frame:Number(el.dataset.spriteFrame),mode:el.dataset.spriteMode,hash:hash>>>0};
      };
      const frames=[sample()];
      for(let i=0;i<12;i++){
        await new Promise(resolve=>requestAnimationFrame(resolve));frames.push(sample());
      }
      return frames;
    });
    assert.ok(smoothFrames.every(v=>v.mode==='turn'),'real turn was started '+JSON.stringify(smoothFrames));
    assert.ok(new Set(smoothFrames.map(v=>v.hash)).size>=2,'RAF paints intermediate bodies between 120ms physics ticks '+JSON.stringify(smoothFrames));
    assert.ok(smoothFrames.some(v=>!Number.isInteger(v.frame)),'turn frames are fractional '+JSON.stringify(smoothFrames));
    // Check the full rendered body and hook at intermediate headings for all species.
    const poses=await page.evaluate(async()=>{
      stopBattleFishArt();await Promise.all([...new Set(Object.keys(ShuFishArt.species).flatMap(id=>ShuFishArt.assets(id)))].map(src=>fishAtlasImage(src).decode()));
      const results=[];
      for(const id of Object.keys(ShuFishArt.species)){
        battle.f=fish.find(f=>f.id===id);battle.specimen=null;battle.specimenVisualScale=1;
        startFight();stopBattleFishArt();finishHookReveal();let previous=null;
        for(let step=0;step<=24;step++){
          const frame=step/4;Object.assign(battle,{turning:{from:1,to:-1},turnSpriteFrame:frame,artTickAt:null,sandLifted:true,x:50,y:56});
          renderBattleFish();drawBattle();const canvas=document.querySelector('#battleFish canvas'),data=canvas.getContext('2d').getImageData(0,0,448,224).data;
          let visible=0,edge=0;for(let n=0;n<448*224;n++)if(data[n*4+3]>100){visible++;const x=n%448,y=Math.floor(n/448);if(x<2||x>445||y<2||y>221)edge++;}
          const hook=battleMouthAndHook(),point=[hook.rootX,hook.rootY];
          results.push({id,frame,visible,edge,finite:[hook.rootX,hook.rootY,hook.lineX,hook.lineY].every(Number.isFinite),
            delta:previous?Math.hypot(point[0]-previous[0],point[1]-previous[1]):0});previous=point;
        }
      }return results;
    });
    for(const p of poses){assert.ok(p.visible>3500,p.id+'/'+p.frame+' full body');assert.equal(p.edge,0);assert.ok(p.finite);assert.ok(p.delta<40,p.id+' continuous hook '+p.delta);}
    // Restart the same real sea cast and use its normal DOM A events. Only
    // elapsed time is accelerated; moods, retrieval, landing and rewards run normally.
    await page.evaluate(()=>{endBattle();action();beginFishing();Math.random=()=>.999999;battle.cast=85;launchSurfaceCast();settleSurfaceCast();
      battle.specimen=rollFishSpecimen(battle.f,()=>.5);battle.biteAt=Date.now();pull();releaseBattleAction();clearInterval(timer);stopBattleFishArt();});
    const result=await page.evaluate(()=>{
      const originalInterval=window.setInterval,originalNow=Date.now;let now=originalNow(),rng=301,tick;
      window.setInterval=(callback,ms)=>ms===120?(tick=callback,9001):originalInterval(callback,ms);
      Date.now=()=>now;Math.random=()=>((rng=Math.imul(rng,1664525)+1013904223>>>0)/4294967296);battleTick();
      let ticks=0;
      const event=type=>document.querySelector('#pull').dispatchEvent(new PointerEvent(type,{bubbles:true,cancelable:true,pointerId:1,pointerType:'touch'}));
      try{
        for(;ticks<6000&&battle?.phase==='fight';ticks++){
          now+=120;if(!battle.mood||now>battle.nextMood)chooseFishMood();
          if(!battle.gillWash&&battle.mood.calm&&battle.ten<75){if(!battleActionHeld)event('pointerdown');}
          else if(battleActionHeld)event('pointerup');tick();
        }
        return {ticks,phase:battle?.phase,retrieval:battle?.retrieval,ten:battle?.ten};
      }finally{window.setInterval=originalInterval;Date.now=originalNow;}
    });
    assert.equal(result.phase,'landing',JSON.stringify(result));assert.ok(result.retrieval>=.999);assert.ok(result.ten<100);
    await page.waitForFunction(()=>s.caught.coastNushi===1&&battle===null);
    assert.equal(await page.evaluate(()=>s.baits.shrimp),38,'two real casts consume two baits');
    await page.reload({waitUntil:'domcontentloaded'});await press('#start');
    assert.equal(await page.evaluate(()=>s.caught.coastNushi),1,'sea boss persists after reload');
    assert.deepEqual(errors,[]);assert.deepEqual(failedAssets,[]);
    console.log('V214_MOTION_AND_COAST_SMOKE_PASS '+JSON.stringify({mobile,poses:poses.length,smoothFrames,seaBoss:result,reload:true,errors}));
  }finally{await browser.close();}
};
