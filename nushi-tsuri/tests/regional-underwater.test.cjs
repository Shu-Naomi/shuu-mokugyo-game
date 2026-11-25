const assert=require('node:assert/strict'),test=require('node:test');
const path=require('node:path'),fs=require('node:fs');
const {createHash} = require('node:crypto');
const {createCanvas,loadImage}=require('@napi-rs/canvas');
const Layers=require('../scene-layers.js'),Art=require('../layered-scenery.js');
const root=path.join(__dirname,'..');
const cs=(w,h)=>createCanvas(w,h);

test('underwater locales take precedence over water class, depth changes preserve layout and sea retains its fallback',async()=>{
  const locales=[
    [{waterZone:'sea',castLocale:'harbor'},'harbor'],
    [{waterZone:'lake',practice:true},'pool'],
    [{waterZone:'lake',mountainType:'highMarsh'},'marsh'],
    [{waterZone:'lake',mountainType:'wetMarsh'},'wetland'],
    [{waterZone:'lake',mountainType:'underground'},'cave'],
    [{waterZone:'river',mountainType:'canalCurrent'},'canal'],
    [{waterZone:'lake',mountainType:'canalBackwater'},'backwater'],
    [{waterZone:'river',mountainType:'wetCreek'},'stream'],
  ];
  const assets=Layers.assets(),sw=fs.readFileSync(path.join(root,'sw.js'),'utf8');
  const sketches=new Set();
  for(const [battle,name] of locales) {
    assert.equal(Layers.underwaterRegion(battle),name);
    const id=`underwater-${battle.waterZone}-`, near=Layers.get(id+'shallow-false-'+name),
      far=Layers.get(id+'deep-false-'+name);
    assert.equal(near.source,far.source); assert.equal(far.depth,'deep');
    sketches.add(near.source);
    assert.ok(assets.includes(near.source)); assert.ok(sw.includes(`"./${near.source}"`));
    const image=await loadImage(path.join(root,near.source));
    assert.equal(image.width,480); assert.equal(image.height,270);
    if(name==='canal') {
      const c=cs(480,270),ctx=c.getContext('2d'),env={season:'spring',period:'day'};
      Art.compose(c,Art.prepare(image,null,near,env,cs)); const shallow=ctx.getImageData(240,72,1,1).data;
      Art.compose(c,Art.prepare(image,null,far,env,cs)); const deep=ctx.getImageData(240,72,1,1).data;
      assert.ok(deep[1]+10<shallow[1]&&deep[3]===255);
    }
  }
  for (const legacyRegion of ['cove','reef','current']) {
    const legacy=Layers.get('underwater-sea-mid-false-'+legacyRegion);
    assert.equal(legacy.source,`assets/underwater-region-${legacyRegion}.webp`);
    assert.ok(assets.includes(legacy.source));
    sketches.add(legacy.source);
  }
  assert.equal(sketches.size,11);
  assert.equal(Layers.underwaterRegion({waterZone:'sea',castLocale:'beach'}),'');
  assert.match(Layers.get('underwater-sea-shallow-true').source,/sand-flatfish/);
});

test('casting from the harbor and reef selects different backdrops without changing the active spot',()=>{
  const {boot,seed,read}=require('./game-harness.cjs');
  for(const [mapRegion,x,y,direction,locale,boatActive] of [
    ['village',134,102,'right','harbor',false],['coast',62,73,'up','coast-reef',false],
  ]) {
    const app=boot({...seed(),mapRegion,x,y,direction,boatActive,referenceVillageLayout:'source-11016-1',baits:{worm:8},ownedVehicles:['canoe'],equipment:{vehicle:'canoe'}},{},
      mapRegion==='village'?{url:'http://localhost/nushi-tsuri/?villageReference=1'}:{});
    try {
      const {window:w}=app;
      const requests=[];
      w.ShuScenery.paint=(c,id)=>{if(c.id==='underwaterPixels')requests.push(id);return Promise.resolve(true);};
      assert.ok(read(w,'nearbyFishingSpot()'),'fixture has reachable water');
      w.eval('cast(nearbyFishingSpot())');
      const canvas=w.document.getElementById('underwaterPixels');
      assert.equal(canvas.dataset.locale,locale);
      const spot=read(w,'battle.spot');
      w.eval('setFishingSceneTheme("sea","deep","hirame")');
      assert.equal(canvas.dataset.locale,locale,'flatfish retains geographic context');
      assert.equal(read(w,'battle.spot'),spot,'art change does not choose a different encounter');
      assert.ok(requests.includes(`underwater-sea-shallow-false-${locale}`));
      assert.equal(requests.at(-1),`underwater-sea-deep-true-${locale}`);
      assert.deepEqual(app.errors,[]);
    } finally {app.dispose();}
  }
});

