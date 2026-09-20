/* Shared physical scale and deterministic swim/feeding poses; no save mutations. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.ShuAquariumLife=api;})(typeof globalThis!=='undefined'?globalThis:this,function(){
  'use strict';
  const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
  const smooth=p=>{p=clamp(p,0,1);return p*p*(3-2*p);};
  const bottom=id=>['hirame','kasago','namazu','unagi'].includes(id);
  function dimensions(fish,catalog){
    // Keep scale stable as a specimen grows. Larger species use a larger tank.
    const max=Math.max(30,...fish.map(f=>(catalog.find(s=>s.id===f.species)?.max||f.length)/100));
    const widthCm=[120,180,240,360,600,900,1200].find(n=>n>=max*2.8)||Math.ceil(max*2.8/100)*100;
    return {widthCm,rulerCm:widthCm<=240?20:widthCm<=600?50:100};
  }
  function layout(fish,catalog,width,height,seconds,ratioFor,feeding=null,reduced=false){
    const scale=dimensions(fish,catalog),floor=height*.78;
    const poses=fish.map((f,i)=>{
      const ratio=Math.max(.6,ratioFor(f.species)||2),depth=.84+(i%3)*.08;
      const w=Math.min(Math.max(8,width*f.length/100/scale.widthCm*depth),width*.37,height*.20*ratio),h=w/ratio;
      const minX=w/2+width*.045,maxX=width-minX;
      const speed=(bottom(f.species)?.12:.20)*(1+i*.075),phase=seconds*speed+i*2.399;
      const sin=Math.sin(phase),facing=clamp(Math.cos(phase)*5,-1,1);
      let x=minX+(maxX-minX)*(.5+.5*sin);
      const band=bottom(f.species)?.68+.018*(i%3):.25+(i%5)*.08;
      let y=height*(band+Math.sin(seconds*.45+i)*.015);
      if(reduced){x=width*(.18+i*.16);y=height*band;}
      let face=reduced?1:facing,bite=false,food=null;
      const feedIndex=feeding?.ids.indexOf(f.uid)??-1;
      if(feedIndex>=0){
        const age=seconds-feeding.at,at=.95+feedIndex*.28;
        const tx=width*(.18+feedIndex*.155),ty=height*(.23+(feedIndex%2)*.13);
        const origin=feeding.origins?.[f.uid]||{x,y,facing:face};
        const approach=smooth(age/Math.max(.6,at-.1)),leave=smooth((age-2.5)/1.2);
        const px=origin.x+(tx-origin.x)*approach,py=origin.y+(ty-origin.y)*approach;
        x=px+(x-px)*leave;y=py+(y-py)*leave;
        face=leave>.5?face:(tx>=origin.x?1:-1);bite=age>=at&&age<at+.24;
        if(age<at)food={x:tx+face*w*.39,y:height*.075+(ty-height*.075)*clamp(age/at,0,1)};
      }
      x=clamp(x,minX,maxX);y=clamp(y,h/2+height*.08,floor-h/2);
      return {uid:f.uid,species:f.species,x,y,width:w,height:h,facing:face,depth,bite,food,bottomDweller:bottom(f.species)};
    });
    // A small vertical separation gives passing fish room without teleporting x.
    for(let i=0;i<poses.length;i++)for(let j=0;j<i;j++){
      const a=poses[i],b=poses[j],dx=Math.abs(a.x-b.x),gap=(a.height+b.height)*.43+3;
      const approach=smooth(1-dx/((a.width+b.width)*.65));
      const overlap=smooth(1-Math.abs(a.y-b.y)/gap);
      a.y=clamp(a.y+gap*approach*overlap,a.height/2+height*.09,floor-a.height/2);
    }
    return {...scale,poses};
  }
  return Object.freeze({dimensions,layout});
});
