const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const {boot,seed,read,saveKey}=require('./game-harness.cjs');
const C=require('../fortune-capsules.js');
const click=(w,selector)=>{const el=w.document.querySelector(selector);assert.ok(el,selector);assert.equal(el.disabled,false,selector+' enabled');el.click();};
const phase=w=>w.document.querySelector('#fortuneReveal').dataset.phase;
function clock(w){
 let now=0,id=100000;const jobs=new Map(),clear=w.clearTimeout.bind(w);
 w.setTimeout=(fn,delay=0)=>{const key=++id;jobs.set(key,{at:now+delay,fn});return key;};
 w.clearTimeout=key=>{if(!jobs.delete(key))clear(key);};
 return ms=>{const until=now+ms;let count=0;while(true){const next=[...jobs.entries()].filter(([,j])=>j.at<=until).sort((a,b)=>a[1].at-b[1].at)[0];if(!next)break;assert.ok(++count<1000,'timer loop');now=next[1].at;jobs.delete(next[0]);next[1].fn();}now=until;};
}
function ready(options={}){
 const app=boot({...seed(),items:{starGrapes:30,offeringDaikon:10},...options}),w=app.window,tick=clock(w);
 const audio=[];for(const id of ['shrineDrawBell','fortuneWinBell','fortuneJackpotConfirm'])w.gameAudioSample(id).play=function(){this.paused=false;audio.push(id);return Promise.resolve();};
 w.openLocationInterior('main-shrine');return {app,w,tick,audio};
}
const snapshot=w=>read(w,'({items:s.items,rods:s.ownedRods,parts:s.rodParts,toys:s.ownedDogToys,treats:s.dogTreats,baits:s.baits,money:s.money,lures:s.lures,collectibles:s.fishdexCollectibles})');

test('all draw categories use the requested five colors, including duplicate toys and rods',()=>{
 assert.equal(C.colorFor('starGazer'),'orange');assert.equal(C.colorFor('baitNushi1'),'purple');
 for(const id of ['starFrisbee','squeakyNushi','stardustCookie','moonlightJerky'])assert.equal(C.colorFor(id),'blue');
 assert.equal(C.colorFor('futureToy','toy'),'blue');
 for(const id of ['money500','money2000','money10000'])assert.equal(C.colorFor(id),'gold');
 for(const id of ['baitWorm9','baitRiver6','baitPaste6','expeditionJoint','silverSpoon','starMinnow','collectibleRandom'])assert.equal(C.colorFor(id),'white');
 const {app,w}=ready();
 try{
  for(const [roll,color] of [[0,'orange'],[0,'orange'],[.15,'blue'],[.15,'blue'],[.125,'purple'],[.72,'white'],[.99,'gold']]){
   w.Math.random=()=>roll;assert.equal(w.drawStarFortune('starGrapes'),true);
   assert.equal(w.document.querySelector('#fortuneReveal').dataset.capsule,color);
   assert.equal(read(w,'s.starFortuneLastDraw.results[0].capsule'),color);
   w.hideStarFortuneReveal();
  }
  assert.equal(read(w,"s.ownedRods.filter(id=>id==='starGazer').length"),1);
  assert.equal(read(w,'s.rodParts.expeditionJoint'),1);
  assert.equal(read(w,'s.dogTreats.stardustCookie'),2);
  assert.deepEqual(app.errors,[]);
 }finally{app.dispose();}
});

test('single capsule drops, opens with jackpot audio and holds the result until the player advances',()=>{
 const {app,w,tick,audio}=ready();
 try{
  w.Math.random=()=>0;click(w,'[data-draw-fortune="starGrapes"][data-fortune-count="1"]');
  assert.equal(phase(w),'drop');assert.equal(w.document.activeElement.id,'fortuneReveal');
  assert.equal(w.document.querySelector('[data-capsule-primary]').disabled,true);
  const awarded=snapshot(w);assert.equal(w.drawStarFortune('starGrapes'),false);
  tick(780);assert.equal(phase(w),'sealed');
  click(w,'[data-capsule-action="open"]');assert.equal(phase(w),'opening');
  tick(520);assert.equal(phase(w),'revealed');
  assert.match(w.document.querySelector('#fortuneRevealMessage').textContent,/星見の竿/);
  assert.equal(w.document.querySelector('#fortuneReveal').classList.contains('jackpot'),true);
  tick(15000);assert.equal(phase(w),'revealed','long text is not timed away');
  assert.deepEqual(audio,['shrineDrawBell','fortuneJackpotConfirm']);
  assert.deepEqual(snapshot(w),awarded,'animation never grants rewards');
  click(w,'[data-capsule-action="next"]');assert.equal(phase(w),'summary');
  assert.equal(w.document.querySelectorAll('.fortune-summary li').length,1);
  click(w,'[data-capsule-primary]');assert.equal(w.document.querySelector('#fortuneReveal').hidden,true);
  assert.equal(read(w,'fortuneRevealInProgress'),false);assert.equal(w.document.querySelector('.location-panel').inert,undefined);
  assert.equal(w.document.activeElement.dataset.drawFortune,'starGrapes');
  assert.deepEqual(app.errors,[]);
 }finally{app.dispose();}
});

