const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),{createHash}=require('node:crypto');
const root=path.resolve(__dirname,'..'),Data=require('../scene-layers.js');
const digest=bytes=>createHash('sha256').update(bytes).digest('hex');
// Exact bytes from released main 12df756; no history fetch is needed in shallow CI.
const baseline={
  'assets/village-shop-signs-v252-73.png': '254a6ea78adbef4f3936c980e797f368cbabf6c7ea5342e5a40cb870e9117a87',
  'scene-layers.js': '450818cb8d15fe23556392bd537838a8a6a18e478bf4461126a94b05de2fa872',
  'village-reference.js': '8f18051cf09d6c16fccc18aa5c78d09e28ec20d5582e34c304c066669f5fa34d',
  'pet-life.js': '02d01cd4d5ecd81441f267d7297120494dd6cad2fed8d5ae5158f02da2a53180',
};
test('Dan sign stays inside the existing building and never replaces village artwork or geometry',()=>{
 const html=fs.readFileSync(path.join(root,'index.html'),'utf8'),tag=html.match(/<img id="danRaceSign"[^>]+>/)[0];
 assert.match(tag,/pointer-events:none/);assert.match(tag,/aria-hidden="true"/);
 const n=k=>parseFloat(tag.match(new RegExp(k+':([0-9.]+)%'))[1]);
 const rect={x:n('left')*1672/100,y:n('top')*941/100,w:n('width')*1672/100,h:n('height')*941/100};
 assert.ok(Math.abs(rect.x-194)<.01&&Math.abs(rect.y-293)<.01&&Math.abs(rect.w-100)<.01&&Math.abs(rect.h-34)<.01);
 assert.deepEqual(Data.get('world',{referenceVillage:true}).edits,[]);
 for(const name of ['assets/village-shop-signs-v252-73.png','scene-layers.js'])assert.equal(digest(fs.readFileSync(path.join(root,name))),baseline[name],name);
});
test('race simulation, village collision, saves and rewards are byte-identical to released baseline',()=>{
 for(const name of ['village-reference.js','pet-life.js'])assert.equal(digest(fs.readFileSync(path.join(root,name))),baseline[name],name);
 const after=fs.readFileSync(path.join(root,'village-fish-race.js'),'utf8');
 assert.equal(digest(after.split('  function open(')[0]),'0d206f1fb6617d994d94d1aeb11ad2521943958980269ff7a3e9c1ca9a0ffa50');
 assert.equal(digest(after.slice(after.indexOf('    function finishCommentary('))),'1026470226459863743dc9f7cc64faf0fa1aed84ea96235103602d62c99ebd4b');
});
