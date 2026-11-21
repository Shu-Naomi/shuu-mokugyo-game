'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),{execFileSync}=require('node:child_process');
const {chromium}=require('playwright'),{seed,saveKey}=require('./game-harness.cjs'),{server}=require('./browser-reference-village-evidence.cjs'),start=require('./browser-start-adventure.cjs');
const root=path.resolve(__dirname,'..'),out=path.join(__dirname,'artifacts/shiokakure-display-paths');
const base=execFileSync('git',['show','b3c0897:nushi-tsuri/offshore-island.js'],{encoding:'utf8'}),current=fs.readFileSync(path.join(root,'offshore-island.js'),'utf8');
(async()=>{fs.mkdirSync(out,{recursive:true});const host=server();await new Promise(r=>host.listen(0,'127.0.0.1',r));
const browser=await chromium.launch({headless:true,...(process.env.CHROMIUM_PATH?{executablePath:process.env.CHROMIUM_PATH}:{})});
try{for(const viewport of [{width:844,height:390},{width:740,height:360}]){
 const context=await browser.newContext({viewport,isMobile:true,hasTouch:true,serviceWorkers:'block',locale:'ja-JP'}),errors=[],bad=[],requests=[];
 try{await context.addInitScript(({key,state})=>{localStorage.setItem(key,JSON.stringify(state));localStorage.setItem('nushi-inugoya-options-v1',JSON.stringify({textSpeed:'instant'}));},{key:saveKey,state:{...seed(),mapRegion:'offshore',x:95,y:58,hp:100,money:9999999,soundEnabled:false,caught:{shiokakure:5,kasago:3},sizeRecords:{shiokakure:{hundredths:13155}}}});
 const page=await context.newPage(),tap=q=>page.locator(q).tap(),shot=n=>page.screenshot({path:path.join(out,viewport.width+'-'+n+'.png')});
 page.on('pageerror',e=>errors.push(e.message));page.on('response',r=>{if(r.status()>=400)bad.push(r.status()+' '+r.url());});page.on('request',r=>requests.push(r.url()));
 await page.clock.install({time:new Date('2026-11-21T12:00:00Z')});await page.clock.pauseAt('2026-11-21T12:00:01Z');
 await page.goto('http://127.0.0.1:'+host.address().port+'/nushi-tsuri/');await start(page,true);await page.clock.runFor(240);
 if(await page.locator('#lakeIntroSkip').isVisible()){await tap('#lakeIntroSkip');await page.clock.runFor(240);}
 const step=async d=>{await tap('[data-move="'+d+'"]');await page.clock.runFor(400);return page.evaluate(()=>[s.x,s.y]);};
 await page.addScriptTag({content:base});await step('up');await step('left');assert.deepEqual(await step('down'),[91,57]);await shot('before-road-stop');
 await page.addScriptTag({content:current});await page.evaluate(()=>{s.x=95;s.y=58;render();});
 for(const [d,x,y]of [['up',95,54],['left',91,54],['down',91,58],['left',87,58],['right',91,58],['up',91,54],['right',95,54],['down',95,58]])assert.deepEqual(await step(d),[x,y]);
 await shot('after-road-return');await page.evaluate(()=>{s.x=91;s.y=58;render();});assert.deepEqual(await step('down'),[91,58]);
 await page.evaluate(()=>{s.x=45;s.y=33;render();});assert.deepEqual(await step('down'),[45,33]);assert.ok(await page.evaluate(()=>ShuOffshore.fishingWater(s.x,s.y,'down')));
 await page.evaluate(()=>{s.x=130;s.y=96;render();});await tap('#action');await page.clock.runFor(100);await page.locator('#offshoreFerry.open').waitFor();await tap('#offshoreFerryCancel');
 await page.evaluate(()=>fishAtlasImage(ShuFishArt.species.shiokakure.asset).decode());
 await tap('#menu');await tap('[data-field-menu-target="record"]');await tap('[data-fishdex-id="shiokakure"]');await page.clock.runFor(200);
 const art=async selector=>{await page.waitForFunction(q=>document.querySelector(q)?.dataset.artPaintKey?.startsWith('assets/shiokakure-fight.png|'),selector);const result=await page.locator(selector).evaluate(c=>({key:c.dataset.artPaintKey,opaque:c.getContext('2d').getImageData(0,0,c.width,c.height).data.filter((v,i)=>i%4===3&&v>100).length}));assert.ok(result.opaque>3500);return result;};
 const dex=await art('#fishdexArt canvas');await shot('dex');await tap('#record [data-close]');
 await page.evaluate(()=>{const r=ShuPetLife.acquire(s,'shiokakure',petCatalog,Math.floor(s.gameMinutes/1440));if(!r.ok)throw Error(r.message);save();});
 await tap('#menu');await tap('[data-field-menu-target="items"]');await tap('#openPetAquarium');await page.clock.runFor(300);
 const tank=await art('#petTankStage [data-pet-fish] canvas');await shot('tank');
 const uid=await page.evaluate(()=>s.petLife.fish.find(f=>f.species==='shiokakure').uid);await tap('.pet-fish-roster [data-pet-inspect="'+uid+'"]');await page.clock.runFor(200);const inspect=await art('#petInspectFish canvas');await shot('inspection');
 await tap('[data-pet-action="focus-close"]');await tap('[data-pet-action="close"]');
 await page.evaluate(()=>{close();Object.assign(playerHomeState,{area:'interior',transitioning:false,...playerHomeAreaData.interior.spawns.exterior});s.homeAquariumFishId='shiokakure';render();});
 await page.clock.runFor(300);const home=await art('#homeAquariumFish canvas');await shot('home-exhibit');
 const poses=await page.evaluate(()=>{const el=document.querySelector('#homeAquariumFish');return Array.from({length:7},(_,i)=>{drawAquariumSprite(el,'shiokakure',0,{spriteMode:'turn',yaw:i*Math.PI/6,turnFrame:i});return el.querySelector('canvas').dataset.artPaintKey;});});assert.ok(poses.every(k=>k.startsWith('assets/shiokakure-fight.png|')));assert.ok(new Set(poses).size>=7);
 await page.evaluate(()=>save());const saved=await page.evaluate(()=>JSON.stringify({caught:s.caught,pet:s.petLife}));await page.reload();await start(page,true);await page.clock.runFor(200);assert.equal(await page.evaluate(()=>JSON.stringify({caught:s.caught,pet:s.petLife})),saved);
 assert.ok(!requests.some(u=>u.includes('shiokakure.svg')));assert.deepEqual(errors,[]);assert.deepEqual(bad,[]);
 fs.writeFileSync(path.join(out,viewport.width+'-result.json'),JSON.stringify({viewport,baselineStop:[91,57],roundTrip:true,blockedWater:true,ferry:true,dex,tank,inspect,home,poses,saveReload:true,errors,bad},null,2));console.log('DISPLAY_PATHS_PASS',viewport.width);
 }finally{await context.close();}
}}finally{await browser.close();await new Promise(r=>host.close(r));}})().catch(e=>{console.error(e);process.exitCode=1;});
