const {test}=require('node:test');
const assert=require('node:assert/strict');
const {renderer,ids}=require('./coastal-fish-render-harness.cjs');
const {boot,seed,read}=require('./game-harness.cjs');
const Life=require('../aquarium-life.js');

test('all 48 coastal fish poses paint complete silhouettes; swimming changes tails without shaking heads',async()=>{
  const app=await renderer();
  try {
    for(const id of ids) {
      const swim=[],heads=[];
      for(const cells of [8,5,3])for(let frame=0;frame<cells;frame++) {
        const c=app.draw(id,cells,frame),pixels=Buffer.from(c.getContext('2d').getImageData(0,0,c.width,c.height).data);
        let opaque=0,edge=0,right=0;
        for(let y=0;y<c.height;y++)for(let x=0;x<c.width;x++)if(pixels[(y*c.width+x)*4+3]>120){
          opaque++;right=Math.max(x,right);
          if(x<2||y<2||x>=c.width-2||y>=c.height-2)edge++;
        }
        assert.ok(opaque>6000,`${id} ${cells}/${frame}: a complete fish is painted`);
        assert.equal(edge,0,`${id} ${cells}/${frame}: no clipped tips or neighbouring sprites`);
        if(cells===8){swim.push(pixels);heads.push(right);}
      }
      assert.notDeepEqual(swim[0],swim[2],`${id}: tail beat is drawn, not repeated still frames`);
      assert.ok(Math.max(...heads)-Math.min(...heads)<=2,`${id}: nose stays registered across the tail beat`);
    }
    assert.deepEqual(app.errors,[]);
  }finally{app.dispose();}
});

test('coastal grid art survives underwater headings, landing, catch and aquarium without an old fish behind it',()=>{
  const app=boot(),w=app.window;
  try {
    w.eval('cast(fishingSpots[0]);beginFishing();clearInterval(timer);battle.cast=50;launchSurfaceCast();settleSurfaceCast();startFight();clearInterval(timer);finishHookReveal()');
    for(const id of ids) {
      for(const mode of ['swim','turn','mouth']) {
        w.eval(`Object.assign(battle,{phase:'fight',f:fish.find(f=>f.id==='${id}'),frame:6,mouthState:'${mode==='mouth'?'open':'closed'}',turning:${mode==='turn'?'{from:1,to:-1}':'null'},turnSpriteFrame:2});renderBattleFish()`);
        const el=w.document.querySelector('#battleFish'),canvas=el.querySelector('canvas');
        assert.ok(el.classList.contains('life-canvas'));
        assert.equal(el.dataset.spriteMode,mode);
        assert.match(canvas.dataset.atlasKey,new RegExp(`fish-coastal-v208\\.png.*${id}$`));
        assert.equal(w.getComputedStyle(canvas).display,'block');
        assert.doesNotMatch(w.getComputedStyle(el).backgroundImage,/url\(/);
      }
      w.eval('surfaceCatch()');
      assert.ok(w.document.querySelector('#battleFish').classList.contains('life-canvas'));
      assert.equal(w.document.querySelector('#battleFish canvas').style.display,'block');
      for(let step=0;step<10;step++) {
        w.eval(`renderCatchFishLife(fish.find(f=>f.id==='${id}'),${step})`);
        assert.ok(w.document.querySelector('#catchFish').classList.contains('canvas-atlas'));
        assert.match(w.document.querySelector('#catchFish canvas').dataset.atlasKey,new RegExp(`fish-coastal-v208\\.png.*${id}$`));
      }
      w.eval(`drawAquariumSprite($('#homeAquariumFish'),'${id}',4,{spriteMode:'swim'})`);
      assert.match(w.document.querySelector('#homeAquariumFish canvas').dataset.atlasKey,new RegExp(`fish-coastal-v208\\.png.*${id}$`));
    }
    assert.deepEqual(app.errors,[]);
  }finally{app.dispose();}
});

test('every coastal size rank stays visible in the roster, details and enlarged view',()=>{
  const app=boot({...seed(),caught:{shirogisu:1,ainame:1,madai:1},money:100000}),w=app.window;
  try {
    for(const id of ids) {
      w.eval(`s.petLife.fish=[];ShuPetLife.acquire(s,'${id}',petCatalog,gameClockAt(s.gameMinutes).dayIndex);petUi.open('aquarium')`);
      const tiers=read(w,`fishSizeProfiles.${id}`);
      for(const tier of tiers) {
        const length=Math.floor((tier.minHundredths+tier.maxHundredths)/2);
        w.eval(`s.petLife.fish[0].length=${length};petUi.render()`);
        assert.equal(w.document.querySelector('[data-pet-size-rank]').textContent,tier.label);
        assert.ok(w.document.querySelector('.pet-fish-roster').textContent.includes(tier.label));
        assert.ok(w.document.querySelector('#petFishSelect').textContent.includes(tier.label));
        w.document.querySelector('.pet-fish-roster button').click();
        assert.ok(w.document.querySelector('.pet-inspect-caption').textContent.includes(tier.label));
        w.document.querySelector('[data-pet-action="focus-close"]').click();
      }
    }
    assert.deepEqual(app.errors,[]);
  }finally{app.dispose();}
});

test('inspection spends most of its time swimming and turns at the ends, respecting reduced motion',()=>{
  for(const id of [...ids,'bass']) {
    const poses=Array.from({length:300},(_,i)=>Life.inspection(id,i*.1));
    assert.ok(poses.filter(p=>p.spriteMode==='swim').length>poses.length*.6);
    assert.ok(poses.some(p=>p.spriteMode==='turn'&&p.turnFrame===2));
    assert.ok(new Set(poses.filter(p=>p.spriteMode==='swim').map(p=>p.swimFrame%8)).size===8);
    for(let i=1;i<poses.length;i++)assert.ok(Math.abs(poses[i].x-poses[i-1].x)<1,'no teleport while turning');
    assert.deepEqual(Life.inspection(id,0,true),Life.inspection(id,100,true));
  }
});
