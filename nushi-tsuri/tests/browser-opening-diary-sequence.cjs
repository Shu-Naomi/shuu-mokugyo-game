// CI-only sequential UI recording: native RAF/timers, no director restart,
// synthetic poses, or Playwright clock between notebook, researcher, and wish.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),http=require('node:http');
const {chromium}=require('playwright');
const enter=require('./browser-start-adventure.cjs'),ready=require('./browser-opening-art-ready.cjs');
const root=path.resolve(__dirname,'..'),dir=path.resolve(__dirname,'opening-diary-sequence');
const screens=[{width:1280,height:720,mobile:false},{width:844,height:390,mobile:true},{width:820,height:366,mobile:true}];
const ids=['notebook','researcher','wish'];
const types={'.html':'text/html','.js':'text/javascript','.css':'text/css','.webp':'image/webp','.png':'image/png','.svg':'image/svg+xml'};
const server=http.createServer((req,res)=>{
 try{
  const relative=new URL(req.url,'http://localhost').pathname.replace(/^\/nushi-tsuri\//,'')||'index.html',file=path.resolve(root,relative);
  if(!file.startsWith(root+path.sep)||!fs.statSync(file).isFile())throw Error('path');
  res.writeHead(200,{'Content-Type':types[path.extname(file)]||'application/octet-stream','Cache-Control':'no-store'});fs.createReadStream(file).pipe(res);
 }catch{res.writeHead(404);res.end();}
});
async function capture(browser,url,screen,avatar){
 const prefix=`${screen.width}x${screen.height}-${avatar}`;
 const context=await browser.newContext({viewport:{width:screen.width,height:screen.height},deviceScaleFactor:1,isMobile:screen.mobile,hasTouch:screen.mobile,locale:'ja-JP',serviceWorkers:'block',recordVideo:{dir:path.join(dir,'raw-video'),size:{width:screen.width,height:screen.height}}});
 const page=await context.newPage(),video=page.video(),errors=[],httpErrors=[];
 page.on('pageerror',e=>errors.push(e.message));page.on('response',r=>{if(r.status()>=400&&r.url().startsWith(new URL(url).origin+'/nushi-tsuri/'))httpErrors.push(`${r.status()} ${r.url()}`);});
 const press=q=>page.locator(q)[screen.mobile?'tap':'click']();
 try{
  await page.goto(url,{waitUntil:'load'});await page.evaluate(()=>localStorage.setItem('nushi-inugoya-options-v1',JSON.stringify({textSpeed:'instant'})));await page.reload();
  await enter(page,screen.mobile,{slot:1,avatar,dog:'grey',name:'直美♡'});
  // Decode files before observation, but do not restart/prepaint any director.
  // A separate Image does not populate the runtime cache: loading frames on
  // subsequent Next clicks are deliberately observed and must keep old pixels.
  await ready.decodeAssets(page,await page.evaluate(()=>ShuLakeIntro.sourceFor('diary')));
  await press('#lakeIntroNext');await ready(page,{step:'memory',panel:'village'});
  await page.evaluate(()=>{
   const ids=['notebook','researcher','wish'],canvas=document.querySelector('#lakeIntroPicture'),ctx=canvas.getContext('2d');
   const state=window.__diarySequence={frames:[],finals:{},stopped:false};
   let previous=null,original=null,raf;
   const equal=(a,b)=>!!b&&a.length===b.length&&a.every((v,i)=>v===b[i]);
   const saved=new Set();
   function sample(trigger){
    const id=canvas.dataset.step;if(!ids.includes(id))return;
    const model=lakeIntroPresentation.snapshot(),pixels=ctx.getImageData(0,0,640,360).data;
    if(!original&&id==='notebook'&&canvas.dataset.artState==='ready'&&canvas.dataset.turnPhase==='start')original=pixels.slice();
    const prior=ids[ids.indexOf(id)-1],previousPixels=prior&&state.finals[prior]?.pixels;
    const first=previous!==id,frame={id,trigger,first,wallMs:performance.now(),elapsed:model.elapsed,progress:model.pose.animation.progress,settled:model.pose.settled,scheduled:model.scheduled,art:canvas.dataset.artState,motion:canvas.dataset.motion,phase:canvas.dataset.turnPhase,previousFinalEqual:equal(pixels,previousPixels),originalEqual:equal(pixels,original)};
    const key=`${id}-${trigger==='navigation'?'navigation':frame.phase}`;
    if(!saved.has(key)){saved.add(key);frame.png=canvas.toDataURL('image/png');}
    if(model.pose.settled&&canvas.dataset.artState==='ready'&&!model.scheduled&&!state.finals[id])state.finals[id]={pixels:pixels.slice(),png:canvas.toDataURL('image/png'),wallMs:frame.wallMs};
    state.frames.push(frame);previous=id;
   }
   // Run after the actual Next click's handlers, before its first paint. The
   // continuous RAF observer then checks every display opportunity for a flash.
   const clicked=e=>{if(e.target.closest?.('#lakeIntroNext'))queueMicrotask(()=>sample('navigation'));};
   window.addEventListener('click',clicked);
   function tick(){sample('raf');if(!state.stopped)raf=requestAnimationFrame(tick);}
   raf=requestAnimationFrame(tick);
   state.finish=()=>{state.stopped=true;cancelAnimationFrame(raf);window.removeEventListener('click',clicked);return {originalCaptured:!!original,frames:state.frames,finals:Object.fromEntries(Object.entries(state.finals).map(([id,{pixels,...rest}])=>[id,rest]))};};
  });
  for(const id of ids){
   await press('#lakeIntroNext');
   await page.waitForFunction(id=>!!window.__diarySequence.finals[id],id,{timeout:15000});
   await page.screenshot({path:path.join(dir,`${prefix}-${id}-completed-ui.png`)});
   // Native hold proves that completing a page does not automatically navigate.
   await page.waitForTimeout(250);assert.equal(await page.locator('#lakeIntroPicture').getAttribute('data-step'),id);
  }
  const result=await page.evaluate(()=>window.__diarySequence.finish());
  assert.ok(result.originalCaptured,`${prefix}: original notebook start was not observed`);
  for(const id of ids){
   const frames=result.frames.filter(f=>f.id===id),navigation=frames.find(f=>f.trigger==='navigation'),final=result.finals[id];
   assert.ok(navigation,`${prefix} ${id}: immediate actual Next-click sample missing`);
   assert.ok(frames.some(f=>f.phase==='cross'&&!f.settled),`${prefix} ${id}: no native moving leaf observed`);
   assert.ok(final.wallMs-navigation.wallMs>=1000,`${prefix} ${id}: native turn must not complete immediately`);
   assert.equal(frames.at(-1).settled,true);assert.equal(frames.at(-1).scheduled,false);
   if(id!=='notebook'){
    assert.ok(navigation.previousFinalEqual,`${prefix} ${id}: Next click flashed or rewound instead of retaining previous final`);
    assert.ok(frames.some(f=>f.art==='ready'&&f.phase==='start'),`${prefix} ${id}: ready initial spread was not observed`);
    for(const frame of frames){
     if(frame.art!=='ready'||frame.phase==='start')assert.ok(frame.previousFinalEqual,`${prefix} ${id}: changed previous completed pixels during ${frame.art}/${frame.phase}`);
     assert.equal(frame.originalEqual,false,`${prefix} ${id}: original notebook flashed again`);
    }
   }
  }
  assert.equal(new Set(Object.values(result.finals).map(f=>f.png)).size,3,`${prefix}: all three final spreads must be distinct`);
  for(const frame of result.frames)if(frame.png){frame.file=`${prefix}-${frame.id}-${frame.trigger==='navigation'?'navigation':frame.phase}.png`;fs.writeFileSync(path.join(dir,frame.file),Buffer.from(frame.png.split(',')[1],'base64'));delete frame.png;}
  for(const [id,final] of Object.entries(result.finals)){final.file=`${prefix}-${id}-completed-canvas.png`;fs.writeFileSync(path.join(dir,final.file),Buffer.from(final.png.split(',')[1],'base64'));delete final.png;}
  assert.deepEqual(errors,[]);assert.deepEqual(httpErrors,[]);
  const report={screen,avatar,clock:'native browser RAF and timers',navigation:'actual Next clicks, no renderLakeIntro reset',video:`${prefix}.webm`,visualReview:'required; pixel checks do not establish visual quality',...result};
  fs.writeFileSync(path.join(dir,`${prefix}-sequence.json`),JSON.stringify(report,null,2));console.log('OPENING_DIARY_SEQUENCE_PASS',prefix);return {screen,avatar,video:report.video,report:`${prefix}-sequence.json`};
 }catch(error){
  await page.screenshot({path:path.join(dir,`${prefix}-failure.png`)}).catch(()=>{});
  const trace=await page.evaluate(()=>window.__diarySequence?.finish()).catch(()=>null);
  fs.writeFileSync(path.join(dir,`${prefix}-failure.json`),JSON.stringify({error:error.stack,errors,httpErrors,trace},null,2));throw error;
 }finally{await context.close();await video.saveAs(path.join(dir,`${prefix}.webm`));await video.delete();}
}
(async()=>{
 fs.mkdirSync(dir,{recursive:true});await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));let browser;const cases=[];
 try{browser=await chromium.launch({headless:true});const url=`http://127.0.0.1:${server.address().port}/nushi-tsuri/`;
  for(const screen of screens)for(const avatar of ['boy','girl']){cases.push(await capture(browser,url,screen,avatar));fs.writeFileSync(path.join(dir,'sequence.json'),JSON.stringify({cases},null,2));}
 }finally{if(browser)await browser.close();await new Promise(resolve=>server.close(resolve));}
})().catch(error=>{console.error(error);process.exitCode=1;});
