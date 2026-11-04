/* A short presentation. Time is committed by the caller, never by animation. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;if(root)root.ShuTimedRest=api;})(typeof globalThis!=='undefined'?globalThis:this,function(){
  'use strict';
  const duration=1000;
  function targetMinute(current,value){
    if(!Number.isFinite(current)||current<0||!/^\d{2}:\d{2}$/.test(value))return null;
    const [h,m]=value.split(':').map(Number);if(h>23||m>59)return null;
    const day=Math.floor(current/1440),target=day*1440+h*60+m;
    return target<=current?target+1440:target;
  }
  function label(minutes){const value=Math.floor(minutes)%1440;return `${String(Math.floor(value/60)).padStart(2,'0')}:${String(value%60).padStart(2,'0')}`;}
  function paint(canvas,kind,progress,images,dog){
    const c=canvas.getContext('2d');c.imageSmoothingEnabled=false;c.clearRect(0,0,320,160);
    if(kind==='inn'){
      c.fillStyle='#6c6843';c.fillRect(0,0,320,160);
      if(images.inn?.complete&&images.inn.naturalWidth)c.drawImage(images.inn,410,385,610,360,0,0,320,160);
      // Lattice-shaped shoji light drifts across the original tatami artwork.
      c.save();c.translate(28+Math.round(progress*36),20);c.transform(1,0,-.45,1,0,0);
      c.fillStyle=`rgba(255,235,172,${.12+Math.sin(progress*Math.PI)*.22})`;
      for(let y=0;y<3;y++)for(let x=0;x<4;x++)c.fillRect(x*25,y*28,22,25);c.restore();
    }else{
      c.fillStyle='#172d36';c.fillRect(0,0,320,160);c.fillStyle='#26464c';c.fillRect(0,45,320,46);
      c.fillStyle='#526f68';for(let i=0;i<10;i++)c.fillRect((i*47+Math.round(progress*8))%320,54+i%4*9,17,1);
      c.fillStyle='#344133';c.fillRect(0,91,320,69);c.fillStyle='#47513b';for(let x=0;x<320;x+=19)c.fillRect(x,98+(x%13),8,2);
      // The player's feet, with the existing favorite dog's sleeping pose beside them.
      c.fillStyle='#30434b';c.fillRect(100,131,13,29);c.fillRect(120,131,13,29);c.fillStyle='#795840';c.fillRect(97,126,18,12);c.fillRect(118,126,18,12);
      if(images.dog?.complete&&images.dog.naturalWidth){const row={shuu:0,riku:1,grey:2}[dog]??0,paw={shuu:240,riku:242,grey:245}[dog]||240;c.drawImage(images.dog,320,row*320,320,320,138,140-paw*.25,80,80);}
      const glow=.12+Math.sin(progress*Math.PI)*.08;c.fillStyle=`rgba(255,205,98,${glow})`;c.fillRect(226,97,51,48);c.fillStyle='#2d2928';c.fillRect(240,102,22,31);c.fillRect(244,97,14,5);c.fillStyle='#c7994a';c.fillRect(242,105,18,25);c.fillStyle='#ffe3a2';c.fillRect(246,109,10,17);c.fillStyle='#53432c';c.fillRect(240,132,22,4);
    }
  }
  function present(canvas,{kind='inn',dog='riku',from,to,onFrame=()=>{},onFinish=()=>{},clock,media}={}){
    const doc=canvas.ownerDocument,env=doc.defaultView,raf=clock||{now:()=>env.performance.now(),request:fn=>env.requestAnimationFrame(fn),cancel:id=>env.cancelAnimationFrame(id)};
    const reduced=media||env.matchMedia?.('(prefers-reduced-motion: reduce)');let active=true,handle=0,start=raf.now(),last=-Infinity,draws=0;
    const images={};for(const [key,src]of Object.entries({inn:'assets/interior-fishing-inn-v55.png',dog:'assets/dog-idles.png'})){images[key]=new env.Image();images[key].src=src;}
    function finish(){if(!active)return;active=false;if(handle)raf.cancel(handle);handle=0;doc.removeEventListener('visibilitychange',visibility);env.removeEventListener('pagehide',finish);reduced?.removeEventListener?.('change',motion);onFinish();}
    function visibility(){if(doc.hidden)finish();}
    function motion(){if(reduced.matches)finish();}
    function tick(now){handle=0;if(!active)return;if(doc.hidden){finish();return;}const p=Math.min(1,(now-start)/duration);
      if(now-last>=1000/20||p===1){paint(canvas,kind,p,images,dog);onFrame(label(from+(to-from)*p));draws++;last=now;}
      if(p>=1)finish();else handle=raf.request(tick);
    }
    doc.addEventListener('visibilitychange',visibility);env.addEventListener('pagehide',finish);reduced?.addEventListener?.('change',motion);
    if(doc.hidden||reduced?.matches){onFrame(label(to));finish();}else tick(start);
    return {finish,snapshot:()=>({active,scheduled:Boolean(handle),draws})};
  }
  return {duration,targetMinute,label,paint,present};
});
