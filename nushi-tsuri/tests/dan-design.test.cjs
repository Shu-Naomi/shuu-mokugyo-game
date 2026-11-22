const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),{execFileSync}=require('node:child_process'),{createCanvas,loadImage}=require('@napi-rs/canvas');
const root=path.resolve(__dirname,'..'),Data=require('../scene-layers.js'),Art=require('../layered-scenery.js');
test('Dan sign stays inside the existing building and never replaces village artwork or geometry',()=>{
 const html=fs.readFileSync(path.join(root,'index.html'),'utf8'),tag=html.match(/<img id="danRaceSign"[^>]+>/)[0];
 assert.match(tag,/pointer-events:none/);assert.match(tag,/aria-hidden="true"/);
 const n=k=>parseFloat(tag.match(new RegExp(k+':([0-9.]+)%'))[1]);
 const rect={x:n('left')*1672/100,y:n('top')*941/100,w:n('width')*1672/100,h:n('height')*941/100};
 assert.ok(Math.abs(rect.x-199)<.01&&Math.abs(rect.y-295)<.01&&Math.abs(rect.w-90)<.01&&Math.abs(rect.h-30)<.01);
 assert.deepEqual(Data.get('world',{referenceVillage:true}).edits,[]);
 for(const name of ['assets/village-shop-signs-v252-73.png','scene-layers.js'])assert.deepEqual(fs.readFileSync(path.join(root,name)),execFileSync('git',['show','12df756:nushi-tsuri/'+name],{maxBuffer:10000000}));
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
