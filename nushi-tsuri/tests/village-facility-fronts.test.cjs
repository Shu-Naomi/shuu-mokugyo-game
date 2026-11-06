const {test}=require('node:test');
const assert=require('node:assert/strict');
const {boot,seed,read,saveKey}=require('./game-harness.cjs');

// Notice-only facilities may change the log, position and facing, not the
// save schema or any resources, progress, pet stock or activity state.
const progress=w=>read(w,'Object.fromEntries(Object.entries(s).filter(([key])=>!["x","y","direction","log"].includes(key)))');
const stand=(w,x,y,direction='up')=>w.eval(`s.x=${x};s.y=${y};s.direction=${JSON.stringify(direction)};render()`);
const fronts=[
 {id:'west-shrine',name:'ダンの魚レース場',x:35,y:60},
 {id:'riao-tcg-shop',name:'リアオの魚TCGショップ',x:74,y:39.5},
];

for(const mode of ['gauge','nushi'])test('race and TCG fronts show honest notices, not activities or purchases: '+mode,()=>{
 const app=boot({...seed(),fightMode:mode,soundEnabled:false}),w=app.window;let saved,expected;
 try{
  w.Math.random=()=>.999999;
  for(const front of fronts){
   stand(w,front.x,front.y);
   assert.equal(w.nearbyWorldLandmark().id,front.id);
   assert.match(w.document.querySelector('#hint').textContent,new RegExp(front.name+'.*準備中'));
   const before=progress(w),keys=read(w,'Object.keys(s)');
   assert.notEqual(w.currentSoundScene().music,'shrine','new venue does not inherit prayer ambience');
   for(let i=0;i<3;i++){
    w.action();
    assert.match(read(w,'s.log[0]'),new RegExp(front.name+'.*準備中'));
    assert.match(w.document.querySelector('#rescueToast').textContent,/今はまだ.*できません/);
    assert.equal(w.document.querySelector('.modal.open'),null,'no game, shop or interior opens');
    assert.equal(read(w,'battle'),null);
    assert.equal(read(w,'petUi.active'),false);
    assert.deepEqual(read(w,'Object.keys(s)'),keys,'no new save fields');
    assert.deepEqual(progress(w),before,'notices retain all resources and progress');
   }
   // Close/back does not reveal an interior, and reading again remains safe.
   w.close();w.action();assert.equal(w.document.querySelector('.modal.open'),null);
   assert.deepEqual(progress(w),before);
  }
  expected=progress(w);w.save();saved=JSON.parse(w.localStorage.getItem(saveKey));
  assert.equal(saveKey,'nushi-inugoya-v2');assert.deepEqual(app.errors,[]);
 }finally{app.dispose();}
 const resumed=boot(saved);try{
  assert.deepEqual(progress(resumed.window),expected);
  resumed.window.action();assert.match(read(resumed.window,'s.log[0]'),/リアオの魚TCGショップは準備中/);
  assert.deepEqual(progress(resumed.window),expected);assert.deepEqual(resumed.errors,[]);
 }finally{resumed.dispose();}
});

test('TCG-facing notice wins over nearby forage without disabling forage on the public road',()=>{
 const app=boot({...seed(),soundEnabled:false}),w=app.window;
 try{
  // Place a test-only sparkle on the clear apron to protect action priority
  // even if a later day's forage lands within range of the new door.
  w.eval(`const cycle=ensureForageCycle();cycle.active['grass-02']='wildGreens';cycle.harvested=cycle.harvested.filter(id=>id!=='grass-02');foragePointData.find(p=>p.id==='grass-02').walkablePosition={x:74,y:44};`);
  stand(w,74,39.5);assert.equal(w.nearbyForagePoint().point.id,'grass-02');
  const before=progress(w);w.action();assert.deepEqual(progress(w),before);
  assert.match(w.document.querySelector('#hint').textContent,/リアオ.*準備中/);
  stand(w,74,39.5,'down');assert.notEqual(w.nearbyWorldLandmark()?.id,'riao-tcg-shop');
  w.action();assert.equal(read(w,"s.forageCycle.active['grass-02'] || null"),null);
  assert.ok(read(w,'s.items.wildGreens')>(before.items.wildGreens||0),'nearby forage still works when not reading the front');
  assert.deepEqual(app.errors,[]);
 }finally{app.dispose();}
});