test('ten capsules can each be opened in order; rapid clicks cannot skip a sealed capsule or pay twice',()=>{
 const {app,w,tick}=ready();
 try{
  w.Math.random=()=>.125;assert.equal(w.drawStarFortune('starGrapes',10),true);
  const awarded=snapshot(w);assert.equal(awarded.items.starGrapes,20);assert.equal(awarded.baits.nushiSecret,10);
  const saved=JSON.parse(w.localStorage.getItem(saveKey));assert.equal(saved.starFortuneLastDraw.results.length,10,'saved before opening');
  for(let i=0;i<10;i++){
   assert.equal(phase(w),'drop');assert.equal(w.document.querySelector('.fortune-counter').textContent,`${i+1} / 10`);
   assert.equal(w.drawStarFortune('starGrapes',10),false);
   tick(780);const open=w.document.querySelector('[data-capsule-action="open"]');open.click();open.click();
   assert.equal(phase(w),'opening');tick(520);assert.equal(phase(w),'revealed');
   assert.equal(w.document.querySelectorAll('.fortune-tray li.opened').length,i+1);
   const next=w.document.querySelector('[data-capsule-action="next"]');next.click();next.click();
  }
  assert.equal(phase(w),'summary');assert.equal(w.document.querySelectorAll('.fortune-summary li').length,10);
  assert.deepEqual(snapshot(w),awarded);
  click(w,'[data-capsule-primary]');assert.equal(w.document.querySelectorAll('.fortune-batch-results li').length,10);
  assert.deepEqual(app.errors,[]);
 }finally{app.dispose();}
});

test('skip and early close preserve every reward, clear sound, and reload shows the saved results without replay or regrant',()=>{
 for(const mode of ['skip','close','escape','location-close']){
  const {app,w,tick,audio}=ready();let saved,awarded;
  try{
   w.Math.random=()=>.125;w.drawStarFortune('starGrapes',10);awarded=snapshot(w);
   if(mode==='skip'){click(w,'[data-capsule-action="all"]');assert.equal(phase(w),'summary');assert.equal(w.document.querySelectorAll('.fortune-summary li').length,10);click(w,'[data-capsule-primary]');}
   else if(mode==='close')click(w,'[data-capsule-action="close"]');
   else if(mode==='escape')w.document.dispatchEvent(new w.KeyboardEvent('keydown',{key:'Escape',bubbles:true}));
   else w.close();
   tick(5000);assert.equal(w.document.querySelector('#fortuneReveal').hidden,true);
   assert.deepEqual(audio,['shrineDrawBell'],'no late result bell');assert.equal(w.gameAudioSampleIsPlaying('shrineDrawBell'),false);
   assert.deepEqual(snapshot(w),awarded);saved=JSON.parse(w.localStorage.getItem(saveKey));
   assert.deepEqual(app.errors,[]);
  }finally{app.dispose();}
  const reload=boot(saved);try{
   reload.window.openLocationInterior('main-shrine');assert.deepEqual(snapshot(reload.window),awarded);
   assert.equal(reload.window.document.querySelectorAll('.fortune-history .color-purple.fortune-result-card').length,10);
   assert.equal(reload.window.document.querySelector('#fortuneReveal').hidden,true);assert.deepEqual(reload.errors,[]);
  }finally{reload.dispose();}
 }
});

