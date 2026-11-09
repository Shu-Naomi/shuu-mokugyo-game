// Prepared for a separately authorized GitHub Actions run. Do not launch a
// local browser as a substitute for CI verification in restricted executors.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {seed,saveKey}=require('./game-harness.cjs');
const screens=[{width:820,height:366,dpr:1.875,mobile:true},{width:844,height:390,dpr:1,mobile:true},{width:1280,height:720,dpr:1,mobile:false}];
const alignmentSelectors=['#locationInterior.compact-location-shop:not(.compact-service) .location-scene>.scenery-motion','#locationInterior.compact-location-shop:not(.compact-service) .location-scene>.scenery-foreground'];
function baselineSelectorText(selectorText){
 const normalize=s=>s.replace(/\s/g,''),selectors=selectorText.split(',').map(s=>s.trim());
 const removed=selectors.filter(s=>alignmentSelectors.some(added=>normalize(added)===normalize(s)));
 assert.equal(selectors.length,5,'the known shared geometry rule has five selectors');
 assert.equal(removed.length,2,'revert exactly the two alignment selectors, not any declarations');
 return selectors.filter(s=>!removed.includes(s)).join(', ');
}
function assertPreservedMetrics(current,baseline,restored,label){
 assert.deepEqual(current,baseline,label+' is unchanged from the same-DOM pre-fix CSS baseline');
 assert.deepEqual(restored,current,label+' returns to the original metrics after restoring the fix');
}

function sourceProvenance(){
 const {execFileSync}=require('node:child_process'),crypto=require('node:crypto'),cwd=path.resolve(__dirname,'../..');
 const git=(...args)=>execFileSync('git',args,{cwd,encoding:'utf8'}).trim();
 const expected=process.env.NUSHI_EXPECTED_HEAD_SHA;
 assert.match(expected||'',/^[0-9a-f]{40}$/,'CI must supply the exact pull request head SHA');
 const head=git('rev-parse','HEAD');assert.equal(head,expected,'evidence must run the exact pull request head, not its merge ref');
 assert.equal(git('status','--porcelain','--untracked-files=no'),'','tracked source must be unchanged');
 return {head,expectedHead:expected,sourceTree:git('rev-parse','HEAD:nushi-tsuri'),compactCssSha256:crypto.createHash('sha256').update(fs.readFileSync(path.join(__dirname,'../compact-ui.css'))).digest('hex'),repository:process.env.GITHUB_REPOSITORY,headRepository:process.env.NUSHI_HEAD_REPOSITORY,pullRequest:process.env.NUSHI_PR_NUMBER,runId:process.env.GITHUB_RUN_ID,runAttempt:process.env.GITHUB_RUN_ATTEMPT,runUrl:`${process.env.GITHUB_SERVER_URL}/${process.env.GITHUB_REPOSITORY}/actions/runs/${process.env.GITHUB_RUN_ID}`};
}

