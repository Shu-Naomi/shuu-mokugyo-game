'use strict';
// CI-only runner: no public deployment URL, no local-browser fallback.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),http=require('node:http'),{execFileSync}=require('node:child_process');

const {seed,saveKey}=require('./game-harness.cjs');
const RESOURCE_EXPRESSION='({money:s.money,hp:s.hp,maxHp:s.maxHp,time:s.gameMinutes,baits:s.baits,caught:s.caught,items:s.items,ingredients:s.cookingIngredients,meals:s.preparedMeals,ownedRods:s.ownedRods,rodCopies:s.rodCopies,rodParts:s.rodParts,equipment:s.equipment,lures:s.lures,dog:s.dog,dogAffinity:s.dogAffinity,dogFollowing:s.dogFollowing,dogTreats:s.dogTreats,dogToys:s.dogToys,pet:s.petLife,quests:s.questCompletions,memories:s.catchMemories,records:s.fishCatchRecords,mode:s.fightMode})';
const STORED_MUTATION_SEED='00000000000000000000000000000327';
function legacyFixture(){
 // This is an existing save with an existing mutation identity, not a new
 // aquarium requiring a fresh crypto seed independently in each context.
 const state={...seed(),mapRegion:'village',x:74,y:39.5,soundEnabled:false,
  petLife:{version:require('../aquarium-mutations.js').VERSION,mutationSeed:STORED_MUTATION_SEED}};
 require('../pet-life.js').normalize(state,[],['shuu'],Math.floor(state.gameMinutes/1440),{legacy:true,deferSync:true});
 assert.equal(state.petLife.mutationSeed,STORED_MUTATION_SEED);
 return state;
}
const ROOT=path.resolve(__dirname,'..'),FROZEN='9e3891d1b4eae8a35856611f74d1d5cb10535700';
// Runtime blob identities are stable even when Git-data recreates commit metadata.
const RUNTIME_TREE_SHA256='5912c96640d7d843195a2ffad3555f9badaa29af60156ed43f72dac2a6037124';
function runtimeTreeDigest(ref='HEAD'){
 const tree=execFileSync('git',['ls-tree','-r',ref,'nushi-tsuri'],{cwd:path.dirname(ROOT),encoding:'utf8'});
 const runtime=tree.split('\n').filter(line=>line&&!/\tnushi-tsuri\/(?:tests|docs)\//.test(line)).join('\n')+'\n';
 return require('node:crypto').createHash('sha256').update(runtime).digest('hex');
}
const width=Number(process.env.WIDTH||1280),height=Number(process.env.HEIGHT||720),mobile=process.env.TOUCH==='1',dpr=Number(process.env.DPR||1);
const out=path.join(__dirname,'browser-evidence-reference-village',`${width}x${height}-dpr${dpr}`);
const report={status:'running',head:null,frozen:FROZEN,viewport:{width,height},mobileEmulation:mobile,dpr,physicalDevice:false,uiWalkSteps:0,uiVisits:[],injectedFixtures:[],errors:[],httpErrors:[],requestErrors:[],screens:[]};
const mime={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.png':'image/png','.webp':'image/webp','.svg':'image/svg+xml','.mp3':'audio/mpeg','.wav':'audio/wav'};
function server(){return http.createServer((req,res)=>{try{const name=decodeURIComponent(new URL(req.url,'http://localhost').pathname).replace(/^\/nushi-tsuri\//,'')||'index.html',file=path.resolve(ROOT,name);if(!file.startsWith(ROOT+path.sep)||!fs.statSync(file).isFile())throw Error('path');res.writeHead(200,{'Content-Type':mime[path.extname(file)]||'application/octet-stream','Cache-Control':'no-store'});fs.createReadStream(file).pipe(res);}catch{res.writeHead(404);res.end();}});}
function planVillageRoute(predicate){
   const goal=eval('('+predicate+')'),start={x:s.x,y:s.y,d:s.direction,parent:-1,move:null},q=[start],seen=new Set();
   const key=p=>p.x.toFixed(6)+','+p.y.toFixed(6)+','+p.d;seen.add(key(start));
   const moves=new Map(),ground=new Map();
   const walkable=(x,y)=>{const k=x.toFixed(8)+','+y.toFixed(8);if(!ground.has(k))ground.set(k,isWalkableWorld(x,y));return ground.get(k);};
   for(let i=0;i<q.length&&i<160000;i++){
    const p=q[i];if(goal(p.x,p.y,p.d)){const result=[];for(let j=i;q[j].parent>=0;j=q[j].parent)result.push(q[j].move);return result.reverse();}
    for(const d of ['up','right','down','left']){
     if(d==='left'&&isAtPlayerHomeMapEntrance(p.x,p.y)||
        d==='right'&&ShuRural.atVillageGate(p.x,p.y)||
        d==='up'&&p.y<=6&&ShuMountain.atVillageGate(p.x,p.y))continue;
     const moveKey=key({...p,d});
     if(!moves.has(moveKey)){
      const next=ShuWorldLife.moveTarget(p.x,p.y,d,4,walkable);
      moves.set(moveKey,{next,safe:isWalkableWorldSegment(p.x,p.y,next.x,next.y)});
     }
     const cached=moves.get(moveKey),n={...cached.next,d,parent:i,move:d},k=key(n);
     // The real move target handles blocked turns and final one-unit approaches.
     if(!seen.has(k)&&!isAtPlayerHomeMapEntrance(n.x,n.y)&&cached.safe){seen.add(k);q.push(n);}
    }
   }throw Error('No actual-control route: '+predicate+'; states='+q.length+'; start='+JSON.stringify(start));

}
function dinerLayersReady(){
 const base=document.querySelector('#locationPixels'),front=document.querySelector('.scenery-foreground[data-for="locationPixels"]'),motion=document.querySelector('.scenery-motion[data-for="locationPixels"]');
 return !!(document.querySelector('#locationInterior.open')&&base&&front&&motion&&base.style.backgroundImage==='none'&&motion.dataset.scene==='room-diner'&&base.width>0&&base.height>0&&front.width===base.width&&front.height===base.height);
}
async function dinerVisualMetrics(){
 const bounds=n=>{const r=n.getBoundingClientRect(),style=getComputedStyle(n);return {left:r.left,top:r.top,right:r.right,bottom:r.bottom,width:r.width,height:r.height,zIndex:style.zIndex,position:style.position,overflow:style.overflow,objectFit:style.objectFit,transform:style.transform};};
 const base=document.querySelector('#locationPixels'),front=document.querySelector('.scenery-foreground[data-for="locationPixels"]'),motion=document.querySelector('.scenery-motion[data-for="locationPixels"]'),dialogue=document.querySelector('#locationDialogue');
 async function pixels(canvas){
  const data=canvas.getContext('2d').getImageData(0,0,canvas.width,canvas.height).data;
  const digest=await crypto.subtle.digest('SHA-256',data);let opaque=0;for(let i=3;i<data.length;i+=4)if(data[i])opaque++;
  return {sha256:Array.from(new Uint8Array(digest),b=>b.toString(16).padStart(2,'0')).join(''),nonTransparentPixels:opaque,width:canvas.width,height:canvas.height};
 }
 const b=bounds(base),f=bounds(front),d=bounds(dialogue);
 return {ready:base.style.backgroundImage==='none'&&motion.dataset.scene==='room-diner'&&front.width===base.width&&front.height===base.height,category:locationCategory,reference:ShuVillageReference.enabled,environment:gameSceneryEnvironment(),base:{...b,...await pixels(base),backgroundImage:base.style.backgroundImage},foreground:{...f,...await pixels(front)},motion:{...bounds(motion),scene:motion.dataset.scene,width:motion.width,height:motion.height},dialogue:{...d,text:dialogue.textContent},scene:bounds(document.querySelector('.location-scene')),panel:bounds(document.querySelector('.location-panel')),foregroundOverlapsDialogueRect:f.left<d.right&&f.right>d.left&&f.top<d.bottom&&f.bottom>d.top};
}
function compareDinerDiagnostics(normal,reference){
 const rect=a=>Object.fromEntries(['left','top','right','bottom','width','height','zIndex','position','overflow','objectFit','transform'].map(k=>[k,a[k]]));
 return {bothLayersReady:normal.ready&&reference.ready,sameCategory:normal.category===reference.category,sameEnvironment:JSON.stringify(normal.environment)===JSON.stringify(reference.environment),sameBasePixels:normal.base.sha256===reference.base.sha256,sameForegroundPixels:normal.foreground.sha256===reference.foreground.sha256,sameBaseBoundsAndStyle:JSON.stringify(rect(normal.base))===JSON.stringify(rect(reference.base)),sameForegroundBoundsAndStyle:JSON.stringify(rect(normal.foreground))===JSON.stringify(rect(reference.foreground)),sameDialogueBoundsAndStyle:JSON.stringify(rect(normal.dialogue))===JSON.stringify(rect(reference.dialogue)),sameDialogueText:normal.dialogue.text===reference.dialogue.text,normalForegroundOverlapsDialogueRect:normal.foregroundOverlapsDialogueRect,referenceForegroundOverlapsDialogueRect:reference.foregroundOverlapsDialogueRect,interpretation:'Diagnostic only: matching or differing ready-state pixels and bounds must be reviewed alongside screenshots; this does not by itself establish regression origin.'};
}
async function run(){
 assert.equal(process.env.CI,'true','This runner is authorized for GitHub CI only, not local browser launch');
 report.head=execFileSync('git',['rev-parse','HEAD'],{cwd:ROOT,encoding:'utf8'}).trim();
 assert.ok(process.env.EXPECTED_HEAD_SHA,'CI must declare the exact PR head');assert.equal(report.head,process.env.EXPECTED_HEAD_SHA);
 report.runtimeTreeSha256=runtimeTreeDigest();
 assert.equal(report.runtimeTreeSha256,RUNTIME_TREE_SHA256,'frozen runtime blob manifest');
 fs.mkdirSync(out,{recursive:true});const host=server();let browser,context,page;
 const raw=JSON.stringify(legacyFixture());
 const evaluate=expression=>page.evaluate(expression=>JSON.parse(JSON.stringify(eval(expression))),expression);
 const press=selector=>page.locator(selector)[mobile?'tap':'click']();
 const advance=async(ms=100)=>{await page.clock.runFor(ms);};
 const screenshot=async(name)=>{await page.waitForTimeout(700);const file=name+'.png';await page.screenshot({path:path.join(out,file)});report.screens.push(file);};
 const state=()=>evaluate('({x:s.x,y:s.y,direction:s.direction,mapRegion:s.mapRegion})');
 const resources=()=>evaluate(RESOURCE_EXPRESSION);
 async function boot(url){await page.clock.install({time:new Date('2026-11-09T03:00:00Z')});await page.clock.pauseAt('2026-11-09T03:00:01Z');await page.goto(url,{waitUntil:'domcontentloaded',timeout:90000});await require('./browser-start-adventure.cjs')(page,mobile);await advance(240);if(await page.locator('#lakeIntroSkip').isVisible()){await press('#lakeIntroSkip');await advance(240);}for(let attempt=0;attempt<150;attempt++){if(await page.evaluate(()=>{const c=document.querySelector('#worldPixels');return c.style.backgroundImage==='none'&&c.width===1672&&c.height===941;}))break;if(attempt===149)throw Error('Native scenery did not become ready');await advance(100);await page.waitForTimeout(100);}await page.evaluate(()=>{Math.random=()=>.999999;});}
 async function diagnoseDiner(mode){
  for(let attempt=0;attempt<200;attempt++){
   if(await page.evaluate(dinerLayersReady))break;
   if(attempt===199)throw Error(mode+' diner scenery never reached rendered split-layer state');
   await advance(100);await page.waitForTimeout(100);
  }
  await advance(700);await page.waitForTimeout(700);
  const metrics=await page.evaluate(dinerVisualMetrics);
  assert.equal(metrics.ready,true);assert.equal(metrics.category,'food','same-condition diner diagnostic uses food tab');
  report.dinerDiagnostics??={};report.dinerDiagnostics[mode]=metrics;
  await screenshot(mode+'-diner-food-ready');
  if(report.dinerDiagnostics.normal&&report.dinerDiagnostics.reference)report.dinerDiagnostics.comparison=compareDinerDiagnostics(report.dinerDiagnostics.normal,report.dinerDiagnostics.reference);
 }
 async function originalUnchanged(){assert.equal(await page.evaluate(key=>localStorage.getItem(key),saveKey),raw,'normal save bytes unchanged');}
 async function walk(label,predicate){
  const route=await page.evaluate(planVillageRoute,predicate);
  for(const direction of route){
   const expected=await page.evaluate(d=>ShuWorldLife.moveTarget(s.x,s.y,d,4,isWalkableWorld),direction);
   await press(`[data-move="${direction}"]`);await advance(50);const actual=await state();
   assert.equal(actual.mapRegion,'village',label+' stays in village during directional route');
   assert.equal(await evaluate('playerHomeIsActive()'),false,label+' does not auto-enter home');
   assert.ok(Math.abs(actual.x-expected.x)<1e-7&&Math.abs(actual.y-expected.y)<1e-7,`${label}: real control matches collision target`);report.uiWalkSteps++;
  }
  await advance(700);await page.waitForTimeout(700);report.uiVisits.push({label,method:mobile?'touch-emulated directional controls':'clicked directional controls',steps:route.length,...await state()});
  assert.equal(await page.evaluate(predicate=>eval('('+predicate+')')(s.x,s.y,s.direction),predicate),true,label+' real predicate');
  const feet=await page.evaluate(()=>{const p=document.querySelector('#player').getBoundingClientRect(),m=document.querySelector('#map').getBoundingClientRect();return {dx:Math.abs(p.x+p.width/2-(m.x+m.width*s.x/240)),dy:Math.abs(p.bottom-(m.y+m.height*s.y/135)),walkable:isWalkableWorld(s.x,s.y)};});
  assert.ok(feet.walkable&&feet.dx<1.5&&feet.dy<1.5,label+' visible feet agree with world '+JSON.stringify(feet));
 }
 async function closeModal(id){const selector=id==='petLifeModal'?'#petLifeModal [data-pet-action="close"]':id==='offshoreFerry'?'#offshoreFerryCancel':`#${id} [data-close]`;await press(selector);await advance(100);await page.locator('#'+id+'.open').waitFor({state:'hidden'});}
 async function fixture(label,script){await page.evaluate(script=>eval(script),script);await advance(400);report.injectedFixtures.push({label,method:'explicit state injection, not UI walking',...await state()});}
 try{
  await new Promise(resolve=>host.listen(0,'127.0.0.1',resolve));const url=`http://127.0.0.1:${host.address().port}/nushi-tsuri/`;
  const {chromium}=require('playwright');
  browser=await chromium.launch({headless:true});
  const makeContext=async()=>{const c=await browser.newContext({viewport:{width,height},isMobile:mobile,hasTouch:mobile,deviceScaleFactor:dpr,locale:'ja-JP',serviceWorkers:'block'});await c.addInitScript(({raw,key})=>{Math.random=()=>.999999;if(!localStorage.getItem(key))localStorage.setItem(key,raw);localStorage.setItem('nushi-inugoya-options-v1',JSON.stringify({textSpeed:'instant'}));},{raw,key:saveKey});return c;};
  const observe=(page,stage)=>{
   page.on('pageerror',error=>report.errors.push({stage,message:error.message}));
   page.on('response',response=>{const resource=new URL(response.url());if(resource.origin===new URL(url).origin&&resource.pathname!=='/favicon.ico'&&response.status()>=400)report.httpErrors.push({stage,status:response.status(),path:resource.pathname});});
   page.on('requestfailed',request=>{const resource=new URL(request.url());if(resource.origin===new URL(url).origin&&resource.pathname!=='/favicon.ico')report.requestErrors.push({stage,path:resource.pathname,error:request.failure()?.errorText});});
  };
  context=await makeContext();page=await context.newPage();observe(page,'normal');await boot(url);
  assert.equal(await evaluate('ShuVillageReference.enabled'),false);assert.equal(await evaluate("ShuSceneLayers.get('world').source"),'assets/village-world-v252-55-riao-clear.png');const normalResources=await resources();await screenshot('normal-no-flag');
  await page.evaluate(()=>openLocationInterior('diner'));report.injectedFixtures.push({label:'normal-mode same-condition diner diagnostic',method:'explicit openLocationInterior(diner), not UI walking'});
  await diagnoseDiner('normal');await closeModal('locationInterior');assert.deepEqual(await resources(),normalResources,'normal diner diagnostic preserves economy');
  await page.waitForLoadState('networkidle');await context.close();
  context=await makeContext();page=await context.newPage();
  observe(page,'reference');
  await boot(url+'?villageReference=1');assert.equal(await evaluate('ShuVillageReference.enabled'),true);assert.equal(await evaluate("ShuSceneLayers.get('world').source"),'assets/village-reference-pilot.png');assert.deepEqual(await resources(),normalResources);assert.equal(await evaluate('s.referenceVillageLayout'),'source-11016-1');
  assert.notDeepEqual([...(Object.values(await state()).slice(0,2))],[74,39.5]);await originalUnchanged();await screenshot('imported-save-rescue');
  assert.equal(await evaluate('s.petLife.mutationSeed'),STORED_MUTATION_SEED);
  report.importRescue={method:'real title continue imports seeded legacy save',progressMatchesNormal:true,normalBytesUnchanged:true};
  const controls=await page.evaluate(()=>['#action',...['up','right','down','left'].map(d=>'[data-move="'+d+'"]')].map(q=>{const b=document.querySelector(q),r=b.getBoundingClientRect(),hit=document.elementFromPoint(r.x+r.width/2,r.y+r.height/2);return {q,width:r.width,height:r.height,inside:r.left>=0&&r.top>=0&&r.right<=innerWidth+1&&r.bottom<=innerHeight+1,unblocked:hit===b||b.contains(hit)};}));
  assert.ok(controls.every(c=>c.width>=44&&c.height>=44&&c.inside&&c.unblocked),JSON.stringify(controls));report.controls=controls;
  const bannerLayout=await page.evaluate(()=>{
   const banner=document.querySelector('#villageReferenceNotice'),r=banner.getBoundingClientRect();
   const overlaps=[...document.querySelectorAll('.hud,.controls button')].filter(n=>n.getClientRects().length).filter(n=>{const b=n.getBoundingClientRect();return r.left<b.right&&r.right>b.left&&r.top<b.bottom&&r.bottom>b.top;}).map(n=>n.id||n.className);
   return {left:r.left,right:r.right,top:r.top,bottom:r.bottom,width:r.width,height:r.height,fontSize:parseFloat(getComputedStyle(banner).fontSize),inside:r.left>=0&&r.right<=innerWidth&&r.top>=0&&r.bottom<=innerHeight,overlaps};
  });
  assert.ok(bannerLayout.inside&&bannerLayout.fontSize>=10&&bannerLayout.width>0,'prototype notice readable inside viewport');
  assert.deepEqual(bannerLayout.overlaps,[],'prototype notice cannot cover HUD or D-pad/A/B controls');report.bannerLayout=bannerLayout;

  await page.evaluate(()=>{ensureForageCycle();s.forageCycle.active=Object.fromEntries(foragePointData.map(p=>[p.id,'worm']));s.forageCycle.harvested=[];});report.injectedFixtures.push({label:'all forage active to challenge facility precedence',method:'spawn fixture only; subsequent movement/A are real UI'});
  const facilities=[['farmhouse','locationInterior'],['west-shrine',null],['yaoya','locationInterior'],['diner','locationInterior'],['main-shrine','locationInterior'],['sam-shop','store'],['fish-market','locationInterior'],['harbor-shop','vehicleShop'],['watermill','petLifeModal'],['riao-tcg-shop',null],['quest-board','questBoard']];
  for(const [id,modal]of facilities){
   const facility=id==='sam-shop'?'isAtSamShopEntrance(x,y)':`nearbyWorldLandmark(x,y,d)?.id===${JSON.stringify(id)}`;
   // Match the real dispatcher, not merely a broad overlapping entrance box.
   const predicate=`(x,y,d)=>{const old=[s.x,s.y,s.direction];s.x=x;s.y=y;s.direction=d;const ok=(${facility})&&!ShuOffshore.atPier(s)&&!ShuRural.atVillageGate(x,y)&&!ShuMountain.atVillageGate(x,y)&&!activeLandingDock()&&!nearbyRival()&&!nearbyTournamentNpc();[s.x,s.y,s.direction]=old;return ok;}`;
   await walk(id,predicate);const before=await resources();await screenshot(id+'-front');await press('#action');await advance(100);
   if(modal){await page.locator('#'+modal+'.open').waitFor();if(modal==='locationInterior')assert.equal(await evaluate('activeLocationId'),id);if(id==='diner')await diagnoseDiner('reference');await screenshot(id+'-inside');await closeModal(modal);}
   else {assert.equal(await page.locator('.modal.open').count(),0);assert.match(await page.locator('#rescueToast').innerText(),/準備中/);await screenshot(id+'-notice');}
   assert.deepEqual(await resources(),before,id+' does not spend resources');
  }
  await walk('ferry','(x,y,d)=>ShuOffshore.atPier({...s,x,y})');await press('#action');await page.locator('#offshoreFerry.open').waitFor();await screenshot('ferry-dialog');await closeModal('offshoreFerry');
  await walk('north-exit','(x,y,d)=>ShuMountain.atVillageGate(x,y)');await press('#action');await advance(400);assert.equal(await evaluate('s.mapRegion'),'stream');await screenshot('mountain-arrival');
  await fixture('mountain return gate placement',"s.x=152;s.y=128;s.direction='down';render()");await press('#action');await advance(400);assert.equal(await evaluate('s.mapRegion'),'village');
  await walk('east-exit','(x,y,d)=>ShuRural.atVillageGate(x,y)');await press('#action');await advance(400);assert.equal(await evaluate('s.mapRegion'),'ruralCanals');await screenshot('rural-arrival');
  await fixture('rural return gate placement',"s.x=114;s.y=129;s.direction='down';render()");await press('#action');await advance(400);assert.equal(await evaluate('s.mapRegion'),'village');
  await walk('boat-landing','(x,y,d)=>Math.hypot(x-ShuVillageReference.routes.boat.land.x,y-ShuVillageReference.routes.boat.land.y)<6');
  await fixture('canoe ownership only, no position change',"s.ownedVehicles=['canoe'];s.equipment.vehicle='canoe';render()");await press('#action');await advance(200);assert.equal(await evaluate('s.mapRegion'),'coast');assert.equal(await evaluate('s.boatActive'),true);await screenshot('boat-coast-arrival');await press('#action');await advance(200);assert.equal(await evaluate('s.mapRegion'),'village');
  await fixture('offshore paid-return path, no outbound fare claimed',"s.mapRegion='offshore';s.x=130;s.y=96;s.direction='up';render()");await press('#action');await page.locator('#offshoreFerry.open').waitFor();await press('#offshoreFerryGo');await advance(400);assert.equal(await evaluate('s.mapRegion'),'village');const ferry=await evaluate('ShuVillageReference.routes.offshore.harbor');assert.deepEqual(await evaluate('[s.x,s.y]'),[ferry.x,ferry.y]);
  await walk('home-west-approach','(x,y,d)=>!isAtPlayerHomeMapEntrance(x,y)&&((n)=>isAtPlayerHomeMapEntrance(n.x,n.y))(ShuWorldLife.moveTarget(x,y,"left",4,isWalkableWorld))');await press('[data-move="left"]');await advance(800);assert.equal(await evaluate('playerHomeState.area'),'exterior');await screenshot('home-arrival');await press('#action');await advance(800);assert.equal(await evaluate('playerHomeIsActive()'),false);
  await page.evaluate(()=>save());await originalUnchanged();const savedAt=await state();await page.reload({waitUntil:'domcontentloaded'});await require('./browser-start-adventure.cjs')(page,mobile);await advance(400);assert.deepEqual(await state(),savedAt);assert.equal(await evaluate('s.petLife.mutationSeed'),STORED_MUTATION_SEED);await originalUnchanged();await screenshot('preview-reloaded');
  assert.deepEqual(report.errors,[]);assert.deepEqual(report.httpErrors,[]);assert.deepEqual(report.requestErrors,[]);report.status='passed';report.saveReload={previewPositionPreserved:true,normalBytesUnchanged:true};
 }catch(error){report.status='failed';report.failure={message:error.message,stack:error.stack,state:page?await state().catch(()=>null):null};if(page)await screenshot('failure').catch(()=>{});throw error;}
 finally{fs.mkdirSync(out,{recursive:true});fs.writeFileSync(path.join(out,'report.json'),JSON.stringify(report,null,2));if(context)await context.close();if(browser)await browser.close();await new Promise(resolve=>host.close(resolve));}
}
if(require.main===module)run().catch(error=>{console.error(error);process.exitCode=1;});
module.exports={server,run,FROZEN,RUNTIME_TREE_SHA256,runtimeTreeDigest,planVillageRoute,legacyFixture,STORED_MUTATION_SEED,RESOURCE_EXPRESSION,dinerLayersReady,dinerVisualMetrics,compareDinerDiagnostics};
