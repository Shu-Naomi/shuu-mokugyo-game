// Opt-in causal diagnostic, never a shipping renderer or replacement baseline.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {createHash}=require('node:crypto');
const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
const CAPTURE_PARAMS=Object.freeze({format:'png',fromSurface:true,captureBeyondViewport:false});

function readAncestorLayout() {
  const properties=['position','width','height','left','top','transform','transform-origin','transform-style',
    'translate','scale','rotate','perspective','perspective-origin','zoom','will-change','backface-visibility',
    'contain','content-visibility','overflow','overflow-x','overflow-y','clip-path','filter','opacity',
    'display','visibility','image-rendering','isolation','mix-blend-mode','z-index','transition','animation'];
  const selector=node=>{
    if(node.id)return '#'+CSS.escape(node.id);
    const parts=[];
    for(let n=node;n;n=n.parentElement){
      const siblings=n.parentElement?[...n.parentElement.children].filter(s=>s.tagName===n.tagName):[n];
      parts.unshift(n.tagName.toLowerCase()+`:nth-of-type(${siblings.indexOf(n)+1})`);
    }
    return parts.join(' > ');
  };
  const nodes=[];
  for(let node=document.querySelector('#playerSprite');node;node=node.parentElement){
    const r=node.getBoundingClientRect(),css=getComputedStyle(node);
    nodes.push({selector:selector(node),id:node.id,tag:node.tagName,className:node.className,
      inlineStyle:node.getAttribute('style'),
      inlineDeclarations:Array.from(node.style).map(key=>[key,node.style.getPropertyValue(key),node.style.getPropertyPriority(key)]),
      rect:{x:r.x,y:r.y,width:r.width,height:r.height},
      offset:{left:node.offsetLeft,top:node.offsetTop,width:node.offsetWidth,height:node.offsetHeight},
      client:{left:node.clientLeft,top:node.clientTop,width:node.clientWidth,height:node.clientHeight},
      scroll:{left:node.scrollLeft,top:node.scrollTop,width:node.scrollWidth,height:node.scrollHeight},
      computed:Object.fromEntries(properties.map(key=>[key,css.getPropertyValue(key)]))});
  }
  const v=visualViewport;
  return {clock:{now:Date.now(),performanceNow:performance.now(),timelineTime:document.timeline.currentTime},
    viewport:{width:innerWidth,height:innerHeight,dpr:devicePixelRatio,scrollX,scrollY,
      visual:v?{width:v.width,height:v.height,offsetLeft:v.offsetLeft,offsetTop:v.offsetTop,scale:v.scale}:null},nodes};
}

