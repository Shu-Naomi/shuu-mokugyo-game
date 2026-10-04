/* A short, replayable opening. Story text stays separate from game progress. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;
  if(root)root.ShuLakeIntro=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(){
  'use strict';
  const pages=[
    {id:'arrival',title:'祖父の暮らした村',speaker:'旅のはじまり',scene:'village',
      paragraphs:['祖父が亡くなったという知らせを受け、遺品を整理するために、この村へやってきた。',
        '星降る湖。祖父が暮らしていたその場所を、自分はまだよく知らない。片付けを済ませたら、元の暮らしへ帰るつもりだった。']},
    {id:'notebook',title:'閉じられなかった手帳',speaker:'祖父の家',scene:'notebook',
      paragraphs:['釣り竿のそばに、使い込まれた手帳があった。魚の記録と、動物たちのこと。そして、この土地に伝わる伝説のヌシ。',
        '釣りが大好きだった祖父は、いつかそのヌシに会いたいと、長く追い続けていたらしい。年を重ね、夢をかなえる前に静かに息を引き取った。「でも、これは自分の話じゃない。」手帳を元へ戻しかけた。']},
    {id:'sam',title:'古い友人の誘い',speaker:'サミュエル',scene:'sam',
      paragraphs:['「それ、じいさんの手帳だろ。」訪ねてきたサミュエルが、懐かしそうに目を細めた。祖父とは、生前よく釣りに出かけたという。',
        '「この村に残って、じいさんの研究を続けてみないか？」そんな急には決められない。帰る暮らしもある。断ろうとした、その時——。']},
    {id:'puppies',title:'三匹の小さな理由',speaker:'祖父の家',scene:'puppies',
      paragraphs:['足もとで{dog}が、小さく鳴いた。ほかの二匹もこちらを見上げている。祖父が世話をしていた、三匹の子犬だった。',
        '「こいつらには、もう飼い主がいないんだぞ。誰が面倒を見るんだ？」サムに言われ、言葉が止まる。三匹を置いて帰ることは、できそうになかった。']},
    {id:'decision',title:'ここで、しばらく',speaker:'最初の一日',scene:'notebook',
      paragraphs:['「……この子たちのために、ここに残るよ。」祖父の夢を引き継ぐかどうかは、まだ分からない。それでも、今日からこの家で暮らすことになった。',
        '「伝説のヌシに会えれば、一攫千金だって夢じゃないぞ！」サムは早くも上機嫌だ。手帳を開く。残された白い頁には、これから自分たちの毎日を書いていこう。']},
  ];
  const art={village:'assets/terrain-world-v54.png',home:'assets/player-home-interior-v160.webp',
    sam:'assets/sam-sprites-v199.webp',shuu:'assets/shuu-walk.png',riku:'assets/riku-walk.png',grey:'assets/grey-walk.png'};
  const images=new Map();
  function text(page,dog){return page.paragraphs.map(line=>line.replaceAll('{dog}',dog));}
  function image(src,redraw){
    let result=images.get(src);
    if(!result){result=new Image();images.set(src,result);result.onload=redraw;result.src=src;}
    return result.complete&&result.naturalWidth?result:null;
  }
  function paint(canvas,scene,redraw=()=>{}){
    const ctx=canvas.getContext('2d');ctx.imageSmoothingEnabled=false;
    ctx.fillStyle=scene==='shop'?'#3b2922':'#173f45';ctx.fillRect(0,0,320,180);
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
    if(source){
      if(scene==='village')ctx.drawImage(source,0,0,source.naturalWidth,source.naturalHeight,0,0,320,180);
      else ctx.drawImage(source,0,0,source.naturalWidth,source.naturalHeight,0,0,320,180);
    }else{
      // A failed or slow picture never prevents reading or skipping the story.
      ctx.fillStyle='#5b7652';ctx.fillRect(0,88,320,92);
      ctx.fillStyle='#507f8b';ctx.fillRect(38,63,210,47);
      ctx.fillStyle='#c3aa72';ctx.fillRect(146,101,16,79);
    }
    if(scene==='sam'){
      const sam=image(art.sam,redraw);if(sam)ctx.drawImage(sam,147,79,399,884,175,45,47,104);
    }
    if(scene==='puppies'){
      ['shuu','riku','grey'].forEach((id,i)=>{
        const dog=image(art[id],redraw),size=id==='riku'?362:320;
        if(dog)ctx.drawImage(dog,0,size,size,size,84+i*56,106,42,42);
        else{
          ctx.fillStyle=['#d5b18b','#a9774d','#89939c'][i];ctx.fillRect(91+i*56,112,24,21);ctx.fillRect(87+i*56,105,26,16);
          ctx.fillStyle='#473c36';ctx.fillRect(86+i*56,105,5,13);ctx.fillRect(110+i*56,105,5,13);ctx.fillRect(92+i*56,109,2,2);ctx.fillRect(106+i*56,109,2,2);
        }
      });
    }
  }
  return {pages,art,text,paint};
});
