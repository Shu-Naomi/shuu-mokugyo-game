const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const R=require('../rural-canals.js'),Life=require('../world-life.js');

test('the draft farm loop reaches both ends of all three painted bridges and the fishing banks through four-unit movement',()=>{
 const queue=[R.entry],seen=new Set([R.entry.x+','+R.entry.y]);
 for(let i=0;i<queue.length;i++)for(const direction of ['left','right','up','down']){const p=queue[i],n=Life.moveTarget(p.x,p.y,direction,4,R.walkable),key=n.x+','+n.y;if(!seen.has(key)){seen.add(key);queue.push(n);}}
 const targets=[...R.rawBridges.flatMap(b=>b.points.map(p=>({id:b.id,...R.point(p)}))),...R.fishingPoints];
 for(const target of targets)assert.ok(queue.some(p=>Math.hypot(p.x-target.x,p.y-target.y)<=2),'reachable '+JSON.stringify(target));
});

test('paddy water and canal centres stay closed to feet; only measured bridges cross water',()=>{
 for(const p of [[440,460],[1220,710],[930,150],[1180,290],[320,870],[960,520],[650,736]]){const q=R.point(p);assert.equal(R.walkable(q.x,q.y),false,'wet field/channel '+p);}
 for(const b of R.rawBridges){const a=b.points[0],z=b.points[1],q=R.point([(a[0]+z[0])/2,(a[1]+z[1])/2]);assert.equal(R.bridgeAt(q.x,q.y),b.id);assert.equal(R.walkable(q.x,q.y),true);}
 for(const p of [[NaN,50],[60,Infinity],[-1,50],[240,134]])assert.equal(R.walkable(...p),false);
});

test('the planned fishing feet are dry banks and cast into a canal, without using rice fields as a fishing pool',()=>{
 for(const p of R.fishingPoints){assert.equal(R.walkable(p.x,p.y),true,p.id+' dry feet');const water=R.fishingWater(p.x,p.y,p.direction);assert.ok(water,p.id+' canal');assert.equal(R.walkable(water.x,water.y),false);assert.equal(R.paddyAt(water.x,water.y),false);}
});

test('the new artwork is the unmodified original and the draft cannot change live saves or offline downloads',()=>{
 const root=path.join(__dirname,'..'),data=fs.readFileSync(path.join(root,R.asset));assert.equal(crypto.createHash('sha256').update(data).digest('hex'),'a007a6021399335c26eb52e72f479a9c7dff0fd3873e639584fbc85aa7c8e363');
 assert.equal(data.readUInt32BE(16),1672);assert.equal(data.readUInt32BE(20),940);
 for(const file of ['index.html','sw.js'])assert.ok(!fs.readFileSync(path.join(root,file),'utf8').includes('rural-canals'),'draft not connected: '+file);
});