const Offshore = require('../offshore-island.js');
const coastalBanks = [
  {id:'coast-sand', mapRegion:'coast', x:145, y:102, direction:'down'},
  {id:'coast-reef', mapRegion:'coast', x:62, y:73, direction:'up'},
  ...Offshore.fishingPoints.map(point => ({...point, mapRegion:Offshore.id, id:'offshore-'+point.id})),
];

test('each island fishing bank has its own surface and underwater artwork at every depth', async () => {
  const thumbnails = new Set(), preview = cs(96,54).getContext('2d');
  const assets = Layers.assets();
  const sw = fs.readFileSync(path.join(root, 'sw.js'), 'utf8');
  for (const {id} of coastalBanks) {
    const surface = `assets/spot-${id}-cast.webp`, fight = `assets/spot-${id}-fight.webp`;
    assert.equal(Layers.underwaterRegion({spot:id+'-mid',castLocale:'beach'}), id, 'spot recovers its own seabed');
    for (const period of ['day', 'night']) assert.equal(Layers.get('surface-'+id, {period}).source, surface);
    for (const depth of ['shallow','mid','deep']) for (const flatfish of [false,true]) {
      assert.equal(Layers.get(`underwater-sea-${depth}-${flatfish}-${id}`).source, fight);
    }
    for (const source of [surface, fight]) {
      assert.ok(assets.includes(source), source);
      assert.ok(sw.includes('./'+source), source+' precached offline');
      const image = await loadImage(path.join(root, source));
      assert.ok(image.width > image.height, source+' landscape');
      preview.clearRect(0,0,96,54);
      preview.drawImage(image,0,0,96,54);
      const pixels = preview.getImageData(0,0,96,54).data;
      assert.ok(pixels.every((value, i) => i % 4 !== 3 || value === 255), source+' fills the scene');
      thumbnails.add(createHash('sha256').update(pixels).digest('hex'));
    }
  }
  assert.equal(thumbnails.size, 10, 'five visually distinct pairs of artwork');
});

test('an unavailable island picture can still paint the original shore or seabed', async () => {
  const restored = [
    ['surface-offshore-east', 'assets/cast-coast-reef-v198.webp'],
    ['underwater-sea-mid-false-offshore-east', 'assets/underwater-region-current.webp'],
  ];
  const missing = new Set(restored.map(([id]) => Layers.get(id).source));
  const loaded = [];
  const controller = Art.createController({
    canvasFactory: cs,
    loadImage: async source => {
      loaded.push(source);
      if (missing.has(source)) throw new Error('unavailable');
      return loadImage(path.join(root, source));
    },
    createMotionCanvas: () => Object.assign(cs(1,1), {dataset:{}}),
    visible: () => true, isHidden: () => true,
  });
  try {
    const canvas = cs(1,1);
    for (const [id, legacySource] of restored) {
      assert.equal(await controller.paint(canvas, id, {season:'spring',period:'day'}), true, id);
      assert.deepEqual(loaded.splice(0), [Layers.get(id).source, legacySource]);
      assert.equal(canvas.getContext('2d').getImageData(canvas.width>>1,canvas.height>>1,1,1).data[3], 255);
    }
  } finally {controller.dispose();}
});

