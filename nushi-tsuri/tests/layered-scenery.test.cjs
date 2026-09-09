const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const {createCanvas,loadImage}=require('@napi-rs/canvas');
const Art=require('../layered-scenery.js'),Data=require('../scene-layers.js');
const {boot}=require('./game-harness.cjs');
const root=path.join(__dirname,'..');
const env={season:'spring',period:'day'};
const bytes=c=>c.getContext('2d').getImageData(0,0,c.width,c.height).data;
const hash=c=>crypto.createHash('sha256').update(bytes(c)).digest('hex');
const canvasFor=image=>{const c=createCanvas(image.width,image.height);c.getContext('2d').drawImage(image,0,0);return c;};
const load=async(id,e=env)=>{
  const definition=Data.get(id,e);
  const source=await loadImage(path.join(root,definition.source));
  const underlay=definition.underlay?await loadImage(path.join(root,definition.underlay)):null;
  return {source,scene:Art.prepare(source,underlay,definition,e,createCanvas)};
};

test('the detailed world and v160 home masters reassemble with zero changed pixels at native resolution',async()=>{
  for(const id of ['world','home-exterior','home-interior']) {
    const {source,scene}=await load(id),c=createCanvas(scene.width,scene.height),overlay=createCanvas(scene.width,scene.height);
    assert.ok(scene.width>=1536&&scene.height>=864,'never downsample the master to the former 640/960 canvas');
    Art.compose(c,scene,{patches:false});assert.equal(hash(c),hash(canvasFor(source)),id+' must keep every original pixel');
    const expected=hash(c);
    Art.compose(c,scene,{staticOnly:true,patches:false,excludeForeground:true});Art.motion(overlay,scene,0);c.getContext('2d').drawImage(overlay,0,0);
    Art.foreground(overlay,scene);c.getContext('2d').drawImage(overlay,0,0);
    assert.equal(hash(c),expected,'separate static/motion canvases have no mask seams or duplicate pixels');
    assert.ok(scene.parts.length>=20);
    const kinds=new Set(scene.parts.map(p=>p.kind));
    assert.ok(kinds.has('ground')&&kinds.has('water')&&kinds.has('props'));
  }
});

test('removing or moving a part exposes a clean underlay, including attached cottage props and tank glass',async()=>{
  for(const [id,partId,point,child] of [
    ['world','farmhouse',[242,133],null],
    ['home-exterior','cottage',[724,424],'rods-and-bucket'],
    ['home-interior','table',[757,381],null],
    ['home-interior','tank-cabinet',[1437,503],'tank-water'],
  ]) {
    const {scene}=await load(id),c=createCanvas(scene.width,scene.height),[x,y]=point;
    const sample=(canvas,x,y)=>[...canvas.getContext('2d').getImageData(x,y,1,1).data];
    const before=sample(Art.compose(c,scene),x,y);
    Art.compose(c,scene,{transforms:{[partId]:{hidden:true}}});
    assert.deepEqual(sample(c,x,y),sample(scene.underlay,x,y),partId+' cannot remain baked into the ground');
    assert.notDeepEqual(sample(c,x,y),before);
    if(child)assert.equal(scene.parts.find(p=>p.id===child).parent,partId,'attached art has an explicit parent');
    Art.compose(c,scene,{transforms:{[partId]:{x:5,y:3}}});
    assert.deepEqual(sample(c,x+5,y+3),before,'the original detailed part is movable without redrawing it');
  }
});

test('water highlights stay inside water; gentle crown motion leaves the trunk planted and static art untouched',async()=>{
  const {scene}=await load('world'),base=createCanvas(scene.width,scene.height),overlay=createCanvas(scene.width,scene.height);
  Art.compose(base,scene,{staticOnly:true});const before=hash(base);
  const descriptors=[{id:'ground'},...scene.definition.parts];
  const output=createCanvas(scene.width,scene.height),ctx=output.getContext('2d');
  Art.motion(overlay,scene,0);ctx.drawImage(base,0,0);ctx.drawImage(overlay,0,0);const still=bytes(output);
  for(const time of [800,2600,6700]) {
    Art.motion(overlay,scene,time);ctx.clearRect(0,0,output.width,output.height);ctx.drawImage(base,0,0);ctx.drawImage(overlay,0,0);
    const moving=bytes(output);let changed=0;
    for(let y=0;y<scene.height;y++)for(let x=0;x<scene.width;x++) {
      const n=y*scene.width+x,k=n*4;
      if(moving[k]===still[k]&&moving[k+1]===still[k+1]&&moving[k+2]===still[k+2])continue;
      changed++;
      const owners=[n-1,n,n+1].filter(n=>n>=0&&n<scene.labels.length).map(n=>descriptors[scene.labels[n]]);
      assert.ok(owners.some(p=>p.motion||p.effect),'animation cannot touch paths, roofs, fences or arbitrary land');
    }
    assert.ok(changed>100&&changed<scene.width*scene.height*.04,'subtle local motion, not a whole-background wobble');
    for(const part of scene.parts.filter(p=>p.motion)) {
      const lastRows=overlay.getContext('2d').getImageData(part.left,part.bottom-8,part.canvas.width,8).data;
      const original=part.canvas.getContext('2d').getImageData(0,part.canvas.height-8,part.canvas.width,8).data;
      assert.deepEqual(lastRows,original,part.id+' keeps its foot planted');
    }
    assert.equal(hash(base),before,'no full static repaint during animation');
  }
  Art.motion(overlay,scene,1200,{reducedMotion:true});const reduced=hash(overlay);
  Art.motion(overlay,scene,0);assert.equal(hash(overlay),reduced);
});

