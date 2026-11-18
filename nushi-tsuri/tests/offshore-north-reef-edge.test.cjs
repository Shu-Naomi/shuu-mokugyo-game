'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const I=require('../offshore-island.js'),L=require('../world-life.js');
// Independent foot-anchor landmarks traced on the painting and 11312.png.
// The companion is below the player: its feet are not the player collision anchor.
test('reported middle reef northern rim stops before the foamy water gap',()=>{
 for(const [x,y] of [[33,39],[36,40],[38,40.5],[26,39.5]])
  assert.equal(I.walkable(x,y),false,'foamy water / rock face '+x+','+y);
 for(const [x,y] of [[28,41],[30,41],[33,41],[36,42],[38,42]])
  assert.equal(I.walkable(x,y),true,'dry middle rock top '+x+','+y);
 const p=L.moveTarget(33,42,'up',4,I.walkable);
 assert.ok(p.y>=40,'northward movement must not enter the foam');
 assert.ok(I.walkable(p.x,p.y),'stop on usable rock');
 assert.deepEqual(L.moveTarget(p.x,p.y,'down',4,I.walkable),{x:33,y:p.y+4});
});
test('north reef and the observation point retain outward and return routes',()=>{
 const {reefTransits}=require('./offshore-collision-fixture.cjs');
 for(const trace of reefTransits){
  let p=trace.from;
  for(const [d,x,y] of trace.steps){p=L.moveTarget(p.x,p.y,d,4,I.walkable);assert.deepEqual(p,{x,y},trace.id+' '+d);}
 }
 assert.ok(I.walkable(45,33));
 assert.equal(I.fishingWater(45,33,'down').type,'west');
});
