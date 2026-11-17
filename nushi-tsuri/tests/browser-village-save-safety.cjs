'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),{execFileSync}=require('node:child_process');
async function run(){
 assert.equal(process.env.CI,'true','GitHub CI only');assert.equal(process.env.GITHUB_ACTIONS,'true','GitHub Actions required');
 assert.equal(execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),process.env.EXPECTED_HEAD_SHA);
 // Test the actual generated production entry, not a rehearsal route.
 const {server,legacyFixture}=require('./browser-reference-village-evidence.cjs'),{chromium}=require('playwright');
 const host=server(),serveGame=host.listeners('request')[0];host.removeAllListeners('request');
 host.on('request',(req,res)=>{if(new URL(req.url,'http://localhost').pathname==='/nushi-tsuri/seed-only'){res.writeHead(200,{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store'});res.end('<!doctype html><title>Storage fixture (no game runtime)</title>');return;}serveGame(req,res);});
 await new Promise(r=>host.listen(0,'127.0.0.1',r));const base='http://127.0.0.1:'+host.address().port+'/nushi-tsuri';
 const out=path.join(__dirname,'artifacts/village-save-safety');fs.mkdirSync(out,{recursive:true});
 const report={head:process.env.EXPECTED_HEAD_SHA,physicalDevice:false,checks:[],errors:[]};let browser;
 try{
  browser=await chromium.launch({headless:true});const context=await browser.newContext({viewport:{width:844,height:390},isMobile:true,hasTouch:true});
  const first=await context.newPage();globalThis.diagnosticPages=[first];first.on('pageerror',e=>report.errors.push(e.message));
  await first.goto(base+'/seed-only');const raw=JSON.stringify(legacyFixture());
  await first.evaluate(raw=>{localStorage.clear();localStorage.setItem('nushi-inugoya-v2',raw);},raw);
  const url=base+'/index.html';await first.goto(url);
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
  // Actual production entry with isolated fixture storage; no runtime state is
  // fabricated after load. Character selection uses the existing title UI.
  for(const scenario of ['empty-slot2','existing-mountain-slot2']){
   const c=await browser.newContext({viewport:{width:844,height:390},isMobile:true,hasTouch:true});
   try{
    const p=await c.newPage();globalThis.diagnosticPages.push(p);p.on('pageerror',e=>report.errors.push(e.message));
    await p.goto(base+'/seed-only');
    const slot1Raw=scenario==='empty-slot2'?null:JSON.stringify({...legacyFixture(),money:3210});
    const mountain={...legacyFixture(),mapRegion:'mountainPond',x:120,y:128,direction:'up',money:6789,lakeStory:{introSeen:true,introPending:false}};
    const slot2Raw=scenario==='empty-slot2'?null:JSON.stringify(mountain);
    await p.evaluate(({slot1Raw,slot2Raw})=>{localStorage.clear();if(slot1Raw!==null)localStorage.setItem('nushi-inugoya-v2',slot1Raw);if(slot2Raw!==null)localStorage.setItem('nushi-inugoya-v2-slot2',slot2Raw);},{slot1Raw,slot2Raw});
    const slotURL=url+'?saveSlot=2';await p.goto(slotURL);await p.waitForFunction(()=>globalThis.ShuVillageReleaseGate?.started===true);
    const slot1Generation=await p.evaluate(()=>localStorage.getItem('nushi-production-reference-11016-v1-slot1'));
    const persistedFields=()=>({mapRegion:s.mapRegion,x:s.x,y:s.y,money:s.money,hp:s.hp,baits:s.baits,caught:s.caught,cookingIngredients:s.cookingIngredients,preparedMeals:s.preparedMeals,playerName:s.playerName,dog:s.dog});
    if(scenario==='existing-mountain-slot2'){
     // Compare original non-village coordinates and resources before starting.
     const migrated=await p.evaluate(()=>JSON.parse(ShuVillageProductionSession.read(2).raw));
     for(const key of ['mapRegion','x','y','money','hp','baits','caught','cookingIngredients','preparedMeals'])assert.deepEqual(migrated[key],mountain[key],key+' unchanged during migration');
    }else{
     assert.equal(await p.evaluate(()=>ShuVillageProductionSession.read(1).exists),false);
     assert.equal(await p.evaluate(()=>ShuVillageProductionSession.read(2).exists),false);
    }
    await require('./browser-start-adventure.cjs')(p,true,{slot:2,isNew:scenario==='empty-slot2',name:'検証の旅人',dog:'shuu'});
    if(await p.locator('#lakeIntroSkip').isVisible())await p.locator('#lakeIntroSkip').tap();
    assert.equal(await p.evaluate('gameStarted && activeSaveSlot===2'),true);
    if(scenario==='existing-mountain-slot2')assert.deepEqual(await p.evaluate('({mapRegion:s.mapRegion,x:s.x,y:s.y,money:s.money,hp:s.hp})'),{mapRegion:mountain.mapRegion,x:mountain.x,y:mountain.y,money:mountain.money,hp:mountain.hp});
    assert.equal(await p.evaluate(()=>save()),true);const beforeReload=await p.evaluate(persistedFields);
    await p.reload({waitUntil:'load'});await p.waitForFunction(()=>globalThis.ShuVillageReleaseGate?.started===true);
    await require('./browser-start-adventure.cjs')(p,true,{slot:2,isNew:false});assert.equal(await p.evaluate('gameStarted && activeSaveSlot===2'),true);
    assert.deepEqual(await p.evaluate(persistedFields),beforeReload);assert.equal(await p.evaluate(()=>save()),true);
    assert.deepEqual(await p.evaluate(()=>({one:localStorage.getItem('nushi-inugoya-v2'),two:localStorage.getItem('nushi-inugoya-v2-slot2')})),{one:slot1Raw,two:slot2Raw});
    assert.equal(await p.evaluate(()=>localStorage.getItem('nushi-production-reference-11016-v1-slot1')),slot1Generation);
    if(scenario==='empty-slot2')assert.equal(await p.evaluate(()=>ShuVillageProductionSession.read(1).exists),false);
    report.checks.push(scenario==='empty-slot2'?'actual production: create slot2 through title UI, save and reload; both legacy keys remain absent and slot1 remains empty':'actual production: existing slot2 mountainPond coordinates/resources survive migration, start, save and reload; slot1 generation and original legacy bytes untouched');
   }finally{await c.close();}
  }
  // A damaged inactive legacy slot must not suspend the healthy adventure.
  for(const healthy of [1,2,0]){
   const c=await browser.newContext({viewport:{width:844,height:390},isMobile:true,hasTouch:true});
   try{
    const p=await c.newPage();globalThis.diagnosticPages.push(p);p.on('pageerror',e=>report.errors.push(e.message));
    await p.goto(base+'/seed-only');
    const damaged='{"money":';const valid=JSON.stringify({...legacyFixture(),money:4321,lakeStory:{introSeen:true,introPending:false}});
    await p.evaluate(({healthy,damaged,valid})=>{localStorage.clear();for(const id of [1,2])localStorage.setItem(id===1?'nushi-inugoya-v2':'nushi-inugoya-v2-slot2',id===healthy?valid:damaged);},{healthy,damaged,valid});
    // Select the damaged slot initially, then choose the healthy slot in the title.
    await p.goto(url+'?saveSlot='+(healthy===1?2:1));await p.waitForFunction(()=>globalThis.ShuVillageReleaseGate?.started===true);
    assert.equal(await p.evaluate(()=>ShuVillageSaveRuntime.isSuspended()),false);
    for(const id of [1,2])assert.equal(await p.locator(`[data-save-slot="${id}"]`).isDisabled(),id!==healthy);
    await p.locator('#titleOptions').tap();
    for(const id of [1,2])assert.equal(await p.locator(`[data-delete-save="${id}"]`).isDisabled(),id!==healthy);
    await p.locator('#optionsClose').tap();
    if(healthy){
     await require('./browser-start-adventure.cjs')(p,true,{slot:healthy,isNew:false});
     assert.equal(await p.evaluate(()=>save()),true);
     await p.reload();await p.waitForFunction(()=>globalThis.ShuVillageReleaseGate?.started===true);
     await require('./browser-start-adventure.cjs')(p,true,{slot:healthy,isNew:false});
     assert.equal(await p.evaluate('s.money'),4321);assert.equal(await p.evaluate(()=>save()),true);
    }
    const stored=await p.evaluate(()=>[1,2].map(id=>({legacy:localStorage.getItem(id===1?'nushi-inugoya-v2':'nushi-inugoya-v2-slot2'),current:localStorage.getItem('nushi-production-reference-11016-v1-slot'+id)})));
    for(const id of [1,2]){assert.equal(stored[id-1].legacy,id===healthy?valid:damaged);if(id!==healthy)assert.equal(stored[id-1].current,null);}
    assert.equal(await p.evaluate(()=>ShuVillageSaveRuntime.isSuspended()),false);
    report.checks.push('corrupt legacy isolation: healthy slot '+healthy+'; title protects corrupt slots, healthy resume/save/reload, raw unchanged');
   }finally{await c.close();}
  }
  // Controlled encounter/animation fixtures, not a catch-rate test. Each has isolated storage.
  for(const activity of ['fight','care']){
   const c=await browser.newContext({viewport:{width:844,height:390},isMobile:true,hasTouch:true});
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
