const {test}=require('node:test'),assert=require('node:assert/strict');
const {boot,seed,read,saveKey}=require('./game-harness.cjs');
const initial=()=>({...seed(),money:10000,x:199,y:36,petLife:{version:6,unlockedTanks:3,fish:[],mutationSeed:'a'.repeat(32)}});
const day='gameClockAt(s.gameMinutes).dayIndex';
function click(w,q){if(q.startsWith('[data-pet-boarding-fish=')){for(let i=0;i<50&&!w.document.querySelector(q);i++){const next=w.document.querySelector('[data-pet-action="boarding-next"]');if(!next||next.disabled)break;next.click();}}const b=w.document.querySelector(q);assert.ok(b,q);assert.equal(b.disabled,false,q);b.click();return b;}
function select(w,q,value){const input=w.document.querySelector(q);assert.ok(input,q);input.value=value;input.dispatchEvent(new w.Event('change',{bubbles:true}));}
function openBoarding(w,view='deposit'){w.eval('petUi.open("shop")');click(w,'[data-pet-tab="boarding"]');if(view!=='deposit')click(w,`[data-pet-boarding-view="${view}"]`);}
function confirmDeposit(w,uid){click(w,`[data-pet-boarding-fish="${uid}"]`);return click(w,'[data-pet-action="boarding-confirm"]');}
function submitName(w,value){const input=w.document.querySelector('#petNickname');assert.ok(input);input.value=value;input.dispatchEvent(new w.Event('input',{bubbles:true}));w.document.querySelector('#petNameForm').dispatchEvent(new w.Event('submit',{bubbles:true,cancelable:true}));}
function owned(){
 const a=boot(initial()),w=a.window;
 w.eval(`for(let i=0;i<3;i++)ShuPetLife.acquire(s,'funa',petCatalog,${day},0);ShuPetLife.acquire(s,'mebaru',petCatalog,${day},1);s.petLife.fish[0].mutation={checked:true,kind:'gold',ruleVersion:1};s.petLife.fish[0].generation=2;ShuPetLife.renameFish(s,'pet-1','こがね🐟');save();`);
 openBoarding(w);return a;
}
function storageCounter(w){const proto=w.Storage.prototype,original=proto.setItem;let count=0,fail=false;proto.setItem=function(key,value){if(key===saveKey){count++;if(fail)throw Error('quota');}return original.call(this,key,value);};return {get count(){return count;},set fail(value){fail=value;},restore(){proto.setItem=original;}};}

