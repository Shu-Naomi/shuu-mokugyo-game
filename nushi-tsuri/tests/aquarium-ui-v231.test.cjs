const {test}=require('node:test'),assert=require('node:assert/strict');
const {boot,seed,read,saveKey}=require('./game-harness.cjs');
const day=188,minutes=day*1440+360;
const fish=(uid,length,generation=0)=>({uid,species:'isaki',tank:1,length,bornSize:generation?150:1400,origin:generation?'bred':'shop',generation,sex:uid==='pet-29'?'male':'female',acquiredDay:day-4,lastDay:day,fedDay:day-1,changedDay:day-1,water:55,health:90,careDays:4,stars:1,xp:40});
const fixture=()=>({...seed(),money:596209,gameMinutes:minutes,caught:{isaki:2,nushi:1,coastNushi:1},x:199,y:36,
 petLife:{version:5,unlockedTanks:6,food:1165,selected:'pet-28',selectedTank:1,nextId:32,fish:[fish('pet-28',2400),fish('pet-29',2400),fish('pet-30',650,1),fish('pet-31',150,1)]}});
const click=(w,q)=>{const b=w.document.querySelector(q);assert.ok(b,q);assert.equal(b.disabled,false,q);b.click();return b;};
const snapshot=w=>read(w,'({money:s.money,time:s.gameMinutes,food:s.petLife.food,fish:s.petLife.fish,caught:s.caught,records:s.sizeRecords})');
const open=()=>{const a=boot(fixture()),w=a.window;w.eval('petUi.open("aquarium")');return {a,w};};

test('the default aquarium keeps daily care, illustrated specimen choices and vital gauges; detailed text is on demand',()=>{
 const {a,w}=open();try{
  assert.equal(w.document.querySelector('#petLifeModal').classList.contains('pet-aquarium'),true);
  assert.equal(w.document.querySelector('.pet-sheet'),null);assert.equal(w.document.querySelector('.pet-stats'),null);
  assert.equal(w.document.querySelector('#petFishSelect'),null);assert.equal(w.document.querySelector('#petMoveTank'),null);
  const cards=[...w.document.querySelectorAll('.pet-fish-roster button')];assert.equal(cards.length,4);
  assert.ok(cards.every(el=>el.querySelector('canvas')));assert.match(cards[0].getAttribute('aria-label'),/イサキ.*24\.00cm/);
  assert.match(cards[2].getAttribute('aria-label'),/稚魚/);assert.equal(w.document.querySelector('[aria-label="元気"]').getAttribute('aria-valuenow'),'90');
  assert.equal(w.document.querySelector('[aria-label="水質"]').getAttribute('aria-valuenow'),'55');
  assert.ok(w.document.querySelector('.pet-care-dock [data-pet-action="feed"]'));assert.ok(w.document.querySelector('.pet-care-dock [data-pet-action="water"]'));
  assert.equal(w.document.querySelector('.pet-message').hidden,true);assert.deepEqual(a.errors,[]);
 }finally{a.dispose();}
});

test('records, help and specimen observations preserve fish history and resources; Escape closes only the sheet',()=>{
 const {a,w}=open();try{
  const before=snapshot(w);click(w,'[data-pet-action="records"]');
  assert.match(w.document.querySelector('.pet-stats').textContent,/生まれた体長.*14\.00cm.*成長.*10\.00cm/s);
  assert.equal(w.document.querySelector('.pet-aquarium-view').hasAttribute('inert'),true);
  w.document.querySelector('.pet-sheet').dispatchEvent(new w.KeyboardEvent('keydown',{key:'Escape',bubbles:true}));
  assert.equal(w.document.querySelector('.pet-sheet'),null);assert.equal(w.document.querySelector('#petLifeModal').classList.contains('open'),true);
  assert.equal(w.document.activeElement.dataset.petAction,'records');
  click(w,'[data-pet-action="help"]');assert.match(w.document.querySelector('.pet-help-cards').textContent,/水質40%.*1〜5cm/s);click(w,'[data-pet-action="panel-close"]');
  click(w,'.pet-fish-roster [data-pet-inspect="pet-31"]');assert.match(w.document.querySelector('[data-pet-size-rank]').textContent,/稚魚（繁殖限定）/);
  click(w,'[data-pet-action="focus-close"]');assert.deepEqual(snapshot(w),before);assert.deepEqual(a.errors,[]);
 }finally{a.dispose();}
});

test('illustrated tank choices include unlocked special pools; quick switching and reload keep the chosen tank',()=>{
 const {a,w}=open();let saved;try{
  const before=snapshot(w);click(w,'[data-pet-action="tanks"]');assert.equal(w.document.querySelectorAll('[data-pet-tank]').length,8);
  assert.match(w.document.querySelector('[data-pet-tank="6"]').textContent,/淡水ぬし総合水槽/);assert.match(w.document.querySelector('[data-pet-tank="7"]').textContent,/海水ぬし総合水槽/);
  click(w,'[data-pet-tank="7"]');assert.equal(read(w,'s.petLife.selectedTank'),7);assert.ok(w.document.querySelector('.pet-empty'));
  click(w,'[data-pet-action="tank-next"]');assert.equal(read(w,'s.petLife.selectedTank'),0);
  click(w,'[data-pet-action="tank-prev"]');assert.equal(read(w,'s.petLife.selectedTank'),7);
  assert.deepEqual(snapshot(w),before);saved=JSON.parse(w.localStorage.getItem(saveKey));assert.deepEqual(a.errors,[]);
 }finally{a.dispose();}
 const reload=boot(saved);try{assert.equal(read(reload.window,'s.petLife.selectedTank'),7);assert.deepEqual(reload.errors,[]);}finally{reload.dispose();}
});

