const {test}=require('node:test');
const assert=require('node:assert/strict');
const {boot,seed,read,saveKey}=require('./game-harness.cjs');

const click=(w,selector)=>{const el=w.document.querySelector(selector);assert.ok(el,selector);assert.equal(el.disabled,false,selector);el.click();return el;};
function frameClock(w){
  const callbacks=new Map();let now=0,nextId=1000;
  w.requestAnimationFrame=fn=>{const id=++nextId;callbacks.set(id,fn);return id;};
  w.cancelAnimationFrame=id=>callbacks.delete(id);
  return {step(ms=100){now+=ms;const frames=[...callbacks.values()];callbacks.clear();frames.forEach(fn=>fn(now));},pending(){return callbacks.size;}};
}

test('tap a tiny Moroko beside a nushi to inspect it at a readable size, then return to the physical scale',()=>{
  const app=boot({...seed(),caught:{...seed().caught,moroko:1,nushi:1},money:5000},{petTankStage:[360,205],petInspectStage:[360,205]}),w=app.window;
  const clock=frameClock(w);let saved;
  try{
    assert.equal(w.eval('petUi.open("shop")'),true);
    click(w,'[data-pet-buy="moroko"]');click(w,'[data-pet-action="aquarium"]');click(w,'[data-pet-action="nushi"]');
    clock.step();const uid=read(w,'s.petLife.fish.find(f=>f.species==="moroko").uid');
    const normal=w.document.querySelector(`[data-pet-fish="${uid}"]`),nushi=w.document.querySelectorAll('[data-pet-fish]')[1];
    assert.ok(parseFloat(normal.style.width)<parseFloat(nushi.style.width),'whole tank keeps real size contrast');
    assert.ok(parseFloat(normal.style.width)<=12,'Moroko is tiny beside the nushi');
    const target=w.document.querySelector(`#petTankStage [data-pet-inspect="${uid}"]`);
    assert.ok(parseFloat(target.style.width)>=44,'tiny fish still has a finger-size touch target');
    assert.match(target.getAttribute('aria-label'),/モロコ.*拡大/);
    assert.equal(w.document.querySelectorAll('.pet-fish-roster button').length,2);
    target.click();clock.step();
    assert.ok(w.document.querySelector('#petInspectStage'));
    const inspected=w.document.querySelector('#petInspectFish');
    assert.ok(parseFloat(inspected.style.width)>170,'individual view does not inherit the nushi tank scale');
    assert.match(inspected.dataset.aquariumFrame,/^moroko:/);
    assert.match(w.document.querySelector('.pet-inspect-caption').textContent,/モロコ.*7\.50cm/);
    assert.equal(w.document.querySelector('#petTankStage'),null);
    assert.equal(read(w,'s.petLife.selected'),uid);
    const frames=new Set();for(let i=0;i<100;i++){clock.step();frames.add(inspected.dataset.aquariumFrame);}
    assert.ok([...frames].some(frame=>frame.includes(':turn:2')),'enlarged fish uses actual front-facing pixel art');
    click(w,'[data-pet-action="focus-close"]');clock.step();
    assert.ok(w.document.querySelector('#petTankStage'));
    assert.ok(parseFloat(w.document.querySelector(`[data-pet-fish="${uid}"]`).style.width)<=12);
    assert.equal(w.document.querySelector('#petInspectStage'),null);
    saved=JSON.parse(w.localStorage.getItem(saveKey));
    assert.equal(saved.petLife.fish.length,2);assert.equal(saved.petLife.selected,uid);
    assert.deepEqual(app.errors,[]);
  }finally{app.dispose();}
  const reload=boot(saved,{petTankStage:[360,205],petInspectStage:[360,205]});
  try{reload.window.eval('petUi.open("aquarium")');assert.ok(reload.window.document.querySelector('#petTankStage'));
    assert.equal(read(reload.window,'s.petLife.selected'),saved.petLife.selected);assert.deepEqual(reload.errors,[]);}
  finally{reload.dispose();}
});

