const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const {createCanvas,Image}=require('@napi-rs/canvas');
const {boot,seed,read,saveKey}=require('./game-harness.cjs');
const Mountain=require('../mountain-region.js');
const Coast=require('../coast-voyage.js');

function streamSave(extra={}) {
  return {...seed(),mapRegion:'stream',x:148,y:128,hp:100,
    ownedVehicles:['canoe'],equipment:{hands:null,vehicle:'canoe'},...extra};
}
function segment(a,b) {
  for(let i=0;i<=8;i++)if(!Mountain.walkable(a[0]+(b[0]-a[0])*i/8,a[1]+(b[1]-a[1])*i/8))return false;
  return true;
}

test('the actual four-unit walking grid connects the village road, bridge, three fishing waters, pass and cave approach',()=>{
  const queue=[[148,128]],seen=new Set(['148,128']);
  for(let i=0;i<queue.length;i++)for(const [dx,dy] of [[4,0],[-4,0],[0,4],[0,-4]]){
    const a=queue[i],b=[a[0]+dx,a[1]+dy],key=b.join(',');
    if(!seen.has(key)&&segment(a,b)){seen.add(key);queue.push(b);}
  }
  for(const p of [[112,72],[219,30],[73,8],[50,56],[195,116]])
    assert.ok(queue.some(([x,y])=>Math.hypot(x-p[0],y-p[1])<=4),`unreachable ${p}`);
  const waters=new Set();
  for(const [x,y] of queue)for(const d of ['up','down','left','right']){
    const found=Mountain.fishingWater(x,y,d);if(found)waters.add(found.type);
  }
  assert.deepEqual([...waters].sort(),['marsh','pond','stream']);
  assert.equal(Mountain.walkable(112,40),false,'stream remains solid water');
  assert.equal(Mountain.walkable(112,72),true,'bridge is a walkable crossing');
  assert.equal(Mountain.fishingWater(112,72,'down'),null,'bridge is not a cast spot');
  assert.equal(Mountain.walkable(10,10),false,'forest/cliff is not an open plane');
});

test('A and directional exits travel between the same north village gate and mountain road without losing equipment or stamina',()=>{
  const app=boot({...seed(),x:124,y:8,ownedVehicles:['canoe'],equipment:{hands:null,vehicle:'canoe'}});
  try{
    const w=app.window,before=read(w,'({money:s.money,hp:s.hp,baits:s.baits,gameMinutes:s.gameMinutes,caught:s.caught,equipment:s.equipment})');
    w.eval('action()');
    assert.equal(read(w,'s.mapRegion'),'stream');
    assert.deepEqual(read(w,'({x:s.x,y:s.y,d:s.direction})'),{x:152,y:128,d:'up'});
    assert.equal(read(w,'s.boatActive'),false);
    assert.equal(read(w,'activeLandingDock()'),null,'village port does not leak into mountains');
    w.eval('action()');
    assert.deepEqual(read(w,'({region:s.mapRegion,x:s.x,y:s.y,d:s.direction})'),{region:'village',x:124,y:8,d:'down'});
    w.eval('move("up");move("up")');
    assert.equal(read(w,'s.mapRegion'),'stream');
    w.eval('move("down");move("down")');
    assert.deepEqual(read(w,'({region:s.mapRegion,x:s.x,y:s.y})'),{region:'village',x:124,y:8});
    assert.deepEqual(read(w,'({money:s.money,hp:s.hp,baits:s.baits,gameMinutes:s.gameMinutes,caught:s.caught,equipment:s.equipment})'),before);
    assert.deepEqual(app.errors,[]);
  }finally{app.dispose();}
});

test('mountain saves reload in place, clear impossible boarding, and rescue invalid terrain onto the mountain road',()=>{
  const app=boot(streamSave({x:128,y:76,boatActive:true}));let saved;
  try{
    const w=app.window;
    assert.equal(read(w,'s.boatActive'),false);
    assert.ok(w.document.querySelector('#map').classList.contains('mountain'));
    assert.equal(w.getComputedStyle(w.document.querySelector('#mountainPixels')).display,'block');
    // JSDOM does not resolve !important across stylesheets like a browser.
    // Verify the regional visibility rules match every village-only layer;
    // the release smoke check also inspects the browser's computed display.
    const rules=[...w.document.styleSheets].flatMap(sheet=>[...sheet.cssRules]);
    const mask=rules.find(r=>r.selectorText?.startsWith('.map.v54-map.mountain >'));
    assert.ok(mask);assert.equal(mask.style.getPropertyPriority('display'),'important');
    for(const id of ['worldPixels','coastPixels','boatVisual','forageLayer','rivalLayer','tournamentNpcLayer'])
      assert.ok(w.document.getElementById(id).matches(mask.selectorText),id);
    const worldRule=rules.find(r=>r.selectorText?.includes(':not(.mountain) > #worldPixels'));
    assert.ok(worldRule);assert.equal(w.document.querySelector('#worldPixels').matches(worldRule.selectorText),false);
    assert.equal(read(w,'nearbyWorldLandmark()'),null);
    assert.equal(read(w,'nearbyForagePoint()'),null);
    w.eval('save()');saved=JSON.parse(w.localStorage.getItem(saveKey));
    assert.deepEqual(app.errors,[]);
  }finally{app.dispose();}
  const restored=boot(saved);
  try{assert.deepEqual(read(restored.window,'({region:s.mapRegion,x:s.x,y:s.y,boat:s.boatActive})'),{region:'stream',x:128,y:76,boat:false});}
  finally{restored.dispose();}
  const invalid=boot(streamSave({x:10,y:10}));
  try{
    const p=read(invalid.window,'({x:s.x,y:s.y})');assert.ok(Mountain.walkable(p.x,p.y));
    assert.equal(read(invalid.window,'s.mapRegion'),'stream');
  }finally{invalid.dispose();}
});

