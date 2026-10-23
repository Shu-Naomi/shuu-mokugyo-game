const {test}=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const {createCanvas,loadImage}=require('@napi-rs/canvas');
const Art=require('../layered-scenery.js'),Data=require('../scene-layers.js');
const {boot,seed,read,saveKey}=require('./game-harness.cjs');
const root=path.resolve(__dirname,'..'),pixels=c=>c.getContext('2d').getImageData(0,0,c.width,c.height).data;
const progress=w=>read(w,'({money:s.money,hp:s.hp,time:s.gameMinutes,caught:s.caught,baits:s.baits,items:s.items,ingredients:s.cookingIngredients,meals:s.preparedMeals,equipment:s.equipment,pet:s.petLife,story:s.lakeStory,quests:s.questCompletions,memories:s.catchMemories,records:s.fishCatchRecords,mode:s.fightMode})');

test('the preserved inn original changes only its own district and leaves the entire Sam district and village intact',async()=>{
 const d=Data.get('world'),original=await loadImage(path.join(root,d.source));
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
 assert.ok(Data.assets().includes(inn.source));assert.ok(fs.readFileSync(path.join(root,'sw.js'),'utf8').includes('./'+inn.source));
 console.log('INN_ART_BOUNDS_PASS '+JSON.stringify({changed,outsideDistrict:0,otherVillagePixelsUnchanged:true,rawOriginalPreserved:true}));
});

test('the actual world controller loads both district originals before seasonal and weather rendering',async()=>{
 const seen=[],canvas=createCanvas(1536,864),d=Data.get('world');
 const controller=Art.createController({canvasFactory:createCanvas,loadImage:async url=>{seen.push(url);return loadImage(path.join(root,url));},
  createMotionCanvas:()=>{const c=createCanvas(1536,864);c.dataset={};return c;},visible:()=>true,isHidden:()=>false,reducedMotion:()=>true,
  requestFrame:()=>1,cancelFrame(){},onError:e=>{throw e;}});
 try{
  assert.equal(await controller.paint(canvas,'world',{season:'spring',period:'day',weather:'sunny'}),true);
  for(const e of d.edits)assert.ok(seen.includes(e.source),'loaded '+e.source);
  const original=await loadImage(path.join(root,d.source)),assembled=Art.assembleSource(original,d,await Promise.all(d.edits.map(e=>loadImage(path.join(root,e.source)))),createCanvas);
  assert.deepEqual(canvas.getContext('2d').getImageData(245,135,65,65).data,assembled.getContext('2d').getImageData(245,135,65,65).data);
  for(const env of [{season:'summer',period:'evening',weather:'rain'},{season:'winter',period:'night',weather:'cloudy'}])assert.equal(await controller.paint(canvas,'world',env),true);
 }finally{controller.dispose();}
});

for(const mode of ['gauge','nushi'])test('the old inn entrance, courtyard, cooking, overnight service and saved position remain compatible: '+mode,()=>{
 const app=boot({...seed(),x:42,y:39,direction:'up',items:{wildGreens:2},fightMode:mode,soundEnabled:false}),w=app.window;let saved,expected,at;
 try{
  w.Math.random=()=>.999999;
  for(const [x,y]of [[30,20],[43,25],[52,25]])assert.equal(w.isWalkableWorld(x,y),false,'the old walls remain solid');
  for(const [ax,ay,bx,by]of [[18,39,58,39],[42,39,42,32],[24,32,24,39],[58,32,58,39]])assert.equal(w.isWalkableWorldSegment(ax,ay,bx,by),true,'the original approach and side roads stay open');
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
