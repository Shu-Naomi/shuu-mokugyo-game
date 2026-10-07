const assert=require('node:assert/strict'),{chromium}=require('playwright');
const {seed,saveKey}=require('./game-harness.cjs');
module.exports=async function boatCharacters(url,mobile=false){
  const browser=await chromium.launch({headless:true}),errors=[],failed=[],checked=[];
  const context=await browser.newContext({viewport:mobile?{width:844,height:390}:{width:1280,height:720},isMobile:mobile,hasTouch:mobile,locale:'ja-JP'});
  const original={...seed(),mapRegion:'coast',boatActive:true,x:193,y:77,direction:'right',hp:100,maxHp:100,
    avatar:'boy',ownedVehicles:['tarai','canoe'],equipment:{hands:null,vehicle:'tarai'},soundEnabled:false};
  await context.addInitScript(({key,state})=>{
    localStorage.setItem('nushi-inugoya-options-v1',JSON.stringify({textSpeed:'instant'}));
    if(!localStorage.getItem(key))localStorage.setItem(key,JSON.stringify(state));
  },{key:saveKey,state:original});
  const page=await context.newPage(),press=q=>page.locator(q)[mobile?'tap':'click']();
  page.on('pageerror',e=>errors.push(e.message));
  page.on('response',r=>{if(r.status()>=400&&/coast-(?:voyage|tarai|rowboat|world)/.test(r.url()))failed.push(r.status()+' '+r.url());});
  function art(canvas){
    const d=canvas.getContext('2d').getImageData(0,0,canvas.width,canvas.height).data,colors=new Set();let painted=0,hash=2166136261;
    for(let i=0;i<d.length;i+=4){for(let j=0;j<4;j++)hash=Math.imul(hash^d[i+j],16777619);if(d[i+3]>100){painted++;colors.add(d[i]+','+d[i+1]+','+d[i+2]);}}
    return {painted,colors:colors.size,hash:hash>>>0};
  }
  const signature=()=>page.locator('#boatVisual').evaluate(art);
  try{
    await page.goto(url,{waitUntil:'load'});assert.match(await page.locator('.hud').innerText(),/v225/);await press('#start');
    await page.waitForFunction(()=>{
      const c=document.querySelector('#boatVisual'),d=c.getContext('2d').getImageData(0,0,c.width,c.height).data;let n=0;
      for(let i=3;i<d.length;i+=4)if(d[i]>100)n++;return n>6500;
    });
    for(const vehicle of ['tarai','canoe'])for(const avatar of ['boy','girl']){
      await page.evaluate(({vehicle,avatar})=>{s.equipment.vehicle=vehicle;s.avatar=avatar;render();},{vehicle,avatar});
      // Starting or reloading an adventure moves the map camera from the title.
      // Check the settled viewport; a boat that remains outside must still fail.
      await page.waitForFunction(()=>{
        const r=document.querySelector('#boatVisual').getBoundingClientRect();
        return r.left>=0&&r.top>=0&&r.right<=innerWidth&&r.bottom<=innerHeight;
      },null,{timeout:3000});
      const poses=[];
      for(const direction of ['up','right','down','left']){
        await page.evaluate(direction=>{s.direction=direction;render();},direction);
        const idle=await signature();assert.ok(idle.painted>3500&&idle.colors>500,vehicle+'/'+avatar+'/'+direction+' detailed hero');
        const layout=await page.locator('#boatVisual').evaluate(c=>{
          const r=c.getBoundingClientRect(),style=getComputedStyle(c);
          return {visible:style.display!=='none'&&r.width>80&&r.height>60,inside:r.left>=0&&r.top>=0&&r.right<=innerWidth&&r.bottom<=innerHeight,playerHidden:getComputedStyle(document.querySelector('#player')).display==='none',rect:[r.left,r.top,r.right,r.bottom].map(Math.round)};
        });assert.ok(layout.visible&&layout.inside&&layout.playerHidden,JSON.stringify(layout));
        if(vehicle==='canoe')console.log('V225_BOAT_POSE '+JSON.stringify({mobile,avatar,direction,frame:0,base64:(await page.locator('#boatVisual').screenshot({type:'png'})).toString('base64')}));
        await page.evaluate(()=>ShuCoast.paintBoat(document.querySelector('#boatVisual'),s.equipment.vehicle,s.direction,1,s.avatar,true));
        const stroke=await signature();assert.notEqual(stroke.hash,idle.hash,'a single stroke remains visible');poses.push(idle.hash,stroke.hash);
        if(vehicle==='canoe')console.log('V225_BOAT_POSE '+JSON.stringify({mobile,avatar,direction,frame:1,base64:(await page.locator('#boatVisual').screenshot({type:'png'})).toString('base64')}));
        await page.evaluate(()=>render());
      }
      assert.equal(new Set(poses).size,8,vehicle+'/'+avatar+' distinct views');
      await page.evaluate(()=>{s.direction='right';render();});
      console.log('V225_BOAT_SCREENSHOT '+JSON.stringify({mobile,vehicle,avatar,base64:(await page.screenshot({type:'jpeg',quality:82})).toString('base64')}));
      const before=await page.evaluate(()=>({x:s.x,y:s.y,hp:s.hp,minutes:s.gameMinutes}));
      await page.evaluate(()=>{window.v225BoatCalls=[];window.v225OriginalPaint=ShuCoast.paintBoat;
        ShuCoast.paintBoat=function(...args){window.v225BoatCalls.push({vehicle:args[1],direction:args[2],frame:args[3],avatar:args[4],rowing:args[5]});return window.v225OriginalPaint(...args);};});
      if(mobile)await press('[data-move="right"]');else await page.keyboard.press('ArrowRight');
      await page.waitForFunction(()=>window.v225BoatCalls.some(p=>p.rowing&&p.frame%2===1));
      await page.waitForFunction(()=>!playerWalking);
      const after=await page.evaluate(()=>({x:s.x,y:s.y,hp:s.hp,minutes:s.gameMinutes})),step=vehicle==='canoe'?5:3,cost=vehicle==='canoe'?2:1;
      assert.deepEqual(after,{x:before.x+step,y:before.y,hp:before.hp-cost,minutes:before.minutes+2});
      const calls=await page.evaluate(()=>{const calls=window.v225BoatCalls;ShuCoast.paintBoat=window.v225OriginalPaint;delete window.v225OriginalPaint;delete window.v225BoatCalls;return calls;});
      assert.ok(calls.some(p=>p.rowing&&p.frame%2===1&&p.avatar===avatar&&p.vehicle===vehicle));assert.equal(calls.at(-1).rowing,false);
      await page.evaluate(()=>save());const saved=await page.evaluate(()=>({x:s.x,y:s.y,hp:s.hp,minutes:s.gameMinutes,avatar:s.avatar,vehicle:s.equipment.vehicle}));
      await page.reload({waitUntil:'load'});await press('#start');
      assert.deepEqual(await page.evaluate(()=>({x:s.x,y:s.y,hp:s.hp,minutes:s.gameMinutes,avatar:s.avatar,vehicle:s.equipment.vehicle})),saved);
      await page.waitForFunction(()=>{const c=document.querySelector('#boatVisual'),d=c.getContext('2d').getImageData(0,0,c.width,c.height).data;let n=0;for(let i=3;i<d.length;i+=4)if(d[i]>100)n++;return n>3500;});
      assert.ok((await signature()).colors>500,'saved hero decodes with fine detail again');
      await page.evaluate(()=>{s.x=193;s.y=77;render();});checked.push({vehicle,avatar,headings:4,stroke:true,movement:true,saveReload:true});
    }
    assert.deepEqual(errors,[]);assert.deepEqual(failed,[]);
    console.log('V225_BOAT_CHARACTERS_PASS '+JSON.stringify({mobile,checked,errors,failed}));
  }finally{await context.close();await browser.close();}
};
