const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const {boot,seed,read,saveKey}=require('./game-harness.cjs');
const click=(w,q)=>{const b=w.document.querySelector(q);assert.ok(b,q);assert.equal(b.disabled,false,q+' enabled');b.click();};
async function transition(w){for(let i=0;i<80&&w.eval('playerHomeState.transitioning');i++)await new Promise(r=>w.setTimeout(r,10));assert.equal(w.eval('playerHomeState.transitioning'),false);}

test('the painted west boat-shop path reaches its front with real movement and A, while walls and sea stay solid',()=>{
  const app=boot({...seed(),x:119,y:112,soundEnabled:false}),w=app.window;
  try{
    w.Math.random=()=>.999999;
    for(const direction of ['right','down','down','down','right','right','right','right'])w.move(direction);
    assert.deepEqual(read(w,'[s.x,s.y]'),[139,124]);
    click(w,'#action');assert.equal(w.document.querySelector('#vehicleShop').classList.contains('open'),true);
    for(const [x,y] of [[132,111],[139,110],[180,118],[146,128]])assert.equal(w.isWalkableWorld(x,y),false,`solid ${x},${y}`);
    assert.deepEqual(app.errors,[]);
  }finally{app.dispose();}
});

test('home arrival remains on the left; walking the home road to the right returns to the village',async()=>{
  const app=boot({...seed(),soundEnabled:false}),w=app.window;
  try{
    w.move('left');await transition(w);assert.equal(w.eval('playerHomeState.area'),'exterior');
    assert.equal(w.eval('playerHomeState.x'),12);
    assert.equal(w.eval("nearbyPlayerHomeEvent('exterior',6,80)?.id || null"),null);
    assert.match(w.eval("playerHomeHint()"),/./);
    for(let i=0;i<28&&w.eval('playerHomeState.area')==='exterior';i++){
      w.move('right');await transition(w);
      if(w.eval("nearbyPlayerHomeEvent('exterior',playerHomeState.x,playerHomeState.y)?.id")==='map-exit'){click(w,'#action');await transition(w);}
    }
    assert.equal(w.eval('playerHomeState.area'),null);assert.deepEqual(read(w,'[s.x,s.y,s.direction]'),[10,79,'right']);
    assert.deepEqual(app.errors,[]);
  }finally{app.dispose();}
});

test('yaoya and Sam quantity buttons step 10 to 20 to 30, charge totals, and never partially buy on shortage',()=>{
  const app=boot({...seed(),money:100000}),w=app.window;
  try{
    w.openLocationInterior('yaoya');click(w,'[data-location-count="10"]');click(w,'[data-location-count-step="1"]');
    assert.match(w.document.querySelector('.quantity-picker output').textContent,/20個/);
    const id=w.document.querySelector('[data-buy-location-item]').dataset.buyLocationItem;
    const before=read(w,`({count:s.items['${id}']||0,money:s.money,price:fieldItemData['${id}'].price})`);
    click(w,`[data-buy-location-item="${id}"]`);
    assert.equal(read(w,`s.items['${id}']`),before.count+20);assert.equal(read(w,'s.money'),before.money-before.price*20);
    w.eval('s.money=1');const items=read(w,'s.items');click(w,`[data-buy-location-item="${id}"]`);assert.deepEqual(read(w,'s.items'),items);assert.equal(read(w,'s.money'),1);
    w.close();w.eval('s.money=100000;open("store");renderSamShop()');
    click(w,'[data-bait-count="10"]');click(w,'[data-bait-count-step="1"]');assert.equal(read(w,'samBaitPurchaseCount'),20);
    click(w,'[data-bait-count-step="1"]');assert.equal(read(w,'samBaitPurchaseCount'),30);
    click(w,'[data-bait-count-step="-1"]');assert.equal(read(w,'samBaitPurchaseCount'),20);
    const bait=w.document.querySelector('[data-buy-bait]').dataset.buyBait;
    const b=read(w,`({count:s.baits['${bait}']||0,money:s.money,price:baitData['${bait}'].price,amount:baitData['${bait}'].amount})`);
    click(w,`[data-buy-bait="${bait}"]`);assert.equal(read(w,`s.baits['${bait}']`),b.count+b.amount*20);assert.equal(read(w,'s.money'),b.money-b.price*20);
    assert.deepEqual(app.errors,[]);
  }finally{app.dispose();}
});

