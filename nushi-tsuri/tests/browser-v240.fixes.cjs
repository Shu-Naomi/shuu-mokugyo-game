const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
module.exports=async function fixes(page,mobile,viewport){
 const original=await page.evaluate(()=>JSON.parse(JSON.stringify(s))),directory=path.join(__dirname,'browser-evidence-v238');fs.mkdirSync(directory,{recursive:true});
 const press=q=>page.locator(q)[mobile?'tap':'click']();
 const shot=async name=>{await page.evaluate(()=>hideFieldMenu());await page.waitForTimeout(250);await page.screenshot({path:path.join(directory,(mobile?'touch':'pc')+'-'+viewport.width+'x'+viewport.height+'-v240-'+name+'.png')});};
 try{
  await page.evaluate(()=>{close();Object.assign(s,{mapRegion:'mountainPond',...ShuMountain.regions.mountainPond.entry,boatActive:false});render();});
  for(const d of ['left','right','up','down']){
   await page.evaluate(()=>{Object.assign(s,ShuMountain.regions.mountainPond.entry);render();});const before=await page.evaluate(()=>[s.x,s.y]);
   await press('[data-move="'+d+'"]');assert.notDeepEqual(await page.evaluate(()=>[s.x,s.y]),before,'pond entrance '+d);
  }
  await shot('pond-path');
  await page.evaluate(()=>{s.mapRegion='stream';s.x=164;s.y=69;render();});await shot('stream-buildings');
  await page.evaluate(()=>{Object.assign(s,{mapRegion:'village',x:210,y:104});render();cast({zone:'sea',waterZone:'sea',waterX:210,waterY:110});});
  await page.waitForFunction(()=>{renderPixelCast();return pixelCastModel?.facing==='down';});
  assert.equal(await page.evaluate(()=>battle.minimumDepth),'shallow');assert.ok(await page.evaluate(()=>pixelCastModel.tip.y>pixelCastModel.hand.y));await shot('harbor-facing');
  await page.evaluate(()=>{battle=null;$('#fishScene').classList.remove('active');s.caught.funa=Math.max(1,s.caught.funa||0);petUi.open("shop");});await page.locator('#petLifeModal.open').waitFor();
  for(const tab of ['fish','supplies','legends','buyback','contests']){
   await press('[data-pet-tab="'+tab+'"]');
   const fit=await page.locator('#petLifeModal').evaluate(n=>{const r=n.getBoundingClientRect(),buttons=[...n.querySelectorAll('button')].filter(b=>b.getClientRects().length&&!b.disabled);return {scroll:n.scrollHeight-n.clientHeight,inside:r.left>=0&&r.top>=0&&r.right<=innerWidth+1&&r.bottom<=innerHeight+1,controls:buttons.every(b=>{const p=b.getBoundingClientRect();return p.width>=43.9&&p.height>=43.9&&p.left>=r.left-1&&p.right<=r.right+1&&p.top>=r.top-1&&p.bottom<=r.bottom+1;})};});assert.ok(fit.inside&&fit.controls&&fit.scroll<=1,tab+' '+JSON.stringify(fit));
   if(tab==='fish')await shot('asual-shop');
  }
  console.log('[PASS] v240 pond touch movement, buildings, front-facing harbor, shallow cast and all Asual tabs '+viewport.width+'x'+viewport.height);
 }finally{await page.evaluate(original=>{close();battle=null;$('#fishScene').classList.remove('active');Object.assign(s,original);render();},original);}
};
