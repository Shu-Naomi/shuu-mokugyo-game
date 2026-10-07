(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  root.ShuCoast = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";
  const width = 240, height = 135;
  const islands = {
    sand: [[122,52],[144,47],[166,52],[182,64],[184,81],[169,96],[143,103],[119,95],[109,78],[113,64]],
    reef: [[48,79],[62,71],[81,73],[92,87],[89,102],[76,113],[58,111],[44,100]],
  };
  const docks = {
    harbor: { name: "星見港", land: { x:154,y:123 }, water: { x:166,y:123 }, radius: 8 },
    sand: { name: "白砂の小島", land: { x:115,y:77 }, water: { x:100,y:77 }, radius: 8 },
    reef: { name: "岩礁の小島", land: { x:88,y:92 }, water: { x:104,y:92 }, radius: 8 },
  };
  const restPoint = { x:146,y:70 };
  function inside(x,y,polygon) {
    let hit=false;
    for(let i=0,j=polygon.length-1;i<polygon.length;j=i++) {
      const [xi,yi]=polygon[i],[xj,yj]=polygon[j];
      if ((yi>y)!==(yj>y) && x<(xj-xi)*(y-yi)/(yj-yi)+xi) hit=!hit;
    }
    return hit;
  }
  function shore(x,y) { return Object.values(islands).some(poly=>inside(x,y,poly)); }
  function water(x,y) { return Number.isFinite(x) && Number.isFinite(y) && x>=2 && x<=width-2 && y>=2 && y<=height-2 && !shore(x,y) && !(x>=148 && x<=157 && y>=119 && y<=129); }
  function near(a,b,r=8) { return Math.hypot(a.x-b.x,a.y-b.y)<=r; }
  function coastName(x,y) {
    if (!Number.isFinite(y)) return x<103 ? "reef" : "sand";
    const distanceToIsland = polygon => Math.min(...polygon.map(([ax,ay],index) => {
      const [bx,by]=polygon[(index+1)%polygon.length];
      const progress=Math.max(0,Math.min(1,((x-ax)*(bx-ax)+(y-ay)*(by-ay))/((bx-ax)**2+(by-ay)**2)));
      return Math.hypot(x-(ax+(bx-ax)*progress),y-(ay+(by-ay)*progress));
    }));
    return distanceToIsland(islands.reef) < distanceToIsland(islands.sand) ? "reef" : "sand";
  }
  function stepFor(vehicle) { return vehicle==="canoe" ? 5 : 3; }
  function costFor(vehicle) { return vehicle==="canoe" ? 2 : 1; }
  function fishingWater(x,y,direction="up") {
    const fromWater=water(x,y);
    if(!fromWater && !shore(x,y))return null;
    const [dx,dy]={up:[0,-1],right:[1,0],down:[0,1],left:[-1,0]}[direction]||[0,-1];
    // Only the coastal shoreline applies here. Village buildings and its
    // bridge occupy the same coordinates in a different map.
    const rays=[0,-.1875,.1875,-.375,.375].map(slope=>({slope,blocked:false}));
    for(let d=.5;d<=8;d+=.5)for(const ray of rays) {
      if(ray.blocked)continue;
      const px=x+dx*d-dy*ray.slope*d,py=y+dy*d+dx*ray.slope*d;
      if(water(px,py))return {zone:"sea",x:px,y:py};
      // A boat cannot cast through an island tip or the harbor pier and
      // pick water on the far side. Shore casts may cross their own dry bank.
      if(fromWater || !shore(px,py))ray.blocked=true;
    }
    return null;
  }
  // Keep the collision map above independent of the rendered artwork.
  // The old painter is only a fallback if an image cannot be downloaded.
  function paintFallback(canvas,environment={}) {
    if (!canvas?.getContext) return;
    const ctx=canvas.getContext("2d");
    const night=environment.period==="night" || environment.time==="night";
    const scaleX=canvas.width/width, scaleY=canvas.height/height;
    ctx.save();ctx.scale(scaleX,scaleY);ctx.imageSmoothingEnabled=false;
    ctx.fillStyle=night?"#12344a":"#236888";ctx.fillRect(0,0,width,height);
    for(let y=0;y<height;y+=4) for(let x=0;x<width;x+=8) {
      const noise=(x*7+y*13)%31;
      if(noise<9) { ctx.fillStyle=night?"#23536a":"#388a9f";ctx.fillRect(x+(y%3),y,4,1); }
      else if(noise>27) {ctx.fillStyle=night?"#568391":"#92c7c1";ctx.fillRect(x+2,y,2,1);}
    }
    for(const [id,poly] of Object.entries(islands)) {
      ctx.fillStyle="#e8f2cf";ctx.beginPath();poly.forEach(([x,y],i)=>i?ctx.lineTo(x,y):ctx.moveTo(x,y));ctx.closePath();ctx.fill();
      ctx.fillStyle=id==="reef"?"#536567":"#d4c895";ctx.beginPath();poly.forEach(([x,y],i)=>i?ctx.lineTo(x,y):ctx.moveTo(x,y));ctx.closePath();ctx.fill();
    }
    // Layer individual rocks, grass and beach lines on the same low-resolution grid.
    for(let i=0;i<48;i++) {
      const id=i%3===0?"reef":"sand", origin=id==="reef"?{x:68,y:93}:{x:147,y:75};
      const x=Math.round(origin.x+Math.sin(i*13.7)*(id==="reef"?18:31));
      const y=Math.round(origin.y+Math.cos(i*9.3)*(id==="reef"?15:21));
      if(!inside(x,y,islands[id]))continue;
      ctx.fillStyle=id==="reef"?(i%3?"#718685":"#a0aaa0"):(i%4?"#dcd09e":"#7b9b65");
      ctx.fillRect(x,y,i%4+1,i%3+1);
    }
    ctx.fillStyle="#567c59";ctx.fillRect(138,59,22,13);ctx.fillStyle="#9fb16d";ctx.fillRect(141,61,18,8);
    ctx.fillStyle="#bc613e";ctx.fillRect(143,66,9,4);ctx.fillStyle="#e7b565";ctx.fillRect(145,63,5,4);
    ctx.fillStyle="#643f30";ctx.fillRect(145,71,3,2);
    for(const [id,dock] of Object.entries(docks)) {
      if(id==="harbor")continue;
      const dir=id==="reef"?1:-1;
      ctx.fillStyle="#433c3e";ctx.fillRect(dock.land.x+(dir<0?-8:0),dock.land.y-2,10,6);
      ctx.fillStyle="#aa8661";ctx.fillRect(dock.land.x+(dir<0?-8:0),dock.land.y-2,10,3);
      ctx.fillStyle="#eee0a5";ctx.fillRect(dock.land.x-1,dock.land.y-5,2,4);
    }
    ctx.fillStyle="#705e51";ctx.fillRect(148,119,9,10);ctx.fillStyle="#d6bb84";ctx.fillRect(149,119,8,4);
    ctx.fillStyle="#f3ebc4";ctx.fillRect(145,115,2,3);
    ctx.restore();
  }
  const artSources = {
    coast: "assets/coast-world-v197.webp",
    rowboat: "assets/coast-rowboat-v226.png",
    tarai: "assets/coast-tarai-v224.png",
  };
  const images = {};
  let pendingScene;
  let pendingBoat;
  function imageFor(id) {
    if(!images[id] && typeof Image !== "undefined") {
      const image=new Image();
      images[id]=image;
      image.decoding="async";
      image.onload=()=>{
        if(id==="coast" && pendingScene)paint(...pendingScene);
        if(id!=="coast" && pendingBoat)paintBoat(...pendingBoat);
      };
      image.src=artSources[id];
    }
    return images[id];
  }
  function ready(image) { return image?.complete && image.naturalWidth>0; }
  function paint(canvas,environment={}) {
    if(!canvas?.getContext)return;
    pendingScene=[canvas,{...environment}];
    const image=imageFor("coast");
    if(!ready(image)) { paintFallback(canvas,environment);return; }
    const ctx=canvas.getContext("2d");
    ctx.save();
    ctx.imageSmoothingEnabled=false;
    ctx.drawImage(image,0,0,canvas.width,canvas.height);
    const period=environment.period || environment.time;
    // Tint the finished painting, retaining its shoreline and water detail.
    const tint={night:"rgba(9,20,48,.49)",evening:"rgba(115,46,23,.19)",morning:"rgba(255,220,159,.06)"}[period];
    if(tint) {ctx.fillStyle=tint;ctx.fillRect(0,0,canvas.width,canvas.height);}
    ctx.restore();
  }
  // Eight static hull/torso bases and one reusable oar. The measured source
  // coordinates below are kept separate from the animated, fixed rowlocks.
  const rigAtlasWidth=1434;
  const boatBases=[
    [[78,46,241,369,199,230],[360,140,385,252,552,312],[778,75,226,359,890,253],[1043,137,370,256,1228,311]],
    [[77,477,241,356,199,659],[361,563,381,259,552,737],[778,496,226,348,890,673],[1044,560,369,261,1228,736]],
  ];
  const rigPoints=[
    [ [[95,251],[303,251],[156,235],[244,235]], [[506,219],[506,343],[600,260],[600,279]],
      [[794,262],[987,262],[847,257],[939,257]], [[1292,219],[1287,343],[1191,268],[1191,282]] ],
    [ [[95,677],[303,677],[155,661],[244,661]], [[506,649],[506,771],[600,682],[600,704]],
      [[794,682],[987,682],[847,676],[939,676]], [[1292,649],[1287,771],[1191,690],[1191,709]] ],
  ];
  const oarCrop=[79,895,1286,143];
  const strokeProgress=[0,.22,.68,1,1,.68,.22,0];
  const boatRig={
    up:{angles:[215,-35],sweep:[-70,70],reach:[21,21],outboard:[43,43]},
    right:{angles:[-105,105],sweep:[-60,60],reach:[18,20],outboard:[38,43]},
    down:{angles:[145,35],sweep:[70,-70],reach:[21,21],outboard:[43,43]},
    left:{angles:[-75,75],sweep:[60,-60],reach:[18,20],outboard:[38,43]},
  };
  function armElbow(shoulder,hand,direction,side){
    const [sx,sy]=shoulder,[hx,hy]=hand,dx=hx-sx,dy=hy-sy,d=Math.max(.5,Math.hypot(dx,dy));
    const upper=16,lower=16,along=(upper*upper-lower*lower+d*d)/(2*d);
    const across=Math.sqrt(Math.max(0,upper*upper-along*along));
    const mx=sx+dx*along/d,my=sy+dy*along/d;
    const candidates=[[mx-dy*across/d,my+dx*across/d],[mx+dy*across/d,my-dx*across/d]];
    const preference=direction==='right'?-1:direction==='left'?1:side===0?-1:1;
    // Prefer the elbow outside the torso and below the face.
    const score=([x,y])=>preference*x+Math.min(y-sy+3,0)*4;
    return score(candidates[0])>score(candidates[1])?candidates[0]:candidates[1];
  }
  function drawArm(ctx,shoulder,hand,direction,side,avatar){
    const elbow=armElbow(shoulder,hand,direction,side);
    const line=(from,to,width,color)=>{ctx.lineWidth=width;ctx.strokeStyle=color;ctx.beginPath();ctx.moveTo(...from);ctx.lineTo(...to);ctx.stroke();};
    ctx.lineCap='round';ctx.lineJoin='round';
    line(shoulder,elbow,5.5,'#463428');
    line(shoulder,elbow,3.8,avatar==='girl'?'#b73931':'#267b88');
    line([shoulder[0],shoulder[1]-1],[elbow[0],elbow[1]-1],1.1,avatar==='girl'?'#e5644e':'#66b5b7');
    line(elbow,hand,4.8,'#6e4229');line(elbow,hand,3.2,'#dfa669');
    line([elbow[0],elbow[1]-1],[hand[0],hand[1]-1],1,'#f4c88a');
  }
  function drawGrip(ctx,hand,angle){
    ctx.save();ctx.translate(...hand);ctx.rotate(angle);
    ctx.fillStyle='#6e4229';ctx.fillRect(-2.6,-2.5,5.2,5);
    ctx.fillStyle='#edb879';ctx.fillRect(-2,-2,3.8,3.8);
    ctx.fillStyle='#ffd394';ctx.fillRect(-1.7,-1.7,1.5,1.4);
    ctx.restore();
  }
  function articulatedBoat(ctx,canvas,image,column,direction,frame,avatar,rowing){
    const [x,y,w,h,cx,cy]=boatBases[avatar==='girl'?1:0][column];
    const ratio=image.naturalWidth/rigAtlasWidth;
    const vertical=column===0||column===2;
    const scale=vertical?118/h:135/w;
    const dx=96-(cx-x)*scale,dy=79.2-(cy-y)*scale;
    const points=rigPoints[avatar==='girl'?1:0][column].map(([px,py])=>[96+(px-cx)*scale,79.2+(py-cy)*scale]);
    const rig={...(boatRig[direction]||boatRig.up),pivots:points.slice(0,2),shoulders:points.slice(2)};
    const progress=rowing?strokeProgress[((frame%8)+8)%8]:0;
    const oars=rig.pivots.map((pivot,side)=>{
      const angle=(rig.angles[side]+rig.sweep[side]*progress)*Math.PI/180;
      const hand=[pivot[0]-Math.cos(angle)*rig.reach[side],pivot[1]-Math.sin(angle)*rig.reach[side]];
      return {pivot,angle,hand,side};
    });
    ctx.save();ctx.scale(canvas.width/192,canvas.height/144);
    const oar=(part,handleOnly=false)=>{
      const {pivot,angle,side}=part,[ox,oy,ow,oh]=oarCrop;
      const handle=rig.reach[side]+3,total=handle+rig.outboard[side],fraction=handle/total;
      ctx.save();ctx.translate(...pivot);ctx.rotate(angle);
      ctx.drawImage(image,ox*ratio,oy*ratio,ow*ratio*(handleOnly?fraction:1),oh*ratio,-handle,-(side===0?4.5:5.5),handleOnly?handle:total,side===0?9:11);
      ctx.restore();
    };
    // Perspective layering: far blade behind the hull, inner handles and
    // near blade above the rim; each hand follows its own continuous shaft.
    if(!vertical)oar(oars[0]);
    ctx.drawImage(image,x*ratio,y*ratio,w*ratio,h*ratio,dx,dy,w*scale,h*scale);
    for(const part of oars)drawArm(ctx,rig.shoulders[part.side],part.hand,direction,part.side,avatar);
    if(vertical){oar(oars[0]);oar(oars[1]);}else{oar(oars[0],true);oar(oars[1]);}
    for(const part of oars){
      drawGrip(ctx,part.hand,part.angle);
      ctx.fillStyle='#24353c';ctx.beginPath();ctx.ellipse(...part.pivot,3.6,3,0,0,Math.PI*2);ctx.fill();
      ctx.strokeStyle='#8f9a98';ctx.lineWidth=1.1;ctx.stroke();
      ctx.fillStyle='#c4b98e';ctx.fillRect(part.pivot[0]-2,part.pivot[1]-.8,4,1.6);
    }
    ctx.restore();
  }
  // The tub's single paddle crosses a nominal quarter-width cell. Keep the
  // measured empty gutters so it remains complete without a neighbouring cap.
  const tubColumns=[0,344,644,934,1254];
  const tubRows=[0,366,652,944,1254];
  const tubHullX=[162,483,785,1086];
  const tubHullY=[245,534,824,1109];
  function paintBoat(canvas,id="tarai",direction="up",frame=0,avatar="boy",rowing=false) {
    if(!canvas?.getContext)return;
    const ctx=canvas.getContext("2d");
    pendingBoat=[canvas,id,direction,frame,avatar,rowing];
    ctx.clearRect(0,0,canvas.width,canvas.height);
    const column={up:0,right:1,down:2,left:3}[direction] ?? 0;
    ctx.imageSmoothingEnabled=false;
    if(id==="canoe") {
      const image=imageFor("rowboat");
      if(ready(image))articulatedBoat(ctx,canvas,image,column,direction,frame,avatar,rowing);
      return;
    }
    const boatAtlas=imageFor("tarai");
    if(!ready(boatAtlas))return;
    const row=(avatar==="girl"?2:0)+(rowing&&frame%2?1:0);
    const ratio=boatAtlas.naturalWidth/1254;
    const sx=tubColumns[column]*ratio,sy=tubRows[row]*ratio;
    const sw=(tubColumns[column+1]-tubColumns[column])*ratio;
    const sh=(tubRows[row+1]-tubRows[row])*ratio;
    const scale=Math.min(canvas.width*.93/(282*ratio),canvas.height*.89/(244*ratio));
    ctx.drawImage(boatAtlas,sx,sy,sw,sh,
      canvas.width/2-(tubHullX[column]*ratio-sx)*scale,
      canvas.height*.55-(tubHullY[row]*ratio-sy)*scale,sw*scale,sh*scale);
  }
  // Load without blocking title-screen buttons or game startup.
  if(typeof Image!=="undefined")for(const id of ["coast","rowboat","tarai"])imageFor(id);
  return {width,height,islands,docks,restPoint,inside,shore,water,near,coastName,stepFor,costFor,fishingWater,paint,paintBoat};
});
