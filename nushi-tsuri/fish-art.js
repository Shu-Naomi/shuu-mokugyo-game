(function(root,factory){
  const api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;
  else root.ShuFishArt=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(){
  'use strict';
  // Generated artwork is cropped by the actual silhouette, not an assumed
  // grid. Some source drawings deliberately cross a nominal cell boundary.
  const groups = {"lake":{"ids":["moroko","funa","koi","ayu"],"boxes":[[20,44,327,103],[378,40,312,114],[759,32,216,129],[1097,23,133,134],[57,181,228,124],[364,181,240,122],[638,188,299,117],[962,188,269,114],[23,321,313,152],[388,319,277,153],[733,322,206,158],[1064,318,159,156],[38,483,241,147],[348,483,235,145],[631,489,301,145],[957,492,275,141],[20,638,335,146],[390,640,306,149],[736,640,261,157],[1075,642,163,140],[32,793,267,151],[348,795,255,149],[625,810,301,129],[948,813,286,129],[22,973,335,105],[384,965,311,118],[768,953,193,138],[1093,953,139,138],[21,1109,269,116],[352,1099,246,129],[628,1114,320,110],[963,1115,271,111]]},"stream":{"ids":["yamame","nijimasu","namazu","unagi"],"boxes":[[31,31,324,119],[398,29,238,128],[716,28,187,133],[1044,29,149,134],[73,171,236,135],[364,171,243,133],[651,180,307,124],[973,186,264,118],[21,340,345,130],[403,328,231,151],[721,335,177,149],[1037,322,162,166],[79,487,226,157],[366,495,249,139],[646,503,312,132],[975,505,259,128],[26,681,363,107],[403,667,291,140],[720,663,242,147],[1043,653,169,158],[38,807,268,136],[323,812,300,138],[643,840,309,91],[968,831,271,110],[30,1006,359,67],[430,958,239,131],[777,957,141,144],[1064,963,129,125],[67,1102,207,118],[318,1122,302,79],[635,1144,316,69],[972,1142,264,71]]},"swimmers":{"ids":["bass","aji","bora","suzuki"],"boxes":[[24,36,333,112],[383,30,260,120],[713,29,229,124],[1061,29,149,124],[40,174,264,125],[346,180,236,121],[622,183,304,111],[949,178,293,121],[26,336,322,120],[396,332,245,131],[718,327,205,135],[1059,324,153,142],[48,487,258,131],[384,487,195,122],[620,498,307,112],[946,493,294,118],[25,649,338,116],[391,650,247,124],[736,652,193,122],[1063,644,154,132],[37,809,275,124],[354,809,239,121],[623,812,305,117],[949,811,292,118],[24,963,330,111],[386,952,255,127],[707,950,236,133],[1061,946,162,137],[28,1103,287,128],[354,1110,246,116],[617,1102,321,117],[952,1101,290,127]]},"reef":{"ids":["kurodai","kasago","mebaru","hirame"],"boxes":[[34,7,311,148],[395,6,263,149],[745,6,233,158],[1068,7,169,156],[57,155,226,153],[343,160,252,145],[644,160,276,147],[946,165,284,145],[22,316,309,158],[379,312,271,161],[757,312,196,168],[1035,315,208,158],[43,466,234,158],[330,460,257,156],[629,467,290,157],[943,477,296,147],[23,619,323,152],[402,617,258,160],[743,615,203,163],[1050,617,183,161],[54,769,232,150],[341,761,241,161],[631,779,291,151],[945,781,282,149],[19,927,320,147],[375,925,280,155],[729,924,233,157],[1065,929,169,151],[42,1081,257,149],[345,1075,238,152],[632,1088,294,145],[946,1087,293,146]]},"coastal":{"ids":["shirogisu","ainame","madai","streamNushi"],"boxes":[[32,44,333,109],[386,41,272,117],[727,44,201,119],[1025,41,161,125],[44,191,256,113],[373,191,233,111],[631,194,315,110],[961,200,274,109],[34,345,334,129],[389,344,276,135],[735,345,202,137],[1010,340,199,143],[55,497,250,120],[388,498,223,120],[631,505,316,127],[963,500,270,132],[38,635,311,154],[391,632,264,165],[736,637,197,163],[1020,635,197,161],[68,800,230,145],[381,788,242,163],[646,807,308,145],[975,808,255,144],[33,957,335,129],[391,955,272,140],[744,956,211,142],[1025,957,176,138],[54,1098,279,123],[373,1100,248,127],[628,1110,325,126],[968,1104,265,133]]},"legendary":{"ids":["coastNushi","caveNushi","starNushi","nushi"],"boxes":[[25,29,333,140],[398,22,260,150],[718,21,230,153],[1061,19,166,155],[40,189,277,144],[393,188,196,146],[637,203,297,127],[955,202,277,127],[18,356,353,126],[400,355,277,149],[704,348,290,158],[1055,348,180,150],[31,509,311,136],[362,512,269,132],[649,527,333,110],[998,518,245,126],[17,660,331,135],[368,661,301,137],[694,662,265,131],[1044,660,201,146],[20,814,290,123],[342,810,266,126],[644,815,318,123],[967,815,268,118],[31,955,323,135],[395,949,257,149],[711,950,277,154],[1044,945,194,158],[20,1094,316,142],[349,1098,290,138],[659,1102,310,134],[979,1105,260,132]]}};
  const species={};
  for(const [group,definition]of Object.entries(groups))
    definition.ids.forEach((id,index)=>species[id]={group,index,asset:`assets/fish-${group}-v208.png`});
  const turn=[1,.72,.36,0,-.36,-.72,-1].map((xScale,i)=>({xScale,yOffset:[0,.025,.06,.08,.06,.025,0][i]}));
  const mouth=[{xScale:1,yOffset:0},{xScale:1,yOffset:.025},{xScale:1,yOffset:.05}];
  const heads=[[.985,.62],[.985,.68],[.98,.75],[.5,.75],[.02,.72],[.015,.65],[.015,.62],[.985,.72]];
  const headOffset=.32;
  const specialHeads={
    namazu:[[.91,.65],[.85,.74],[.835,.74],[.43,.75],[.10,.74],[.146,.70],[.09,.65],[.95,.59]],
    unagi:[[.985,.65],[.96,.90],[.78,.92],[.50,.93],[.03,.78],[.015,.72],[.015,.65],[.985,.64]],
    caveNushi:[[.985,.51],[.96,.52],[.95,.55],[.50,.56],[.04,.55],[.015,.51],[.015,.51],[.93,.45]],
    nushi:[[.97,.52],[.95,.57],[.87,.62],[.50,.67],[.08,.60],[.05,.58],[.03,.52],[.96,.56]],
  };
  function pose(id,cells,frame){
    const index=Math.max(0,Math.floor(Number(frame)||0));
    if(cells===7||cells===5){
      const heading=cells===5?[0,2,3,4,6][Math.min(4,index)]:Math.min(6,index);
      return {cell:heading===6?0:heading,heading,flip:heading===6,jaw:0,target:[.5+headOffset*turn[heading].xScale,.62+turn[heading].yOffset],beat:0};
    }
    if(cells===3){const jaw=Math.min(2,index);return {cell:jaw?7:0,jaw,target:[.5+headOffset,.62+mouth[jaw].yOffset],beat:0};}
    return {cell:0,jaw:0,target:[.5+headOffset,.62],beat:index%8/8*Math.PI*2};
  }
  function sourceHead(id,cell,flip=false){
    const point=specialHeads[id]?.[cell]||heads[cell];
    // Barbels extend past the actual lip: never attach the hook to a whisker.
    return flip?[1-point[0],point[1]]:point;
  }
  function source(id,cell){const d=species[id];return groups[d.group].boxes[d.index*8+cell];}
  const isolatedCells=new WeakMap();
  function isolatedCell(ctx,image,id,cell){
    let cache=isolatedCells.get(image);
    if(!cache){cache=new Map();isolatedCells.set(image,cache);}
    const key=id+':'+cell;
    if(cache.has(key))return cache.get(key);
    const box=source(id,cell),original={image,box};
    try{
      // Atlas rows sometimes overlap by a few pixels. Keep the connected
      // fish silhouette, so a neighbouring fin cannot appear beside it.
      const tile=ctx.canvas.ownerDocument?.createElement('canvas')||new ctx.canvas.constructor(box[2],box[3]);
      tile.width=box[2];tile.height=box[3];
      const painter=tile.getContext('2d');painter.drawImage(image,...box,0,0,tile.width,tile.height);
      const pixels=painter.getImageData(0,0,tile.width,tile.height),data=pixels.data;
      const width=tile.width,height=tile.height,labels=new Int32Array(width*height),queue=new Int32Array(labels.length);
      let label=0,largest=0,best=0;
      for(let start=0;start<labels.length;start++){
        if(labels[start]||data[start*4+3]<48)continue;
        let count=1,read=0;queue[0]=start;labels[start]=++label;
        while(read<count){
          const n=queue[read++],x=n%width,y=Math.floor(n/width);
          for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++){
            if(x+dx<0||x+dx>=width||y+dy<0||y+dy>=height)continue;
            const next=n+dy*width+dx;
            if(!labels[next]&&data[next*4+3]>=48){labels[next]=label;queue[count++]=next;}
          }
        }
        if(count>best){best=count;largest=label;}
      }
      if(best<100){cache.set(key,original);return original;}
      for(let n=0;n<labels.length;n++){
        if(labels[n]===largest||!data[n*4+3])continue;
        let keep=false;
        // Preserve soft outline pixels touching the fish, including barbels.
        if(!labels[n]){
          const x=n%width,y=Math.floor(n/width);
          for(let dy=-1;dy<=1&&!keep;dy++)for(let dx=-1;dx<=1;dx++)
            if(x+dx>=0&&x+dx<width&&y+dy>=0&&y+dy<height&&labels[n+dy*width+dx]===largest){keep=true;break;}
        }
        if(!keep)data[n*4+3]=0;
      }
      painter.putImageData(pixels,0,0);
      const result={image:tile,box:[0,0,width,height]};cache.set(key,result);return result;
    }catch{cache.set(key,original);return original;}
  }
  const scales={};
  function scaleFor(id){
    if(scales[id])return scales[id];
    let scale=Infinity;
    for(const p of [...Array.from({length:7},(_,i)=>pose(id,7,i)),pose(id,3,2)]){
      const box=source(id,p.cell),head=sourceHead(id,p.cell,p.flip),tx=p.target[0]*448,ty=p.target[1]*224;
      for(const [room,extent]of [[tx-22,head[0]*box[2]],[448-tx-22,(1-head[0])*box[2]],[ty-8,head[1]*box[3]],[224-ty-8,(1-head[1])*box[3]]])
        if(extent>0)scale=Math.min(scale,room/extent);
    }
    scales[id]=scale;return scale;
  }
  function paint(ctx,image,id,p,alpha=1){
    const isolated=isolatedCell(ctx,image,id,p.cell),box=isolated.box,head=sourceHead(id,p.cell,p.flip),scale=scaleFor(id);
    image=isolated.image;
    const width=box[2]*scale,height=box[3]*scale,x=p.target[0]*448-head[0]*width,y=p.target[1]*224-head[1]*height;
    ctx.save();ctx.globalAlpha=alpha;
    if(p.flip){ctx.translate(448,0);ctx.scale(-1,1);}
    const dx=p.flip?448-x-width:x;
    if(!p.beat||p.heading!==undefined){ctx.drawImage(image,...box,dx,y,width,height);ctx.restore();return;}
    // A lateral beat changes the tail's projection into depth. Every source
    // row stays at the same height; the head and hook are stationary. Smooth
    // horizontal resampling avoids the old seven hinged vertical segments.
    const warp=u=>u+.035*Math.sin(p.beat-u*1.3)*Math.pow(Math.max(0,(.7-u)/.7),2);
    for(let i=0;i<64;i++){
      const a=i/64,b=(i+1)/64,da=warp(a),db=warp(b);
      ctx.drawImage(image,box[0]+a*box[2],box[1],(b-a)*box[2],box[3],dx+da*width,y,(db-da)*width+.35,height);
    }
    ctx.restore();
  }
  function draw(ctx,image,id,cells=8,frame=0){
    if(!species[id])return false;
    ctx.clearRect(0,0,448,224);ctx.imageSmoothingEnabled=true;
    const p=pose(id,cells,frame);
    if(cells===3&&p.jaw===1){
      paint(ctx,image,id,pose(id,3,0),.45);paint(ctx,image,id,p,.55);
    }else paint(ctx,image,id,p);
    return true;
  }
  return Object.freeze({species,groups,turn,mouth,headOffset,pose,sourceHead,scaleFor,draw});
});
