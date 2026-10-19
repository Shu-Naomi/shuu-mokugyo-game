const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),{chromium}=require('playwright');
const {seed,saveKey,boot}=require('./game-harness.cjs'),{findRoute}=require('./water-routes-v220.cjs'),{pressProduct}=require('./compact-ui-helpers.cjs');
const {fishCases,pondLoop}=require('./living-waters-v238.cjs'),M=require('../mountain-region.js'),Life=require('../world-life.js'),directions=['up','right','down','left'];
function route(region,start,goal){
 const queue=[{...start,path:[]}],seen=new Set([start.x+','+start.y]);
 for(let i=0;i<queue.length;i++){const p=queue[i];if(goal(p.x,p.y))return p.path;for(const d of directions){const n=M.moveTarget(p.x,p.y,d,4,region),key=n.x+','+n.y;if(!seen.has(key)){seen.add(key);queue.push({...n,path:[...p.path,d]});}}}
 throw Error('No route '+region);
}
module.exports=async function livingWaters(url,mobile=false,options={}){
 const viewport=options.viewport||(mobile?{width:844,height:390}:{width:1280,height:720}),directory=path.join(__dirname,'browser-evidence-v238');fs.mkdirSync(directory,{recursive:true});
 const initial={...seed(),hp:100,money:596209,soundEnabled:false,gameMinutes:190*1440+600,ownedRods:['bamboo','starGazer'],selectedRod:'starGazer',baits:{worm:30,river:30,paste:30,shrimp:30},selectedHook:'small'};
 const browser=await chromium.launch({headless:true}),context=await browser.newContext({viewport,deviceScaleFactor:options.dpr||1,isMobile:mobile,hasTouch:mobile,locale:'ja-JP',serviceWorkers:'block'}),page=await context.newPage(),errors=[],failed=[];
 page.on('pageerror',e=>errors.push(e.message));page.on('response',r=>{if(r.status()>=400)failed.push(r.status()+' '+new URL(r.url()).pathname);});
 await context.addInitScript(({key,state})=>{localStorage.setItem('nushi-inugoya-options-v1',JSON.stringify({textSpeed:'instant'}));if(!localStorage.getItem(key))localStorage.setItem(key,JSON.stringify(state));},{key:saveKey,state:initial});
 const press=q=>page.locator(q)[mobile?'tap':'click'](),step=d=>mobile?press('[data-move="'+d+'"]'):page.keyboard.press('Arrow'+d[0].toUpperCase()+d.slice(1));
 const state=()=>page.evaluate(()=>({region:s.mapRegion,x:s.x,y:s.y,direction:s.direction})),snapshot=()=>page.evaluate(()=>JSON.parse(JSON.stringify({hp:s.hp,money:s.money,time:s.gameMinutes,baits:s.baits,caught:s.caught,equipment:s.equipment})));
 async function start(){await press('#start');await page.locator('#game.active').waitFor();if(await page.locator('#lakeIntroSkip').isVisible())await press('#lakeIntroSkip');assert.match(await page.locator('.hud').innerText(),/v246/);}
 async function shot(name){await page.evaluate(()=>hideFieldMenu());await page.waitForTimeout(250);await page.screenshot({path:path.join(directory,(mobile?'touch':'pc')+'-'+viewport.width+'x'+viewport.height+'-'+name+'.png')});}
 async function walk(region,goal){for(const d of route(region,await state(),goal)){const old=await state(),next=M.moveTarget(old.x,old.y,d,4,region);await step(d);const now=await state();assert.equal(now.region,region);assert.equal(now.x,next.x);assert.equal(now.y,next.y);}const p=await state();assert.ok(goal(p.x,p.y));}
 async function go(region){await page.evaluate(region=>{Object.assign(s,{mapRegion:region,boatActive:false,...ShuMountain.regions[region].entry});render();},region);}
 async function readyMap(region){await page.waitForFunction(region=>{
  worldLife.render(performance.now(),true);const layer=document.querySelector('#worldLifeLayer'),map=document.querySelector(region==='village'?'#worldPixels':'#mountainPixels'),pixels=map.getContext('2d').getImageData(0,0,map.width,map.height).data,colors=new Set();
  for(let i=0;i<pixels.length;i+=4092)colors.add(pixels[i]+','+pixels[i+1]+','+pixels[i+2]);
  return !layer.hidden&&colors.size>200&&[...layer.querySelectorAll('canvas:not(.world-life-roads)')].every(c=>{const p=c.getContext('2d').getImageData(0,0,c.width,c.height).data;let n=0;for(let i=3;i<p.length;i+=4)if(p[i]>100)n++;return n>100;});
 },region);}
 async function groundShot(name){
  await page.waitForFunction(()=>{renderPixelCast();const c=document.querySelector('#castBackdrop'),p=c.getContext('2d').getImageData(0,0,c.width,c.height).data,colors=new Set();for(let i=0;i<p.length;i+=4108)colors.add(p[i]+','+p[i+1]+','+p[i+2]);return pixelCastModel?.detailed&&colors.size>100;});
  const fit=await page.evaluate(()=>{const m=pixelCastModel,c=document.querySelector('#castActor'),r=c.getBoundingClientRect();return {inside:r.left>=0&&r.right<=innerWidth+1&&r.top>=0&&r.bottom<=innerHeight+1,feet:m.leftFoot.y>30&&m.rightFoot.y<c.height,locale:surfaceSceneryKind(),position:getComputedStyle(document.querySelector('#castBackdrop')).objectPosition};});
  assert.ok(fit.inside&&fit.feet,JSON.stringify(fit));assert.equal(fit.position,fit.locale==='harbor'?'50% 20%':'50% 100%');await shot(name);
 }
 async function catchNewFish(id,type,bait,hook,distance){
    await press('#action');assert.equal(await page.evaluate(()=>battle.phase),'prep');
    if(['herabuna','mahaze'].includes(id))await groundShot('cast-'+id);
    await press('#wait');await page.locator('#tackle.open').waitFor();
    await press('#tackle [data-cast-tackle="bait"]');await press('#tackle [data-pick-bait="'+bait+'"]');
    await press('#tackle [data-cast-tackle="hook"]');await press('#tackle [data-pick-hook="'+hook+'"]');
    const old=await page.evaluate(({id,bait})=>({count:s.caught[id]||0,bait:s.baits[bait]}),{id,bait});
    await press('#beginCast');assert.equal(await page.evaluate(()=>battle.phase),'cast');
    // Fix only timing and the random roll; use the game's real population and controls.
    await page.evaluate(({id,type,distance})=>{
      const original=Math.random,spot=(type==='sea'?'sea':'mountain-'+type)+'-'+depthForCast('lake',distance);let roll=-1;
      for(let n=0;n<1000;n++){Math.random=()=>n/1000;if(pick(distance,spot).id===id){roll=n/1000;break;}}
      Math.random=original;if(roll<0)throw Error('No normal odds for '+id);
      window.v238Random=original;Math.random=()=>roll;clearInterval(timer);timer=0;battle.cast=distance;
    },{id,type,distance});
    await press('#pull');assert.equal(await page.evaluate(()=>battle.f.id),id);
    await page.evaluate(()=>{Math.random=window.v238Random;delete window.v238Random;});
    await page.waitForFunction(()=>battle?.phase==='wait');
    await page.evaluate(()=>{battle.biteAt=Date.now()+180;battle.nibbleAt=Date.now();battleTick();});
    await page.waitForFunction(()=>battle?.phase==='bite');await press('#pull');assert.equal(await page.evaluate(()=>battle.phase),'fight');
    await page.evaluate(()=>{clearInterval(timer);timer=0;finishHookReveal();renderBattleFish();});
    await page.waitForFunction(id=>{renderBattleFish();const scene=document.querySelector('#fishScene'),el=document.querySelector('#battleFish'),c=el?.querySelector('canvas');
      if(scene.classList.contains('surface-casting')||scene.classList.contains('surface-diving')||!c||c.dataset.artSpecies!==id)return false;
      const r=c.getBoundingClientRect(),st=getComputedStyle(el);if(Number(st.opacity)<.9||st.visibility!=='visible'||r.width<20||r.height<8||r.left<0||r.top<0||r.right>innerWidth+1||r.bottom>innerHeight+1)return false;
      const data=c.getContext('2d').getImageData(0,0,c.width,c.height).data;let painted=0;for(let i=3;i<data.length;i+=4)if(data[i]>100)painted++;return painted>2500;
    },id);
    await page.screenshot({path:path.join(directory,(mobile?'touch':'pc')+'-'+viewport.width+'x'+viewport.height+'-fish-'+id+'.png')});
    assert.equal(await page.evaluate(bait=>s.baits[bait],bait),old.bait-1);
    await page.evaluate(()=>{caught();caught();hideCatchCard();save();});
    assert.equal(await page.evaluate(id=>s.caught[id],id),old.count+1);
    assert.equal(await page.evaluate(id=>s.fishCatchRecords[id].last.spotId,id),(type==='sea'?'sea':'mountain-'+type)+'-'+(distance<34?'shallow':'mid'));
  }
 try{
  await page.goto(url,{waitUntil:'load'});await start();await readyMap('village');await require('./browser-v240.fixes.cjs')(page,mobile,viewport);await require('./browser-v241.fixes.cjs')(page,mobile,viewport);await require('./browser-v239.guide.cjs')(page,mobile,viewport);await shot('village-residents');
  const beforeHome=await snapshot();await step('left');await page.waitForFunction(()=>!playerHomeState.transitioning);assert.deepEqual(await page.evaluate(()=>[playerHomeState.area,playerHomeState.x,playerHomeState.y,s.direction]),['exterior',90,80,'left']);
  await shot('home-village-arrival');for(let i=0;i<9;i++)await step('left');for(let i=0;i<3;i++)await step('up');await press('#action');await page.waitForFunction(()=>!playerHomeState.transitioning);assert.equal(await page.evaluate(()=>playerHomeState.area),'interior');
  await press('#action');await page.waitForFunction(()=>!playerHomeState.transitioning);assert.equal(await page.evaluate(()=>playerHomeState.area),'exterior');
  for(let i=0;i<2;i++)await step('down');for(let i=0;i<11;i++)await step('right');assert.equal(await page.evaluate(()=>nearbyPlayerHomeEvent()?.id),'map-exit');await press('#action');await page.waitForFunction(()=>!playerHomeState.transitioning);assert.equal(await page.evaluate(()=>playerHomeState.area),null);assert.deepEqual(await state(),{region:'village',x:10,y:79,direction:'right'});assert.deepEqual(await snapshot(),beforeHome);
  await go('mountainPond');for(const [x,y]of pondLoop)await walk('mountainPond',(px,py)=>Math.hypot(px-x,py-y)<=1.5);const worldBefore=await snapshot();
  for(const region of ['stream','mountainPond','mountainMarsh','wetland']){
   await go(region);await readyMap(region);await shot(region+'-settlement');const left=await page.locator('.world-life-resident').first().evaluate(n=>n.style.left);await page.waitForFunction(left=>document.querySelector('.world-life-resident').style.left!==left,left,{timeout:15000});
   for(const b of Life.buildings.filter(b=>b.region===region)){
    await walk(region,(x,y)=>Math.hypot(x-b.x,y-b.y)<=1);await step('up');assert.equal(await page.evaluate(()=>ShuWorldLife.nearby(s)?.id),b.id);const at=await state();await press('#action');const selector=b.kind==='shop'?'#store':'#worldHouse';await page.locator(selector+'.open').waitFor();
    if(b.kind==='house'){await page.waitForFunction(()=>document.querySelector('#worldHousePixels').style.backgroundImage==='none');assert.equal(await page.locator('#worldHouseTitle').innerText(),b.name);assert.ok(await page.locator(selector).evaluate(n=>{const r=n.getBoundingClientRect(),b=n.querySelector('button').getBoundingClientRect();return r.top>=0&&r.bottom<=innerHeight+1&&n.scrollHeight<=n.clientHeight+1&&b.height>=44&&b.width>=44;}),'house fits');if(b.id==='pond-house')await shot('pond-house-interior');}
    else{const old=await page.evaluate(()=>({money:s.money,worm:s.baits.worm}));await pressProduct(page,'#store [data-buy-bait="worm"]',mobile);assert.equal(await page.evaluate(()=>s.money),old.money-120);assert.equal(await page.evaluate(()=>s.baits.worm),old.worm+3);}
    await press(selector+' [data-close]');assert.deepEqual(await state(),at);
   }
  }
  const afterWorld=await snapshot();assert.equal(afterWorld.money,worldBefore.money-240);assert.equal(afterWorld.baits.worm,worldBefore.baits.worm+6);assert.equal(afterWorld.hp,worldBefore.hp);assert.equal(afterWorld.time,worldBefore.time);assert.deepEqual(afterWorld.caught,worldBefore.caught);
  for(const [index,[id,region,type,bait,hook,distance]]of fishCases.entries()){
   await page.evaluate(({region,index})=>{close();Object.assign(s,{mapRegion:region,boatActive:false,hp:100,fightMode:index%2?'gauge':'nushi',...(region==='village'?{x:123,y:92,direction:'down'}:ShuMountain.regions[region].entry)});ensureForageCycle().active={};render();},{region,index});
   const fixture=boot({...initial,mapRegion:region,...(region==='village'?{x:123,y:92}:M.regions[region].entry)});let plan;
   try{fixture.window.eval('ensureForageCycle().active={};Math.random=()=>.999999');plan=findRoute(fixture.window,type).path;}finally{fixture.dispose();}
   await page.evaluate(()=>{window.v238WalkRandom=Math.random;Math.random=()=>.999999;});for(const d of plan)await step(d);await page.evaluate(()=>{Math.random=window.v238WalkRandom;delete window.v238WalkRandom;});await catchNewFish(id,type,bait,hook,distance);
  }
  await page.evaluate(()=>{Object.assign(s,{mapRegion:'village',x:210,y:104,direction:'down'});render();cast({zone:'sea',waterZone:'sea',waterX:210,waterY:110});});assert.equal(await page.evaluate(()=>surfaceSceneryKind()),'harbor');await groundShot('harbor-grounded');await page.evaluate(()=>endBattle());
  const saved=await snapshot();await page.evaluate(()=>save());await page.reload({waitUntil:'load'});await start();assert.deepEqual(await snapshot(),saved);for(const [id]of fishCases)assert.ok(await page.evaluate(id=>s.caught[id]>=1,id));assert.equal(await page.evaluate(()=>fish.length),49);
  assert.deepEqual(errors,[]);assert.deepEqual(failed,[]);console.log('V238_LIVING_WATERS_PASS '+JSON.stringify({mobile,viewport,dpr:options.dpr||1,newFish:fishCases.map(c=>c[0]),totalFish:46,pondRing:true,buildings:6,nonblockingResidents:11,homeRoundtrip:true,harborFeet:true,branchPurchases:2,twoFightModes:true,reload:true,errors,failed}));
 }catch(e){await page.screenshot({path:path.join(directory,(mobile?'touch':'pc')+'-'+viewport.width+'x'+viewport.height+'-failure.png')}).catch(()=>{});throw e;}finally{await context.close();await browser.close();}
};
