const cases=[
 ['tanago','wetPond','paste','small'],['motsugo','wetPond','river','small'],
 ['medaka','wetPond','river','small'],['kamatsuka','wetCreek','worm','small'],
 ['nigoi','wetCreek','worm','medium'],['raigyo','wetMarsh','liveMinnow','large']
];
// Traverse exactly the field's four-unit movement, including its safe partial steps.
function routeTo(w,region,target){
 const s=w.eval('s'),M=w.ShuMountain,queue=[{x:s.x,y:s.y,path:[]}],seen=new Set([s.x+','+s.y]);
 for(let i=0;i<queue.length;i++){
  const p=queue[i];if(target(p.x,p.y))return p.path;
  for(const d of ['up','right','down','left']){
   const n=M.moveTarget(p.x,p.y,d,4,region),key=n.x+','+n.y;
   if(!seen.has(key)){seen.add(key);queue.push({...n,path:[...p.path,d]});}
  }
 }
 throw Error('No field route in '+region);
}
module.exports={cases,routeTo};
