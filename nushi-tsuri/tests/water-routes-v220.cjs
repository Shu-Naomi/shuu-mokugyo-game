// Plan reachable casts with the same stride and collision sweeps as field controls.
// Shared by the DOM regressions and real desktop/touchscreen smoke tests.
const cases=[
 {region:'village',start:[123,92],type:'lake'},
 {region:'village',start:[123,92],type:'river'},
 {region:'village',start:[123,92],type:'sea'},
 {region:'stream',start:[152,128],type:'stream'},
 {region:'stream',start:[152,128],type:'pond'},
 {region:'stream',start:[152,128],type:'marsh'},
 {region:'mountainPond',start:[120,128],type:'highPond'},
 {region:'mountainMarsh',start:[43,128],type:'highMarsh'},
 {region:'cave',start:[120,128],type:'underground'},
 {region:'coast',start:[115,77],type:'sand'},
 {region:'coast',start:[88,92],type:'reef'},
 {region:'coast',start:[100,77],type:'sand',boat:true},
 {region:'coast',start:[104,92],type:'reef',boat:true},
];
function findRoute(w,target){
 const s=w.eval('s'),M=w.ShuMountain,C=w.ShuCoast,original={x:s.x,y:s.y,direction:s.direction};
 const queue=[{x:s.x,y:s.y,direction:s.direction,path:[]}],seen=new Set([s.x+','+s.y]);
 const delta={up:[0,-1],right:[1,0],down:[0,1],left:[-1,0]};
 try{
  for(let cursor=0;cursor<queue.length;cursor++){
   const p=queue[cursor];Object.assign(s,{x:p.x,y:p.y,direction:p.direction});
   const hit=w.fishingWaterNearPlayer(),type=hit?.type||(s.mapRegion==='coast'?C.coastName(p.x,p.y):hit?.zone);
   const blocked= M.isRegion(s.mapRegion)?Boolean(M.exitAt(p.x,p.y,s.mapRegion))
    :s.mapRegion==='coast'?Boolean(w.activeLandingDock())||(!s.boatActive&&C.near(s,C.restPoint,10))
    :Boolean(w.activeLandingDock()||w.nearbyTournamentNpc()||w.nearbyRival()||w.nearbyForagePoint()||w.isNearPracticePond()||w.nearbyWorldLandmark()||w.isAtSamShopEntrance()||M.atVillageGate(p.x,p.y));
   if(p.path.length&&hit&&type===target&&!blocked)return {x:p.x,y:p.y,direction:p.direction,hit,path:p.path};
   for(const [direction,[dx,dy]]of Object.entries(delta)){
    const stride=s.mapRegion==='coast'&&s.boatActive?C.stepFor(s.equipment.vehicle):4;
    const next=M.isRegion(s.mapRegion)?M.moveTarget(p.x,p.y,direction,stride,s.mapRegion):{x:p.x+dx*stride,y:p.y+dy*stride};
    const key=next.x+','+next.y;if(seen.has(key)||!w.isWalkableWorld(next.x,next.y)||!w.isWalkableWorldSegment(p.x,p.y,next.x,next.y))continue;
    seen.add(key);queue.push({...next,direction,path:[...p.path,direction]});
   }
  }
  throw Error('No usable cast route: '+s.mapRegion+'/'+target);
 }finally{Object.assign(s,original);}
}
module.exports={cases,findRoute};
