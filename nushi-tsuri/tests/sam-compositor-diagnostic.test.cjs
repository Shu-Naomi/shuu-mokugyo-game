// Protocol and experiment contracts only. No browser process or HTTP server.
const {test}=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),os=require('node:os'),path=require('node:path'),vm=require('node:vm');
const {EventEmitter}=require('node:events'),{createRequire}=require('node:module');
const {createCanvas}=require('@napi-rs/canvas');
const {CAPTURE_PARAMS,createCompositorProbe,layoutInvariant,pixelDifference,runCompositorDiagnostic}=require('./browser-sam-compositor-diagnostic.cjs');
function png(red=10){const c=createCanvas(2,2),ctx=c.getContext('2d');ctx.fillStyle='rgb(10,20,30)';ctx.fillRect(0,0,2,2);
  ctx.fillStyle=`rgb(${red},20,30)`;ctx.fillRect(0,0,1,1);return c.toBuffer('image/png');}
function directory(t){const output=fs.mkdtempSync(path.join(os.tmpdir(),'sam-compositor-test-'));
  t.after(()=>fs.rmSync(output,{recursive:true,force:true}));return output;}
function layout(style=null){return {clock:{now:1},viewport:{width:1280,height:720,dpr:1},nodes:[
  {selector:'#playerSprite',id:'playerSprite',inlineStyle:style,
    inlineDeclarations:style?[['will-change','transform','important']]:[],
    rect:{x:10.25,y:20.5,width:46,height:58},computed:{'will-change':style?'transform':'auto',transform:'matrix(1,0,0,1,0,4.06)'}},
  {selector:'#player',id:'player',inlineStyle:null,inlineDeclarations:[],rect:{x:10.25,y:16.44,width:46,height:58},computed:{transform:'none'}}]};}
function actor(style=null){return {clock:{now:1},canvas:{width:92,height:116,rgbaSha256:'same-original-source',rgbaFile:'actor.rgba',pngFile:'actor.png'},
  state:{direction:'up',walking:false,frame:0},player:{rect:{x:10.25,y:16.44,width:46,height:58}},
  sprite:{inlineStyle:style,rect:{x:10.25,y:20.5,width:46,height:58},computed:{'will-change':style?'transform':'auto',transform:'unchanged'}}};}

test('compositor helpers load without Playwright or eager raster dependencies',()=>{
  const filename=path.join(__dirname,'browser-sam-compositor-diagnostic.cjs'),localRequire=createRequire(filename),loaded={exports:{}};
  vm.runInNewContext(fs.readFileSync(filename,'utf8'),{module:loaded,exports:loaded.exports,
    require:request=>{assert.doesNotMatch(request,/playwright|canvas/);return localRequire(request);},Buffer},{filename});
  assert.equal(typeof loaded.exports.runCompositorDiagnostic,'function');
});
test('LayerTree maps backend nodes and parent layers; raw screenshot provenance keeps exact parameters',async()=>{
  const session=new EventEmitter(),calls=[];let detached=false;
  session.detach=async()=>{detached=true;};
  session.send=async(method,params)=>{
    calls.push({method,params});
    if(method==='LayerTree.enable')session.emit('LayerTree.layerTreeDidChange',{layers:[
      {layerId:'root'},{layerId:'player',parentLayerId:'root',backendNodeId:333},
      {layerId:'sprite',parentLayerId:'player',backendNodeId:222,transform:[1,0,0,1]}]});
    if(method==='DOM.getDocument')return {root:{nodeId:1}};
    if(method==='DOM.querySelector')return {nodeId:params.selector==='#playerSprite'?2:3};
    if(method==='DOM.describeNode')return {node:{backendNodeId:params.nodeId===2?222:333}};
    if(method==='LayerTree.compositingReasons')return {compositingReasons:['hint'],compositingReasonIds:['WillChangeTransform']};
    if(method==='Page.captureScreenshot')return {data:png().toString('base64')};
    return {};
  };
  const page={context:()=>({newCDPSession:async()=>session}),evaluate:async()=>layout()};
  const probe=await createCompositorProbe(page),snapshot=await probe.snapshot(),capture=await probe.capture();
  assert.equal(snapshot.nodes[0].backendNodeId,222);assert.equal(snapshot.tree.revision,1);
  assert.deepEqual(new Set(snapshot.reasons.map(r=>r.layerId)),new Set(['root','player','sprite']));
  assert.deepEqual(capture.provenance.params,CAPTURE_PARAMS);assert.equal(capture.provenance.method,'Page.captureScreenshot');
  assert.deepEqual(capture.bytes,png());
  assert.deepEqual(calls.find(c=>c.method==='Page.captureScreenshot').params,
    {format:'png',fromSurface:true,captureBeyondViewport:false});
  await probe.close();assert.equal(detached,true);assert.equal(session.listenerCount('LayerTree.layerTreeDidChange'),0);
});
test('layout guard permits only the intentional sprite will-change and detects ancestor drift',()=>{
  assert.deepEqual(layoutInvariant(layout()),layoutInvariant(layout('will-change: transform !important;')));
  const changed=layout();changed.nodes[1].rect.x++;
  assert.notDeepEqual(layoutInvariant(changed),layoutInvariant(layout()));
});
test('pixel comparison uses exact RGBA differences, without thresholds or masking',async()=>{
  const result=await pixelDifference(png(),png(11));
  assert.equal(result.changedPixels,1);assert.equal(result.channelAbsoluteError,1);
  assert.deepEqual(result.boundsExclusive,{x:0,y:0,right:1,bottom:1});
  assert.equal(result.pngByteIdentical,false);
});

