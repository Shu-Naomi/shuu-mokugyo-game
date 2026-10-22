/* v252 draft: measured southern farm lanes and three bridges.
 * This module is not loaded by the game yet. Keep the original painting intact.
 */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.ShuRural=api;})(typeof globalThis!=='undefined'?globalThis:this,function(){
 'use strict';
 const id='ruralCanals',name='田園の用水路',asset='assets/rural-canals-v252.png',size=[1672,940];
 const point=([x,y])=>({x:x/size[0]*240,y:y/size[1]*135});
 const rawBridges=[
  {id:'stone',points:[[432,631],[612,610]],width:20},
  {id:'timber',points:[[849,420],[1050,391]],width:20},
  {id:'east',points:[[1382,447],[1458,495]],width:20}
 ];
 const rawTrails=[
  [[1017,919],[990,896],[958,855],[916,800],[895,753],[899,719],[875,691],[826,665],[763,646],[691,628],[628,615],[609,619]],
  [[437,650],[353,681],[285,710],[225,750],[182,795],[111,834],[42,864],[6,892]],
  [[437,650],[337,645],[266,622],[200,609]],
  [[628,615],[737,628],[874,624],[1007,608],[1150,581],[1302,554],[1436,530],[1515,527],[1612,507],[1664,486]],
  [[1469,510],[1481,529]],
  [[1375,448],[1293,430],[1162,406],[1049,401]],
  [[849,431],[780,443],[717,455],[665,483],[630,530],[609,577],[628,615]],
  [[1375,448],[1452,406],[1516,355],[1544,313],[1559,277],[1520,245],[1464,224],[1385,189],[1317,163],[1245,139],[1206,121]]
 ];
 const rawCanals=[
  {points:[[170,148],[172,185],[268,216],[396,259],[530,281],[647,302],[744,340],[809,376],[875,429],[965,486],[1096,542],[1223,544],[1345,503],[1461,465],[1564,423],[1672,395]],width:58},
  {points:[[552,647],[566,690],[650,736],[758,774],[842,780],[866,754],[861,719]],width:44}
 ];
 const rawPaddies=[
  [[3,279],[239,249],[307,329],[283,406],[154,442],[2,391]],
  [[330,375],[473,358],[646,402],[605,486],[565,601],[377,627],[290,548],[308,458]],
  [[716,107],[919,75],[1168,104],[1167,159],[1018,235],[809,208],[714,160]],
  [[998,242],[1175,178],[1426,241],[1469,285],[1365,352],[1115,383],[1003,335]],
  [[990,692],[1152,655],[1398,627],[1452,683],[1443,794],[1263,853],[1047,820],[978,765]],
  [[101,936],[179,858],[268,804],[395,785],[553,825],[646,898],[614,939]],
  [[602,900],[741,860],[858,876],[951,938]]
 ];
 const pool=[[754,463],[862,456],[1023,481],[1103,510],[1088,547],[997,570],[866,588],[784,570],[714,545]];
 const px=(x,y)=>[x/240*size[0],y/135*size[1]];
 function inPolygon(x,y,polygon){let inside=false;for(let i=0,j=polygon.length-1;i<polygon.length;j=i++){const a=polygon[i],b=polygon[j];if((a[1]>y)!==(b[1]>y)&&x<(b[0]-a[0])*(y-a[1])/(b[1]-a[1])+a[0])inside=!inside;}return inside;}
 function distance(x,y,a,b){const dx=b[0]-a[0],dy=b[1]-a[1],n=dx*dx+dy*dy,t=n?Math.max(0,Math.min(1,((x-a[0])*dx+(y-a[1])*dy)/n)):0;return Math.hypot(x-a[0]-t*dx,y-a[1]-t*dy);}
 const onLine=(x,y,line,width)=>line.slice(1).some((p,i)=>distance(x,y,line[i],p)<=width/2);
 const valid=(x,y)=>Number.isFinite(x)&&Number.isFinite(y)&&x>=2&&x<=238&&y>=2&&y<=133;
 function bridgeAt(x,y){if(!valid(x,y))return null;const p=px(x,y);return rawBridges.find(b=>onLine(...p,b.points,b.width))?.id||null;}
 function paddyAt(x,y){const p=px(x,y);return rawPaddies.some(a=>inPolygon(...p,a));}
 function canalAt(x,y){const p=px(x,y);return inPolygon(...p,pool)||rawCanals.some(c=>onLine(...p,c.points,c.width));}
 function walkable(x,y){if(!valid(x,y))return false;if(bridgeAt(x,y))return true;if(paddyAt(x,y)||canalAt(x,y))return false;const p=px(x,y);return rawTrails.some(t=>onLine(...p,t,34));}
 const entry={...point([1017,919]),direction:'up'};
 const fishingPoints=[
  {id:'canal',...point([773,447]),direction:'up'},
  {id:'pool',...point([820,624]),direction:'up'},
  {id:'east',...point([1554,519]),direction:'up'}
 ];
 function fishingWater(x,y,direction){if(!walkable(x,y)||bridgeAt(x,y))return null;const delta={up:[0,-1],right:[1,0],down:[0,1],left:[-1,0]}[direction];if(!delta)return null;for(let r=1;r<=12;r+=.5){const a=x+delta[0]*r,b=y+delta[1]*r;if(canalAt(a,b)&&!paddyAt(a,b)&&!bridgeAt(a,b))return {x:a,y:b,type:'canal',zone:'river'};}return null;}
 return {id,name,asset,size,status:'draft-southern-loop',entry,fishingPoints,rawTrails,rawBridges,rawCanals,rawPaddies,pool,point,walkable,bridgeAt,paddyAt,canalAt,fishingWater};
});
