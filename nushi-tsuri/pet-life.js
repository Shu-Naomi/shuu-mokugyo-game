/* Persistent pet specimens. Growth uses game days and integer 0.01 cm units. */
(function(root,factory){const api=factory();if(typeof module==="object"&&module.exports)module.exports=api;else root.ShuPetLife=api;
})(typeof globalThis!=="undefined"?globalThis:this,function(){
  "use strict";
  const DOG_MAX=2000,TRICK_MAX=1000,CAPACITY=6,TANK_CAPACITY=5,BREED_DAYS=3;
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
      if(!spec||!/^pet-\d+$/.test(f.uid)||used.has(f.uid)||(spec.id==="nushi"&&!(state.caught?.nushi>0)))return [];
      used.add(f.uid);const bornSize=int(f.bornSize,spec.min||spec.start,spec.max);
      const fish={uid:f.uid,species:spec.id,tank:old.version>=2?int(f.tank,0,CAPACITY-1):Math.min(index,CAPACITY-1),bornSize,length:int(f.length,bornSize,spec.max),
        acquiredDay:int(f.acquiredDay,0,day),lastDay:int(f.lastDay,0,day),
        fedDay:int(f.fedDay,-1,day),changedDay:int(f.changedDay,-1,day),
        water:int(f.water,0,100),health:int(f.health,20,100),careDays:int(f.careDays,0,day+1),
        generation:int(f.generation,0,20),sex:sexOf(f)};
      fish.stars=int(f.stars??starLevel(fish),1,5);
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
        detail:typeof last.detail==="string"?last.detail.slice(0,160):""}:null;
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
      return match&&Number(match[1])<tankSlots&&match[2]!=="nushi"&&catalog.some(f=>f.id===match[2]);
    }).map(([key,value])=>[key,{days:int(value?.days,0,BREED_DAYS),lastDay:int(value?.lastDay,0,day),
      mother:typeof value?.mother==="string"?value.mother.slice(0,24):"",father:typeof value?.father==="string"?value.father.slice(0,24):""}]));
    const birth=record(old.lastBirth);
    const lastBirth=catalog.some(f=>f.id===birth.species)&&placed.some(f=>f.uid===birth.uid)
      ? {uid:birth.uid,species:birth.species,tank:int(birth.tank,0,CAPACITY-1),day:int(birth.day,0,day)}:null;
    state.petLife={version:3,fish:placed,food:int(old.food??10,0,99999),unlockedTanks:tankSlots,breeding,lastBirth,
      nextId:Math.max(int(old.nextId,1),...specimens.map(f=>Number(f.uid.slice(4))+1)),
      selected:placed.some(f=>f.uid===old.selected)?old.selected:placed[0]?.uid||null,
      selectedTank:int(old.selectedTank??placed.find(f=>f.uid===old.selected)?.tank??placed[0]?.tank??0,0,CAPACITY-1),
      nushiClaimed:old.nushiClaimed===true||specimens.some(f=>f.species==="nushi"),dogDaily,entries,best,lastResult};
    sync(state,catalog,day);for(let t=0;t<CAPACITY;t++)shareWater(state,t);
    selectTank(state,state.petLife.selectedTank);return state.petLife;
  }
  function sync(state,catalog,day){
    if(!state.petLife)return false;let changed=false;
    const p=state.petLife,births=[];
    for(let tank=0;tank<p.unlockedTanks;tank++){
      const group=residents(state,tank),species=[...new Set(group.map(f=>f.species))];
      let available=TANK_CAPACITY-group.length;
      for(const id of species){
        if(id==="nushi")continue;
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
        if(days>=BREED_DAYS&&available>0){births.push({tank,id,mother,father});available--;days=0;}
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
    for(const {tank,id,mother,father} of births){
      const spec=catalog.find(s=>s.id===id),uid=`pet-${p.nextId++}`;
      const initial=Math.max(spec.min||100,Math.floor(spec.start*.8));
      const child={uid,species:id,tank,bornSize:initial,length:initial,acquiredDay:day,lastDay:day,
        fedDay:-1,changedDay:-1,water:Math.min(...residents(state,tank).map(f=>f.water)),
        health:90,careDays:0,generation:Math.min(20,Math.max(mother.generation,father.generation)+1),
        sex:sexOf({uid}),stars:1};
      p.fish.push(child);p.lastBirth={uid,species:id,tank,day};changed=true;
    }
    return changed;
  }
  const selected=state=>state.petLife.fish.find(f=>f.uid===state.petLife.selected)||null;
  const residents=(state,tank=state.petLife.selectedTank)=>state.petLife.fish.filter(f=>f.tank===tank);
  const waterKind=(catalog,species)=>catalog.find(s=>s.id===species)?.waterLabel||"淡水";
  const canHouse=(state,species,catalog,tank)=>Number.isInteger(tank)&&tank>=0&&tank<state.petLife.unlockedTanks&&residents(state,tank).length<TANK_CAPACITY&&residents(state,tank).every(f=>waterKind(catalog,f.species)===waterKind(catalog,species));
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
    if(species!=="nushi"&&!(state.caught?.[species]>0))return {ok:false,message:"まず自分で釣って図鑑に登録すると、この魚を迎えられるよ。"};
    sync(state,catalog,day);
    if(tank===null)tank=[p.selectedTank,...Array.from({length:p.unlockedTanks},(_,i)=>i)].find(t=>canHouse(state,species,catalog,t));
    if(!canHouse(state,species,catalog,tank))return {ok:false,message:"この水槽は満員か、水の種類が違うよ。1槽5匹まで迎えられる。"};
    if(species==="nushi"&&(!(state.caught?.nushi>0)||p.nushiClaimed))return {ok:false,message:"ヌシを釣った記録があると、一匹を飼育水槽へ迎えられる。"};
    if(!Number.isFinite(state.money)||state.money<spec.price)return {ok:false,message:`${spec.price}円が必要だよ。`};
    state.money-=spec.price;
    const initial=species==="nushi"?int(state.sizeRecords?.nushi?.hundredths??spec.start,spec.min||spec.start,spec.max):spec.start;
    const f={uid:`pet-${p.nextId++}`,species,tank,bornSize:initial,length:initial,acquiredDay:day,lastDay:day,
      fedDay:-1,changedDay:-1,water:100,health:90,careDays:0,generation:0,sex:null,stars:1};
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
      p.food-=hungry.length;for(const a of hungry){a.fedDay=day;a.health=int(a.health+2,20,100);}
      return {ok:true,fed:hungry.map(a=>a.uid),message:`${hungry.length}匹がエサをぱくっ。水質40%以上なら翌日、魚種に応じて1〜5cm成長するよ。`};
    }
    if(action==="water"){
      if(group.every(a=>a.changedDay===day)||group.every(a=>a.water>=100))return {ok:false,message:"水はきれいだよ。水換えは一日一回まで。"};
      for(const a of group){a.water=100;a.changedDay=day;a.health=int(a.health+2,20,100);}
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
    state.dogAffinity[id]=int(before+Math.max(0,num(amount)),0,DOG_MAX);return state.dogAffinity[id]-before;
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
  function train(state,id,day){if(!(id in state.dogTricks))return false;const d=dogDay(state,id,day);if(d.trained)return false;d.trained=true;addTricks(state,id,25);addAffinity(state,id,5);return true;}
  const forageCount=(state,id)=>1+Math.floor(int(state.dogAffinity[id],0,DOG_MAX)/500);
  const trickChance=(state,id)=>Math.min(.95,.35+Math.floor(int(state.dogTricks[id],0,TRICK_MAX)/100)*.06);
  function fishScore(f){
    if(!f)return {score:0,detail:"魚を選ぼう。"};
    const bonus=Math.max(0,(f.stars||1)-1)*2;
    const size=Math.min(45,20+Math.max(0,f.length-f.bornSize)/Math.max(50,f.bornSize*.1)*25+bonus);
    const health=f.health*.35,water=f.water*.2;
    return {score:Math.round(size+health+water),detail:`成長・体格 ${Math.round(size)}/45 ・ 元気 ${Math.round(health)}/35 ・ 水質 ${Math.round(water)}/20 ・ ★${f.stars||1}（${f.generation||0}世代）`};
  }
  function enter(state,kind,courseId,participant,day,catalog,dogs,random=Math.random){
    const c=courses.find(c=>c.id===courseId),p=state.petLife,key=`${kind}:${courseId}`;
    if(!c||!kinds[kind])return {ok:false,message:"コースを選ぼう。"};
    if(state.tournament)return {ok:false,message:"釣り大会を終えてから参加しよう。"};
    if(p.entries[key]===day)return {ok:false,message:"このコースは今日参加したよ。次の受付は明日。"};
    const dog=dogs.find(d=>d.id===participant),f=p.fish.find(f=>f.uid===participant);
    if((kind==="fish"&&!f)||(kind!=="fish"&&!dog))return {ok:false,message:"参加する子を選ぼう。"};
    if(!Number.isFinite(state.money)||state.money<c.fee)return {ok:false,message:`参加費${c.fee}円が必要だよ。`};
    sync(state,catalog,day);let score,detail,marks=[];
    if(kind==="fish")({score,detail}=fishScore(f));
    else if(kind==="bond"){score=Math.round(state.dogAffinity[participant]/20);detail=`なつき度 ${score}/100点`;}
    else{const chance=trickChance(state,participant);marks=Array.from({length:5},()=>clamp(random(),0,.999999999)<chance);
      score=marks.filter(Boolean).length*20;detail=`おすわり・お手・待て・ターン・キャッチ：${marks.filter(Boolean).length}/5成功`;}
    const rank=1+c.rivals.filter(v=>v>score).length,reward=score>0?Math.floor(c.prize*[1,.5,.25,0][rank-1]):0;
    state.money+=reward-c.fee;p.entries[key]=day;p.best[key]=Math.max(p.best[key]||0,score);
    // Fixed result, fee and prize share a save; reopening cannot reroll/claim.
    p.lastResult={kind,course:courseId,name:kind==="fish"?catalog.find(s=>s.id===f.species).name:dog.name,
      subject:kind==="fish"?f.species:dog.id,day,score,rank,reward,detail,marks};return {ok:true,result:p.lastResult};
  }
  const cm=v=>(v/100).toFixed(2);
  return Object.freeze({DOG_MAX,TRICK_MAX,CAPACITY,TANK_CAPACITY,BREED_DAYS,TANK_PRICES,courses,kinds,normalize,sync,selected,residents,canHouse,selectTank,moveFish,acquire,rehome,buyTank,buyBack,buyBackQuote,starInterval,dailyGrowth,care,buyFood,
    dogGauge,addAffinity,addTricks,dogDay,pet,train,forageCount,trickChance,fishScore,enter,cm});
});
