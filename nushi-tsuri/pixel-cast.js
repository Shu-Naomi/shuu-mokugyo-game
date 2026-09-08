/* One clock and one coordinate system for body, both hands, rod and line.
 * Original pixel actor rig; no rescaled six-frame screenshots or rod atlases.
 */
(function(root,factory){
  if(typeof module==="object"&&module.exports)module.exports=factory(require("./pixel-world.js"));
  else root.ShuCast=factory(root.ShuPixel);
})(typeof globalThis==="object"?globalThis:this,function(Pixel){
  "use strict";
  const DURATION=1200,RELEASE=.58;
  const keys=[
    {t:0,x:80,y:70,angle:-48,lean:0,bend:0},
    {t:.18,x:76,y:64,angle:-78,lean:-1,bend:1},
    {t:.41,x:65,y:51,angle:-139,lean:-3,bend:-3},
    {t:.63,x:86,y:61,angle:-25,lean:3,bend:7},
    {t:.81,x:86,y:68,angle:-14,lean:2,bend:1},
    {t:1,x:80,y:70,angle:-48,lean:0,bend:0},
  ];
  function pose(progress=0){
    const t=Math.max(0,Math.min(1,Number(progress)||0));
    const i=Math.max(0,keys.findIndex((k,index)=>index<keys.length-1&&t<=keys[index+1].t));
    const a=keys[i],b=keys[Math.min(keys.length-1,i+1)],u=Math.min(1,(t-a.t)/(b.t-a.t||1));
    const ease=u*u*(3-2*u),p={t};
    for(const k of ["x","y","angle","lean","bend"])p[k]=a[k]+(b[k]-a[k])*ease;
    const rad=p.angle*Math.PI/180,ux=Math.cos(rad),uy=Math.sin(rad);
    p.hand={x:p.x,y:p.y};p.support={x:p.x-ux*10,y:p.y-uy*10};
    p.tip={x:p.x+ux*64-uy*p.bend,y:p.y+uy*64+ux*p.bend};
    p.butt={x:p.x-ux*17,y:p.y-uy*17};p.unit={x:ux,y:uy};
    p.leftFoot={x:51,y:102};p.rightFoot={x:73,y:102};
    return p;
  }
  function layout(width,height){
    // Integer source pixels remain square on wide and tall phones.
    const scale=Math.max(1,Math.floor(Math.min(height/240,width/175)));
    return {scale,x:Math.round(width*.415-64*scale),y:Math.round(height*.935-102*scale)};
  }
  function worldPoint(point,box){return {x:box.x+point.x*box.scale,y:box.y+point.y*box.scale};}
  function model(width,height,progress,target={x:width*.7,y:height*.5},flying=false){
    const p=pose(progress),box=layout(width,height),tip=worldPoint(p.tip,box),hand=worldPoint(p.hand,box);
    let bobber={x:tip.x+2,y:tip.y+9};
    if(flying&&progress>=RELEASE){
      const start=worldPoint(pose(RELEASE).tip,box),u=Math.min(1,Math.max(0,(progress-RELEASE)/(1-RELEASE)));
      bobber={x:start.x+(target.x-start.x)*u,y:start.y+(target.y-start.y)*u-Math.sin(Math.PI*u)*height*.16};
    }
    return {pose:p,box,tip,hand,support:worldPoint(p.support,box),butt:worldPoint(p.butt,box),bobber,
      leftFoot:worldPoint(p.leftFoot,box),rightFoot:worldPoint(p.rightFoot,box),released:flying&&progress>=RELEASE};
  }
  function draw(canvas,{avatar="boy",rod="bamboo",progress=0,target,flying=false,env=Pixel.calendar()}={}){
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
    const shoulderL={x:52+lean,y:58},shoulderR={x:72+lean,y:58};
    const elbowL={x:(shoulderL.x+p.support.x)*.5-4,y:(shoulderL.y+p.support.y)*.5+6};
    const elbowR={x:(shoulderR.x+p.hand.x)*.5+5,y:(shoulderR.y+p.hand.y)*.5+4};
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
  return Object.freeze({DURATION,RELEASE,keys,pose,layout,model,draw});
});