test('enlarged shop walls, tight retained props and the cleared inn connector match the measured art',()=>{
 const app=boot({...seed(),soundEnabled:false}),w=app.window;
 try{
  const front=read(w,'riaoShopFront');
  assert.deepEqual(front.walls,{left:55.5,right:89,top:14,bottom:38.5});
  assert.deepEqual(front.interaction,{left:71,right:77,top:38.6,bottom:43.5});
  assert.deepEqual(front.door,{x:74,y:39.5});
  assert.deepEqual(front.props,[[457,484,270,282],[543,568,270,282],[587,616,272,282],[619,645,282,292]].map(([left,right,top,bottom])=>({left:left/1672*240,right:right/1672*240,top:top/941*135,bottom:bottom/941*135})));
  for(const [x,y]of [[55.5,14],[89,14],[55.5,38.5],[89,38.5],[74,30],[66,38],[74,32],[35,52],[30,56],[43,56]])
   assert.equal(w.isWalkableWorld(x,y),false,'solid wall '+x+','+y);
  for(const b of front.props){
   assert.equal(w.isWalkableWorld((b.left+b.right)/2,(b.top+b.bottom)/2),false,'retained decoration foot is solid');
   assert.equal(w.isWalkableWorld((b.left+b.right)/2,b.bottom+.2),true,'no oversized foot skirt');
  }
  for(const [x,y]of [[89.1,30],[74,13.9],[74,38.6],[74,39.5],[35,56],[35,60]])
   assert.equal(w.isWalkableWorld(x,y),true,'open approach or wall edge '+x+','+y);
  for(const [px,py]of [[380,270],[410,280],[430,280]])
   assert.equal(w.isWalkableWorld(px/1672*240,py/941*135),true,'removed left cluster leaves no invisible obstacle');
  for(const [ax,ay,bx,by]of [[74,44,74,30],[54,30,90,30],[35,64,35,48]])
   assert.equal(w.isWalkableWorldSegment(ax,ay,bx,by),false,'cannot tunnel through a facility');
  for(const [ax,ay,bx,by]of [[43,40,63,40],[59,40,59,44],[59,44,92,44],[94,20,94,44],[35,68,35,56]])
   assert.equal(w.isWalkableWorldSegment(ax,ay,bx,by),true,'cleared inn connector, forecourt, lake-side path or Dan porch');
  for(const [x,y]of [[70.9,41],[77.1,41],[74,43.6],[74,13]])
   assert.notEqual(w.nearbyWorldLandmark(x,y,'up')?.id,'riao-tcg-shop','notice is restricted to its south front');
  for(const direction of ['left','right','down'])
   assert.notEqual(w.nearbyWorldLandmark(74,40,direction)?.id,'riao-tcg-shop','walking along the forecourt does not target shop');
  assert.deepEqual(read(w,'structureBounds.filter(b=>["west-shrine","wayside-shrine","watermill","main-shrine"].includes(b.id))'),[
   {id:'watermill',left:187,right:210,top:13,bottom:31},
   {id:'west-shrine',left:20.8,right:55.6,top:41,bottom:69.5},
   {id:'wayside-shrine',left:8,right:17,top:50,bottom:61},
   {id:'main-shrine',left:178,right:211,top:36,bottom:64},
  ]);
  assert.deepEqual(app.errors,[]);
 }finally{app.dispose();}
});

