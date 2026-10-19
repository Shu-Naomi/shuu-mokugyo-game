/* Presentation for the side-following fishing view. No encounters, line
 * physics, random draws or save data live here. */
(function(root,factory){const api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;
  else root.ShuNushiPresentation=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(){
  'use strict';
  const background='assets/nushi-open-water-v245.webp';
  const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
  const wrap=(n,size)=>((n%size)+size)%size;
  const beds=new WeakMap();
  function repeat(ctx,image,offset,width,height){
    const tile=height*image.width/image.height,start=-wrap(offset*width,tile*2);
    for(let i=0;i<Math.ceil(width/tile)+3;i++){
      const left=Math.round(start+i*tile),right=Math.round(start+(i+1)*tile);
      if(right<=0||left>=width)continue;
      ctx.save();ctx.translate(i%2?right:left,0);if(i%2)ctx.scale(-1,1);
      ctx.drawImage(image,0,0,right-left,height);ctx.restore();
    }
  }
  function paintWater(canvas,image,offset,{zone='lake',depth='mid',period='day',reduced=false}={}){
    if(!canvas.width||!canvas.height||!image?.width||!image?.height)return false;
    const ctx=canvas.getContext('2d'),w=canvas.width,h=canvas.height,travel=reduced?0:offset;
    ctx.clearRect(0,0,w,h);ctx.imageSmoothingEnabled=true;
    ctx.save();
    ctx.filter=zone==='sea'?'hue-rotate(12deg) saturate(.92)':zone==='river'?'hue-rotate(-8deg) saturate(.85)':'none';
    repeat(ctx,image,travel*.36,w,h);
    let bed=beds.get(image);
    if(!bed){
      bed=canvas.ownerDocument?.createElement('canvas')||new canvas.constructor(image.width,image.height);
      bed.width=image.width;bed.height=image.height;
      const painter=bed.getContext('2d');painter.drawImage(image,0,0);
      painter.globalCompositeOperation='destination-in';
      const fade=painter.createLinearGradient(0,bed.height*.72,0,bed.height*.94);
      fade.addColorStop(0,'transparent');fade.addColorStop(1,'#fff');
      painter.fillStyle=fade;painter.fillRect(0,0,bed.width,bed.height);
      painter.globalCompositeOperation='source-over';beds.set(image,bed);
    }
    repeat(ctx,bed,travel*.82,w,h);ctx.filter='none';
    // Sparse suspended specks are nearer than the bed. Their coordinates
    // depend on camera distance, never on the gameplay random generator.
    for(let i=0;i<32;i++){
      const x=wrap((i*.61803398875%1)*w-travel*w*(i%3===0?1.5:.66),w);
      const y=(.16+(i*.38196601125%1)*.77)*h;
      ctx.fillStyle=i%3===0?'#d4f0df42':'#b0d8cd29';
      ctx.fillRect(Math.round(x),Math.round(y),i%3===0?2:1,1);
    }
    const darkness=(depth==='deep'?.16:depth==='shallow'?0:.05)+
      (period==='night'?.34:period==='evening'?.12:period==='dawn'?.16:0);
    ctx.fillStyle=`rgba(3,20,39,${darkness})`;ctx.fillRect(0,0,w,h);
    ctx.restore();return true;
  }
  function resistance(milliseconds,profile,facing=1,reduced=false){
    if(reduced)return {frame:facing>0?.95:5.05,angle:0,x:0,y:0,bend:0};
    const t=Math.max(0,milliseconds)/1000;
    // Unequal bursts, with a small wind-up, rather than an even whole-body
    // shiver. The authored yaw drives the head; the rear counter-bends.
    const phase=t*Math.PI*2*(1.8+profile.tempo*.75)+.24*Math.sin(t*8.1);
    const effort=(.64+.36*Math.sin(t*7.3)**2)*Math.min(1,.3+t/ .12);
    const wave=reduced?0:Math.sin(phase)*effort;
    const yaw=.95+wave*.9;
    return {frame:facing>0?yaw:6-yaw,angle:wave*3.4*profile.shake,
      x:wave*1.6,y:Math.sin(phase*.5)*.55*(reduced?0:1),bend:-wave*profile.shake};
  }
  const escapeDuration=4320;
  function createEscape(now,{x=65,y=45,facing=1,scale=1}={}){
    return {elapsed:0,lastAt:now,startX:x,startY:y,startFacing:facing,startScale:scale,audioStarted:false};
  }
  function advanceEscape(state,now,reduced=false){
    // A delayed callback cannot finish an unseen scene. Pause/resume resets
    // lastAt; the same short sequence continues when the player returns.
    state.elapsed+=clamp(now-state.lastAt,0,120);state.lastAt=now;
    const t=state.elapsed,p=clamp(t/escapeDuration,0,1),follow=1-Math.exp(-t/460);
    const leave=clamp((t-3300)/1020,0,1);
    return {elapsed:t,done:t>=escapeDuration,
      x:state.startX+(64-state.startX)*follow+leave*leave*65,
      y:state.startY+(43-state.startY)*follow+(reduced?0:Math.sin(t/280)*1.4),
      scale:state.startScale*(1-.25*clamp((t-1600)/2300,0,1)),
      opacity:1-clamp((t-3880)/440,0,1),
      speed:3.2+2.4*(.55+.45*Math.sin(t/170)**2),
      travel:reduced?0:(.013+.011*(1-Math.exp(-t/260)))*(1-leave*.5),
      turn:state.startFacing<0&&t<480?(1-t/480)*6:null,
      caption:t<600?'糸が切れた……':'魚は元気よく泳いで行った',progress:p};
  }
  // Original short defeat cue: a falling sigh, then a cheeky little pickup.
  // Notes are MIDI pitches; the fish has plenty of energy left!
  const score=Object.freeze([
    [0,74,.22,'triangle',.13],[.23,72,.22,'triangle',.12],[.46,69,.34,'triangle',.12],
    [.82,65,.42,'triangle',.12],[1.43,81,.12,'triangle',.10],[1.60,82,.12,'triangle',.11],
    [1.77,81,.14,'triangle',.10],[2.02,73,.12,'triangle',.11],[2.18,74,.43,'triangle',.13],
    [0,50,.33,'sine',.13],[.46,48,.32,'sine',.12],[.82,46,.38,'sine',.13],
    [1.42,45,.22,'sine',.12],[2.02,50,.56,'sine',.14],
  ].map(Object.freeze));
  const jingleDuration=2700;
  function createJingle({audio}){
    const voices=new Set();let sessions=0;
    function stop(){for(const voice of [...voices]){try{voice.source.stop();}catch{}voice.cleanup();}}
    function play(offsetMs=0){
      const current=audio();stop();
      if(!current?.context||current.context.state!=='running'||!current.destination||offsetMs>=jingleDuration)return false;
      const {context,destination}=current,offset=Math.max(0,offsetMs)/1000;
      try{
        for(const [at,midi,duration,type,volume]of score){
          if(at+duration<=offset)continue;
          const when=context.currentTime+Math.max(0,at-offset),length=duration-Math.max(0,offset-at);
          const source=context.createOscillator(),gain=context.createGain();source.type=type;
          source.frequency.setValueAtTime(440*2**((midi-69)/12),when);
          gain.gain.setValueAtTime(.0001,when);
          gain.gain.exponentialRampToValueAtTime(volume,when+Math.min(.012,length/3));
          gain.gain.exponentialRampToValueAtTime(.0001,when+length);
          const voice={source,cleanup(){try{source.disconnect();}catch{}try{gain.disconnect();}catch{}voices.delete(voice);}};
          voices.add(voice);source.onended=voice.cleanup;source.connect(gain);gain.connect(destination);
          source.start(when);source.stop(when+length+.015);
        }
        sessions++;return voices.size>0;
      }catch{stop();return false;}
    }
    return {play,stop,stats:()=>({active:voices.size>0,voices:voices.size,sessions})};
  }
  return Object.freeze({background,paintWater,resistance,escapeDuration,createEscape,advanceEscape,score,jingleDuration,createJingle});
});
