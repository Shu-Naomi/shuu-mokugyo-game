// REVIEW ONLY: a bounded, reversible Canvas palette experiment. Not loaded by
// the game and not a production asset. This changes colors, never coordinates,
// sampling density, camera scale, DOM layout, input, collision, or saved state.
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.SamMutedPalettePilot = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';
  const units = [1536, 864];
  const boundary = [[1138,430],[1368,430],[1368,615],[1390,637],[1140,637],[1115,600],[1130,535]];
  // Hand-selected muted earth, foliage, slate, water, timber and accent ramps.
  // No spatial blur, sharpen kernel, dithering, downsample or upsample is used.
  const palette = [
    '#121b1a','#1b2823','#25362c','#354936','#4d5d3d','#687744','#87904f','#a1a15e',
    '#232520','#373a32','#51534a','#6b6e60','#858777','#a3a18a','#beb89a','#d8cfaa',
    '#2d251d','#423323','#59432d','#715535','#896941','#a27f50','#b89561','#cfb27e',
    '#162a30','#1c3f48','#235563','#2d6b7b','#428292','#659aa6','#86b0b4','#b0c7bd',
    '#3b2621','#5b3326','#78432d','#965a35','#b27743','#ca985b','#d4b779','#e4d2a1',
    '#382b34','#563d43','#765052','#9a6865','#b9867c','#d5aba0',
  ].map(hex => [1,3,5].map(i => parseInt(hex.slice(i,i+2),16)));
  function contains(x,y) {
    let inside=false;
    for(let i=0,j=boundary.length-1;i<boundary.length;j=i++) {
      const a=boundary[i],b=boundary[j];
      if((a[1]>y)!==(b[1]>y)&&x<(b[0]-a[0])*(y-a[1])/(b[1]-a[1])+a[0])inside=!inside;
    }
    return inside;
  }
  function color(r,g,b) {
    // Muted reference direction, deliberately without an edge/sharpness boost.
    const l=.2126*r+.7152*g+.0722*b;
    const target=[r,g,b].map(v => Math.max(0,Math.min(255,(l*.28+v*.72)*.78)));
    let best=palette[0],distance=Infinity;
    for(const p of palette) {
      const d=2*(target[0]-p[0])**2+3*(target[1]-p[1])**2+(target[2]-p[2])**2;
      if(d<distance){best=p;distance=d;}
    }
    return best;
  }
  function transform(image) {
    const {width,height,data}=image;
    if(!Number.isInteger(width)||!Number.isInteger(height)||width<=0||height<=0||data.length!==width*height*4)throw Error('Invalid image');
    const result=new Uint8ClampedArray(data),cache=new Map();let changed=0,selected=0;
    for(let y=0;y<height;y++)for(let x=0;x<width;x++) {
      if(!contains((x+.5)*units[0]/width,(y+.5)*units[1]/height))continue;
      const i=(y*width+x)*4;if(!data[i+3])continue;selected++;
      const key=data[i]*65536+data[i+1]*256+data[i+2];
      let p=cache.get(key);if(!p){p=color(data[i],data[i+1],data[i+2]);cache.set(key,p);}
      if(p.some((v,c)=>v!==data[i+c]))changed++;
      for(let c=0;c<3;c++)result[i+c]=p[c];
    }
    return {width,height,data:result,changed,selected};
  }
  function install(document) {
    const layers=[...document.querySelectorAll('#worldPixels, canvas.scenery-motion[data-for="worldPixels"], canvas.scenery-foreground[data-for="worldPixels"]')];
    if(!layers.length)throw Error('World canvas not ready');
    const saved=layers.map(canvas=>{const ctx=canvas.getContext('2d');return {canvas,ctx,image:ctx.getImageData(0,0,canvas.width,canvas.height)};});
    let active=true;
    const summary=saved.map(({canvas,ctx,image})=>{
      const output=transform(image),copy=ctx.createImageData(image.width,image.height);copy.data.set(output.data);ctx.putImageData(copy,0,0);
      return {id:canvas.id||canvas.className,width:image.width,height:image.height,changed:output.changed,selected:output.selected};
    });
    return {summary,restore(){if(!active)return;for(const {canvas,ctx,image} of saved){if(canvas.width!==image.width||canvas.height!==image.height)throw Error('Canvas resized during comparison');ctx.putImageData(image,0,0);}active=false;}};
  }
  return {palette,units,boundary,contains,color,transform,install};
});
