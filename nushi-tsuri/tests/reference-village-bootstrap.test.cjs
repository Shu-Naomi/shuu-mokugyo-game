const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
// Rebuild the normal game harness with only the new reference module missing,
// as it would be in an older offline cache. All other real game scripts stay.
const harnessPath=require.resolve('./game-harness.cjs');
const originalRead=fs.readFileSync;
let harness;
try{
 fs.readFileSync=function(file,...args){
  if(String(file).endsWith('/village-reference.js'))return '/* intentionally unavailable offline */';
  return originalRead.call(this,file,...args);
 };
 delete require.cache[harnessPath];
 harness=require(harnessPath);
}finally{fs.readFileSync=originalRead;delete require.cache[harnessPath];}
test('normal offline game boots safely when optional reference module is missing',()=>{
 const app=harness.boot();
 try{
  assert.deepEqual(app.errors,[]);
  assert.equal(app.window.ShuVillageReference.enabled,false);
  assert.equal(app.window.ShuVillageReference.moduleLoadFailed,true);
  assert.equal(app.window.document.querySelector('#villageReferenceLoadFailure'),null);
  assert.equal(app.window.eval('gameStarted'),true);
  assert.equal(app.window.ShuSceneLayers.get('world').source,'assets/village-world-v252-55-riao-clear.png');
 }finally{app.dispose();}
});
test('requested reference preview fails visibly and blocks play when module is missing',()=>{
 const app=harness.boot(undefined,undefined,{url:'http://localhost/nushi-tsuri/?villageReference=1',start:false});
 try{
  assert.equal(app.errors.length,1);assert.match(app.errors[0],/Reference village safety check blocked startup/);
  const screen=app.window.document.querySelector('#villageReferenceLoadFailure');
  assert.ok(screen);assert.equal(screen.getAttribute('role'),'alertdialog');
  assert.match(screen.textContent,/読み込めません/);
  assert.equal(app.window.document.querySelector('#villageReferenceNotice'),null);
  let received=false;app.window.document.addEventListener('keydown',()=>{received=true;});
  app.window.document.dispatchEvent(new app.window.KeyboardEvent('keydown',{key:'ArrowRight',bubbles:true,cancelable:true}));
  assert.equal(received,false);
 }finally{app.dispose();}
});
