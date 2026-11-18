'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {chromium}=require('playwright'),{seed,saveKey}=require('./game-harness.cjs');
const {server}=require('./browser-reference-village-evidence.cjs');
const startAdventure=require('./browser-start-adventure.cjs');
const output=path.join(__dirname,'artifacts/island-rest');
const routes=[
 {name:'shelter',x:97,y:56,steps:[['down',97,60],['down',97,60],['up',97,56]]},
 {name:'north-reef',x:33,y:44,steps:[['up',33,40],['up',33,40],['down',33,44]]},
 {name:'south-reef',x:52,y:68,steps:[['down',52,72],['down',52,76],['up',52,72],['up',52,68],['left',48,68],['left',44,68],['left',44,68],['left',44,68]]}
];
async function visit(browser,url,viewport,fixture,run){
 const mobile=viewport.width<1000;
 const context=await browser.newContext({viewport,isMobile:mobile,hasTouch:mobile,serviceWorkers:'block',locale:'ja-JP'});
 try{
  await context.addInitScript(({key,fixture})=>{if(!localStorage.getItem(key))localStorage.setItem(key,JSON.stringify(fixture));localStorage.setItem('nushi-inugoya-options-v1',JSON.stringify({textSpeed:'instant'}));},{key:saveKey,fixture:{...seed(),hp:100,soundEnabled:false,boatActive:false,...fixture}});
  const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto(url);await startAdventure(page,mobile);
  const press=selector=>page.locator(selector)[mobile?'tap':'click']();
  if(await page.locator('#lakeIntroSkip').isVisible())await press('#lakeIntroSkip');
  await run(page,press);assert.deepEqual(errors,[]);
 }finally{await context.close();}
}
(async()=>{
 fs.mkdirSync(output,{recursive:true});const host=server();await new Promise((resolve,reject)=>{host.once('error',reject);host.listen(0,'127.0.0.1',resolve);});
 try{
  const browser=await chromium.launch({headless:true,...(process.env.CHROMIUM_PATH?{executablePath:process.env.CHROMIUM_PATH}:{})});
  try{
   const sizes=process.env.WIDTH?[[+process.env.WIDTH,+process.env.HEIGHT]]:[[1280,720],[844,390],[740,360]];
   for(const [width,height]of sizes){const viewport={width,height},url='http://127.0.0.1:'+host.address().port+'/nushi-tsuri/';
    for(const route of routes)await visit(browser,url,viewport,{mapRegion:'offshore',x:route.x,y:route.y},async(page,press)=>{
     assert.deepEqual(await page.evaluate(()=>[s.x,s.y]),[route.x,route.y],route.name+' fixture');
     for(const [direction,x,y]of route.steps){await press('[data-move="'+direction+'"]');assert.deepEqual(await page.evaluate(()=>[s.x,s.y]),[x,y],route.name+' '+direction);}
     await page.waitForFunction(()=>!playerWalking);await page.screenshot({path:path.join(output,width+'-'+route.name+'.png')});console.log('ISLAND_REST',width,route.name,'real directional buttons, return and obstacle');
    });

   }
   fs.writeFileSync(path.join(output,'report.json'),JSON.stringify({passed:true,physicalDevice:false,viewports:sizes,fixtures:'Explicit screenshot-adjacent saved positions; actual directional UI input.'},null,2));
  }finally{await browser.close();}
 }finally{await new Promise(resolve=>host.close(resolve));}
})().catch(error=>{console.error(error);process.exitCode=1;});
