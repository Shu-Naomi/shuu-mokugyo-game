/* Grandfather's fishing notes: read-only views of the existing game catalogue. */
(function(root,factory){
 const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;
 else root.ShuLakeResearch=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(){
 'use strict';
 const habitats={all:'すべての水辺',lake:'湖・池',river:'川',sea:'海'};
 const basics=[
  {title:'餌・針・距離',text:'餌で魚の好み、針でサイズ帯、投げる距離で水辺を探る。魚の覚え書きと見比べよう。'},
  {title:'食いついたら、アワセ',text:'食いつきが出たら、一度Aを離して押し直す。針が掛かったら、選んだ水中ファイトへ。'},
  {title:'引くとき・待つとき',text:'ぬし釣り式は、魚が走る間は離し、糸が緩んだらA。ゲージ式は糸の張りを見て引こう。'},
  {title:'スプーンで誘う',text:'ルアーロッドとスプーンでAを押して誘う。近づく魚を見て、食いついてからアワセよう。'}
 ];
 function model(state,data){
  const caught=id=>Number(state.caught?.[id])>0;
  const names=(ids,table)=>(ids||[]).map(id=>table[id]?.name).filter(Boolean);
  const ordinary=data.fish.filter(f=>!data.legendary(f.id)).map(f=>{
   const note=data.encyclopedia[f.id]||{},tackle=data.tackle.species[f.id]||{};
   return {id:f.id,name:f.name,habitats:note.habitats||[],locations:note.locations||'記録なし',
    time:note.time||'記録なし',ecology:note.ecology||'記録なし',tip:note.tip||'記録なし',
    baits:names(note.baits,data.baits),rods:names(note.rods,data.rods),
    hook:data.tackle.hooks[tackle.recommendedHook||tackle.band||'medium']?.name||'記録なし',caught:caught(f.id)};
  });
  const visits=state.lakeStory?.visited||{},clues=[];
  const gates=[['nushi',true,'湖の深場'],['streamNushi',visits.stream===true,'渓流の深場'],
   ['coastNushi',visits.coast===true,'小島の深場'],['caveNushi',visits.cave===true,'地下湖の深場'],
   ['starNushi',data.finalReady(state),'夜の湖']];
  // Reading never announces ordinary-fish completion or reveals an unknown name.
  const hiddenNames=data.fish.filter(f=>data.legendary(f.id)&&!caught(f.id)).map(f=>f.name).sort((a,b)=>b.length-a.length);
  const mask=text=>hiddenNames.reduce((s,name)=>s.split(name).join('まだ見ぬ一匹'),String(text||'記録なし'));
  for(const [id,visited,label]of gates){
   const fish=data.fish.find(f=>f.id===id),note=data.encyclopedia[id];
   if(!fish||!note||(!visited&&!caught(id)))continue;
   clues.push({id,name:caught(id)?fish.name:label,known:caught(id),
    locations:mask(note.locations),time:mask(note.time),tip:mask(note.tip)});
  }
  return {fish:ordinary,clues,basics,habitats};
 }
 function create(element){
  const doc=element.ownerDocument,find=id=>element.querySelector('#'+id);
  let current,section='basics',habitat='all',selected=null;
  const node=(tag,text,className)=>{
   const n=doc.createElement(tag);if(text!==undefined)n.textContent=text;if(className)n.className=className;return n;
  };
  function fact(label,value){
   const row=node('div',undefined,'research-fact');row.append(node('dt',label),node('dd',value));return row;
  }
  function card(title,text){
   const card=node('section',undefined,'research-card');card.append(node('h4',title),node('p',text));return card;
  }
  function populate(){
   const entries=current.fish.filter(f=>habitat==='all'||f.habitats.includes(habitat));
   if(!entries.some(f=>f.id===selected))selected=entries[0]?.id||null;
   find('lakeResearchFish').replaceChildren(...entries.map(f=>{
    const option=node('option',f.name);option.value=f.id;return option;
   }));
   find('lakeResearchFish').value=selected||'';
   find('lakeResearchFish').disabled=!entries.length;
  }
  function render(){
   const body=find('lakeResearchDetail');body.replaceChildren();
   find('lakeResearchBasics').setAttribute('aria-pressed',String(section==='basics'));
   find('lakeResearchClues').setAttribute('aria-pressed',String(section==='clues'));
   element.dataset.section=section;
   if(section==='fish'){
    const fish=current.fish.find(f=>f.id===selected);
    find('lakeResearchTitle').textContent=fish?.name||'魚の覚え書き';
    if(!fish){body.append(node('p','この水辺の記録はまだない。'));return;}
    body.append(node('p',fish.caught?'自分の釣果にも記録がある魚。':'祖父の覚え書き。自分の図鑑への登録は、釣り上げてから。','research-caption'));
    const list=node('dl',undefined,'research-facts');
    for(const [label,value]of [['釣り場',fish.locations],['時間帯',fish.time],['餌の目安',fish.baits.join('・')||'記録なし'],
     ['針の目安',fish.hook],['竿の目安',fish.rods.join('・')||'記録なし']])list.append(fact(label,value));
    body.append(list,card('狙うときのメモ',fish.tip));
    const more=node('details',undefined,'research-ecology');more.append(node('summary','魚の特徴'),node('p',fish.ecology));body.append(more);
   }else if(section==='clues'){
    find('lakeResearchTitle').textContent='ヌシの手がかり';
    body.append(node('p','祖父が追っていた、深い水の記録。訪れた水辺の頁から読んでみよう。','research-caption'));
    for(const clue of current.clues){
     const note=card(clue.name,clue.tip);note.dataset.researchClue=clue.id;
     note.append(node('small',clue.locations+' ／ '+clue.time));body.append(note);
    }
   }else{
    find('lakeResearchTitle').textContent='祖父の釣り帳';
    body.append(node('p','水辺と仕掛けを見比べて、一投ずつ確かめよう。','research-caption'));
    const grid=node('div',undefined,'research-basics-grid');
    for(const note of current.basics)grid.append(card(note.title,note.text));
    body.append(grid);
   }
   find('lakeResearchArticle').scrollTop=0;
  }
  find('lakeResearchBasics').onclick=()=>{section='basics';render();};
  find('lakeResearchClues').onclick=()=>{section='clues';render();};
  find('lakeResearchHabitat').onchange=event=>{habitat=event.target.value;populate();section='fish';render();};
  find('lakeResearchFish').onchange=event=>{selected=event.target.value;section='fish';render();};
  const readSelected=()=>{section='fish';render();};
  find('lakeResearchFish').onfocus=readSelected;
  find('lakeResearchFish').addEventListener('pointerdown',readSelected);
  return {show(model){current=model;find('lakeResearchHabitat').replaceChildren(...Object.entries(habitats).map(([id,name])=>{
   const option=node('option',name);option.value=id;return option;}));
   find('lakeResearchHabitat').value=habitat;populate();render();}};
 }
 return {model,create};
});
