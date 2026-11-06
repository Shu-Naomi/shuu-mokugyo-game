const M=require('../mountain-region.js');
const samples=[[820,790],[810,820],[815,845],[1520,470]];
const stops=[['west-entrance',117,118],['south-shore',120,106],['west-bend',25,62],['west-shore',38,62],['north-path',120,20],['north-shore',120,25],['east-bend',218,67],['east-shore',202,65],['house',227,75],['ridge',212,10]];
function route(start,target,region='mountainPond',tolerance=1.1){
 const near=(x,y)=>Math.hypot(x-target[0],y-target[1])<=tolerance;
 const heuristic=(x,y)=>Math.max(0,Math.abs(x-target[0])+Math.abs(y-target[1])-2)/4;
 const nodes=[{x:start.x,y:start.y,parent:-1,cost:0}],frontier=[0],best=new Map([[start.x+','+start.y,0]]);
 while(frontier.length){
  frontier.sort((a,b)=>(nodes[b].cost+heuristic(nodes[b].x,nodes[b].y))-(nodes[a].cost+heuristic(nodes[a].x,nodes[a].y)));
  const index=frontier.pop(),p=nodes[index];if(near(p.x,p.y)){const result=[];for(let i=index;nodes[i].parent>=0;i=nodes[i].parent)result.push(nodes[i].direction);return result.reverse();}
  for(const direction of ['up','right','down','left']){
   const n=M.moveTarget(p.x,p.y,direction,4,region),key=n.x+','+n.y,cost=p.cost+1;
   // The field also samples the complete movement segment every .75 units.
   const count=Math.max(1,Math.ceil(Math.hypot(n.x-p.x,n.y-p.y)/.75));
   if(!Array.from({length:count+1},(_,i)=>M.walkable(p.x+(n.x-p.x)*i/count,p.y+(n.y-p.y)*i/count,region)).every(Boolean))continue;
   if((best.get(key)??Infinity)<=cost)continue;best.set(key,cost);nodes.push({...n,cost,parent:index,direction});frontier.push(nodes.length-1);
  }
 }
 throw Error(`No route in ${region} from ${start.x},${start.y} to ${target}`);
}
module.exports={samples,stops,route};
