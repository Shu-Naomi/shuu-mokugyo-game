/* Scene routing and one bounded, cancellable music player. Music never enters
 * the fishing scene. Existing water/operation sounds retain their own mixer. */
(function(root,factory){
  const tracks=typeof module==='object'&&module.exports?require('./music-tracks.js'):root.ShuMusicTracks;
  const api=factory(tracks);
  if(typeof module==='object'&&module.exports)module.exports=api;else root.ShuSoundscape=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(tracks){
  'use strict';
  const rooms={'home-kitchen':'home','sam-shop':'sam','main-shrine':'shrine',farmhouse:'inn',yaoya:'yaoya',diner:'diner','fish-market':'fish-market'};
  function selectScene(state={}){
    if(!state.active)return {music:null,birds:null};
    // All phases, including preparation and the catch transition, are music-free.
    if(state.fishing){
      const surface=['prep','cast','cast-flight','wait','bite'].includes(state.phase);
      const birds=!surface?null:state.zone==='sea'?(state.locale==='harbor'?'harborBirds':null):state.zone==='river'?null:'lakeBirds';
      return {music:null,birds};
    }
    if(state.store)return {music:'sam',birds:null};
    if(state.location&&rooms[state.location])return {music:rooms[state.location],birds:null};
    if(state.home)return {music:'home',birds:null};
    if(state.boats)return {music:'boats',birds:null};
    if(state.shrine)return {music:'shrine',birds:null};
    const season=['spring','summer','autumn','winter'].includes(state.season)?state.season:'spring';
    return {music:'map-'+season,birds:null};
  }
  function createMusicPlayer({load=async(context,src)=>{
    const response=await fetch(src);
    if(!response.ok)throw new Error('Music HTTP '+response.status);
    return context.decodeAudioData(await response.arrayBuffer());
  },now=()=>Date.now()}={}){
    const cache=new Map(),pending=new Map(),positions=new Map(),tails=new Set();
    let desired=null,voice=null,generation=0,promise=null,lastContext=null,retryAt=0,lastError=null;
    function retire(fade=.35){
      if(!voice)return;
      const old=voice;voice=null;
      const time=old.context.currentTime;
      positions.set(old.id,(old.offset+Math.max(0,time-old.startedAt))%old.duration);
      tails.add(old);
      if(old.context.state==='closed') {old.cleanup();return;}
      const duration=Math.max(.015,fade);
      if(old.gain.gain.cancelAndHoldAtTime)old.gain.gain.cancelAndHoldAtTime(time);
      else {old.gain.gain.cancelScheduledValues(time);old.gain.gain.setValueAtTime(old.gain.gain.value,time);}
      old.gain.gain.linearRampToValueAtTime(0,time+duration);
      old.source.stop(time+duration+.01);
    }
    function stop(fade=.10){
      if(desired!==null||voice||promise){desired=null;generation++;promise=null;retire(fade);}
      return true;
    }
    async function bufferFor(id,context){
      if(cache.has(id)){const value=cache.get(id);cache.delete(id);cache.set(id,value);return value;}
      if(pending.has(id))return pending.get(id);
      const result=Promise.resolve().then(()=>load(context,tracks[id].src)).then(buffer=>{
        cache.set(id,buffer);while(cache.size>2)cache.delete(cache.keys().next().value);return buffer;
      }).finally(()=>pending.delete(id));
      pending.set(id,result);return result;
    }
    function set(id,context,destination){
      if(!tracks[id]||!context||context.state!=='running'||!destination){stop();return Promise.resolve(false);}
      if(lastContext!==context){stop(.02);lastContext=context;}
      if(desired===id&&(voice||promise))return promise||Promise.resolve(true);
      if(desired===id&&now()<retryAt)return Promise.resolve(false);
      retire(.35);desired=id;retryAt=0;lastError=null;
      const token=++generation;
      promise=bufferFor(id,context).then(buffer=>{
        if(token!==generation||desired!==id||context.state!=='running')return false;
        const source=context.createBufferSource(),gain=context.createGain();
        const duration=Math.min(buffer.duration,tracks[id].duration);
        const offset=(positions.get(id)||0)%duration;
        source.buffer=buffer;source.loop=true;source.loopStart=0;source.loopEnd=duration;
        gain.gain.setValueAtTime(0,context.currentTime);
        gain.gain.linearRampToValueAtTime(.9,context.currentTime+.65);
        source.connect(gain);gain.connect(destination);
        const playing={id,context,source,gain,duration,offset,startedAt:context.currentTime,
          cleanup(){try{source.disconnect();}catch(_){}try{gain.disconnect();}catch(_){}tails.delete(playing);}};
        source.onended=()=>{playing.cleanup();if(voice===playing)voice=null;};
        voice=playing;source.start(context.currentTime,offset);return true;
      }).catch(error=>{
        if(token===generation){lastError=String(error.message||error);retryAt=now()+10000;}
        return false;
      }).finally(()=>{if(token===generation)promise=null;});
      return promise;
    }
    function dispose(){stop(.02);for(const old of tails){try{old.source.stop();}catch(_){}old.cleanup();}cache.clear();positions.clear();}
    return {set,stop,dispose,stats:()=>({desired,playing:voice?.id||null,pending:!!promise,cached:cache.size,tails:tails.size,lastError})};
  }
  return {tracks,selectScene,createMusicPlayer};
});
