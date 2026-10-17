(function(root,factory){
 const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.ShuWorldLife=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(){
 'use strict';
 const art = {"buildings":[[117,9,548,455],[849,72,631,397],[54,503,767,464],[920,513,579,474]],"doorX":[.51,.71,.52,.48],"residents":[[[155,16,150,312],[506,16,166,312],[872,16,173,312],[1234,16,148,311]],[[154,353,135,320],[512,353,179,320],[857,353,183,320],[1243,353,128,320]],[[140,693,151,315],[508,693,184,315],[863,693,186,315],[1231,693,153,313]]]};
 const buildings=[
  {id:'stream-shop',region:'stream',kind:'shop',name:'サムの渓流売店',x:160,y:66,w:16,h:12,sprite:1,route:[[160,68],[160,66]],line:'川のそばでも道具を補充できるぞ。いつもの品を見ていくか。'},
  {id:'stream-house',region:'stream',kind:'house',name:'尾根の民家',x:190,y:44,w:13,h:10,sprite:0,route:[[194,44],[190,44]],line:'川虫にハリ小なら、この辺りのカワムツも相手をしてくれるよ。'},
  {id:'pond-house',region:'mountainPond',kind:'house',name:'峠の釣り人の小屋',x:229,y:66,w:11,h:10,sprite:3,route:[[219,66],[229,66]],line:'この池のヒメマスは中層から深場だ。川虫とハリ中を試してみな。'},
  {id:'marsh-house',region:'mountainMarsh',kind:'house',name:'葦守りの家',x:68,y:18,w:13,h:10,sprite:2,route:[[68,25],[68,18]],line:'葦が鳴る音を聞きながら暮らしているんだ。小魚の群れも、毎日少しずつ違うよ。'},
  {id:'wetland-shop',region:'wetland',kind:'shop',name:'サムの水郷売店',x:162,y:34,w:15,h:12,sprite:1,route:[[162,37],[162,34]],line:'水郷の散策も、エサの用意からじゃな。ゆっくり選んでいけ。'},
  {id:'wetland-house',region:'wetland',kind:'house',name:'水郷の民家',x:64,y:83,w:14,h:11,sprite:2,route:[[80,70],[80,83],[64,83]],line:'洗濯物を干してから、睡蓮の池をひと回りしてきたところさ。'}
 ];
 const residents=[
  {id:'village-fisher',region:'village',name:'散歩中の釣り人',sprite:0,route:[[51,39],[64,39]],speed:1.4},
  {id:'village-greengrocer',region:'village',name:'買い物帰りの住人',sprite:1,route:[[70,81],[88,81]],speed:1.2},
  {id:'village-worker',region:'village',name:'仕事帰りの住人',sprite:2,route:[[164,82],[177,82]],speed:1.1},
  {id:'stream-fisher',region:'stream',name:'渓流の常連',sprite:0,route:[[153,68],[168,67]],speed:1.2},
  {id:'stream-worker',region:'stream',name:'橋を見回る住人',sprite:2,route:[[145,72],[153,72]],speed:1},
  {id:'pond-angler',region:'mountainPond',name:'池を眺める釣り人',sprite:0,route:[[110,111],[129,111]],speed:1.2},
  {id:'pond-resident',region:'mountainPond',name:'小屋の住人',sprite:2,route:[[220,66],[228,66]],speed:.9},
  {id:'marsh-resident',region:'mountainMarsh',name:'葦守りの住人',sprite:1,route:[[68,24],[82,24]],speed:1.1},
  {id:'marsh-fisher',region:'mountainMarsh',name:'沼の釣り人',sprite:0,route:[[136,104],[146,105]],speed:.9},
  {id:'wetland-resident',region:'wetland',name:'水郷の住人',sprite:1,route:[[46,70],[68,71]],speed:1.1},
  {id:'wetland-worker',region:'wetland',name:'売店帰りの住人',sprite:2,route:[[149,39],[164,36]],speed:1}
 ];
 const rect=(x,y,b)=>x>=b.left&&x<=b.right&&y>=b.top&&y<=b.bottom;
 function centerX(b){return b.x+(.5-(art.doorX?.[b.sprite]??.5))*b.w;}
 function footprint(b){return {left:centerX(b)-b.w*.36,right:centerX(b)+b.w*.36,top:b.y-b.h*.64,bottom:b.y-1.5};}
 const solid=(x,y,region)=>buildings.some(b=>b.region===region&&rect(x,y,footprint(b)));
 function distance(x,y,a,b){const dx=b[0]-a[0],dy=b[1]-a[1],length=dx*dx+dy*dy,t=length?Math.max(0,Math.min(1,((x-a[0])*dx+(y-a[1])*dy)/length)):0;return Math.hypot(x-a[0]-dx*t,y-a[1]-dy*t);}
 const access=(x,y,region)=>buildings.some(b=>b.region===region&&b.route.slice(1).some((p,i)=>distance(x,y,b.route[i],p)<=1.8));
 function nearby(state){if(state.direction!=='up')return null;return buildings.filter(b=>b.region===state.mapRegion&&Math.abs(state.x-b.x)<=3.8&&state.y>=b.y-1&&state.y<=b.y+4.5).sort((a,b)=>Math.hypot(state.x-a.x,state.y-a.y)-Math.hypot(state.x-b.x,state.y-b.y))[0]||null;}
 function moveTarget(x,y,direction,stride,walkable){
  const delta={left:[-1,0],right:[1,0],up:[0,-1],down:[0,1]}[direction];if(!delta||!Number.isFinite(stride)||stride<=0||!walkable(x,y))return {x,y};
  for(let i=0;i<stride;i++){const step=Math.min(1,stride-i),[dx,dy]=delta;if(![.25,.5,.75,1].every(t=>walkable(x+dx*step*t,y+dy*step*t)))break;x+=dx*step;y+=dy*step;}return {x,y};
 }
 function residentPose(person,elapsed=0,reduced=false){
  const a=person.route[0],b=person.route[1],length=Math.hypot(b[0]-a[0],b[1]-a[1]),travel=length/Math.max(.1,person.speed),phase=reduced?0:Math.max(0,elapsed)/1000%(travel*2+6);
  const outward=phase<3+travel,amount=phase<3?0:phase<3+travel?(phase-3)/travel:phase<6+travel?1:1-(phase-6-travel)/travel;
  return {x:a[0]+(b[0]-a[0])*amount,y:a[1]+(b[1]-a[1])*amount,facing:outward?(b[0]>=a[0]?'right':'left'):(b[0]>=a[0]?'left':'right'),frame:reduced||phase<3||phase>=3+travel&&phase<6+travel?0:[0,1,0,2][Math.floor(elapsed/170)%4]};
 }
 function greeting(b,env){
  if(env.weather==='rain')return b.id==='wetland-house'?'今日は洗濯物をしまって、家で雨音を聞いているよ。少し雨宿りしていきな。':'雨の山道は静かだね。ここでひと息ついていきな。';
  if(env.period==='night')return '灯りを見つけて来たのかい。夜の水辺は静かだね。ここで少し休んでいきな。';return b.line;
 }
 const preparedGraphics=new WeakMap();
 function graphic(ctx,image,box){
  let bank=preparedGraphics.get(image);if(!bank){bank=new Map();preparedGraphics.set(image,bank);}const key=box.join(',');if(bank.has(key))return bank.get(key);
  const canvas=ctx.canvas.ownerDocument?.createElement('canvas')||new ctx.canvas.constructor(box[2],box[3]);canvas.width=box[2];canvas.height=box[3];const painter=canvas.getContext('2d');painter.drawImage(image,...box,0,0,box[2],box[3]);
  const pixels=painter.getImageData(0,0,box[2],box[3]);for(let n=3;n<pixels.data.length;n+=4)if(pixels.data[n]<48)pixels.data[n]=0;painter.putImageData(pixels,0,0);bank.set(key,canvas);return canvas;
 }
 function drawBuilding(canvas,image,index){
  const box=art.buildings[index];if(!image?.complete&&!image?.width||!box)return false;const ctx=canvas.getContext('2d');ctx.clearRect(0,0,canvas.width,canvas.height);ctx.imageSmoothingEnabled=false;
  const tile=graphic(ctx,image,box),scale=Math.min(canvas.width/box[2],canvas.height/box[3]),w=box[2]*scale,h=box[3]*scale;ctx.drawImage(tile,(canvas.width-w)/2,canvas.height-h,w,h);return true;
 }
 function drawResident(canvas,image,index,pose){
  const boxes=art.residents[index],box=boxes?.[pose.frame];if(!image?.complete&&!image?.width||!box)return false;const ctx=canvas.getContext('2d'),scale=Math.min(80/Math.max(...boxes.map(b=>b[2])),116/Math.max(...boxes.map(b=>b[3])));
  ctx.clearRect(0,0,96,128);ctx.imageSmoothingEnabled=false;ctx.fillStyle='#18332655';ctx.beginPath();ctx.ellipse(48,127,17,1,0,0,Math.PI*2);ctx.fill();ctx.save();if(pose.facing==='left'){ctx.translate(96,0);ctx.scale(-1,1);}ctx.drawImage(graphic(ctx,image,box),48-box[2]*scale/2,126-box[3]*scale,box[2]*scale,box[3]*scale);ctx.restore();return true;
 }
 function create({map,state,environment,visible,walkable}){
  const document=map.ownerDocument,layer=document.createElement('div');layer.id='worldLifeLayer';layer.className='world-life-layer';map.append(layer);const images={},records=new Map();let region='',last=-Infinity;
  function image(name){if(!images[name]){const img=new Image();images[name]=img;img.onload=()=>render(performance.now(),true);img.src='assets/'+name+'-v238.png';}return images[name];}
  function add(id,kind,definition){const node=document.createElement('div');node.className='world-life-'+kind;node.dataset.worldLife=id;node.setAttribute('role','img');node.setAttribute('aria-label',definition.name);const canvas=document.createElement('canvas');canvas.width=kind==='building'?512:96;canvas.height=kind==='building'?Math.round(512*definition.h/definition.w):128;node.append(canvas);layer.append(node);const record={node,canvas,definition,pose:null,position:null,clock:0,tick:performance.now()};records.set(id,record);return record;}
  function paintBuilding(record,env){const b=record.definition,im=image('settlement-buildings');if(!im.complete||!im.naturalWidth)return;drawBuilding(record.canvas,im,b.sprite);record.node.style.width=b.w/240*100+'%';record.node.style.height=b.h/135*100+'%';record.node.style.left=centerX(b)/240*100+'%';record.node.style.top=b.y/135*100+'%';record.node.style.filter=env.period==='night'?'brightness(.64) saturate(.85)':env.period==='evening'?'sepia(.12) brightness(.9)':'';}
  function paintResident(record,pose){const im=image('village-residents');if(im.complete&&im.naturalWidth)drawResident(record.canvas,im,record.definition.sprite,pose);}
  function roads(){
   const canvas=document.createElement('canvas');canvas.className='world-life-roads';canvas.width=1536;canvas.height=864;layer.prepend(canvas);const ctx=canvas.getContext('2d');ctx.scale(6.4,6.4);ctx.lineJoin='round';ctx.strokeStyle='#685c3b55';ctx.lineWidth=2.8;
   for(const b of buildings.filter(b=>b.region===region)){ctx.beginPath();b.route.forEach(([x,y],i)=>i?ctx.lineTo(x,y):ctx.moveTo(x,y));ctx.stroke();ctx.strokeStyle='#b1936066';ctx.lineWidth=2.2;ctx.stroke();ctx.strokeStyle='#685c3b55';ctx.lineWidth=2.8;
   }
  }
  function render(now=performance.now(),force=false){
   if(!force&&now-last<150)return;last=now;const s=state(),env=environment();layer.hidden=!visible();if(layer.hidden)return;
   if(region!==s.mapRegion){region=s.mapRegion;records.clear();layer.replaceChildren();roads();for(const b of buildings.filter(b=>b.region===region))add(b.id,'building',b);for(const p of residents.filter(p=>p.region===region))add(p.id,'resident',p);}
   const reduced=globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
   for(const record of records.values()){
    const d=record.definition;if(d.kind){record.node.style.zIndex=d.y>s.y?'6':'2';const key=env.period;if(record.pose!==key){paintBuilding(record,env);if(images['settlement-buildings']?.complete)record.pose=key;}continue;}
    const delta=Math.max(0,Math.min(250,now-record.tick));record.tick=now;record.node.hidden=env.period==='night';if(record.node.hidden)continue;
    let pose=residentPose(d,record.clock+delta,reduced);if(!walkable(pose.x,pose.y)||record.position&&Math.hypot(pose.x-s.x,pose.y-s.y)<4.5)pose={...(record.position||residentPose(d,0,true)),frame:0};else record.clock+=delta;
    record.position=pose;record.node.style.left=pose.x/240*100+'%';record.node.style.top=pose.y/135*100+'%';record.node.style.zIndex=pose.y>s.y?'6':'4';const key=pose.frame+':'+pose.facing;if(record.pose!==key){paintResident(record,pose);if(images['village-residents']?.complete)record.pose=key;}
   }
  }
  return {render,layer,dispose:()=>layer.remove()};
 }
 return {art,buildings,residents,footprint,solid,access,nearby,moveTarget,residentPose,greeting,drawBuilding,drawResident,create};
});
