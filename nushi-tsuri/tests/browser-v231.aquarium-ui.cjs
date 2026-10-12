const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),{chromium}=require('playwright');
const {seed,saveKey}=require('./game-harness.cjs');
module.exports=async function aquariumUI(url,mobile=false,options={}){
 const viewport=options.viewport||(mobile?{width:844,height:390}:{width:1280,height:720}),day=188;
 const fish=(uid,species,tank,length,generation=0)=>({uid,species,tank,length,bornSize:generation?150:species==='isaki'?1400:750,origin:generation?'bred':'shop',generation,sex:uid==='pet-29'?'male':'female',acquiredDay:day-4,lastDay:day,fedDay:day-1,changedDay:day-1,water:options.low?30:55,health:options.low?55:90,careDays:4,stars:1,xp:generation?0:106});
 const initial={...seed(),gameMinutes:day*1440+360,money:596209,soundEnabled:false,x:199,y:36,
  caught:{moroko:1,isaki:2,madai:2,nushi:1,coastNushi:1},petLife:{version:5,unlockedTanks:6,food:1165,selected:'pet-28',selectedTank:1,nextId:64,
   fish:[fish('pet-1','moroko',0,750),fish('pet-28','isaki',1,2400),fish('pet-29','isaki',1,2400),fish('pet-30','isaki',1,650,1),fish('pet-31','isaki',1,150,1),fish('pet-20','madai',2,6160),fish('pet-22','madai',2,4960),fish('pet-23','madai',2,4360),fish('pet-32','madai',2,150,1)],
   eggs:[{uid:'egg-1',species:'moroko',tank:3,laidDay:day-1,hatchDay:day+2,generation:1,water:100},{uid:'egg-2',species:'madai',tank:5,laidDay:day-1,hatchDay:day+2,generation:1,water:100}]}};
 const browser=await chromium.launch({headless:true}),errors=[],failed=[];
 const context=await browser.newContext({viewport,isMobile:mobile,hasTouch:mobile,locale:'ja-JP',deviceScaleFactor:options.dpr||1,serviceWorkers:'block'});
 try{
  await context.addInitScript(({state,key})=>{localStorage.setItem('nushi-inugoya-options-v1',JSON.stringify({textSpeed:'instant'}));if(!localStorage.getItem(key))localStorage.setItem(key,JSON.stringify(state));},{state:initial,key:saveKey});
  const page=await context.newPage(),press=q=>page.locator(q)[mobile?'tap':'click']();page.on('pageerror',e=>errors.push(e.message));page.on('response',r=>{if(r.status()>=400&&/nushi-tsuri/.test(r.url()))failed.push(r.status()+' '+r.url());});
  const directory=path.join(__dirname,'browser-evidence-v231');fs.mkdirSync(directory,{recursive:true});
  const shot=async screen=>{const name=(mobile?'touch':'pc')+'-'+viewport.width+'x'+viewport.height+'-'+screen+'.png';await page.screenshot({path:path.join(directory,name)});await artFits();console.log('V231_UI_IMAGE '+name);};
  const snapshot=()=>page.evaluate(()=>({money:s.money,time:s.gameMinutes,food:s.petLife.food,fish:s.petLife.fish,caught:s.caught,records:s.sizeRecords}));
  async function artFits(){
   const images=await page.locator('[data-pet-card-art] canvas').evaluateAll(els=>els.map(c=>{const p=c.parentElement.getBoundingClientRect(),r=c.getBoundingClientRect();return {uid:c.parentElement.dataset.petCardArt,parent:{x:p.x,y:p.y,w:p.width,h:p.height},image:{x:r.x,y:r.y,w:r.width,h:r.height}};}).filter(a=>a.image.w>0&&a.image.h>0));
   for(const a of images){const p=a.parent,r=a.image;assert.ok(p.w>0&&p.h>0&&r.x>=p.x-1&&r.y>=p.y-1&&r.x+r.w<=p.x+p.w+1&&r.y+r.h<=p.y+p.h+1,'fish artwork stays inside its own frame: '+JSON.stringify(a));}
  }
  async function fit(){
   const layout=await page.evaluate(()=>{const c=document.querySelector('.pet-content'),p=document.querySelector('.pet-tank-info'),stage=document.querySelector('#petTankStage,#petInspectStage'),r=stage.getBoundingClientRect();return {scroll:c.scrollHeight-c.clientHeight,sideScroll:p.scrollHeight-p.clientHeight,tank:{x:r.x,y:r.y,width:r.width,height:r.height},viewport:{w:innerWidth,h:innerHeight},buttons:[...document.querySelectorAll('.pet-care-dock button')].map(b=>{const r=b.getBoundingClientRect();return {action:b.dataset.petAction,x:r.x,y:r.y,width:r.width,height:r.height,visible:r.width>0&&r.height>0};})};});
   assert.ok(layout.scroll<=1,'the main aquarium must not scroll: '+JSON.stringify(layout));assert.ok(layout.sideScroll<=1,'all vital gauges must fit: '+JSON.stringify(layout));
   assert.ok(layout.tank.width>=260&&layout.tank.height>=130,'a readable tank stays visible: '+JSON.stringify(layout));
   for(const b of layout.buttons){assert.ok(b.visible&&b.height>=44&&b.x>=0&&b.x+b.width<=viewport.width+1&&b.y>=0&&b.y+b.height<=viewport.height+1,'pinned accessible action '+JSON.stringify(b));}
   return layout;
  }
  await page.goto(url,{waitUntil:'load'});await press('#start');if(await page.locator('#lakeIntroSkip').isVisible())await press('#lakeIntroSkip');await press('#action');await press('[data-pet-action="aquarium"]');
  await page.waitForFunction(()=>[...document.querySelectorAll('[data-pet-card-art="pet-28"] canvas')].some(c=>{const a=c.getContext('2d').getImageData(0,0,c.width,c.height).data;let n=0;for(let i=3;i<a.length;i+=4)if(a[i]>100)n++;return n>3000;}));
  const overview=await fit();assert.equal(await page.locator('.pet-fish-roster canvas').count(),4);assert.equal(await page.locator('.pet-stats').count(),0);assert.equal(await page.locator('#petFishSelect,#petMoveTank').count(),0);await shot('overview');
  const before=await snapshot();await press('[data-pet-action="records"]');assert.match(await page.locator('.pet-stats').innerText(),/生まれた体長.*14\.00cm.*成長.*10\.00cm/s);
  assert.equal(await page.locator('.pet-aquarium-view').getAttribute('inert'),'');const underneath=await page.locator('#petTankStage').boundingBox();assert.equal(underneath.width,overview.tank.width);assert.equal(underneath.height,overview.tank.height);await shot('records');
  if(!mobile){await page.keyboard.press('Shift+Tab');assert.equal(await page.evaluate(()=>Boolean(document.activeElement.closest('.pet-sheet'))),true);await page.keyboard.press('Escape');}else await press('.pet-sheet [data-pet-action="panel-close"]');
  assert.equal(await page.locator('.pet-sheet').count(),0);assert.equal(await page.locator('#petLifeModal.open').count(),1);assert.equal(await page.evaluate(()=>document.activeElement.dataset.petAction),'records');
  await press('[data-pet-action="help"]');await shot('care-guide');await press('.pet-sheet [data-pet-action="panel-close"]');
  await press('.pet-fish-roster [data-pet-inspect="pet-31"]');await page.waitForFunction(()=>document.querySelector('#petInspectFish')?.dataset.specimenLength==='150');const fry=await fit();assert.match(await page.locator('[data-pet-size-rank]').innerText(),/稚魚（繁殖限定）/);await shot('fry');
  await press('[data-pet-action="tanks"]');assert.equal(await page.locator('[data-pet-tank]').count(),8);await shot('tank-cards');await press('[data-pet-tank="2"]');assert.match(await page.locator('.pet-tank-current').innerText(),/水槽3.*4\/5/s);
  assert.deepEqual(await snapshot(),before);await press('.pet-fish-roster [data-pet-inspect="pet-32"]');
  const oldFood=await page.evaluate(()=>s.petLife.food);await press('[data-pet-action="feed"]');assert.equal(await page.evaluate(()=>s.petLife.food),oldFood-4);assert.equal(await page.locator('[data-pet-action="feed"]').isDisabled(),true);
  await press('[data-pet-action="water"]');assert.equal(await page.locator('[data-pet-action="water"]').isDisabled(),true);assert.equal(await page.locator('[aria-label="水質"]').getAttribute('aria-valuenow'),'100');await fit();await shot('cared');
  const beforeMove=await snapshot();await press('[data-pet-action="records"]');await press('[data-pet-panel-tab="manage"]');await shot('management');
  await press('[data-pet-action="rehome"]');assert.match(await page.locator('.pet-rehome').innerText(),/マダイ #32/);await press('[data-pet-action="rehome-cancel"]');assert.deepEqual(await snapshot(),beforeMove);
  await press('[data-pet-move-target="4"]');await press('[data-pet-action="move"]');assert.equal(await page.evaluate(()=>s.petLife.selectedTank),4);
  const moved=await snapshot();assert.deepEqual(moved.fish,beforeMove.fish.map(f=>f.uid==='pet-32'?{...f,tank:4}:f));assert.equal(moved.money,beforeMove.money);assert.equal(await page.locator('[data-pet-action="feed"]').isDisabled(),true);await fit();
  const saved=await snapshot();await page.reload({waitUntil:'load'});await press('#start');await press('#action');await press('[data-pet-action="aquarium"]');assert.deepEqual(await snapshot(),saved);assert.equal(await page.evaluate(()=>s.petLife.selectedTank),4);await fit();
  const eggs=await page.evaluate(()=>s.petLife.eggs);await press('[data-pet-action="tanks"]');
  assert.match(await page.locator('[data-pet-tank="3"]').innerText(),/淡水.*卵1/s);assert.match(await page.locator('[data-pet-tank="5"]').innerText(),/海水.*卵1/s);await shot('egg-cards');
  for(const [tank,water,label] of [[3,'淡水','fresh'],[5,'海水','salt']]){
   await press('[data-pet-tank="'+tank+'"]');assert.match(await page.locator('.pet-tank-current').innerText(),new RegExp(water+'.*0/5'));
   assert.equal(await page.locator('.pet-empty-profile b').innerText(),water);assert.match(await page.locator('.pet-tank-caption').innerText(),new RegExp(water));
   assert.equal(await page.locator('.pet-eggs').count(),1);assert.equal(await page.locator('.pet-empty').count(),0);assert.equal(await page.locator('[data-pet-action="feed"]').isDisabled(),true);
   await fit();await shot('egg-only-'+label);await press('[data-pet-action="tanks"]');
  }
  await press('.pet-sheet [data-pet-action="panel-close"]');assert.deepEqual(await page.evaluate(()=>s.petLife.eggs),eggs);
  assert.deepEqual(errors,[]);assert.deepEqual(failed,[]);console.log('V231_AQUARIUM_UI_PASS '+JSON.stringify({mobile,viewport,dpr:options.dpr||1,overview,fry,readOnlyPanels:true,keyboard:!mobile,exactMove:true,careOnce:true,reload:true,eggWater:true,errors,failed}));
 }finally{await context.close();await browser.close();}
};
