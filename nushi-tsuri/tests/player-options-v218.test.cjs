const {test}=require('node:test'),assert=require('node:assert/strict');
const Options=require('../player-options.js'),Slots=require('../save-slots.js');
const {boot,seed,read,saveKey}=require('./game-harness.cjs');
const click=(w,id)=>w.document.querySelector(id).click();
const input=(w,id,value)=>{const el=w.document.querySelector(id);el.value=value;el.dispatchEvent(new w.Event('input',{bubbles:true}));};
const rename=(w,value)=>{input(w,'#optionsPlayerName',value);w.document.querySelector('#optionsNameForm').dispatchEvent(new w.Event('submit',{cancelable:true}));};
const confirm=(w)=>{const box=w.document.querySelector('#optionsDeleteCheck');box.checked=true;box.dispatchEvent(new w.Event('change'));click(w,'#optionsDeleteConfirm');};
const secondKey=Slots.keys[2];

test('new adventures choose a name and gender, save once, and keep gender after unlimited renames and resume',()=>{
 const app=boot(null,undefined,{start:false}),w=app.window;let saved;
 try{
  input(w,'#titlePlayerName','直美');click(w,'[data-avatar="girl"]');click(w,'#start');click(w,'#lakeIntroSkip');
  assert.equal(read(w,'s.playerName'),'直美');assert.equal(read(w,'s.avatar'),'girl');
  assert.ok(w.openOptions());const original=read(w,'({money:s.money,baits:s.baits,caught:s.caught,dog:s.dog})');
  for(const value of ['なおみ','星の旅人','直美♡']){rename(w,value);assert.equal(read(w,'s.playerName'),value);assert.equal(read(w,'s.avatar'),'girl');}
  assert.deepEqual(read(w,'({money:s.money,baits:s.baits,caught:s.caught,dog:s.dog})'),original);
  click(w,'[data-avatar="boy"]');assert.equal(read(w,'s.avatar'),'girl');saved=JSON.parse(w.localStorage.getItem(saveKey));assert.deepEqual(app.errors,[]);
 }finally{app.dispose();}
 const resumed=boot(saved,undefined,{url:'http://localhost/nushi-tsuri/?play=1&avatar=boy&playerName=bad'});
 try{assert.equal(read(resumed.window,'s.avatar'),'girl');assert.equal(read(resumed.window,'s.playerName'),'直美♡');assert.deepEqual(resumed.errors,[]);}finally{resumed.dispose();}
});

test('legacy gender is fixed, preview is read only, empty drafts and named second-slot launch remain independent',()=>{
 const old={...seed(),avatar:'girl'},app=boot(old,undefined,{start:false}),w=app.window;let target;
 try{
  const raw=w.localStorage.getItem(saveKey);assert.equal(w.document.querySelector('[data-avatar="boy"]').disabled,true);
  click(w,'[data-avatar="boy"]');assert.equal(w.localStorage.getItem(saveKey),raw);w.navigateToSaveSlot=url=>target=url;
  click(w,'[data-save-slot="2"]');input(w,'#titlePlayerName','イワナ子');click(w,'[data-avatar="girl"]');
  click(w,'[data-save-slot="1"]');click(w,'[data-save-slot="2"]');assert.equal(w.document.querySelector('#titlePlayerName').value,'イワナ子');
  click(w,'#start');assert.equal(w.localStorage.getItem(saveKey),raw);assert.equal(w.localStorage.getItem(secondKey),null);assert.equal(Slots.launchSettings(new URL(target).search).playerName,'イワナ子');
  assert.deepEqual(app.errors,[]);
 }finally{app.dispose();}
 const app2=boot(old,undefined,{url:target});try{assert.equal(read(app2.window,'s.playerName'),'イワナ子');assert.equal(read(app2.window,'s.avatar'),'girl');assert.equal(app2.window.localStorage.getItem(saveKey),JSON.stringify(old));}finally{app2.dispose();}
});

