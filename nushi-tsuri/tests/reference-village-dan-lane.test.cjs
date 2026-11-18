const {test}=require('node:test');
const assert=require('node:assert/strict');
const ref=require('../village-reference');
const {boot,seed,read}=require('./game-harness.cjs');

// Independent source-art coordinates from the reported screenshot: the dirt
// lane east of Dan's fish-race pools and west of the conifer/greengrocer.
// The former hedge polygon incorrectly covered x376 at y320 through y350.
test('Dan east lane follows the painted dirt without opening the hedge or pools',()=>{
 for(let px=370;px<=385;px+=3)for(let py=310;py<=400;py+=3)
  assert.equal(ref.walkable(...ref.point([px,py])),true,`clear dirt ${px},${py}`);
 for(const [px,py]of [[350,325],[350,350],[350,370],[420,345],[420,390],[170,380],[294,382],[500,220],[710,460]])
  assert.equal(ref.walkable(...ref.point([px,py])),false,`retained hedge/tree/pool/water ${px},${py}`);
});

test('repeated down and up touch inputs traverse Dan east lane without save/progress changes',()=>{
 const app=boot({...seed(),mapRegion:'village',soundEnabled:false},{},{url:'http://localhost/nushi-tsuri/?villageReference=1'}),w=app.window;
 try{
  const [x,y]=ref.point([376,310]);w.eval(`s.x=${x};s.y=${y};s.direction='down';render()`);
  const progress=()=>read(w,'Object.fromEntries(Object.entries(s).filter(([k])=>!["x","y","direction","log"].includes(k)))');
  const before=progress();
  const touch=d=>{const b=w.document.querySelector(`[data-move="${d}"]`);b.onpointerdown({preventDefault(){},currentTarget:b,pointerId:1});b.onpointerup();};
  for(let i=1;i<=4;i++){touch('down');assert.ok(Math.abs(read(w,'s.y')-(y+i*4))<1e-8);assert.equal(read(w,'s.x'),x);}
  for(let i=3;i>=0;i--){touch('up');assert.ok(Math.abs(read(w,'s.y')-(y+i*4))<1e-8);assert.equal(read(w,'s.x'),x);}
  assert.deepEqual(progress(),before);assert.deepEqual(app.errors,[]);
 }finally{app.dispose();}
});
