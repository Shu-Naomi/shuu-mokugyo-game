const assert=require('node:assert/strict'),test=require('node:test');
const path=require('node:path'),fs=require('node:fs');
const {createCanvas,loadImage}=require('@napi-rs/canvas');
const Layers=require('../scene-layers.js'),Art=require('../layered-scenery.js');
const root=path.join(__dirname,'..');
const cs=(w,h)=>createCanvas(w,h);

test('underwater locales take precedence over water class, depth changes preserve layout and sea retains its fallback',async()=>{
  const locales=[
    [{waterZone:'sea',castLocale:'harbor'},'harbor'],
    [{waterZone:'sea',castLocale:'coast-sand',offshoreType:'cove'},'cove'],
    [{waterZone:'sea',castLocale:'coast-reef',offshoreType:'west'},'reef'],
    [{waterZone:'sea',castLocale:'coast-reef',offshoreType:'east'},'current'],
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
  assert.equal(sketches.size,11);
  assert.equal(Layers.underwaterRegion({waterZone:'sea',castLocale:'beach'}),'');
  assert.match(Layers.get('underwater-sea-shallow-true').source,/sand-flatfish/);
});

test('casting from the harbor and reef selects different backdrops without changing the active spot',()=>{
  const {boot,seed,read}=require('./game-harness.cjs');
  for(const [mapRegion,x,y,direction,locale,boatActive] of [
    ['village',134,102,'right','harbor',false],['coast',95,84,'up','reef',true],
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
