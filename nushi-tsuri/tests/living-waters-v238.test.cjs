const {test}=require('node:test'),assert=require('node:assert/strict'),path=require('node:path'),fs=require('node:fs');
const {createCanvas,loadImage}=require('@napi-rs/canvas'),{boot,seed,read,saveKey}=require('./game-harness.cjs'),{findRoute}=require('./water-routes-v220.cjs'),{routeTo}=require('./wetland-v227.cjs');
const M=require('../mountain-region.js'),L=require('../world-life.js'),F=require('../fish-additions.js'),A=require('../fish-art.js'),Scenery=require('../layered-scenery.js'),Cast=require('../pixel-cast.js');
const {fishCases,pondLoop}=require('./living-waters-v238.cjs'),root=path.resolve(__dirname,'..');
const progress=w=>read(w,'({money:s.money,hp:s.hp,baits:s.baits,caught:s.caught,time:s.gameMinutes,equipment:s.equipment})');
function touch(w,d){const b=w.document.querySelector('[data-move="'+d+'"]');b.onpointerdown({preventDefault(){},currentTarget:b,pointerId:1});b.onpointerup();}
function walk(w,region,goal){for(const d of routeTo(w,region,goal))touch(w,d);assert.equal(read(w,'s.mapRegion'),region);assert.ok(goal(read(w,'s.x'),read(w,'s.y')));}
test('six ordinary additions have normal tackle odds, one bait per cast, art, records, dex, tanks and restored saves',()=>{
 for(const [i,[id,region,type,bait,hook,distance]]of fishCases.entries()){
  const app=boot({...seed(),hp:100,gameMinutes:600,soundEnabled:false,mapRegion:region,...(region==='village'?{x:123,y:92}:M.regions[region].entry),ownedRods:['bamboo','starGazer'],selectedRod:'starGazer',selectedBait:bait,selectedHook:hook,fightMode:i%2?'gauge':'nushi',baits:{worm:20,river:20,paste:20,shrimp:20}}),w=app.window;let saved;
  try{
   w.eval('ensureForageCycle().active={};Math.random=()=>.999999');for(const d of findRoute(w,type).path)w.move(d);
   w.document.querySelector('#action').click();assert.equal(read(w,'battle.phase'),'prep',id);const spot=(type==='sea'?'sea':'mountain-'+type)+'-'+(distance<34?'shallow':'mid');
   w.eval('beginFishing();clearInterval(timer)');let roll=-1;for(let n=0;n<1000;n++){w.eval('Math.random=()=>'+n/1000);if(read(w,'pick('+distance+',"'+spot+'").id')===id){roll=n/1000;break;}}
   assert.ok(roll>=0,id+' natural odds');const fillet=read(w,'s.cookingIngredients.fishFillet');
   w.eval('Math.random=()=>'+roll+';commitCastResources();resolveSurfaceCast('+distance+');clearInterval(timer);startFight();clearInterval(timer);finishHookReveal();renderBattleFish()');
   assert.equal(read(w,'battle.f.id'),id);assert.equal(read(w,'battle.spot'),spot);assert.equal(read(w,'s.baits.'+bait),19);assert.equal(w.document.querySelector('#battleFish canvas').dataset.artSpecies,id);
   w.eval('caught();caught()');assert.equal(read(w,'s.caught.'+id),1);assert.equal(read(w,'s.cookingIngredients.fishFillet'),fillet+1);assert.equal(read(w,'s.fishCatchRecords.'+id+'.last.spotId'),spot);assert.equal(read(w,'fish.length'),45);
   assert.equal(read(w,"petCatalog.find(f=>f.id==='"+id+"').waterLabel"),['mahaze','sayori','masaba'].includes(id)?'海水':'淡水');assert.equal(read(w,'fishEncyclopediaData.'+id+'.number'),40+i);assert.equal(read(w,'fishSizeProfiles.'+id+'.length'),6);
   w.eval("hideCatchCard();drawAquariumSprite($('#homeAquariumFish'),'"+id+"',4,{spriteMode:'turn',yaw:Math.PI/2,turnFrame:2});save()");assert.equal(w.document.querySelector('#homeAquariumFish canvas').dataset.artSpecies,id);
   saved=JSON.parse(w.localStorage.getItem(saveKey));assert.deepEqual(app.errors,[]);
  }finally{app.dispose();}
  const restored=boot(saved);try{assert.equal(read(restored.window,'s.caught.'+id),1);assert.deepEqual(restored.errors,[]);}finally{restored.dispose();}
 }
});
test('six source atlases retain visible, unclipped fish and stable bodies across 97 yaw samples',async()=>{
 for(const [id]of fishCases){const image=await loadImage(path.join(root,A.species[id].asset)),ctx=createCanvas(448,224).getContext('2d');let previous,side;
  for(let n=0;n<=96;n++){A.draw(ctx,image,id,7,n/16,()=>image);const p=ctx.getImageData(0,0,448,224).data;let left=448,right=0,count=0,edges=0;
   for(let i=0;i<448*224;i++)if(p[i*4+3]>100){const x=i%448,y=Math.floor(i/448);left=Math.min(left,x);right=Math.max(right,x);count++;if(x<2||x>445||y<2||y>221)edges++;}
   if(!n)side=count;assert.ok(count>Math.max(1200,side*.15),id+' visible '+n);assert.equal(edges,0,id+' edge '+n);
   const shape={width:right-left+1,center:(left+right)/2};if(previous){assert.ok(Math.abs(shape.width-previous.width)<=20,id+' width '+n);assert.ok(Math.abs(shape.center-previous.center)<=10,id+' center '+n);}previous=shape;
  }
 }
});
test('touch walks the entire painted pond ring and enters all six houses or shops while preserving resources',()=>{
 const app=boot({...seed(),mapRegion:'mountainPond',...M.regions.mountainPond.entry,hp:100,soundEnabled:false}),w=app.window;
 try{const before=progress(w);for(const [x,y]of pondLoop)walk(w,'mountainPond',(px,py)=>Math.hypot(px-x,py-y)<=1.5);
  for(const region of ['mountainPond','stream','mountainMarsh','wetland']){
   w.eval("Object.assign(s,{mapRegion:'"+region+"',...ShuMountain.regions['"+region+"'].entry});render()");
   for(const b of L.buildings.filter(b=>b.region===region)){walk(w,region,(x,y)=>Math.hypot(x-b.x,y-b.y)<=1);touch(w,'up');assert.equal(read(w,'ShuWorldLife.nearby(s)?.id ?? null'),b.id);const position=read(w,'[s.x,s.y]');w.document.querySelector('#action').click();
    assert.ok(w.document.querySelector('#'+(b.kind==='shop'?'store':'worldHouse')).classList.contains('open'),b.id);if(b.kind==='house')assert.equal(w.document.querySelector('#worldHouseTitle').textContent,b.name);
    w.close();assert.deepEqual(read(w,'[s.x,s.y]'),position);assert.equal(M.walkable(b.x,b.y-3,b.region),false,b.id+' wall');
   }
  }assert.deepEqual(progress(w),before);assert.deepEqual(app.errors,[]);
 }finally{app.dispose();}
});
test('residents stay on dry routes, never obstruct the player and consume no gameplay random numbers',()=>{
 for(const p of L.residents)for(let ms=0;ms<=60000;ms+=150){const a=L.residentPose(p,ms);assert.ok(Number.isFinite(a.x)&&Number.isFinite(a.y));if(p.region!=='village')assert.equal(M.walkable(a.x,a.y,p.region),true,p.id+' '+ms);assert.equal(L.solid(a.x,a.y,p.region),false);}
 const app=boot({...seed(),hp:100}),w=app.window;try{const before=progress(w);w.eval('var lifeRolls=0;Math.random=()=>{lifeRolls++;return .5};for(let i=0;i<20;i++)worldLife.render(performance.now()+i*200,true)');assert.equal(read(w,'lifeRolls'),0);assert.deepEqual(progress(w),before);assert.deepEqual(app.errors,[]);}finally{app.dispose();}
});
test('shared pixels keep identical seasonal color across prop boundaries and green foam never turns red',()=>{
 const source=createCanvas(8,4),ctx=source.getContext('2d');ctx.fillStyle='#486d36';ctx.fillRect(0,0,8,4);ctx.fillStyle='#789e7a';ctx.fillRect(0,0,8,2);
 const rect=(x,y,w,h)=>[[x,y],[x+w,y],[x+w,y+h],[x,y+h]],definition={units:[8,4],coherentGrade:true,parts:[{id:'water',kind:'water',filter:'water',polygons:[rect(0,0,8,2)]},{id:'prop',kind:'props',polygons:[rect(4,0,4,4)]}]};
 const scene=Scenery.prepare(source,null,definition,{season:'autumn',period:'day'},createCanvas),out=createCanvas(8,4);Scenery.compose(out,scene);const sample=(x,y)=>[...out.getContext('2d').getImageData(x,y,1,1).data];
 assert.deepEqual(sample(1,0),sample(6,0));assert.deepEqual(sample(1,3),sample(6,3));assert.ok(sample(1,0)[1]>sample(1,0)[0]);assert.ok(sample(1,3)[0]>sample(1,3)[1]);
});
test('all casting poses keep feet at fixed painted ground points, including the upper harbor quay',()=>{
 for(const kind of ['lake','river','beach','harbor','pond','coast-sand','coast-reef','mountain-stream','mountain-highPond','mountain-highMarsh','mountain-underground','mountain-wetPond','mountain-wetCreek','mountain-wetMarsh']){
  const ground=Cast.groundFor(kind);for(const [width,height]of [[1280,650],[844,326],[820,302]])for(const avatar of ['boy','girl']){const ys=[];for(let i=0;i<12;i++){const m=Cast.model(width,height,Cast.timeline[i]/Cast.DURATION,undefined,false,avatar,false,ground);ys.push(m.leftFoot.y,m.rightFoot.y);assert.ok(m.leftFoot.x>=0&&m.rightFoot.x<width);assert.ok(m.leftFoot.y>70&&m.leftFoot.y<height);assert.ok(m.tip.y>=0,kind+" complete rod pose "+i);}assert.ok(Math.max(...ys)-Math.min(...ys)<1e-8,kind);if(kind==='harbor')assert.ok(ys[0]<height*.5);}
 }
 // Independent painted-water bounds: the quay and moored boats end above
 // y=.42; the clear middle basin is left of the right-hand pier.
 for(const [width,height]of [[1280,650],[844,326],[820,244]]){
  const app=boot({...seed(),soundEnabled:false},{castSurface:[width,height]}),w=app.window;
  try{w.eval('Object.assign(s,{x:210,y:104});cast({zone:"sea",waterZone:"sea",waterX:210,waterY:110})');let previous=-Infinity;
   const cover=Math.max(width/(16/9),height);
   for(let distance=0;distance<=100;distance+=5){const p=read(w,'castSurfacePoint('+distance+')');const y=(p.y*height/100-(height-cover)*.2)/cover;
    assert.ok(y>=.42&&y<=.97,'float stays in the open harbor basin');assert.ok(p.x>=57&&p.x<=66,'float avoids piers');assert.ok(y>previous,'longer casts travel away from the quay');previous=y;
   }assert.deepEqual(app.errors,[]);
  }finally{app.dispose();}
 }
 for(const d of F.definitions)assert.ok(fs.readFileSync(path.join(root,'sw.js'),'utf8').includes(d.id+'-v238.png'));
});
