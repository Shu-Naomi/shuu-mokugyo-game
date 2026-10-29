(function(root,factory){
  const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.ShuOffshore=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(){
  'use strict';
  const id='offshore',name='潮風島',fare=800,minutes=60;
  const harbor={x:216,y:109,direction:'up'},entry={x:130,y:96,direction:'up'};
  const rest={x:114,y:57},lighthouse={x:132,y:23};
  const assets={world:'assets/offshore-world-v252-18.png',ship:'assets/offshore-ferry-v251.png'};
  // Trace the widened 1672 x 941 painting. Keep the usable lanes inside
  // the sandy surface, with room before the vegetation, fences and cliffs.
  const trails=[
    [[130,100],[133,96],[136,92],[139,89],[144,86],[146,82],[149,78],[150,74],[149,71],[145,69],[138,69],[134,68],[131,64],[129,61],[126,59],[120,60],[115,60],[110,61],[105,59],[101,56]],
    [[101,56],[97,55],[92,54],[86,53.5],[80,53],[77,50],[76,46],[75,43],[72,41],[68,39.5],[64,39],[60,38],[57,37],[55,39],[53,41],[49,43],[45,43],[40,42],[36,43]],
    [[101,56],[97,55],[92,54],[86,53.5],[80,54],[79,57],[77,59],[74,61],[70,63],[66,65],[61,66],[56,67],[51,68],[48,69],[40,69],[32,69],[29,68]],
    [[101,56],[105,59],[110,61],[115,60],[120,60],[124,60],[130,60],[135,59],[140,57],[145,55],[150,52.5],[154,51],[159,50.5],[162,50],[165,51],[170,54],[175,56],[180,58.5],[185,60.5],[190,62],[195,63],[200,64],[204,62],[207,60],[209,57],[211,55],[214,53],[217,52]],
    [[162,50],[160,47],[159,44],[155,41],[153,39],[152,36],[149,34],[145,33],[141,31],[138,29],[136,26],[134,24],[134,22],[131,21]],
    [[143,82],[139,81],[134,80],[130,79],[125,78.5],[120,79.5],[116,80.5]],
    [[138,69],[135,69],[131,70],[130,72],[130,74],[130,77],[131,79],[127,79],[123,80],[118,81]],
  ];
  // Wider walking lanes follow the new earth paths; the full illustrated
  // path is wider again, so the foot anchor does not sit on its grassy edge.
  const trailWidths=[2.2,2,2.1,2,1.8,1.6,1.35];
  const platforms=[
    [[24,65],[32,62],[40,64],[49,64],[54,68],[48,73],[39,75],[29,74]],
    [[29,39],[39,37],[49,40],[53,45],[46,49],[36,48],[30,45]],
    [[211,50],[216,49],[220,51],[220,56],[218,58],[212,58],[209,56],[209,53]],
    [[88,80],[94,77],[100,77],[105,78],[110,78],[114,77],[121,76],[127,77],[130,79],[136,79],[140,81],[138,84],[131,83],[125,82],[117,82],[112,82],[105,80],[99,80],[93,81],[89,83]],
    [[136,85],[141,83],[146,82],[150,84],[152,86],[151,88],[145,88],[139,89],[136,88]],
    [[125,99],[130,101],[134,99],[136,95],[139,91],[139,88],[135,88],[132,92],[128,96]],
    [[120,20],[125,18],[129,19],[133,20],[137,22],[139,25],[135,27],[130,26],[124,24],[120,23]],
    [[100,55],[104,54],[108,54],[114,55],[116,56.5],[119,58],[121,60],[118,61],[112,62],[107,61],[103,59],[100,56]],
    // The widened western road and junction are continuous ground. Thin
    // center-line corridors alone left invisible walls across this dirt.
    [[58,35.5],[60,35.8],[64,37],[68,38],[71,39.4],[73,40.5],[75.5,41.5],[77.5,43],[78.5,44.5],[79.5,47],[79.5,49.5],[82,52.5],[81,54.5],[76.5,54.5],[76.5,54],[75.9,53.05],[74.5,50],[74.5,47],[73,46.3],[71.5,45],[69,43.5],[67,41.8],[64,40.5],[60,39],[58,38],[56.5,37]],
    [[76.5,52.5],[79,52],[83,53],[89,53.5],[94,54],[99,55],[103.5,55.7],[108,55.5],[113,56.5],[117.5,58],[120,59.5],[120,61],[116,61.3],[112,61.5],[108,61.5],[104,61.5],[100,61.25],[98.5,61.25],[97,60.5],[96,60.25],[94.5,58.7],[94,58.25],[92.5,57.35],[91.5,57.35],[90,58.5],[88.5,59.2],[86,59.2],[84,59],[82.5,58.8],[81,59],[80,59.25],[78,60.7],[75,62.5],[72.5,63.8],[73.5,60.5],[75,58],[76,55]],
  ];
  const land=[[75,30],[90,26],[99,19],[114,15],[130,15],[143,21],[158,25],[164,34],[174,39],[181,37],[186,44],[200,46],[214,43],[223,50],[221,62],[217,68],[214,80],[207,90],[206,101],[218,109],[220,117],[211,120],[197,116],[183,114],[173,111],[165,107],[159,103],[154,97],[154,91],[159,84],[155,78],[142,76],[136,78],[132,83],[126,81],[119,77],[109,80],[101,84],[97,94],[85,102],[74,102],[69,95],[60,91],[49,91],[44,85],[33,82],[22,77],[21,71],[24,65],[30,61],[19,54],[15,49],[15,43],[20,40],[24,38],[18,33],[25,27],[36,26],[47,29],[55,33],[63,32]];
  function inside(x,y,poly){let hit=false;for(let i=0,j=poly.length-1;i<poly.length;j=i++){const [a,b]=poly[i],[c,d]=poly[j];if((b>y)!==(d>y)&&x<(c-a)*(y-b)/(d-b)+a)hit=!hit;}return hit;}
  function distance(x,y,a,b){const dx=b[0]-a[0],dy=b[1]-a[1],length=dx*dx+dy*dy,t=length?Math.max(0,Math.min(1,((x-a[0])*dx+(y-a[1])*dy)/length)):0;return Math.hypot(x-a[0]-dx*t,y-a[1]-dy*t);}
  const near=(a,b,r=6)=>Number.isFinite(a.x)&&Number.isFinite(a.y)&&Math.hypot(a.x-b.x,a.y-b.y)<=r;
  const walkable=(x,y)=>Number.isFinite(x)&&Number.isFinite(y)&&x>=2&&x<=238&&y>=2&&y<=133&&(platforms.some(p=>inside(x,y,p))||trails.some((p,n)=>p.slice(1).some((b,i)=>distance(x,y,p[i],b)<=trailWidths[n])));
  const water=(x,y)=>Number.isFinite(x)&&Number.isFinite(y)&&x>=2&&x<=238&&y>=2&&y<=133&&!inside(x,y,land)&&!walkable(x,y);
  const names={cove:'潮風島・入り江',west:'潮風島・西の磯',east:'潮風島・東の潮目'};
  const areaAt=(x,y)=>x<85?'west':x>165?'east':'cove';
  const localeFor=type=>type==='cove'?'coast-sand':'coast-reef';
  function fishingWater(x,y,direction='up'){
    if(!walkable(x,y))return null;
    const [dx,dy]={up:[0,-1],down:[0,1],left:[-1,0],right:[1,0]}[direction]||[0,-1];
    for(let d=.5;d<=8;d+=.5)for(const slope of [0,-.1875,.1875,-.375,.375]){const px=x+dx*d-dy*slope*d,py=y+dy*d+dx*slope*d;if(water(px,py))return {zone:'sea',type:areaAt(x,y),x:px,y:py};}
    return null;
  }
  const fishingPoints=[{id:'cove',x:118,y:81,direction:'down'},{id:'west',x:27,y:69,direction:'left'},{id:'east',x:218,y:55,direction:'right'}];
  const base={cove:{aji:.2,kasago:.2,mebaru:.14,shirogisu:.16},west:{ishidai:.18,utsubo:.14,kasago:.2},east:{hiramasa:.18,kanpachi:.18,buri:.14,masaba:.12}};
  const spots=Object.entries(names).flatMap(([area,label])=>['shallow','mid','deep'].map(depth=>({id:`offshore-${area}-${depth}`,zone:'sea',depth,name:`${label}・${{shallow:'岸際',mid:'中層',deep:'深場'}[depth]}`,role:{cove:'入り江のアカハタと磯魚',west:'貝を狙うイシガキダイと岩陰の魚',east:'潮目を巡るシマアジと青物'}[area],weights:{...base[area]}})));
  const atPier=s=>s.mapRegion===id?near(s,entry,7):s.mapRegion==='village'&&near(s,harbor,5);
  function voyage(s,returning=false){
    if(!atPier(s)||s.boatActive||returning!==(s.mapRegion===id))return {ok:false,reason:'船着き場で船長に話しかけよう。'};
    if(!returning&&s.tournament)return {ok:false,reason:'大会が終わったら離島へ渡ろう。'};
    if(!returning&&(!Number.isFinite(s.money)||s.money<fare))return {ok:false,reason:`往復${fare}円が必要だよ。帰りの運賃も含まれている。`};
    if(!returning)s.money-=fare;
    Object.assign(s,returning?{mapRegion:'village',boatActive:false,...harbor}:{mapRegion:id,boatActive:false,...entry});
    return {ok:true,cost:returning?0:fare,minutes};
  }
  const images={},pending={};
  function imageFor(key){if(!images[key]&&typeof Image!=='undefined'){const im=images[key]=new Image();im.decoding='async';im.onload=()=>{if(pending[key])(key==='world'?paint:paintShip)(...pending[key]);};im.src=assets[key];}return images[key];}
  function paint(canvas,env={}){
    if(!canvas?.getContext)return;pending.world=[canvas,{...env}];const ctx=canvas.getContext('2d'),im=imageFor('world');ctx.save();ctx.imageSmoothingEnabled=false;
    if(im?.complete&&im.naturalWidth>0)ctx.drawImage(im,0,0,canvas.width,canvas.height);else{ctx.fillStyle='#145c7c';ctx.fillRect(0,0,canvas.width,canvas.height);}
    const tint={night:'rgba(9,20,48,.49)',evening:'rgba(115,46,23,.19)',morning:'rgba(255,220,159,.06)'}[env.period||env.time];if(tint){ctx.fillStyle=tint;ctx.fillRect(0,0,canvas.width,canvas.height);}ctx.restore();
  }
  function paintShip(canvas,left=false){
    if(!canvas?.getContext)return;pending.ship=[canvas,left];const ctx=canvas.getContext('2d'),im=imageFor('ship');ctx.clearRect(0,0,canvas.width,canvas.height);ctx.imageSmoothingEnabled=false;
    if(!im?.complete||!im.naturalWidth)return;
    const box=left?[74,519,1365,484]:[127,12,1336,490];ctx.drawImage(im,...box,0,0,canvas.width,canvas.height);
  }
  if(typeof Image!=='undefined'){imageFor('world');imageFor('ship');}
  return {id,name,fare,minutes,harbor,entry,rest,lighthouse,assets,trails,platforms,land,names,spots,fishingPoints,near,walkable,water,areaAt,localeFor,fishingWater,atPier,voyage,paint,paintShip};
});
