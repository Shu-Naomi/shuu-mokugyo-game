/* Short opening dialogue using the existing household, village and companions. */
(function(root,factory){const api=factory(typeof module==='object'&&module.exports?require('./player-options.js'):root.ShuPlayerOptions);
  if(typeof module==='object'&&module.exports)module.exports=api;if(root)root.ShuLakeIntro=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(Options){
  'use strict';
  const version=2;
  const pages=[
    {id:'arrival',title:'祖父の家へ',speaker:'{player}',scene:'home',
      paragraphs:['……懐かしい。子どもの頃は、何度もここへ遊びに来たっけ。','祖父が亡くなり、今度は遺品整理のために、この家へ戻ってきた。']},
    {id:'memory',title:'覚えている水の音',speaker:'{player}',scene:'village',
      paragraphs:['じいちゃんに連れられて、よく湖で釣りをした。','でも今日は片付けだけ。終わったら、元の暮らしへ帰るつもりだ。']},
    {id:'notebook',title:'竿のそばの手帳',speaker:'祖父の家',scene:'notebook',
      paragraphs:['棚を片付けていると、古い手帳が足もとへ落ちた。','使い込まれた表紙。開くと、魚の絵と細かな記録が並んでいる。']},
    {id:'researcher',title:'祖父の歩いてきた道',speaker:'祖父の手帳',scene:'notebook',
      paragraphs:['若い頃の肩書きは「生物研究員」。','引退後はこの村に移り、湖の伝説のヌシを追い続けていた。']},
    {id:'wish',title:'会いたかった一匹',speaker:'祖父の手帳',scene:'notebook',
      paragraphs:['「一度でいい。あのヌシに会いたい。」','何年分もの記録。けれど、釣り上げたという頁は見つからない。']},
    {id:'sam',title:'戸口からの声',speaker:'サム',scene:'sam',
      paragraphs:['それ、じいさんの手帳だろう。','釣具屋のサムだ。じいさんとは、昔からの釣り仲間でな。']},
    {id:'invitation',title:'古い友人の誘い',speaker:'サム',scene:'sam',
      paragraphs:['あれだけヌシに会いたがってたのにな。','……どうだ。今度はお前が、釣ってみないか？']},
    {id:'refusal',title:'片付けに来ただけ',speaker:'{player}',scene:'sam',
      paragraphs:['遺品整理に来ただけです。','片付けが終わったら帰ります。釣りをするつもりは……。']},
    {id:'push',title:'話の早い釣具屋',speaker:'サム',scene:'sam',
      paragraphs:['道具なら、うちの店で何とかなるぞ。','まずは湖をひと回りしてだな――。']},
    {id:'retort',title:'まだ返事の途中です',speaker:'{player}',scene:'sam',
      paragraphs:['人の話、聞いてます？']},
    {id:'puppies',title:'戸口からの足音',speaker:'祖父の家',scene:'puppies',
      paragraphs:['戸口の方から、小さな足音が重なって聞こえた。祖父が世話をしていた三匹だ。','{shuu}、{riku}、{grey}が、そばへ駆け寄ってきた。']},
    {id:'cling',title:'小さなぬくもり',speaker:'{dog}',scene:'cling',
      paragraphs:['くぅん……','{dog}は服の裾に鼻を寄せ、そっと体をすり寄せた。']},
    {id:'care',title:'この家に残されたもの',speaker:'サム',scene:'cling',
      paragraphs:['お前が離れたら、こいつら誰が面倒見る？','じいさん、こいつらのことも大事にしてたんだ。']},
    {id:'decision',title:'ここで、しばらく',speaker:'{player}',scene:'cling',
      paragraphs:['……分かりました。しばらく、ここに残ります。','でも、ヌシを釣る約束まではしてませんからね。']},
    {id:'welcome',title:'まずは、今日の暮らし',speaker:'サム',scene:'puppies',
      paragraphs:['ああ。まずは、三匹との暮らしからだ。','道具が要るときは店へおいで。……釣りの話も、そのうちな。']},
    {id:'first-day',title:'最初の一日',speaker:'村での暮らし',scene:'village',
      paragraphs:['まずは、すぐ左の家と三匹の様子を見てみよう。','道具の相談はサムの店へ。物語はメニューの「湖の手帳」で読み返せる。']},
  ];
  const byId=Object.fromEntries(pages.map((p,index)=>[p.id,index]));
  const legacySteps=['arrival','notebook','sam','puppies','decision'];
  const bounded=(value,max)=>Number.isInteger(value)?Math.max(0,Math.min(max,value)):0;
  function progress(old={}){
    if(!old||typeof old!=='object'||Array.isArray(old))old={};
    const modern=(typeof old.introVersion==='number'&&old.introVersion>=version)||(typeof old.version==='number'&&old.version>=2);
    const index=modern?(typeof old.introStep==='string'&&Object.hasOwn(byId,old.introStep)?byId[old.introStep]:bounded(old.introPage,pages.length-1))
      :byId[legacySteps[bounded(old.introPage,legacySteps.length-1)]];
    return {introVersion:version,introStep:pages[index].id,introPage:index};
  }
  function checkpoint(story,index){const page=pages[bounded(index,pages.length-1)];Object.assign(story,{introVersion:version,introStep:page.id,introPage:byId[page.id]});}
  function cast(state={}){
    if(typeof state==='string')state={dog:'riku',dogNames:{riku:state}};
    if(!state||typeof state!=='object'||Array.isArray(state))state={};
    const names=Options.dogNames(state.dogNames),dog=['shuu','riku','grey'].includes(state.dog)?state.dog:'riku';
    return {player:Options.name(state.playerName),avatar:Options.gender(state.avatar),dog,names,companion:names[dog]};
  }
  function substitute(line,state){const c=cast(state),tokens={player:c.player,dog:c.companion,...c.names};return line.replace(/\{(player|dog|shuu|riku|grey)\}/g,(_,key)=>tokens[key]);}
  function text(page,state){return page.paragraphs.map(line=>substitute(line,state));}
  function speaker(page,state){return substitute(page.speaker,state);}
  const objective='まずは家と三匹の様子を見てみよう。道具の相談はサムの店へ。';
  // Storybook paintings share one south-door camera. Dialogue/save identifiers above
  // are deliberately unchanged: a visual revision must never migrate the story.
  const art={village:'assets/terrain-world-v54.png',home:'assets/player-home-interior-v160.webp',diaryTurn:'assets/opening-storybook-diary-turn-v1.webp',diarySettled:'assets/opening-storybook-diary-settled-v1.webp',diaryResearcher:'assets/opening-storybook-diary-researcher-v1.webp',diaryWish:'assets/opening-storybook-diary-wish-v1.webp'};
  const images=new Map(),failed=new Set(),ids=['shuu','riku','grey'];
  const clamp=x=>Math.max(0,Math.min(1,x));
  const durations={arrival:.7,memory:.7,notebook:1.6,researcher:1.6,wish:1.6,sam:.9,invitation:.9,refusal:.8,push:.8,retort:.8,puppies:1.1,cling:1.1,care:.8,decision:.8,welcome:.8,'first-day':.7};
  function pageFor(value){return typeof value==='object'?value:pages[byId[value]]||pages.find(p=>p.scene===value)||pages[0];}
  function panelFor(value,state={}){
    const p=pageFor(value),c=cast(state);
    if(p.scene==='village')return 'village';
    if(p.id==='arrival')return 'home';
    if(p.scene==='notebook')return 'diary';
    const action={sam:'call',invitation:'call',refusal:'refusal',push:'refusal',retort:'nose',puppies:'threshold'}[p.id];
    return c.avatar+'-'+(action||'cling-'+c.dog);
  }
  const revisedPanels=new Set(['boy-call','girl-call','boy-refusal','girl-refusal','boy-nose','girl-nose']);
  function sourceFor(panel){return art[panel]||'assets/opening-storybook-'+panel+(revisedPanels.has(panel)?'-v2.webp':'-v1.webp');}
  // Adjacent dialogue pages turn consecutive spreads, never restart the diary.
  const diarySpreads={
    notebook:{from:sourceFor('diary'),to:art.diarySettled},
    researcher:{from:art.diarySettled,to:art.diaryResearcher},
    wish:{from:art.diaryResearcher,to:art.diaryWish}
  };
  function diarySpreadFor(value){return diarySpreads[pageFor(value).id]||diarySpreads.notebook;}
  function diarySources(value){const spread=diarySpreadFor(value);return [...new Set([sourceFor('diary'),art.diaryTurn,spread.from,spread.to])];}
  // Regions use the 640 × 360 painting coordinate system. Only this small area
  // can move; the camera, doorway, people and dogs never slide as whole sprites.
  function regionFor(panel){
    if(panel==='diary')return {kind:'turn',region:[128,15,394,288]};
    if(panel==='home')return {kind:'light',region:[250,100,95,35]};
    if(panel==='village')return {kind:'light',region:[250,120,90,28]};
    if(panel.includes('cling'))return {kind:'breath',region:[232,259,40,37]};
    if(panel.endsWith('threshold'))return {kind:'breath',region:[356,151,93,49]};
    if(panel.endsWith('nose'))return {kind:'breath',region:[420,149,17,30]};
    if(panel.endsWith('refusal'))return {kind:'breath',region:[189,220,34,34]};
    return {kind:'page',region:[150,233,43,28]};
  }
  function pose(value,seconds=Infinity,state={}){
    const page=pageFor(value),c=cast(state),panel=panelFor(page,state),duration=durations[page.id],
      elapsed=Number.isFinite(seconds)?Math.max(0,Math.min(duration,seconds)):duration;
    return {id:page.id,scene:page.scene,panel,avatar:c.avatar,favorite:c.dog,duration,elapsed,settled:elapsed>=duration,
      animation:{...regionFor(panel),progress:elapsed/duration}};
  }
  function image(src,redraw){
    let im=images.get(src);
    if(!im){im=new Image();images.set(src,im);im.onload=redraw;im.onerror=()=>{failed.add(src);redraw();};im.src=src;}
    else if(!im.complete){im.onload=redraw;im.onerror=()=>{failed.add(src);redraw();};}
    return im.complete&&im.naturalWidth?im:null;
  }
  // The printed leaf is a small ruled surface, not three interchangeable stills.
  // Integer columns and nearest-neighbour sampling keep the ink crisp at 12 fps.
  // Its outer edge travels right -> spine -> left; the spine itself never moves.
  function diaryLeaf(progress){
    const t=clamp((progress-.08)/.84),angle=Math.PI*(t*t*(3-2*t));
    const front=t<.5,span=Math.cos(angle)*(front?192:188),lift=Math.sin(angle)*64;
    return {phase:progress<=.08?'start':progress>=.92?'settled':t<.42?'rise':t<.58?'cross':'settle',
      front,edgeX:Math.round(324+span),lift:Math.round(lift),span};
  }
  // Follow the actual paper outline. Both forearms and the thumb/fingertips on
  // the left page are foreground, so they are always restored from the base.
  const diaryPaper=[[134,92],[145,81],[264,77],[307,81],[324,88],[343,81],[462,77],[504,81],[518,94],[520,281],[513,295],[334,300],[324,303],[310,297],[139,297],[132,289]];
  const diaryHand=[[20,360],[30,332],[38,287],[46,255],[64,230],[85,216],[109,207],[119,202],[126,203],[130,210],[137,212],[143,220],[141,234],[132,253],[130,267],[139,264],[146,266],[151,273],[147,286],[140,301],[133,314],[120,330],[106,343],[99,360]];
  function outline(ctx,points){ctx.beginPath();for(let i=0;i<points.length;i++)ctx[i?'lineTo':'moveTo'](...points[i]);ctx.closePath();}
  function painting(ctx,im){ctx.drawImage(im,0,0,im.naturalWidth,im.naturalHeight,0,0,640,360);}
  function paintDiarySpread(ctx,base,spread){
    // Canonical composition shared by a previous final and the next initial.
    // Asset changes outside the paper can never move the original foreground.
    ctx.save();ctx.beginPath();ctx.rect(128,15,394,288);ctx.clip();
    ctx.save();outline(ctx,diaryPaper);ctx.clip();painting(ctx,spread);ctx.restore();
    ctx.save();outline(ctx,diaryHand);ctx.clip();painting(ctx,base);ctx.restore();ctx.restore();
  }
  function paintDiary(ctx,base,from,settled,progress,data){
    const leaf=diaryLeaf(progress);data.turnPhase=leaf.phase;data.leafEdgeX=String(leaf.edgeX);
    if(leaf.phase==='start'){if(from!==base)paintDiarySpread(ctx,base,from);return;}
    if(leaf.phase!=='settled'&&from!==base)paintDiarySpread(ctx,base,from);
    ctx.save();ctx.beginPath();ctx.rect(128,15,394,288);ctx.clip();
    ctx.save();outline(ctx,diaryPaper);ctx.clip();
    if(leaf.phase==='settled')painting(ctx,settled);
    else {ctx.beginPath();ctx.rect(324,76,198,227);ctx.clip();painting(ctx,settled);}
    ctx.restore();
    if(leaf.phase!=='settled'){
      // A hard-edged, narrow contact shadow, never a blurred/doubled fish layer.
      ctx.save();outline(ctx,diaryPaper);ctx.clip();ctx.fillStyle='rgba(78,43,15,.18)';
      outline(ctx,[[324,303],[leaf.edgeX,295-leaf.lift],[leaf.edgeX,299],[324,303]]);ctx.fill();ctx.restore();
      const source=leaf.front?from:settled,sx=source.naturalWidth/640,sy=source.naturalHeight/360;
      const width=leaf.front?192:188;
      // Map the source paper's bowed top/bottom edges onto the lifted leaf.
      // No full-frame scaling, alpha blend, bitmap allocation or per-pixel loop.
      for(let col=0;col<width;col+=2){
        const u=col/width,v=Math.min(1,(col+2)/width),a=Math.round(324+leaf.span*u),b=Math.round(324+leaf.span*v);
        if(a===b)continue;
        const middle=(u+v)/2,sourceX=leaf.front?324+col:324-col-2;
        // The settled painting includes a foreground thumb at x134–151. Never
        // print that hand onto the moving reverse; use unmarked parchment
        // from the same page margin, without repeating a column of written ink.
        const top=Math.round(88-10*Math.sin(middle*Math.PI*.8)),bottom=Math.round(303-8*middle);
        const rise=Math.round(leaf.lift*Math.pow(middle,.75)),height=bottom-top;
        if(!leaf.front&&sourceX<152){
          ctx.drawImage(source,sourceX*sx,top*sy,2*sx,(203-top)*sy,Math.min(a,b),top-rise,Math.abs(b-a),203-top);
          ctx.drawImage(source,144*sx,104*sy,2*sx,90*sy,Math.min(a,b),203-rise,Math.abs(b-a),bottom-203);
        }else ctx.drawImage(source,sourceX*sx,top*sy,2*sx,height*sy,Math.min(a,b),top-rise,Math.abs(b-a),height);
      }
      // Keep an edge-on sheet readable for one pixel-art beat at the spine.
      if(Math.abs(leaf.span)<5){ctx.fillStyle='#f3d68e';ctx.fillRect(322,24,3,279);}
    }
    ctx.save();outline(ctx,diaryHand);ctx.clip();painting(ctx,base);ctx.restore();ctx.restore();
  }
  function paint(canvas,value,redraw=()=>{},state={},model=pose(value,Infinity,state)){
    // Standalone callers may use an OffscreenCanvas or an older sprite pose.
    // Normalize that input to the current still, without reviving choreography.
    if(!model?.panel||!model?.animation)model=pose(value,Infinity,state);
    const data=canvas.dataset||{};
    if(canvas.width!==640)canvas.width=640;if(canvas.height!==360)canvas.height=360;
    const ctx=canvas.getContext('2d'),src=sourceFor(model.panel),im=image(src,redraw);
    ctx.imageSmoothingEnabled=false;ctx.fillStyle='#211912';ctx.fillRect(0,0,640,360);
    data.panel=model.panel;data.artState=im?'ready':failed.has(src)?'error':'loading';
    data.region=model.animation.region.join(',');
    if(!im){
      ctx.fillStyle='#d7c09a';ctx.font='16px sans-serif';ctx.textAlign='center';
      ctx.fillText(failed.has(src)?'絵を読み込めませんでした。次の頁へ進めます。':'絵をひらいています…',320,180);
      return;
    }
    ctx.drawImage(im,0,0,im.naturalWidth,im.naturalHeight,0,0,640,360);
    const {kind,region,progress}=model.animation;
    if(kind==='turn'){
      const spread=diarySpreadFor(model.id||value),curled=image(art.diaryTurn,redraw),from=image(spread.from,redraw),settled=image(spread.to,redraw);
      data.diaryFrom=spread.from;data.diaryTo=spread.to;
      if(!curled||!from||!settled){
        // A newly requested destination may still be decoding. Keep the known
        // previous spread visible, rather than flashing back to the first fish.
        if(from)paintDiary(ctx,im,from,from,0,data);
        data.artState=diarySources(model.id||value).some(s=>failed.has(s))?'error':'loading';return;
      }
      // All paintings stay decoded for the existing loading/completion contract.
      // The curled illustration remains available as a reference, but motion now
      // comes from one opaque textured leaf rather than holding that still.
      paintDiary(ctx,im,from,settled,progress,data);
      return;
    }
    // A single, finite, edge-feathered local deformation: the leaf lifts then
    // settles, or a puppy takes one small breath. No looping or whole-image pan.
    const pulse=Math.sin(Math.PI*clamp(progress))**2;if(pulse<.001)return;
    const [x,y,w,h]=region;
    if(kind==='light'){
      ctx.save();ctx.globalAlpha=.08*pulse;ctx.fillStyle='#ffe6a0';ctx.fillRect(x,y,w,h);ctx.restore();return;
    }
    const sx=im.naturalWidth/640,sy=im.naturalHeight/360;
    ctx.save();ctx.beginPath();ctx.rect(x,y,w,h);ctx.clip();
    for(let row=0;row<h;row+=2){
      const envelope=Math.sin(Math.PI*row/h),lift=Math.round(pulse*envelope*(kind==='page'?3:1));
      ctx.drawImage(im,x*sx,(y+row+lift)*sy,w*sx,2*sy,x,y+row,w,2);
    }
    ctx.restore();
  }
  // One short, cancellable RAF sequence. Loading and user-paced navigation do
  // not advance dialogue, save progress, change RNG, or alter game resources.
  function present(canvas,value,state={},options={}){
    const page=pageFor(value),doc=canvas.ownerDocument,env=doc?.defaultView||globalThis;
    const clock=options.clock||{now:()=>env.performance.now(),request:fn=>env.requestAnimationFrame(fn),cancel:id=>env.cancelAnimationFrame(id)};
    const media=options.media||env.matchMedia?.('(prefers-reduced-motion: reduce)'),duration=durations[page.id];
    const timers=options.timers||{set:(fn,ms)=>env.setTimeout(fn,ms),clear:id=>env.clearTimeout(id)};
    let live=true,handle=0,deadline=null,start=null,elapsed=media?.matches?duration:0,finished=Boolean(media?.matches),last=-Infinity;
    const src=sourceFor(panelFor(page,state)),needed=page.scene==='notebook'?diarySources(page):[src];
    const ready=()=>needed.every(source=>{const im=images.get(source);return Boolean(im?.complete&&im.naturalWidth)||failed.has(source);});
    const cancelFrame=()=>{if(handle)clock.cancel(handle);handle=0;};
    const clearDeadline=()=>{if(deadline!==null)timers.clear(deadline);deadline=null;};
    function startWhenReady(now){
      if(start!==null||!ready())return;start=now;
      // A missed/throttled animation frame must never leave the leaf half turned.
      // The deadline starts only after every required painting has decoded.
      if(!finished)deadline=timers.set(()=>{deadline=null;settle();},duration*1000);
    }
    function draw(now){
      paint(canvas,page,redraw,state,pose(page,elapsed,state));last=now;
      canvas.dataset.step=page.id;canvas.dataset.motion=finished||elapsed>=duration?'still':start===null?'loading':'running';
    }
    function schedule(){if(live&&!doc?.hidden&&!finished&&start!==null&&elapsed<duration&&!handle)handle=clock.request(tick);}
    function redraw(){
      if(!live||doc?.hidden)return;
      const now=clock.now();startWhenReady(now);
      elapsed=finished?duration:start===null?0:Math.min(duration,(now-start)/1000);
      draw(now);startWhenReady(now);schedule();
    }
    function tick(now){
      handle=0;if(!live||doc?.hidden||finished)return;
      elapsed=Math.min(duration,(now-start)/1000);if(elapsed>=duration){finished=true;clearDeadline();}
      if(now-last>=1000/12||finished)draw(now);schedule();
    }
    function settle(){if(!live)return;finished=true;elapsed=duration;cancelFrame();clearDeadline();redraw();}
    function visibility(){if(doc.hidden){finished=true;elapsed=duration;cancelFrame();clearDeadline();}else redraw();}
    const motion=()=>{if(media.matches)settle();};
    doc?.addEventListener('visibilitychange',visibility);media?.addEventListener?.('change',motion);
    for(const source of needed)image(source,redraw);redraw();
    return {cancel(){if(!live)return;live=false;cancelFrame();clearDeadline();doc?.removeEventListener('visibilitychange',visibility);media?.removeEventListener?.('change',motion);
      for(const im of images.values())if(im.onload===redraw){im.onload=null;im.onerror=null;}canvas.dataset.motion='stopped';},
      snapshot:()=>({active:live,scheduled:Boolean(handle),elapsed,pose:pose(page,elapsed,state)})};
  }
  return {version,pages,art,text,speaker,cast,progress,checkpoint,objective,panelFor,sourceFor,regionFor,diarySpreads,diarySpreadFor,diarySources,diaryLeaf,diaryPaper,diaryHand,pose,paint,present};
});
