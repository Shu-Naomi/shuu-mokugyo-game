/* Decode/partition/color work stays off the input/render thread when supported.
 * Both paths call the exact same compositor; there is no lower-quality fallback.
 */
importScripts('scene-layers.js?v=164-1','layered-scenery.js?v=164-1');
self.onmessage=event=>{
  const {id,source,underlay,definition,env}=event.data;
  try {
    const scene=ShuScenery.prepare(source,underlay,definition,env,(w,h)=>new OffscreenCanvas(w,h));
    const transfers=[];
    const bitmap=canvas=>{const value=canvas.transferToImageBitmap();transfers.push(value);return value;};
    for(const part of scene.parts)part.canvas=bitmap(part.canvas);
    for(const patch of scene.patches)patch.canvas=bitmap(patch.canvas);
    if(scene.underlay)scene.underlay=bitmap(scene.underlay);
    delete scene.labels; // Only authoring/QA needs the full ownership map.
    self.postMessage({id,scene},transfers);
  }catch(error){self.postMessage({id,error:error.message||String(error)});}
  finally{source.close();underlay?.close();}
};
