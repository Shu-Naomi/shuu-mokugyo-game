// Runs unchanged in the DOM harness and the real browser. Plans collision-safe
// four-unit control presses; it never moves the player or edits the save.
function planRuralRoute(target) {
  const M=ShuMountain,R=ShuRural,region=s.mapRegion;
  const dirs=['up','right','down','left'];
  const goal=(x,y,d)=>target==='villageGate'?x>=R.villageGate.left&&x<=R.villageGate.right&&y>=R.villageGate.top&&y<=R.villageGate.bottom:
    target==='return'?M.atReturnGate(x,y,region):
    target==='bridge'?M.onBridge(x,y,region):
    M.fishingWater(x,y,d,region)?.type===target&&!M.exitAt(x,y,region);
  const queue=[{x:s.x,y:s.y,direction:s.direction,parent:-1}],seen=new Set();
  for(let i=0;i<queue.length;i++){
    const p=queue[i];if(goal(p.x,p.y,p.direction)){
      const result=[];for(let j=i;queue[j].parent>=0;j=queue[j].parent)result.push(queue[j].direction);return result.reverse();
    }
    for(const direction of dirs){
      const n=M.isRegion(region)?M.moveTarget(p.x,p.y,direction,4,region):ShuWorldLife.moveTarget(p.x,p.y,direction,4,isWalkableWorld);
      const key=n.x+','+n.y+','+direction;
      if(!seen.has(key)&&isWalkableWorld(n.x,n.y)&&isWalkableWorldSegment(p.x,p.y,n.x,n.y)){
        seen.add(key);queue.push({...n,direction,parent:i});
      }
    }
  }
  throw Error('No real walking route: '+region+'/'+target);
}
module.exports={planRuralRoute};
