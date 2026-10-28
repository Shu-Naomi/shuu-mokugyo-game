/* The notebook records observed species; living specimen data stays in petLife. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.ShuPetNotebook=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(){
  'use strict';
  const VERSION=1;
  const dayOf=day=>Number.isInteger(day)&&day>=0?day:0;
  const owned=state=>state.petNotebook?.version===VERSION&&Number.isInteger(state.petNotebook.receivedDay)&&state.petNotebook.receivedDay>=0&&Array.isArray(state.petNotebook.species);
  function normalize(state,catalog,day){
    const value=state.petNotebook;if(!value||value.version!==VERSION)return null;
    const today=dayOf(day),ids=new Set(catalog.map(f=>f.id)),seen=new Set();
    state.petNotebook={version:VERSION,receivedDay:Math.min(today,dayOf(value.receivedDay)),source:value.source==='purchase'?'purchase':'existing',announced:value.announced===true,
      species:(Array.isArray(value.species)?value.species:[]).slice(0,256).flatMap(row=>{
        if(!ids.has(row?.id)||seen.has(row.id))return [];seen.add(row.id);
        return [{id:row.id,firstRecordedDay:Math.max(Math.min(today,dayOf(value.receivedDay)),Math.min(today,dayOf(row.firstRecordedDay)))}];
      })};
    observe(state,catalog,today);return state.petNotebook;
  }
  function observe(state,catalog,day){
    if(!owned(state))return false;
    const book=state.petNotebook,ids=new Set(catalog.map(f=>f.id)),seen=new Set(book.species.filter(row=>row&&typeof row.id==='string').map(row=>row.id));let changed=false;
    // A discovery is explicit historical evidence. Its original first day stays
    // in mutationDiscoveries; this ledger says when the notebook recorded it.
    for(const f of [...(state.petLife?.fish||[]),...(state.petLife?.mutationDiscoveries||[])]){
      const id=f.species;if(!ids.has(id)||seen.has(id))continue;seen.add(id);
      book.species.push({id,firstRecordedDay:Math.max(book.receivedDay,dayOf(day))});changed=true;
    }
    return changed;
  }
  function canReceive(state,catalog){
    return !state.petNotebook&&(state.petLife?.fish||[]).some(f=>catalog.some(s=>s.id===f.species&&!s.legendary&&s.id!=='nushi'));
  }
  function grant(state,catalog,day,source='purchase'){
    // An unknown future notebook is kept intact, never replaced by this version.
    if(state.petNotebook)return false;
    if(source!=='purchase'&&!canReceive(state,catalog))return false;
    state.petNotebook={version:VERSION,receivedDay:dayOf(day),source:source==='purchase'?'purchase':'existing',announced:false,species:[]};
    observe(state,catalog,day);return true;
  }
  function acknowledge(state,persist){
    if(!owned(state)||state.petNotebook.announced)return false;
    const book=state.petNotebook;book.announced=true;
    try{if(persist()===true)return true;}catch{}
    book.announced=false;return false;
  }
  return Object.freeze({VERSION,owned,normalize,observe,canReceive,grant,acknowledge});
});
