/* Production-generation storage. Dormant until startup/UI integration is verified.
 * Old releases never know these keys. A lifetime Web Lock excludes new writers.
 * Original and current bytes share one atomic localStorage record; no legacy writes.
 */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.ShuVillageSaveStore=api;
})(typeof globalThis==='object'?globalThis:this,function(){
 'use strict';
 const generation='reference-11016-v1',prefix='nushi-production-'+generation+'-slot';
 const fail=reason=>({ok:false,reason});
 const keyFor=slot=>{if(slot!==1&&slot!==2)throw new TypeError('Invalid slot');return prefix+slot;};
 function decode(raw,slot){
  if(raw===null)return null;
  const e=JSON.parse(raw);
  if(!e||e.generation!==generation||e.slot!==slot||!['active','deleted'].includes(e.status)||
   !(e.originalRaw===null||typeof e.originalRaw==='string')||!(e.currentRaw===null||typeof e.currentRaw==='string')||
   !Number.isSafeInteger(e.revision)||e.revision<0||e.status==='deleted'&&e.currentRaw!==null)throw Error('invalid-record');
  if(e.currentRaw!==null){const s=JSON.parse(e.currentRaw);if(!s||typeof s!=='object'||Array.isArray(s)||s.villageLayoutVersion!==generation||Object.hasOwn(s,'referenceVillageLayout'))throw Error('invalid-current');}
  return e;
 }
 async function acquire({storage,locks,migration,options}){
  if(!locks||typeof locks.request!=='function')return fail('exclusive-lock-unavailable');
  let resolveReady,unlock,alive=false;
  const ready=new Promise(r=>resolveReady=r),held=new Promise(r=>unlock=r);
  try{
   Promise.resolve(locks.request('nushi-production-'+generation,{mode:'exclusive',ifAvailable:true},async lock=>{
    if(!lock){resolveReady(fail('another-tab-open'));return;}
    alive=true;
    const expected=new Map();
    function record(slot){const raw=storage.getItem(keyFor(slot));return {raw,envelope:decode(raw,slot)};}
    function legacy(slot){return storage.getItem(migration.keyFor(slot));}
    function check(slot){
     if(!alive)return fail('session-closed');
     const current=record(slot);
     if(expected.has(slot)&&expected.get(slot)!==current.raw)return fail('generation-changed');
     if(current.envelope&&legacy(slot)!==(Object.hasOwn(current.envelope,'baselineRaw')?current.envelope.baselineRaw:current.envelope.originalRaw))return fail('legacy-changed');
     return {ok:true,...current};
    }
    function read(slot){try{const c=check(slot);if(!c.ok)return c;expected.set(slot,c.raw);return {ok:true,exists:!!c.envelope&&c.envelope.currentRaw!==null,raw:c.envelope?.currentRaw??null,deleted:c.envelope?.status==='deleted'};}catch(_){return fail('unreadable-record');}}
    function importSlot(slot){try{
     const c=check(slot);if(!c.ok)return c;if(c.envelope){expected.set(slot,c.raw);return read(slot);}
     const plan=migration.prepareSlot(storage,slot,options);if(!plan.ok)return plan;
     if(legacy(slot)!==plan.beforeRaw)return fail('legacy-changed');
     // No asynchronous gap; original and migrated bytes commit together.
     const raw=JSON.stringify({generation,slot,status:'active',revision:0,originalRaw:plan.beforeRaw,currentRaw:plan.afterRaw});
     storage.setItem(keyFor(slot),raw);expected.set(slot,raw);
     return read(slot);
    }catch(_){return fail('import-storage-failed');}}
    function replace(slot,currentRaw,status){try{
     const c=check(slot);if(!c.ok)return c;if(!c.envelope||!expected.has(slot))return fail('slot-not-open');
     const raw=JSON.stringify({...c.envelope,currentRaw,status,revision:c.envelope.revision+1});decode(raw,slot);
     storage.setItem(keyFor(slot),raw);expected.set(slot,raw);return {ok:true};
    }catch(_){return fail('save-storage-failed');}}
    function write(slot,raw){if(typeof raw!=='string')return fail('invalid-save');return replace(slot,raw,'active');}
    function remove(slot){return replace(slot,null,'deleted');}
    // UI must show/export both branches and obtain the player's explicit choice.
    function inspectRecovery(slot){try{if(!alive)return fail('session-closed');const c=record(slot);if(!c.envelope)return fail('slot-not-open');return {ok:true,slot,generationRaw:c.raw,legacyRaw:legacy(slot),originalRaw:c.envelope.originalRaw,currentRaw:c.envelope.currentRaw};}catch(_){return fail('unreadable-record');}}
    function resolveRecovery(snapshot,choice){try{
     if(!alive)return fail('session-closed');if(!snapshot?.ok||!['current','legacy'].includes(choice))return fail('explicit-choice-required');
     const slot=snapshot.slot,c=record(slot),old=legacy(slot);
     if(!c.envelope||c.raw!==snapshot.generationRaw||old!==snapshot.legacyRaw)return fail('recovery-snapshot-changed');
     let currentRaw=c.envelope.currentRaw,status=c.envelope.status;
     if(choice==='legacy'){const plan=migration.plan(old,options);if(!plan.ok)return plan;currentRaw=plan.afterRaw;status='active';}
     const e={...c.envelope,baselineRaw:old,currentRaw,status,revision:c.envelope.revision+1,
      recoveryHistory:[...(c.envelope.recoveryHistory||[]),{legacyRaw:old,currentRaw:c.envelope.currentRaw,choice}]};
     const raw=JSON.stringify(e);decode(raw,slot);storage.setItem(keyFor(slot),raw);expected.set(slot,raw);return read(slot);
    }catch(_){return fail('recovery-storage-failed');}}
    function close(){alive=false;unlock();}
    resolveReady({ok:true,read,importSlot,write,remove,inspectRecovery,resolveRecovery,close,keyFor});
    await held;alive=false;
   })).catch(()=>{alive=false;resolveReady(fail('exclusive-lock-failed'));});
  }catch(_){resolveReady(fail('exclusive-lock-failed'));}
  return ready;
 }
 return Object.freeze({generation,keyFor,acquire});
});
