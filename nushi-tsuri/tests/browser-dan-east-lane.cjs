'use strict';
const assert=require('node:assert/strict');
const {chromium}=require('playwright');
const {server,legacyFixture}=require('./browser-reference-village-evidence.cjs');
const {saveKey}=require('./game-harness.cjs');
const start=require('./browser-start-adventure.cjs');
(async()=>{
 const host=server();await new Promise(resolve=>host.listen(0,'127.0.0.1',resolve));
 let browser;
 try{
  browser=await chromium.launch({headless:true,...(process.env.CHROMIUM_PATH?{executablePath:process.env.CHROMIUM_PATH}:{})});
  for(const [width,height,touch] of [[844,390,true],[667,375,true],[1280,720,false]]){
   const c=await browser.newContext({viewport:{width,height},isMobile:touch,hasTouch:touch,serviceWorkers:'block'});
   try{
    const raw=JSON.stringify(legacyFixture());await c.addInitScript(({key,raw})=>{localStorage.setItem(key,raw);localStorage.setItem('nushi-inugoya-options-v1',JSON.stringify({textSpeed:'instant'}));},{key:saveKey,raw});
    const p=await c.newPage(),errors=[];p.on('pageerror',e=>errors.push(e.message));await p.goto(`http://127.0.0.1:${host.address().port}/nushi-tsuri/`);await start(p,touch);const press=q=>p.locator(q)[touch?'tap':'click']();if(await p.locator('#lakeIntroSkip').isVisible())await press('#lakeIntroSkip');
    const from=await p.evaluate(()=>{const a=ShuVillageReference.anchor(376,310);s.x=a.x;s.y=a.y;s.direction='down';render();return [s.x,s.y];});
    const progress=()=>p.evaluate(()=>JSON.stringify([s.mapRegion,s.hp,s.money,s.gameMinutes,s.caught,s.baits,s.items]));const before=await progress();
    for(let i=0;i<8;i++){
     const direction=i<4?'down':'up';if(touch)await press(`[data-move="${direction}"]`);else await p.keyboard.press(direction==='down'?'ArrowDown':'ArrowUp');
     const [x,y]=await p.evaluate(()=>[s.x,s.y]);const expected=from[1]+(i<4?i+1:7-i)*4;
     assert.ok(x===from[0]&&Math.abs(y-expected)<1e-8,`${width}x${height} step ${i+1} (${direction}): expected ${from[0]},${expected}; got ${x},${y}`);
    }
    assert.equal(await progress(),before);assert.equal(await p.evaluate(key=>localStorage.getItem(key),saveKey),raw);assert.deepEqual(errors,[]);console.log('DAN_LANE_OK',width,height,touch?'touch':'keyboard','4 down, 4 up',await p.locator('#gameRelease').innerText());
   }finally{await c.close();}
  }
 }finally{await browser?.close();await new Promise(r=>host.close(r));}
})().catch(e=>{console.error(e);process.exitCode=1;});
