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
    shuu:'assets/shuu-walk.png',riku:'assets/riku-walk.png',grey:'assets/grey-walk.png'};
  const images=new Map();
  function image(src,redraw){
    let result=images.get(src);
    if(!result){result=new Image();images.set(src,result);result.src=src;}
    if(!result.complete)result.onload=redraw;
    return result.complete&&result.naturalWidth?result:null;
  }
  function paint(canvas,scene,redraw=()=>{},state={}){
    const ctx=canvas.getContext('2d'),c=cast(state);ctx.imageSmoothingEnabled=false;
    ctx.fillStyle='#173f45';ctx.fillRect(0,0,320,180);
    if(scene==='notebook'){
      // The grandfather's notes on the left, room for new memories on the right.
      ctx.fillStyle='#55614b';ctx.fillRect(0,0,320,180);
      ctx.fillStyle='#796044';for(let y=0;y<180;y+=18){ctx.fillRect(0,y,320,2);}
      ctx.fillStyle='#3b2d26';ctx.fillRect(53,35,220,120);ctx.fillRect(58,155,208,5);
      ctx.fillStyle='#997847';ctx.fillRect(50,30,220,122);
      ctx.fillStyle='#d9c69c';ctx.fillRect(58,33,94,111);ctx.fillRect(156,33,106,111);
      ctx.fillStyle='#f3e7c5';ctx.fillRect(60,36,89,104);ctx.fillRect(158,36,102,104);
      ctx.fillStyle='#b8a477';ctx.fillRect(149,34,7,108);
      ctx.fillStyle='#dfd1ae';for(let y=56;y<131;y+=15){ctx.fillRect(72,y,64,1);ctx.fillRect(171,y,75,1);}
      ctx.fillStyle='#847556';for(let y=55;y<104;y+=10){ctx.fillRect(73,y,46+(y%3)*5,1);}
      ctx.fillStyle='#4a3730';ctx.fillRect(275,28,4,136);
      ctx.fillStyle='#bba475';ctx.fillRect(279,30,2,128);ctx.fillRect(274,131,6,23);
      return;
    }
    const source=image(scene==='village'?art.village:art.home,redraw);
    if(source)ctx.drawImage(source,0,0,source.naturalWidth,source.naturalHeight,0,0,320,180);
    else{ctx.fillStyle='#5b7652';ctx.fillRect(0,88,320,92);ctx.fillStyle='#507f8b';ctx.fillRect(38,63,210,47);ctx.fillStyle='#c3aa72';ctx.fillRect(146,101,16,79);}
    const player=image(art[c.avatar],redraw),village=scene==='village',heroX=village?161:133,heroBottom=village?159:146,heroHeight=village?39:57;
    if(player){const fw=player.naturalWidth/3,w=heroHeight*fw/player.naturalHeight;ctx.drawImage(player,0,0,fw,player.naturalHeight,heroX-w/2,heroBottom-heroHeight,w,heroHeight);}
    if(scene==='sam'||scene==='cling'){
      const sam=image(art.sam,redraw);if(sam)ctx.drawImage(sam,147,79,399,884,207,78,28,62);
    }
    if(scene==='puppies'||scene==='cling'){
      const ids=scene==='cling'?[c.dog,...['shuu','riku','grey'].filter(id=>id!==c.dog)]:['shuu','riku','grey'];
      ids.forEach((id,i)=>{
        const dog=image(art[id],redraw),size=id==='riku'?362:320,x=scene==='cling'?[155,203,253][i]:[99,172,246][i],bottom=154;
        if(scene==='cling'&&i===0){ctx.fillStyle='#e5d29a';ctx.fillRect(x-18,bottom-2,36,3);}
        if(dog)ctx.drawImage(dog,0,size,size,size,x-17,bottom-34,34,34);
      });
      // The same notebook already shown in close-up, held beside the protagonist.
      ctx.fillStyle='#9a764c';ctx.fillRect(heroX+8,heroBottom-27,8,11);ctx.fillStyle='#e6d5a7';ctx.fillRect(heroX+10,heroBottom-26,5,8);
    }
  }
  return {version,pages,art,text,speaker,cast,progress,checkpoint,objective,paint};
});
