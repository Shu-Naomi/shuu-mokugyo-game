/* One saved draw per egg. Colour never changes a specimen's statistics. */
(function(root,factory){
  const api=factory(root);
  if(typeof module==='object'&&module.exports)module.exports=api;
  if(root)root.ShuAquariumMutations=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(root){
  'use strict';
  const VERSION=6,RULE_VERSION=1,DENOMINATOR=1000,WORD_LIMIT=4294967000;
  const forms=Object.freeze({
    funa:Object.freeze({name:'フナ',kind:'gold',label:'黄金',title:'黄金のフナ',appearance:'黄金色のフナ',artId:'funaGold'}),
    koi:Object.freeze({name:'コイ',kind:'gold',label:'黄金',title:'黄金のコイ',appearance:'黄金色のコイ',artId:'koiGold'}),
    namazu:Object.freeze({name:'ナマズ',kind:'albino',label:'白化',title:'白化ナマズ',appearance:'白化ナマズ',artId:'namazuAlbino'}),
    medaka:Object.freeze({name:'メダカ',kind:'gold',label:'黄金',title:'黄金のメダカ',appearance:'黄金色のメダカ',artId:'medakaGold'}),
    unagi:Object.freeze({name:'ウナギ',kind:'albino',label:'白化',title:'白化ウナギ',appearance:'白化ウナギ',artId:'unagiAlbino'}),
    dojo:Object.freeze({name:'ドジョウ',kind:'albino',label:'白化',title:'白化ドジョウ',appearance:'白化ドジョウ',artId:'dojoAlbino'}),
    madai:Object.freeze({name:'マダイ',kind:'blue',label:'蒼鱗',title:'蒼鱗マダイ',appearance:'蒼鱗マダイ',artId:'madaiBlue'}),
  });
  const speciesForm=species=>typeof species==='string'&&Object.hasOwn(forms,species)?forms[species]:null;
  const form=(species,kind)=>{const f=speciesForm(species);return f?.kind===kind?f:null;};
  const goldForm=species=>form(species,'gold');
  const mutationForm=fish=>fish?.mutation?.checked===true?form(fish.species,fish.mutation.kind):null;
  const ready=new WeakMap(),validSeed=seed=>typeof seed==='string'&&/^[a-f0-9]{32}$/.test(seed);
  const id=value=>typeof value==='string'&&/^[a-zA-Z0-9_-]{1,48}$/.test(value);
  const uint=value=>Number.isInteger(value)&&value>=0&&value<=0xffffffff;
  const normal=(ruleVersion=0)=>({checked:true,kind:'normal',ruleVersion});
  function normalize(value,legacy=false){
    if(legacy||!value||typeof value!=='object'||!id(value.kind)||!uint(value.ruleVersion))return normal();
    if(value.checked===false&&value.kind==='normal'&&['seed-unavailable','unsupported-rule'].includes(value.reason))
      return {checked:false,kind:'normal',ruleVersion:value.ruleVersion,reason:value.reason};
    return value.checked===true?{checked:true,kind:value.kind,ruleVersion:value.ruleVersion}:normal();
  }
  const isGold=fish=>mutationForm(fish)?.kind==='gold';
  const label=fish=>mutationForm(fish)?.label||(fish?.mutation?.kind&&fish.mutation.kind!=='normal'?'未対応の色':'通常色');
  function createSeed(){
    try{
      const bytes=new Uint8Array(16);root.crypto.getRandomValues(bytes);
      return Array.from(bytes,n=>n.toString(16).padStart(2,'0')).join('');
    }catch{return null;}
  }
  function prepare(state,makeSeed=createSeed){
    const p=state.petLife;if(!p)return false;
    if(validSeed(p.mutationSeed))return true;
    const seed=makeSeed();p.mutationSeed=validSeed(seed)?seed:null;
    ready.delete(state);return !!p.mutationSeed;
  }
  function acceptStored(state,stored){
    if(stored?.version>=VERSION&&validSeed(stored.mutationSeed))ready.set(state,stored.mutationSeed);
    else ready.delete(state);
  }
  function confirmSaved(state){
    const seed=state.petLife?.mutationSeed;
    if(validSeed(seed))ready.set(state,seed);
  }
  const seedIsSaved=state=>validSeed(state.petLife?.mutationSeed)&&ready.get(state)===state.petLife.mutationSeed;

  // Synchronous SHA-256 for the ASCII, versioned egg key. Keeping it here
  // avoids asynchronous crypto inside the existing synchronous sync().
  const K=[0x428a2f98,0x71374491,0xb5c0fbcf,0xe9b5dba5,0x3956c25b,0x59f111f1,0x923f82a4,0xab1c5ed5,
    0xd807aa98,0x12835b01,0x243185be,0x550c7dc3,0x72be5d74,0x80deb1fe,0x9bdc06a7,0xc19bf174,
    0xe49b69c1,0xefbe4786,0x0fc19dc6,0x240ca1cc,0x2de92c6f,0x4a7484aa,0x5cb0a9dc,0x76f988da,
    0x983e5152,0xa831c66d,0xb00327c8,0xbf597fc7,0xc6e00bf3,0xd5a79147,0x06ca6351,0x14292967,
    0x27b70a85,0x2e1b2138,0x4d2c6dfc,0x53380d13,0x650a7354,0x766a0abb,0x81c2c92e,0x92722c85,
    0xa2bfe8a1,0xa81a664b,0xc24b8b70,0xc76c51a3,0xd192e819,0xd6990624,0xf40e3585,0x106aa070,
    0x19a4c116,0x1e376c08,0x2748774c,0x34b0bcb5,0x391c0cb3,0x4ed8aa4a,0x5b9cca4f,0x682e6ff3,
    0x748f82ee,0x78a5636f,0x84c87814,0x8cc70208,0x90befffa,0xa4506ceb,0xbef9a3f7,0xc67178f2];
  const rotate=(x,n)=>(x>>>n)|(x<<(32-n));
  function hashWords(text){
    const bytes=Array.from(text,c=>c.charCodeAt(0));
    if(bytes.some(n=>n>127))throw Error('Egg keys must be ASCII');
    const bits=bytes.length*8;bytes.push(128);while(bytes.length%64!==56)bytes.push(0);
    for(let i=7;i>=0;i--)bytes.push(Math.floor(bits/2**(i*8))&255);
    const h=[0x6a09e667,0xbb67ae85,0x3c6ef372,0xa54ff53a,0x510e527f,0x9b05688c,0x1f83d9ab,0x5be0cd19],w=new Uint32Array(64);
    for(let offset=0;offset<bytes.length;offset+=64){
      for(let i=0;i<16;i++){const j=offset+i*4;w[i]=bytes[j]<<24|bytes[j+1]<<16|bytes[j+2]<<8|bytes[j+3];}
      for(let i=16;i<64;i++){
        const x=w[i-15],y=w[i-2],s0=rotate(x,7)^rotate(x,18)^(x>>>3),s1=rotate(y,17)^rotate(y,19)^(y>>>10);
        w[i]=(w[i-16]+s0+w[i-7]+s1)>>>0;
      }
      let [a,b,c,d,e,f,g,t]=h;
      for(let i=0;i<64;i++){
        const s1=rotate(e,6)^rotate(e,11)^rotate(e,25),ch=(e&f)^(~e&g),u=(t+s1+ch+K[i]+w[i])>>>0;
        const s0=rotate(a,2)^rotate(a,13)^rotate(a,22),maj=(a&b)^(a&c)^(b&c),v=(s0+maj)>>>0;
        t=g;g=f;f=e;e=(d+u)>>>0;d=c;c=b;b=a;a=(u+v)>>>0;
      }
      [a,b,c,d,e,f,g,t].forEach((n,i)=>h[i]=(h[i]+n)>>>0);
    }
    return h;
  }
  function ticket(seed,egg,hash=hashWords){
    const key=JSON.stringify(['aquarium-mutation',RULE_VERSION,seed,egg.uid,egg.species,egg.laidDay,egg.generation,egg.parents?.mother,egg.parents?.father]);
    // Reject the last 296 values, rather than biasing zero with a bare %1000.
    for(let block=0;;block++)for(const word of hash(key+':'+block)){
      if(!uint(word))throw Error('Invalid mutation hash word');
      if(word<WORD_LIMIT)return word%DENOMINATOR;
    }
  }
  function draw(state,egg,hash=hashWords){
    const candidate=speciesForm(egg.species);
    if(!candidate||!Number.isInteger(egg.generation)||egg.generation<2||egg.generation>20)return normal(RULE_VERSION);
    const rule=state.petLife.mutationRuleVersion??RULE_VERSION;
    if(rule!==RULE_VERSION)return {checked:false,kind:'normal',ruleVersion:rule,reason:'unsupported-rule'};
    if(!seedIsSaved(state))return {checked:false,kind:'normal',ruleVersion:RULE_VERSION,reason:'seed-unavailable'};
    return {checked:true,kind:ticket(state.petLife.mutationSeed,egg,hash)===0?candidate.kind:'normal',ruleVersion:RULE_VERSION};
  }
  function normalizeDiscoveries(value,day){
    const seen=new Set();return (Array.isArray(value)?value:[]).slice(0,64).flatMap(v=>{
      if(!id(v?.species)||!id(v?.kind)||!/^pet-\d+$/.test(v?.firstUid)||!Number.isInteger(v.firstDay)||v.firstDay<0||v.firstDay>day)return [];
      const key=v.species+':'+v.kind;if(seen.has(key))return [];seen.add(key);
      return [{species:v.species,kind:v.kind,firstUid:v.firstUid,firstDay:v.firstDay,notified:v.notified===true}];
    });
  }
  function discover(p,fish,day){
    const found=mutationForm(fish);if(!found)return;
    p.mutationDiscoveries||=[];
    if(!p.mutationDiscoveries.some(d=>d.species===fish.species&&d.kind===found.kind))
      p.mutationDiscoveries.push({species:fish.species,kind:found.kind,firstUid:fish.uid,firstDay:day,notified:false});
  }
  function acknowledge(state,persist){
    const pending=(state.petLife?.mutationDiscoveries||[]).filter(d=>form(d.species,d.kind)&&!d.notified);
    if(!pending.length)return [];
    for(const d of pending)d.notified=true;
    try{if(persist()===true)return pending.map(d=>({...d}));}catch{}
    for(const d of pending)d.notified=false;return [];
  }
  return Object.freeze({VERSION,RULE_VERSION,DENOMINATOR,WORD_LIMIT,form,mutationForm,goldForm,normal,normalize,isGold,label,validSeed,createSeed,prepare,acceptStored,confirmSaved,seedIsSaved,hashWords,ticket,draw,normalizeDiscoveries,discover,acknowledge});
});
