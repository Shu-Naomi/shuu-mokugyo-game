/* The pet shop and carrying tanks reuse the game's original fish/dog art. */
(function(root){
  "use strict";
  function create(ctx){
    const P=root.ShuPetLife,s=ctx.state,esc=value=>String(value??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"})[c]);
    const modal=document.createElement("section");
    modal.id="petLifeModal";modal.className="modal pet-life-modal";modal.setAttribute("role","dialog");
    modal.setAttribute("aria-modal","true");modal.setAttribute("aria-labelledby","petLifeTitle");ctx.parent.append(modal);
    let mode="aquarium",tab="fish",kind="bond",course="beginner",participant=s.dog,message="",zoom=false,focus=false,frame=0,lastPaint=0,started=0,feeding=null,lastPoses={},elapsed=0,rehomeId=null,buybackId=null,buybackTank=null,contestCue=null,panel=null,panelReturn="records",moveTank=null,toastTimer=0,restoreFocus=false;
    const spec=id=>ctx.catalog.find(f=>f.id===id);
    const live=()=>modal.classList.contains("open");
    const fishName=f=>`${spec(f.species).name} #${f.uid.slice(4)}`;
    const btn=(action,label,disabled=false)=>`<button data-pet-action="${action}" ${disabled?"disabled":""}>${label}</button>`;
    const icon=name=>`<svg class="pet-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="square" stroke-linejoin="miter" aria-hidden="true">${({tank:'<path d="M3 5h18v15H3zM6 9h12M6 15h4m4 2h4"/>',heart:'<path d="m12 20-9-9V6h6l3 3 3-3h6v5z"/>',water:'<path d="m12 3-7 10v5l4 3h6l4-3v-5zM8 16v2h3"/>',feed:'<path d="M5 8h14v13H5zM8 3h8v5M8 12h8m-8 4h3"/>',record:'<path d="M5 3h14v18H5zM9 7h6m-6 5h6m-6 5h4"/>',help:'<path d="M8 7V4h8v7l-4 3v2m0 4v1"/>',expand:'<path d="M8 3H3v5m13-5h5v5M3 16v5h5m13-5v5h-5"/>',fish:'<path d="m4 12 5-6h8l4 6-4 6H9zM4 12l-3-4v8zM16 10v2"/>',left:'<path d="m15 5-7 7 7 7"/>',right:'<path d="m9 5 7 7-7 7"/>',shop:'<path d="M3 9V5h18v4M5 9v12h14V9M9 21v-7h6v7M2 9h20"/>'})[name]||''}</svg>`;
    const control=(action,label,art,disabled=false,extra="")=>`<button data-pet-action="${action}" aria-label="${esc(label)}" ${disabled?"disabled":""} ${extra}>${icon(art)}<span>${label}</span></button>`;
    const gauge=(label,value,art)=>`<div class="pet-gauge ${value<40?'is-low':value<70?'is-fair':''}"><span>${icon(art)}${label}</span><span class="pet-gauge-track" role="meter" aria-label="${label}" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${value}"><i style="width:${value}%"></i></span><b>${value}%</b></div>`;
    const sizeLabel=f=>P.lifeStage(f,ctx.catalog)==="fry"?"稚魚（繁殖限定）":ctx.sizeLabel(f.species,f.length,f);
    const appearance=f=>root.ShuAquariumLife.appearance(f,ctx.catalog);
    const thumbnail=(f,large=false)=>`<span class="pet-specimen-window ${large?"is-large":""}" role="img" aria-label="${esc(fishName(f))}、${P.cm(f.length)}cm、${esc(sizeLabel(f))}"><span class="pet-specimen-body" data-pet-specimen="${f.uid}"></span></span>`;
    function asualComment(f){
      if(P.lifeStage(f,ctx.catalog)==="fry")return "生まれたばかりの小さな命ね。まずは元気に育ってくれるのを、一緒に見守りましょう。";
      if(f.health<60)return "今日は少し疲れているみたい。きれいな水とごはんで、元気を取り戻してからにしましょう。";
      if(f.length<spec(f.species).start)return "まだ育ち盛りね。ごはんと水を大切にして、この子の成長を楽しんでね。";
      if(f.generation>0)return `水槽で生まれた第${f.generation+1}世代の子ね。家族から受け継いだ成長を、しっかり見届けたのね。`;
      if(f.stars>=3)return "長く丁寧に育てたのが伝わってくるわ。ここまで育った姿は、あなたとの時間の証ね。";
      if(f.careDays<3)return "迎えたばかりね。あと少し、この子と一緒に暮らしてから相談しましょう。";
      return "元気に育ったわね。体の大きさも確かめて、この子に合ったお値段をつけるわ。";
    }
    function pause(){cancelAnimationFrame(frame);frame=0;}
    function stop(){pause();feeding=null;rehomeId=null;buybackId=null;clearTimeout(toastTimer);toastTimer=0;ctx.stopFeedSound?.();}
    function changed(){ctx.changed();}
    function open(view="aquarium"){
      if(!ctx.canOpen())return false;
      ctx.close();mode=view;zoom=false;focus=false;message="";tab="fish";buybackId=null;buybackTank=null;rehomeId=null;panel=null;moveTank=null;
      if(s.petLife.contest){mode="shop";tab="contests";kind=s.petLife.contest.kind;course=s.petLife.contest.course;participant=s.petLife.contest.participant;}
      if(view==="shop")message="アスアル「育てる時間も、立派な楽しみよ。クラウドと一緒に待っていたわ」";
      P.sync(s,ctx.catalog,ctx.day());render();ctx.open(modal.id);start();return true;
    }
    function header(){
      return `<header class="pet-heading"><div><small>${mode==="aquarium"?"MY LITTLE AQUARIUM":"ASUAL'S PET HOUSE"}</small><h2 id="petLifeTitle">${mode==="aquarium"?"持ち歩き飼育水槽":"アスアルのペットショップ"}</h2></div><span class="pet-money">${s.money.toLocaleString("ja-JP")}円</span>${btn("close","閉じる")}</header>`;
    }
    function shop(){
      const p=s.petLife,known=ctx.catalog.filter(f=>f.id!=="nushi"&&!f.legendary&&s.caught?.[f.id]>0),locked=ctx.catalog.filter(f=>f.id!=="nushi"&&!f.legendary).length-known.length;
      const nextPrice=P.TANK_PRICES[p.unlockedTanks];
      return `<div class="pet-shop-host"><canvas width="96" height="128" data-rival-art="asual" role="img" aria-label="店主アスアル"></canvas><div><b>水車の家のペットショップ</b><p>魚との出会い、お世話用品、ワンコと魚のコンテスト。</p><small>飼育魚 ${p.fish.length}/${P.totalCapacity(s)}匹 ・ 通常水槽 ${p.unlockedTanks}/6槽 ・ 魚のエサ ${p.food}食</small></div><canvas width="128" height="96" data-rival-art="cloud" role="img" aria-label="クラウド"></canvas></div>
        <nav class="pet-tabs" aria-label="ペットショップの売り場">${[["fish","魚の生体"],["supplies","お世話用品・水槽"],["legends","ぬしの飼育"],["buyback","魚の買い取り"],["contests","コンテスト受付"]].map(([id,label])=>`<button data-pet-tab="${id}" aria-pressed="${tab===id}">${label}</button>`).join("")}${btn("aquarium","飼育水槽を見る")}</nav>
        ${tab==="fish"?`<p class="pet-note">自分で釣って図鑑に登録した魚種から迎えられるよ。未登録 ${locked}種。1槽に同じ水の魚を5匹まで。</p>${tankPicker("迎える水槽")}<div class="pet-stock">${known.length?known.map(f=>`<article><div class="pet-fish-thumb" data-pet-preview="${f.id}" role="img" aria-label="${f.name}"></div><div><b>${f.name}</b><small>${P.cm(f.start)}cm ・ ${f.waterLabel}</small><button data-pet-buy="${f.id}" ${!P.canHouse(s,f.id,ctx.catalog,p.selectedTank)||s.money<f.price?"disabled":""}>迎える · ${f.price.toLocaleString("ja-JP")}円</button></div></article>`).join(""):'<p class="pet-note">魚を一匹釣ると、その魚種の販売が始まるよ。</p>'}</div>`:
          tab==="supplies"?`<div class="pet-supplies"><h3>魚のエサ</h3><p>淡水魚にも海水魚にも使える飼育用のエサ。1匹に一日1食。</p>${btn("food-1","10食 · 100円",s.money<100)}${btn("food-10","100食 · 1,000円",s.money<1000)}<h3>飼育水槽</h3><p>最初の水槽と10食は用意してあるよ。新しい水槽を買うと、同じ水の魚をさらに5匹迎えられる。</p>${nextPrice?btn("tank",`水槽${p.unlockedTanks+1}を購入 · ${nextPrice.toLocaleString("ja-JP")}円`,s.money<nextPrice):'<p>水槽は6槽そろっているよ。</p>'}<p>水換えは飼育水槽から無料でできるよ。</p></div>`:
          tab==="legends"?legends():tab==="buyback"?buyback():contest()}`;
    }
    function legends(){
      const p=s.petLife,known=ctx.catalog.filter(f=>P.isLegend(f)&&s.caught?.[f.id]>0);
      return `<p class="pet-note">ぬしを釣ると、同じ水の専用総合水槽が無料で使えるようになるよ。淡水・海水それぞれ8匹まで。釣ったぬしを魚種ごとに一匹、記録した最大体長で迎えられるよ。</p><blockquote class="pet-asual-comment">アスアル「大きな子にも、安心して暮らせる場所を。淡水と海水は分けて、大切に育てましょうね」</blockquote><div class="pet-legend-pools">${P.LEGEND_TANKS.map(t=>`<article><b>${t.name}</b><p>${p.legendTanks[t.key]?`解放済み · ${P.residents(s,t.id).length}/${P.LEGEND_CAPACITY}匹`:`${t.water}のぬしを釣ると解放`}</p></article>`).join("")}</div><div class="pet-stock">${known.map(f=>`<article><div class="pet-fish-thumb" data-pet-preview="${f.id}" role="img" aria-label="${esc(f.name)}"></div><div><b>${esc(f.name)}</b><small>${f.waterLabel} · ${P.tankLabel(P.legendTank(f))}</small><button data-pet-nushi="${f.id}" ${p.legendClaims[f.id]?"disabled":""}>${p.legendClaims[f.id]?"迎え済み":"釣ったぬしを迎える · 無料"}</button></div></article>`).join("")||'<p class="pet-note">まだ迎えられるぬしはいないよ。自分で釣ったぬしだけ、ここに並ぶよ。</p>'}</div><p class="pet-note">ぬしもエサやり・水換えで成長するよ。専用水槽では繁殖・買い取り・お引っ越しはできないよ。</p>`;
    }
    function buyback(){
      const group=buybackTank===null?[]:P.residents(s,buybackTank).filter(f=>!P.isLegend(spec(f.species))),f=group.find(a=>a.uid===buybackId);
      if(!f)buybackId=null;
      const step=buybackTank===null?1:f?3:2;
      const trail=`<ol class="pet-buyback-steps" aria-label="買い取りの手順">${["水槽を選ぶ","個体を選ぶ","一匹を確認"].map((label,i)=>`<li ${step===i+1?'aria-current="step"':""}>${i+1}. ${label}</li>`).join("")}</ol>`;
      if(buybackTank===null)return `${trail}<blockquote class="pet-asual-comment">アスアル「どの水槽の子を見せてくれる？ まずは水槽を選んでね」</blockquote><div class="pet-buyback-tanks">${Array.from({length:s.petLife.unlockedTanks},(_,tank)=>{
        const fish=P.residents(s,tank),eligible=fish.filter(f=>P.buyBackQuote(f,ctx.catalog).eligible).length;
        return `<button data-pet-buyback-tank="${tank}"><b>${P.tankLabel(tank)}</b><span>${fish.length?spec(fish[0].species).waterLabel:"空き水槽"} · ${fish.length}/${P.TANK_CAPACITY}匹</span><small>買い取り可能 ${eligible}匹</small></button>`;
      }).join("")}</div><p class="pet-note">成魚の大きさ・お世話3日以上・元気60%以上が目安。ぬし専用水槽は買い取り対象にならないよ。</p>`;
      const back=`<div class="pet-buyback-heading"><h3>${P.tankLabel(buybackTank)}</h3>${btn("buyback-tanks","水槽選択へ戻る")}</div>`;
      if(!f)return `${trail}${back}<p class="pet-note">見たい一匹を選んでね。魚の画像は魚種ごとの最大体長を基準に、今の大きさを表しているよ。</p><div class="pet-buyback-fish">${group.map(a=>{
        const quote=P.buyBackQuote(a,ctx.catalog);
        return `<button data-pet-buyback="${a.uid}">${thumbnail(a)}<b>${esc(fishName(a))}</b><span>${P.cm(a.length)}cm · ${esc(sizeLabel(a))}</span><small>${quote.eligible?`${quote.price.toLocaleString("ja-JP")}円で買い取り可能`:esc(quote.reason)}</small><span class="pet-card-comment">アスアル「${esc(asualComment(a))}」</span></button>`;
      }).join("")||'<p class="pet-note">この水槽には魚がいないよ。別の水槽を選んでね。</p>'}</div>`;
      const quote=P.buyBackQuote(f,ctx.catalog);
      return `${trail}${back}<article class="pet-buyback-detail">${thumbnail(f,true)}<div><h3>${esc(fishName(f))}</h3><p>${P.cm(f.length)}cm · ${esc(sizeLabel(f))} · ${f.sex==="female"?"♀":"♂"}</p><p>第${f.generation+1}世代 ${"★".repeat(f.stars)} · お世話${f.careDays}日 · 元気${f.health}%</p><small>${esc(appearance(f).label)}</small><blockquote class="pet-asual-comment">アスアル「${esc(asualComment(f))}」</blockquote><p class="pet-buyback-price">${quote.eligible?`買い取り価格 ${quote.price.toLocaleString("ja-JP")}円`:esc(quote.reason)}</p><p class="pet-note">確定すると、この一匹が水槽からいなくなるよ。元には戻せないので、体長と個体番号を確認してね。</p><div class="pet-buyback-actions">${btn("buyback-confirm",quote.eligible?`この一匹を${quote.price.toLocaleString("ja-JP")}円で売る`:"まだ買い取りできない",!quote.eligible)}${btn("buyback-cancel","個体一覧に戻る")}</div></div></article>`;
    }
    function tankPicker(label="水槽"){
      return `<label class="pet-tank-picker">${label}<select id="petTankSelect">${P.tankIds(s).map(i=>{
        const group=P.residents(s,i),water=P.LEGEND_TANKS.find(t=>t.id===i)?.water||(group.length?spec(group[0].species).waterLabel:"空き");
        return `<option value="${i}" ${s.petLife.selectedTank===i?"selected":""}>${P.tankLabel(i)} · ${group.length}/${P.tankCapacity(i)}匹 · ${water}</option>`;
      }).join("")}</select></label>`;
    }
    function inspect(uid){
      const f=P.residents(s).find(a=>a.uid===uid);
      if(!f||mode!=="aquarium")return;
      const changedSelection=s.petLife.selected!==uid;
      s.petLife.selected=uid;focus=true;zoom=false;feeding=null;rehomeId=null;
      ctx.stopFeedSound?.();
      message="";panel=null;
      if(changedSelection)changed();
      render();
    }
    function tank(){
      const p=s.petLife,group=P.residents(s),eggs=P.eggsIn(s),f=P.selected(s),today=ctx.day(),hungry=group.filter(a=>a.fedDay!==today);
      const dims=root.ShuAquariumLife.dimensions(group,ctx.catalog),water=P.LEGEND_TANKS.find(t=>t.id===p.selectedTank)?.water||(group.length?spec(group[0].species).waterLabel:"空き");
      const levelStart=f?P.xpForLevel(f.level):0,nextXP=f?P.xpForLevel(f.level+1):1,xp=f?.level>=20?100:f?Math.max(0,Math.min(100,(f.xp-levelStart)/(nextXP-levelStart)*100)):0;
      const eggText=eggs.length?`卵${eggs.length}組 · あと${Math.min(...eggs.map(e=>Math.max(0,e.hatchDay-today)))}日`:"";
      return `<div class="pet-aquarium-view" ${panel?"inert":""}>
        <div class="pet-tank-heading pet-tank-toolbar">
          ${control("tank-prev","前の水槽","left",P.tankIds(s).length<2,'class="pet-square"')}
          <button class="pet-tank-current" data-pet-action="tanks" aria-label="水槽一覧を開く">${icon("tank")}<strong>${P.tankLabel(p.selectedTank)}</strong><span>${water} · ${group.length}/${P.tankCapacity(p.selectedTank)}匹</span></button>
          ${control("tank-next","次の水槽","right",P.tankIds(s).length<2,'class="pet-square"')}
          <div class="pet-view-switch" role="group" aria-label="水槽の見方">${control("focus-close","全体","tank",false,`aria-pressed="${!focus}"`)}${control("focus-selected","一匹","fish",!f,`aria-pressed="${focus}"`)}</div>
          ${control("zoom",zoom?"拡大を戻す":"水槽を拡大","expand",!group.length,'class="pet-square"')}
        </div>
        <div class="pet-tank-layout">
          ${focus&&f?`<div id="petInspectStage" class="aquarium-tank pet-tank-stage pet-inspect-stage" role="img" aria-label="${esc(fishName(f))}を拡大表示。${P.cm(f.length)}cm、${sizeLabel(f)}。魚種ごとの最大体長を基準にした個別表示">
            <div class="pet-aquarium-scenery" aria-hidden="true"></div><div class="pet-water-light"></div><div id="petInspectFish" class="aquarium-fish pet-inspect-fish" aria-hidden="true"></div><div class="pet-glass"></div>
            <div class="pet-inspect-caption"><strong>一匹を観察</strong><small>${P.cm(f.length)}cm · ${sizeLabel(f)}</small></div>
          </div>`:`<div id="petTankStage" class="aquarium-tank pet-tank-stage" role="group" aria-label="${group.length?group.map(fishName).join("、"):"空き水槽"}、${group.length}匹が泳ぐ飼育水槽">
            <div class="pet-aquarium-scenery" aria-hidden="true"></div><div class="pet-water-light"></div>${Array.from({length:5},(_,i)=>`<i class="pet-bubble" style="--bubble:${i}"></i>`).join("")}
            ${eggs.map((egg,i)=>`<div class="pet-eggs egg-${["yamame","nijimasu"].includes(egg.species)?"gravel":"plant"}" style="--egg-slot:${i}" role="img" aria-label="${esc(spec(egg.species).name)}の卵、孵化まであと${Math.max(0,egg.hatchDay-today)}日"><i></i><i></i><i></i><i></i><i></i></div>`).join("")}
            ${group.map(a=>`<div class="aquarium-fish pet-resident" data-pet-fish="${a.uid}" aria-hidden="true"></div><button class="pet-fish-target" data-pet-inspect="${a.uid}" aria-label="${esc(fishName(a))}を拡大する" aria-pressed="${a.uid===p.selected}"><svg class="pet-fish-arrow" width="12" height="16" viewBox="0 0 12 16" aria-hidden="true"><path d="M4 1h4v7h3l-5 7-5-7h3z" fill="#ffe59a" stroke="#14333d" stroke-width="1.5" stroke-linejoin="round"/></svg></button><i class="pet-pellet" data-pet-pellet="${a.uid}"></i>`).join("")}
            <div class="pet-glass"></div>${group.length||eggs.length?`<div class="pet-scale" style="width:${dims.rulerCm/dims.widthCm*100}%">${dims.rulerCm}cm</div><span class="pet-tank-width">水槽幅 ${dims.widthCm}cm</span><div class="pet-tank-caption">${group.length}匹 · ${water}<small>${f?`${spec(f.species).name} ${P.cm(f.length)}cm · ${sizeLabel(f)}`:""}</small></div>`:`<div class="pet-empty">${icon("fish")}<h3>ここで、魚との暮らしを。</h3><p>アスアルから魚を迎えよう。</p>${control("shop","魚を迎える","shop")}</div>`}
          </div>`}
          <aside class="pet-tank-info" aria-label="選んだ魚の状態">
            <div class="pet-fish-roster" role="group" aria-label="この水槽の魚を選んで拡大">${group.map(a=>`<button data-pet-inspect="${a.uid}" aria-pressed="${a.uid===p.selected}" aria-label="${esc(fishName(a))}、${P.cm(a.length)}cm、${esc(sizeLabel(a))}" title="${esc(fishName(a))} · ${P.cm(a.length)}cm"><span class="pet-roster-art" data-pet-card-art="${a.uid}"></span><small>#${a.uid.slice(4)}${P.lifeStage(a,ctx.catalog)==="fry"?' <em>稚</em>':""}</small></button>`).join("")}</div>
            ${f?`<div class="pet-profile-portrait"><span data-pet-card-art="${f.uid}"></span></div><h3>${esc(fishName(f))}<small>Lv.${f.level}</small></h3>
              <div class="pet-profile-length"><strong>${P.cm(f.length)}<small>cm</small></strong><span data-pet-size-rank>${sizeLabel(f)}</span></div>
              <div class="pet-vitals">${gauge("元気",f.health,"heart")}${gauge("水質",f.water,"water")}</div>
              <div class="pet-xp-line" title="経験値 ${f.xp}/${f.level>=20?'MAX':nextXP}"><span>成長経験</span><span class="pet-xp-track" role="progressbar" aria-label="次のレベルまでの経験値" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${Math.round(xp)}"><i style="width:${xp}%"></i></span><small>${f.level>=20?'MAX':`${f.xp}/${nextXP}`}</small></div>`:`<div class="pet-empty-profile">${icon("tank")}<b>${water==="空き"?"空き水槽":water}</b><small>魚を迎えると、ここに体調が出るよ。</small></div>`}
          </aside>
        </div>
        <footer class="pet-care-dock"><div class="pet-dock-stock"><span>${icon("feed")}<b>${p.food}</b>食</span>${eggText?`<small class="pet-egg-notice" role="status">${eggText}</small>`:`<small>${group.length?hungry.length?`エサ待ち ${hungry.length}匹`:"今日はエサ済み":"魚を迎えよう"}</small>`}</div>
          <div class="pet-care-actions">${control("feed",hungry.length?`エサ · ${hungry.length}食`:"エサ済み","feed",!hungry.length||p.food<hungry.length||!f)}${control("water","水換え","water",!f||group.every(a=>a.changedDay===today)||group.every(a=>a.water>=100))}</div>
          ${control("records","記録・管理","record",!f)}${control("help","育て方","help",false,'class="pet-dock-secondary"')}${control("shop","アスアル","shop",false,'class="pet-dock-secondary"')}
        </footer>
        ${p.lastBirth?.tank===p.selectedTank&&p.lastBirth.day===today?`<span class="pet-birth pet-sr-only" role="status">${esc(spec(p.lastBirth.species).name)}の稚魚が生まれたよ。</span>`:""}
      </div>${panel?panelView(f,today):""}`;
    }
    function tankCard(tank,move=false){
      const group=P.residents(s,tank),eggCount=P.eggsIn(s,tank).length,water=P.LEGEND_TANKS.find(t=>t.id===tank)?.water||(group.length?spec(group[0].species).waterLabel:"空き");
      return `<button class="pet-tank-card" ${move?`data-pet-move-target="${tank}" aria-pressed="${moveTank===tank}"`:`data-pet-tank="${tank}" aria-pressed="${s.petLife.selectedTank===tank}"`}><span class="pet-mini-tank">${group[0]?`<span data-pet-card-art="${group[0].uid}"></span>`:icon("tank")}</span><b>${P.tankLabel(tank)}</b><small>${water} · ${group.length}/${P.tankCapacity(tank)}匹${eggCount?` · 卵${eggCount}`:""}</small></button>`;
    }
    function panelView(f,today){
      const titles={tanks:"水槽を選ぶ",records:"この子の記録",manage:"お引越し・託す",help:"水槽の育て方"};
      let body="";
      if(panel==="tanks")body=`<div class="pet-tank-cards">${P.tankIds(s).map(t=>tankCard(t)).join("")}</div><footer class="pet-tank-footer"><span>全${s.petLife.fish.length}/${P.totalCapacity(s)}匹 · 通常水槽${s.petLife.unlockedTanks}/6槽</span>${control("legend-shop","ぬしの飼育","fish")}${control("shop","水槽・魚を迎える","shop")}</footer>`;
      else if(panel==="help")body=`<div class="pet-help-cards"><article>${icon("feed")}<h3>毎日のお世話</h3><p>エサは1匹に1食。水質40%以上で毎日食べると、翌日1〜5cm成長するよ。</p><small>エサ +6XP / 水換え +4XP · 一日一回</small></article><article>${icon("fish")}<h3>卵から、小さな稚魚へ</h3><p>成魚のオスとメスを、水質60%以上・元気70%以上で3日育てると卵を産むよ。2〜4日で孵化。空きは卵が予約するよ。</p></article><article>${icon("expand")}<h3>全体と一匹を見比べる</h3><p>魚や写真をタッチすると一匹を観察できるよ。個別表示も体長で大きさが変わる。小さい子は見やすさを補助しているよ。</p></article><article>${icon("tank")}<h3>ぬし専用の水槽</h3><p>釣ったぬしを魚種ごとに一匹、無料で迎えられるよ。淡水と海水は別々に8匹まで。ぬしは繁殖・買い取りの対象外。</p>${control("legend-shop","ぬしの飼育を相談","shop")}</article><article>${icon("shop")}<h3>買い取りの相談</h3><p>成魚の体長、お世話3日以上、元気60%以上が目安。アスアルの店で、水槽と個体を選んでね。</p>${control("shop","アスアルのお店へ","shop")}</article></div>`;
      else if(f){
        const tabs=`<nav class="pet-sheet-tabs" aria-label="個体の情報">${["records","manage"].map(t=>`<button data-pet-panel-tab="${t}" aria-pressed="${panel===t}">${t==="records"?"成長の記録":"お引越し・託す"}</button>`).join("")}</nav>`;
        if(panel==="records")body=`${tabs}<div class="pet-record-hero"><span data-pet-card-art="${f.uid}"></span><div><h3>${esc(fishName(f))}</h3><b>${P.cm(f.length)}cm · ${sizeLabel(f)}</b><small>${esc(appearance(f).label)}</small></div></div><div class="pet-stats"><span>レベル <b>Lv.${f.level}</b></span><span>経験値 <b>${f.xp}/${f.level>=20?"MAX":P.xpForLevel(f.level+1)}</b></span><span>元気 <b>${f.health}%</b></span><span>水質 <b>${f.water}%</b></span><span>生まれた体長 <b>${P.cm(f.bornSize)}cm</b></span><span>成長 <b>＋${P.cm(f.length-f.bornSize)}cm</b></span><span>1日の成長 <b>${P.cm(P.dailyGrowth(spec(f.species)))}cm</b></span><span>一緒に <b>${today-f.acquiredDay+1}日目</b></span><span>お世話 <b>${f.careDays}日</b></span><span>性別 <b>${f.sex==="female"?"♀ メス":"♂ オス"}</b></span><span>世代・星 <b>第${f.generation+1}世代 ${"★".repeat(f.stars)}</b></span></div>`;
        else{
          const targets=P.tankIds(s).filter(t=>t!==f.tank&&P.canHouse(s,f.species,ctx.catalog,t));if(!targets.includes(moveTank))moveTank=targets[0]??null;
          body=`${tabs}<div class="pet-record-hero"><span data-pet-card-art="${f.uid}"></span><div><h3>${esc(fishName(f))}</h3><b>${P.cm(f.length)}cm · ${P.tankLabel(f.tank)}</b></div></div><h3>お引越し先</h3><div class="pet-tank-cards pet-move-cards">${targets.map(t=>tankCard(t,true)).join("")||'<p class="pet-note">同じ水の種類で、空きのある水槽が必要だよ。</p>'}</div>${control("move","この魚を移す","tank",!targets.length)}${!P.isLegend(spec(f.species))?`<section class="pet-rehome">${rehomeId===f.uid?`<p>${esc(fishName(f))}（${P.cm(f.length)}cm）をアスアルに託す？ 水槽からいなくなり、元には戻せないよ。返金はないよ。</p>${btn("rehome-confirm","この魚を託す")}${btn("rehome-cancel","やめる")}`:control("rehome","アスアルに託す","shop")}</section>`:'<p class="pet-note">ぬしは専用水槽で大切に育てよう。託す操作はできないよ。</p>'}`;
        }
      }
      return `<div class="pet-sheet-layer"><button class="pet-sheet-shade" data-pet-action="panel-close" aria-label="一覧を閉じる"></button><section class="pet-sheet" role="dialog" aria-modal="true" aria-labelledby="petSheetTitle"><header><h3 id="petSheetTitle">${titles[panel]}</h3>${btn("panel-close","戻る")}</header><div class="pet-sheet-body">${body}</div></section></div>`;
    }
    function chooseTank(tank){
      if(!P.selectTank(s,tank))return;
      feeding=null;focus=false;zoom=false;panel=null;rehomeId=null;moveTank=null;message="";restoreFocus=true;panelReturn="tanks";changed();render();
    }
    function contest(){
      if(s.petLife.contest)return contestStage();
      const p=s.petLife,c=P.courses.find(c=>c.id===course),today=ctx.day();
      const choices=kind==="fish"?p.fish.map(f=>({id:f.uid,name:`${fishName(f)} · ${P.cm(f.length)}cm · Lv.${f.level} · 第${f.generation+1}世代 ★${f.stars}`})) : ctx.dogs;
      if(!choices.some(a=>a.id===participant))participant=choices[0]?.id||"";
      const entered=p.entries[`${kind}:${course}`]===today;
      const last=p.lastResult;
      const lastSubject=last?.subject||(last?.kind==="fish"?ctx.catalog.find(f=>f.name===last.name)?.id:ctx.dogs.find(d=>d.name===last?.name)?.id)||"";
      let guide=kind==="bond"?`なつき度で採点。今の評価は${Math.round((s.dogAffinity[participant]||0)/20)}点。`:
        kind==="tricks"?`5つの芸に挑戦。今の一芸あたりの成功率は${Math.round(P.trickChance(s,participant)*100)}%。`:
        "レベル35点、成長と★25点、元気25点、水質15点。上級は長く育てた魚の晴れ舞台。";
      return `<div class="pet-contest-selectors"><label>種目<select id="petContestKind">${Object.entries(P.kinds).map(([id,name])=>`<option value="${id}" ${kind===id?"selected":""}>${name}</option>`).join("")}</select></label><label>参加する子<select id="petContestParticipant" ${choices.length?"":"disabled"}>${choices.length?choices.map(a=>`<option value="${a.id}" ${participant===a.id?"selected":""}>${esc(a.name)}</option>`).join(""):'<option value="">飼育中の魚がいない</option>'}</select></label></div>
        <div class="pet-course-options">${P.courses.map(c=>`<button data-pet-course="${c.id}" aria-pressed="${course===c.id}"><b>${c.name}</b><small>参加費 ${c.fee}円</small></button>`).join("")}</div>
        <p>${guide}</p><p class="pet-note">観客評価は±5点ほど。初級・中級の村人と犬は毎回変わり、上級では強豪の相棒に挑むよ。同点は同順位。各種目・各コースに一日1回。優勝賞金${c.prize}円、2位${Math.floor(c.prize*.5)}円、3位${Math.floor(c.prize*.25)}円。</p>
        ${s.tournament?'<p class="pet-note">釣り大会の終了後に参加できるよ。</p>':""}${btn("enter",entered?"今日は参加済み":`${c.name}に参加する · ${c.fee}円`,entered||!participant||s.money<c.fee||!!s.tournament)}
        ${last?`<section class="pet-contest-result" aria-label="前回のコンテスト結果">${root.ShuEventCeremony.markup({kind:last.kind,rank:last.rank,subject:lastSubject})}<div class="pet-result-detail"><small>${P.kinds[last.kind]}・${P.courses.find(c=>c.id===last.course).name}／${last.day+1}日目</small><h3>${esc(last.name)} · ${last.score}点</h3><p>${esc(last.detail)}</p>${last.marks.length?`<ol class="pet-trick-results">${last.marks.map((ok,i)=>`<li style="--delay:${i*.2}s">${last.commands?.[i]||P.TRICKS[i]} ${ok?"○":"△"}</li>`).join("")}</ol>`:""}${standingTable(last)}<b>賞金 ${last.reward}円 · 受け取り済み</b><p class="pet-note">${last.rank===1?"アスアル「丁寧なお世話が実ったわね。おめでとう」":"アスアル「積み重ねはちゃんと力になる。また一緒に挑戦しましょう」"}</p></div></section>`:""}`;
    }
    function standingTable(a){
      if(!a.judges?.length)return "";
      const rows=[{owner:"あなた",dog:a.name,score:a.score},...a.judges].sort((a,b)=>b.score-a.score);
      return `<ol class="pet-standings" aria-label="審査順位">${rows.map(row=>`<li><b>${1+rows.filter(r=>r.score>row.score).length}位</b><span>${esc(row.owner)} · ${esc(row.dog)}</span><strong>${row.score}点</strong></li>`).join("")}</ol>`;
    }
    function contestStage(){
      const a=s.petLife.contest,c=P.courses.find(c=>c.id===a.course),trick=a.kind==="tricks",fish=a.kind==="fish",last=a.marks.at(-1);
      const reacting=contestCue&&elapsed-contestCue.at<1.8;
      const cue=reacting?(contestCue.success?"やった！":"あれれ…"):
        a.phase==="entrance"?"いっしょに、いこう！":a.phase==="judging"?"観客の審査を待とう":trick?"どの芸を指示する？":"いつもの仲良しな姿を見せよう";
      return `<div class="pet-stage-heading"><b>${P.kinds[a.kind]} · ${c.name}</b><small>参加費は支払い済み。閉じても続きを再開できるよ。</small></div>
        <div class="pet-live-stage ${fish?"fish-exhibition":"dog-exhibition"} ${a.phase==="entrance"?"is-entrance":""} ${reacting?contestCue.success?"is-cheering":"is-puzzled":""}" aria-label="${esc(a.name)}のステージ">
          <div class="pet-stage-curtain"></div><div class="pet-stage-lamps"><i></i><i></i><i></i><i></i></div>
          <div class="pet-stage-audience">${["gen","mina","take","haru"].map((id,i)=>`<canvas width="96" height="128" data-tournament-portrait="${id}" aria-hidden="true" style="--spectator:${i}"></canvas>`).join("")}</div>
          <div class="pet-stage-floor"></div>${fish?`<div class="pet-stage-aquarium"><div class="pet-stage-fish" data-contest-fish="${a.subject}"></div><div class="pet-stage-gravel"></div></div>`:`<canvas class="pet-stage-dog" width="144" height="128" data-contest-dog="${a.subject}" aria-label="${esc(a.name)}"></canvas>`}
          <div class="pet-stage-reaction ${reacting&&!contestCue.success?"is-sweating":""}" role="status">${reacting&&!contestCue.success?"〰〰　💧":esc(cue)}</div><strong class="pet-stage-name">${esc(a.name)}</strong>
        </div>
        <p class="pet-stage-direction">${a.phase==="entrance"?`${esc(a.name)}が舞台へ入場。観客に挨拶しよう。`:a.phase==="judging"?"演技が終わった！観客の拍手と審査点を見て、結果発表へ。":trick?"ひとつずつ声をかけよう。成功率は芸の習熟度で決まるよ。":fish?a.detail:"呼びかけると相棒が近寄り、しっぽを振って応える。なつき度を観客が見守っている。"}</p>
        ${trick&&a.phase!=="entrance"?`<div class="pet-trick-commands" role="group" aria-label="犬に芸を指示">${P.TRICKS.map(t=>{const index=a.commands.indexOf(t);return `<button data-pet-trick="${t}" ${index>=0||a.phase!=="performance"?"disabled":""}><b>${t}${index>=0?` ${a.marks[index]?"○":"△"}`:""}</b><span class="pet-proficiency"><i style="width:${a.chance*100}%"></i></span><small>習熟 · 成功率 ${Math.round(a.chance*100)}%</small></button>`;}).join("")}</div>`:""}
        <div class="pet-contest-rivals" aria-label="ほかの参加者">${a.judges.map(j=>`<article><canvas width="96" height="128" ${["liao","asual","dancer"].includes(j.art)?`data-rival-art="${j.art}"`:`data-tournament-portrait="${j.art}"`} aria-hidden="true"></canvas>${fish?"":`<canvas width="80" height="72" data-contest-dog="${j.dogArt}" aria-hidden="true"></canvas>`}<span><b>${esc(j.owner)}${fish?"":` ＆ ${esc(j.dog)}`}</b><small>${fish?"飼育魚の出品者":esc(j.breed)}${a.phase==="judging"?` · 審査 ${j.score}点`:""}</small></span></article>`).join("")}</div>
        ${a.phase==="performance"&&trick?`<p>${a.commands.length}/5の芸を披露したよ。</p>`:btn("contest-next",a.phase==="entrance"?"舞台に立つ":a.phase==="performance"?fish?"泳ぎと成長を披露する":"相棒を呼んで応える": "審査結果を発表する")}`;
    }
    function render(){
      if(focus&&!P.residents(s).some(a=>a.uid===s.petLife.selected))focus=false;
      pause();P.sync(s,ctx.catalog,ctx.day());modal.classList.toggle("pet-zoomed",mode==="aquarium"&&zoom);modal.classList.toggle("pet-aquarium",mode==="aquarium");
      modal.innerHTML=`<div class="pet-shell">${header()}<p class="pet-message" role="status" ${mode==="aquarium"&&!message?"hidden":""}>${esc(message||(mode==="aquarium"?"":"毎日、少しずつ仲良くなろう。"))}</p><div class="pet-content">${mode==="aquarium"?tank():shop()}</div></div>`;
      ctx.paintRivals();ctx.paintVillagers?.();
      paintContest();
      if(mode==="aquarium")for(const f of P.residents(s))ctx.prepareFish?.(f.species);
      for(const el of modal.querySelectorAll("[data-pet-preview]"))ctx.drawFish(el,el.dataset.petPreview,0);
      for(const el of modal.querySelectorAll("[data-pet-card-art]")){
        const f=s.petLife.fish.find(a=>a.uid===el.dataset.petCardArt);if(f){ctx.prepareFish?.(f.species);ctx.drawFish(el,f.species,0,null,f);}
      }
      paintSpecimens();
      clearTimeout(toastTimer);if(mode==="aquarium"&&message)toastTimer=setTimeout(()=>{message="";modal.querySelector(".pet-message")?.setAttribute("hidden","");},4500);
      if(panel)modal.querySelector('.pet-sheet [data-pet-action="panel-close"]')?.focus({preventScroll:true});
      else if(restoreFocus){restoreFocus=false;(modal.querySelector(`[data-pet-action="${panelReturn}"]`)||modal.querySelector('[data-pet-action="tanks"]'))?.focus({preventScroll:true});}
      if(live())start();
      ctx.presentationChanged?.();
    }
    function paintSpecimens(){
      for(const el of modal.querySelectorAll("[data-pet-specimen]")){
        const f=s.petLife.fish.find(a=>a.uid===el.dataset.petSpecimen);if(!f)continue;
        const box=el.parentElement.getBoundingClientRect(),ratio=ctx.ratio(f.species)||2;
        const dims=root.ShuAquariumLife.specimenDimensions(f,spec(f.species),box.width||180,box.height||90,ratio);
        el.style.width=`${dims.width}px`;el.style.height=`${dims.height}px`;
        ctx.prepareFish?.(f.species);ctx.drawFish(el,f.species,0,null,f);
      }
    }
    function paintContest(){
      const reduced=matchMedia("(prefers-reduced-motion: reduce)").matches,time=reduced?0:elapsed;
      const active=s.petLife.contest,reacting=contestCue&&elapsed-contestCue.at<1.8;
      for(const el of modal.querySelectorAll("[data-contest-dog]")){
        ctx.drawContestDog?.(el,el.dataset.contestDog,{trick:reacting?contestCue.trick:null,success:reacting?contestCue.success:null,elapsed:reduced?0:elapsed-(contestCue?.at||0),phase:active?.phase});
      }
      for(const el of modal.querySelectorAll("[data-contest-fish]")){
        const pose=ctx.pose(el.dataset.contestFish,time,0);ctx.drawFish(el,el.dataset.contestFish,pose.frame,pose);
        el.style.transform=`translate(-50%,-50%) translate(${Math.round(Math.sin(time*1.5)*26)}px,${Math.round(Math.cos(time*1.1)*6)}px)`;
      }
      const stage=modal.querySelector(".pet-live-stage");
      if(stage){stage.classList.toggle("is-cheering",!!reacting&&contestCue.success);stage.classList.toggle("is-puzzled",!!reacting&&!contestCue.success);}
    }
    function paint(now){
      frame=0;if(!live()||document.hidden){stop();return;}
      const reduced=matchMedia("(prefers-reduced-motion: reduce)").matches;
      if(!lastPaint||now-lastPaint>=50){
        elapsed+=(lastPaint?Math.min(100,now-lastPaint):0)/1000;lastPaint=now;
        paintContest();
        const group=P.residents(s),stage=modal.querySelector("#petTankStage"),inspectStage=modal.querySelector("#petInspectStage");
        if(group.length&&stage){
          const box=stage.getBoundingClientRect(),poses=root.ShuAquariumLife.layout(group,ctx.catalog,box.width,box.height,elapsed,ctx.ratio,feeding,reduced).poses;
          for(const pose of poses){
            const el=modal.querySelector(`[data-pet-fish="${pose.uid}"]`),target=stage.querySelector(`[data-pet-inspect="${pose.uid}"]`),pellet=modal.querySelector(`[data-pet-pellet="${pose.uid}"]`);if(!el)continue;
            el.style.width=`${pose.width}px`;el.style.height=`${pose.height}px`;el.style.left=`${pose.x}px`;el.style.top=`${pose.y}px`;
            el.style.transform=`translate(-50%,-50%) scaleX(${pose.flip})${pose.bite?" scaleY(1.08)":""}`;
            el.style.opacity=pose.depth;el.style.zIndex=String(5+Math.round(pose.y));
            if(target){target.style.width=`${Math.max(44,pose.width)}px`;target.style.height=`${Math.max(44,pose.height)}px`;
              target.style.left=`${pose.x}px`;target.style.top=`${pose.y}px`;target.style.zIndex=String(260+Math.round(pose.y));
              target.style.setProperty("--marker-width",`${Math.max(16,Math.min(36,pose.width*.55))}px`);
              target.style.setProperty("--marker-height",`${Math.max(12,Math.min(24,pose.height*.8))}px`);
              target.classList.toggle("is-small",pose.width<28);}
            el.classList.toggle("pet-biting",pose.bite);
            if(pellet){pellet.hidden=!pose.food; if(pose.food){pellet.style.left=`${pose.food.x}px`;pellet.style.top=`${pose.food.y}px`;}}
            ctx.drawFish(el,pose.species,pose.swimFrame,pose,group.find(f=>f.uid===pose.uid));
            lastPoses[pose.uid]={x:pose.x,y:pose.y,yaw:pose.yaw};
          }
          if(feeding){
            const age=elapsed-feeding.at;
            feeding.ids.forEach((id,i)=>{if(age>=.95+i*.28&&!feeding.heard.has(id)){feeding.heard.add(id);ctx.feedSound?.();}});
            if(age>3.8)feeding=null;
          }
          stage.style.setProperty("--water-haze",String((100-Math.min(...group.map(f=>f.water)))/450));
        }else if(group.length&&inspectStage){
          const f=P.selected(s),el=modal.querySelector("#petInspectFish"),box=inspectStage.getBoundingClientRect();
          if(f&&el&&box.width&&box.height){
            const ratio=Math.max(.6,ctx.ratio(f.species)||2);
            const {width}=root.ShuAquariumLife.specimenDimensions(f,spec(f.species),box.width,box.height,ratio);
            const pose=root.ShuAquariumLife.inspection(f.species,elapsed,reduced);
            el.style.width=`${width}px`;el.style.height=`${width/ratio}px`;
            el.style.transform=`translate(-50%,-50%) scaleX(${pose.flip})`;
            el.style.left=`${pose.x}%`;el.style.top=`${pose.y}%`;
            ctx.drawFish(el,f.species,pose.swimFrame,pose,f);
            inspectStage.style.setProperty("--water-haze",String((100-f.water)/450));
          }
        }
      }
      if(!reduced&&mode==="aquarium"&&P.residents(s).length)frame=requestAnimationFrame(paint);
    }
    function start(){if(frame||!live()||document.hidden)return;lastPaint=0;frame=requestAnimationFrame(paint);}
    modal.onclick=event=>{
      const b=event.target.closest("button");if(!b||b.disabled||!live())return;
      if(b.dataset.petTank!==undefined){chooseTank(Number(b.dataset.petTank));return;}
      if(b.dataset.petMoveTarget!==undefined){moveTank=Number(b.dataset.petMoveTarget);rehomeId=null;render();return;}
      if(b.dataset.petPanelTab){panel=b.dataset.petPanelTab;rehomeId=null;render();return;}
      if(b.dataset.petTrick){const result=P.commandTrick(s,b.dataset.petTrick);if(result.ok){contestCue={...result,at:elapsed};message=`${result.trick} ${result.success?"成功！観客が拍手！":"うまくいかなかった。次の芸で取り戻そう。"}`;changed();render();}return;}
      if(b.dataset.petTab){tab=b.dataset.petTab;buybackId=null;buybackTank=null;message="";render();return;}
      if(b.dataset.petCourse){course=b.dataset.petCourse;render();return;}
      if(b.dataset.petBuy){const result=P.acquire(s,b.dataset.petBuy,ctx.catalog,ctx.day(),s.petLife.selectedTank);message=result.message;if(result.ok)changed();render();return;}
      if(b.dataset.petInspect){inspect(b.dataset.petInspect);return;}
      if(b.dataset.petBuybackTank!==undefined){const tank=Number(b.dataset.petBuybackTank);if(Number.isInteger(tank)&&tank>=0&&tank<s.petLife.unlockedTanks){buybackTank=tank;buybackId=null;render();}return;}
      if(b.dataset.petBuyback){buybackId=P.residents(s,buybackTank).some(f=>f.uid===b.dataset.petBuyback&&!P.isLegend(spec(f.species)))?b.dataset.petBuyback:null;render();return;}
      if(b.dataset.petNushi){const result=P.acquire(s,b.dataset.petNushi,ctx.catalog,ctx.day());message=result.message;if(result.ok)changed();render();return;}
      const action=b.dataset.petAction;
      if(["tanks","records","help"].includes(action)){panel=action;panelReturn=action;rehomeId=null;message="";render();return;}
      if(action==="panel-close"){panel=null;rehomeId=null;restoreFocus=true;render();return;}
      if(action==="tank-prev"||action==="tank-next"){const tanks=P.tankIds(s),index=tanks.indexOf(s.petLife.selectedTank);chooseTank(tanks[(index+(action==="tank-prev"?-1:1)+tanks.length)%tanks.length]);return;}
      if(action==="focus-selected"){inspect(s.petLife.selected);return;}
      if(action==="shop"){mode="shop";tab="fish";panel=null;focus=false;zoom=false;message="";render();return;}
      if(action==="buyback-cancel"){buybackId=null;render();return;}
      if(action==="buyback-tanks"){buybackId=null;buybackTank=null;render();return;}
      if(action==="legend-shop"){mode="shop";tab="legends";panel=null;focus=false;zoom=false;message="";render();return;}
      if(action==="buyback-confirm"){
        if(buybackTank===null||!P.residents(s,buybackTank).some(f=>f.uid===buybackId))return;
        const result=P.buyBack(s,buybackId,ctx.catalog,ctx.day());buybackId=null;message=result.message;
        if(result.ok)changed();render();return;
      }
      if(action==="rehome"){rehomeId=P.selected(s)?.uid||null;render();return;}
      if(action==="rehome-cancel"){rehomeId=null;render();return;}
      if(action==="rehome-confirm"){
        if(!rehomeId||rehomeId!==s.petLife.selected)return;
        const result=P.rehome(s,rehomeId,ctx.catalog,ctx.day());rehomeId=null;message=result.message;
        if(result.ok){feeding=null;focus=false;panel=null;ctx.stopFeedSound?.();changed();}render();return;
      }
      rehomeId=null;
      if(action==="close"){stop();ctx.close();return;}
      if(action==="aquarium"){mode="aquarium";panel=null;focus=false;zoom=false;message="";render();return;}
      if(action==="focus-close"){focus=false;message="";render();return;}
      if(action==="zoom"){feeding=null;zoom=!zoom;render();return;}
      if(action==="move"){if(!Number.isInteger(moveTank))return;const result=P.moveFish(s,s.petLife.selected,moveTank,ctx.catalog,ctx.day());message=result.message;if(result.ok){feeding=null;focus=false;panel=null;changed();}render();return;}
      if(action==="feed"||action==="water"){
        const result=P.care(s,s.petLife.selected,action,ctx.day(),ctx.catalog);message=result.message;if(result.ok)changed();render();
        if(result.ok){
          if(action==="feed"){
            if(matchMedia("(prefers-reduced-motion: reduce)").matches)ctx.feedSound?.();
            else feeding={ids:result.fed,at:elapsed,origins:{...lastPoses},heard:new Set()};
          }else modal.querySelector("#petTankStage")?.classList.add("pet-cleaning");
        }return;
      }
      if(action==="nushi"){const result=P.acquire(s,"nushi",ctx.catalog,ctx.day());message=result.message;if(result.ok)changed();render();return;}
      if(action==="food-1"||action==="food-10"){
        const count=action==="food-1"?1:10;
        const ok=P.buyFood(s,count);message=ok?`魚のエサを${count*10}食買った。`:"お金かエサ袋の空きが足りないよ。";if(ok)changed();render();return;
      }
      if(action==="tank"){
        const result=P.buyTank(s);message=result.message;if(result.ok)changed();render();return;
      }
      if(action==="contest-next"){const result=P.advanceContest(s);message=result.result?"審査が終わったよ。順位と観客の評価を見てみよう。":s.petLife.contest?.phase==="performance"?"舞台へどうぞ！":result.message||"観客の審査が始まるよ。";if(result.ok){contestCue={success:true,trick:null,at:elapsed};changed();}render();return;}
      if(action==="enter"){
        const result=P.beginContest(s,kind,course,participant,ctx.day(),ctx.catalog,ctx.dogs);
        message=result.ok?"受付完了。相棒と舞台へ行こう！":result.message;
        if(result.ok)changed();render();
        modal.querySelector(".pet-contest-result")?.scrollIntoView?.({block:"nearest",behavior:"auto"});
      }
    };
    modal.onchange=event=>{
      const el=event.target;if(!live())return;rehomeId=null;
      if(el.id==="petTankSelect"){feeding=null;focus=false;zoom=false;P.selectTank(s,Number(el.value));message="";changed();render();}
      else if(el.id==="petFishSelect")inspect(el.value);
      else if(el.id==="petContestKind"&&P.kinds[el.value]){kind=el.value;render();}
      else if(el.id==="petContestParticipant"){participant=el.value;render();}
    };
    modal.onkeydown=event=>{
      if(!panel)return;
      if(event.key==="Escape"){event.preventDefault();event.stopPropagation();panel=null;rehomeId=null;restoreFocus=true;render();return;}
      if(event.key!=="Tab")return;
      const sheet=modal.querySelector(".pet-sheet"),items=[...sheet.querySelectorAll('button:not([disabled]),select:not([disabled])')].filter(el=>el.getClientRects().length),first=items[0],last=items.at(-1);
      if(!first)return;
      if(!sheet.contains(document.activeElement)||(event.shiftKey&&document.activeElement===first)||(!event.shiftKey&&document.activeElement===last)){event.preventDefault();(event.shiftKey?last:first).focus({preventScroll:true});}
    };
    document.addEventListener("visibilitychange",()=>document.hidden?stop():start());
    window.addEventListener("pagehide",stop);
    window.addEventListener("resize",()=>{if(live()){paintSpecimens();if(mode==="aquarium"){stop();start();}}});
    return {open,render,stop,get mode(){return mode;},get active(){return live();},
      get music(){return live()&&mode==="shop"&&tab==="contests"?(kind==="fish"?"contest-fish":"contest-pet"):null;}};
  }
  root.ShuPetUI={create};
})(typeof globalThis!=="undefined"?globalThis:this);
