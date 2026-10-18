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
   await page.waitForFunction(()=>battle?.phase==='lure');await hold(true);await page.waitForFunction(()=>battle?.phase==='interest');await hold(false);
   const individual=await page.evaluate(()=>JSON.stringify([battle.f.id,battle.specimen]));await shot('lure-approach-'+mode);
   await page.waitForFunction(()=>battle?.phase==='bite');assert.equal(await page.evaluate(()=>battle.reeling),false);await press('#pull');
   assert.equal(await page.evaluate(()=>battle.phase),'fight');assert.equal(await page.evaluate(()=>battle.reeling),false);assert.equal(await page.evaluate(()=>JSON.stringify([battle.f.id,battle.specimen])),individual);
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
