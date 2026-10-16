const assert=require('node:assert/strict'),path=require('node:path'),fs=require('node:fs'),M=require('../mountain-region.js');
module.exports=async function guide(page,mobile,viewport){
 const press=q=>page.locator(q)[mobile?'tap':'click'](),directory=path.join(__dirname,'browser-evidence-v238');fs.mkdirSync(directory,{recursive:true});
 const initial=await page.evaluate(()=>JSON.parse(JSON.stringify(s))),snapshot=()=>page.evaluate(()=>JSON.stringify({money:s.money,hp:s.hp,time:s.gameMinutes,caught:s.caught,baits:s.baits,equipment:s.equipment,rod:s.selectedRod,bait:s.selectedBait,hook:s.selectedHook,x:s.x,y:s.y,region:s.mapRegion,direction:s.direction}));
 let places=0;
 async function fit(){
  const result=await page.locator('#fieldGuide').evaluate(n=>{const r=n.getBoundingClientRect(),art=n.querySelector('#fieldGuideMapArt').getBoundingClientRect(),note=n.querySelector('#fieldGuideNote'),buttons=[...n.querySelectorAll('button')].filter(b=>!b.disabled);
   return {visible:r.left>=0&&r.top>=0&&r.right<=innerWidth+1&&r.bottom<=innerHeight+1,scroll:n.scrollHeight-n.clientHeight,ratio:art.width/art.height,
    controls:buttons.every(b=>{const p=b.getBoundingClientRect();return p.height>=43.9&&p.width>=43.9&&p.left>=r.left&&p.right<=r.right+1&&p.top>=r.top&&p.bottom<=r.bottom+1;}),note:note.scrollHeight<=note.clientHeight+1,overlap:n.querySelector('.field-guide-footer').getBoundingClientRect().top>=n.querySelector('.field-guide-pagination').getBoundingClientRect().bottom-1};});
  assert.ok(result.visible&&result.controls&&result.note&&result.overlap&&result.scroll<=1,JSON.stringify(result));assert.ok(Math.abs(result.ratio-16/9)<.04,JSON.stringify(result));
 }
 for(const region of ['village','stream','mountainPond','mountainMarsh','wetland','cave','coast']){
  await page.evaluate(region=>{close();Object.assign(s,{mapRegion:region,boatActive:false,...(ShuMountain.regions[region]?.entry||(region==='coast'?{x:146,y:70,direction:'down'}:{x:10,y:79,direction:'left'}))});render();save();},region);
  const before=await snapshot(),stored=await page.evaluate(()=>localStorage.getItem('nushi-inugoya-v2'));
  if(await page.locator('#fieldMenu').getAttribute('aria-hidden')!=='false')await press('#menu');await press('[data-field-menu-target="record"]');await press('#fishdexFieldGuide');await page.locator('#fieldGuide.open').waitFor();
  assert.equal(await page.locator('#record.open').count(),0);await fit();
  const entries=await page.evaluate(()=>ShuFieldGuide.model(s,{mountain:ShuMountain,coast:ShuCoast,life:ShuWorldLife,additions:ShuFishAdditions,baits:baitData,hooks:ShuTackle.hooks,lakePolygon:lakeWaterPolygon}).entries.map(e=>({id:e.id,name:e.name,kind:e.kind})));
  let seen=0;
  do{
   const ids=await page.locator('[data-guide-place]').evaluateAll(bs=>bs.map(b=>b.dataset.guidePlace));assert.ok(ids.length>0&&ids.length<=3);
   for(const id of ids){await press('[data-guide-place="'+id+'"]');const e=entries.find(e=>e.id===id);assert.equal(await page.locator('[data-guide-place="'+id+'"]').getAttribute('aria-pressed'),'true');assert.ok((await page.locator('#fieldGuideMap').getAttribute('aria-label')).includes(e.name));await fit();seen++;places++;
    if(region==='mountainPond'&&e.kind==='water'||id==='wetland-shop'||region==='coast'&&e.id==='water-sand'){
     await page.waitForFunction(()=>{const art=document.querySelector('#fieldGuideMapArt'),url=getComputedStyle(art).backgroundImage.slice(5,-2),im=new Image();im.src=url;return im.complete&&im.naturalWidth>0;});
     if(e.kind==='shop')await page.waitForFunction(()=>[...document.querySelectorAll('#fieldGuideBuildings canvas')].every(c=>{const p=c.getContext('2d').getImageData(0,0,c.width,c.height).data;return p.some((x,i)=>i%4===3&&x>100);}));
     await page.screenshot({path:path.join(directory,(mobile?'touch':'pc')+'-'+viewport.width+'x'+viewport.height+'-guide-'+(e.kind==='water'?region:e.id)+'.png')});
    }
   }
   if(await page.locator('#fieldGuideNext').isDisabled())break;await press('#fieldGuideNext');
  }while(true);
  assert.equal(seen,entries.length,region+' every place is reachable');
  if(!mobile){await page.locator('#fieldGuideClose').focus();await page.keyboard.press('Shift+Tab');assert.equal(await page.evaluate(()=>document.activeElement.closest('#fieldGuide')?.id),'fieldGuide');await page.keyboard.press('Tab');assert.equal(await page.evaluate(()=>document.activeElement.id),'fieldGuideClose');await page.keyboard.press('Escape');}
  else await press('#fieldGuideClose');
  await page.locator('#record.open').waitFor();assert.equal(await page.evaluate(()=>document.activeElement.id),'fishdexFieldGuide');assert.equal(await snapshot(),before);assert.equal(await page.evaluate(()=>localStorage.getItem('nushi-inugoya-v2')),stored);await press('#record [data-close]');
 }
 await page.evaluate(initial=>{Object.assign(s,initial);render();},initial);
 console.log('V239_FIELD_GUIDE_PASS '+JSON.stringify({mobile,viewport,regions:7,places,scroll:false,minimumTap:44,saveAndResourcesUnchanged:true,returnsToRecord:true}));
};
