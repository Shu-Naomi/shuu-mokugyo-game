const assert=require('node:assert/strict');

// Image.decode() on a separate Image is not proof that the director has painted
// its cached Image. Wait for the selected canvas, not a sleep or color retry.
module.exports=async function openingArtReady(page,expected){
 let handle;
 try{
  handle=await page.waitForFunction(({step,panel})=>{
   const c=document.querySelector('#lakeIntroPicture');if(!c)return false;
   const actual={step:c.dataset.step,panel:c.dataset.panel,artState:c.dataset.artState};
   if(actual.step!==step||actual.panel!==panel)return false;
   return ['ready','error'].includes(actual.artState)?actual:false;
  },expected,{timeout:15000,polling:50});
 }catch(error){
  const actual=await page.evaluate(()=>{const c=document.querySelector('#lakeIntroPicture');return c?{step:c.dataset.step,panel:c.dataset.panel,artState:c.dataset.artState}:null;});
  throw new Error(`Opening painting did not become ready within 15000ms: expected ${JSON.stringify(expected)}, actual ${JSON.stringify(actual)}`,{cause:error});
 }
 try{
  const actual=await handle.jsonValue();
  assert.equal(actual.artState,'ready',`Opening painting failed to load: ${JSON.stringify(expected)}; actual ${JSON.stringify(actual)}`);
  return actual;
 }finally{await handle.dispose();}
};

module.exports.decodeAssets=(page,source)=>page.evaluate(async selected=>{
 let timer;
 const sources=[...new Set([...Object.values(ShuLakeIntro.art),selected])];
 try{
  return await Promise.race([
   Promise.all(sources.map(async src=>{
    const im=new Image();im.src=src;
    try{await im.decode();}catch(error){throw new Error(`Opening painting failed to decode: ${src}`,{cause:error});}
    return {src,width:im.naturalWidth,height:im.naturalHeight};
   })),
   new Promise((_,reject)=>{timer=setTimeout(()=>reject(new Error(`Opening paintings did not decode within 15000ms: ${sources.join(', ')}`)),15000);}),
  ]);
 }finally{clearTimeout(timer);}
},source);
