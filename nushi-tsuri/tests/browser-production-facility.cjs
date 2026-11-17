// Actual production entrance regression helper. Plans read-only, executes each
// direction and the final interaction using real pointer inputs. No relocation.
const assert=require('node:assert/strict');
const {planVillageRoute}=require('./browser-reference-village-evidence.cjs');
module.exports=async function enterProductionFacility(page,{id,modal,mobile=false,legacyKey,legacyRaw}={}){
 await page.waitForFunction(()=>globalThis.ShuVillageReleaseGate?.started===true,null,{timeout:45000});
 assert.equal(await page.evaluate(()=>!!ShuVillageReleaseCandidate&&ShuVillageReference.enabled&&s.mapRegion==='village'),true,'live generated production village');
 const predicate=`(x,y,d)=>d==='up'&&nearbyWorldLandmark(x,y,d)?.id===${JSON.stringify(id)}`;
 const route=await page.evaluate(planVillageRoute,predicate);
 async function idle(){
  await page.waitForFunction(()=>!forageDiscoveryInProgress&&!rescueInProgress&&!playerHomeState.transitioning,null,{timeout:10000});
  assert.equal(await page.evaluate(()=>playerHomeIsActive()||!!battle||ShuVillageSaveRuntime.isSuspended()||!!document.querySelector('.modal.open')),false,'facility route accepts input');
 }
 await page.evaluate(()=>{
  if(!window.__productionFacilityInputs){
   window.__productionFacilityInputs=[];
   document.addEventListener('pointerdown',event=>{
    const button=event.target.closest?.('[data-move],#action');
    if(button)window.__productionFacilityInputs.push({control:button.dataset.move||button.id,pointerType:event.pointerType});
   },true);
  }
 });
 const press=async(q,control)=>{
  const before=await page.evaluate(()=>window.__productionFacilityInputs.length);
  await page.locator(q)[mobile?'tap':'click']();
  const input=await page.evaluate(()=>({count:window.__productionFacilityInputs.length,last:window.__productionFacilityInputs.at(-1)}));
  assert.equal(input.count,before+1,'one pointerdown per requested control, without retries');
  assert.deepEqual(input.last,{control,pointerType:mobile?'touch':'mouse'});
 };
 for(const direction of route){
  await idle();
  const expected=await page.evaluate(d=>ShuWorldLife.moveTarget(s.x,s.y,d,4,isWalkableWorld),direction);
  await press(`[data-move="${direction}"]`,direction);
  const actual=await page.evaluate(()=>({x:s.x,y:s.y,direction:s.direction,region:s.mapRegion,walkable:isWalkableWorld(s.x,s.y)}));
  assert.equal(actual.region,'village');assert.equal(actual.walkable,true);
  assert.equal(actual.direction,direction);assert.ok(Math.abs(actual.x-expected.x)<1e-7&&Math.abs(actual.y-expected.y)<1e-7,'real pointer input follows collision-safe route');
 }
 await idle();assert.equal(await page.evaluate(()=>nearbyWorldLandmark()?.id),id,'at actual facility entrance');
 await press('#action','action');await page.locator(modal+'.open').waitFor({state:'visible'});
 if(legacyKey)assert.equal(await page.evaluate(key=>localStorage.getItem(key),legacyKey),legacyRaw,'entrance and production migration preserve legacy bytes');
 return {facility:id,steps:route.length,realPointerInput:mobile?'touch':'mouse'};
};
