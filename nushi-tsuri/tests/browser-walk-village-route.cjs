// Native UI approach to a live village predicate, not position injection.
const assert=require('node:assert/strict');
const {planVillageRoute}=require('./browser-reference-village-evidence.cjs');
module.exports=async function walkVillage(page,mobile,predicate,{frozenClock=false,label='village approach'}={}){
 const press=q=>page.locator(q)[mobile?'tap':'click']();
 async function ready(){
  if(frozenClock){for(let n=0;n<80&&await page.evaluate(()=>forageDiscoveryInProgress);n++)await page.clock.runFor(100);assert.equal(await page.evaluate(()=>forageDiscoveryInProgress),false,label+': dog discovery finishes within eight seconds');}
  else await page.waitForFunction(()=>!forageDiscoveryInProgress,null,{timeout:8000});
 }
 await ready();
 const route=await page.evaluate(planVillageRoute,predicate);
 await page.evaluate(()=>{if(window.__villageRoutePointers===undefined){window.__villageRoutePointers=0;document.addEventListener('pointerdown',e=>{if(e.target.closest('[data-move]'))window.__villageRoutePointers++;},true);}});
 for(const direction of route){
  await ready();
  const before=await page.evaluate(()=>({x:s.x,y:s.y,events:window.__villageRoutePointers,forage:forageDiscoveryInProgress,rescue:rescueInProgress,home:playerHomeIsActive(),transition:playerHomeState.transitioning,battle:!!battle,modals:document.querySelectorAll('.modal.open').length,suspended:ShuVillageSaveRuntime.isSuspended()}));
  assert.ok(!before.forage&&!before.rescue&&!before.home&&!before.transition&&!before.battle&&!before.modals&&!before.suspended,label+': input ready '+JSON.stringify(before));
  const expected=await page.evaluate(d=>ShuWorldLife.moveTarget(s.x,s.y,d,4,isWalkableWorld),direction);
  await press('[data-move="'+direction+'"]');
  const actual=await page.evaluate(()=>({x:s.x,y:s.y,region:s.mapRegion,events:window.__villageRoutePointers,forage:forageDiscoveryInProgress}));
  const detail=JSON.stringify({direction,before,expected,actual});
  assert.equal(actual.events,before.events+1,label+': one pointerdown '+detail);
  assert.equal(actual.region,'village',label+': stays in village '+detail);
  assert.deepEqual({x:actual.x,y:actual.y},expected,label+': exact one-input move '+detail);
  if(frozenClock)await page.clock.runFor(50);
 }
 await ready();
 assert.equal(await page.evaluate(p=>eval('('+p+')')(s.x,s.y,s.direction),predicate),true,label+': real player meets destination');
 return {label,steps:route.length,path:route,...await page.evaluate(()=>({x:s.x,y:s.y,direction:s.direction}))};
};
