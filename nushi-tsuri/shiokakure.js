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
 function ready(e,s,water){return eligible(s)&&!!e.last&&Math.hypot(s.x-e.last.x,s.y-e.last.y)<.15&&near(s,4.5)&&near(water,1.7)&&visible(e)&&e.quiet>=4000;}
 function claim(e,observed,b,distance){
  if(!observed||b.practice)return false;
  // Existing near end of the casting meter is the gentle drop. No new button.
  scare(e);
  return distance>=0&&distance<=24&&(b.method==='lure'||b.bait!=='nushiSecret');
 }
 function paint(canvas,e,reduced=false){
  const c=canvas.getContext('2d');c.clearRect(0,0,160,80);
  if(!visible(e))return;
  const settled=Math.min(1,e.quiet/5000),wave=reduced?0:Math.sin(e.time/2100)*3;
  c.save();c.translate(wave,0);c.globalAlpha=.42+settled*.24;
  c.fillStyle='#697970';c.strokeStyle='#344c49';c.lineWidth=2;
  c.beginPath();c.moveTo(25,38);c.lineTo(10,25+wave);c.lineTo(12,55-wave);c.lineTo(29,45);
  c.bezierCurveTo(56,64,112,59,143,40);c.bezierCurveTo(115,20,61,19,25,38);c.closePath();c.fill();c.stroke();
  c.strokeStyle='#99a394';c.beginPath();c.moveTo(39,39);c.lineTo(65,31);c.lineTo(81,43);c.lineTo(105,31);c.lineTo(127,39);c.stroke();
  c.fillStyle='#344c49';c.fillRect(126,37,3,3);c.restore();
 }
 return {home,create,eligible,visible,scare,step,ready,claim,paint};
});
