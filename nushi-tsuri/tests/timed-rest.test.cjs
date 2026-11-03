const {test}=require('node:test'),assert=require('node:assert/strict');
const Rest=require('../timed-rest.js'),{boot,read,saveKey}=require('./game-harness.cjs');
test('target times roll forward once and reject invalid input',()=>{
 assert.equal(Rest.targetMinute(500,'09:00'),540);assert.equal(Rest.targetMinute(540,'09:00'),1980);assert.equal(Rest.targetMinute(1400,'01:00'),1500);
 for(const value of ['',null,'24:00','12:60','9:00','x'])assert.equal(Rest.targetMinute(0,value),null);
});
test('inn time selection commits once, saves immediately, and tap/close cannot advance time again',()=>{
 const app=boot(),w=app.window;try{
 w.openLocationInterior('farmhouse');assert.equal(w.document.querySelector('#locationTimedRest').hidden,false);
 assert.equal(w.openTimedRest('inn'),true);w.document.querySelector('#timedRestTime').value='09:00';
 const before=read(w,'s.gameMinutes');assert.equal(before,500);assert.equal(w.beginTimedRest(),true);assert.equal(w.beginTimedRest(),false);
 assert.equal(read(w,'s.gameMinutes'),540);assert.equal(read(w,'s.hp'),100);assert.equal(JSON.parse(w.localStorage.getItem(saveKey)).gameMinutes,540);
 w.document.querySelector('#timedRestFilm').click();w.document.querySelector('#timedRestFilm').click();w.close();
 assert.equal(read(w,'s.gameMinutes'),540);assert.equal(w.document.querySelector('#timedRest').classList.contains('open'),false);assert.equal(read(w,'timedRestPresentation'),null);
 assert.deepEqual(app.errors,[]);
 }finally{app.dispose();}
});
test('cancel inn chooser preserves state and returns to inn; old overnight rest still wakes at 06:00',()=>{
 const app=boot(),w=app.window;try{
 w.openLocationInterior('farmhouse');const before=read(w,'({clock:s.gameMinutes,hp:s.hp,money:s.money})');w.openTimedRest('inn');w.document.querySelector('#timedRestCancel').click();assert.deepEqual(read(w,'({clock:s.gameMinutes,hp:s.hp,money:s.money})'),before);assert.equal(w.document.querySelector('#locationInterior').classList.contains('open'),true);w.useLocationService();assert.equal(read(w,'s.gameMinutes'),1800);
 }finally{app.dispose();}
});
test('camp is restricted to the village lake shore and does not heal or spend inventory',()=>{
 const app=boot(),w=app.window;try{
 const point=w.eval(`(()=>{for(let x=1;x<240;x+=2)for(let y=1;y<135;y+=2){s.x=x;s.y=y;if(isWalkableWorld(x,y)&&canCampAtLake())return {x,y};}return null;})()`);assert.ok(point);
 w.render();assert.equal(w.document.querySelector('#lakeCampMenu').hidden,false);
 const before=read(w,'({hp:s.hp,money:s.money,baits:s.baits,x:s.x,y:s.y})');assert.equal(w.openTimedRest('camp'),true);w.document.querySelector('#timedRestTime').value='08:30';w.beginTimedRest();w.finishTimedRest();assert.equal(read(w,'s.gameMinutes'),510);assert.deepEqual(read(w,'({hp:s.hp,money:s.money,baits:s.baits,x:s.x,y:s.y})'),before);
 w.eval('s.mapRegion="coast"');assert.equal(w.canCampAtLake(),false);assert.equal(w.openTimedRest('camp'),false);
 assert.deepEqual(app.errors,[]);
 }finally{app.dispose();}
});
test('hidden page, pagehide, reduced motion and finish cancel every frame and callback exactly once',()=>{
 for(const cause of ['visibilitychange','pagehide','finish','reduced']){
  let now=0,seq=0,callbacks=new Map(),done=0,draws=0;const events={},winEvents={},media={matches:cause==='reduced',addEventListener(){},removeEventListener(){}};
  const env={Image:class {complete=false;},addEventListener:(t,f)=>winEvents[t]=f,removeEventListener:t=>delete winEvents[t]};
  const doc={hidden:false,defaultView:env,addEventListener:(t,f)=>events[t]=f,removeEventListener:t=>delete events[t]};
  const context=new Proxy({},{get:()=>()=>{}}),canvas={ownerDocument:doc,getContext:()=>context};
  const animation=Rest.present(canvas,{from:500,to:600,clock:{now:()=>now,request:f=>{callbacks.set(++seq,f);return seq;},cancel:id=>callbacks.delete(id)},media,onFrame:()=>draws++,onFinish:()=>done++});
  if(cause==='visibilitychange'){doc.hidden=true;events.visibilitychange();}else if(cause==='pagehide')winEvents.pagehide();else if(cause==='finish')animation.finish();
  animation.finish();assert.equal(done,1);assert.equal(callbacks.size,0);assert.equal(animation.snapshot().active,false);assert.equal(Object.keys(events).length,0);assert.equal(Object.keys(winEvents).length,0);
 }
});
test('normal presentation ends at one second without scheduling a second run',()=>{
 let now=0,id=0,done=0,frames=new Map(),clockText=[];
 const env={Image:class {complete=false;},addEventListener(){},removeEventListener(){}},doc={hidden:false,defaultView:env,addEventListener(){},removeEventListener(){}},ctx=new Proxy({},{get:()=>()=>{}});
 const animation=Rest.present({ownerDocument:doc,getContext:()=>ctx},{from:500,to:600,clock:{now:()=>now,request:fn=>{frames.set(++id,fn);return id;},cancel:key=>frames.delete(key)},media:{matches:false},onFrame:text=>clockText.push(text),onFinish:()=>done++});
 while(frames.size&&now<=1000){now+=100;const callbacks=[...frames.values()];frames.clear();for(const fn of callbacks)fn(now);}
 assert.equal(now,1000);assert.equal(done,1);assert.equal(frames.size,0);assert.equal(clockText.at(-1),'10:00');assert.equal(animation.snapshot().active,false);
});
test('selected rest does not modify another save slot and tournament rest is rejected',()=>{
 const other='nushi-inugoya-v2-slot2',marker=JSON.stringify({gameMinutes:77,playerName:'別の冒険'}),app=boot(undefined,undefined,{storage:{[other]:marker}}),w=app.window;
 try{w.openLocationInterior('farmhouse');w.openTimedRest('inn');w.beginTimedRest();w.finishTimedRest();assert.equal(w.localStorage.getItem(other),marker);w.openLocationInterior('farmhouse');w.eval('s.tournament={phase:"active"}');assert.equal(w.openTimedRest('inn'),false);assert.equal(w.canCampAtLake(),false);}finally{app.dispose();}
});
