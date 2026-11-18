const {test}=require('node:test'), assert=require('node:assert/strict');
const I=require('../offshore-island.js'), L=require('../world-life.js');

test('the two sides of the shelter tree crown follow the painted verge',()=>{
  for(const [x,y] of [[97,61],[97.5,61],[92,59],[97,62]]) assert.equal(I.walkable(x,y),false,'leaves '+[x,y]);
  for(const [x,y] of [[95,60],[97,60],[101,61.5],[103,62],[105,62],[111,62],[114,62]]) assert.ok(I.walkable(x,y),'dirt '+[x,y]);
  for(const [from,dir,to] of [[[97,56],'down',[97,60]],[[101,60],'right',[105,60]],[[105,60],'down',[105,62]],[[105,62],'left',[103,62]],[[103,62],'up',[103,58]]]) {
    assert.deepEqual(L.moveTarget(...from,dir,4,I.walkable),{x:to[0],y:to[1]});
  }
});