test('name validation handles graphemes and markup safely, and a storage failure rolls back a rename',()=>{
 assert.equal(Options.validName('👩‍👩‍👧‍👦'.repeat(12)),true);assert.equal(Options.validName('あ'.repeat(13)),false);assert.equal(Options.validName('  '),false);
 const app=boot(),w=app.window;const original=w.Storage.prototype.setItem;
 try{
  w.openOptions();rename(w,'<img src=x>');assert.equal(read(w,'s.playerName'),'<img src=x>');assert.equal(w.document.querySelector('#optionsSaveList img'),null);
  rename(w,'あ'.repeat(13));assert.equal(read(w,'s.playerName'),'<img src=x>');
  w.Storage.prototype.setItem=()=>{throw Error('quota');};rename(w,'保存失敗');assert.equal(read(w,'s.playerName'),'<img src=x>');assert.match(w.document.querySelector('#optionsNotice').textContent,/保存できなかった/);
  w.Storage.prototype.setItem=original;assert.deepEqual(app.errors,[]);
 }finally{w.Storage.prototype.setItem=original;app.dispose();}
});

test('title options rename an existing second adventure without touching its gender or active save',()=>{
 const other={...seed(),playerName:'旧名',avatar:'girl',money:9876},app=boot(seed(),undefined,{start:false,storage:{[secondKey]:other}}),w=app.window;
 try{const raw=w.localStorage.getItem(saveKey);click(w,'[data-save-slot="2"]');click(w,'#titleOptions');rename(w,'新名');w.closeOptions();const changed=JSON.parse(w.localStorage.getItem(secondKey));assert.equal(changed.playerName,'新名');assert.equal(changed.avatar,'girl');assert.equal(changed.money,9876);assert.equal(w.localStorage.getItem(saveKey),raw);assert.match(w.document.querySelector('[data-save-slot="2"] small').textContent,/新名/);assert.deepEqual(app.errors,[]);}finally{app.dispose();}
});

test('real dialogue speed reveals text, a second advance completes it before changing pages, and close cancels stale callbacks',async()=>{
 const app=boot(null,undefined,{textSpeed:'slow',keepIntro:true}),w=app.window;
 try{
  const paper=w.document.querySelector('#lakeIntroPaper');assert.equal(paper.dataset.dialogueReading,'true');assert.ok(paper.querySelector('p').textContent.length<10);
  click(w,'#lakeIntroNext');assert.equal(w.document.querySelector('#lakeIntroProgress').textContent,'1 / 5');assert.match(paper.textContent,/片付けを済ませたら/);
  click(w,'#lakeIntroNext');assert.equal(w.document.querySelector('#lakeIntroProgress').textContent,'2 / 5');
  click(w,'#lakeIntroSkip');assert.equal(paper.hasAttribute('data-dialogue-reading'),false);
  w.openOptions();click(w,'[data-text-speed="instant"]');assert.match(w.document.querySelector('#optionsTextPreview').textContent,/どの魚に会えるかな/);
  assert.equal(JSON.parse(w.localStorage.getItem(Options.key)).textSpeed,'instant');
  w.closeOptions();w.eval("activeRivalId='liao';renderRivalTalk(true);open('tournamentTalk')");const line=w.document.querySelector('#tournamentTalkLine');assert.ok(line.textContent.length>5);
  w.close();w.openOptions();click(w,'[data-text-speed="slow"]');const preview=w.document.querySelector('#optionsTextPreview');const current=preview.textContent;w.closeOptions();await new Promise(resolve=>setTimeout(resolve,90));assert.equal(preview.textContent,current);assert.deepEqual(app.errors,[]);
 }finally{app.dispose();}
});

test('the faster reading modes use shorter delays, split emoji safely, and replacement never resumes an old line',()=>{
 const timers=new Map();let id=0;const clock={setTimeout:(fn,delay)=>{timers.set(++id,{fn,delay});return id;},clearTimeout:id=>timers.delete(id)};
 const app=boot(),w=app.window;
 try{const typer=Options.typer(clock),el=w.document.createElement('p');el.textContent='魚🐟あ';
  typer.start(el,[el.firstChild],'slow');assert.equal(el.textContent,'魚');assert.equal([...timers.values()][0].delay,70);
  typer.finish(el);assert.equal(el.textContent,'魚🐟あ');el.textContent='新しい会話';typer.start(el,[el.firstChild],'fast');assert.equal([...timers.values()][0].delay,12);typer.cancel(el);assert.equal(timers.size,0);
 }finally{app.dispose();}
});

