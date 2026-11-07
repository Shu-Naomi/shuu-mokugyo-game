const {test}=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const {createCanvas,loadImage}=require('@napi-rs/canvas');
const Data=require('../scene-layers.js'),Rural=require('../rural-canals.js');
const {boot,seed,read,saveKey}=require('./game-harness.cjs');
const root=path.resolve(__dirname,'..');
const state=w=>read(w,'({money:s.money,hp:s.hp,baits:s.baits,caught:s.caught,equipment:s.equipment,questCompletions:s.questCompletions,gameMinutes:s.gameMinutes})');

test('the selected cohesive master and clean underlay remain the reviewed native artwork',async()=>{
 const expected={
  'assets/village-world-v252-55-riao-clear.png':'5354fce75c04ec39c9f2774025193212079bbdaefbcf1a59321ce527f7e8ee55',
  'assets/village-underlay-v252-55-riao.png':'4a22b1aad4bbf415252778387663b3a019f28fee8f7362accc5c30fc25132841'
 };
 const d=Data.get('world');assert.equal(d.source,Object.keys(expected)[0]);assert.equal(d.underlay,Object.keys(expected)[1]);
 for(const [file,hash]of Object.entries(expected)){
  assert.equal(crypto.createHash('sha256').update(fs.readFileSync(path.join(root,file))).digest('hex'),hash);
  const image=await loadImage(path.join(root,file));assert.deepEqual([image.width,image.height],[1672,941]);
 }
 assert.deepEqual(d.edits.map(edit=>edit.id),['sam-sfc-pilot']);assert.deepEqual(d.patches,[]);
 assert.ok(d.parts.every(p=>!p.motion),'fixed vegetation cannot reveal an obsolete shifted-tree patch');
 assert.ok(d.parts.some(p=>p.kind==='water'&&p.effect),'water remains alive');
 const html=fs.readFileSync(path.join(root,'index.html'),'utf8'),sw=fs.readFileSync(path.join(root,'sw.js'),'utf8');
 assert.match(html,/v252-55<\/span>/);assert.match(html,/sw\.js\?v=252-55/);assert.match(sw,/village-refresh-sam-pilot-252-55/);
 for(const file of ['scene-layers.js','layered-scenery.js','field-guide.js','rural-canals.js','mountain-region.js','lake-intro.js']){
  assert.ok(html.includes(file+'?v=252-55'));assert.ok(sw.includes(file+'?v=252-55'));
 }
 assert.ok(fs.readFileSync(path.join(root,'field-guide.js'),'utf8').includes(d.source),'guide uses the same village artwork');
 assert.equal(require('../lake-intro.js').art.village,d.source,'the opening village scene uses the same reviewed map');
});

test('home, mountain and rural approach centers are painted road, not invisible triggers in foliage',async()=>{
 const im=await loadImage(path.join(root,Data.get('world').source)),c=createCanvas(im.width,im.height),ctx=c.getContext('2d');ctx.drawImage(im,0,0);
 const roadPoints=[[4,79],[10,79],[120,8],[124,8],[120,4],[120,2],[214,32],[218,32],[222,32],[226,32],[232,32],[238,32],[123,76],[123,79]];
 const app=boot(),w=app.window;
 try{
  for(const [x,y]of roadPoints){
   assert.equal(w.isWalkableWorld(x,y),true,'walkable path center '+x+','+y);
   const rgba=ctx.getImageData(Math.round(x/240*im.width)-3,Math.round(y/135*im.height)-3,7,7).data;let earth=0;
   for(let i=0;i<rgba.length;i+=4)if(rgba[i]>100&&rgba[i]>rgba[i+1]*1.1&&rgba[i+1]>rgba[i+2]*1.3&&rgba[i+3]===255)earth++;
   assert.ok(earth/49>.8,'reviewed warm-earth route visibly covers '+x+','+y+' (ratio '+earth/49+')');
  }
  assert.deepEqual(app.errors,[]);
 }finally{app.dispose();}
});

test('all functioning building walls and entrance identities stay in their established locations',()=>{
 const app=boot(),w=app.window;
 try{
  const walls=read(w,'structureBounds.filter(b=>!["quest-board","west-shrine","riao-tcg-shop"].includes(b.id))');
  assert.deepEqual(walls,[
   {id:'farmhouse',left:28,right:55,top:12,bottom:31},{id:'watermill',left:187,right:210,top:13,bottom:31},
   {id:'wayside-shrine',left:8,right:17,top:50,bottom:61},
   {id:'yaoya',left:66,right:91,top:55,bottom:75},{id:'diner',left:130,right:158,top:55,bottom:75},
   {id:'main-shrine',left:178,right:211,top:36,bottom:64},{id:'sam-shop',left:182,right:211,top:70,bottom:92},
   {id:'fish-market',left:146,right:174,top:86,bottom:103},{id:'harbor-shop',left:126,right:145,top:104,bottom:121}
  ]);
  assert.deepEqual(read(w,'worldLandmarks.map(p=>p.id)'),['farmhouse','west-shrine','riao-tcg-shop','yaoya','quest-board','diner','main-shrine','watermill','fish-market','harbor-shop']);
  assert.equal(read(w,'worldLandmarks.find(p=>p.id==="west-shrine").message'),'ダンの魚レース場は準備中。今はまだレースに参加できません。');
  assert.equal(read(w,'worldLandmarks.find(p=>p.id==="watermill").petShop'),true);
  assert.equal(saveKey,'nushi-inugoya-v2');assert.deepEqual(app.errors,[]);
 }finally{app.dispose();}
});

