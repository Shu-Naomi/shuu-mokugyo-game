/* The pet shop and carrying tanks reuse the game's original fish/dog art. */
(function(root){
  "use strict";
  function create(ctx){
    const P=root.ShuPetLife,s=ctx.state,esc=value=>String(value??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"})[c]);
    const modal=document.createElement("section");
    modal.id="petLifeModal";modal.className="modal pet-life-modal";modal.setAttribute("role","dialog");
    modal.setAttribute("aria-modal","true");modal.setAttribute("aria-labelledby","petLifeTitle");ctx.parent.append(modal);
    let mode="aquarium",tab="fish",kind="bond",course="beginner",participant=s.dog,message="",zoom=false,frame=0,lastPaint=0,started=0,feeding=null,lastPoses={},elapsed=0,rehomeId=null,buybackId=null;
    const spec=id=>ctx.catalog.find(f=>f.id===id);
    const live=()=>modal.classList.contains("open");
    const fishName=f=>`${spec(f.species).name} #${f.uid.slice(4)}`;
    const btn=(action,label,disabled=false)=>`<button data-pet-action="${action}" ${disabled?"disabled":""}>${label}</button>`;
    function pause(){cancelAnimationFrame(frame);frame=0;}
    function stop(){pause();feeding=null;rehomeId=null;buybackId=null;ctx.stopFeedSound?.();}
    function changed(){ctx.changed();}
    function open(view="aquarium"){
      if(!ctx.canOpen())return false;
      ctx.close();mode=view;zoom=false;message="";tab="fish";buybackId=null;rehomeId=null;
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
    function tank(){
      const p=s.petLife,group=P.residents(s),f=P.selected(s),today=ctx.day(),hungry=group.filter(a=>a.fedDay!==today);
      const dims=root.ShuAquariumLife.dimensions(group,ctx.catalog);
      return `<div class="pet-tank-heading">${tankPicker()}${btn("zoom",zoom?"元の表示":"ズーム",!group.length)}</div>
        ${group.length?`<div class="pet-tank-layout"><div id="petTankStage" class="aquarium-tank pet-tank-stage" role="img" aria-label="${group.map(fishName).join("、")}、${group.length}匹が泳ぐ飼育水槽">
          <div class="pet-water-light"></div><div class="pet-tank-back"></div><div class="pet-gravel"></div><div class="pet-rock"></div><div class="pet-plant plant-left"></div><div class="pet-plant plant-right"></div>
          ${Array.from({length:5},(_,i)=>`<i class="pet-bubble" style="--bubble:${i}"></i>`).join("")}
          ${group.map(a=>`<div class="aquarium-fish pet-resident" data-pet-fish="${a.uid}" aria-hidden="true"></div><i class="pet-pellet" data-pet-pellet="${a.uid}"></i>`).join("")}
          <div class="pet-glass"></div><div class="pet-scale" style="width:${dims.rulerCm/dims.widthCm*100}%">${dims.rulerCm}cm</div><span class="pet-tank-width">水槽幅 ${dims.widthCm}cm</span>
          <div class="pet-tank-caption">${group.length}匹 · ${spec(group[0].species).waterLabel} <small>${f?`${spec(f.species).name} ${P.cm(f.length)}cm · ${ctx.sizeLabel(f.species,f.length)}`:""}</small></div>
        </div><div class="pet-tank-info"><label for="petFishSelect">様子を見る魚</label><select id="petFishSelect">${group.map(a=>`<option value="${a.uid}" ${a.uid===p.selected?"selected":""}>${fishName(a)} · ${P.cm(a.length)}cm</option>`).join("")}</select>
          ${f?`<h3>${fishName(f)}</h3><div class="pet-stats"><span>元気 <b>${f.health}%</b></span><span>水質 <b>${f.water}%</b></span><span>成長 <b>＋${P.cm(f.length-f.bornSize)}cm</b></span><span>1日の成長 <b>${P.cm(P.dailyGrowth(spec(f.species)))}cm</b></span><span>一緒に <b>${today-f.acquiredDay+1}日目</b></span><span>性別 <b>${f.sex==="female"?"♀ メス":"♂ オス"}</b></span><span>世代・星 <b>第${f.generation+1}世代 ${"★".repeat(f.stars)}</b></span></div>`:""}
          ${p.lastBirth?.tank===p.selectedTank&&p.lastBirth.day===today?`<p class="pet-birth" role="status">✨ ${esc(spec(p.lastBirth.species).name)}の稚魚が生まれたよ！ 水槽の仲間を見てみよう。</p>`:""}
          <p>${hungry.length?`まだ食べていない子 ${hungry.length}匹`:"今日はみんなエサやり済み"} ・ エサ残り${p.food}食</p><div class="pet-care-actions">${btn("feed",`みんなにエサ${hungry.length?` · ${hungry.length}食`:""}`,!hungry.length||p.food<hungry.length)}${btn("water","水槽の水換え",group.every(a=>a.changedDay===today)||group.every(a=>a.water>=100))}</div>
          <p class="pet-note">水質40%以上で毎日エサを食べると、翌日魚種に応じて1〜5cm成長するよ。成魚のオスとメスを同じ水槽で、水質60%以上・元気70%以上のまま3日育てると稚魚が生まれる（空きが必要）。★はお世話で増え、次の世代ほど早く育つよ。</p>
          <label class="pet-move-label">お引っ越し先<select id="petMoveTank">${Array.from({length:p.unlockedTanks},(_,i)=>i).filter(i=>f&&i!==p.selectedTank&&P.canHouse(s,f.species,ctx.catalog,i)).map(i=>`<option value="${i}">水槽${i+1} · ${P.residents(s,i).length}/5匹</option>`).join("")}</select></label>${btn("move","この魚を移す",!f||!Array.from({length:p.unlockedTanks},(_,i)=>i).some(i=>i!==p.selectedTank&&P.canHouse(s,f.species,ctx.catalog,i)))}
          ${f&&f.species!=="nushi"?`<div class="pet-rehome">${rehomeId===f.uid?`<p>${esc(fishName(f))}（${P.cm(f.length)}cm）をアスアルに託す？ この魚は水槽からいなくなり、元には戻せないよ。返金はないよ。</p>${btn("rehome-confirm","この魚を託す")}${btn("rehome-cancel","やめる")}`:btn("rehome","アスアルに託す")}</div>`:""}
        </div></div>`:'<div class="pet-empty"><span>🐟</span><h3>この水槽には、まだ魚がいないよ。</h3><p>湖の北東のアスアルのお店で迎えるか、別の水槽からお引っ越ししよう。</p></div>'}
        <footer class="pet-tank-footer"><span>全${p.fish.length}/${p.unlockedTanks*P.TANK_CAPACITY}匹 ・ 水槽${p.unlockedTanks}/6槽 ・ エサ ${p.food}食</span>${s.caught.nushi>0&&!p.nushiClaimed?btn("nushi","釣ったヌシを迎える",!P.canHouse(s,"nushi",ctx.catalog,p.selectedTank)):""}<small>自宅の展示水槽とは別に、1匹ずつ成長を記録するよ。水槽はアスアルから購入できるよ。</small></footer>`;
    }
    function contest(){
      const p=s.petLife,c=P.courses.find(c=>c.id===course),today=ctx.day();
      const choices=kind==="fish"?p.fish.map(f=>({id:f.uid,name:`${fishName(f)} · ${P.cm(f.length)}cm · 第${f.generation+1}世代 ★${f.stars}`})) : ctx.dogs;
      if(!choices.some(a=>a.id===participant))participant=choices[0]?.id||"";
      const entered=p.entries[`${kind}:${course}`]===today;
      const last=p.lastResult;
      const lastSubject=last?.subject||(last?.kind==="fish"?ctx.catalog.find(f=>f.name===last.name)?.id:ctx.dogs.find(d=>d.name===last?.name)?.id)||"";
      let guide=kind==="bond"?`なつき度で採点。今の評価は${Math.round((s.dogAffinity[participant]||0)/20)}点。`:
        kind==="tricks"?`5つの芸に挑戦。今の一芸あたりの成功率は${Math.round(P.trickChance(s,participant)*100)}%。`:
        "成長・体格と★で45点、元気35点、水質20点で採点。";
      return `<div class="pet-contest-selectors"><label>種目<select id="petContestKind">${Object.entries(P.kinds).map(([id,name])=>`<option value="${id}" ${kind===id?"selected":""}>${name}</option>`).join("")}</select></label><label>参加する子<select id="petContestParticipant" ${choices.length?"":"disabled"}>${choices.length?choices.map(a=>`<option value="${a.id}" ${participant===a.id?"selected":""}>${esc(a.name)}</option>`).join(""):'<option value="">飼育中の魚がいない</option>'}</select></label></div>
        <div class="pet-course-options">${P.courses.map(c=>`<button data-pet-course="${c.id}" aria-pressed="${course===c.id}"><b>${c.name}</b><small>参加費 ${c.fee}円</small></button>`).join("")}</div>
        <p>${guide}</p><p class="pet-note">同点は同順位。各種目・各コースに一日1回参加できるよ。優勝賞金${c.prize}円、2位${Math.floor(c.prize*.5)}円、3位${Math.floor(c.prize*.25)}円。</p>
        ${s.tournament?'<p class="pet-note">釣り大会の終了後に参加できるよ。</p>':""}${btn("enter",entered?"今日は参加済み":`${c.name}に参加する · ${c.fee}円`,entered||!participant||s.money<c.fee||!!s.tournament)}
        ${last?`<section class="pet-contest-result" aria-label="前回のコンテスト結果">${root.ShuEventCeremony.markup({kind:last.kind,rank:last.rank,subject:lastSubject})}<div class="pet-result-detail"><small>${P.kinds[last.kind]}・${P.courses.find(c=>c.id===last.course).name}／${last.day+1}日目</small><h3>${esc(last.name)} · ${last.score}点</h3><p>${esc(last.detail)}</p>${last.marks.length?`<ol class="pet-trick-results">${last.marks.map((ok,i)=>`<li style="--delay:${i*.2}s">${["おすわり","お手","待て","ターン","キャッチ"][i]} ${ok?"○":"△"}</li>`).join("")}</ol>`:""}<b>賞金 ${last.reward}円 · 受け取り済み</b><p class="pet-note">${last.rank===1?"アスアル「丁寧なお世話が実ったわね。おめでとう」":"アスアル「積み重ねはちゃんと力になる。また一緒に挑戦しましょう」"}</p></div></section>`:""}`;
    }
    function render(){
      pause();P.sync(s,ctx.catalog,ctx.day());modal.classList.toggle("pet-zoomed",zoom);
      modal.innerHTML=`<div class="pet-shell">${header()}<p class="pet-message" role="status">${esc(message||"毎日、少しずつ仲良くなろう。")}</p><div class="pet-content">${mode==="aquarium"?tank():shop()}</div></div>`;
      ctx.paintRivals();
      if(mode==="aquarium")for(const f of P.residents(s))ctx.prepareFish?.(f.species);
      for(const el of modal.querySelectorAll("[data-pet-preview]"))ctx.drawFish(el,el.dataset.petPreview,0);
      if(live())start();
      ctx.presentationChanged?.();
    }
    function paint(now){
      frame=0;if(!live()||document.hidden){stop();return;}
      const reduced=matchMedia("(prefers-reduced-motion: reduce)").matches;
      if(!lastPaint||now-lastPaint>=50){
        elapsed+=(lastPaint?Math.min(100,now-lastPaint):0)/1000;lastPaint=now;
        const group=P.residents(s),stage=modal.querySelector("#petTankStage");
        if(group.length&&stage){
          const box=stage.getBoundingClientRect(),poses=root.ShuAquariumLife.layout(group,ctx.catalog,box.width,box.height,elapsed,ctx.ratio,feeding,reduced).poses;
          for(const pose of poses){
            const el=modal.querySelector(`[data-pet-fish="${pose.uid}"]`),pellet=modal.querySelector(`[data-pet-pellet="${pose.uid}"]`);if(!el)continue;
            el.style.width=`${pose.width}px`;el.style.height=`${pose.height}px`;el.style.left=`${pose.x}px`;el.style.top=`${pose.y}px`;
            el.style.transform=`translate(-50%,-50%) scaleX(${pose.flip})${pose.bite?" scaleY(1.08)":""}`;
            el.style.opacity=pose.depth;el.style.zIndex=String(5+Math.round(pose.y));
            el.classList.toggle("pet-biting",pose.bite);
            if(pellet){pellet.hidden=!pose.food; if(pose.food){pellet.style.left=`${pose.food.x}px`;pellet.style.top=`${pose.food.y}px`;}}
            ctx.drawFish(el,pose.species,reduced?0:Math.floor(elapsed/(pose.bottomDweller?.24:.18)),pose);
            lastPoses[pose.uid]={x:pose.x,y:pose.y,yaw:pose.yaw};
          }
          if(feeding){
            const age=elapsed-feeding.at;
            feeding.ids.forEach((id,i)=>{if(age>=.95+i*.28&&!feeding.heard.has(id)){feeding.heard.add(id);ctx.feedSound?.();}});
            if(age>3.8)feeding=null;
          }
          stage.style.setProperty("--water-haze",String((100-Math.min(...group.map(f=>f.water)))/450));
        }
      }
      if(!reduced&&mode==="aquarium"&&P.residents(s).length)frame=requestAnimationFrame(paint);
    }
    function start(){if(frame||!live()||document.hidden)return;lastPaint=0;frame=requestAnimationFrame(paint);}
    modal.onclick=event=>{
      const b=event.target.closest("button");if(!b||b.disabled||!live())return;
      if(b.dataset.petTab){tab=b.dataset.petTab;buybackId=null;message="";render();return;}
      if(b.dataset.petCourse){course=b.dataset.petCourse;render();return;}
      if(b.dataset.petBuy){const result=P.acquire(s,b.dataset.petBuy,ctx.catalog,ctx.day(),s.petLife.selectedTank);message=result.message;if(result.ok)changed();render();return;}
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
        if(result.ok){feeding=null;ctx.stopFeedSound?.();changed();}render();return;
      }
      rehomeId=null;
      if(action==="close"){stop();ctx.close();return;}
      if(action==="aquarium"){mode="aquarium";message="";render();return;}
      if(action==="zoom"){feeding=null;zoom=!zoom;render();return;}
      if(action==="move"){const target=modal.querySelector("#petMoveTank");if(!target)return;const result=P.moveFish(s,s.petLife.selected,Number(target.value),ctx.catalog,ctx.day());message=result.message;if(result.ok){feeding=null;changed();}render();return;}
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
      if(action==="enter"){
        const result=P.enter(s,kind,course,participant,ctx.day(),ctx.catalog,ctx.dogs);
        message=result.ok?"審査が終わったよ。結果を見てみよう。":result.message;
        if(result.ok)changed();render();
        modal.querySelector(".pet-contest-result")?.scrollIntoView?.({block:"nearest",behavior:"auto"});
      }
    };
    modal.onchange=event=>{
      const el=event.target;if(!live())return;rehomeId=null;
      if(el.id==="petTankSelect"){feeding=null;P.selectTank(s,Number(el.value));message="";changed();render();}
      else if(el.id==="petFishSelect"&&s.petLife.fish.some(f=>f.uid===el.value)){s.petLife.selected=el.value;message="";changed();render();}
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
