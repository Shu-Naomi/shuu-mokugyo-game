/* Two real catches per species: its first catch and its current size record.
 * Old saves retain their results; missing circumstances are never invented. */
(function(root,factory){
  const api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;
  else root.ShuCatchMemories=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(){
  'use strict';
  const object=value=>value&&typeof value==='object'&&!Array.isArray(value);
  const owns=(table,id)=>typeof id==='string'&&Object.prototype.hasOwnProperty.call(table,id);
  function snapshot(value,fishId,catalog){
    if(!object(value)||!owns(catalog.sizes,fishId))return null;
    const tier=catalog.sizes[fishId].find(t=>Number.isSafeInteger(value.hundredths)&&
      value.hundredths>=t.minHundredths&&value.hundredths<=t.maxHundredths);
    if(!tier||!Number.isSafeInteger(value.gameMinutes)||value.gameMinutes<0||
       !owns(catalog.rods,value.rodId)||!owns(catalog.baits,value.baitId)||
       !owns(catalog.spots,value.spotId)||!['bait','lure'].includes(value.method)||
       !['gauge','nushi'].includes(value.fightMode)||
       (value.method==='bait'&&!owns(catalog.hooks,value.hookId)))return null;
    return {hundredths:value.hundredths,tierId:tier.id,gameMinutes:value.gameMinutes,
      spotId:value.spotId,castLocale:['lake','river','beach','harbor','sea','coast-sand','coast-reef'].includes(value.castLocale)?value.castLocale:'',
      rodId:value.rodId,baitId:value.baitId,hookId:value.method==='bait'?value.hookId:'',
      method:value.method,fightMode:value.fightMode,
      weatherId:owns(catalog.weather,value.weatherId)?value.weatherId:'',
      dogId:owns(catalog.dogs,value.dogId)?value.dogId:''};
  }
  function normalize(value,state,catalog){
    const result={};
    if(!object(value))return result;
    for(const fishId of Object.keys(catalog.sizes)){
      if(!(Number(state.caught?.[fishId])>0)||!object(value[fishId]))continue;
      const first=snapshot(value[fishId].first,fishId,catalog);
      const candidate=snapshot(value[fishId].best,fishId,catalog);
      const maximum=Number(state.sizeRecords?.[fishId]?.hundredths);
      const best=candidate&&candidate.hundredths===maximum?candidate:null;
      if(first||best)result[fishId]={first,best};
    }
    return result;
  }
  function record(state,fishId,value,flags,catalog){
    const entry=snapshot(value,fishId,catalog);
    if(!entry||!(Number(state.caught?.[fishId])>0))return false;
    if(!object(state.catchMemories))state.catchMemories={};
    const before=state.catchMemories[fishId]||{first:null,best:null};
    const first=flags.first&&!before.first?{...entry}:before.first;
    const best=flags.best?{...entry}:before.best;
    if(first===before.first&&best===before.best)return false;
    state.catchMemories[fishId]={first,best};
    return true;
  }
  return {normalize,record};
});
