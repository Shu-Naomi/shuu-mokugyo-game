/* Two independent adventures. Slot one keeps the original save key. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;
  if(root)root.ShuSaveSlots=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(){
  'use strict';
  const keys={1:'nushi-inugoya-v2',2:'nushi-inugoya-v2-slot2'};
  const lastSlotKey='nushi-inugoya-last-slot';
  const slot=v=>v===1||v==='1'?1:v===2||v==='2'?2:null;
  function keyFor(value){const id=slot(value);if(!id)throw Error('Unknown save slot');return keys[id];}
  function create(getStorage=()=>globalThis.localStorage){
    function read(value){
      try{
        const raw=getStorage().getItem(keyFor(value));
        if(raw===null)return {ok:true,exists:false,data:{}};
        const data=JSON.parse(raw);
        if(!data||typeof data!=='object'||Array.isArray(data))return {ok:false,exists:true,error:'invalid'};
        return {ok:true,exists:true,data};
      }catch(error){return {ok:false,exists:true,error:error instanceof SyntaxError?'invalid':'unavailable'};}
    }
    function write(value,data){
      // A damaged or inaccessible save must never be replaced by a fresh game.
      if(!read(value).ok)return false;
      try{getStorage().setItem(keyFor(value),JSON.stringify(data));return true;}catch(_){return false;}
    }
    function remember(value){
      const id=slot(value);if(!id)return false;
      try{getStorage().setItem(lastSlotKey,String(id));return true;}catch(_){return false;}
    }
    function initial(query=''){
      const requested=slot(new URLSearchParams(query).get('saveSlot'));
      if(requested)return requested;
      try{return slot(getStorage().getItem(lastSlotKey))||1;}catch(_){return 1;}
    }
    function capture(value){try{return {ok:true,raw:getStorage().getItem(keyFor(value))};}catch(_){return {ok:false};}}
    function remove(value,expectedRaw){
      if(typeof expectedRaw!=="string")return false;
      try{const storage=getStorage(),key=keyFor(value);if(storage.getItem(key)!==expectedRaw)return false;
        storage.removeItem(key);return storage.getItem(key)===null;
      }catch(_){return false;}
    }
    return {read,write,remember,initial,keyFor,capture,remove};
  }
  function titleUrl(href,value){
    const url=new URL(href);url.searchParams.set('saveSlot',String(slot(value)||1));
    for(const name of ['play','avatar','dog','playerName'])url.searchParams.delete(name);
    return url.href;
  }
  function launchUrl(href,value,options={}){
    const url=new URL(titleUrl(href,value));url.searchParams.set('play','1');
    if(['boy','girl'].includes(options.avatar))url.searchParams.set('avatar',options.avatar);
    if(['shuu','riku','grey'].includes(options.dog))url.searchParams.set('dog',options.dog);
    if(typeof options.playerName==='string')url.searchParams.set('playerName',options.playerName);
    return url.href;
  }
  function launchSettings(query=''){
    const p=new URLSearchParams(query);
    return {play:p.get('play')==='1',playerName:p.get('playerName'),avatar:['boy','girl'].includes(p.get('avatar'))?p.get('avatar'):null,
      dog:['shuu','riku','grey'].includes(p.get('dog'))?p.get('dog'):null};
  }
  return {keys,lastSlotKey,keyFor,create,titleUrl,launchUrl,launchSettings};
});
