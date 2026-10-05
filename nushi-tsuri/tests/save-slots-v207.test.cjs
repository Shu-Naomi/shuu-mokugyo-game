const {test}=require('node:test'),assert=require('node:assert/strict');
const Slots=require('../save-slots.js');
const {boot,seed,read,saveKey}=require('./game-harness.cjs');
const secondKey=Slots.keys[2],metaKey=Slots.lastSlotKey;
const click=(w,selector)=>{const b=w.document.querySelector(selector);assert.ok(b,selector);assert.equal(b.disabled,false);b.click();};
const state=w=>read(w,'({money:s.money,hp:s.hp,caught:s.caught,baits:s.baits,items:s.items,dog:s.dog,avatar:s.avatar,affinity:s.dogAffinity,story:s.lakeStory,pets:s.petLife,clock:s.gameMinutes})');

test('selecting and previewing either adventure cannot write or normalize its stored data',()=>{
  const old={...seed(),avatar:'girl',dog:'shuu'},second={...seed(),money:9876,avatar:'boy',dog:'grey',caught:{kasago:9}};
  const app=boot(old,undefined,{start:false,storage:{[secondKey]:second}}),w=app.window;
  try{
    const original=w.localStorage.getItem(saveKey),other=w.localStorage.getItem(secondKey);
    assert.equal(w.document.querySelector('#start').textContent,'セーブ1の続きへ');
    assert.match(w.document.querySelector('[data-save-slot="2"] small').textContent,/9876円.*釣果9匹/);
    click(w,'[data-save-slot="2"]');assert.equal(w.document.querySelector('[data-dog="grey"]').classList.contains('active'),true);
    assert.equal(w.document.querySelector('[data-avatar="girl"]').disabled,true);click(w,'[data-dog="riku"]');
    w.dispatchEvent(new w.Event('pagehide'));w.document.dispatchEvent(new w.Event('visibilitychange'));
    assert.equal(w.save(),false);assert.equal(w.localStorage.getItem(saveKey),original);assert.equal(w.localStorage.getItem(secondKey),other);
    click(w,'[data-save-slot="1"]');assert.equal(w.document.querySelector('[data-dog="shuu"]').classList.contains('active'),true);
    assert.deepEqual(app.errors,[]);
  }finally{app.dispose();}
});

test('a new second adventure starts fresh with chosen companions and leaves the original byte for byte',()=>{
  const old={...seed(),money:76543,caught:{coastNushi:1},lakeStory:{visited:{coast:true},read:['arrival']}},first=boot(old,undefined,{start:false});
  let target;
  try{
    const w=first.window,original=w.localStorage.getItem(saveKey);w.navigateToSaveSlot=url=>target=url;
    click(w,'[data-save-slot="2"]');click(w,'[data-avatar="girl"]');click(w,'[data-dog="grey"]');click(w,'#start');
    assert.equal(w.localStorage.getItem(saveKey),original);assert.equal(w.localStorage.getItem(secondKey),null);
    assert.equal(new URL(target).searchParams.get('saveSlot'),'2');assert.deepEqual(Slots.launchSettings(new URL(target).search),{play:true,playerName:'旅人',avatar:'girl',dog:'grey'});
    assert.deepEqual(first.errors,[]);
  }finally{first.dispose();}
  const app=boot(old,undefined,{url:target}),w=app.window;
  try{
    assert.equal(read(w,'activeSaveSlot'),2);assert.equal(read(w,'s.money'),300);assert.equal(read(w,'s.hp'),100);
    assert.equal(read(w,'s.dog'),'grey');assert.equal(read(w,'s.avatar'),'girl');assert.deepEqual(read(w,'s.caught'),{});
    assert.equal(read(w,'s.baits.worm'),5);assert.deepEqual(read(w,'s.lakeStory.visited'),{});
    assert.equal(w.localStorage.getItem(saveKey),JSON.stringify(old));assert.ok(w.localStorage.getItem(secondKey));
    assert.equal(w.localStorage.getItem(metaKey),'2');assert.equal(new URL(w.location.href).searchParams.has('play'),false);
    assert.equal(w.document.querySelector('#activeSaveSlot').textContent,'セーブ2');assert.deepEqual(app.errors,[]);
  }finally{app.dispose();}
});

test('autosave stays in the active adventure when another tab changes the remembered selection',()=>{
  const second={...seed(),money:2222,dog:'grey',caught:{shirogisu:7}},app=boot(seed(),undefined,{storage:{[secondKey]:second}}),w=app.window;
  try{
    const untouched=w.localStorage.getItem(secondKey);w.localStorage.setItem(metaKey,'2');
    w.eval('s.money=9999;s.hp=21;s.baits.worm=42;s.lakeStory.visited.coast=true;save()');
    w.dispatchEvent(new w.Event('pagehide'));assert.equal(w.localStorage.getItem(secondKey),untouched);
    const first=JSON.parse(w.localStorage.getItem(saveKey));assert.equal(first.money,9999);assert.equal(first.baits.worm,42);assert.equal(first.lakeStory.visited.coast,true);
    assert.equal(read(w,'activeSaveSlot'),1);assert.deepEqual(app.errors,[]);
  }finally{app.dispose();}
});

