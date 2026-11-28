/* Map-only lighting. Never apply this to a DOM ancestor, HUD, boats or cast screens. */
(function(root,factory){
  const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.ShuOutdoorLight=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(){
  'use strict';
  // Match layered-scenery's village night/dawn channel multipliers (rounded to
  // 8-bit Canvas multiply). Multiplication removes baked sunny highlights rather
  // than laying a translucent blue veil over them. No pixel readback per frame.
  const light={night:[.38,.49,.72],dawn:[.73,.77,.91]};
  function paint(ctx,canvas,environment={}){
    const period=environment.period||environment.time,channels=light[period];
    ctx.save();
    if(channels){
      ctx.globalCompositeOperation='multiply';
      ctx.fillStyle=`rgb(${channels.map(v=>Math.round(v*255)).join(',')})`;
      ctx.fillRect(0,0,canvas.width,canvas.height);
    }else{
      // Preserve the established daytime, morning and evening appearance.
      const tint={evening:'rgba(115,46,23,.19)',morning:'rgba(255,220,159,.06)'}[period];
      if(tint){ctx.fillStyle=tint;ctx.fillRect(0,0,canvas.width,canvas.height);}
    }
    ctx.restore();
  }
  return {paint,light};
});
