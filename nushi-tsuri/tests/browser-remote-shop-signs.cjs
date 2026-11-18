'use strict';
// Explicit doorway fixtures; touch interaction coverage, not an approach-route test.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {chromium}=require('playwright');
const {seed,saveKey}=require('./game-harness.cjs');
const {server}=require('./browser-reference-village-evidence.cjs');
const startAdventure=require('./browser-start-adventure.cjs');
const output=path.join(__dirname,'artifacts','remote-shop-signs');
const shops=['stream-shop','wetland-shop'];
async function check(browser,url,viewport){
 const context=await browser.newContext({viewport,isMobile:true,hasTouch:true,deviceScaleFactor:1,locale:'ja-JP',serviceWorkers:'block'});
 const rows=[];
 try{
  await context.addInitScript(({key,state})=>{localStorage.setItem(key,JSON.stringify(state));localStorage.setItem('nushi-inugoya-options-v1',JSON.stringify({textSpeed:'instant'}));},{key:saveKey,state:{...seed(),hp:100,money:50000,soundEnabled:false,gameMinutes:190*1440+600}});
  const page=await context.newPage(),errors=[],failed=[],assets=[];
  page.on('pageerror',e=>errors.push(e.message));
  page.on('response',r=>{if(r.status()>=400)failed.push(`${r.status()} ${new URL(r.url()).pathname}`);if(r.url().includes('settlement-buildings-sam-signs.png')&&r.status()===200)assets.push(r.url());});
  await page.goto(url);await startAdventure(page,true);
  if(await page.locator('#lakeIntroSkip').isVisible())await page.locator('#lakeIntroSkip').tap();
  await require('./browser-release.cjs').assertRelease(page);
  for(const id of shops){
   await page.evaluate(id=>{const b=ShuWorldLife.buildings.find(b=>b.id===id);Object.assign(s,{mapRegion:b.region,x:b.x,y:b.y+2,direction:'up',boatActive:false});render();worldLife.render(performance.now(),true);},id);
   await page.waitForFunction(id=>{worldLife.render(performance.now(),true);const canvas=document.querySelector(`[data-world-life="${id}"] canvas`);if(!canvas)return false;const p=canvas.getContext('2d').getImageData(0,0,canvas.width,canvas.height).data;return p.some((n,i)=>i%4===3&&n>100);},id);
   assert.equal(await page.evaluate(()=>ShuWorldLife.nearby(s)?.id),id);
   // Compare the live rendered canvas to the new sheet, not only a network URL.
   const same=await page.evaluate(async id=>{
    const live=document.querySelector(`[data-world-life="${id}"] canvas`),im=new Image();im.src='assets/settlement-buildings-sam-signs.png';await im.decode();
    const expected=document.createElement('canvas');expected.width=live.width;expected.height=live.height;ShuWorldLife.drawBuilding(expected,im,1);
    const a=live.getContext('2d').getImageData(0,0,live.width,live.height).data,b=expected.getContext('2d').getImageData(0,0,expected.width,expected.height).data;
    return a.length===b.length&&a.every((value,i)=>value===b[i]);
   },id);assert.equal(same,true,id+' uses new sign pixels');
   const prefix=`${viewport.width}x${viewport.height}-${id}`;
   await page.screenshot({path:path.join(output,prefix+'-field.png')});
   await page.locator(`[data-world-life="${id}"]`).screenshot({path:path.join(output,prefix+'-building.png')});
   const state=()=>page.evaluate(()=>JSON.parse(JSON.stringify({mapRegion:s.mapRegion,x:s.x,y:s.y,direction:s.direction,hp:s.hp,money:s.money,gameMinutes:s.gameMinutes,baits:s.baits,caught:s.caught,equipment:s.equipment})));
   const before=await state();
   for(let attempt=0;attempt<2;attempt++){
    await page.locator('#action').tap();await page.locator('#store.open').waitFor();
    assert.equal(await page.locator('#store').isVisible(),true);
    const close=page.locator('#store [data-close]');assert.equal(await close.isVisible(),true);
    if(attempt===0)await page.screenshot({path:path.join(output,prefix+'-open.png')});
    await close.tap();await page.locator('#store.open').waitFor({state:'hidden'});
    assert.deepEqual(await state(),before,id+' repeated entry/close preserves position and resources');
   }
   rows.push({id,viewport,newSheetPixels:true,touchOpenClose:2,resourcesPreserved:true});
  }
  assert.ok(assets.length>0,'new settlement sheet fetched');assert.deepEqual(errors,[]);assert.deepEqual(failed,[]);
  return rows;
 }finally{await context.close();}
}
(async()=>{
 assert.equal(process.env.CI,'true','Run with CI=true');fs.mkdirSync(output,{recursive:true});
 const host=server();await new Promise(resolve=>host.listen(0,'127.0.0.1',resolve));let browser;
 try{browser=await chromium.launch({headless:true});const rows=[];
  for(const viewport of [{width:844,height:390},{width:667,height:375}])rows.push(...await check(browser,`http://127.0.0.1:${host.address().port}/nushi-tsuri/`,viewport));
  const report={passed:true,physicalDevice:false,method:'Chromium mobile emulation, explicit doorway fixtures, real touch open/close; not an approach walking test',rows};
  fs.writeFileSync(path.join(output,'report.json'),JSON.stringify(report,null,2));console.log('REMOTE_SHOP_SIGNS_PASS '+JSON.stringify(report));
 }finally{if(browser)await browser.close();host.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
