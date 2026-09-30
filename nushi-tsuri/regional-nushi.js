/* v202: regional catch evidence and distinct fictional legendary fish. */
(function(root,factory){const api=factory();if(typeof module==="object"&&module.exports)module.exports=api;
  if(root)root.ShuRegional=api;
})(typeof globalThis!=="undefined"?globalThis:this,function(){
  "use strict";
  const bosses={
    streamNushi:{name:"渓流のヌシ",region:"stream",asset:"assets/stream-nushi-v202.png",price:3600,resistance:190,strength:3.2,minStrength:2.4,
      lengths:[[75,90],[90,110],[110,140],[140,170],[170,205],[205,250]],base:"yamame"},
    coastNushi:{name:"沿岸のヌシ",region:"coast",asset:"assets/coast-nushi-v202.png",price:5200,resistance:225,strength:3.8,minStrength:3,
      lengths:[[90,115],[115,145],[145,180],[180,220],[220,265],[265,320]],base:"kurodai"},
    caveNushi:{name:"地底湖のヌシ",region:"cave",asset:"assets/cave-nushi-v202.png",price:6800,resistance:250,strength:4.4,minStrength:3.4,
      lengths:[[120,150],[150,185],[185,230],[230,280],[280,340],[340,410]],base:"namazu"},
    starNushi:{name:"星降るヌシ",region:"lake",asset:"assets/star-nushi-v202.png",price:15000,resistance:320,strength:6,minStrength:4,
      lengths:[[260,330],[330,410],[410,510],[510,620],[620,740],[740,900]],base:"nushi"},
  };
  const ordinary={stream:["yamame","nijimasu","ayu","moroko","unagi","namazu","funa","koi","bass"],
    coast:["aji","shirogisu","bora","hirame","suzuki","madai","kasago","mebaru","ainame","kurodai"],
    cave:["funa","koi","namazu","unagi"]};
  const fish=Object.entries(bosses).map(([id,f])=>({id,name:f.name,price:f.price,resistance:f.resistance,w:0,icon:"🐋",shadowRow:4,legendary:true}));
  const descriptions={
    streamNushi:{habitats:["river"],locations:"星見渓流・淵の深場",ecology:"このゲームに登場する架空の巨大な渓流魚。青緑の背と銀色の斑点を持ち、速い流れの底で長い年月を過ごす。",tip:"渓流の川・池・沼で通常の魚を一通り釣り、流れの深い淵を探ってみよう。",rods:["starGazer","shoreReed","tideMaster"],baits:["river","worm","star"]},
    coastNushi:{habitats:["sea"],locations:"沿岸の小島・深場",ecology:"このゲームに登場する架空の巨大な海の魚。濃紺と銅色の鱗をまとい、白砂と岩礁の小島の間を静かに巡る。",tip:"沿岸で通常の魚を一通り釣ったら、小島の沖の深場へ。丈夫な海用の竿と大きな針で挑もう。",rods:["shoreReed","tideMaster"],baits:["shrimp","shell","star"]},
    caveNushi:{habitats:["lake"],locations:"岩窟の地下湖・深場",ecology:"このゲームに登場する架空の巨大な洞窟魚。淡い真珠色の体と長いひげを持つ。地下湖の底で水のわずかな動きを感じ取る。",tip:"地下湖に暮らす通常の四種類を釣ったら、さらに深い水へ。大きな体の深潜りを落ち着いていなそう。",rods:["tideMaster","starGazer"],baits:["worm","star"]},
    starNushi:{habitats:["lake"],locations:"夜の星降る湖・沖の深場",ecology:"このゲームに登場する架空の最後のヌシ。夜空のような鱗と長い銀色のひれを持つ、ひときわ巨大な魚。星湖のヌシとは別の存在。",tip:"渓流・沿岸・地底湖の三匹のヌシを釣った夜、星降る湖の深場を探ろう。星湖秘伝の餌にも反応する。",rods:["tideMaster","starGazer"],baits:["star","nushiSecret"]},
  };
  const encyclopedia=Object.fromEntries(Object.entries(descriptions).map(([id,d],i)=>[id,{...d,number:21+i,
    scientific:"架空の魚",rarity:5,rarityLabel:id==="starNushi"?"星降る湖の最後のヌシ":"地域のヌシ",time:id==="starNushi"?"夜":"いつでも"}]));
  const record=v=>v&&typeof v==="object"&&!Array.isArray(v)?v:{};
  function regionForSpot(spotId=""){
    if(/^mountain-(stream|pond|marsh)-/.test(spotId))return "stream";
    if(/^mountain-underground-/.test(spotId))return "cave";
    if(/^coast-(sand|reef)-/.test(spotId))return "coast";
    return null;
  }
  function normalize(state){
    const old=record(state.regionalCaught),next={};
    for(const [region,ids] of Object.entries(ordinary)){
      const source=record(old[region]);next[region]={};
      for(const id of ids){const n=Number(source[id]);if(Number.isFinite(n)&&n>0)next[region][id]=Math.min(999999,Math.floor(n));}
    }
    // Migrate explicit v201 locations once. Never guess the region of old catches.
    if(state.regionalCatchVersion!==1)for(const [id,r] of Object.entries(record(state.fishCatchRecords))){
      const region=regionForSpot(r?.last?.spotId);
      if(region&&ordinary[region].includes(id)&&state.caught?.[id]>0)next[region][id]=Math.max(1,next[region][id]||0);
    }
    state.regionalCaught=next;state.regionalCatchVersion=1;return state;
  }
  function recordCatch(state,fishId,context={}){
    if(context.practice)return false;
    const region=regionForSpot(context.spot);
    if(!region||!ordinary[region].includes(fishId))return false;
    state.regionalCaught||={};state.regionalCaught[region]||={};
    state.regionalCaught[region][fishId]=Math.min(999999,(state.regionalCaught[region][fishId]||0)+1);return true;
  }
  function complete(state,region){return !!ordinary[region]?.every(id=>state.regionalCaught?.[region]?.[id]>0);}
  function finalReady(state){return ["streamNushi","coastNushi","caveNushi"].every(id=>state.caught?.[id]>0);}
  function candidates(state,spotId,period,practice=false){
    if(practice)return {};
    if(spotId==="mountain-stream-deep"&&complete(state,"stream"))return {streamNushi:.075};
    if(/^coast-(sand|reef)-deep$/.test(spotId)&&complete(state,"coast"))return {coastNushi:.065};
    if(spotId==="mountain-underground-deep"&&complete(state,"cave"))return {caveNushi:.09};
    if(spotId==="lake-deep"&&period==="night"&&finalReady(state))return {starNushi:.06};return {};
  }
  function legendary(id){return id==="nushi"||Object.hasOwn(bosses,id);}
  return {bosses,ordinary,fish,encyclopedia,regionForSpot,normalize,recordCatch,complete,finalReady,candidates,legendary};
});
