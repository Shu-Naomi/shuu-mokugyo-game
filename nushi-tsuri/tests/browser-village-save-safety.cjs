'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),{execFileSync}=require('node:child_process');
async function run(){
 assert.equal(process.env.CI,'true','GitHub CI only');assert.equal(process.env.GITHUB_ACTIONS,'true','GitHub Actions required');
 assert.equal(execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),process.env.EXPECTED_HEAD_SHA);
 require('../tools/build-village-release-rehearsal.cjs')();
 const {server,legacyFixture}=require('./browser-reference-village-evidence.cjs'),{chromium}=require('playwright');
 const host=server();await new Promise(r=>host.listen(0,'127.0.0.1',r));const base='http://127.0.0.1:'+host.address().port+'/nushi-tsuri';
 const out=path.join(__dirname,'artifacts/village-save-safety');fs.mkdirSync(out,{recursive:true});
 const report={head:process.env.EXPECTED_HEAD_SHA,physicalDevice:false,checks:[],errors:[]};let browser;
 try{
  browser=await chromium.launch({headless:true});const context=await browser.newContext({viewport:{width:844,height:390},isMobile:true,hasTouch:true});
  await context.route('**/seed-only',route=>route.fulfill({contentType:'text/html',body:'<!doctype html><title>Storage fixture</title>'}));
  const first=await context.newPage();globalThis.diagnosticPages=[first];first.on('pageerror',e=>report.errors.push(e.message));
  await first.goto(base+'/seed-only');const raw=JSON.stringify(legacyFixture());
  await first.evaluate(raw=>{localStorage.clear();localStorage.setItem('nushi-inugoya-v2',raw);},raw);
  const url=base+'/village-release-rehearsal.html?villageReference=1';await first.goto(url);
  await first.waitForFunction(()=>globalThis.ShuVillageReleaseGate?.started===true);
  assert.equal(await first.evaluate(()=>localStorage.getItem('nushi-inugoya-v2')),raw);report.checks.push('lock acquired before runtime; source unchanged');
  const second=await context.newPage();globalThis.diagnosticPages.push(second);second.on('pageerror',e=>report.errors.push(e.message));await second.goto(url);await second.getByText(/another-tab-open/).waitFor();
  assert.equal(await second.evaluate(()=>!!globalThis.ShuVillageReleaseGate),false);report.checks.push('second real tab blocked before runtime');
  await require('./browser-start-adventure.cjs')(first,true);if(await first.locator('#lakeIntroSkip').isVisible())await first.locator('#lakeIntroSkip').tap();
  await first.screenshot({path:path.join(out,'running-phone-landscape.png')});
  const before=await first.evaluate(()=>{if(!save())throw Error('pre-conflict flush failed');return ShuVillageProductionSession.inspectRecovery(1);});
  const moveButton=first.locator('[data-move=right]');await moveButton.dispatchEvent('pointerdown',{pointerId:1});assert.equal(await first.evaluate('!!moveHoldInterval'),true);
  await second.evaluate(()=>localStorage.setItem('nushi-inugoya-v2','{"money":7654,"x":74,"y":39.5}'));
  await first.getByText(/別の旧版タブで保存が変わりました/).waitFor();
  await first.screenshot({path:path.join(out,'conflict-phone-landscape.png')});
  assert.equal(await first.evaluate(()=>ShuVillageSaveRuntime.isSuspended()),true);assert.equal(await first.evaluate('moveHoldInterval'),0);
  const frozen=await first.evaluate('JSON.stringify({x:s.x,y:s.y,minutes:s.gameMinutes})');await first.evaluate(()=>{window.dispatchEvent(new Event('focus'));document.dispatchEvent(new Event('visibilitychange'));});await first.waitForTimeout(1200);assert.equal(await first.evaluate('JSON.stringify({x:s.x,y:s.y,minutes:s.gameMinutes})'),frozen);report.checks.push('held movement is released and remains frozen after focus while conflict is visible');
  const pos=await first.evaluate('JSON.stringify({x:s.x,y:s.y})');await first.getByRole('button',{name:'新しい村の冒険を続ける'}).focus();await first.keyboard.press('ArrowRight');assert.equal(await first.evaluate('JSON.stringify({x:s.x,y:s.y})'),pos);report.checks.push('conflict-dialog keyboard does not move underlying player');
  const after=await first.evaluate(()=>ShuVillageProductionSession.inspectRecovery(1));assert.equal(after.currentRaw,before.currentRaw);report.checks.push('legacy change detected; current preserved');
  await second.close();await Promise.all([first.waitForNavigation({waitUntil:'load'}),first.getByRole('button',{name:'新しい村の冒険を続ける'}).tap()]);await first.waitForFunction(()=>globalThis.ShuVillageReleaseGate?.started===true);
  const recovered=await first.evaluate(()=>ShuVillageProductionSession.inspectRecovery(1));assert.equal(recovered.originalRaw,raw);assert.equal(recovered.currentRaw,before.currentRaw);assert.equal(JSON.parse(recovered.generationRaw).baselineRaw,after.legacyRaw);report.checks.push('explicit recovery restarts with original intact');
  await require('./browser-start-adventure.cjs')(first,true);assert.equal(await first.evaluate('gameStarted'),true);await first.clock.install({time:new Date('2026-11-15T08:00:00Z')});await first.clock.pauseAt(new Date('2026-11-15T08:00:00.100Z'));await first.evaluate('s.money=8765; scheduleSave()');assert.equal(await first.evaluate('!!saveTimer'),true);assert.notEqual(await first.evaluate(()=>JSON.parse(ShuVillageProductionSession.read(1).raw).money),8765);await first.goto(base+'/seed-only');const flushed=await first.evaluate(()=>JSON.parse(JSON.parse(localStorage.getItem('nushi-production-reference-11016-v1-slot1')).currentRaw).money);assert.equal(flushed,8765);report.checks.push('pagehide flushes pending save before releasing lock');await first.goto(url);await first.waitForFunction(()=>globalThis.ShuVillageReleaseGate?.started===true);report.checks.push('navigation releases lock and reopening reacquires');
  // Controlled encounter/animation fixtures, not a catch-rate test. Each has isolated storage.
  for(const activity of ['fight','care']){
   const c=await browser.newContext({viewport:{width:844,height:390},isMobile:true,hasTouch:true});
   await c.route('**/seed-only',route=>route.fulfill({contentType:'text/html',body:'<!doctype html><title>Legacy fixture</title>'}));
   const p=await c.newPage(),old=await c.newPage();globalThis.diagnosticPages.push(p,old);p.on('pageerror',e=>report.errors.push(e.message));
   await old.goto(base+'/seed-only');await old.evaluate(raw=>localStorage.setItem('nushi-inugoya-v2',raw),raw);
   await p.goto(url);await p.waitForFunction(()=>globalThis.ShuVillageReleaseGate?.started);await require('./browser-start-adventure.cjs')(p,true);if(await p.locator('#lakeIntroSkip').isVisible())await p.locator('#lakeIntroSkip').tap();
   await p.evaluate(activity=>{
    if(activity==='fight'){cast();beginFishing();battle.cast=50;launchSurfaceCast();settleSurfaceCast();startFight();if(battle?.phase!=='fight')throw Error('fight fixture not active');}
    else {openDogCare('shuu');petDogCare();if(dogCareScene.mode!=='pet')throw Error('care fixture not active');}
   },activity);
   const saved=await p.evaluate(()=>ShuVillageProductionSession.read(1).raw);
   await old.evaluate(()=>localStorage.setItem('nushi-inugoya-v2','{"money":7654,"x":74,"y":39.5}'));await p.getByText(/別の旧版タブで保存が変わりました/).waitFor();
   const inspect=()=>JSON.stringify({battle:battle&&{phase:battle.phase,x:battle.x,y:battle.y,retrieval:battle.retrieval,ten:battle.ten,pausedAt:battle.pausedAt},care:{mode:dogCareScene.mode,frame:dogCareScene.frame},position:[s.x,s.y],affinity:s.dogAffinity});
   const frozen=await p.evaluate(inspect);await p.evaluate(()=>{window.dispatchEvent(new Event('focus'));document.dispatchEvent(new Event('visibilitychange'));});await p.waitForTimeout(4100);assert.equal(await p.evaluate(inspect),frozen,activity+' must not advance under conflict overlay');
   assert.equal(await p.evaluate(()=>ShuVillageProductionSession.inspectRecovery(1).currentRaw),saved);report.checks.push(activity+' stays suspended across focus and elapsed time; current save unchanged');await c.close();
  }
  assert.deepEqual(report.errors,[]);report.status='passed';
 }catch(error){report.failure=String(error);for(const [i,p]of (globalThis.diagnosticPages||[]).entries())if(!p.isClosed()){report['page'+i]=await p.locator('body').innerText().catch(()=>'<unavailable>');await p.screenshot({path:path.join(out,'failure-'+i+'.png')}).catch(()=>{});}throw error;}finally{fs.writeFileSync(path.join(out,'report.json'),JSON.stringify(report,null,2));await browser?.close();await new Promise(r=>host.close(r));}
}
if(require.main===module)run().catch(e=>{console.error(e);process.exitCode=1;});module.exports=run;
