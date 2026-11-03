const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {loadImage}=require('@napi-rs/canvas');
const {boot,seed,read,saveKey}=require('./game-harness.cjs');
const sizes={petTankStage:[360,205],petInspectStage:[360,205]};
const source=file=>fs.readFileSync(path.join(__dirname,'..',file),'utf8');
const click=(w,selector)=>{const el=w.document.querySelector(selector);assert.ok(el,selector);assert.equal(el.disabled,false,selector);el.click();};
function selectTank(w,tank){
  click(w,'[data-pet-action="tanks"]');click(w,`[data-pet-tank="${tank}"]`);
}
function theme(w,expected,inspect=false){
  const stage=w.document.querySelector(inspect?'#petInspectStage':'#petTankStage');assert.ok(stage);
  assert.equal(stage.dataset.waterTheme,expected);
  const scenery=stage.querySelector('.pet-aquarium-scenery');assert.ok(scenery,'same noninteractive scenery layer in every view');
  return scenery;
}
function fixture(){
  const app=boot({...seed(),money:20000,caught:{...seed().caught,moroko:1,aji:1}},sizes),w=app.window;
  w.eval('petUi.open("shop")');click(w,'[data-pet-buy="moroko"]');
  w.eval('s.petLife.selectedTank=1;petUi.open("shop")');click(w,'[data-pet-buy="aji"]');
  click(w,'[data-pet-action="aquarium"]');return app;
}
const gameplay=w=>read(w,'({money:s.money,caught:s.caught,food:s.petLife.food,fish:s.petLife.fish,eggs:s.petLife.eggs,breeding:s.petLife.breeding,legendClaims:s.petLife.legendClaims})');

test('fresh/salt scenery follows the selected tank through switching, inspection and zoom without care changes',()=>{
  const app=fixture(),w=app.window;
  try{
    const before=gameplay(w);
    for(const [tank,water] of [[1,'salt'],[0,'fresh'],[1,'salt'],[0,'fresh']]){
      selectTank(w,tank);theme(w,water);
      click(w,'[data-pet-action="zoom"]');theme(w,water);
      assert.ok(w.document.querySelector('#petLifeModal').classList.contains('pet-zoomed'));
      click(w,'[data-pet-action="zoom"]');
      click(w,'.pet-fish-roster [data-pet-inspect]');theme(w,water,true);
      click(w,'[data-pet-action="focus-close"]');theme(w,water);
    }
    assert.deepEqual(gameplay(w),before);assert.deepEqual(app.errors,[]);
  }finally{app.dispose();}
});

test('eggs alone select their species water; empty ordinary tanks retain the neutral fallback',()=>{
  const app=fixture(),w=app.window;
  try{
    w.eval('s.petLife.fish=[];s.petLife.selected=null;s.petLife.eggs=[{uid:"egg-1",species:"moroko",tank:0,hatchDay:99},{uid:"egg-2",species:"aji",tank:1,hatchDay:99}];petUi.open("aquarium")');
    for(const [tank,water] of [[0,'fresh'],[1,'salt']]){
      selectTank(w,tank);theme(w,water);assert.equal(w.document.querySelectorAll('.pet-eggs').length,1);
      assert.equal(w.document.querySelectorAll('[data-pet-fish]').length,0);
    }
    selectTank(w,2);theme(w,'empty');assert.ok(w.document.querySelector('.pet-empty'));
    // JSDOM does not implement this background shorthand; the CSS contract is checked below.
    assert.deepEqual(app.errors,[]);
  }finally{app.dispose();}
});

test('both empty legendary tanks have fixed water scenery, not the ordinary empty fallback',()=>{
  const app=boot(seed(),sizes),w=app.window;
  try{
    w.eval('s.petLife.legendTanks={fresh:true,salt:true};petUi.open("aquarium")');
    for(const [tank,water] of [[6,'fresh'],[7,'salt'],[6,'fresh']]){
      selectTank(w,tank);theme(w,water);assert.ok(w.document.querySelector('.pet-empty'));
    }
    assert.deepEqual(app.errors,[]);
  }finally{app.dispose();}
});

