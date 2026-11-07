const {test}=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const {createCanvas,loadImage}=require('@napi-rs/canvas');
const Art=require('../layered-scenery.js'),Data=require('../scene-layers.js');
const archivedWorld=require('./fixtures/village-world-v54.json');
const {boot,seed,read,saveKey}=require('./game-harness.cjs');
const root=path.resolve(__dirname,'..'),pixels=c=>c.getContext('2d').getImageData(0,0,c.width,c.height).data;
const progress=w=>read(w,'({money:s.money,hp:s.hp,time:s.gameMinutes,caught:s.caught,baits:s.baits,items:s.items,ingredients:s.cookingIngredients,meals:s.preparedMeals,equipment:s.equipment,pet:s.petLife,story:s.lakeStory,quests:s.questCompletions,memories:s.catchMemories,records:s.fishCatchRecords,mode:s.fightMode})');

test('the preserved inn original changes only its own district and leaves the entire Sam district and village intact',async()=>{
 const d=archivedWorld,original=await loadImage(path.join(root,d.source));
 const inn=d.edits.find(e=>e.id==='fishing-inn-front');assert.ok(inn);
 const raw=fs.readFileSync(path.join(root,inn.source));assert.equal(crypto.createHash('sha256').update(raw).digest('hex'),'f088186877e9d364365d4f185a0af625b6073aaf71150f55cb1bd3ecd66074bc');
 const edits=await Promise.all(d.edits.map(e=>loadImage(path.join(root,e.source))));
 const beforeDefinition={...d,edits:d.edits.filter(e=>e.id!=='fishing-inn-front')};
 const before=Art.assembleSource(original,beforeDefinition,await Promise.all(beforeDefinition.edits.map(e=>loadImage(path.join(root,e.source)))),createCanvas);
 const after=Art.assembleSource(original,d,edits,createCanvas),a=pixels(before),b=pixels(after);let changed=0;
 for(let y=0;y<864;y++)for(let x=0;x<1536;x++){
  const i=(y*1536+x)*4;if(a[i]===b[i]&&a[i+1]===b[i+1]&&a[i+2]===b[i+2]&&a[i+3]===b[i+3])continue;
  changed++;assert.ok(x>=135&&x<=388&&y>=67&&y<=248,'unrelated village pixel changed at '+x+','+y);
 }
 assert.ok(changed>20000&&changed<45000,'a bounded, detailed inn and garden');
 assert.deepEqual(after.getContext('2d').getImageData(1100,400,300,240).data,before.getContext('2d').getImageData(1100,400,300,240).data,'Sam and the harbor are unchanged');
 assert.ok(fs.existsSync(path.join(root,inn.source)),'archived inn original remains available');
 console.log('INN_ART_BOUNDS_PASS '+JSON.stringify({changed,outsideDistrict:0,otherVillagePixelsUnchanged:true,rawOriginalPreserved:true}));
});

test('the cohesive master renders inn pixels at native resolution in day, rain and night without retired overlays',async()=>{
 const seen=[],canvas=createCanvas(1672,941),d=Data.get('world');
 assert.equal(d.source,'assets/village-world-v252-55-riao-clear.png');
 assert.deepEqual(d.edits,[],'district composites are retired from runtime');
 assert.deepEqual(d.patches,[],'dock patches are retired from runtime');
 assert.ok(d.underlay&&d.underlay!==archivedWorld.underlay,'load the matching cohesive underlay');
 assert.ok(d.parts.every(p=>p.motion!=='sway'),'vegetation stays fixed');
 assert.ok(d.parts.some(p=>p.kind==='water'&&p.effect),'water effects remain enabled');
 const controller=Art.createController({canvasFactory:createCanvas,loadImage:async url=>{seen.push(url);return loadImage(path.join(root,url));},
  createMotionCanvas:()=>{const c=createCanvas(1672,941);c.dataset={};return c;},visible:()=>true,isHidden:()=>false,reducedMotion:()=>true,
  requestFrame:()=>1,cancelFrame(){},onError:e=>{throw e;}});
 try{
  const original=await loadImage(path.join(root,d.source)),expected=createCanvas(1672,941);
  assert.deepEqual([original.width,original.height],[1672,941]);expected.getContext('2d').drawImage(original,0,0);
  assert.equal(await controller.paint(canvas,'world',{season:'spring',period:'day',weather:'sunny'}),true);
  assert.deepEqual([canvas.width,canvas.height],[1672,941]);
  assert.deepEqual(canvas.getContext('2d').getImageData(267,147,65,65).data,expected.getContext('2d').getImageData(267,147,65,65).data,'daytime inn uses native master pixels');
  const day=Buffer.from(canvas.getContext('2d').getImageData(267,147,65,65).data);
  for(const env of [{season:'summer',period:'evening',weather:'rain'},{season:'winter',period:'night',weather:'cloudy'}]){
   assert.equal(await controller.paint(canvas,'world',env),true);
   assert.notDeepEqual(Buffer.from(canvas.getContext('2d').getImageData(267,147,65,65).data),day,'season and lighting still change the master: '+env.period);
  }
  assert.ok(seen.includes(d.source),'cohesive master actually loaded');assert.ok(seen.includes(d.underlay),'matching underlay actually loaded');
  for(const retired of [archivedWorld.source,archivedWorld.underlay,...archivedWorld.edits.map(e=>e.source)]){
   assert.ok(!seen.includes(retired),'retired world image was not requested: '+retired);
   assert.ok(!Data.assets().includes(retired),'retired world image is not in runtime assets: '+retired);
  }
  const sw=fs.readFileSync(path.join(root,'sw.js'),'utf8');
  for(const file of [d.source,d.underlay])assert.ok(sw.includes('./'+file),'offline cache includes '+file);
 }finally{controller.dispose();}
});

