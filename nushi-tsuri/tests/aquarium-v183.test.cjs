const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const {execFileSync}=require('node:child_process');
const P=require('../pet-life.js'),A=require('../aquarium-life.js'),Music=require('../music-tracks.js');
const {boot,seed,read,saveKey}=require('./game-harness.cjs');
const catalog=[{id:'moroko',name:'モロコ',start:750,min:100,max:1799,price:300,waterLabel:'淡水'},
 {id:'koi',name:'コイ',start:2500,min:500,max:9999,price:800,waterLabel:'淡水'},
 {id:'aji',name:'アジ',start:1000,min:500,max:4999,price:550,waterLabel:'海水'},
 {id:'nushi',name:'ヌシ',start:12000,min:10000,max:29999,price:0,waterLabel:'淡水'}];
const ids=['shuu','riku','grey'];
function state(){const s={money:100000,caught:{nushi:1,moroko:1,koi:1,aji:1},dogAffinity:{shuu:50}};P.normalize(s,catalog,ids,0);return s;}
const copy=x=>JSON.parse(JSON.stringify(x));
const click=(w,q)=>{const b=w.document.querySelector(q);assert.ok(b,q);assert.equal(b.disabled,false,q);b.click();};

test('v182 saves keep six individual tanks, sizes, feed dates, contest results and friendship through repeated migration',()=>{
 const s=state();for(let i=0;i<6;i++)P.acquire(s,'moroko',catalog,0,i);
 P.care(s,s.petLife.fish[2].uid,'feed',0,catalog);s.petLife.version=1;delete s.petLife.selectedTank;
 for(const f of s.petLife.fish)delete f.tank;
 const before=copy(s);P.normalize(s,catalog,ids,0);
 assert.deepEqual(s.petLife.fish.map(f=>f.tank),[0,1,2,3,4,5]);assert.equal(s.dogAffinity.shuu,1000);
 s.petLife.fish.forEach((f,i)=>{const {tank,...rest}=f;assert.deepEqual(rest,before.petLife.fish[i]);});
 assert.equal(s.petLife.selectedTank,5);assert.equal(s.petLife.food,9);
 const migrated=copy(s);P.normalize(s,catalog,ids,0);assert.deepEqual(s,migrated);
});

test('five fish share one tank, a sixth costs nothing, six tanks can hold thirty and water types cannot mix',()=>{
 const s=state();for(let i=0;i<5;i++)assert.equal(P.acquire(s,'moroko',catalog,0,0).ok,true);
 const before=copy(s);assert.equal(P.acquire(s,'moroko',catalog,0,0).ok,false);assert.deepEqual(s,before);
 assert.equal(P.acquire(s,'aji',catalog,0,0).ok,false);assert.equal(P.acquire(s,'aji',catalog,0,1).ok,true);
 const fish=s.petLife.fish[0];assert.equal(P.moveFish(s,fish.uid,1,catalog,0).ok,false);
 for(let t=1;t<6;t++)while(P.residents(s,t).length<5)assert.equal(P.acquire(s,t===1?'aji':'moroko',catalog,0,t).ok,true);
 assert.equal(s.petLife.fish.length,30);assert.equal(P.acquire(s,'moroko',catalog,0).ok,false);
 const saved=copy(s);P.normalize(saved,catalog,ids,0);assert.deepEqual(saved,s);
});

test('a full aquarium can rehome one ordinary fish and adopt the unique nushi without resetting other specimens',()=>{
 const s=state();for(let t=0;t<6;t++)for(let i=0;i<5;i++)P.acquire(s,'moroko',catalog,0,t);
 const saved=copy(s),uid=s.petLife.selected;assert.equal(P.acquire(s,'nushi',catalog,0,5).ok,false);
 assert.equal(P.rehome(s,uid,catalog,0).ok,true);assert.equal(s.money,saved.money);
 assert.deepEqual(s.petLife.fish,saved.petLife.fish.filter(f=>f.uid!==uid));assert.equal(P.rehome(s,uid,catalog,0).ok,false);
 const nushi=P.acquire(s,'nushi',catalog,0,5).fish;assert.ok(nushi);
 const before=copy(s);assert.equal(P.rehome(s,nushi.uid,catalog,0).ok,false);assert.deepEqual(s,before);
 P.normalize(s,catalog,ids,0);assert.equal(s.petLife.fish.length,30);assert.equal(s.petLife.nushiClaimed,true);
});

