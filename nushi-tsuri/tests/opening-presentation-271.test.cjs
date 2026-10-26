const {test}=require('node:test'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const Intro=require('../lake-intro.js'),{boot,seed,read,saveKey}=require('./game-harness.cjs');
const saved=id=>({...seed(),dog:'grey',playerName:'直美♡',dogNames:{shuu:'こむぎ',riku:'風太',grey:'夜空'},lakeStory:{version:2,introVersion:2,introPending:true,introStep:id,introPage:0}});
function clock(){let now=0,next=1;const queued=new Map();return {now:()=>now,request:fn=>{const id=next++;queued.set(id,fn);return id;},cancel:id=>queued.delete(id),queued,
 advance(ms){now+=ms;const batch=[...queued];for(const [id,fn]of batch){queued.delete(id);fn(now);}}};}
function media(matches=false){const listeners=new Set();return {matches,listeners,addEventListener:(_,fn)=>listeners.add(fn),removeEventListener:(_,fn)=>listeners.delete(fn),change(value){this.matches=value;for(const fn of listeners)fn();}};}
const resources=w=>read(w,'({money:s.money,hp:s.hp,baits:s.baits,time:s.gameMinutes,caught:s.caught,petLife:s.petLife,dogs:s.dogAffinity,tricks:s.dogTricks,x:s.x,y:s.y,story:s.lakeStory})');

test('the sixteen page IDs, titles, speakers, text and save schema remain exactly the approved story',()=>{
 assert.equal(crypto.createHash('sha256').update(JSON.stringify(Intro.pages)).digest('hex'),'4833cb22d203047953969256c81d36d7a7f5f502df44ff3ed3d7ebc5e2f0b5ca');assert.equal(Intro.version,2);
 assert.deepEqual(Intro.progress({introVersion:2,introStep:'cling',introPage:0}),{introVersion:2,introStep:'cling',introPage:11});
});
test('each favorite leads the same three dogs from the edge, then approaches and stays next to the protagonist',()=>{
 for(const dog of ['shuu','riku','grey']){
  const s={...saved('puppies'),dog},raw=JSON.stringify(s),start=Intro.pose('puppies',0,s),end=Intro.pose('puppies',99,s);
  assert.equal(start.dogs.length,3);assert.deepEqual(new Set(start.dogs.map(d=>d.id)),new Set(['shuu','riku','grey']));assert.ok(start.dogs.every(d=>d.x>320&&d.moving));assert.ok(end.dogs.every(d=>d.x<300&&!d.moving));
  const near=[0,.25,.55,.9,2].map(t=>Intro.pose('cling',t,s)),dist=p=>Math.abs(p.dogs.find(d=>d.id===dog).x-p.player.x);
  for(let i=1;i<near.length;i++)assert.ok(dist(near[i])<=dist(near[i-1]));assert.ok(dist(near.at(-1))<22);assert.equal(near[1].dogs[0].id,dog);
  for(const id of ['care','decision','welcome']){const p=Intro.pose(id,99,s);assert.equal(p.dogs.length,3);assert.ok(dist(p)<22);}
  assert.equal(JSON.stringify(s),raw);
 }
});
test('the notebook opens and turns briefly, Sam approaches and turns, and no scene requires a long animation',()=>{
 assert.ok(Intro.pose('notebook',0).bookOpen<Intro.pose('notebook',.4).bookOpen);assert.equal(Intro.pose('notebook',2).bookOpen,1);
 assert.ok(Intro.pose('researcher',0).pageTurn>Intro.pose('researcher',.25).pageTurn);assert.equal(Intro.pose('wish',2).pageTurn,0);
 const a=Intro.pose('sam',0),b=Intro.pose('sam',2);assert.ok(a.sam.y>b.sam.y);assert.notEqual(a.sam.direction,b.sam.direction);assert.equal(b.sam.direction,'left');
 assert.ok(Intro.pose('push',1).sam.x<Intro.pose('invitation',1).sam.x);assert.equal(Intro.pose('retort',1).sam.direction,'down');
 for(const p of Intro.pages)assert.ok(Intro.pose(p,99).duration<=1.6);
});
test('one short RAF sequence paints motion then settles, without changing or saving gameplay state',()=>{
 const a=boot(saved('puppies'),undefined,{start:false}),w=a.window,c=w.document.querySelector('#lakeIntroPicture'),time=clock(),m=media(),before=resources(w),raw=w.localStorage.getItem(saveKey);
 try{const director=w.ShuLakeIntro.present(c,w.ShuLakeIntro.pages[10],read(w,'s'),{clock:time,media:m});assert.equal(time.queued.size,1);const x=director.snapshot().pose.dogs[0].x;time.advance(600);assert.ok(director.snapshot().pose.dogs[0].x<x);time.advance(2000);assert.equal(time.queued.size,0);assert.equal(c.dataset.motion,'still');assert.equal(director.snapshot().pose.settled,true);assert.deepEqual(resources(w),before);assert.equal(w.localStorage.getItem(saveKey),raw);director.cancel();assert.equal(m.listeners.size,0);assert.deepEqual(a.errors,[]);}finally{a.dispose();}
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
 try{const d=w.ShuLakeIntro.present(c,w.ShuLakeIntro.pages[11],read(w,'s'),{clock:time,media:m});assert.equal(time.queued.size,0);assert.equal(d.snapshot().pose.settled,true);assert.equal(d.snapshot().pose.dogs[0].x,154);d.cancel();
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
