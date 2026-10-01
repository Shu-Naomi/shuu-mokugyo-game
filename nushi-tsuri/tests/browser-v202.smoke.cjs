// Run separately from the deterministic unit suite: real Chromium, painted maps and UI inputs.
const assert=require('node:assert/strict'),http=require('node:http'),fs=require('node:fs'),path=require('node:path');
const {createHash}=require('node:crypto'),{chromium}=require('playwright');
const {seed,saveKey}=require('./game-harness.cjs'),M=require('../mountain-region.js');
const root=path.resolve(__dirname,'..'),publicUrl='https://shu-naomi.github.io/shuu-mokugyo-game/nushi-tsuri/';
const delay=ms=>new Promise(resolve=>setTimeout(resolve,ms));
const digest=bytes=>createHash('sha256').update(bytes).digest('hex');
async function waitForPublication(){
  const expected=digest(fs.readFileSync(path.join(root,'index.html')));
  for(let attempt=0;attempt<100;attempt++){
    try{
      const response=await fetch(publicUrl+'?release='+process.env.GITHUB_SHA,{cache:'no-store',signal:AbortSignal.timeout(15000)});
      if(response.ok&&digest(Buffer.from(await response.arrayBuffer()))===expected){
        for(const file of ['sw.js','mountain-region.js','regional-nushi.js','nushi-atlas.js','aquarium-life.js',
          'assets/pass-pond-v202.png','assets/pass-marsh-v202.png','assets/cave-lake-v202.png',
          'assets/stream-nushi-v202.png','assets/coast-nushi-v202.png','assets/cave-nushi-v202.png','assets/star-nushi-v202.png']){
          const asset=await fetch(publicUrl+file+'?release='+process.env.GITHUB_SHA,{cache:'no-store',signal:AbortSignal.timeout(20000)});
          assert.equal(asset.status,200,file);
          assert.equal(digest(Buffer.from(await asset.arrayBuffer())),digest(fs.readFileSync(path.join(root,file))),file+' deployed bytes');
        }
        console.log('PUBLIC_RELEASE_VERIFIED '+process.env.GITHUB_SHA);return publicUrl;
      }
    }catch(error){if(attempt%10===0)console.log('Publication check: '+error.message);}
    if(attempt%10===0)console.log('Waiting for Pages to serve the validated commit');
    await delay(3000);
  }
  throw Error('Pages did not serve the validated release');
}
function route(region,start,goal){
  const queue=[{...start,keys:[]}],seen=new Set([start.x+','+start.y]);
  for(let i=0;i<queue.length;i++){
    const point=queue[i];if(goal(point.x,point.y))return point.keys;
    for(const [key,dx,dy]of [['ArrowUp',0,-4],['ArrowRight',4,0],['ArrowDown',0,4],['ArrowLeft',-4,0]]){
      const x=point.x+dx,y=point.y+dy,id=x+','+y;if(seen.has(id))continue;
      if(Array.from({length:9},(_,j)=>M.walkable(point.x+dx*j/8,point.y+dy*j/8,region)).every(Boolean)){
        seen.add(id);queue.push({x,y,keys:[...point.keys,key]});
      }
    }
  }throw Error('No walking route in '+region);
}
async function smoke(url){
  const browser=await chromium.launch({headless:true});
  const context=await browser.newContext({viewport:{width:1280,height:720},locale:'ja-JP'});
  const saved={...seed(),hp:100,mapRegion:'stream',...M.entry,soundEnabled:false};
  await context.addInitScript(({key,state})=>{
    if(!localStorage.getItem(key))localStorage.setItem(key,JSON.stringify(state));
  },{key:saveKey,state:saved});
  const page=await context.newPage(),errors=[],failedAssets=[];
  page.on('pageerror',error=>errors.push(error.message));
  page.on('response',response=>{
    if(response.status()>=400&&/v202\.png|(?:regional-nushi|nushi-atlas|mountain-region|aquarium-life)\.js/.test(response.url()))
      failedAssets.push(response.status()+' '+response.url());
  });
  const position=()=>page.locator('#player').evaluate(el=>({
    x:Math.round(parseFloat(el.style.left)*2.4*1e6)/1e6,y:Math.round(parseFloat(el.style.top)*1.35*1e6)/1e6,
  }));
  const hashes=new Map();
  async function checkRegion(region,screenshot=false){
    assert.equal(await page.locator('#mountainPixels').getAttribute('aria-label'),M.regions[region].name);
    assert.equal(await page.locator('#map').evaluate(el=>el.classList.contains('mountain')),true);
    if(screenshot){
      const arrivalDelta=await page.locator('#map').evaluate(map=>{
        const player=map.querySelector('#player'),pose=getComputedStyle(player),camera=new DOMMatrixReadOnly(getComputedStyle(map).transform);
        const translation=map.style.transform.match(/translate3d\(([-\d.]+)%,\s*([-\d.]+)%/);
        return Math.max(
          Math.abs(parseFloat(pose.left)-parseFloat(player.style.left)/100*map.clientWidth),
          Math.abs(parseFloat(pose.top)-parseFloat(player.style.top)/100*map.clientHeight),
          Math.abs(camera.m41-Number(translation[1])/100*map.clientWidth),
          Math.abs(camera.m42-Number(translation[2])/100*map.clientHeight));
      });
      assert.ok(arrivalDelta<.75,region+' actor/camera still interpolates from the previous map: '+arrivalDelta);
    }
    await page.waitForFunction(()=>{
      const c=document.querySelector('#mountainPixels'),data=c.getContext('2d').getImageData(0,0,c.width,c.height).data,colors=new Set();
      for(let i=0;i<data.length;i+=4*307)if(data[i+3]>100)colors.add(data[i]+','+data[i+1]+','+data[i+2]);
      return colors.size>1000;
    },null,{timeout:15000});
    const signature=await page.locator('#mountainPixels').evaluate(c=>{
      const pixels=c.getContext('2d').getImageData(0,0,c.width,c.height).data;let hash=2166136261;
      for(let i=0;i<pixels.length;i+=97)hash=Math.imul(hash^pixels[i],16777619);
      return hash>>>0;
    });
    if(!hashes.has(region))hashes.set(region,signature);
    if(screenshot)console.log('NUSHI_SCREENSHOT '+region+' data:image/jpeg;base64,'+(await page.screenshot({type:'jpeg',quality:72})).toString('base64'));
  }
  async function start(){
    await page.locator('#start').click();
    await page.locator('#game.active').waitFor({state:'visible'});
    assert.match(await page.locator('.hud').innerText(),/v203/);
  }
  async function walk(region,goal){
    const keys=route(region,await position(),goal);
    for(const key of keys){
      const old=await position();await page.keyboard.press(key);
      const delta={ArrowUp:[0,-4],ArrowRight:[4,0],ArrowDown:[0,4],ArrowLeft:[-4,0]}[key];
      const next=await position();
      assert.ok(Math.abs(next.x-old.x-delta[0])<.001&&Math.abs(next.y-old.y-delta[1])<.001,region+' blocked '+key+' at '+JSON.stringify(old));
    }return keys.length;
  }
  const exitTo=target=>(x,y)=>M.exitAt(x,y,currentRegion)?.region===target;
  let currentRegion='stream',steps=0;
  try{
    await page.goto(url,{waitUntil:'domcontentloaded'});await start();await checkRegion('stream');
    steps+=await walk('stream',(x,y)=>M.exitAt(x,y,'stream')?.region==='mountainPond');
    await page.keyboard.press('z');currentRegion='mountainPond';await checkRegion(currentRegion,true);
    const beforeReload=await position();await page.reload({waitUntil:'domcontentloaded'});await start();await checkRegion(currentRegion);
    assert.deepEqual(await position(),beforeReload,'pond save resumes the same place');
    steps+=await walk(currentRegion,exitTo('mountainMarsh'));await page.keyboard.press('z');
    currentRegion='mountainMarsh';await checkRegion(currentRegion,true);
    await page.keyboard.press('z');currentRegion='mountainPond';await checkRegion(currentRegion);
    steps+=await walk(currentRegion,(x,y)=>M.atReturnGate(x,y,currentRegion));await page.keyboard.press('z');
    currentRegion='stream';await checkRegion(currentRegion);
    steps+=await walk(currentRegion,exitTo('cave'));await page.keyboard.press('z');
    currentRegion='cave';await checkRegion(currentRegion,true);
    const cavePosition=await position();await page.reload({waitUntil:'domcontentloaded'});await start();await checkRegion(currentRegion);
    assert.deepEqual(await position(),cavePosition,'cave save resumes the same place');
    await page.keyboard.press('z');currentRegion='stream';await checkRegion(currentRegion);
    steps+=await walk(currentRegion,(x,y)=>M.atReturnGate(x,y,currentRegion));await page.keyboard.press('z');
    assert.equal(await page.locator('#map').evaluate(el=>el.classList.contains('mountain')),false);
    assert.equal(new Set(hashes.values()).size,4,'four distinct painted maps');
    assert.deepEqual(errors,[],'browser runtime errors');assert.deepEqual(failedAssets,[],'new assets load');
    console.log('BROWSER_SMOKE_PASS '+JSON.stringify({url,walkingSteps:steps,maps:[...hashes.keys()],saveReloads:2,errors}));
  }finally{await browser.close();}
}
// These fixed routes follow the dirt painted into the stream background.
// They deliberately do not ask the collision model to find its own way around
// a bad road, as the broader map-connectivity check above does.
async function touchSmoke(url){
  const browser=await chromium.launch({headless:true}),errors=[];
  let taps=0;
  async function openStream(extra={}){
    const context=await browser.newContext({viewport:{width:390,height:844},
      deviceScaleFactor:2,isMobile:true,hasTouch:true,locale:'ja-JP'});
    const state={...seed(),hp:100,mapRegion:'stream',...M.entry,soundEnabled:false,...extra};
    await context.addInitScript(({key,state})=>{
      if(!localStorage.getItem(key))localStorage.setItem(key,JSON.stringify(state));
    },{key:saveKey,state});
    const page=await context.newPage();page.on('pageerror',error=>errors.push(error.message));
    await page.goto(url,{waitUntil:'domcontentloaded'});
    assert.equal(await page.locator('.landscape-warning').isVisible(),true,'portrait phone asks for landscape');
    await page.setViewportSize({width:844,height:390});await page.locator('#start').tap();
    await page.locator('#game.active').waitFor({state:'visible'});
    assert.match(await page.locator('.hud').innerText(),/v203/);
    const position=()=>page.locator('#player').evaluate(el=>({
      x:Math.round(parseFloat(el.style.left)*2.4*1e6)/1e6,
      y:Math.round(parseFloat(el.style.top)*1.35*1e6)/1e6,
    }));
    async function leg(direction,count,x,y){
      for(let i=0;i<count;i++){await page.locator(`[data-move="${direction}"]`).tap();taps++;}
      const p=await position();assert.ok(Math.abs(p.x-x)<.001&&Math.abs(p.y-y)<.001,
        'touch '+direction+' expected '+x+','+y+' but got '+JSON.stringify(p));
    }
    return {context,page,position,leg};
  }
  try{
    const road=await openStream(),{page,leg}=road;
    await leg('up',9,152,92);await leg('left',1,148,92);await leg('up',5,148,72);
    await leg('left',17,80,72);await leg('up',10,80,32);await leg('left',1,76,32);
    await leg('up',5,76,12);await leg('left',1,72,12);await leg('up',1,72,8);
    await page.locator('#action').tap();
    assert.equal(await page.locator('#mountainPixels').getAttribute('aria-label'),'峠の池');
    const savedPosition=await road.position();await page.reload({waitUntil:'domcontentloaded'});
    await page.locator('#start').tap();assert.deepEqual(await road.position(),savedPosition);
    assert.equal(await page.locator('#mountainPixels').getAttribute('aria-label'),'峠の池');
    await road.context.close();

    const cave=await openStream({x:148,y:72}),c=cave.leg;
    await c('up',1,148,68);await c('right',6,172,68);await c('up',3,172,56);
    await c('right',1,176,56);await c('up',2,176,48);await c('right',3,188,48);
    await c('up',1,188,44);await c('right',3,200,44);await c('up',2,200,36);
    await c('right',4,216,36);await c('up',2,216,28);await cave.page.locator('#action').tap();
    assert.equal(await cave.page.locator('#mountainPixels').getAttribute('aria-label'),'岩窟の地下湖');
    await cave.context.close();

    const rail=await openStream({x:112,y:72}),r=rail.leg;
    await r('up',1,112,70);await r('up',1,112,70);
    await r('left',8,80,70);await r('right',17,148,70);
    await rail.context.close();
    assert.deepEqual(errors,[],'touchscreen runtime errors');
    console.log('TOUCH_SMOKE_PASS '+JSON.stringify({viewport:'844x390',rotatedPhone:true,taps,paintedRoads:['entrance','west bank','cave'],bridgeBanks:2,saveReloads:1,errors}));
  }finally{await browser.close();}
}
(async()=>{
  let server;
  try{
    let url;
    if(process.env.NUSHI_PUBLIC_SMOKE==='1')url=await waitForPublication();
    else{
      server=http.createServer((request,response)=>{
        try{
          let pathname=decodeURIComponent(new URL(request.url,'http://localhost').pathname);
          if(!pathname.startsWith('/nushi-tsuri/')){response.writeHead(404);response.end();return;}
          pathname=pathname.slice('/nushi-tsuri/'.length)||'index.html';
          const file=path.resolve(root,pathname);
          if(!file.startsWith(root+path.sep)||!fs.statSync(file).isFile())throw Error('Invalid path');
          const types={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8',
            '.png':'image/png','.webp':'image/webp','.mp3':'audio/mpeg','.wav':'audio/wav','.svg':'image/svg+xml'};
          response.writeHead(200,{'Content-Type':types[path.extname(file)]||'application/octet-stream','Cache-Control':'no-store'});
          fs.createReadStream(file).pipe(response);
        }catch{response.writeHead(404);response.end();}
      });
      await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
      url='http://127.0.0.1:'+server.address().port+'/nushi-tsuri/';
    }
    await smoke(url);await touchSmoke(url);
  }finally{if(server)await new Promise(resolve=>server.close(resolve));}
})().catch(error=>{console.error(error);process.exitCode=1;});