test('Dan pools and outer fences block feet while only the dry porch reads an up-facing notice',()=>{
 const app=boot({...seed(),soundEnabled:false}),w=app.window;
 try{
  assert.deepEqual(read(w,'danRaceFront'),{
   walls:{left:20.8,right:55.6,top:41,bottom:69.5},
   approaches:[{left:34.5,right:39.5,top:55,bottom:69.5},{left:31.5,right:42.2,top:64.5,bottom:69.5}],
   interaction:{left:31.5,right:42.2,top:55,bottom:69.5},
  });
  // Exercise the whole footprint independently of the runtime rectangles.
  // In particular, old shrine steps at x33 and x40 are now side-pool water.
  for(let x=21;x<=55.5;x+=.5)for(let y=41;y<=69.5;y+=.5){
   const dry=(x>=34.5&&x<=39.5&&y>=55)||(x>=31.5&&x<=42.2&&y>=64.5);
   assert.equal(w.isWalkableWorld(x,y),dry,'Dan water/fence/porch '+x+','+y);
  }
  for(const [x,y]of [[20.8,50],[55.6,50],[33,60],[40,60],[24,65],[50,65],[31.4,68],[42.3,68]]){
   assert.equal(w.isWalkableWorld(x,y),false);
   assert.notEqual(w.nearbyWorldLandmark(x,y,'up')?.id,'west-shrine');
  }
  for(const [x,y]of [[35,56],[38,60],[32,65],[42,68]]){
   assert.equal(w.nearbyWorldLandmark(x,y,'up')?.id,'west-shrine');
   for(const direction of ['left','right','down'])
    assert.notEqual(w.nearbyWorldLandmark(x,y,direction)?.id,'west-shrine');
  }
  for(const [x,y]of [[35,70],[30,68],[43,68]])
   assert.notEqual(w.nearbyWorldLandmark(x,y,'up')?.id,'west-shrine','old radius cannot reach outside the front');
  for(const [ax,ay,bx,by]of [[20,39,20,71],[56,39,56,71],[20,39,56,39],[20,71,56,71],[35,68,35,56],[32,68,42,68]])
   assert.equal(w.isWalkableWorldSegment(ax,ay,bx,by),true,'dry approach or outer bypass');
  for(const [ax,ay,bx,by]of [[33,68,33,60],[40,68,40,60],[20,65,35,65]])
   assert.equal(w.isWalkableWorldSegment(ax,ay,bx,by),false,'cannot cross a side pool or fence');
  w.Math.random=()=>.999999;stand(w,35,68);const before=progress(w);
  for(let i=0;i<3;i++)w.move('up');assert.deepEqual(read(w,'[s.x,s.y]'),[35,56]);
  w.action();assert.match(read(w,'s.log[0]'),/ダンの魚レース場は準備中/);
  for(let i=0;i<3;i++)w.move('down');assert.deepEqual(read(w,'[s.x,s.y]'),[35,68]);
  assert.deepEqual(progress(w),before);assert.deepEqual(app.errors,[]);
 }finally{app.dispose();}
});

test('every four-unit phase can approach, read and leave both notice fronts using real movement',()=>{
 const app=boot({...seed(),soundEnabled:false}),w=app.window;
 try{
  w.Math.random=()=>.999999;
  for(let ox=0;ox<4;ox++)for(let oy=0;oy<4;oy++){
   for(const [id,x,y]of [['west-shrine',35+ox,64+oy],['riao-tcg-shop',72+ox,43+oy]]){
    stand(w,x,y);const before=progress(w);
    w.move('up');assert.deepEqual(read(w,'[s.x,s.y]'),[x,y-4],id+' phase '+ox+','+oy);
    assert.equal(w.nearbyWorldLandmark().id,id);
    w.action();assert.match(read(w,'s.log[0]'),/準備中/);assert.equal(w.document.querySelector('.modal.open'),null);
    w.move('down');assert.deepEqual(read(w,'[s.x,s.y]'),[x,y]);assert.deepEqual(progress(w),before);
   }
  }
  assert.deepEqual(app.errors,[]);
 }finally{app.dispose();}
});