test('last-played slot two restores its entire adventure without inheriting slot one',()=>{
  const second={...seed(),money:2468,hp:83,dog:'grey',avatar:'girl',gameMinutes:2030,caught:{shirogisu:4},baits:{worm:19},lakeStory:{visited:{coast:true},read:['arrival']}};
  const app=boot(seed(),undefined,{storage:{[secondKey]:second,[metaKey]:'2'}}),w=app.window;let saved,expected;
  try{
    assert.equal(read(w,'activeSaveSlot'),2);assert.equal(read(w,'s.money'),2468);assert.equal(read(w,'s.dog'),'grey');
    assert.equal(read(w,'s.gameMinutes'),2030);assert.equal(read(w,'s.caught.shirogisu'),4);
    w.eval('s.items.fishBento=8;s.baits.worm=23;save()');expected=state(w);saved=JSON.parse(w.localStorage.getItem(secondKey));
    assert.equal(w.localStorage.getItem(saveKey),JSON.stringify(seed()));assert.deepEqual(app.errors,[]);
  }finally{app.dispose();}
  const resumed=boot(seed(),undefined,{url:'http://localhost/nushi-tsuri/?saveSlot=2',storage:{[secondKey]:saved}});
  try{assert.deepEqual(state(resumed.window),expected);assert.deepEqual(resumed.errors,[]);}finally{resumed.dispose();}
});

test('an explicit slot choice wins over last-played metadata and unrelated URL parameters survive switching',()=>{
  const store=new Map([[metaKey,'2']]),slots=Slots.create(()=>({getItem:key=>store.get(key)??null,setItem:(key,value)=>store.set(key,value)}));
  assert.equal(slots.initial('?saveSlot=1'),1);assert.equal(slots.initial('?saveSlot=garbage'),2);
  assert.equal(Slots.launchSettings('?play=1&dog=unknown&avatar=unknown').dog,null);
  const target=new URL(Slots.launchUrl('https://example.test/game/?mode=accessible#help',2,{avatar:'girl',dog:'grey'}));
  assert.equal(target.searchParams.get('mode'),'accessible');assert.equal(target.hash,'#help');
  const title=new URL(Slots.titleUrl(target.href,2));assert.equal(title.searchParams.has('play'),false);assert.equal(title.searchParams.has('dog'),false);
  assert.equal(title.searchParams.get('saveSlot'),'2');assert.throws(()=>Slots.keyFor(3));
});

test('corrupt legacy saves are protected on title, unload and a new second adventure',()=>{
  const damaged='{broken',app=boot(null,undefined,{start:false,storage:{[saveKey]:damaged}}),w=app.window;
  try{
    assert.equal(w.document.querySelector('#start').disabled,true);assert.equal(w.document.querySelector('#saveSlotNotice').hidden,false);
    w.dispatchEvent(new w.Event('pagehide'));assert.equal(w.localStorage.getItem(saveKey),damaged);
    click(w,'[data-save-slot="2"]');assert.equal(w.document.querySelector('#start').disabled,false);assert.equal(w.localStorage.getItem(saveKey),damaged);
    assert.deepEqual(app.errors,[]);
  }finally{app.dispose();}
  const second=boot(null,undefined,{url:'http://localhost/nushi-tsuri/?saveSlot=2',storage:{[saveKey]:damaged}});
  try{assert.equal(second.window.localStorage.getItem(saveKey),damaged);assert.ok(second.window.localStorage.getItem(secondKey));assert.deepEqual(second.errors,[]);}finally{second.dispose();}
});

test('invalid JSON roots and a corrupt second slot cannot be overwritten',()=>{
  for(const raw of ['null','[]','5','"save"','{broken']){
    const store=new Map([[secondKey,raw]]),slots=Slots.create(()=>({getItem:key=>store.get(key)??null,setItem:(key,value)=>store.set(key,value)}));
    assert.equal(slots.read(2).ok,false);assert.equal(slots.write(2,{money:300}),false);assert.equal(store.get(secondKey),raw);
  }
  const app=boot(seed(),undefined,{start:false,url:'http://localhost/nushi-tsuri/?saveSlot=2',storage:{[secondKey]:'null'}});
  try{assert.equal(app.window.document.querySelector('#start').disabled,true);assert.equal(app.window.localStorage.getItem(secondKey),'null');assert.deepEqual(app.errors,[]);}finally{app.dispose();}
});

test('save failure keeps live progress on screen and blocks returning to title',()=>{
  const app=boot(),w=app.window,targets=[];let original;
  try{
    w.navigateToSaveSlot=url=>targets.push(url);const stored=w.localStorage.getItem(saveKey);
    original=w.Storage.prototype.setItem;w.Storage.prototype.setItem=()=>{throw new Error('quota');};
    w.eval('s.money=13579');assert.equal(w.returnToSaveSelection(),false);assert.equal(read(w,'s.money'),13579);
    assert.equal(w.localStorage.getItem(saveKey),stored);assert.deepEqual(targets,[]);assert.match(w.document.querySelector('#rescueToast').textContent,/保存できなかった/);
    w.Storage.prototype.setItem=original;assert.equal(w.returnToSaveSelection(),true);assert.equal(JSON.parse(w.localStorage.getItem(saveKey)).money,13579);assert.equal(targets.length,1);
    assert.deepEqual(app.errors,[]);
  }finally{if(original)w.Storage.prototype.setItem=original;app.dispose();}
});

test('the field menu saves before switching and never interrupts a fishing fight',()=>{
  const app=boot(),w=app.window,targets=[];
  try{
    w.navigateToSaveSlot=url=>targets.push(url);w.eval('s.money=8888');click(w,'[data-field-menu-target="saveSlots"]');
    assert.equal(JSON.parse(w.localStorage.getItem(saveKey)).money,8888);assert.equal(new URL(targets[0]).searchParams.get('saveSlot'),'1');
    w.eval('openPracticePond();beginFishing()');assert.equal(w.returnToSaveSelection(),false);assert.equal(targets.length,1);assert.deepEqual(app.errors,[]);
  }finally{app.dispose();}
});
