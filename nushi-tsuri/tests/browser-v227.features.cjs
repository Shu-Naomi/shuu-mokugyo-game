const assert=require('node:assert/strict'),{chromium}=require('playwright');
const {seed,saveKey}=require('./game-harness.cjs'),{findRoute}=require('./water-routes-v220.cjs'),{cases,routeTo}=require('./wetland-v227.cjs');
module.exports=async function wetland(url,mobile=false){
 const browser=await chromium.launch({headless:true}),errors=[],failed=[];
 const context=await browser.newContext({viewport:mobile?{width:844,height:390}:{width:1280,height:720},isMobile:mobile,hasTouch:mobile,locale:'ja-JP'});
 const state={...seed(),hp:100,maxHp:100,gameMinutes:600,soundEnabled:false,mapRegion:'mountainMarsh',x:43,y:128,direction:'up',boatActive:false,
  ownedRods:['bamboo','starGazer'],selectedRod:'starGazer',baits:{worm:20,river:20,paste:20,liveMinnow:20},selectedBait:'worm',selectedHook:'small'};
 await context.addInitScript(({key,state})=>{localStorage.setItem('nushi-inugoya-options-v1',JSON.stringify({textSpeed:'instant'}));if(!localStorage.getItem(key))localStorage.setItem(key,JSON.stringify(state));},{key:saveKey,state});
 const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));page.on('response',r=>{if(r.status()>=400&&/nushi-tsuri/.test(r.url()))failed.push(r.status()+' '+r.url());});
 const press=q=>page.locator(q)[mobile?'tap':'click']({noWaitAfter:true});
 const screenshot=async name=>console.log('V227_SCREENSHOT '+JSON.stringify({mobile,screen:name,base64:(await page.screenshot({type:'jpeg',quality:76})).toString('base64')}));
 async function walk(path){
  for(const direction of path){
   await page.waitForFunction(()=>!forageDiscoveryInProgress&&!rescueInProgress&&!playerHomeState.transitioning);
   const old=await page.evaluate(()=>({x:s.x,y:s.y}));
   if(mobile)await press('[data-move="'+direction+'"]');else await page.keyboard.press({up:'ArrowUp',down:'ArrowDown',left:'ArrowLeft',right:'ArrowRight'}[direction]);
   const next=await page.evaluate(()=>({x:s.x,y:s.y}));assert.ok(old.x!==next.x||old.y!==next.y,'field input '+direction+' '+JSON.stringify({old,next}));
  }
 }
 async function toWater(type){
  const r=await page.evaluate(({fn,type})=>(0,eval)('('+fn+')')(window,type),{fn:findRoute.toString(),type});await walk(r.path);
  assert.equal(await page.evaluate(()=>nearbyFishingSpot()?.mountainType),type);return r;
 }
 try{
  await page.goto(url,{waitUntil:'load'});assert.match(await page.locator('.hud').innerText(),/v228/);await press('#start');if(await page.locator('#lakeIntroSkip').isVisible())await press('#lakeIntroSkip');
  const entryRoute=await page.evaluate(fn=>(0,eval)('('+fn+')')(window,'mountainMarsh',(x,y)=>ShuMountain.landmarkAt(x,y,'mountainMarsh')?.id==='wetland'),routeTo.toString());
  await walk(entryRoute);await press('#action');assert.equal(await page.evaluate(()=>s.mapRegion),'wetland');assert.equal(await page.evaluate(()=>s.lakeStory.visited.wetland),true);
  await page.waitForFunction(()=>document.querySelector('#mountainPixels')?.getAttribute('aria-label')==='水郷の湿地');await screenshot('arrival');
  for(const type of ['wetPond','wetCreek','wetMarsh']){await toWater(type);await screenshot('bank-'+type);}
  for(const [index,[id,type,bait,hook]]of cases.entries()){
   await page.evaluate(({bait,hook,index})=>{s.selectedBait=bait;s.selectedHook=hook;s.fightMode=index%2?'gauge':'nushi';s.fishingMethod='bait';render();},{bait,hook,index});
   await toWater(type);await press('#action');assert.equal(await page.evaluate(()=>battle?.phase),'prep');await screenshot('surface-'+id);
   await press('#wait');await page.locator('#tackle.open').waitFor({state:'visible'});await press('#beginCast');
   const before=await page.evaluate(id=>({caught:s.caught[id]||0,fillet:s.cookingIngredients.fishFillet,bait:s.baits[s.selectedBait]}),id);
   await page.evaluate(({id,type})=>{const old=Math.random;let roll=-1;for(let n=0;n<1000;n++){Math.random=()=>n/1000;if(pick(50,'mountain-'+type+'-mid').id===id){roll=n/1000;break;}}
    if(roll<0)throw Error('No ordinary odds for '+id);window.v227Random=old;Math.random=()=>roll;clearInterval(timer);timer=0;battle.cast=50;},{id,type});
   await press('#pull');assert.equal(await page.evaluate(()=>battle.f.id),id);await page.evaluate(()=>{Math.random=window.v227Random;delete window.v227Random;});
   await page.waitForFunction(()=>battle?.phase==='wait');await page.evaluate(()=>{battle.biteAt=Date.now()+180;battle.nibbleAt=Date.now();battleTick();});
   await page.waitForFunction(()=>battle?.phase==='bite');await press('#pull');assert.equal(await page.evaluate(()=>battle.phase),'fight');
   await page.evaluate(()=>{clearInterval(timer);timer=0;finishHookReveal();renderBattleFish();});
   await page.waitForFunction(id=>{renderBattleFish();const scene=document.querySelector('#fishScene'),el=document.querySelector('#battleFish'),c=el?.querySelector('canvas');
    if(scene.classList.contains('surface-casting')||scene.classList.contains('surface-diving')||!c||c.dataset.artSpecies!==id)return false;
    const st=getComputedStyle(el),r=c.getBoundingClientRect();if(Number(st.opacity)<.9||st.visibility!=='visible'||r.width<20||r.height<8||r.left<0||r.top<0||r.right>innerWidth+1||r.bottom>innerHeight+1)return false;
    let painted=0;const p=c.getContext('2d').getImageData(0,0,c.width,c.height).data;for(let i=3;i<p.length;i+=4)if(p[i]>100)painted++;return painted>2500;},id);
   await screenshot('fight-'+id);assert.equal(await page.evaluate(()=>s.baits[s.selectedBait]),before.bait-1);
   await page.evaluate(()=>{caught();caught();hideCatchCard();save();});
   assert.deepEqual(await page.evaluate(id=>({caught:s.caught[id],fillet:s.cookingIngredients.fishFillet}),id),{caught:before.caught+1,fillet:before.fillet+1});
   assert.equal(await page.evaluate(id=>s.fishCatchRecords[id].last.spotId,id),'mountain-'+type+'-mid');
  }
  await page.reload({waitUntil:'load'});await press('#start');assert.deepEqual(await page.evaluate(()=>['tanago','motsugo','medaka','kamatsuka','nigoi','raigyo'].map(id=>s.caught[id])),[1,1,1,1,1,1]);
  assert.equal(await page.evaluate(()=>s.mapRegion),'wetland');assert.equal(await page.evaluate(()=>fish.length),39);await screenshot('saved');
  const back=await page.evaluate(fn=>(0,eval)('('+fn+')')(window,'wetland',(x,y)=>ShuMountain.atReturnGate(x,y,'wetland')),routeTo.toString());await walk(back);await press('#action');assert.equal(await page.evaluate(()=>s.mapRegion),'mountainMarsh');
  assert.deepEqual(errors,[]);assert.deepEqual(failed,[]);console.log('V227_WETLAND_PASS '+JSON.stringify({mobile,enteredOnFoot:true,routeSteps:entryRoute.length,newFish:6,totalFish:39,twoFightModes:true,saved:true,returned:true,errors,failed}));
 }finally{await context.close();await browser.close();}
};
