'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),{execFileSync}=require('node:child_process');
async function run(){
 assert.equal(process.env.GITHUB_ACTIONS,'true');assert.equal(process.env.CI,'true');assert.equal(execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),process.env.EXPECTED_HEAD_SHA);
 const root=path.resolve(__dirname,'..');require('../tools/build-village-production-candidate.cjs')();
 const worker=fs.readFileSync(path.join(root,'sw.js'),'utf8');assert.equal(require('node:crypto').createHash('sha256').update(worker).digest('hex'),'de4111ad4f201e3fa6698127a267b06ab7c63ceaad7ceceaab0a86465da432dc','test uses exact prior production worker from 83e602e');
 const cacheName=/const CACHE_NAME = "([^"]+)"/.exec(worker)[1];
 fs.writeFileSync(path.join(root,'village-cache-seed.html'),'<!doctype html><title>Old version storage fixture</title>');
 const {server,legacyFixture}=require('./browser-reference-village-evidence.cjs'),{chromium}=require('playwright'),host=server();await new Promise(r=>host.listen(0,'127.0.0.1',r));
 const base='http://127.0.0.1:'+host.address().port+'/nushi-tsuri',out=path.join(__dirname,'artifacts/village-save-safety');fs.mkdirSync(out,{recursive:true});
 const report={head:process.env.EXPECTED_HEAD_SHA,workerBase:'83e602e',physicalDevice:false,checks:[]};let browser;
 try{
  browser=await chromium.launch({headless:true});const context=await browser.newContext({viewport:{width:844,height:390},isMobile:true,hasTouch:true}),old=await context.newPage();await old.goto(base+'/village-cache-seed.html');
  const source={1:JSON.stringify(legacyFixture()),2:JSON.stringify({...legacyFixture(),money:6789})};
  await old.evaluate(async source=>{localStorage.setItem('nushi-inugoya-v2',source[1]);localStorage.setItem('nushi-inugoya-v2-slot2',source[2]);await navigator.serviceWorker.register('./sw.js?v=252-64');await navigator.serviceWorker.ready;},source);await old.waitForFunction(()=>!!navigator.serviceWorker.controller,{},{timeout:120000});
  const url=base+'/village-production-candidate.html?villageReference=1';let p=await context.newPage();await p.goto(url);await p.waitForFunction(()=>globalThis.ShuVillageReleaseGate?.started,{},{timeout:45000});assert.ok(await p.evaluate(()=>!!navigator.serviceWorker.controller));
  const manifest=await p.evaluate(()=>({urls:ShuVillageReleaseCandidate.expectedUrls,mapURL:ShuVillageReleaseCandidate.mapURL}));
  const saves=()=>Object.fromEntries(Object.keys(localStorage).filter(k=>/nushi-(production-reference|inugoya-v2)/.test(k)).sort().map(k=>[k,localStorage.getItem(k)]));
  const initial=await old.evaluate(saves);assert.equal(initial['nushi-inugoya-v2'],source[1]);assert.equal(initial['nushi-inugoya-v2-slot2'],source[2]);report.checks.push('prior production worker controls candidate; both legacy slots preserved and migration starts only after verified content');await p.close();
  await context.setOffline(true);p=await context.newPage();await p.goto(base+'/index.html');await p.waitForFunction(()=>globalThis.ShuVillageReleaseGate?.started,{},{timeout:45000});assert.deepEqual(await old.evaluate(saves),initial);report.checks.push('prior worker navigation fallback opens candidate at ordinary index URL offline without altering either save');await p.close();await context.setOffline(false);
  const scriptURL=manifest.urls.find(u=>new URL(u).pathname.endsWith('/village-save-store.js'));assert.ok(scriptURL);const gateURL=manifest.urls.find(u=>new URL(u).pathname.endsWith('/village-release-gate.js'));assert.ok(gateURL);
  for(const [label,target,content,reason]of [['mixed script',scriptURL,'window.unverifiedScriptExecuted=true;','release-dependency-mismatch'],['mixed gate',gateURL,'window.unverifiedScriptExecuted=true;','起動を止めました'],['mixed map',manifest.mapURL,'wrong-map','release-map-mismatch']]){
   await old.evaluate(async({cacheName,target,content})=>{const cache=await caches.open(cacheName);await cache.put(target,new Response(content,{status:200,headers:{'Content-Type':target.includes('.js')?'text/javascript':'image/png'}}));},{cacheName,target,content});
   p=await context.newPage();await p.goto(url);await p.getByText(new RegExp(reason)).waitFor({timeout:45000});assert.equal(await p.evaluate(()=>!!globalThis.ShuVillageReleaseGate?.started),false);assert.equal(await p.evaluate(()=>!!globalThis.unverifiedScriptExecuted),false);assert.deepEqual(await old.evaluate(saves),initial);report.checks.push(label+' rejected before runtime/save import; source and generation records untouched');await p.close();
   if(label==='mixed script'||label==='mixed gate')await old.evaluate(async({cacheName,target,content})=>{await(await caches.open(cacheName)).put(target,new Response(content,{headers:{'Content-Type':'text/javascript'}}));},{cacheName,target,content:fs.readFileSync(path.join(root,label==='mixed gate'?'village-release-gate.js':'village-save-store.js'),'utf8')});
  }
  assert.ok((await old.evaluate(()=>caches.keys())).includes(cacheName));report.checks.push('old worker registration and cache retained; no forced cache deletion');report.status='passed';
 }catch(e){report.status='failed';report.failure=String(e);throw e;}finally{fs.writeFileSync(path.join(out,'cache-report.json'),JSON.stringify(report,null,2));await browser?.close();await new Promise(r=>host.close(r));}
}
if(require.main===module)run().catch(e=>{console.error(e);process.exitCode=1;});module.exports=run;
