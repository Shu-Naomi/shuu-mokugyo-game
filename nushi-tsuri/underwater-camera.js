/* The camera follows underwater travel. It never changes line distance,
 * encounters or saves. Mirrored neighbours join the existing authored art
 * without a cut, including reverse movement and repeated complete loops. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;
  if(root)root.ShuUnderwaterCamera=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(){
  'use strict';
  const clamp=(n,lo,hi)=>Math.max(lo,Math.min(hi,n));
  const wrap=n=>((n%2)+2)%2;
  function create(now=0){return {offset:0,previous:0,velocity:0,shown:0,tickAt:now,lureTravel:0};}
  function advance(camera,travel,now){
    camera.previous=camera.offset;
    camera.velocity=camera.velocity*.35+clamp(travel,-.025,.025)*.65;
    if(Math.abs(camera.velocity)<.00001)camera.velocity=0;
    camera.offset+=camera.velocity;camera.tickAt=now;
    // Each painter wraps its own layers. Resetting to the old two-tile phase
    // here would jump parallax layers after a long continuous swim.
    return camera.offset;
  }
  function position(camera,now){return camera.previous+(camera.offset-camera.previous)*clamp((now-camera.tickAt)/120,0,1);}
  function resume(camera,now){camera.previous=camera.shown;camera.tickAt=now;}
  function paint(canvas,layers,offset){
    const source=layers[0];if(!source?.width||!source?.height||!canvas.width||!canvas.height)return false;
    const ctx=canvas.getContext('2d'),scale=Math.max(canvas.width/source.width,canvas.height/source.height);
    const width=source.width*scale,height=source.height*scale;
    const start=(canvas.width-width)/2-wrap(offset)*width,top=Math.round((canvas.height-height)/2);
    ctx.clearRect(0,0,canvas.width,canvas.height);ctx.imageSmoothingEnabled=false;
    for(let index=-1;index<=3;index++){
      const left=Math.round(start+index*width),right=Math.round(start+(index+1)*width);
      if(right<=0||left>=canvas.width)continue;
      ctx.save();ctx.translate(index%2?right:left,top);if(index%2)ctx.scale(-1,1);
      for(const layer of layers)if(layer?.width&&layer?.height)ctx.drawImage(layer,0,0,right-left,Math.ceil(height));
      ctx.restore();
    }
    return true;
  }
  return Object.freeze({create,advance,position,resume,paint});
});
