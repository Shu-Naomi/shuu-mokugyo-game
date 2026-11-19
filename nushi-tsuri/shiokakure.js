/* A small transient tide-pool encounter; never part of saved state. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.ShuShiokakure=api;})(typeof globalThis!=='undefined'?globalThis:this,function(){
 'use strict';
 const home={x:45,y:36};
 const near=(p,r)=>Number.isFinite(p?.x)&&Number.isFinite(p?.y)&&Math.hypot(p.x-home.x,p.y-home.y)<=r;
 function create(){return {time:0,quiet:0,cooldown:0,last:null};}
 function eligible(s){return s.mapRegion==='offshore'&&!s.tournament&&!s.boatActive&&near(s,7);}
 function visible(e){return e.cooldown<=0&&e.time%30000<24000;}
 function scare(e){e.cooldown=8000;e.quiet=0;e.time=0;}
 function step(e,s,dt=170){
  dt=Math.max(0,Math.min(250,dt));
  if(!eligible(s)){e.last=null;e.quiet=0;e.time=0;e.cooldown=Math.max(0,e.cooldown-dt);return false;}
  const moved=e.last&&Math.hypot(s.x-e.last.x,s.y-e.last.y)>.15;
  if(moved&&e.quiet>=2800&&visible(e))scare(e);
  e.last={x:s.x,y:s.y};e.cooldown=Math.max(0,e.cooldown-dt);
  e.time+=dt;e.quiet=moved?0:e.quiet+dt;return visible(e);
 }
 // fishingWater samples the near edge of the pool, up to 2.3 units from its center.
 function ready(e,s,water){return eligible(s)&&!!e.last&&Math.hypot(s.x-e.last.x,s.y-e.last.y)<.15&&near(s,4.5)&&near(water,2.3)&&visible(e)&&e.quiet>=4000;}
 function claim(e,observed,b,distance){
  if(!observed||b.practice)return false;
  // Existing near end of the casting meter is the gentle drop. No new button.
  scare(e);
  return distance>=0&&distance<=24&&(b.method==='lure'||b.bait!=='nushiSecret');
 }
 function paint(canvas,e,reduced=false){
  const c=canvas.getContext('2d');c.clearRect(0,0,10,7);
  if(!visible(e))return;
  const glint=!reduced&&Math.floor(e.time/2000)%2===1;
  const colors={s:'#455455',d:'#555e58',m:'#7f8173',l:glint?'#a6a18c':'#9c9986'};
  const rows=['..........','...lll....','..lmmml...','.lmmmmdm..','.mmmmddd..','..dddddss.','....sss...'];
  rows.forEach((row,y)=>Array.from(row).forEach((pixel,x)=>{
   if(colors[pixel]){c.fillStyle=colors[pixel];c.fillRect(x,y,1,1);}
  }));
 }
 return {home,create,eligible,visible,scare,step,ready,claim,paint};
});
