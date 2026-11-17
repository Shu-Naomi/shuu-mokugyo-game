const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const scripts=['village-reference','world-life','rural-canals','mountain-region','coast-voyage','offshore-island','rival-anglers','tournament-npcs','field-guide'];
function load(search='',includeReference=true){const c=vm.createContext({location:{search},URLSearchParams});for(const id of scripts){if(!includeReference&&id==='village-reference')continue;vm.runInContext(fs.readFileSync(path.join(__dirname,'..',id+'.js'),'utf8'),c,{filename:id});}return c;}
const json=x=>JSON.parse(JSON.stringify(x));
test('reference disabled has exactly the same route, resident, rival and guide data as no reference module',()=>{
 const original=load('',false),normal=load(''),wrong=load('?villageReference=0');
 for(const name of scripts.slice(1).map(n=>({'world-life':'ShuWorldLife','rural-canals':'ShuRural','mountain-region':'ShuMountain','coast-voyage':'ShuCoast','offshore-island':'ShuOffshore','rival-anglers':'ShuRivals','tournament-npcs':'ShuTournamentNpcs','field-guide':'ShuFieldGuide'})[n]))for(const c of [normal,wrong])assert.deepEqual(json(c[name]),json(original[name]),name);
});
test('reference exits and return anchors follow north and east roads; remote regions stay unchanged',()=>{
 const c=load('?villageReference=1'),n=load(),r=c.ShuVillageReference;
 assert.ok(c.ShuMountain.atVillageGate((r.routes.mountain.gate.left+r.routes.mountain.gate.right)/2,3));
 assert.ok(c.ShuRural.atVillageGate((r.routes.rural.gate.left+r.routes.rural.gate.right)/2,(r.routes.rural.gate.top+r.routes.rural.gate.bottom)/2));
 assert.deepEqual(json(c.ShuMountain.villageReturn),json(r.routes.mountain.return));
 assert.deepEqual(json(c.ShuRural.data.returnTarget),{region:'village',...json(r.routes.rural.return)});
 for(const p of [c.ShuMountain.villageReturn,c.ShuRural.villageReturn,c.ShuOffshore.harbor,r.routes.boat.land])assert.ok(r.walkable(p.x,p.y));
 for(const region of Object.keys(n.ShuMountain.regions).filter(id=>id!=='ruralCanals'))assert.deepEqual(json(c.ShuMountain.regions[region]),json(n.ShuMountain.regions[region]),region);
 for(const key of ['entry','waters','rawTrails','fishingPoints','populations'])assert.deepEqual(json(c.ShuRural[key]),json(n.ShuRural[key]));
 assert.deepEqual(json(c.ShuCoast),json(n.ShuCoast),'coast map docks and water are not village coordinates');
});
test('ferry round trip returns to painted pier without altering fare, time or destination behavior',()=>{
 const c=load('?villageReference=1'),f=c.ShuOffshore,s={mapRegion:'village',...f.harbor,money:800};
 assert.equal(f.voyage(s).ok,true);assert.equal(s.mapRegion,'offshore');assert.equal(s.money,0);
 assert.equal(f.voyage(s,true).ok,true);assert.equal(s.mapRegion,'village');assert.equal(s.money,0);assert.equal(s.x,f.harbor.x);assert.equal(s.y,f.harbor.y);
 assert.ok(c.ShuVillageReference.walkable(s.x,s.y));
});
test('all village resident lanes, rival/dog feet and tournament fishing placements are dry, with identities and plans retained',()=>{
 const c=load('?villageReference=1'),n=load(),r=c.ShuVillageReference;
 for(const resident of c.ShuWorldLife.residents){const old=n.ShuWorldLife.residents.find(p=>p.id===resident.id);if(resident.region!=='village'){assert.deepEqual(json(resident),json(old));continue;}
  assert.deepEqual(json({...resident,route:old.route}),json(old));
  for(let t=0;t<=1;t+=.025){const [a,b]=resident.route;assert.ok(r.walkable(a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t),resident.id);}
 }
 for(const p of [...c.ShuRivals.placements,...c.ShuRivals.dogPlacements,...c.ShuTournamentNpcs.venues.lakeFuna]){assert.ok(r.walkable(p.x,p.y),p.id);assert.ok(['left','right'].includes(p.facing));}
 for(const p of [...c.ShuRivals.placements,...c.ShuTournamentNpcs.venues.lakeFuna])assert.ok(Array.from({length:40},(_,i)=>r.water(p.x+(p.facing==='left'?-1:1)*(i+1)/4,p.y)).includes('lake'),p.id+' faces lake water');
 assert.deepEqual(json(c.ShuRivals.anglers),json(n.ShuRivals.anglers));assert.deepEqual(json(c.ShuRivals.dogs),json(n.ShuRivals.dogs));assert.deepEqual(json(c.ShuRivals.profiles),json(n.ShuRivals.profiles));assert.deepEqual(json(c.ShuTournamentNpcs.roster),json(n.ShuTournamentNpcs.roster));
 const definition={duration:90,castMinutes:10,capacity:5,npcProfiles:c.ShuRivals.profiles};
 for(let seed=1;seed<=100;seed++)assert.deepEqual(json(c.ShuTournamentNpcs.generate(definition,seed)),json(n.ShuTournamentNpcs.generate(definition,seed)));
});
test('field guide uses original reference art and measured water markers without affecting other regions',()=>{
 const c=load('?villageReference=1'),n=load();
 function model(ctx,region){return ctx.ShuFieldGuide.model({mapRegion:region,x:100,y:70},{mountain:ctx.ShuMountain,coast:ctx.ShuCoast,offshore:ctx.ShuOffshore,life:ctx.ShuWorldLife,additions:{definitions:[],pools:{}},baits:{},hooks:{},lakePolygon:ctx.ShuVillageReference.geometry.lakeWaterPolygon,villagePlaces:ctx.ShuRural.guideEntries()});}
 const m=model(c,'village');assert.equal(m.asset,c.ShuVillageReference.source.asset);
 for(const id of ['lake','river','sea']){const e=m.entries.find(e=>e.id==='water-'+id);assert.deepEqual(json(e.point),json(c.ShuVillageReference.guide.waterPoints[id]));assert.equal(c.ShuVillageReference.water(e.point.x,e.point.y),id);}
 const exit=m.entries.find(e=>e.id==='village-mountain');assert.ok(c.ShuMountain.atVillageGate(exit.point.x,exit.point.y));assert.deepEqual(json(m.entries.find(e=>e.id==='village-rural').point),json(c.ShuVillageReference.routes.rural.guide));
 for(const region of ['coast','offshore','stream','mountainPond'])assert.deepEqual(json(model(c,region)),json(model(n,region)));
});
