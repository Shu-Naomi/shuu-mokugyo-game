'use strict';
const {test}=require('node:test'),a=require('node:assert/strict'),fs=require('fs'),path=require('path');
test('rehearsal builds from source template without mutating generated production or source',()=>{
 const root=path.join(__dirname,'..'),productionPath=path.join(root,'index.html'),templatePath=path.join(root,'tools/templates/game-index.html');
 const production=fs.readFileSync(productionPath,'utf8'),template=fs.readFileSync(templatePath,'utf8'),build=require('../tools/build-village-release-rehearsal.cjs'),html=build();
 a.equal(fs.readFileSync(productionPath,'utf8'),production);
 a.equal(fs.readFileSync(templatePath,'utf8'),template);
 a.doesNotMatch(template,/<script type="text\/plain" id="villageDeferredRuntime">/);
 for(const output of [html,production]){
  a.match(output,/<script type="text\/plain" id="villageDeferredRuntime">/);
  a.match(output,/if \(!globalThis.ShuVillageProductionSession\)/);
  a.match(output,/enabled&&!globalThis.ShuVillageProductionSession&&s.referenceVillageLayout/);
  a.match(output,/src="village-release-gate.js/);
  a.match(output,/globalThis.ShuVillageRuntimeReady = true;\s*<\/script>/);
 }
 a.doesNotMatch(html,/ShuVillageReleaseCandidate = config/);
 a.match(production,/ShuVillageReleaseCandidate = config/);
});
test('gate starts only after lock and imports and restores BFCache via reload',()=>{const s=fs.readFileSync(path.join(__dirname,'../village-release-gate.js'),'utf8');a.ok(s.indexOf('await ShuVillageSaveStore.acquire')<s.indexOf("const script=document.createElement('script')"));a.match(s,/navigator.serviceWorker\?\.controller/);a.match(s,/pagehide[\s\S]*session.close\(\)/);a.match(s,/pageshow[\s\S]*e.persisted[\s\S]*location.reload\(\)/);a.match(s,/recovery-slot/);});

test('returned modal is reattached and its keyboard events do not reach gameplay',()=>{const s=fs.readFileSync(path.join(__dirname,'../village-release-gate.js'),'utf8');a.match(s,/if\(!modal.isConnected\)document.body.append\(modal\)/);a.match(s,/modal.addEventListener\(type,e=>e.stopPropagation\(\)\)/);a.match(s,/session\?\.read\?\.\(slot\)/);});

test('selected production save read failure aborts before initialization rather than replacing it with defaults',()=>{
 const vm=require('node:vm'),source=fs.readFileSync(path.join(__dirname,'../tools/templates/game-index.html'),'utf8');
 const guard=source.match(/if\(globalThis\.ShuVillageProductionSession&&!loadedSaveSlot\.ok\)throw Error\('Initial save read blocked'\);/);
 a.ok(guard,'source template has explicit initial save failure guard');
 a.ok(source.indexOf(guard[0])<source.indexOf('let selectedSaveSlot ='),'guard precedes mutable game initialization');
 for(const loadedSaveSlot of [{ok:false,reason:'invalid-save-root'},{ok:false,reason:'read-failed'}])a.throws(()=>vm.runInNewContext(guard[0],{ShuVillageProductionSession:{},loadedSaveSlot}),/Initial save read blocked/);
 a.doesNotThrow(()=>vm.runInNewContext(guard[0],{ShuVillageProductionSession:{},loadedSaveSlot:{ok:true,exists:false}}));
});
