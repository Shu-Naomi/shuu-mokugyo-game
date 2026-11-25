// The last few metres are a controlled fixture. The normal hook, lift, catch
// recording, hanging animation and dismissal all use the actual game runtime.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const http = require('node:http');
const path = require('node:path');
const { chromium } = require('playwright');
const {createCanvas,loadImage} = require('@napi-rs/canvas');
const {seed, saveKey} = require('./game-harness.cjs');
const enterGame = require('./browser-start-adventure.cjs');

const out = path.resolve(process.env.HOOK_OUT || 'landing-hook-evidence');
const viewport = {width:844,height:390};
const mime = {'.html':'text/html','.js':'text/javascript','.css':'text/css','.png':'image/png',
  '.svg':'image/svg+xml','.webp':'image/webp','.jpg':'image/jpeg','.mp3':'audio/mpeg','.woff2':'font/woff2'};
// Reviewed closed-jaw coordinates in actual 448x224 fight/catch rasters. The
// native Shiokakure catch illustration has its own 224x124 frame and jaw.
const cases = [
  {id:'medaka',mode:'nushi',facing:1,roll:.01,jaw:[366.5,111.5],open:[363.5,146.5]},
  {id:'mebaru',mode:'gauge',facing:-1,roll:.50,jaw:[369.5,128.5],open:[368.5,136.5]},
  {id:'utsubo',mode:'nushi',facing:1,roll:.995,jaw:[366.5,138.5],open:[360.5,168.5]},
  {id:'hirame',mode:'gauge',facing:1,roll:.60,jaw:[368.5,135.5],open:[368.5,128.5]},
  {id:'starNushi',mode:'nushi',facing:-1,roll:.999,jaw:[368.5,129.5],open:[366.5,140.5]},
  {id:'kasago',mode:'gauge',facing:-1,roll:.80,jaw:[370.5,139.5],open:[370.5,142.5]},
  {id:'shiokakure',mode:'nushi',facing:1,roll:.70,jaw:[365.5,139.5]}
];
function serve(root) {
  return http.createServer((req,res)=>{
    const n=decodeURIComponent(new URL(req.url,'http://localhost').pathname).replace(/^\/nushi-tsuri\//,'')||'index.html';
    const f=path.resolve(root,n);
    if(!f.startsWith(root+path.sep)||!fs.existsSync(f)||!fs.statSync(f).isFile()){res.writeHead(404);return res.end();}
    res.setHeader('Content-Type',mime[path.extname(f)]||'application/octet-stream');fs.createReadStream(f).pipe(res);
  });
}
// Sample the painted jaw and the visible metal in SCREEN coordinates.
// An unpainted zero-sized witness inherits all transforms (camera, translation,
// swing, mirror and specimen size). No production anchor helper is called.
function measure({card,fixture,seated=false}) {
  const fish=document.querySelector(card?'#catchFish':'#battleFish');
  const canvas=fish.querySelector('canvas');
  const visible=node=>Boolean(node&&node.checkVisibility({visibilityProperty:true,opacityProperty:true}));
  function point(parent,x,y){
    const n=document.createElement('i');
    n.style.cssText='position:absolute;width:0;height:0;padding:0;border:0;margin:0;pointer-events:none;';
    n.style.left=x;n.style.top=y;parent.append(n);
    const box=n.getBoundingClientRect();n.remove();return {x:box.x,y:box.y};
  }
  const dist=(a,b)=>a&&b?Math.hypot(a.x-b.x,a.y-b.y):null;
  const svgPoint=(node,x,y)=>new DOMPoint(x,y).matrixTransform(node.getScreenCTM());
  const bend=document.querySelector(card?(seated?'.catch-hook-bend':'.catch-hook'):'#fishTackleFront svg');
  const shank=card?(seated?document.querySelector('.catch-hook-shank'):bend):document.querySelector('#fishTackleBack svg');
  let tip=null,entry=null,eye=null,shaft=null,end=null;
  if(visible(bend)){
    if(!card){tip=svgPoint(bend,2.8,6.8);eye=svgPoint(shank,8,3);}
    else if(bend instanceof SVGSVGElement){
      tip=seated?svgPoint(bend,5,10.25):svgPoint(bend,9,6);
      entry=seated?svgPoint(shank,5,8):tip;eye=svgPoint(shank,2,2);
      shaft=seated?svgPoint(shank,2.4375,6.92):svgPoint(shank,2,5.8);
    }
    else {tip=point(bend,'1px','8px');eye=point(bend,'8px','0px');}
  }
  if(card) end=point(document.querySelector('.catch-line'),'50%','100%');
  else {
    const line=document.querySelector('#linePath');
    const endpoint=line.getPointAtLength(line.getTotalLength());
    end=endpoint.matrixTransform(line.getScreenCTM());
  }
  const origin=point(fish,'0%','0%'),right=point(fish,'100%','0%'),bottom=point(fish,'0%','100%');
  function project(x,y){
    return {x:origin.x+x*(right.x-origin.x)+y*(bottom.x-origin.x),
      y:origin.y+x*(right.y-origin.y)+y*(bottom.y-origin.y)};
  }
  const pose=card?fish.dataset.catchPose:fish.dataset.spriteMode;
  const frame=Number(card?fish.dataset.catchFrame:fish.dataset.hookPoseFrame??fish.dataset.spriteFrame)||0;
  const dedicated=card&&fixture.id==='shiokakure';
  const open=pose==='mouth' && frame>0 && fixture.open;
  const [jx,jy]=open||fixture.jaw;
  const partial=open && frame===1 ? 5.6 : 0;
  const lip=dedicated?project(198.5/224,71.5/124):project(jx/448,(jy-partial)/224);
  let inkGap=null;
  if(tip&&!dedicated&&visible(canvas)){
    const w=canvas.width,h=canvas.height,rgba=canvas.getContext('2d').getImageData(0,0,w,h).data;
    let nearest=Infinity;
    for(let y=0;y<h;y++)for(let x=0;x<w;x++){
      if(rgba[4*(y*w+x)+3]<128)continue;
      const screen=project((x+.5)/w,(y+.5)/h);
      nearest=Math.min(nearest,dist(screen,tip));
    }
    if(Number.isFinite(nearest))inkGap=nearest;
  }
  const clip=document.querySelector(card?'#catchCard':'#fishScene').getBoundingClientRect();
  const onScreen=p=>p&&p.x>=Math.max(0,clip.left)&&p.x<=Math.min(innerWidth,clip.right)
    &&p.y>=Math.max(0,clip.top)&&p.y<=Math.min(innerHeight,clip.bottom);
  const xy=p=>p&&[p.x,p.y];
  return {phase:card?'result':battle.phase,pose,frame,lip:xy(lip),tip:xy(tip),lineEnd:xy(end),eye:xy(eye),shaft:xy(shaft),
    visible:visible(bend),onScreen:Boolean(onScreen(tip)&&onScreen(eye)),inkGap,tipJaw:dist(tip,lip),entryJaw:dist(entry||tip,lip),eyeLine:dist(eye,end),lineJaw:dist(end,lip),
    specimen:fish.dataset.specimenScale,fishBox:fish.getBoundingClientRect().toJSON()};
}
// Two stroke colours expose only the metal in the browser's actual composite.
// Repeat with the fish hidden to recover the complete hook silhouette. A pixel
// that reacts only with the fish hidden belongs to metal covered by the fish.
async function measureHookCoverage(page, sample) {
  const points = [sample.eye, sample.tip, sample.lip];
  const left = Math.floor(Math.min(...points.map(p => p[0])) - 13);
  const top = Math.floor(Math.min(...points.map(p => p[1])) - 13);
  const endX = Math.ceil(Math.max(...points.map(p => p[0])) + 13);
  const endY = Math.ceil(Math.max(...points.map(p => p[1])) + 13);
  const clip = {x:left, y:top, width:endX-left, height:endY-top};
  const style = await page.addStyleTag({content:
    '.catch-hook,.catch-hook *{stroke:var(--probe-metal)!important}' +
    'html.hide-probe-fish #catchFish{visibility:hidden!important}'
  });
  const images = [];
  try {
    for (const hidden of [false,true]) {
      for (const colour of ['#ff00ff','#00ff00']) {
        await page.evaluate(({hidden,colour}) => {
          document.documentElement.classList.toggle('hide-probe-fish',hidden);
          document.documentElement.style.setProperty('--probe-metal',colour);
        },{hidden,colour});
        const png = await page.screenshot({clip,scale:'device'});
        const bitmap = await loadImage(png);
        const ctx = createCanvas(bitmap.width,bitmap.height).getContext('2d');
        ctx.drawImage(bitmap,0,0);
        images.push(ctx.getImageData(0,0,bitmap.width,bitmap.height));
      }
    }
  } finally {
    await page.evaluate(() => {
      document.documentElement.classList.remove('hide-probe-fish');
      document.documentElement.style.removeProperty('--probe-metal');
    });
    await style.evaluate(node => node.remove());
  }
  const [visibleA,visibleB,bareA,bareB] = images;
  const coverage = {peak:0,metal:0,covered:0,exposed:0,barbCovered:0,eyeExposed:0,shaftExposed:0};
  // Chromium rasterizes the clip at the emulated physical pixel density.
  const dpr = await page.evaluate(() => devicePixelRatio);
  const contrast = (a,b,i) => Math.abs(a.data[i]-b.data[i]);
  // During the card's entrance both opacity and brightness are below one.
  // Normalize to the unobscured metal in this exact frame, keeping the actual
  // fade and shadows intact. Require a usable reference even on the old build.
  for (let i=0; i<bareA.data.length; i+=4) coverage.peak=Math.max(coverage.peak,contrast(bareA,bareB,i));
  const metalThreshold=Math.max(4,coverage.peak*.32);
  for (let y=0; y<bareA.height; ++y) for (let x=0; x<bareA.width; ++x) {
    const i=(y*bareA.width+x)*4;
    const full=contrast(bareA,bareB,i);
    if (full<metalThreshold) continue;
    coverage.metal++;
    const shown=contrast(visibleA,visibleB,i);
    const sx=left+(x+.5)/dpr, sy=top+(y+.5)/dpr;
    if (shown<=.10*full+1) {
      coverage.covered++;
      if (Math.hypot(sx-sample.tip[0],sy-sample.tip[1])<2) coverage.barbCovered++;
    }
    if (shown>=.55*full) {
      coverage.exposed++;
      if (Math.hypot(sx-sample.eye[0],sy-sample.eye[1])<2.3) coverage.eyeExposed++;
      if (Math.hypot(sx-sample.shaft[0],sy-sample.shaft[1])<1.2) coverage.shaftExposed++;
    }
  }
  return coverage;
}

async function stage(page,card,age,delta) {
  // Native CSS animations have a compositor clock separate from Playwright's
  // JS clock. Seek only the presentation animations on both builds. The
  // production landing rAF alone updates hook and line after the seek.
  await page.evaluate(({card,age})=>{
    const subject=document.querySelector(card?'#catchCard':'#battleFish');
    for(const a of subject.getAnimations({subtree:true})){
      if(a.playState==='idle')continue;
      a.pause();a.currentTime=age;
    }
  },{card,age});
  await page.clock.runFor(delta);
}
async function capture(browser,url,version,fixture){
  const ctx=await browser.newContext({viewport,deviceScaleFactor:1.875,isMobile:true,hasTouch:true,
    locale:'ja-JP',serviceWorkers:'block'});
  try{
    const state={...seed(),hp:100,gameMinutes:600,soundEnabled:false,fightMode:fixture.mode,selectedRod:'tideMaster',ownedRods:['bamboo','tideMaster']};
    await ctx.addInitScript(({key,state})=>{
      localStorage.setItem(key,JSON.stringify(state));
      localStorage.setItem('nushi-inugoya-options-v1',JSON.stringify({textSpeed:'instant'}));
    },{state,key:saveKey});
    const page=await ctx.newPage(),errors=[];
    page.on('pageerror',e=>errors.push(e.message));page.on('response',r=>{if(r.url().startsWith(url)&&r.status()>=400)errors.push(r.status()+' '+r.url());});
    await page.clock.install({time:new Date('2026-11-22T12:00:00Z')});await page.clock.pauseAt('2026-11-22T12:00:01Z');
    await page.goto(url);await enterGame(page,true);
    if(await page.locator('#lakeIntroSkip').isVisible())await page.locator('#lakeIntroSkip').tap();
    const result=await page.evaluate(async ({id,roll,mode,facing})=>{
      let rng=301;Math.random=()=>((rng=Math.imul(rng,1664525)+1013904223>>>0)/4294967296);
      cast();beginFishing();battle.cast=50;launchSurfaceCast();settleSurfaceCast();
      battle.f=fish.find(f=>f.id===id);battle.fightMode=mode;
      battle.specimen=rollFishSpecimen(battle.f,()=>roll);
      battle.specimenVisualScale=fishVisualScale(battle.specimen);
      await Promise.all(ShuFishArt.assets(ShuFishArt.fightVariants[id]||id).map(src=>fishAtlasImage(src).decode()));
      startFight();clearInterval(timer);finishHookReveal();releaseBattleAction();
      Object.assign(battle,{facing,turning:null,gillWash:null,nushiWindow:null,x:battle.surfaceX+3,y:battle.surfaceY+2,
        retrieval:1,sandLifted:true,mouthState:'closed'});
      renderBattleFish();syncBattleFishLine();
      return {id,mode,facing,tier:battle.specimen?.tierId,count:s.caught[id]||0};
    },fixture);
    await stage(page,false,900,900);
    const dest=path.join(out,version,fixture.id);fs.mkdirSync(dest,{recursive:true});
    result.fight=await page.evaluate(measure,{card:false,fixture});
    await page.evaluate(()=>surfaceCatch());
    result.landing=[];result.result=[];
    let prev=0;
    for(const age of [32,160,370,650,940]){
      await stage(page,false,age,age-prev);prev=age;
      const sample=await page.evaluate(measure,{card:false,fixture});sample.age=age;result.landing.push(sample);
      assert.equal(sample.phase,'landing');
      if([160,650,940].includes(age))await page.screenshot({path:path.join(dest,'landing-'+age+'.png'),scale:'css'});
    }
    await page.clock.runFor(180);assert.equal(await page.locator('#catchCard.show').count(),1);
    prev=0;
    for(const age of [64,392,734,1032]){
      await stage(page,true,age,age-prev);prev=age;
      const sample=await page.evaluate(measure,{card:true,fixture,seated:version==='after'});sample.age=age;result.result.push(sample);
      if([64,392,734].includes(age))await page.screenshot({path:path.join(dest,'result-'+age+'.png'),scale:'css'});
      if(version==='prior-card'||version==='after')sample.coverage=await measureHookCoverage(page,sample);
    }
    result.caught=await page.evaluate(id=>s.caught[id],fixture.id);
    assert.equal(result.caught,result.count+1);assert.deepEqual(errors,[]);
    await page.locator('#catchClose').tap();assert.equal(await page.locator('#catchCard.show').count(),0);
    return result;
  }finally{await ctx.close();}
}
(async()=>{
  const browser=await chromium.launch({headless:true});
  try{
    const sources=[['before',process.env.LANDING_BEFORE],['prior-card',process.env.CATCH_BEFORE],['after',path.resolve(__dirname,'..')]];
    for(const [version,dir] of sources){
      const server=serve(path.resolve(dir));await new Promise((r,j)=>server.once('error',j).listen(0,'127.0.0.1',r));
      const entries=[];
      try{
        for(const f of (version==='prior-card'?cases.filter(f=>f.id==='kasago'):cases)){
          const rec=await capture(browser,'http://127.0.0.1:'+server.address().port+'/nushi-tsuri/',version,f);
          entries.push(rec);fs.writeFileSync(path.join(out,version,'measured.json'),JSON.stringify(entries,null,2));
        }
      }finally{await new Promise(r=>server.close(r));}
      if(version==='prior-card')for(const sample of entries[0].result){
        assert.ok(sample.coverage.peak>=8 && sample.coverage.metal>=24,'missing unobscured baseline hook');
        assert.ok(sample.coverage.covered<2,'baseline hook should be entirely in front of the fish');
      }
      if(version==='after')for(const fish of entries){
        assert.equal(fish.fight.pose,'swim',fish.id+' must reach the lift with its side visible');
        for(const sample of [fish.fight,...fish.landing,...fish.result]){
          const info=`${fish.id} ${sample.phase}@${sample.age} ${JSON.stringify({tipJaw:sample.tipJaw,inkGap:sample.inkGap,eyeLine:sample.eyeLine})}`;
          assert.ok(sample.visible,info+' hook must be visible');
          assert.ok(sample.onScreen,info+' metal tip and eye must be inside the visible scene');
          assert.ok(sample.eyeLine<1,info+' line must finish at the hook eye');
          assert.ok(sample.entryJaw<1,info+' metal must enter at the measured lip');
          if(sample.phase==='result'){
            const c=sample.coverage;
            assert.ok(c.peak>=8 && c.metal>=24,info+' missing unobscured hook pixels: '+JSON.stringify(c));
            assert.ok(c.covered>=.10*c.metal && c.barbCovered>=2,info+' the jaw must hide the barb: '+JSON.stringify(c));
            assert.ok(c.exposed>=.10*c.metal && c.eyeExposed>=2 && c.shaftExposed>=2,info+' the eye and shaft must remain visible: '+JSON.stringify(c));
          }
          if(sample.inkGap!==null)assert.ok(sample.inkGap<1,info+' metal must touch painted fish');
        }
      }
    }
  }finally{await browser.close();}
})().catch(err=>{console.error(err);process.exitCode=1;});
