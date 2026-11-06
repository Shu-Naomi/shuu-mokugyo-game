// Shared browser/DOM route planner. It only returns native control presses.
const marshRing=[[40,104],[37,92],[35,72],[27,55],[37,39],[55,32],[81,30],[105,19],[130,13],[158,18],[181,27],[186,39],[208,48],[220,62],[223,82],[212,96],[194,107],[160,111],[131,108],[106,112],[82,108],[61,108],[42,106]];
function planMarshRoute(target){
 const M=ShuMountain,region=s.mapRegion,dirs=['up','right','down','left'];
 const goal=(x,y,d)=>Array.isArray(target)?Math.hypot(x-target[0],y-target[1])<=2:
  target==='northFish'||target==='southFish'?M.onBridge(x,y,region)&&x>=118&&x<=127&&d===(target==='northFish'?'up':'down')&&M.fishingWater(x,y,d,region)?.type==='highMarsh':
  target==='house'?ShuWorldLife.nearby({mapRegion:region,x,y,direction:d})?.id==='marsh-house':
  target==='wetland'?M.exitAt(x,y,region)?.region==='wetland':M.atReturnGate(x,y,region);
 const queue=[{x:s.x,y:s.y,direction:s.direction,parent:-1}],seen=new Set();
 const transitions=globalThis.__marshTestTransitions ||= new Map();
 for(let i=0;i<queue.length;i++){
  const p=queue[i];if(goal(p.x,p.y,p.direction)){const route=[];for(let j=i;queue[j].parent>=0;j=queue[j].parent)route.push(queue[j].direction);return route.reverse();}
  for(const direction of dirs){const cacheKey=region+','+p.x+','+p.y+','+direction;let n=transitions.get(cacheKey);
   if(n===undefined){const moved=M.moveTarget(p.x,p.y,direction,4,region);n=isWalkableWorld(moved.x,moved.y)&&isWalkableWorldSegment(p.x,p.y,moved.x,moved.y)?moved:null;transitions.set(cacheKey,n);}
   if(!n)continue;const key=n.x+','+n.y+','+direction;
   if(!seen.has(key)){seen.add(key);queue.push({...n,direction,parent:i});}}
 }
 throw Error('No marsh route: '+region+'/'+JSON.stringify(target));
}
function marshFeet(){
 const dog=safeDogDisplayPosition(),dogWorld={x:Math.round(dog.left*WORLD_SCALE_X*1e8)/1e8,y:Math.round(dog.top*WORLD_SCALE_Y*1e8)/1e8};
 const npcs=[...document.querySelectorAll('.world-life-resident')].filter(n=>!n.hidden).map(n=>({id:n.dataset.worldLife,x:Math.round(parseFloat(n.style.left)*2.4*1e8)/1e8,y:Math.round(parseFloat(n.style.top)*1.35*1e8)/1e8}));
 return {player:isWalkableWorld(s.x,s.y),dog:isWalkableWorld(dogWorld.x,dogWorld.y),dogWorld,npcs:npcs.map(p=>({...p,walkable:isWalkableWorld(p.x,p.y)}))};
}
module.exports={planMarshRoute,marshRing,marshFeet};
