const {test}=require('node:test'),assert=require('node:assert/strict'),path=require('node:path');
const {createCanvas,loadImage}=require('@napi-rs/canvas');
const P=require('../nushi-presentation.js'),F=require('../fishing-duel.js'),Art=require('../fish-art.js'),Camera=require('../underwater-camera.js');
const {boot,seed,read}=require('./game-harness.cjs');

test('open water covers both phone and desktop screens and scrolls in both directions without holes',async()=>{
 const image=await loadImage(path.join(__dirname,'..',P.background));assert.ok(image.width/image.height>2.9);
 for(const [width,height]of [[1280,640],[820,288],[320,640]]){
  const canvas=createCanvas(width,height),ctx=canvas.getContext('2d');let first;
  for(const offset of [-1002.01,-2,-.001,0,.001,2,1002.01]){
   assert.equal(P.paintWater(canvas,image,offset,{zone:'river'}),true);
   const pixels=Buffer.from(ctx.getImageData(0,0,width,height).data);
   for(let i=3;i<pixels.length;i+=4)if(pixels[i]!==255)assert.fail('transparent hole at '+i);
   if(offset===0)first=pixels;if(offset===2)assert.notDeepEqual(pixels,first);
  }
  P.paintWater(canvas,image,1,{reduced:true});const still=Buffer.from(ctx.getImageData(0,0,width,height).data);
  P.paintWater(canvas,image,10,{reduced:true});assert.deepEqual(Buffer.from(ctx.getImageData(0,0,width,height).data),still);
 }
});

test('resistance uses uneven head sweeps and a counter-bending rear, with a readable static reduced-motion yaw',()=>{
 for(const id of Object.keys(F.fishStrength)){
  const p=F.rhythm(id),poses=Array.from({length:45},(_,i)=>P.resistance(i*32,p));
  assert.ok(Math.max(...poses.map(x=>x.frame))-Math.min(...poses.map(x=>x.frame))>1.2,id);
  assert.ok(poses.every(x=>x.angle*x.bend<=0&&x.frame>=0&&x.frame<2));
  assert.deepEqual(P.resistance(200,p,-1,true),P.resistance(600,p,-1,true));
 }
});

test('counter-bend changes the body raster without moving its authored lip or clipping fish',async()=>{
 for(const id of ['himemasu','namazu','hirame','starNushi']){
  const images=new Map();for(const asset of Art.assets(id))images.set(asset,await loadImage(path.join(__dirname,'..',asset)));
  const canvas=createCanvas(448,224),ctx=canvas.getContext('2d'),image=images.get(Art.species[id].asset),frame=1.3;
  const pose=Art.pose(id,7,frame),headX=Math.round(pose.target[0]*448),headY=Math.round(pose.target[1]*224),renders=[];
  for(const bend of [-1.2,1.2]){
   Art.draw(ctx,image,id,7,frame,src=>images.get(src),{resistanceBend:bend});
   const data=Buffer.from(ctx.getImageData(0,0,448,224).data);renders.push(data);
   for(let x=0;x<448;x++)assert.ok(data[x*4+3]<30&&data[((223*448)+x)*4+3]<30,id+' keeps its fins and tail');
   assert.ok(ctx.getImageData(headX-3,headY-3,7,7).data.some((v,i)=>i%4===3&&v>80),id+' lip remains in the hook area');
  }
  assert.notDeepEqual(renders[0],renders[1],id+' bends visibly');
 }
});

test('camera follows an energetic escape for several seconds; delayed ticks cannot skip it or reset parallax',()=>{
 const escape=P.createEscape(1000,{x:91,y:61,facing:-1});let pose=P.advanceEscape(escape,61000);
 assert.equal(pose.elapsed,120);assert.equal(pose.done,false);
 const xs=[],speeds=[];for(let i=1;i<=35;i++){
  pose=P.advanceEscape(escape,61000+i*120);xs.push(pose.x);speeds.push(pose.speed);
  if(pose.elapsed>=600&&pose.elapsed<3300){assert.equal(pose.caption,'魚は元気よく泳いで行った');assert.ok(pose.x>60&&pose.x<86);}
 }
 assert.equal(pose.done,true);assert.ok(xs.at(-1)>100);assert.ok(Math.max(...speeds)-Math.min(...speeds)>1);
 const camera=Camera.create(0);camera.offset=999.99;Camera.advance(camera,.024,120);assert.ok(camera.offset>1000);
});

