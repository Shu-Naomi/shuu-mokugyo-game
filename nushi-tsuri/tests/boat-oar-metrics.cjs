// Inspect the outer blade regions rather than accepting a moving face/arm as
// evidence of rowing. Coordinates refer to the game's 192x144 boat canvas.
module.exports=function oarMetrics(canvas,direction){
  const {width,height}=canvas,pixels=canvas.getContext('2d').getImageData(0,0,width,height).data;
  const vertical=direction==='up'||direction==='down';
  const sides=[{pixels:0,x:0,y:0},{pixels:0,x:0,y:0}];
  for(let y=0;y<height;y++)for(let x=0;x<width;x++){
    const i=(y*width+x)*4;
    // Warm wood only: the stationary blue/red cap must not count as a blade.
    if(pixels[i+3]<=100||pixels[i]<=pixels[i+1]*1.1||pixels[i+1]<=pixels[i+2]*1.15)continue;
    const above=y<height*.34&&(direction==='right'?x<width*.49:x>width*.55);
    const side=vertical?(x<width*.31?0:x>width*.69?1:-1):(above?0:y>height*.76?1:-1);
    if(side<0)continue;
    const p=sides[side];p.pixels++;p.x+=x;p.y+=y;
  }
  return sides.map(p=>({pixels:p.pixels,x:p.pixels?p.x/p.pixels:0,y:p.pixels?p.y/p.pixels:0}));
};
