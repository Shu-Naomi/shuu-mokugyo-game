const {test}=require('node:test'),assert=require('node:assert/strict');
const Options=require('../player-options.js'),{boot,seed,read,saveKey}=require('./game-harness.cjs');
const set=(w,id,value)=>{const el=w.document.querySelector(id);el.value=value;el.dispatchEvent(new w.Event('input',{bubbles:true}));};
const near=(actual,expected)=>assert.ok(Math.abs(actual-expected)<1e-9,`${actual} = ${expected}`);
function context(){
 const nodes=[],param=()=>({value:1,cancelScheduledValues(){},setValueAtTime(v){this.value=v;},linearRampToValueAtTime(v){this.value=v;},exponentialRampToValueAtTime(v){this.value=v;}});
 const node=(extra={})=>{const n={connections:[],connect(to){this.connections.push(to);},disconnect(){this.disconnected=true;},start(){},stop(){this.stopped=true;},...extra};nodes.push(n);return n;};
 return {nodes,state:'running',currentTime:1,sampleRate:8000,destination:{},createGain:()=>node({gain:param()}),
  createOscillator:()=>node({frequency:param()}),createBufferSource:()=>node(),createBuffer:(_c,n)=>({getChannelData:()=>new Float32Array(n)}),
  createBiquadFilter:()=>node({frequency:param(),Q:param()})};
}
test('legacy options gain safe volume defaults; independent edits preserve speed, zero and the other channel',()=>{
 const store=new Map([[Options.key,JSON.stringify({textSpeed:'slow'})]]),storage={getItem:k=>store.get(k),setItem:(k,v)=>store.set(k,v)},o=Options.create(()=>storage);
 assert.deepEqual(o.read(),{textSpeed:'slow',bgmVolume:45,seVolume:80});
 assert.ok(o.write({bgmVolume:0}));assert.ok(o.write('fast'));assert.ok(o.write({seVolume:100}));
 assert.deepEqual(o.read(),{textSpeed:'fast',bgmVolume:0,seVolume:100});
 assert.equal(o.write({bgmVolume:NaN}),false);assert.equal(o.write({seVolume:'50'}),false);
 assert.deepEqual(Options.normalize({bgmVolume:-5,seVolume:130}),{textSpeed:'normal',bgmVolume:0,seVolume:100});
 assert.deepEqual(Options.normalize({bgmVolume:null,seVolume:'bad'}),Options.defaults);
 storage.setItem=()=>{throw Error('quota');};assert.equal(o.write({bgmVolume:70}),false);assert.equal(o.read().bgmVolume,0);
});
test('sliders immediately control separate music and effects buses, including every media sample, without restarting loops',()=>{
 const app=boot({...seed(),soundEnabled:true}),w=app.window,c=context();w.AudioContext=function(){return c;};
 try{
  w.ensureAudioContext();w.playGameAudioSample('underwater');w.playGameAudioSample('dogPetBark');
  const media=w.eval('gameAudio.media.underwater');media.currentTime=12;
  near(media.volume,.52*.48*.8);near(w.eval('gameAudio.music.gain.value'),.45);near(w.eval('gameAudio.effects.gain.value'),.8);
  assert.ok(w.openOptions());const raw=w.localStorage.getItem(saveKey);
  set(w,'#optionsBgmVolume',17);near(w.eval('gameAudio.music.gain.value'),.17);near(media.volume,.52*.48*.8);
  set(w,'#optionsSeVolume',0);near(w.eval('gameAudio.effects.gain.value'),0);near(media.volume,0);near(w.eval('gameAudio.media.dogPetBark.volume'),0);
  near(w.eval('gameAudio.music.gain.value'),.17);assert.equal(media.currentTime,12);assert.equal(media.paused,false);
  set(w,'#optionsSeVolume',100);near(media.volume,.52*.48);assert.equal(media.currentTime,12);
  assert.equal(w.document.querySelector('#optionsSeValue').textContent,'100%');assert.equal(w.localStorage.getItem(saveKey),raw);
  w.scheduleAudioTone({frequency:400});assert.ok(c.nodes.some(n=>n.connections.includes(w.eval('gameAudio.effects'))),'synthesized effects use SE bus');
  const settings=JSON.parse(w.localStorage.getItem(Options.key));assert.deepEqual(settings,{textSpeed:'instant',bgmVolume:17,seVolume:100});assert.deepEqual(app.errors,[]);
 }finally{app.dispose();}
});
test('jingle focus lowers music and ambience independently of SE volume, restores latest settings and cannot stick after mute',()=>{
 const app=boot({...seed(),soundEnabled:true}),w=app.window,c=context();w.AudioContext=function(){return c;};
 try{
  w.ensureAudioContext();w.playGameAudioSample('underwater');w.playGameAudioSample('dogPetBark');w.focusJingleAudio(3000);
  near(w.eval('gameAudio.music.gain.value'),.45*.16);near(w.eval('gameAudio.effects.gain.value'),.8);
  near(w.eval('gameAudio.media.underwater.volume'),.52*.48*.8*.18);near(w.eval('gameAudio.media.dogPetBark.volume'),.78*.48*.8);
  w.openOptions();set(w,'#optionsBgmVolume',90);near(w.eval('gameAudio.music.gain.value'),.9*.16);
  w.clearJingleFocus();near(w.eval('gameAudio.music.gain.value'),.9);near(w.eval('gameAudio.media.underwater.volume'),.52*.48*.8);
  w.focusJingleAudio(3000);w.setSoundEnabled(false);assert.equal(read(w,'gameAudio.jingleFocus'),false);assert.equal(read(w,'gameAudio.focusTimer'),null);assert.equal(w.eval('gameAudio.media.underwater.paused'),true);
  assert.deepEqual(app.errors,[]);
 }finally{app.dispose();}
});
test('saved volumes restore across adventures; failed writes leave both sliders and the sounding mix unchanged',()=>{
 const settings={textSpeed:'slow',bgmVolume:0,seVolume:23},app=boot(seed(),undefined,{storage:{[Options.key]:settings}}),w=app.window,write=w.Storage.prototype.setItem;
 try{
  w.openOptions();assert.equal(w.document.querySelector('#optionsBgmVolume').value,'0');assert.equal(w.document.querySelector('#optionsSeVolume').value,'23');
  w.Storage.prototype.setItem=()=>{throw Error('quota');};set(w,'#optionsSeVolume',90);
  assert.equal(w.document.querySelector('#optionsSeVolume').value,'23');assert.match(w.document.querySelector('#optionsNotice').textContent,/保存できなかった/);
  assert.deepEqual(read(w,'audioOptions'),settings);assert.deepEqual(app.errors,[]);
 }finally{w.Storage.prototype.setItem=write;app.dispose();}
});
