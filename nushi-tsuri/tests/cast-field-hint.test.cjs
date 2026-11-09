const {test}=require('node:test'),assert=require('node:assert/strict');
const {boot,seed,read}=require('./game-harness.cjs');
const fixture=extra=>({...seed(),mapRegion:'mountainPond',x:120,y:109,direction:'up',hp:100,dogFollowing:false,baits:{worm:5},soundEnabled:false,...extra});
const click=(w,selector)=>w.document.querySelector(selector).click();
const visibility=(w,selector)=>w.getComputedStyle(w.document.querySelector(selector)).visibility;
const hint=(w,expected)=>assert.equal(visibility(w,'#hint'),expected,read(w,'battle?.phase||"field"'));
const stop=w=>w.eval('clearInterval(timer);timer=0');
function release(w){w.eval('battle.cast=50;launchSurfaceCast();settleSurfaceCast();clearInterval(timer);timer=0');}
function hook(w){w.eval('battle.phase="bite";startFight();clearInterval(timer);timer=0');}
const economy=w=>read(w,'({money:s.money,hp:s.hp,baits:s.baits,lures:s.lures,time:s.gameMinutes,caught:s.caught})');

test('field hint stays hidden from bait preparation through hook-set, underwater fight and landing',()=>{
 const app=boot(fixture()),w=app.window;
 try{
  hint(w,'visible');const text=w.document.querySelector('#hint').textContent;
  click(w,'#action');hint(w,'hidden');w.beginFishing();stop(w);hint(w,'hidden');release(w);hint(w,'hidden');
  hook(w);hint(w,'hidden');assert.equal(visibility(w,'#battleMsg'),'visible');
  w.eval('clearTimeout(surfaceTransitionTimer);surfaceTransitionTimer=0;document.querySelector("#fishScene").classList.remove("surface-diving");finishHookReveal()');hint(w,'hidden');
  w.eval('battle.phase="landing"');hint(w,'hidden');
  assert.equal(w.document.querySelector('#hint').textContent,text,'do not erase the field hint to hide it');
  w.endBattle();hint(w,'visible');assert.equal(w.document.querySelector('#hint').textContent,text);assert.deepEqual(app.errors,[]);
 }finally{app.dispose();}
});
test('lure search and both fishing fight modes do not restore the field hint',()=>{
 for(const fightMode of ['gauge','nushi']){
  const app=boot(fixture({fightMode,fishingMethod:'lure',selectedRod:'lureRod',ownedRods:['bamboo','lureRod'],lures:{silverSpoon:1}})),w=app.window;
  try{w.eval('s.fishingMethod="lure";s.selectedRod="lureRod"');click(w,'#action');w.beginFishing();stop(w);release(w);assert.ok(['lure','interest'].includes(read(w,'battle.phase')));hint(w,'hidden');w.eval('battle.f=fish.find(f=>f.id==="funa")');hook(w);hint(w,'hidden');
   const guidance=fightMode==='nushi'?'#nushiCue':'#battleUi';assert.notEqual(w.getComputedStyle(w.document.querySelector(guidance)).display,'none');assert.equal(visibility(w,guidance),'visible');
   w.endBattle();hint(w,'visible');assert.deepEqual(app.errors,[]);}finally{app.dispose();}
 }
});
test('preparation cancel, tackle close, Escape and repeated entry restore hints without spending supplies',()=>{
 const app=boot(fixture()),w=app.window;
 try{const before=economy(w);for(let i=0;i<2;i++){
  click(w,'#action');hint(w,'hidden');click(w,'#wait');assert.ok(w.document.querySelector('#tackle.open'));hint(w,'hidden');
  click(w,'#tackle [data-close]');hint(w,'hidden');
  if(i===0)click(w,'#cancelCastPreparation');else w.dispatchEvent(new w.KeyboardEvent('keydown',{key:'Escape',bubbles:true}));
  hint(w,'visible');assert.equal(read(w,'battle'),null);assert.deepEqual(economy(w),before);
 }assert.deepEqual(app.errors,[]);}finally{app.dispose();}
});
test('free practice has the same hint isolation and returns without consuming stock',()=>{
 const app=boot(fixture({baits:{}})),w=app.window;
 try{const before=economy(w);w.openPracticePond();hint(w,'hidden');w.beginFishing();stop(w);hint(w,'hidden');release(w);hook(w);hint(w,'hidden');assert.equal(visibility(w,'#battleMsg'),'visible');w.endBattle();hint(w,'visible');assert.deepEqual(economy(w),before);assert.deepEqual(app.errors,[]);}finally{app.dispose();}
});
test('only the field hint is hidden: preparation errors and field rescue notices remain available',()=>{
 const app=boot(fixture()),w=app.window;
 try{click(w,'#action');w.eval('s.baits.worm=0;render()');const before=economy(w);assert.equal(w.beginFishing(),false);hint(w,'hidden');
  assert.match(w.document.querySelector('#battleMsg').textContent,/餌がない/);assert.equal(visibility(w,'#battleMsg'),'visible');
  assert.match(w.document.querySelector('#rescueToast').textContent,/餌がない/);assert.equal(visibility(w,'#rescueToast'),'visible');
  assert.deepEqual(economy(w),before);
  click(w,'#cancelCastPreparation');hint(w,'visible');click(w,'#action');assert.equal(read(w,'battle'),null);hint(w,'visible');
  assert.equal(visibility(w,'#rescueToast'),'visible');assert.deepEqual(app.errors,[]);
 }finally{app.dispose();}
});
test('an active tournament keeps its disabled remaining-casts status visible during fishing',()=>{
 const app=boot(fixture()),w=app.window;
 try{w.eval('s.tournament=ShuTournament.create("lakeFuna",s.gameMinutes);render()');
  const hud=w.document.querySelector('#tournamentHud');assert.equal(hud.hidden,false);assert.equal(hud.disabled,false);
  click(w,'#action');hint(w,'hidden');assert.equal(hud.hidden,false);assert.equal(hud.disabled,true);assert.equal(visibility(w,'#tournamentHud'),'visible');
  w.beginFishing();stop(w);release(w);hook(w);hint(w,'hidden');assert.equal(hud.hidden,false);assert.equal(visibility(w,'#tournamentHud'),'visible');assert.match(hud.textContent,/残り.*8投/);
  w.endBattle();hint(w,'visible');assert.equal(hud.hidden,false);assert.equal(hud.disabled,false);assert.deepEqual(app.errors,[]);
 }finally{app.dispose();}
});
