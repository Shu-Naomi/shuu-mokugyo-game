// Asual's own catalogue and boarding layouts, separate from location scenery.
// Browser execution belongs to the authorized PR's GitHub Actions job.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),http=require('node:http');
const {execFileSync}=require('node:child_process');
const {seed,saveKey}=require('./game-harness.cjs');
const root=path.resolve(__dirname,'..'),output=path.join(__dirname,'browser-evidence-asual-layout');
const screens=[{width:820,height:366,dpr:1.875,mobile:true},{width:844,height:390,dpr:1,mobile:true},{width:1280,height:720,dpr:1,mobile:false}];
const git=(...a)=>execFileSync('git',a,{cwd:path.resolve(root,'..'),encoding:'utf8'}).trim();
function measure(){
 const modal=document.querySelector('#petLifeModal'),visible=e=>e.getClientRects().length&&getComputedStyle(e).visibility!=='hidden';
 const box=e=>{const r=e.getBoundingClientRect();return {x:r.x,y:r.y,width:r.width,height:r.height,top:r.top,bottom:r.bottom,left:r.left,right:r.right};};
 const overlap=(a,b)=>a.left<b.right-.5&&a.right>b.left+.5&&a.top<b.bottom-.5&&a.bottom>b.top+.5;
 const nodes=[...modal.querySelectorAll('.pet-message,.compact-selection-description,.pet-asual-comment,.pet-boarding-intro,.pet-boarding-hint,.pet-boarding-detail')].filter(visible);
 const art=[...modal.querySelectorAll('canvas')].filter(visible).map(e=>({label:e.parentElement.className,box:box(e)}));
 const buttons=[...modal.querySelectorAll('button,select')].filter(visible).map(e=>({label:e.getAttribute('data-compact-action-label')||e.textContent,box:box(e)}));
 return {classes:modal.className,modal:box(modal),texts:nodes.map(e=>{const b=box(e);return {label:e.className,text:e.textContent,hostNotice:e.matches('.pet-shop-host > div > .pet-message'),box:b,clientHeight:e.clientHeight,scrollHeight:e.scrollHeight,clientWidth:e.clientWidth,scrollWidth:e.scrollWidth,artOverlaps:art.filter(a=>overlap(a.box,b)),buttonOverlaps:buttons.filter(a=>!e.contains([...modal.querySelectorAll('button,select')].find(n=>n.textContent===a.label))&&overlap(a.box,b))};}),buttons,content:{height:modal.querySelector('.pet-content').clientHeight,scrollHeight:modal.querySelector('.pet-content').scrollHeight}};
}
async function run(url,screen,provenance){
 const {chromium}=require('playwright'),browser=await chromium.launch({headless:true});
 const context=await browser.newContext({viewport:{width:screen.width,height:screen.height},deviceScaleFactor:screen.dpr,isMobile:screen.mobile,hasTouch:screen.mobile,locale:'ja-JP',serviceWorkers:'block'});
 const page=await context.newPage(),dir=path.join(output,`${screen.width}x${screen.height}`);fs.mkdirSync(dir,{recursive:true});
 const report={screen,provenance,fixture:'Synthetic save; no user save is read or modified. Entry uses the watermill action, then real UI controls.',checks:[],errors:[],httpErrors:[]};
 page.on('pageerror',e=>report.errors.push(e.message));page.on('response',r=>{if(r.status()>=400)report.httpErrors.push(r.status()+' '+new URL(r.url()).pathname);});
 const press=q=>page.locator(q)[screen.mobile?'tap':'click']();
 async function shot(name,noticePattern=null){
  await page.clock.runFor(100);const layout=await page.evaluate(measure);report.checks.push({name,...layout});await page.screenshot({path:path.join(dir,name+'.png')});
  const notices=layout.texts.filter(n=>n.label.startsWith('pet-message'));
  if(noticePattern){const notice=page.locator('#petLifeModal .pet-message');assert.equal(await notice.isVisible(),true,name+': expected notice is visible');assert.match(await notice.textContent(),noticePattern);assert.equal(notices.length,1,name+': one visible notice');if(!name.startsWith('fish-'))assert.equal(notices[0].hostNotice,true,name+': notice uses the host text area');}
  for(const n of notices){
   assert.deepEqual(n.artOverlaps,[],name+': notice does not cover artwork');assert.deepEqual(n.buttonOverlaps,[],name+': notice does not cover controls');
   assert.ok(n.scrollHeight<=n.clientHeight+1&&n.scrollWidth<=n.clientWidth+1,name+': actual notice text fits');
   assert.ok(n.box.top>=layout.modal.top&&n.box.bottom<=layout.modal.bottom&&n.box.left>=layout.modal.left&&n.box.right<=layout.modal.right,name+': notice stays in its modal');
  }
  return layout;
 }
 const snapshot=()=>page.evaluate(()=>JSON.stringify({money:s.money,food:s.petLife.food,fish:s.petLife.fish,boarded:s.petLife.boarded,caught:s.caught}));
 const day=188,state={...seed(),money:596209,x:199,y:36,direction:'up',soundEnabled:false,gameMinutes:day*1440+360,caught:{moroko:1,isaki:1,madai:1,aji:1,funa:1,bass:1,nushi:1,coastNushi:1},petNotebook:{version:1,receivedDay:1,source:'existing',announced:true,species:[]},petLife:{version:6,unlockedTanks:6,food:1165,selected:'pet-28',selectedTank:1,nextId:32,boarded:[],fish:[{uid:'pet-28',species:'isaki',tank:1,length:2400,bornSize:1400,origin:'shop',generation:0,sex:'female',acquiredDay:day-4,lastDay:day,fedDay:day-1,changedDay:day-1,water:90,health:90,careDays:4,stars:1,xp:106}]}};
 try{
  await context.addInitScript(({state,key})=>{if(!localStorage.getItem(key))localStorage.setItem(key,JSON.stringify(state));localStorage.setItem('nushi-inugoya-options-v1',JSON.stringify({textSpeed:'instant'}));},{state,key:saveKey});
  await page.clock.install({time:new Date('2026-11-09T03:00:00Z')});await page.clock.pauseAt('2026-11-09T03:00:01Z');
  await page.goto(url,{waitUntil:'load'});await require('./browser-start-adventure.cjs')(page,screen.mobile);if(await page.locator('#lakeIntroSkip').isVisible())await press('#lakeIntroSkip');
  await press('#action');await page.locator('#petLifeModal.open').waitFor();
  await shot('fish-welcome',/アスアル/);await page.clock.runFor(4600);await shot('fish-ready');const firstState=await snapshot();
  await press('#petLifeModal [data-compact-guide]');await shot('fish-guide');await press('#petLifeModal [data-compact-sheet-close]');
  await press('[data-pet-tab="supplies"]');await shot('supplies-ready');assert.equal(await snapshot(),firstState,'navigation preserves game state');
  const purchaseBefore=await page.evaluate(()=>({money:s.money,food:s.petLife.food}));
  await require('./compact-ui-helpers.cjs').pressProduct(page,'[data-pet-action="food-1"]',screen.mobile);await shot('supplies-purchase-message',/10食買った/);
  assert.deepEqual(await page.evaluate(()=>({money:s.money,food:s.petLife.food})),{money:purchaseBefore.money-100,food:purchaseBefore.food+10});
  await page.setViewportSize(screen.height>500?{width:820,height:366}:{width:1280,height:720});await shot('supplies-notice-resized',/10食買った/);await page.setViewportSize({width:screen.width,height:screen.height});await shot('supplies-notice-restored',/10食買った/);
  await page.clock.runFor(4600);await shot('supplies-notice-expired');assert.equal(await page.locator('.pet-shop-host > div > .pet-message').isVisible(),false);assert.equal(await page.locator('.pet-shop-host > div > small').isVisible(),true);
  await require('./compact-ui-helpers.cjs').pressProduct(page,'[data-pet-action="food-10"]',screen.mobile);await shot('supplies-second-purchase',/100食買った/);
  assert.deepEqual(await page.evaluate(()=>({money:s.money,food:s.petLife.food})),{money:purchaseBefore.money-1100,food:purchaseBefore.food+110});
  await press('[data-pet-tab="legends"]');await shot('legends-ready');
  await require('./compact-ui-helpers.cjs').pressProduct(page,'[data-pet-nushi="nushi"]',screen.mobile);await shot('legend-claim-message',/飼育水槽へ迎えた/);
  await press('[data-pet-tab="buyback"]');await shot('buyback-tanks');
  await require('./compact-ui-helpers.cjs').pressProduct(page,'[data-pet-buyback-tank="1"]',screen.mobile);await shot('buyback-fish');
  await require('./compact-ui-helpers.cjs').pressProduct(page,'[data-pet-buyback="pet-28"]',screen.mobile);await shot('buyback-confirm');const beforeCancel=await snapshot();await press('[data-pet-action="buyback-cancel"]');assert.equal(await snapshot(),beforeCancel,'cancel does not sell');
  // Only the synthetic specimen is sold; preserve a second one for boarding below.
  await page.evaluate(()=>{s.petLife.fish.push({...s.petLife.fish.find(f=>f.uid==='pet-28'),uid:'pet-29'});petUi.render();});
  await require('./compact-ui-helpers.cjs').pressProduct(page,'[data-pet-buyback="pet-29"]',screen.mobile);await press('[data-pet-action="buyback-confirm"]');await shot('buyback-sale-message',/アスアルが.*買い取った/);
  assert.equal(await page.evaluate(()=>s.petLife.fish.some(f=>f.uid==='pet-29')),false);
  await press('[data-pet-tab="contests"]');await shot('contest-register');
  const beforeBoarding=await snapshot();await press('[data-pet-tab="boarding"]');await page.locator('.pet-boarding-intro').scrollIntoViewIfNeeded();await shot('boarding-intro');
  await page.locator('[data-pet-boarding-fish="pet-28"]').scrollIntoViewIfNeeded();await press('[data-pet-boarding-fish="pet-28"]');await page.locator('.pet-boarding-actions').scrollIntoViewIfNeeded();await shot('boarding-confirm');await press('[data-pet-action="boarding-cancel"]');
  await press('[data-pet-tab="fish"]');await shot('fish-after-boarding');assert.equal(await snapshot(),beforeBoarding,'boarding selection and cancel preserve resources');
  await press('[data-pet-action="close"]');await press('#action');await shot('fish-reopened',/アスアル/);
  await page.setViewportSize(screen.height>500?{width:820,height:366}:{width:1280,height:720});await shot('fish-resized',/アスアル/);await page.setViewportSize({width:screen.width,height:screen.height});await shot('fish-restored',/アスアル/);
  assert.deepEqual(report.errors,[]);assert.deepEqual(report.httpErrors,[]);report.passed=true;
 }catch(e){report.passed=false;report.failure=e.stack;await page.screenshot({path:path.join(dir,'failure.png')}).catch(()=>{});throw e;
 }finally{fs.writeFileSync(path.join(dir,'report.json'),JSON.stringify(report,null,2)+'\n');await context.close();await browser.close();}
}
async function main(){
 if(process.env.GITHUB_ACTIONS!=='true')throw Error('This browser diagnostic is reserved for the authorized GitHub Actions job.');
 const head=git('rev-parse','HEAD');assert.equal(head,process.env.NUSHI_EXPECTED_HEAD_SHA);assert.equal(git('status','--porcelain','--untracked-files=no'),'');
 const provenance={head,sourceTree:git('rev-parse','HEAD:nushi-tsuri'),runId:process.env.GITHUB_RUN_ID,pr:process.env.NUSHI_PR_NUMBER};fs.mkdirSync(output,{recursive:true});fs.writeFileSync(path.join(output,'provenance.json'),JSON.stringify(provenance,null,2));
 const types={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.png':'image/png','.webp':'image/webp','.svg':'image/svg+xml','.mp3':'audio/mpeg','.wav':'audio/wav'};
 const server=http.createServer((req,res)=>{try{const p=new URL(req.url,'http://localhost').pathname.replace(/^\/nushi-tsuri\//,'')||'index.html',f=path.resolve(root,p);if(!f.startsWith(root+path.sep)||!fs.statSync(f).isFile())throw Error('path');res.writeHead(200,{'Content-Type':types[path.extname(f)]||'application/octet-stream','Cache-Control':'no-store'});fs.createReadStream(f).pipe(res);}catch{res.writeHead(404);res.end();}});
 await new Promise(r=>server.listen(0,'127.0.0.1',r));try{const failures=[];for(const screen of screens)try{await run('http://127.0.0.1:'+server.address().port+'/nushi-tsuri/',screen,provenance);}catch(e){failures.push(e.stack);}if(failures.length)throw Error(failures.join('\n'));}finally{await new Promise(r=>server.close(r));}
}
if(require.main===module)main().catch(e=>{console.error(e);process.exitCode=1;});
