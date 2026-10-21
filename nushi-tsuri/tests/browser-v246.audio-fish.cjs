const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),{chromium}=require('playwright');
const {seed,saveKey}=require('./game-harness.cjs');
module.exports=async function audioFish(url,mobile=false,options={}){
 const viewport=options.viewport||(mobile?{width:844,height:390}:{width:1280,height:720}),directory=path.join(__dirname,'browser-evidence-v246');fs.mkdirSync(directory,{recursive:true});
 const browser=options.browser||await chromium.launch({headless:true}),context=await browser.newContext({viewport,deviceScaleFactor:options.dpr||1,isMobile:mobile,hasTouch:mobile,locale:'ja-JP',serviceWorkers:'block',ignoreHTTPSErrors:true});
 const initial={...seed(),soundEnabled:true,hp:100,gameMinutes:600,mapRegion:'village',x:123,y:92,money:30000,
  ownedRods:['bamboo','tideMaster','lureRod'],selectedRod:'tideMaster',selectedBait:'worm',selectedHook:'small',baits:{worm:10,river:10,liveMinnow:10}};
 await context.addInitScript(({key,state})=>{if(!localStorage.getItem(key))localStorage.setItem(key,JSON.stringify(state));if(!localStorage.getItem('nushi-inugoya-options-v1'))localStorage.setItem('nushi-inugoya-options-v1',JSON.stringify({textSpeed:'instant'}));},{key:saveKey,state:initial});
 const page=await context.newPage(),errors=[],failed=[],cdp=mobile?await context.newCDPSession(page):null;
 page.on('pageerror',e=>errors.push(e.message));page.on('response',r=>{if(r.status()>=400)failed.push(r.status()+' '+new URL(r.url()).pathname);});
 const press=q=>page.locator(q)[mobile?'tap':'click'](),value=exp=>page.evaluate(exp),shot=name=>page.screenshot({path:path.join(directory,(mobile?'touch':'pc')+'-'+viewport.width+'x'+viewport.height+'-'+name+'.png')});
 const settings=()=>value('JSON.parse(localStorage.getItem("nushi-inugoya-options-v1"))');
 async function start(){await press('#start');if(await page.locator('#lakeIntroSkip').isVisible())await press('#lakeIntroSkip');assert.match(await page.locator('.hud').innerText(),/v250/);}
 async function optionsOpen(){await press('#menu');await press('[data-field-menu-target="options"]');await page.locator('#options.open').waitFor();}
 async function slider(id,from,to){
  const r=await page.locator(id).boundingBox(),a={x:r.x+8+(r.width-16)*from,y:r.y+r.height/2},b={x:r.x+8+(r.width-16)*to,y:a.y};
  if(cdp){await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{...a,id:1}]});for(let i=1;i<=8;i++)await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:a.x+(b.x-a.x)*i/8,y:a.y,id:1}]});await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});}
  else{await page.mouse.move(a.x,a.y);await page.mouse.down();await page.mouse.move(b.x,b.y,{steps:8});await page.mouse.up();}
 }
 try{
  await page.goto(url,{waitUntil:'domcontentloaded'});await press('#titleOptions');assert.equal(await page.locator('#optionsBgmVolume').inputValue(),'45');assert.equal(await page.locator('#optionsSeVolume').inputValue(),'80');
  const bounds=await page.locator('#options').evaluate(el=>{const r=el.getBoundingClientRect();return {fits:r.left>=0&&r.top>=0&&r.right<=innerWidth+1&&r.bottom<=innerHeight+1,inputs:[...el.querySelectorAll('input[type=range]')].map(e=>{const b=e.getBoundingClientRect();return b.height>=44&&b.left>=r.left&&b.right<=r.right;})};});assert.ok(bounds.fits&&bounds.inputs.every(Boolean));
  await slider('#optionsBgmVolume',.45,0);assert.equal((await settings()).bgmVolume,0);await slider('#optionsSeVolume',.8,1);assert.equal((await settings()).seVolume,100);await shot('audio-options');
  await press('#optionsClose');await start();await optionsOpen();
  await page.waitForFunction(()=>gameAudio.context?.state==='running');await page.waitForTimeout(100);
  assert.equal(await value('gameAudio.music.gain.value'),0);assert.equal(await value('gameAudio.effects.gain.value'),1);
  await slider('#optionsBgmVolume',0,.6);const bgm=(await settings()).bgmVolume;assert.ok(bgm>=55&&bgm<=65);
  await slider('#optionsSeVolume',1,0);assert.equal((await settings()).seVolume,0);await page.waitForTimeout(80);assert.equal(await value('gameAudio.effects.gain.value'),0);assert.ok(Math.abs(await value('gameAudio.music.gain.value')-bgm/100)<.001);
  await slider('#optionsSeVolume',0,.8);const se=(await settings()).seVolume;assert.ok(se>=75&&se<=85);
  await press('#optionsAudioPreview');await page.waitForTimeout(100);assert.ok(await value('fishEscapeJingle.stats().voices')>0);assert.equal(await value('gameAudio.jingleFocus'),true);assert.ok(await value('gameAudio.music.gain.value')<.12);await shot('jingle-preview');
  await page.waitForFunction(()=>fishEscapeJingle.stats().voices===0&&!gameAudio.jingleFocus&&Math.abs(gameAudio.music.gain.value-audioOptions.bgmVolume/100)<.001,null,{timeout:15000});assert.equal(await value('fishEscapeJingle.stats().voices'),0);assert.equal(await value('gameAudio.jingleFocus'),false);assert.ok(Math.abs(await value('gameAudio.music.gain.value')-bgm/100)<.001);
  const beforeReload=await settings();await press('#optionsClose');await page.reload({waitUntil:'domcontentloaded'});await press('#titleOptions');assert.deepEqual(await settings(),beforeReload);assert.equal(await page.locator('#optionsBgmVolume').inputValue(),String(bgm));await press('#optionsClose');await start();
  const levels=await page.evaluate(async()=>{
   const ctx=new OfflineAudioContext(1,48000*3,48000),gain=ctx.createGain();gain.gain.value=.48*.8;gain.connect(ctx.destination);
   // Schedule native oscillator/gain nodes before offline rendering; its initial state is suspended by design.
   const scheduled={state:'running',get currentTime(){return ctx.currentTime;},createOscillator:()=>ctx.createOscillator(),createGain:()=>ctx.createGain()};
   const player=ShuNushiPresentation.createJingle({audio:()=>({context:scheduled,destination:gain})});if(!player.play())throw Error('Offline score did not schedule');const rendered=await ctx.startRendering();
   const rms=values=>Math.sqrt(values.reduce((sum,v)=>sum+v*v,0)/values.length),jingle=rms(rendered.getChannelData(0));
   const water=await gameAudio.context.decodeAudioData(await (await fetch('assets/audio/underwater-loop.mp3')).arrayBuffer());const ambience=rms(water.getChannelData(0))*.08*.48*.8;
   return {jingle,ambience,ratio:jingle/ambience};
  });assert.ok(levels.jingle>levels.ambience*1.5,JSON.stringify(levels));
  await page.evaluate(()=>setSoundEnabled(false));
  const cases=[['bluegill','lake','worm','small',20],['aburahaya','river','river','small',20],['magochi','sea','liveMinnow','large',80]];
  for(const mode of ['gauge','nushi'])for(const [id,zone,bait,hook,distance]of cases){
   await page.evaluate(({mode,zone,bait,hook})=>{hideCatchCard();Object.assign(s,{fightMode:mode,fishingMethod:'bait',selectedRod:'tideMaster',selectedBait:bait,selectedHook:hook,x:zone==='sea'?210:123,y:zone==='sea'?104:92});cast({zone,waterZone:zone,waterX:s.x,waterY:s.y+6});}, {mode,zone,bait,hook});
   await press('#wait');await page.locator('#tackle.open').waitFor();await press('#beginCast');const old=await value('JSON.parse(JSON.stringify({baits:s.baits,caught:s.caught,money:s.money}))');
   await page.evaluate(({id,zone,distance})=>{battle.cast=distance;clearInterval(timer);timer=0;const spot=zone+'-'+(distance<34?'shallow':distance<67?'mid':'deep');window.v246Random=Math.random;for(let i=0;i<10000;i++){Math.random=()=>(i+.5)/10000;if(pick(distance,spot)?.id===id)return;}throw Error('no natural '+id);},{id,zone,distance});
   await press('#pull');await page.evaluate(()=>battleTick());await page.waitForFunction(()=>battle?.phase==='wait');await page.evaluate(()=>{Math.random=window.v246Random;startFight();finishHookReveal();});
   await page.waitForFunction(id=>document.querySelector('#battleFish canvas')?.dataset.artSpecies===id,id);assert.equal(await value('battle.f.id'),id);assert.equal(await value('battle.fightMode'),mode);
   await page.waitForFunction(()=>{const c=document.querySelector('#battleFish canvas');return c.getContext('2d').getImageData(0,0,c.width,c.height).data.some((v,i)=>i%4===3&&v>100);});await shot(id+'-'+mode);
   await page.evaluate(()=>{battle.retrieval=1;surfaceCatch();});await page.waitForFunction(({id,count})=>s.caught[id]===count,{id,count:(old.caught[id]||0)+1});
   assert.equal(await value('s.baits.'+bait),old.baits[bait]-1);const count=await value('s.caught.'+id);await page.evaluate(()=>caught());assert.equal(await value('s.caught.'+id),count);assert.equal(await value('s.catchMemories.'+id+'.best.method'),'bait');
  }
  await page.evaluate(()=>{hideCatchCard();save();});await page.reload({waitUntil:'domcontentloaded'});await start();for(const [id]of cases)assert.equal(await value('s.caught.'+id),2);assert.equal(await value('fish.length'),57);
  assert.deepEqual(errors,[]);assert.deepEqual(failed,[]);console.log('V246_PASS '+JSON.stringify({viewport,mobile,dpr:options.dpr||1,levels,species:3,modes:2,errors:errors.length,httpErrors:failed.length}));
 }finally{await context.close();if(!options.browser)await browser.close();}
};
