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
    {id:'puppies',title:'廊下からの足音',speaker:'祖父の家',scene:'puppies',
      paragraphs:['足音の主は、祖父が世話をしていた三匹。','{shuu}、{riku}、{grey}が、そばへ駆け寄ってきた。']},
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
  const art={village:'assets/terrain-world-v54.png',home:'assets/player-home-interior-v160.webp',
    sam:'assets/sam-sprites-v199.webp',boy:'assets/player-boy.png',girl:'assets/player-girl.png',
    boyWalk:'assets/player-boy-walk-v35-final.png',girlWalk:'assets/player-girl-walk-v35-final.png',
    girlFrontWalk:'assets/player-girl-front-walk-v252-8.png',
    shuu:'assets/shuu-walk.png',riku:'assets/riku-walk.png',grey:'assets/grey-walk.png'};
  const ids=['shuu','riku','grey'],images=new Map();
  const clamp=x=>Math.max(0,Math.min(1,x)),ease=x=>{x=clamp(x);return x*x*(3-2*x);};
  const durations={arrival:.45,memory:.55,notebook:.75,researcher:.5,wish:.5,sam:1.1,invitation:.55,refusal:.45,push:.8,retort:.4,puppies:1.6,cling:1.15,care:.35,decision:.4,welcome:.35,'first-day':.55};
  function pageFor(value){return typeof value==='object'?value:pages[byId[value]]||pages.find(p=>p.scene===value)||pages[0];}
  // Presentation only: no clock, RNG, progress, identity or inventory is changed.
  function pose(value,seconds=Infinity,state={}){
    const page=pageFor(value),c=cast(state),duration=durations[page.id]||.5,t=Math.max(0,Math.min(duration,Number(seconds)||0)),p=ease(t/duration);
    const group=['puppies','cling','care','decision','welcome'].includes(page.id),favorite=[c.dog,...ids.filter(id=>id!==c.dog)];
    const player={x:page.scene==='village'?161:136,y:page.scene==='village'?151:148,direction:group||['sam','invitation','refusal','push','retort'].includes(page.id)?'right':'down',walking:false,frame:Math.floor(t*7)%4};
    if(page.id==='refusal'){player.x=136-4*p;player.walking=t<duration;}
    if(page.id==='push'||page.id==='retort')player.x=132;
    if(page.id==='retort'&&t<.3)player.x+=Math.round(Math.sin(t*30)*1.5);
    let sam=null;
    if(page.scene==='sam'||group){
      sam={x:218,y:145,direction:'left',moving:false};
      if(page.id==='sam'){sam.x=166+52*p;sam.y=177-32*p;sam.direction=t<duration?'right':'left';sam.moving=t<duration;}
      if(page.id==='push'){sam.x=218-12*p;sam.moving=t<duration;}
      if(page.id==='retort'){sam.x=206;sam.direction=t<.2?'left':'down';}
      if(group){sam.x=page.id==='puppies'?206+30*p:236;sam.y=142;sam.direction='left';sam.moving=page.id==='puppies'&&t<duration;}
    }
    const dogs=group?favorite.map((id,i)=>{
      let x=[189,225,265][i],moving=false;
      if(page.id==='puppies'){
        const travel=clamp((t-i*.22)/1.12);x=(340+i*20)+(x-340-i*20)*ease(travel);moving=travel<1;
      }else if(i===0){x=page.id==='cling'?189-35*ease(t/.78):154;moving=page.id==='cling'&&t<.78;}
      return {id,x,y:151+(i===1?-1:0),direction:'left',moving,frame:moving?Math.floor(t*8)%4:1,
        nuzzle:page.id==='cling'&&i===0&&t>.78?Math.max(0,Math.sin((t-.78)/.37*Math.PI)):0};
    }):[];
    return {id:page.id,scene:page.scene,kind:page.scene==='notebook'?'paper':group?'reunion':page.scene==='sam'?'conversation':'paper',
      duration,elapsed:t,settled:t>=duration,player,sam,dogs,favorite:c.dog,
      bookOpen:page.id==='notebook'?.12+.88*ease(t/.65):1,
      pageTurn:['researcher','wish'].includes(page.id)?1-p:0,fade:Math.max(0,1-t/.28)*.22};
  }
  function image(src,redraw){
    let result=images.get(src);
    if(!result){result=new Image();images.set(src,result);result.src=src;}
    if(!result.complete)result.onload=redraw;
    return result.complete&&result.naturalWidth?result:null;
  }
  // Use the existing home walk-sheet paw anchors so feet stay on the floor.
  const paws={shuu:[[293,283,283,295],[289,283,283,289],[293,286,286,294]],
    riku:[[357,342,342,353],[288,286,286,291],[230,222,222,230]],
    grey:[[300,296,296,300],[299,299,299,300],[299,294,294,300]]};
  function drawDog(ctx,dog,redraw){
    const im=image(art[dog.id],redraw);if(!im)return;
    const size=dog.id==='riku'?362:320,col={down:0,left:1,right:2,up:3}[dog.direction],row=dog.moving?[0,1,2,1][dog.frame]:1;
    const h=dog.id==='riku'&&row===1?size-12:size,scale=35/size,center=dog.id==='riku'?[215,199,162,150][col]:size/2;
    ctx.drawImage(im,col*size,row*size,size,h,Math.round(dog.x-center*scale),Math.round(dog.y-paws[dog.id][row][col]*scale-dog.nuzzle),35,h*scale);
  }
  function drawPlayer(ctx,actor,avatar,redraw,village){
    const walkSource=avatar==='girl'&&actor.direction==='down'?art.girlFrontWalk:art[avatar+'Walk'];
    let im=actor.walking?(image(walkSource,redraw)||image(art[avatar+'Walk'],redraw)):null;const walking=Boolean(im);im=im||image(art[avatar],redraw);if(!im)return;
    const column=actor.direction==='down'?0:actor.direction==='up'?2:1,fw=im.naturalWidth/3,fh=im.naturalHeight/(walking?2:1),height=village?39:57,width=height*fw/fh;
    ctx.save();ctx.translate(Math.round(actor.x),Math.round(actor.y));if(actor.direction==='right')ctx.scale(-1,1);
    ctx.drawImage(im,column*fw,walking?(actor.frame<2?0:fh):0,fw,fh,-width/2,-height,width,height);ctx.restore();
  }
  function drawSam(ctx,actor,redraw){
    const im=image(art.sam,redraw);if(!im)return;
    const side=actor.direction!=='down',bounds=side?[608,83,298,885]:[147,79,399,884],height=66,width=height*bounds[2]/bounds[3];
    const bob=actor.moving?Math.floor(actor.x/4)%2:0;
    ctx.save();ctx.translate(Math.round(actor.x),Math.round(actor.y-bob));if(actor.direction==='left')ctx.scale(-1,1);
    ctx.drawImage(im,...bounds,-width/2,-height,width,height);ctx.restore();
  }
  function drawNotebook(ctx,model){
    ctx.fillStyle='#55614b';ctx.fillRect(0,0,320,180);ctx.fillStyle='#796044';for(let y=0;y<180;y+=18)ctx.fillRect(0,y,320,2);
    ctx.fillStyle='#3b2d26';ctx.fillRect(53,35,220,120);ctx.fillRect(58,155,208,5);
    ctx.fillStyle='#997847';ctx.fillRect(50,30,220,122);
    ctx.save();ctx.translate(154,0);ctx.scale(model.bookOpen,1);ctx.translate(-154,0);
    ctx.fillStyle='#d9c69c';ctx.fillRect(58,33,94,111);ctx.fillRect(156,33,106,111);
    ctx.fillStyle='#f3e7c5';ctx.fillRect(60,36,89,104);ctx.fillRect(158,36,102,104);
    ctx.fillStyle='#b8a477';ctx.fillRect(149,34,7,108);
    ctx.fillStyle='#dfd1ae';for(let y=56;y<131;y+=15){ctx.fillRect(72,y,64,1);ctx.fillRect(171,y,75,1);}
    ctx.fillStyle='#847556';for(let y=55;y<78;y+=9)ctx.fillRect(73,y,49+(y%3)*5,1);
    // Small pixel field sketches and a dotted route among the old research notes.
    ctx.fillStyle='#697568';for(const [i,w]of [4,8,12,14,12,8,4].entries())ctx.fillRect(98-w/2,88+i*2,w,1);
    ctx.fillRect(105,91,4,6);ctx.fillRect(95,92,1,1);
    for(let y=116;y<132;y+=6)ctx.fillRect(74,y,53,1);
    ctx.fillStyle='#718576';for(const [x,y]of [[180,64],[202,78],[192,96],[231,111]]){ctx.fillRect(x,y,3,3);ctx.fillRect(x+5,y+2,10,1);}
    if(model.pageTurn>0){ctx.fillStyle='#e5d4ac';const width=Math.round(101*model.pageTurn);ctx.fillRect(158,36,width,104);ctx.fillStyle='#fff1cd';ctx.fillRect(158+width-3,36,3,104);}
    ctx.restore();ctx.fillStyle='#4a3730';ctx.fillRect(275,28,4,136);ctx.fillStyle='#bba475';ctx.fillRect(279,30,2,128);ctx.fillRect(274,131,6,23);
  }
  function paint(canvas,scene,redraw=()=>{},state={},model=pose(scene,Infinity,state)){
    const ctx=canvas.getContext('2d'),c=cast(state);ctx.imageSmoothingEnabled=false;ctx.clearRect(0,0,320,180);
    ctx.fillStyle='#173f45';ctx.fillRect(0,0,320,180);
    if(model.scene==='notebook')drawNotebook(ctx,model);
    else{
      const source=image(model.scene==='village'?art.village:art.home,redraw);
      if(source)ctx.drawImage(source,0,0,source.naturalWidth,source.naturalHeight,0,0,320,180);
      else{ctx.fillStyle='#5b7652';ctx.fillRect(0,88,320,92);ctx.fillStyle='#507f8b';ctx.fillRect(38,63,210,47);ctx.fillStyle='#c3aa72';ctx.fillRect(146,101,16,79);}
      const actors=[{y:model.player.y,draw:()=>drawPlayer(ctx,model.player,c.avatar,redraw,model.scene==='village')}];
      if(model.sam)actors.push({y:model.sam.y,draw:()=>drawSam(ctx,model.sam,redraw)});
      for(const dog of model.dogs)actors.push({y:dog.y,draw:()=>drawDog(ctx,dog,redraw)});
      actors.sort((a,b)=>a.y-b.y).forEach(a=>a.draw());
      if(model.dogs.length){ctx.fillStyle='#9a764c';ctx.fillRect(model.player.x+7,model.player.y-27,8,11);ctx.fillStyle='#e6d5a7';ctx.fillRect(model.player.x+9,model.player.y-26,5,8);}
    }
    if(model.fade){ctx.fillStyle=`rgba(40,31,25,${model.fade})`;ctx.fillRect(0,0,320,180);}
  }
  // One short, cancellable RAF sequence. Page navigation never waits for it.
  function present(canvas,value,state={},options={}){
    const page=pageFor(value),c=cast(state),doc=canvas.ownerDocument,env=doc?.defaultView||globalThis;
    const clock=options.clock||{now:()=>env.performance.now(),request:fn=>env.requestAnimationFrame(fn),cancel:id=>env.cancelAnimationFrame(id)};
    const media=options.media||env.matchMedia?.('(prefers-reduced-motion: reduce)'),duration=durations[page.id]||.5;
    let live=true,handle=0,start=null,elapsed=media?.matches?duration:0,finished=Boolean(media?.matches),last=-Infinity;
    const needed=page.scene==='notebook'?[]:[page.scene==='village'?art.village:art.home,art[c.avatar],
      ...(['sam','puppies','cling'].includes(page.scene)?[art.sam]:[]),...(['puppies','cling'].includes(page.scene)?ids.map(id=>art[id]):[])];
    const ready=()=>needed.every(src=>{const im=images.get(src);return im?.complete&&im.naturalWidth;});
    const cancelFrame=()=>{if(handle)clock.cancel(handle);handle=0;};
    function draw(now){
      const model=pose(page,elapsed,state);paint(canvas,page.scene,redraw,state,model);last=now;
      canvas.dataset.step=page.id;canvas.dataset.motion=finished||elapsed>=duration?'still':start===null?'loading':'running';
    }
    function schedule(){if(live&&!doc?.hidden&&!finished&&start!==null&&elapsed<duration&&!handle)handle=clock.request(tick);}
    function redraw(){
      if(!live||doc?.hidden)return;
      const now=clock.now();if(start===null&&ready())start=now;
      elapsed=finished?duration:start===null?0:Math.min(duration,(now-start)/1000);
      draw(now);if(start===null&&ready())start=now;schedule();
    }
    function tick(now){
      handle=0;if(!live||doc?.hidden)return;
      elapsed=Math.min(duration,(now-start)/1000);if(now-last>=1000/12||elapsed>=duration)draw(now);schedule();
    }
    function settle(){finished=true;elapsed=duration;cancelFrame();redraw();}
    function visibility(){if(doc.hidden){finished=true;elapsed=duration;cancelFrame();}else redraw();}
    const motion=()=>{if(media.matches)settle();};
    doc?.addEventListener('visibilitychange',visibility);media?.addEventListener?.('change',motion);
    // Warm the same existing sprites before the reunion, including on resume.
    for(const src of [art.home,art.village,art.sam,art[c.avatar],art[c.avatar+'Walk'],...ids.map(id=>art[id])])image(src,redraw);
    redraw();
    return {cancel(){if(!live)return;live=false;cancelFrame();doc?.removeEventListener('visibilitychange',visibility);media?.removeEventListener?.('change',motion);
      for(const im of images.values())if(im.onload===redraw)im.onload=null;canvas.dataset.motion='stopped';},
      snapshot:()=>({active:live,scheduled:Boolean(handle),elapsed,pose:pose(page,elapsed,state)})};
  }
  return {version,pages,art,text,speaker,cast,progress,checkpoint,objective,pose,paint,present};
});
