'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),{execFileSync}=require('node:child_process');
async function run(){
 assert.equal(process.env.GITHUB_ACTIONS,'true');assert.equal(process.env.CI,'true');assert.equal(execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),process.env.EXPECTED_HEAD_SHA);
 const root=path.resolve(__dirname,'..');
 // Exercise the committed/generated actual entry, never regenerate from output.
 assert.match(fs.readFileSync(path.join(root,'index.html'),'utf8'),/villageCandidateBootstrap/);
 const worker=fs.readFileSync(path.join(__dirname,'fixtures/prior-sw-252-65.js'),'utf8');assert.equal(require('node:crypto').createHash('sha256').update(worker).digest('hex'),'c0ac19a7931d9ef0cd23119daa95b49cf7d4ad76f139fc6ba49a912105e21ff1','exact prior production worker from 09025ae');
 const cacheName=/const CACHE_NAME = "([^"]+)"/.exec(worker)[1];
 fs.writeFileSync(path.join(root,'village-cache-seed.html'),'<!doctype html><title>Old version storage fixture</title>');
 const {server,legacyFixture}=require('./browser-reference-village-evidence.cjs'),{chromium}=require('playwright'),host=server();
 // Serve the real old script by its original URL. This also covers browser SW
 // update fetches, which Playwright request interception does not always route.
 const serveGame=host.listeners('request')[0];host.removeAllListeners('request');host.on('request',(req,res)=>{
  const u=new URL(req.url,'http://localhost');
  if(u.pathname==='/nushi-tsuri/sw.js'&&u.search==='?v=252-65'){res.writeHead(200,{'Content-Type':'text/javascript','Cache-Control':'no-store'});res.end(worker);return;}
  serveGame(req,res);
 });
 await new Promise(r=>host.listen(0,'127.0.0.1',r));
 const base='http://127.0.0.1:'+host.address().port+'/nushi-tsuri',out=path.join(__dirname,'artifacts/village-save-safety');fs.mkdirSync(out,{recursive:true});
 const report={head:process.env.EXPECTED_HEAD_SHA,workerBase:'09025ae58547709d99b0e604df9e789570da1858',physicalDevice:false,checks:[]};let browser;
 try{
  browser=await chromium.launch({headless:true});const context=await browser.newContext({viewport:{width:844,height:390},isMobile:true,hasTouch:true});
  const old=await context.newPage();await old.goto(base+'/village-cache-seed.html');
  const source={1:JSON.stringify(legacyFixture()),2:JSON.stringify({...legacyFixture(),money:6789})};
  await old.evaluate(async source=>{localStorage.setItem('nushi-inugoya-v2',source[1]);localStorage.setItem('nushi-inugoya-v2-slot2',source[2]);await navigator.serviceWorker.register('./sw.js?v=252-65');await navigator.serviceWorker.ready;},source);
  await old.waitForFunction(()=>navigator.serviceWorker.controller?.scriptURL.endsWith('/sw.js?v=252-65'),{},{timeout:120000});
  const url=base+'/index.html';let p=await context.newPage();await p.goto(url);await p.waitForFunction(()=>globalThis.ShuVillageReleaseGate?.started,{},{timeout:45000});
  assert.ok(await p.evaluate(()=>navigator.serviceWorker.controller?.scriptURL.endsWith('/sw.js?v=252-65')));
  await old.waitForFunction(async()=>{const r=await navigator.serviceWorker.getRegistration();return r?.waiting?.scriptURL.endsWith('/sw.js?v=252-66')&&r.waiting.state==='installed';},{},{timeout:120000});
  assert.ok(await old.evaluate(()=>navigator.serviceWorker.controller?.scriptURL.endsWith('/sw.js?v=252-65')));
  const manifest=await p.evaluate(()=>({urls:ShuVillageReleaseCandidate.expectedUrls,mapURL:ShuVillageReleaseCandidate.mapURL}));
  const saves=()=>Object.fromEntries(Object.keys(localStorage).filter(k=>/nushi-(production-reference|inugoya-v2)/.test(k)).sort().map(k=>[k,localStorage.getItem(k)]));
  const initial=await old.evaluate(saves);assert.equal(initial['nushi-inugoya-v2'],source[1]);assert.equal(initial['nushi-inugoya-v2-slot2'],source[2]);
  assert.ok(initial['nushi-production-reference-11016-v1-slot1']);assert.ok(initial['nushi-production-reference-11016-v1-slot2']);
  report.checks.push('actual query-free index verifies and migrates both slots; old controller retained while new worker waits without claiming clients');await p.close();
  await context.setOffline(true);p=await context.newPage();await p.goto(url);await p.waitForFunction(()=>globalThis.ShuVillageReleaseGate?.started,{},{timeout:45000});assert.deepEqual(await old.evaluate(saves),initial);
  assert.ok(await p.evaluate(()=>navigator.serviceWorker.controller?.scriptURL.endsWith('/sw.js?v=252-65')));
  report.checks.push('ordinary index reopens offline under prior worker without altering source or generation records');await p.close();await context.setOffline(false);
  const scriptURL=manifest.urls.find(u=>new URL(u).pathname.endsWith('/village-save-store.js')),gateURL=manifest.urls.find(u=>new URL(u).pathname.endsWith('/village-release-gate.js'));assert.ok(scriptURL);assert.ok(gateURL);
  for(const [label,target,content,reason]of [['mixed script',scriptURL,'window.unverifiedScriptExecuted=true;','release-dependency-mismatch'],['mixed gate',gateURL,'window.unverifiedScriptExecuted=true;','起動を止めました'],['mixed map',manifest.mapURL,'wrong-map','release-map-mismatch']]){
   // Preserve and restore the exact response, including binary map bytes/headers.
   await old.evaluate(async({cacheName,target,content})=>{const c=await caches.open(cacheName),original=await c.match(target);if(!original)throw Error('Expected warmed resource absent');await c.put(target+'&fixture-backup=1',original);await c.put(target,new Response(content,{status:200,headers:{'Content-Type':target.includes('.js')?'text/javascript':'image/png'}}));},{cacheName,target,content});
   try{
    p=await context.newPage();await p.goto(url);await p.getByText(new RegExp(reason)).waitFor({timeout:45000});assert.equal(await p.evaluate(()=>!!globalThis.ShuVillageReleaseGate?.started),false);assert.equal(await p.evaluate(()=>!!globalThis.unverifiedScriptExecuted),false);assert.deepEqual(await old.evaluate(saves),initial);
    report.checks.push(label+' rejected before runtime/import; source and generation records untouched');
   }finally{
    await p?.close();await old.evaluate(async({cacheName,target})=>{const c=await caches.open(cacheName),original=await c.match(target+'&fixture-backup=1');if(!original)throw Error('Restore response absent');await c.put(target,original);await c.delete(target+'&fixture-backup=1');},{cacheName,target});
   }
  }
  const nextWorker=context.serviceWorkers().find(w=>w.url().endsWith('/sw.js?v=252-66'));assert.ok(nextWorker,'waiting new worker is inspectable');
  await old.close();
  // No page may hold the old controller while waiting for normal activation.
  await nextWorker.evaluate(async()=>{const deadline=Date.now()+45000;while(!self.registration.active?.scriptURL.endsWith('/sw.js?v=252-66')||self.registration.active.state!=='activated'){if(Date.now()>deadline)throw Error('New worker did not naturally activate');await new Promise(r=>setTimeout(r,100));}});
  await context.setOffline(true);p=await context.newPage();await p.goto(url);await p.waitForFunction(()=>globalThis.ShuVillageReleaseGate?.started,{},{timeout:45000});
  assert.ok(await p.evaluate(()=>navigator.serviceWorker.controller?.scriptURL.endsWith('/sw.js?v=252-66')));assert.deepEqual(await p.evaluate(saves),initial);
  assert.ok((await p.evaluate(()=>caches.keys())).includes(cacheName));
  report.checks.push('after old clients close, new worker naturally activates and actual index starts offline with saves intact and old cache retained');
  report.status='passed';
 }catch(e){report.status='failed';report.failure=String(e);throw e;}finally{fs.writeFileSync(path.join(out,'cache-report.json'),JSON.stringify(report,null,2));await browser?.close();await new Promise(r=>host.close(r));}
}
if(require.main===module)run().catch(e=>{console.error(e);process.exitCode=1;});module.exports=run;
