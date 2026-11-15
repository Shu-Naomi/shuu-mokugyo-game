'use strict';
// Negative browser fixtures only: verify fail-closed startup, not cached-pilot
// compatibility or a production worker upgrade. Never use a player's saves.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),http=require('node:http'),{execFileSync}=require('node:child_process');
const {seed}=require('./game-harness.cjs');
const root=path.resolve(__dirname,'..'),output=path.join(__dirname,'browser-evidence-reference-safety');
const oldSave=fs.readFileSync(path.join(__dirname,'fixtures/reference-baseline-save-slots-f220d0a.js'),'utf8');
const expectedError='Reference village safety check blocked startup';
const workerFixture=`self.addEventListener('install',event=>event.waitUntil(self.skipWaiting()));
self.addEventListener('activate',event=>event.waitUntil(self.clients.claim()));
self.addEventListener('fetch',event=>{if(!new URL(self.location.href).searchParams.has('fresh')&&new URL(event.request.url).pathname.endsWith('/save-slots.js'))event.respondWith(fetch('./tests/fixtures/reference-baseline-save-slots-f220d0a.js',{cache:'no-store'}));});`;
function server(){
 const types={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.png':'image/png','.webp':'image/webp','.svg':'image/svg+xml','.mp3':'audio/mpeg','.wav':'audio/wav'};
 return http.createServer((req,res)=>{
  try{
   const name=decodeURIComponent(new URL(req.url,'http://localhost').pathname).replace(/^\/nushi-tsuri\//,'')||'index.html';
   if(name==='__reference_safety_setup__'){res.writeHead(200,{'Content-Type':'text/html','Cache-Control':'no-store'});res.end('<!doctype html><title>Synthetic reference safety fixture</title>');return;}
   if(name==='reference-safety-worker.js'){res.writeHead(200,{'Content-Type':'text/javascript','Cache-Control':'no-store'});res.end(workerFixture);return;}
   const file=path.resolve(root,name);if(!file.startsWith(root+path.sep)||!fs.statSync(file).isFile())throw Error('path');
   res.writeHead(200,{'Content-Type':types[path.extname(file)]||'application/octet-stream','Cache-Control':'no-store'});fs.createReadStream(file).pipe(res);
  }catch{res.writeHead(404);res.end();}
 });
}
async function run(){
 assert.equal(process.env.GITHUB_ACTIONS,'true','Browser safety evidence runs only in authorized GitHub Actions');
 const head=execFileSync('git',['rev-parse','HEAD'],{cwd:root,encoding:'utf8'}).trim();assert.equal(head,process.env.NUSHI_EXPECTED_HEAD_SHA);
 assert.equal(execFileSync('git',['status','--porcelain','--untracked-files=no'],{cwd:root,encoding:'utf8'}).trim(),'');
 fs.mkdirSync(output,{recursive:true});
 const report={head,physicalDevice:false,viewport:{width:844,height:390},fixture:'Synthetic ordinary saves and a test worker. This tests rejection, not production worker upgrade.',checks:[]};
 const host=server();let browser;
 try{
  await new Promise(resolve=>host.listen(0,'127.0.0.1',resolve));const url=`http://127.0.0.1:${host.address().port}/nushi-tsuri/`;
  browser=await require('playwright').chromium.launch({headless:true});
  for(const scenario of ['stale-save-module','native-controlling-worker','native-fresh-worker']){
   const context=await browser.newContext({viewport:report.viewport,hasTouch:true,isMobile:true,serviceWorkers:'allow',locale:'ja-JP'}),page=await context.newPage();
   const errors=[],entry={scenario,errors};report.checks.push(entry);page.on('pageerror',e=>errors.push(e.message));
   try{
    await page.goto(url+'__reference_safety_setup__');
    const ordinary={'nushi-inugoya-v2':JSON.stringify({...seed(),x:74,y:39.5}),'nushi-inugoya-v2-slot2':JSON.stringify({...seed(),money:6789}),'nushi-inugoya-last-slot':'2'};
    await page.evaluate(values=>{for(const [key,value]of Object.entries(values))localStorage.setItem(key,value);},ordinary);
    if(scenario==='stale-save-module')await page.route('**/save-slots.js?*',route=>route.fulfill({status:200,contentType:'text/javascript',body:oldSave}));
    else{
     await page.evaluate(async fresh=>{await navigator.serviceWorker.register('./reference-safety-worker.js'+(fresh?'?fresh=1':''));await navigator.serviceWorker.ready;},scenario==='native-fresh-worker');
     await page.waitForFunction(()=>!!navigator.serviceWorker.controller);
    }
    for(const visit of ['initial','reload']){
     if(visit==='initial')await page.goto(url+'?villageReference=1&saveSlot=2&play=1',{waitUntil:'networkidle'});else await page.reload({waitUntil:'networkidle'});
     await page.locator('#villageReferenceLoadFailure').waitFor({state:'visible'});
     assert.match(await page.locator('#villageReferenceLoadFailure').textContent(),/保存データを守るため起動を止めました/);
     await page.keyboard.press('Enter');await page.locator('#titleContinue').dispatchEvent('click');await page.waitForTimeout(250);
     const actual=await page.evaluate(keys=>Object.fromEntries(keys.map(key=>[key,localStorage.getItem(key)])),Object.keys(ordinary));
     assert.deepEqual(actual,ordinary,'both ordinary slots and selection stay byte-identical');
     const state=await page.evaluate(()=>{let initialized=false;try{eval('saveSlots');initialized=true;}catch{}return {initialized,controller:!!navigator.serviceWorker.controller,oldSaveModule:ShuSaveSlots.preview!==true,preview1:localStorage.getItem('nushi-reference-village-pilot-v1-slot1'),preview2:localStorage.getItem('nushi-reference-village-pilot-v1-slot2'),notice:!!document.querySelector('#villageReferenceNotice')};});
     assert.equal(state.initialized,false);assert.equal(state.preview1,null);assert.equal(state.preview2,null);assert.equal(state.notice,false);assert.equal(state.oldSaveModule,scenario!=='native-fresh-worker');
     assert.equal(state.controller,scenario!=='stale-save-module');entry[visit]={...state,ordinaryBytesUnchanged:true};
     await page.screenshot({path:path.join(output,scenario+'-'+visit+'.png')});
    }
    assert.deepEqual(errors,[expectedError,expectedError]);entry.passed=true;
   }catch(error){entry.passed=false;entry.failure=error.stack;await page.screenshot({path:path.join(output,scenario+'-failure.png')}).catch(()=>{});throw error;}
   finally{await context.close();}
  }
  report.passed=true;
 }catch(error){report.passed=false;report.failure=error.stack;throw error;}
 finally{fs.writeFileSync(path.join(output,'report.json'),JSON.stringify(report,null,2)+'\n');await browser?.close();await new Promise(resolve=>host.close(resolve));}
}
module.exports={server,workerFixture};
if(require.main===module)run().catch(error=>{console.error(error);process.exitCode=1;});