test('scenery remains derived on reload and adds no saved state or gameplay changes',()=>{
  const app=fixture(),w=app.window;let saved,before;
  try{
    selectTank(w,0);selectTank(w,1);before=gameplay(w);
    saved=JSON.parse(w.localStorage.getItem(saveKey));
    assert.ok(saved.petLife.fish.some(f=>f.species==='aji'));
    assert.doesNotMatch(JSON.stringify(saved),/waterTheme|aquarium-salt-v252-25|aquarium-fresh-v252-25/);
  }finally{app.dispose();}
  const reload=boot(saved,sizes);
  try{
    reload.window.eval('petUi.open("aquarium")');theme(reload.window,'salt');
    assert.deepEqual(gameplay(reload.window),before);
    selectTank(reload.window,0);theme(reload.window,'fresh');
    assert.deepEqual(gameplay(reload.window),before);assert.deepEqual(reload.errors,[]);
  }finally{reload.dispose();}
});

test('fresh and salt CSS assets preserve click-through scenery, fish layering and matching offline cache references',()=>{
  const css=source('pet-life.css'),html=source('index.html'),sw=source('sw.js');
  const base=css.match(/\.pet-aquarium-scenery\s*\{([^}]+)\}/)?.[1];assert.ok(base);
  assert.match(base,/pointer-events\s*:\s*none/);assert.match(base,/z-index\s*:\s*0(?:;|$)/);
  assert.match(base,/aquarium-interior-v214\.webp/);
  for(const water of ['fresh','salt']){
    const rules=[...css.matchAll(/([^{}]+)\{([^{}]+)\}/g)];
    assert.ok(rules.some(([,selector,body])=>selector.includes(`[data-water-theme="${water}"]`)&&selector.includes('.pet-aquarium-scenery')&&body.includes(`assets/aquarium-${water}-v252-25.webp`)),`${water} explicit CSS asset routing`);
    assert.ok(sw.includes(`./assets/aquarium-${water}-v252-25.webp`),`${water} offline asset`);
  }
  for(const file of ['pet-life.css','pet-life-ui.js']){
    const ref=html.match(new RegExp(`${file.replace('.','\\.')}\\?v=([^"']+)`));assert.ok(ref);
    assert.ok(sw.includes(`./${file}?v=${ref[1]}`),`${file} index/worker revisions agree`);
    assert.equal(ref[1],'252-25',`${file} cache busts old routing/styles`);
  }
  assert.match(css,/\.pet-inspect-fish\s*\{[^}]*z-index:\s*460/);
  assert.match(css,/\.pet-glass\s*\{[^}]*pointer-events:\s*none/);
});

test('two distinct WebP scenery assets decode at landscape resolution within a bounded payload',async()=>{
  const buffers=[];
  for(const water of ['fresh','salt']){
    const file=path.join(__dirname,'..','assets',`aquarium-${water}-v252-25.webp`),bytes=fs.readFileSync(file);buffers.push(bytes);
    assert.equal(bytes.toString('ascii',0,4),'RIFF');assert.equal(bytes.toString('ascii',8,12),'WEBP');
    assert.ok(bytes.length>1024&&bytes.length<2500000,`${water} payload ${bytes.length}`);
    const img=await loadImage(bytes);
    assert.ok(img.width>=640&&img.height>=320,`${water} sufficient detail: ${img.width}x${img.height}`);
    assert.ok(img.width/img.height>=1.3&&img.width/img.height<=2.5,`${water} landscape framing`);
    assert.ok(img.width<=2560&&img.height<=1600,`${water} bounded decode size`);
  }
  assert.notDeepEqual(buffers[0],buffers[1],'freshwater and saltwater are distinct scenery');
});
