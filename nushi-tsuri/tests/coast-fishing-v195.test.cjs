const { test } = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { createCanvas, loadImage } = require('@napi-rs/canvas');
const { boot, seed, read } = require('./game-harness.cjs');
const Coast = require('../coast-voyage.js');
const Layers = require('../scene-layers.js');

const ready = (x, y) => ({ ...seed(), x, y, hp:100, maxHp:100,
  mapRegion:'coast', boatActive:true, direction:'up',
  ownedVehicles:['canoe'], equipment:{hands:null,vehicle:'canoe'},
  baits:{worm:8,shrimp:8}, selectedBait:'shrimp', selectedHook:'medium' });

test('the village map mask leaves the coastal water and boat visible', () => {
  const app=boot(ready(98,92));
  try {
    const doc=app.window.document;
    const rules=[...doc.styleSheets].flatMap(sheet=>[...sheet.cssRules]);
    const villageMask=rules.find(rule=>rule.selectorText?.startsWith('.map.v54-map > :not(#player)'));
    assert.ok(villageMask);
    assert.ok(doc.querySelector('#map').classList.contains('boating'));
    for(const id of ['coastPixels','boatVisual'])
      assert.equal(doc.getElementById(id).matches(villageMask.selectorText),false,`${id} must not be hidden by the village mask`);
    app.window.eval('s.mapRegion="village";s.boatActive=false;render()');
    for(const id of ['coastPixels','boatVisual'])
      assert.equal(app.window.getComputedStyle(doc.getElementById(id)).display,'none',`${id} stays hidden in the village`);
  } finally { app.dispose(); }
});

test('coast scene and fish spot survive the preparation-to-cast transition on both islands', () => {
  for (const [type,x,y,direction,expected] of [
    ['reef',95,84,'up','coast-reef-deep'],
    ['sand',145,110,'down','coast-sand-deep'],
  ]) {
    const app = boot({...ready(x,y),direction});
    try {
      const w=app.window;
      w.eval('action();beginFishing()');
      assert.equal(read(w,'battle.coastType'),type);
      assert.equal(read(w,'surfaceSceneryKind()'),`coast-${type}`);
      assert.ok(w.document.querySelector('#castSurface').classList.contains(`art-sea-coast-${type}`));
      assert.equal(read(w,'battle.spot'),`coast-${type}-shallow`);
      w.eval('resolveSurfaceCast(85)');
      assert.equal(read(w,'battle.spot'),expected);
      assert.equal(read(w,'battle.coastType'),type);
      assert.equal(read(w,'fishingSpotById(battle.spot).zone'),'sea');
      assert.deepEqual(app.errors,[]);
    } finally { app.dispose(); }
  }
});

test('water beside the reef uses reef fish while the sand dock uses sand fish',()=>{
  assert.equal(Coast.coastName(98,92),'reef');
  assert.equal(Coast.coastName(100,77),'sand');
  assert.equal(Coast.coastName(145,110),'sand');
  const app=boot({...ready(98,92),direction:'up'});
  try { assert.equal(read(app.window,'nearbyFishingSpot().id'),'coast-reef-shallow'); }
  finally { app.dispose(); }
});

test('B pays out line for immediate tension relief at a small distance cost',()=>{
  const app=boot(ready(95,84));
  try {
    const w=app.window;
    w.eval('action();beginFishing();resolveSurfaceCast(80);battle.phase="fight";battle.ten=90;battle.retrieval=.5;battle.startMeters=30;battle.reeling=true');
    w.eval('wait()');
    assert.equal(read(w,'battle.reeling'),false);
    assert.ok(read(w,'battle.ten')<=69);
    assert.ok(read(w,'battle.retrieval')<.5);
    const first=read(w,'battle.retrieval');
    w.eval('wait()');
    assert.equal(read(w,'battle.retrieval'),first,'rapid repeat does not pay out twice');
    assert.deepEqual(app.errors,[]);
  } finally { app.dispose(); }
});

test('boat footprints stay in water at all three docks and cannot cross the harbor pier',()=>{
  for(const [name,dock] of Object.entries(Coast.docks)) {
    for(const dx of [-7.8,0,7.8])
      assert.ok(Coast.water(dock.water.x+dx,dock.water.y),`${name} boat ${dx}`);
  }
  assert.equal(Coast.water(154,123),false);
});

test('both island fishing scenes are distinct opaque pictures and included in offline sources',async()=>{
  const assets=Layers.assets();
  for(const type of ['sand','reef']) {
    const scene=Layers.get(`surface-coast-${type}`,{period:'day'});
    assert.equal(scene.source,`assets/cast-coast-${type}-v195.svg`);
    assert.ok(assets.includes(scene.source));
    const image=await loadImage(path.join(__dirname,'../',scene.source));
    const canvas=createCanvas(320,180);
    canvas.getContext('2d').drawImage(image,0,0,320,180);
    const pixels=canvas.getContext('2d').getImageData(0,0,320,180).data;
    assert.equal(pixels[3],255);
    assert.equal(pixels[(100*320+160)*4+3],255);
  }
});
