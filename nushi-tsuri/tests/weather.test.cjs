const {test} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs'), path = require('node:path');
const {createCanvas, loadImage} = require('@napi-rs/canvas');
const Weather = require('../weather.js'), Art = require('../layered-scenery.js'), Data = require('../scene-layers.js');
const {boot, seed, read, saveKey} = require('./game-harness.cjs');
const root = path.join(__dirname, '..');
const bytes = canvas => require('node:crypto').createHash('sha256').update(canvas.getContext('2d').getImageData(0, 0, canvas.width, canvas.height).data).digest('hex');

test('weather stays fixed for each saved calendar day and changes at midnight, including season/year boundaries', () => {
  const counts = {sunny:0, cloudy:0, rain:0};
  for(let day=0;day<720;day++) {
    const expected=Weather.forecast(day*1440);
    for(const minute of [0,359,720,1439]) assert.equal(Weather.forecast(day*1440+minute),expected);
    counts[expected.id]++;
  }
  for(const value of Object.values(counts))assert.ok(value>80);
  assert.equal(Weather.forecast(1439).id,'sunny');
  assert.equal(Weather.forecast(1440).id,'cloudy');
  assert.equal(Weather.forecast(2880).id,'rain');
  for(const value of [NaN,Infinity,-20])assert.equal(Weather.forecast(value).id,'sunny');
  for(const weather of Object.values(Weather.types))for(const multiplier of Object.values(weather.fish))
    assert.ok(multiplier>=1&&multiplier<=1.18,'weather is a small bonus');
  assert.equal(Weather.fishMultiplier('unagi',2880,true),1);
  assert.equal(Weather.fishMultiplier('unknown-fish',2880),1);
});

test('old saves retain money, bait and catches; sleeping/reloading agrees with the HUD, scenery and Sam', () => {
  const original=seed(), app=boot(original), w=app.window;
  let saved;
  try {
    assert.deepEqual(app.errors,[]);
    for(const expected of ['sunny','cloudy','rain']) {
      assert.equal(w.document.querySelector('#weather').dataset.weather,expected);
      assert.equal(read(w,'gameSceneryEnvironment().weather'),expected);
      assert.ok(w.document.querySelector('#samWeatherHint').textContent.includes(Weather.types[expected].hint));
      if(expected!=='rain')w.sleepAtPlayerHome();
    }
    w.setSamShopDialogue('「ミミズをどうぞ」');w.renderWeather();
    assert.equal(w.document.querySelector('#shopDialogue').textContent,'「ミミズをどうぞ」');
    w.save();saved=JSON.parse(w.localStorage.getItem(saveKey));
    assert.equal(saved.money,original.money);assert.equal(saved.baits.worm,original.baits.worm);
    assert.equal(saved.caught.funa,original.caught.funa);
  } finally {app.dispose();}
  const resumed=boot(saved);
  try {assert.equal(resumed.window.document.querySelector('#weather').dataset.weather,'rain');assert.deepEqual(resumed.errors,[]);}
  finally {resumed.dispose();}
});

test('rain modestly increases existing lake/river candidates; secret bait and free practice keep their guarantees', () => {
  const app=boot(), w=app.window;
  try {
    w.eval('questRumorFishMultiplier = () => 1');
    for(const [spot,target] of [['lake-deep','namazu'],['river-deep','unagi']]) {
      const count=day=>w.eval(`(() => {
        s.gameMinutes=${day}*1440+1200;
        battle={spot:${JSON.stringify(spot)},bait:'worm',waterZone:${JSON.stringify(spot.split('-')[0])}};
        let count=0;const original=Math.random;
        try {for(let i=0;i<4000;i++){Math.random=()=> (i+.5)/4000;
          const selected=pick(50,battle.spot);
          if(!(selected.id in fishingSpotById(battle.spot).weights))throw Error('foreign fish');
          if(selected.id===${JSON.stringify(target)})count++;}}
        finally {Math.random=original;}
        return count;
      })()`);
      const sunny=count(0),rain=count(2);
      assert.ok(rain>sunny&&rain<sunny*1.25,`${target}: ${sunny} -> ${rain}`);
    }
    w.eval("battle={spot:'lake-deep',bait:'nushiSecret'}");
    for(const day of [0,1,2]) {
      w.eval(`s.gameMinutes=${day}*1440+720`);
      assert.equal(w.pick(80,'lake-deep').id,'nushi');
    }
    w.eval('battle=null');const bait=read(w,'s.baits.worm');
    w.openPracticePond();w.resolveSurfaceCast(70);
    assert.equal(read(w,'battle.f.id'),'funa');assert.equal(read(w,'s.baits.worm'),bait);
  } finally {app.dispose();}
});

function fakeAudio() {
  const sources=[],nodes=[];
  const parameter=()=>({value:0,setValueAtTime(v){this.value=v;},linearRampToValueAtTime(v){this.value=v;},exponentialRampToValueAtTime(v){this.value=v;},cancelScheduledValues(){},setTargetAtTime(v){this.value=v;}});
  const node=()=>{const n={gain:parameter(),frequency:parameter(),Q:parameter(),connect(){},disconnect(){this.disconnected=true;},start(){this.started=true;},stop(){this.stopped=true;this.onended?.();}};nodes.push(n);return n;};
  const context={state:'running',currentTime:4,sampleRate:8000,destination:{},
    createGain:node,createBiquadFilter:node,createOscillator:node,
    createBuffer(channels,length){const data=Array.from({length:channels},()=>new Float32Array(length));return {length,getChannelData:i=>data[i]};},
    createBufferSource(){const n=node();sources.push(n);return n;},
    resume(){this.state='running';return Promise.resolve();},
  };
  return {context,sources,nodes};
}