test('rehome requires confirming the selected specimen; cancel, fish changes, double clicks and reload are safe',()=>{
 const app=boot({...seed(),caught:{...seed().caught,moroko:1},money:20000,x:199,y:36}),w=app.window;let saved;
 try{
  click(w,'#action');for(let i=0;i<5;i++)click(w,'[data-pet-buy="moroko"]');click(w,'[data-pet-action="aquarium"]');
  click(w,'[data-pet-action="rehome"]');assert.equal(read(w,'s.petLife.fish.length'),5);
  click(w,'[data-pet-action="rehome-cancel"]');assert.equal(read(w,'s.petLife.fish.length'),5);
  click(w,'[data-pet-action="rehome"]');const select=w.document.querySelector('#petFishSelect');select.value=select.options[0].value;select.dispatchEvent(new w.Event('change',{bubbles:true}));
  assert.equal(w.document.querySelector('[data-pet-action="rehome-confirm"]'),null);
  const selected=read(w,'s.petLife.selected');click(w,'[data-pet-action="rehome"]');const confirm=w.document.querySelector('[data-pet-action="rehome-confirm"]');confirm.click();confirm.click();
  assert.equal(read(w,'s.petLife.fish.length'),4);assert.equal(read(w,`s.petLife.fish.some(f=>f.uid===${JSON.stringify(selected)})`),false);
  saved=JSON.parse(w.localStorage.getItem(saveKey));assert.deepEqual(app.errors,[]);
 }finally{app.dispose();}
 const reload=boot(saved);try{assert.equal(read(reload.window,'s.petLife.fish.length'),4);}finally{reload.dispose();}
});

test('group feeding charges only hungry residents, has no partial failure and grows each fish once after moving/reload',()=>{
 const s=state();for(let i=0;i<5;i++)P.acquire(s,'moroko',catalog,0,0);
 s.petLife.food=4;let before=copy(s);assert.equal(P.care(s,s.petLife.selected,'feed',0,catalog).ok,false);assert.deepEqual(s,before);
 s.petLife.food=10;let r=P.care(s,s.petLife.selected,'feed',0,catalog);assert.equal(r.fed.length,5);assert.equal(s.petLife.food,5);
 assert.equal(P.care(s,s.petLife.selected,'feed',0,catalog).ok,false);
 const f=s.petLife.fish[0];P.moveFish(s,f.uid,1,catalog,0);assert.equal(P.care(s,f.uid,'feed',0,catalog).ok,false);
 const newcomer=P.acquire(s,'koi',catalog,0,1).fish;assert.equal(P.care(s,f.uid,'feed',0,catalog).fed.length,1);assert.equal(s.petLife.food,4);
 P.normalize(s,catalog,ids,0);P.sync(s,catalog,1);for(const fish of s.petLife.fish)assert.equal(fish.length,fish.bornSize+10);
 P.sync(s,catalog,1);assert.equal(s.petLife.fish.find(f=>f.uid===newcomer.uid).length,2510);
});

test('water changes cover residents together and a new fish or move cannot refresh dirty water for free',()=>{
 const s=state();const f=P.acquire(s,'moroko',catalog,0,0).fish;f.water=50;
 const other=P.acquire(s,'koi',catalog,0,0).fish;assert.equal(other.water,50);
 const salt=P.acquire(s,'aji',catalog,0,1).fish;salt.water=20;
 assert.equal(P.care(s,f.uid,'water',0,catalog).ok,true);assert.equal(f.water,100);assert.equal(other.water,100);assert.equal(salt.water,20);
 P.sync(s,catalog,1);assert.equal(f.water,92);assert.equal(other.water,92);
 P.moveFish(s,other.uid,2,catalog,1);assert.equal(other.water,92);assert.equal(P.moveFish(s,other.uid,0,catalog,1).ok,true);assert.equal(other.water,92);
});

test('one physical scale shows small and large fish distinctly without clipping through a complete swim or feeding cycle',()=>{
 const fish=[{uid:'p1',species:'moroko',length:750},{uid:'p2',species:'koi',length:5000},{uid:'p3',species:'moroko',length:1600},{uid:'p4',species:'koi',length:7000},{uid:'p5',species:'nushi',length:20000}];
 for(const [w,h] of [[360,205],[620,330],[1050,460]]){
  const base=A.layout(fish,catalog,w,h,0,()=>2);
  assert.ok(base.poses[0].width<base.poses[1].width);assert.ok(base.poses[1].width<base.poses[4].width);
  const feeding={at:0,ids:fish.map(f=>f.uid),origins:Object.fromEntries(base.poses.map(p=>[p.uid,p]))};
  for(let t=0;t<65;t+=.15){
   for(const p of A.layout(fish,catalog,w,h,t,()=>2,t<4?feeding:null).poses){
    assert.ok(p.x-p.width/2>=0);assert.ok(p.x+p.width/2<=w);assert.ok(p.y-p.height/2>=0);assert.ok(p.y+p.height/2<=h*.79);
    assert.ok(Number.isFinite(p.facing));
   }
  }
  assert.equal(A.layout(fish,catalog,w,h,2.4,()=>2,feeding).poses.some(p=>p.food),false);
 }
});

