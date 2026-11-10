const assert=require('node:assert/strict');
const ref=require('../village-reference');
assert.equal(ref.enabled,false);
assert.deepEqual(ref.point([1672,941]),[240,135]);
const check=(px,py,value,label)=>assert.equal(ref.walkable(...ref.point([px,py])),value,label);
check(700,220,false,'lake');check(710,460,false,'river');check(710,526,true,'stone bridge');check(1000,875,false,'sea');check(1500,505,false,'practice pond');check(1515,165,false,'Riao wall');check(242,203,true,'inn front');check(1330,604,true,'Sam front');check(1588,222,true,'visible provisional board front');
const goals={...Object.fromEntries(Object.entries(ref.landmarks).map(([id,l])=>[id,l.interaction])),home:ref.exits.home.bounds,north:ref.exits.north.bounds,east:ref.exits.east.bounds,bridge:ref.geometry.riverBridgeBounds,boat:ref.rect(945,984,790,818),ferry:ref.rect(1428,1482,608,642),practice:ref.rect(1558,1592,539,574)};
for(let px=0;px<4;px++)for(let py=0;py<4;py++){
 const key=(x,y)=>`${x},${y}`;let start=[Math.round((ref.exits.home.return.x-px)/4)*4+px,Math.round((ref.exits.home.return.y-py)/4)*4+py];
 assert.ok(ref.walkable(...start),`start phase ${px},${py}`);
 const seen=new Set([key(...start)]),queue=[start];for(let i=0;i<queue.length;i++){const [x,y]=queue[i];for(const [dx,dy]of [[4,0],[-4,0],[0,4],[0,-4]]){const a=x+dx,b=y+dy,k=key(a,b);if(!seen.has(k)&&ref.segment(x,y,a,b)){seen.add(k);queue.push([a,b]);}}}
 for(const [id,r]of Object.entries(goals))assert.ok(queue.some(([x,y])=>ref.inside(x,y,r)),`phase ${px},${py} reaches ${id}`);
 for(const [id,p]of Object.entries(ref.forage))assert.ok(queue.some(([x,y])=>Math.hypot(x-p.x,y-p.y)<4),`phase ${px},${py} reaches forage ${id}`);
}
console.log('Reference geometry: exact points and all sixteen 4-unit phases pass');
for(const [x,y] of [[100,40],[590,40],[870,30],[1630,120],[30,200],[1620,360],[420,345],[1130,210],[1180,490],[840,570],[880,660]])check(x,y,false,`painted forest ${x},${y}`);
for(const [x,y] of [[170,380],[294,382],[1520,505],[144,854],[590,890],[1240,850],[1560,648],[710,600],[730,380],[600,220],[900,235]])check(x,y,false,`painted pool/water ${x},${y}`);
for(const [x,y] of [[70,515],[390,280],[500,100],[800,80],[1080,270],[1430,229],[1330,430],[1170,570],[380,518],[710,526],[1450,720]])check(x,y,true,`painted dry route ${x},${y}`);
for(const [id,l] of Object.entries(ref.landmarks))check(l.x/240*1672,l.y/135*941,true,`${id} real front`);
assert.equal(ref.rescuePosition({mapRegion:'coast',x:20,y:30}).x,20);
assert.equal(ref.rescuePosition({mapRegion:'mountain',x:20,y:30}).y,30);
assert.ok(ref.walkable(...Object.values(ref.rescuePosition({mapRegion:'village',x:230,y:110})).slice(0,2)));
