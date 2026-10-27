(function(root,factory){
 const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.ShuFieldGuide=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(){
 'use strict';
 const PAGE_SIZE=3,depths={shallow:'岸際',mid:'中層',deep:'深場'};
 function waterNotes(prefix,{additions,baits,hooks}){
  return additions.definitions.filter(f=>Object.keys(depths).some(d=>additions.pools[prefix+d]?.[f.id]>0)).map(f=>{
   const places=Object.entries(depths).filter(([d])=>additions.pools[prefix+d]?.[f.id]>0).map(([,name])=>name);
   return {id:f.id,text:`${f.name}：${baits[f.baits[0]].name}＋${hooks[f.hook].name}／${places.join('・')}`};
  });
 }
 function model(state,data){
  const offshore=data.offshore&&state.mapRegion===data.offshore.id?data.offshore:null;
  const region=offshore?offshore.id:data.mountain.isRegion(state.mapRegion)?state.mapRegion:state.mapRegion==='coast'?'coast':'village';
  const entries=[],mountain=data.mountain.regions[region];
  function water(id,name,point,polygon,prefix){entries.push({id:'water-'+id,kind:'water',name,point,polygon,notes:waterNotes(prefix,data)});}
  if(offshore){
   for(const p of offshore.fishingPoints)water(p.id,offshore.names[p.id],p,null,'offshore-'+p.id+'-');
   entries.push({id:'offshore-ferry',kind:'exit',name:'星見港への帰り船',point:offshore.entry,notes:[{text:'船着き場でAを押して船長に相談。帰りの運賃は支払い済みで、所持金がなくても港へ戻れるよ。'}]},
    {id:'offshore-rest',kind:'house',name:'島の休憩所',point:offshore.rest,notes:[{text:'Aで30分休み、体力を30回復。無料で利用できるよ。'}]},
    {id:'offshore-lighthouse',kind:'house',name:'灯台のふもと',point:offshore.lighthouse,notes:[{text:'坂道をたどって灯台のふもとへ。潮風島の景色を見渡せるよ。'}]});
  }else if(mountain){
   for(const [id,polygon]of Object.entries(mountain.waters)){
    const point=polygon.reduce((p,[x,y])=>({x:p.x+x/polygon.length,y:p.y+y/polygon.length}),{x:0,y:0});
    water(id,data.mountain.names[id],point,polygon,'mountain-'+id+'-');
   }
   for(const b of data.life.buildings.filter(b=>b.region===region))entries.push({id:b.id,kind:b.kind,name:b.name,point:{x:b.x,y:b.y},building:b,
    notes:[{text:b.kind==='shop'?'扉へ向いてAで入店。いつものエサや道具を補充できるよ。':'扉へ向いてAで入れるよ。家の人とひと息ついていこう。'}]});
   const gate=mountain.returnGate,point={x:(gate.left+gate.right)/2,y:(gate.top+gate.bottom)/2};
   const exits=[{id:'return',name:'来た道の入口',point},...mountain.landmarks.map(l=>({...l,point:{x:l.x,y:l.y}}))];
   for(const e of exits){const target=data.mountain.exitAt(e.point.x,e.point.y,region);if(!target)continue;
    entries.push({id:'exit-'+e.id,kind:'exit',name:e.name,point:e.point,notes:[{text:`道をたどり、ここでAを押すと${target.region==='village'?'村':data.mountain.regionData(target.region).name}へ進めるよ。`}]});}
  }else if(region==='coast'){
   for(const [id,name]of [['sand','白砂の小島'],['reef','岩礁の小島']])water(id,name,data.coast.docks[id].land,null,'coast-'+id+'-');
   entries.push({id:'coast-harbor',kind:'exit',name:data.coast.docks.harbor.name,point:data.coast.docks.harbor.land,notes:[{text:'小島からは舟でこの桟橋へ。ここでAを押すと村へ戻れるよ。'}]});
  }else{
   water('lake','星降る湖',{x:118,y:33},data.lakePolygon,'lake-');
   water('river','民家川',{x:88,y:109},null,'river-');
   water('sea','潮見浜・港',{x:195,y:122},null,'sea-');
   if(Array.isArray(data.villagePlaces))entries.push(...data.villagePlaces);
   if(data.offshore)entries.push({id:'village-ferry',kind:'exit',name:'潮風島への漁船',point:data.offshore.harbor,notes:[{text:'船長タツにAで相談。潮風島へ往復800円・片道1時間。帰りもこの漁船で戻れるよ。'}]});
  }
  return {region,name:offshore?.name||mountain?.name||(region==='coast'?'海の小島':'星降る湖と村'),asset:offshore?.assets.world||mountain?.asset||(region==='coast'?'assets/coast-world-v197.webp':'assets/terrain-world-v54.png'),
   entries,buildings:data.life.buildings.filter(b=>b.region===region),player:{x:state.x,y:state.y},playerLabel:state.home?'家の入口':'現在地'};
 }
 function create({element,life}){
  const doc=element.ownerDocument,find=id=>element.querySelector('#'+id),svgNS='http://www.w3.org/2000/svg';let current,selected=0,page=0,notePage=0;
  const makeSvg=(name,attrs)=>{const n=doc.createElementNS(svgNS,name);for(const [k,v]of Object.entries(attrs))n.setAttribute(k,String(v));return n;};
  const image=new Image();image.onload=()=>{if(current)paintBuildings();};
  function paintBuildings(){
   const layer=find('fieldGuideBuildings');layer.replaceChildren();
   for(const b of current.buildings){const c=doc.createElement('canvas');c.width=256;c.height=Math.round(256*b.h/b.w);c.setAttribute('aria-hidden','true');
    const bounds=life.footprint(b);c.style.cssText=`left:${(bounds.left+bounds.right)/2/2.4}%;top:${b.y/1.35}%;width:${b.w/2.4}%;height:${b.h/1.35}%`;
    layer.append(c);if(image.complete&&image.naturalWidth)life.drawBuilding(c,image,b.sprite);
   }
  }
  function choose(index,focus=false){selected=Math.max(0,Math.min(current.entries.length-1,index));page=Math.floor(selected/PAGE_SIZE);notePage=0;render();if(focus)find('fieldGuidePlaces').querySelector('[aria-pressed="true"]').focus({preventScroll:true});}
  function render(){
   const entry=current.entries[selected],pages=Math.ceil(current.entries.length/PAGE_SIZE),list=find('fieldGuidePlaces');list.replaceChildren();
   for(const [i,e]of current.entries.entries()){if(Math.floor(i/PAGE_SIZE)!==page)continue;const button=doc.createElement('button');button.type='button';button.dataset.guidePlace=e.id;button.setAttribute('aria-pressed',String(i===selected));
    const mark=doc.createElement('span');mark.setAttribute('aria-hidden','true');mark.textContent={water:'≈',house:'⌂',shop:'⌂',exit:'↪'}[e.kind];button.append(mark,doc.createTextNode(e.name));button.onclick=()=>choose(i,true);
    button.onkeydown=event=>{const delta={ArrowDown:1,ArrowRight:1,ArrowUp:-1,ArrowLeft:-1,PageDown:PAGE_SIZE,PageUp:-PAGE_SIZE}[event.key],index=event.key==='Home'?0:event.key==='End'?current.entries.length-1:delta==null?null:selected+delta;if(index==null)return;event.preventDefault();choose(index,true);};list.append(button);
   }
   find('fieldGuidePrevious').disabled=page===0;find('fieldGuideNext').disabled=page===pages-1;find('fieldGuidePage').textContent=`${page+1} / ${pages}`;
   const map=find('fieldGuideOverlay');map.replaceChildren();
   if(entry.polygon)map.append(makeSvg('polygon',{points:entry.polygon.map(p=>p.join(',')).join(' '),class:'guide-water-outline'}));
   if(entry.building){const b=life.footprint(entry.building);map.append(makeSvg('rect',{x:b.left,y:b.top,width:b.right-b.left,height:b.bottom-b.top,rx:1.5,class:'guide-water-outline'}));}
   map.append(makeSvg('circle',{cx:entry.point.x,cy:entry.point.y,r:4.6,class:'guide-place-ring'}),makeSvg('circle',{cx:current.player.x,cy:current.player.y,r:2.2,class:'guide-player-dot'}));
   find('fieldGuideMap').setAttribute('aria-label',`${current.name}の案内図。選択中：${entry.name}。赤い丸は${current.playerLabel}。`);
   find('fieldGuideLegend').textContent=`● ${current.playerLabel}　◎ 選んだ場所`;
   renderNotes();
  }
  function renderNotes(){
   const entry=current.entries[selected],lines=entry.notes.length?entry.notes:[{text:'水辺に向いてAで釣る。エサ・ハリ・投げる距離を変えて探ろう。'}],pages=Math.ceil(lines.length/PAGE_SIZE),note=find('fieldGuideNote');note.replaceChildren();
   for(const line of lines.slice(notePage*PAGE_SIZE,(notePage+1)*PAGE_SIZE)){const n=doc.createElement('span');n.textContent=line.text;if(line.id)n.dataset.guideFish=line.id;note.append(n);}
   find('fieldGuideNoteLabel').textContent=entry.kind==='water'&&entry.notes.some(n=>n.id)?'この水辺の新顔':'旅のメモ';
   const next=find('fieldGuideNotesNext');next.hidden=pages===1;next.disabled=pages===1;next.textContent=`次の魚 ${notePage+1} / ${pages}`;next.setAttribute('aria-label',`次の魚の案内、${notePage+1} / ${pages}ページ`);
  }
  find('fieldGuideNotesNext').onclick=()=>{notePage=(notePage+1)%Math.ceil(current.entries[selected].notes.length/PAGE_SIZE);renderNotes();};
  find('fieldGuidePrevious').onclick=()=>choose((page-1)*PAGE_SIZE,true);
  find('fieldGuideNext').onclick=()=>choose((page+1)*PAGE_SIZE,true);
  element.addEventListener('keydown',event=>{if(event.key!=='Tab')return;const buttons=[...element.querySelectorAll('button:not(:disabled)')].filter(n=>!n.hidden),first=buttons[0],last=buttons.at(-1);if(event.shiftKey&&doc.activeElement===first){event.preventDefault();last.focus();}else if(!event.shiftKey&&doc.activeElement===last){event.preventDefault();first.focus();}});
  return {show(data){current=data;selected=0;page=0;notePage=0;find('fieldGuideRegion').textContent=data.name;find('fieldGuideMapArt').style.backgroundImage=`url("${data.asset}")`;paintBuildings();if(data.buildings.length&&!image.src)image.src='assets/settlement-buildings-v238.png';render();},select:id=>{const i=current?.entries.findIndex(e=>e.id===id);if(i>=0)choose(i);}};
 }
 return {PAGE_SIZE,waterNotes,model,create};
});
