/* v252-48: new rural painting, traced independently of the preserved v252 draft.
 * All coordinates originate in the 1672 x 941 master; no old geometry is reused.
 */
(function(root,factory){
  const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;
  root.ShuRural=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(){
  'use strict';
  const id='ruralCanals',name='田園の用水路・水車小屋',asset='assets/rural-canals-v252-48.webp';
  const size=[1672,941],point=([x,y])=>({x:x/size[0]*240,y:y/size[1]*135});
  const polygon=points=>points.map(p=>{const q=point(p);return [q.x,q.y];});
  const entry={x:114,y:129,direction:'up'},villageReturn={x:214,y:32,direction:'left'};
  // v252-55: center the existing transition on the renewed village lane.
  const villageGate={left:216,right:225,top:29,bottom:35};
  const returnGate={left:108,right:120,top:126,bottom:133};
  const atVillageGate=(x,y)=>Number.isFinite(x)&&Number.isFinite(y)&&x>=villageGate.left&&x<=villageGate.right&&y>=villageGate.top&&y<=villageGate.bottom;
  // The wheel current and reed-fringed backwater are the only fishable waters.
  // Flooded rice paddies and sluices stay solid, never become accidental spots.
  const waters={
    canalCurrent:polygon([[236,203],[329,237],[391,272],[486,296],[582,312],[650,335],[713,360],[752,395],[842,420],[944,440],[1048,440],[1060,468],[1009,496],[937,519],[847,511],[763,498],[704,468],[642,449],[603,415],[556,370],[452,332],[331,300],[260,263],[221,233]]),
    canalBackwater:polygon([[1151,387],[1200,330],[1270,272],[1350,229],[1424,194],[1478,169],[1544,170],[1580,191],[1609,226],[1600,259],[1550,302],[1480,343],[1370,388],[1250,422],[1182,419]])
  };
  const rawTrails=[
    // Southern village road and the level lane below the watermill.
    [[795,930],[803,845],[800,755],[794,682],[795,610]],
    [[795,610],[675,581],[522,565],[390,558],[240,545],[150,500],[108,450],[104,382],[138,301],[168,241],[137,197],[124,165],[142,126],[180,94]],
    // Stone doorstep stops at the closed mill, not inside its painted walls.
    [[390,558],[398,521],[425,486]],
    // South-bank path, bridge deck, then north-bank lane between rice and reeds.
    [[795,610],[949,584],[1095,539],[1196,507],[1175,478]],
    [[1175,478],[1123,456],[1080,441],[1049,428],[1037,395],[1030,355],[1072,312],[1120,252],[1170,199],[1250,158],[1380,123],[1490,94]],
    // East-bank fishing lane; no opening into the surrounding trees.
    [[1196,507],[1240,452],[1370,414],[1490,372],[1586,333]],
    // Two short dry bank approaches, not a broad invisible walkable shore ring.
    [[949,584],[907,553],[865,530]],
    [[1370,414],[1390,397]]
  ];
  const bridges=[{polygon:polygon([[1046,425],[1062,416],[1186,461],[1188,480],[1173,487],[1045,444]])}];
  // Railing feet are not part of the walkable deck. These strips also stop
  // casting rays, so the bridge cannot masquerade as a bank fishing spot.
  const bridgeRails=[polygon([[1037,442],[1175,487],[1175,503],[1035,457]]),
    polygon([[1060,397],[1200,446],[1200,461],[1060,414]])];
  const paddies=[
    [[541,129],[778,66],[940,4],[1170,4],[1258,68],[1131,119],[1019,168],[1004,290],[807,314],[699,254],[588,225]],
    [[161,638],[292,605],[453,617],[647,662],[601,730],[482,766],[268,733],[183,696]],
    [[961,670],[1162,632],[1266,621],[1283,684],[1242,755],[1057,765],[949,733]],
    [[1368,534],[1514,483],[1672,465],[1672,733],[1467,761],[1374,714],[1335,651]]
  ].map(polygon);
  const mill=polygon([[275,367],[370,260],[501,238],[630,300],[703,344],[704,425],[618,472],[423,475],[281,451]]);
  const data={name,asset,entry,returnGate,returnTarget:{region:'village',...villageReturn},waters,
    trails:rawTrails.map(polygon),trailRadii:[4.5,4.1,2.1,4.1,3.0,3.2,2.8,2.8],
    bridges,bankRadius:0,walls:[mill,...paddies,...bridgeRails],landmarks:[],
    notes:{canalCurrent:'水車の流れ。岸際のフナ、底を探るドジョウ、深場のナマズを狙おう。',canalBackwater:'草陰のよどみ。浅場はドジョウとフナ、深場はナマズが多い。'}};
  const names={canalCurrent:'水車下の流れ',canalBackwater:'草陰のよどみ'};
  const populations={
    canalCurrent:[{funa:.65,dojo:.30,namazu:.05},{funa:.55,dojo:.25,namazu:.20},{funa:.25,dojo:.20,namazu:.55}],
    canalBackwater:[{funa:.40,dojo:.55,namazu:.05},{funa:.30,dojo:.45,namazu:.25},{funa:.15,dojo:.20,namazu:.65}]
  };
  const fishingPoints=[{id:'current',type:'canalCurrent',...point([865,530]),direction:'up'},
    {id:'backwater',type:'canalBackwater',...point([1390,397]),direction:'up'}];
  function guideEntries(){return [{id:'village-rural',kind:'exit',name,point:{x:220,y:32},notes:[{text:'村の北東、水車のペットショップ右手にある「田園へ」の道標へ。Aで畦道に入り、南口からいつでも村へ戻れる。'}]}];}
  return {id,name,asset,size,point,entry,villageReturn,villageGate,returnGate,atVillageGate,data,waters,bridges,rawTrails,paddies,mill,bridgeRails,names,populations,fishingPoints,guideEntries};
});