test('boarding is free, uses a distinct tab, shares species capacity across colours and persists each confirmed UID only once',()=>{
 const a=owned(),w=a.window,counter=storageCounter(w);try{
  assert.match(w.document.querySelector('.pet-boarding-intro').textContent,/無料.*0円/s);assert.match(w.document.querySelector('.pet-boarding-intro').textContent,/通常色・希少色を合わせて2匹/);assert.match(w.document.querySelector('.pet-boarding-intro').textContent,/成長・空腹・繁殖が止まる/);assert.match(w.document.querySelector('.pet-boarding-intro').textContent,/卵は預けられない/);
  assert.match(w.document.querySelector('#petBoardingSpecies option[value="funa"]').textContent,/0\/2$/);
  const before=read(w,'s.petLife.fish.find(f=>f.uid==="pet-1")'),money=read(w,'s.money');click(w,'[data-pet-boarding-fish="pet-1"]');assert.match(w.document.querySelector('.pet-boarding-detail').textContent,/こがね🐟.*#1/s);assert.ok(w.document.querySelector('.pet-boarding-detail [data-pet-mutation="gold"]'));assert.ok(w.document.querySelector('.pet-boarding-detail [data-pet-specimen="pet-1"] canvas'));
  const confirm=click(w,'[data-pet-action="boarding-confirm"]');confirm.click();confirm.click();assert.equal(counter.count,1);assert.equal(read(w,'s.money'),money);assert.equal(read(w,'s.petLife.boarded.length'),1);assert.equal(read(w,'s.petLife.fish.some(f=>f.uid==="pet-1")'),false);
  const after=read(w,'s.petLife.boarded[0]');delete after.boardedDay;assert.deepEqual(after,before);assert.match(w.document.querySelector('#petBoardingSpecies option[value="funa"]').textContent,/1\/2$/);
  confirmDeposit(w,'pet-2');assert.equal(counter.count,2);assert.match(w.document.querySelector('#petBoardingSpecies option[value="funa"]').textContent,/2\/2$/);assert.equal(w.document.querySelector('[data-pet-boarding-fish="pet-3"]').disabled,true);assert.match(w.document.querySelector('[data-pet-boarding-fish="pet-3"]').closest('article').textContent,/先に一匹引き取って/);
  assert.equal(read(w,'s.petLife.boarded.length'),2);assert.equal(JSON.parse(w.localStorage.getItem(saveKey)).petLife.boarded.length,2);assert.deepEqual(a.errors,[]);
 }finally{counter.restore();a.dispose();}
});

test('selection, Cancel, Escape, tab changes and Close leave fish and storage unchanged',()=>{
 const a=owned(),w=a.window,counter=storageCounter(w);try{
  const before=read(w,'s'),bytes=w.localStorage.getItem(saveKey);
  click(w,'[data-pet-boarding-fish="pet-1"]');click(w,'[data-pet-action="boarding-cancel"]');assert.ok(w.document.querySelector('[data-pet-boarding-fish="pet-1"]'));
  click(w,'[data-pet-boarding-fish="pet-1"]');w.document.querySelector('#petBoardingHeading').dispatchEvent(new w.KeyboardEvent('keydown',{key:'Escape',bubbles:true}));assert.equal(w.document.querySelector('.pet-boarding-detail'),null);assert.equal(w.document.querySelector('#petLifeModal').classList.contains('open'),true);
  click(w,'[data-pet-boarding-fish="pet-1"]');click(w,'[data-pet-boarding-view="withdraw"]');assert.equal(w.document.querySelector('[data-pet-action="boarding-confirm"]'),null);click(w,'[data-pet-boarding-view="deposit"]');
  click(w,'[data-pet-boarding-fish="pet-1"]');select(w,'#petShopSection','buyback');click(w,'[data-pet-tab="boarding"]');assert.equal(w.document.querySelector('.pet-boarding-detail'),null);
  click(w,'[data-pet-boarding-fish="pet-1"]');click(w,'[data-pet-action="close"]');openBoarding(w);assert.equal(w.document.querySelector('.pet-boarding-detail'),null);assert.deepEqual(read(w,'s'),before);assert.equal(w.localStorage.getItem(saveKey),bytes);assert.equal(counter.count,0);assert.deepEqual(a.errors,[]);
 }finally{counter.restore();a.dispose();}
});

test('failed deposit and withdrawal saves restore the full state, retain the selected UID, and retry exactly once',()=>{
 const a=owned(),w=a.window,counter=storageCounter(w);try{
  click(w,'[data-pet-boarding-fish="pet-1"]');const before=read(w,'s'),bytes=w.localStorage.getItem(saveKey);counter.fail=true;click(w,'[data-pet-action="boarding-confirm"]');assert.deepEqual(read(w,'s'),before);assert.equal(w.localStorage.getItem(saveKey),bytes);assert.match(w.document.querySelector('.pet-message').textContent,/保存できなかった/);assert.ok(w.document.querySelector('.pet-boarding-detail [data-pet-specimen="pet-1"]'));
  counter.fail=false;click(w,'[data-pet-action="boarding-confirm"]');assert.equal(counter.count,2);assert.equal(read(w,'s.petLife.boarded.length'),1);
  click(w,'[data-pet-boarding-view="withdraw"]');click(w,'[data-pet-boarding-fish="pet-1"]');assert.equal(w.document.querySelector('[data-pet-action="boarding-withdraw-confirm"]').disabled,true);select(w,'#petBoardingTank','2');const deposited=read(w,'s'),stored=w.localStorage.getItem(saveKey);counter.fail=true;click(w,'[data-pet-action="boarding-withdraw-confirm"]');assert.deepEqual(read(w,'s'),deposited);assert.equal(w.localStorage.getItem(saveKey),stored);assert.equal(w.document.querySelector('#petBoardingTank').value,'2');
  counter.fail=false;const confirm=click(w,'[data-pet-action="boarding-withdraw-confirm"]');confirm.click();assert.equal(counter.count,4);assert.equal(read(w,'s.petLife.boarded.length'),0);assert.equal(read(w,'s.petLife.fish.filter(f=>f.uid==="pet-1").length'),1);assert.equal(read(w,'s.petLife.fish.find(f=>f.uid==="pet-1").tank'),2);assert.equal(read(w,'s.petLife.fish.find(f=>f.uid==="pet-1").nickname'),'こがね🐟');assert.deepEqual(a.errors,[]);
 }finally{counter.restore();a.dispose();}
});

test('a failed save after the day changes does not reapply sync outside the rolled-back transaction',()=>{
 const a=owned(),w=a.window,counter=storageCounter(w);try{
  click(w,'[data-pet-boarding-fish="pet-1"]');w.eval('s.gameMinutes+=1440');const before=read(w,'s');counter.fail=true;click(w,'[data-pet-action="boarding-confirm"]');assert.deepEqual(read(w,'s'),before);assert.match(w.document.querySelector('.pet-message').textContent,/保存できなかった/);assert.deepEqual(a.errors,[]);
 }finally{counter.restore();a.dispose();}
});

test('withdrawal requires an explicit compatible destination, displays blocked reasons, and rechecks a newly full tank',()=>{
 const a=owned(),w=a.window;try{
  confirmDeposit(w,'pet-1');click(w,'[data-pet-boarding-view="withdraw"]');click(w,'[data-pet-boarding-fish="pet-1"]');
  const wrong=w.document.querySelector('#petBoardingTank option[value="1"]');assert.equal(wrong.disabled,true);assert.match(wrong.textContent,/淡水の魚は入れられない/);assert.equal(w.document.querySelector('#petBoardingTank option[value="2"]').disabled,false);assert.equal(w.document.querySelector('#petBoardingTank').value,'');
  select(w,'#petBoardingTank','2');w.eval(`for(let i=0;i<5;i++)ShuPetLife.acquire(s,'funa',petCatalog,${day},2);save()`);const before=read(w,'s');click(w,'[data-pet-action="boarding-withdraw-confirm"]');assert.deepEqual(read(w,'s'),before);assert.equal(read(w,'s.petLife.boarded[0].uid'),'pet-1');assert.equal(w.document.querySelector('#petBoardingTank option[value="2"]').disabled,true);assert.match(w.document.querySelector('#petBoardingTank option[value="2"]').textContent,/満員/);assert.equal(w.document.querySelector('[data-pet-action="boarding-withdraw-confirm"]').disabled,true);
  select(w,'#petBoardingTank','0');click(w,'[data-pet-action="boarding-withdraw-confirm"]');assert.equal(read(w,'s.petLife.boarded.length'),0);assert.deepEqual(a.errors,[]);
 }finally{a.dispose();}
});

test('deposit revalidates the selected immutable UID and species capacity at confirmation',()=>{
 const a=owned(),w=a.window;try{
  click(w,'[data-pet-boarding-fish="pet-1"]');w.eval(`ShuPetLife.boardFish(s,'pet-2',petCatalog,${day});ShuPetLife.boardFish(s,'pet-3',petCatalog,${day});save()`);const before=read(w,'s');click(w,'[data-pet-action="boarding-confirm"]');assert.deepEqual(read(w,'s'),before);assert.equal(read(w,'s.petLife.fish.some(f=>f.uid==="pet-1")'),true);assert.equal(w.document.querySelector('[data-pet-action="boarding-confirm"]').disabled,true);
  click(w,'[data-pet-action="boarding-cancel"]');click(w,'[data-pet-boarding-fish="pet-4"]');w.eval(`ShuPetLife.rehome(s,'pet-4',petCatalog,${day});save()`);const removed=read(w,'s');click(w,'[data-pet-action="boarding-confirm"]');assert.deepEqual(read(w,'s'),removed);assert.deepEqual(a.errors,[]);
 }finally{a.dispose();}
});

test('boarded fish keep notebook art, identity and editable names through rollback, reload, and withdrawal',()=>{
 const a=owned(),w=a.window;let stored;try{
  confirmDeposit(w,'pet-1');click(w,'[data-pet-action="notebook"]');click(w,'[data-notebook-species="funa"]');click(w,'[data-notebook-fish="pet-1"]');assert.match(w.document.querySelector('.pet-notebook-specimen').textContent,/こがね🐟.*お預かり中.*3代目/s);assert.ok(w.document.querySelector('.pet-notebook-portrait canvas'));assert.match(w.document.querySelector('[data-notebook-fish="pet-1"]').textContent,/こがね🐟.*お預かり中/s);
  click(w,'[data-pet-name="pet-1"]');const counter=storageCounter(w);try{counter.fail=true;submitName(w,'おやすみ🐟');assert.equal(read(w,'s.petLife.boarded[0].nickname'),'こがね🐟');assert.match(w.document.querySelector('#petNameError').textContent,/元の愛称/);counter.fail=false;submitName(w,'おやすみ🐟');assert.equal(counter.count,2);assert.equal(read(w,'s.petLife.boarded[0].nickname'),'おやすみ🐟');}finally{counter.restore();}
  stored=JSON.parse(w.localStorage.getItem(saveKey));assert.deepEqual(a.errors,[]);
 }finally{a.dispose();}
 const b=boot(stored),v=b.window;try{
  v.eval('petUi.open("notebook")');click(v,'[data-notebook-species="funa"]');click(v,'[data-notebook-fish="pet-1"]');assert.match(v.document.querySelector('.pet-notebook-specimen').textContent,/おやすみ🐟.*お預かり中.*3代目/s);openBoarding(v,'withdraw');click(v,'[data-pet-boarding-fish="pet-1"]');assert.match(v.document.querySelector('.pet-boarding-detail').textContent,/おやすみ🐟/);select(v,'#petBoardingTank','2');click(v,'[data-pet-action="boarding-withdraw-confirm"]');assert.equal(read(v,'s.petLife.fish.find(f=>f.uid==="pet-1").mutation.kind'),'gold');assert.equal(read(v,'s.petLife.fish.find(f=>f.uid==="pet-1").nickname'),'おやすみ🐟');assert.deepEqual(b.errors,[]);
 }finally{b.dispose();}
});

test('unknown legacy identities remain unknown when the only fish is boarded and the notebook is received after reload',()=>{
 const state=initial();state.petLife.fish=[{uid:'pet-9',species:'funa',tank:0,length:1400,bornSize:1400,origin:'shop',health:90,water:100}];const a=boot(state),w=a.window;let stored,memo;try{
  openBoarding(w);confirmDeposit(w,'pet-9');stored=JSON.parse(w.localStorage.getItem(saveKey));memo=w.localStorage.getItem('nushi-pet-identity-display-v1:'+saveKey);assert.equal(stored.petLife.fish.length,0);assert.equal(stored.petLife.boarded.length,1);assert.deepEqual(a.errors,[]);
 }finally{a.dispose();}
 delete stored.petNotebook;
 const b=boot(stored,undefined,{storage:{['nushi-pet-identity-display-v1:'+saveKey]:memo}}),v=b.window;try{
  v.eval('petUi.open("shop")');click(v,'[data-pet-action="notebook-receive"]');click(v,'[data-pet-action="notebook"]');assert.match(v.document.querySelector('.pet-notebook-specimen').textContent,/お預かり中.*性別不明.*世代不明/s);assert.match(v.document.querySelector('[data-notebook-species="funa"]').textContent,/水槽 0匹 · お預かり 1匹/);assert.deepEqual(b.errors,[]);
 }finally{b.dispose();}
});

test('temporarily hiding the page preserves the confirmation draft without moving or losing its fish',()=>{
 const a=owned(),w=a.window;try{
  click(w,'[data-pet-boarding-fish="pet-1"]');const before=read(w,'s');Object.defineProperty(w.document,'hidden',{configurable:true,value:true});w.document.dispatchEvent(new w.Event('visibilitychange'));assert.deepEqual(read(w,'s'),before);Object.defineProperty(w.document,'hidden',{configurable:true,value:false});w.document.dispatchEvent(new w.Event('visibilitychange'));click(w,'[data-pet-action="boarding-confirm"]');assert.equal(read(w,'s.petLife.boarded[0].uid'),'pet-1');assert.equal(read(w,'s.petLife.fish.some(f=>f.uid==="pet-1")'),false);assert.deepEqual(a.errors,[]);
 }finally{a.dispose();}
});

test('legendary fish can be boarded but can only return to their compatible legendary tank',()=>{
 const a=owned(),w=a.window;try{
  w.eval(`s.caught.nushi=1;ShuPetLife.acquire(s,'nushi',petCatalog,${day});save();petUi.render()`);const uid=read(w,'s.petLife.fish.find(f=>f.species==="nushi").uid');confirmDeposit(w,uid);click(w,'[data-pet-boarding-view="withdraw"]');click(w,`[data-pet-boarding-fish="${uid}"]`);assert.equal(w.document.querySelector('#petBoardingTank option[value="0"]').disabled,true);assert.match(w.document.querySelector('#petBoardingTank option[value="0"]').textContent,/ぬし専用水槽が必要/);assert.equal(w.document.querySelector('#petBoardingTank option[value="6"]').disabled,false);assert.match(w.document.querySelector('#petBoardingTankHelp').textContent,/同じ水槽の魚たちと水質を共有する/);select(w,'#petBoardingTank','6');click(w,'[data-pet-action="boarding-withdraw-confirm"]');assert.equal(read(w,`s.petLife.fish.find(f=>f.uid==="${uid}").tank`),6);assert.equal(read(w,'s.petLife.legendClaims.nushi'),true);assert.deepEqual(a.errors,[]);
 }finally{a.dispose();}
});

test('eggs never appear as boarding choices and reserve destination capacity',()=>{
 const a=owned(),w=a.window;try{
  w.eval(`s.petLife.eggs=Array.from({length:5},(_,i)=>({uid:'egg-'+(i+1),species:'funa',tank:2,laidDay:${day},hatchDay:${day}+3,generation:1,water:100,parents:null,mutation:ShuAquariumMutations.normal()}));save();petUi.render()`);assert.equal(w.document.querySelectorAll('[data-pet-boarding-fish]').length,4);assert.equal(w.document.querySelector('[data-pet-boarding-fish^="egg-"]'),null);confirmDeposit(w,'pet-1');click(w,'[data-pet-boarding-view="withdraw"]');click(w,'[data-pet-boarding-fish="pet-1"]');const reserved=w.document.querySelector('#petBoardingTank option[value="2"]');assert.equal(reserved.disabled,true);assert.match(reserved.textContent,/卵5組.*満員（卵の予約分を含む）/);assert.equal(read(w,'s.petLife.eggs.length'),5);assert.deepEqual(a.errors,[]);
 }finally{a.dispose();}
});

test('boarding pages and species filters expose every UID without changing saves, and cancel returns to the same page',()=>{
 const a=owned(),w=a.window;try{
  Object.defineProperty(w,'innerWidth',{configurable:true,value:820});Object.defineProperty(w,'innerHeight',{configurable:true,value:366});
  w.eval(`for(let t=2;t<6;t++){s.petLife.unlockedTanks=6;for(let i=0;i<5;i++)ShuPetLife.acquire(s,'moroko',petCatalog,${day},t);}save();petUi.render()`);
  const before=read(w,'s'),bytes=w.localStorage.getItem(saveKey),seen=[];
  for(let i=0;i<20;i++){
   const cards=[...w.document.querySelectorAll('[data-pet-boarding-fish]')];assert.ok(cards.length<=2);seen.push(...cards.map(b=>b.dataset.petBoardingFish));
   const next=w.document.querySelector('[data-pet-action="boarding-next"]');if(next.disabled)break;next.click();
  }
  assert.deepEqual(seen,read(w,'s.petLife.fish.map(f=>f.uid)'));
  const last=seen.at(-1);click(w,`[data-pet-boarding-fish="${last}"]`);click(w,'[data-pet-action="boarding-cancel"]');assert.ok(w.document.querySelector(`[data-pet-boarding-fish="${last}"]`));
  select(w,'#petBoardingSpecies','funa');assert.equal(w.document.querySelector('[data-pet-action="boarding-prev"]').disabled,true);assert.equal(w.document.querySelectorAll('[data-pet-boarding-fish]').length,2);
  click(w,'[data-pet-action="boarding-help"]');assert.equal(w.document.querySelector('.pet-boarding-rules').hidden,false);w.document.querySelector('[data-pet-action="boarding-help-close"]').dispatchEvent(new w.KeyboardEvent('keydown',{key:'Escape',bubbles:true}));assert.equal(w.document.querySelector('.pet-boarding-rules').hidden,true);
  select(w,'#petBoardingSpecies','mebaru');assert.equal(w.document.querySelectorAll('[data-pet-boarding-fish]').length,1);
  assert.deepEqual(read(w,'s'),before);assert.equal(w.localStorage.getItem(saveKey),bytes);assert.deepEqual(a.errors,[]);
 }finally{a.dispose();}
});


test('resize and Cancel keep the selected fish visible and focused when the page size changes',()=>{
 const a=owned(),w=a.window;try{
  Object.defineProperty(w,'innerWidth',{configurable:true,value:1280});Object.defineProperty(w,'innerHeight',{configurable:true,value:720});w.eval('petUi.render()');
  click(w,'[data-pet-boarding-fish="pet-4"]');
  Object.defineProperty(w,'innerWidth',{configurable:true,value:820});Object.defineProperty(w,'innerHeight',{configurable:true,value:366});w.dispatchEvent(new w.Event('resize'));
  assert.equal(w.document.activeElement.id,'petBoardingHeading');
  click(w,'[data-pet-action="boarding-cancel"]');assert.equal(w.document.activeElement.dataset.petBoardingFish,'pet-4');
  click(w,'[data-pet-boarding-fish="pet-4"]');w.document.querySelector('#petBoardingHeading').dispatchEvent(new w.KeyboardEvent('keydown',{key:'Escape',bubbles:true}));assert.equal(w.document.activeElement.dataset.petBoardingFish,'pet-4');assert.deepEqual(a.errors,[]);
 }finally{a.dispose();}
});

test('resize preserves boarding keyboard focus and Escape cancels without closing the shop or saving',()=>{
 const a=owned(),w=a.window;try{
  const before=read(w,'s'),bytes=w.localStorage.getItem(saveKey);
  const resize=()=>w.dispatchEvent(new w.Event('resize'));
  const escape=()=>w.document.activeElement.dispatchEvent(new w.KeyboardEvent('keydown',{key:'Escape',bubbles:true}));
  click(w,'[data-pet-boarding-fish="pet-1"]');resize();assert.equal(w.document.activeElement.id,'petBoardingHeading');escape();
  assert.equal(w.document.querySelector('.pet-boarding-detail'),null);assert.equal(w.document.querySelector('#petLifeModal').classList.contains('open'),true);assert.equal(w.document.activeElement.dataset.petBoardingFish,'pet-1');
  click(w,'[data-pet-action="boarding-help"]');resize();assert.equal(w.document.activeElement.dataset.petAction,'boarding-help-close');escape();assert.equal(w.document.querySelector('.pet-boarding-rules').hidden,true);
  w.document.querySelector('#petBoardingSpecies').focus();resize();assert.equal(w.document.activeElement.id,'petBoardingSpecies');
  Object.defineProperty(w,'innerWidth',{configurable:true,value:1280});Object.defineProperty(w,'innerHeight',{configurable:true,value:720});resize();
  w.document.querySelector('[data-pet-boarding-fish="pet-4"]').focus();Object.defineProperty(w,'innerWidth',{configurable:true,value:820});Object.defineProperty(w,'innerHeight',{configurable:true,value:366});resize();assert.equal(w.document.activeElement.dataset.petBoardingFish,'pet-4');
  click(w,'[data-pet-action="boarding-prev"]');resize();assert.equal(w.document.activeElement.matches('.pet-boarding-pager span'),true);
  w.document.querySelector('[data-pet-action="boarding-next"]').focus();Object.defineProperty(w,'innerWidth',{configurable:true,value:1280});Object.defineProperty(w,'innerHeight',{configurable:true,value:720});resize();assert.equal(w.document.querySelector('[data-pet-action="boarding-next"]').disabled,true);assert.equal(w.document.activeElement.matches('.pet-boarding-pager span'),true);
  assert.deepEqual(read(w,'s'),before);assert.equal(w.localStorage.getItem(saveKey),bytes);
  confirmDeposit(w,'pet-1');click(w,'[data-pet-boarding-view="withdraw"]');click(w,'[data-pet-boarding-fish="pet-1"]');select(w,'#petBoardingTank','2');
  const deposited=read(w,'s'),stored=w.localStorage.getItem(saveKey);resize();assert.equal(w.document.activeElement.id,'petBoardingTank');assert.equal(w.document.activeElement.value,'2');escape();
  assert.equal(w.document.querySelector('.pet-boarding-detail'),null);assert.equal(w.document.querySelector('#petLifeModal').classList.contains('open'),true);assert.deepEqual(read(w,'s'),deposited);assert.equal(w.localStorage.getItem(saveKey),stored);assert.deepEqual(a.errors,[]);
 }finally{a.dispose();}
});

test('boarding shop selector transfers focus to the destination control without saving',()=>{
 const a=owned(),w=a.window;try{
  const before=read(w,'s'),bytes=w.localStorage.getItem(saveKey);
  for(const section of ['fish','supplies','legends','buyback','contests']){
   w.document.querySelector('#petShopSection').focus();select(w,'#petShopSection',section);assert.equal(w.document.activeElement.dataset.petTab,section);openBoarding(w);
  }
  w.document.querySelector('#petShopSection').focus();select(w,'#petShopSection','aquarium');assert.equal(w.document.activeElement.dataset.petAction,'tanks');
  assert.deepEqual(read(w,'s'),before);assert.equal(w.localStorage.getItem(saveKey),bytes);assert.deepEqual(a.errors,[]);
 }finally{a.dispose();}
});