for (const mode of ['gauge','nushi']) test('starting a fight at each island bank keeps the artwork and the fishing spot: '+mode, () => {
  const {boot, seed, read} = require('./game-harness.cjs');
  for (const {id, mapRegion, x, y, direction} of coastalBanks) {
    const app = boot({...seed(), mapRegion, x, y, direction, fightMode:mode, hp:100,
      boatActive:false, ownedVehicles:['canoe'], equipment:{vehicle:'canoe'},
      selectedBait:'shrimp', selectedHook:'medium', baits:{shrimp:8}});
    try {
      const w = app.window, scene = w.document.getElementById('fishScene');
      const requests = new Map();
      w.ShuScenery.paint = (canvas, sceneId) => {
        requests.set(canvas.id, Layers.get(sceneId).source);
        return Promise.resolve(true);
      };
      assert.equal(read(w,'nearbyFishingSpot().id'), id+'-shallow');
      w.action();
      assert.equal(read(w,'battle.phase'), 'prep');
      assert.equal(requests.get('castBackdrop'), `assets/spot-${id}-cast.webp`);
      w.eval('beginFishing();clearInterval(timer);commitCastResources();resolveSurfaceCast(50);startFight();clearInterval(timer);finishHookReveal();renderUnderwaterTravel()');
      assert.equal(read(w,'battle.phase'), 'fight');
      assert.equal(read(w,'battle.fightMode'), mode);
      assert.equal(read(w,'battle.spot'), id+'-mid');
      const castLocale = mapRegion === 'coast' ? id : Offshore.localeFor(id.slice('offshore-'.length));
      assert.equal(read(w,'battle.castLocale'), castLocale, 'the original casting and catch-record locale is preserved');
      assert.equal(read(w,'s.baits.shrimp'), 7);
      assert.equal(requests.get('underwaterPixels'), `assets/spot-${id}-fight.webp`);
      assert.equal(scene.classList.contains('nushi-water'), false, 'generic open water does not cover '+id);
      assert.deepEqual(app.errors, []);
    } finally { app.dispose(); }
  }
});

test('the float lands in painted open water at every distance after the phone crop', () => {
  const {boot, seed, read} = require('./game-harness.cjs');
  // Measured in the five 16:9 source paintings. The near and far endpoints
  // and both bends have a two-percentage-point margin of clear water.
  const lane = [[55,67],[57,62],[59,55],[56,49]];
  for (const {id, mapRegion, x, y, direction} of coastalBanks) {
    const sizes = {};
    const app = boot({...seed(), mapRegion, x, y, direction, boatActive:false,
      ownedVehicles:['canoe'], equipment:{vehicle:'canoe'}}, sizes);
    try {
      app.window.action();
      for (const [width,height] of [[1280,650],[844,352],[740,322],[820,274],[820,244],[940,240],[390,844]]) {
        sizes.castSurface = [width,height];
        const sourceHeight = Math.max(width/(16/9),height), sourceWidth = sourceHeight*16/9;
        const crop = sourceHeight - height, top = -crop + Math.min(.32*crop, .08*sourceHeight);
        app.window.eval('paintSurfaceScenery()');
        const surface = app.window.document.getElementById('castSurface');
        const alignment = parseFloat(surface.style.getPropertyValue('--island-cast-align-y'))/100;
        assert.ok(Math.abs(-crop*alignment - top)<.01, id+' cast artwork uses the same crop as the float');
        const foot = read(app.window,`ShuCast.layout(${width},${height},ShuCast.groundFor(surfaceSceneryKind())).ground`);
        const groundX = id==='offshore-cove' ? .30 : .42;
        const footX = Math.max(width*.22, (width-sourceWidth)/2 + groundX*sourceWidth);
        assert.ok(Math.abs(foot.x-footX)<1, id+' stands on the visible dry bank');
        assert.ok(Math.abs(foot.y-(height-.035*sourceHeight))<1, id+' boots stay in view');
        let previous = Infinity;
        for (let distance=0;distance<=100;distance+=5) {
          const point = read(app.window,`castSurfacePoint(${distance})`);
          assert.ok(point.x>0 && point.x<100 && point.y>0 && point.y<100, id+' float in viewport');
          const sourceX = (width*point.x/100 - (width-sourceWidth)/2)/sourceWidth*100;
          const sourceY = (height*point.y/100 - top)/sourceHeight*100;
          const progress = distance/100*(lane.length-1), i = Math.min(lane.length-2,Math.floor(progress));
          const expected = lane[i].map((v,axis) => v+(lane[i+1][axis]-v)*(progress-i));
          assert.ok(Math.abs(sourceX-expected[0])<=2 && Math.abs(sourceY-expected[1])<=2,
            `${id} ${width}×${height} at ${distance}: (${sourceX.toFixed(1)}, ${sourceY.toFixed(1)})`);
          assert.ok(sourceY<=previous, id+' longer casts travel away from shore');
          previous = sourceY;
        }
      }
      assert.deepEqual(app.errors, []);
    } finally {app.dispose();}
  }
});


