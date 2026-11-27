'use strict';
// Rehearsal only. Opens a fresh browser context on a random loopback port.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),http=require('node:http');
const {createHash}=require('node:crypto'),vm=require('node:vm');
const root=path.resolve(__dirname,'..'),legacyRoot=path.join(root,'baseline/nushi-tsuri'),stageRoot=path.join(root,'stage');
const {legacyFixture}=require(path.join(legacyRoot,'tests/browser-reference-village-evidence.cjs'));
const {chromium}=require('playwright');
const stageManifest=vm.runInNewContext(fs.readFileSync(path.join(stageRoot,'release-252-91-manifest.js'),'utf8')+';self.STARFALL_STAGE',{self:{}});
const mime={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css','.json':'application/json','.png':'image/png','.webp':'image/webp','.jpg':'image/jpeg','.jpeg':'image/jpeg','.svg':'image/svg+xml','.mp3':'audio/mpeg','.wav':'audio/wav','.ogg':'audio/ogg'};
const digest=bytes=>createHash('sha256').update(bytes).digest('hex');
const mode=process.argv[2]||'success';
assert.ok(['success','baseline','corrupt','quota'].includes(mode));
const report={mode,physicalAndroid:false,milestones:[],failure:null};
let phase='baseline',touchedCorrupt=false,workerRequests=0;
const newImage=stageManifest.items.find(i=>!i.old && /shadow-repair\.png$/.test(i.url));
assert.ok(newImage);
const server=http.createServer((req,res)=>{
  const u=new URL(req.url,'http://127.0.0.1');
  const respond=(type,bytes)=>{res.writeHead(200,{'Content-Type':type,'Cache-Control':'no-store'});res.end(bytes);};
  if(u.pathname==='/nushi-tsuri/__fixture.html')return respond(mime['.html'],'<!doctype html><title>Disposable fixture only</title>');
  if(!u.pathname.startsWith('/nushi-tsuri/')) {res.writeHead(404);return res.end();}
  const name=decodeURIComponent(u.pathname.slice('/nushi-tsuri/'.length))||'index.html';
  if(name==='sw.js')workerRequests++;
  const staged=phase==='candidate'&&(name.startsWith('__stage-252-91/')||['sw.js','release-252-91-manifest.js'].includes(name));
  if(staged&&mode==='corrupt'&&name===newImage.stage.slice(2)){touchedCorrupt=true;return respond('image/png','intentionally broken rehearsal image');}
  const dir=staged?stageRoot:legacyRoot, file=path.resolve(dir,name);
  if(!file.startsWith(dir+path.sep)||!fs.existsSync(file)||!fs.statSync(file).isFile()){res.writeHead(404);return res.end();}
  res.writeHead(200,{'Content-Type':mime[path.extname(file)]||'application/octet-stream','Cache-Control':'no-store'});
  fs.createReadStream(file).pipe(res);
});
async function poll(check,label,ms=120000){const end=Date.now()+ms;while(Date.now()<end){try{if(await check())return;}catch(e){report.lastPollError=String(e);} await new Promise(r=>setTimeout(r,220));}throw Error('Timed out: '+label);}
async function run(){
  await new Promise(r=>server.listen(0,'127.0.0.1',r));
  const origin='http://127.0.0.1:'+server.address().port,base=origin+'/nushi-tsuri/',canonical=base+'index.html';
  let browser;
  try{
    browser=await chromium.launch({headless:true});
    const ctx=await browser.newContext({viewport:{width:844,height:390},hasTouch:true,isMobile:true,deviceScaleFactor:2});
    const setup=await ctx.newPage();
    await setup.goto(base+'__fixture.html');
    await setup.evaluate(async saves=>{
      localStorage.setItem('nushi-inugoya-v2',JSON.stringify(saves[0]));
      localStorage.setItem('nushi-inugoya-v2-slot2',JSON.stringify(saves[1]));
      if(!isSecureContext)throw Error('Not a secure context');
      await navigator.serviceWorker.register('./sw.js?v=252-85');
    },[{...legacyFixture(),money:4321},{...legacyFixture(),money:6789}]);
    await poll(()=>setup.evaluate(async()=>(await navigator.serviceWorker.getRegistration())?.active?.state==='activated'),'old worker activation');
    const old=await ctx.newPage(), oldResponse=await old.goto(canonical);
    const oldHash=digest(await oldResponse.body());
    assert.equal(oldHash,digest(fs.readFileSync(path.join(legacyRoot,'index.html'))));
    await old.waitForFunction(()=>Boolean(navigator.serviceWorker.controller&&globalThis.ShuVillageReleaseGate?.started),null,{timeout:45000});
    await setup.close();
    const snapshot=()=>Object.fromEntries(Object.keys(localStorage).filter(k=>/nushi-(production-reference|inugoya-v2)/.test(k)).sort().map(k=>[k,localStorage.getItem(k)]));
    const before=await old.evaluate(snapshot);
    assert.ok(Object.keys(before).some(k=>k.endsWith('-slot1')));
    assert.ok(Object.keys(before).some(k=>k.endsWith('-slot2')));
    report.milestones.push({oldHash,slots:2});
    if(mode==='quota'){
      const usage=await old.evaluate(async()=>(await navigator.storage.estimate()).usage);
      const client=await ctx.newCDPSession(old);
      await client.send('Storage.overrideQuotaForOrigin',{origin,quotaSize:usage+524288});
      report.milestones.push({quota:usage+524288,usage});
    }
    const success=mode==='success';
    if(mode!=='baseline'){
    await old.evaluate(async()=>{
      const reg=await navigator.serviceWorker.getRegistration();
      globalThis.__installStates=[];
      reg.addEventListener('updatefound',()=>{const w=reg.installing;if(w){__installStates.push(w.state);w.addEventListener('statechange',()=>__installStates.push(w.state));}});
    });
    phase='candidate';
    await old.evaluate(async()=>{try{await (await navigator.serviceWorker.getRegistration()).update();}catch(e){globalThis.__updateError=String(e);}});
    await poll(()=>old.evaluate(async({success})=>{
      const r=await navigator.serviceWorker.getRegistration();
      return success?r.waiting?.state==='installed':__installStates.includes('redundant');
    },{success}),success?'candidate waits':'candidate is rejected');
    assert.deepEqual(await old.evaluate(snapshot),before);
    const staged=await old.evaluate(async n=>await caches.has(n),stageManifest.current);
    assert.equal(staged,success);
    if(mode==='corrupt') assert.equal(touchedCorrupt,true);
    report.milestones.push({workerRequests,outcome:success?'waiting':'rejected'});
    if(success){
      await old.close();
      await poll(async()=>{
        for(const w of ctx.serviceWorkers()){
          // Old and new worker have the same script URL; inspect the candidate identity.
          const active=await Promise.race([w.evaluate(()=>!!self.STARFALL_STAGE&&self.registration.active?.state==='activated'&&!self.registration.waiting),new Promise(r=>setTimeout(()=>r(false),1000))]);
          if(active)return true;
        }
        return false;
      },'candidate activation with all old tabs closed',45000);
    }
    }
    if(!success){
      const oldState=await old.evaluate(async()=>{
        const r=await navigator.serviceWorker.getRegistration();
        return {active:r?.active?.state,controller:navigator.serviceWorker.controller?.scriptURL,waiting:r?.waiting?.state};
      });
      assert.equal(oldState.active,'activated');
      assert.ok(oldState.controller?.endsWith('/sw.js?v=252-85'));
      assert.equal(oldState.waiting,undefined);
      report.milestones.push({control:mode==='baseline',oldState});
      // Both versions enforce single-tab save ownership. To test a real
      // offline restart, release the old gameplay tab's lock first.
      await old.close();
      assert.equal(ctx.pages().length,0);
    }
    await ctx.setOffline(true);
    const want=success?stageManifest.items[0].digest:oldHash;
    for(const [slot,money] of [[1,4321],[2,6789]]){
      const p=await ctx.newPage(), response=await p.goto(canonical);
      assert.equal(digest(await response.body()),want);
      try{
        await p.waitForFunction(()=>Boolean(navigator.serviceWorker.controller&&globalThis.ShuVillageReleaseGate?.started),null,{timeout:45000});
      }catch(error){
        report.bootDiagnostic=await p.evaluate(async()=>({
          gate:document.querySelector('#villageSaveGate')?.textContent,
          controller:navigator.serviceWorker.controller?.scriptURL,
          locks:await navigator.locks.query(),
          missing:globalThis.ShuVillageReleaseCandidate?.failed
        })).catch(e=>({failure:String(e)}));
        console.error(JSON.stringify(report.bootDiagnostic));
        throw error;
      }
      if(slot===1)assert.deepEqual(await p.evaluate(snapshot),before);
      await p.locator('#titleContinue').click();
      await p.locator('[data-save-slot="'+slot+'"]').click();
      await p.locator('#titleResume').click();
      await p.waitForFunction(({slot,money})=>document.querySelector('#activeSaveSlot').textContent==='セーブ'+slot&&Number(document.querySelector('#money').textContent.replaceAll(',',''))===money,{slot,money});
      report.milestones.push({offlineHash:want,resumedSlot:slot,money});
      await p.close();
    }
    await ctx.close();
  } catch(e){report.failure=String(e);throw e;}
  finally{console.log(JSON.stringify(report));fs.writeFileSync(path.join(root,'browser-'+mode+'.json'),JSON.stringify(report,null,2));await browser?.close();await new Promise(r=>server.close(r));}
}
run().catch(e=>{console.error(e);process.exitCode=1;});
