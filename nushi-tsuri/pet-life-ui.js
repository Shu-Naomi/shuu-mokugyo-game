/* The pet shop and carrying tanks reuse the game's original fish/dog art. */
(function(root){
  "use strict";
  function create(ctx){
    const P=root.ShuPetLife,s=ctx.state,esc=value=>String(value??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"})[c]);
    const modal=document.createElement("section");
    modal.id="petLifeModal";modal.className="modal pet-life-modal";modal.setAttribute("role","dialog");
    modal.setAttribute("aria-modal","true");modal.setAttribute("aria-labelledby","petLifeTitle");ctx.parent.append(modal);
    let mode="aquarium",tab="fish",kind="bond",course="beginner",participant=s.dog,message="",zoom=false,frame=0,lastPaint=0,started=0;
    const spec=id=>ctx.catalog.find(f=>f.id===id);
    const live=()=>modal.classList.contains("open");
    const fishName=f=>`${spec(f.species).name} #${f.uid.slice(4)}`;
    const btn=(action,label,disabled=false)=>`<button data-pet-action="${action}" ${disabled?"disabled":""}>${label}</button>`;
    function stop(){cancelAnimationFrame(frame);frame=0;}
    function changed(){ctx.changed();}
    function open(view="aquarium"){
      if(!ctx.canOpen())return false;
      ctx.close();mode=view;zoom=false;message="";tab="fish";
      if(view==="shop")message="アスアル「育てる時間も、立派な楽しみよ。クラウドと一緒に待っていたわ」";
      P.sync(s,ctx.catalog,ctx.day());render();ctx.open(modal.id);start();return true;
    }
    function header(){
      return `<header class="pet-heading"><div><small>${mode==="aquarium"?"MY LITTLE AQUARIUM":"ASUAL'S PET HOUSE"}</small><h2 id="petLifeTitle">${mode==="aquarium"?"持ち歩き飼育水槽":"アスアルのペットショップ"}</h2></div><span class="pet-money">${s.money.toLocaleString("ja-JP")}円</span>${btn("close","閉じる")}</header>`;
    }
    function shop(){
      const p=s.petLife;
      return `<div class="pet-shop-host"><canvas width="96" height="128" data-rival-art="asual" role="img" aria-label="店主アスアル"></canvas><div><b>水車の家のペットショップ</b><p>魚との出会い、お世話用品、ワンコと魚のコンテスト。</p><small>飼育水槽 ${p.fish.length}/${P.CAPACITY}槽 ・ 魚のエサ ${p.food}食</small></div><canvas width="128" height="96" data-rival-art="cloud" role="img" aria-label="クラウド"></canvas></div>
        <nav class="pet-tabs" aria-label="ペットショップの売り場">${[["fish","魚の生体"],["supplies","お世話用品"],["contests","コンテスト受付"]].map(([id,label])=>`<button data-pet-tab="${id}" aria-pressed="${tab===id}">${label}</button>`).join("")}${btn("aquarium","飼育水槽を見る")}</nav>
        ${tab==="fish"?`<p class="pet-note">一匹ずつ専用の飼育水槽へ。最大6匹まで持ち歩けるよ。魚の種類に合う水でお世話しよう。</p><div class="pet-stock">${ctx.catalog.filter(f=>f.id!=="nushi").map(f=>`<article><div class="pet-fish-thumb" data-pet-preview="${f.id}" role="img" aria-label="${f.name}"></div><div><b>${f.name}</b><small>${P.cm(f.start)}cm ・ ${f.waterLabel}</small><button data-pet-buy="${f.id}" ${p.fish.length>=P.CAPACITY||s.money<f.price?"disabled":""}>迎える · ${f.price.toLocaleString("ja-JP")}円</button></div></article>`).join("")}</div>`:
          tab==="supplies"?`<div class="pet-supplies"><h3>魚のエサ</h3><p>淡水魚にも海水魚にも使える飼育用のエサ。1匹に一日1食。</p>${btn("food-1","10食 · 100円",s.money<100)}${btn("food-10","100食 · 1,000円",s.money<1000)}<p>水換えは飼育水槽から無料でできるよ。最初の10食と6槽分の持ち歩きセットは用意してある。</p></div>`:contest()}`;
    }
    function tank(){
      const p=s.petLife,f=P.selected(s),today=ctx.day();
      return `<div class="pet-tank-heading"><label for="petFishSelect">お世話する魚</label><select id="petFishSelect" ${p.fish.length?"":"disabled"}>${p.fish.length?p.fish.map(a=>`<option value="${a.uid}" ${a.uid===p.selected?"selected":""}>${fishName(a)} · ${P.cm(a.length)}cm</option>`).join(""):'<option value="">まだ魚はいない</option>'}</select>${btn("zoom",zoom?"元の表示":"ズーム",!f)}</div>
        ${f?`<div class="pet-tank-layout"><div id="petTankStage" class="aquarium-tank pet-tank-stage" role="img" aria-label="${esc(fishName(f))}が泳ぐ飼育水槽"><div id="petTankFish" class="aquarium-fish"></div><div class="pet-tank-caption">${spec(f.species).name}　${P.cm(f.length)}cm <small>${ctx.sizeLabel(f.species,f.length)}</small></div><i class="pet-food-speck"></i></div><div class="pet-tank-info"><h3>${fishName(f)}</h3><div class="pet-stats"><span>元気 <b>${f.health}%</b></span><span>水質 <b>${f.water}%</b></span><span>成長 <b>＋${P.cm(f.length-f.bornSize)}cm</b></span><span>一緒に <b>${today-f.acquiredDay+1}日目</b></span></div><p>${f.fedDay===today?"今日のエサやり済み":"今日はまだエサを食べていない"} ・ エサ残り${p.food}食</p><div class="pet-care-actions">${btn("feed","エサをあげる",f.fedDay===today||p.food<1)}${btn("water","水換え",f.changedDay===today||f.water>=100)}</div><p class="pet-note">エサやりは一日一回。水質40%以上で翌日になると0.1cm成長。種類ごとの最大サイズまで育つよ。</p></div></div>`:
          '<div class="pet-empty"><span>🐟</span><h3>小さな出会いを、この水槽へ。</h3><p>湖の北東、水車の家にあるアスアルの店で魚を迎えよう。</p></div>'}
        <footer class="pet-tank-footer"><span>${p.fish.length}/${P.CAPACITY}槽 ・ エサ ${p.food}食</span>${s.caught.nushi>0&&!p.nushiClaimed?btn("nushi","釣ったヌシを迎える",p.fish.length>=P.CAPACITY):""}<small>自宅の展示水槽とは別に、魚ごとの成長を記録するよ。</small></footer>`;
    }
    function contest(){
      const p=s.petLife,c=P.courses.find(c=>c.id===course),today=ctx.day();
      const choices=kind==="fish"?p.fish.map(f=>({id:f.uid,name:`${fishName(f)} · ${P.cm(f.length)}cm`})) : ctx.dogs;
      if(!choices.some(a=>a.id===participant))participant=choices[0]?.id||"";
      const entered=p.entries[`${kind}:${course}`]===today;
      const last=p.lastResult;
      let guide=kind==="bond"?`なつき度で採点。今の評価は${Math.round((s.dogAffinity[participant]||0)/20)}点。`:
        kind==="tricks"?`5つの芸に挑戦。今の一芸あたりの成功率は${Math.round(P.trickChance(s,participant)*100)}%。`:
        "魚種に合わせた成長・体格45点、元気35点、水質20点で採点。";
      return `<div class="pet-contest-selectors"><label>種目<select id="petContestKind">${Object.entries(P.kinds).map(([id,name])=>`<option value="${id}" ${kind===id?"selected":""}>${name}</option>`).join("")}</select></label><label>参加する子<select id="petContestParticipant" ${choices.length?"":"disabled"}>${choices.length?choices.map(a=>`<option value="${a.id}" ${participant===a.id?"selected":""}>${esc(a.name)}</option>`).join(""):'<option value="">飼育中の魚がいない</option>'}</select></label></div>
        <div class="pet-course-options">${P.courses.map(c=>`<button data-pet-course="${c.id}" aria-pressed="${course===c.id}"><b>${c.name}</b><small>参加費 ${c.fee}円</small></button>`).join("")}</div>
        <p>${guide}</p><p class="pet-note">同点は同順位。各種目・各コースに一日1回参加できるよ。優勝賞金${c.prize}円、2位${Math.floor(c.prize*.5)}円、3位${Math.floor(c.prize*.25)}円。</p>
        ${s.tournament?'<p class="pet-note">釣り大会の終了後に参加できるよ。</p>':""}${btn("enter",entered?"今日は参加済み":`${c.name}に参加する · ${c.fee}円`,entered||!participant||s.money<c.fee||!!s.tournament)}
        ${last?`<section class="pet-contest-result" aria-label="前回のコンテスト結果"><div class="pet-result-rank">${last.rank===1?"🏆":"🎗️"}<b>${last.rank}位</b></div><div><small>${P.kinds[last.kind]}・${P.courses.find(c=>c.id===last.course).name}／${last.day+1}日目</small><h3>${esc(last.name)} · ${last.score}点</h3><p>${esc(last.detail)}</p>${last.marks.length?`<ol class="pet-trick-results">${last.marks.map((ok,i)=>`<li style="--delay:${i*.2}s">${["おすわり","お手","待て","ターン","キャッチ"][i]} ${ok?"○":"△"}</li>`).join("")}</ol>`:""}<b>賞金 ${last.reward}円 · 受け取り済み</b><p class="pet-note">${last.rank===1?"アスアル「丁寧なお世話が実ったわね。おめでとう」":"アスアル「積み重ねはちゃんと力になる。また一緒に挑戦しましょう」"}</p></div></section>`:""}`;
    }
    function render(){
      stop();P.sync(s,ctx.catalog,ctx.day());modal.classList.toggle("pet-zoomed",zoom);
      modal.innerHTML=`<div class="pet-shell">${header()}<p class="pet-message" role="status">${esc(message||"毎日、少しずつ仲良くなろう。")}</p><div class="pet-content">${mode==="aquarium"?tank():shop()}</div></div>`;
      ctx.paintRivals();
      for(const el of modal.querySelectorAll("[data-pet-preview]"))ctx.drawFish(el,el.dataset.petPreview,0);
      if(live())start();
    }
    function paint(now){
      frame=0;if(!live()||document.hidden)return;
      const reduced=matchMedia("(prefers-reduced-motion: reduce)").matches;
      if(!lastPaint||now-lastPaint>=50){
        lastPaint=now;
        const f=P.selected(s),el=modal.querySelector("#petTankFish"),stage=modal.querySelector("#petTankStage");
        if(f&&el&&stage){
          const t=(now-started)/1000,box=stage.getBoundingClientRect(),pose=ctx.pose(f.species,t);
          const ratio=ctx.ratio(f.species),growth=Math.sqrt(f.length/Math.max(1,f.bornSize));
          const width=Math.min(box.width*(zoom?.46:.30)*growth,box.width*.60,box.height*.38*ratio);
          el.style.width=`${width}px`;el.style.height=`${width/ratio}px`;
          // Preserve enough turning room even at the largest zoomed size.
          el.style.left=`${reduced?50:32+(pose.x/100)*36}%`;el.style.top=`${reduced?50:pose.y}%`;
          el.style.transform=`translate(-50%,-50%) scaleX(${reduced?1:pose.facing})`;
          ctx.drawFish(el,f.species,reduced?0:Math.floor(t/(pose.bottomDweller?.24:.18)));
        }
      }
      if(!reduced&&mode==="aquarium"&&P.selected(s))frame=requestAnimationFrame(paint);
    }
    function start(){if(frame||!live()||document.hidden)return;started=performance.now();lastPaint=0;frame=requestAnimationFrame(paint);}
    modal.onclick=event=>{
      const b=event.target.closest("button");if(!b||b.disabled||!live())return;
      if(b.dataset.petTab){tab=b.dataset.petTab;message="";render();return;}
      if(b.dataset.petCourse){course=b.dataset.petCourse;render();return;}
      if(b.dataset.petBuy){const result=P.acquire(s,b.dataset.petBuy,ctx.catalog,ctx.day());message=result.message;if(result.ok)changed();render();return;}
      const action=b.dataset.petAction;
      if(action==="close"){stop();ctx.close();return;}
      if(action==="aquarium"){mode="aquarium";message="";render();return;}
      if(action==="zoom"){zoom=!zoom;render();return;}
      if(action==="feed"||action==="water"){
        const result=P.care(s,s.petLife.selected,action,ctx.day(),ctx.catalog);message=result.message;if(result.ok)changed();render();
        if(result.ok)modal.querySelector("#petTankStage")?.classList.add(action==="feed"?"pet-feeding":"pet-cleaning");return;
      }
      if(action==="nushi"){const result=P.acquire(s,"nushi",ctx.catalog,ctx.day());message=result.message;if(result.ok)changed();render();return;}
      if(action==="food-1"||action==="food-10"){
        const count=action==="food-1"?1:10;
        const ok=P.buyFood(s,count);message=ok?`魚のエサを${count*10}食買った。`:"お金かエサ袋の空きが足りないよ。";if(ok)changed();render();return;
      }
      if(action==="enter"){
        const result=P.enter(s,kind,course,participant,ctx.day(),ctx.catalog,ctx.dogs);
        message=result.ok?"審査が終わったよ。結果を見てみよう。":result.message;
        if(result.ok)changed();render();
        modal.querySelector(".pet-contest-result")?.scrollIntoView?.({block:"nearest",behavior:"auto"});
      }
    };
    modal.onchange=event=>{
      const el=event.target;if(!live())return;
      if(el.id==="petFishSelect"&&s.petLife.fish.some(f=>f.uid===el.value)){s.petLife.selected=el.value;message="";changed();render();}
      else if(el.id==="petContestKind"&&P.kinds[el.value]){kind=el.value;render();}
      else if(el.id==="petContestParticipant"){participant=el.value;render();}
    };
    document.addEventListener("visibilitychange",()=>document.hidden?stop():start());
    window.addEventListener("pagehide",stop);
    window.addEventListener("resize",()=>{if(live()&&mode==="aquarium"){stop();start();}});
    return {open,render,stop,get mode(){return mode;},get active(){return live();}};
  }
  root.ShuPetUI={create};
})(typeof globalThis!=="undefined"?globalThis:this);
