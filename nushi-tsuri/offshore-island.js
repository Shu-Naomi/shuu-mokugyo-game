(function(root,factory){
  const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.ShuOffshore=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(){
  'use strict';
  const id='offshore',name='潮風島',fare=800,minutes=60;
  const harbor={x:216,y:109,direction:'up'},entry={x:130,y:96,direction:'up'};
  const rest={x:114,y:57},lighthouse={x:132,y:23};
  const assets={world:'assets/offshore-world-v251.png',ship:'assets/offshore-ferry-v251.png'};
  // Trace the level paths, stairs, beach and rock platforms in the original
  // 1672 x 941 painting. The grass-topped cliffs and open sea are not floors.
  const trails=[
    [[130,100],[133,95],[138,88],[143,83],[144,79],[138,74],[132,69],[124,64],[116,60],[108,59],[101,59]],
    [[101,59],[91,55],[84,52],[79,47],[76,42],[70,39],[64,37],[56,41],[49,46],[43,46],[36,43]],
    [[101,59],[88,60],[75,61],[64,62],[56,66],[48,69],[40,69],[32,70],[29,68]],
    [[108,59],[114,57],[124,60],[135,57],[144,52],[151,47],[160,44],[172,46],[181,51],[190,55],[200,59],[208,57],[214,54]],
    [[151,47],[148,40],[142,35],[137,29],[134,24],[132,23]],
    [[143,82],[135,79],[127,78],[120,79],[116,81]],
  ];
  const platforms=[
    [[24,65],[32,62],[40,64],[49,64],[54,68],[48,73],[39,75],[29,74]],
    [[29,39],[39,37],[49,40],[53,45],[46,49],[36,48],[30,45]],
    [[202,50],[212,48],[219,51],[220,57],[216,61],[207,61],[202,57]],
    [[111,79],[119,76],[127,76],[136,78],[140,82],[135,85],[128,83],[120,83],[115,84]],
  ];
  const land=[[75,30],[90,26],[99,19],[114,15],[130,15],[143,21],[158,25],[164,34],[174,39],[181,37],[186,44],[200,46],[214,43],[223,50],[221,62],[217,68],[214,80],[207,90],[206,101],[218,109],[220,117],[211,120],[197,116],[183,114],[173,111],[165,107],[159,103],[154,97],[154,91],[159,84],[155,78],[142,76],[136,78],[132,83],[126,81],[119,77],[109,80],[101,84],[97,94],[85,102],[74,102],[69,95],[60,91],[49,91],[44,85],[33,82],[22,77],[21,71],[24,65],[30,61],[19,54],[15,49],[15,43],[20,40],[24,38],[18,33],[25,27],[36,26],[47,29],[55,33],[63,32]];
  function inside(x,y,poly){let hit=false;for(let i=0,j=poly.length-1;i<poly.length;j=i++){const [a,b]=poly[i],[c,d]=poly[j];if((b>y)!==(d>y)&&x<(c-a)*(y-b)/(d-b)+a)hit=!hit;}return hit;}
  function distance(x,y,a,b){const dx=b[0]-a[0],dy=b[1]-a[1],length=dx*dx+dy*dy,t=length?Math.max(0,Math.min(1,((x-a[0])*dx+(y-a[1])*dy)/length)):0;return Math.hypot(x-a[0]-dx*t,y-a[1]-dy*t);}
  const near=(a,b,r=6)=>Number.isFinite(a.x)&&Number.isFinite(a.y)&&Math.hypot(a.x-b.x,a.y-b.y)<=r;
  // The dock approach and eastern tidal path need extra steering room for
  // directional/touch input. Keep the western ledges and cliff routes tight.
  const trailClearances=[3.2,2.4,2.4,3.8,2.4,2.4];
  const walkable=(x,y)=>Number.isFinite(x)&&Number.isFinite(y)&&x>=2&&x<=238&&y>=2&&y<=133&&(platforms.some(p=>inside(x,y,p))||trails.some((p,index)=>p.slice(1).some((b,i)=>distance(x,y,p[i],b)<=trailClearances[index])));
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
