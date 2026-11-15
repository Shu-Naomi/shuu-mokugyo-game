/* Synchronous game-facing adapter, created only after the asynchronous lock.
 * Dormant: not imported by index.html until startup and recovery UI are ready. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.ShuVillageSaveAdapter=api;
})(typeof globalThis==='object'?globalThis:this,function(){
 'use strict';
 function create(session,getStorage=()=>globalThis.localStorage,onFailure=()=>{}){
  if(!session?.ok)throw Error('Exclusive production save session required');
  let lastError=null,selected=1;const selectionKey='nushi-production-reference-11016-v1-last-slot';
  function failed(reason){lastError=reason;onFailure(reason);}
  const id=v=>v===1||v==='1'?1:v===2||v==='2'?2:null;
  function slot(v){const s=id(v);if(!s)throw Error('Invalid save slot');return s;}
  function raw(v){const result=session.importSlot(slot(v));if(!result.ok)failed(result.reason);return result;}
  function read(v){const r=raw(v);if(!r.ok)return {ok:false,exists:true,error:r.reason};try{return {ok:true,exists:r.exists,data:r.raw===null?{}:JSON.parse(r.raw)};}catch(_){failed('invalid');return {ok:false,exists:true,error:'invalid'};}}
  function capture(v){const r=raw(v);return r.ok?{ok:true,raw:r.raw}:{ok:false};}
  function write(v,data){try{const r=raw(v);if(!r.ok)return false;const result=session.write(slot(v),JSON.stringify({...data,villageLayoutVersion:'reference-11016-v1'}));if(!result.ok)failed(result.reason);return result.ok===true;}catch(_){failed('invalid');return false;}}
  function writeNew(v,data){const r=raw(v);return r.ok&&r.raw===null?write(v,data):false;}
  function writeIfUnchanged(v,data,expected){const r=raw(v);return typeof expected==='string'&&r.ok&&r.raw===expected?write(v,data):false;}
  function remove(v,expected){const r=raw(v);if(typeof expected!=='string'||!r.ok||r.raw!==expected)return false;const result=session.remove(slot(v));if(!result.ok)failed(result.reason);return result.ok===true;}
  return {read,capture,write,writeNew,writeIfUnchanged,remove,keyFor:v=>session.keyFor(slot(v)),
   initial:query=>{const q=id(new URLSearchParams(query).get('saveSlot'));if(q)return q;try{return id(getStorage().getItem(selectionKey))||id(getStorage().getItem('nushi-inugoya-last-slot'))||selected;}catch(_){return selected;}},
   remember:v=>{const s=id(v);if(!s||!raw(s).ok)return false;try{getStorage().setItem(selectionKey,String(s));selected=s;return true;}catch(_){failed('selection-storage-failed');return false;}},
   error:()=>lastError,close:()=>session.close()};
 }
 return Object.freeze({create});
});