test('fish list and picker switch specimens inside the large view without changing care or payments',()=>{
  const app=boot({...seed(),caught:{...seed().caught,moroko:1,nushi:1},money:5000},{petTankStage:[360,205],petInspectStage:[360,205]}),w=app.window;
  const clock=frameClock(w);
  try{
    w.eval('petUi.open("shop")');click(w,'[data-pet-buy="moroko"]');click(w,'[data-pet-action="aquarium"]');click(w,'[data-pet-action="nushi"]');
    const before=read(w,'({money:s.money,food:s.petLife.food,fish:s.petLife.fish})');
    const moroko=read(w,'s.petLife.fish.find(f=>f.species==="moroko").uid');
    click(w,`.pet-fish-roster [data-pet-inspect="${moroko}"]`);clock.step();
    assert.match(w.document.querySelector('#petInspectFish').dataset.aquariumFrame,/^moroko:/);
    const picker=w.document.querySelector('#petFishSelect');picker.value=read(w,'s.petLife.fish.find(f=>f.species==="nushi").uid');
    picker.dispatchEvent(new w.Event('change',{bubbles:true}));clock.step();
    assert.match(w.document.querySelector('#petInspectFish').dataset.aquariumFrame,/^nushi:/);
    assert.ok(parseFloat(w.document.querySelector('#petInspectFish').style.width)>170);
    assert.match(w.document.querySelector('#petInspectStage').getAttribute('aria-label'),/ヌシ/);
    click(w,'[data-pet-action="focus-close"]');click(w,'[data-pet-action="zoom"]');
    assert.equal(w.document.querySelector('#petLifeModal').classList.contains('pet-zoomed'),true);
    clock.step();click(w,`#petTankStage [data-pet-inspect="${moroko}"]`);clock.step();
    assert.equal(w.document.querySelector('#petLifeModal').classList.contains('pet-zoomed'),false);
    assert.ok(w.document.querySelector('#petInspectStage'));
    assert.deepEqual(read(w,'({money:s.money,food:s.petLife.food,fish:s.petLife.fish})'),before);
    assert.deepEqual(app.errors,[]);
  }finally{app.dispose();}
});

test('reduced motion shows one stable large frame; switching tanks or rehoming exits the old focus',()=>{
  const app=boot({...seed(),caught:{...seed().caught,moroko:1},money:5000},{petTankStage:[360,205],petInspectStage:[360,205]}),w=app.window;
  const clock=frameClock(w);
  try{
    w.matchMedia=()=>({matches:true});w.eval('petUi.open("shop")');click(w,'[data-pet-buy="moroko"]');
    click(w,'[data-pet-action="aquarium"]');click(w,'[data-pet-action="zoom"]');click(w,'[data-pet-action="zoom"]');
    click(w,'.pet-fish-roster [data-pet-inspect]');clock.step();
    const inspected=w.document.querySelector('#petInspectFish');assert.match(inspected.dataset.aquariumFrame,/moroko:swim:0/);
    assert.equal(clock.pending(),0);
    const tank=w.document.querySelector('#petTankSelect');tank.value='1';tank.dispatchEvent(new w.Event('change',{bubbles:true}));
    assert.equal(w.document.querySelector('#petInspectStage'),null);
    assert.ok(w.document.querySelector('.pet-empty'));
    const back=w.document.querySelector('#petTankSelect');back.value='0';back.dispatchEvent(new w.Event('change',{bubbles:true}));
    click(w,'.pet-fish-roster [data-pet-inspect]');clock.step();
    click(w,'[data-pet-action="rehome"]');click(w,'[data-pet-action="rehome-confirm"]');
    assert.equal(w.document.querySelector('#petInspectStage'),null);
    assert.ok(w.document.querySelector('.pet-empty'));
    assert.equal(read(w,'s.petLife.fish.length'),0);
    assert.deepEqual(app.errors,[]);
  }finally{app.dispose();}
});
