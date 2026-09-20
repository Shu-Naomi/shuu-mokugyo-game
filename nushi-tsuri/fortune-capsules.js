/* Pixel capsule presentation only. Draws, payment and rewards belong to the game. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.ShuFortuneCapsules=api;})(typeof globalThis!=='undefined'?globalThis:this,function(){
  'use strict';
  const colors=Object.freeze({
    orange:{name:'輝くオレンジ',label:'星見の竿'},
    blue:{name:'青',label:'ワンコのおもちゃ・おやつ'},
    white:{name:'白',label:'通常のエサ・釣具など'},
    gold:{name:'金',label:'お祝い金'},
    purple:{name:'紫',label:'ぬしエサ'}
  });
  const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[c]);
  function colorFor(prizeId,dogType=''){
    if(prizeId==='starGazer')return 'orange';
    if(prizeId==='baitNushi1')return 'purple';
    if(/^money(?:500|2000|10000)$/.test(prizeId))return 'gold';
    if(dogType==='toy'||dogType==='treat'||['starFrisbee','squeakyNushi','stardustCookie','moonlightJerky'].includes(prizeId))return 'blue';
    return 'white';
  }
  function safeResults(results){
    if(!Array.isArray(results)||![1,10].includes(results.length))return [];
    return results.map(r=>({
      prizeId:typeof r?.prizeId==='string'?r.prizeId.slice(0,60):'',
      fortune:typeof r?.fortune==='string'?r.fortune.slice(0,80):'星みくじ',
      message:typeof r?.message==='string'?r.message.slice(0,400):'結果の記録がないよ。',
      capsule:Object.hasOwn(colors,r?.capsule)?r.capsule:colorFor(r?.prizeId),
      jackpot:r?.prizeId==='starGazer'||r?.jackpot===true
    }));
  }
  function capsule(color='white'){
    if(!Object.hasOwn(colors,color))color='white';
    return `<svg class="fortune-capsule color-${color}" viewBox="0 0 32 36" aria-hidden="true" focusable="false" shape-rendering="crispEdges">
      <g class="capsule-top"><path fill="var(--cap-edge)" d="M10 2h12v2h4v4h2v6h2v4H2v-4h2V8h2V4h4z"/><path fill="var(--cap-mid)" d="M10 4h12v2h4v8h2v2H4v-2h2V8h4z"/><path fill="var(--cap-light)" d="M10 4h12v2H12v2H8v6H6V8h4z"/><path fill="var(--cap-shade)" d="M22 6h4v8h2v2h-6v-2h2V8h-2z"/><path fill="#fff" fill-opacity=".6" d="M10 8h4v2h-4zM8 10h2v4H8z"/><path fill="#ffefd0" d="M16 8h2v2h2v2h-2v2h-2v-2h-2v-2h2z"/></g>
      <g class="capsule-bottom"><path fill="var(--cap-edge)" d="M2 18h28v6h-2v4h-4v4h-4v2h-8v-2H8v-4H4v-4H2z"/><path fill="#e8e8da" d="M4 20h24v4h-2v4h-4v2h-4v2h-4v-2h-4v-4H6v-4H4z"/><path fill="#fffbed" d="M4 20h8v4h2v4h8v2h-4v2h-4v-2h-4v-4H6v-4H4z"/><path fill="#94a8aa" d="M24 20h4v4h-2v4h-4v2h-4v2h-4v-2h4v-2h4v-4h2z"/><path fill="var(--cap-shade)" d="M4 18h24v2H4z"/><path fill="var(--cap-edge)" d="M13 16h6v6h-6z"/><path fill="#fff6d3" d="M15 18h2v2h-2z"/></g></svg>`;
  }
  function cards(results){
    return results.map((r,i)=>`<li class="fortune-result-card color-${r.capsule}"><span class="fortune-card-art">${capsule(r.capsule)}<small>${i+1}</small></span><div><small>${esc(colors[r.capsule].name)}のカプセル</small><b>${esc(r.fortune)}</b><p>${esc(r.message)}</p></div></li>`).join('');
  }
  function historyMarkup(last,legacy){
    const results=safeResults(last?.results);
    let markup=results.length?`<section class="fortune-batch-results fortune-history"><h3>前回の${results.length===10?'10連':'単発'}結果 <small>受け取り済み</small></h3><ol>${cards(results)}</ol></section>`:'';
    // v182–184 stored ten text-only results. Keep these readable without
    // inventing a color for prizes whose IDs were not recorded.
    if((!results.length||results.length===1)&&Array.isArray(legacy)&&legacy.length===10){
      const known=legacy.every(r=>r?.prizeId&&Object.hasOwn(colors,r?.capsule));
      markup+=`<section class="fortune-batch-results fortune-history"><h3>前回の10連結果 <small>受け取り済み</small></h3><ol>${known?cards(safeResults(legacy)):legacy.map(r=>`<li>${esc(r?.fortune)}：${esc(r?.message)}</li>`).join('')}</ol></section>`;
    }
    return markup;
  }
  function create(ctx){
    const el=ctx.element,doc=el.ownerDocument,win=doc.defaultView;
    let state=null,timer=0,pending=null,focusBefore=null,blocked=[];
    const reduced=()=>win.matchMedia('(prefers-reduced-motion: reduce)').matches;
    function cancel(){win.clearTimeout(timer);timer=0;pending=null;}
    function later(callback,delay){
      cancel();pending=callback;
      if(doc.hidden)return;
      if(reduced()){pending=null;callback();return;}
      timer=win.setTimeout(()=>{timer=0;const fn=pending;pending=null;if(state&&!doc.hidden)fn?.();else pending=fn;},delay);
    }
    function primary(){return el.querySelector('[data-capsule-primary]');}
    function focusPrimary(){(primary()?.disabled?el:primary())?.focus({preventScroll:true});}
    function render(focus=false){
      if(!state)return;
      const {results,index,phase}=state,r=results[index],summary=phase==='summary',revealed=phase==='revealed';
      const count=results.length,opened=summary?count:index+(revealed?1:0);
      el.dataset.phase=phase;el.dataset.capsule=r.capsule;
      el.className=`fortune-reveal show${r.jackpot&&(revealed||phase==='opening')?' jackpot':''}`;
      el.innerHTML=`<div class="fortune-capsule-shell"><header class="fortune-capsule-heading"><div><small>STAR FORTUNE</small><h2 id="fortuneRevealTitle">${summary?'星みくじの結果':revealed&&r.jackpot?'星見の竿 · 大当たり！':'星のカプセル'}</h2></div><span class="fortune-counter">${summary?`${count}個 開封`:`${index+1} / ${count}`}</span><button type="button" class="fortune-dismiss" data-capsule-action="close" aria-label="演出を閉じる">×</button></header>
        ${summary?`<div class="fortune-summary"><p class="fortune-summary-note" role="status">${count}個の景品を受け取ったよ！</p><ol>${cards(results)}</ol></div>`:
        `<div class="fortune-capsule-body"><div class="fortune-drop-stage"><div class="fortune-dispenser" aria-hidden="true"><span>星の祠</span><i></i></div><div class="fortune-capsule-rays color-${r.capsule}"></div><div class="fortune-capsule-shadow"></div><div class="fortune-falling-capsule color-${r.capsule}">${capsule(r.capsule)}</div><span class="fortune-stage-caption">${revealed?'星からの贈りもの':`${colors[r.capsule].name}のカプセル`}</span><i class="fortune-pixel-star star-a" aria-hidden="true"></i><i class="fortune-pixel-star star-b" aria-hidden="true"></i><i class="fortune-pixel-star star-c" aria-hidden="true"></i></div>
        <div class="fortune-prize-area"><div class="fortune-prize-copy" role="status" aria-live="polite"><small>${revealed?colors[r.capsule].label:'星の祠から届いたよ'}</small><h3 id="fortuneRevealFortune">${revealed?esc(r.fortune):phase==='opening'?'カプセルを開封中…':phase==='drop'?'ころころ…ぽんっ！':'何が入っているかな？'}</h3><p id="fortuneRevealMessage">${revealed?esc(r.message):'カプセルを開けて、星からの贈りものを見てみよう。'}</p></div>
        ${count===10?`<div class="fortune-tray"><small>開封済み ${opened} / 10</small><ol aria-label="10連の開封状況">${results.map((item,i)=>`<li class="${i<opened?'opened':i===index?'current':'waiting'}" aria-label="${i+1}個目：${i<opened?esc(item.message):i===index?'開封中':'未開封'}">${i<opened?capsule(item.capsule):`<span>${i+1}</span>`}</li>`).join('')}</ol></div>`:''}</div></div>`}
        <footer class="fortune-capsule-actions"><small>景品は受け取り済み。閉じても神社で結果を見返せるよ。</small><div>${!summary&&count===10?'<button type="button" class="fortune-skip" data-capsule-action="all">まとめて開ける</button>':''}<button type="button" class="fortune-primary" data-capsule-primary data-capsule-action="${summary?'close':revealed?'next':'open'}" ${!summary&&!revealed&&phase!=='sealed'?'disabled':''}>${summary?'神社へ戻る':revealed?index===count-1?'結果を見る':'次のカプセルへ':phase==='drop'?'カプセルが出てくるよ…':phase==='opening'?'開封中…':'カプセルを開ける'}</button></div></footer></div>`;
      if(focus)focusPrimary();
    }
    function drop(){
      state.phase='drop';render(true);
      later(()=>{state.phase='sealed';render(true);},780);
    }
    function act(action){
      if(!state||doc.hidden)return false;
      if(action==='close'){ctx.onClose();return true;}
      if(action==='all'&&state.phase!=='summary'){
        cancel();ctx.stopSound?.();state.phase='summary';render(true);return true;
      }
      if(action==='open'&&state.phase==='sealed'){
        state.phase='opening';render(true);
        ctx.sound?.(state.results[state.index].jackpot?'fortuneJackpotConfirm':'fortuneWinBell');
        later(()=>{state.phase='revealed';render(true);},520);return true;
      }
      if(action==='next'&&state.phase==='revealed'){
        ctx.stopSound?.();
        if(state.index===state.results.length-1){state.phase='summary';render(true);}
        else{state.index++;drop();}
        return true;
      }
      return false;
    }
    function hide({restoreFocus=true}={}){
      cancel();ctx.stopSound?.();state=null;el.hidden=true;el.className='fortune-reveal';el.replaceChildren();delete el.dataset.phase;delete el.dataset.capsule;
      blocked.forEach(([node,inert])=>node.inert=inert);blocked=[];
      if(restoreFocus&&focusBefore?.isConnected)focusBefore.focus({preventScroll:true});focusBefore=null;
    }
    function show(results){
      const safe=safeResults(results);if(!safe.length)return false;
      hide({restoreFocus:false});focusBefore=doc.activeElement;
      blocked=[...el.parentElement.children].filter(node=>node!==el).map(node=>[node,node.inert]);blocked.forEach(([node])=>node.inert=true);
      state={results:safe,index:0,phase:'drop'};el.hidden=false;ctx.sound?.('shrineDrawBell');drop();return true;
    }
    el.addEventListener('click',event=>{const button=event.target.closest('button[data-capsule-action]');if(button&&!button.disabled)act(button.dataset.capsuleAction);});
    doc.addEventListener('keydown',event=>{
      if(!state)return;
      if(event.key==='Escape'||event.key==='x'){event.preventDefault();event.stopPropagation();if(!event.repeat)act('close');return;}
      if(event.key==='Tab'){
        const buttons=[...el.querySelectorAll('button:not([disabled])')],index=buttons.indexOf(doc.activeElement),next=(index+(event.shiftKey?-1:1)+buttons.length)%buttons.length;
        event.preventDefault();event.stopPropagation();buttons[next]?.focus();return;
      }
      if(event.key==='z'||(['Enter',' '].includes(event.key)&&!el.contains(doc.activeElement))){event.preventDefault();event.stopPropagation();if(!event.repeat)act(primary()?.dataset.capsuleAction);}
      else if(event.repeat&&['Enter',' '].includes(event.key)){event.preventDefault();event.stopPropagation();}
    },true);
    function suspend(){
      if(!state)return;
      win.clearTimeout(timer);timer=0;ctx.stopSound?.();
      // Finish the current visual transition on return, without replaying audio.
      if(state.phase==='drop')pending=()=>{state.phase='sealed';render(true);};
      else if(state.phase==='opening')pending=()=>{state.phase='revealed';render(true);};
      el.classList.add('fortune-paused');
    }
    function resume(){if(state&&!doc.hidden){el.classList.remove('fortune-paused');const fn=pending;pending=null;fn?.();}}
    doc.addEventListener('visibilitychange',()=>doc.hidden?suspend():resume());
    win.addEventListener('pagehide',suspend);win.addEventListener('pageshow',resume);
    return Object.freeze({show,hide});
  }
  return Object.freeze({colors,colorFor,capsule,safeResults,historyMarkup,create});
});
