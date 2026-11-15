/* Opt-in CI rehearsal startup only. Does not load on the ordinary game page. */
(async function(){
 'use strict';
 let session,started=false,closed=false,modal;
 const keys=[1,2],migration=globalThis.ShuVillageSaveMigration;
 function screen(text){
  if(started)globalThis.ShuVillageSaveRuntime?.suspend();
  if(!modal){modal=document.createElement('div');modal.id='villageSaveGate';modal.setAttribute('role','dialog');modal.setAttribute('aria-modal','true');modal.style.cssText='position:fixed;inset:0;z-index:2147483647;background:#172a35;color:#fff1c7;padding:16px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:10px;font:16px sans-serif';document.body.append(modal);for(const type of ['keydown','keyup'])modal.addEventListener(type,e=>e.stopPropagation());}
  if(!modal.isConnected)document.body.append(modal);
  modal.replaceChildren();const p=document.createElement('p');p.textContent=text;modal.append(p);return modal;
 }
 function button(text,fn){const b=document.createElement('button');b.textContent=text;b.onclick=fn;modal.append(b);}
 function snapshot(slot){return session.inspectRecovery(slot);}
 function conflict(slot){
  const s=snapshot(slot);if(!s.ok){screen('保存を安全に読めません。元データは変更していません。');return;}
  screen('別の旧版タブで保存が変わりました。旧版タブを閉じてください。両方の冒険は残っています。保存ファイルを書き出してから、続ける冒険を選べます。');
  button('両方のセーブを書き出す',()=>{const blob=new Blob([JSON.stringify(s,null,2)],{type:'application/json'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='starfall-save-recovery-slot'+slot+'.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);});
  for(const [choice,label]of [['current','新しい村の冒険を続ける'],['legacy','旧版で最後に保存した冒険を移行する']])button(label,()=>{
   const result=session.resolveRecovery(s,choice);if(!result.ok){screen('選択中に保存が変わったか、保存できませんでした。データは削除していません。');button('もう一度確認',()=>conflict(slot));return;}
   // Never continue using the pre-recovery in-memory game state.
   session.close();closed=true;location.reload();
  });
 }
 function blocked(reason){
  if(closed)return;for(const slot of keys){const r=session?.read?.(slot);if(r?.reason==='legacy-changed'){conflict(slot);return;}}
  screen('保存保護のため停止しました（'+reason+'）。このタブを閉じ、ほかのゲームのタブも閉じてから開き直してください。保存は削除していません。');
 }
 screen('セーブを保護して村を準備しています…');
 if(globalThis.ShuVillageReleaseCandidate){
  const check=await globalThis.ShuVillageReleaseVerifier?.verify();
  if(!check?.ok){blocked(check?.reason||'release-verifier-missing');return;}
 }else if(navigator.serviceWorker?.controller){blocked('起動条件不一致');return;}
 if(!globalThis.ShuVillageReference?.enabled||!migration){blocked('起動条件不一致');return;}
 session=await ShuVillageSaveStore.acquire({storage:localStorage,locks:navigator.locks,migration,options:{reference:ShuVillageReference,otherRegions:['coast','offshore','stream','mountainPond','mountainMarsh','wetland','cave','ruralCanals']}});
 if(!session.ok){blocked(session.reason);return;}
 for(const slot of keys){const r=session.importSlot(slot);if(!r.ok){if(r.reason==='invalid-or-ambiguous-json'||r.reason==='invalid-save-root')continue;if(r.reason==='legacy-changed')conflict(slot);else blocked(r.reason);return;}}
 const adapter=ShuVillageSaveAdapter.create(session,()=>localStorage,blocked);
 globalThis.ShuVillageProductionSession=session;
 globalThis.ShuSaveSlots={...ShuSaveSlots,create:()=>adapter};
 // Input shield must also stop keyboard controls, not only pointer clicks.
 for(const type of ['keydown','keyup','pointerdown','pointerup','touchstart','touchend'])window.addEventListener(type,e=>{if(modal?.isConnected&&!modal.contains(e.target)){e.stopImmediatePropagation();e.preventDefault();}},{capture:true,passive:false});
 window.addEventListener('storage',e=>{if(e.storageArea===localStorage)for(const slot of keys){const r=session.read(slot);if(!r.ok){blocked(r.reason);break;}}});
 // The game registers its existing pagehide final-save handler during runtime.
 window.addEventListener('pageshow',e=>{if(e.persisted){closed=true;screen('再開前に保存を確認します。');location.reload();}});
 modal.remove();const script=document.createElement('script');script.textContent=document.getElementById('villageDeferredRuntime').textContent;document.body.append(script);started=true;
 // Registered after the game: flush its pending final save before releasing ownership.
 window.addEventListener('pagehide',()=>{closed=true;session.close();});
 globalThis.ShuVillageReleaseGate={started,adapter};
})().catch(()=>{const p=document.createElement('p');p.textContent='村の安全な起動に失敗しました。このタブを閉じてください。';document.body.append(p);});
