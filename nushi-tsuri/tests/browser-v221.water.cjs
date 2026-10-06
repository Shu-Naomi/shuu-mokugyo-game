const assert=require('node:assert/strict'),{chromium}=require('playwright');
const {createCanvas,loadImage}=require('@napi-rs/canvas');
const {seed,saveKey}=require('./game-harness.cjs'),{cases,findRoute}=require('./water-routes-v220.cjs');
module.exports=async function castingWater(url,mobile=false){
 const browser=await chromium.launch({headless:true}),errors=[],failed=[],results=[];
 const viewport=mobile?{width:844,height:390}:{width:1280,height:720};
 try{
  for(const [sample,clock]of [[cases[0],780],[cases[0],1020],[cases[1],780],[cases[3],780],[cases[5],780],[cases[8],780],[cases[10],780]]){
   const context=await browser.newContext({viewport,isMobile:mobile,hasTouch:mobile,locale:'ja-JP'}),state={...seed(),hp:100,gameMinutes:clock,soundEnabled:false,
    mapRegion:sample.region,x:sample.start[0],y:sample.start[1],boatActive:false,baits:{worm:20},ownedRods:['bamboo','clearStream'],selectedRod:'clearStream',
    ownedVehicles:['canoe'],equipment:{vehicle:'canoe'}};
   await context.addInitScript(({key,state})=>{localStorage.setItem(key,JSON.stringify(state));localStorage.setItem('nushi-inugoya-options-v1','{"textSpeed":"instant"}');},{key:saveKey,state});
   const page=await context.newPage(),press=q=>page.locator(q)[mobile?'tap':'click']();
   page.on('pageerror',e=>errors.push(e.message));page.on('response',r=>{if(r.status()>=400&&r.url().includes('/nushi-tsuri/'))failed.push(r.url());});
   try{
    await page.goto(url,{waitUntil:'load'});await press('#start');if(await page.locator('#lakeIntroSkip').isVisible())await press('#lakeIntroSkip');
    assert.equal(await page.evaluate(()=>s.mapRegion),sample.region,'saved fishing region is ready');
    const route=await page.evaluate(({fn,type})=>(0,eval)('('+fn+')')(window,type),{fn:findRoute.toString(),type:sample.type});
    for(const direction of route.path){
     await page.waitForFunction(()=>!forageDiscoveryInProgress&&!rescueInProgress&&!playerHomeState.transitioning);
     if(mobile)await press('[data-move="'+direction+'"]');else await page.keyboard.press({up:'ArrowUp',down:'ArrowDown',left:'ArrowLeft',right:'ArrowRight'}[direction]);
    }
    await page.waitForFunction(()=>!forageDiscoveryInProgress&&!rescueInProgress&&!playerHomeState.transitioning);
    const before=await page.evaluate(()=>JSON.stringify({baits:s.baits,caught:s.caught,clock:s.gameMinutes,money:s.money,hp:s.hp}));
    await press('#action');assert.equal(await page.evaluate(()=>battle?.phase),'prep');
    await page.waitForFunction(()=>{const c=document.querySelector('.scenery-motion[data-for="castBackdrop"]');return c?.dataset.waterStyle&&Number(c.dataset.waterSamples)>5;});
    const read=()=>page.evaluate(()=>{
     const c=document.querySelector('.scenery-motion[data-for="castBackdrop"]'),d=c.getContext('2d').getImageData(0,0,c.width,c.height).data;
     let hash=2166136261,visible=0;for(let i=3;i<d.length;i+=4){if(d[i])visible++;hash=Math.imul(hash^d[i-3]^d[i-2]^d[i-1]^d[i],16777619);}
     const r=c.getBoundingClientRect();return {hash:hash>>>0,visible,frame:c.dataset.waterFrame,style:c.dataset.waterStyle,samples:Number(c.dataset.waterSamples),locale:document.querySelector('#castBackdrop').dataset.locale,width:r.width,height:r.height};
    });
    const first=await read();assert.ok(first.visible>100&&first.width>300&&first.height>80);
    const surface=page.locator('.cast-surface'),firstShot=await surface.screenshot({animations:'disabled'});
    await page.waitForFunction(previous=>{
     const c=document.querySelector('.scenery-motion[data-for="castBackdrop"]');return c.dataset.waterFrame!==previous;
    },first.frame);
    const second=await read();assert.notEqual(second.hash,first.hash,'visible pixel waves change between phases');
    const firstImage=await loadImage(firstShot),pixels=image=>{const c=createCanvas(image.width,image.height),ctx=c.getContext('2d');ctx.drawImage(image,0,0);return ctx.getImageData(0,0,c.width,c.height).data;};
    const firstPixels=pixels(firstImage),minimum=['marsh','underground'].includes(sample.type)?.0001:.0005,changes=[];
    let images,visibleChange=0;
    // The calm crests occupy a sparse part of the scene. Compare several slower
    // phases rather than rewarding widespread high-contrast texture changes.
    for(let attempt=0;attempt<3;attempt++){
     const frame=(await read()).frame;
     await page.waitForFunction(previous=>document.querySelector('.scenery-motion[data-for="castBackdrop"]').dataset.waterFrame!==previous,frame);
     await page.waitForTimeout(300);
     const secondImage=await loadImage(await surface.screenshot({animations:'disabled'})),secondPixels=pixels(secondImage);
     let noticeable=0;for(let i=0;i<firstPixels.length;i+=4)if(Math.max(Math.abs(firstPixels[i]-secondPixels[i]),Math.abs(firstPixels[i+1]-secondPixels[i+1]),Math.abs(firstPixels[i+2]-secondPixels[i+2]))>=3)noticeable++;
     const changed=noticeable/(firstPixels.length/4);changes.push({frame:(await read()).frame,changed});
     if(!images||changed>visibleChange){images=[firstImage,secondImage];visibleChange=changed;}
     if(visibleChange>=minimum)break;
    }
    assert.ok(visibleChange<.035,'calm crests leave most painted reflection unchanged');
    console.log('V223_WATER_SAMPLE '+JSON.stringify({mobile,locale:first.locale,style:first.style,changes,visibleChange,minimum}));
    if(mobile&&clock===780&&['lake','reef'].includes(sample.type)){
     const frames=[];
     for(let phase=0;phase<10;phase++){
      const picture=await loadImage(await surface.screenshot({animations:'disabled'}));
      const crop=createCanvas(Math.floor(picture.width/2),Math.floor(picture.height/2));
      crop.getContext('2d').drawImage(picture,-Math.floor(picture.width/4),-Math.floor(picture.height/5));
      frames.push(crop.toBuffer('image/jpeg',88).toString('base64'));
      if(phase<9)await page.waitForTimeout(700);
     }
     console.log('V223_WATER_SEQUENCE '+JSON.stringify({mobile,locale:first.locale,intervalMs:700,frames}));
    }
    assert.equal(await page.evaluate(()=>JSON.stringify({baits:s.baits,caught:s.caught,clock:s.gameMinutes,money:s.money,hp:s.hp})),before,'watching water consumes no gameplay resources');
    results.push({region:sample.region,type:sample.type,clock,style:first.style,samples:first.samples,changed:true,visibleChange});
    if((!mobile&&['lake','stream','reef'].includes(sample.type))||(mobile&&clock===780&&sample.type==='lake'))
     console.log('V221_SCREENSHOT '+JSON.stringify({mobile,screen:'water-'+first.locale+'-'+clock,base64:(await page.screenshot({type:'jpeg',quality:76})).toString('base64')}));
    if(clock===780&&['lake','river','stream','marsh','underground','reef'].includes(sample.type))
     console.log('V223_WATER_FRAMES '+JSON.stringify({mobile,screen:first.locale,frames:images.map(image=>{
      const c=createCanvas(image.width,image.height);c.getContext('2d').drawImage(image,0,0);return c.toBuffer('image/jpeg',85).toString('base64');
     })}));
    assert.ok(visibleChange>=minimum,'final visible casting scenery changes enough to see: '+first.locale+' '+visibleChange);
    if(results.length===1){
     await page.emulateMedia({reducedMotion:'reduce'});await page.waitForFunction(()=>{
      const c=document.querySelector('.scenery-motion[data-for="castBackdrop"]'),d=c.getContext('2d').getImageData(0,0,c.width,c.height).data;return d.every(x=>x===0);
     });
     await page.emulateMedia({reducedMotion:'no-preference'});await page.waitForFunction(()=>{
      const c=document.querySelector('.scenery-motion[data-for="castBackdrop"]'),d=c.getContext('2d').getImageData(0,0,c.width,c.height).data;return d.some((x,i)=>i%4===3&&x>0);
     });
    }
    await press('#pull');assert.equal(await page.evaluate(()=>battle.phase),'cast');
    await press('#wait');assert.equal(await page.evaluate(()=>battle),null);const frame=await read();await page.waitForTimeout(450);assert.equal((await read()).hash,frame.hash,'closed casting scenery no longer animates');
   }finally{await context.close();}
  }
  assert.deepEqual(errors,[]);assert.deepEqual(failed,[]);
  console.log('V221_CAST_WATER_PASS '+JSON.stringify({mobile,results,reducedMotion:true,resumed:true,closedStops:true,errors,failed}));
 }finally{await browser.close();}
};
