/* v206: an optional lakeside story, grounded in visits and actual catch records. */
(function(root,factory){const api=factory();if(typeof module==="object"&&module.exports)module.exports=api;
  if(root)root.ShuLakeStory=api;
})(typeof globalThis!=="undefined"?globalThis:this,function(){
  "use strict";
  const regions=["stream","mountainPond","mountainMarsh","coast","cave"];
  const caught=(s,id)=>Number.isFinite(Number(s.caught?.[id]))&&Number(s.caught[id])>0;
  const visited=(s,id)=>s.lakeStory?.visited?.[id]===true;
  const three=s=>["streamNushi","coastNushi","caveNushi"].every(id=>caught(s,id));
  const pages=[
    {id:"arrival",title:"祖父の手帳",place:"星降る湖",art:null,when:()=>true,speaker:"サム",
      quote:"道具は貸せても、君が聞く水の音までは貸せんからの。自分の一冊にしておいで。",
      paragraphs:["祖父の遺品を整理しに来たはずが、三匹の子犬と、この村で暮らすことになった。机には、祖父が伝説のヌシを追っていた手帳がある。",
        "『星降る湖』。祖父が長く暮らしたその場所を、自分はまだよく知らない。サムは、残された頁を自分の一冊にしておいでと言った。",
        "外では{dog}が鼻を上げ、風の匂いを追っている。今日はまず、いつもの岸から一投。祖父の記録の先には、まだ白い頁が残されている。"]},
    {id:"stream",title:"木の橋の向こう",place:"星見渓流",art:"assets/mountain-world-v201.png",when:s=>visited(s,"stream"),speaker:"釣り宿の主人",
      quote:"山から帰った人は、足音で分かるんだよ。みんな少しゆっくり歩くようになる。",
      paragraphs:["村の北口を抜けると、湖で聞いていた風が流水の音へ変わった。木の橋の下を、泡が一本の白い線になって流れていく。",
        "川の淵、木漏れ日の池、葦の沼。同じ山の水でも、魚が待つ深さと好きな餌は違う。{dog}は橋の端で振り返り、こちらが来るまで待っていた。",
        "帰って話そう。ここで釣れた一匹のことも、釣れなかった時間のことも。手帳には、濡れた木の匂いを覚えておく。"]},
    {id:"ridge",title:"峠に置いてきた息",place:"峠の池と沼",art:"assets/pass-pond-v202.png",when:s=>visited(s,"mountainPond")||visited(s,"mountainMarsh"),speaker:"八百屋の店主",
      quote:"遠くまで行った日は、帰ったら温かいものを食べな。話はそのあとでいいから。",
      paragraphs:["峠を越えた先の池には、村の屋根が映っていなかった。尾根の向こうには、葦の鳴る沼もあるという。",
        "釣り竿を持つ手を少し休め、来た道を確かめる。遠い場所にも、帰る道が一本つながっている。それだけで、次の一投を落ち着いて待てた。",
        "手帳の隅に書く。『帰りに寄る店を忘れないこと』。{dog}はその行に前脚を乗せた。"]},
    {id:"coast",title:"潮にほどける道",place:"沿岸の小島",art:"assets/coast-world-v197.webp",when:s=>visited(s,"coast"),speaker:"港の魚屋",
      quote:"山の水も、ここまで来れば潮と混ざる。別々に見えて、どこかでつながってるんだ。",
      paragraphs:["港の桟橋を離れると、村はゆっくり小さくなった。舟を進めるたび、オールの跡へ空の色が戻る。",
        "白砂の小島と岩礁の岸。同じ海にも、浅い砂を好む魚と、岩の影に身を寄せる魚がいる。潮の道は、地図の道より何度も形を変える。",
        "帰港して魚の話をすると、魚屋は山の方を指した。遠くまで漕いだつもりで、湖の話の続きを聞いていたらしい。"]},
    {id:"cave",title:"灯りの届く水",place:"岩窟の地下湖",art:"assets/cave-lake-v202.png",when:s=>visited(s,"cave"),speaker:"サム",
      quote:"見えない時ほど、急に引かんことじゃ。手に伝わるものを、ひとつずつ確かめな。",
      paragraphs:["岩窟の奥では、滴が落ちるまでの静けさにも長さがあった。鉱石の淡い光が、足元の岸と地下湖の縁を照らしている。",
        "{dog}がこちらの足に触れて止まった。見えない向こうへ進む代わりに、今立っている岸から水を探る。暗い水にも、魚の暮らす場所がある。",
        "手帳へ書く前に、もう一度耳を澄ました。滴の音の間に、竿を握る自分の呼吸が聞こえた。"]},
    {id:"stream-memory",title:"流れが覚えていた一匹",place:"渓流のヌシとの出会い",art:"assets/mountain-world-v201.png",when:s=>caught(s,"streamNushi"),speaker:"釣り宿の主人",
      quote:"あの流れを知ってるのは、長くそこにいた魚と、何度も通った君だね。",
      paragraphs:["深い淵から姿を現した渓流のヌシは、青緑の背をひとつうねらせた。速い流れに押された糸の感触が、釣り上げたあとも手に残る。",
        "山の普通の魚を覚え、岸を歩き、餌を替えた時間。その一投の前には、数え切れない小さな一投があった。",
        "宿へ戻って話すと、主人はお茶を置いた。大きさを書いた行の下に、木の橋を渡った日のことを足した。"]},
    {id:"coast-memory",title:"潮目の向こうの銀",place:"沿岸のヌシとの出会い",art:"assets/coast-world-v197.webp",when:s=>caught(s,"coastNushi"),speaker:"港の魚屋",
      quote:"その一匹の話、ここで終わりにするなよ。次に舟を出す誰かが、きっと聞きたがる。",
      paragraphs:["沿岸のヌシの濃い鱗に、波の白が一瞬重なった。寄せては走られ、張る糸を見ては手を止めた。潮を押し返すような魚だった。",
        "港へ戻った時、舟の底には行きと同じ道具があった。けれど岸壁を見上げる目には、小島で見てきた水の色が残っている。",
        "魚屋は話の途中で相づちを打った。手帳のこの頁には、帰る桟橋の印もつけておこう。"]},
    {id:"cave-memory",title:"暗い湖の長い息",place:"地底湖のヌシとの出会い",art:"assets/cave-lake-v202.png",when:s=>caught(s,"caveNushi"),speaker:"サム",
      quote:"姿を見たんじゃな。今度は君が、まだ見ていない人に話してやる番じゃ。",
      paragraphs:["地底湖のヌシが動くたび、暗い水へ大きな輪が広がった。深く潜る力をいなし、止まるわずかな間に、少しずつ岸へ寄せた。",
        "淡い体と長いひげ。見えたのは一匹の魚なのに、その奥で流れていた長い時間まで引き寄せたような気がした。",
        "洞窟の出口で{dog}が先に日なたへ出る。まぶしさに目を細め、帰ったらサムに話す言葉を考えた。"]},
    {id:"confluence",title:"三つの水音",place:"もう一度、星降る湖へ",art:null,when:three,speaker:"サム",
      quote:"流れも潮も地の底の水も、聞いてきたんじゃな。今夜は湖の空も見ておいで。",
      paragraphs:["山の淵、小島の沖、岩の奥。三つの大きな魚の頁を並べると、別々の旅の間に、村へ戻った道が見えてきた。",
        "サムは手帳を閉じ、窓の外へ目を向けた。夕暮れの星降る湖は、初めて来た日と同じ形をしている。水面に映る空だけが少し深かった。",
        "いつもの道具を確かめる。帰る家と、そばにいる{dog}を確かめる。手帳には、もう一頁の余白がある。"]},
    {id:"ending",title:"星の帰る場所",place:"星降るヌシを釣った夜",art:null,when:s=>caught(s,"starNushi"),speaker:"サム",
      quote:"星が降るのは湖だけじゃない。持ち帰った話で、村の灯りも増えていくんじゃよ。",
      paragraphs:["星降るヌシの長い銀色のひれが、水面の空を横切った。あまりに大きな姿に、最初は一匹の魚だと分からなかった。糸を通して伝わる力だけが、同じ水の中にいることを教えてくれた。",
        "張る時には待ち、寄せられる時に引く。旅のあちこちで覚えた小さな判断を、ひとつずつ重ねた。岸へ届いた銀色を見て、{dog}が声を上げる。",
        "夜が明けると、村にはいつもの店の声が戻った。手帳を見たサムは、魚の大きさより先に、余白に残った足跡を指でなぞった。",
        "この一冊の話は、ここでひと区切り。次の朝も、餌を選び、竿を持ち、相棒と家を出る。まだ釣っていない一匹のために、白い頁を残しておこう。"]},
  ];
  const byId=Object.fromEntries(pages.map(p=>[p.id,p]));
  const catchPages={streamNushi:"stream-memory",coastNushi:"coast-memory",caveNushi:"cave-memory",starNushi:"ending"};
  const object=v=>v&&typeof v==="object"&&!Array.isArray(v)?v:{};
  function chapters(state){return pages.filter(p=>p.when(state));}
  function regionForSpot(id=""){
    if(/^mountain-highPond-/.test(id))return "mountainPond";
    if(/^mountain-highMarsh-/.test(id))return "mountainMarsh";
    if(/^mountain-underground-/.test(id))return "cave";
    if(/^mountain-(stream|pond|marsh)-/.test(id))return "stream";
    if(/^coast-(sand|reef)-/.test(id))return "coast";
    return null;
  }
  function normalize(state){
    const old=object(state.lakeStory),visits={};
    for(const id of regions)if(old.visited?.[id]===true)visits[id]=true;
    // Recover only explicit location evidence, never guesses from fish species.
    if(regions.includes(state.mapRegion))visits[state.mapRegion]=true;
    for(const record of Object.values(object(state.fishCatchRecords))){
      const region=regionForSpot(record?.last?.spotId);if(region)visits[region]=true;
    }
    for(const [id,region] of [["streamNushi","stream"],["coastNushi","coast"],["caveNushi","cave"]])if(caught(state,id))visits[region]=true;
    state.lakeStory={version:1,visited:visits,read:[],selected:"arrival",introSeen:old.introSeen===true,
      introPending:old.introPending===true&&old.introSeen!==true,
      introPage:Number.isInteger(old.introPage)?Math.max(0,Math.min(4,old.introPage)):0};
    const available=new Set(chapters(state).map(p=>p.id));
    state.lakeStory.read=[...new Set(Array.isArray(old.read)?old.read:[])].filter(id=>available.has(id));
    state.lakeStory.selected=available.has(old.selected)?old.selected:"arrival";return state.lakeStory;
  }
  function visit(state,region){
    if(!regions.includes(region))return false;
    if(!state.lakeStory)normalize(state);
    if(visited(state,region))return false;
    state.lakeStory.visited[region]=true;return true;
  }
  function markRead(state,id){
    if(!state.lakeStory)normalize(state);
    if(!chapters(state).some(p=>p.id===id))return false;
    state.lakeStory.selected=id;
    if(state.lakeStory.read.includes(id))return false;
    state.lakeStory.read.push(id);return true;
  }
  function unread(state){return chapters(state).filter(p=>!state.lakeStory?.read?.includes(p.id));}
  function completed(state){return caught(state,"starNushi")&&state.lakeStory?.read?.includes("ending")===true;}
  function dialogue(state,place){
    const ended=caught(state,"starNushi");
    const lines={
      sam:ended?pages[9].quote:three(state)?pages[8].quote:caught(state,"caveNushi")?pages[7].quote:caught(state,"streamNushi")?"渓流の大きな一匹に会ったんじゃな。道具の傷も、良い旅の記録になる。":pages[0].quote,
      farmhouse:ended?"昨夜の話を聞かせておくれ。今度は君の話が、誰かの旅支度になるよ。":caught(state,"streamNushi")?pages[5].quote:visited(state,"stream")?pages[1].quote:null,
      "fish-market":ended?"あの湖の話、港まで届いてるよ。次はどこへ舟を出すんだい？":caught(state,"coastNushi")?pages[6].quote:visited(state,"coast")?pages[3].quote:null,
      yaoya:ended?"大きな魚に会っても、お腹は空くだろう？ 今日の野菜も持っていきな。":visited(state,"mountainPond")||visited(state,"mountainMarsh")?pages[2].quote:null,
      "main-shrine":ended?"鈴の音が湖へ渡る。手帳に書いたあの夜も、この村の新しい昔話になる。":three(state)?"水面に三つの旅の景色が重なる。見上げた空に、一番星が灯っている。":null,
    };
    const line=lines[place];return line?(place==="main-shrine"?line:`「${line}」`):"";
  }
  const escape=text=>String(text).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
  function prose(page,dog){return page.paragraphs.map(line=>line.replaceAll("{dog}",dog));}
  return {pages,chapters,normalize,visit,markRead,unread,completed,dialogue,regionForSpot,escape,prose,catchChapter:id=>catchPages[id]||null,byId};
});
