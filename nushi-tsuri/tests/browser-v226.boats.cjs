const assert=require('node:assert/strict'),{chromium}=require('playwright');
const {seed,saveKey}=require('./game-harness.cjs');
const oarMetrics=require('./boat-oar-metrics.cjs');
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
    await page.goto(url,{waitUntil:'load'});assert.match(await page.locator('.hud').innerText(),/v227/);await press('#start');
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
        const blades=vehicle==='canoe'?await page.locator('#boatVisual').evaluate(oarMetrics,direction):null;
        const layout=await page.locator('#boatVisual').evaluate(c=>{
          const r=c.getBoundingClientRect(),style=getComputedStyle(c);
          return {visible:style.display!=='none'&&r.width>80&&r.height>60,inside:r.left>=0&&r.top>=0&&r.right<=innerWidth&&r.bottom<=innerHeight,playerHidden:getComputedStyle(document.querySelector('#player')).display==='none',rect:[r.left,r.top,r.right,r.bottom].map(Math.round)};
        });assert.ok(layout.visible&&layout.inside&&layout.playerHidden,JSON.stringify(layout));
        if(vehicle==='canoe')console.log('V226_BOAT_POSE '+JSON.stringify({mobile,avatar,direction,frame:0,base64:(await page.locator('#boatVisual').screenshot({type:'png'})).toString('base64')}));
        await page.evaluate(()=>ShuCoast.paintBoat(document.querySelector('#boatVisual'),s.equipment.vehicle,s.direction,s.equipment.vehicle==='canoe'?2:1,s.avatar,true));
        const stroke=await signature();assert.notEqual(stroke.hash,idle.hash,'a single stroke remains visible');poses.push(idle.hash,stroke.hash);
        if(vehicle==='canoe'){
          const pulled=await page.locator('#boatVisual').evaluate(oarMetrics,direction);
          for(let side=0;side<2;side++)assert.ok(blades[side].pixels>60&&pulled[side].pixels>60&&Math.hypot(blades[side].x-pulled[side].x,blades[side].y-pulled[side].y)>=8,avatar+'/'+direction+'/'+side+' blade must sweep visibly independently of the moving arms');
          console.log('V226_BOAT_POSE '+JSON.stringify({mobile,avatar,direction,frame:2,base64:(await page.locator('#boatVisual').screenshot({type:'png'})).toString('base64')}));
        }
        await page.evaluate(()=>render());
      }
      assert.equal(new Set(poses).size,8,vehicle+'/'+avatar+' distinct views');
      await page.evaluate(()=>{s.direction='right';render();});
      console.log('V226_BOAT_SCREENSHOT '+JSON.stringify({mobile,vehicle,avatar,base64:(await page.screenshot({type:'jpeg',quality:82})).toString('base64')}));
      const before=await page.evaluate(()=>({x:s.x,y:s.y,hp:s.hp,minutes:s.gameMinutes}));
      await page.evaluate(source=>{const measure=eval('('+source+')');window.v226BoatCalls=[];window.v226OriginalPaint=ShuCoast.paintBoat;
        ShuCoast.paintBoat=function(...args){const result=window.v226OriginalPaint(...args);window.v226BoatCalls.push({vehicle:args[1],direction:args[2],frame:args[3],avatar:args[4],rowing:args[5],time:performance.now(),...(args[1]==='canoe'?{blades:measure(args[0],args[2]),base64:args[0].toDataURL('image/png').split(',')[1]}:{})});return result;};},oarMetrics.toString());
      if(mobile)await press('[data-move="right"]');else await page.keyboard.press('ArrowRight');
      await page.waitForFunction(()=>window.v226BoatCalls.some(p=>p.rowing&&p.frame%2===1));
      await page.waitForFunction(()=>!playerWalking);
      const after=await page.evaluate(()=>({x:s.x,y:s.y,hp:s.hp,minutes:s.gameMinutes})),step=vehicle==='canoe'?5:3,cost=vehicle==='canoe'?2:1;
      assert.deepEqual(after,{x:before.x+step,y:before.y,hp:before.hp-cost,minutes:before.minutes+2});
      const calls=await page.evaluate(()=>{const calls=window.v226BoatCalls;ShuCoast.paintBoat=window.v226OriginalPaint;delete window.v226OriginalPaint;delete window.v226BoatCalls;return calls;});
      assert.ok(calls.some(p=>p.rowing&&p.frame%2===1&&p.avatar===avatar&&p.vehicle===vehicle));assert.equal(calls.at(-1).rowing,false);
      if(vehicle==='canoe'){
        const catchPose=calls.find(p=>p.rowing&&p.frame===0),pull=calls.find(p=>p.rowing&&p.frame===2),recovery=calls.find(p=>p.rowing&&p.frame===7);
        assert.ok(catchPose&&pull&&recovery,'one real input completes catch, pull and recovery before resting');
        assert.ok(pull.time-catchPose.time>=150&&recovery.time-pull.time>=300,'the rowing cycle must not flicker at the old 180ms rate');
        for(let side=0;side<2;side++){
          assert.ok(Math.hypot(catchPose.blades[side].x-pull.blades[side].x,catchPose.blades[side].y-pull.blades[side].y)>=8,'actual input moves each blade');
          assert.ok(Math.hypot(catchPose.blades[side].x-recovery.blades[side].x,catchPose.blades[side].y-recovery.blades[side].y)<1,'each blade returns with the hands');
        }
        console.log('V226_BOAT_MOTION '+JSON.stringify({mobile,avatar,direction:'right',frames:[catchPose,pull,recovery,calls.at(-1)]}));
      }
      await page.evaluate(()=>save());const saved=await page.evaluate(()=>({x:s.x,y:s.y,hp:s.hp,minutes:s.gameMinutes,avatar:s.avatar,vehicle:s.equipment.vehicle}));
      await page.reload({waitUntil:'load'});await press('#start');
      assert.deepEqual(await page.evaluate(()=>({x:s.x,y:s.y,hp:s.hp,minutes:s.gameMinutes,avatar:s.avatar,vehicle:s.equipment.vehicle})),saved);
      await page.waitForFunction(()=>{const c=document.querySelector('#boatVisual'),d=c.getContext('2d').getImageData(0,0,c.width,c.height).data;let n=0;for(let i=3;i<d.length;i+=4)if(d[i]>100)n++;return n>3500;});
      assert.ok((await signature()).colors>500,'saved hero decodes with fine detail again');
      await page.evaluate(()=>{s.x=193;s.y=77;render();});checked.push({vehicle,avatar,headings:4,stroke:true,movement:true,saveReload:true});
    }
    assert.deepEqual(errors,[]);assert.deepEqual(failed,[]);
    console.log('V226_BOAT_CHARACTERS_PASS '+JSON.stringify({mobile,checked,errors,failed}));
  }finally{await context.close();await browser.close();}
};
