const {test}=require('node:test');
const assert=require('node:assert/strict');
const Mountain=require('../mountain-region.js');
const {boot,seed,read,saveKey}=require('./game-harness.cjs');
const stream=(extra={})=>({...seed(),mapRegion:'stream',hp:100,x:152,y:128,...extra});
function tap(w,direction,count=1){
  const button=w.document.querySelector(`[data-move="${direction}"]`);
  for(let i=0;i<count;i++){
    // JSDOM does not dispatch onpointerdown properties. Invoke the installed
    // handlers here; the Chromium smoke also exercises actual touchscreen taps.
    button.onpointerdown({preventDefault(){},currentTarget:button,pointerId:1});
    button.onpointerup();
  }
}
function leg(w,direction,count,x,y){
  tap(w,direction,count);
  assert.deepEqual(read(w,'({x:s.x,y:s.y})'),{x,y},`${direction} along the painted road`);
}

test('touch arrows follow the painted entrance road, cross the wooden bridge and reach the northern pass',()=>{
  const app=boot(stream()),w=app.window;
  try{
    const before=read(w,'({hp:s.hp,money:s.money,baits:s.baits,caught:s.caught,time:s.gameMinutes})');
    leg(w,'up',9,152,92);leg(w,'left',1,148,92);leg(w,'up',5,148,72);
    leg(w,'left',17,80,72);leg(w,'up',10,80,32);leg(w,'left',1,76,32);
    leg(w,'up',5,76,12);leg(w,'left',1,72,12);leg(w,'up',1,72,8);
    w.document.querySelector('#action').click();assert.equal(read(w,'s.mapRegion'),'mountainPond');
    assert.deepEqual(read(w,'({hp:s.hp,money:s.money,baits:s.baits,caught:s.caught,time:s.gameMinutes})'),before);
    assert.deepEqual(app.errors,[]);
  }finally{app.dispose();}
});

test('the bridge eastern landing connects to the visible bend and cave using the touch arrows',()=>{
  const app=boot(stream({x:148,y:72})),w=app.window;
  try{
    leg(w,'up',1,148,68);leg(w,'right',6,172,68);leg(w,'up',3,172,56);
    leg(w,'right',1,176,56);leg(w,'up',2,176,48);leg(w,'right',3,188,48);
    leg(w,'up',1,188,44);leg(w,'right',3,200,44);leg(w,'up',2,200,36);
    leg(w,'right',4,216,36);leg(w,'up',2,216,28);
    w.document.querySelector('#action').click();assert.equal(read(w,'s.mapRegion'),'cave');
    assert.deepEqual(app.errors,[]);
  }finally{app.dispose();}
});

test('a step stops at the bridge rail without undoing its safe part, then allows movement to either bank',()=>{
  for(const y of [72,72.25,72.5,72.75]){
    const app=boot(stream({x:112,y})),w=app.window;
    try{
      tap(w,'up');const edge=read(w,'({x:s.x,y:s.y})');
      assert.equal(edge.x,112);assert.ok(edge.y<y,'safe approach must move');
      assert.ok(edge.y>=Mountain.bridge.top,'cannot cross the rail into water');
      for(const direction of ['left','right']){
        w.eval(`s.x=112;s.y=${edge.y};render()`);tap(w,direction,8);
        assert.ok(direction==='left'?read(w,'s.x')<=84:read(w,'s.x')>=140,direction+' bank remains accessible');
      }
      assert.deepEqual(app.errors,[]);
    }finally{app.dispose();}
  }
});

test('real tree bases and open water stay solid while the formerly blocked entrance dirt is walkable',()=>{
  for(const p of [[152,124],[152,120],[152,116],[156,108],[148,80]])
    assert.equal(Mountain.walkable(...p),true,'painted dirt '+p);
  for(const p of [[144,116],[143.6,127.6],[55.6,56.2],[112,40],[120,82],[50,38]])
    assert.equal(Mountain.walkable(...p),false,'tree or water '+p);
  assert.equal(Mountain.fishingWater(112,72,'down'),null,'wooden deck still forbids casting');
});

test('an old save inside the misplaced tree route moves to nearby dry ground and resumes without losing progress',()=>{
  const app=boot(stream({x:144,y:116}));let saved;
  try{
    const w=app.window,p=read(w,'({x:s.x,y:s.y})');
    assert.notDeepEqual(p,{x:144,y:116});assert.ok(Mountain.walkable(p.x,p.y));
    assert.equal(read(w,'s.money'),4321);assert.equal(read(w,'s.hp'),100);
    assert.deepEqual(read(w,'s.caught'),seed().caught);
    w.eval('save()');saved=JSON.parse(w.localStorage.getItem(saveKey));assert.deepEqual(app.errors,[]);
  }finally{app.dispose();}
  const restored=boot(saved);
  try{assert.deepEqual(read(restored.window,'({x:s.x,y:s.y})'),{x:saved.x,y:saved.y});assert.deepEqual(restored.errors,[]);}
  finally{restored.dispose();}
});
