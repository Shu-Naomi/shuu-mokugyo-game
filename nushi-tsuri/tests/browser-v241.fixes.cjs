const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
module.exports=async function fixes(page,mobile,viewport){
 const original=await page.evaluate(()=>JSON.parse(JSON.stringify(s))),directory=path.join(__dirname,'browser-evidence-v238');fs.mkdirSync(directory,{recursive:true});
 const press=q=>page.locator(q)[mobile?'tap':'click'](),cdp=mobile?await page.context().newCDPSession(page):null;
 const shot=async name=>{await page.evaluate(()=>hideFieldMenu());await page.screenshot({path:path.join(directory,(mobile?'touch':'pc')+'-'+viewport.width+'x'+viewport.height+'-v241-'+name+'.png')});};
 async function hold(value){const box=await page.locator('#pull').boundingBox(),x=box.x+box.width/2,y=box.y+box.height/2;
  if(mobile)await cdp.send('Input.dispatchTouchEvent',{type:value?'touchStart':'touchEnd',touchPoints:value?[{x,y,id:1}]:[]});
  else if(value){await page.mouse.move(x,y);await page.mouse.down();}else await page.mouse.up();
 }
 const end=()=>page.evaluate(()=>{if(battle)endBattle();close();});
 try{
  await page.evaluate(()=>{Object.assign(s,{mapRegion:'mountainPond',x:213,y:75,direction:'up',boatActive:false});render();});await shot('pond-right-path-and-house');
  await page.evaluate(()=>{s.x=227;s.y=75;s.direction='up';render();});await press('#action');await page.locator('#worldHouse.open').waitFor();assert.equal(await page.locator('#worldHouseTitle').innerText(),'峠の釣り人の小屋');await press('#worldHouse [data-close]');
  for(const mode of ['gauge','nushi']){
   await end();await page.evaluate(mode=>{Object.assign(s,{mapRegion:'mountainPond',x:120,y:109,direction:'up',hp:100,boatActive:false,fightMode:mode,fishingMethod:'lure',selectedRod:'lureRod',ownedRods:['bamboo','lureRod'],lures:{silverSpoon:1}});render();},mode);
   const before=await page.evaluate(()=>JSON.parse(JSON.stringify([s.baits,s.lures,s.gameMinutes])));
   await press('#action');await press('#wait');await page.locator('#beginCast').waitFor({state:'visible'});await press('#beginCast');await page.evaluate(()=>battle.cast=50);await press('#pull');
   await page.waitForFunction(()=>battle?.phase==='lure');await page.locator('#distanceLabel').waitFor({state:'visible'});await page.locator('#distanceMeter').waitFor({state:'visible'});
   assert.equal(await page.locator('#hint').evaluate(n=>getComputedStyle(n).visibility),'hidden','lure search hides the field hint');
   const startMeters=await page.evaluate(()=>battle.lureMotion.distance);
   const school=await page.evaluate(()=>{
    const fish=document.querySelector('#battleFish'),spoon=document.querySelector('#lurePreview');
    const world=document.querySelector('#lureWaterWorld'),controls=document.querySelector('.battle-actions');
    const others=Array.from(document.querySelectorAll('#lureResidents .lure-resident'));
    const samples=[],specimen=battle.specimen,target=battle.lureMotion.residents[0];
    function record(){
     if(!battle||!['lure','interest','bite'].includes(battle.phase))return;
     const tick=battle.lureMotion.ticks;
     if(samples.at(-1)?.tick===tick&&samples.at(-1)?.phase===battle.phase)return;
     const box=world.getBoundingClientRect(),scene=document.querySelector('#fishScene').getBoundingClientRect();
     const lure=spoon.getBoundingClientRect(),hud=controls.getBoundingClientRect();
     const mouth=battleMouthAndHook(),sprite=fish.getBoundingClientRect();
     const x=mouth.rootX/10,y=mouth.rootY/5;
     const spoonX=(lure.left+lure.width/2-box.left)*100/box.width;
     const spoonY=(lure.top+lure.height/2-box.top)*100/box.height;
     const [originX,originY]=getComputedStyle(world).transformOrigin.split(' ').map(parseFloat);
     samples.push({tick,phase:battle.phase,noticing:battle.lureMotion.noticing,
      x,y,spoonX,spoonY,art:fish.dataset.spriteMode,projection:new DOMMatrix(getComputedStyle(fish).transform).a,zoom:box.width/world.offsetWidth,
      pivotError:Math.hypot(originX*100/world.offsetWidth-spoonX,originY*100/world.offsetHeight-spoonY),
      centerX:(sprite.left+sprite.width/2-box.left)*100/box.width,centerY:(sprite.top+sprite.height/2-box.top)*100/box.height,
      visible:parseFloat(getComputedStyle(fish).opacity)>.5&&sprite.right>scene.left&&sprite.left<scene.right,
      same:fish===document.querySelector('#battleFish')&&specimen===battle.specimen&&target===battle.lureMotion.residents[0],
      hud:[hud.x,hud.y,hud.width,hud.height],
      others:others.map(el=>[el.dataset.fishId,parseFloat(el.style.left),parseFloat(el.style.top)])});
     if(battle.phase==='bite')observer.disconnect();
    }
    const observer=new MutationObserver(record);
    observer.observe(world,{subtree:true,attributes:true,attributeFilter:['style','class']});
    record();window.v241LureSamples=samples;
    return {ids:battle.lureMotion.residents.map(r=>r.id),species:battle.f.id,
     local:Object.keys({...fishingSpotById(battle.spot).weights,...ShuRegional.candidates(s,battle.spot,gameClockAt(sceneGameMinutes()).period,battle.practice)}),visible:others.map(el=>{
      const box=el.getBoundingClientRect(),view=world.getBoundingClientRect();
      return Number(getComputedStyle(el).opacity)>0&&box.width>0&&box.height>0&&box.right>view.left&&box.left<view.right&&box.bottom>view.top&&box.top<view.bottom;
     }),others:others.map(el=>el.dataset.fishId),hudOutside:!world.contains(controls)};
   });
   assert.ok(school.ids.length>=2&&school.ids.length<=3,'two or three residents swim at the cast location');
   assert.equal(school.ids[0],school.species);assert.deepEqual(school.others,school.ids.slice(1));
   assert.ok(school.others.every(id=>school.local.includes(id))&&school.visible.every(Boolean),'the local bystanders are on screen');
   assert.ok(school.hudOutside,'the action buttons stay outside the zoomed scene');
   const individual=await page.evaluate(()=>JSON.stringify([battle.f.id,battle.specimen]));
   await shot('lure-residents-'+mode);
   for(let tap=0;tap<3;tap++){
    const tick=await page.evaluate(()=>battle.lureMotion.ticks);
    await press('#pull');await page.waitForFunction(before=>battle.lureMotion.ticks>=before+2,tick);
   }
   assert.equal(await page.evaluate(()=>battle.phase),'lure','three short flicks do not start a chase');
   await hold(true);await page.waitForFunction(()=>battle?.phase==='interest');
   if(mobile&&viewport.width===844&&mode==='gauge'){
    const zoom=()=>{
     const world=document.querySelector('#lureWaterWorld');
     return world.getBoundingClientRect().width/world.offsetWidth;
    };
    await page.waitForFunction(()=>{const world=document.querySelector('#lureWaterWorld');return world.getBoundingClientRect().width/world.offsetWidth>=1.07;});
    await page.emulateMedia({reducedMotion:'reduce'});assert.ok(Math.abs(await page.evaluate(zoom)-1)<.02,'reduced motion keeps the wide view');
    await page.emulateMedia({reducedMotion:'no-preference'});
    await page.waitForFunction(()=>battle.phase==='lure');
    await hold(false);
    await page.waitForFunction(()=>{const w=document.querySelector('#lureWaterWorld');return Math.abs(w.getBoundingClientRect().width/w.offsetWidth-1)<.01;});
    assert.equal(await page.evaluate(()=>JSON.stringify([battle.f.id,battle.specimen])),individual,'declining leaves the same fish in the water');
    await shot('lure-declined');
    // Track the second pursuit separately from the previous camera easing back out.
    await page.evaluate(()=>{window.v241LureSamples.length=0;});
    await hold(true);await page.waitForFunction(()=>battle.phase==='interest');
   }
   await hold(false);
   const display=await page.evaluate(()=>({remaining:battle.lureMotion.distance*(1-battle.lureMotion.travel),label:document.querySelector('#distanceLabel').innerText,meter:parseFloat(document.querySelector('#distanceMeter').style.width)}));assert.ok(display.remaining<startMeters);
   assert.equal(display.label,'スプーンまで '+Math.ceil(display.remaining)+'m');assert.ok(display.meter<100);
   await page.waitForFunction(()=>{const world=document.querySelector('#lureWaterWorld');return world.getBoundingClientRect().width/world.offsetWidth>=1.07;});
   await shot('lure-approach-'+mode);
   await page.waitForFunction(()=>battle?.phase==='bite');assert.equal(await page.evaluate(()=>battle.reeling),false);await press('#pull');
   assert.equal(await page.evaluate(()=>battle.phase),'fight');assert.equal(await page.evaluate(()=>battle.reeling),false);assert.equal(await page.evaluate(()=>JSON.stringify([battle.f.id,battle.specimen])),individual);
   const samples=await page.evaluate(()=>window.v241LureSamples);
   fs.writeFileSync(path.join(directory,`${mobile?'touch':'pc'}-${viewport.width}x${viewport.height}-lure-${mode}-approach.json`),JSON.stringify(samples));
   const wide=samples.filter(p=>p.phase==='lure'),chase=samples.filter(p=>p.phase==='interest');
   const first=wide[0],last=samples.at(-1);
   const noticed=wide.filter(p=>p.noticing);
   assert.ok(noticed.some(p=>p.art==='turn'||Math.sign(p.projection)===Math.sign(p.spoonX-p.x)),'the resident visibly turns or faces the spoon while still in the wide view');
   assert.ok(wide.every(p=>Math.abs(p.zoom-1)<.02),'patrol and the preliminary turn keep the wide view');
   assert.ok(samples.every(p=>p.visible&&p.same),'the same target stays visible from patrol to bite');
   assert.ok(first.others.some(([id,x,y],i)=>wide.some(p=>Math.hypot(p.others[i][1]-x,p.others[i][2]-y)>.1)), 'other local fish swim during the search');
   const distances=chase.map(p=>Math.hypot(p.x-p.spoonX,p.y-p.spoonY));
   assert.ok(distances.some(d=>d>5)&&distances.some(d=>d>1&&d<distances[0]),'the fish crosses the intervening water');
   assert.ok(chase.some(p=>p.zoom>=1.07&&p.zoom<=1.12&&p.pivotError<3),'the camera eases in slightly around the spoon during pursuit');
   assert.ok(chase.every(p=>p.hud.every((value,i)=>Math.abs(value-first.hud[i])<2)),'water zoom must not move or enlarge the touch controls');
   for(let i=1;i<samples.length;i++){
    const previous=samples[i-1],current=samples[i],ticks=Math.max(1,current.tick-previous.tick);
    assert.ok(Math.hypot(current.centerX-previous.centerX,current.centerY-previous.centerY)<=6*ticks,
     'no teleport from patrol into the chase: '+JSON.stringify([previous,current]));
   }
   assert.equal(last.phase,'bite');
   assert.ok(Math.hypot(last.x-last.spoonX,last.y-last.spoonY)<3,'the rendered mouth reaches the spoon before the hook prompt: '+JSON.stringify(last));
   assert.equal(await page.locator('#hint').evaluate(n=>getComputedStyle(n).visibility),'hidden',mode+' fight hides the field hint');assert.equal(await page.locator(mode==='nushi'?'#nushiCue':'#battleMsg').isVisible(),true,mode+' keeps its own fight guidance');
   await hold(true);assert.equal(await page.evaluate(()=>battle.reeling),true);await hold(false);await shot('lure-fight-'+mode);
   const after=await page.evaluate(()=>JSON.parse(JSON.stringify([s.baits,s.lures,s.gameMinutes])));assert.deepEqual(after.slice(0,2),before.slice(0,2));assert.equal(after[2]-before[2],10);
  }
  await end();
  await page.evaluate(()=>{Object.assign(s,{mapRegion:'cave',x:120,y:112,direction:'up',hp:100,fishingMethod:'bait',selectedRod:'starGazer',ownedRods:['bamboo','starGazer'],selectedBait:'river',selectedHook:'medium',baits:{river:20}});render();});
  await press('#action');await press('#wait');await press('#beginCast');
  await page.evaluate(()=>{battle.cast=50;window.v241Random=Math.random;for(let i=0;i<1000;i++){Math.random=()=>i/1000;if(pick(50,'mountain-underground-mid').id==='gigi')return;}throw Error('no natural gigi odds');});
  await press('#pull');await page.waitForFunction(()=>battle?.phase==='wait');await page.evaluate(()=>{Math.random=window.v241Random;battle.biteAt=Date.now();syncBitePhase();});await press('#pull');
  assert.equal(await page.evaluate(()=>battle.f.id),'gigi');await page.waitForFunction(()=>document.querySelector('#battleFish canvas')?.dataset.artSpecies==='gigi');await shot('cave-gigi');
  await page.evaluate(()=>{battle.retrieval=1;surfaceCatch();});await page.waitForFunction(()=>s.caught.gigi===1);assert.equal(await page.evaluate(()=>s.fishCatchRecords.gigi.last.spotId),'mountain-underground-mid');
  console.log('[PASS] v241 right-shore house, native spoon stop/hook in both modes, one cast charge and natural cave gigi '+viewport.width+'x'+viewport.height);
 }finally{
  await page.evaluate(original=>{if(window.v241Random)Math.random=window.v241Random;if(battle)endBattle();close();hideCatchCard();Object.assign(s,original);render();},original);
  if(cdp)await cdp.detach();
 }
};