test('all existing facilities and new fronts remain reachable from public paths on all sixteen movement grids',()=>{
 const app=boot({...seed(),soundEnabled:false}),w=app.window;
 try{
  const failures=read(w,`(()=>{
   const failures=[];
   for(let ox=0;ox<4;ox++)for(let oy=0;oy<4;oy++){
    const queue=[[120+ox,92+oy]],visited=new Set(),reached=new Set();
    for(let i=0;i<queue.length;i++){
     const [x,y]=queue[i],key=x+','+y;if(visited.has(key))continue;visited.add(key);
     for(const direction of ['up','down','left','right']){
      const landmark=nearbyWorldLandmark(x,y,direction);if(landmark)reached.add(landmark.id);
     }
     if(isAtSamShopEntrance(x,y))reached.add('sam-shop');
     if(isNearPracticePond(x,y))reached.add('practice-pond');
     if(inWorldRect(x,y,PLAYER_HOME_MAP_ENTRY))reached.add('home');
     if(x>=149&&x<=157&&y>=120&&y<=127)reached.add('lower-pier');
     if(x>=224&&x<=232&&y>=106&&y<=113)reached.add('east-pier');
     for(const [dx,dy]of [[4,0],[-4,0],[0,4],[0,-4]])
      if(!visited.has((x+dx)+','+(y+dy))&&isWalkableWorldSegment(x,y,x+dx,y+dy))queue.push([x+dx,y+dy]);
    }
    const targets=worldLandmarks.map(p=>p.id).concat(['sam-shop','practice-pond','home','lower-pier','east-pier']);
    const missing=targets.filter(id=>!reached.has(id));if(missing.length)failures.push({ox,oy,missing});
   }
   return failures;
  })()`);
  assert.deepEqual(failures,[]);assert.deepEqual(app.errors,[]);
 }finally{app.dispose();}
});

for(const facility of [
 {name:'former small Riao front',saved:[66,38],points:[[61,26],[65.5,30],[71,35],[65,34.9]]},
 {name:'newly covered inn-side road',saved:[74,32],points:[[58,32],[74,32],[83,35],[68,18]]},
 {name:'Dan pools and fences',saved:[33,60],points:[[20.8,41],[24,65],[33,60],[40,60],[50,65],[55.6,69.5]]},
])for(const mode of ['gauge','nushi'])test('legacy saves inside '+facility.name+' recover onto walkable ground with progress intact: '+mode,()=>{
 const baseline=boot({...seed(),fightMode:mode,soundEnabled:false});let saved,expected;
 try{
  const w=baseline.window;expected=progress(w);w.save();saved=JSON.parse(w.localStorage.getItem(saveKey));
  for(const [x,y]of facility.points){
   const p=w.nearestWalkableWorld(x,y);assert.equal(w.isWalkableWorld(p.x,p.y),true);
   assert.ok(Math.hypot(p.x-x,p.y-y)<12,'recovery remains local');
   assert.ok([[1,0],[-1,0],[0,1],[0,-1]].filter(([dx,dy])=>w.isWalkableWorldSegment(p.x,p.y,p.x+dx,p.y+dy)).length>=2);
  }
  assert.deepEqual(baseline.errors,[]);
 }finally{baseline.dispose();}
 const app=boot({...saved,x:facility.saved[0],y:facility.saved[1]}),w=app.window;let recovered;
 try{
  assert.equal(w.isWalkableWorld(read(w,'s.x'),read(w,'s.y')),true);
  assert.notDeepEqual(read(w,'[s.x,s.y]'),facility.saved);assert.deepEqual(progress(w),expected);
  recovered=read(w,'[s.x,s.y]');w.save();saved=JSON.parse(w.localStorage.getItem(saveKey));
  assert.deepEqual(app.errors,[]);
 }finally{app.dispose();}
 const resumed=boot(saved);try{
  assert.deepEqual(read(resumed.window,'[s.x,s.y]'),recovered);assert.deepEqual(progress(resumed.window),expected);
  assert.deepEqual(resumed.errors,[]);
 }finally{resumed.dispose();}
});