test('UI buys five residents, feeds once with five synchronized bites, moves a fish and survives closing/muting/reload',()=>{
 const app=boot({...seed(),caught:{...seed().caught,moroko:1},money:20000,x:199,y:36,soundEnabled:true},{petTankStage:[560,290]}),w=app.window;let saved;
 const frames=new Map();let nextId=1000,now=0;
 w.requestAnimationFrame=fn=>{const id=++nextId;frames.set(id,fn);return id;};w.cancelAnimationFrame=id=>frames.delete(id);
 const step=ms=>{now+=ms;const pending=[...frames.values()];frames.clear();pending.forEach(fn=>fn(now));};
 let bites=0;w.gameAudioSample('fishFeed').play=function(){this.paused=false;bites++;return Promise.resolve();};
 try{
  click(w,'#action');for(let i=0;i<5;i++)click(w,'[data-pet-buy="moroko"]');
  assert.equal(w.document.querySelector('[data-pet-buy="moroko"]').disabled,true);
  click(w,'[data-pet-action="aquarium"]');step(50);assert.equal(w.document.querySelectorAll('[data-pet-fish]').length,5);
  click(w,'[data-pet-action="feed"]');for(let i=0;i<42;i++)step(100);
  assert.equal(bites,5);assert.equal(read(w,'s.petLife.food'),5);assert.equal(w.document.querySelector('[data-pet-action="feed"]').disabled,true);
  click(w,'[data-pet-action="zoom"]');assert.equal(w.document.querySelectorAll('[data-pet-fish]').length,5);click(w,'[data-pet-action="zoom"]');
  const move=w.document.querySelector('#petMoveTank');move.value='1';click(w,'[data-pet-action="move"]');assert.equal(w.document.querySelectorAll('[data-pet-fish]').length,1);
  assert.equal(read(w,'s.petLife.fish.length'),5);assert.equal(read(w,'s.petLife.selectedTank'),1);
  saved=JSON.parse(w.localStorage.getItem(saveKey));click(w,'[data-pet-action="close"]');assert.equal(w.gameAudioSampleIsPlaying('fishFeed'),false);
  assert.deepEqual(app.errors,[]);
 }finally{app.dispose();}
 const reload=boot(saved);try{assert.equal(read(reload.window,'s.petLife.fish.length'),5);assert.equal(read(reload.window,'s.petLife.food'),5);assert.equal(read(reload.window,'s.dogAffinity.shuu'),880);}finally{reload.dispose();}
});

test('silent and reduced-motion feeding still saves care, without late sounds after backgrounding',()=>{
 const app=boot({...seed(),caught:{...seed().caught,moroko:1},x:199,y:36,soundEnabled:false},{petTankStage:[360,205]}),w=app.window;let bites=0;
 try{
  w.matchMedia=()=>({matches:true});w.gameAudioSample('fishFeed').play=()=>{bites++;return Promise.resolve();};
  click(w,'#action');click(w,'[data-pet-buy="moroko"]');click(w,'[data-pet-action="aquarium"]');click(w,'[data-pet-action="feed"]');
  assert.equal(bites,0);assert.equal(read(w,'s.petLife.food'),9);
  Object.defineProperty(w.document,'hidden',{value:true,configurable:true});w.document.dispatchEvent(new w.Event('visibilitychange'));
  assert.equal(w.gameAudioSampleIsPlaying('fishFeed'),false);assert.deepEqual(app.errors,[]);
 }finally{app.dispose();}
});

test('four new seasonal loops and pet sounds decode, avoid clipping and ship with matching cache references',()=>{
 const root=path.join(__dirname,'..'),sw=fs.readFileSync(path.join(root,'sw.js'),'utf8'),html=fs.readFileSync(path.join(root,'index.html'),'utf8');
 for(const season of ['spring','summer','autumn','winter']){
  const track=Music['map-'+season];assert.ok(track.src.includes('music-v183'));
  const data=execFileSync('ffmpeg',['-v','error','-i',path.join(root,track.src),'-f','f32le','-ac','1','-ar','8000','pipe:1'],{maxBuffer:4e6});
  const values=new Float32Array(data.buffer,data.byteOffset,data.length/4);let peak=0,sum=0;
  for(const n of values){peak=Math.max(peak,Math.abs(n));sum+=n*n;}
  assert.ok(Math.abs(values.length/8000-track.duration)<.1);assert.ok(peak>.1&&peak<.9);assert.ok(Math.sqrt(sum/values.length)>.035);
  assert.ok(sw.includes('./'+track.src));
 }
 for(const name of ['dog-friendly-whine-v183.wav','fish-feed-v183.wav']){
  const file='assets/audio/'+name,data=fs.readFileSync(path.join(root,file));let peak=0;
  for(let i=44;i<data.length;i+=2)peak=Math.max(peak,Math.abs(data.readInt16LE(i)));
  assert.ok(peak>5000&&peak<24000);assert.equal(data.readInt16LE(44),0);assert.equal(data.readInt16LE(data.length-2),0);
  assert.ok(sw.includes(file));assert.ok(html.includes(file));
 }
 assert.ok(sw.includes('./aquarium-life.js?v=184-1'));assert.ok(html.includes('aquarium-life.js?v=184-1'));
 assert.ok(html.includes('sample.preservesPitch = whine'));
});
