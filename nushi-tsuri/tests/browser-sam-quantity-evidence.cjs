// Synthetic local browser evidence; never reads a user's save or publishes code.
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),http=require('node:http');
const {seed,saveKey}=require('./game-harness.cjs');
const {revealProduct}=require('./compact-ui-helpers.cjs');
const root=path.resolve(__dirname,'..'),directory=path.join(__dirname,'sam-quantity-evidence');
const screens=[{width:740,height:320,mobile:true,dpr:1},{width:820,height:366,mobile:true,dpr:1.875},{width:844,height:390,mobile:true,dpr:1},{width:1280,height:720,mobile:false,dpr:1}];
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
  const metrics=await page.locator('.sam-purchase-layer').evaluate(layer=>{
   const body=layer.querySelector('.compact-sheet-body'),m=body.getBoundingClientRect();
   const nodes=[...layer.querySelectorAll('[data-bait-count-step], [data-bait-digit], .sam-purchase-name, .sam-purchase-pack, .sam-purchase-units, .sam-purchase-total, .sam-purchase-wallet, .sam-purchase-actions button')];
   const summary=layer.querySelector('.sam-purchase-summary').getBoundingClientRect(),picker=layer.querySelector('.bait-quantity-picker').getBoundingClientRect(),label=layer.querySelector('.bait-quantity-label').getBoundingClientRect(),digits=layer.querySelector('.bait-digit-picker').getBoundingClientRect();
   return {notOverlapping:summary.bottom<=picker.top+1&&label.bottom<=digits.top+1,bodyFits:body.scrollHeight<=body.clientHeight+1&&body.scrollWidth<=body.clientWidth+1,count:document.querySelector('#samBaitPurchaseCount').textContent,units:layer.querySelector('.sam-purchase-units').textContent,total:layer.querySelector('.sam-purchase-total').textContent,nodes:nodes.map(n=>{const r=n.getBoundingClientRect();return {text:n.textContent,width:r.width,height:r.height,button:n.tagName==='BUTTON',fits:n.scrollWidth<=n.clientWidth+1&&n.scrollHeight<=n.clientHeight+1,inside:r.top>=m.top-1&&r.bottom<=m.bottom+1&&r.left>=m.left-1&&r.right<=m.right+1};})};
  });
  checks.push({name,...metrics});await page.screenshot({path:path.join(directory,`${screen.width}x${screen.height}-${name}.png`)});
  assert.ok(metrics.notOverlapping,name+': summary and quantity rows do not overlap');assert.ok(metrics.bodyFits,name+': no scrolling');for(const n of metrics.nodes){assert.ok(n.fits&&n.inside,name+': fully visible '+n.text);if(n.button)assert.ok(n.width>=44&&n.height>=44,name+': touch target '+n.text);}
  return metrics;
 }
 try{
  await context.addInitScript(({key,state})=>{if(!localStorage.getItem(key))localStorage.setItem(key,JSON.stringify(state));localStorage.setItem('nushi-inugoya-options-v1',JSON.stringify({textSpeed:'instant'}));},{key:saveKey,state:{...seed(),money:10000,baits:{corn:92},x:197,y:91,direction:'up',soundEnabled:false}});
  await page.goto(url,{waitUntil:'load'});await enter();
  assert.equal(await page.locator('.bait-quantity-picker').isVisible(),false,'no quantity editor on shelf');
  await page.screenshot({path:path.join(directory,`${screen.width}x${screen.height}-shelf.png`)});
  const open=async()=>{const target=await revealProduct(page,'[data-buy-bait="corn"]',screen.mobile);await target[screen.mobile?'tap':'click']();};
  await open();await press('[data-bait-count-step="10"]');await press('[data-bait-count-step="10"]');await press('[data-bait-count-step="-1"]');
  const m=await shot('20-sets');assert.equal(m.count,'020セット');assert.equal(m.units,'受け取る数：60個（20セット）');assert.equal(m.total,'合計：5,200円');
  await press('[data-sam-confirm-cancel]');assert.deepEqual(await state(),{money:10000,corn:92});
  await open();await press('[data-sam-confirm-buy]');assert.deepEqual(await state(),{money:4800,corn:152});
  await open();assert.equal(await page.locator('[data-sam-confirm-buy]').isDisabled(),true);await shot('insufficient');assert.deepEqual(await state(),{money:4800,corn:152});
  await press('[data-bait-count-step="-100"]');for(let i=0;i<4;i++)await press('[data-bait-count-step="1"]');const five=await shot('5-sets');assert.equal(five.count,'005セット');
  await page.keyboard.press('Escape');assert.equal(await page.locator('.sam-purchase-layer').count(),0);
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