function experiment(t,failAtPromotion=false){
  const output=directory(t);let style=null;const mutations=[],captures=[];
  const node={style:{setProperty:(name,value,priority)=>{assert.equal(name,'will-change');assert.equal(value,'transform');
    assert.equal(priority,'important');style='will-change: transform !important;';mutations.push('promote');}},
    removeAttribute:name=>{assert.equal(name,'style');style=null;mutations.push('restore');},
    setAttribute:(name,value)=>{assert.equal(name,'style');style=value;mutations.push('restore');}};
  const page={locator:selector=>{assert.equal(selector,'#playerSprite');return {
    getAttribute:async()=>style,evaluate:async(fn,value)=>fn(node,value)};}};
  const probe={snapshot:async()=>({layout:layout(style),tree:{revision:1,layers:[]}})};
  const capture=async(filename,rawCDP)=>{
    captures.push({filename,rawCDP});
    if(failAtPromotion&&style)throw Error('injected capture failure');
    const bytes=png(style?11:10),observation={before:actor(style),after:actor(style),
      presentationBefore:await probe.snapshot(),presentationAfter:await probe.snapshot()};
    fs.writeFileSync(path.join(output,filename),bytes);return {bytes,observation};
  };
  fs.writeFileSync(path.join(output,'retained-first.png'),png());
  return {args:{page,probe,capture,pipeline:async()=>({worldSource:'unchanged',x:197,y:92}),output,label:'baseline',retainedFirst:'retained-first.png'},
    captures,mutations,style:()=>style};
}
test('dedicated A-A-B-A uses one perturbation, fixed capture count and retains the first image',async t=>{
  const e=experiment(t),report=await runCompositorDiagnostic(e.args);
  assert.equal(report.status,'collected');assert.equal(e.captures.length,8);
  assert.deepEqual(e.captures.map(c=>c.rawCDP),[false,true,false,true,false,true,false,true]);
  assert.deepEqual(e.mutations,['promote','restore']);assert.equal(e.style(),null);
  assert.equal(report.stages.every(s=>s.invariantsPassed),true);assert.equal(report.inlineStyleRestored,true);
  assert.equal(report.comparisons.find(c=>c.api==='playwright'&&c.right==='promoted-b').changedPixels,1);
  assert.equal(report.comparisons.find(c=>c.api==='playwright'&&c.right==='restored-a').changedPixels,0);
  assert.deepEqual(fs.readFileSync(path.join(e.args.output,'retained-first.png')),png());
});
test('diagnostic capture failure restores style, preserves partial evidence, and never retries',async t=>{
  const e=experiment(t,true);
  await assert.rejects(runCompositorDiagnostic(e.args),/injected capture failure/);
  assert.equal(e.style(),null);assert.equal(e.captures.length,5);
  const report=JSON.parse(fs.readFileSync(path.join(e.args.output,'baseline-compositor-diagnostic.json'),'utf8'));
  assert.equal(report.status,'failed');assert.equal(report.inlineStyleRestored,true);assert.equal(report.stages.length,3);
  assert.deepEqual(fs.readFileSync(path.join(e.args.output,'retained-first.png')),png());
});
test('standard wrapper output and disposable-context early return are explicitly opt-in',()=>{
  const runner=fs.readFileSync(path.join(__dirname,'browser-sam-pixel-pilot.cjs'),'utf8');
  const wrapper=fs.readFileSync(path.join(__dirname,'browser-sam-pixel-pilot-evidence.cjs'),'utf8');
  assert.match(runner,/process\.env\.SAM_COMPOSITOR_DIAGNOSTIC==='1'/);
  assert.match(runner,/return result;\n    }\n    result\.controls=/);
  assert.match(wrapper,/compositorDiagnostic\?'browser-evidence-sam-compositor':'browser-evidence-sam-pixel-pilot'/);
  assert.match(wrapper,/if\(requireIdentical\)assert\.ok\(result\.pngByteIdentical/);
});
