/* Persistent pet specimens. Growth uses game days and integer 0.01 cm units. */
(function(root,factory){const api=factory();if(typeof module==="object"&&module.exports)module.exports=api;else root.ShuPetLife=api;
})(typeof globalThis!=="undefined"?globalThis:this,function(){
  "use strict";
  const DOG_MAX=2000,TRICK_MAX=1000,CAPACITY=6,TANK_CAPACITY=5,BREED_DAYS=3;
  const TRICKS=["お手","おかわり","チンチン","伏せ","ハイタッチ"];
  const xpForLevel=level=>3*(level-1)**2;
  const fishLevel=xp=>Math.min(20,1+Math.floor(Math.sqrt(int(xp,0,1083)/3)));
  const hatchDays=id=>["yamame","nijimasu"].includes(id)?4:["koi","funa","moroko"].includes(id)?2:3;
  const TANK_PRICES=Object.freeze([0,400,900,1500,2400,3600]);
  const num=(v,fallback=0)=>Number.isFinite(Number(v))?Number(v):fallback;
  const clamp=(v,lo,hi)=>Math.max(lo,Math.min(hi,num(v,lo)));
  const int=(v,lo=0,hi=1e9)=>Math.floor(clamp(v,lo,hi));
  const record=v=>v&&typeof v==="object"&&!Array.isArray(v)?v:{};
  const courses=[
    {id:"beginner",name:"初級",fee:100,prize:250,rivals:[42,29,18]},
    {id:"intermediate",name:"中級",fee:300,prize:700,rivals:[66,57,45]},
    {id:"advanced",name:"上級",fee:800,prize:1600,rivals:[88,79,70]},
  ];
  const kinds={bond:"なつき度コンテスト",tricks:"芸コンテスト",fish:"魚の品評会"};
  const sexOf=f=>f.sex==="male"?"male":f.sex==="female"?"female":Number(f.uid.slice(4))%2?"male":"female";
  const starInterval=generation=>Math.max(3,6-Math.min(3,int(generation,0,20)));
  const starLevel=f=>Math.min(5,1+Math.floor(int(f.careDays,0)/starInterval(f.generation)));
  // Larger species gain more length per cared-for day; lengths are 0.01 cm units.
  const dailyGrowth=spec=>Math.min(500,Math.max(100,Math.ceil(int(spec?.max)/5000)*100));
  function normalize(state,catalog,dogIds,day,{legacy=true}={}){
    const old=record(state.petLife),migrated=!(old.version>=1);
    state.dogAffinity=record(state.dogAffinity);state.dogTricks=record(state.dogTricks);
    for(const id of dogIds){
      state.dogAffinity[id]=migrated?int(state.dogAffinity[id],0,100)*20:int(state.dogAffinity[id],0,DOG_MAX);
      state.dogTricks[id]=int(state.dogTricks[id],0,TRICK_MAX);
    }
    const used=new Set();
    const specimens=(Array.isArray(old.fish)?old.fish:[]).slice(0,CAPACITY*TANK_CAPACITY).flatMap((f,index)=>{
      const spec=catalog.find(s=>s.id===f?.species);
      if(!spec||!/^pet-\d+$/.test(f.uid)||used.has(f.uid)||(spec.legendary&&spec.id!=="nushi")||(spec.id==="nushi"&&!(state.caught?.nushi>0)))return [];
      used.add(f.uid);const bornSize=int(f.bornSize,spec.min||spec.start,spec.max);
      const fish={uid:f.uid,species:spec.id,tank:old.version>=2?int(f.tank,0,CAPACITY-1):Math.min(index,CAPACITY-1),bornSize,length:int(f.length,bornSize,spec.max),
        acquiredDay:int(f.acquiredDay,0,day),lastDay:int(f.lastDay,0,day),
        fedDay:int(f.fedDay,-1,day),changedDay:int(f.changedDay,-1,day),
        water:int(f.water,0,100),health:int(f.health,20,100),careDays:int(f.careDays,0,day+1),
        generation:int(f.generation,0,20),sex:sexOf(f)};
      fish.stars=int(f.stars??starLevel(fish),1,5);
      fish.xp=int(f.xp??fish.careDays*10,0,1083);fish.level=fishLevel(fish.xp);
      return [fish];
    });
    const daily=record(old.dogDaily),dogDaily=Object.fromEntries(dogIds.map(id=>[id,{
      day:int(daily[id]?.day,-1,day),pets:int(daily[id]?.pets,0,3),trained:daily[id]?.trained===true,
    }]));
    const validKey=key=>/^(bond|tricks|fish):(beginner|intermediate|advanced)$/.test(key);
    const entries=Object.fromEntries(Object.entries(record(old.entries)).filter(([k,v])=>validKey(k)&&Number.isFinite(Number(v))).map(([k,v])=>[k,int(v,0,day)]));
    const best=Object.fromEntries(Object.entries(record(old.best)).filter(([k])=>validKey(k)).map(([k,v])=>[k,int(v,0,100)]));
    const last=record(old.lastResult);
    const lastResult=kinds[last.kind]&&courses.some(c=>c.id===last.course)&&typeof last.name==="string"
      ? {kind:last.kind,course:last.course,name:last.name.slice(0,40),day:int(last.day,0,day),score:int(last.score,0,100),
        subject:(last.kind==="fish"?catalog.some(f=>f.id===last.subject):dogIds.includes(last.subject))?last.subject:null,
        rank:int(last.rank,1,4),reward:int(last.reward,0,1600),marks:Array.isArray(last.marks)?last.marks.slice(0,5).map(Boolean):[],
        detail:typeof last.detail==="string"?last.detail.slice(0,160):"",
        judges:normalizeJudges(last.judges),audience:int(last.audience,-5,5),baseScore:int(last.baseScore??last.score,0,100),
        commands:Array.isArray(last.commands)?last.commands.filter(v=>TRICKS.includes(v)).slice(0,5):[]}:null;
    // v182's individual tanks retain their positions and every specimen's history.
    // Repair invalid assignments into compatible empty space without duplicating fish.
    const placed=[];
    for(const f of specimens){
      const fits=t=>placed.filter(a=>a.tank===t).length<TANK_CAPACITY&&placed.filter(a=>a.tank===t).every(a=>waterKind(catalog,a.species)===waterKind(catalog,f.species));
      if(!fits(f.tank))f.tank=Array.from({length:CAPACITY},(_,i)=>i).find(fits);
      if(f.tank!==undefined)placed.push(f);
    }
    const tankSlots=Math.max(placed.reduce((total,f)=>Math.max(total,f.tank+1),1),
      old.version>=3?int(old.unlockedTanks,1,CAPACITY):(old.version>=1||legacy?CAPACITY:1));
    const breeding=Object.fromEntries(Object.entries(record(old.breeding)).filter(([key])=>{
      const match=/^([0-5]):([a-zA-Z]+)$/.exec(key);
      return match&&Number(match[1])<tankSlots&&match[2]!=="nushi"&&catalog.some(f=>f.id===match[2]&&!f.legendary);
    }).map(([key,value])=>[key,{days:int(value?.days,0,BREED_DAYS),lastDay:int(value?.lastDay,0,day),
      mother:typeof value?.mother==="string"?value.mother.slice(0,24):"",father:typeof value?.father==="string"?value.father.slice(0,24):""}]));
    const birth=record(old.lastBirth);
    const lastBirth=catalog.some(f=>f.id===birth.species)&&placed.some(f=>f.uid===birth.uid)
      ? {uid:birth.uid,species:birth.species,tank:int(birth.tank,0,CAPACITY-1),day:int(birth.day,0,day)}:null;
    const eggIds=new Set(),eggs=[];
    for(const e of Array.isArray(old.eggs)?old.eggs:[]){
      if(!/^egg-\d+$/.test(e?.uid)||eggIds.has(e.uid)||e.species==="nushi"||!catalog.some(f=>f.id===e.species&&!f.legendary))continue;
      const tank=int(e.tank,0,tankSlots-1),group=placed.filter(f=>f.tank===tank);
      if(group.length+eggs.filter(a=>a.tank===tank).length>=TANK_CAPACITY||[...group,...eggs.filter(a=>a.tank===tank)].some(f=>waterKind(catalog,f.species)!==waterKind(catalog,e.species)))continue;
      eggIds.add(e.uid);const laidDay=int(e.laidDay,0,day);
      eggs.push({uid:e.uid,species:e.species,tank,laidDay,hatchDay:int(e.hatchDay,laidDay+1,laidDay+7),generation:int(e.generation,1,20),water:int(e.water??100,0,100)});
    }
    state.petLife={version:4,fish:placed,food:int(old.food??10,0,99999),unlockedTanks:tankSlots,breeding,lastBirth,eggs,
      nextEggId:Math.max(int(old.nextEggId,1),...eggs.map(e=>Number(e.uid.slice(4))+1)),contest:normalizeContest(old.contest,dogIds,placed,catalog,day),
      nextId:Math.max(int(old.nextId,1),...specimens.map(f=>Number(f.uid.slice(4))+1)),
      selected:placed.some(f=>f.uid===old.selected)?old.selected:placed[0]?.uid||null,
      selectedTank:int(old.selectedTank??placed.find(f=>f.uid===old.selected)?.tank??placed[0]?.tank??0,0,CAPACITY-1),
      nushiClaimed:old.nushiClaimed===true||specimens.some(f=>f.species==="nushi"),dogDaily,entries,best,lastResult};
    sync(state,catalog,day);for(let t=0;t<CAPACITY;t++)shareWater(state,t);
    selectTank(state,state.petLife.selectedTank);return state.petLife;
  }
  function sync(state,catalog,day){
    if(!state.petLife)return false;let changed=false;
    const p=state.petLife,laid=[];
    p.eggs||=[];
    for(let tank=0;tank<p.unlockedTanks;tank++){
      const group=residents(state,tank),species=[...new Set(group.map(f=>f.species))];
      let available=TANK_CAPACITY-group.length-eggsIn(state,tank).length;
      for(const id of species){
        if(id==="nushi"||catalog.find(f=>f.id===id)?.legendary)continue;
        const key=`${tank}:${id}`,previous=p.breeding[key];
        const residentsOfSpecies=group.filter(f=>f.species===id);
        if(residentsOfSpecies.every(f=>f.lastDay>=day))continue;
        const adult=f=>f.length>=(catalog.find(s=>s.id===id)?.start||Infinity);
        // The water must still be at least 60% after the overnight 8% drain.
        const ready=f=>adult(f)&&day-f.lastDay===1&&f.fedDay===f.lastDay&&f.health>=70&&f.water>=68;
        const mother=residentsOfSpecies.find(f=>f.sex==="female"&&ready(f));
        const father=residentsOfSpecies.find(f=>f.sex==="male"&&ready(f));
        if(!mother||!father){if(previous){delete p.breeding[key];changed=true;}continue;}
        const continuing=previous?.lastDay===day-1&&previous.mother===mother.uid&&previous.father===father.uid;
        let days=Math.min(BREED_DAYS,(continuing?previous.days:0)+1);
        if(days>=BREED_DAYS&&available>0){laid.push({tank,id,mother,father});available--;days=0;}
        p.breeding[key]={days,lastDay:day,mother:mother.uid,father:father.uid};changed=true;
      }
    }
    for(const f of p.fish){
      const elapsed=day-f.lastDay,spec=catalog.find(s=>s.id===f.species);
      if(elapsed<=0||!spec)continue;
      const cared=f.fedDay===f.lastDay&&f.water>=40;
      // A ration covers one day, never every skipped day.
      if(cared){f.length=Math.min(spec.max,f.length+dailyGrowth(spec));f.careDays++;f.stars=Math.max(f.stars,starLevel(f));}
      f.health=int(f.health+(cared?3:0)-Math.max(0,elapsed-(cared?1:0))*4,20,100);
      f.water=int(f.water-elapsed*8,0,100);f.lastDay=day;changed=true;
    }
    for(const {tank,id,mother,father} of laid){
      p.eggs.push({uid:`egg-${p.nextEggId++}`,species:id,tank,laidDay:day,hatchDay:day+hatchDays(id),
        generation:Math.min(20,Math.max(mother.generation,father.generation)+1),water:Math.min(...residents(state,tank).map(f=>f.water))});changed=true;
    }
    for(const egg of [...p.eggs]){
      if(egg.hatchDay>day)continue;
      const group=residents(state,egg.tank);
      if(group.length>=TANK_CAPACITY)continue;
      const spec=catalog.find(s=>s.id===egg.species),uid=`pet-${p.nextId++}`;
      const initial=Math.max(spec.min||100,Math.floor(spec.start*.8));
      const child={uid,species:egg.species,tank:egg.tank,bornSize:initial,length:initial,acquiredDay:day,lastDay:day,
        fedDay:-1,changedDay:-1,water:group.length?Math.min(...group.map(f=>f.water)):egg.water,
        health:90,careDays:0,generation:egg.generation,sex:sexOf({uid}),stars:1,xp:0,level:1};
      p.eggs=p.eggs.filter(e=>e.uid!==egg.uid);p.fish.push(child);
      p.lastBirth={uid,species:egg.species,tank:egg.tank,day};changed=true;
    }
    return changed;
  }
  const selected=state=>state.petLife.fish.find(f=>f.uid===state.petLife.selected)||null;
  const residents=(state,tank=state.petLife.selectedTank)=>state.petLife.fish.filter(f=>f.tank===tank);
  const eggsIn=(state,tank=state.petLife.selectedTank)=>(state.petLife.eggs||[]).filter(e=>e.tank===tank);
  const waterKind=(catalog,species)=>catalog.find(s=>s.id===species)?.waterLabel||"淡水";
  const canHouse=(state,species,catalog,tank)=>Number.isInteger(tank)&&tank>=0&&tank<state.petLife.unlockedTanks&&residents(state,tank).length+eggsIn(state,tank).length<TANK_CAPACITY&&[...residents(state,tank),...eggsIn(state,tank)].every(f=>waterKind(catalog,f.species)===waterKind(catalog,species));
  function clearBreeding(p,tank,species){delete p.breeding[`${tank}:${species}`];}
  function shareWater(state,tank){
    const group=residents(state,tank);if(!group.length)return;
    const water=Math.min(...group.map(f=>f.water)),changedDay=Math.max(...group.map(f=>f.changedDay));
    for(const f of group){f.water=water;f.changedDay=changedDay;}
  }
  function selectTank(state,tank){
    if(!Number.isInteger(tank)||tank<0||tank>=state.petLife.unlockedTanks)return false;
    state.petLife.selectedTank=tank;
    if(!residents(state,tank).some(f=>f.uid===state.petLife.selected))state.petLife.selected=residents(state,tank)[0]?.uid||null;
    return true;
  }
  function moveFish(state,uid,tank,catalog,day){
    sync(state,catalog,day);const f=state.petLife.fish.find(f=>f.uid===uid);
    if(!f||f.tank===tank||!canHouse(state,f.species,catalog,tank))return {ok:false,message:"同じ水の種類で、空きのある水槽を選ぼう（1槽5匹まで）。"};
    const oldTank=f.tank;f.tank=tank;clearBreeding(state.petLife,oldTank,f.species);clearBreeding(state.petLife,tank,f.species);
    shareWater(state,tank);selectTank(state,tank);state.petLife.selected=uid;
    return {ok:true,message:`水槽${tank+1}へお引っ越しした。エサや成長の記録もそのままだよ。`};
  }
  function acquire(state,species,catalog,day,tank=null){
    const p=state.petLife,spec=catalog.find(f=>f.id===species);
    if(!spec)return {ok:false,message:"この魚は迎えられない。"};
    if(spec.legendary&&species!=="nushi")return {ok:false,message:"地域のヌシは水辺へ戻す。釣果と姿は図鑑に残るよ。"};
    if(species!=="nushi"&&!(state.caught?.[species]>0))return {ok:false,message:"まず自分で釣って図鑑に登録すると、この魚を迎えられるよ。"};
    sync(state,catalog,day);
    if(tank===null)tank=[p.selectedTank,...Array.from({length:p.unlockedTanks},(_,i)=>i)].find(t=>canHouse(state,species,catalog,t));
    if(!canHouse(state,species,catalog,tank))return {ok:false,message:"この水槽は満員か、水の種類が違うよ。1槽5匹まで迎えられる。"};
    if(species==="nushi"&&(!(state.caught?.nushi>0)||p.nushiClaimed))return {ok:false,message:"ヌシを釣った記録があると、一匹を飼育水槽へ迎えられる。"};
    if(!Number.isFinite(state.money)||state.money<spec.price)return {ok:false,message:`${spec.price}円が必要だよ。`};
    state.money-=spec.price;
    const initial=species==="nushi"?int(state.sizeRecords?.nushi?.hundredths??spec.start,spec.min||spec.start,spec.max):spec.start;
    const f={uid:`pet-${p.nextId++}`,species,tank,bornSize:initial,length:initial,acquiredDay:day,lastDay:day,
      fedDay:-1,changedDay:-1,water:100,health:90,careDays:0,generation:0,sex:null,stars:1,xp:0,level:1};
    f.sex=sexOf(f);p.fish.push(f);p.selected=f.uid;p.selectedTank=tank;shareWater(state,tank);
    clearBreeding(p,tank,species);if(species==="nushi")p.nushiClaimed=true;
    return {ok:true,message:`${spec.name}（${cm(f.length)}cm）を飼育水槽へ迎えた。`,fish:f};
  }
  function rehome(state,uid,catalog,day){
    const p=state.petLife,index=p.fish.findIndex(f=>f.uid===uid),f=p.fish[index];
    if(!f||f.species==="nushi")return {ok:false,message:"この魚は託せないよ。ヌシは一度だけ迎えられる一匹だよ。"};
    sync(state,catalog,day);p.fish.splice(index,1);clearBreeding(p,f.tank,f.species);selectTank(state,p.selectedTank);
    return {ok:true,message:`${catalog.find(a=>a.id===f.species)?.name||"魚"} #${f.uid.slice(4)}をアスアルに託した。水槽に空きができたよ。`};
  }
  function buyTank(state){
    const p=state.petLife,next=p.unlockedTanks;
    if(next>=CAPACITY)return {ok:false,message:"水槽は6槽そろっているよ。"};
    const price=TANK_PRICES[next];
    if(!Number.isFinite(state.money)||state.money<price)return {ok:false,message:`水槽${next+1}の購入には${price}円が必要だよ。`};
    state.money-=price;p.unlockedTanks++;selectTank(state,next);
    return {ok:true,message:`水槽${next+1}を${price}円で購入した。飼える魚が5匹増えたよ。`,price};
  }
  function buyBackQuote(f,catalog){
    const spec=catalog.find(a=>a.id===f?.species);
    if(!f||!spec||f.species==="nushi")return {eligible:false,price:0,reason:"この魚は買い取れないよ。"};
    if(f.length<spec.start)return {eligible:false,price:0,reason:`まだ稚魚だよ。${cm(spec.start)}cmまで育てよう。`};
    if(f.careDays<3)return {eligible:false,price:0,reason:`あと${3-f.careDays}日、エサと水を大切にして育てよう。`};
    if(f.health<60)return {eligible:false,price:0,reason:"元気が60%以上になるまでお世話しよう。"};
    const ratio=Math.min(2,f.length/spec.start);
    const price=Math.max(50,Math.round(spec.price*ratio*(.6+f.stars*.15+f.generation*.1)/50)*50);
    return {eligible:true,price,reason:""};
  }
  function buyBack(state,uid,catalog,day){
    sync(state,catalog,day);
    const p=state.petLife,index=p.fish.findIndex(f=>f.uid===uid),f=p.fish[index];
    const quote=buyBackQuote(f,catalog);
    if(!quote.eligible)return {ok:false,message:quote.reason};
    if(!Number.isFinite(state.money))return {ok:false,message:"所持金を確認できないよ。"};
    p.fish.splice(index,1);clearBreeding(p,f.tank,f.species);selectTank(state,p.selectedTank);
    state.money+=quote.price;
    return {ok:true,price:quote.price,message:`${catalog.find(a=>a.id===f.species).name} #${f.uid.slice(4)}をアスアルが${quote.price}円で買い取ったよ。`};
  }
  function care(state,uid,action,day,catalog){
    sync(state,catalog,day);const p=state.petLife,f=p.fish.find(f=>f.uid===uid);
    if(!f)return {ok:false,message:"先にお世話する魚を選ぼう。"};
    const group=residents(state,f.tank);
    if(action==="feed"){
      const hungry=group.filter(a=>a.fedDay!==day);
      if(!hungry.length)return {ok:false,message:"今日はみんなエサを食べたよ。また明日ね。"};
      if(p.food<hungry.length)return {ok:false,message:`この水槽には${hungry.length}食必要だよ。エサはアスアルのお店で買えるよ。`};
      p.food-=hungry.length;for(const a of hungry){a.fedDay=day;a.health=int(a.health+2,20,100);addFishXP(a,6);}
      return {ok:true,fed:hungry.map(a=>a.uid),message:`${hungry.length}匹がエサをぱくっ。水質40%以上なら翌日、魚種に応じて1〜5cm成長するよ。`};
    }
    if(action==="water"){
      if(group.every(a=>a.changedDay===day)||group.every(a=>a.water>=100))return {ok:false,message:"水はきれいだよ。水換えは一日一回まで。"};
      for(const a of group){a.water=100;a.changedDay=day;a.health=int(a.health+2,20,100);addFishXP(a,4);}
      for(const egg of eggsIn(state,f.tank))egg.water=100;
      return {ok:true,message:"きれいな水に入れ替えた。魚が気持ちよさそうに泳いでいる。"};
    }return {ok:false,message:"お世話の方法を選ぼう。"};
  }
  function buyFood(state,count=1){
    if(!Number.isInteger(count)||count<1||count>10)return false;
    const price=count*100,amount=count*10;
    if(!Number.isFinite(state.money)||state.money<price||state.petLife.food+amount>99999)return false;
    state.money-=price;state.petLife.food+=amount;return true;
  }
  function dogGauge(value,max=DOG_MAX){
    const points=int(value,0,max),level=Math.floor(points/100);
    return {points,level,progress:points===max?100:points%100,
      hearts:Array.from({length:10},(_,i)=>level>=i+11?"gold":level>=i+1?"red":"white")};
  }
  function addAffinity(state,id,amount){
    if(!(id in state.dogAffinity))return 0;const before=state.dogAffinity[id];
    const gain=Math.max(0,num(amount));
    state.dogAffinity[id]=int(before+(gain>0?Math.max(1,Math.floor(gain*.5)):0),0,DOG_MAX);return state.dogAffinity[id]-before;
  }
  function addTricks(state,id,amount){
    if(!(id in state.dogTricks))return 0;const before=state.dogTricks[id];
    state.dogTricks[id]=int(before+Math.max(0,num(amount)),0,TRICK_MAX);return state.dogTricks[id]-before;
  }
  function dogDay(state,id,day){
    if(!state.petLife.dogDaily[id]||state.petLife.dogDaily[id].day!==day)state.petLife.dogDaily[id]={day,pets:0,trained:false};
    return state.petLife.dogDaily[id];
  }
  function pet(state,id,day){if(!(id in state.dogAffinity))return 0;const d=dogDay(state,id,day);if(d.pets>=3)return 0;d.pets++;return addAffinity(state,id,8);}
  function train(state,id,day){if(!(id in state.dogTricks))return false;const d=dogDay(state,id,day);if(d.trained)return false;d.trained=true;addTricks(state,id,15);addAffinity(state,id,5);return true;}
  const forageCount=(state,id)=>1+Math.floor(int(state.dogAffinity[id],0,DOG_MAX)/500);
  const trickChance=(state,id)=>Math.min(.95,.35+Math.floor(int(state.dogTricks[id],0,TRICK_MAX)/100)*.06);
  function addFishXP(f,amount){f.xp=int((f.xp||0)+amount,0,1083);f.level=fishLevel(f.xp);}
  function fishScore(f){
    if(!f)return {score:0,detail:"魚を選ぼう。"};
    const level=(fishLevel(f.xp||0)-1)/19*35;
    const growth=Math.min(25,8+Math.max(0,f.length-f.bornSize)/Math.max(50,f.bornSize*.5)*11+Math.max(0,(f.stars||1)-1)*1.5);
    const health=f.health*.25,water=f.water*.15;
    return {score:Math.round(level+growth+health+water),detail:`Lv.${fishLevel(f.xp||0)} ${Math.round(level)}/35 ・ 成長と★ ${Math.round(growth)}/25 ・ 元気 ${Math.round(health)}/25 ・ 水質 ${Math.round(water)}/15 ・ 第${(f.generation||0)+1}世代`};
  }
  function normalizeJudges(value){
    return (Array.isArray(value)?value:[]).slice(0,3).map(a=>({owner:String(a.owner||"村人").slice(0,40),dog:String(a.dog||"相棒").slice(0,24),breed:String(a.breed||"ミックス").slice(0,24),
      art:/^[a-z]+$/.test(a.art||"")?a.art:"gen",dogArt:/^[a-z]+$/.test(a.dogArt||"")?a.dogArt:"shuu",score:int(a.score,0,100)}));
  }
  function normalizeContest(value,dogIds,fish,catalog,day){
    const a=record(value);if(!kinds[a.kind]||!courses.some(c=>c.id===a.course)||!["entrance","performance","judging"].includes(a.phase))return null;
    if(a.kind==="fish"?!catalog.some(f=>f.id===a.subject):!dogIds.includes(a.participant))return null;
    const commands=(Array.isArray(a.commands)?a.commands:[]).filter(v=>TRICKS.includes(v)).slice(0,5);
    if(new Set(commands).size!==commands.length)return null;
    return {kind:a.kind,course:a.course,participant:String(a.participant).slice(0,24),subject:String(a.subject).slice(0,24),name:String(a.name||"相棒").slice(0,40),day:int(a.day,0,day),phase:a.phase,
      baseScore:int(a.baseScore,0,100),chance:clamp(a.chance,0,.95),detail:String(a.detail||"").slice(0,160),audience:int(a.audience,-5,5),judges:normalizeJudges(a.judges),
      rolls:Array.from({length:5},(_,i)=>clamp(a.rolls?.[i],0,.999999999)),marks:(Array.isArray(a.marks)?a.marks:[]).slice(0,commands.length).map(Boolean),commands};
  }
  const villagers=[{owner:"源じい",art:"gen"},{owner:"ミナ",art:"mina"},{owner:"タケ",art:"take"},{owner:"ハル",art:"haru"}];
  const dogNames=["ポチ","ココ","ムギ","ソラ","ハナ","レオ","モモ","カイ"];
  const breeds=[{breed:"柴犬",dogArt:"shuu"},{breed:"ボーダーコリー",dogArt:"riku"},{breed:"黒柴",dogArt:"grey"},{breed:"ボーダーコリー",dogArt:"cloud"},{breed:"ラブラドール",dogArt:"jamie"},{breed:"ハスキー",dogArt:"chappie"}];
  function contestants(course,random){
    const roll=()=>clamp(random(),0,.999999999);
    if(course==="advanced")return [
      {owner:"リアオ・ダモディ",dog:"クロー",breed:"ボーダーコリー",art:"liao",dogArt:"crow",score:96+Math.floor(roll()*4)},
      {owner:"アスアル・マダケン",dog:"クラウド",breed:"ボーダーコリー",art:"asual",dogArt:"cloud",score:92+Math.floor(roll()*6)},
      {owner:"ダンサー・イチャピ",dog:"ジェイミー",breed:"ラブラドール",art:"dancer",dogArt:"jamie",score:88+Math.floor(roll()*8)}];
    const used=new Set(),names=new Set();return Array.from({length:3},()=>{
      const pool=villagers.filter(v=>!used.has(v.art)),person=pool[Math.floor(roll()*pool.length)];used.add(person.art);
      const choices=dogNames.filter(n=>!names.has(n)),dog=choices[Math.floor(roll()*choices.length)];names.add(dog);
      const breed=breeds[Math.floor(roll()*breeds.length)],score=(course==="beginner"?20:52)+Math.floor(roll()*(course==="beginner"?32:29));
      return {...person,dog,...breed,score};
    });
  }
  function beginContest(state,kind,courseId,participant,day,catalog,dogs,random=Math.random){
    const c=courses.find(c=>c.id===courseId),p=state.petLife,key=`${kind}:${courseId}`;
    if(!c||!kinds[kind])return {ok:false,message:"コースを選ぼう。"};
    if(p.contest)return {ok:false,message:"参加中のステージを先に終えよう。"};
    if(state.tournament)return {ok:false,message:"釣り大会を終えてから参加しよう。"};
    if(p.entries[key]===day)return {ok:false,message:"このコースは今日参加したよ。次の受付は明日。"};
    const dog=dogs.find(d=>d.id===participant),f=p.fish.find(f=>f.uid===participant);
    if((kind==="fish"&&!f)||(kind!=="fish"&&!dog))return {ok:false,message:"参加する子を選ぼう。"};
    if(!Number.isFinite(state.money)||state.money<c.fee)return {ok:false,message:`参加費${c.fee}円が必要だよ。`};
    sync(state,catalog,day);
    const stats=kind==="fish"?fishScore(f):{score:Math.round(state.dogAffinity[participant]/20),detail:`なつき度 ${Math.round(state.dogAffinity[participant]/20)}/100点`};
    const session={kind,course:courseId,participant,subject:kind==="fish"?f.species:dog.id,name:kind==="fish"?catalog.find(s=>s.id===f.species).name:dog.name,
      day,phase:"entrance",baseScore:stats.score,detail:stats.detail,chance:kind==="tricks"?trickChance(state,participant):0,
      audience:Math.floor(clamp(random(),0,.999999999)*11)-5,judges:contestants(courseId,random),
      rolls:kind==="tricks"?Array.from({length:5},()=>clamp(random(),0,.999999999)):[],marks:[],commands:[]};
    state.money-=c.fee;p.entries[key]=day;p.contest=session;
    return {ok:true,session};
  }
  function commandTrick(state,trick){
    const a=state.petLife.contest;
    if(!a||a.kind!=="tricks"||a.phase!=="performance"||!TRICKS.includes(trick)||a.commands.includes(trick))return {ok:false,message:"まだ指示できない芸だよ。"};
    const success=a.rolls[a.commands.length]<a.chance;
    a.commands.push(trick);a.marks.push(success);if(a.commands.length===5)a.phase="judging";
    return {ok:true,success,trick};
  }
  function advanceContest(state){
    const a=state.petLife.contest;if(!a)return {ok:false};
    if(a.phase==="entrance"){a.phase="performance";return {ok:true};}
    if(a.phase==="performance"&&a.kind!=="tricks"){a.phase="judging";return {ok:true};}
    if(a.phase!=="judging")return {ok:false,message:"5つの芸を一つずつ指示しよう。"};
    const c=courses.find(c=>c.id===a.course),p=state.petLife,key=`${a.kind}:${a.course}`;
    const base=a.kind==="tricks"?a.marks.filter(Boolean).length*20:a.baseScore;
    const score=int(base+(a.kind==="tricks"?0:a.audience),0,100);
    const rank=1+a.judges.filter(v=>v.score>score).length,reward=score>0?Math.floor(c.prize*[1,.5,.25,0][rank-1]):0;
    state.money+=reward;p.best[key]=Math.max(p.best[key]||0,score);
    p.lastResult={kind:a.kind,course:a.course,name:a.name,subject:a.subject,day:a.day,score,baseScore:base,audience:a.audience,rank,reward,
      detail:a.kind==="tricks"?`5つの芸 ${a.marks.filter(Boolean).length}/5成功`:a.detail+` ・ 観客 ${a.audience>=0?"＋":""}${a.audience}`,
      marks:[...a.marks],commands:[...a.commands],judges:a.judges};p.contest=null;
    return {ok:true,result:p.lastResult};
  }
  // Compatibility API for scripts: the actual UI uses each saved stage above.
  function enter(state,kind,courseId,participant,day,catalog,dogs,random=Math.random){
    const result=beginContest(state,kind,courseId,participant,day,catalog,dogs,random);if(!result.ok)return result;
    advanceContest(state);
    if(kind==="tricks")for(const trick of TRICKS)commandTrick(state,trick);
    else advanceContest(state);
    return advanceContest(state);
  }
  const cm=v=>(v/100).toFixed(2);
  return Object.freeze({DOG_MAX,TRICK_MAX,CAPACITY,TANK_CAPACITY,BREED_DAYS,TANK_PRICES,courses,kinds,normalize,sync,selected,residents,canHouse,selectTank,moveFish,acquire,rehome,buyTank,buyBack,buyBackQuote,starInterval,dailyGrowth,care,buyFood,
    dogGauge,addAffinity,addTricks,dogDay,pet,train,forageCount,trickChance,fishScore,enter,cm,TRICKS,fishLevel,xpForLevel,hatchDays,eggsIn,beginContest,advanceContest,commandTrick});
});
