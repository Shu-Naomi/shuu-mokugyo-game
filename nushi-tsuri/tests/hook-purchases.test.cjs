const {test}=require('node:test'),assert=require('node:assert/strict');
const {boot,seed,read,saveKey}=require('./game-harness.cjs');
const Slots=require('../save-slots.js'),Balance=require('../tackle-balance.js');
const hooks=['small','medium','large','micro','carp'],prices={small:200,large:400,micro:600,carp:800};
const fixture=extra=>({...seed(),mapRegion:'mountainPond',x:120,y:109,direction:'up',hp:100,money:3000,dogFollowing:false,soundEnabled:false,ownedHooks:['medium'],selectedHook:'medium',selectedBait:'worm',baits:{worm:20,nushiSecret:2},...extra});
const click=(w,q)=>{const b=w.document.querySelector(q);assert.ok(b,q);b.click();};
const stock=w=>read(w,'({money:s.money,hp:s.hp,time:s.gameMinutes,baits:s.baits,lures:s.lures,ownedHooks:s.ownedHooks,caught:s.caught,items:s.items})');
function check(saved,fn,options){const a=boot(saved,undefined,options);try{fn(a.window,a);assert.deepEqual(a.errors,[]);}finally{a.dispose();}}

test('fresh adventure owns only reusable medium and saves it without spending starting money',()=>{
 check(null,w=>{assert.deepEqual(read(w,'s.ownedHooks'),['medium']);assert.equal(read(w,'s.selectedHook'),'medium');assert.equal(read(w,'s.money'),300);w.openInventory('tackle');for(const id of hooks)assert.equal(w.document.querySelector(`#inventory [data-pick-hook="${id}"]`).disabled,id!=='medium');w.save();assert.deepEqual(JSON.parse(w.localStorage.getItem(saveKey)).ownedHooks,['medium']);});
});
test('legacy saves retain all five hooks, chosen hook, and unrelated resources',()=>{
 for(const id of hooks)check({...seed(),selectedHook:id,extraFuture:{keep:true}},w=>{assert.deepEqual(read(w,'s.ownedHooks'),hooks);assert.equal(read(w,'s.selectedHook'),id);assert.equal(read(w,'s.money'),seed().money);assert.deepEqual(read(w,'s.caught'),seed().caught);assert.deepEqual(read(w,'s.extraFuture'),{keep:true});});
 check({...seed(),selectedBait:'nushiSecret',selectedHook:'micro'},w=>assert.equal(read(w,'s.selectedHook'),'large'));
});
test('explicit subsets and malformed ownership never grant unbought hooks; selection is repaired',()=>{
 for(const ownedHooks of [[],null,'carp',{},['unknown','constructor','__proto__']])check(fixture({ownedHooks,selectedHook:'carp'}),w=>{assert.deepEqual(read(w,'s.ownedHooks'),['medium']);assert.equal(read(w,'s.selectedHook'),'medium');});
 check(fixture({ownedHooks:['carp','carp','bad','medium'],selectedHook:'carp'}),w=>{assert.deepEqual(read(w,'s.ownedHooks'),['carp','medium']);assert.equal(read(w,'s.selectedHook'),'carp');});
 check(fixture({ownedHooks:['medium','small'],selectedHook:'invalid'}),w=>assert.equal(read(w,'s.selectedHook'),'medium'));
 check(fixture({selectedBait:'nushiSecret',selectedHook:'large'}),w=>{assert.equal(read(w,'s.selectedHook'),'medium');assert.deepEqual(read(w,'s.ownedHooks'),['medium']);assert.match(w.hookPreparationProblem('nushiSecret','medium'),/400円/);});
});
test('all four prices are exact and insufficient, duplicate, starter, and unknown purchases spend nothing',()=>{
 assert.deepEqual(Object.fromEntries(Object.keys(prices).map(id=>[id,Balance.hooks[id].price])),prices);
 for(const [id,price] of Object.entries(prices))check(fixture({money:price-1}),w=>{let before=stock(w);assert.equal(w.buySamHook(id),false);assert.deepEqual(stock(w),before);w.eval(`s.money=${price}`);assert.equal(w.buySamHook(id),true);assert.equal(read(w,'s.money'),0);assert.deepEqual(read(w,'s.ownedHooks'),['medium',id]);before=stock(w);assert.equal(w.buySamHook(id),false);assert.deepEqual(stock(w),before);});
 check(fixture(),w=>{const before=stock(w);for(const id of ['medium','missing','constructor','__proto__','toString'])assert.equal(w.buySamHook(id),false);assert.deepEqual(stock(w),before);});
});
test('actual shop buttons buy once, show ownership, and equip from both inventory and casting menus',()=>{
 check(fixture(),w=>{w.renderSamShop();assert.equal(w.document.querySelectorAll('[data-buy-hook]').length,4);const stale=w.document.querySelector('[data-buy-hook="micro"]');stale.click();assert.equal(read(w,'s.money'),2400);assert.equal(w.document.querySelector('[data-buy-hook="micro"]').disabled,true);stale.onclick();assert.equal(read(w,'s.money'),2400);w.openInventory('tackle');click(w,'#inventory [data-pick-hook="micro"]');assert.equal(read(w,'s.selectedHook'),'micro');w.close();click(w,'#action');click(w,'#wait');click(w,'#tackle [data-pick-hook="medium"]');assert.equal(read(w,'s.selectedHook'),'medium');click(w,'#tackle [data-pick-hook="micro"]');assert.equal(read(w,'s.selectedHook'),'micro');click(w,'#cancelTacklePreparation');});
});
test('secret bait never grants large, becomes usable after purchase, and direct disabled equip handlers cannot bypass ownership',()=>{
 check(fixture(),w=>{w.openInventory('tackle');const unavailable=w.document.querySelector('#inventory [data-pick-hook="carp"]');unavailable.onclick();assert.equal(read(w,'s.selectedHook'),'medium');click(w,'#inventory [data-pick-bait="nushiSecret"]');assert.equal(read(w,'s.selectedHook'),'medium');assert.deepEqual(read(w,'s.ownedHooks'),['medium']);assert.match(w.fishingPreparationProblem(),/400円/);assert.equal(w.buySamHook('large'),true);click(w,'#inventory [data-pick-bait="worm"]');click(w,'#inventory [data-pick-bait="nushiSecret"]');assert.equal(read(w,'s.selectedHook'),'large');assert.equal(w.fishingPreparationProblem(),'');for(const id of hooks)assert.equal(w.document.querySelector(`#inventory [data-pick-hook="${id}"]`).disabled,id!=='large');w.document.querySelector('#inventory [data-pick-hook="medium"]').onclick();assert.equal(read(w,'s.selectedHook'),'large');});
});
test('purchased ownership and selection survive reload while a second slot remains byte-for-byte unchanged',()=>{
 const second={...seed(),ownedHooks:['medium','carp'],selectedHook:'carp',money:65432};let saved;
 check(fixture({extraFuture:{keep:8}}),w=>{const raw=w.localStorage.getItem(Slots.keys[2]);w.buySamHook('carp');w.openInventory('tackle');click(w,'#inventory [data-pick-hook="carp"]');assert.equal(w.save(),true);saved=JSON.parse(w.localStorage.getItem(saveKey));assert.deepEqual(saved.ownedHooks,['medium','carp']);assert.deepEqual(saved.extraFuture,{keep:8});assert.equal(w.localStorage.getItem(Slots.keys[2]),raw);},{storage:{[Slots.keys[2]]:second}});
 check(saved,w=>{assert.deepEqual(read(w,'s.ownedHooks'),['medium','carp']);assert.equal(read(w,'s.selectedHook'),'carp');assert.equal(read(w,'s.money'),2200);});
});
test('real repeated casts spend normal bait and time but never consume purchased hooks',()=>{
 check(fixture({ownedHooks:['medium','micro'],selectedHook:'micro'}),w=>{for(let i=0;i<2;i++){w.cast();w.beginFishing();assert.equal(read(w,'battle.phase'),'cast');w.eval('clearInterval(timer);battle.cast=50');const before=stock(w);assert.equal(w.launchSurfaceCast(),true);assert.equal(read(w,'battle.hook'),'micro');assert.deepEqual(read(w,'s.ownedHooks'),before.ownedHooks);assert.equal(read(w,'s.baits.worm'),before.baits.worm-1);assert.equal(read(w,'s.gameMinutes'),before.time+10);assert.equal(read(w,'s.money'),before.money);w.eval('clearTimeout(castLandingTimer);endBattle()');}});
});
test('unowned hook blocks preparation and stale cast launch, while cancellation spends no resources',()=>{
 check(fixture(),w=>{click(w,'#action');w.eval('s.selectedHook="carp"');const before=stock(w);assert.equal(w.beginFishing(),false);assert.match(w.fishingPreparationProblem(),/持っていません/);click(w,'#wait');click(w,'#cancelTacklePreparation');assert.deepEqual(stock(w),before);assert.equal(read(w,'battle'),null);w.eval('s.selectedHook="medium"');w.cast();w.beginFishing();assert.equal(read(w,'battle.phase'),'cast');w.eval('clearInterval(timer);s.ownedHooks=[];battle.cast=50');const stale=stock(w);assert.equal(w.launchSurfaceCast(),false);assert.deepEqual(stock(w),stale);w.wait();assert.deepEqual(stock(w),stale);});
});
test('practice and real lure casting ignore unowned bait hooks and never grant them',()=>{
 check(fixture({baits:{},ownedRods:['bamboo','lureRod'],selectedRod:'lureRod',lures:{silverSpoon:1},fishingMethod:'lure'}),w=>{w.eval('s.selectedHook="carp"');w.cast();w.beginFishing();assert.equal(read(w,'battle.phase'),'cast');w.eval('clearInterval(timer);battle.cast=50');const before=stock(w);assert.equal(w.launchSurfaceCast(),true);assert.deepEqual(read(w,'s.ownedHooks'),['medium']);assert.deepEqual(read(w,'s.baits'),before.baits);assert.equal(read(w,'s.lures.silverSpoon'),1);w.eval('clearTimeout(castLandingTimer);endBattle()');w.eval('s.ownedHooks=[];s.ownedRods=[]');const practice=stock(w);w.openPracticePond();w.beginFishing();assert.equal(read(w,'battle.phase'),'cast');assert.equal(read(w,'battle.hook'),'medium');w.eval('clearInterval(timer);battle.cast=50');assert.equal(w.launchSurfaceCast(),true);assert.deepEqual(stock(w),practice);w.eval('clearTimeout(castLandingTimer);endBattle()');});
});
test('storage failure keeps a single live purchase, signals unsaved progress, and retries without charging again',()=>{
 check(fixture(),w=>{const original=w.Storage.prototype.setItem,raw=w.localStorage.getItem(saveKey);try{w.Storage.prototype.setItem=()=>{throw Error('quota');};assert.equal(w.buySamHook('small'),true);assert.equal(read(w,'s.money'),2800);assert.deepEqual(read(w,'s.ownedHooks'),['medium','small']);assert.equal(w.document.querySelector('#saveStatus').hidden,false);assert.equal(w.localStorage.getItem(saveKey),raw);assert.equal(w.buySamHook('small'),false);assert.equal(read(w,'s.money'),2800);}finally{w.Storage.prototype.setItem=original;}assert.equal(w.save(),true);assert.equal(w.document.querySelector('#saveStatus').hidden,true);const saved=JSON.parse(w.localStorage.getItem(saveKey));assert.equal(saved.money,2800);assert.deepEqual(saved.ownedHooks,['medium','small']);});
});
