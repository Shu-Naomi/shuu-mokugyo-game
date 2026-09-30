/* The pet shop and carrying tanks reuse the game's original fish/dog art. */
(function(root){
  "use strict";
  function create(ctx){
    const P=root.ShuPetLife,s=ctx.state,esc=value=>String(value??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"})[c]);
    const modal=document.createElement("section");
    modal.id="petLifeModal";modal.className="modal pet-life-modal";modal.setAttribute("role","dialog");
    modal.setAttribute("aria-modal","true");modal.setAttribute("aria-labelledby","petLifeTitle");ctx.parent.append(modal);
    let mode="aquarium",tab="fish",kind="bond",course="beginner",participant=s.dog,message="",zoom=false,focus=false,frame=0,lastPaint=0,started=0,feeding=null,lastPoses={},elapsed=0,rehomeId=null,buybackId=null,contestCue=null;
    const spec=id=>ctx.catalog.find(f=>f.id===id);
    const live=()=>modal.classList.contains("open");
    const fishName=f=>`${spec(f.species).name} #${f.uid.slice(4)}`;
    const btn=(action,label,disabled=false)=>`<button data-pet-action="${action}" ${disabled?"disabled":""}>${label}</button>`;
    function pause(){cancelAnimationFrame(frame);frame=0;}
    function stop(){pause();feeding=null;rehomeId=null;buybackId=null;ctx.stopFeedSound?.();}
    function changed(){ctx.changed();}
    function open(view="aquarium"){
      if(!ctx.canOpen())return false;
      ctx.close();mode=view;zoom=false;focus=false;message="";tab="fish";buybackId=null;rehomeId=null;
      if(s.petLife.contest){mode="shop";tab="contests";kind=s.petLife.contest.kind;course=s.petLife.contest.course;participant=s.petLife.contest.participant;}
      if(view==="shop")message="アスアル「育てる時間も、立派な楽しみよ。クラウドと一緒に待っていたわ」";
      P.sync(s,ctx.catalog,ctx.day());render();ctx.open(modal.id);start();return true;
    }
    function header(){
      return `<header class="pet-heading"><div><small>${mode==="aquarium"?"MY LITTLE AQUARIUM":"ASUAL'S PET HOUSE"}</small><h2 id="petLifeTitle">${mode==="aquarium"?"持ち歩き飼育水槽":"アスアルのペットショップ"}</h2></div><span class="pet-money">${s.money.toLocaleString("ja-JP")}円</span>${btn("close","閉じる")}</header>`;
    }
    function shop(){
      const p=s.petLife,known=ctx.catalog.filter(f=>f.id!=="nushi"&&s.caught?.[f.id]>0),locked=ctx.catalog.filter(f=>f.id!=="nushi").length-known.length;
      const nextPrice=P.TANK_PRICES[p.unlockedTanks];
      return `<div class="pet-shop-host"><canvas width="96" height="128" data-rival-art="asual" role="img" aria-label="店主アスアル"></canvas><div><b>水車の家のペットショップ</b><p>魚との出会い、お世話用品、ワンコと魚のコンテスト。</p><small>飼育魚 ${p.fish.length}/${p.unlockedTanks*P.TANK_CAPACITY}匹 ・ 水槽 ${p.unlockedTanks}/6槽 ・ 魚のエサ ${p.food}食</small></div><canvas width="128" height="96" data-rival-art="cloud" role="img" aria-label="クラウド"></canvas></div>
        <nav class="pet-tabs" aria-label="ペットショップの売り場">${[["fish","魚の生体"],["supplies","お世話用品・水槽"],["buyback","魚の買い取り"],["contests","コンテスト受付"]].map(([id,label])=>`<button data-pet-tab="${id}" aria-pressed="${tab===id}">${label}</button>`).join("")}${btn("aquarium","飼育水槽を見る")}</nav>
        ${tab==="fish"?`<p class="pet-note">自分で釣って図鑑に登録した魚種から迎えられるよ。未登録 ${locked}種。1槽に同じ水の魚を5匹まで。</p>${tankPicker("迎える水槽")}<div class="pet-stock">${known.length?known.map(f=>`<article><div class="pet-fish-thumb" data-pet-preview="${f.id}" role="img" aria-label="${f.name}"></div><div><b>${f.name}</b><small>${P.cm(f.start)}cm ・ ${f.waterLabel}</small><button data-pet-buy="${f.id}" ${!P.canHouse(s,f.id,ctx.catalog,p.selectedTank)||s.money<f.price?"disabled":""}>迎える · ${f.price.toLocaleString("ja-JP")}円</button></div></article>`).join(""):'<p class="pet-note">魚を一匹釣ると、その魚種の販売が始まるよ。</p>'}</div>`:
          tab==="supplies"?`<div class="pet-supplies"><h3>魚のエサ</h3><p>淡水魚にも海水魚にも使える飼育用のエサ。1匹に一日1食。</p>${btn("food-1","10食 · 100円",s.money<100)}${btn("food-10","100食 · 1,000円",s.money<1000)}<h3>飼育水槽</h3><p>最初の水槽と10食は用意してあるよ。新しい水槽を買うと、同じ水の魚をさらに5匹迎えられる。</p>${nextPrice?btn("tank",`水槽${p.unlockedTanks+1}を購入 · ${nextPrice.toLocaleString("ja-JP")}円`,s.money<nextPrice):'<p>水槽は6槽そろっているよ。</p>'}<p>水換えは飼育水槽から無料でできるよ。</p></div>`:
          tab==="buyback"?buyback():contest()}`;
    }
    function buyback(){
      const fish=s.petLife.fish.filter(f=>f.species!=="nushi");
      return `<p class="pet-note">健康に育った魚をアスアルが買い取るよ。体長が成魚の大きさになり、3日以上お世話をして元気60%以上が目安。手放した魚は水槽からいなくなるよ。</p><div class="pet-buyback-list">${fish.length?fish.map(f=>{
        const quote=P.buyBackQuote(f,ctx.catalog),confirm=buybackId===f.uid;
        return `<article><div><b>${esc(fishName(f))}</b><small>水槽${f.tank+1} ・ ${P.cm(f.length)}cm ・ ${f.sex==="female"?"♀":"♂"} ・ 第${f.generation+1}世代 ${"★".repeat(f.stars)}</small><small>${quote.eligible?`${quote.price.toLocaleString("ja-JP")}円で買い取り`:esc(quote.reason)}</small></div><div>${confirm?`<p>この魚を${quote.price.toLocaleString("ja-JP")}円で売る？</p>${btn("buyback-confirm","買い取りを確定",!quote.eligible)}${btn("buyback-cancel","やめる")}`:`<button data-pet-buyback="${f.uid}" ${quote.eligible?"":"disabled"}>買い取りを相談する</button>`}</div></article>`;
      }).join(""):'<p>買い取りを相談できる魚はまだいないよ。</p>'}</div>`;
    }
    function tankPicker(label="水槽"){
      return `<label class="pet-tank-picker">${label}<select id="petTankSelect">${Array.from({length:s.petLife.unlockedTanks},(_,i)=>{
        const group=P.residents(s,i),water=group.length?spec(group[0].species).waterLabel:"空き";
        return `<option value="${i}" ${s.petLife.selectedTank===i?"selected":""}>水槽${i+1} · ${group.length}/5匹 · ${water}</option>`;
      }).join("")}</select></label>`;
    }
    function inspect(uid){
      const f=P.residents(s).find(a=>a.uid===uid);
      if(!f||mode!=="aquarium")return;
      const changedSelection=s.petLife.selected!==uid;
      s.petLife.selected=uid;focus=true;zoom=false;feeding=null;rehomeId=null;
      ctx.stopFeedSound?.();
      message=`${fishName(f)}を大きく表示中。全体表示では実際の体長比で泳ぐよ。`;
      if(changedSelection)changed();
      render();
    }
    function tank(){
      const p=s.petLife,group=P.residents(s),eggs=P.eggsIn(s),f=P.selected(s),today=ctx.day(),hungry=group.filter(a=>a.fedDay!==today);
      const dims=root.ShuAquariumLife.dimensions(group,ctx.catalog);
      return `<div class="pet-tank-heading">${tankPicker("水槽を切り替える")}${focus?btn("focus-close","水槽全体へ戻る"):btn("zoom",zoom?"全体表示に戻る":"水槽全体を拡大",!group.length)}</div>
        <div class="pet-tank-summary" aria-label="水槽の状態"><strong>水槽${p.selectedTank+1}</strong><span>${group.length}/5匹${eggs.length?` ・ 卵${eggs.length}組（空き予約）`:""}</span><span>${group.length?`${spec(group[0].species).waterLabel} ・ 水質 ${Math.min(...group.map(a=>a.water))}%`:"魚はまだいないよ"}</span><span>エサ ${p.food}食</span></div>
        ${group.length||eggs.length?`<p class="pet-view-help">${focus?"選んだ魚を見やすい大きさで表示中。魚の一覧や選択欄から別の子にも切り替えられるよ。":"魚にタッチ、または下の一覧から選ぶと、一匹を大きく見られるよ。水槽全体は実際の体長比で表示。"}</p>
        <div class="pet-fish-roster" role="group" aria-label="この水槽の魚を選んで拡大">${group.map(a=>`<button data-pet-inspect="${a.uid}" aria-pressed="${a.uid===p.selected}"><b>${esc(fishName(a))}</b><small>${P.cm(a.length)}cm ・ ${ctx.sizeLabel(a.species,a.length)} ・ ${a.sex==="female"?"♀":"♂"}</small></button>`).join("")}</div>
        <div class="pet-tank-layout">${focus?`<div id="petInspectStage" class="aquarium-tank pet-tank-stage pet-inspect-stage" role="img" aria-label="${esc(fishName(f))}を拡大表示。${P.cm(f.length)}cm、${ctx.sizeLabel(f.species,f.length)}。水槽全体の体長比ではない表示">
          <div class="pet-water-light"></div><div class="pet-tank-back"></div><div class="pet-gravel"></div><div class="pet-rock"></div><div class="pet-plant plant-left"></div><div class="pet-plant plant-right"></div>
          <div id="petInspectFish" class="aquarium-fish pet-inspect-fish" aria-hidden="true"></div><div class="pet-glass"></div>
          <div class="pet-inspect-caption"><strong>${esc(fishName(f))} ・ ${P.cm(f.length)}cm ・ ${ctx.sizeLabel(f.species,f.length)}</strong><small>一匹ずつ大きく表示中 · 水槽全体の縮尺とは別</small></div>
        </div>`:`<div id="petTankStage" class="aquarium-tank pet-tank-stage" role="group" aria-label="${group.map(fishName).join("、")}、${group.length}匹が泳ぐ飼育水槽">
          <div class="pet-water-light"></div><div class="pet-tank-back"></div><div class="pet-gravel"></div><div class="pet-rock"></div><div class="pet-plant plant-left"></div><div class="pet-plant plant-right"></div>
          ${Array.from({length:5},(_,i)=>`<i class="pet-bubble" style="--bubble:${i}"></i>`).join("")}
          ${eggs.map((egg,i)=>`<div class="pet-eggs egg-${["yamame","nijimasu"].includes(egg.species)?"gravel":"plant"}" style="--egg-slot:${i}" role="img" aria-label="${esc(spec(egg.species).name)}の卵、孵化まであと${Math.max(0,egg.hatchDay-today)}日"><i></i><i></i><i></i><i></i><i></i></div>`).join("")}
          ${group.map(a=>`<div class="aquarium-fish pet-resident" data-pet-fish="${a.uid}" aria-hidden="true"></div><button class="pet-fish-target" data-pet-inspect="${a.uid}" aria-label="${esc(fishName(a))}を拡大する" aria-pressed="${a.uid===p.selected}"></button><i class="pet-pellet" data-pet-pellet="${a.uid}"></i>`).join("")}
          <div class="pet-glass"></div><div class="pet-scale" style="width:${dims.rulerCm/dims.widthCm*100}%">${dims.rulerCm}cm</div><span class="pet-tank-width">水槽幅 ${dims.widthCm}cm</span>
          <div class="pet-tank-caption">${group.length}匹 · ${spec(group[0]?.species||eggs[0]?.species).waterLabel} <small>${f?`${spec(f.species).name} ${P.cm(f.length)}cm · ${ctx.sizeLabel(f.species,f.length)}`:""}</small></div>
        </div>`}<div class="pet-tank-info"><label for="petFishSelect">魚を選んで大きく見る</label><select id="petFishSelect">${group.map(a=>`<option value="${a.uid}" ${a.uid===p.selected?"selected":""}>${esc(fishName(a))} · ${P.cm(a.length)}cm ・ ${ctx.sizeLabel(a.species,a.length)}</option>`).join("")}</select>
          ${f?`<h3>${fishName(f)}</h3><div class="pet-stats"><span>体長 <b>${P.cm(f.length)}cm</b></span><span>サイズ <b data-pet-size-rank>${ctx.sizeLabel(f.species,f.length)}</b></span><span>レベル <b>Lv.${f.level}</b></span><span>経験値 <b>${f.xp}/${f.level>=20?"MAX":P.xpForLevel(f.level+1)}</b></span><span>元気 <b>${f.health}%</b></span><span>水質 <b>${f.water}%</b></span><span>成長 <b>＋${P.cm(f.length-f.bornSize)}cm</b></span><span>1日の成長 <b>${P.cm(P.dailyGrowth(spec(f.species)))}cm</b></span><span>一緒に <b>${today-f.acquiredDay+1}日目</b></span><span>性別 <b>${f.sex==="female"?"♀ メス":"♂ オス"}</b></span><span>世代・星 <b>第${f.generation+1}世代 ${"★".repeat(f.stars)}</b></span></div>`:""}
          ${eggs.length?`<p class="pet-egg-notice" role="status">${eggs.map(e=>`${esc(spec(e.species).name)}の卵 · 孵化まであと${Math.max(0,e.hatchDay-today)}日`).join(" ／ ")}。生まれてくる子の場所を確保しているよ。</p>`:""}
          ${p.lastBirth?.tank===p.selectedTank&&p.lastBirth.day===today?`<p class="pet-birth" role="status">✨ ${esc(spec(p.lastBirth.species).name)}の稚魚が生まれたよ！ 水槽の仲間を見てみよう。</p>`:""}
          <p>${hungry.length?`まだ食べていない子 ${hungry.length}匹`:"今日はみんなエサやり済み"} ・ エサ残り${p.food}食</p><div class="pet-care-actions">${btn("feed",`みんなにエサ${hungry.length?` · ${hungry.length}食`:""}`,!hungry.length||p.food<hungry.length||!f)}${btn("water","水槽の水換え",!f||group.every(a=>a.changedDay===today)||group.every(a=>a.water>=100))}</div>
          <p class="pet-note">水質40%以上で毎日エサを食べると、翌日魚種に応じて1〜5cm成長するよ。成魚のオスとメスを同じ水槽で、水質60%以上・元気70%以上のまま3日育てると卵を産むよ。卵は2〜4日で孵化（空きを予約）。エサやり＋6XP、水換え＋4XPは一日一回。レベルと★を育てて品評会へ！</p>
          <label class="pet-move-label">お引っ越し先<select id="petMoveTank">${Array.from({length:p.unlockedTanks},(_,i)=>i).filter(i=>f&&i!==p.selectedTank&&P.canHouse(s,f.species,ctx.catalog,i)).map(i=>`<option value="${i}">水槽${i+1} · ${P.residents(s,i).length}/5匹</option>`).join("")}</select></label>${btn("move","この魚を移す",!f||!Array.from({length:p.unlockedTanks},(_,i)=>i).some(i=>i!==p.selectedTank&&P.canHouse(s,f.species,ctx.catalog,i)))}
          ${f&&f.species!=="nushi"?`<div class="pet-rehome">${rehomeId===f.uid?`<p>${esc(fishName(f))}（${P.cm(f.length)}cm）をアスアルに託す？ この魚は水槽からいなくなり、元には戻せないよ。返金はないよ。</p>${btn("rehome-confirm","この魚を託す")}${btn("rehome-cancel","やめる")}`:btn("rehome","アスアルに託す")}</div>`:""}
        </div></div>`:'<div class="pet-empty"><span>🐟</span><h3>この水槽には、まだ魚がいないよ。</h3><p>湖の北東のアスアルのお店で迎えるか、別の水槽からお引っ越ししよう。</p></div>'}
        <footer class="pet-tank-footer"><span>全${p.fish.length}/${p.unlockedTanks*P.TANK_CAPACITY}匹 ・ 水槽${p.unlockedTanks}/6槽 ・ エサ ${p.food}食</span>${s.caught.nushi>0&&!p.nushiClaimed?btn("nushi","釣ったヌシを迎える",!P.canHouse(s,"nushi",ctx.catalog,p.selectedTank)):""}<small>自宅の展示水槽とは別に、1匹ずつ成長を記録するよ。水槽はアスアルから購入できるよ。</small></footer>`;
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
      pause();P.sync(s,ctx.catalog,ctx.day());modal.classList.toggle("pet-zoomed",zoom);
      modal.innerHTML=`<div class="pet-shell">${header()}<p class="pet-message" role="status">${esc(message||"毎日、少しずつ仲良くなろう。")}</p><div class="pet-content">${mode==="aquarium"?tank():shop()}</div></div>`;
      ctx.paintRivals();ctx.paintVillagers?.();
      paintContest();
      if(mode==="aquarium")for(const f of P.residents(s))ctx.prepareFish?.(f.species);
      for(const el of modal.querySelectorAll("[data-pet-preview]"))ctx.drawFish(el,el.dataset.petPreview,0);
      if(live())start();
      ctx.presentationChanged?.();
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
            ctx.drawFish(el,pose.species,pose.swimFrame,pose);
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
            const width=Math.min(box.width*.78,box.height*.68*ratio,420);
            const pose=root.ShuAquariumLife.inspection(f.species,elapsed,reduced);
            el.style.width=`${width}px`;el.style.height=`${width/ratio}px`;
            el.style.transform=`translate(-50%,-50%) scaleX(${pose.flip})`;
            el.style.left=`${pose.x}%`;el.style.top=`${pose.y}%`;
            ctx.drawFish(el,f.species,pose.swimFrame,pose);
            inspectStage.style.setProperty("--water-haze",String((100-f.water)/450));
          }
        }
      }
      if(!reduced&&mode==="aquarium"&&P.residents(s).length)frame=requestAnimationFrame(paint);
    }
    function start(){if(frame||!live()||document.hidden)return;lastPaint=0;frame=requestAnimationFrame(paint);}
    modal.onclick=event=>{
      const b=event.target.closest("button");if(!b||b.disabled||!live())return;
      if(b.dataset.petTrick){const result=P.commandTrick(s,b.dataset.petTrick);if(result.ok){contestCue={...result,at:elapsed};message=`${result.trick} ${result.success?"成功！観客が拍手！":"うまくいかなかった。次の芸で取り戻そう。"}`;changed();render();}return;}
      if(b.dataset.petTab){tab=b.dataset.petTab;buybackId=null;message="";render();return;}
      if(b.dataset.petCourse){course=b.dataset.petCourse;render();return;}
      if(b.dataset.petBuy){const result=P.acquire(s,b.dataset.petBuy,ctx.catalog,ctx.day(),s.petLife.selectedTank);message=result.message;if(result.ok)changed();render();return;}
      if(b.dataset.petInspect){inspect(b.dataset.petInspect);return;}
      if(b.dataset.petBuyback){buybackId=s.petLife.fish.some(f=>f.uid===b.dataset.petBuyback)?b.dataset.petBuyback:null;render();return;}
      const action=b.dataset.petAction;
      if(action==="buyback-cancel"){buybackId=null;render();return;}
      if(action==="buyback-confirm"){
        if(!buybackId)return;
        const result=P.buyBack(s,buybackId,ctx.catalog,ctx.day());buybackId=null;message=result.message;
        if(result.ok)changed();render();return;
      }
      if(action==="rehome"){rehomeId=P.selected(s)?.uid||null;render();return;}
      if(action==="rehome-cancel"){rehomeId=null;render();return;}
      if(action==="rehome-confirm"){
        if(!rehomeId||rehomeId!==s.petLife.selected)return;
        const result=P.rehome(s,rehomeId,ctx.catalog,ctx.day());rehomeId=null;message=result.message;
        if(result.ok){feeding=null;focus=false;ctx.stopFeedSound?.();changed();}render();return;
      }
      rehomeId=null;
      if(action==="close"){stop();ctx.close();return;}
      if(action==="aquarium"){mode="aquarium";focus=false;message="";render();return;}
      if(action==="focus-close"){focus=false;message="魚をタッチすると、また一匹を大きく見られるよ。";render();return;}
      if(action==="zoom"){feeding=null;zoom=!zoom;render();return;}
      if(action==="move"){const target=modal.querySelector("#petMoveTank");if(!target)return;const result=P.moveFish(s,s.petLife.selected,Number(target.value),ctx.catalog,ctx.day());message=result.message;if(result.ok){feeding=null;focus=false;changed();}render();return;}
      if(action==="feed"||action==="water"){
        const result=P.care(s,s.petLife.selected,action,ctx.day(),ctx.catalog);message=result.message;if(result.ok)changed();render();
        if(result.ok){
          if(action==="feed"){
            if(matchMedia("(prefers-reduced-motion: reduce)").matches)ctx.feedSound?.();
            else feeding={ids:result.fed,at:elapsed,origins:{...lastPoses},heard:new Set()};
          }else modal.querySelector("#petTankStage")?.classList.add("pet-cleaning");
        }return;
      }
      if(action==="nushi"){const result=P.acquire(s,"nushi",ctx.catalog,ctx.day(),s.petLife.selectedTank);message=result.message;if(result.ok)changed();render();return;}
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
    document.addEventListener("visibilitychange",()=>document.hidden?stop():start());
    window.addEventListener("pagehide",stop);
    window.addEventListener("resize",()=>{if(live()&&mode==="aquarium"){stop();start();}});
    return {open,render,stop,get mode(){return mode;},get active(){return live();},
      get music(){return live()&&mode==="shop"&&tab==="contests"?(kind==="fish"?"contest-fish":"contest-pet"):null;}};
  }
  root.ShuPetUI={create};
})(typeof globalThis!=="undefined"?globalThis:this);