test('inactive deletion needs explicit confirmation, cancel retains both saves, and only the chosen slot is removed',()=>{
 const other={...seed(),playerName:'二人目'},app=boot(seed(),undefined,{storage:{[secondKey]:other}}),w=app.window;
 try{w.openOptions();const raw=w.localStorage.getItem(saveKey),settings=w.localStorage.getItem(Options.key);click(w,'[data-delete-save="2"]');click(w,'#optionsDeleteConfirm');assert.ok(w.localStorage.getItem(secondKey));click(w,'#optionsDeleteCancel');assert.equal(w.localStorage.getItem(secondKey),JSON.stringify(other));click(w,'[data-delete-save="2"]');confirm(w);assert.equal(w.localStorage.getItem(secondKey),null);assert.equal(w.localStorage.getItem(saveKey),raw);assert.equal(w.localStorage.getItem(Options.key),settings);assert.equal(read(w,'saveSuppressed'),false);assert.deepEqual(app.errors,[]);}finally{app.dispose();}
});

test('deleting the active adventure cannot be undone by pending autosave, unload or visibility, and the other save survives',async()=>{
 const other={...seed(),playerName:'残す人'},app=boot(seed(),undefined,{storage:{[secondKey]:other}}),w=app.window,targets=[];
 try{w.navigateToSaveSlot=url=>targets.push(url);w.openOptions();click(w,'[data-delete-save="1"]');confirm(w);assert.equal(w.localStorage.getItem(saveKey),null);assert.equal(read(w,'saveSuppressed'),true);w.dispatchEvent(new w.Event('pagehide'));w.document.dispatchEvent(new w.Event('visibilitychange'));w.eval('scheduleSave();save()');await new Promise(resolve=>setTimeout(resolve,750));assert.equal(w.localStorage.getItem(saveKey),null);assert.equal(w.localStorage.getItem(secondKey),JSON.stringify(other));assert.equal(new URL(targets[0]).searchParams.get('saveSlot'),'1');assert.deepEqual(app.errors,[]);}finally{app.dispose();}
});

test('changed or inaccessible targets refuse deletion without suppressing the current adventure',()=>{
 const other={...seed()},app=boot(seed(),undefined,{storage:{[secondKey]:other}}),w=app.window;const remove=w.Storage.prototype.removeItem;
 try{w.openOptions();click(w,'[data-delete-save="2"]');const changed=JSON.stringify({...other,money:222});w.localStorage.setItem(secondKey,changed);confirm(w);assert.equal(w.localStorage.getItem(secondKey),changed);assert.equal(read(w,'saveSuppressed'),false);
  click(w,'[data-delete-save="2"]');w.Storage.prototype.removeItem=()=>{throw Error('blocked');};confirm(w);assert.equal(w.localStorage.getItem(secondKey),changed);assert.equal(read(w,'saveSuppressed'),false);w.Storage.prototype.removeItem=remove;assert.deepEqual(app.errors,[]);
 }finally{w.Storage.prototype.removeItem=remove;app.dispose();}
});

test('damaged saves stay protected until explicitly deleted in title options, then a clean selection is requested',()=>{
 const app=boot(null,undefined,{start:false,storage:{[saveKey]:'{broken'}}),w=app.window,targets=[];
 try{w.navigateToSaveSlot=url=>targets.push(url);assert.equal(w.document.querySelector('#start').disabled,true);click(w,'#titleOptions');click(w,'[data-delete-save="1"]');confirm(w);assert.equal(w.localStorage.getItem(saveKey),null);assert.equal(targets.length,1);assert.deepEqual(app.errors,[]);}finally{app.dispose();}
});


test('a pending active deletion freezes writes and rejects changed data from another tab',()=>{
 const app=boot(),w=app.window;
 try{w.openOptions();click(w,'[data-delete-save="1"]');const changed=JSON.stringify({...seed(),money:76543});w.localStorage.setItem(saveKey,changed);assert.equal(w.save(),false);confirm(w);assert.equal(w.localStorage.getItem(saveKey),changed);assert.equal(read(w,'saveSuppressed'),false);assert.deepEqual(app.errors,[]);}finally{app.dispose();}
});