test('rain is a single gesture-unlocked loop that stops indoors, underwater, muted or hidden and recovers on return', () => {
  const app=boot({...seed(),gameMinutes:3240}),w=app.window,audio=fakeAudio();
  try {
    w.AudioContext=function(){return audio.context;};
    assert.equal(w.syncRainSound(),false,'no autoplay before a gesture');
    w.unlockGameAudio();w.syncExpectedLoopAudio();
    const loops=()=>audio.sources.filter(s=>s.loop);
    assert.equal(loops().length,1);const initial=loops()[0];
    assert.ok(initial.buffer.getChannelData(0).some(value=>value!==0));
    w.syncRainSound();w.renderWeather();assert.equal(loops().length,1);
    w.open('store');assert.equal(initial.stopped,true);w.close();assert.equal(loops().length,2);
    w.eval("playerHomeState.area='interior'");w.renderPlayerHome();assert.equal(loops().at(-1).stopped,true);
    w.eval("playerHomeState.area='exterior'");w.renderPlayerHome();assert.equal(loops().at(-1).stopped,undefined);
    w.eval("battle={phase:'fight'}");w.syncRainSound();assert.equal(loops().at(-1).stopped,true);
    w.eval('battle=null');w.syncRainSound();assert.equal(loops().at(-1).stopped,undefined);
    w.setSoundEnabled(false);assert.equal(loops().at(-1).stopped,true);
    w.setSoundEnabled(true);assert.equal(loops().at(-1).stopped,undefined);
    Object.defineProperty(w.document,'hidden',{value:true,configurable:true});
    w.document.dispatchEvent(new w.Event('visibilitychange'));assert.equal(loops().at(-1).stopped,true);
    Object.defineProperty(w.document,'hidden',{value:false,configurable:true});
    w.document.dispatchEvent(new w.Event('visibilitychange'));assert.equal(loops().at(-1).stopped,undefined);
    w.eval('s.gameMinutes=360');w.renderWeather();assert.equal(loops().at(-1).stopped,true);
    assert.ok(audio.sources.filter(s=>s.loop).every(s=>s.disconnected));
    assert.deepEqual(app.errors,[]);
  } finally {w.stopAllGameAudioSamples();app.dispose();}
});

test('cloud/rain preserve detailed scenery; ripples fit water masks and indoor/underwater pixels stay dry', async () => {
  for(const id of ['surface-lake','home-interior','underwater-lake-shallow-false']) {
    const e={season:'spring',period:'day'},definition=Data.get(id,e);
    const image=await loadImage(path.join(root,definition.source));
    const scenes={},results={};
    for(const weather of ['sunny','cloudy','rain']) {
      const scene=Art.prepare(image,null,definition,{...e,weather},createCanvas),c=createCanvas(scene.width,scene.height);
      scenes[weather]=scene;Art.compose(c,scene);results[weather]=bytes(c);
    }
    const rain=scenes.rain,overlay=createCanvas(rain.width,rain.height);
    if(definition.indoor||definition.underwater) {
      assert.deepEqual(results.sunny,results.rain,'no weather tint indoors or underwater');
      const dry=createCanvas(rain.width,rain.height);Art.motion(dry,scenes.sunny,1300);Art.motion(overlay,rain,1300);
      assert.deepEqual(bytes(dry),bytes(overlay),'rain cannot affect indoor or underwater animation');
    } else {
      assert.notDeepEqual(results.sunny,results.cloudy);assert.notDeepEqual(results.cloudy,results.rain);
      const waterIndices=new Set(definition.parts.flatMap((p,i)=>p.kind==='water'?[i+1]:[]));
      let points=0;
      for(const part of rain.parts)for(const p of part.rainSamples) {
        points++;
        for(let dy=-3;dy<=3;dy++)for(let dx=-6;dx<=7;dx++)
          assert.ok(waterIndices.has(rain.labels[(p.y+dy)*rain.width+p.x+dx]),'whole ripple stays on water');
      }
      assert.ok(points>10);
      Art.motion(overlay,rain,1000);const first=bytes(overlay);Art.motion(overlay,rain,1500);assert.notDeepEqual(first,bytes(overlay));
    }
    Art.motion(overlay,rain,1000,{reducedMotion:true});const first=bytes(overlay);
    Art.motion(overlay,rain,2300,{reducedMotion:true});assert.deepEqual(first,bytes(overlay));
  }
});

test('weather is part of the scenery cache key and is available offline with the updated worker', async () => {
  const c=createCanvas(80,45);c.style={};let builds=0;
  const controller=Art.createController({canvasFactory:createCanvas,
    loadImage:async()=>{const image=createCanvas(80,45);const x=image.getContext('2d');x.fillStyle='#359ac4';x.fillRect(0,0,80,45);return image;},
    buildScene:(...args)=>{builds++;return Art.prepare(...args);},
    requestFrame:()=>1,cancelFrame(){},isHidden:()=>false,visible:()=>true,reducedMotion:()=>true,
    createMotionCanvas:()=>{const overlay=createCanvas(80,45);overlay.dataset={};return overlay;},onError:e=>assert.fail(e.message)});
  try {
    for(const weather of ['sunny','rain','rain','cloudy'])
      await controller.paint(c,'surface-lake',{season:'spring',period:'day',weather});
    assert.equal(builds,3);
  } finally {controller.dispose();}
  const sw=fs.readFileSync(path.join(root,'sw.js'),'utf8');
  for(const module of ['weather','layered-scenery','scenery-worker'])assert.ok(sw.includes(`./${module}.js?v=169-1`));
});
