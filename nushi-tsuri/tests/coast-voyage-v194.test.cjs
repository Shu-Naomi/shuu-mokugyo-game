const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { createCanvas, loadImage } = require('@napi-rs/canvas');
const { boot, seed, read, saveKey } = require('./game-harness.cjs');
const Coast = require('../coast-voyage.js');
const Tackle = require('../tackle-balance.js');

function withBoat(vehicle='canoe', extra={}) {
  return { ...seed(), x:154,y:123,direction:'right',hp:100,
    ownedVehicles:[vehicle],equipment:{hands:null,vehicle},...extra };
}
function state(w){return read(w,'({region:s.mapRegion,boat:s.boatActive,x:s.x,y:s.y,hp:s.hp,minutes:s.gameMinutes})');}

test('coastal land, water and docks agree with equipment speeds and stamina costs',()=>{
  assert.ok(Coast.shore(Coast.docks.sand.land.x,Coast.docks.sand.land.y));
  assert.ok(Coast.shore(Coast.docks.reef.land.x,Coast.docks.reef.land.y));
  for(const dock of Object.values(Coast.docks))assert.ok(Coast.water(dock.water.x,dock.water.y),dock.name);
  assert.equal(Coast.stepFor('canoe'),5);
  assert.equal(Coast.stepFor('tarai'),3);
  assert.equal(Coast.costFor('canoe'),2);
  assert.equal(Coast.costFor('tarai'),1);
  for(const id of ['shirogisu','ainame','madai'])assert.ok(Tackle.weight(id,'shrimp','medium')>0,id);
});

test('harbor A boards an owned boat, movement consumes stamina and time, island rest restores health and returning persists',()=>{
  const app=boot(withBoat('canoe',{hp:80}));
  try{
    const w=app.window;
    assert.equal(state(w).region,'village');
    w.eval('action()');
    assert.deepEqual(state(w),{region:'coast',boat:true,x:166,y:123,hp:80,minutes:500});
    w.eval('move("left")');
    assert.equal(state(w).x,161);
    assert.equal(state(w).hp,78);
    assert.equal(state(w).minutes,502);
    w.eval('s.x=ShuCoast.docks.sand.water.x;s.y=ShuCoast.docks.sand.water.y;action()');
    assert.equal(state(w).boat,false);
    w.eval('s.x=ShuCoast.restPoint.x;s.y=ShuCoast.restPoint.y;action()');
    assert.equal(state(w).hp,100);
    assert.equal(state(w).minutes,532);
    w.eval('s.x=ShuCoast.docks.sand.land.x;s.y=ShuCoast.docks.sand.land.y;action()');
    assert.equal(state(w).boat,true);
    w.eval('s.x=ShuCoast.docks.harbor.water.x;s.y=ShuCoast.docks.harbor.water.y;action()');
    assert.equal(state(w).region,'village');
    assert.deepEqual(state(w),JSON.parse(w.localStorage.getItem(saveKey)) && {
      region:JSON.parse(w.localStorage.getItem(saveKey)).mapRegion,
      boat:JSON.parse(w.localStorage.getItem(saveKey)).boatActive,
      x:JSON.parse(w.localStorage.getItem(saveKey)).x,
      y:JSON.parse(w.localStorage.getItem(saveKey)).y,
      hp:JSON.parse(w.localStorage.getItem(saveKey)).hp,
      minutes:JSON.parse(w.localStorage.getItem(saveKey)).gameMinutes,
    });
    assert.deepEqual(app.errors,[]);
  } finally { app.dispose(); }
});

test('unowned boat cannot launch, tarai drains one health, exhausting the boat returns safely to harbor',()=>{
  const empty=boot({...seed(),x:154,y:123});
  try{empty.window.eval('action()');assert.equal(state(empty.window).region,'village');}
  finally{empty.dispose();}
  const app=boot(withBoat('tarai',{hp:2}));
  try{
    const w=app.window;w.eval('action();move("left")');
    assert.deepEqual([state(w).x,state(w).hp],[163,1]);
    w.eval('move("up")');assert.equal(state(w).hp,0);
    w.eval('move("left")');
    assert.equal(state(w).region,'village');
    assert.ok(state(w).hp>=25);
    assert.deepEqual(app.errors,[]);
  }finally{app.dispose();}
});

test('reef fishing and sand fishing select distinct spots and specimen size remains random',()=>{
  const app=boot(withBoat('canoe',{mapRegion:'coast',boatActive:true,x:95,y:84,direction:'up',hp:80}));
  try{
    const w=app.window;
    assert.equal(read(w,'nearbyFishingSpot().id'),'coast-reef-shallow');
    w.eval('action()');
    assert.equal(read(w,'battle.spot'),'coast-reef-shallow');
    assert.equal(read(w,'battle.coastType'),'reef');
    const reef=read(w,'fishingSpotById("coast-reef-deep").weights');
    assert.ok(reef.madai>0 && reef.ainame>0);
    w.eval('battle.bait="shrimp";battle.hook="large"');
    const picks=read(w,'Array.from({length:150},()=>pick(80).id)');
    assert.ok(picks.includes('ainame'));
    const tiers=read(w,'[rollFishSpecimen(fish.find(f=>f.id==="madai"),()=>0).tierId,rollFishSpecimen(fish.find(f=>f.id==="madai"),()=>.999).tierId]');
    assert.deepEqual(tiers,['tiny','giant']);
    w.eval('endBattle();s.x=105;s.y=96;s.direction="up"');
    assert.equal(read(w,'nearbyFishingSpot().id'),'coast-sand-shallow');
    assert.deepEqual(app.errors,[]);
  }finally{app.dispose();}
});

test('each new fish has a distinct opaque five-direction atlas and offline references',async()=>{
  const root=path.join(__dirname,'..');
  const sw=fs.readFileSync(path.join(root,'sw.js'),'utf8');
  for(const id of ['shirogisu','ainame','madai']){
    for(const [suffix,cells] of [['',8],['-turn',5],['-mouth',3]]){
      const name=`fish-${id}${suffix}-v194.svg`;
      assert.ok(sw.includes(name));
      const image=await loadImage(path.join(root,'assets',name));
      assert.deepEqual([image.width,image.height],[cells*64,32]);
      for(let frame=0;frame<cells;frame++){
        const canvas=createCanvas(64,32),ctx=canvas.getContext('2d');
        ctx.drawImage(image,frame*64,0,64,32,0,0,64,32);
        const alpha=ctx.getImageData(0,0,64,32).data;
        let occupied=0;
        for(let p=3;p<alpha.length;p+=4)if(alpha[p]>100)occupied++;
        assert.ok(occupied>60,`${name} frame ${frame} is painted`);
      }
    }
  }
});