function audio(){
 const sources=[],gains=[];const param=()=>({setValueAtTime(){},exponentialRampToValueAtTime(){}});
 const context={state:'running',currentTime:20,
  createOscillator(){const source={frequency:param(),connect(){},disconnect(){this.disconnected=true;},start(at){this.at=at;},stop(at){this.end=at;}};sources.push(source);return source;},
  createGain(){const gain={gain:param(),connect(){},disconnect(){this.disconnected=true;}};gains.push(gain);return gain;}};
 return {context,destination:{},sources,gains};
}
test('original jingle schedules one short score, cancels every voice, and resumes only its remaining notes',()=>{
 const a=audio(),player=P.createJingle({audio:()=>a});assert.equal(player.play(),true);
 assert.equal(a.sources.length,P.score.length);assert.equal(player.stats().sessions,1);assert.ok(a.sources.every(s=>s.at>=20&&s.end<=22.7));
 player.stop();assert.equal(player.stats().voices,0);assert.ok([...a.sources,...a.gains].every(s=>s.disconnected));
 const count=a.sources.length;assert.equal(player.play(1800),true);assert.ok(a.sources.length-count<P.score.length);
 player.stop();a.context.state='suspended';assert.equal(player.play(),false);assert.equal(player.stats().voices,0);
 a.context.state='running';assert.equal(player.play(2800),false);assert.equal(player.stats().voices,0);
});

function fixture(mode='nushi'){
 const app=boot({...seed(),hp:100,soundEnabled:false,fightMode:mode,ownedRods:['tideMaster'],selectedRod:'tideMaster'}),w=app.window;
 w.eval('cast();beginFishing();battle.cast=50;launchSurfaceCast();settleSurfaceCast();var testNow=10000;Date.now=()=>testNow;startFight();clearInterval(timer);stopBattleFishArt();releaseBattleAction();');return app;
}
test('actual line break preserves the fish for a chase, blocks rewards and inputs, freezes on pause, and cleans up once',()=>{
 const app=fixture(),w=app.window;
 try{
  const before=read(w,'({caught:s.caught,money:s.money,baits:s.baits,lures:s.lures,time:s.gameMinutes,specimen:battle.specimen,id:battle.f.id})');
  w.eval('var fightTick;setInterval=fn=>(fightTick=fn,9001);battleTick();battle.ten=110;testNow+=120;fightTick();stopBattleFishArt()');
  assert.equal(read(w,'battle.phase'),'escape');assert.equal(w.document.querySelector('#linePath').getAttribute('d'),'');
  assert.equal(w.document.querySelector('#fishEscapeCaption').hidden,false);assert.equal(w.document.querySelector('#pull').parentElement.inert,true);
  w.pull();w.wait();w.caught();assert.equal(read(w,'battle.phase'),'escape');
  w.eval('for(var i=0;i<10;i++){testNow+=120;fightTick()}');
  assert.equal(w.document.querySelector('#fishEscapeCaption').textContent,'魚は元気よく泳いで行った');
  assert.equal(read(w,'battle.f.id'),before.id);assert.deepEqual(read(w,'battle.specimen'),before.specimen);assert.ok(read(w,'battle.underwaterCamera.offset')>0);
  const elapsed=read(w,'battle.fishEscape.elapsed'),camera=read(w,'battle.underwaterCamera.offset');
  w.eval('pauseBattle();testNow+=60000;fightTick();resumeBattle()');
  assert.equal(read(w,'battle.fishEscape.elapsed'),elapsed);assert.equal(read(w,'battle.underwaterCamera.offset'),camera);
  w.eval('for(var i=0;i<40&&battle;i++){testNow+=120;fightTick()}');assert.equal(read(w,'battle'),null);
  assert.equal(w.document.querySelector('#fishEscapeCaption').hidden,true);assert.equal(w.document.querySelector('#pull').parentElement.inert,false);
  assert.equal(w.document.querySelector('#fishScene').classList.contains('line-broken'),false);assert.equal(read(w,'fishEscapeJingle.stats().voices'),0);
  const after=read(w,'({caught:s.caught,money:s.money,baits:s.baits,lures:s.lures,time:s.gameMinutes})');
  const {specimen,id,...expected}=before;assert.deepEqual(after,expected);assert.equal(read(w,'s.log.filter(t=>t==="魚は元気よく泳いで行った").length'),1);assert.deepEqual(app.errors,[]);
 }finally{app.dispose();}
});

test('gauge line breaks and early hook misses keep their existing ending',()=>{
 const app=fixture('gauge'),w=app.window;
 try{w.breakFishingLine('糸が切れた……');assert.equal(read(w,'battle'),null);assert.equal(w.document.querySelector('#fishEscapeCaption').hidden,true);assert.deepEqual(app.errors,[]);}
 finally{app.dispose();}
 const other=fixture();try{other.window.lose('早合わせで逃げられた');assert.equal(read(other.window,'battle'),null);assert.equal(other.window.document.querySelector('#fishEscapeCaption').hidden,true);}finally{other.dispose();}
});
