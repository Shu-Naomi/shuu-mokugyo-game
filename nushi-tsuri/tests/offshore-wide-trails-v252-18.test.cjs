const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const I=require('../offshore-island.js'),L=require('../world-life.js'),root=path.resolve(__dirname,'..');
// These neighboring sandy foot positions were read from the final painting,
// including the foot anchor in 10596.png. They are not trail vertices.
const lanes=[[77,59],[78,59],[76,59],[77,60.5],[76,60.5],[75,60.5],[74,61],[73,61],[74,62],[70,64],[69,64],[71,63]];
test('the widened western bend has multiple usable lanes while its southern forest remains closed',()=>{
 for(const [x,y]of lanes)assert.equal(I.walkable(x,y),true,'wide dirt '+x+','+y);
 for(const [x,y]of [[78,64],[83,62],[88,64],[82,68]])assert.equal(I.walkable(x,y),false,'forest '+x+','+y);
 const end=L.moveTarget(77,60,'down',40,I.walkable);assert.ok(end.y<=62.5);assert.ok(I.walkable(end.x,end.y));
});
test('ordinary four-unit movement can reach the widened bend and continue to all island services',()=>{
 const q=[I.entry],seen=new Set([I.entry.x+','+I.entry.y]);
 for(let i=0;i<q.length;i++)for(const d of ['left','right','up','down']){const n=L.moveTarget(q[i].x,q[i].y,d,4,I.walkable),key=n.x+','+n.y;if(!seen.has(key)){seen.add(key);q.push(n);}}
 for(const p of [{x:77,y:60},{x:76,y:60},{x:70,y:64},I.rest,I.lighthouse,...I.fishingPoints])assert.ok(q.some(n=>Math.hypot(n.x-p.x,n.y-p.y)<=.4),'unreachable '+JSON.stringify(p));
});
test('the wider painting retains the map dimensions and is the exact asset used by the island and offline cache',()=>{
 assert.equal(I.assets.world,'assets/offshore-world-v252-18.png');const bytes=fs.readFileSync(path.join(root,I.assets.world));
 assert.equal(bytes.subarray(1,4).toString(),'PNG');assert.equal(bytes.readUInt32BE(16),1672);assert.equal(bytes.readUInt32BE(20),941);
 assert.equal(crypto.createHash('sha256').update(bytes).digest('hex'),'27c4f29ddb3acdd2ce40612235bb74a4f2e2eafbcf2ef708fdf8fb5e97a7ff0f');
 assert.match(fs.readFileSync(path.join(root,'sw.js'),'utf8'),/\.\/assets\/offshore-world-v252-18\.png/);
});
