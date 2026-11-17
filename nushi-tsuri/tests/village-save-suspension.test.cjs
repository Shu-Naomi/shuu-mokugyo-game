'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const {boot,seed,read,saveKey}=require('./game-harness.cjs');
const wait=ms=>new Promise(resolve=>setTimeout(resolve,ms));
test('dormant hook leaves ordinary saving intact, then irreversibly blocks stale saves and held movement',async()=>{
 const app=boot(),w=app.window;try{
  const hook=w.ShuVillageSaveRuntime;assert.equal(hook.isSuspended(),false);
  w.eval('s.money=4322');assert.equal(w.save(),true);assert.equal(JSON.parse(w.localStorage.getItem(saveKey)).money,4322);
  const button=w.document.querySelector('[data-move="right"]');button.dispatchEvent(new w.Event('pointerdown',{bubbles:true,cancelable:true}));
  w.eval('s.money=9000;scheduleSave()');hook.suspend();hook.suspend();
  assert.equal(w.document.querySelector('#game').style.display,'none');
  const pos=read(w,'[s.x,s.y,s.gameMinutes]');assert.equal(read(w,'moveHoldInterval'),0);assert.equal(read(w,'saveTimer'),0);
  w.move('right');w.scheduleSave();w.dispatchEvent(new w.Event('focus'));w.document.dispatchEvent(new w.Event('visibilitychange'));w.dispatchEvent(new w.Event('pageshow'));
  await wait(800);assert.deepEqual(read(w,'[s.x,s.y,s.gameMinutes]'),pos);assert.equal(w.save(),false);assert.equal(JSON.parse(w.localStorage.getItem(saveKey)).money,4322);assert.equal(hook.isSuspended(),true);assert.deepEqual(app.errors,[]);
 }finally{app.dispose();}
});
test('real fight cannot resume or restart cast and art animation after save suspension',async()=>{
 const app=boot({...seed(),fightMode:'nushi'}),w=app.window;try{
  w.eval('cast();beginFishing();battle.cast=50;launchSurfaceCast();settleSurfaceCast();startFight();');
  assert.ok(read(w,'battle'));w.ShuVillageSaveRuntime.suspend();
  const state=read(w,'({phase:battle.phase,x:battle.x,y:battle.y,retrieval:battle.retrieval,ticks:battle.nushiRunTicks,ten:battle.ten,pausedAt:battle.pausedAt})');assert.ok(state.pausedAt);
  w.resumeBattle();w.startSurfaceCastAnimation();w.startBattleFishArt();w.dispatchEvent(new w.Event('focus'));w.document.dispatchEvent(new w.Event('visibilitychange'));
  await wait(300);assert.deepEqual(read(w,'({phase:battle.phase,x:battle.x,y:battle.y,retrieval:battle.retrieval,ticks:battle.nushiRunTicks,ten:battle.ten,pausedAt:battle.pausedAt})'),state);
  assert.deepEqual(read(w,'[timer,surfaceCastAnimationFrame,battleArtAnimationFrame]'),[0,0,0]);assert.deepEqual(app.errors,[]);
 }finally{app.dispose();}
});
test('active dog care stops advancing while recovery waits',async()=>{
 const app=boot(),w=app.window;try{
  w.openDogCare('shuu');assert.equal(w.petDogCare(),true);w.advanceDogCareScene();w.ShuVillageSaveRuntime.suspend();
  assert.equal(w.document.querySelectorAll('.modal.open').length,0);
  const state=read(w,'({scene:dogCareScene,catchGame:dogCatchGame,affinity:s.dogAffinity})');
  w.advanceDogCareScene();w.advancePetSceneFrame();w.dispatchEvent(new w.Event('focus'));await wait(200);
  assert.deepEqual(read(w,'({scene:dogCareScene,catchGame:dogCatchGame,affinity:s.dogAffinity})'),state);assert.deepEqual(app.errors,[]);
 }finally{app.dispose();}
});
