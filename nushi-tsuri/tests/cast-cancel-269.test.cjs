const {test}=require('node:test'),assert=require('node:assert/strict');
const {boot,seed,read,saveKey}=require('./game-harness.cjs'),Slots=require('../save-slots.js');
const fixture=extra=>({...seed(),mapRegion:'mountainPond',x:120,y:109,direction:'up',hp:100,money:1000,dogFollowing:false,soundEnabled:false,selectedBait:'worm',selectedHook:'medium',baits:{worm:1},...extra});
const click=(w,q)=>w.document.querySelector(q).click(),phase=w=>read(w,'battle?.phase||null');
const stock=w=>read(w,'({money:s.money,hp:s.hp,time:s.gameMinutes,baits:s.baits,lures:s.lures,items:s.items,caught:s.caught,rods:s.ownedRods,rod:s.selectedRod,hook:s.selectedHook,bait:s.selectedBait,dogAffinity:s.dogAffinity,petLife:s.petLife,x:s.x,y:s.y,region:s.mapRegion})');
const idle=w=>{assert.equal(phase(w),null);assert.equal(w.document.querySelector('#fishScene').classList.contains('active'),false);assert.equal(w.document.querySelector('.modal.open'),null);};

test('no bait and no usable lure prevents field entry, explains why and spends nothing',()=>{
 const a=boot(fixture({baits:{}})),w=a.window;
 try{const before=stock(w);click(w,'#action');idle(w);assert.match(w.document.querySelector('#rescueToast').textContent,/餌がないため、釣りができません/);assert.deepEqual(stock(w),before);click(w,'#back');idle(w);assert.deepEqual(a.errors,[]);}finally{a.dispose();}
});
test('a lure without its owned rod, a rod without its lure, and an unsupported lure do not bypass the empty-bait guard',()=>{
 for(const extra of [{ownedRods:['bamboo'],lures:{silverSpoon:1}},{ownedRods:['bamboo','lureRod'],lures:{silverSpoon:0}},{ownedRods:['bamboo','lureRod'],lures:{starMinnow:1}}]){
  const a=boot(fixture({...extra,baits:{}})),w=a.window;
  try{const before=stock(w);click(w,'#action');idle(w);assert.deepEqual(stock(w),before);assert.deepEqual(a.errors,[]);}finally{a.dispose();}
 }
});
test('owned reusable lure tackle permits empty-bait entry and switching through the existing B menu',()=>{
 const a=boot(fixture({baits:{},ownedRods:['bamboo','lureRod'],lures:{silverSpoon:1}})),w=a.window;
 try{click(w,'#action');assert.equal(phase(w),'prep');assert.match(w.document.querySelector('#battleMsg').textContent,/ルアー/);click(w,'#wait');click(w,'#tackle [data-fishing-method="lure"]');click(w,'#beginCast');assert.equal(phase(w),'cast');assert.equal(read(w,'battle.method'),'lure');const before=stock(w);w.eval('clearInterval(timer);battle.cast=50;launchSurfaceCast();settleSurfaceCast();clearInterval(timer)');assert.equal(read(w,'s.lures.silverSpoon'),1);assert.deepEqual(read(w,'s.baits'),before.baits);assert.ok(['lure','interest'].includes(phase(w)));w.wait();idle(w);assert.deepEqual(a.errors,[]);}finally{a.dispose();}
});
test('losing the last bait inside preparation blocks starting without forcing a shop, rescue or scene exit',()=>{
 const a=boot(fixture()),w=a.window;
 try{click(w,'#action');w.eval('s.baits.worm=0;render()');const before=stock(w);assert.equal(w.beginFishing(),false);assert.equal(w.beginFishing(),false);assert.equal(phase(w),'prep');assert.equal(w.document.querySelector('#fishScene').classList.contains('active'),true);assert.equal(w.document.querySelector('.modal.open'),null);assert.match(w.document.querySelector('#battleMsg').textContent,/餌がない/);assert.deepEqual(stock(w),before);click(w,'#cancelCastPreparation');idle(w);assert.deepEqual(stock(w),before);assert.equal(w.cancelFishingPreparation(),false);assert.deepEqual(a.errors,[]);}finally{a.dispose();}
});
test('preparation can always return using its button, tackle footer, Back or Escape without charging a cast',()=>{
 for(const exit of ['button','tackle','back','escape','tackle-back']){
  const a=boot(fixture()),w=a.window;
  try{click(w,'#action');w.eval('s.baits.worm=0;render()');const before=stock(w);if(exit==='tackle'){click(w,'#wait');assert.match(w.document.querySelector('#castTackleSummary').textContent,/餌がない/);assert.equal(w.document.querySelector('#tackle [data-pick-bait="worm"] strong').textContent,'×0');click(w,'#cancelTacklePreparation');}else if(exit==='tackle-back'){click(w,'#wait');click(w,'#back');assert.equal(phase(w),'prep');assert.equal(w.document.querySelector('.modal.open'),null);click(w,'#back');}else if(exit==='back')click(w,'#back');else if(exit==='escape')w.dispatchEvent(new w.KeyboardEvent('keydown',{key:'Escape',bubbles:true}));else click(w,'#cancelCastPreparation');idle(w);assert.deepEqual(stock(w),before);assert.deepEqual(a.errors,[]);}finally{a.dispose();}
 }
});
test('an empty selected bait with other stock can be replaced without inventing stock or changing the B equipment action',()=>{
 const a=boot(fixture({baits:{worm:0,shell:2}})),w=a.window;
 try{const before=stock(w);click(w,'#action');assert.equal(phase(w),'prep');assert.equal(w.beginFishing(),false);click(w,'#wait');assert.ok(w.document.querySelector('#tackle.open'));click(w,'#tackle [data-pick-bait="shell"]');click(w,'#beginCast');assert.equal(phase(w),'cast');assert.equal(read(w,'battle.bait'),'shell');assert.deepEqual(read(w,'s.baits'),before.baits);w.wait();idle(w);assert.deepEqual(a.errors,[]);}finally{a.dispose();}
});
test('bait or a reusable lure disappearing before release blocks the throw and keeps B available',()=>{
 for(const lure of [false,true]){
  const a=boot(fixture(lure?{fishingMethod:'lure',selectedRod:'lureRod',ownedRods:['bamboo','lureRod'],lures:{silverSpoon:1}}:{})),w=a.window;
  try{click(w,'#action');w.beginFishing();w.eval(lure?'s.lures.silverSpoon=0;clearInterval(timer)':'s.baits.worm=0;clearInterval(timer)');const before=stock(w);assert.equal(w.launchSurfaceCast(),false);assert.equal(phase(w),'cast');assert.equal(w.document.querySelector('#fishScene').classList.contains('active'),true);assert.match(w.document.querySelector('#rescueToast').textContent,/Bでフィールドへ戻れます/);assert.deepEqual(stock(w),before);click(w,'#wait');idle(w);assert.deepEqual(stock(w),before);assert.deepEqual(a.errors,[]);}finally{a.dispose();}
 }
});
test('spending the last bait commits one cast, preserves the current fishing and cannot restart or refund it',()=>{
 const a=boot(fixture()),w=a.window;
 try{click(w,'#action');w.beginFishing();const before=stock(w);w.eval('clearInterval(timer);battle.cast=50;launchSurfaceCast();settleSurfaceCast();clearInterval(timer)');assert.equal(read(w,'s.baits.worm'),0);assert.equal(read(w,'battle.baitCommitted'),true);assert.ok(['wait','bite'].includes(phase(w)));const now=phase(w),after=stock(w);assert.equal(w.beginFishing(),false);assert.equal(phase(w),now);assert.deepEqual(stock(w),after);w.wait();idle(w);assert.equal(read(w,'s.baits.worm'),0);assert.equal(read(w,'s.gameMinutes'),before.time+10);assert.deepEqual(a.errors,[]);}finally{a.dispose();}
});
test('unowned or invalid equipment cannot start fishing or prevent returning, and cancellation never repairs inventory',()=>{
 for(const setup of ['s.ownedRods=[]','s.selectedRod="removed-rod"','s.selectedBait="removed-bait"','s.selectedHook="removed-hook"','s.fishingMethod="lure";s.selectedRod="bamboo"']){
  const a=boot(fixture()),w=a.window;
  try{click(w,'#action');w.eval(setup+';render()');const before=stock(w);assert.equal(w.beginFishing(),false);assert.equal(phase(w),'prep');click(w,'#wait');click(w,'#cancelTacklePreparation');idle(w);assert.deepEqual(stock(w),before);assert.deepEqual(a.errors,[]);}finally{a.dispose();}
 }
});
test('legacy missing rods and invalid selected equipment reuse existing normalization while saves and the second slot survive',()=>{
 const second={...seed(),money:65432,playerName:'別の冒険'},old=fixture({baits:{},ownedRods:[],selectedRod:'gone',selectedBait:'gone',selectedHook:'gone',playerName:'直美♡',dogNames:{shuu:'こむぎ',riku:'風太',grey:'夜空'},extraFuture:{keep:true}}),a=boot(old,undefined,{storage:{[Slots.keys[2]]:second}}),w=a.window;let saved;
 try{const raw=w.localStorage.getItem(Slots.keys[2]);assert.equal(read(w,'s.selectedRod'),'bamboo');assert.equal(read(w,'s.ownedRods.includes("bamboo")'),true);const before=stock(w);click(w,'#action');idle(w);assert.deepEqual(stock(w),before);assert.equal(w.save(),true);saved=JSON.parse(w.localStorage.getItem(saveKey));assert.equal(saved.playerName,'直美♡');assert.deepEqual(saved.dogNames,old.dogNames);assert.deepEqual(saved.extraFuture,old.extraFuture);assert.equal(w.localStorage.getItem(Slots.keys[2]),raw);assert.deepEqual(a.errors,[]);}finally{a.dispose();}
 const b=boot(saved);try{click(b.window,'#action');idle(b.window);assert.deepEqual(b.errors,[]);}finally{b.dispose();}
});
test('the free practice pond remains usable without bait and can be cancelled without spending anything',()=>{
 const a=boot(fixture({baits:{}})),w=a.window;
 try{const before=stock(w);w.openPracticePond();assert.equal(phase(w),'prep');w.beginFishing();assert.equal(phase(w),'cast');w.wait();idle(w);assert.deepEqual(stock(w),before);assert.deepEqual(a.errors,[]);}finally{a.dispose();}
});
