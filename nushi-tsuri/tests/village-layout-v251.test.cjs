const {test}=require('node:test'),assert=require('node:assert/strict');
const {boot,seed,read,saveKey}=require('./game-harness.cjs');
const facilities=[
 {id:'farmhouse',name:'湖畔の釣り宿',x:43,y:34,modal:'locationInterior'},
 {id:'sam-shop',name:'サムショップ',x:198,y:93,modal:'store'},
 {id:'fish-market',name:'港の魚屋',x:160,y:105,modal:'locationInterior'}
];
const progress=w=>read(w,'({money:s.money,hp:s.hp,time:s.gameMinutes,caught:s.caught,baits:s.baits,equipment:s.equipment,pet:s.petLife,story:s.lakeStory,quests:s.questCompletions,memories:s.catchMemories,records:s.fishCatchRecords})');

for(const facility of facilities)test('village layout audit: walk from the home path, enter and leave '+facility.name+' without losing progress',()=>{
 const app=boot({...seed(),x:10,y:79,direction:'right',soundEnabled:false}),w=app.window;let saved,position;
 try{
  w.Math.random=()=>.999999;const before=progress(w);
  const route=read(w,`(()=>{
   const goal=${JSON.stringify(facility)},start={x:s.x,y:s.y,d:s.direction,path:[]},queue=[start],seen=new Set([start.x+','+start.y+','+start.d]);
   for(let i=0;i<queue.length;i++){
    const p=queue[i];if(p.d==='up'&&Math.hypot(p.x-goal.x,p.y-goal.y)<=3)return p.path;
    for(const d of ['left','right','up','down']){const n={...ShuWorldLife.moveTarget(p.x,p.y,d,4,isWalkableWorld),d},key=n.x+','+n.y+','+d;
     if(!seen.has(key)){seen.add(key);queue.push({...n,path:[...p.path,d]});}}
   }throw Error('No route to '+goal.name);
  })()`);
  for(const direction of route)w.move(direction);
  position=read(w,'({x:s.x,y:s.y,direction:s.direction})');assert.ok(w.isWalkableWorld(position.x,position.y));
  if(facility.id==='sam-shop')assert.equal(w.isAtSamShopEntrance(),true);else assert.equal(w.nearbyWorldLandmark().id,facility.id);
  w.action();assert.equal(w.document.querySelector('#'+facility.modal).classList.contains('open'),true);
  if(facility.modal==='locationInterior')assert.equal(read(w,'activeLocationId'),facility.id);
  w.close();assert.equal(w.document.querySelector('#'+facility.modal).classList.contains('open'),false);
  assert.deepEqual(read(w,'({x:s.x,y:s.y,direction:s.direction})'),position);assert.deepEqual(progress(w),before);
  w.save();saved=JSON.parse(w.localStorage.getItem(saveKey));assert.deepEqual(app.errors,[]);
  console.log('V251_VILLAGE_ACCESS '+JSON.stringify({id:facility.id,steps:route.length,position,realMovement:true,enterExit:true,progressPreserved:true}));
 }finally{app.dispose();}
 const resumed=boot(saved);try{assert.deepEqual(read(resumed.window,'({x:s.x,y:s.y,direction:s.direction})'),position);assert.deepEqual(resumed.errors,[]);}finally{resumed.dispose();}
});
