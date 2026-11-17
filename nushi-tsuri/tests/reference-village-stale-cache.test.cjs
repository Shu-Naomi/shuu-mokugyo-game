'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const harnessPath=require.resolve('./game-harness.cjs');
const oldSave=fs.readFileSync(path.join(__dirname,'fixtures/reference-baseline-save-slots-f220d0a.js'),'utf8');
function harness(replaceSave,controller=false){
 const original=fs.readFileSync;
 try{
  fs.readFileSync=function(file,...args){
   const source=original.call(this,file,...args);
   if(String(file).endsWith('/save-slots.js')&&replaceSave)return replaceSave(source);
   if(String(file).endsWith('/village-reference.js')&&controller)return source+'\nObject.defineProperty(navigator,"serviceWorker",{value:{controller:{},register:()=>Promise.resolve()}});';
   return source;
  };
  delete require.cache[harnessPath];return require(harnessPath);
 }finally{fs.readFileSync=original;delete require.cache[harnessPath];}
}
test('frozen non-isolating save module is the exact main blob',()=>{
 const bytes=Buffer.from(oldSave);assert.equal(crypto.createHash('sha1').update(Buffer.from(`blob ${bytes.length}\0`)).update(bytes).digest('hex'),'e27b1d99589353add7f891f4199b8979fe4d3fd8');
});
for(const [label,replacement,controller] of [
 ['old cached save module',()=>oldSave,false],
 ['missing save module',()=>'',false],
 ['wrong second-slot key',s=>s.replace("2:'nushi-reference-village-pilot-v1-slot2'","2:'nushi-inugoya-v2-slot2'"),false],
 ['wrong last-slot key',s=>s.replace("preview?'nushi-reference-village-pilot-v1-last-slot'","preview?'nushi-inugoya-last-slot'"),false],
 ['already controlling service worker',null,true]
])test('preview fails closed with '+label,async()=>{
 const {boot,seed}=harness(replacement,controller),first=JSON.stringify({...seed(),x:74,y:39.5}),second=JSON.stringify({...seed(),money:6789});
 const storage={'nushi-inugoya-v2':first,'nushi-inugoya-v2-slot2':second,'nushi-inugoya-last-slot':'2'};
 const app=boot(null,undefined,{url:'http://localhost/nushi-tsuri/?villageReference=1&saveSlot=2&play=1',storage,start:false});
 try{
  const w=app.window,screen=w.document.querySelector('#villageReferenceLoadFailure');
  assert.ok(screen);assert.match(screen.textContent,/保存データを守るため起動を止めました/);
  assert.equal(app.errors.length,1);assert.match(app.errors[0],/Reference village safety check blocked startup/);
  assert.throws(()=>w.eval('saveSlots'),/before initialization|not defined/);
  assert.equal(w.document.querySelector('#villageReferenceNotice'),null);
  for(const type of ['click','keydown'])w.document.dispatchEvent(new w.Event(type,{bubbles:true,cancelable:true}));
  await new Promise(resolve=>setTimeout(resolve,20));
  for(const [key,raw]of Object.entries(storage))assert.equal(w.localStorage.getItem(key),raw,key+' stays byte-identical');
  assert.equal(w.localStorage.getItem('nushi-reference-village-pilot-v1-slot1'),null,'no import before safety guard');
 }finally{app.dispose();}
});
test('ordinary mode keeps working with the old module and a controller',()=>{
 const app=harness(()=>oldSave,true).boot();
 try{assert.deepEqual(app.errors,[]);assert.equal(app.window.eval('gameStarted'),true);assert.equal(app.window.document.querySelector('#villageReferenceLoadFailure'),null);}
 finally{app.dispose();}
});
