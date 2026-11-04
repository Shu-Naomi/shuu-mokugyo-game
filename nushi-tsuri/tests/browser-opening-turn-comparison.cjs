// CI-only actual browser capture. Never installs page.clock or replaces RAF/timers.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const {execFileSync} = require('node:child_process');
const {chromium} = require('playwright');
const {createCanvas, loadImage} = require('@napi-rs/canvas');
const enter = require('./browser-start-adventure.cjs');
const root = path.resolve(__dirname, '..');
const dir = path.resolve(__dirname, 'opening-turn-comparison');
const baselineRef = process.env.OPENING_TURN_BASE_REF || '20141e1';
const baseline = execFileSync('git', ['show', `${baselineRef}:nushi-tsuri/lake-intro.js`], {cwd:root, encoding:'utf8'});
const screens = [{width:1280,height:720,mobile:false}, {width:844,height:390,mobile:true}, {width:820,height:366,mobile:true}];
const types = {'.html':'text/html', '.js':'text/javascript', '.css':'text/css', '.webp':'image/webp', '.png':'image/png', '.svg':'image/svg+xml'};
const server = http.createServer((req,res) => {
  try {
    const relative = new URL(req.url,'http://localhost').pathname.replace(/^\/nushi-tsuri\//,'') || 'index.html';
    const file = path.resolve(root, relative);
    if (!file.startsWith(root + path.sep) || !fs.statSync(file).isFile()) throw Error('path');
    res.writeHead(200, {'Content-Type':types[path.extname(file)] || 'application/octet-stream', 'Cache-Control':'no-store'});
    fs.createReadStream(file).pipe(res);
  } catch { res.writeHead(404); res.end(); }
});
async function contactSheet(frames, prefix) {
  const columns=4, tileWidth=320, tileHeight=200;
  const sheet=createCanvas(columns*tileWidth, Math.ceil(frames.length/columns)*tileHeight), ctx=sheet.getContext('2d');
  ctx.fillStyle='#211912';ctx.fillRect(0,0,sheet.width,sheet.height);ctx.imageSmoothingEnabled=false;
  for (let i=0;i<frames.length;i++) {
    const x=(i%columns)*tileWidth,y=Math.floor(i/columns)*tileHeight;
    ctx.drawImage(await loadImage(path.join(dir,frames[i].file)),x,y,320,180);
    ctx.fillStyle='#ffffff';ctx.font='12px sans-serif';ctx.fillText(`${frames[i].wallMs.toFixed(0)} ms | p=${frames[i].progress.toFixed(3)}`,x+4,y+195);
  }
  const file=`${prefix}-contact.png`;fs.writeFileSync(path.join(dir,file),sheet.toBuffer('image/png'));return file;
}
async function capture(browser,url,screen,avatar,version) {
  const prefix=`${screen.width}x${screen.height}-${avatar}-${version}`;
  const context=await browser.newContext({viewport:{width:screen.width,height:screen.height},deviceScaleFactor:1,isMobile:screen.mobile,hasTouch:screen.mobile,locale:'ja-JP',serviceWorkers:'block',recordVideo:{dir:path.join(dir,'raw-video'),size:{width:screen.width,height:screen.height}}});
  const page=await context.newPage(),video=page.video(),errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  if(version==='before')await page.route('**/lake-intro.js*',route=>route.fulfill({status:200,contentType:'text/javascript',body:baseline}));
  const press=q=>page.locator(q)[screen.mobile?'tap':'click']();
  try {
    await page.goto(url,{waitUntil:'load'});
    await page.evaluate(()=>localStorage.setItem('nushi-inugoya-options-v1',JSON.stringify({textSpeed:'instant'})));
    await page.reload();await enter(page,screen.mobile,{slot:1,avatar,dog:'grey',name:'直美♡'});
    await press('#lakeIntroNext');await press('#lakeIntroNext');
    await page.waitForFunction(()=>document.querySelector('#lakeIntroPicture').dataset.artState==='ready'&&document.querySelector('#lakeIntroPicture').dataset.motion!=='loading');
    assert.equal(await page.locator('#lakeIntroPicture').getAttribute('data-step'),'notebook');
    // Restart the normal presentation after assets have decoded. Sampling uses
    // native RAF alongside the normal director, not synthetic pose rendering.
    const result=await page.evaluate(async()=>{
      const canvas=document.querySelector('#lakeIntroPicture'),ctx=canvas.getContext('2d');
      const region=ShuLakeIntro.regionFor('diary').region, [rx,ry,rw,rh]=region;
      const image=new Image();image.src=ShuLakeIntro.sourceFor('diary');await image.decode();
      const base=document.createElement('canvas');base.width=640;base.height=360;
      base.getContext('2d').drawImage(image,0,0,640,360);
      const reference=base.getContext('2d').getImageData(0,0,640,360).data;
      return await new Promise((resolve,reject)=>{
        const frames=[];let last=-Infinity;const started=performance.now();
        renderLakeIntro();
        function sample(now){
          const model=lakeIntroPresentation.snapshot(),wallMs=now-started;
          if(now-last>=60||model.pose.settled){
            last=now;const pixels=ctx.getImageData(0,0,640,360).data;
            let hash=2166136261,outsideChanged=0,handChanged=0,changedPixels=0,minX=640,minY=360,maxX=-1,maxY=-1;
            for(let y=0;y<360;y++)for(let x=0;x<640;x++){
              const i=(y*640+x)*4;let changed=false;
              for(let c=0;c<4;c++){hash=Math.imul(hash^pixels[i+c],16777619);if(pixels[i+c]!==reference[i+c])changed=true;}
              if(changed){changedPixels++;minX=Math.min(minX,x);minY=Math.min(minY,y);maxX=Math.max(maxX,x);maxY=Math.max(maxY,y);if(x<rx||x>=rx+rw||y<ry||y>=ry+rh)outsideChanged++;if((x>=20&&x<=120&&y>=220)||(x>=549&&y>=211)||(x>=124&&x<=132&&y>=216&&y<=230)||(x>=138&&x<=144&&y>=270&&y<=278))handChanged++;}
            }
            frames.push({wallMs,elapsed:model.elapsed,progress:model.pose.animation.progress,settled:model.pose.settled,scheduled:model.scheduled,hash:hash>>>0,outsideChanged,handChanged,turnPhase:canvas.dataset.turnPhase||null,leafEdgeX:canvas.dataset.leafEdgeX||null,changedPixels,changedBounds:maxX<0?null:[minX,minY,maxX,maxY],png:canvas.toDataURL('image/png')});
            if(model.pose.settled){resolve({region,frames,clock:'native RAF and performance.now; no injected clock'});return;}
          }
          if(wallMs>6500){reject(Error('Native page turn did not finish within 6.5 seconds'));return;}
          requestAnimationFrame(sample);
        }
        requestAnimationFrame(sample);
      });
    });
    for(let i=0;i<result.frames.length;i++){
      const frame=result.frames[i];frame.file=`${prefix}-${String(i).padStart(2,'0')}.png`;
      fs.writeFileSync(path.join(dir,frame.file),Buffer.from(frame.png.split(',')[1],'base64'));delete frame.png;
    }
    result.contactSheet=await contactSheet(result.frames,prefix);
    result.uniqueFrames=new Set(result.frames.map(f=>f.hash)).size;
    result.errors=errors;result.version=version;result.avatar=avatar;result.screen=screen;
    await page.screenshot({path:path.join(dir,`${prefix}-settled-ui.png`)});
    await page.waitForTimeout(350);
    fs.writeFileSync(path.join(dir,`${prefix}.json`),JSON.stringify(result,null,2));
    assert.deepEqual(errors,[]);assert.ok(result.frames[0].progress<.18,'missed initial native frame');
    assert.ok(result.frames.at(-1).wallMs>=1000,'animation must use real elapsed time');
    assert.equal(result.frames.at(-1).scheduled,false);
    assert.ok(result.frames.every(f=>f.outsideChanged===0),'background outside paper region must stay pixel-identical');
    assert.ok(result.frames.every(f=>f.handChanged===0),'independent left/right hand and finger ROIs must stay pixel-identical');
    if(version==='before')assert.equal(result.uniqueFrames,3,'baseline must expose the old three held frames');
    else {
      assert.ok(result.uniqueFrames>=8,`visible motion needs >=8 actual distinct frames, got ${result.uniqueFrames}`);
      assert.ok(result.frames.some(f=>Number(f.leafEdgeX)>450),'leaf starts on right');
      assert.ok(result.frames.some(f=>Number(f.leafEdgeX)>290&&Number(f.leafEdgeX)<350),'leaf visibly crosses spine');
      assert.ok(result.frames.some(f=>Number(f.leafEdgeX)<200),'leaf travels onto left page');
      assert.equal(result.frames.at(-1).turnPhase,'settled');
    }
    return result;
  } catch(error) {
    await page.screenshot({path:path.join(dir,`${prefix}-failure.png`)}).catch(()=>{});
    fs.writeFileSync(path.join(dir,`${prefix}-failure.json`),JSON.stringify({error:error.stack,errors},null,2));
    throw error;
  } finally {
    await context.close();
    await video.saveAs(path.join(dir,`${prefix}.webm`));await video.delete();
  }
}
(async()=>{
  fs.mkdirSync(dir,{recursive:true});
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  let browser;const comparisons=[];
  try {
    browser=await chromium.launch({headless:true});
    const url=`http://127.0.0.1:${server.address().port}/nushi-tsuri/`;
    for(const screen of screens)for(const avatar of ['boy','girl']){
      const before=await capture(browser,url,screen,avatar,'before');
      const after=await capture(browser,url,screen,avatar,'after');
      const oldHashes=new Set(before.frames.map(f=>f.hash));
      const novelFrames=after.frames.filter(f=>!oldHashes.has(f.hash)).length;
      assert.ok(novelFrames>=5,'after must show a different trajectory, not repeat the old stills');
      comparisons.push({screen,avatar,beforeUnique:before.uniqueFrames,afterUnique:after.uniqueFrames,novelFrames,beforeVideo:`${screen.width}x${screen.height}-${avatar}-before.webm`,afterVideo:`${screen.width}x${screen.height}-${avatar}-after.webm`,protectedPixelsUnchanged:true});
      fs.writeFileSync(path.join(dir,'comparison.json'),JSON.stringify({baselineRef,currentRef:execFileSync('git',['rev-parse','HEAD'],{cwd:root,encoding:'utf8'}).trim(),capture:'actual native-RAF browser video and sampled canvas frames',visualReview:'pending independent human/agent review; pixel tests are not aesthetic signoff',comparisons},null,2));
      console.log('OPENING_TURN_COMPARISON_PASS',screen.width,screen.height,avatar,JSON.stringify(comparisons.at(-1)));
    }
  } finally {if(browser)await browser.close();await new Promise(resolve=>server.close(resolve));}
})().catch(error=>{console.error(error);process.exitCode=1;});
