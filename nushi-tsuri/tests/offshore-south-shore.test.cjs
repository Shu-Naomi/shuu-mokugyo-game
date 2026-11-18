'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const I=require('../offshore-island.js'),L=require('../world-life.js');
// Landmarks traced from the actual painting and screenshot 11313. Follow the
// connected rock rim clockwise rather than the former straight line over pools.
const route=[[56,68],[52,68],[52,76],[52,81],[40,81],[36,81],[36,80],[35,80],[35,76],[28,76],[26,76],[26,70],[27,70],[27,69]];
test('southern reef dry rim connects the road to the original west fishing lip and back',()=>{
 for(const points of [route,[...route].reverse()]){
  let [x,y]=points[0];
  for(const [a,b]of points.slice(1)){
   assert.ok(x===a||y===b);
   const direction=a>x?'right':a<x?'left':b>y?'down':'up';
   const result=L.moveTarget(x,y,direction,Math.abs(a-x)+Math.abs(b-y),I.walkable);
   assert.deepEqual(result,{x:a,y:b},'dry rim from '+x+','+y+' to '+a+','+b);
   x=a;y=b;
  }
 }
 const water=I.fishingWater(27,69,'left');
 assert.ok(water&&I.water(water.x,water.y));
});
test('southern reef turquoise pools and neighboring cliff cannot be walked across',()=>{
 for(const [x,y]of [[32,71],[39,67],[41,73],[46,78],[60,73],[58,80]]){
  assert.equal(I.walkable(x,y),false,'not dry '+x+','+y);
 }
 for(const [x,y]of [[32,71],[39,67],[41,73],[46,78]])assert.equal(I.water(x,y),true,'pool '+x+','+y);
 assert.ok(L.moveTarget(52,68,'left',20,I.walkable).x>=43,'cannot cross the upper pool');
});
module.exports={route};
test('reported sandy entrance and the northern stone spit work in both directions without crossing its fence',()=>{
 for(const [x,y,d,a,b]of [[49,68,'right',53,68],[53,68,'left',49,68],[56,68,'up',56,64],[56,64,'up',56,60],[56,60,'up',56,58],[56,58,'down',56,62],[56,62,'down',56,66],[56,66,'down',56,68]]){
  const stride=Math.abs(a-x)+Math.abs(b-y);
  assert.deepEqual(L.moveTarget(x,y,d,stride,I.walkable),{x:a,y:b});
 }
 for(const [x,y]of [[62,61],[60,63],[48,60],[44,60],[33,61]])assert.equal(I.walkable(x,y),false,'fence, water gap, or detached rock '+x+','+y);
});
