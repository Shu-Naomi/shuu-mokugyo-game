/* Persistent pet specimens. Growth uses game days and integer 0.01 cm units. */
(function(root,factory){const api=factory();if(typeof module==="object"&&module.exports)module.exports=api;else root.ShuPetLife=api;
})(typeof globalThis!=="undefined"?globalThis:this,function(){
  "use strict";
  const DOG_MAX=2000,TRICK_MAX=1000,CAPACITY=6;
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
  function normalize(state,catalog,dogIds,day){
    const old=record(state.petLife),migrated=old.version!==1;
    state.dogAffinity=record(state.dogAffinity);state.dogTricks=record(state.dogTricks);
    for(const id of dogIds){
      state.dogAffinity[id]=migrated?int(state.dogAffinity[id],0,100)*20:int(state.dogAffinity[id],0,DOG_MAX);
      state.dogTricks[id]=int(state.dogTricks[id],0,TRICK_MAX);
    }
    const used=new Set();
    const specimens=(Array.isArray(old.fish)?old.fish:[]).slice(0,CAPACITY).flatMap(f=>{
      const spec=catalog.find(s=>s.id===f?.species);
      if(!spec||!/^pet-\d+$/.test(f.uid)||used.has(f.uid)||(spec.id==="nushi"&&!(state.caught?.nushi>0)))return [];
      used.add(f.uid);const bornSize=int(f.bornSize,spec.start,spec.max);
      return [{uid:f.uid,species:spec.id,bornSize,length:int(f.length,bornSize,spec.max),
        acquiredDay:int(f.acquiredDay,0,day),lastDay:int(f.lastDay,0,day),
        fedDay:int(f.fedDay,-1,day),changedDay:int(f.changedDay,-1,day),
        water:int(f.water,0,100),health:int(f.health,20,100),careDays:int(f.careDays,0,day+1)}];
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
        rank:int(last.rank,1,4),reward:int(last.reward,0,1600),marks:Array.isArray(last.marks)?last.marks.slice(0,5).map(Boolean):[],
        detail:typeof last.detail==="string"?last.detail.slice(0,160):""}:null;
    state.petLife={version:1,fish:specimens,food:int(old.food??10,0,99999),
      nextId:Math.max(int(old.nextId,1),...specimens.map(f=>Number(f.uid.slice(4))+1)),
      selected:used.has(old.selected)?old.selected:specimens[0]?.uid||null,
      nushiClaimed:old.nushiClaimed===true||specimens.some(f=>f.species==="nushi"),dogDaily,entries,best,lastResult};
    sync(state,catalog,day);return state.petLife;
  }
  function sync(state,catalog,day){
    if(!state.petLife)return false;let changed=false;
    for(const f of state.petLife.fish){
      const elapsed=day-f.lastDay,spec=catalog.find(s=>s.id===f.species);
      if(elapsed<=0||!spec)continue;
      const cared=f.fedDay===f.lastDay&&f.water>=40;
      // A ration covers one day, never every skipped day.
      if(cared){f.length=Math.min(spec.max,f.length+10);f.careDays++;}
      f.health=int(f.health+(cared?3:0)-Math.max(0,elapsed-(cared?1:0))*4,20,100);
      f.water=int(f.water-elapsed*8,0,100);f.lastDay=day;changed=true;
    }return changed;
  }
  const selected=state=>state.petLife.fish.find(f=>f.uid===state.petLife.selected)||null;
  function acquire(state,species,catalog,day){
    const p=state.petLife,spec=catalog.find(f=>f.id===species);
    if(!spec)return {ok:false,message:"この魚は迎えられない。"};
    if(p.fish.length>=CAPACITY)return {ok:false,message:`飼育水槽は${CAPACITY}槽とも使用中だよ。`};
    if(species==="nushi"&&(!(state.caught?.nushi>0)||p.nushiClaimed))return {ok:false,message:"ヌシを釣った記録があると、一匹を飼育水槽へ迎えられる。"};
    if(!Number.isFinite(state.money)||state.money<spec.price)return {ok:false,message:`${spec.price}円が必要だよ。`};
    state.money-=spec.price;
    const f={uid:`pet-${p.nextId++}`,species,bornSize:spec.start,length:spec.start,acquiredDay:day,lastDay:day,
      fedDay:-1,changedDay:-1,water:100,health:90,careDays:0};
    p.fish.push(f);p.selected=f.uid;if(species==="nushi")p.nushiClaimed=true;
    return {ok:true,message:`${spec.name}（${cm(f.length)}cm）を飼育水槽へ迎えた。`,fish:f};
  }
  function care(state,uid,action,day,catalog){
    sync(state,catalog,day);const p=state.petLife,f=p.fish.find(f=>f.uid===uid);
    if(!f)return {ok:false,message:"先にお世話する魚を選ぼう。"};
    if(action==="feed"){
      if(f.fedDay===day)return {ok:false,message:"今日はエサをあげたよ。また明日ね。"};
      if(p.food<1)return {ok:false,message:"魚のエサはアスアルのお店で買えるよ。"};
      p.food--;f.fedDay=day;f.health=int(f.health+2,20,100);
      return {ok:true,message:"エサをぱくっ。水質40%以上で日付が変わると、約0.1cm成長するよ。"};
    }
    if(action==="water"){
      if(f.changedDay===day||f.water>=100)return {ok:false,message:"水はきれいだよ。水換えは一日一回まで。"};
      f.water=100;f.changedDay=day;f.health=int(f.health+2,20,100);
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
  function pet(state,id,day){const d=dogDay(state,id,day);if(d.pets>=3)return 0;d.pets++;return addAffinity(state,id,8);}
  function train(state,id,day){const d=dogDay(state,id,day);if(d.trained)return false;d.trained=true;addTricks(state,id,25);addAffinity(state,id,5);return true;}
  const forageCount=(state,id)=>1+Math.floor(int(state.dogAffinity[id],0,DOG_MAX)/500);
  const trickChance=(state,id)=>Math.min(.95,.35+Math.floor(int(state.dogTricks[id],0,TRICK_MAX)/100)*.06);
  function fishScore(f){
    if(!f)return {score:0,detail:"魚を選ぼう。"};
    const size=Math.min(45,20+Math.max(0,f.length-f.bornSize)/Math.max(50,f.bornSize*.1)*25);
    const health=f.health*.35,water=f.water*.2;
    return {score:Math.round(size+health+water),detail:`成長・体格 ${Math.round(size)}/45 ・ 元気 ${Math.round(health)}/35 ・ 水質 ${Math.round(water)}/20`};
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
      day,score,rank,reward,detail,marks};return {ok:true,result:p.lastResult};
  }
  const cm=v=>(v/100).toFixed(2);
  return Object.freeze({DOG_MAX,TRICK_MAX,CAPACITY,courses,kinds,normalize,sync,selected,acquire,care,buyFood,
    dogGauge,addAffinity,addTricks,dogDay,pet,train,forageCount,trickChance,fishScore,enter,cm});
});
