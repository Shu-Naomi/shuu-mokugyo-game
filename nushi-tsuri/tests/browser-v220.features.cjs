const assert=require('node:assert/strict'),{chromium}=require('playwright');
const {seed,saveKey}=require('./game-harness.cjs'),{cases,findRoute}=require('./water-routes-v220.cjs');
module.exports=async function waterAndFish(url,mobile=false){
 const browser=await chromium.launch({headless:true}),errors=[],failed=[],routes=[];
 const viewport=mobile?{width:844,height:390}:{width:1280,height:720};
 async function create(state){
  const context=await browser.newContext({viewport,isMobile:mobile,hasTouch:mobile,locale:'ja-JP'});
  await context.addInitScript(({key,state})=>{localStorage.setItem('nushi-inugoya-options-v1',JSON.stringify({textSpeed:'instant'}));if(!localStorage.getItem(key))localStorage.setItem(key,JSON.stringify(state));},{key:saveKey,state});
  const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));page.on('response',r=>{if(r.status()>=400&&/v220|fish-art|coast-voyage|mountain-region/.test(r.url()))failed.push(r.status()+' '+r.url());});
  await page.goto(url,{waitUntil:'load'});assert.match(await page.locator('.hud').innerText(),/v220/);
  await page.locator('#start')[mobile?'tap':'click']();if(await page.locator('#lakeIntroSkip').isVisible())await page.locator('#lakeIntroSkip')[mobile?'tap':'click']();
  return {context,page,press:q=>page.locator(q)[mobile?'tap':'click']()};
 }
 const state=extra=>({...seed(),hp:100,maxHp:100,gameMinutes:420,soundEnabled:false,ownedRods:['bamboo','clearStream','shoreReed'],selectedRod:'clearStream',
  ownedVehicles:['canoe'],equipment:{vehicle:'canoe'},baits:{worm:20,river:20,shrimp:20},selectedBait:'worm',selectedHook:'small',...extra});
 const screenshot=async(page,screen)=>console.log('V220_SCREENSHOT '+JSON.stringify({mobile,screen,base64:(await page.screenshot({type:'jpeg',quality:76})).toString('base64')}));
 try{
  for(const sample of cases){
   const {context,page,press}=await create(state({mapRegion:sample.region,x:sample.start[0],y:sample.start[1],boatActive:Boolean(sample.boat)}));
   try{
    const route=await page.evaluate(({fn,type})=>(0,eval)('('+fn+')')(window,type),{fn:findRoute.toString(),type:sample.type});
    for(const direction of route.path){if(mobile)await press('[data-move="'+direction+'"]');else await page.keyboard.press({up:'ArrowUp',down:'ArrowDown',left:'ArrowLeft',right:'ArrowRight'}[direction]);}
    assert.deepEqual(await page.evaluate(()=>({x:s.x,y:s.y,direction:s.direction})),{x:route.x,y:route.y,direction:route.direction});
    const before=await page.evaluate(()=>JSON.stringify({baits:s.baits,money:s.money,hp:s.hp,clock:s.gameMinutes}));
    await press('#action');const prefix=sample.region==='village'?sample.type:sample.region==='coast'?'coast-'+sample.type:'mountain-'+sample.type;
    assert.deepEqual(await page.evaluate(()=>[battle?.spot,battle?.phase]),[prefix+'-shallow','prep']);
    assert.equal(await page.evaluate(()=>JSON.stringify({baits:s.baits,money:s.money,hp:s.hp,clock:s.gameMinutes})),before);
    routes.push({region:sample.region,type:sample.type,boat:Boolean(sample.boat),x:route.x,y:route.y,direction:route.direction,steps:route.path.length});
   }finally{await context.close();}
  }
  const {context,page,press}=await create(state({mapRegion:'coast',boatActive:true,x:121.5,y:52.5,direction:'right'}));
  try{
   assert.equal(await page.evaluate(()=>nearbyFishingSpot()),null);assert.match(await page.locator('#hint').innerText(),/岸や桟橋/);await press('#action');assert.equal(await page.evaluate(()=>battle),null);
   // The same saved boat can turn toward clear water and fish normally.
   await page.evaluate(()=>{s.direction='left';render();});await press('#action');assert.equal(await page.evaluate(()=>battle.waterZone),'sea');await page.evaluate(()=>endBattle());
   for(const [id,region,x,y,direction,bait,hook,spot]of [
    ['wakasagi','village',125,58,'up','river','small','lake-mid'],
    ['dojo','stream',172,96,'right','worm','small','mountain-marsh-mid'],
    ['isaki','coast',95,84,'up','shrimp','medium','coast-reef-mid']]){
    await page.evaluate(({region,x,y,direction,bait,hook})=>{close();Object.assign(s,{mapRegion:region,x,y,direction,boatActive:region==='coast',selectedBait:bait,selectedHook:hook,fightMode:'nushi',fishingMethod:'bait'});render();},{region,x,y,direction,bait,hook});
    await press('#action');await press('#beginCast');
    const before=await page.evaluate(id=>({caught:s.caught[id]||0,fillet:s.cookingIngredients.fishFillet}),id);
    await page.evaluate(({id,spot})=>{const random=Math.random;let roll=-1;
     for(let n=0;n<1000;n++){Math.random=()=>n/1000;if(pick(50,spot)?.id===id){roll=n/1000;break;}}
     if(roll<0)throw Error('No catch odds for '+id);Math.random=()=>roll;resolveSurfaceCast(50);Math.random=random;clearInterval(timer);
     startFight();clearInterval(timer);finishHookReveal();renderBattleFish();},{id,spot});
    assert.equal(await page.evaluate(()=>battle.f.id),id);
    await page.waitForFunction(id=>{renderBattleFish();const c=document.querySelector('#battleFish canvas');if(!c||c.dataset.artSpecies!==id)return false;const d=c.getContext('2d').getImageData(0,0,c.width,c.height).data;let n=0;for(let i=3;i<d.length;i+=4)if(d[i]>100)n++;return n>5000;},id);
    if(!mobile||id==='dojo')await screenshot(page,'fish-'+id);
    await page.evaluate(()=>{caught();caught();hideCatchCard();save();});
    assert.deepEqual(await page.evaluate(id=>({caught:s.caught[id],fillet:s.cookingIngredients.fishFillet}),id),{caught:before.caught+1,fillet:before.fillet+1});
    assert.equal(await page.evaluate(id=>s.fishCatchRecords[id].last.spotId,id),spot);
   }
   await page.reload({waitUntil:'load'});await press('#start');assert.deepEqual(await page.evaluate(()=>['wakasagi','dojo','isaki'].map(id=>s.caught[id])),[1,1,1]);
   assert.equal(await page.evaluate(()=>fish.length),30);
   assert.deepEqual(errors,[]);assert.deepEqual(failed,[]);
   console.log('V220_WATER_FISH_PASS '+JSON.stringify({mobile,routes,newFish:3,totalFish:30,saved:true,shoreBlocks:true,errors,failed}));
  }finally{await context.close();}
 }finally{await browser.close();}
};