async function createCompositorProbe(page) {
  const session=await page.context().newCDPSession(page);
  let revision=0,latest=null;
  const changed=event=>{latest={revision:++revision,receivedAt:Date.now(),layers:event.layers??[]};};
  session.on('LayerTree.layerTreeDidChange',changed);
  try {await session.send('DOM.enable');await session.send('LayerTree.enable');}
  catch(error){session.off('LayerTree.layerTreeDidChange',changed);await session.detach();throw error;}
  return {
    async snapshot(){
      const layout=await page.evaluate(readAncestorLayout);
      const {root}=await session.send('DOM.getDocument',{depth:0}),nodes=[];
      for(const ancestor of layout.nodes){
        const {nodeId}=await session.send('DOM.querySelector',{nodeId:root.nodeId,selector:ancestor.selector});
        if(!nodeId){nodes.push({selector:ancestor.selector,missing:true});continue;}
        const {node}=await session.send('DOM.describeNode',{nodeId,depth:0});
        nodes.push({selector:ancestor.selector,nodeId,backendNodeId:node.backendNodeId});
      }
      const tree=latest?JSON.parse(JSON.stringify(latest)):null;
      const ids=new Set(nodes.filter(n=>n.backendNodeId!==undefined).map(n=>n.backendNodeId)),layers=tree?.layers??[];
      const relevant=new Set(layers.filter(layer=>ids.has(layer.backendNodeId)).map(layer=>layer.layerId));
      for(const layerId of relevant){
        const parent=layers.find(layer=>layer.layerId===layerId)?.parentLayerId;if(parent)relevant.add(parent);
      }
      const reasons=[];
      for(const layerId of relevant){
        try{reasons.push({layerId,...await session.send('LayerTree.compositingReasons',{layerId})});}
        catch(error){reasons.push({layerId,unavailable:error.message});}
      }
      const actorLayerCoverage=nodes.filter(node=>['#player','#playerSprite'].includes(node.selector)).map(node=>({
        ...node,layerIds:layers.filter(layer=>layer.backendNodeId===node.backendNodeId).map(layer=>layer.layerId)}));
      return {layout,nodes,tree,reasons,actorLayerCoverage,
        limitation:'LayerTree is the latest received protocol event, not an atomic screenshot-time layer snapshot.'};
    },
    async capture(){
      const requestedAt=Date.now(),revisionAtRequest=revision;
      const response=await session.send('Page.captureScreenshot',{...CAPTURE_PARAMS});
      return {bytes:Buffer.from(response.data,'base64'),provenance:{method:'Page.captureScreenshot',
        params:{...CAPTURE_PARAMS},requestedAt,receivedAt:Date.now(),revisionAtRequest,revisionAtReply:revision}};
    },
    async close(){session.off('LayerTree.layerTreeDidChange',changed);await session.detach();}
  };
}

function actorInvariant(observation) {
  const value=JSON.parse(JSON.stringify(observation));delete value.clock;
  delete value.canvas.rgbaFile;delete value.canvas.pngFile;
  // The intervention changes this one property. Everything else stays guarded.
  delete value.sprite.inlineStyle;delete value.sprite.computed['will-change'];
  return value;
}
function layoutInvariant(layout) {
  const value=JSON.parse(JSON.stringify(layout));delete value.clock;
  const sprite=value.nodes.find(node=>node.id==='playerSprite');
  delete sprite.inlineStyle;delete sprite.computed['will-change'];
  sprite.inlineDeclarations=sprite.inlineDeclarations.filter(([key])=>key!=='will-change');
  return value;
}
async function pixelDifference(left,right) {
  const {createCanvas,loadImage}=require('@napi-rs/canvas');
  const images=await Promise.all([left,right].map(bytes=>loadImage(bytes)));
  assert.equal(images[0].width,images[1].width);assert.equal(images[0].height,images[1].height);
  const width=images[0].width,height=images[0].height;
  const data=images.map(image=>{const c=createCanvas(width,height),ctx=c.getContext('2d');
    ctx.drawImage(image,0,0);const rgba=ctx.getImageData(0,0,width,height).data;c.width=1;c.height=1;return rgba;});
  let changedPixels=0,channelAbsoluteError=0,leftX=width,top=height,rightX=0,bottom=0;
  for(let p=0;p<data[0].length;p+=4){
    let differs=false;
    for(let k=0;k<4;k++){const d=Math.abs(data[0][p+k]-data[1][p+k]);channelAbsoluteError+=d;differs||=d!==0;}
    if(differs){changedPixels++;const x=p/4%width,y=Math.floor(p/4/width);
      leftX=Math.min(leftX,x);rightX=Math.max(rightX,x+1);top=Math.min(top,y);bottom=Math.max(bottom,y+1);}
  }
  return {width,height,changedPixels,channelAbsoluteError,
    boundsExclusive:changedPixels?{x:leftX,y:top,right:rightX,bottom}:null,
    pngByteIdentical:left.equals(right),leftRgbaSha256:hash(data[0]),rightRgbaSha256:hash(data[1])};
}