test('ten fortune draws consume ten offerings, award ten actual prizes, block repeat taps and retain a readable result after reload',()=>{
  const app=boot({...seed(),items:{starGrapes:20},baits:{nushiSecret:2}}),w=app.window;let saved;
  try{
    w.openLocationInterior('main-shrine');w.Math.random=()=>.125;
    click(w,'[data-draw-fortune="starGrapes"][data-fortune-count="10"]');
    assert.equal(read(w,'s.items.starGrapes'),10);assert.equal(read(w,'s.baits.nushiSecret'),12);assert.equal(read(w,'s.starFortuneLastBatch.length'),10);
    assert.equal(w.drawStarFortune('starGrapes',10),false);assert.equal(read(w,'s.items.starGrapes'),10);
    w.hideStarFortuneReveal();assert.equal(w.document.querySelectorAll('.fortune-batch-results li').length,10);
    w.eval('s.items.starGrapes=9;save()');assert.equal(w.drawStarFortune('starGrapes',10),false);assert.equal(read(w,'s.items.starGrapes'),9);
    saved=JSON.parse(w.localStorage.getItem(saveKey));assert.deepEqual(app.errors,[]);
  }finally{app.dispose();}
  const reload=boot(saved);try{reload.window.openLocationInterior('main-shrine');assert.equal(reload.window.document.querySelectorAll('.fortune-batch-results li').length,10);assert.equal(read(reload.window,'s.baits.nushiSecret'),12);assert.deepEqual(reload.errors,[]);}finally{reload.dispose();}
});

test('A enters Asual’s shop; buying, portable feeding, sleep, water change, zoom and reload share one specimen without unlocking catches',()=>{
  const app=boot({...seed(),caught:{...seed().caught,moroko:1},x:199,y:36,soundEnabled:false},{petTankStage:[360,180]}),w=app.window;let saved;
  try{
    const old=read(w,'({caught:s.caught,records:s.sizeRecords,display:s.homeAquariumFishId})');
    click(w,'#action');assert.equal(w.document.querySelector('#petLifeModal').classList.contains('open'),true);assert.match(w.document.querySelector('#petLifeTitle').textContent,/アスアル/);
    click(w,'[data-pet-buy="moroko"]');click(w,'[data-pet-action="aquarium"]');
    assert.match(w.document.querySelector('.pet-tank-caption').textContent,/7.50cm/);
    click(w,'[data-pet-action="feed"]');assert.equal(read(w,'s.petLife.food'),9);assert.equal(w.document.querySelector('[data-pet-action="feed"]').disabled,true);
    click(w,'[data-pet-action="zoom"]');assert.equal(w.document.querySelector('#petLifeModal').classList.contains('pet-zoomed'),true);
    click(w,'[data-pet-action="close"]');w.eval('sleepUntilNextMorning(s);save();render();openInventory()');
    click(w,'#openPetAquarium');assert.match(w.document.querySelector('.pet-tank-caption').textContent,/8.50cm/);
    assert.match(w.document.querySelector('.pet-stats').textContent,/1日の成長\s*1\.00cm/);
    assert.equal(read(w,'s.petLife.fish[0].water'),92);click(w,'[data-pet-action="water"]');assert.equal(read(w,'s.petLife.fish[0].water'),100);
    assert.deepEqual(read(w,'({caught:s.caught,records:s.sizeRecords,display:s.homeAquariumFishId})'),old);
    saved=JSON.parse(w.localStorage.getItem(saveKey));assert.deepEqual(app.errors,[]);
  }finally{app.dispose();}
  const reload=boot(saved);try{assert.equal(read(reload.window,'s.petLife.fish[0].length'),850);assert.equal(read(reload.window,'s.petLife.food'),9);assert.equal(read(reload.window,'s.dogAffinity.shuu'),880);assert.deepEqual(reload.errors,[]);}finally{reload.dispose();}
});

