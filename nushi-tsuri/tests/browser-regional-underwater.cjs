const assert=require('node:assert/strict');
const path=require('node:path');
const {chromium}=require('playwright');
const {seed,saveKey}=require('./game-harness.cjs');
const enter=require('./browser-start-adventure.cjs');
const {layout}=require('../village-save-migration.js');
const Offshore=require('../offshore-island.js');

function paintedHash(canvas) {
  const pixels=canvas.getContext('2d').getImageData(0,0,canvas.width,canvas.height).data;
  let hash=5381;
  for(let i=0;i<pixels.length;i+=4) {
    if(pixels[i+3]!==255) throw Error('unpainted background');
    hash=Math.imul(hash^pixels[i]^pixels[i+1]^pixels[i+2],33);
  }
  return hash;
}

// Cast and fight at each bank and compare actual rendered pixels,
// not just a data attribute. The quiet cast stays idle while waves continue.
module.exports=async function regionalWater(url,executablePath) {
  const browser=await chromium.launch({headless:true,executablePath,args:['--no-sandbox']});
  const banks=[
    {region:'harbor',mapRegion:'village',x:134,y:102,direction:'right',expected:'sea-shallow',mode:'gauge'},
    {region:'coast-reef',mapRegion:'coast',x:62,y:73,direction:'up',expected:'coast-reef-shallow',mode:'nushi'},
    {region:'coast-sand',mapRegion:'coast',x:145,y:102,direction:'down',expected:'coast-sand-shallow',mode:'gauge'},
    {region:'coast-boat',mapRegion:'coast',x:95,y:84,direction:'up',expected:'coast-reef-shallow',mode:'nushi',boatActive:true},
    ...Offshore.fishingPoints.map(point=>({...point,region:'offshore-'+point.id,mapRegion:Offshore.id,
      expected:'offshore-'+point.id+'-shallow',mode:point.id==='west'?'gauge':'nushi'})),
  ];
  const paintedHashes=[],surfaceHashes=[];
  if(process.env.REGIONAL_WATER_EVIDENCE) require('node:fs').mkdirSync(process.env.REGIONAL_WATER_EVIDENCE,{recursive:true});
  try {
    for(const bank of banks) {
      const context=await browser.newContext({viewport:{width:844,height:390},deviceScaleFactor:1.875,
        isMobile:true,hasTouch:true,locale:'ja-JP',serviceWorkers:'block'});
      const saved={...seed(),...bank,villageLayoutVersion:layout,hp:100,maxHp:100,gameMinutes:720,soundEnabled:false,
        ownedVehicles:['canoe'],equipment:{vehicle:'canoe'},selectedBait:'worm',baits:{worm:20},fightMode:bank.mode};
      await context.addInitScript(({saved,key})=>{
        if(!localStorage.getItem(key))localStorage.setItem(key,JSON.stringify(saved));
        localStorage.setItem('nushi-inugoya-options-v1',JSON.stringify({textSpeed:'instant'}));
      },{saved,key:saveKey});
      const page=await context.newPage(),errors=[],images=new Set();
      page.on('pageerror',error=>errors.push(error.message));
      page.on('response',response=>{
        const pathname=new URL(response.url()).pathname;
        if(response.ok() && pathname.includes('/assets/spot-')) images.add(pathname.split('/').pop());
      });
      try {
        await page.goto(url);await enter(page,true,{slot:1,isNew:false});
        if(await page.locator('#lakeIntroSkip').isVisible())await page.locator('#lakeIntroSkip').tap();
        assert.equal(await page.evaluate(()=>nearbyFishingSpot()?.id),bank.expected);
        await page.locator('#action').tap();
        await page.waitForFunction(region=>{
          const overlay=document.querySelector('.scenery-motion[data-for=castBackdrop]');
          return overlay?.dataset.scene==='surface-'+region && Number(overlay.dataset.waterSamples)>0;
        },bank.region);
        if(bank.mapRegion!=='village') {
          const framing=await page.evaluate(()=>{
            const surface=document.querySelector('#castSurface');
            const {width,height}=surface.getBoundingClientRect();
            const crop=Math.max(0,width*9/16-height);
            const expectedTop=-crop+Math.min(.32*crop,.08*(height+crop));
            const values=[...surface.querySelectorAll('#castBackdrop,.scenery-motion[data-for=castBackdrop]')]
              .map(canvas=>parseFloat(getComputedStyle(canvas).objectPosition.split(/\s+/)[1])/100);
            return {aligned:values.length===2&&values.every(y=>Math.abs(-crop*y-expectedTop)<.1)};
          });
          assert.ok(framing.aligned,bank.region+' surface artwork and ripples align to the cast');
        }
        surfaceHashes.push(await page.locator('#castBackdrop').evaluate(paintedHash));
        if(bank.mapRegion!=='village') assert.ok(images.has('spot-'+bank.region+'-cast.webp'), bank.region+' loaded surface');
        if(bank.boatActive) {
          const hull = await page.evaluate(()=>{
            const model=pixelCastModel, canvas=document.querySelector('#castActor');
            const {x,y,scale}=model.box;
            return {vehicle:battle.coastVehicle, alpha:canvas.getContext('2d')
              .getImageData(Math.round(x+62*scale),Math.round(y+112*scale),1,1).data[3]};
          });
          assert.deepEqual(hull,{vehicle:'canoe',alpha:255});
        }
        if(process.env.REGIONAL_WATER_EVIDENCE)
          await page.screenshot({path:path.join(process.env.REGIONAL_WATER_EVIDENCE,bank.region+'-cast.png'),scale:'css'});
        const wave=()=>page.evaluate(()=>{
          const canvas=document.querySelector('.scenery-motion[data-for=castBackdrop]');
          const pixels=canvas.getContext('2d').getImageData(0,0,canvas.width,canvas.height).data;
          let bright=0,hash=5381;
          for(let i=3;i<pixels.length;i+=4) {if(pixels[i])bright++;hash=Math.imul(hash^pixels[i],33);}
          return {bright,hash,frame:canvas.dataset.waterFrame,phase:battle.phase,money:s.money,bait:s.baits.worm};
        });
        const a=await wave(); assert.ok(a.bright>0);assert.equal(a.phase,'prep');
        await page.waitForFunction(old=>document.querySelector('.scenery-motion[data-for=castBackdrop]').dataset.waterFrame!==old,a.frame);
        const b=await wave();assert.notEqual(b.hash,a.hash);assert.equal(b.phase,'prep');
        assert.equal(b.money,a.money);assert.equal(b.bait,a.bait);
        await page.emulateMedia({reducedMotion:'reduce'});
        await page.waitForFunction(()=>{
          const c=document.querySelector('.scenery-motion[data-for=castBackdrop]');
          return !c.getContext('2d').getImageData(0,0,c.width,c.height).data.some((n,i)=>i%4===3&&n);
        });
        await page.emulateMedia({reducedMotion:'no-preference'});
        await page.waitForFunction(()=>{
          const c=document.querySelector('.scenery-motion[data-for=castBackdrop]');
          return c.getContext('2d').getImageData(0,0,c.width,c.height).data.some((n,i)=>i%4===3&&n);
        });
        // Enter real cast via touch, with deterministic fish choice and bite
        // timing; never set the scene class or call the background renderer.
        await page.evaluate(()=>{
          let state=37;
          Math.random=()=>((state=(Math.imul(state,1664525)+1013904223)>>>0)/4294967296);
        });
        await page.locator('#wait').tap();await page.locator('#beginCast').tap();
        await page.waitForFunction(()=>battle?.phase==='casting'||!!battle?.cast);
        await page.locator('#pull').tap();
        await page.waitForFunction(()=>battle?.f&&battle.phase!=='cast-flight');
        await page.evaluate(()=>{battle.biteAt=Date.now();battle.biteShownAt=null;syncBitePhase();});
        await page.locator('#pull').tap();
        await page.waitForFunction(region=>{
          const c=document.querySelector('#underwaterPixels');
          const phase=battle?.phase;
          const cast = document.querySelector('#castSurface');
          const hooked = document.querySelector('#fishScene').classList.contains('hook-reveal');
          // A decoded seabed can still sit behind the outgoing dive overlay.
          // Wait until the player can actually see the underwater fight.
          return phase==='fight'&&getComputedStyle(cast).display==='none'&&!hooked&&
            getComputedStyle(c).visibility==='visible'&&c.dataset.locale===region&&c.dataset.travelReady==='true'&&
            document.querySelector('.scenery-motion[data-for=underwaterPixels]')?.dataset.scene.endsWith('-'+region);
        },bank.region);
        assert.equal(await page.locator('#fishScene').evaluate(el=>el.classList.contains('nushi-water')),false);
        assert.equal(await page.evaluate(()=>battle.fightMode),bank.mode);
        paintedHashes.push(await page.locator('#underwaterPixels').evaluate(paintedHash));
        if(bank.mapRegion!=='village') assert.ok(images.has('spot-'+bank.region+'-fight.webp'), bank.region+' loaded seabed');
        if(process.env.REGIONAL_WATER_EVIDENCE)
          await page.screenshot({path:path.join(process.env.REGIONAL_WATER_EVIDENCE,bank.region+'.png'),scale:'css'});
        assert.deepEqual(errors,[]);
      } finally {await context.close();}
    }
    assert.equal(new Set(surfaceHashes).size,banks.length,'all rendered shores are distinct');
    assert.equal(new Set(paintedHashes).size,banks.length,'all rendered seabeds are distinct');
    console.log('Regional underwater phone: harbor, five island banks and the coastal boat passed cast, waves, surface and underwater rendering.');
  } finally { await browser.close(); }
};
if(require.main===module)(async()=>{
  if(process.argv[2])return module.exports(process.argv[2],process.env.CHROMIUM);
  const host=require('./browser-reference-village-evidence.cjs').server();
  await new Promise((resolve,reject)=>host.once('error',reject).listen(0,'127.0.0.1',resolve));
  try {
    await module.exports('http://127.0.0.1:'+host.address().port+'/nushi-tsuri/',process.env.CHROMIUM);
  } finally {await new Promise(resolve=>host.close(resolve));}
})().catch(error=>{console.error(error);process.exitCode=1;});
