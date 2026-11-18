const path=require('node:path'),M=require('../fish-motion.js');
const {runInNewContext}=require('node:vm'),fs=require('node:fs');
const reference={ShuFishAdditions:require('../fish-additions.js'),ShuFishMotion:{
 profile:id=>({...M.profile(id),amplitude:0,fin:0})
}};
runInNewContext(fs.readFileSync(path.join(__dirname,'../fish-art.js'),'utf8'),reference);

function projectedSilhouette(ctx,image,id,cells,frame,resolve){
 const A=reference.ShuFishArt,p=A.pose(id,cells,frame),target=p.target,heading=p.heading??0;
 A.draw(ctx,image,id,cells,frame,resolve,{swimFrame:0});
 const bytes=ctx.getImageData(0,0,448,224).data,counts=new Uint16Array(448);
 let left=448,right=-1;
 for(let i=0;i<448*224;i++){
  const alpha=bytes[i*4+3],column=i%448;
  if(alpha){left=Math.min(left,column);right=Math.max(right,column);}
  if(alpha>100)counts[column]++;
 }
 // Horizontal yaw changes column multiplicity. Each sampled source column
 // must contribute exactly its original number of occupied pixels.
 const theta=heading*Math.PI/6,cos=Math.cos(theta),headX=target[0]*448;
 const span=Math.max(1,cos>=0?headX-left-.5:right+.5-headX),profile=M.profile(id);

 return phase=>{
  let expectedCount=0,minX=448,maxX=-1;
  for(let dx=0;dx<448;dx++){
   const rear=Math.min(1,Math.max(0,(cos>=0?headX-dx-.5:dx+.5-headX)/span));
   const tail=Math.max(0,(rear-profile.shoulder)/(1-profile.shoulder))**profile.falloff;
   const beat=Math.sin(phase*Math.PI/4-rear*profile.wave);
   const horizontal=Math.min(.035*span,profile.amplitude)*tail*
    (cos*(.67*beat**2+.33*beat)+Math.sin(theta)*beat);
   const occupied=counts[Math.round(dx-horizontal)]||0;
   if(occupied){expectedCount+=occupied;minX=Math.min(dx,minX);maxX=Math.max(dx,maxX);}
  }
  return {count:expectedCount,width:maxX-minX+1};
 };
}
module.exports={projectedSilhouette,reference};
