const {test}=require('node:test'),assert=require('node:assert/strict');
const {boot,seed,read,saveKey}=require('./game-harness.cjs');
const Slots=require('../save-slots.js');
async function settle(w){for(let n=0;n<90;n++){if(!w.eval('playerHomeState.transitioning'))return;await new Promise(r=>w.setTimeout(r,10));}throw Error('home transition');}
async function enter(w){w.eval('move("left")');await settle(w);w.eval('for(let i=0;i<9;i++)move("right");for(let i=0;i<3;i++)move("up")');w.document.querySelector('#action').click();await settle(w);assert.equal(read(w,'playerHomeState.area'),'interior');}
function walk(w,condition){assert.equal(w.eval(`(()=>{
 const queue=[{x:playerHomeState.x,y:playerHomeState.y,path:[]}],seen=new Set();
 for(let n=0;n<queue.length;n++){const point=queue[n],key=point.x+','+point.y;if(seen.has(key))continue;seen.add(key);
 if(${condition}){for(const d of point.path)if(!movePlayerHome(d))throw Error('blocked');return true;}
 for(const d of ['left','right','up','down']){const next=playerHomeMoveTarget('interior',point.x,point.y,d);if(next.x!==point.x||next.y!==point.y)queue.push({...next,path:[...point.path,d]});}}
 return false;})()`),true);}
const click=(w,s)=>w.document.querySelector(s).click();

test('A on a home dog chooses one outdoor companion while all three remain at home',async()=>{
 const app=boot({...seed(),x:10,y:79,direction:'left'}),w=app.window;
 try{
  assert.equal(read(w,'s.dogFollowing'),true);await enter(w);
  walk(w,`!nearbyPlayerHomeEvent('interior',point.x,point.y)&&nearbyHomeDog(point.x,point.y)?.dogId==='riku'`);
  click(w,'#action');assert.equal(read(w,'dogCareSelectedId'),'riku');assert.equal(read(w,'s.dog'),'shuu');
  click(w,'#dogCareTakeFishing');
  assert.equal(read(w,'s.dog'),'riku');assert.equal(read(w,'s.dogFollowing'),true);
  assert.equal(w.document.querySelectorAll('[data-home-dog]').length,3);
  walk(w,`nearbyPlayerHomeEvent('interior',point.x,point.y)?.id==='interior-door'`);
  click(w,'#action');await settle(w);
  w.eval('transitionPlayerHome("map")');await settle(w);
  assert.equal(w.document.querySelectorAll('.companion').length,1);
  assert.equal(w.document.querySelector('#dog').hidden,false);
  assert.match(w.document.querySelector('#dog').className,/riku/);
  assert.deepEqual(app.errors,[]);
 }finally{app.dispose();}
});

test('staying home survives reload, stops absent-dog rewards and preserves a separate save slot',async()=>{
 const first={...seed(),dog:'grey',dogFollowing:true},secondKey=Slots.keyFor(2);
 const app=boot(first,undefined,{url:'http://localhost/nushi-tsuri/?saveSlot=2',storage:{[secondKey]:{...seed(),x:10,y:79,direction:'left'}}}),w=app.window;let saved;
 try{
  await enter(w);w.openDogCare('shuu');assert.equal(w.document.querySelector('#dogCareStayHome').disabled,false);
  click(w,'#dogCareStayHome');assert.equal(read(w,'s.dogFollowing'),false);
  assert.equal(w.document.querySelectorAll('[data-home-dog]').length,3);
  assert.equal(w.document.querySelector('#dog').hidden,true);
  const before=read(w,'s');
  assert.equal(w.maybeDogDiscoverForagePoint(()=>0),false);
  assert.equal(w.startDogForageDiscovery(read(w,'foragePointData[0]'),'wildGreens'),false);
  assert.deepEqual(read(w,'s'),before);
  w.eval('s.money=0;for(const id of Object.keys(s.baits))s.baits[id]=0');
  assert.equal(w.canReceiveDogRescue(),false);
  w.eval('save()');saved=JSON.parse(w.localStorage.getItem(secondKey));
  assert.equal(w.localStorage.getItem(saveKey),JSON.stringify(first));assert.deepEqual(app.errors,[]);
 }finally{app.dispose();}
 const resumed=boot(first,undefined,{url:'http://localhost/nushi-tsuri/?saveSlot=2',storage:{[secondKey]:saved}});
 try{
  assert.equal(read(resumed.window,'s.dogFollowing'),false);assert.equal(resumed.window.document.querySelector('#dog').hidden,true);
  resumed.window.openDogCare('riku');click(resumed.window,'#dogCareTakeFishing');
  assert.equal(read(resumed.window,'s.dogFollowing'),true);assert.equal(read(resumed.window,'s.dog'),'riku');
  assert.equal(resumed.window.document.querySelector('#dog').hidden,false);assert.deepEqual(resumed.errors,[]);
 }finally{resumed.dispose();}
});

test('care redraws show petting, chewing and a run home without repeating training or item rewards',()=>{
 const app=boot({...seed(),dogTreats:{samBiscuit:3}}),w=app.window;
 const original=w.Date.now;let now=10000;w.Date.now=()=>now;
 try{
  for(const id of ['shuu','riku','grey']){
   w.openDogCare(id);click(w,'#dogCarePet');const petState=read(w,'s');
   for(let n=0;n<20;n++)w.drawDogCareScene(now+400+n*40);
   assert.match(w.document.querySelector('#dogCareSceneLabel').textContent,/目を細め/);assert.deepEqual(read(w,'s'),petState);
   now+=2000;w.advanceDogCareScene();
   click(w,'#dogCareTrain');const trained=read(w,'s');
   w.drawDogCareScene(now+200);assert.match(w.document.querySelector('#dogCareSceneLabel').textContent,/走って/);
   w.drawDogCareScene(now+1800);assert.match(w.document.querySelector('#dogCareSceneLabel').textContent,/戻ろう/);
   assert.deepEqual(read(w,'s'),trained);assert.equal(w.trainDogCare(),false);
   now+=2600;w.advanceDogCareScene();assert.equal(w.trainDogCare(),false,'one training reward per dog/day');
   click(w,'[data-give-dog-treat="samBiscuit"]');const fed=read(w,'s');
   w.drawDogCareScene(now+1400);assert.match(w.document.querySelector('#dogCareSceneLabel').textContent,/もぐもぐ/);
   assert.deepEqual(read(w,'s'),fed);assert.equal(w.giveDogTreat('samBiscuit'),false);
   now+=2600;w.advanceDogCareScene();
  }
  assert.equal(read(w,'s.dogTreats.samBiscuit'),0);
  assert.deepEqual(app.errors,[]);
 }finally{w.Date.now=original;app.dispose();}
});
