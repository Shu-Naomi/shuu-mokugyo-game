const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),http=require('node:http');
const {chromium}=require('playwright');
const {seed,saveKey}=require('./game-harness.cjs');
const root=path.resolve(__dirname,'..'),directory=path.resolve(process.env.VALLEY_EVIDENCE_DIR||'/tmp/valley-evidence');
const screens=[{width:1280,height:720,mobile:false,dpr:1},{width:844,height:390,mobile:true,dpr:3}];
// Plan with the field's swept collision, then exercise native touch controls.
async function walkTo(page,target,mobile){
 const directions=await page.evaluate(target=>{
  Math.random=()=>.999999;
  const M=ShuMountain,L=ShuWorldLife;
  const goal=(x,y)=>target==='house-turn'?Math.hypot(x-194,y-47)<=2:target==='bridge'?M.onBridge(x,y,'stream'):target==='cave'?M.exitAt(x,y,'stream')?.region==='cave':L.nearby({mapRegion:'stream',x,y,direction:'up'})?.id===target;
  const queue=[{x:s.x,y:s.y,parent:-1}],seen=new Set([s.x+','+s.y]);
  for(let i=0;i<queue.length;i++){
   const p=queue[i];if(goal(p.x,p.y)){const directions=[];for(let j=i;queue[j].parent>=0;j=queue[j].parent)directions.push(queue[j].direction);return directions.reverse();}
   for(const direction of ['up','right','down','left']){const n=M.moveTarget(p.x,p.y,direction,4,'stream'),key=n.x+','+n.y;if(!seen.has(key)){seen.add(key);queue.push({...n,parent:i,direction});}}
  }
  throw Error('No route to '+target);
 },target);
 for(const d of directions){
  if(mobile)await page.locator('[data-move="'+d+'"]').tap();else await page.evaluate(d=>move(d),d);
  assert.ok(await page.evaluate(()=>s.mapRegion==='stream'&&ShuMountain.walkable(s.x,s.y,'stream')),'safe step toward '+target);
 }
 const result=await page.evaluate(target=>{
  const M=ShuMountain,L=ShuWorldLife,x=s.x,y=s.y;
  const reached=target==='house-turn'?Math.hypot(x-194,y-47)<=2:target==='bridge'?M.onBridge(x,y,'stream'):target==='cave'?M.exitAt(x,y,'stream')?.region==='cave':L.nearby({mapRegion:'stream',x,y,direction:'up'})?.id===target;
  render();return {target,x,y,reached};
 },target);
 assert.ok(result.reached,'reached '+target);return {...result,steps:directions.length};
}
async function run(url,screen){
 const {width,height,mobile,dpr}=screen,browser=await chromium.launch({headless:true,...(process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE?{executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE}:{})});
 const context=await browser.newContext({viewport:{width,height},isMobile:mobile,hasTouch:mobile,deviceScaleFactor:dpr,locale:'ja-JP',serviceWorkers:'block'});
 const errors=[],failures=[];
 try{
 await context.addInitScript(({key,state})=>localStorage.setItem(key,JSON.stringify(state)),{key:saveKey,state:{...seed(),mapRegion:'stream',x:168,y:69,direction:'up',soundEnabled:false}});
 const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));page.on('response',r=>{if(r.status()>=400&&r.url().startsWith(url))failures.push(r.url());});
 await page.goto(url,{waitUntil:'load'});await require('./browser-start-adventure.cjs')(page,mobile);
 await page.waitForFunction(()=>document.querySelector('[data-world-life="stream-shop"] canvas')?.width>0);
 await page.waitForTimeout(1000);
 await page.screenshot({path:path.join(directory,width+'x'+height+'-shop.png')});
 const geometry=await page.evaluate(()=>{const b=ShuWorldLife.buildings.find(b=>b.id==='stream-shop');return {shop:b,asset:ShuMountain.asset,walk:ShuMountain.walkable(b.x,b.y+2,'stream'),solid:ShuWorldLife.solid(b.x,b.y-3,'stream')};});
 assert.ok(geometry.walk);assert.ok(geometry.solid);
 await page.evaluate(()=>{const b=ShuWorldLife.buildings.find(b=>b.id==='stream-shop');s.x=b.x;s.y=b.y+2;s.direction='up';render();});
 await page.locator('#action')[mobile?'tap':'click']();
 await page.waitForFunction(()=>document.querySelector('#store').classList.contains('open'));
 await page.screenshot({path:path.join(directory,width+'x'+height+'-store.png')});
 await page.evaluate(()=>close());await page.waitForTimeout(100);
 const routeEvidence=[await walkTo(page,'house-turn',mobile)];
 await page.waitForTimeout(500);await page.screenshot({path:path.join(directory,width+'x'+height+'-house-right-road.png')});
 routeEvidence.push(await walkTo(page,'stream-house',mobile));
 const houseGeometry=await page.evaluate(()=>{const b=ShuWorldLife.buildings.find(b=>b.id==='stream-house');s.x=b.x;s.y=b.y+2;s.direction='up';render();const node=document.querySelector('[data-world-life="stream-house"]');return {house:b,width:node.getBoundingClientRect().width,playerWidth:document.querySelector('#player').getBoundingClientRect().width,nearby:ShuWorldLife.nearby(s)?.id};});
 assert.equal(houseGeometry.nearby,'stream-house');assert.ok(houseGeometry.width/houseGeometry.playerWidth>4,'house is large enough for the player');
 await page.waitForTimeout(500);
 const alignment=await page.evaluate(()=>{const b=ShuWorldLife.buildings.find(b=>b.id==='stream-house'),r=document.querySelector('[data-world-life="stream-house"]').getBoundingClientRect(),p=document.querySelector('#player').getBoundingClientRect();return {doorX:r.left+r.width*ShuWorldLife.art.doorX[b.sprite],playerX:p.left+p.width/2};});
 assert.ok(Math.abs(alignment.doorX-alignment.playerX)<2,'player settles in front of the visible house door');
 await page.screenshot({path:path.join(directory,width+'x'+height+'-house.png')});
 await page.locator('#action')[mobile?'tap':'click']();
 await page.waitForFunction(()=>document.querySelector('.modal.open'));
 await page.screenshot({path:path.join(directory,width+'x'+height+'-house-dialog.png')});
 await page.evaluate(()=>close());
 await require('./browser-release.cjs').assertRelease(page);
 routeEvidence.push(await walkTo(page,'cave',mobile));
 await page.waitForTimeout(500);await page.screenshot({path:path.join(directory,width+'x'+height+'-cave-approach.png')});
 await page.locator('#action')[mobile?'tap':'click']();
 await page.waitForFunction(()=>s.mapRegion==='cave');
 await page.screenshot({path:path.join(directory,width+'x'+height+'-cave.png')});
 await page.locator('#action')[mobile?'tap':'click']();
 await page.waitForFunction(()=>s.mapRegion==='stream'&&ShuMountain.walkable(s.x,s.y,'stream'));
 await page.waitForTimeout(500);await page.screenshot({path:path.join(directory,width+'x'+height+'-cave-return.png')});
 routeEvidence.push(await walkTo(page,'stream-shop',mobile));
 routeEvidence.push(await walkTo(page,'bridge',mobile));
 await page.waitForTimeout(500);
 await page.screenshot({path:path.join(directory,width+'x'+height+'-bridge.png')});
 assert.deepEqual(errors,[]);assert.deepEqual(failures,[]);
 fs.writeFileSync(path.join(directory,width+'x'+height+'-result.json'),JSON.stringify({screen,geometry,houseGeometry,routeEvidence,errors,failures},null,2));
 console.log('VALLEY_BROWSER_PASS',width,height);
 }finally{await context.close();await browser.close();}
}
const types = {'.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.png': 'image/png', '.webp': 'image/webp', '.svg': 'image/svg+xml', '.mp3': 'audio/mpeg', '.wav': 'audio/wav'};
const server = http.createServer((req, res) => {
  try {
    const name = new URL(req.url, 'http://localhost').pathname.replace(/^\/nushi-tsuri\//, '') || 'index.html';
    const file = path.resolve(root, name);
    if (!file.startsWith(root + path.sep) || !fs.statSync(file).isFile()) throw Error('path');
    res.writeHead(200, {'Content-Type': types[path.extname(file)] || 'application/octet-stream', 'Cache-Control': 'no-store'});
    fs.createReadStream(file).pipe(res);
  } catch {res.writeHead(404); res.end();}
});
(async () => {
  fs.mkdirSync(directory, {recursive: true});
  await new Promise((resolve, reject) => {server.once('error', reject); server.listen(0, '127.0.0.1', resolve);});
  try {for (const screen of screens) await run(`http://127.0.0.1:${server.address().port}/nushi-tsuri/`, screen);}
  finally {await new Promise(resolve => server.close(resolve));}
})().catch(error => {console.error(error); process.exitCode = 1;});