test('Asuar retains his pet-shop door and the right shrine retains offerings, fortune and shrine music',()=>{
 const app=boot({...seed(),items:{starGrapes:2},soundEnabled:false}),w=app.window;
 try{
  assert.deepEqual(read(w,'worldLandmarks.find(p=>p.id==="watermill").interaction'),{left:191,right:204,top:31.2,bottom:37.5});
  for(let i=0;i<2;i++){
   stand(w,198,33);const before=progress(w);w.action();
   assert.ok(w.document.querySelector('#petLifeModal.open'));assert.equal(read(w,'petUi.mode'),'shop');
   assert.match(w.document.querySelector('#petLifeModal').textContent,/アスアル/);
   assert.deepEqual(progress(w),before);w.close();assert.equal(w.document.querySelector('.modal.open'),null);
  }
  stand(w,193,66);w.action();assert.ok(w.document.querySelector('#locationInterior.open'));
  assert.equal(read(w,'activeLocationId'),'main-shrine');assert.equal(w.currentSoundScene().music,'shrine');
  assert.ok(w.document.querySelector('[data-draw-fortune="starGrapes"]'));
  const before=read(w,'s.items.starGrapes');w.Math.random=()=>.125;
  assert.equal(w.drawStarFortune('starGrapes'),true);assert.equal(read(w,'s.items.starGrapes'),before-1);
  assert.equal(w.drawStarFortune('starGrapes'),false,'fortune reveal still prevents duplicate actions');
  w.hideStarFortuneReveal();w.close();assert.equal(w.document.querySelector('.modal.open'),null);
  assert.deepEqual(app.errors,[]);
 }finally{app.dispose();}
});

test('the final lake paint is contained by collision, including the southwest reed pocket',async()=>{
 const {createCanvas,loadImage}=require('@napi-rs/canvas'),path=require('node:path');
 const definition=require('../scene-layers.js').get('world');
 const im=await loadImage(path.join(__dirname,'..',definition.source)),canvas=createCanvas(im.width,im.height),ctx=canvas.getContext('2d');ctx.drawImage(im,0,0);
 assert.deepEqual([im.width,im.height],[1672,941]);
 const pixels=ctx.getImageData(0,0,im.width,im.height).data;
 const blue=(x,y)=>{const i=(y*im.width+x)*4;return pixels[i+2]>pixels[i]+20&&pixels[i+1]>pixels[i]+15;};
 // Trace actual connected lake water rather than blue flowers/card artwork.
 // Separate reed pockets are covered by explicit inspected samples below.
 const queue=[[850,230]],seen=new Set(['850,230']);
 for(let i=0;i<queue.length;i++){
  const [x,y]=queue[i];for(const [dx,dy]of [[1,0],[-1,0],[0,1],[0,-1],[1,1],[1,-1],[-1,1],[-1,-1]]){
   const a=x+dx,b=y+dy,k=a+','+b;
   if(a>=660&&a<1070&&b>=100&&b<=350&&!seen.has(k)&&blue(a,b)){seen.add(k);queue.push([a,b]);}
  }
 }
 assert.ok(queue.length>50000,'substantial connected lake water, not a vacuous color sample');
 const app=boot({...seed(),soundEnabled:false}),w=app.window;
 try{
  const polygon=read(w,'lakeWaterPolygon');
  for(const [px,py]of queue){
   const x=(px+.5)/1672*240,y=(py+.5)/941*135;
   assert.equal(w.pointInPolygon(x,y,polygon),true,'painted lake water lies inside shoreline '+px+','+py);
   if(!w.isOnLakeDock(x,y))assert.equal(w.isWalkableWorld(x,y),false,'cannot walk on painted lake water '+px+','+py);
  }
  for(const [px,py]of [[705,310],[708,315],[710,319]])assert.equal(w.isWalkableWorld(px/1672*240,py/941*135),false,'southwest reed pocket');
  assert.equal(w.isOnLakeDock(110,15),true);assert.equal(w.isWalkableWorld(110,15),true,'existing dock remains usable');
  assert.deepEqual(app.errors,[]);
 }finally{app.dispose();}
});

