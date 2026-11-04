const {test}=require('node:test'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const Intro=require('../lake-intro.js'),{boot,seed,read,saveKey}=require('./game-harness.cjs');
const saved=id=>({...seed(),dog:'grey',playerName:'直美♡',dogNames:{shuu:'こむぎ',riku:'風太',grey:'夜空'},lakeStory:{version:2,introVersion:2,introPending:true,introStep:id,introPage:0}});
function clock(){let now=0,next=1;const queued=new Map();return {now:()=>now,request:fn=>{const id=next++;queued.set(id,fn);return id;},cancel:id=>queued.delete(id),queued,
 advance(ms){now+=ms;const batch=[...queued];for(const [id,fn]of batch){queued.delete(id);fn(now);}}};}
function media(matches=false){const listeners=new Set();return {matches,listeners,addEventListener:(_,fn)=>listeners.add(fn),removeEventListener:(_,fn)=>listeners.delete(fn),change(value){this.matches=value;for(const fn of listeners)fn();}};}
const resources=w=>read(w,'({money:s.money,hp:s.hp,baits:s.baits,time:s.gameMinutes,caught:s.caught,petLife:s.petLife,dogs:s.dogAffinity,tricks:s.dogTricks,x:s.x,y:s.y,story:s.lakeStory})');

test('only the requested footsteps setup changes; all other dialogue and save identifiers remain unchanged',()=>{
 const puppies=Intro.pages.find(page=>page.id==='puppies');assert.equal(puppies.title,'戸口からの足音');
 assert.equal(puppies.paragraphs[0],'戸口の方から、小さな足音が重なって聞こえた。祖父が世話をしていた三匹だ。');
 const original=JSON.parse(JSON.stringify(Intro.pages));original.find(page=>page.id==='puppies').title='廊下からの足音';original.find(page=>page.id==='puppies').paragraphs[0]='足音の主は、祖父が世話をしていた三匹。';
 assert.equal(crypto.createHash('sha256').update(JSON.stringify(original)).digest('hex'),'4833cb22d203047953969256c81d36d7a7f5f502df44ff3ed3d7ebc5e2f0b5ca','unrelated story changes need explicit review');
 assert.equal(Intro.version,2);
 assert.deepEqual(Intro.progress({introVersion:2,introStep:'cling',introPage:0}),{introVersion:2,introStep:'cling',introPage:11});
});
test('each avatar and companion keeps its identity through every still composition',()=>{
 for(const avatar of ['boy','girl'])for(const dog of ['shuu','riku','grey']){
  const state={...saved('puppies'),avatar,dog},raw=JSON.stringify(state);
  for(const page of Intro.pages){
   const model=Intro.pose(page,99,state);
   assert.equal(model.id,page.id);assert.equal(model.avatar,avatar);assert.equal(model.favorite,dog);
   assert.equal(typeof model.panel,'string');assert.ok(model.panel.length);assert.equal(model.settled,true);
  }
  assert.notEqual(Intro.pose('sam',99,state).panel,Intro.pose('refusal',99,state).panel);
  assert.notEqual(Intro.pose('retort',99,state).panel,Intro.pose('puppies',99,state).panel);
  assert.notEqual(Intro.pose('puppies',99,state).panel,Intro.pose('cling',99,state).panel);
  assert.equal(JSON.stringify(state),raw);
 }
});
test('one bounded local animation settles quickly without moving the entire scene',()=>{
 for(const page of Intro.pages){
  const start=Intro.pose(page,0),end=Intro.pose(page,99);
  assert.equal(start.panel,end.panel);assert.ok(end.duration>0&&end.duration<=2);
  assert.equal(end.elapsed,end.duration);assert.equal(end.settled,true);
  if(start.animation?.region){
   const [x,y,w,h]=start.animation.region;
   assert.ok(x>=0&&y>=0&&w>0&&h>0&&x+w<=640&&y+h<=360,JSON.stringify(start));
   assert.ok(w*h<640*360/2,'animation must be limited to one area');
  }
 }
});
test('one short RAF sequence paints motion then settles, without changing or saving gameplay state',()=>{
 const a=boot(saved('puppies'),undefined,{start:false}),w=a.window,c=w.document.querySelector('#lakeIntroPicture'),time=clock(),m=media(),before=resources(w),raw=w.localStorage.getItem(saveKey);
 try{const director=w.ShuLakeIntro.present(c,w.ShuLakeIntro.pages[10],read(w,'s'),{clock:time,media:m});assert.equal(time.queued.size,1);const elapsed=director.snapshot().elapsed;time.advance(600);assert.ok(director.snapshot().elapsed>elapsed);time.advance(2000);assert.equal(time.queued.size,0);assert.equal(c.dataset.motion,'still');assert.equal(director.snapshot().pose.settled,true);assert.deepEqual(resources(w),before);assert.equal(w.localStorage.getItem(saveKey),raw);director.cancel();assert.equal(m.listeners.size,0);assert.deepEqual(a.errors,[]);}finally{a.dispose();}
});
test('cancelling mid-motion discards scheduled and already-delivered late frames',()=>{
 const a=boot(saved('cling'),undefined,{start:false}),w=a.window,c=w.document.querySelector('#lakeIntroPicture'),time=clock();let draws=0;
 try{c.getContext('2d').drawImage=()=>draws++;const d=w.ShuLakeIntro.present(c,w.ShuLakeIntro.pages[11],read(w,'s'),{clock:time,media:media()});const late=[...time.queued.values()][0];time.advance(240);d.cancel();const count=draws;assert.equal(time.queued.size,0);late(1000);time.advance(4000);assert.equal(draws,count);assert.equal(d.snapshot().active,false);assert.equal(c.dataset.motion,'stopped');assert.deepEqual(a.errors,[]);}finally{a.dispose();}
});
test('a late image decode cannot draw over another page or a skipped scene',()=>{
 const a=boot(saved('puppies'),undefined,{start:false}),w=a.window,c=w.document.querySelector('#lakeIntroPicture'),time=clock(),pending=[];
 try{w.Image=function(){this.complete=false;this.naturalWidth=0;this.naturalHeight=0;pending.push(this);};const d=w.ShuLakeIntro.present(c,w.ShuLakeIntro.pages[10],read(w,'s'),{clock:time,media:media()});assert.equal(time.queued.size,0);assert.equal(c.dataset.motion,'loading');const late=pending.map(im=>im.onload).filter(Boolean);d.cancel();let draws=0;c.getContext('2d').drawImage=()=>draws++;
  for(const im of pending){assert.equal(im.onload,null);im.complete=true;im.naturalWidth=1280;im.naturalHeight=960;}for(const fn of late)fn();assert.equal(draws,0);assert.equal(time.queued.size,0);assert.deepEqual(a.errors,[]);
 }finally{a.dispose();}
});
test('reduced motion shows the completed composition; preference changes stop without restarting it',()=>{
 const a=boot(saved('cling'),undefined,{start:false}),w=a.window,c=w.document.querySelector('#lakeIntroPicture'),time=clock(),m=media(true);
 try{const d=w.ShuLakeIntro.present(c,w.ShuLakeIntro.pages[11],read(w,'s'),{clock:time,media:m});assert.equal(time.queued.size,0);assert.equal(d.snapshot().pose.settled,true);assert.equal(d.snapshot().elapsed,d.snapshot().pose.duration);d.cancel();
  m.matches=false;const next=w.ShuLakeIntro.present(c,w.ShuLakeIntro.pages[10],read(w,'s'),{clock:time,media:m});assert.equal(time.queued.size,1);m.change(true);assert.equal(time.queued.size,0);m.change(false);assert.equal(time.queued.size,0);assert.equal(next.snapshot().pose.settled,true);next.cancel();assert.equal(m.listeners.size,0);assert.deepEqual(a.errors,[]);
 }finally{a.dispose();}
});
test('backgrounding stops animation, returning shows the final pose and leaves progress intact',()=>{
 const a=boot(saved('cling'),undefined,{start:false}),w=a.window,c=w.document.querySelector('#lakeIntroPicture'),time=clock();
 try{const before=resources(w),d=w.ShuLakeIntro.present(c,w.ShuLakeIntro.pages[11],read(w,'s'),{clock:time,media:media()});Object.defineProperty(w.document,'hidden',{configurable:true,value:true});w.document.dispatchEvent(new w.Event('visibilitychange'));assert.equal(time.queued.size,0);Object.defineProperty(w.document,'hidden',{configurable:true,value:false});w.document.dispatchEvent(new w.Event('visibilitychange'));assert.equal(d.snapshot().pose.settled,true);assert.equal(time.queued.size,0);assert.deepEqual(resources(w),before);d.cancel();assert.deepEqual(a.errors,[]);}finally{a.dispose();}
});
test('page changes and skipping cancel the old sequence, restore field input, and retain the empty-bait safety guard',()=>{
 const a=boot(saved('puppies'),undefined,{keepIntro:true}),w=a.window;
 try{const first=w.eval('lakeIntroPresentation');w.document.querySelector('#lakeIntroNext').click();assert.equal(first.snapshot().active,false);assert.equal(w.document.querySelector('#lakeIntroTitle').textContent,'小さなぬくもり');const next=w.eval('lakeIntroPresentation');w.document.querySelector('#lakeIntroSkip').click();assert.equal(next.snapshot().active,false);assert.equal(w.eval('lakeIntroPresentation'),null);assert.equal(w.document.querySelector('.controls').inert,false);
  w.eval('s.dogFollowing=false;s.money=1000;for(const id of Object.keys(s.baits))s.baits[id]=0;s.lures.silverSpoon=0;cast()');assert.equal(read(w,'battle'),null);assert.equal(w.document.querySelector('#fishScene').classList.contains('active'),false);assert.match(w.document.querySelector('#rescueToast').textContent,/餌がないため/);assert.deepEqual(a.errors,[]);
 }finally{a.dispose();}
});
test('paint changes only its local region and settles into a stable still or the next diary page',()=>{
 const {createCanvas}=require('@napi-rs/canvas'),previous=global.Image;
 global.Image=function(){const image=createCanvas(640,360),context=image.getContext('2d');
  Object.defineProperty(image,'src',{set(source){
   // The curled-leaf painting is a genuinely different input, as in production.
   // Keep every source deterministic so final-pose equality remains strict.
   const offset=source===Intro.art.diaryTurn?47:source===Intro.art.diarySettled?93:0;
   for(let y=0;y<360;y++){context.fillStyle=`rgb(${(y+offset)%255},${(y*7+offset)%255},${(y*13+offset)%255})`;context.fillRect(0,y,640,1);}
  }});
  Object.assign(image,{complete:true,naturalWidth:640,naturalHeight:360});return image;
 };
 try{for(const id of ['arrival','memory','notebook','sam','refusal','retort','puppies','cling']){
  const canvas=createCanvas(640,360);canvas.dataset={};const state={avatar:'girl',dog:'grey'},start=Intro.pose(id,0,state),middle=Intro.pose(id,start.duration/2,state),end=Intro.pose(id,99,state),ctx=canvas.getContext('2d');
  Intro.paint(canvas,id,()=>{},state,start);const first=ctx.getImageData(0,0,640,360).data;
  const [x,y,w,h]=middle.animation.region;
  function localChanges(after,label){let changed=0;
   for(let i=0;i<first.length;i+=4)if(first[i]!==after[i]||first[i+1]!==after[i+1]||first[i+2]!==after[i+2]||first[i+3]!==after[i+3]){
    const px=(i/4)%640,py=Math.floor(i/4/640);assert.ok(px>=x&&px<x+w&&py>=y&&py<y+h,`${id} ${label} changed outside its local region at ${px},${py}`);changed++;
   }
   return changed;
  }
  Intro.paint(canvas,id,()=>{},state,middle);const animated=ctx.getImageData(0,0,640,360).data;
  assert.ok(localChanges(animated,'middle')>0,`${id} has no localized motion`);
  Intro.paint(canvas,id,()=>{},state,end);const final=ctx.getImageData(0,0,640,360).data;
  if(id==='notebook'){
   assert.ok(localChanges(final,'final')>0,'diary must settle on the next page, not return to the first');
   for(const [fraction,expected]of [[.2,animated],[.8,final]]){
    Intro.paint(canvas,id,()=>{},state,Intro.pose(id,start.duration*fraction,state));
    assert.deepEqual(ctx.getImageData(0,0,640,360).data,expected,'held pixel-art poses must not dissolve into doubled ink');
   }
  }
  else assert.deepEqual(final,first);
  Intro.paint(canvas,id,()=>{},state,end);assert.deepEqual(ctx.getImageData(0,0,640,360).data,final,'repainting the final still must be stable');
 }}finally{global.Image=previous;}
});

test('notebook animation waits for all three paintings in every decode order',()=>{
 const permutations=[[0,1,2],[0,2,1],[1,0,2],[1,2,0],[2,0,1],[2,1,0]];
 for(const permutation of permutations){
  const a=boot(saved('notebook'),undefined,{start:false}),w=a.window,c=w.document.querySelector('#lakeIntroPicture'),time=clock(),pending=[];
  try{
   w.Image=function(){this.complete=false;this.naturalWidth=0;this.naturalHeight=0;pending.push(this);};
   const d=w.ShuLakeIntro.present(c,w.ShuLakeIntro.pages[2],read(w,'s'),{clock:time,media:media()});
   const sources=[Intro.sourceFor('diary'),Intro.art.diaryTurn,Intro.art.diarySettled];
   assert.equal(pending.length,3);assert.deepEqual(new Set(pending.map(im=>im.src)),new Set(sources));
   const order=permutation.map(index=>pending.find(im=>im.src===sources[index]));
   const decode=im=>{Object.assign(im,{complete:true,naturalWidth:640,naturalHeight:360});im.onload();};
   assert.equal(time.queued.size,0);
   for(const im of order.slice(0,2)){
    decode(im);time.advance(3000);
    assert.equal(time.queued.size,0,`started early for decode order ${permutation}`);assert.equal(d.snapshot().elapsed,0);assert.equal(c.dataset.motion,'loading');
   }
   decode(order[2]);assert.equal(time.queued.size,1);assert.equal(d.snapshot().elapsed,0);
   time.advance(600);assert.ok(d.snapshot().elapsed>0);assert.equal(c.dataset.motion,'running');
   time.advance(2000);assert.equal(time.queued.size,0);assert.equal(d.snapshot().pose.settled,true);assert.equal(c.dataset.motion,'still');
   d.cancel();assert.deepEqual(a.errors,[]);
  }finally{a.dispose();}
 }
});

// Independent deadline doubles deliberately do not deliver RAF. The old tests
// always advanced RAF successfully and could not catch a stranded raised leaf.
function deadlines(){let id=0;const pending=new Map();return {pending,
 set(fn,ms){const token=++id;pending.set(token,{fn,ms});return token;},
 clear(token){pending.delete(token);},
 fire(){const work=[...pending.values()];pending.clear();for(const item of work)item.fn();}
};}
function paintedSources(canvas){const sources=[];canvas.getContext('2d').drawImage=image=>sources.push(image.src);return sources;}
test('every diary page reaches the completed source even when RAF stops after the raised frame',()=>{
 for(const id of ['notebook','researcher','wish']){
  const a=boot(saved(id),undefined,{start:false}),w=a.window,c=w.document.querySelector('#lakeIntroPicture'),time=clock(),timers=deadlines(),m=media(),sources=paintedSources(c);
  try{
   const before=resources(w),raw=w.localStorage.getItem(saveKey);
   const d=w.ShuLakeIntro.present(c,id,read(w,'s'),{clock:time,timers,media:m});
   assert.equal(timers.pending.size,1);assert.equal([...timers.pending.values()][0].ms,d.snapshot().pose.duration*1000);
   time.advance(550);assert.equal(sources.at(-1),w.ShuLakeIntro.art.diaryTurn);assert.equal(d.snapshot().pose.settled,false);
   // No more animation-frame callbacks are delivered, only the deadline.
   timers.fire();assert.equal(sources.at(-1),w.ShuLakeIntro.art.diarySettled,'deadline must actually paint completed artwork, not only set a state flag');
   assert.equal(c.dataset.motion,'still');assert.equal(d.snapshot().pose.settled,true);assert.equal(time.queued.size,0);assert.equal(timers.pending.size,0);
   const count=sources.length;time.advance(5000);assert.equal(sources.length,count);assert.deepEqual(resources(w),before);assert.equal(w.localStorage.getItem(saveKey),raw);
   d.cancel();assert.deepEqual(a.errors,[]);
  }finally{a.dispose();}
 }
});
test('normal RAF completion clears the deadline; cached diary pages start independent cancellable deadlines',()=>{
 const a=boot(saved('notebook'),undefined,{start:false}),w=a.window,c=w.document.querySelector('#lakeIntroPicture'),time=clock(),timers=deadlines();
 try{
  let d=w.ShuLakeIntro.present(c,'notebook',read(w,'s'),{clock:time,timers,media:media()});
  assert.equal(timers.pending.size,1);time.advance(2000);assert.equal(timers.pending.size,0);d.cancel();
  for(const id of ['researcher','wish','notebook']){
   d=w.ShuLakeIntro.present(c,id,read(w,'s'),{clock:time,timers,media:media()});
   assert.equal(timers.pending.size,1);assert.equal(d.snapshot().elapsed,0);assert.equal(time.queued.size,1);
   time.advance(550);const late=[...timers.pending.values()][0].fn;d.cancel();
   assert.equal(timers.pending.size,0);assert.equal(time.queued.size,0);const sources=paintedSources(c);
   late();assert.equal(sources.length,0,'an already-delivered timeout callback cannot repaint a cancelled page');
  }
  assert.deepEqual(a.errors,[]);
 }finally{a.dispose();}
});
test('diary deadline waits for all image decodes and arms only once, including repeated decode callbacks',()=>{
 for(const order of [[0,1,2],[0,2,1],[1,0,2],[1,2,0],[2,0,1],[2,1,0]]){
  const a=boot(saved('notebook'),undefined,{start:false}),w=a.window,c=w.document.querySelector('#lakeIntroPicture'),time=clock(),timers=deadlines(),pending=[];
  try{
   w.Image=function(){this.complete=false;this.naturalWidth=0;this.naturalHeight=0;pending.push(this);};
   const d=w.ShuLakeIntro.present(c,'notebook',read(w,'s'),{clock:time,timers,media:media()});
   const names=[w.ShuLakeIntro.sourceFor('diary'),w.ShuLakeIntro.art.diaryTurn,w.ShuLakeIntro.art.diarySettled];
   const images=order.map(i=>pending.find(im=>im.src===names[i]));
   assert.equal(timers.pending.size,0);
   for(const image of images.slice(0,2)){
    Object.assign(image,{complete:true,naturalWidth:640,naturalHeight:360});image.onload();time.advance(3000);
    assert.equal(timers.pending.size,0);assert.equal(d.snapshot().elapsed,0);
   }
   const last=images[2];Object.assign(last,{complete:true,naturalWidth:640,naturalHeight:360});last.onload();
   assert.equal(timers.pending.size,1);const token=[...timers.pending.keys()][0];
   for(const image of images)image.onload();assert.equal(timers.pending.size,1);assert.equal([...timers.pending.keys()][0],token,'decode notifications cannot restart the completion deadline');
   const sources=paintedSources(c);timers.fire();assert.equal(sources.at(-1),w.ShuLakeIntro.art.diarySettled);assert.equal(d.snapshot().pose.settled,true);
   d.cancel();assert.deepEqual(a.errors,[]);
  }finally{a.dispose();}
 }
});
test('reduced motion and visibility interruption paint completed diary artwork without leaving deadlines behind',()=>{
 for(const mode of ['initial-reduced','changed-reduced','hidden']){
  const a=boot(saved('notebook'),undefined,{start:false}),w=a.window,c=w.document.querySelector('#lakeIntroPicture'),time=clock(),timers=deadlines(),m=media(mode==='initial-reduced'),sources=paintedSources(c);
  try{
   const d=w.ShuLakeIntro.present(c,'notebook',read(w,'s'),{clock:time,timers,media:m});
   if(mode!=='initial-reduced'){
    time.advance(550);assert.equal(sources.at(-1),w.ShuLakeIntro.art.diaryTurn);
    if(mode==='changed-reduced')m.change(true);
    else{
     Object.defineProperty(w.document,'hidden',{configurable:true,value:true});w.document.dispatchEvent(new w.Event('visibilitychange'));
     assert.equal(timers.pending.size,0);assert.equal(time.queued.size,0);
     Object.defineProperty(w.document,'hidden',{configurable:true,value:false});w.document.dispatchEvent(new w.Event('visibilitychange'));
    }
   }
   assert.equal(sources.at(-1),w.ShuLakeIntro.art.diarySettled,mode);assert.equal(timers.pending.size,0);assert.equal(time.queued.size,0);
   assert.equal(d.snapshot().pose.settled,true);const count=sources.length;m.change(false);time.advance(5000);timers.fire();assert.equal(sources.length,count);
   d.cancel();assert.deepEqual(a.errors,[]);
  }finally{a.dispose();}
 }
});

// Defensive adapter invariant: a retained callback must not undo settlement.
// Native RAF cancellation normally prevents this late delivery; these cases do
// not claim to reproduce the user's original browser freeze.
for(const mode of ['reduced-motion','deadline'])test(`retained RAF callbacks cannot repaint after ${mode} settlement`,()=>{
 for(const id of ['notebook','researcher','wish']){
  const a=boot(saved(id),undefined,{start:false}),w=a.window,c=w.document.querySelector('#lakeIntroPicture'),time=clock(),timers=deadlines(),m=media(),sources=paintedSources(c);
  try{
   const d=w.ShuLakeIntro.present(c,id,read(w,'s'),{clock:time,timers,media:m}),duration=d.snapshot().pose.duration;
   time.advance(550);assert.equal(sources.at(-1),w.ShuLakeIntro.art.diaryTurn);
   const [handle,late]=[...time.queued][0];assert.equal(typeof late,'function');
   // Simulate a clock adapter having handed the callback to another queue,
   // where cancellation cannot retract it. Keep its frame timestamp as well.
   time.queued.delete(handle);
   if(mode==='reduced-motion')m.change(true);
   else{time.advance(duration*1000-time.now());timers.fire();}
   assert.equal(sources.at(-1),w.ShuLakeIntro.art.diarySettled);
   const count=sources.length;
   for(const timestamp of mode==='reduced-motion'?[650,550,duration*1000+250]:[550,duration*1000+250]){
    late(timestamp);
    assert.equal(sources.length,count,'a retained callback must not repaint after settlement');
    assert.equal(sources.at(-1),w.ShuLakeIntro.art.diarySettled);
    assert.equal(d.snapshot().elapsed,duration);assert.equal(d.snapshot().pose.settled,true);
    assert.equal(c.dataset.motion,'still');assert.equal(d.snapshot().scheduled,false);
    assert.equal(time.queued.size,0);assert.equal(timers.pending.size,0);
   }
   m.change(false);time.advance(5000);timers.fire();assert.equal(sources.length,count);
   d.cancel();assert.deepEqual(a.errors,[]);
  }finally{a.dispose();}
 }
});