function layersReady({id,scene}){
 const base=document.getElementById(id),motion=document.querySelector(`.scenery-motion[data-for="${id}"]`),front=document.querySelector(`.scenery-foreground[data-for="${id}"]`);
 return !!(base&&motion&&front&&base.style.backgroundImage==='none'&&motion.dataset.scene===scene&&base.width>0&&base.height>0&&[motion,front].every(c=>c.width===base.width&&c.height===base.height));
}
function measureLayers({id,dialogueId}){
 const bounds=n=>{const r=n.getBoundingClientRect(),s=getComputedStyle(n);return {x:r.x,y:r.y,width:r.width,height:r.height,top:r.top,bottom:r.bottom,left:r.left,right:r.right,position:s.position,objectFit:s.objectFit,objectPosition:s.objectPosition,zIndex:s.zIndex};};
 const base=document.getElementById(id),motion=document.querySelector(`.scenery-motion[data-for="${id}"]`),front=document.querySelector(`.scenery-foreground[data-for="${id}"]`),dialogue=document.getElementById(dialogueId),box=dialogue.closest('.compact-scene-dialogue');
 const layer=n=>({...bounds(n),nativeWidth:n.width,nativeHeight:n.height});
 const d=bounds(dialogue),b=box&&bounds(box),s=box&&getComputedStyle(box);
 const inner=b&&{top:b.top+parseFloat(s.borderTopWidth)+parseFloat(s.paddingTop),bottom:b.bottom-parseFloat(s.borderBottomWidth)-parseFloat(s.paddingBottom)};
 const f=bounds(front),overlap=f.left<d.right&&f.right>d.left&&f.top<d.bottom&&f.bottom>d.top;
 return {base:layer(base),motion:layer(motion),foreground:layer(front),dialogue:{...d,text:dialogue.textContent,clientHeight:dialogue.clientHeight,scrollHeight:dialogue.scrollHeight,box:b,inner,textFits:!inner||(d.top>=inner.top-1&&d.bottom<=inner.bottom+1&&dialogue.scrollHeight<=dialogue.clientHeight+1)},foregroundOverlapsDialogue:overlap,category:typeof locationCategory==='undefined'?null:locationCategory,environment:gameSceneryEnvironment()};
}
function assertGeometry(metrics,fit,label){
 for(const name of ['motion','foreground']){
  const layer=metrics[name];
  for(const key of ['x','y','width','height'])assert.ok(Math.abs(layer[key]-metrics.base[key])<.5,`${label}: ${name} ${key} matches base`);
  for(const key of ['objectFit','objectPosition','nativeWidth','nativeHeight'])assert.equal(layer[key],metrics.base[key],`${label}: ${name} ${key}`);
 }
 assert.equal(metrics.base.objectFit,fit,label+' crop');
 assert.ok(metrics.base.width>0&&metrics.base.height>0,label+' nonzero rendered size');
}
async function run(url,screen,output,provenance){
 const {chromium}=require('playwright'),{width,height,dpr,mobile}=screen;
 const dir=path.join(output,`${width}x${height}-dpr${dpr}`);fs.mkdirSync(dir,{recursive:true});
 const browser=await chromium.launch({headless:true}),context=await browser.newContext({viewport:{width,height},deviceScaleFactor:dpr,isMobile:mobile,hasTouch:mobile,locale:'ja-JP',serviceWorkers:'block'});
 const page=await context.newPage(),report={screen,provenance,entry:'Injected room entry fixtures; tabs, detail dismissal and exits use UI controls.',checks:[],errors:[],httpErrors:[]};
 page.on('pageerror',e=>report.errors.push(e.message));page.on('response',r=>{if(r.status()>=400)report.httpErrors.push(r.status()+' '+new URL(r.url()).pathname);});
 const press=q=>page.locator(q)[mobile?'tap':'click']();
 const progress=()=>page.evaluate(()=>JSON.stringify({money:s.money,hp:s.hp,time:s.gameMinutes,baits:s.baits,items:s.items,ingredients:s.cookingIngredients,meals:s.preparedMeals,equipment:s.equipment,caught:s.caught,story:s.lakeStory,records:s.fishCatchRecords,mode:s.fightMode}));
 async function ready(id,scene){
  for(let i=0;i<200;i++){
   if(await page.evaluate(layersReady,{id,scene}))return;
   await page.clock.runFor(100);await page.waitForTimeout(100);
  }
  throw Error('Split layers never became ready: '+scene);
 }
 async function preserveException(label,metrics){
  const rule=await page.evaluate(added=>{
   const normalize=s=>s.replace(/\s/g,''),matches=[];
   [...document.styleSheets].forEach((sheet,sheetIndex)=>{
    if(!sheet.href||!new URL(sheet.href).pathname.endsWith('/compact-ui.css'))return;
    [...sheet.cssRules].forEach((rule,ruleIndex)=>{const selectors=rule.selectorText?.split(',').map(normalize)||[];if(added.every(s=>selectors.includes(normalize(s))))matches.push({sheetIndex,ruleIndex,selectorText:rule.selectorText,declarations:rule.style.cssText});});
   });
   if(matches.length!==1)throw Error('Expected exactly one shared compact location geometry rule');return matches[0];
  },alignmentSelectors);
  const baselineSelectors=baselineSelectorText(rule.selectorText);let baseline,restored;
  try{
   await page.evaluate(({rule,selectors})=>{const live=document.styleSheets[rule.sheetIndex].cssRules[rule.ruleIndex];if(live.selectorText!==rule.selectorText)throw Error('Geometry rule changed before baseline capture');live.selectorText=selectors;if(live.style.cssText!==rule.declarations)throw Error('Baseline must not alter declarations');},{rule,selectors:baselineSelectors});
   baseline=await page.evaluate(measureLayers,{id:'locationPixels',dialogueId:'locationDialogue'});
   await page.screenshot({path:path.join(dir,label+'-baseline.png')});
  }finally{
   await page.evaluate(rule=>{const live=document.styleSheets[rule.sheetIndex].cssRules[rule.ruleIndex];live.selectorText=rule.selectorText;if(live.selectorText!==rule.selectorText||live.style.cssText!==rule.declarations)throw Error('Baseline capture did not restore the geometry rule');},rule);
   restored=await page.evaluate(measureLayers,{id:'locationPixels',dialogueId:'locationDialogue'});
  }
  return {method:'Same DOM, viewport, scene and clock; remove only the two added selectors, then restore them in finally.',baselineSelectors,removedSelectors:alignmentSelectors,baseline,restored};
 }
 async function capture(label,{sam=false,fit='cover',textFits=false,preserveBaseline=false}={}){
  const metrics=await page.evaluate(measureLayers,{id:sam?'shopPixels':'locationPixels',dialogueId:sam?'shopDialogue':'locationDialogue'});
  const check={label,...metrics};report.checks.push(check);
  await page.screenshot({path:path.join(dir,label+'.png')});
  if(preserveBaseline){
   check.preservation=await preserveException(label,metrics);
   assertPreservedMetrics(metrics,check.preservation.baseline,check.preservation.restored,label);
   for(const name of ['base','motion','foreground'])assert.equal(metrics[name].objectFit,fit,label+' keeps '+name+' crop');
  }else assertGeometry(metrics,fit,label);
  if(!sam)assert.equal(metrics.foregroundOverlapsDialogue,false,label+' foreground does not cover dialogue');
  if(textFits)assert.equal(metrics.dialogue.textFits,true,label+' current dialogue fits inside its padded box');
  return metrics;
 }
 async function openRoom(id){await page.evaluate(id=>openLocationInterior(id),id);await ready('locationPixels','room-'+id);}
 try{
  await context.addInitScript(({key,state})=>{if(!localStorage.getItem(key))localStorage.setItem(key,JSON.stringify(state));localStorage.setItem('nushi-inugoya-options-v1',JSON.stringify({textSpeed:'instant'}));},{key:saveKey,state:{...seed(),gameMinutes:500,items:{wildGreens:2},soundEnabled:false}});
  await page.clock.install({time:new Date('2026-11-09T03:00:00Z')});await page.clock.pauseAt('2026-11-09T03:00:01Z');
  await page.goto(url,{waitUntil:'domcontentloaded',timeout:90000});await require('./browser-start-adventure.cjs')(page,mobile);await page.clock.runFor(240);
  if(await page.locator('#lakeIntroSkip').isVisible()){await press('#lakeIntroSkip');await page.clock.runFor(240);}
  await page.evaluate(()=>{Math.random=()=>.999999;});const before=await progress(),saved=await page.evaluate(key=>localStorage.getItem(key),saveKey);
  // Start, dismiss and replace a cold room before its asynchronous art settles.
  await page.evaluate(()=>{openLocationInterior('diner');close();openLocationInterior('yaoya');close();openLocationInterior('diner');});
  await ready('locationPixels','room-diner');
  const first=await capture('diner-food-ready',{textFits:true});assert.equal(first.category,'food');assert.equal(first.environment.season,'spring');assert.equal(first.environment.period,'morning');assert.equal(first.environment.weather,'sunny');
  for(const tab of ['recipes','meals','food','recipes','food']){await press(`[data-location-category="${tab}"]`);await capture('diner-tab-'+tab+'-'+report.checks.length,{textFits:true});}
  for(const dismiss of ['button','escape','shade']){
   await press('#locationCategory-food [data-compact-info]:visible');await page.locator('#locationInterior .compact-sheet').waitFor({state:'visible'});
   if(dismiss==='button')await press('#locationInterior [data-compact-sheet-close]');
   if(dismiss==='escape')await page.keyboard.press('Escape');
   if(dismiss==='shade')await page.locator('#locationInterior .compact-sheet-shade').click({position:{x:5,y:5}});
   assert.equal(await page.locator('#locationInterior .compact-sheet').count(),0);await capture('diner-detail-'+dismiss,{textFits:true});
  }
  const other=height>500?{width:820,height:366}:{width:1280,height:720};await page.setViewportSize(other);await page.clock.runFor(150);await capture('diner-resized',{textFits:true});
  await page.setViewportSize({width,height});await page.clock.runFor(150);await capture('diner-size-restored',{textFits:true});
  await press('#locationInterior [data-close]');
  for(const [id,fit] of [['yaoya','cover'],['player-home','cover'],['farmhouse','contain'],['fish-market','contain'],['main-shrine','contain']]){
   await openRoom(id);await capture(id+'-ready',{fit,textFits:id==='yaoya',preserveBaseline:id==='fish-market'||id==='main-shrine'});await press('#locationInterior [data-close]');
   await openRoom('diner');await capture('diner-after-'+id,{textFits:true});await press('#locationInterior [data-close]');
  }
  await page.evaluate(()=>{renderSamShop();open('store');});await ready('shopPixels','room-sam-shop');const sam=await capture('sam-ready',{sam:true});assert.ok(Number(sam.dialogue.box.zIndex)>Number(sam.foreground.zIndex),'Sam keeps dialogue above foreground');await press('#store [data-close]');
  await openRoom('diner');await capture('diner-reopened',{textFits:true});await press('#locationInterior [data-close]');
  assert.equal(await page.locator('.compact-sheet').count(),0,'no orphan detail after dismissal');assert.equal(await progress(),before,'read-only flows preserve economy and progress');assert.equal(await page.evaluate(key=>localStorage.getItem(key),saveKey),saved,'read-only flows preserve saved bytes');
  assert.deepEqual(report.errors,[]);assert.deepEqual(report.httpErrors,[]);report.passed=true;
 }catch(error){report.passed=false;report.failure=error.stack;await page.screenshot({path:path.join(dir,'failure.png')}).catch(()=>{});throw error;
 }finally{fs.writeFileSync(path.join(dir,'report.json'),JSON.stringify(report,null,2)+'\n');await context.close();await browser.close();}
 return report;
}
async function main(){
 if(process.env.GITHUB_ACTIONS!=='true')throw Error('This runner is reserved for separately authorized GitHub Actions verification. No local browser was started.');
 const http=require('node:http'),root=path.resolve(__dirname,'..'),output=path.join(__dirname,'browser-evidence-location-layer-alignment');
 const provenance=sourceProvenance();fs.mkdirSync(output,{recursive:true});fs.writeFileSync(path.join(output,'provenance.json'),JSON.stringify(provenance,null,2)+'\n');
 const types={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.png':'image/png','.webp':'image/webp','.svg':'image/svg+xml','.mp3':'audio/mpeg','.wav':'audio/wav'};
 const server=http.createServer((req,res)=>{try{const pathname=new URL(req.url,'http://localhost').pathname.replace(/^\/nushi-tsuri\//,'')||'index.html',file=path.resolve(root,pathname);if(!file.startsWith(root+path.sep)||!fs.statSync(file).isFile())throw Error('path');res.writeHead(200,{'Content-Type':types[path.extname(file)]||'application/octet-stream','Cache-Control':'no-store'});fs.createReadStream(file).pipe(res);}catch{res.writeHead(404);res.end();}});
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 try{
  const failures=[];
  for(const screen of screens)try{await run('http://127.0.0.1:'+server.address().port+'/nushi-tsuri/',screen,output,provenance);}catch(error){failures.push(`${screen.width}x${screen.height}: ${error.stack}`);}
  if(failures.length)throw Error(failures.join('\n'));
 }finally{await new Promise(resolve=>server.close(resolve));}
}
module.exports={layersReady,measureLayers,assertGeometry,alignmentSelectors,baselineSelectorText,assertPreservedMetrics,run};
if(require.main===module)main().catch(error=>{console.error(error);process.exitCode=1;});
