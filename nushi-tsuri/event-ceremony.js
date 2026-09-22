/* Pixel result stages. Presentation never rolls, pays, or edits a saved result. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.ShuEventCeremony=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(){
  'use strict';
  const kinds={angling:'釣り大会',bond:'なつき度コンテスト',tricks:'芸コンテスト',fish:'魚の品評会'};
  const palettes={gold:['#fff2b3','#efbd55','#ab6935'],silver:['#eefbff','#b0d3dd','#628aab'],bronze:['#ffe0b3','#d79968','#97554f'],fourth:['#c8f9d6','#7bba9d','#3e797e'],fifth:['#d9ddff','#a4a4dc','#666693'],thanks:['#eee5ce','#b6b7a1','#687d7e']};
  const escape=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  function result(value={}){
    const kind=Object.hasOwn(kinds,value.kind)?value.kind:'angling';
    const rank=Math.max(1,Math.min(5,Math.floor(Number(value.rank)||5)));
    const completed=value.completed!==false;
    const tier=completed?['gold','silver','bronze','fourth','fifth'][rank-1]:'thanks';
    const subject=/^[a-z][a-z0-9-]{0,39}$/.test(value.subject||'')?value.subject:'';
    return {kind,rank,tier,subject,completed,tied:value.tied===true};
  }
  const rect=(x,y,w,h,fill,extra='')=>`<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${fill}" ${extra}/>`;
  function star(x,y,c){return `<path d="M${x+4} ${y}h4v4h4v4h-4v4h-4V${y+8}h-4V${y+4}h4z" fill="${c}"/>`;}
  function heart(x,y,c){return `<path d="M${x} ${y+2}h2v-2h4v2h2v-2h4v2h2v6h-2v2h-2v2h-2v2h-2v-2h-2v-2h-2v-2h-2z" fill="${c}"/>`;}
  function scene(value){
    const r=result(value),[light,base,shade]=palettes[r.tier],dog=['bond','tricks'].includes(r.kind);
    let art=rect(0,0,240,120,dog?'#382e51':r.kind==='fish'?'#153f56':'#173345');
    art+=rect(0,0,240,4,shade)+rect(0,116,240,4,shade)+rect(0,4,4,112,shade)+rect(236,4,4,112,shade);
    if(dog){
      art+=rect(4,4,12,86,'#705478')+rect(16,4,8,62,'#986a8d')+rect(216,4,8,62,'#986a8d')+rect(224,4,12,86,'#705478');
      art+=rect(24,4,192,6,'#d99fa1')+rect(26,10,188,3,'#f8c7b0');
      art+=rect(4,96,232,20,'#675779')+rect(4,96,232,3,'#c697a2');
      if(r.kind==='tricks'){
        art+=`<path d="M38 54h16v4h4v24h-4v4H38v-4h-4V58h4z" fill="none" stroke="#eebd75" stroke-width="3"/>`;
        art+=star(184,66,'#f4bd7d');
      }else art+=heart(30,61,'#df91a6')+heart(184,69,'#df91a6');
    }else{
      art+=rect(4,80,232,36,'#245b72')+rect(4,80,232,3,'#76b7b8');
      for(let i=0;i<7;i++)art+=rect(10+i*32,89+(i%3)*6,18,2,'#468397');
      if(r.kind==='fish'){
        art+=rect(22,100,195,12,'#9c9b77')+rect(30,104,180,8,'#b2aa7d');
        for(let i=0;i<3;i++)art+=`<path d="M${36+i*7} 103v-12h-3V${78+i*5}h3v8h3v17z" fill="${i%2?'#6fad8d':'#4e957f'}"/>`;
        art+=rect(188,92,18,10,'#738d95')+rect(193,87,10,5,'#8ca3a5');
      }else{
        art+=`<path d="M29 92l17-51 9-8" fill="none" stroke="#d3a061" stroke-width="3"/><path d="M55 33h17v40h-4" fill="none" stroke="#afd6dc" stroke-width="1"/>`;
        art+=rect(24,93,28,5,'#bd956e')+rect(27,98,5,14,'#846d5b')+rect(45,98,5,14,'#846d5b');
      }
    }
    // A medal at every completed podium rank; encouragement ribbons below it.
    const x=165,y=26;
    if(r.rank===1&&r.completed){
      art+=`<path d="M${x} ${y}h28v6h-3v17h-5v5h-12v-5h-5V${y+6}h-3z" fill="${base}"/>`;
      art+=`<path d="M${x} ${y+8}h-6v10h9m25-10h6v10h-9" fill="none" stroke="${base}" stroke-width="3"/>`;
      art+=rect(x+4,y+3,4,17,light)+rect(x+12,y+28,4,7,shade)+rect(x+5,y+35,18,4,base);
    }else{
      art+=`<path d="M${x+4} ${y+15}l-4 29 11-7 5 7 5-29" fill="${shade}"/>`;
      art+=`<path d="M${x+4} ${y}h18v3h4v20h-4v3h-18v-3h-4V${y+3}h4z" fill="${base}"/>`;
      art+=rect(x+5,y+4,4,14,light)+star(x+9,y+7,shade);
    }
    art+=rect(68,96,94,4,light)+rect(72,100,86,12,base)+rect(72,109,86,3,shade);
    const particles=r.tier==='gold'?12:r.tier==='silver'?8:r.tier==='bronze'?6:4;
    for(let i=0;i<particles;i++){
      const px=27+(i*37)%185,py=17+(i*13)%54;
      const shape=r.kind==='bond'?heart(px,py,i%2?base:'#eea8b9'):r.kind==='fish'?rect(px,py,3,3,light):star(px,py,i%2?base:light);
      art+=`<g class="event-spark" style="--spark:${i%4}">${shape}</g>`;
    }
    return `<svg viewBox="0 0 240 120" xmlns="http://www.w3.org/2000/svg" shape-rendering="crispEdges" aria-hidden="true">${art}</svg>`;
  }
  function markup(value){
    const r=result(value),titles=['優勝、おめでとう！','準優勝、あと一歩！','3位、よく頑張った！','次の挑戦につなげよう','また湖で勝負しよう'];
    const label=r.completed?`${r.tied?'同率':''}${r.rank}位`:`参考 ${r.rank}位`;
    const descriptions={angling:['大きく跳ねる魚と、金のトロフィー。','水しぶきと、きらめく銀のメダル。','波に揺れる魚と、銅のメダル。','小さな跳躍。次はもっと大きな一匹を。','穏やかな波。また腕を磨こう。'],
      bond:['ハートいっぱい、相棒の喜びジャンプ！','しっぽを弾ませ、仲良しステップ。','相棒と一緒に、ぺこりとご挨拶。','ゆっくり一歩ずつ、もっと仲良く。'],
      tricks:['星のステージで、決めの大ジャンプ！','軽やかな二段ステップ！','お辞儀でフィニッシュ！','練習の成果は、次のステージへ。'],
      fish:['宝石みたいな鱗と、金の輝き。','泡の輪を抜けて、銀色の晴れ舞台。','ゆったり泳いで、銅のメダル。','今日のお世話が、明日の輝きに。']};
    return `<div class="event-ceremony" data-event-kind="${r.kind}" data-event-rank="${r.rank}" data-event-tier="${r.tier}" data-event-subject="${escape(r.subject)}" role="group" aria-label="${kinds[r.kind]}・${label}の演出"><div class="event-stage" aria-hidden="true">${scene(r)}<div class="event-subject${['bond','tricks'].includes(r.kind)?' event-dog':' event-fish'}"></div></div><div class="event-caption"><small>${kinds[r.kind]}</small><strong>${label}</strong><b>${r.completed?titles[r.rank-1]:'ここまで、おつかれさま！'}</b><p>${r.completed?descriptions[r.kind][r.rank-1]||descriptions[r.kind][3]:'記録を残して、次の一日に備えよう。'}</p></div></div>`;
  }
  function pose(kind,rank,elapsed,completed=true){
    const tick=Math.floor(Math.max(0,elapsed)*8),phase=tick%32;
    const level=completed?rank:5;
    const jump=level===1?[0,0,-4,-10,-18,-22,-18,-10,-4,0][phase%32]||0:
      level===2?([0,-4,-8,-4,0,-3,-6,-3,0][phase%32]||0):
      level===3?(phase>=3&&phase<7?3:0):level===4?(phase>=4&&phase<10?-2:0):(phase>=5&&phase<13?2:0);
    const fish=kind==='fish',angling=kind==='angling';
    const x=fish?Math.round(Math.sin(phase*Math.PI/16)*(level<=2?8:4)/2)*2:level===2&&phase<9?(phase%2?2:-2):0;
    const y=fish?Math.round(jump*.35/2)*2:jump;
    return {frame:tick%8,x,y,angle:fish?0:level===3&&phase>=3&&phase<7?7:angling&&jump<0?-8:0,
      dogPose:jump<0?(phase%2?'walk-a':'walk-b'):'stand'};
  }
  function create({document,paintSubject}){
    const win=document.defaultView,media=win.matchMedia('(prefers-reduced-motion: reduce)');
    const elapsed=new WeakMap();let frame=0,last=0,nodes=[];
    function stop(){if(frame)win.cancelAnimationFrame(frame);frame=0;last=0;}
    function paint(now){
      frame=0;
      if(document.hidden){stop();return;}
      if(!media.matches&&last&&now-last<120){frame=win.requestAnimationFrame(paint);return;}
      nodes=nodes.filter(node=>node.isConnected&&node.closest('.modal.open'));
      if(!nodes.length){stop();return;}
      const delta=last?Math.min(.15,Math.max(0,(now-last)/1000)):0;last=now;
      for(const node of nodes){
        const age=media.matches?0:(elapsed.get(node)||0)+delta;elapsed.set(node,age);
        const data=node.dataset,subject=node.querySelector('.event-subject');
        const p=pose(data.eventKind,Number(data.eventRank),age,data.eventTier!=='thanks');
        subject.style.transform=`translate(${p.x}px,${p.y}px) rotate(${p.angle}deg)`;
        paintSubject(subject,{kind:data.eventKind,id:data.eventSubject,...p});
      }
      if(!media.matches)frame=win.requestAnimationFrame(paint);
    }
    function sync(){
      stop();nodes=[...document.querySelectorAll('.modal.open .event-ceremony')];
      for(const node of nodes)node.classList.toggle('event-paused',document.hidden);
      if(nodes.length&&!document.hidden)paint(win.performance.now());
    }
    document.addEventListener('visibilitychange',sync);
    win.addEventListener('pagehide',stop);win.addEventListener('pageshow',sync);
    media.addEventListener?.('change',sync);
    return {sync,stop,get running(){return Boolean(frame);}};
  }
  return {result,scene,markup,pose,create};
});
