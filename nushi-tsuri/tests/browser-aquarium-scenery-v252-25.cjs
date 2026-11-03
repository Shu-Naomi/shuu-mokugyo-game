// Standalone local/public browser evidence; never publishes or mutates remote data.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),http=require('node:http');
const {chromium}=require('playwright');
const {boot,seed,read,saveKey}=require('./game-harness.cjs');
const root=path.resolve(__dirname,'..'),directory=process.env.AQUARIUM_SCENERY_EVIDENCE_DIR||path.join(__dirname,'aquarium-scenery-evidence');
const screens=[{width:1280,height:720,mobile:false,dpr:1},{width:844,height:390,mobile:true,dpr:1},{width:820,height:366,mobile:true,dpr:1.875}];
function fixture(){
 const app=boot({...seed(),money:20000,caught:{...seed().caught,moroko:1,aji:1}}),w=app.window;
 try{
  w.eval('petUi.open("shop")');w.document.querySelector('[data-pet-buy="moroko"]').click();
  w.eval('s.petLife.selectedTank=1;petUi.open("shop")');w.document.querySelector('[data-pet-buy="aji"]').click();
  return read(w,'s');
 }finally{app.dispose();}
}
async function run(url,screen,state){
 const {width,height,mobile,dpr}=screen,browser=await chromium.launch({headless:true,...(process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE?{executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE}:{})});
 const context=await browser.newContext({viewport:{width,height},isMobile:mobile,hasTouch:mobile,deviceScaleFactor:dpr,locale:'ja-JP',serviceWorkers:'block'});
 const errors=[],httpErrors=[],checks=[];let page;
 try{
  await context.addInitScript(({state,key})=>{localStorage.setItem(key,JSON.stringify(state));localStorage.setItem('nushi-inugoya-options-v1',JSON.stringify({textSpeed:'instant'}));},{state,key:saveKey});
  page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));page.on('response',r=>{if(r.status()>=400&&r.url().startsWith(new URL(url).origin))httpErrors.push(`${r.status()} ${r.url()}`);});
  const press=q=>page.locator(q)[mobile?'tap':'click']();
  const select=async n=>{await press('[data-pet-action="tanks"]');await press(`[data-pet-tank="${n}"]`);};
  async function check(name,water,inspect=false){
   await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
   const result=await page.evaluate(async({water,inspect})=>{
    const stage=document.querySelector(inspect?'#petInspectStage':'#petTankStage'),scenery=stage.querySelector('.pet-aquarium-scenery'),style=getComputedStyle(scenery),r=stage.getBoundingClientRect();
    const src=style.backgroundImage.match(/url\(["']?(.*?)["']?\)/)?.[1];const image=new Image();image.src=src;await image.decode();
    return {theme:stage.dataset.waterTheme,src,width:image.naturalWidth,height:image.naturalHeight,pointerEvents:style.pointerEvents,zIndex:style.zIndex,stage:{x:r.x,y:r.y,width:r.width,height:r.height},haze:stage.style.getPropertyValue('--water-haze')};
   },{water,inspect});
   assert.equal(result.theme,water);assert.match(result.src,new RegExp(water==='empty'?'aquarium-interior-v214.webp':`aquarium-${water}-v252-25.webp`));
   assert.ok(result.width>0&&result.height>0);assert.equal(result.pointerEvents,'none');assert.equal(result.zIndex,'0');
   assert.ok(result.stage.width>=250&&result.stage.height>=110,JSON.stringify(result));
   assert.ok(result.stage.x>=0&&result.stage.y>=0&&result.stage.x+result.stage.width<=width+1&&result.stage.y+result.stage.height<=height+1,'stage fits viewport');
   await page.screenshot({path:path.join(directory,`${width}x${height}-${name}.png`)});checks.push({name,...result});
  }
  await page.goto(url,{waitUntil:'load'});await require('./browser-start-adventure.cjs')(page,mobile);
  if(await page.locator('#lakeIntroSkip').isVisible())await press('#lakeIntroSkip');
  await page.evaluate(()=>petUi.open('aquarium'));
  const snapshot=()=>page.evaluate(()=>({money:s.money,caught:s.caught,fish:s.petLife.fish,eggs:s.petLife.eggs,food:s.petLife.food}));
  const before=await snapshot();
  for(const [tank,water] of [[0,'fresh'],[1,'salt']]){
   await select(tank);await check(`${water}-whole`,water);
   await press('[data-pet-action="zoom"]');await check(`${water}-zoom`,water);await press('[data-pet-action="zoom"]');
   await press('.pet-fish-roster [data-pet-inspect]');await check(`${water}-single`,water,true);await press('[data-pet-action="focus-close"]');
  }
  assert.deepEqual(await snapshot(),before);
  await page.evaluate(()=>{s.petLife.fish.forEach(f=>f.water=20);petUi.open('aquarium');});await check('salt-low-water','salt');
  assert.ok(Number(checks.at(-1).haze)>0,'low water haze remains visible');
  await page.evaluate(()=>{s.petLife.fish=[];s.petLife.selected=null;s.petLife.eggs=[{uid:'egg-1',species:'moroko',tank:0,hatchDay:99},{uid:'egg-2',species:'aji',tank:1,hatchDay:99}];s.petLife.legendTanks={fresh:true,salt:true};petUi.open('aquarium');});
  for(const [tank,water,name] of [[0,'fresh','fresh-eggs'],[1,'salt','salt-eggs'],[2,'empty','empty'],[6,'fresh','legend-fresh-empty'],[7,'salt','legend-salt-empty']]){await select(tank);await check(name,water);}
  assert.deepEqual(errors,[]);assert.deepEqual(httpErrors,[]);
  fs.writeFileSync(path.join(directory,`${width}x${height}-result.json`),JSON.stringify({screen,checks,errors,httpErrors},null,2));console.log(`AQUARIUM_SCENERY_PASS ${width}x${height}: ${checks.length} views`);
 }catch(error){if(page)await page.screenshot({path:path.join(directory,`${width}x${height}-failure.png`)}).catch(()=>{});throw error;}
 finally{await context.close();await browser.close();}
}
const types={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.png':'image/png','.webp':'image/webp','.svg':'image/svg+xml','.mp3':'audio/mpeg','.wav':'audio/wav'};
const server=http.createServer((req,res)=>{try{const p=new URL(req.url,'http://localhost').pathname.replace(/^\/nushi-tsuri\//,'')||'index.html',file=path.resolve(root,p);if(!file.startsWith(root+path.sep)||!fs.statSync(file).isFile())throw Error('path');res.writeHead(200,{'Content-Type':types[path.extname(file)]||'application/octet-stream','Cache-Control':'no-store'});fs.createReadStream(file).pipe(res);}catch{res.writeHead(404);res.end();}});
(async()=>{
 fs.mkdirSync(directory,{recursive:true});const state=fixture();
 if(process.env.AQUARIUM_PUBLIC_URL){for(const screen of screens)await run(process.env.AQUARIUM_PUBLIC_URL,screen,state);return;}
 await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(0,'127.0.0.1',resolve);});
 try{for(const screen of screens)await run(`http://127.0.0.1:${server.address().port}/nushi-tsuri/`,screen,state);}finally{await new Promise(resolve=>server.close(resolve));}
})().catch(e=>{console.error(e);process.exitCode=1;});