test('coastal boat uses its own artwork without moving the catch to another fishing spot', () => {
  const {boot,seed,read}=require('./game-harness.cjs');
  for (const [vehicle,x,y,direction,coastType] of [['canoe',95,84,'up','reef'],['tarai',145,110,'down','sand']]) {
    for (const mode of ['gauge','nushi']) {
      const app=boot({...seed(),mapRegion:'coast',x,y,direction,boatActive:true,
        hp:100,ownedVehicles:[vehicle],equipment:{vehicle},fightMode:mode,
        selectedBait:'shrimp',selectedHook:'medium',baits:{shrimp:8}});
      try {
        const w=app.window,requests=new Map();
        w.ShuScenery.paint=(canvas,id)=>{requests.set(canvas.id,Layers.get(id).source);return Promise.resolve(true);};
        assert.equal(read(w,'nearbyFishingSpot().id'), 'coast-'+coastType+'-shallow');
        w.action();
        assert.equal(read(w,'battle.coastVehicle'),vehicle);
        assert.equal(read(w,'battle.castLocale'),'coast-'+coastType);
        assert.equal(requests.get('castBackdrop'),'assets/spot-coast-boat-cast.webp');
        w.eval('beginFishing();clearInterval(timer);commitCastResources();resolveSurfaceCast(50);startFight();clearInterval(timer);finishHookReveal();renderUnderwaterTravel()');
        assert.equal(read(w,'battle.phase'),'fight');
        assert.equal(read(w,'battle.spot'),'coast-'+coastType+'-mid');
        assert.equal(read(w,'battle.fightMode'),mode);
        assert.equal(read(w,'s.baits.shrimp'),7);
        assert.equal(requests.get('underwaterPixels'),'assets/spot-coast-boat-fight.webp');
        assert.deepEqual(app.errors,[]);
      } finally {app.dispose();}
    }
  }
});

test('boat backgrounds are opaque, cached, and the two hull types stay under the shoes',async()=>{
  const Cast=require('../pixel-cast.js');
  const sw=fs.readFileSync(path.join(root,'sw.js'),'utf8');
  for(const id of ['surface-coast-boat','underwater-sea-mid-false-coast-boat']){
    const scene=Layers.get(id);
    assert.ok(scene.fallbackSource && fs.existsSync(path.join(root,scene.fallbackSource)));
    assert.ok(Layers.assets().includes(scene.source) && sw.includes('./'+scene.source));
    const im=await loadImage(path.join(root,scene.source)), c=cs(96,54).getContext('2d');
    assert.equal(im.width/im.height,16/9);
    c.drawImage(im,0,0,96,54);
    assert.ok(c.getImageData(0,0,96,54).data.every((n,i)=>i%4!==3||n===255));
  }
  for(const [width,height] of [[844,352],[820,244],[940,240]]){
    const canvas=cs(width,height),ctx=canvas.getContext('2d'),hashes=new Set();
    for (const vehicle of ['canoe','tarai']){
      const {box}=Cast.draw(canvas,{ground:Cast.groundFor('coast-boat'),vehicle});
      const at=(x,y)=>ctx.getImageData(Math.round(box.x+x*box.scale),Math.round(box.y+y*box.scale),1,1).data;
      assert.equal(at(62,102)[3],255);
      assert.equal(at(62,111)[3],255);
      hashes.add(createHash('sha256').update(ctx.getImageData(0,0,width,height).data).digest('hex'));
    }
    assert.equal(hashes.size,2);
  }
});
