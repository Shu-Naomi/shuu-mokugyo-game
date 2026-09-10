/* Whole-body painted cast frames. No cut-out limbs, skeletal rotation or shear.
 * The rod and line use the grip recorded in the displayed frame. */
(function(root,factory){
  if(typeof module==="object"&&module.exports)module.exports=factory(require("./pixel-world.js"));
  else root.ShuCast=factory(root.ShuPixel);
})(typeof globalThis==="object"?globalThis:this,function(Pixel){
  "use strict";
  const DURATION=1200,RELEASE=.58,CELL=362;
  // Hold the anticipation, accelerate through release, then ease back to rest.
  const timeline=[0,100,190,285,380,460,520,600,720,805,930,1050,1160];
  const angles=[-35,-50,-68,-98,-120,-87,-48,-15,5,-20,-30,-35];
  // Coordinates are measured in each painted cell, not calculated arm joints.
  // One foot pivot removes atlas packing offsets without deforming the pose.
  const artwork={
    boy:{src:"assets/player-boy-cast-atlas-v168.webp",width:1448,height:1086,size:80/294,
      frames:[
        {pivot:169.5,floor:349,hand:[230,190],support:[116,218],feet:[125,215]},
        {pivot:188.75,floor:349,hand:[233,176],support:[142,213],feet:[143,235]},
        {pivot:189.75,floor:349,hand:[257,162],support:[136,214],feet:[143,237]},
        {pivot:195.5,floor:349,hand:[235,125],support:[149,216],feet:[147,245]},
        {pivot:196.75,floor:333,hand:[231,105],support:[153,198],feet:[145,249]},
        {pivot:206,floor:333,hand:[261,114],support:[134,232],feet:[155,257]},
        {pivot:200.5,floor:335,hand:[315,110],support:[123,231],feet:[145,257]},
        {pivot:185,floor:334,hand:[308,150],support:[119,231],feet:[135,235]},
        {pivot:172.5,floor:324,hand:[279,211],support:[104,207],feet:[120,225]},
        {pivot:187.5,floor:325,hand:[242,174],support:[135,225],feet:[144,231]},
        {pivot:185,floor:326,hand:[248,172],support:[132,189],feet:[141,231]},
        {pivot:179,floor:325,hand:[238,170],support:[125,188],feet:[134,224]}
      ]},
    girl:{src:"assets/player-girl-cast-atlas-v168.webp",width:1448,height:1086,size:80/321,
      frames:[
        {pivot:167.5,floor:349,hand:[237,184],support:[118,218],feet:[127,209]},
        {pivot:169,floor:349,hand:[251,184],support:[126,216],feet:[127,211]},
        {pivot:168.75,floor:349,hand:[260,139],support:[124,198],feet:[127,211]},
        {pivot:168.75,floor:350,hand:[244,92],support:[123,226],feet:[127,211]},
        {pivot:168,floor:345,hand:[232,73],support:[131,204],feet:[125,211]},
        {pivot:168,floor:345,hand:[280,104],support:[125,213],feet:[125,211]},
        {pivot:164.5,floor:344,hand:[299,95],support:[131,190],feet:[121,209]},
        {pivot:164.75,floor:344,hand:[299,121],support:[100,213],feet:[120,210]},
        {pivot:165.25,floor:333,hand:[295,198],support:[100,211],feet:[120,211]},
        {pivot:167.5,floor:333,hand:[264,183],support:[130,211],feet:[125,211]},
        {pivot:167.25,floor:333,hand:[243,173],support:[121,219],feet:[125,210]},
        {pivot:168.5,floor:335,hand:[250,173],support:[126,215],feet:[125,212]}
      ]}
  };
  const stills={boy:{src:"assets/player-boy-cast-v73.png",width:146,height:339,center:73,floor:330,top:9,hand:[130,224]},
    girl:{src:"assets/player-girl-cast-v73.png",width:138,height:326,center:69,floor:318,top:10,hand:[123,212]}};
  const sprites={},fallbacks={},prepared=new WeakMap();let loading;
  function preload(){
    if(loading)return loading;
    if(typeof Image==="undefined")return Promise.resolve(false);
    const load=(avatar,art,bank)=>new Promise(resolve=>{const img=new Image();
      img.onload=()=>{bank[avatar]=img;resolve(true);};img.onerror=()=>resolve(false);img.src=art.src;});
    loading=Promise.all(Object.entries(artwork).map(([avatar,art])=>load(avatar,art,sprites))
      .concat(Object.entries(stills).map(([avatar,art])=>load(avatar,art,fallbacks))))
      .then(results=>results.slice(0,2).every(Boolean));return loading;
  }
  function frameAt(progress=0){
    const ms=Math.max(0,Math.min(1,Number(progress)||0))*DURATION;
    let i=0;while(i+1<timeline.length&&ms+1e-7>=timeline[i+1])i++;
    return i===12?0:i;
  }
  function pose(progress=0,avatar="boy"){
    avatar=avatar==="girl"?"girl":"boy";
    const t=Math.max(0,Math.min(1,Number(progress)||0)),frame=frameAt(t),art=artwork[avatar],f=art.frames[frame];
    const point=([x,y])=>({x:62+(x-f.pivot)*art.size,y:102+(y-f.floor)*art.size});
    const hand=point(f.hand),angle=angles[frame],rad=angle*Math.PI/180,unit={x:Math.cos(rad),y:Math.sin(rad)};
    const bend=[0,0,-1,-2,-3,3,5,4,1,0,0,0][frame];
    return {t,frame,hand,support:point(f.support),angle,unit,bend,
      tip:{x:hand.x+unit.x*64-unit.y*bend,y:hand.y+unit.y*64+unit.x*bend},
      butt:{x:hand.x-unit.x*15,y:hand.y-unit.y*15},
      leftFoot:point([f.feet[0],f.floor]),rightFoot:point([f.feet[1],f.floor])};
  }
  function layout(width,height){
    const resolution=width/640,scale=Math.max(1,Math.floor(Math.min(height/resolution/240,640/175)))*resolution;
    return {scale,x:Math.round(width*.415-64*scale),y:Math.round(height*.935-102*scale)};
  }
  function worldPoint(point,box){return {x:box.x+point.x*box.scale,y:box.y+point.y*box.scale};}
  function standbyPose(progress,avatar){
    const p=pose(0,avatar),a=stills[avatar],size=80/(a.floor-a.top);
    const hand={x:62+(a.hand[0]-a.center)*size,y:102+(a.hand[1]-a.floor)*size};
    const dx=hand.x-p.hand.x,dy=hand.y-p.hand.y;
    return {...p,t:progress,hand,tip:{x:p.tip.x+dx,y:p.tip.y+dy},butt:{x:p.butt.x+dx,y:p.butt.y+dy}};
  }
  function model(width,height,progress,target={x:width*.7,y:height*.5},flying=false,avatar="boy",standby=false){
    const sample=standby?standbyPose:pose,p=sample(progress,avatar),box=layout(width,height),tip=worldPoint(p.tip,box),resolution=width/640;
    let bobber={x:tip.x+2*resolution,y:tip.y+9*resolution};
    if(flying&&progress>=RELEASE){
      const releaseTip=worldPoint(sample(RELEASE,avatar).tip,box),start={x:releaseTip.x+2*resolution,y:releaseTip.y+9*resolution};
      const u=Math.min(1,Math.max(0,(progress-RELEASE)/(1-RELEASE)));
      bobber={x:start.x+(target.x-start.x)*u,y:start.y+(target.y-start.y)*u-Math.sin(Math.PI*u)*height*.16};
    }
    return {pose:p,box,frame:p.frame,tip,hand:worldPoint(p.hand,box),support:worldPoint(p.support,box),butt:worldPoint(p.butt,box),bobber,
      leftFoot:worldPoint(p.leftFoot,box),rightFoot:worldPoint(p.rightFoot,box),released:flying&&progress>=RELEASE};
  }
  function prepareAtlas(img,canvas){
    if(prepared.has(img))return prepared.get(img);
    const surface=canvas.ownerDocument?canvas.ownerDocument.createElement("canvas"):new canvas.constructor(1448,1086);
    surface.width=1448;surface.height=1086;
    const ctx=surface.getContext("2d",{willReadFrequently:true});ctx.drawImage(img,0,0);
    const pixels=ctx.getImageData(0,0,1448,1086),data=pixels.data;
    // The supplied RGB atlases use a magenta key. Decode it once on load,
    // including holes at the elbows; never alter clothing or pale socks.
    for(let i=0;i<data.length;i+=4)if(data[i]>data[i+1]+55&&data[i+2]>data[i+1]+45)data[i+3]=0;
    ctx.putImageData(pixels,0,0);prepared.set(img,surface);return surface;
  }
  function paintRod(ctx,p,c,rod){
    const line=(a,b,color,width)=>{ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.lineTo(b.x,b.y);ctx.strokeStyle=color;ctx.lineWidth=width;ctx.stroke();};
    const color={bamboo:c.wood3,youngBamboo:c.leaf2,clearStream:c.roof3,starGazer:c.gold,moroko:c.blue}[rod]||c.wood3;
    line(p.butt,p.hand,c.ink,2.7);line(p.butt,p.hand,c.wood1,1.7);
    let last=p.hand;
    for(let i=1;i<=24;i++){
      const t=i/24,q={x:p.hand.x+p.unit.x*64*t-p.unit.y*p.bend*t*t,y:p.hand.y+p.unit.y*64*t+p.unit.x*p.bend*t*t};
      line(last,q,c.ink,1.7-t*.8);line(last,q,color,.8-t*.3);
      if(i%5===0)line({x:q.x-p.unit.y*.7,y:q.y+p.unit.x*.7},{x:q.x+p.unit.y*.7,y:q.y-p.unit.x*.7},c.cream,.5);
      last=q;
    }
    const reel={x:p.hand.x-p.unit.x*5-p.unit.y*3,y:p.hand.y-p.unit.y*5+p.unit.x*3};
    ctx.beginPath();ctx.ellipse(reel.x,reel.y,2.5,3.1,0,0,Math.PI*2);ctx.fillStyle=c.ink;ctx.fill();ctx.strokeStyle=c.stone2;ctx.lineWidth=.7;ctx.stroke();
    line(reel,{x:reel.x+3,y:reel.y+2},c.stone2,.7);
  }
  function draw(canvas,{avatar="boy",rod="bamboo",progress=0,target,flying=false,env=Pixel.calendar(),sprite}={}){
    avatar=avatar==="girl"?"girl":"boy";
    const ctx=canvas.getContext("2d"),w=canvas.width,h=canvas.height,c=Pixel.palette(env);
    const img=sprite||sprites[avatar],m=model(w,h,progress,target,flying,avatar,!img&&!!fallbacks[avatar]),p=m.pose,art=artwork[avatar],f=art.frames[p.frame];
    ctx.clearRect(0,0,w,h);ctx.imageSmoothingEnabled=false;
    ctx.save();ctx.translate(m.box.x,m.box.y);ctx.scale(m.box.scale,m.box.scale);ctx.lineCap="round";
    ctx.fillStyle="rgba(20,28,19,.25)";ctx.beginPath();ctx.ellipse(62,103,21,2.5,0,0,Math.PI*2);ctx.fill();
    if(img){
      const atlas=prepareAtlas(img,canvas);
      // One complete drawing per frame. The hand's opaque pixels close over
      // the handle naturally, without another generated palm or rotating arm.
      paintRod(ctx,p,c,rod);
      ctx.drawImage(atlas,p.frame%4*CELL,Math.floor(p.frame/4)*CELL,CELL,CELL,
        62-f.pivot*art.size,102-f.floor*art.size,CELL*art.size,CELL*art.size);
      m.detailed=true;
    }else if(fallbacks[avatar]){
      const a=stills[avatar],size=80/(a.floor-a.top);
      paintRod(ctx,p,c,rod);
      ctx.drawImage(fallbacks[avatar],62-a.center*size,102-a.floor*size,a.width*size,a.height*size);
      m.detailed=false;
    }
    ctx.restore();
    if(flying){const r=w/640;ctx.fillStyle=c.ink;ctx.fillRect(m.bobber.x-r,m.bobber.y-2*r,3*r,6*r);
      ctx.fillStyle=c.red;ctx.fillRect(m.bobber.x,m.bobber.y-r,r,2*r);ctx.fillStyle=c.cream;ctx.fillRect(m.bobber.x,m.bobber.y+r,r,2*r);}
    const tint={night:"rgba(18,33,63,.38)",evening:"rgba(113,50,29,.16)",dawn:"rgba(65,63,91,.18)"}[env.period];
    if(tint){ctx.save();ctx.globalCompositeOperation="source-atop";ctx.fillStyle=tint;ctx.fillRect(0,0,w,h);ctx.restore();}
    return m;
  }
  return Object.freeze({DURATION,RELEASE,timeline,frameAt,pose,layout,model,draw,preload,artwork,prepareAtlas});
});