test('dog UI renders white/red/gold hearts and invisible frisbees, supports training and scales actual pickups',()=>{
  const app=boot({...seed(),dogAffinity:{shuu:0,riku:100}}),w=app.window;
  try{
    w.openDogCare('shuu');assert.equal(w.document.querySelectorAll('#dogCareHearts .white').length,10);assert.equal(w.document.querySelectorAll('#dogCareFrisbees .earned').length,0);
    click(w,'#dogCarePet');assert.equal(read(w,'s.dogAffinity.shuu'),8);w.resetDogCareScene('shuu',true);
    click(w,'#dogCareTrain');assert.equal(read(w,'s.dogTricks.shuu'),25);assert.equal(read(w,'s.dogAffinity.shuu'),13);w.resetDogCareScene('shuu',true);
    assert.equal(w.document.querySelector('#dogCareTrain').disabled,true);
    w.eval('s.dogAffinity.shuu=1100;s.dogTricks.shuu=200;renderDogCare()');
    assert.equal(w.document.querySelectorAll('#dogCareHearts .red').length,9);assert.equal(w.document.querySelectorAll('#dogCareHearts .gold').length,1);assert.equal(w.document.querySelectorAll('#dogCareFrisbees .earned').length,2);
    w.close();const point=read(w,"(() => {const id=Object.keys(ensureForageCycle().active)[0];const item=forageData[s.forageCycle.active[id]];const key=item.destination==='bait'?'baits':item.destination==='item'?'items':'dogTreats';return {id,key,item:item.destinationId,count:s[key][item.destinationId]||0};})()");
    w.collectForagePoint(point.id);assert.equal(read(w,`s['${point.key}']['${point.item}']`),point.count+3);
    assert.deepEqual(app.errors,[]);
  }finally{app.dispose();}
});

test('contest reception offers three courses and all kinds; actual entry, prizes and daily lock survive reopening',()=>{
  const app=boot({...seed(),dogAffinity:{shuu:100}}),w=app.window;
  try{
    w.eval('petUi.open("shop")');click(w,'[data-pet-tab="contests"]');assert.equal(w.document.querySelectorAll('[data-pet-course]').length,3);
    const money=read(w,'s.money');click(w,'[data-pet-course="advanced"]');click(w,'[data-pet-action="enter"]');
    assert.equal(read(w,'s.money'),money-800+1600);assert.match(w.document.querySelector('.pet-contest-result').textContent,/1位.*100点/s);
    assert.equal(w.document.querySelector('[data-pet-action="enter"]').disabled,true);
    click(w,'[data-pet-action="close"]');w.eval('petUi.open("shop")');click(w,'[data-pet-tab="contests"]');assert.equal(w.document.querySelector('[data-pet-action="enter"]').disabled,true);
    const select=w.document.querySelector('#petContestKind');select.value='fish';select.dispatchEvent(new w.Event('change',{bubbles:true}));assert.equal(w.document.querySelector('[data-pet-action="enter"]').disabled,true);
    assert.match(w.document.querySelector('#petContestParticipant').textContent,/飼育中の魚がいない/);
    assert.deepEqual(app.errors,[]);
  }finally{app.dispose();}
});

test('the offline cache includes every new pet module and matches the versions used by the page and scene worker',()=>{
  const root=path.join(__dirname,'..'),sw=fs.readFileSync(path.join(root,'sw.js'),'utf8'),html=fs.readFileSync(path.join(root,'index.html'),'utf8');
  for(const [file,version] of Object.entries({'pet-life.js':'189-1','pet-life-ui.js':'190-1','aquarium-life.js':'184-1','pet-life.css':'190-1','scene-layers.js':'182-1','layered-scenery.js':'182-1'})){assert.ok(fs.existsSync(path.join(root,file)));assert.ok(sw.includes(`./${file}?v=${version}`));assert.ok(html.includes(`${file}?v=${version}`));}
  assert.ok(html.includes('./sw.js?v=190-1'));assert.ok(sw.includes('nushi-tsuri-v190-'));
});
