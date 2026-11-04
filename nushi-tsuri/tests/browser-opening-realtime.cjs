// Fresh contexts, no page.clock installation and no injected clock/timers.
// Native RAF and wall-clock deadlines must produce real intermediate/final pixels.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const enter=require('./browser-start-adventure.cjs');
module.exports=async function realtime(browser,url,screen,dir){
 const {width,height,mobile,dpr=1}=screen,results=[];
 for(const avatar of ['boy','girl']){
  const prefix=`${width}x${height}-${avatar}-grey-native`;
  const context=await browser.newContext({viewport:{width,height},deviceScaleFactor:dpr,isMobile:mobile,hasTouch:mobile,locale:'ja-JP',serviceWorkers:'block'}),page=await context.newPage(),errors=[],httpErrors=[];
  page.on('pageerror',e=>errors.push(e.message));page.on('response',r=>{if(r.status()>=400&&r.url().startsWith(new URL(url).origin+'/nushi-tsuri/'))httpErrors.push(`${r.status()} ${r.url()}`);});
  const press=q=>page.locator(q)[mobile?'tap':'click']();
  try{
   await page.goto(url,{waitUntil:'load'});await page.evaluate(()=>localStorage.setItem('nushi-inugoya-options-v1',JSON.stringify({textSpeed:'instant'})));await page.reload();
   await enter(page,mobile,{slot:1,avatar,dog:'grey',name:'直美♡'});await press('#lakeIntroNext');await press('#lakeIntroNext');
   for(const id of ['notebook','researcher','wish']){
    assert.equal(await page.locator('#lakeIntroPicture').getAttribute('data-step'),id);
    await page.waitForFunction(()=>document.querySelector('#lakeIntroPicture').dataset.artState==='ready'&&document.querySelector('#lakeIntroPicture').dataset.motion!=='loading');
    const result=await page.evaluate(async()=>{
     const api=ShuLakeIntro,canvas=document.querySelector('#lakeIntroPicture'),region=api.regionFor('diary').region;
     const sources=[api.sourceFor('diary'),api.art.diaryTurn,api.art.diarySettled],images=await Promise.all(sources.map(async source=>{const im=new Image();im.src=source;await im.decode();return im;}));
     const reference=document.createElement('canvas');reference.width=canvas.width;reference.height=canvas.height;
     const ctx=reference.getContext('2d');ctx.imageSmoothingEnabled=false;
     const expected=images.map((image,index)=>{
      ctx.drawImage(images[0],0,0,reference.width,reference.height);
      if(index){ctx.save();ctx.beginPath();ctx.rect(...region);ctx.clip();ctx.drawImage(image,0,0,reference.width,reference.height);ctx.restore();}
      return ctx.getImageData(0,0,reference.width,reference.height).data;
     });
     // Capture data + pose in one browser task; screenshots, IPC, and source
     // decoding cannot accidentally move a supposed middle capture to the end.
     return await new Promise((resolve,reject)=>{
      const frames=[],started=performance.now();let interval,timeout;
      function sample(){
       const model=lakeIntroPresentation.snapshot(),progress=model.pose.animation.progress;
       const index=frames.length;
       if(index===0&&progress>=.18){clearInterval(interval);clearTimeout(timeout);reject(Error('Native start frame was missed'));return;}
       if(index===1&&(progress<.28||progress>=.72))return;
       if(index===2&&!model.pose.settled)return;
       if(index>=3)return;
       const actual=canvas.getContext('2d').getImageData(0,0,canvas.width,canvas.height).data;
       let mismatched=0,hash=2166136261;
       for(let i=0;i<actual.length;i++){if(actual[i]!==expected[index][i])mismatched++;hash=Math.imul(hash^actual[i],16777619);}
       frames.push({phase:['start','turn','completed'][index],wallMs:performance.now()-started,elapsed:model.elapsed,scheduled:model.scheduled,pose:model.pose,source:sources[index],mismatched,hash:hash>>>0,png:canvas.toDataURL('image/png')});
       if(frames.length===3){clearInterval(interval);clearTimeout(timeout);resolve({clock:'native browser RAF and timers; no Playwright clock',frames});}
      }
      renderLakeIntro();interval=setInterval(sample,25);timeout=setTimeout(()=>{clearInterval(interval);reject(Error(`Native diary did not yield start/turn/completed frames: ${JSON.stringify(frames.map(({png,...rest})=>rest))}`));},6000);sample();
     });
    });
    for(const frame of result.frames){
     const name=`${prefix}-${id}-${frame.phase}.png`;fs.writeFileSync(path.join(dir,name),Buffer.from(frame.png.split(',')[1],'base64'));delete frame.png;frame.file=name;
     assert.equal(frame.mismatched,0,`${prefix} ${id} ${frame.phase} did not render the actual expected source`);
    }
    assert.deepEqual(result.frames.map(f=>f.phase),['start','turn','completed']);assert.equal(new Set(result.frames.map(f=>f.hash)).size,3);
    assert.equal(result.frames[2].scheduled,false);assert.ok(result.frames[2].wallMs>=1000,'native completion must not be a synthetic immediate pose');
    await page.screenshot({path:path.join(dir,`${prefix}-${id}-completed-ui.png`)});
    results.push({avatar,dog:'grey',id,...result});if(id!=='wish')await press('#lakeIntroNext');
   }
   assert.deepEqual(errors,[]);assert.deepEqual(httpErrors,[]);console.log('STORYBOOK_NATIVE_PASS '+prefix);
  }catch(error){await page.screenshot({path:path.join(dir,`${prefix}-failure.png`)}).catch(()=>{});fs.writeFileSync(path.join(dir,`${prefix}-failure.json`),JSON.stringify({error:error.stack,errors,httpErrors},null,2));throw error;}finally{await context.close();}
 }
 return results;
};