test('enlarged shop stops phantom casts while the newly aligned western lake bank still fishes',()=>{
 const app=boot({...seed(),soundEnabled:false}),w=app.window;
 try{
  for(const [x,y]of [[74,39.5],[74,44],[90,30],[94,35]])assert.equal(w.waterZoneAtWorld(x,y),null,'painted dry shop/forecourt/bank');
  for(const [x,y,d]of [[53,30,'right'],[90,30,'left'],[74,40,'up'],[74,40,'right'],[74,44,'down'],[78,30,'right']])
   assert.equal(w.fishingWaterNearPlayer(x,y,d),null,'no casting through the store or onto its old lake footprint');
  for(const [x,y,d]of [[96,24,'right'],[100,35,'right'],[96,42,'right'],[110,15,'down']]){
   assert.equal(w.isWalkableWorld(x,y),true,'reachable real bank or dock');
   assert.equal(w.fishingWaterNearPlayer(x,y,d)?.zone,'lake','existing fishing flow recognizes the real lake');
  }
  assert.deepEqual(app.errors,[]);
 }finally{app.dispose();}
});

test('the moved NPC lane, local forage recovery and direct inn connector preserve resources and remain dry',async()=>{
 const {createCanvas,loadImage}=require('@napi-rs/canvas'),path=require('node:path');
 const app=boot({...seed(),x:43,y:35,direction:'right',soundEnabled:false}),w=app.window;
 try{
  const npc=w.ShuWorldLife.residents.find(p=>p.id==='village-fisher');
  assert.deepEqual(JSON.parse(JSON.stringify(npc.route)),[[74,44],[89,44]]);
  for(let time=0;time<40000;time+=100){const p=w.ShuWorldLife.residentPose(npc,time);assert.equal(w.isWalkableWorld(p.x,p.y),true,'NPC feet remain on dry forecourt');}
  const im=await loadImage(path.join(__dirname,'..',require('../scene-layers.js').get('world').source)),canvas=createCanvas(im.width,im.height),ctx=canvas.getContext('2d');ctx.drawImage(im,0,0);
  for(let x=74;x<=89;x++){
   const [r,g,b]=ctx.getImageData(Math.round(x/240*im.width),Math.round(44/135*im.height),1,1).data;
   assert.ok(r>100&&r>g*1.1&&g>b*1.3,'NPC lane is painted earth at '+x+',44');
  }
  for(const id of ['forest-02','grass-02']){
   const point=read(w,`foragePointData.find(p=>p.id==='${id}')`),at=w.foragePointPosition(id);
   assert.equal(w.isWalkableWorld(at.x,at.y),true,id+' remains collectible on land');
   assert.ok(Math.hypot(at.x-point.x,at.y-point.y)<=10,id+' recovers locally with its original identity');
  }
  assert.deepEqual(read(w,"({x:foragePointData.find(p=>p.id==='forest-02').x,y:foragePointData.find(p=>p.id==='forest-02').y})"),{x:68,y:18});
  w.Math.random=()=>.999999;const before=progress(w);
  const route=['down','down','right','right','right','right','down','right','right','right','up'];
  const expected=[[43,39],[43,40],[47,40],[51,40],[55,40],[59,40],[59,44],[63,44],[67,44],[71,44],[71,40]];
  for(const [i,d]of route.entries()){w.move(d);assert.deepEqual(read(w,'[s.x,s.y]'),expected[i],'normal button-step handler follows cleared inn connector');}
  assert.equal(w.nearbyWorldLandmark()?.id,'riao-tcg-shop');w.action();assert.match(read(w,'s.log[0]'),/リアオの魚TCGショップは準備中/);
  assert.deepEqual(progress(w),before);assert.deepEqual(app.errors,[]);
 }finally{app.dispose();}
});
