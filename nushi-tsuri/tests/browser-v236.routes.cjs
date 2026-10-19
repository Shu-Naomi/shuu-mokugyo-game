const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),{chromium}=require('playwright');
const {seed,saveKey}=require('./game-harness.cjs'),M=require('../mountain-region.js');
const {paintedLoop,decks,banks:marshBanks,fishCases}=require('./marsh-v237.cjs');
const directions=['up','right','down','left'];
function route(region,start,goal){
  const queue=[{...start,path:[]}],seen=new Set([start.x+','+start.y]);
  for(let i=0;i<queue.length;i++){
    const p=queue[i];if(goal(p.x,p.y))return p.path;
    for(const d of directions){const n=M.moveTarget(p.x,p.y,d,4,region),key=n.x+','+n.y;
      if(!seen.has(key)){seen.add(key);queue.push({...n,path:[...p.path,d]});}}
  }
  throw Error('No walking route in '+region);
}
module.exports=async function mountainPaths(url,mobile=false,options={}){
  const viewport=options.viewport||(mobile?{width:844,height:390}:{width:1280,height:720});
  const browser=await chromium.launch({headless:true});
  const context=await browser.newContext({viewport,deviceScaleFactor:options.dpr||1,isMobile:mobile,hasTouch:mobile,locale:'ja-JP'});
  const initial={...seed(),mapRegion:'mountainPond',x:196,y:40,hp:100,money:596209,soundEnabled:false,gameMinutes:190*1440+600,
    ownedRods:['bamboo','starGazer'],selectedRod:'starGazer',baits:{worm:20,river:20,paste:20,liveMinnow:20},selectedHook:'small'};
  await context.addInitScript(({key,state})=>{
    localStorage.setItem('nushi-inugoya-options-v1',JSON.stringify({textSpeed:'instant'}));
    if(!localStorage.getItem(key))localStorage.setItem(key,JSON.stringify(state));
  },{key:saveKey,state:initial});
  const page=await context.newPage(),errors=[],failed=[];
  page.on('pageerror',e=>errors.push(e.message));page.on('response',r=>{if(r.status()>=400)failed.push(r.status()+' '+new URL(r.url()).pathname);});
  const directory=path.join(__dirname,'browser-evidence-v232');fs.mkdirSync(directory,{recursive:true});
  const state=()=>page.evaluate(()=>({region:s.mapRegion,x:s.x,y:s.y,direction:s.direction}));
  const resources=()=>page.evaluate(()=>JSON.parse(JSON.stringify({money:s.money,hp:s.hp,baits:s.baits,caught:s.caught,equipment:s.equipment,time:s.gameMinutes})));
  async function start(){await page.locator('#start').click();await page.locator('#game.active').waitFor();if(await page.locator('#lakeIntroSkip').isVisible())await page.locator('#lakeIntroSkip').click();assert.match(await page.locator('.hud').innerText(),/v245/);}
  async function shot(name){
    await page.waitForFunction(()=>{const c=document.querySelector('#mountainPixels'),a=c.getContext('2d').getImageData(0,0,c.width,c.height).data,colors=new Set();for(let i=0;i<a.length;i+=4*307)colors.add(a[i]+','+a[i+1]+','+a[i+2]);return colors.size>1000;});
    await page.evaluate(()=>hideFieldMenu());await page.waitForTimeout(400);
    await page.screenshot({path:path.join(directory,(mobile?'touch':'pc')+'-'+viewport.width+'x'+viewport.height+'-'+name+'.png')});
  }
  async function walk(region,goal){
    const steps=route(region,await state(),goal);
    for(const d of steps){
      const old=await state(),expected=M.moveTarget(old.x,old.y,d,4,region);
      if(mobile)await page.locator('[data-move="'+d+'"]').tap();else await page.keyboard.press('Arrow'+d[0].toUpperCase()+d.slice(1));
      const n=await state();assert.equal(n.region,region);assert.ok(Math.abs(n.x-expected.x)<1e-6&&Math.abs(n.y-expected.y)<1e-6,'native movement '+region+'/'+d);
    }
    const n=await state();assert.ok(goal(n.x,n.y),'arrived '+region);
  }
  async function action(region){if(mobile)await page.locator('#action').tap();else await page.locator('#action').click();assert.equal((await state()).region,region);}
  const press=q=>page.locator(q)[mobile?'tap':'click']();
  async function catchMarshFish(id,bait,hook,distance){
    const p=await state(),face=directions.find(d=>M.fishingWater(p.x,p.y,d,'mountainMarsh')?.type==='highMarsh');
    assert.ok(face);if(p.direction!==face){await press('[data-move="'+face+'"]');const n=await state();assert.equal(n.direction,face);}
    assert.equal(await page.evaluate(()=>nearbyFishingSpot()?.mountainType),'highMarsh');
    await press('#action');assert.equal(await page.evaluate(()=>battle.phase),'prep');
    await press('#wait');await page.locator('#tackle.open').waitFor();
    await press('#tackle [data-cast-tackle="bait"]');await press('#tackle [data-pick-bait="'+bait+'"]');
    await press('#tackle [data-cast-tackle="hook"]');await press('#tackle [data-pick-hook="'+hook+'"]');
    const old=await page.evaluate(({id,bait})=>({count:s.caught[id]||0,bait:s.baits[bait]}),{id,bait});
    await press('#beginCast');assert.equal(await page.evaluate(()=>battle.phase),'cast');
    // Fix only timing and the random roll; use the game's real population and controls.
    await page.evaluate(({id,distance})=>{
      const original=Math.random,spot='mountain-highMarsh-'+depthForCast('lake',distance);let roll=-1;
      for(let n=0;n<1000;n++){Math.random=()=>n/1000;if(pick(distance,spot).id===id){roll=n/1000;break;}}
      Math.random=original;if(roll<0)throw Error('No normal odds for '+id);
      window.v237Random=original;Math.random=()=>roll;clearInterval(timer);timer=0;battle.cast=distance;
    },{id,distance});
    await press('#pull');assert.equal(await page.evaluate(()=>battle.f.id),id);
    await page.evaluate(()=>{Math.random=window.v237Random;delete window.v237Random;});
    await page.waitForFunction(()=>battle?.phase==='wait');
    await page.evaluate(()=>{battle.biteAt=Date.now()+180;battle.nibbleAt=Date.now();battleTick();});
    await page.waitForFunction(()=>battle?.phase==='bite');await press('#pull');assert.equal(await page.evaluate(()=>battle.phase),'fight');
    await page.evaluate(()=>{clearInterval(timer);timer=0;finishHookReveal();renderBattleFish();});
    await page.waitForFunction(id=>{renderBattleFish();const scene=document.querySelector('#fishScene'),el=document.querySelector('#battleFish'),c=el?.querySelector('canvas');
      if(scene.classList.contains('surface-casting')||scene.classList.contains('surface-diving')||!c||c.dataset.artSpecies!==id)return false;
      const r=c.getBoundingClientRect(),st=getComputedStyle(el);if(Number(st.opacity)<.9||st.visibility!=='visible'||r.width<20||r.height<8||r.left<0||r.top<0||r.right>innerWidth+1||r.bottom>innerHeight+1)return false;
      const data=c.getContext('2d').getImageData(0,0,c.width,c.height).data;let painted=0;for(let i=3;i<data.length;i+=4)if(data[i]>100)painted++;return painted>2500;
    },id);
    await page.screenshot({path:path.join(directory,(mobile?'touch':'pc')+'-'+viewport.width+'x'+viewport.height+'-marsh-fish-'+id+'.png')});
    assert.equal(await page.evaluate(bait=>s.baits[bait],bait),old.bait-1);
    await page.evaluate(()=>{caught();caught();hideCatchCard();save();});
    assert.equal(await page.evaluate(id=>s.caught[id],id),old.count+1);
    assert.equal(await page.evaluate(id=>s.fishCatchRecords[id].last.spotId,id),'mountain-highMarsh-'+(distance<34?'shallow':'mid'));
  }
  try{
    await page.goto(url,{waitUntil:'load'});await start();const before=await resources();await shot('pond-road-start');
    for(const [x,y] of [[198,36],[185,29],[211,22],[193,15]]){await walk('mountainPond',(px,py)=>Math.hypot(px-x,py-y)<=1.5);if(x===185)await shot('pond-switchback');}
    await walk('mountainPond',(x,y)=>M.exitAt(x,y,'mountainPond')?.region==='mountainMarsh');await shot('pond-ridge');
    await action('mountainMarsh');await shot('marsh-arrival');
    for(const [x,y]of [...paintedLoop,...decks]){
      await walk('mountainMarsh',(px,py)=>Math.hypot(px-x,py-y)<=1);
      if(x===50&&y===79)await shot('marsh-west-bridge');if(x===173&&y===26)await shot('marsh-north-bridge');
    }
    for(const [x,y]of marshBanks){await walk('mountainMarsh',(px,py)=>Math.hypot(px-x,py-y)<=1);
      assert.ok(await page.evaluate(()=>['up','right','down','left'].some(d=>fishingWaterNearPlayer(s.x,s.y,d)?.type==='highMarsh')));}
    await walk('mountainMarsh',(x,y)=>M.exitAt(x,y,'mountainMarsh')?.region==='wetland');await action('wetland');await shot('wetland-arrival');
    const banks=[];
    for(const type of ['wetPond','wetCreek','wetMarsh']){
      await walk('wetland',(x,y)=>directions.some(d=>M.fishingWater(x,y,d,'wetland')?.type===type));
      const p=await state(),d=directions.find(d=>M.fishingWater(p.x,p.y,d,'wetland')?.type===type);
      assert.equal(await page.evaluate(d=>fishingWaterNearPlayer(s.x,s.y,d)?.type,d),type);banks.push(type);
    }
    await walk('wetland',(x,y)=>M.atReturnGate(x,y,'wetland'));await action('mountainMarsh');
    await walk('mountainMarsh',(x,y)=>M.atReturnGate(x,y,'mountainMarsh'));await action('mountainPond');await shot('pond-return');
    assert.deepEqual(await state(),{region:'mountainPond',x:212,y:10,direction:'left'});assert.deepEqual(await resources(),before);
    await page.reload({waitUntil:'load'});await start();assert.deepEqual(await state(),{region:'mountainPond',x:212,y:10,direction:'left'});assert.deepEqual(await resources(),before);
    await walk('mountainPond',(x,y)=>M.exitAt(x,y,'mountainPond')?.region==='mountainMarsh');await action('mountainMarsh');
    await walk('mountainMarsh',(x,y)=>Math.hypot(x-89,y-27)<=1);
    for(const fishCase of fishCases)await catchMarshFish(...fishCase);
    const after=await resources();await page.reload({waitUntil:'load'});await start();assert.equal((await state()).region,'mountainMarsh');assert.deepEqual(await resources(),after);
    assert.deepEqual(errors,[]);assert.deepEqual(failed,[]);
    console.log('V237_MARSH_PATH_FISH_PASS '+JSON.stringify({mobile,viewport,dpr:options.dpr||1,switchbacks:true,paintedMarshLoop:true,decks:decks.length,marshBanks:marshBanks.length,wetland:true,banks,newMarshFish:fishCases.map(p=>p[0]),returnPosition:{x:212,y:10},retainedWalkingProgress:true,reload:true,errors,failed}));
  }finally{await context.close();await browser.close();}
};
