const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const {execFileSync}=require('node:child_process');
const Sound=require('../soundscape.js');
const {boot,read,seed}=require('./game-harness.cjs');
const next=()=>new Promise(resolve=>setImmediate(resolve));

function audioContext(){
  const sources=[];
  const param=()=>({value:0,setValueAtTime(v){this.value=v;},linearRampToValueAtTime(v){this.value=v;},cancelScheduledValues(){},cancelAndHoldAtTime(){}});
  return {state:'running',currentTime:12,sources,
    createGain:()=>({gain:param(),connect(){},disconnect(){this.disconnected=true;}}),
    createBufferSource(){const source={connect(){},disconnect(){this.disconnected=true;},start(time,offset){this.startTime=time;this.offset=offset;},stop(time){this.stopTime=time;},finish(){this.onended?.();}};sources.push(source);return source;},
  };
}

test('four seasonal map tracks and eight places route independently; every fishing phase excludes music',()=>{
  const base={active:true};
  for(const season of ['spring','summer','autumn','winter'])assert.equal(Sound.selectScene({...base,season}).music,'map-'+season);
  for(const [property,value,expected] of [['home',true,'home'],['store',true,'sam'],['boats',true,'boats'],['shrine',true,'shrine'],
    ['location','main-shrine','shrine'],['location','farmhouse','inn'],['location','yaoya','yaoya'],['location','diner','diner'],['location','fish-market','fish-market'],['location','home-kitchen','home']])
    assert.equal(Sound.selectScene({...base,[property]:value}).music,expected);
  for(const phase of ['prep','cast','cast-flight','wait','bite','fight','catch'])for(const zone of ['lake','river','sea']) {
    const scene=Sound.selectScene({...base,fishing:true,phase,zone,locale:'harbor',store:true,home:true});
    assert.equal(scene.music,null,'fishing takes precedence even while a tackle menu is open');
    if(phase==='fight'||phase==='catch'||zone==='river')assert.equal(scene.birds,null);
  }
  assert.equal(Sound.selectScene({...base,fishing:true,phase:'prep',zone:'sea',locale:'beach'}).birds,null);
  assert.equal(Sound.selectScene({...base,fishing:true,phase:'prep',zone:'sea',locale:'harbor'}).birds,'harborBirds');
  assert.equal(Sound.selectScene({...base,fishing:true,phase:'prep',zone:'lake'}).birds,'lakeBirds');
  assert.equal(Sound.selectScene({active:false,home:true}).music,null);
});

test('slow music downloads cannot play over the next room or a cast; cache stays bounded',async()=>{
  const requests=new Map(),context=audioContext();
  const player=Sound.createMusicPlayer({load:(_c,url)=>new Promise(resolve=>requests.set(url,resolve))});
  const first=player.set('map-spring',context,{});await next();
  const second=player.set('sam',context,{});await next();
  player.stop();
  requests.get(Sound.tracks.sam.src)({duration:50});assert.equal(await second,false);
  requests.get(Sound.tracks['map-spring'].src)({duration:50});assert.equal(await first,false);
  assert.equal(context.sources.length,0,'no late source is created after entering the fishing scene');
  assert.equal(await player.set('sam',context,{}),true);
  for(const id of ['home','inn','shrine']) {
    const pending=player.set(id,context,{});await next();requests.get(Sound.tracks[id].src)({duration:80});await pending;
    for(const source of context.sources)if(source.stopTime!==undefined)source.finish();
  }
  assert.equal(player.stats().playing,'shrine');assert.ok(player.stats().cached<=2);
  player.dispose();for(const source of context.sources)source.finish();
  assert.equal(player.stats().tails,0);assert.ok(context.sources.every(s=>s.disconnected));
});

test('repeated renders keep one loop; returning to a place resumes it, with a bounded fade and exact score loop end',async()=>{
  const context=audioContext(),player=Sound.createMusicPlayer({load:async()=>({duration:90})});
  await player.set('map-summer',context,{});
  for(let i=0;i<25;i++)await player.set('map-summer',context,{});
  assert.equal(context.sources.length,1);assert.equal(context.sources[0].loopEnd,40);
  context.currentTime+=9.25;player.stop(.1);
  assert.ok(context.sources[0].stopTime-context.currentTime<=.12);
  context.sources[0].finish();
  await player.set('home',context,{});context.currentTime+=3;
  await player.set('map-summer',context,{});
  assert.equal(context.sources.at(-1).offset,9.25);
  player.dispose();
});