test('stream, pond and marsh keep their populations across preparation, start and distance resolution',()=>{
  for(const [type,x,y,d] of [['stream',128,76,'left'],['pond',60,56,'up'],['marsh',172,96,'right']]){
    const app=boot(streamSave({x,y,direction:d}));
    try{
      const w=app.window;w.eval('action();beginFishing()');
      assert.equal(read(w,'battle.mountainType'),type);
      assert.equal(read(w,'battle.spot'),`mountain-${type}-shallow`);
      assert.ok(w.document.querySelector('#castZoneName').textContent.includes(Mountain.names[type]));
      w.eval('resolveSurfaceCast(85)');
      assert.equal(read(w,'battle.spot'),`mountain-${type}-deep`);
      assert.ok(read(w,'battle.f.id')!=='nushi','star-lake boss remains in the star lake');
      assert.equal(read(w,'surfaceSceneryKind()'),'mountain-'+type);
      assert.deepEqual(app.errors,[]);
    }finally{app.dispose();}
  }
});

test('the star-lake secret bait is rejected in a mountain pond before paying bait, health or time',()=>{
  const app=boot(streamSave({x:60,y:56,direction:'up',selectedBait:'nushiSecret',selectedHook:'large',baits:{nushiSecret:3}}));
  try{
    const w=app.window;w.eval('action();beginFishing();battle.cast=95');
    const before=read(w,'({hp:s.hp,time:s.gameMinutes,bait:s.baits.nushiSecret})');
    assert.equal(w.eval('launchSurfaceCast()'),false);
    assert.deepEqual(read(w,'({hp:s.hp,time:s.gameMinutes,bait:s.baits.nushiSecret})'),before);
    assert.match(w.document.querySelector('#battleMsg').textContent,/星降る湖/);
    assert.deepEqual(app.errors,[]);
  }finally{app.dispose();}
});

test('every reachable island shore facing the sea casts independently of invisible village buildings and bridges',()=>{
  const app=boot({...streamSave(),mapRegion:'coast',boatActive:false,x:146,y:70});
  try{
    const w=app.window;let samples=0,overlaidVillage=0;
    for(let y=48;y<=112;y+=2)for(let x=44;x<=184;x+=2)if(Coast.shore(x,y)){
      for(const d of ['up','down','left','right']){
        const water=Coast.fishingWater(x,y,d);if(!water)continue;
        const found=read(w,`fishingWaterNearPlayer(${x},${y},"${d}")`);
        assert.ok(found,`shore ${x},${y}/${d}`);
        assert.equal(found.zone,'sea');samples++;
        if(w.eval(`isBlockedStructure(${x},${y}) || ShuSceneLayers.propSolid(${x},${y}) || isOnRiverBridgeSpan(${x},${y})`))overlaidVillage++;
      }
    }
    assert.ok(samples>200);assert.ok(overlaidVillage>0,'covers former map-overlap failure');
    assert.equal(read(w,'fishingWaterNearPlayer(146,70,"up")'),null,'inland-facing island centre cannot cast');
    assert.deepEqual(app.errors,[]);
  }finally{app.dispose();}
});

test('decoded mountain landscape is opaque and preserves detail under night tint',async()=>{
  const pending=[];
  class LocalImage extends Image{
    set src(source){pending.push(new Promise((resolve,reject)=>{const paint=this.onload;this.onload=()=>{paint?.();resolve();};this.onerror=reject;}));super.src=path.join(__dirname,'..',source);}
  }
  const context={Image:LocalImage};vm.runInNewContext(fs.readFileSync(path.join(__dirname,'../mountain-region.js'),'utf8'),context);
  const day=createCanvas(960,540),night=createCanvas(960,540);
  context.ShuMountain.paint(day,{period:'day'});await Promise.all(pending);
  context.ShuMountain.paint(night,{period:'night'});
  const a=day.getContext('2d').getImageData(0,0,960,540).data,b=night.getContext('2d').getImageData(0,0,960,540).data;
  const colors=new Set();let da=0,nb=0;
  for(let i=0;i<a.length;i+=4*17){assert.equal(a[i+3],255);colors.add(`${a[i]},${a[i+1]},${a[i+2]}`);da+=a[i]+a[i+1]+a[i+2];nb+=b[i]+b[i+1]+b[i+2];}
  assert.ok(colors.size>1000);assert.ok(nb>da*.4&&nb<da*.8);
  const sw=fs.readFileSync(path.join(__dirname,'../sw.js'),'utf8');
  for(const asset of ['mountain-region.js?v=227-1',Mountain.asset,'assets/coast-rowboat-v226.png'])assert.ok(sw.includes(asset),asset);
});
