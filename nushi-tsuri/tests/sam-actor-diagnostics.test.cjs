// Offline unit tests only. Requiring the runner does not launch Chromium.
const {test}=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),os=require('node:os'),path=require('node:path');
const vm=require('node:vm');
const {createRequire}=require('node:module');
const {createHash}=require('node:crypto');
const {actorObservation,observedScreenshot}=require('./browser-sam-pixel-pilot.cjs');
const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
const sampled=(rgba=[17,18,19,255],now=100)=>({
  clock:{now,performanceNow:now/10,timelineTime:now/10},dpr:1,
  state:{avatar:'boy',direction:'up',walking:false,frame:0},
  player:{rect:{x:10.25,y:20.5,width:46,height:58},computed:{transform:'matrix(1, 0, 0, 1, -23, -58)'},animations:[]},
  sprite:{rect:{x:10.25,y:24.56,width:46,height:58},computed:{transform:'matrix(1, 0, 0, 1, 0, 4.06)'},animations:[]},
  canvas:{width:1,height:1,imageSmoothingEnabled:false},rgba,
  png:'data:image/png;base64,'+Buffer.from('source PNG fixture').toString('base64')
});
function directory(t) {
  const output=fs.mkdtempSync(path.join(os.tmpdir(),'sam-actor-observation-'));
  t.after(()=>fs.rmSync(output,{recursive:true,force:true}));return output;
}
test('loading diagnostic helpers never imports Playwright',()=>{
  const filename=path.join(__dirname,'browser-sam-pixel-pilot.cjs');
  const localRequire=createRequire(filename),loaded={exports:{}},imports=[];
  const guardedRequire=request=>{
    imports.push(request);
    if (/playwright/i.test(request))throw Error('Browser dependency forbidden in unit shard: '+request);
    return localRequire(request);
  };
  vm.runInNewContext(fs.readFileSync(filename,'utf8'),{
    require:guardedRequire,module:loaded,exports:loaded.exports,__filename:filename,__dirname,Buffer
  },{filename});
  assert.equal(typeof loaded.exports,'function');
  assert.equal(typeof loaded.exports.actorObservation,'function');
  assert.equal(typeof loaded.exports.observedScreenshot,'function');
  assert.equal(imports.some(request=>/playwright/i.test(request)),false);
});
test('actor observation retains exact RGBA bytes and separate presentation metadata',async t=>{
  const output=directory(t),sample=sampled(),page={evaluate:async()=>sample};
  const observation=await actorObservation(page,output,'original-before');
  const bytes=Buffer.from(sample.rgba);
  assert.deepEqual(fs.readFileSync(path.join(output,observation.canvas.rgbaFile)),bytes);
  assert.equal(observation.canvas.rgbaSha256,hash(bytes));assert.equal(observation.canvas.rgbaBytes,4);
  assert.equal(fs.readFileSync(path.join(output,observation.canvas.pngFile)).toString(),'source PNG fixture');
  assert.deepEqual(observation.player,sample.player);assert.deepEqual(observation.sprite,sample.sprite);
  assert.equal(observation.rgba,undefined);assert.equal(observation.png,undefined);
});
test('browser observation reads both elements and preserves infinite animation timing',async t=>{
  const output=directory(t),source=sampled(),rgba=new Uint8ClampedArray(source.rgba);
  const animation={constructor:{name:'CSSAnimation'},animationName:'player-step',playState:'paused',pending:false,
    currentTime:0,startTime:null,playbackRate:1,effect:{getTiming:()=>({iterations:Infinity}),
      getComputedTiming:()=>({endTime:Infinity,currentIteration:0})}};
  const element=(id,description)=>({id,className:id==='player'?'player boy face-up':'player-sprite',
    getAttribute:()=>null,getBoundingClientRect:()=>description.rect,
    getAnimations:()=>id==='player'?[animation]:[],description});
  const player=element('player',source.player),canvas=Object.assign(element('playerSprite',source.sprite),{
    width:1,height:1,getContext:()=>({imageSmoothingEnabled:false,getImageData:()=>({data:rgba})}),
    toDataURL:()=>source.png});
  const globals={document:{querySelector:q=>q==='#player'?player:canvas,timeline:{currentTime:100}},
    performance:{now:()=>100},devicePixelRatio:1,s:{avatar:'boy',direction:'up'},playerWalking:false,playerAnimFrame:0,
    getComputedStyle:node=>({getPropertyValue:key=>node.description.computed[key]||''})};
  const observation=await actorObservation({evaluate:async read=>vm.runInNewContext(`(${read.toString()})()`,globals)},output,'read-only');
  assert.equal(observation.player.rect.x,10.25);assert.equal(observation.sprite.rect.y,24.56);
  assert.equal(observation.player.animations[0].timing.iterations,'Infinity');
  assert.equal(observation.player.animations[0].computedTiming.endTime,'Infinity');
  assert.equal(observation.player.animations[0].currentTime,0);
  assert.deepEqual(Array.from(rgba),source.rgba,'readback leaves source bytes untouched');
});
test('first and no-op captures remain distinct and preserve actor mismatch evidence',async t=>{
  const output=directory(t),observations=[],samples=[sampled(),sampled(undefined,101),sampled(),sampled([18,18,19,255])];
  const screenshots=[Buffer.from('first screenshot'),Buffer.from('different no-op')];let writes=0;
  const page={evaluate:async()=>samples.shift(),screenshot:async options=>{
    assert.equal(options.animations,'allow');assert.equal(options.scale,'device');
    const bytes=screenshots.shift();fs.writeFileSync(options.path,bytes);return bytes;
  }};
  const first=await observedScreenshot(page,output,'original.png',observations,()=>writes++);
  const noop=await observedScreenshot(page,output,'noop.png',observations,()=>writes++);
  assert.equal(first.equals(noop),false);assert.equal(writes,2);
  assert.equal(fs.readFileSync(path.join(output,'original.png')).toString(),'first screenshot');
  assert.equal(observations[0].actorCanvasUnchanged,true,'clock changes are diagnostic only');
  assert.equal(observations[0].actorStateUnchanged,true);
  assert.equal(observations[1].actorCanvasUnchanged,false,'source mismatch is retained, not normalized');
  assert.notEqual(observations[1].before.canvas.rgbaFile,observations[1].after.canvas.rgbaFile);
  assert.equal(observations[0].pngSha256,hash(first));
  assert.deepEqual(observations.map(o=>o.filename),['original.png','noop.png']);
});
test('partial capture metadata is persisted even when screenshot fails',async t=>{
  const output=directory(t),observations=[];let persisted=false;
  const page={evaluate:async()=>sampled(),screenshot:async()=>{throw Error('capture failed');}};
  await assert.rejects(observedScreenshot(page,output,'failed.png',observations,()=>{persisted=true;}),/capture failed/);
  assert.equal(persisted,true);assert.ok(observations[0].before.canvas.rgbaSha256);
  assert.match(observations[0].failure,/capture failed/);
  assert.ok(fs.existsSync(path.join(output,'failed-before-actor.rgba')));
});
test('opt-in raw CDP capture records provenance and presentation without calling Playwright screenshot',async t=>{
  const output=directory(t),observations=[],bytes=Buffer.from('raw CDP screenshot');let snapshots=0;
  const page={evaluate:async()=>sampled(),screenshot:async()=>{throw Error('wrong capture API');}};
  const probe={snapshot:async()=>({revision:++snapshots}),capture:async()=>({bytes,
    provenance:{method:'Page.captureScreenshot',params:{format:'png',fromSurface:true,captureBeyondViewport:false}}})};
  const result=await observedScreenshot(page,output,'cdp.png',observations,()=>{}, {probe,rawCDP:true});
  assert.deepEqual(result,bytes);assert.deepEqual(fs.readFileSync(path.join(output,'cdp.png')),bytes);
  assert.equal(observations[0].captureProvenance.method,'Page.captureScreenshot');
  assert.equal(observations[0].presentationBefore.revision,1);assert.equal(observations[0].presentationAfter.revision,2);
});
test('legacy strict assertions and original settling waits remain in place',()=>{
  const source=fs.readFileSync(path.join(__dirname,'browser-sam-pixel-pilot.cjs'),'utf8');
  assert.match(source,/await page\.clock\.runFor\(700\);await page\.waitForTimeout\(700\)/);
  assert.match(source,/assert\.deepEqual\(restored,original,'removing the test CSS restores the exact original pipeline'\)/);
  assert.match(source,/assert\.deepEqual\(repeat,fs\.readFileSync\(path\.join\(output,filename\)\),'pixelated repeat is byte-identical after experiments'\)/);
  assert.match(source,/assert\.ok\(shot\.noOp\.pngByteIdentical/);
  const evidence=fs.readFileSync(path.join(__dirname,'browser-sam-pixel-pilot-evidence.cjs'),'utf8');
  assert.match(evidence,/if\(requireIdentical\)assert\.ok\(result\.pngByteIdentical/);
});