test('suspended or muted playback makes no request; decode failures can recover without a retry storm',async()=>{
  const context=audioContext();let calls=0,time=1000;
  const player=Sound.createMusicPlayer({now:()=>time,load:async()=>{calls++;if(calls===1)throw Error('offline');return {duration:60};}});
  context.state='suspended';assert.equal(await player.set('home',context,{}),false);assert.equal(calls,0);
  context.state='running';assert.equal(await player.set('home',context,{}),false);
  for(let i=0;i<10;i++)await player.set('home',context,{});assert.equal(calls,1);
  time+=10001;assert.equal(await player.set('home',context,{}),true);assert.equal(calls,2);
  player.stop(.02);assert.equal(player.stats().playing,null);
  await player.set(null,context,{});assert.equal(calls,2);player.dispose();
});

test('real game scene transitions select music, retain menu context, and stop birds for river, beach and underwater',()=>{
  const app=boot(),w=app.window;
  try {
    w.eval('backgroundMusic.set = id => { window.selectedMusic = id; return Promise.resolve(true); }; backgroundMusic.stop = () => { window.selectedMusic=null; }; gameAudio.unlocked=true');
    w.render();assert.equal(w.selectedMusic,'map-spring');
    w.open('record');assert.equal(w.selectedMusic,'map-spring');w.close();
    for(const [room,expected] of [['farmhouse','inn'],['yaoya','yaoya'],['diner','diner'],['fish-market','fish-market'],['main-shrine','shrine']]){
      w.openLocationInterior(room);assert.equal(w.selectedMusic,expected);w.close();
    }
    w.open('store');assert.equal(w.selectedMusic,'sam');w.close();
    w.openVehicleShop();assert.equal(w.selectedMusic,'boats');w.close();
    w.eval("playerHomeState.area='interior'");w.renderPlayerHome();assert.equal(w.selectedMusic,'home');
    w.eval("playerHomeState.area=null;s.gameMinutes=30*1440+360");w.render();assert.equal(w.selectedMusic,'map-summer');
    w.openPracticePond();assert.equal(w.selectedMusic,null);assert.equal(w.gameAudioSampleIsPlaying('lakeBirds'),true);
    for(const [zone,locale,wanted] of [['sea','harbor','harborBirds'],['sea','beach',null],['river',null,null],['lake',null,'lakeBirds']]){
      w.eval(`battle.waterZone=${JSON.stringify(zone)};battle.castLocale=${JSON.stringify(locale)};battle.phase='prep'`);
      w.syncExpectedLoopAudio();assert.equal(w.selectedMusic,null);
      for(const id of ['lakeBirds','harborBirds'])assert.equal(w.gameAudioSampleIsPlaying(id),id===wanted);
    }
    w.eval("battle.phase='fight'");w.syncExpectedLoopAudio();assert.equal(w.selectedMusic,null);assert.equal(w.gameAudioSampleIsPlaying('lakeBirds'),false);
    w.endBattle();assert.equal(w.selectedMusic,'map-summer');
    w.setSoundEnabled(false);w.syncSceneSound();assert.equal(w.selectedMusic,null);
    assert.deepEqual(app.errors,[]);
  }finally{app.dispose();}
});

test('all twelve different original scores and two wildlife loops decode fully and are cached offline',()=>{
  const root=path.join(__dirname,'..'),sw=fs.readFileSync(path.join(root,'sw.js'),'utf8');
  const hashes=new Set();
  for(const [id,track] of Object.entries(Sound.tracks)) {
    const file=path.join(root,track.src);hashes.add(crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex'));
    assert.ok(sw.includes('./'+track.src));
    const decoded=execFileSync('ffmpeg',['-v','error','-i',file,'-f','f32le','-ac','1','-ar','8000','pipe:1'],{maxBuffer:4*1024*1024});
    const count=decoded.length/4;assert.ok(Math.abs(count/8000-track.duration)<.12,id+' is a complete loop');
    let sum=0,peak=0;for(let i=0;i<count;i++){const v=decoded.readFloatLE(i*4);sum+=v*v;peak=Math.max(peak,Math.abs(v));}
    assert.ok(peak>.12&&peak<.98,id+' avoids silence and clipping');assert.ok(Math.sqrt(sum/count)>.035,id+' remains audible');
  }
  assert.equal(hashes.size,12,'each place/season has its own composition');
  for(const kind of ['lake','harbor']) {
    const src=`assets/audio/music-v170/${kind}-birds.mp3`;
    const decoded=execFileSync('ffmpeg',['-v','error','-i',path.join(root,src),'-f','f32le','-ac','1','-ar','8000','pipe:1'],{maxBuffer:2*1024*1024});
    assert.ok(Math.abs(decoded.length/4/8000-48)<.1);assert.ok(sw.includes('./'+src));
  }
  for(const module of ['music-tracks','soundscape'])assert.ok(sw.includes(`./${module}.js?v=170-1`));
});
