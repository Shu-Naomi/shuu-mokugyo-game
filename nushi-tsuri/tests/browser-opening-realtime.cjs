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
  let previousFinal=null;const completedSpreads=[];
  const press=q=>page.locator(q)[mobile?'tap':'click']();
  try{
   await page.goto(url,{waitUntil:'load'});await page.evaluate(()=>localStorage.setItem('nushi-inugoya-options-v1',JSON.stringify({textSpeed:'instant'})));await page.reload();
   await enter(page,mobile,{slot:1,avatar,dog:'grey',name:'直美♡'});await press('#lakeIntroNext');await press('#lakeIntroNext');
   for(const id of ['notebook','researcher','wish']){
    assert.equal(await page.locator('#lakeIntroPicture').getAttribute('data-step'),id);
    await page.waitForFunction(()=>document.querySelector('#lakeIntroPicture').dataset.artState==='ready'&&document.querySelector('#lakeIntroPicture').dataset.motion!=='loading');
    const result=await page.evaluate(async()=>{
     const api=ShuLakeIntro,canvas=document.querySelector('#lakeIntroPicture'),region=api.regionFor('diary').region;
     // Independent expected end geometry, not the renderer or exported masks.
     const paper=[[134,92],[145,81],[264,77],[307,81],[324,88],[343,81],[462,77],[504,81],[518,94],[520,281],[513,295],[334,300],[324,303],[310,297],[139,297],[132,289]];
   const hand=[[20,360],[30,332],[38,287],[46,255],[64,230],[85,216],[109,207],[119,202],[126,203],[130,210],[137,212],[143,220],[141,234],[132,253],[130,267],[139,264],[146,266],[151,273],[147,286],[140,301],[133,314],[120,330],[106,343],[99,360]];
   const outline=(ctx,points)=>{ctx.beginPath();points.forEach(([x,y],i)=>ctx[i?'lineTo':'moveTo'](x,y));ctx.closePath();};
   const mask=document.createElement('canvas');mask.width=640;mask.height=360;const maskCtx=mask.getContext('2d');outline(maskCtx,hand);maskCtx.fill();const handPixels=maskCtx.getImageData(0,0,640,360).data;
     const base=api.sourceFor('diary'),id=canvas.dataset.step;
     const spreads={notebook:{from:base,to:api.art.diarySettled},researcher:{from:api.art.diarySettled,to:api.art.diaryResearcher},wish:{from:api.art.diaryResearcher,to:api.art.diaryWish}};
     const spread=spreads[id];if(!spread?.from||!spread?.to)throw Error(`Missing expected diary spread for ${id}`);
     const selected=api.diarySpreadFor(id);
     if(selected.from!==spread.from||selected.to!==spread.to)throw Error(`Incorrect diary spread for ${id}: ${JSON.stringify(selected)}`);
     const sources=[spread.from,spread.from,spread.to],images=await Promise.all([base,...sources].map(async source=>{const im=new Image();im.src=source;await im.decode();return im;}));
     const reference=document.createElement('canvas');reference.width=canvas.width;reference.height=canvas.height;
     const ctx=reference.getContext('2d');ctx.imageSmoothingEnabled=false;
     const expected=sources.map((source,index)=>{
      const image=images[index+1];
      ctx.drawImage(images[0],0,0,reference.width,reference.height);
      if(source!==base){ctx.save();ctx.beginPath();ctx.rect(128,15,394,288);ctx.clip();ctx.save();outline(ctx,paper);ctx.clip();ctx.drawImage(image,0,0,reference.width,reference.height);ctx.restore();ctx.save();outline(ctx,hand);ctx.clip();ctx.drawImage(images[0],0,0,reference.width,reference.height);ctx.restore();ctx.restore();}
      return ctx.getImageData(0,0,reference.width,reference.height).data;
     });
     // Capture data + pose in one browser task; screenshots, IPC, and source
     // decoding cannot accidentally move a supposed middle capture to the end.
     return await new Promise((resolve,reject)=>{
      const frames=[],started=performance.now();let interval,timeout;
      function sample(){
       const model=lakeIntroPresentation.snapshot(),progress=model.pose.animation.progress;
       const index=frames.length;
       if(index===0&&progress>.08){clearInterval(interval);clearTimeout(timeout);reject(Error('Native start frame was missed'));return;}
       if(index===1&&canvas.dataset.turnPhase!=='cross')return;
       if(index===2&&!model.pose.settled)return;
       if(index>=3)return;
       const actual=canvas.getContext('2d').getImageData(0,0,canvas.width,canvas.height).data;
       let mismatched=0,changed=0,outsideChanged=0,handChanged=0,hash=2166136261;
       for(let i=0;i<actual.length;i+=4){
        let differs=false;
        for(let c=0;c<4;c++){if(actual[i+c]!==expected[index][i+c])mismatched++;if(actual[i+c]!==expected[0][i+c])differs=true;hash=Math.imul(hash^actual[i+c],16777619);}
        if(differs){changed++;const x=i/4%640,y=Math.floor(i/4/640);if(x<region[0]||x>=region[0]+region[2]||y<region[1]||y>=region[1]+region[3])outsideChanged++;if(handPixels[i+3]===255)handChanged++;}
       }
       frames.push({phase:['start','turn','completed'][index],wallMs:performance.now()-started,elapsed:model.elapsed,scheduled:model.scheduled,pose:model.pose,source:sources[index],mismatched,changed,outsideChanged,handChanged,turnPhase:canvas.dataset.turnPhase,leafEdgeX:Number(canvas.dataset.leafEdgeX),hash:hash>>>0,png:canvas.toDataURL('image/png')});
       if(frames.length===3){clearInterval(interval);clearTimeout(timeout);resolve({id,spread,clock:'native browser RAF and timers; no Playwright clock',frames});}
      }
      renderLakeIntro();interval=setInterval(sample,25);timeout=setTimeout(()=>{clearInterval(interval);reject(Error(`Native diary did not yield start/turn/completed frames: ${JSON.stringify(frames.map(({png,...rest})=>rest))}`));},6000);sample();
     });
    });
    if(previousFinal!==null)assert.ok(result.frames[0].png===previousFinal,`${prefix} ${id} must begin with the exact previous completed pixels`);
    const final=result.frames[2].png;
    for(const previous of completedSpreads)assert.ok(final!==previous,`${prefix} ${id} must reveal a distinct completed spread`);
    result.previousFinalEqualsInitial=previousFinal!==null?true:null;
    completedSpreads.push(final);previousFinal=final;result.distinctCompletedSpreads=completedSpreads.length;
    for(const frame of result.frames){
     const name=`${prefix}-${id}-${frame.phase}.png`;fs.writeFileSync(path.join(dir,name),Buffer.from(frame.png.split(',')[1],'base64'));delete frame.png;frame.file=name;
     if(frame.phase!=='turn')assert.equal(frame.mismatched,0,`${prefix} ${id} ${frame.phase} did not render the actual expected source`);
    }
    for(const frame of result.frames){assert.equal(frame.outsideChanged,0);assert.equal(frame.handChanged,0);}
    assert.ok(result.frames[1].changed>500);assert.deepEqual(result.frames.map(f=>f.turnPhase),['start','cross','settled']);
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
