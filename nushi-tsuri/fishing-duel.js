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
  // One step is the shared 120 ms battle tick. No wall-clock catch-up on a
  // suspended phone, and presentation randomness never changes the specimen.
  function newLure(distance=20){return {speed:0,depth:.42,travel:0,attraction:0,approach:0,chase:0,
    distance:clamp(distance,1,100),ticks:0,x:68,y:41};}
  function stepLure(lure,held,interested=false,tapped=false){
    lure.ticks++;
    const active=held||tapped;
    lure.speed=clamp(lure.speed+(active?(tapped?.28:.16):-.24),0,1);
    // Distance is measured in the same meters as the cast and hooked fight.
    lure.travel=clamp(lure.travel+lure.speed*.08/lure.distance,0,1);
    lure.depth=clamp(lure.depth+(active?-.006*lure.speed:.009),.18,.82);
    lure.x=68-lure.travel*46+Math.sin(lure.ticks*.55)*lure.speed*.65;
    lure.y=20+lure.depth*50+Math.sin(lure.ticks*.7)*lure.speed*.45;
    lure.attraction=clamp(lure.attraction+(tapped?.24:held?.11:-.018),0,1);
    lure.motion=lure.speed>.75?'fast':lure.speed>.05?'slow':'sink';
    if(interested){
      lure.chase++;
      // Let the player see the chase and decide to slow/stop the spoon.
      // A full-speed retrieve can outrun the fish; a pause lets it catch up.
      lure.approach=clamp(lure.approach+(lure.speed>.8?.009:active?.045:.065),0,1);
    }
    return {recovered:lure.travel>=1,reveal:!interested&&lure.attraction>=1,
      bite:interested&&lure.approach>=1,depart:interested&&lure.chase>=60&&lure.approach<1};
  }
  Object.assign(fishStrength,{kawamutsu:.75,herabuna:1.4,himemasu:1.7,mahaze:.6,sayori:.8,masaba:1.9,gigi:1.5});
  Object.assign(spoon,{kawamutsu:.8,herabuna:.08,himemasu:2.6,mahaze:.25,sayori:.2,masaba:2.2,gigi:.7});
  Object.assign(fishStrength,{bluegill:1.05,aburahaya:.62,magochi:2.1});
  Object.assign(spoon,{bluegill:1.6,aburahaya:.65,magochi:2.4});
  Object.assign(fishStrength,{oyanirami:1.12,akakamasu:2.05,ishidai:2.8});
  Object.assign(spoon,{oyanirami:1.8,akakamasu:3.2,ishidai:.4});
  Object.assign(fishStrength,{kawayoshinobori:.48,utsubo:3.1,buri:3.55});
  Object.assign(spoon,{kawayoshinobori:.12,utsubo:.5,buri:3.4});
  Object.assign(fishStrength,{hiramasa:4,kanpachi:4.15,shimaaji:3.5,ishigakidai:3.8,akahata:2.25});
  Object.assign(spoon,{hiramasa:3.8,kanpachi:3.6,shimaaji:3.2,ishigakidai:.15,akahata:2.4});
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
  // Species choose a fresh pulling budget once per turn. Re-pressing cannot
  // reroll or refill it; the first timely press still gets that whole budget.
  const nushiTiming=Object.freeze({slack:2400,warning:1440,reaction:720,breakHold:1080,run:1800});
  const rhythms={
    gentle:{pull:[2800,6400],run:[1800,3000],speed:1.15,shake:.85,tempo:.8},
    dart:{pull:[1600,4400],run:[2100,3800],speed:1.8,shake:1.15,tempo:1.25},
    heavy:{pull:[2200,6000],run:[2400,4400],speed:1.5,shake:1.3,tempo:.85},
    ambush:{pull:[1800,5000],run:[2100,4100],speed:1.95,shake:1.4,tempo:1.1},
    bottom:{pull:[2000,5600],run:[2000,3800],speed:1.35,shake:1.2,tempo:1},
    legendary:{pull:[1600,5200],run:[2600,4800],speed:2.25,shake:1.6,tempo:1.05},
    pelagic:{pull:[2200,5600],run:[2600,4200],speed:2.1,shake:1.15,tempo:1.2},
    reefRunner:{pull:[2200,5800],run:[2400,4400],speed:1.95,shake:1.65,tempo:1.05}
  };
  const speciesRhythms={};
  for(const [kind,ids]of Object.entries({
    gentle:'tanago motsugo medaka moroko funa wakasagi dojo oikawa herabuna',
    dart:'ayu yamame iwana amago nijimasu shirogisu aji ugui kawamutsu himemasu sayori masaba bluegill aburahaya akakamasu buri',
    heavy:'koi nigoi namazu bora kurodai madai ishidai',
    ambush:'raigyo bass suzuki unagi oyanirami utsubo',
    bottom:'kamatsuka kajika kasago mebaru hirame ainame isaki kawahagi mahaze gigi magochi kawayoshinobori',
    legendary:'nushi streamNushi coastNushi caveNushi starNushi',
    pelagic:'hiramasa shimaaji',reefRunner:'kanpachi ishigakidai akahata'
  }))for(const id of ids.split(' '))speciesRhythms[id]=kind;
  for(const p of Object.values(rhythms)){Object.freeze(p.pull);Object.freeze(p.run);Object.freeze(p);}
  function rhythm(id){return rhythms[speciesRhythms[id]]||rhythms.heavy;}
  // Only active runs spend the fish's stamina. A paused clock or an ignored
  // slack window cannot tire it out. Even a tired fish continues taking line.
  const fatigue=b=>clamp((b.nushiRunTicks||0)/100,0,1);
  function escapePace(b,mood,tick=b.moodTick||0){
    const profile=rhythm(b.f.id),surge=.72+.56*Math.sin(tick*.64*profile.tempo)**2;
    return clamp((1.4+(mood.speedX||.6)*.48)*profile.speed,2.25,6.2)*surge*(1-.25*fatigue(b));
  }
  function remainingMeters(b){return Math.max(0,(b.startMeters??20)*(1-(b.retrieval||0)));}
  function beginWindow(b,mood,duration,now,rng=Math.random){
    b.nushiWindow=null;
    if(b.fightMode!=="nushi")return now+duration;
    const profile=rhythm(b.f?.id),range=mood.calm?profile.pull:profile.run;
    const budget=Math.round(range[0]+clamp(rng(),0,1)*(range[1]-range[0]));
    if(!mood.calm)return now+budget;
    const warnAt=now+Math.max(nushiTiming.slack,budget);
    b.nushiWindow={moodId:mood.id,openedAt:now,warnAt,endsAt:warnAt+nushiTiming.warning,
      pullBudget:budget,accepted:false,warning:false,warningShownAt:null};
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
      window.warnAt=Math.max(window.warnAt,now+window.pullBudget);
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
      if(window.warning){
        // Even a delayed first paint must show the release cue before a run.
        if(window.warningShownAt===null){
          window.warningShownAt=now;
          window.endsAt=Math.max(window.endsAt,now+nushiTiming.warning);
          b.nextMood=window.endsAt;
        }
        return "warning";
      }
    }
    return b.reeling&&(!window||window.accepted)?"pulling":"slack";
  }
  function shiftWindow(b,duration){
    if(!b?.nushiWindow)return;
    for(const key of ["openedAt","warnAt","endsAt","pullStartedAt","warningShownAt"])
      if(Number.isFinite(b.nushiWindow[key]))b.nushiWindow[key]+=duration;
  }
  function step(b,mood,equipment,pullMultiplier=1,now=Date.now()){
    const before=b.retrieval||0;
    if(!mood.calm)b.nushiRunTicks=(b.nushiRunTicks||0)+1;
    const force=(fishStrength[b.f.id]||1.5)*clamp(pullMultiplier,.65,1.8)*(1-.45*fatigue(b));
    const ratio=force/equipment.strength;
    const running=!mood.calm;
    const window=b.nushiWindow?.moodId===mood.id?b.nushiWindow:null;
    const canPull=!window||window.accepted&&!window.warning;
    // The first head shakes are a visible release cue, with a reaction margin.
    // Sustained force against a run/resistance breaks even an overpowered rod.
    const resisting=Boolean(window?.warning);
    const unsafe=running||(resisting&&window.warningShownAt!==null&&now-window.warningShownAt>=nushiTiming.reaction);
    if(b.reeling){
      if(unsafe){
        b.nushiStrain=(b.nushiStrain||0)+120*(resisting?1.8:clamp(ratio,.85,1.5));
        b.ten+=Math.max(10,14*ratio/equipment.control);
        if(b.nushiStrain>=nushiTiming.breakHold&&!b.practice)b.ten=110;
      }else if(canPull&&!resisting){
        b.ten+=1.4*ratio/equipment.control;
        const strengthGate=clamp((equipment.strength/force-.25)/.8,0,1.5);
        const sand=b.f.id==="hirame"&&!b.sandLifted?.45:1;
        b.retrieval=before+.0105*(equipment.power/20)*strengthGate/(b.distanceFactor||1)*sand;
      }
    }else{
      b.nushiStrain=0;
      b.ten=Math.max(3,b.ten-(running?2.8:4.2)*equipment.control);
    }
    // The fish pays out real line on every rightward run, even after a timely
    // release and beyond the original cast distance. The same pace drives its
    // swimming pose; a camera at the screen edge never stops the distance.
    if(running){
      const meters=escapePace(b,mood,(b.moodTick||0)+1)*.06*(b.reeling?1.5:b.nushiYielded?.85:1);
      b.retrieval=before-meters/Math.max(.1,b.startMeters??20);
    }
    // Starter gear is never sufficient for the nushi, even at the best timing.
    if(!b.practice&&equipment.strength<(minStrength[b.f.id]||0))b.retrieval=Math.min(.6,b.retrieval);
    b.retrieval=Math.min(1,b.retrieval??before);b.retrievalDelta=b.retrieval-before;
    b.ten=clamp(b.ten,3,b.practice?88:110);b.lineSlack=!running&&!window?.warning&&!b.reeling;
    return {running,weak:ratio>1.5,canLand:b.retrieval>=.999};
  }
  return Object.freeze({modes,roles,strengths,fishStrength,minStrength,spoon,normalize,grantRod,duplicate,rod,
    nushiTiming,rhythm,escapePace,remainingMeters,beginWindow,acceptPull,releasePull,windowPhase,shiftWindow,step,newLure,stepLure});
});