test('backgrounding pauses the current transition and returning never plays delayed audio',()=>{
 for(const opening of [false,true]){
  const {app,w,tick,audio}=ready();
  try{
   w.Math.random=()=>.125;w.drawStarFortune('starGrapes');if(opening){tick(780);click(w,'[data-capsule-action="open"]');}
   const before=audio.length;
   Object.defineProperty(w.document,'hidden',{value:true,configurable:true});w.document.dispatchEvent(new w.Event('visibilitychange'));
   tick(5000);assert.equal(audio.length,before);
   for(const id of ['shrineDrawBell','fortuneWinBell','fortuneJackpotConfirm'])assert.equal(w.gameAudioSampleIsPlaying(id),false);
   Object.defineProperty(w.document,'hidden',{value:false,configurable:true});w.document.dispatchEvent(new w.Event('visibilitychange'));
   assert.equal(phase(w),opening?'revealed':'sealed');assert.equal(audio.length,before);
   click(w,'[data-capsule-action="close"]');assert.deepEqual(app.errors,[]);
  }finally{app.dispose();}
 }
});

test('reduced motion is immediate, mute is honored, and tab/held keys stay in the capsule dialog',()=>{
 const {app,w,tick,audio}=ready({soundEnabled:false});
 try{
  w.matchMedia=()=>({matches:true});w.Math.random=()=>.125;w.drawStarFortune('starGrapes',10);
  assert.equal(phase(w),'sealed');assert.equal(w.document.querySelector('.location-panel').inert,true);
  w.document.dispatchEvent(new w.KeyboardEvent('keydown',{key:'Tab',bubbles:true,cancelable:true}));
  assert.equal(w.document.querySelector('#fortuneReveal').contains(w.document.activeElement),true);
  w.document.dispatchEvent(new w.KeyboardEvent('keydown',{key:'z',repeat:true,bubbles:true,cancelable:true}));assert.equal(phase(w),'sealed');
  w.document.dispatchEvent(new w.KeyboardEvent('keydown',{key:'z',bubbles:true,cancelable:true}));assert.equal(phase(w),'revealed');
  assert.deepEqual(audio,[]);click(w,'[data-capsule-action="all"]');assert.equal(phase(w),'summary');
  click(w,'[data-capsule-primary]');tick(3000);assert.equal(w.document.querySelector('#fortuneReveal').hidden,true);
  assert.deepEqual(app.errors,[]);
 }finally{app.dispose();}
});

test('older text-only ten-pull history survives; untrusted save strings cannot inject markup',()=>{
 const legacy=Array.from({length:10},()=>({fortune:'星吉',message:'ミミズを9個授かった！'}));
 const app=boot({...seed(),starFortuneLastBatch:legacy}),w=app.window;
 try{w.openLocationInterior('main-shrine');assert.equal(w.document.querySelectorAll('.fortune-batch-results li').length,10);assert.match(w.document.querySelector('.fortune-batch-results').textContent,/ミミズ/);assert.deepEqual(app.errors,[]);}finally{app.dispose();}
 const markup=C.historyMarkup({results:[{message:'<img src=x onerror=alert(1)>',fortune:'<script>x</script>',capsule:'" onclick="x'}]},null);
 assert.ok(!markup.includes('<img'));assert.ok(!markup.includes('<script>'));assert.ok(markup.includes('&lt;img'));
 const previousBatch=Array.from({length:10},()=>({prizeId:'baitNushi1',capsule:'purple',fortune:'秘餌',message:'ぬしエサ'}));
 const withSingle=C.historyMarkup({results:[{prizeId:'money500',capsule:'gold',message:'500円'}]},previousBatch);
 assert.equal((withSingle.match(/fortune-result-card color-purple/g)||[]).length,10,'single draw keeps colored ten-pull history');
 assert.deepEqual(C.safeResults({}),[]);assert.deepEqual(C.safeResults(Array(100).fill({})),[]);
});

test('capsule script and styles ship in both the page and offline cache',()=>{
 const root=path.join(__dirname,'..'),html=fs.readFileSync(path.join(root,'index.html'),'utf8'),sw=fs.readFileSync(path.join(root,'sw.js'),'utf8');
 for(const [file,version] of [['fortune-capsules.js','187-1'],['fortune-capsules.css','185-1']]){assert.ok(html.includes(file+'?v='+version));assert.ok(sw.includes('./'+file+'?v='+version));}
 assert.ok(html.includes('./sw.js?v=189-1'));assert.ok(sw.includes('nushi-tsuri-v189-'));
});
