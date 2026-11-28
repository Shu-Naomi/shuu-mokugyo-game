const {test}=require('node:test'),assert=require('node:assert/strict');
const {boot,seed,read}=require('./game-harness.cjs');
const R=require('../rural-canals-252-93.js'), M=require('../mountain-region.js');
test('the painted dirt branch beside the rural bridge is walkable, but the sluice and paddies stay closed',()=>{
  const app=boot({...seed(),mapRegion:R.id,x:174,y:74,direction:'right',soundEnabled:false});
  const w=app.window;
  const hold=(direction)=>{
    const b=w.document.querySelector('[data-move="'+direction+'"]');
    b.onpointerdown({preventDefault(){},currentTarget:b,pointerId:1});b.onpointerup();
  };
  try{
    for(const d of ['down','right','down','right','down'])hold(d);
    assert.deepEqual(read(w,'[s.x,s.y]'),[182,85]);
    hold('down');assert.deepEqual(read(w,'[s.x,s.y]'),[182,85]);
    for(const d of ['up','left','up','left','up'])hold(d);
    const pos=read(w,'[s.x,s.y]');assert.ok(Math.hypot(pos[0]-174,pos[1]-74)<=1,JSON.stringify(pos));
    for(const xy of [[1285,617],[1320,570],[1284,649],[1200,609],[1097,483]]){
      const p=R.point(xy);assert.equal(M.walkable(p.x,p.y,R.id),false,xy.join(','));
    }
    const deck=R.point([1145,470]);assert.ok(M.onBridge(deck.x,deck.y,R.id));assert.ok(M.walkable(deck.x,deck.y,R.id));
    assert.deepEqual(app.errors,[]);
  }finally{app.dispose()}
});
