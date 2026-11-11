// Synthetic local browser evidence; never reads a user's save or publishes code.
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),http=require('node:http');
const {seed,saveKey}=require('./game-harness.cjs');
const {revealProduct}=require('./compact-ui-helpers.cjs');
const root=path.resolve(__dirname,'..'),directory=path.join(__dirname,'sam-quantity-evidence');
const screens=[{width:820,height:366,mobile:true,dpr:1.875},{width:844,height:390,mobile:true,dpr:1},{width:1280,height:720,mobile:false,dpr:1}];
async function run(url,screen){
 const {chromium}=require('playwright');
 const browser=await chromium.launch({headless:true,...(process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE?{executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE}:{})});
 const context=await browser.newContext({viewport:{width:screen.width,height:screen.height},isMobile:screen.mobile,hasTouch:screen.mobile,deviceScaleFactor:screen.dpr,locale:'ja-JP',serviceWorkers:'block'});
 const page=await context.newPage(),errors=[],httpErrors=[],checks=[];
 page.on('pageerror',e=>errors.push(e.message));page.on('response',r=>{if(r.status()>=400)httpErrors.push(r.status()+' '+new URL(r.url()).pathname);});
 const press=q=>page.locator(q)[screen.mobile?'tap':'click']();
 const state=()=>page.evaluate(()=>({money:s.money,corn:s.baits.corn}));
 const enter=async()=>{await require('./browser-start-adventure.cjs')(page,screen.mobile);if(await page.locator('#lakeIntroSkip').isVisible())await press('#lakeIntroSkip');await press('#action');await page.locator('#store.open').waitFor();};
 async function shot(name){
  const metrics=await page.locator('[data-buy-bait="corn"]').evaluate(b=>{
   const row=b.closest('.compact-product'),name=row.querySelector('.compact-product-name'),stock=row.querySelector('.compact-product-stock'),modal=document.querySelector('#store').getBoundingClientRect();
   const box=e=>{const r=e.getBoundingClientRect();return {left:r.left,right:r.right,top:r.top,bottom:r.bottom,width:r.width,height:r.height};};
   return {label:b.dataset.compactActionLabel,name:name.textContent,nameFits:name.scrollWidth<=name.clientWidth+1,stock:stock.textContent,stockFits:stock.scrollWidth<=stock.clientWidth+1,action:box(b),picker:box(document.querySelector('.bait-quantity-picker')),modal:{left:modal.left,right:modal.right,top:modal.top,bottom:modal.bottom},count:document.querySelector('#samBaitPurchaseCount').textContent};
  });
  checks.push({name,...metrics});await page.screenshot({path:path.join(directory,`${screen.width}x${screen.height}-${name}.png`)});
  assert.equal(metrics.nameFits,true,name+': pack size fits');assert.equal(metrics.stockFits,true,name+': actual units and total fit');
  for(const key of ['action','picker']){const b=metrics[key],m=metrics.modal;assert.ok(b.width>0&&b.height>0&&b.left>=m.left&&b.right<=m.right+1&&b.top>=m.top&&b.bottom<=m.bottom+1,name+': '+key+' is visible inside the shop');}
  return metrics;
 }
 try{
  await context.addInitScript(({key,state})=>{if(!localStorage.getItem(key))localStorage.setItem(key,JSON.stringify(state));localStorage.setItem('nushi-inugoya-options-v1',JSON.stringify({textSpeed:'instant'}));},{key:saveKey,state:{...seed(),money:10000,baits:{corn:92},x:197,y:91,direction:'up',soundEnabled:false}});
  await page.goto(url,{waitUntil:'load'});await enter();
  await press('[data-bait-count="10"]');await press('[data-bait-count-step="1"]');
  await revealProduct(page,'[data-buy-bait="corn"]',screen.mobile);
  const m=await shot('20-sets');assert.equal(m.name,'トウモロコシ（1セット3個）');assert.equal(m.count,'20セット');assert.match(m.stock,/60個 · 合計5,200円/);assert.equal(m.label,'60個を購入\n合計5,200円');
  await press('[data-sam-more]');assert.match(await page.locator('.compact-detail-actions button').textContent(),/60個を購入\s*合計5,200円/);await press('[data-compact-sheet-close]');assert.deepEqual(await state(),{money:10000,corn:92});
  await press('[data-buy-bait="corn"]');assert.deepEqual(await state(),{money:4800,corn:152});await shot('purchased');
  await press('[data-buy-bait="corn"]');assert.deepEqual(await state(),{money:4800,corn:152},'unaffordable repeated purchase leaves state unchanged');
  await press('[data-bait-count="5"]');const five=await shot('5-sets');assert.match(five.stock,/15個 · 合計1,300円/);assert.equal(five.count,'5セット');
  await press('#store [data-close]');await press('#action');await page.locator('#store.open').waitFor();assert.equal(await page.locator('.bait-quantity-picker').count(),1);
  await page.reload({waitUntil:'load'});await enter();assert.deepEqual(await state(),{money:4800,corn:152},'purchase survives reload');
  assert.deepEqual(errors,[]);assert.deepEqual(httpErrors,[]);
  fs.writeFileSync(path.join(directory,`${screen.width}x${screen.height}-result.json`),JSON.stringify({screen,passed:true,checks,errors,httpErrors},null,2));
  console.log(`SAM_QUANTITY_PASS ${screen.width}x${screen.height}: pack size, units, total, cancel, purchase, insufficient funds, preset, reopen, reload`);
 }catch(error){await page.screenshot({path:path.join(directory,`${screen.width}x${screen.height}-failure.png`)}).catch(()=>{});fs.writeFileSync(path.join(directory,`${screen.width}x${screen.height}-failure.json`),JSON.stringify({screen,error:error.stack,checks,errors,httpErrors},null,2));throw error;}
 finally{await context.close();await browser.close();}
}
const types={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.png':'image/png','.webp':'image/webp','.jpg':'image/jpeg','.svg':'image/svg+xml','.mp3':'audio/mpeg','.wav':'audio/wav'};
async function main(){
 fs.mkdirSync(directory,{recursive:true});
 const server=http.createServer((request,response)=>{try{const name=new URL(request.url,'http://localhost').pathname.replace(/^\/nushi-tsuri\//,'')||'index.html',file=path.resolve(root,name);if(!file.startsWith(root+path.sep)||!fs.statSync(file).isFile())throw Error('path');response.writeHead(200,{'Content-Type':types[path.extname(file)]||'application/octet-stream','Cache-Control':'no-store'});fs.createReadStream(file).pipe(response);}catch{response.writeHead(404);response.end();}});
 await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(0,'127.0.0.1',resolve);});
 try{for(const screen of screens)await run(`http://127.0.0.1:${server.address().port}/nushi-tsuri/`,screen);}finally{await new Promise(resolve=>server.close(resolve));}
}
module.exports={run,screens};
if(require.main===module)main().catch(error=>{console.error(error);process.exitCode=1;});
