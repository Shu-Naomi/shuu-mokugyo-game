const {test}=require('node:test');
const assert=require('node:assert/strict');
const path=require('node:path'),fs=require('node:fs'),vm=require('node:vm'),crypto=require('node:crypto');
const {execFileSync}=require('node:child_process');
const {createCanvas,loadImage}=require('@napi-rs/canvas');
const Data=require('../scene-layers.js'),Art=require('../layered-scenery.js');
const root=path.join(__dirname,'..');
const bytes=c=>c.getContext('2d').getImageData(0,0,c.width,c.height).data;
const hash=b=>crypto.createHash('sha256').update(b).digest('hex');
const neutral={season:'spring',period:'day',weather:'sunny',referenceVillage:true};
async function scene(env=neutral){const definition=Data.get('world',env),source=await loadImage(path.join(root,definition.source));return {source,prepared:Art.prepare(source,source,definition,env,createCanvas)};}
test('reference is explicit opt-in; normal definitions and solids stay unchanged',()=>{
  const previous=execFileSync('git',['show','b0f8e02:nushi-tsuri/scene-layers.js'],{cwd:root,encoding:'utf8'});
  const context={module:{exports:{}}};vm.runInNewContext(previous,context);const old=context.module.exports;
  assert.equal(JSON.stringify(Data.get('world')),JSON.stringify(old.get('world')));
  for(let y=0;y<135;y+=.5)for(let x=0;x<240;x+=.5)assert.equal(Data.propSolid(x,y),old.propSolid(x,y));
  assert.deepEqual(Data.referenceDefinition().parts.map(p=>p.id),Data.get('world').parts.map(p=>p.id));
  assert.equal(Data.get('world',{referenceVillage:true}).referenceVillage,true);
  assert.equal(Data.propSolid(187.8,91,{referenceVillage:true}),false,'reference solids belong to central geometry');
});
test('browser global gates both the scene and opening village illustration',()=>{
  const context={ShuVillageReference:{enabled:true},ShuPlayerOptions:{}};
  vm.runInNewContext(fs.readFileSync(path.join(root,'scene-layers.js'),'utf8'),context);
  vm.runInNewContext(fs.readFileSync(path.join(root,'lake-intro.js'),'utf8'),context);
  assert.equal(context.ShuSceneLayers.get('world').source,'assets/village-reference-pilot.png');
  assert.equal(context.ShuLakeIntro.sourceFor('village'),'assets/village-reference-pilot.png');
  context.ShuVillageReference.enabled=false;
  assert.equal(context.ShuSceneLayers.get('world').source,Data.get('world').source);
  assert.equal(context.ShuLakeIntro.sourceFor('village'),context.ShuLakeIntro.art.village);
});
test('native reference static Canvas composite preserves every source pixel',async()=>{
  const {source,prepared}=await scene(),d=prepared.definition;
  assert.deepEqual(d.units,[1672,941]);assert.equal(d.source,d.underlay);assert.deepEqual(d.edits,[]);assert.deepEqual(d.patches,[]);
  assert.ok(d.parts.every(p=>!p.motion&&!p.offset&&!p.flipX));
  const expected=createCanvas(1672,941),actual=createCanvas(1672,941),overlay=createCanvas(1672,941);
  expected.getContext('2d').drawImage(source,0,0);
  Art.compose(actual,prepared,{staticOnly:true,excludeForeground:true});Art.motion(overlay,prepared,0);actual.getContext('2d').drawImage(overlay,0,0);Art.foreground(overlay,prepared);actual.getContext('2d').drawImage(overlay,0,0);
  assert.equal(hash(bytes(actual)),hash(bytes(expected)));
  assert.equal(hash(fs.readFileSync(path.join(root,d.source))),'2bdd42f26e3f1ed82bfedee17466af59816c7bc597ac1b5358ecd2a17669e0a6');
});
test('retraced source-space water masks exclude banks, bridge, shops and boats',async()=>{
  const {prepared:s}=await scene();const kind=(x,y)=>s.definition.parts[s.labels[y*s.width+x]-1]?.kind||'ground';
  for(const p of [[700,200],[735,373],[704,474],[704,605],[1100,850],[1500,508]])assert.equal(kind(...p),'water',String(p));
  for(const p of [[700,530],[954,420],[1311,529],[1507,149],[1048,609],[901,742],[1300,706],[1450,737],[1029,814],[1040,303],[1150,220]])assert.notEqual(kind(...p),'water',String(p));
  for(const p of s.parts.filter(p=>p.effect))for(const a of p.samples){assert.equal(kind(a.x,a.y),'water');assert.equal(kind(a.x+8,a.y),'water');}
});
test('season, night and rain use reference partitions without touching the source',async()=>{
  const {prepared:base}=await scene();
  for(const env of [{season:'autumn'},{season:'winter'},{period:'night'},{weather:'rain'}]){
    const {prepared:s}=await scene({...neutral,...env}),a=createCanvas(s.width,s.height),b=createCanvas(s.width,s.height);
    Art.compose(a,s);Art.compose(b,base);assert.notEqual(hash(bytes(a)),hash(bytes(b)));
    assert.deepEqual(s.labels,base.labels);assert.equal(s.definition.source,'assets/village-reference-pilot.png');
    if(env.weather==='rain')assert.ok(s.parts.filter(p=>p.kind==='water').some(p=>p.rainSamples.length));
  }
});
