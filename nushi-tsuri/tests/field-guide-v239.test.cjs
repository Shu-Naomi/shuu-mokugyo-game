const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {boot,seed,read,saveKey}=require('./game-harness.cjs'),M=require('../mountain-region.js'),Life=require('../world-life.js'),F=require('../fish-additions.js');
const regions=['village',...Object.keys(M.regions),'coast'];
const snapshot=w=>read(w,'({hp:s.hp,money:s.money,time:s.gameMinutes,baits:s.baits,caught:s.caught,equipment:s.equipment,rod:s.selectedRod,bait:s.selectedBait,hook:s.selectedHook,region:s.mapRegion,x:s.x,y:s.y,direction:s.direction})');
test('growing fish notes page three at a time, wrap, and reset for another place without changing the save',()=>{
 const a=boot({...seed(),soundEnabled:false}),w=a.window;
 try{w.open('record');w.document.querySelector('#fishdexFieldGuide').click();w.eval('fieldGuideView.select("water-sea")');const before=snapshot(w),stored=w.localStorage.getItem(saveKey),expected=read(w,'ShuFieldGuide.waterNotes("sea-",{additions:ShuFishAdditions,baits:baitData,hooks:ShuTackle.hooks}).map(n=>n.id)'),all=[];
  const next=w.document.querySelector('#fieldGuideNotesNext');assert.equal(next.hidden,false);
  for(let n=0;n<Math.ceil(expected.length/3);n++){const ids=[...w.document.querySelectorAll('[data-guide-fish]')].map(n=>n.dataset.guideFish);assert.ok(ids.length<=3);all.push(...ids);next.click();}
  assert.deepEqual(all,expected);assert.equal(w.document.querySelector('[data-guide-fish]').dataset.guideFish,expected[0]);assert.deepEqual(snapshot(w),before);assert.equal(w.localStorage.getItem(saveKey),stored);assert.deepEqual(a.errors,[]);
 }finally{a.dispose();}
});
test('every regional guide uses real waters, doors and exits, and only existing new-fish pool/tackle data',()=>{
 const app=boot({...seed(),soundEnabled:false}),w=app.window;
 try{for(const region of regions){const data=read(w,`ShuFieldGuide.model({...s,mapRegion:${JSON.stringify(region)}},{mountain:ShuMountain,coast:ShuCoast,life:ShuWorldLife,additions:ShuFishAdditions,baits:baitData,hooks:ShuTackle.hooks,lakePolygon:lakeWaterPolygon})`);
  assert.equal(data.region,region);assert.ok(fs.existsSync(path.join(__dirname,'..',data.asset)));assert.ok(data.entries.length>0);
  assert.equal(new Set(data.entries.map(e=>e.id)).size,data.entries.length);
  for(const e of data.entries){assert.ok(Number.isFinite(e.point.x)&&Number.isFinite(e.point.y));
   if(e.kind==='exit'&&M.isRegion(region))assert.ok(M.exitAt(e.point.x,e.point.y,region));
   if(e.building){assert.equal(M.walkable(e.point.x,e.point.y,region),true);assert.equal(Life.nearby({...e.point,mapRegion:region,direction:'up'}).id,e.id);}
   for(const n of e.notes)if(n.id){assert.ok(F.definitions.some(f=>f.id===n.id));const d=F.definitions.find(f=>f.id===n.id);assert.ok(n.text.includes(d.name));assert.ok(n.text.includes(read(w,`baitData[${JSON.stringify(d.baits[0])}].name`)));assert.ok(n.text.includes(read(w,`ShuTackle.hooks[${JSON.stringify(d.hook)}].name`)));}
  }
  assert.deepEqual(data.buildings.map(b=>b.id),Life.buildings.filter(b=>b.region===region).map(b=>b.id));
 }assert.deepEqual(app.errors,[]);}finally{app.dispose();}
});
test('guide pagination, map selection and return preserve progress and fishdex selection without changing save data',()=>{
 const app=boot({...seed(),mapRegion:'mountainPond',...M.regions.mountainPond.entry,soundEnabled:false}),w=app.window;
 try{const before=snapshot(w),save=w.localStorage.getItem(saveKey);w.open('record');w.eval("fishdexSelectedId='nijimasu';renderRecord()");
  w.document.querySelector('#fishdexFieldGuide').click();assert.ok(w.document.querySelector('#fieldGuide.open'));assert.equal(w.document.querySelector('#record.open'),null);assert.equal(w.document.querySelector('#fieldGuideRegion').textContent,'峠の池');
  let places=Array.from(w.document.querySelectorAll('[data-guide-place]'));assert.equal(places.length,3);assert.equal(places[0].getAttribute('aria-pressed'),'true');
  assert.deepEqual(Array.from(w.document.querySelectorAll('[data-guide-fish]')).map(n=>n.dataset.guideFish),['herabuna','himemasu']);
  places[1].click();assert.match(w.document.querySelector('#fieldGuideMap').getAttribute('aria-label'),/峠の釣り人の小屋/);assert.equal(w.document.querySelector('#fieldGuideNote').textContent.includes('扉へ向いてA'),true);
  w.document.querySelector('#fieldGuideNext').click();assert.equal(w.document.querySelector('#fieldGuidePage').textContent,'2 / 2');assert.equal(w.document.querySelector('#fieldGuideNext').disabled,true);
  places=Array.from(w.document.querySelectorAll('[data-guide-place]'));assert.equal(places.length,1);assert.match(w.document.querySelector('#fieldGuideNote').textContent,/峠の沼/);
  w.document.querySelector('#fieldGuidePrevious').click();assert.equal(w.document.querySelector('#fieldGuidePage').textContent,'1 / 2');
  w.document.querySelector('#fieldGuideClose').click();assert.ok(w.document.querySelector('#record.open'));assert.equal(read(w,'fishdexSelectedId'),'nijimasu');assert.equal(w.document.activeElement.id,'fishdexFieldGuide');
  assert.deepEqual(snapshot(w),before);assert.equal(w.localStorage.getItem(saveKey),save);assert.deepEqual(app.errors,[]);
 }finally{app.dispose();}
});
test('keyboard guide selection and Escape return to the same record without walking or consuming randomness',()=>{
 const app=boot({...seed(),mapRegion:'stream',...M.entry,soundEnabled:false}),w=app.window;
 try{const before=snapshot(w);w.open('record');w.document.querySelector('#fishdexFieldGuide').click();w.eval('var guideRandomCalls=0;Math.random=()=>{guideRandomCalls++;return .5}');
  const first=w.document.querySelector('[data-guide-place]');first.focus();first.dispatchEvent(new w.KeyboardEvent('keydown',{key:'End',bubbles:true,cancelable:true}));
  assert.equal(w.document.activeElement.dataset.guidePlace,'exit-cave');assert.equal(w.document.querySelector('#fieldGuidePage').textContent,'3 / 3');
  w.document.activeElement.dispatchEvent(new w.KeyboardEvent('keydown',{key:'Home',bubbles:true,cancelable:true}));assert.equal(w.document.activeElement.dataset.guidePlace,'water-stream');
  w.document.activeElement.dispatchEvent(new w.KeyboardEvent('keydown',{key:'Escape',bubbles:true,cancelable:true}));assert.ok(w.document.querySelector('#record.open'));
  assert.deepEqual(snapshot(w),before);assert.equal(read(w,'guideRandomCalls'),0);assert.deepEqual(app.errors,[]);
 }finally{app.dispose();}
});
