/* Player identity belongs to each adventure; reading speed belongs to this device. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;
  if(root)root.ShuPlayerOptions=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(){
  'use strict';
  const key='nushi-inugoya-options-v1';
  const speeds=Object.freeze({slow:70,normal:35,fast:12,instant:0});
  const labels={slow:'ゆっくり',normal:'ふつう',fast:'はやい',instant:'一度に表示'};
  const split=value=>typeof Intl.Segmenter==='function'
    ? Array.from(new Intl.Segmenter('ja',{granularity:'grapheme'}).segment(value),p=>p.segment)
    : Array.from(value);
  function clean(value){return typeof value==='string'?value.normalize('NFC').replace(/[\u0000-\u001f\u007f-\u009f\u202a-\u202e\u2066-\u2069]/g,'').trim():'';}
  function name(value){return split(clean(value)).slice(0,12).join('')||'旅人';}
  function validName(value){const parts=split(clean(value));return parts.length>0&&parts.length<=12;}
  const gender=value=>value==='girl'?'girl':'boy';
  function create(getStorage=()=>globalThis.localStorage){
    function read(){try{const saved=JSON.parse(getStorage().getItem(key));
      return {textSpeed:Object.hasOwn(speeds,saved?.textSpeed)?saved.textSpeed:'normal'};
    }catch(_){return {textSpeed:'normal'};}}
    function write(textSpeed){if(!Object.hasOwn(speeds,textSpeed))return false;
      try{getStorage().setItem(key,JSON.stringify({textSpeed}));return true;}catch(_){return false;}}
    return {read,write};
  }
  function typer(clock=globalThis){
    const running=new Map();
    function cancel(container){const task=running.get(container);if(!task)return false;
      clock.clearTimeout(task.timer);running.delete(container);container.removeAttribute('data-dialogue-reading');return true;}
    function finish(container){const task=running.get(container);if(!task)return false;
      for(const line of task.lines)line.node.data=line.full;
      cancel(container);return true;}
    function start(container,nodes,speed){cancel(container);
      const delay=speeds[speed]??speeds.normal;
      if(!delay)return;
      const lines=nodes.filter(Boolean).map(node=>({node,full:node.data,parts:split(node.data)}));
      if(!lines.length)return;
      const task={lines,line:0,letter:0,timer:0};running.set(container,task);
      container.setAttribute('data-dialogue-reading','true');
      for(const line of lines)line.node.data='';
      function step(){
        if(running.get(container)!==task)return;
        const line=lines[task.line];
        if(!line){cancel(container);return;}
        line.node.data=line.parts.slice(0,++task.letter).join('');
        if(task.letter>=line.parts.length){task.line++;task.letter=0;}
        if(task.line>=lines.length){cancel(container);return;}
        task.timer=clock.setTimeout(step,delay);
      }
      step();
    }
    function cancelAll(){for(const container of running.keys())cancel(container);}
    return {start,finish,cancel,cancelAll};
  }
  return {key,speeds,labels,split,name,validName,gender,create,typer};
});