test('every active location uses a present detailed master and the four seasons/five periods keep their shading',async()=>{
  const sw=fs.readFileSync(path.join(root,'sw.js'),'utf8');
  for(const asset of Data.assets()){assert.ok(fs.existsSync(path.join(root,asset)),asset);assert.ok(sw.includes('./'+asset),asset+' cached offline');}
  for(const id of Data.ids) {
    const variants=new Set();
    for(const season of ['spring','summer','autumn','winter'])for(const period of ['dawn','morning','day','evening','night']) {
      const e={season,period},d=Data.get(id,e),image=await loadImage(path.join(root,d.source));
      // Native fidelity is tested above. Small QA canvases make this 480-scene
      // clock/asset matrix inexpensive; the game itself always uses the master.
      const small=createCanvas(160,90);small.getContext('2d').drawImage(image,0,0,160,90);
      const scene=Art.prepare(small,null,d,e,createCanvas),c=createCanvas(160,90);Art.compose(c,scene,{patches:false});
      variants.add(hash(c));
      const colors=new Set(),sourceColors=new Set();const rgba=bytes(c),original=bytes(small);
      for(let i=0;i<rgba.length;i+=16){colors.add((rgba[i]<<16)|(rgba[i+1]<<8)|rgba[i+2]);sourceColors.add((original[i]<<16)|(original[i+1]<<8)|original[i+2]);}
      assert.ok(colors.size>=sourceColors.size*.4,`${id}/${season}/${period}: preserve the master's tonal detail`);
      if(season==='spring'&&period==='day')assert.equal(hash(c),hash(small),id+' retains the exact master');
    }
    assert.equal(variants.size,20,id+' follows all season/time combinations');
  }
});

const nextTurn=()=>new Promise(resolve=>setImmediate(resolve));
const solid=color=>{const c=createCanvas(160,90);const x=c.getContext('2d');x.fillStyle=color;x.fillRect(0,0,160,90);return c;};
test('late scene decodes cannot overwrite a new room; animation suspends, resumes, and caches stay bounded',async()=>{
  const pending=new Map(),frames=new Map(),overlays=new Map();let sequence=0,time=0,hidden=false,automatic=false;
  const canvas=solid('#20382a');canvas.live=true;canvas.style={};
  const controller=Art.createController({
    canvasFactory:createCanvas,
    loadImage:url=>automatic?Promise.resolve(solid('#477856')):new Promise(resolve=>pending.set(url,resolve)),
    requestFrame:fn=>{frames.set(++sequence,fn);return sequence;},cancelFrame:id=>frames.delete(id),
    now:()=>time,isHidden:()=>hidden,visible:c=>c.live,reducedMotion:()=>false,
    createMotionCanvas:c=>{const o=createCanvas(c.width,c.height);o.dataset={};o.remove=()=>overlays.delete(c);overlays.set(c,o);return o;},
    onError:error=>assert.fail(error.message),
  });
  try {
    const old=controller.paint(canvas,'home-exterior',env),latest=controller.paint(canvas,'home-interior',env);await nextTurn();
    const finish=(id,color)=>{const d=Data.get(id);for(const url of [d.source,d.underlay])pending.get(url)(solid(color));};
    finish('home-interior','#bb873d');assert.equal(await latest,true);const expected=hash(canvas);
    finish('home-exterior','#238cff');assert.equal(await old,false);assert.equal(hash(canvas),expected);
    assert.equal(overlays.get(canvas).dataset.scene,'home-interior');
    automatic=true;await controller.paint(canvas,'world',env);
    assert.equal(frames.size,1,'one shared scenery loop');
    for(let i=0;i<3;i++){time+=100;const callbacks=[...frames.values()];frames.clear();callbacks.forEach(fn=>fn(time));assert.equal(frames.size,1);}
    hidden=true;controller.stop();assert.equal(frames.size,0);controller.wake();assert.equal(frames.size,0);
    hidden=false;controller.wake();assert.equal(frames.size,1);
    for(const id of Data.ids)await controller.paint(canvas,id,env);
    assert.ok(controller.stats().prepared<=3);assert.ok(controller.stats().images<=6);
    assert.equal(controller.stats().sessions,1);
    await controller.paint(canvas,'world',env);
    canvas.live=false;time+=100;const callbacks=[...frames.values()];frames.clear();callbacks.forEach(fn=>fn(time));assert.equal(frames.size,0);
    canvas.live=true;controller.refresh(canvas);assert.equal(frames.size,1);
  }finally{controller.dispose();}
  assert.equal(frames.size,0);assert.equal(overlays.size,0);
});

test('restored tree trunks are solid while former simplified-tree positions no longer form invisible obstacles',()=>{
  const app=boot(),w=app.window;
  try {
    for(const [x,y] of [[416,223],[420,345],[543,568],[1112,214]])assert.equal(w.eval(`isWalkableWorld(${x/6.4},${y/6.4})`),false);
    for(const [x,y] of [[59,59],[60,96],[86,94],[171,14]])assert.equal(w.eval(`ShuSceneLayers.propSolid(${x},${y})`),false);
    assert.deepEqual(app.errors,[]);
  }finally{app.dispose();}
});
