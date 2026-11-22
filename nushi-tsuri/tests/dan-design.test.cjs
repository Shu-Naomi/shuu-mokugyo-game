const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),{execFileSync}=require('node:child_process'),{createCanvas,loadImage}=require('@napi-rs/canvas');
const root=path.resolve(__dirname,'..'),Data=require('../scene-layers.js'),Art=require('../layered-scenery.js');
test('Dan sign composition changes only the reviewed facade rectangle and preserves original village bytes',async()=>{
 const original=await loadImage(path.join(root,'assets/village-shop-signs-v252-73.png'));
 const def=Data.get('world',{referenceVillage:true}),imgs=await Promise.all(def.edits.map(e=>loadImage(path.join(root,e.source))));
 const c=Art.assembleSource(original,def,imgs,createCanvas),before=createCanvas(1672,941);before.getContext('2d').drawImage(original,0,0);
 const a=c.getContext('2d').getImageData(0,0,1672,941).data,b=before.getContext('2d').getImageData(0,0,1672,941).data;let changed=0;
 for(let y=0;y<941;y++)for(let x=0;x<1672;x++){const i=(y*1672+x)*4;if(a[i]!==b[i]||a[i+1]!==b[i+1]||a[i+2]!==b[i+2]||a[i+3]!==b[i+3]){assert.ok(x>=199&&x<289&&y>=295&&y<325);changed++;}}
 assert.ok(changed>1000);assert.deepEqual(fs.readFileSync(path.join(root,'assets/village-shop-signs-v252-73.png')),execFileSync('git',['show','12df756:nushi-tsuri/assets/village-shop-signs-v252-73.png'],{maxBuffer:10000000}));
});
test('race simulation, village collision, saves and rewards are byte-identical to released baseline',()=>{
 for(const file of ['village-reference.js','pet-life.js','village-fish-records.js']){
  if(!fs.existsSync(path.join(root,file)))continue;
  assert.equal(fs.readFileSync(path.join(root,file),'utf8'),execFileSync('git',['show','12df756:nushi-tsuri/'+file],{encoding:'utf8'}));
 }
 const before=execFileSync('git',['show','12df756:nushi-tsuri/village-fish-race.js'],{encoding:'utf8'}),after=fs.readFileSync(path.join(root,'village-fish-race.js'),'utf8');
 assert.equal(after.split('  function open(')[0],before.split('  function open(')[0]);
 assert.equal(after.slice(after.indexOf('    function finishCommentary(')),before.slice(before.indexOf('    function finishCommentary(')));
});
