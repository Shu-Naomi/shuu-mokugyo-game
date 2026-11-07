// Real Chromium output, never a replacement-art proposal. All changes under test
// are injected into a page; the served production runtime/art must equal baseline.
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const http=require('node:http');
const {createHash}=require('node:crypto');
const {execFileSync}=require('node:child_process');
const {createCanvas,loadImage}=require('@napi-rs/canvas');
const {chromium}=require('playwright');
const run=require('./browser-sam-pixel-pilot.cjs');
const pinned='880817ec738f6f9dcc45dc9a3a098e7bd6676823';
const baseline=process.env.SAM_BASELINE_ROOT;
const screen={width:Number(process.env.SAM_WIDTH||1280),height:Number(process.env.SAM_HEIGHT||720),
  dpr:Number(process.env.SAM_DPR||1),touch:process.env.SAM_TOUCH==='1'};
const output=path.join(__dirname,'browser-evidence-sam-pixel-pilot',`${screen.width}x${screen.height}-dpr${screen.dpr}`);
const types={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8',
  '.png':'image/png','.webp':'image/webp','.jpg':'image/jpeg','.svg':'image/svg+xml','.mp3':'audio/mpeg','.wav':'audio/wav'};
const sha256=bytes=>createHash('sha256').update(bytes).digest('hex');
function originalFiles(roots) {
  const files=execFileSync('git',['-C',baseline,'ls-tree','-r','--name-only',pinned,'nushi-tsuri'],{encoding:'utf8'})
    .trim().split('\n').filter(f=>!/\/tests\/|\/tools\/|\.md$/.test(f));
  const manifest=files.map(file=>{
    const relative=file.slice('nushi-tsuri/'.length),a=fs.readFileSync(path.join(roots.baseline,relative)),
      b=fs.readFileSync(path.join(roots.restored,relative));
    assert.deepEqual(a,b,`production runtime/art is byte-for-byte original: ${file}`);
    return {file,bytes:a.length,sha256:sha256(a)};
  });
  assert.ok(!fs.existsSync(path.join(roots.restored,'assets/sam-sfc-pixel-pilot.png')),'rejected art overlay must be absent');
  fs.writeFileSync(path.join(output,'original-runtime-art-manifest.json'),JSON.stringify(manifest,null,2));
  return {files:manifest.length,allBytesIdentical:true,manifest:'original-runtime-art-manifest.json'};
}
async function serve(root) {
  const server=http.createServer((req,res)=>{
    try {
      const pathname=decodeURIComponent(new URL(req.url,'http://localhost').pathname);
      if(pathname==='/favicon.ico'){res.writeHead(204);return res.end();}
      assert.ok(pathname.startsWith('/nushi-tsuri/'));
      const relative=pathname.slice('/nushi-tsuri/'.length)||'index.html',file=path.resolve(root,relative);
      assert.ok(file.startsWith(root+path.sep)&&fs.statSync(file).isFile());
      res.writeHead(200,{'Content-Type':types[path.extname(file)]||'application/octet-stream','Cache-Control':'no-store'});
      fs.createReadStream(file).pipe(res);
    }catch{res.writeHead(404);res.end();}
  });
  await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(0,'127.0.0.1',resolve);});
  return server;
}
function pixels(image) {
  const canvas=createCanvas(image.width,image.height),ctx=canvas.getContext('2d');ctx.drawImage(image,0,0);
  return ctx.getImageData(0,0,image.width,image.height).data;
}
function difference(a,b) {
  assert.equal(a.length,b.length);let changedPixels=0,channelAbsoluteError=0;
  const changed=[];
  for(let p=0;p<a.length;p+=4) {
    let different=false;
    for(let channel=0;channel<4;channel++) {
      if(a[p+channel]!==b[p+channel])different=true;
      channelAbsoluteError+=Math.abs(a[p+channel]-b[p+channel]);
    }
    if(different){changedPixels++;changed.push(p);}
  }
  return {changedPixels,channelAbsoluteError,changed};
}
function cropBounds(crop,image) {
  // Round once to native device pixels, then take exactly that same rectangle
  // from both raw screenshots. No resizing or per-image reframing is allowed.
  const x=Math.max(0,Math.floor(crop.x*screen.dpr)),y=Math.max(0,Math.floor(crop.y*screen.dpr));
  const right=Math.min(image.width,Math.ceil((crop.x+crop.width)*screen.dpr));
  const bottom=Math.min(image.height,Math.ceil((crop.y+crop.height)*screen.dpr));
  assert.ok(right>x&&bottom>y,'Sam crop intersects the viewport');
  return {x,y,width:right-x,height:bottom-y,clipped:x!==Math.floor(crop.x*screen.dpr)||y!==Math.floor(crop.y*screen.dpr)||
    right!==Math.ceil((crop.x+crop.width)*screen.dpr)||bottom!==Math.ceil((crop.y+crop.height)*screen.dpr)};
}
function cropImage(image,bounds) {
  const canvas=createCanvas(bounds.width,bounds.height),ctx=canvas.getContext('2d');
  ctx.imageSmoothingEnabled=false;
  ctx.drawImage(image,bounds.x,bounds.y,bounds.width,bounds.height,0,0,bounds.width,bounds.height);
  return canvas;
}
function savePair(left,right,file,leftLabel,rightLabel,zoom=1) {
  assert.equal(left.width,right.width);assert.equal(left.height,right.height);
  const w=left.width*zoom,h=left.height*zoom,header=32;
  const pair=createCanvas(w*2,h+header),ctx=pair.getContext('2d');
  ctx.fillStyle='#171b21';ctx.fillRect(0,0,pair.width,pair.height);
  ctx.fillStyle='#ffffff';ctx.font='14px sans-serif';
  ctx.fillText(leftLabel,8,21,w-16);ctx.fillText(rightLabel,w+8,21,w-16);
  ctx.imageSmoothingEnabled=false;ctx.drawImage(left,0,header,w,h);ctx.drawImage(right,w,header,w,h);
  fs.writeFileSync(path.join(output,file),pair.toBuffer('image/png'));
}
async function compareShots(left,right,name,crop,requireIdentical=false) {
  const buffers=[left,right].map(file=>fs.readFileSync(path.join(output,file)));
  const images=await Promise.all(buffers.map(buffer=>loadImage(buffer)));
  assert.equal(images[0].width,images[1].width);assert.equal(images[0].height,images[1].height);
  const data=images.map(pixels),diff=difference(...data),width=images[0].width,height=images[0].height;
  const canvas=createCanvas(width,height),ctx=canvas.getContext('2d'),delta=ctx.createImageData(width,height);
  for(const p of diff.changed){delta.data[p]=255;delta.data[p+2]=180;delta.data[p+3]=255;}
  ctx.putImageData(delta,0,0);fs.writeFileSync(path.join(output,`${name}-diff.png`),canvas.toBuffer('image/png'));
  const pair=`${name}-pair.png`;
  savePair(...images,pair,'LEFT: original pixelated',`RIGHT: ${name}`);
  const bounds=cropBounds(crop,images[0]),crops=images.map(image=>cropImage(image,bounds));
  const cropFiles=[`${name}-sam-left-native.png`,`${name}-sam-right-native.png`];
  crops.forEach((image,i)=>fs.writeFileSync(path.join(output,cropFiles[i]),image.toBuffer('image/png')));
  const cropPair=`${name}-sam-pair-native.png`,enlarged=`${name}-sam-pair-nearest-2x.png`;
  savePair(...crops,cropPair,'LEFT: original pixelated',`RIGHT: ${name}`);
  savePair(...crops,enlarged,'LEFT: original pixelated | nearest 2x',`RIGHT: ${name} | nearest 2x`,2);
  const samDifference=difference(...crops.map(pixels));
  const result={name,left,right,pair,cropPair,enlarged,nativeCrops:cropFiles,
    nativeDevicePixels:{width,height},samCropDevicePixels:bounds,
    changedPixels:diff.changedPixels,totalPixels:width*height,channelAbsoluteError:diff.channelAbsoluteError,
    samChangedPixels:samDifference.changedPixels,samTotalPixels:bounds.width*bounds.height,
    pngByteIdentical:buffers[0].equals(buffers[1]),
    finding:diff.changedPixels===0?'No screenshot difference; no evidence of an outline improvement.':
      'Screenshot difference detected. This alone does not establish sharper outlines or better art.'};
  if(requireIdentical)assert.ok(result.pngByteIdentical,`baseline and restored original must be byte-identical: ${name}`);
  return result;
}
async function syntheticProbe() {
  // Standalone DPR 1 diagnostic isolates CSS scaling from game zoom/DPR. It is
  // never inserted into the game and does not replace any displayed game art.
  const browser=await chromium.launch({headless:true}),context=await browser.newContext({viewport:{width:80,height:80},deviceScaleFactor:1});
  const page=await context.newPage(),samples=[];
  try {
    await page.setContent('<style>html,body{margin:0;background:#f0d0b0}canvas{position:absolute;left:16px;top:16px}</style><canvas width="16" height="16"></canvas>');
    const source=await page.evaluate(()=>{
      const canvas=document.querySelector('canvas'),ctx=canvas.getContext('2d'),image=ctx.createImageData(16,16);
      for(let y=0;y<16;y++)for(let x=0;x<16;x++) {
        const at=(y*16+x)*4,value=(y<8?x%2:x>=y-8)?255:0;
        image.data[at]=image.data[at+1]=image.data[at+2]=value;image.data[at+3]=255;
      }
      ctx.putImageData(image,0,0);
      return {width:16,height:16,rgba:Array.from(image.data),palette:[[0,0,0,255],[255,255,255,255]]};
    });
    for(const scale of [1.25,.75])for(const value of ['pixelated','crisp-edges','auto']) {
      const supported=await page.evaluate(value=>CSS.supports('image-rendering',value),value);
      if(!supported){samples.push({scale,value,skipped:true});continue;}
      const metrics=await page.evaluate(({value,scale})=>{
        const canvas=document.querySelector('canvas');canvas.style.width=`${16*scale}px`;canvas.style.height=`${16*scale}px`;canvas.style.imageRendering=value;
        const r=canvas.getBoundingClientRect();
        return {computed:getComputedStyle(canvas).imageRendering,rect:{x:r.x,y:r.y,width:r.width,height:r.height},dpr:devicePixelRatio,
          rgba:Array.from(canvas.getContext('2d').getImageData(0,0,16,16).data)};
      },{value,scale});
      assert.equal(metrics.computed,value);assert.deepEqual(metrics.rgba,source.rgba,'probe source pixels unchanged');delete metrics.rgba;
      const filename=`probe-${scale}-${value}.png`,buffer=await page.screenshot({path:path.join(output,filename),scale:'device'});
      const image=await loadImage(buffer),bounds={x:16,y:16,width:16*scale,height:16*scale},sample=cropImage(image,bounds);
      const rgba=pixels(sample),palette=new Map();let interpolatedPixels=0;
      for(let i=0;i<rgba.length;i+=4) {
        const key=Array.from(rgba.subarray(i,i+4)).join(',');palette.set(key,(palette.get(key)||0)+1);
        if(key!=='0,0,0,255'&&key!=='255,255,255,255')interpolatedPixels++;
      }
      const crop=`probe-${scale}-${value}-native.png`;fs.writeFileSync(path.join(output,crop),sample.toBuffer('image/png'));
      samples.push({scale,value,filename,crop,...metrics,totalPixels:bounds.width*bounds.height,
        interpolatedPixels,uniqueColors:palette.size,palette:Object.fromEntries([...palette].sort()),rgbaSha256:sha256(rgba)});
    }
    const comparisons=[1.25,.75].flatMap(scale=>{
      const base=samples.find(s=>s.scale===scale&&s.value==='pixelated');
      return samples.filter(s=>s.scale===scale&&s.value!=='pixelated'&&!s.skipped).map(candidate=>({scale,
        left:'pixelated',right:candidate.value,sameSampledPixels:base.rgbaSha256===candidate.rgbaSha256,
        interpolationPixelDelta:candidate.interpolatedPixels-base.interpolatedPixels,
        finding:base.rgbaSha256===candidate.rgbaSha256?'No observed sampling difference in this Chromium build.':'Observed sampling difference; palette counts quantify source-external blended pixels.'}));
    });
    const result={browserVersion:browser.version(),dpr:1,source:{...source,rgba:undefined,rgbaSha256:sha256(Buffer.from(source.rgba))},samples,comparisons,
      limitation:'Tiny synthetic hard edges reveal interpolation behavior, not the aesthetic quality of the original artwork. CSS support does not guarantee different rasterization. This probe does not run inside the game.'};
    fs.writeFileSync(path.join(output,'synthetic-probe.json'),JSON.stringify(result,null,2));
    return result;
  }finally{await context.close();await browser.close();}
}
async function main() {
  assert.ok(baseline,'SAM_BASELINE_ROOT must identify a separate checkout of the pinned baseline');
  assert.equal(execFileSync('git',['-C',baseline,'rev-parse','HEAD'],{encoding:'utf8'}).trim(),pinned);
  assert.equal(execFileSync('git',['-C',baseline,'status','--porcelain','--untracked-files=no'],{encoding:'utf8'}).trim(),'','baseline tracked files must be clean');
  const roots={baseline:path.resolve(baseline,'nushi-tsuri'),restored:path.resolve(__dirname,'..')};
  assert.notEqual(roots.baseline,roots.restored);fs.mkdirSync(output,{recursive:true});
  const runtime=originalFiles(roots),servers=[],results={},comparisons=[];
  try {
    for(const label of ['baseline','restored']) {
      const server=await serve(roots[label]);servers.push(server);
      results[label]=await run(`http://127.0.0.1:${server.address().port}/nushi-tsuri/`,label,screen,output,label==='restored');
    }
    assert.deepEqual(results.baseline.fixture,results.restored.fixture);
    assert.deepEqual(results.baseline.visits,results.restored.visits,'same real button routes and collision positions');
    assert.deepEqual(results.baseline.worldSources,results.restored.worldSources,'exact same original sources');
    assert.deepEqual(results.baseline.sourceImages,results.restored.sourceImages,'exact same source image intrinsic dimensions');
    for(let i=0;i<results.baseline.screenshots.length;i++) {
      const a=results.baseline.screenshots[i],b=results.restored.screenshots[i];assert.equal(a.name,b.name);
      assert.deepEqual(a.pipeline,b.pipeline,'baseline/restored same pixels, game clock, player, camera, scale, viewport and CSS: '+a.name);
      comparisons.push(await compareShots(a.filename,b.filename,`${a.name}-restored-default`,a.pipeline.samCrop.css,true));
      for(const variant of b.variants) {
        if(variant.skipped){comparisons.push({name:`${b.name}-${variant.value}`,...variant});continue;}
        assert.deepEqual(b.framing,variant.pipeline.framing,'same framing for injected experiment');
        comparisons.push(await compareShots(b.filename,variant.filename,`${b.name}-${variant.value}`,b.pipeline.samCrop.css));
      }
    }
    const probe=await syntheticProbe();
    const summary={study:'original-art rendering diagnostics; no production changes',baseline:pinned,
      current:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8',cwd:roots.restored}).trim(),screen,runtime,comparisons,
      sourceImages:results.restored.sourceImages,syntheticProbe:probe,movementDiagnostic:results.restored.movementDiagnostic,
      performance:{baseline:results.baseline.performance||null,experimentalCrispEdges:results.restored.performance||null},
      limitations:['Zero differences are valid evidence; no result is an aesthetic pass or a promised improvement.',
        'Original source bytes and every measured world canvas RGBA hash remain unchanged. imageSmoothingEnabled is not modified by the variants.',
        'Reported canvas smoothing flags are outside paint calls; production already disables smoothing during its saved/restored compose operations.',
        'Compositor-only mode changes promotion hints and 3D-to-2D transform spelling, with an identical camera matrix. Actual layer promotion is browser-dependent; CPU and movement costs require separate validation.',
        'No camera snap or subpixel camera shift is included in these strict same-framing comparisons.',
        'Native-clock idle performance is an optional sequential CI sample, not physical heat or a statistically controlled benchmark.',
        'Camera-motion snapshots seek actual CSS transitions at 0/75/150/300 ms after a real button press. They are separate from settled comparisons and do not measure native frame pacing.',
        'All browser evidence is Chromium, not physical-device Safari. Existing browser-village-sam regression runs separately.']};
    fs.writeFileSync(path.join(output,'comparison.json'),JSON.stringify(summary,null,2));
    fs.writeFileSync(path.join(output,'README.txt'),`Same-art Sam rendering study\nBaseline: ${pinned}\nViewport: ${JSON.stringify(screen)}\n\nProduction is the exact original pixelated runtime and art. There is no shipping rendering flag or new art.\nEvery pair shows original PIXELATED on the LEFT and its labeled experimental comparison on the RIGHT.\nAll raw screenshots and -native Sam crops retain native device pixels. Header labels are outside the image.\n-nearest-2x images enlarge both sides equally using nearest-neighbor solely for review.\nDiff PNGs mark changed device pixels magenta, not objectively better pixels. Zero change is a valid result.\n\nRestored-default compares the immutable baseline checkout with the restored production checkout and requires byte-identical PNGs.\nThe crisp-edges and auto styles affect only the world canvas and its scenery motion/foreground canvases.\nCrisp-edges runs only when CSS.supports is true. Auto is a diagnostic, not a recommended fix.\nCompositor-auto changes only map will-change:auto, backface-visibility:visible, and translate3d to equivalent translate.\nIt preserves the exact camera matrix and bounds, but possible movement/CPU costs are untested. It is not shipped.\nAll experiments are captured within the same paused frame; source RGBA, player, time, camera, size and scale are asserted identical.\nRemoving experiment CSS must restore a byte-identical pixelated screenshot. No camera snapping is mixed into these pairs.\nThe camera-motion-*.png series is separate: a real movement button starts transitions, then the Web Animations API seeks 0/75/150/300 ms while the JS clock advances in matching steps.\nOnly crisp-edges/auto are compared during motion; compositor hints are tested at rest to avoid restarting the transition.\nThe movementDiagnostic record lists active transitions. If the map has none, these frames are not evidence of moving-camera sampling.\n\nEach result JSON records source intrinsic sizes, canvas intrinsic sizes, rendered CSS/device scales, fractional device origins, CSS.supports and computed styles.\nNo variant changes imageSmoothingEnabled; production already disables it inside compose calls. The reported current context flag is outside those calls.\nThe standalone DPR-1 synthetic probe measures a 16x16 black/white pattern at 1.25x and 0.75x CSS scale.\nIts screenshot-sampled palette records blended pixels and whether crisp-edges actually differs from pixelated on this Chromium build.\nIt is not game art and never appears in the game.\n\nBoth original/restored builds exercise real direction/action buttons, repeated shop open/close, pond cancel, NPC feet and save reload.\nOptional performance contexts use native clocks: 2 s warm-up and >=5 s RAF/long-task/heap sampling. They do not measure physical heat.\n`);
    console.log('SAM_SAME_ART_RENDERING_PASS '+JSON.stringify({baseline:pinned,screen,runtime,
      comparisons:comparisons.map(({name,changedPixels,samChangedPixels,pngByteIdentical,skipped})=>({name,changedPixels,samChangedPixels,pngByteIdentical,skipped})),
      probe:probe.comparisons}));
  }finally{await Promise.all(servers.map(server=>new Promise(resolve=>server.close(resolve))));}
}
if(require.main===module)main().catch(error=>{console.error(error);process.exitCode=1;});
module.exports={difference,cropBounds,cropImage,pixels};