test('pinned feeding and water change still care for every resident once and preserve care on reload',()=>{
 const {a,w}=open();let saved;try{
  click(w,'[data-pet-action="feed"]');assert.equal(read(w,'s.petLife.food'),1161);assert.equal(w.document.querySelector('[data-pet-action="feed"]').disabled,true);
  click(w,'[data-pet-action="water"]');assert.ok(read(w,'s.petLife.fish.every(f=>f.water===100&&f.changedDay===188&&f.fedDay===188)'));
  assert.equal(w.document.querySelector('[aria-label="水質"]').getAttribute('aria-valuenow'),'100');assert.equal(w.document.querySelector('[data-pet-action="water"]').disabled,true);
  saved=JSON.parse(w.localStorage.getItem(saveKey));assert.deepEqual(a.errors,[]);
 }finally{a.dispose();}
 const reload=boot(saved);try{assert.deepEqual(read(reload.window,'s.petLife.fish'),saved.petLife.fish);assert.equal(read(reload.window,'s.petLife.food'),1161);assert.deepEqual(reload.errors,[]);}finally{reload.dispose();}
});

test('management moves exactly the chosen fish and requires a separate confirmation to entrust it',()=>{
 const {a,w}=open();try{
  const before=snapshot(w);click(w,'[data-pet-action="records"]');click(w,'[data-pet-panel-tab="manage"]');
  click(w,'[data-pet-action="rehome"]');assert.match(w.document.querySelector('.pet-rehome').textContent,/イサキ #28.*24\.00cm/s);
  click(w,'[data-pet-action="rehome-cancel"]');assert.deepEqual(snapshot(w),before);
  click(w,'[data-pet-move-target="4"]');click(w,'[data-pet-action="move"]');
  assert.equal(read(w,'s.petLife.selectedTank'),4);assert.deepEqual(read(w,'s.petLife.fish.map(f=>({uid:f.uid,tank:f.tank}))'),[{uid:'pet-28',tank:4},{uid:'pet-29',tank:1},{uid:'pet-30',tank:1},{uid:'pet-31',tank:1}]);
  assert.deepEqual(read(w,'s.petLife.fish.find(f=>f.uid==="pet-28")'),{...before.fish[0],tank:4});assert.equal(read(w,'s.money'),before.money);assert.equal(w.document.querySelector('.pet-sheet'),null);assert.deepEqual(a.errors,[]);
 }finally{a.dispose();}
});

for(const [species,water,other] of [['moroko','淡水','madai'],['madai','海水','moroko']])test('eggs retain '+water+' tank labels and shop compatibility after the last parent is entrusted and the save reloads',()=>{
 const initial=fixture();initial.caught={moroko:1,madai:1};
 initial.petLife.fish=[{...fish('pet-28',species==='madai'?4360:750),species}];
 initial.petLife.eggs=[{uid:'egg-1',species,tank:1,laidDay:day-1,hatchDay:day+2,generation:1,water:100}];
 const a=boot(initial),w=a.window;let saved;try{
  w.eval('petUi.open("aquarium")');click(w,'[data-pet-action="records"]');click(w,'[data-pet-panel-tab="manage"]');
  click(w,'[data-pet-action="rehome"]');click(w,'[data-pet-action="rehome-confirm"]');
  assert.equal(read(w,'s.petLife.fish.length'),0);assert.equal(read(w,'s.petLife.eggs.length'),1);
  assert.match(w.document.querySelector('.pet-tank-current').textContent,new RegExp(water+' · 0/5'));
  assert.match(w.document.querySelector('.pet-tank-caption').textContent,new RegExp(water));
  assert.equal(w.document.querySelector('.pet-empty-profile b').textContent,water);assert.equal(w.document.querySelector('.pet-empty'),null);
  const before=read(w,'({money:s.money,time:s.gameMinutes,eggs:s.petLife.eggs})');
  click(w,'[data-pet-action="tanks"]');assert.match(w.document.querySelector('[data-pet-tank="1"]').textContent,new RegExp(water+'.*卵1'));
  click(w,'[data-pet-action="close"]');w.eval('petUi.open("shop")');
  assert.match(w.document.querySelector('#petTankSelect option[value="1"]').textContent,new RegExp(water));
  assert.equal(w.document.querySelector('[data-pet-buy="'+species+'"]').disabled,false);
  assert.equal(w.document.querySelector('[data-pet-buy="'+other+'"]').disabled,true);
  assert.deepEqual(read(w,'({money:s.money,time:s.gameMinutes,eggs:s.petLife.eggs})'),before);
  saved=JSON.parse(w.localStorage.getItem(saveKey));assert.deepEqual(a.errors,[]);
 }finally{a.dispose();}
 const reload=boot(saved);try{
  reload.window.eval('petUi.open("aquarium")');
  assert.match(reload.window.document.querySelector('.pet-tank-current').textContent,new RegExp(water));
  assert.deepEqual(read(reload.window,'s.petLife.eggs'),saved.petLife.eggs);assert.deepEqual(reload.errors,[]);
 }finally{reload.dispose();}
});
