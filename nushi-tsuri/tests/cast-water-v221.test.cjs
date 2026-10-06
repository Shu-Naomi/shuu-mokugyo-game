const {test}=require('node:test'),assert=require('node:assert/strict'),path=require('node:path'),crypto=require('node:crypto');
const {createCanvas,loadImage}=require('@napi-rs/canvas'),Art=require('../layered-scenery.js'),Data=require('../scene-layers.js');
const kinds=['lake','river','beach','harbor','pond','coast-sand','coast-reef','mountain-stream','mountain-pond','mountain-marsh','mountain-highPond','mountain-highMarsh','mountain-underground'];
const rgba=c=>c.getContext('2d').getImageData(0,0,c.width,c.height).data;
const hash=c=>crypto.createHash('sha256').update(rgba(c)).digest('hex');
async function prepare(kind,period='day',weather='sunny'){
 const env={season:'summer',period,weather},d=Data.get('surface-'+kind,env),source=await loadImage(path.join(__dirname,'..',d.source));
 return Art.prepare(source,null,d,env,createCanvas);
}

test('all thirteen casting landscapes animate real water with pixel crests, while every bank, pier and rock stays intact',async()=>{
 for(const kind of kinds){
  const scene=await prepare(kind),base=createCanvas(scene.width,scene.height),overlay=createCanvas(scene.width,scene.height);
  Art.compose(base,scene);const staticHash=hash(base),signatures=new Set();
  const parts=scene.parts.filter(p=>p.waves);assert.ok(parts.length,'animated water '+kind);assert.ok(parts.reduce((n,p)=>n+p.waves.count,0)>5,kind+' has visible waves');assert.ok(parts.every(p=>p.waves.count<=200),'bounded draw count');
  const owners=new Set(parts.map(part=>scene.definition.parts.findIndex(p=>p.id===part.id)+1));
  for(const time of [180,420,900,1650]){
   Art.motion(overlay,scene,time);signatures.add(hash(overlay));const bytes=rgba(overlay);let visible=0;
   for(let n=0;n<scene.width*scene.height;n++)if(bytes[n*4+3]){visible++;assert.ok(owners.has(scene.labels[n]),kind+' moving pixels remain wholly in water');}
   assert.ok(visible>100,kind+' actual moving raster');
  }
  assert.ok(signatures.size>=3,kind+' visibly different wave phases');assert.equal(hash(base),staticHash,'painted landscape is preserved');
  Art.motion(overlay,scene,900,{reducedMotion:true});assert.ok(rgba(overlay).every(x=>x===0),'reduced motion has no moving overlay');
 }
});

test('river current, sea crests and quiet pond/marsh/cave water keep different cadence, and weather changes do not produce sunlight underground',async()=>{
 const styles={};
 for(const kind of ['lake','river','beach','mountain-marsh','mountain-underground']){
  const scene=await prepare(kind);const wave=scene.parts.find(p=>p.waves).waves;styles[wave.style]=wave.interval;
 }
 assert.ok(styles.river<styles.sea&&styles.sea<styles.lake&&styles.lake<styles.marsh);assert.equal(styles.cave,styles.marsh);
 for(const kind of ['lake','mountain-underground'])for(const period of ['morning','evening','night'])for(const weather of ['sunny','cloudy','rain']){
  const scene=await prepare(kind,period,weather);assert.ok(scene.parts.filter(p=>p.waves).reduce((n,p)=>n+p.waves.count,0)>5,kind+'/'+period+'/'+weather);
  if(kind==='mountain-underground')assert.equal(scene.definition.indoor,true);
  const c=createCanvas(scene.width,scene.height);Art.motion(c,scene,670);assert.ok(rgba(c).some((a,i)=>i%4===3&&a>0));
 }
});
