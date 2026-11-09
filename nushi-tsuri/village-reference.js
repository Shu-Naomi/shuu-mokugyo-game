/* Reference-only pilot. Measurements are source-image pixels, never a repainted map. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;if(root)root.ShuVillageReference=api;})(typeof globalThis!=='undefined'?globalThis:this,function(){
'use strict';
const enabled=typeof location!=='undefined'&&new URLSearchParams(location.search).get('villageReference')==='1';
const source={width:1672,height:941,asset:'assets/village-reference-pilot.png',reference:'11016(1).png',provisional:['riao-tcg-shop','quest-board']};
const point=([x,y])=>[x/1672*240,y/941*135], polygon=p=>p.map(point), rect=(l,r,t,b)=>({left:l/1672*240,right:r/1672*240,top:t/941*135,bottom:b/941*135});
const anchor=(x,y)=>({x:x/1672*240,y:y/941*135});
const inside=(x,y,r)=>x>=r.left&&x<=r.right&&y>=r.top&&y<=r.bottom;
function contains(x,y,p){let c=false;for(let i=0,j=p.length-1;i<p.length;j=i++){const a=p[i],b=p[j];if(((a[1]>y)!==(b[1]>y))&&(x<(b[0]-a[0])*(y-a[1])/(b[1]-a[1])+a[0]))c=!c;}return c;}
const lakeWaterPolygon=polygon([[721,99],[786,100],[853,105],[920,127],[977,161],[1007,210],[1006,242],[975,270],[931,294],[869,313],[804,327],[761,335],[717,337],[653,334],[584,322],[520,304],[458,269],[431,231],[427,203],[442,173],[471,150],[517,129],[576,112],[640,104]]);
const riverWaterPolygon=polygon([[715,327],[753,329],[757,361],[748,390],[752,424],[744,445],[740,461],[739,494],[735,522],[739,554],[745,588],[758,630],[752,663],[736,694],[728,729],[725,765],[736,800],[744,821],[794,845],[796,941],[604,941],[607,831],[627,801],[641,777],[660,742],[678,708],[686,673],[690,640],[687,606],[676,580],[676,543],[681,510],[683,478],[690,442],[703,404],[715,369]]);
const seaShoreLine=polygon([[0,729],[51,726],[97,732],[147,744],[203,752],[256,762],[311,768],[361,779],[411,790],[460,800],[516,811],[562,827],[610,841],[663,853],[722,850],[779,840],[838,821],[907,821],[968,821],[986,710],[1144,710],[1195,647],[1445,647],[1516,627],[1574,648],[1623,687],[1672,747]]);
const harborPocketWaterPolygon=polygon([[1491,608],[1554,610],[1585,633],[1611,658],[1617,696],[1577,703],[1543,690],[1531,665],[1507,649],[1491,629]]);
const practicePondPolygon=polygon([[1469,465],[1512,462],[1544,478],[1558,499],[1551,526],[1523,544],[1489,546],[1458,533],[1441,510],[1446,486]]);
const practicePondBounds={...anchor(1500,506),centerX:1500/1672*240,centerY:506/941*135,radiusX:61/1672*240,radiusY:44/941*135,entryX:1575/1672*240,entryY:555/941*135};
const riverBridgeBounds=rect(652,773,509,550), lakeDockBounds=rect(690,716,93,115);
const harborWalkwayPolygons=[polygon([[937,604],[1482,596],[1528,616],[1528,647],[1195,647],[1195,713],[959,713],[937,682]]),polygon([[781,774],[949,774],[949,710],[986,710],[986,819],[781,819]]),polygon([[1398,706],[1535,706],[1535,752],[1398,752]]),polygon([[985,772],[1077,772],[1077,792],[985,792]])];
const mainShrineApproachBounds=rect(1262,1324,348,410),samShopApproachBounds=rect(1311,1348,545,604),samShopInteractionBounds=rect(1300,1357,582,618),harborCornerPassageBounds=rect(956,986,665,704);
const danRaceFront={walls:rect(142,339,299,448),approaches:[rect(208,264,352,470)],interaction:rect(208,264,364,470)};
const riaoShopFront={walls:rect(1440,1582,140,199),door:anchor(1518,211),interaction:rect(1498,1537,199,232),props:[rect(1471,1495,191,207),rect(1534,1557,192,208),rect(1573,1599,197,210)]};
const questBoardInteractionBounds=rect(1572,1611,205,238);
const structureBounds=[['farmhouse',178,349,130,188],['watermill',1236,1418,135,196],['riao-tcg-shop',1440,1582,140,199],['west-shrine',142,339,299,448],['wayside-shrine',48,113,377,411],['yaoya',423,590,418,490],['diner',863,1040,411,491],['main-shrine',1220,1366,288,397],['sam-shop',1221,1411,513,595],['fish-market',968,1145,603,663],['harbor-shop',828,957,735,792],['quest-board',1578,1596,197,209]].map(([id,...r])=>({id,...rect(...r)}));
const passages={'west-shrine':danRaceFront.approaches,'main-shrine':[mainShrineApproachBounds],'sam-shop':[samShopApproachBounds],'fish-market':[harborCornerPassageBounds],'harbor-shop':[rect(881,921,777,807)]};
const propBounds=[...riaoShopFront.props,...[[1397,1435,687,744],[143,224,194,244],[258,354,221,241],[315,345,182,215],[556,591,474,504],[801,827,454,486],[830,872,464,487],[1045,1085,459,489],[1154,1234,395,426],[1350,1458,395,423],[1199,1234,566,598],[1378,1414,566,600],[960,988,636,669],[1100,1143,642,669],[817,842,752,789],[929,955,778,794],[1026,1054,305,318]].map(r=>rect(...r))];
const landmarks={};
for(const [id,x,y,l,r,t,b] of [['farmhouse',242,203,222,266,188,225],['watermill',1332,211,1310,1354,196,232],['riao-tcg-shop',1518,211,1498,1537,199,232],['west-shrine',236,385,208,264,364,470],['yaoya',546,508,525,562,490,528],['diner',969,509,950,990,491,532],['main-shrine',1293,383,1262,1324,348,426],['sam-shop',1330,604,1300,1357,582,618],['fish-market',1045,681,1026,1065,663,700],['harbor-shop',902,805,881,921,777,819],['quest-board',1588,222,1572,1611,209,238]])landmarks[id]={...anchor(x,y),interaction:rect(l,r,t,b),facing:'up'};
const exits={home:{bounds:rect(0,43,492,540),return:{...anchor(70,515),direction:'right'}},north:{bounds:rect(718,775,0,40),return:anchor(743,50)},mountain:{bounds:rect(1131,1192,45,85),return:anchor(1115,111)},east:{bounds:rect(1630,1672,209,253),return:anchor(1605,230)}};
/* ROUTE_ANCHORS_START */
// Every location below is measured on the supplied painting. Only village-side
// transfer anchors change; offshore/island region coordinates remain intact.
const routes={
 rural:{gate:exits.east.bounds,return:{...exits.east.return,direction:'left'},guide:anchor(1640,230)},
 mountain:{gate:exits.north.bounds,return:{...exits.north.return,direction:'down'},guide:anchor(743,26)},
 offshore:{harbor:{...anchor(1455,625),direction:'up'}},
 boat:{land:anchor(970,805),water:anchor(1037,818)}
};
const npc={
 residentRoutes:{
  'ferry-harbor':[[1430,625],[1430,625]].map(point),
  'village-fisher':[[475,321],[580,351]].map(point),
  'village-greengrocer':[[445,541],[550,541]].map(point),
  'village-worker':[[885,548],[1030,548]].map(point)
 },
 anglers:{
  liao:{...anchor(1035,225),facing:'left'},asual:{...anchor(1000,288),facing:'left'},dancer:{...anchor(420,260),facing:'right'},
  gen:{...anchor(1035,225),facing:'left'},mina:{...anchor(1000,288),facing:'left'},take:{...anchor(420,260),facing:'right'},haru:{...anchor(395,210),facing:'right'}
 },
 dogs:{crow:{...anchor(1058,240),facing:'left'},cloud:{...anchor(1030,300),facing:'left'},jamie:{...anchor(430,283),facing:'right'},chappie:{...anchor(1360,613),facing:'left'}}
};
const guide={waterPoints:{lake:anchor(715,220),river:anchor(710,620),sea:anchor(1270,850)}};
/* ROUTE_ANCHORS_END */
const forage={};
for(const [habitat,points] of Object.entries({grass:[[120,270],[390,290],[340,520],[630,550],[1090,545]],forest:[[150,110],[480,95],[1070,145],[1600,260],[1560,450]],riverside:[[680,390],[780,400],[650,480],[800,560],[645,720]],beach:[[120,670],[260,680],[430,720],[560,770],[580,800]]}))points.forEach(([x,y],i)=>{forage[habitat+'-0'+(i+1)]=anchor(x,y);});
const paths={stone:[[[1068,141],[1097,144],[1191,53],[1161,50]],[[934,604],[1481,596],[1528,615],[1528,647],[1194,647],[1194,713],[961,713]],[[782,792],[948,792],[948,710],[984,710],[984,820],[782,820]]].map(polygon),wood:[[[208,352],[264,352],[264,470],[208,470]],[[1398,706],[1535,706],[1535,752],[1398,752]]].map(polygon)};
// Ground-contact forest masses and planted islands; gaps follow the painted roads.
// Roof canopies are renderer masks, not these impassable ground envelopes.
const vegetationPolygons=[
 [[0,0],[706,0],[705,36],[670,65],[571,70],[462,83],[370,96],[343,74],[180,72],[146,103],[132,157],[122,238],[57,261],[0,263]],
 [[786,0],[1672,0],[1672,204],[1603,204],[1601,158],[1580,116],[1568,82],[1440,76],[1410,115],[1371,74],[1260,76],[1238,127],[1209,166],[1160,153],[1189,115],[1214,78],[1214,44],[1151,36],[1112,75],[1080,114],[1022,116],[978,83],[885,66],[801,60]],
 [[0,286],[39,304],[54,347],[31,398],[80,433],[129,441],[152,479],[118,488],[0,478]],
 [[356,299],[382,317],[378,354],[359,379],[341,367],[343,333]],
 [[411,304],[444,325],[444,361],[462,379],[444,412],[400,411],[397,371],[389,347]],
 [[1105,161],[1150,164],[1180,194],[1165,235],[1110,249],[1066,240],[1078,197]],
 [[1109,336],[1149,349],[1148,403],[1123,420],[1097,392]],
 [[1486,303],[1550,280],[1602,302],[1672,274],[1672,465],[1628,464],[1600,429],[1566,420],[1544,391],[1490,409]],
 [[1169,465],[1215,473],[1203,521],[1170,536],[1138,513]],
 [[0,557],[72,549],[128,568],[155,588],[123,614],[64,629],[0,648]],
 [[372,572],[423,593],[456,610],[442,633],[410,616],[373,606]],
 [[757,601],[801,592],[823,615],[804,652],[783,679],[758,679]],
 [[827,557],[866,553],[892,577],[868,600],[836,592]],
 [[872,632],[899,641],[911,671],[881,682],[861,666]],
 [[1583,785],[1623,747],[1672,740],[1672,868],[1618,861],[1574,832]]
].map(polygon);
function blocked(x,y){return vegetationPolygons.some(p=>contains(x,y,p))||propBounds.some(r=>inside(x,y,r))||structureBounds.some(r=>inside(x,y,r)&&!(passages[r.id]||[]).some(p=>inside(x,y,p)));}
function lineY(x){for(let i=1;i<seaShoreLine.length;i++){const a=seaShoreLine[i-1],b=seaShoreLine[i];if(x<=b[0])return a[1]+(b[1]-a[1])*(x-a[0])/(b[0]-a[0]);}return seaShoreLine.at(-1)[1];}
const onHarbor=(x,y)=>!contains(x,y,harborPocketWaterPolygon)&&harborWalkwayPolygons.some(p=>contains(x,y,p));
// Source river mouth reaches the sea near pixel y836 (world y120).
// Only reference zone geography moves; fish IDs/weights/rewards are unchanged.
function water(x,y){if(contains(x,y,practicePondPolygon))return 'practice';if(contains(x,y,lakeWaterPolygon)&&!inside(x,y,lakeDockBounds))return 'lake';if(contains(x,y,riverWaterPolygon)&&!inside(x,y,riverBridgeBounds))return y<120?'river':'sea';if((y>=lineY(x)||contains(x,y,harborPocketWaterPolygon))&&!onHarbor(x,y))return 'sea';return null;}
function walkable(x,y){return Number.isFinite(x)&&Number.isFinite(y)&&x>=2&&x<=238&&y>=2&&y<=133&&!blocked(x,y)&&!water(x,y);}
function segment(x,y,a,b){const n=Math.ceil(Math.hypot(a-x,b-y)/.5);for(let i=0;i<=n;i++)if(!walkable(x+(a-x)*i/(n||1),y+(b-y)*i/(n||1)))return false;return true;}
function rescuePosition(state){
 // Layout migration deliberately returns to a verified connected road even if
 // legacy coordinates happen to be dry. It changes position, never game progress.
 if(state.mapRegion&&state.mapRegion!=='village')return {x:state.x,y:state.y};
 return {...exits.home.return};
}
const geometry={lakeWaterPolygon,riverWaterPolygon,seaShoreLine,harborPocketWaterPolygon,practicePondPolygon,practicePondBounds,riverBridgeBounds,lakeDockBounds,harborWalkwayPolygons,mainShrineApproachBounds,samShopApproachBounds,samShopInteractionBounds,harborCornerPassageBounds,danRaceFront,riaoShopFront,questBoardInteractionBounds,structureBounds};
return {enabled,source,point,polygon,rect,anchor,geometry,landmarks,exits,routes,npc,guide,forage,paths,vegetationPolygons,propBounds,passages,inside,contains,blocked,water,walkable,segment,rescuePosition};
});
