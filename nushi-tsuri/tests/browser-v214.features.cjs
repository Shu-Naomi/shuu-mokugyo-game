const assert=require('node:assert/strict'),{chromium}=require('playwright'),{seed,saveKey}=require('./game-harness.cjs');
module.exports=async function run(url,mobile=false){
 const browser=await chromium.launch({headless:true,args:['--no-sandbox']}),errors=[];
 const viewport=mobile?{width:844,height:390}:{width:1280,height:720};
 const context=await browser.newContext({viewport,isMobile:mobile,hasTouch:mobile}),page=await context.newPage();
 page.on('pageerror',e=>errors.push(e.message));
 const saved={...seed(),caught:{...seed().caught,bass:1,moroko:1},money:9000,x:199,y:36};
 try{
  await page.addInitScript(({saved,key})=>{localStorage.setItem('nushi-inugoya-options-v1',JSON.stringify({textSpeed:'instant'}));if(!localStorage.getItem(key))localStorage.setItem(key,JSON.stringify(saved));},{saved,key:saveKey});
  await page.goto(url,{waitUntil:'load'});await page.locator('#start').click();await page.locator('#action').click();
  for(let i=0;i<3;i++)await page.locator('[data-pet-buy="bass"]').click();
  await page.locator('[data-pet-action="aquarium"]').click();
  await page.locator('#petTankStage').scrollIntoViewIfNeeded();
  await page.waitForFunction(()=>document.querySelectorAll('#petTankStage [data-pet-fish] canvas').length===3);
  const before=await page.evaluate(()=>({money:s.money,food:s.petLife.food,fish:JSON.stringify(s.petLife.fish),caught:JSON.stringify(s.caught)}));
  const marker=await page.locator('#petTankStage .pet-fish-target[aria-pressed=true]').evaluate(el=>{
   const c=getComputedStyle(el),arrow=el.querySelector('svg'),box=el.getBoundingClientRect(),icon=arrow.getBoundingClientRect();
   const uid=el.dataset.petInspect,fish=document.querySelector(`[data-pet-fish="${uid}"]`).getBoundingClientRect();
   return {uid,background:c.backgroundColor,image:c.backgroundImage,shadow:c.boxShadow,border:c.borderTopWidth,width:box.width,height:box.height,
    arrowVisible:getComputedStyle(arrow).visibility,arrowAboveFish:icon.bottom<fish.top,arrowWidth:icon.width};
  });
  assert.equal(marker.background,'rgba(0, 0, 0, 0)');assert.equal(marker.image,'none');assert.equal(marker.shadow,'none');assert.equal(marker.border,'0px');
  assert.ok(marker.width>=44&&marker.height>=44,'phone tap target preserved');assert.equal(marker.arrowVisible,'visible');assert.ok(marker.arrowAboveFish);assert.equal(marker.arrowWidth,12);
  const background=await page.locator('.pet-aquarium-scenery').evaluate(async el=>{
   const src=getComputedStyle(el).backgroundImage.match(/url\(["']?(.*?)["']?\)/)[1],image=new Image();image.src=src;await image.decode();
   return {src,width:image.naturalWidth,height:image.naturalHeight};
  });
  assert.match(background.src,/aquarium-interior-v214\.webp/);assert.equal(background.width,1672);assert.equal(background.height,941);
  await page.locator('#petTankStage .pet-fish-target[aria-pressed=true]').click();
  await page.waitForSelector('#petInspectStage');assert.equal(await page.locator('#petInspectStage .pet-aquarium-scenery').count(),1);
  await page.locator('[data-pet-action="focus-close"]').click();await page.locator('[data-pet-action="zoom"]').click();
  const tank=await page.locator('#petTankStage').boundingBox();assert.ok(tank.height<viewport.height&&tank.y+tank.height<viewport.height+1,'whole floor fits in the zoom view');
  console.log('V214_AQUARIUM_SCREENSHOT '+JSON.stringify({mobile,base64:(await page.screenshot({type:'jpeg',quality:82})).toString('base64')}));
  const raster=await page.evaluate(()=>{
   const Art=ShuFishArt,atlas=document.createElement('canvas');atlas.width=1280;atlas.height=1280;const painter=atlas.getContext('2d');
   const colors=Art.groups.swimmers.boxes.slice(0,8).map((box,i)=>{const rgb=[30+i*23,50+i*17,220-i*19];painter.fillStyle=`rgb(${rgb})`;painter.fillRect(...box);return rgb[0]*65536+rgb[1]*256+rgb[2];});
   const c=document.createElement('canvas');c.width=448;c.height=224;const draw=c.getContext('2d');let poses=0,visible=0;
   for(let n=0;n<=24;n++){
    const frame=n/4,h=Math.min(6,Math.floor(frame+.5)),cell=h===6?0:h;Art.draw(draw,atlas,'bass',7,frame);
    const data=draw.getImageData(0,0,448,224).data;let count=0;
    for(let p=0;p<data.length;p+=4)if(data[p+3]>100){count++;const rgb=data[p]*65536+data[p+1]*256+data[p+2];if(rgb!==colors[cell]||data[p+3]!==255)throw Error('mixed original or translucent stripe at '+frame);}
    if(count<3500)throw Error('incomplete turn '+frame);visible+=count;poses++;
   }
   return {poses,visible};
  });
  assert.equal(raster.poses,25);assert.deepEqual(await page.evaluate(()=>({money:s.money,food:s.petLife.food,fish:JSON.stringify(s.petLife.fish),caught:JSON.stringify(s.caught)})),before);
  await page.reload({waitUntil:'load'});await page.locator('#start').click();await page.locator('#action').click();await page.locator('[data-pet-action="aquarium"]').click();
  assert.equal(await page.locator('#petTankStage [data-pet-fish]').count(),3);assert.deepEqual(await page.evaluate(()=>({money:s.money,food:s.petLife.food,fish:JSON.stringify(s.petLife.fish),caught:JSON.stringify(s.caught)})),before);
  assert.deepEqual(errors,[]);console.log('V214_AQUARIUM_AND_INTACT_RASTER_PASS '+JSON.stringify({mobile,marker,background,raster,tank,reload:true,errors}));
 }finally{await browser.close();}
};