test('accepted race-pool pixels are solid while the painted porches and kiosk apron stay dry and walkable',async()=>{
 const im=await loadImage(path.join(root,Data.get('world').source)),c=createCanvas(im.width,im.height),ctx=c.getContext('2d');ctx.drawImage(im,0,0);
 const rgba=ctx.getImageData(0,0,im.width,im.height).data,blue=(x,y)=>{const i=(y*im.width+x)*4;return rgba[i+2]>rgba[i]*1.17&&rgba[i+1]>rgba[i]*1.06&&rgba[i+2]>90;};
 const app=boot(),w=app.window;let checked=0;
 try{
  for(const [left,top,right,bottom]of [[176,383,233,438],[280,383,362,438]])for(let y=top;y<=bottom;y++)for(let x=left;x<=right;x++)if(blue(x,y)){
   checked++;assert.equal(w.isWalkableWorld((x+.5)/im.width*240,(y+.5)/im.height*135),false,'painted race water '+x+','+y);
  }
  assert.ok(checked>5000,'inspect the real pool pixels, not an empty fixture');
  for(const [x,y]of [[35,56],[35,60],[35,64],[35,68],[37,60],[37,68],[74,39.5],[74,43],[94,32],[94,43],[198,33],[218,32]]){
   assert.equal(w.isWalkableWorld(x,y),true,'visible dry front '+x+','+y);
   const px=Math.round(x/240*im.width),py=Math.round(y/135*im.height);
   for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++)assert.equal(blue(px+dx,py+dy),false,'walkway cannot cross painted water '+x+','+y);
  }
  assert.equal(Data.propSolid(452/1672*240,245/941*135),false,'replaced inn-side tree is not an invisible obstacle');
  assert.deepEqual(app.errors,[]);
 }finally{app.dispose();}
});

test('renewed board feet are solid and its unchanged front remains usable on the fourth movement grid',()=>{
 const app=boot({...seed(),x:123,y:83,direction:'up',soundEnabled:false}),w=app.window;
 try{
  w.Math.random=()=>.999999;const before=state(w);
  for(const [x,y]of [[834,524],[858,524]])assert.equal(w.isWalkableWorld(x/1672*240,y/941*135),false,'visible post foot');
  assert.equal(w.isWalkableWorldSegment(119,68,127,76),false,'cannot tunnel diagonally through board');
  w.move('up');assert.deepEqual(read(w,'[s.x,s.y]'),[123,79]);
  w.action();assert.ok(w.document.querySelector('#questBoard.open'),'four-unit grid reaches the south front');w.close();
  assert.deepEqual(state(w),before);assert.deepEqual(app.errors,[]);
 }finally{app.dispose();}
});

test('the existing rural transition and return now follow the painted lane through repeated travel and save reload',()=>{
 const app=boot({...seed(),mapRegion:'village',...Rural.villageReturn,soundEnabled:false}),w=app.window;let saved,before;
 try{
  w.Math.random=()=>.999999;before=state(w);
  assert.deepEqual(Rural.villageReturn,{x:214,y:32,direction:'left'});
  const guidePoint=Rural.guideEntries().find(p=>p.id==='village-rural').point;
  assert.deepEqual(guidePoint,{x:220,y:32});assert.equal(Rural.atVillageGate(guidePoint.x,guidePoint.y),true,'guide points into the working road gate');
  for(let i=0;i<3;i++){
   w.move('right');assert.deepEqual(read(w,'[s.x,s.y]'),[218,32]);assert.equal(Rural.atVillageGate(218,32),true);
   w.action();assert.equal(read(w,'s.mapRegion'),Rural.id);assert.deepEqual(read(w,'[s.x,s.y]'),[114,129]);
   w.action();assert.equal(read(w,'s.mapRegion'),'village');assert.deepEqual(read(w,'({x:s.x,y:s.y,direction:s.direction})'),Rural.villageReturn);
   assert.deepEqual(state(w),before);
  }
  w.save();saved=JSON.parse(w.localStorage.getItem(saveKey));assert.deepEqual(app.errors,[]);
 }finally{app.dispose();}
 const resumed=boot(saved);try{assert.deepEqual(state(resumed.window),before);assert.deepEqual(read(resumed.window,'[s.x,s.y]'),[214,32]);assert.deepEqual(resumed.errors,[]);}finally{resumed.dispose();}
});
