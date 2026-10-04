const assert=require('node:assert/strict'),{chromium}=require('playwright'),{seed,saveKey}=require('./game-harness.cjs');
module.exports=async function run(url,mobile=false){
 const browser=await chromium.launch({headless:true,args:['--no-sandbox']}),errors=[],failed=[];
 const viewport=mobile?{width:844,height:390}:{width:1280,height:720},context=await browser.newContext({viewport,isMobile:mobile,hasTouch:mobile}),page=await context.newPage();
 page.on('pageerror',e=>errors.push(e.message));page.on('response',r=>{if(r.status()>=400&&/lake-intro|player-home-interior|sam-sprites|(?:shuu|riku|grey)-walk/.test(r.url()))failed.push(r.status()+' '+r.url());});
 const resources=()=>page.evaluate(()=>JSON.stringify({money:s.money,hp:s.hp,caught:s.caught,baits:s.baits,clock:s.gameMinutes,pets:s.petLife,quests:s.questCompletions,x:s.x,y:s.y}));
 async function visible(){await page.locator('#lakeIntro.open').waitFor({state:'visible'});assert.equal(await page.locator('#lakeIntroNext').evaluate(el=>document.activeElement===el),true);}
 async function containment(){
  for(const id of ['lakeIntro','lakeIntroSkip','lakeIntroNext']){
   const b=await page.locator('#'+id).boundingBox();assert.ok(b.x>=-1&&b.y>=-1&&b.x+b.width<=viewport.width+1&&b.y+b.height<=viewport.height+1,id+' within viewport '+JSON.stringify(b));
   if(id!=='lakeIntro')assert.ok(b.height>=44,id+' touch height');
  }
  assert.equal(await page.locator('.controls').evaluate(el=>el.inert),true);
 }
 try{
  await page.goto(url,{waitUntil:'load'});await page.locator('[data-dog="grey"]').click();await page.locator('#start').click();await visible();await containment();
  const before=await resources();assert.equal(await page.locator('#lakeIntroProgress').innerText(),'1 / 5');
  await page.keyboard.press('ArrowRight');await page.keyboard.press('z');assert.equal(await resources(),before);
  await page.locator('#lakeIntroNext').click();assert.match(await page.locator('#lakeIntroPaper').innerText(),/祖父|手帳/);
  await page.reload({waitUntil:'load'});await page.locator('#start').click();await visible();assert.equal(await page.locator('#lakeIntroProgress').innerText(),'2 / 5');
  await page.locator('#lakeIntroNext').click();await containment();assert.match(await page.locator('#lakeIntroPaper').innerText(),/サミュエル|研究を続け/);
  await page.waitForFunction(()=>{const c=document.querySelector('#lakeIntroPicture'),d=c.getContext('2d').getImageData(0,0,320,180).data,colors=new Set();for(let i=0;i<d.length;i+=4*7)colors.add(d[i]+','+d[i+1]+','+d[i+2]);return colors.size>500;});
  await page.locator('#lakeIntroNext').click();assert.match(await page.locator('#lakeIntroPaper').innerText(),/三匹|Grey/);await containment();
  await page.waitForTimeout(350);
  console.log('V215_INTRO_SCREENSHOT '+JSON.stringify({mobile,scene:'puppies',base64:(await page.screenshot({type:'jpeg',quality:82})).toString('base64')}));
  await page.locator('#lakeIntroNext').click();assert.match(await page.locator('#lakeIntroPaper').innerText(),/この子たちのため|一攫千金/);assert.equal(await page.locator('#lakeIntroNext').innerText(),'村へ出かける');
  await page.locator('#lakeIntroNext').click();await page.locator('#lakeIntro.open').waitFor({state:'hidden'});assert.equal(await resources(),before);
  assert.equal(await page.locator('.controls').evaluate(el=>el.inert),false);assert.equal(await page.evaluate(()=>s.lakeStory.introSeen),true);
  await page.reload({waitUntil:'load'});await page.locator('#start').click();assert.equal(await page.locator('#lakeIntro.open').count(),0);
  await page.locator('#menu').click();await page.locator('[data-field-menu-target="story"]').click();
  const story=await page.evaluate(()=>JSON.stringify(s.lakeStory));assert.match(await page.locator('#lakeStoryPage').innerText(),/祖父の手帳/);
  await page.locator('#lakeStoryReplayIntro').click();await visible();assert.equal(await page.locator('#lakeIntroProgress').innerText(),'1 / 5');
  await page.keyboard.press('Escape');await page.locator('#lakeStory.open').waitFor({state:'visible'});
  assert.equal(await page.evaluate(()=>JSON.stringify(s.lakeStory)),story);assert.equal(await resources(),before);
  assert.equal(await page.locator('#lakeStoryReplayIntro').evaluate(el=>document.activeElement===el),true);
  const second=await context.newPage(),first=JSON.stringify(seed());second.on('pageerror',e=>errors.push(e.message));
  await second.goto(url,{waitUntil:'load'});await second.evaluate(({key,first})=>{localStorage.setItem(key,first);localStorage.removeItem(key+'-slot2');},{key:saveKey,first});
  await second.reload({waitUntil:'load'});await second.locator('[data-save-slot="2"]').click();await second.locator('#start').click();await second.locator('#lakeIntro.open').waitFor({state:'visible'});
  await second.locator('#lakeIntroSkip').click();assert.equal(await second.evaluate(key=>localStorage.getItem(key),saveKey),first);
  assert.equal(await second.evaluate(key=>JSON.parse(localStorage.getItem(key+'-slot2')).lakeStory.introSeen,saveKey),true);
  await second.evaluate(()=>{s.cookingIngredients.fishFillet=1;s.items.wildGreens=1;openLocationInterior('diner');});
  const sizeChance=()=>second.evaluate(()=>{const counts={};for(let i=0;i<10000;i++){let n=0;const p=rollFishSpecimen(fish.find(f=>f.id==='funa'),()=>n++?.5:(i+.5)/10000);counts[p.tierId]=(counts[p.tierId]||0)+1;}return counts;});
  const plain=await sizeChance();assert.equal(plain.large+plain.giant,1400);
  await second.locator('#locationInterior [data-cook-recipe="bigFishPlate"]').click();await second.locator('#locationInterior [data-eat-prepared-meal="bigFishPlate"]').click();
  const fed=await sizeChance();assert.equal(fed.large+fed.giant,2500);assert.match(await second.locator('.cooking-kitchen-status').innerText(),/14%→25%/);
  await second.reload({waitUntil:'load'});await second.locator('#start').click();const restored=await sizeChance();assert.equal(restored.large+restored.giant,2500);
  const nativeFish=await second.evaluate(async()=>{
   const Art=ShuFishArt,images=new Map(),ids=['suzuki','kurodai','moroko','ayu'],canvas=document.createElement('canvas');
   canvas.width=448;canvas.height=224;const ctx=canvas.getContext('2d'),review=document.createElement('canvas');review.width=448*5;review.height=224*ids.length;
   const painter=review.getContext('2d');painter.fillStyle='#164553';painter.fillRect(0,0,review.width,review.height);
   let poses=0;
   for(const [row,id]of ids.entries()){
    for(const asset of Art.assets(id)){const im=new Image();im.src=asset;await im.decode();images.set(asset,im);}
    const hashes=new Set();
    for(let n=0;n<=24;n++){
     Art.draw(ctx,images.get(Art.species[id].asset),id,7,n/4,src=>images.get(src));
     const data=ctx.getImageData(0,0,448,224).data;let opaque=0,edge=0,hash=2166136261;
     for(let p=0;p<data.length;p+=4){
      hash=Math.imul(hash^data[p],16777619);hash=Math.imul(hash^data[p+1],16777619);hash=Math.imul(hash^data[p+2],16777619);hash=Math.imul(hash^data[p+3],16777619);
      if(data[p+3]>100){opaque++;const x=p/4%448,y=Math.floor(p/4/448);if(x<2||x>445||y<2||y>221)edge++;}
     }
     if(opaque<3500||edge)throw Error(id+' incomplete or clipped '+n);
     hashes.add(hash);poses++;
     const col=[0,8,12,16,24].indexOf(n);if(col>=0)painter.drawImage(canvas,col*448,row*224);
    }
    if(hashes.size!==25)throw Error(id+' repeated authored turn drawings');
   }
   return {poses,assets:ids.flatMap(id=>Art.assets(id)),preview:review.toDataURL('image/png').split(',')[1]};
  });
  console.log('V215_FISH_ART_SCREENSHOT '+JSON.stringify({mobile,base64:nativeFish.preview}));
  delete nativeFish.preview;
  assert.deepEqual(errors,[]);assert.deepEqual(failed,[]);
  console.log('V215_STORY_OPENING_PASS '+JSON.stringify({mobile,pages:5,resume:true,skip:true,replay:true,secondSlot:true,resourcesPreserved:true,largeFishChance:[.14,.25],mealReload:true,nativeFish,errors,failed}));
 }finally{await browser.close();}
};
