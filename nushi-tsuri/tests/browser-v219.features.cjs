const assert=require('node:assert/strict'),{chromium}=require('playwright');
const {seed,saveKey}=require('./game-harness.cjs');
module.exports=async function streamAndCast(url,mobile=false){
 const browser=await chromium.launch({headless:true}),viewport=mobile?{width:844,height:390}:{width:1280,height:720};
 const context=await browser.newContext({viewport,isMobile:mobile,hasTouch:mobile,locale:'ja-JP'}),page=await context.newPage(),errors=[],failed=[];
 await context.addInitScript(({key,state})=>{localStorage.setItem('nushi-inugoya-options-v1',JSON.stringify({textSpeed:'instant'}));if(!localStorage.getItem(key))localStorage.setItem(key,JSON.stringify(state));},
  {key:saveKey,state:{...seed(),hp:100,gameMinutes:420,mapRegion:'stream',x:128,y:76,direction:'left',ownedRods:['bamboo','clearStream','lureRod'],lures:{silverSpoon:1},baits:{worm:40,river:40},soundEnabled:false}});
 page.on('pageerror',e=>errors.push(e.message));page.on('response',r=>{if(r.status()>=400&&/v219|scenery-worker|layered-scenery|scene-layers/.test(r.url()))failed.push(r.status()+' '+r.url());});
 const press=q=>page.locator(q)[mobile?'tap':'click']();
 const screenshot=async screen=>console.log('V219_CAST_SCREENSHOT '+JSON.stringify({mobile,screen,base64:(await page.screenshot({type:'jpeg',quality:76})).toString('base64')}));
 const stock=()=>page.evaluate(()=>JSON.stringify({baits:s.baits,money:s.money,hp:s.hp,clock:s.gameMinutes}));
 async function layout(){
  const result=await page.locator('#tackle').evaluate(el=>{
   const r=el.getBoundingClientRect(),nav=el.querySelector('.cast-tackle-nav'),content=el.querySelector('.cast-tackle-pages'),n=nav.getBoundingClientRect(),c=content.getBoundingClientRect(),summary=el.querySelector('#castTackleSummary').getBoundingClientRect(),start=el.querySelector('#beginCast').getBoundingClientRect(),close=el.querySelector('[data-close]').getBoundingClientRect();
   return {inside:r.x>=0&&r.y>=0&&r.right<=innerWidth+1&&r.bottom<=innerHeight+1,horizontal:el.scrollWidth<=el.clientWidth+1,
    independent:n.bottom<=r.bottom&&c.bottom<=r.bottom&&getComputedStyle(nav).overflowY==='auto'&&getComputedStyle(content).overflowY==='auto',
    sideBySide:n.right<=c.left+1,summary:summary.bottom<=n.top+1,start:start.bottom<=r.bottom&&start.top>=c.bottom-1,
    close:close.bottom<=r.bottom&&close.right<=r.right,touch:start.height>=44&&close.height>=44&&[...nav.children].every(b=>b.getBoundingClientRect().height>=44)};
  });assert.ok(Object.values(result).every(Boolean),'cast layout '+JSON.stringify(result));return result;
 }
 async function painted(type){
  await page.waitForFunction(type=>{
   const c=document.querySelector('#castBackdrop'),motion=document.querySelector('.scenery-motion[data-for="castBackdrop"]');
   return c.dataset.locale==='mountain-'+type&&motion?.dataset.scene==='surface-mountain-'+type&&c.style.backgroundImage==='none'&&c.width>=800;
  },type,{timeout:20000});
 }
 try{
  await page.goto(url,{waitUntil:'load'});assert.match(await page.locator('.hud').innerText(),/v223/);await press('#start');
  if(await page.locator('#lakeIntro.open').isVisible())await press('#lakeIntroSkip');
  await press('#action');assert.equal(await page.evaluate(()=>battle?.phase),'prep');assert.equal(await page.evaluate(()=>battle.mountainType),'stream');await painted('stream');
  await press('#wait');await page.locator('#tackle.open').waitFor({state:'visible'});const before=await stock();
  for(const category of ['method','bait','hook','rod','fight']){
   await press(`[data-cast-tackle="${category}"]`);
   assert.deepEqual(await page.locator('[data-cast-tackle-page]').evaluateAll(nodes=>nodes.filter(n=>getComputedStyle(n).display!=='none').map(n=>n.dataset.castTacklePage)),[category]);
   assert.equal(await stock(),before);await layout();
  }
  await press('[data-cast-tackle="bait"]');await press('#baitOptions [data-pick-bait="river"]');
  await press('[data-cast-tackle="hook"]');await press('#hookOptions [data-pick-hook="small"]');
  await press('[data-cast-tackle="rod"]');await press('#rodOptions [data-pick-rod="clearStream"]');
  await press('[data-cast-tackle="fight"]');await press('#castFightOptions [data-fight-mode="nushi"]');
  assert.deepEqual(await page.evaluate(()=>[s.selectedBait,s.selectedHook,s.selectedRod,s.fightMode]),['river','small','clearStream','nushi']);assert.equal(await stock(),before);
  await press('[data-cast-tackle="bait"]');await layout();await screenshot('tackle-bait');
  if(!mobile){await page.locator('[data-cast-tackle="hook"]').focus();await page.keyboard.press('Enter');await page.locator('#hookOptions [data-pick-hook="medium"]').focus();await page.keyboard.press('Enter');assert.equal(await page.evaluate(()=>document.activeElement.dataset.pickHook),'medium');await press('#hookOptions [data-pick-hook="small"]');}
  await press('#tackle [data-close]');await press('#wait');assert.equal(await page.locator('[data-cast-tackle="'+(mobile?'bait':'hook')+'"]').getAttribute('aria-pressed'),'true');
  await press('#beginCast');assert.equal(await page.evaluate(()=>battle.phase),'cast');assert.equal(await stock(),before);await page.evaluate(()=>{clearInterval(timer);endBattle();});
  const signatures={};
  for(const type of ['stream','pond','marsh','highPond','highMarsh','underground']){
   await page.evaluate(type=>{
    if(battle)endBattle();s.gameMinutes=420;
    cast({...fishingSpotById('mountain-'+type+'-shallow'),mountainType:type,waterZone:type==='stream'?'river':'lake',waterX:120,waterY:80});
   },type);await painted(type);
   assert.match(await page.locator('#castZoneName').innerText(),new RegExp(await page.evaluate(type=>ShuMountain.names[type],type)));
   assert.equal(await page.locator('#castSurface').evaluate(el=>el.classList.contains('art-lake')),false);
   signatures[type]=await page.locator('#castBackdrop').evaluate(c=>{const d=c.getContext('2d').getImageData(0,0,c.width,c.height).data;let h=0;for(let i=0;i<d.length;i+=401)h=(Math.imul(h,31)+d[i])>>>0;return h;});
   if((!mobile&&['stream','pond','marsh','underground'].includes(type))||(mobile&&type==='marsh'))await screenshot(type);
  }
  assert.equal(new Set(['stream','pond','marsh','underground'].map(t=>signatures[t])).size,4);
  await page.evaluate(()=>{s.gameMinutes=1380;prepareSurfaceCastScene();});await painted('underground');assert.equal(await page.locator('.cast-stars').isVisible(),false,'caves do not acquire an outdoor star overlay');
  for(const id of ['amago','kajika']){
   await page.evaluate(id=>{
    endBattle();Object.assign(s,{mapRegion:'stream',x:128,y:76,direction:'left',selectedBait:'river',selectedHook:'small',selectedRod:'clearStream',fishingMethod:'bait',gameMinutes:420});
    action();beginFishing();clearInterval(timer);const random=Math.random;let roll=0;
    for(let n=0;n<1000;n++){Math.random=()=>n/1000;if(pick(50,'mountain-stream-mid').id===id){roll=n/1000;break;}}
    Math.random=()=>roll;resolveSurfaceCast(50);Math.random=random;clearInterval(timer);startFight();clearInterval(timer);finishHookReveal();renderBattleFish();
   },id);assert.equal(await page.evaluate(()=>battle.f.id),id);
   await page.waitForFunction(()=>{const c=document.querySelector('#battleFish canvas');if(!c)return false;const d=c.getContext('2d').getImageData(0,0,c.width,c.height).data;let count=0;for(let i=3;i<d.length;i+=4)if(d[i]>100)count++;return count>9000;});
   await page.evaluate(()=>{caught();caught();hideCatchCard();save();});assert.equal(await page.evaluate(id=>s.caught[id],id),1);
   assert.equal(await page.evaluate(id=>s.fishCatchRecords[id].last.spotId,id),'mountain-stream-mid');
  }
  await page.reload({waitUntil:'load'});await press('#start');assert.deepEqual(await page.evaluate(()=>[s.caught.amago,s.caught.kajika]),[1,1]);assert.equal(await page.evaluate(()=>s.selectedHook),'small');
  assert.deepEqual(errors,[]);assert.deepEqual(failed,[]);console.log('V219_STREAM_CAST_PASS '+JSON.stringify({mobile,castCategories:5,landscapes:4,regions:6,newSpecies:2,equipmentSaved:true,stockPreserved:true,signatures,errors,failed}));
 }finally{await context.close();await browser.close();}
};
