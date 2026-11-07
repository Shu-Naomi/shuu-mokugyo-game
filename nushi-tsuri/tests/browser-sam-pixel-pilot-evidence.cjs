const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),http=require('node:http');
const {execFileSync}=require('node:child_process');
const {createCanvas,loadImage}=require('@napi-rs/canvas');
const run=require('./browser-sam-pixel-pilot.cjs');
const pinned='880817ec738f6f9dcc45dc9a3a098e7bd6676823';
const baseline=process.env.SAM_BASELINE_ROOT;
assert.ok(baseline,'SAM_BASELINE_ROOT must identify a separate checkout of the pinned baseline');
assert.equal(execFileSync('git',['-C',baseline,'rev-parse','HEAD'],{encoding:'utf8'}).trim(),pinned);
assert.equal(execFileSync('git',['-C',baseline,'status','--porcelain','--untracked-files=no'],{encoding:'utf8'}).trim(),'','baseline tracked files must be clean');
const roots={before:path.resolve(baseline,'nushi-tsuri'),after:path.resolve(__dirname,'..')};
assert.notEqual(roots.before,roots.after);
const screen={width:Number(process.env.SAM_WIDTH||1280),height:Number(process.env.SAM_HEIGHT||720),dpr:Number(process.env.SAM_DPR||1),touch:process.env.SAM_TOUCH==='1'};
const output=path.join(__dirname,'browser-evidence-sam-pixel-pilot',`${screen.width}x${screen.height}-dpr${screen.dpr}`);
fs.mkdirSync(output,{recursive:true});
const types={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.png':'image/png','.webp':'image/webp','.jpg':'image/jpeg','.svg':'image/svg+xml','.mp3':'audio/mpeg','.wav':'audio/wav'};
async function serve(root) {
 const server=http.createServer((req,res)=>{
  try {
   const pathname=decodeURIComponent(new URL(req.url,'http://localhost').pathname);
   if(pathname==='/favicon.ico'){res.writeHead(204);return res.end();}
   assert.ok(pathname.startsWith('/nushi-tsuri/'));
   const relative=pathname.slice('/nushi-tsuri/'.length)||'index.html',file=path.resolve(root,relative);
   assert.ok(file.startsWith(root+path.sep)&&fs.statSync(file).isFile());
   res.writeHead(200,{'Content-Type':types[path.extname(file)]||'application/octet-stream','Cache-Control':'no-store'});fs.createReadStream(file).pipe(res);
  }catch{res.writeHead(404);res.end();}
 });
 await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(0,'127.0.0.1',resolve);});
 return server;
}
(async()=>{
 const servers=[];
 try {
  const results={};
  for(const label of ['before','after']) {
   const server=await serve(roots[label]);servers.push(server);
   results[label]=await run(`http://127.0.0.1:${server.address().port}/nushi-tsuri/`,label,screen,output);
  }
  assert.deepEqual(results.before.fixture,results.after.fixture);
  assert.deepEqual(results.before.visits,results.after.visits,'same routes and collision positions');
  const comparisons=[];
  for(let i=0;i<results.before.screenshots.length;i++) {
   const a=results.before.screenshots[i],b=results.after.screenshots[i];assert.equal(a.name,b.name);
   assert.deepEqual(a.framing,b.framing,'same game clock, player, camera, scale and viewport: '+a.name);
   const images=await Promise.all([a,b].map(s=>loadImage(path.join(output,s.filename))));
   assert.equal(images[0].width,images[1].width);assert.equal(images[0].height,images[1].height);
   const width=images[0].width,height=images[0].height,canvas=createCanvas(width,height),ctx=canvas.getContext('2d');
   const pixels=images.map(image=>{ctx.clearRect(0,0,width,height);ctx.drawImage(image,0,0);return ctx.getImageData(0,0,width,height).data;});
   let changed=0;const diff=ctx.createImageData(width,height);
   for(let p=0;p<pixels[0].length;p+=4) {
    const different=[0,1,2,3].some(c=>pixels[0][p+c]!==pixels[1][p+c]);
    if(different){changed++;diff.data[p]=255;diff.data[p+2]=180;diff.data[p+3]=255;}
   }
   ctx.putImageData(diff,0,0);fs.writeFileSync(path.join(output,`diff-${a.name}.png`),canvas.toBuffer('image/png'));
   const pair=createCanvas(width*2,height),pairCtx=pair.getContext('2d');images.forEach((im,j)=>pairCtx.drawImage(im,j*width,0));
   fs.writeFileSync(path.join(output,`pair-${a.name}.png`),pair.toBuffer('image/png'));
   comparisons.push({name:a.name,before:a.filename,after:b.filename,changedPixels:changed,totalPixels:width*height,framing:a.framing});
  }
  assert.ok(comparisons.find(c=>c.name==='west-approach').changedPixels>0,'visible west-approach pilot must differ from baseline');
  const summary={baseline:pinned,current:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8',cwd:roots.after}).trim(),screen,comparisons,
   performance:{before:results.before.performance,after:results.after.performance},
   limitations:['Visual differences need human art review. Pixel differences are evidence, not an aesthetic pass.',
    'Native-clock idle performance is one sequential CI sample, not physical heat or a statistically controlled benchmark.',
    'Original broader browser-village-sam regression runs separately.']};
  fs.writeFileSync(path.join(output,'comparison.json'),JSON.stringify(summary,null,2));
  fs.writeFileSync(path.join(output,'README.txt'),`Sam pixel-art pilot review\nBaseline: ${pinned}\nViewport: ${JSON.stringify(screen)}\n\nEach pair-*.png shows BEFORE on the left and AFTER on the right.\nIndividual PNGs retain native device pixels; diff-*.png marks changed pixels in magenta.\ncomparison.json asserts identical seeded save, routes, game time, camera, scale, viewport and player position.\nBoth builds exercise real direction/action buttons, repeated shop open/close, practice-pond cancel, NPC walkable feet and save reload.\nThe west approach is the primary art-review view; entrance and reload show the same environment from gameplay positions.\nPerformance uses a separate page with no mocked clock: 2 s warm-up, then >=5 s native RAF/long-task/heap sampling. It does not measure physical heat.\n`);
  console.log('SAM_PIXEL_PILOT_PASS '+JSON.stringify(summary));
 }finally{await Promise.all(servers.map(s=>new Promise(resolve=>s.close(resolve))));}
})().catch(error=>{console.error(error);process.exitCode=1;});
