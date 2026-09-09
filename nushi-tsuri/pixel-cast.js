/* Detailed character textures articulated by the same continuous cast rig.
 * Body, both hands, rod and float share one clock and coordinate system. */
(function(root,factory){
  if(typeof module==="object"&&module.exports)module.exports=factory(require("./pixel-world.js"));
  else root.ShuCast=factory(root.ShuPixel);
})(typeof globalThis==="object"?globalThis:this,function(Pixel){
  "use strict";
  const DURATION=1200,RELEASE=.58;
  const sprites={}, artwork={
    boy:{src:"assets/player-boy-cast-v73.png",width:146,height:339,center:73,floor:330,top:9,
      core:[[0,0],[146,0],[146,123],[111,123],[108,165],[111,181],[112,200],[125,202],[125,241],[146,241],[146,339],[0,339]],
      arms:[
        {shoulder:[38,143],elbow:[25,181],hand:[18,224]},
        {shoulder:[110,143],elbow:[122,181],hand:[130,224],upper:[[105,127],[120,132],[131,157],[131,184],[117,190],[106,171]],lower:[[116,175],[132,173],[138,226],[135,238],[122,238],[119,225]]}
      ]},
    girl:{src:"assets/player-girl-cast-v73.png",width:138,height:326,center:69,floor:318,top:10,
      core:[[0,0],[138,0],[138,120],[103,120],[100,157],[107,192],[114,195],[116,233],[138,234],[138,326],[0,326]],
      arms:[
        {shoulder:[30,134],elbow:[21,173],hand:[15,212]},
        {shoulder:[105,134],elbow:[114,173],hand:[123,212],upper:[[99,121],[110,122],[120,145],[125,164],[123,180],[108,181],[101,156]],lower:[[108,167],[124,164],[129,192],[131,215],[126,227],[117,227],[114,213]]}
      ]}
  };
  let loading;
  function preload(){
    if(loading)return loading;
    if(typeof Image==="undefined")return Promise.resolve(false);
    loading=Promise.all(Object.entries(artwork).map(([avatar,art])=>new Promise(resolve=>{
      const img=new Image();
      img.onload=()=>{sprites[avatar]=img;resolve(true);};
      img.onerror=()=>resolve(false);
      img.src=art.src;
    }))).then(results=>results.every(Boolean));
    return loading;
  }
  const keys=[
    {t:0,x:85,y:63,angle:-35,lean:0,bend:0},
    {t:.18,x:80,y:53,angle:-72,lean:-1,bend:1},
    {t:.41,x:81,y:43,angle:-105,lean:-3,bend:-3},
    {t:.63,x:87,y:57.5,angle:-25,lean:3,bend:7},
    {t:.81,x:86,y:63,angle:-14,lean:2,bend:1},
    {t:1,x:85,y:63,angle:-35,lean:0,bend:0},
  ];
  function pose(progress=0){
    const t=Math.max(0,Math.min(1,Number(progress)||0));
    const i=Math.max(0,keys.findIndex((k,index)=>index<keys.length-1&&t<=keys[index+1].t));
    const a=keys[i],b=keys[Math.min(keys.length-1,i+1)],u=Math.min(1,(t-a.t)/(b.t-a.t||1));
    const ease=u*u*(3-2*u),p={t};
    for(const k of ["x","y","angle","lean","bend"])p[k]=a[k]+(b[k]-a[k])*ease;
    const rad=p.angle*Math.PI/180,ux=Math.cos(rad),uy=Math.sin(rad);
    p.hand={x:p.x,y:p.y};
    // The free left arm keeps its original relaxed pose beside the body.
    const art=artwork.boy,size=80/(art.floor-art.top),[hx,hy]=art.arms[0].hand;
    p.support={x:62+(hx-art.center)*size+p.lean*(art.floor-hy)/(art.floor-140),y:102+(hy-art.floor)*size};
    p.tip={x:p.x+ux*64-uy*p.bend,y:p.y+uy*64+ux*p.bend};
    p.butt={x:p.x-ux*17,y:p.y-uy*17};p.unit={x:ux,y:uy};
    p.leftFoot={x:51,y:102};p.rightFoot={x:73,y:102};
    return p;
  }
  function layout(width,height){
    // Preserve the same framing when the actor canvas uses twice the detail.
    const resolution=width/640;
    const scale=Math.max(1,Math.floor(Math.min(height/resolution/240,640/175)))*resolution;
    return {scale,x:Math.round(width*.415-64*scale),y:Math.round(height*.935-102*scale)};
  }
  function worldPoint(point,box){return {x:box.x+point.x*box.scale,y:box.y+point.y*box.scale};}
  function model(width,height,progress,target={x:width*.7,y:height*.5},flying=false){
    const p=pose(progress),box=layout(width,height),tip=worldPoint(p.tip,box),hand=worldPoint(p.hand,box);
    const resolution=width/640;
    let bobber={x:tip.x+2*resolution,y:tip.y+9*resolution};
    if(flying&&progress>=RELEASE){
      const releaseTip=worldPoint(pose(RELEASE).tip,box),start={x:releaseTip.x+2*resolution,y:releaseTip.y+9*resolution};
      const u=Math.min(1,Math.max(0,(progress-RELEASE)/(1-RELEASE)));
      bobber={x:start.x+(target.x-start.x)*u,y:start.y+(target.y-start.y)*u-Math.sin(Math.PI*u)*height*.16};
    }
    return {pose:p,box,tip,hand,support:worldPoint(p.support,box),butt:worldPoint(p.butt,box),bobber,
      leftFoot:worldPoint(p.leftFoot,box),rightFoot:worldPoint(p.rightFoot,box),released:flying&&progress>=RELEASE};
  }
  function polygon(ctx,points){
    ctx.beginPath();points.forEach(([x,y],i)=>i?ctx.lineTo(x,y):ctx.moveTo(x,y));ctx.closePath();
  }
  function texturedLimb(ctx,img,mask,from,to,start,end,width){
    const a=Math.atan2(to[1]-from[1],to[0]-from[0]),b=Math.atan2(end.y-start.y,end.x-start.x);
    ctx.save();ctx.translate(start.x,start.y);ctx.rotate(b);
    ctx.scale(Math.hypot(end.x-start.x,end.y-start.y)/Math.hypot(to[0]-from[0],to[1]-from[1]),width);
    ctx.rotate(-a);ctx.translate(-from[0],-from[1]);polygon(ctx,mask);ctx.clip();ctx.drawImage(img,0,0);ctx.restore();
  }
  function elbow(shoulder,hand,upper,lower,side=1){
    const dx=hand.x-shoulder.x,dy=hand.y-shoulder.y,d=Math.hypot(dx,dy)||1;
    // Fixed bones: the cast path must fit the character's reach. Extending
    // either bone to chase a distant handle distorts the original anatomy.
    const along=Math.max(-upper,Math.min(upper,(upper*upper-lower*lower+d*d)/(2*d)));
    const out=Math.sqrt(Math.max(0,upper*upper-along*along));
    return {x:shoulder.x+dx/d*along+dy/d*out*side,y:shoulder.y+dy/d*along-dx/d*out*side};
  }
  function armPose(avatar,progress=0){
    const p=typeof progress==="object"?progress:pose(progress),art=artwork[avatar],size=80/(art.floor-art.top),shear=p.lean/(art.floor-140);
    const point=([x,y])=>({x:62+(x-art.center)*size+shear*(art.floor-y),y:102+(y-art.floor)*size});
    return art.arms.map((a,i)=>{
      const shoulderPoint=point(a.shoulder),handPoint=i?p.hand:point(a.hand);
      const upperLength=Math.hypot(a.elbow[0]-a.shoulder[0],a.elbow[1]-a.shoulder[1])*size;
      // The casting forearm points slightly toward the water. Its fixed
      // projected length is shorter than the relaxed, vertical source arm.
      const sourceLowerLength=Math.hypot(a.hand[0]-a.elbow[0],a.hand[1]-a.elbow[1])*size;
      const lowerLength=sourceLowerLength*(i?.86:1);
      const elbowPoint=i?elbow(shoulderPoint,handPoint,upperLength,lowerLength,-1):point(a.elbow);
      const dx=handPoint.x-elbowPoint.x,dy=handPoint.y-elbowPoint.y,d=Math.hypot(dx,dy);
      const wristPoint={x:handPoint.x-dx/d*1.5,y:handPoint.y-dy/d*1.5};
      return {...a,shoulderPoint,elbowPoint,wristPoint,handPoint,upperLength,lowerLength,sourceLowerLength};
    });
  }
  function drawGrip(ctx,grip,angle){
    // Closed fingers follow the handle, independently of forearm rotation.
    ctx.save();ctx.translate(grip.x,grip.y);ctx.rotate(angle*Math.PI/180);
    polygon(ctx,[[-2,-1],[-1.4,-1.7],[1.4,-1.7],[2,-.9],[1.8,1.1],[.9,1.9],[-1.4,1.5],[-2,1]]);
    ctx.fillStyle="#573c26";ctx.fill();
    polygon(ctx,[[-1.6,-.8],[-1.1,-1.3],[1.2,-1.3],[1.6,-.7],[1.3,1.1],[.6,1.5],[-1.2,1.1]]);
    ctx.fillStyle="#edb773";ctx.fill();
    ctx.strokeStyle="#af743e";ctx.lineWidth=.3;
    for(const x of [-.65,.2,1]){ctx.beginPath();ctx.moveTo(x,-1.1);ctx.lineTo(x+.15,.6);ctx.stroke();}
    polygon(ctx,[[-1.8,.2],[-1.2,-.2],[.3,.7],[.1,1.2],[-.5,1.3],[-1.6,.8]]);
    ctx.fillStyle="#f6c58a";ctx.fill();ctx.restore();
  }
  function drawDetailed(canvas,options,img){
    const {avatar,rod,progress,target,flying,env}=options,ctx=canvas.getContext("2d"),w=canvas.width,h=canvas.height;
    const m=model(w,h,progress,target||{x:w*.7,y:h*.5},flying),p=m.pose,c=Pixel.palette(env),art=artwork[avatar];
    const size=80/(art.floor-art.top),shear=p.lean/(art.floor-140);
    const arms=armPose(avatar,p);
    const limb=(arm,part)=>{
      const upper=part==="upper",wrist=[arm.hand[0]+(arm.elbow[0]-arm.hand[0])*1.5/arm.sourceLowerLength,arm.hand[1]+(arm.elbow[1]-arm.hand[1])*1.5/arm.sourceLowerLength];
      const mask=upper?arm.upper:arm.lower.map(([x,y])=>[x,Math.min(y,wrist[1]+1)]);
      texturedLimb(ctx,img,mask,upper?arm.shoulder:arm.elbow,upper?arm.elbow:wrist,
        upper?arm.shoulderPoint:arm.elbowPoint,upper?arm.elbowPoint:arm.wristPoint,size);
    };
    const line=(a,b,color,width)=>{ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.lineTo(b.x,b.y);ctx.strokeStyle=color;ctx.lineWidth=width;ctx.stroke();};
    ctx.clearRect(0,0,w,h);ctx.imageSmoothingEnabled=false;
    ctx.save();ctx.translate(m.box.x,m.box.y);ctx.scale(m.box.scale,m.box.scale);ctx.lineCap="round";
    ctx.fillStyle="rgba(20,28,19,.28)";ctx.beginPath();ctx.ellipse(63,103,19,2.5,0,0,Math.PI*2);ctx.fill();
    const rodColor={bamboo:c.wood3,youngBamboo:c.leaf2,clearStream:c.roof3,starGazer:c.gold,moroko:c.blue}[rod]||c.wood3;
    line(p.butt,p.hand,c.ink,3.2);line(p.butt,p.hand,c.wood1,2);
    let last=p.hand;
    for(let i=1;i<=24;i++){
      const t=i/24,q={x:p.hand.x+p.unit.x*64*t-p.unit.y*p.bend*t*t,y:p.hand.y+p.unit.y*64*t+p.unit.x*p.bend*t*t};
      line(last,q,c.ink,1.7-t*.8);line(last,q,rodColor,.8-t*.3);
      if(i%5===0)line({x:q.x-p.unit.y*.7,y:q.y+p.unit.x*.7},{x:q.x+p.unit.y*.7,y:q.y-p.unit.x*.7},c.cream,.5);
      last=q;
    }
    const reel={x:p.hand.x-p.unit.x*5-p.unit.y*3,y:p.hand.y-p.unit.y*5+p.unit.x*3};
    ctx.beginPath();ctx.ellipse(reel.x,reel.y,2.8,3.4,0,0,Math.PI*2);ctx.fillStyle=c.ink;ctx.fill();ctx.strokeStyle=c.stone2;ctx.lineWidth=.8;ctx.stroke();
    line(reel,{x:reel.x+3,y:reel.y+2},c.stone2,.8);
    // The handle stays in front of the angler, behind the visible back.
    // The near arm sits over that back at the shoulder seam: never mask
    // its elbow and forearm away just because it bends near the vest.
    ctx.save();ctx.transform(size,0,-shear,size,62-art.center*size+shear*art.floor,102-art.floor*size);
    polygon(ctx,art.core);ctx.clip();ctx.drawImage(img,0,0);ctx.restore();
    limb(arms[1],"upper");limb(arms[1],"lower");
    drawGrip(ctx,p.hand,p.angle);
    ctx.restore();
    if(flying){
      const r=w/640;
      ctx.fillStyle=c.ink;ctx.fillRect(m.bobber.x-r,m.bobber.y-2*r,3*r,6*r);
      ctx.fillStyle=c.red;ctx.fillRect(m.bobber.x,m.bobber.y-r,r,2*r);ctx.fillStyle=c.cream;ctx.fillRect(m.bobber.x,m.bobber.y+r,r,2*r);
    }
    const tint={night:"rgba(18,33,63,.38)",evening:"rgba(113,50,29,.16)",dawn:"rgba(65,63,91,.18)"}[env.period];
    if(tint){ctx.save();ctx.globalCompositeOperation="source-atop";ctx.fillStyle=tint;ctx.fillRect(0,0,w,h);ctx.restore();}
    m.detailed=true;m.arms=arms;m.support=worldPoint(arms[0].handPoint,m.box);return m;
  }
  function draw(canvas,{avatar="boy",rod="bamboo",progress=0,target,flying=false,env=Pixel.calendar(),sprite}={}){
    avatar=avatar==="girl"?"girl":"boy";
    const img=sprite||sprites[avatar];
    if(img)return drawDetailed(canvas,{avatar,rod,progress,target,flying,env},img);
    const ctx=canvas.getContext("2d"),w=canvas.width,h=canvas.height;
    ctx.clearRect(0,0,w,h);ctx.imageSmoothingEnabled=false;
    const m=model(w,h,progress,target||{x:w*.7,y:h*.5},flying),p=m.pose,c=Pixel.palette(env);
    const dark=c.ink,skin=c.cream,skinShadow=c.wood2,hair=c.wood0,hat=avatar==="girl"?c.red:c.roof1;
    const shirt=avatar==="girl"?c.red:c.water1,vest=avatar==="girl"?c.red:c.sand1,pants=avatar==="girl"?c.wood2:c.roof0;
    ctx.save();ctx.translate(m.box.x,m.box.y);ctx.scale(m.box.scale,m.box.scale);
    const d=Pixel.painter(ctx),lean=p.lean;
    d.oval(63,103,22,4,c.dark);
    // Feet are planted throughout the throw. The weight shift happens at
    // the hips and knees, not by sliding the entire sprite around the bank.
    d.line(58+lean*.3,80,53,94,dark,9);d.line(69+lean*.3,80,72,94,dark,9);
    d.line(58+lean*.3,80,53,91,pants,6);d.line(69+lean*.3,80,72,91,pants,6);
    d.rect(49,92,7,7,skin);d.rect(69,92,7,7,skin);
    d.rect(48,96,8,3,avatar==="girl"?c.roof1:c.snow);d.rect(69,96,8,3,avatar==="girl"?c.roof1:c.snow);
    d.rect(46,98,12,5,dark);d.rect(69,98,12,5,dark);d.rect(48,98,8,3,c.wood1);d.rect(70,98,9,3,c.wood1);
    const arms=armPose(avatar,p),shoulderL=arms[0].shoulderPoint,shoulderR=arms[1].shoulderPoint;
    const elbowL=arms[0].elbowPoint,elbowR=arms[1].elbowPoint;
    p.support=arms[0].handPoint;m.support=worldPoint(p.support,m.box);
    // Far arm and torso, then the rod, near forearm and palms. Every limb
    // connects to its joint, and each palm covers its exact grip coordinate.
    d.line(shoulderL.x,shoulderL.y,elbowL.x,elbowL.y,dark,7);d.line(elbowL.x,elbowL.y,p.support.x,p.support.y,dark,6);
    d.line(shoulderL.x,shoulderL.y,elbowL.x,elbowL.y,skinShadow,5);d.line(elbowL.x,elbowL.y,p.support.x,p.support.y,skin,4);
    d.poly([[51+lean,54],[72+lean,54],[77+lean*.3,77],[70+lean*.3,83],[54+lean*.3,83],[48+lean*.3,77]],dark);
    d.poly([[52+lean,55],[71+lean,55],[74+lean*.3,77],[69+lean*.3,80],[54+lean*.3,80],[51+lean*.3,75]],vest);
    d.rect(53+lean,56,4,20,avatar==="girl"?c.wood1:c.cream);d.rect(56+lean*.4,78,15,2,hair);
    d.line(57+lean,67,70+lean,67,avatar==="girl"?c.wood1:c.wood2);
    d.rect(70+lean*.4,77,8,8,c.wood1);d.rect(71+lean*.4,79,6,4,c.wood2);d.rect(73+lean*.4,79,2,2,c.gold);
    d.oval(62+lean,42,14,15,dark);d.oval(62+lean,42,12,13,hair);
    if(avatar==="girl")d.poly([[50+lean,40],[76+lean,40],[78+lean,55],[68+lean,58],[50+lean,55],[47+lean,50]],hair);
    d.rect(71+lean,43,5,8,skinShadow);d.rect(73+lean,43,3,6,skin);
    d.oval(62+lean,34,15,11,dark);d.oval(62+lean,33,13,9,hat);
    d.rect(48+lean,33,29,9,hat);d.rect(47+lean,40,28,4,dark);d.rect(48+lean,40,25,2,hat);
    d.rect(65+lean,32,1,8,avatar==="girl"?c.gold:c.roof2);d.rect(50+lean,29,7,2,avatar==="girl"?c.sand0:c.roof2);
    d.rect(56+lean,40,11,5,hair);d.rect(58+lean,41,7,2,c.wood1);
    d.line(shoulderR.x,shoulderR.y,elbowR.x,elbowR.y,dark,8);d.line(shoulderR.x,shoulderR.y,elbowR.x,elbowR.y,shirt,6);
    const rodColor={bamboo:c.wood3,youngBamboo:c.leaf2,clearStream:c.roof3,starGazer:c.gold,moroko:c.blue}[rod]||c.wood3;
    d.line(p.butt.x,p.butt.y,p.hand.x,p.hand.y,dark,4);d.line(p.butt.x,p.butt.y,p.hand.x,p.hand.y,c.wood1,2);
    let last=p.hand;
    for(let i=1;i<=18;i++){
      const t=i/18,point={x:p.hand.x+p.unit.x*64*t-p.unit.y*p.bend*t*t,y:p.hand.y+p.unit.y*64*t+p.unit.x*p.bend*t*t};
      d.line(last.x,last.y,point.x,point.y,dark,i<9?3:2);d.line(last.x,last.y,point.x,point.y,rodColor,1);
      if(i%4===0)d.rect(point.x,point.y,2,1,c.cream);last=point;
    }
    const reel={x:p.hand.x-p.unit.x*5-p.unit.y*4,y:p.hand.y-p.unit.y*5+p.unit.x*4};
    d.oval(reel.x,reel.y,4,4,dark);d.oval(reel.x,reel.y,2,2,c.stone2);
    d.line(elbowR.x,elbowR.y,p.hand.x,p.hand.y,dark,6);d.line(elbowR.x,elbowR.y,p.hand.x,p.hand.y,skin,4);
    d.oval(p.support.x,p.support.y,3,3,skinShadow);d.oval(p.hand.x,p.hand.y,3,3,skin);
    d.rect(p.hand.x-1,p.hand.y+1,3,1,skinShadow);
    ctx.restore();
    if(flying){
      const out=Pixel.painter(ctx);out.rect(m.bobber.x-1,m.bobber.y-2,3,6,c.ink);
      out.rect(m.bobber.x,m.bobber.y-1,1,2,c.red);out.rect(m.bobber.x,m.bobber.y+1,1,2,c.cream);
    }
    return m;
  }
  return Object.freeze({DURATION,RELEASE,keys,pose,layout,model,draw,preload,artwork,armPose});
});
