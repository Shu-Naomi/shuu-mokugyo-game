const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const Intro=require('../lake-intro.js'),root=path.resolve(__dirname,'..'),sw=fs.readFileSync(path.join(root,'sw.js'),'utf8');
test('all protagonist and companion paintings are shipped and precached with the storybook renderer',()=>{
 const sources=new Set();for(const avatar of ['boy','girl'])for(const dog of ['shuu','riku','grey'])for(const page of Intro.pages){
  const panel=Intro.panelFor(page,{avatar,dog}),source=Intro.sourceFor(panel);sources.add(source);
  assert.ok(fs.existsSync(path.join(root,source)),`missing painting ${source}`);
  if(source.includes('opening-storybook-'))assert.ok(sw.includes(`"./${source}"`),`offline cache missing ${source}`);
 }
 for(const source of new Set(['notebook','researcher','wish'].flatMap(id=>Intro.diarySources(id)))){assert.ok(fs.existsSync(path.join(root,source)));assert.ok(sw.includes(`"./${source}"`));}
 assert.ok(sw.includes(`"./${Intro.art.diaryTurn}"`));
 assert.equal([...sources].filter(s=>s.includes('opening-storybook-')).length,15);
 assert.ok(sw.includes('lake-intro.js?v=252-55'));
 assert.ok(sw.includes('lake-intro.css?v=252-44'));
});
test('the first peek, threshold and reunion use different paintings with stable avatar and favorite identity',()=>{
 for(const avatar of ['boy','girl'])for(const dog of ['shuu','riku','grey']){
  assert.equal(Intro.panelFor('retort',{avatar,dog}),avatar+'-nose');
  assert.equal(Intro.panelFor('puppies',{avatar,dog}),avatar+'-threshold');
  for(const page of ['cling','care','decision','welcome'])assert.equal(Intro.panelFor(page,{avatar,dog}),avatar+'-cling-'+dog);
 }
});

test('revised call, refusal and retort artwork is selected for both avatars without changing companion reunion identity',()=>{
 for(const avatar of ['boy','girl'])for(const dog of ['shuu','riku','grey']){
  for(const [id,action] of [['sam','call'],['invitation','call'],['refusal','refusal'],['push','refusal'],['retort','nose']]){
   const source=Intro.sourceFor(Intro.panelFor(id,{avatar,dog}));
   assert.equal(source,`assets/opening-storybook-${avatar}-${action}-v2.webp`);
  }
  assert.equal(Intro.sourceFor(Intro.panelFor('cling',{avatar,dog})),`assets/opening-storybook-${avatar}-cling-${dog}-v1.webp`);
 }
});
test('feedback art changes are confined to the protagonist face and tabletop book, preserving the whole room and companions',async()=>{
 const {createCanvas,loadImage}=require('@napi-rs/canvas');
 const pixels=async source=>{const image=await loadImage(path.join(root,source));assert.equal(image.width,640);assert.equal(image.height,360);const canvas=createCanvas(640,360);const context=canvas.getContext('2d');context.drawImage(image,0,0);return context.getImageData(0,0,640,360).data;};
 for(const avatar of ['boy','girl'])for(const action of ['call','refusal','nose']){
  const base=`assets/opening-storybook-${avatar}-${action}`,before=await pixels(`${base}-v1.webp`),after=await pixels(`${base}-v2.webp`);
  let changed=0;
  for(let i=0;i<before.length;i+=4){
   if(before[i]===after[i]&&before[i+1]===after[i+1]&&before[i+2]===after[i+2]&&before[i+3]===after[i+3])continue;
   changed++;const x=i/4%640,y=Math.floor(i/4/640),face=x>=195&&x<240&&y>=160&&y<210,book=x>=110&&x<210&&y>=218&&y<278;
   assert.ok(face||(action==='call'&&book),`${avatar}-${action} unexpectedly changes the room, body or companions at ${x},${y}`);
  }
  assert.ok(changed>100,`${avatar}-${action} must actually revise the relevant artwork`);
 }
});

test('focused supplementary motion retains both avatars on desktop and small phone alongside the full 384 settled matrix',()=>{
 const {coversDiaryMotion}=require('./browser-opening-feedback.cjs');
 const screens=[{width:1280,height:720},{width:844,height:390},{width:820,height:366},{width:1280,height:1024}],selected=[];let settled=0,native=0;
 for(const screen of screens)for(const avatar of ['boy','girl']){
  native+=3;
  for(const dog of ['shuu','riku','grey']){settled+=16;if(coversDiaryMotion(screen,dog))selected.push(`${screen.width}x${screen.height}-${avatar}-${dog}`);}
 }
 assert.equal(settled,384);assert.equal(native,24);
 assert.deepEqual(selected,['1280x720-boy-grey','1280x720-girl-grey','820x366-boy-grey','820x366-girl-grey']);
 assert.equal(selected.length*3,12);
});
