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
    assert.match(await page.locator('.hud').innerText(),/v202/);
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
    await smoke(url);
  }finally{if(server)await new Promise(resolve=>server.close(resolve));}
})().catch(error=>{console.error(error);process.exitCode=1;});