for(const mode of ['gauge','nushi'])test('the old inn entrance, courtyard, cooking, overnight service and saved position remain compatible: '+mode,()=>{
 const app=boot({...seed(),x:42,y:39,direction:'up',items:{wildGreens:2},fightMode:mode,soundEnabled:false}),w=app.window;let saved,expected,at;
 try{
  w.Math.random=()=>.999999;
  for(const [x,y]of [[30,20],[43,25],[52,25]])assert.equal(w.isWalkableWorld(x,y),false,'the old walls remain solid');
  // The larger TCG shop occupies the old east strip at x58; the inn's
  // dry connector now follows x54 beside its trimmed garden fence.
  for(const [ax,ay,bx,by]of [[18,39,58,39],[42,39,42,32],[24,32,24,39],[54,32,54,39]])assert.equal(w.isWalkableWorldSegment(ax,ay,bx,by),true,'the original approach and side roads stay open');
  const before=progress(w);w.move('up');at=read(w,'({x:s.x,y:s.y,direction:s.direction})');assert.deepEqual(at,{x:42,y:35,direction:'up'});
  assert.equal(w.nearbyWorldLandmark().id,'farmhouse');w.action();assert.equal(read(w,'activeLocationId'),'farmhouse');assert.ok(w.document.querySelector('#locationInterior.open'));
  assert.deepEqual(progress(w),before);assert.match(w.document.querySelector('#locationActionLabel').textContent,/宿泊/);
  w.document.querySelector('[data-location-category="recipes"]').click();w.document.querySelector('[data-cook-recipe="bigFishPlate"]').click();
  const cooked=progress(w);assert.equal(cooked.ingredients.fishFillet,before.ingredients.fishFillet-1);assert.equal(cooked.items.wildGreens,before.items.wildGreens-1);assert.equal(cooked.meals.bigFishPlate,(before.meals.bigFishPlate||0)+1);assert.equal(cooked.money,before.money);
  w.document.querySelector('#locationAction').click();expected=progress(w);assert.equal(expected.time,(Math.floor(cooked.time/1440)+1)*1440+360);assert.equal(expected.hp,read(w,'s.maxHp'));
  for(const key of ['money','caught','baits','items','ingredients','meals','equipment','story','quests','memories','records','mode'])assert.deepEqual(expected[key],cooked[key],'sleep retains '+key);
  w.close();assert.deepEqual(read(w,'({x:s.x,y:s.y,direction:s.direction})'),at);w.save();saved=JSON.parse(w.localStorage.getItem(saveKey));assert.deepEqual(app.errors,[]);
 }finally{app.dispose();}
 const resumed=boot(saved);try{assert.deepEqual(progress(resumed.window),expected);assert.deepEqual(read(resumed.window,'({x:s.x,y:s.y,direction:s.direction})'),at);resumed.window.action();assert.equal(read(resumed.window,'activeLocationId'),'farmhouse');resumed.window.close();assert.deepEqual(resumed.errors,[]);}finally{resumed.dispose();}
});