async function runCompositorDiagnostic({page,probe,capture,pipeline,output,label,retainedFirst}) {
  const report={scope:'Dedicated disposable context; not an original-comparison pass or a quality fix.',
    intervention:{target:'#playerSprite',property:'will-change',value:'transform',priority:'important'},
    sequence:['control-a','control-a-repeat','promoted-b','restored-a'],stages:[],comparisons:[],
    limitations:['CDP/DOM readbacks and screenshots change scheduling; no fixed wait, retry or baseline substitution is used.',
      'will-change is a compositor hint. LayerTree must confirm whether promotion actually changed.',
      'A-to-A controls reveal capture drift; a B-only difference suggests association, not a universal Chromium root cause.',
      'Restoring CSS need not restore raster cache. The browser context closes after this diagnostic.']};
  const save=()=>fs.writeFileSync(path.join(output,`${label}-compositor-diagnostic.json`),JSON.stringify(report,null,2));
  const savedStyle=await page.locator('#playerSprite').getAttribute('style');
  const restore=()=>page.locator('#playerSprite').evaluate((node,value)=>{
    if(value===null)node.removeAttribute('style');else node.setAttribute('style',value);
  },savedStyle);
  const originalPipeline=await pipeline(),originalPresentation=await probe.snapshot();
  const records=new Map();let originalActor=null;
  report.originalPresentation=originalPresentation;save();
  try {
    for(const phase of report.sequence){
      if(phase==='promoted-b')await page.locator('#playerSprite').evaluate(node=>node.style.setProperty('will-change','transform','important'));
      if(phase==='restored-a')await restore();
      const stage={phase,captures:[]};report.stages.push(stage);save();
      for(const api of ['playwright','cdp']){
        const filename=`${label}-shop-entrance-compositor-${phase}-${api}.png`;
        const {bytes,observation}=await capture(filename,api==='cdp');
        stage.captures.push({api,filename,pngSha256:hash(bytes),observation});records.set(`${phase}/${api}`,bytes);save();
        for(const side of ['before','after']){
          const actor=actorInvariant(observation[side]);originalActor??=actor;
          assert.deepEqual(actor,originalActor,`${phase}/${api}/${side}: unchanged source, pose and player geometry`);
        }
        for(const side of ['presentationBefore','presentationAfter']){
          const layout=observation[side].layout;
          assert.deepEqual(layoutInvariant(layout),layoutInvariant(originalPresentation.layout),`${phase}/${api}/${side}: unchanged ancestor presentation`);
          const sprite=layout.nodes.find(node=>node.id==='playerSprite');
          if(phase==='promoted-b')assert.equal(sprite.computed['will-change'],'transform');
          else assert.deepEqual(sprite,originalPresentation.layout.nodes.find(node=>node.id==='playerSprite'),`${phase}: exact original sprite style`);
        }
        assert.deepEqual(await pipeline(),originalPipeline,`${phase}/${api}: original world source/state/geometry`);
      }
      stage.invariantsPassed=true;save();
    }
    for(const api of ['playwright','cdp'])for(const [left,right] of [
      ['control-a','control-a-repeat'],['control-a-repeat','promoted-b'],['control-a','restored-a']]){
      report.comparisons.push({api,left,right,...await pixelDifference(records.get(`${left}/${api}`),records.get(`${right}/${api}`))});
    }
    for(const phase of report.sequence)report.comparisons.push({phase,left:'playwright',right:'cdp',
      ...await pixelDifference(records.get(`${phase}/playwright`),records.get(`${phase}/cdp`))});
    report.retainedFirstComparison=await pixelDifference(fs.readFileSync(path.join(output,retainedFirst)),records.get('control-a/playwright'));
    report.status='collected';save();
    return report;
  } catch(error){report.status='failed';report.failure=error.stack;save();throw error;}
  finally {
    if(await page.locator('#playerSprite').getAttribute('style')!==savedStyle)await restore();
    report.inlineStyleRestored=await page.locator('#playerSprite').getAttribute('style')===savedStyle;save();
    assert.equal(report.inlineStyleRestored,true,'diagnostic restores the exact original inline style');
  }
}
module.exports={CAPTURE_PARAMS,readAncestorLayout,createCompositorProbe,actorInvariant,layoutInvariant,pixelDifference,runCompositorDiagnostic};
