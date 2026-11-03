const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const Intro=require('../lake-intro.js'),root=path.resolve(__dirname,'..'),sw=fs.readFileSync(path.join(root,'sw.js'),'utf8');
test('all protagonist and companion paintings are shipped and precached with the storybook renderer',()=>{
 const sources=new Set();for(const avatar of ['boy','girl'])for(const dog of ['shuu','riku','grey'])for(const page of Intro.pages){
  const panel=Intro.panelFor(page,{avatar,dog}),source=Intro.sourceFor(panel);sources.add(source);
  assert.ok(fs.existsSync(path.join(root,source)),`missing painting ${source}`);
  if(source.includes('opening-storybook-'))assert.ok(sw.includes(`"./${source}"`),`offline cache missing ${source}`);
 }
 for(const source of [Intro.art.diaryTurn,Intro.art.diarySettled]){assert.ok(fs.existsSync(path.join(root,source)));assert.ok(sw.includes(`"./${source}"`));}
 assert.ok(sw.includes(`"./${Intro.art.diaryTurn}"`));
 assert.equal([...sources].filter(s=>s.includes('opening-storybook-')).length,15);
 assert.ok(sw.includes('lake-intro.js?v=252-storybook-1'));
 assert.ok(sw.includes('lake-intro.css?v=252-storybook-1'));
});
test('the first peek, threshold and reunion use different paintings with stable avatar and favorite identity',()=>{
 for(const avatar of ['boy','girl'])for(const dog of ['shuu','riku','grey']){
  assert.equal(Intro.panelFor('retort',{avatar,dog}),avatar+'-nose');
  assert.equal(Intro.panelFor('puppies',{avatar,dog}),avatar+'-threshold');
  for(const page of ['cling','care','decision','welcome'])assert.equal(Intro.panelFor(page,{avatar,dog}),avatar+'-cling-'+dog);
 }
});
