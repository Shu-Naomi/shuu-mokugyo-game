// Supplemental evidence for user-reported opening problems. These checks prove
// frame selection/cancellation, not the semantic quality of a painted picture.
// The generated review sheet deliberately requires a separate visual signoff.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const diaryIds=['notebook','researcher','wish'];
const reviewIds=['sam','invitation','refusal','push','retort','puppies','cling','care','decision','welcome'];
module.exports=function feedback({page,dir,prefix,ready,next,press,go}){
 const captures=[],diarySequence=[];
 const snapshot=()=>page.evaluate(()=>lakeIntroPresentation.snapshot());
 async function capture(name,{existingUiFile=null}={}){
  const file=`${prefix}-${name}-canvas.png`,uiFile=existingUiFile||`${prefix}-${name}-ui.png`;
  const result=await page.locator('#lakeIntroPicture').evaluate(canvas=>({png:canvas.toDataURL('image/png'),dataset:{...canvas.dataset},pose:lakeIntroPresentation.snapshot().pose}));
  fs.writeFileSync(path.join(dir,file),Buffer.from(result.png.split(',')[1],'base64'));
  if(existingUiFile)assert.ok(fs.existsSync(path.join(dir,existingUiFile)),`missing existing UI evidence ${existingUiFile}`);
  else await page.screenshot({path:path.join(dir,uiFile)});
  const record={name,file,uiFile,dataset:result.dataset,pose:result.pose};captures.push(record);return record;
 }
 async function compareDiaryFrame(frame){
  // Decode independent reference sources and compare actual rendered pixels.
  // Never call ShuLakeIntro.paint to create the expected image: that would hide
  // renderer regressions by asking the same implementation to verify itself.
  const result=await page.locator('#lakeIntroPicture').evaluate(async(canvas,frame)=>{
   const api=ShuLakeIntro,region=api.regionFor('diary').region,base=api.sourceFor('diary');
   const id=canvas.dataset.step;
   const spreads={notebook:{from:base,to:api.art.diarySettled},researcher:{from:api.art.diarySettled,to:api.art.diaryResearcher},wish:{from:api.art.diaryResearcher,to:api.art.diaryWish}};
   const spread=spreads[id];if(!spread?.from||!spread?.to)throw Error(`Missing expected diary spread for ${id}`);
   const selected=api.diarySpreadFor(id);
   if(selected.from!==spread.from||selected.to!==spread.to)throw Error(`Incorrect diary spread for ${id}: ${JSON.stringify(selected)}`);
   const source=frame==='completed'?spread.to:spread.from;
   // Independent geometry, deliberately not read from the renderer exports.
   const paper=[[134,92],[145,81],[264,77],[307,81],[324,88],[343,81],[462,77],[504,81],[518,94],[520,281],[513,295],[334,300],[324,303],[310,297],[139,297],[132,289]];
   const hand=[[20,360],[30,332],[38,287],[46,255],[64,230],[85,216],[109,207],[119,202],[126,203],[130,210],[137,212],[143,220],[141,234],[132,253],[130,267],[139,264],[146,266],[151,273],[147,286],[140,301],[133,314],[120,330],[106,343],[99,360]];
   const outline=(ctx,points)=>{ctx.beginPath();points.forEach(([x,y],i)=>ctx[i?'lineTo':'moveTo'](x,y));ctx.closePath();};
   const mask=document.createElement('canvas');mask.width=640;mask.height=360;const maskCtx=mask.getContext('2d');outline(maskCtx,hand);maskCtx.fill();const handPixels=maskCtx.getImageData(0,0,640,360).data;
   const load=async src=>{const image=new Image();image.src=src;await image.decode();return image;};
   const expected=document.createElement('canvas');expected.width=canvas.width;expected.height=canvas.height;
   const ctx=expected.getContext('2d');ctx.imageSmoothingEnabled=false;
   const first=await load(base);
   const compose=async source=>{
    ctx.drawImage(first,0,0,expected.width,expected.height);
    if(source!==base){
     ctx.save();ctx.beginPath();ctx.rect(128,15,394,288);ctx.clip();
     const image=await load(source);ctx.save();outline(ctx,paper);ctx.clip();
     ctx.drawImage(image,0,0,expected.width,expected.height);ctx.restore();
     ctx.save();outline(ctx,hand);ctx.clip();ctx.drawImage(first,0,0,expected.width,expected.height);ctx.restore();
     ctx.restore();
    }
    return ctx.getImageData(0,0,expected.width,expected.height).data;
   };
   const initial=await compose(spread.from);
   await compose(source);
   const actual=canvas.getContext('2d').getImageData(0,0,canvas.width,canvas.height).data;
   const reference=ctx.getImageData(0,0,expected.width,expected.height).data;
   let mismatched=0,changed=0,outsideChanged=0,handChanged=0,hash=2166136261;
   const [x,y,w,h]=region;
   for(let i=0;i<actual.length;i+=4){
    if(actual[i]!==reference[i]||actual[i+1]!==reference[i+1]||actual[i+2]!==reference[i+2]||actual[i+3]!==reference[i+3])mismatched++;
    if(actual[i]!==initial[i]||actual[i+1]!==initial[i+1]||actual[i+2]!==initial[i+2]||actual[i+3]!==initial[i+3]){
     changed++;if(handPixels[i+3]===255)handChanged++;const px=i/4%canvas.width,py=Math.floor(i/4/canvas.width);
     if(px<x||px>=x+w||py<y||py>=y+h)outsideChanged++;
    }
    for(let c=0;c<4;c++)hash=Math.imul(hash^actual[i+c],16777619);
   }
   return {id,frame,source,spread,region,mismatched,changed,outsideChanged,handChanged,turnPhase:canvas.dataset.turnPhase,leafEdgeX:Number(canvas.dataset.leafEdgeX),hash:hash>>>0};
  },frame);
  if(frame!=='turn')assert.equal(result.mismatched,0,`${prefix}: actual ${frame} pixels do not match the independently decoded source: ${JSON.stringify(result)}`);
  assert.equal(result.outsideChanged,0,'diary motion must leave hands, binding and table outside its region unchanged');
  assert.equal(result.handChanged,0,'foreground hand polygon must remain unchanged');
  if(frame==='turn'){assert.ok(result.changed>500);assert.ok(['rise','cross','settle'].includes(result.turnPhase));}
  else assert.equal(result.turnPhase,frame==='start'?'start':'settled');
  if(frame!=='start')assert.ok(result.changed>0,`${frame} must be a genuinely different image`);
  return result;
 }
 async function reset(){
  // All sources are already decoded. Restart the real UI director at elapsed=0
  // rather than painting a synthetic pose or assuming ready() ended at zero.
  await ready();await page.evaluate(()=>renderLakeIntro());await ready();
  const model=await snapshot();assert.equal(model.elapsed,0);assert.equal(model.scheduled,true);return model.pose.duration;
 }
 async function diary(id){
  assert.ok(diaryIds.includes(id));const duration=await reset(),frames=[];
  frames.push(await compareDiaryFrame('start'));const initial=await page.locator('#lakeIntroPicture').evaluate(c=>c.toDataURL());
  const previous=diarySequence.at(-1);
  if(previous){assert.equal(id,diaryIds[diaryIds.indexOf(previous.id)+1]);assert.ok(initial===previous.final,'next diary stage must begin with the exact previous completed pixels');}
  await capture(`${id}-00-start`);
  await page.clock.runFor(Math.ceil(duration*450));
  let model=await snapshot();assert.equal(model.pose.settled,false);assert.ok(model.elapsed>0&&model.elapsed<duration);
  frames.push(await compareDiaryFrame('turn'));await capture(`${id}-01-turn`);
  await page.clock.runFor(Math.ceil(duration*1000)+200);
  model=await snapshot();assert.equal(model.pose.settled,true);assert.equal(model.scheduled,false);
  frames.push(await compareDiaryFrame('completed'));await capture(`${id}-02-completed`);
  const final=await page.locator('#lakeIntroPicture').evaluate(c=>c.toDataURL());
  for(const previous of diarySequence)assert.ok(final!==previous.final,`${id} must finish on a new diary spread, not repeat ${previous.id}`);
  diarySequence.push({id,final});
  assert.equal(new Set(frames.map(f=>f.hash)).size,3,'start, raised leaf, and completed page must be distinct actual rendered frames');
  await page.clock.runFor(1600);const held=await compareDiaryFrame('completed');assert.equal(held.hash,frames[2].hash,'final notebook artwork must stay completed');
  return {id,frames,stable:true,previousFinalEqualsInitial:previous?true:null,distinctCompletedSpreads:diarySequence.length};
 }
 async function transitions(){
  await go('notebook');let duration=await reset();await page.clock.runFor(Math.ceil(duration*450));await compareDiaryFrame('turn');
  await capture('notebook-before-next');await next();assert.equal(await page.locator('#lakeIntroPicture').getAttribute('data-step'),'researcher');
  await ready();await page.clock.runFor(2200);await compareDiaryFrame('completed');await capture('researcher-after-interrupted-next');
  await press('#lakeIntroPrevious');duration=await reset();await page.clock.runFor(Math.ceil(duration*450));await compareDiaryFrame('turn');
  await page.emulateMedia({reducedMotion:'reduce'});await page.clock.runFor(120);
  const reduced=await compareDiaryFrame('completed');assert.equal((await snapshot()).scheduled,false);await capture('notebook-reduced-motion-completed');
  await page.emulateMedia({reducedMotion:'no-preference'});await page.clock.runFor(1600);
  assert.equal((await compareDiaryFrame('completed')).hash,reduced.hash,'removing reduced motion must not resurrect the raised leaf');
  duration=await reset();await page.clock.runFor(Math.ceil(duration*450));await compareDiaryFrame('turn');
  await page.evaluate(()=>window.interruptedDiary=lakeIntroPresentation);await press('#lakeIntroPrevious');assert.equal(await page.locator('#lakeIntroPicture').getAttribute('data-step'),'memory');
  assert.equal(await page.evaluate(()=>interruptedDiary.snapshot().active),false);
  await ready();await page.clock.runFor(2200);await capture('memory-after-interrupted-back');
  const before=await page.locator('#lakeIntroPicture').evaluate(c=>c.toDataURL());await page.clock.runFor(2200);
  assert.equal(await page.locator('#lakeIntroPicture').evaluate(c=>c.toDataURL()),before,'cancelled notebook deadline must not repaint the previous page');
  await press('#lakeIntroPrevious');assert.equal(await page.locator('#lakeIntroPicture').getAttribute('data-step'),'arrival');
  return {nextWhileRaised:true,backWhileRaised:true,reducedMotionCompletedPixels:true};
 }
 function writeReview({diaryMotionChecked=true}={}){
  const report={automatedFrameChecks:diaryMotionChecked?'passed':'not repeated for this cast; detailed diary motion is checked for both avatars with Grey at 1280x720 and 820x366, and native-clock diary motion covers both avatars on all four screens',visualSignoff:'required; not inferred from settled, timers, hashes or source identity',criteria:[
   'Sam/invitation: the tabletop book reads toward the seated protagonist, not toward the camera.',
   'Notebook/researcher/wish: compare start, raised turn and completed frames. The completed image must visibly lie flat without an upright leaf or clipped seam. Each stage must reveal different diary content, and each following stage must start on the previous completed spread.',
   'Refusal/retort: the protagonist looks hesitant or mildly exasperated, not like the same cheerful smile; compare the face with invitation and later warmer dialogue.',
   'Retort to puppies: the text introduces small footsteps before identifying the three dogs, and the doorway staging makes the transition legible.',
   'Both protagonist avatars and all three selected companions retain their correct identity and look natural at the target viewport.'
  ],captures};
  fs.writeFileSync(path.join(dir,`${prefix}-visual-review.json`),JSON.stringify(report,null,2));
  const escape=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  fs.writeFileSync(path.join(dir,`${prefix}-visual-review.html`),`<!doctype html><meta charset="utf-8"><title>Opening feedback visual review: ${escape(prefix)}</title><style>body{font:16px system-ui;background:#211912;color:#fff;margin:24px}section{margin:30px 0}img{width:min(100%,960px);image-rendering:pixelated}a{color:#bde0ff}code{white-space:pre-wrap}</style><h1>${escape(prefix)}</h1><p>Automated frame checks passed. Visual signoff still required. A finished timer does not prove flat paper or an appropriate expression.</p><ol>${report.criteria.map(c=>`<li>${escape(c)}</li>`).join('')}</ol>${captures.map(c=>`<section><h2>${escape(c.name)}</h2><a href="${escape(c.uiFile)}">Full browser view with dialogue</a><br><img loading="lazy" src="${escape(c.file)}" alt="${escape(c.name)}"><p>Step ${escape(c.pose.id)}, elapsed ${c.pose.elapsed}/${c.pose.duration}, panel ${escape(c.pose.panel)}</p></section>`).join('')}`);
  return report;
 }
 return {diary,transitions,capture,compareDiaryFrame,writeReview,diaryIds,reviewIds};
};

// Repeat expensive mocked-clock animation/cancellation only on a desktop and
// the smallest landscape phone. The original 384 settled cases and all native
// clock sequences still run, as do expression/companion captures for every cast.
module.exports.coversDiaryMotion=({width,height},dog)=>dog==='grey'&&((width===1280&&height===720)||(width===820&&height===366));
