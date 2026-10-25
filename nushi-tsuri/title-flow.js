/* A read-only title and an unsaved character draft. Adventure storage stays in save-slots. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;
  if(root)root.ShuTitleFlow=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(){
  'use strict';
  const dogIds=['shuu','riku','grey'];
  function draft(options){return {avatar:options.gender(null),playerName:options.name(null),dog:'riku'};}
  function choices(value,options){
    if(!value||!['boy','girl'].includes(value.avatar)||!dogIds.includes(value.dog)||!options.validName(value.playerName))return null;
    return {avatar:value.avatar,playerName:options.name(value.playerName),dog:value.dog};
  }
  function create({element,slots,options,initialSlot=1,selectSlot,summary,start,settings}){
    const q=selector=>element.querySelector(selector),all=selector=>[...element.querySelectorAll(selector)];
    const drafts=new Map();
    let phase='menu',mode='continue',selected=initialSlot,composing=false,busy=false;
    const current=()=>{if(!drafts.has(selected))drafts.set(selected,draft(options));return drafts.get(selected);};
    function notice(text=''){q('#saveSlotNotice').textContent=text;q('#saveSlotNotice').hidden=!text;}
    function show(next,focus=true){
      phase=next;notice();render();
      if(focus){const target=q(`[data-title-panel="${next}"] button:not(:disabled),[data-title-panel="${next}"] input`);target?.focus({preventScroll:true});}
    }
    function render(){
      for(const panel of all('[data-title-panel]'))panel.hidden=panel.dataset.titlePanel!==phase;
      element.dataset.phase=phase;
      const saved=slots.read(selected),data=saved.ok&&saved.exists?saved.data:current();
      q('#titleSlotHeading').textContent=mode==='new'?'新しい冒険の保存先':'冒険のつづき';
      q('#titleSlotHelp').textContent=mode==='new'?'空きセーブを選んでね。保存済みの冒険は上書きしないよ。':'再開する冒険を選んでね。';
      for(const button of all('[data-save-slot]')){
        const id=Number(button.dataset.saveSlot),entry=slots.read(id);
        button.disabled=!entry.ok||(mode==='new'?entry.exists:!entry.exists);
        button.setAttribute('aria-pressed',String(id===selected));
        button.querySelector('small').textContent=summary(id);
      }
      q('#titleSlotsNext').hidden=mode==='continue';
      q('#titleSlotsNext').disabled=!saved.ok||saved.exists;
      q('#titleResume').hidden=mode!=='continue';
      q('#titleResume').disabled=!saved.ok||!saved.exists;
      const entries=[slots.read(1),slots.read(2)];
      q('#titleEmptyNote').textContent=mode==='continue'
        ?entries.some(e=>e.ok&&e.exists)?'':entries.some(e=>!e.ok)?'読み込めないセーブは保護しているよ。':'まだセーブがないよ。「はじめから」で冒険を始めよう。'
        :entries.some(e=>e.ok&&!e.exists)?'':'空きセーブがないよ。冒険を残すなら「つづきから」へ。整理するときは「設定」で内容を確認してね。';
      for(const b of all('[data-avatar]')){
        b.disabled=phase!=='character';b.classList.toggle('active',b.dataset.avatar===data.avatar);
        b.setAttribute('aria-pressed',String(b.dataset.avatar===data.avatar));
      }
      q('#titlePlayerName').disabled=phase!=='character';
      for(const b of all('[data-dog]')){
        b.disabled=phase!=='dogs';b.classList.toggle('active',b.dataset.dog===data.dog);
        b.setAttribute('aria-pressed',String(b.dataset.dog===data.dog));
        b.querySelector('strong').textContent=options.dogName(data,b.dataset.dog);
      }
      q('#titleConfirmIdentity').textContent=`${options.name(current().playerName)} · ${current().avatar==='girl'?'女の主人公':'男の主人公'}`;
      q('#titleConfirmDog').textContent=options.dogName({},current().dog);
      q('#titleConfirmSlot').textContent=`セーブ${selected}に、新しい冒険を保存するよ。`;
      q('#start').disabled=phase!=='confirm'||!choices(current(),options)||!saved.ok||saved.exists||busy;
      q('#titleContinue').disabled=false;
      if(phase==='slots'&&!saved.ok)notice('このセーブは読み込めないので、上書きせず保護しているよ。');
      else if(mode==='new'&&phase!=='menu'&&saved.exists)notice('保存先に冒険が見つかったよ。戻って空きセーブを選んでね。');
    }
    function select(id){
      if(![1,2].includes(id))return;
      const entry=slots.read(id);
      if(!entry.ok||(mode==='new'?entry.exists:!entry.exists))return;
      selected=id;selectSlot(id);render();
    }
    function openSlots(nextMode){
      mode=nextMode;
      const available=[selected,...[1,2].filter(id=>id!==selected)].find(id=>{const e=slots.read(id);return e.ok&&(mode==='new'?!e.exists:e.exists);});
      if(available)select(available);
      show('slots');
    }
    function beginNew(){
      const entry=slots.read(selected);
      if(!entry.ok||entry.exists){show('slots');notice('保存先が変わったので、もう一度空きセーブを選んでね。');return;}
      q('#titlePlayerName').value=current().playerName;show('character');
    }
    function nextCharacter(){
      if(composing)return;
      const value=q('#titlePlayerName').value;current().playerName=value;
      if(!options.validName(value)){notice('名前は1〜12文字で入れてね。空欄では始められないよ。');return;}
      current().playerName=options.name(value);show('dogs');
    }
    function launch(isNew){
      if(busy)return;
      const entry=slots.read(selected),value=isNew?choices(current(),options):null;
      if(!entry.ok||(isNew?(entry.exists||!value):!entry.exists)){
        show('slots');notice('保存先の状態が変わったよ。冒険を上書きせず止めたので、選び直してね。');return;
      }
      busy=true;render();
      const result=start({slot:selected,isNew,choices:value});
      if(result===false){busy=false;render();notice('開始できなかったよ。保存先と空き容量を確認して、もう一度試してね。');}
    }
    q('#titleNew').onclick=()=>openSlots('new');q('#titleContinue').onclick=()=>openSlots('continue');
    q('#titleOptions').onclick=settings;q('#titleSlotsSettings').onclick=settings;
    for(const b of all('[data-save-slot]'))b.onclick=()=>select(Number(b.dataset.saveSlot));
    q('#titleSlotsNext').onclick=beginNew;q('#titleResume').onclick=()=>launch(false);
    for(const b of all('[data-avatar]'))b.onclick=()=>{if(phase==='character'){current().avatar=b.dataset.avatar;render();}};
    for(const b of all('[data-dog]'))b.onclick=()=>{if(phase==='dogs'){current().dog=b.dataset.dog;render();}};
    q('#titlePlayerName').oninput=()=>{current().playerName=q('#titlePlayerName').value;notice();};
    q('#titlePlayerName').addEventListener('compositionstart',()=>{composing=true;});q('#titlePlayerName').addEventListener('compositionend',()=>{composing=false;});
    q('#titleCharacterForm').onsubmit=event=>{event.preventDefault();nextCharacter();};
    q('#titlePlayerName').onkeydown=event=>{if(event.key==='Enter'&&(composing||event.isComposing||event.keyCode===229))event.preventDefault();};
    q('#titleDogsNext').onclick=()=>show('confirm');q('#start').onclick=()=>launch(true);
    const previous={slots:'menu',character:'slots',dogs:'character',confirm:'dogs'};
    function back(){if(phase!=='menu'&&!busy)show(previous[phase]);}
    for(const b of all('[data-title-back]'))b.onclick=back;
    for(const b of all('[data-title-cancel]'))b.onclick=()=>{if(!busy)show('menu');};
    element.addEventListener('keydown',event=>{if(event.key==='Escape'&&!event.isComposing&&!composing){event.preventDefault();back();}});
    // Other tabs may fill a draft's slot; re-read before every visible choice and at commit.
    function storageChanged(event){if(event.key===null||[slots.keyFor(1),slots.keyFor(2)].includes(event.key))render();}
    element.ownerDocument.defaultView.addEventListener('storage',storageChanged);
    render();
    return {render,openSlots,notice,get phase(){return phase;},get selected(){return selected;}};
  }
  return {draft,choices,create};
});
