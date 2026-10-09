/* v228: tackle choices and readable slack / pull / brace windows. */
(function(root,factory){const api=factory();if(typeof module==="object"&&module.exports)module.exports=api;
  if(root)root.ShuFishing=api;
})(typeof globalThis!=="undefined"?globalThis:this,function(){
  "use strict";
  const clamp=(n,lo,hi)=>Math.max(lo,Math.min(hi,Number(n)||0));
  const record=v=>v&&typeof v==="object"&&!Array.isArray(v)?v:{};
  const modes={gauge:"ゲージ式",nushi:"ぬし釣り式"};
  const roles={bamboo:"小魚との練習に。強い魚には力不足",youngBamboo:"小型魚をしなやかに寄せる",
    clearStream:"流れの速い川・中型魚向け",starGazer:"星の加護で張力を抑える万能竿",
    moroko:"小さなアタリを捉える精密竿",shoreReed:"海の大型魚向けの丈夫な竿",
    tideMaster:"ヌシに挑む最上位の力と粘り",lureRod:"スプーンを操る専用ロッド"};
  const strengths={bamboo:1,youngBamboo:1.25,clearStream:1.9,starGazer:2.8,moroko:2.3,shoreReed:3.3,tideMaster:4.8,lureRod:2.6};
  const fishStrength={tanago:.45,motsugo:.4,medaka:.25,kamatsuka:.85,nigoi:2.65,raigyo:3,moroko:.7,funa:1,wakasagi:.5,dojo:.65,isaki:1.65,ugui:1.35,oikawa:.65,kawahagi:1.6,ayu:1.1,yamame:1.3,iwana:1.5,amago:1.4,kajika:.8,aji:.9,kasago:1.2,mebaru:1.1,
    shirogisu:.9,bass:2,nijimasu:2.1,namazu:2.3,unagi:1.9,bora:2.1,koi:2.9,
    kurodai:2.8,suzuki:3.3,hirame:3,ainame:2.3,madai:3.2,nushi:4.4,streamNushi:3.2,coastNushi:3.8,caveNushi:4.4,starNushi:6};
  const minStrength={nushi:3.5,streamNushi:2.4,coastNushi:3,caveNushi:3.4,starNushi:4};
  const spoon={tanago:.05,motsugo:.10,medaka:.01,kamatsuka:.08,nigoi:1.4,raigyo:3.8,moroko:.2,funa:.35,wakasagi:.12,dojo:.08,isaki:1.15,ugui:1.3,oikawa:.25,kawahagi:.06,koi:.45,ayu:.35,yamame:2.3,iwana:2.4,amago:2.25,kajika:.15,nijimasu:2.5,bass:4.8,
    namazu:1.5,unagi:.55,aji:1.8,mebaru:1.6,kasago:1.4,suzuki:3.1,hirame:2.2,
    kurodai:1.1,bora:.45,shirogisu:.65,ainame:1.7,madai:1.2,nushi:.18,streamNushi:.7,coastNushi:.5,caveNushi:.3,starNushi:.18};
  function normalize(s,rods){
    s.fightMode=modes[s.fightMode]?s.fightMode:"gauge";
    s.fishingMethod=s.fishingMethod==="lure"?"lure":"bait";
    s.selectedLure="silverSpoon";
    const copies=record(s.rodCopies),levels=record(s.rodLevels);
    s.rodCopies={};s.rodLevels={};
    for(const id of Object.keys(rods)){
      const owned=s.ownedRods.includes(id),count=Math.floor(clamp(copies[id],0,999999));
      s.rodCopies[id]=Math.max(owned?1:0,count);
      s.rodLevels[id]=Math.floor(clamp(levels[id],0,id==="starGazer"?5:0));
      if(s.rodCopies[id]>0&&!owned)s.ownedRods.push(id);
    }
    if(s.fishingMethod==="lure"&&(!s.ownedRods.includes("lureRod")||!(s.lures?.silverSpoon>0)))s.fishingMethod="bait";
    return s;
  }
  function grantRod(s,id){
    const count=s.rodCopies[id]||0;s.rodCopies[id]=count+1;
    if(!s.ownedRods.includes(id))s.ownedRods.push(id);
    return count===0;
  }
  function duplicate(s,action){
    const count=s.rodCopies.starGazer||0;
    if(count<2)return {ok:false,message:"最後の一本は大切に取っておこう。"};
    if(action==="sell"){
      s.rodCopies.starGazer--;s.money+=12000;
      return {ok:true,message:"星見の竿の余分な一本を12000円で買い取ってもらった。"};
    }
    if(action==="upgrade"&&(s.rodLevels.starGazer||0)<5){
      s.rodCopies.starGazer--;s.rodLevels.starGazer=(s.rodLevels.starGazer||0)+1;
      return {ok:true,message:`余分な一本を重ね、星見の竿を＋${s.rodLevels.starGazer}へ強化した。`};
    }
    return {ok:false,message:"強化は＋5まで。余分な竿は保管もできるよ。"};
  }
  function rod(s,id,rods){
    const base=rods[id]||rods.bamboo,level=s.rodLevels?.[id]||0;
    return {...base,power:base.power+level*2,control:base.control+level*.08,
      strength:(strengths[id]||1)+level*.25,level,role:roles[id]||roles.bamboo};
  }
  const nushiTiming=Object.freeze({slack:1800,pull:1200,warning:900});
  function beginWindow(b,mood,duration,now){
    b.nushiWindow=null;
    if(b.fightMode!=="nushi"||!mood.calm)return now+duration;
    const warnAt=now+Math.max(nushiTiming.slack,duration);
    b.nushiWindow={moodId:mood.id,openedAt:now,warnAt,endsAt:warnAt+nushiTiming.warning,
      accepted:false,warning:false};
    return b.nushiWindow.endsAt;
  }
  function acceptPull(b,now){
    if(b.fightMode==="nushi")b.nushiYielded=false;
    const window=b.nushiWindow;
    if(b.fightMode!=="nushi"||!b.mood?.calm||!window||
      window.moodId!==b.mood.id||now>=window.warnAt)return false;
    // Only the first correct press can secure a pull. Repeated presses never
    // refill its deadline, and a hold carried over from a run is not a press.
    if(!window.accepted){
      window.accepted=true;window.pullStartedAt=now;
      window.warnAt=Math.max(window.warnAt,now+nushiTiming.pull);
      window.endsAt=window.warnAt+nushiTiming.warning;
      b.nextMood=window.endsAt;
    }
    return true;
  }
  function releasePull(b,now){
    const window=b.nushiWindow;
    if(b.fightMode!=="nushi"||!b.reeling||!b.mood?.calm||!window?.accepted||now>=window.endsAt)return false;
    b.nushiYielded=true;
    return true;
  }
  function windowPhase(b,now){
    if(b.fightMode!=="nushi")return null;
    if(b.gillWash)return "leap";
    if(!b.mood?.calm)return "running";
    const window=b.nushiWindow;
    if(window&&window.moodId===b.mood.id){
      window.warning=now>=window.warnAt;
      if(window.warning)return "warning";
    }
    return b.reeling&&(!window||window.accepted)?"pulling":"slack";
  }
  function shiftWindow(b,duration){
    if(!b?.nushiWindow)return;
    for(const key of ["openedAt","warnAt","endsAt","pullStartedAt"])
      if(Number.isFinite(b.nushiWindow[key]))b.nushiWindow[key]+=duration;
  }
  function step(b,mood,equipment,pullMultiplier=1){
    const before=b.retrieval||0;
    const force=(fishStrength[b.f.id]||1.5)*clamp(pullMultiplier,.65,1.8);
    const ratio=force/equipment.strength;
    const running=!mood.calm;
    const window=b.nushiWindow?.moodId===mood.id?b.nushiWindow:null;
    const canPull=!window||window.accepted&&!window.warning;
    // The body and line are the primary cue. Pulling a running fish cannot
    // shortcut a stronger rod; slack periods are the actual retrieval window.
    if(b.reeling){
      if(running){
        b.ten+= (mood.danger?8.5:4.4)*ratio/equipment.control;
        b.retrieval=before-.0018*ratio;
      }else if(canPull){
        b.ten+=1.4*ratio/equipment.control;
        const strengthGate=clamp((equipment.strength/force-.25)/.8,0,1.5);
        const sand=b.f.id==="hirame"&&!b.sandLifted?.45:1;
        b.retrieval=before+.0105*(equipment.power/20)*strengthGate/(b.distanceFactor||1)*sand;
      }
    }else{
      b.ten=Math.max(3,b.ten-(running?2.8:4.2)*equipment.control);
      // Releasing a successful pull before the run preserves its gain.
      // Late releases and pulling a running fish still surrender distance.
      b.retrieval=before-(running&&!b.nushiYielded?.00045*ratio:0);
    }
    // Starter gear is never sufficient for the nushi, even at the best timing.
    if(!b.practice&&equipment.strength<(minStrength[b.f.id]||0))b.retrieval=Math.min(.6,b.retrieval);
    b.retrieval=clamp(b.retrieval,0,1);b.retrievalDelta=b.retrieval-before;
    b.ten=clamp(b.ten,3,b.practice?88:110);b.lineSlack=!running&&!window?.warning&&!b.reeling;
    return {running,weak:ratio>1.5,canLand:b.retrieval>=.999};
  }
  return Object.freeze({modes,roles,strengths,fishStrength,minStrength,spoon,normalize,grantRod,duplicate,rod,
    nushiTiming,beginWindow,acceptPull,releasePull,windowPhase,shiftWindow,step});
});
