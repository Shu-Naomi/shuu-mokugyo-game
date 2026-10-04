// Run separately from the deterministic unit suite: real Chromium, painted maps and UI inputs.
const assert=require('node:assert/strict'),http=require('node:http'),fs=require('node:fs'),path=require('node:path');
const {createHash}=require('node:crypto'),{chromium}=require('playwright');
const {seed,saveKey}=require('./game-harness.cjs'),M=require('../mountain-region.js');
const root=path.resolve(__dirname,'..'),publicUrl='https://shu-naomi.github.io/shuu-mokugyo-game/nushi-tsuri/';
const delay=ms=>new Promise(resolve=>setTimeout(resolve,ms));
const digest=bytes=>createHash('sha256').update(bytes).digest('hex');
async function waitForPublication(){
  const expected=digest(fs.readFileSync(path.join(root,'index.html')));
  for(let attempt=0;attempt<100;attempt++){
    try{
      const response=await fetch(publicUrl+'?release='+process.env.GITHUB_SHA,{cache:'no-store',signal:AbortSignal.timeout(15000)});
      if(response.ok&&digest(Buffer.from(await response.arrayBuffer()))===expected){
        for(const file of ['sw.js','fish-art.js','fishing-duel.js','pet-life-ui.js','pet-life.css','assets/aquarium-interior-v214.webp','save-slots.js','save-slots.css','lake-story.js','lake-story.css','lake-intro.js','lake-intro.css','music-tracks.js','mountain-region.js','regional-nushi.js','nushi-atlas.js','aquarium-life.js',
          'assets/pass-pond-v202.png','assets/pass-marsh-v202.png','assets/cave-lake-v202.png',
          'assets/stream-nushi-v202.png','assets/coast-nushi-v202.png','assets/cave-nushi-v202.png','assets/star-nushi-v202.png',
          ...new Set(Object.keys(require('../fish-art.js').species).flatMap(id=>require('../fish-art.js').assets(id))),
          ...Object.values(require('../music-tracks.js')).map(track=>track.src)]){
          const asset=await fetch(publicUrl+file+'?release='+process.env.GITHUB_SHA,{cache:'no-store',signal:AbortSignal.timeout(20000)});
          assert.equal(asset.status,200,file);
          assert.equal(digest(Buffer.from(await asset.arrayBuffer())),digest(fs.readFileSync(path.join(root,file))),file+' deployed bytes');
        }
        console.log('PUBLIC_RELEASE_VERIFIED '+process.env.GITHUB_SHA);return publicUrl;
      }
    }catch(error){if(attempt%10===0)console.log('Publication check: '+error.message);}
    if(attempt%10===0)console.log('Waiting for Pages to serve the validated commit');
    await delay(3000);
  }
  throw Error('Pages did not serve the validated release');
}
function route(region,start,goal){
  const queue=[{...start,keys:[]}],seen=new Set([start.x+','+start.y]);
  for(let i=0;i<queue.length;i++){
    const point=queue[i];if(goal(point.x,point.y))return point.keys;
    for(const [key,dx,dy]of [['ArrowUp',0,-4],['ArrowRight',4,0],['ArrowDown',0,4],['ArrowLeft',-4,0]]){
      const x=point.x+dx,y=point.y+dy,id=x+','+y;if(seen.has(id))continue;
      if(Array.from({length:9},(_,j)=>M.walkable(point.x+dx*j/8,point.y+dy*j/8,region)).every(Boolean)){
        seen.add(id);queue.push({x,y,keys:[...point.keys,key]});
      }
    }
  }throw Error('No walking route in '+region);
}
async function smoke(url){
  const browser=await chromium.launch({headless:true});
  const context=await browser.newContext({viewport:{width:1280,height:720},locale:'ja-JP'});
  const saved={...seed(),hp:100,mapRegion:'stream',...M.entry,soundEnabled:false};
  await context.addInitScript(({key,state})=>{
    if(!localStorage.getItem(key))localStorage.setItem(key,JSON.stringify(state));
  },{key:saveKey,state:saved});
  const page=await context.newPage(),errors=[],failedAssets=[];
  page.on('pageerror',error=>errors.push(error.message));
  page.on('response',response=>{
    if(response.status()>=400&&/v202\.png|(?:regional-nushi|nushi-atlas|mountain-region|aquarium-life)\.js/.test(response.url()))
      failedAssets.push(response.status()+' '+response.url());
  });
  const position=()=>page.locator('#player').evaluate(el=>({
    x:Math.round(parseFloat(el.style.left)*2.4*1e6)/1e6,y:Math.round(parseFloat(el.style.top)*1.35*1e6)/1e6,
  }));
  const hashes=new Map();
  async function checkRegion(region,screenshot=false){
    assert.equal(await page.locator('#mountainPixels').getAttribute('aria-label'),M.regions[region].name);
    assert.equal(await page.locator('#map').evaluate(el=>el.classList.contains('mountain')),true);
    if(screenshot){
      const arrivalDelta=await page.locator('#map').evaluate(map=>{
        const player=map.querySelector('#player'),pose=getComputedStyle(player),camera=new DOMMatrixReadOnly(getComputedStyle(map).transform);
        const translation=map.style.transform.match(/translate3d\(([-\d.]+)%,\s*([-\d.]+)%/);
        return Math.max(
          Math.abs(parseFloat(pose.left)-parseFloat(player.style.left)/100*map.clientWidth),
          Math.abs(parseFloat(pose.top)-parseFloat(player.style.top)/100*map.clientHeight),
          Math.abs(camera.m41-Number(translation[1])/100*map.clientWidth),
          Math.abs(camera.m42-Number(translation[2])/100*map.clientHeight));
      });
      assert.ok(arrivalDelta<.75,region+' actor/camera still interpolates from the previous map: '+arrivalDelta);
    }
    await page.waitForFunction(()=>{
      const c=document.querySelector('#mountainPixels'),data=c.getContext('2d').getImageData(0,0,c.width,c.height).data,colors=new Set();
      for(let i=0;i<data.length;i+=4*307)if(data[i+3]>100)colors.add(data[i]+','+data[i+1]+','+data[i+2]);
      return colors.size>1000;
    },null,{timeout:15000});
    const signature=await page.locator('#mountainPixels').evaluate(c=>{
      const pixels=c.getContext('2d').getImageData(0,0,c.width,c.height).data;let hash=2166136261;
      for(let i=0;i<pixels.length;i+=97)hash=Math.imul(hash^pixels[i],16777619);
      return hash>>>0;
    });
    if(!hashes.has(region))hashes.set(region,signature);
    if(screenshot)console.log('NUSHI_SCREENSHOT '+region+' data:image/jpeg;base64,'+(await page.screenshot({type:'jpeg',quality:72})).toString('base64'));
  }
  async function start(){
    await page.locator('#start').click();
    await page.locator('#game.active').waitFor({state:'visible'});
    assert.match(await page.locator('.hud').innerText(),/v215/);
  }
  async function walk(region,goal){
    const keys=route(region,await position(),goal);
    for(const key of keys){
      const old=await position();await page.keyboard.press(key);
      const delta={ArrowUp:[0,-4],ArrowRight:[4,0],ArrowDown:[0,4],ArrowLeft:[-4,0]}[key];
      const next=await position();
      assert.ok(Math.abs(next.x-old.x-delta[0])<.001&&Math.abs(next.y-old.y-delta[1])<.001,region+' blocked '+key+' at '+JSON.stringify(old));
    }return keys.length;
  }
  const exitTo=target=>(x,y)=>M.exitAt(x,y,currentRegion)?.region===target;
  let currentRegion='stream',steps=0;
  try{
    await page.goto(url,{waitUntil:'domcontentloaded'});await start();await checkRegion('stream');
    steps+=await walk('stream',(x,y)=>M.exitAt(x,y,'stream')?.region==='mountainPond');
    await page.keyboard.press('z');currentRegion='mountainPond';await checkRegion(currentRegion,true);
    const beforeReload=await position();await page.reload({waitUntil:'domcontentloaded'});await start();await checkRegion(currentRegion);
    assert.deepEqual(await position(),beforeReload,'pond save resumes the same place');
    steps+=await walk(currentRegion,exitTo('mountainMarsh'));await page.keyboard.press('z');
    currentRegion='mountainMarsh';await checkRegion(currentRegion,true);
    await page.keyboard.press('z');currentRegion='mountainPond';await checkRegion(currentRegion);
    steps+=await walk(currentRegion,(x,y)=>M.atReturnGate(x,y,currentRegion));await page.keyboard.press('z');
    currentRegion='stream';await checkRegion(currentRegion);
    steps+=await walk(currentRegion,exitTo('cave'));await page.keyboard.press('z');
    currentRegion='cave';await checkRegion(currentRegion,true);
    const cavePosition=await position();await page.reload({waitUntil:'domcontentloaded'});await start();await checkRegion(currentRegion);
    assert.deepEqual(await position(),cavePosition,'cave save resumes the same place');
    await page.keyboard.press('z');currentRegion='stream';await checkRegion(currentRegion);
    steps+=await walk(currentRegion,(x,y)=>M.atReturnGate(x,y,currentRegion));await page.keyboard.press('z');
    assert.equal(await page.locator('#map').evaluate(el=>el.classList.contains('mountain')),false);
    assert.equal(new Set(hashes.values()).size,4,'four distinct painted maps');
    assert.deepEqual(errors,[],'browser runtime errors');assert.deepEqual(failedAssets,[],'new assets load');
    console.log('BROWSER_SMOKE_PASS '+JSON.stringify({url,walkingSteps:steps,maps:[...hashes.keys()],saveReloads:2,errors}));
  }finally{await browser.close();}
}
// These fixed routes follow the dirt painted into the stream background.
// They deliberately do not ask the collision model to find its own way around
// a bad road, as the broader map-connectivity check above does.
async function touchSmoke(url){
  const browser=await chromium.launch({headless:true}),errors=[];
  let taps=0;
  async function openStream(extra={}){
    const context=await browser.newContext({viewport:{width:390,height:844},
      deviceScaleFactor:2,isMobile:true,hasTouch:true,locale:'ja-JP'});
    const state={...seed(),hp:100,mapRegion:'stream',...M.entry,soundEnabled:false,...extra};
    await context.addInitScript(({key,state})=>{
      if(!localStorage.getItem(key))localStorage.setItem(key,JSON.stringify(state));
    },{key:saveKey,state});
    const page=await context.newPage();page.on('pageerror',error=>errors.push(error.message));
    await page.goto(url,{waitUntil:'domcontentloaded'});
    assert.equal(await page.locator('.landscape-warning').isVisible(),true,'portrait phone asks for landscape');
    await page.setViewportSize({width:844,height:390});await page.locator('#start').tap();
    await page.locator('#game.active').waitFor({state:'visible'});
    assert.match(await page.locator('.hud').innerText(),/v215/);
    const position=()=>page.locator('#player').evaluate(el=>({
      x:Math.round(parseFloat(el.style.left)*2.4*1e6)/1e6,
      y:Math.round(parseFloat(el.style.top)*1.35*1e6)/1e6,
    }));
    async function leg(direction,count,x,y){
      for(let i=0;i<count;i++){await page.locator(`[data-move="${direction}"]`).tap();taps++;}
      const p=await position();assert.ok(Math.abs(p.x-x)<.001&&Math.abs(p.y-y)<.001,
        'touch '+direction+' expected '+x+','+y+' but got '+JSON.stringify(p));
    }
    return {context,page,position,leg};
  }
  try{
    const road=await openStream(),{page,leg}=road;
    await leg('up',9,152,92);await leg('left',1,148,92);await leg('up',5,148,72);
    await leg('left',17,80,72);await leg('up',10,80,32);await leg('left',1,76,32);
    await leg('up',5,76,12);await leg('left',1,72,12);await leg('up',1,72,8);
    await page.locator('#action').tap();
    assert.equal(await page.locator('#mountainPixels').getAttribute('aria-label'),'峠の池');
    const savedPosition=await road.position();await page.reload({waitUntil:'domcontentloaded'});
    await page.locator('#start').tap();assert.deepEqual(await road.position(),savedPosition);
    assert.equal(await page.locator('#mountainPixels').getAttribute('aria-label'),'峠の池');
    await road.context.close();

    const cave=await openStream({x:148,y:72}),c=cave.leg;
    await c('up',1,148,68);await c('right',6,172,68);await c('up',3,172,56);
    await c('right',1,176,56);await c('up',2,176,48);await c('right',3,188,48);
    await c('up',1,188,44);await c('right',3,200,44);await c('up',2,200,36);
    await c('right',4,216,36);await c('up',2,216,28);await cave.page.locator('#action').tap();
    assert.equal(await cave.page.locator('#mountainPixels').getAttribute('aria-label'),'岩窟の地下湖');
    await cave.context.close();

    const rail=await openStream({x:112,y:72}),r=rail.leg;
    await r('up',1,112,70);await r('up',1,112,70);
    await r('left',8,80,70);await r('right',17,148,70);
    await rail.context.close();
    assert.deepEqual(errors,[],'touchscreen runtime errors');
    console.log('TOUCH_SMOKE_PASS '+JSON.stringify({viewport:'844x390',rotatedPhone:true,taps,paintedRoads:['entrance','west bank','cave'],bridgeBanks:2,saveReloads:1,errors}));
  }finally{await browser.close();}
}
async function storySmoke(url,mobile){
  const browser=await chromium.launch({headless:true}),errors=[];
  const context=await browser.newContext({viewport:mobile?{width:844,height:390}:{width:1280,height:720},
    isMobile:mobile,hasTouch:mobile,locale:'ja-JP'});
  const state={...seed(),soundEnabled:false};
  await context.addInitScript(({key,state})=>{if(!localStorage.getItem(key))localStorage.setItem(key,JSON.stringify(state));},{key:saveKey,state});
  const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));
  const press=selector=>page.locator(selector)[mobile?'tap':'click']();
  const snapshot=()=>page.evaluate(()=>JSON.stringify({money:s.money,hp:s.hp,time:s.gameMinutes,caught:s.caught,baits:s.baits,pets:s.petLife,dog:s.dogAffinity}));
  async function checkLayout(){
    const result=await page.evaluate(()=>{
      const book=document.querySelector('#lakeStory'),pane=document.querySelector('#lakeStoryPage'),close=document.querySelector('#lakeStoryClose');
      const b=book.getBoundingClientRect(),p=pane.getBoundingClientRect(),c=close.getBoundingClientRect();
      return {inside:b.left>=-1&&b.right<=innerWidth+1&&b.top>=-1&&b.bottom<=innerHeight+1,
        closeInside:c.top>=b.top&&c.bottom<=b.bottom&&c.right<=b.right,pane:p.height>100&&p.width>150,
        horizontal:pane.scrollWidth<=pane.clientWidth+1};
    });
    assert.ok(Object.values(result).every(Boolean),'readable journal layout '+JSON.stringify(result));
  }
  try{
    await page.goto(url,{waitUntil:'domcontentloaded'});await press('#start');const before=await snapshot();
    await press('#menu');await press('[data-field-menu-target="story"]');
    assert.match(await page.locator('#lakeStoryPage').innerText(),/空白の手帳/);
    assert.equal(await page.locator('#lakeStoryIndex [data-story-page]').count(),1,'no future boss spoilers');
    await checkLayout();await press('#lakeStoryClose');assert.equal(await snapshot(),before);
    await page.evaluate(()=>{renderSamShop();open('store');});await press('#samStoryOffer');
    await press('#lakeStoryClose');assert.ok(await page.locator('#store').isVisible(),'returns to Sam');
    await page.evaluate(()=>close());

    // A legacy save with explicit completed catches restores the whole story.
    const finished={...state,caught:{...state.caught,streamNushi:1,coastNushi:1,caveNushi:1,starNushi:1},
      fishCatchRecords:{funa:{tackles:{'bamboo|worm':1},last:{rodId:'bamboo',baitId:'worm',
        spotId:'mountain-highPond-mid',castLocale:'river',period:'day'}}}};
    // pagehide saves the live game: install the fixture in that live state
    // first so reload cannot overwrite it with the earlier one-page journal.
    await page.evaluate(saved=>{s.caught=saved.caught;s.fishCatchRecords=saved.fishCatchRecords;delete s.lakeStory;save();},finished);
    await page.reload({waitUntil:'domcontentloaded'});await press('#start');const finishedBefore=await snapshot();
    await press('#menu');await press('[data-field-menu-target="story"]');
    assert.equal(await page.locator('#lakeStoryIndex [data-story-page]').count(),10);
    await press('#lakeStoryIndex [data-story-page="stream"]');
    await page.locator('#lakeStoryPage img').evaluate(image=>image.decode());await checkLayout();
    await press('#lakeStoryIndex [data-story-page="ending"]');
    assert.match(await page.locator('#lakeStoryPage').innerText(),/星の帰る場所|白い頁/);await checkLayout();
    await page.locator('#lakeStoryPage').evaluate(el=>{el.scrollTop=el.scrollHeight;});
    assert.ok(await page.locator('#lakeStoryClose').isVisible(),'close stays visible while reading');
    await page.locator('#lakeStoryPage').evaluate(el=>{el.scrollTop=0;});
    console.log('STORY_SCREENSHOT '+(mobile?'mobile':'desktop')+' data:image/jpeg;base64,'+(await page.screenshot({type:'jpeg',quality:75})).toString('base64'));
    if(mobile)await press('#lakeStoryClose');else await page.keyboard.press('Escape');
    assert.equal(await snapshot(),finishedBefore,'reading awards no extra catch or money');
    await page.reload({waitUntil:'domcontentloaded'});await press('#start');
    assert.equal(await page.evaluate(()=>ShuLakeStory.completed(s)),true,'ending read status survives reload');
    await page.evaluate(()=>open('record'));await press('#fishdexStoryOffer');await press('#lakeStoryClose');
    assert.ok(await page.locator('#record').isVisible(),'returns to archive');
    assert.deepEqual(errors,[]);
    console.log('STORY_SMOKE_PASS '+JSON.stringify({mobile,chapters:10,sourceReturns:2,noSpoilers:true,saveReload:true,resourcesPreserved:true,errors}));
  }finally{await browser.close();}
}
async function saveSlotSmoke(url,mobile){
  const browser=await chromium.launch({headless:true}),errors=[];
  const context=await browser.newContext({viewport:mobile?{width:844,height:390}:{width:1280,height:720},isMobile:mobile,hasTouch:mobile,locale:'ja-JP'});
  const secondKey=require('../save-slots.js').keys[2],original={...seed(),money:4321,soundEnabled:false};
  await context.addInitScript(({key,state})=>{if(!localStorage.getItem(key))localStorage.setItem(key,JSON.stringify(state));},{key:saveKey,state:original});
  const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));
  const press=selector=>page.locator(selector)[mobile?'tap':'click']();
  const stored=key=>page.evaluate(key=>localStorage.getItem(key),key);
  const playing=slot=>page.waitForFunction(slot=>document.querySelector('#game')?.classList.contains('active')&&document.querySelector('#activeSaveSlot')?.textContent===`セーブ${slot}`,slot);
  async function selection(){await press('#menu');await press('[data-field-menu-target="saveSlots"]');await page.locator('#title.active').waitFor({state:'visible'});}
  try{
    await page.goto(url,{waitUntil:'domcontentloaded'});const oldBytes=await stored(saveKey);
    await press('[data-save-slot="2"]');await press('[data-avatar="girl"]');await press('[data-dog="grey"]');
    assert.equal(await stored(saveKey),oldBytes);assert.equal(await stored(secondKey),null);
    const layout=await page.locator('.title-box').evaluate(box=>({inside:box.getBoundingClientRect().top>=-1&&box.getBoundingClientRect().bottom<=innerHeight+1,horizontal:box.scrollWidth<=box.clientWidth+1,cards:[...box.querySelectorAll('[data-save-slot]')].every(b=>b.getBoundingClientRect().width>90)}));
    assert.ok(Object.values(layout).every(Boolean),'save cards fit '+JSON.stringify(layout));
    console.log('SAVE_SLOT_SCREENSHOT '+(mobile?'mobile':'desktop')+' data:image/jpeg;base64,'+(await page.screenshot({type:'jpeg',quality:75})).toString('base64'));
    await press('#start');await playing(2);assert.equal(await stored(saveKey),oldBytes);
    const fresh=JSON.parse(await stored(secondKey));assert.equal(fresh.money,300);assert.equal(fresh.dog,'grey');assert.equal(fresh.avatar,'girl');assert.deepEqual(fresh.caught,{});
    await page.evaluate(()=>{s.money=8888;s.items.fishBento=4;save();});const secondBytes=await stored(secondKey);
    await selection();await press('[data-save-slot="1"]');await press('#start');await playing(1);
    assert.equal(await page.evaluate(()=>s.money),4321);assert.equal(await page.evaluate(()=>s.dog),'shuu');assert.equal(await stored(secondKey),secondBytes);
    await page.evaluate(()=>{s.money=11111;save();});await selection();await press('[data-save-slot="2"]');await press('#start');await playing(2);
    assert.equal(await page.evaluate(()=>s.money),8888);assert.equal(await page.evaluate(()=>s.items.fishBento),4);
    const discovery=await page.evaluate(()=>{const cycle=ensureForageCycle(),point=foragePointData.find(p=>!cycle.harvested.includes(p.id));delete cycle.active[point.id];const before=s.baits.shell,amount=ShuPetLife.forageCount(s,s.dog);startDogForageDiscovery(point,'shell');return {id:point.id,before,amount};});
    await page.waitForFunction(()=>!forageDiscoveryInProgress,null,{timeout:10000});
    assert.equal(await page.evaluate(()=>s.baits.shell),discovery.before+discovery.amount);
    assert.equal(await page.locator(`[data-forage-point="${discovery.id}"]`).count(),0);assert.match(await page.locator('#rescueToast').innerText(),/Grey.*貝.*掘り出した/);
    assert.equal(JSON.parse(await stored(secondKey)).baits.shell,discovery.before+discovery.amount);assert.equal(JSON.parse(await stored(saveKey)).money,11111);
    await page.reload({waitUntil:'domcontentloaded'});await press('#start');await playing(2);assert.equal(await page.evaluate(()=>s.baits.shell),discovery.before+discovery.amount);
    await selection(); // On the title page, pagehide must preserve damaged data.
    await page.evaluate(key=>localStorage.setItem(key,'{broken'),secondKey);await page.reload({waitUntil:'domcontentloaded'});
    assert.equal(await page.locator('#start').isDisabled(),true);assert.equal(await page.locator('#saveSlotNotice').isVisible(),true);
    await press('[data-save-slot="1"]');await press('#start');await playing(1);assert.equal(await stored(secondKey),'{broken');assert.equal(await page.evaluate(()=>s.money),11111);
    assert.deepEqual(errors,[]);console.log('SAVE_SLOT_SMOKE_PASS '+JSON.stringify({mobile,independent:true,resume:true,legacyPreserved:true,dogPickup:true,corruptProtected:true,errors}));
  }finally{await browser.close();}
}
async function audioSmoke(url,mobile){
  const browser=await chromium.launch({headless:true}),errors=[];
  const context=await browser.newContext({viewport:mobile?{width:844,height:390}:{width:1280,height:720},
    isMobile:mobile,hasTouch:mobile,locale:'ja-JP'});
  await context.addInitScript(({key,state})=>localStorage.setItem(key,JSON.stringify(state)),
    {key:saveKey,state:{...seed(),money:10000,hp:100,soundEnabled:false}});
  const page=await context.newPage();page.on('pageerror',error=>errors.push(error.message));
  try{
    await page.goto(url,{waitUntil:'domcontentloaded'});
    await page.locator('#start')[mobile?'tap':'click']();
    await page.locator('#soundToggle')[mobile?'tap':'click']();
    await page.waitForFunction(()=>backgroundMusic.stats().playing==='map-spring');
    assert.equal(await page.evaluate(()=>gameAudio.context.state),'running','gesture unlocks real Web Audio');
    await page.evaluate(()=>openTournament());
    await page.locator('[data-tournament-select="lakeMasters"]')[mobile?'tap':'click']();
    await page.locator('[data-tournament-action="start"]')[mobile?'tap':'click']();
    await page.waitForFunction(()=>backgroundMusic.stats().playing==='tournament-masters');
    const checked=await page.evaluate(async mobile=>{
      const decode=new OfflineAudioContext(2,44100,44100),records=[];
      for(const [id,track] of Object.entries(ShuMusicTracks)){
        if(mobile&&id!=='tournament-masters')continue;
        const response=await fetch(track.src);if(!response.ok)throw Error(id+' HTTP '+response.status);
        const buffer=await decode.decodeAudioData(await response.arrayBuffer());
        let sum=0,peak=0;const channel=buffer.getChannelData(0);
        for(const value of channel){sum+=value*value;peak=Math.max(peak,Math.abs(value));}
        records.push({id,duration:buffer.duration,expected:track.duration,rms:Math.sqrt(sum/channel.length),peak});
        if(id==='tournament-masters'){
          // Render a real AudioBufferSource repeat starting 100 ms before the
          // score boundary. Both sides must contain music, with no codec gap.
          const offline=new OfflineAudioContext(2,13230,44100),source=offline.createBufferSource();
          source.buffer=buffer;source.loop=true;source.loopStart=0;source.loopEnd=Math.min(buffer.duration,track.duration);
          source.connect(offline.destination);source.start(0,source.loopEnd-.1);
          const rendered=await offline.startRendering(),a=rendered.getChannelData(0);
          const rms=(start,end)=>Math.sqrt(a.slice(start,end).reduce((s,v)=>s+v*v,0)/(end-start));
          records.at(-1).loop={before:rms(3528,4410),after:rms(4410,5292),jump:Math.abs(a[4410]-a[4409])};
        }
      }
      return records;
    },mobile);
    assert.equal(checked.length,mobile?1:16);
    for(const record of checked){
      assert.ok(Math.abs(record.duration-record.expected)<.002,record.id+' exact decoded loop duration');
      assert.ok(record.peak<.98&&record.peak>.12,record.id+' decoded without clipping');
      assert.ok(record.rms>.035,record.id+' audible sampled score');
      if(record.loop){assert.ok(record.loop.before>.015&&record.loop.after>.015,'music continues across the real loop');assert.ok(record.loop.jump<.09,'bounded loop transition');}
    }
    await page.locator('#soundToggle')[mobile?'tap':'click']();
    await page.waitForFunction(()=>backgroundMusic.stats().playing===null);
    await page.locator('#soundToggle')[mobile?'tap':'click']();
    await page.waitForFunction(()=>backgroundMusic.stats().playing==='tournament-masters');
    assert.equal(await page.evaluate(()=>backgroundMusic.stats().lastError),null);
    await page.evaluate(()=>close());
    const voices=[];
    for(const id of ['crow','cloud','jamie','chappie']){
      const reached=await page.evaluate(id=>{
        const p=ShuRivals.dogPlacements.find(p=>p.id===id);
        for(let x=p.x-6;x<=p.x+6;x+=2)for(let y=p.y-6;y<=p.y+6;y+=2)
        for(const direction of ['up','down','left','right']){
          if(!isWalkableWorld(x,y))continue;s.x=x;s.y=y;s.direction=direction;
          if(nearbyRival()?.id===id){render();return true;}
        }return false;
      },id);
      assert.equal(reached,true,id+' reachable for a real A press');
      await page.waitForFunction(()=>performance.now()-rivalDogLastSound>=300);
      await page.locator('#action')[mobile?'tap':'click']();
      await page.waitForFunction(()=>{
        const voice=gameAudioSample('rivalDogBark');return !voice.paused&&voice.currentTime>.02;
      });
      const bark=await page.evaluate(()=>{
        const voice=gameAudioSample('rivalDogBark');
        return {rate:voice.playbackRate,pitch:voice.preservesPitch,webkitPitch:voice.webkitPreservesPitch};
      });
      assert.deepEqual(bark,{rate:1,pitch:true,webkitPitch:true},id+' natural bark');
      await page.waitForFunction(()=>performance.now()-rivalDogLastSound>=300);
      await page.locator('#tournamentTalkMore')[mobile?'tap':'click']();
      await page.waitForFunction(()=>{
        const voice=gameAudioSample('rivalDogWhine');return !voice.paused&&voice.currentTime>.02;
      });
      const whine=await page.evaluate(()=>{
        const voice=gameAudioSample('rivalDogWhine');return {rate:voice.playbackRate,pitch:voice.preservesPitch};
      });
      assert.ok(whine.rate>=.94&&whine.rate<=1.04);assert.equal(whine.pitch,true);
      voices.push({id,bark,whine});
      await page.locator('#tournamentTalk [data-close]')[mobile?'tap':'click']();
    }
    await page.evaluate(()=>{
      s.tournament=null;openPracticePond();beginFishing();battle.cast=50;
      launchSurfaceCast();settleSurfaceCast();battle.biteAt=Date.now();pull();
      clearInterval(timer);timer=0;finishHookReveal();
      battle.ten=90;battle.retrieval=.5;battle.startMeters=30;drawBattle();
    });
    assert.match(await page.locator('#pull').innerText(),/離して待つ/);
    assert.match(await page.locator('#wait').innerText(),/1回で糸を出す/);
    await page.locator('#wait')[mobile?'tap':'click']();
    assert.match(await page.locator('#battleMsg').innerText(),/張力が下がり、魚との距離が少し開いた/);
    const feed=await page.evaluate(()=>({tension:battle.ten,retrieval:battle.retrieval,reeling:battle.reeling}));
    assert.ok(feed.tension<70);assert.ok(feed.retrieval<.5);assert.equal(feed.reeling,false);
    const layout=await page.locator('#battleUi').evaluate(panel=>{
      const bounds=panel.getBoundingClientRect(),scene=document.querySelector('#fishScene').getBoundingClientRect();
      return bounds.top>=scene.top&&bounds.bottom<=scene.bottom&&panel.scrollWidth<=panel.clientWidth;
    });
    assert.equal(layout,true,'line-feed explanation fits the fishing scene');
    console.log('FIGHT_CONTROL_SCREENSHOT '+(mobile?'mobile':'desktop')+' data:image/jpeg;base64,'+(await page.screenshot({type:'jpeg',quality:75})).toString('base64'));
    console.log('DOG_LINE_SMOKE_PASS '+JSON.stringify({mobile,voices,lineFeed:feed,feedbackVisible:true}));
    assert.deepEqual(errors,[]);
    console.log('AUDIO_SMOKE_PASS '+JSON.stringify({mobile,tracks:checked.length,mastersPlayback:true,muteResume:true,loop:checked.find(r=>r.loop)?.loop,errors}));
  }finally{await browser.close();}
}
(async()=>{
  let server;
  try{
    let url;
    if(process.env.NUSHI_PUBLIC_SMOKE==='1')url=await waitForPublication();
    else{
      server=http.createServer((request,response)=>{
        try{
          let pathname=decodeURIComponent(new URL(request.url,'http://localhost').pathname);
          if(!pathname.startsWith('/nushi-tsuri/')){response.writeHead(404);response.end();return;}
          pathname=pathname.slice('/nushi-tsuri/'.length)||'index.html';
          const file=path.resolve(root,pathname);
          if(!file.startsWith(root+path.sep)||!fs.statSync(file).isFile())throw Error('Invalid path');
          const types={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8',
            '.png':'image/png','.webp':'image/webp','.mp3':'audio/mpeg','.wav':'audio/wav','.svg':'image/svg+xml'};
          response.writeHead(200,{'Content-Type':types[path.extname(file)]||'application/octet-stream','Cache-Control':'no-store'});
          fs.createReadStream(file).pipe(response);
        }catch{response.writeHead(404);response.end();}
      });
      await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
      url='http://127.0.0.1:'+server.address().port+'/nushi-tsuri/';
    }
    await smoke(url);await touchSmoke(url);await storySmoke(url,false);await storySmoke(url,true);await saveSlotSmoke(url,false);await saveSlotSmoke(url,true);await audioSmoke(url,false);await audioSmoke(url,true);
    const features=require('./browser-v209.features.cjs');await features(url,false);await features(url,true);
    const motion=require('./browser-v213.features.cjs');await motion(url,false);await motion(url,true);
    const intro=require('./browser-v215.features.cjs');await intro(url,false);await intro(url,true);
    const aquarium=require('./browser-v214.features.cjs');await aquarium(url,false);await aquarium(url,true);
  }finally{if(server)await new Promise(resolve=>server.close(resolve));}
})().catch(error=>{console.error(error);process.exitCode=1;});
