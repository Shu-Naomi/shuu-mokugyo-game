/* Detailed scenery compositor. No scenery is redrawn as symbolic tiles.
 * Static art is partitioned once at its native resolution; only small moving
 * parts/effects use the animation canvas. Gameplay coordinates/state are absent.
 */
(function(root,factory) {
  const data=typeof module==='object'&&module.exports?require('./scene-layers.js'):root.ShuSceneLayers;
  const api=factory(data);
  if(typeof module==='object'&&module.exports) module.exports=api;
  else root.ShuScenery=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(Data) {
  'use strict';
  const clamp=(v,min,max)=>Math.max(min,Math.min(max,v));
  const indoorLight={dawn:[.82,.81,.86],morning:[1.01,1,.97],day:[1,1,1],evening:[1.02,.88,.75],night:[.68,.68,.81]};
  const outdoorLight={dawn:[.73,.77,.91],morning:[1.02,1,.94],day:[1,1,1],evening:[1.05,.78,.61],night:[.38,.49,.72]};
  const graded=[0,0,0];
  const matches=(filter,r,g,b)=>{
    if(filter==='foliage') return g>r*1.025&&g>b*1.15&&g>24;
    if(filter==='water') return b>r*1.17&&g>r*1.06;
    if(filter==='earth') return r>g*1.05&&g>b*1.16&&r>55;
    if(filter==='wood') return r>g*1.07&&g>b*1.15;
    if(filter==='stone') return Math.max(r,g,b)-Math.min(r,g,b)<32&&r>40;
    return true;
  };
  function partition(image,definition) {
    const {width:w,height:h,data:rgba}=image, labels=new Uint16Array(w*h);
    const sx=w/definition.units[0],sy=h/definition.units[1];
    definition.parts.forEach((part,index)=>{
      for(const polygon of part.polygons) {
        const points=polygon.map(([x,y])=>[x*sx,y*sy]);
        const top=clamp(Math.floor(Math.min(...points.map(p=>p[1]))),0,h);
        const bottom=clamp(Math.ceil(Math.max(...points.map(p=>p[1]))),0,h);
        // Pixel centres and binary ownership avoid alpha seams at shared edges.
        for(let y=top;y<bottom;y++) {
          const crossings=[],scan=y+.5;
          for(let i=0,j=points.length-1;i<points.length;j=i++) {
            const a=points[j],b=points[i];
            if((a[1]>scan)!==(b[1]>scan)) crossings.push(a[0]+(scan-a[1])*(b[0]-a[0])/(b[1]-a[1]));
          }
          crossings.sort((a,b)=>a-b);
          for(let pair=0;pair+1<crossings.length;pair+=2) {
            const left=clamp(Math.ceil(crossings[pair]-.5),0,w),right=clamp(Math.ceil(crossings[pair+1]-.5),0,w);
            for(let x=left;x<right;x++) {
              const offset=(y*w+x)*4;
              if(matches(part.filter,rgba[offset],rgba[offset+1],rgba[offset+2])) labels[y*w+x]=index+1;
            }
          }
        }
      }
    });
    return labels;
  }
  function grade(r,g,b,kind,env,definition) {
    const season=env.season||'spring',period=env.period||'day';
    if(!definition.indoor) {
      const green=matches('foliage',r,g,b);
      if(green&&season==='autumn') { const old=g;r=Math.min(255,r*.85+old*.57);g=old*.79;b=b*.82; }
      else if(green&&season==='winter') { const light=(r+g+b)/3;r=light*.89+48;g=light*.98+52;b=light*1.09+58; }
      else if(green&&season==='summer') { r*=.91;g=Math.min(255,g*1.035);b*=.95; }
      if(kind==='water'&&season==='winter') {r=r*.9+8;g=g*.96+6;b=Math.min(255,b*1.06+8);}
      if(kind==='water'&&season==='autumn') {r+=4;g*=.97;b*=.96;}
      if(kind==='water'&&season==='summer') {g=Math.min(255,g*1.02);b=Math.min(255,b*1.035);}
    }
    // Surface masters already contain hand-painted morning/evening/night light.
    // Do not apply the clock twice or turn a detailed night painting into black.
    if(!definition.photographedTime || period==='dawn') {
      const light=definition.indoor?indoorLight:outdoorLight;
      const m=light[period]||light.day;r*=m[0];g*=m[1];b*=m[2];
    }
    // Indoor seasons show in the view through the window, not on wooden floors.
    if(definition.indoor&&kind==='light') {
      if(season==='autumn'){r*=1.08;g*=.94;b*=.87;}
      if(season==='winter'){r=r*.88+10;g=g*.95+10;b=b*1.06+8;}
      if(season==='summer'){r*=.97;g*=1.02;}
    }
    if(definition.indoor) {
      if(season==='autumn'){r*=1.015;g*=.994;b*=.98;}
      if(season==='winter'){r*=.98;g*=.995;b*=1.018;}
      if(season==='summer'){r*=1.005;g*=1.012;}
    }
    graded[0]=r;graded[1]=g;graded[2]=b;return graded;
  }
  const makeCanvas=(w,h)=>{const c=document.createElement('canvas');c.width=w;c.height=h;return c;};
  function prepare(source,underlay,definition,env={season:'spring',period:'day'},canvasFactory=makeCanvas) {
    const width=source.naturalWidth||source.width,height=source.naturalHeight||source.height;
    const scratch=canvasFactory(width,height),context=scratch.getContext('2d',{willReadFrequently:true});
    context.drawImage(source,0,0,width,height);
    const pixels=context.getImageData(0,0,width,height),labels=partition(pixels,definition);
    const descriptors=[{id:'ground',kind:'ground'},...definition.parts];
    const bounds=descriptors.map(()=>({left:width,top:height,right:0,bottom:0}));
    for(let y=0;y<height;y++) for(let x=0;x<width;x++) {
      const b=bounds[labels[y*width+x]];
      if(x<b.left)b.left=x;if(x>=b.right)b.right=x+1;if(y<b.top)b.top=y;if(y>=b.bottom)b.bottom=y+1;
    }
    const parts=descriptors.map((descriptor,i)=>{
      const b=bounds[i];
      if(b.right<=b.left||b.bottom<=b.top) return null;
      const canvas=canvasFactory(b.right-b.left,b.bottom-b.top),ctx=canvas.getContext('2d');
      return {...descriptor,...b,canvas,ctx,image:ctx.createImageData(canvas.width,canvas.height),samples:[]};
    });
    for(let y=0;y<height;y++) for(let x=0;x<width;x++) {
      const n=y*width+x,part=parts[labels[n]],offset=n*4;
      const color=grade(pixels.data[offset],pixels.data[offset+1],pixels.data[offset+2],part.kind,env,definition);
      const target=((y-part.top)*part.canvas.width+x-part.left)*4;
      part.image.data[target]=color[0];part.image.data[target+1]=color[1];part.image.data[target+2]=color[2];part.image.data[target+3]=pixels.data[offset+3];
      // Stable sparse samples lie wholly inside the water mask. No sparkle can
      // cross a shoreline, pier, furniture or fish-tank border.
      if(part.effect&&x%29===0&&y%19===0&&x+9<width) {
        let inside=true;for(let offset=1;offset<=9;offset++)if(labels[n+offset]!==labels[n]){inside=false;break;}
        if(inside)part.samples.push({x,y,color:`rgb(${Math.min(255,color[0]+42)|0},${Math.min(255,color[1]+48)|0},${Math.min(255,color[2]+51)|0})`});
      }
    }
    for(const part of parts) if(part) {part.ctx.putImageData(part.image,0,0);delete part.image;delete part.ctx;}
    let base=null;
    if(underlay) {
      base=canvasFactory(width,height);const ctx=base.getContext('2d',{willReadFrequently:true});
      ctx.drawImage(underlay,0,0,width,height);const image=ctx.getImageData(0,0,width,height);
      for(let n=0;n<image.data.length;n+=4) {
        const color=grade(image.data[n],image.data[n+1],image.data[n+2],'ground',env,definition);
        image.data[n]=color[0];image.data[n+1]=color[1];image.data[n+2]=color[2];
      }
      ctx.putImageData(image,0,0);
    }
    const patches=(definition.patches||[]).map(p=>{
      const canvas=canvasFactory(p.to[2],p.to[3]),ctx=canvas.getContext('2d');
      for(let y=0;y<canvas.height;y+=p.sample[3])for(let x=0;x<canvas.width;x+=p.sample[2]) {
        const w=Math.min(p.sample[2],canvas.width-x),h=Math.min(p.sample[3],canvas.height-y);
        ctx.drawImage(scratch,p.sample[0],p.sample[1],w,h,x,y,w,h);
      }
      const image=ctx.getImageData(0,0,canvas.width,canvas.height);
      for(let n=0;n<image.data.length;n+=4){const rgb=grade(...image.data.subarray(n,n+3),'props',env,definition);image.data.set(rgb,n);}
      ctx.putImageData(image,0,0);return {...p,canvas};
    });
    return {width,height,definition,env,parts:parts.filter(Boolean),underlay:base,patches,labels};
  }
  function drawPart(ctx,part,options={}) {
    const transform=options.transforms?.[part.id]||{},parent=options.transforms?.[part.parent]||{};
    if(transform.hidden||parent.hidden)return;
    const dx=(transform.x||0)+(parent.x||0),dy=(transform.y||0)+(parent.y||0);
    const time=options.motionTime||0;
    ctx.save();
    if(part.motion==='sway'&&time) {
      // Bend only the crown, keeping the foot/trunk planted. Less than one
      // native pixel at the crown; no rigid bobbing of the whole tree.
      const bend=Math.sin(time/1900+part.left*.013)*.85;
      const h=part.canvas.height;
      for(let y=0;y<h;y+=4) {
        const strip=Math.min(4,h-y),offset=Math.round(bend*(1-y/h)**2);
        ctx.drawImage(part.canvas,0,y,part.canvas.width,strip,part.left+dx+offset,part.top+dy+y,part.canvas.width,strip);
      }
    } else ctx.drawImage(transform.image||part.canvas,part.left+dx,part.top+dy,part.canvas.width,part.canvas.height);
    ctx.restore();
  }
  function compose(canvas,scene,options={}) {
    const ctx=canvas.getContext('2d');ctx.save();ctx.clearRect(0,0,canvas.width,canvas.height);
    ctx.imageSmoothingEnabled=false;ctx.scale(canvas.width/scene.width,canvas.height/scene.height);
    if(scene.underlay) ctx.drawImage(scene.underlay,0,0);
    for(const part of scene.parts) {
      if(options.excludeForeground&&part.kind==='foreground')continue;
      if(options.staticOnly&&part.motion)continue;
      drawPart(ctx,part,options);
    }
    if(options.patches!==false) for(const patch of scene.patches)ctx.drawImage(patch.canvas,patch.to[0],patch.to[1]);
    ctx.restore();
    return canvas;
  }
  function foreground(canvas,scene,options={}) {
    const ctx=canvas.getContext('2d');ctx.save();ctx.clearRect(0,0,canvas.width,canvas.height);
    ctx.imageSmoothingEnabled=false;ctx.scale(canvas.width/scene.width,canvas.height/scene.height);
    for(const part of scene.parts)if(part.kind==='foreground')drawPart(ctx,part,options);
    ctx.restore();return canvas;
  }
  function motion(canvas,scene,time=0,options={}) {
    if(options.reducedMotion)time=0;
    const ctx=canvas.getContext('2d');ctx.save();ctx.clearRect(0,0,canvas.width,canvas.height);
    ctx.imageSmoothingEnabled=false;ctx.scale(canvas.width/scene.width,canvas.height/scene.height);
    for(const part of scene.parts)if(part.motion)drawPart(ctx,part,{...options,motionTime:time});
    if(time&&!options.reducedMotion) for(const part of scene.parts) if(part.effect) {
      for(let i=0;i<part.samples.length;i++) {
        const sample=part.samples[i],phase=time/1400+i*2.399;
        const alpha=Math.max(0,Math.sin(phase))*(part.effect==='shafts'?.045:.18);
        if(alpha<.025)continue;
        ctx.globalAlpha=alpha;ctx.fillStyle=sample.color;
        ctx.fillRect(sample.x+Math.round(Math.sin(phase*.43)*2)+2,sample.y,part.effect==='shafts'?2:5,1);
      }
    }
    ctx.restore();return canvas;
  }

  // Browser adapter. Each requested scene owns a generation token, so an old
  // image decode cannot repaint a new room/depth/time or an already left scene.
  function createController({loadImage,canvasFactory=makeCanvas,buildScene=prepare,requestFrame,cancelFrame,
    now=()=>performance.now(),visible=canvas=>canvas.isConnected&&!!canvas.getClientRects().length,
    isHidden=()=>document.hidden,reducedMotion=()=>matchMedia('(prefers-reduced-motion: reduce)').matches,
    createMotionCanvas,createForegroundCanvas=()=>null,onError=()=>{}}) {
    const sessions=new Map(),images=new Map(),prepared=new Map();
    let frame=null,lastPaint=0,disposed=false;
    const trim=(cache,max)=>{while(cache.size>max)cache.delete(cache.keys().next().value);};
    const image=url=>{
      if(images.has(url)){const value=images.get(url);images.delete(url);images.set(url,value);return value;}
      const promise=Promise.resolve().then(()=>loadImage(url)).catch(error=>{images.delete(url);throw error;});
      images.set(url,promise);trim(images,6);return promise;
    };
    const active=()=>[...sessions.values()].filter(s=>s.scene&&visible(s.canvas));
    function stop() {if(frame!==null)cancelFrame(frame);frame=null;}
    function wake() {
      if(disposed||isHidden()||frame!==null||reducedMotion()||!active().some(s=>s.scene.parts.some(p=>p.motion||p.effect)))return;
      frame=requestFrame(tick);
    }
    function tick() {
      frame=null;if(disposed||isHidden())return;
      const time=now(),live=active();
      if(time-lastPaint>=1000/12) {
        for(const s of live)motion(s.overlay,s.scene,time,{reducedMotion:reducedMotion()});
        lastPaint=time;
      }
      if(live.length)wake();
    }
    async function paint(canvas,id,env) {
      if(disposed)return false;
      const definition=Data.get(id,env),key=`${id}:${env.season}:${env.period}:${definition.source}`;
      let session=sessions.get(canvas);
      if(session?.key===key) {wake();return session.promise;}
      if(!session) {
        const overlay=createMotionCanvas(canvas),front=createForegroundCanvas(canvas);session={canvas,overlay,front,token:0};sessions.set(canvas,session);
      }
      const token=++session.token;session.key=key;
      session.id=id;session.env=env;
      // Remove the former scene immediately, retaining only its high-detail
      // static frame during loading. It cannot animate over the arriving room.
      session.scene=null;
      session.overlay.getContext('2d').clearRect(0,0,session.overlay.width,session.overlay.height);
      if(session.front)session.front.getContext('2d').clearRect(0,0,session.front.width,session.front.height);
      if(canvas.style) {
        canvas.getContext('2d').clearRect(0,0,canvas.width,canvas.height);
        canvas.style.backgroundImage=`url("${definition.source}")`;
        canvas.style.backgroundSize=definition.indoor&&!id.includes('home')?'contain':id.startsWith('surface-')||id.startsWith('underwater-')?'cover':'100% 100%';
        canvas.style.backgroundPosition='center';canvas.style.backgroundRepeat='no-repeat';
      }
      session.promise=(async()=>{
        try {
          let pending=prepared.get(key);
          if(!pending) {
            pending=Promise.all([image(definition.source),definition.underlay?image(definition.underlay):null])
              .then(([source,underlay])=>buildScene(source,underlay,definition,env,canvasFactory));
            prepared.set(key,pending);trim(prepared,3);
            pending.catch(()=>prepared.delete(key));
          }
          const scene=await pending;
          if(disposed||token!==session.token)return false;
          canvas.width=session.overlay.width=scene.width;canvas.height=session.overlay.height=scene.height;
          compose(canvas,scene,{staticOnly:true,excludeForeground:!!session.front});motion(session.overlay,scene,0);
          if(session.front){session.front.width=scene.width;session.front.height=scene.height;foreground(session.front,scene);}
          if(canvas.style)canvas.style.backgroundImage='none';
          session.scene=scene;session.overlay.dataset.scene=id;
          // Inactive canvases keep their displayed bitmap; discard their layer
          // buffers. A later visit reloads through the bounded three-scene cache.
          for(const other of sessions.values())if(other!==session&&!visible(other.canvas)) {
            other.scene=null;other.key=null;other.token++;
          }
          wake();return true;
        }catch(error){
          if(token===session.token){session.key=null;onError(error,id);}
          return false;
        }
      })();
      return session.promise;
    }
    function dispose(){disposed=true;stop();for(const s of sessions.values()){s.token++;s.overlay.remove?.();s.front?.remove?.();}sessions.clear();prepared.clear();images.clear();}
    function refresh(canvas) {
      const session=sessions.get(canvas);
      if(session&&!session.key)return paint(canvas,session.id,session.env);
      wake();return Promise.resolve(true);
    }
    return {paint,refresh,wake,stop,dispose,stats:()=>({sessions:sessions.size,images:images.size,prepared:prepared.size,frame})};
  }
  let browserController;
  function browserBuilder() {
    let worker=null,sequence=0,disabled=false;
    const jobs=new Map();
    function disable(error) {
      disabled=true;worker?.terminate();worker=null;
      for(const job of jobs.values())job.reject(error);jobs.clear();
    }
    return async (source,underlay,definition,env,canvasFactory)=>{
      if(!disabled&&typeof Worker==='function'&&typeof OffscreenCanvas==='function'&&typeof createImageBitmap==='function'&&OffscreenCanvas.prototype.transferToImageBitmap) {
        let sourceCopy,underlayCopy;
        try {
          if(!worker) {
            worker=new Worker('scenery-worker.js?v=164-1');
            worker.onmessage=event=>{const job=jobs.get(event.data.id);if(!job)return;jobs.delete(event.data.id);event.data.error?job.reject(new Error(event.data.error)):job.resolve(event.data.scene);};
            worker.onerror=()=>disable(new Error('Scenery worker unavailable'));
          }
          sourceCopy=await createImageBitmap(source);
          if(underlay)underlayCopy=await createImageBitmap(underlay);
          const id=++sequence;
          const result=await new Promise((resolve,reject)=>{
            jobs.set(id,{resolve,reject});
            try{worker.postMessage({id,source:sourceCopy,underlay:underlayCopy,definition,env},underlayCopy?[sourceCopy,underlayCopy]:[sourceCopy]);}
            catch(error){jobs.delete(id);reject(error);}
          });
          return result;
        }catch(error){sourceCopy?.close();underlayCopy?.close();disable(error);}
      }
      // Older browsers render the same native pixels after yielding to input.
      await new Promise(resolve=>setTimeout(resolve,0));
      return prepare(source,underlay,definition,env,canvasFactory);
    };
  }
  function browser() {
    if(browserController)return browserController;
    browserController=createController({
      buildScene:browserBuilder(),
      loadImage:url=>new Promise((resolve,reject)=>{const img=new Image();img.onload=()=>resolve(img);img.onerror=()=>reject(new Error('Scenery could not load: '+url));img.src=url;}),
      requestFrame:callback=>requestAnimationFrame(callback),cancelFrame:id=>cancelAnimationFrame(id),
      createMotionCanvas:canvas=>{
        const overlay=document.createElement('canvas');overlay.className=canvas.className+' scenery-motion';
        overlay.setAttribute('aria-hidden','true');overlay.dataset.for=canvas.id;canvas.after(overlay);return overlay;
      },
      createForegroundCanvas:canvas=>{
        const front=document.createElement('canvas');front.className=canvas.className+' scenery-foreground';
        front.setAttribute('aria-hidden','true');front.dataset.for=canvas.id;canvas.after(front);return front;
      },
      onError:(error,id)=>console.warn('Detailed scenery',id,error.message),
    });
    document.addEventListener('visibilitychange',()=>document.hidden?browserController.stop():browserController.wake());
    addEventListener('pagehide',()=>browserController.stop());addEventListener('pageshow',()=>browserController.wake());
    return browserController;
  }
  return {partition,prepare,compose,motion,foreground,createController,paint:(canvas,id,env)=>browser().paint(canvas,id,env),refresh:canvas=>browser().refresh(canvas),assets:Data.assets};
});
