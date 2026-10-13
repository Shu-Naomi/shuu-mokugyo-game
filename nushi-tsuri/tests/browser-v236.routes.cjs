const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),{chromium}=require('playwright');
const {seed,saveKey}=require('./game-harness.cjs'),M=require('../mountain-region.js');
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
  const initial={...seed(),mapRegion:'mountainPond',x:196,y:40,hp:100,money:596209,soundEnabled:false,gameMinutes:190*1440+360};
  await context.addInitScript(({key,state})=>{
    localStorage.setItem('nushi-inugoya-options-v1',JSON.stringify({textSpeed:'instant'}));
    if(!localStorage.getItem(key))localStorage.setItem(key,JSON.stringify(state));
  },{key:saveKey,state:initial});
  const page=await context.newPage(),errors=[],failed=[];
  page.on('pageerror',e=>errors.push(e.message));page.on('response',r=>{if(r.status()>=400)failed.push(r.status()+' '+new URL(r.url()).pathname);});
  const directory=path.join(__dirname,'browser-evidence-v232');fs.mkdirSync(directory,{recursive:true});
  const state=()=>page.evaluate(()=>({region:s.mapRegion,x:s.x,y:s.y,direction:s.direction}));
  const resources=()=>page.evaluate(()=>JSON.parse(JSON.stringify({money:s.money,hp:s.hp,baits:s.baits,caught:s.caught,equipment:s.equipment,time:s.gameMinutes})));
  async function start(){await page.locator('#start').click();await page.locator('#game.active').waitFor();if(await page.locator('#lakeIntroSkip').isVisible())await page.locator('#lakeIntroSkip').click();assert.match(await page.locator('.hud').innerText(),/v236/);}
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
  try{
    await page.goto(url,{waitUntil:'load'});await start();const before=await resources();await shot('pond-road-start');
    for(const [x,y] of [[198,36],[185,29],[211,22],[193,15]]){await walk('mountainPond',(px,py)=>Math.hypot(px-x,py-y)<=1.5);if(x===185)await shot('pond-switchback');}
    await walk('mountainPond',(x,y)=>M.exitAt(x,y,'mountainPond')?.region==='mountainMarsh');await shot('pond-ridge');
    await action('mountainMarsh');await shot('marsh-arrival');
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
    assert.deepEqual(errors,[]);assert.deepEqual(failed,[]);
    console.log('V236_MOUNTAIN_PATH_PASS '+JSON.stringify({mobile,viewport,dpr:options.dpr||1,switchbacks:true,marsh:true,wetland:true,banks,returnPosition:{x:212,y:10},retainedProgress:true,reload:true,errors,failed}));
  }finally{await context.close();await browser.close();}
};
