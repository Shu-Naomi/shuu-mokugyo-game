const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path'),crypto=require('node:crypto');
const M=require('../aquarium-mutations.js'),P=require('../pet-life.js'),A=require('../aquarium-life.js'),Art=require('../fish-art.js');
const copy=v=>JSON.parse(JSON.stringify(v)),dogs=['shuu','riku','grey'],seed='00000000000000000000000000000251';
const catalog=[{id:'kamatsuka',name:'カマツカ',min:500,start:800,max:2999,price:850,waterLabel:'淡水'}];
const albino={checked:true,kind:'albino',ruleVersion:1};
const egg=(generation=2)=>({uid:'egg-1',species:'kamatsuka',tank:0,laidDay:3,hatchDay:6,generation,water:100,parents:{mother:'pet-2',father:'pet-1'}});
function pair(core=P,adventureSeed=seed){const s={money:10000,caught:{kamatsuka:1},petLife:{version:6,mutationSeed:adventureSeed,unlockedTanks:2,food:1000,nextId:3,nextEggId:1,selected:'pet-1',selectedTank:0,fish:[['pet-1','male',0],['pet-2','female',1]].map(([uid,sex,generation])=>({uid,sex,generation,species:'kamatsuka',tank:0,bornSize:generation?40:800,length:800,origin:generation?'bred':'shop',acquiredDay:0,lastDay:0,fedDay:-1,changedDay:-1,water:100,health:90,careDays:0,stars:1,xp:0,mutation:M.normal()}))}};core.normalize(s,catalog,dogs,0);return s;}
function lay(s,core=P){for(let day=0;day<3;day++){core.care(s,'pet-1','feed',day,catalog);core.care(s,'pet-1','water',day,catalog);core.sync(s,catalog,day+1);}assert.equal(s.petLife.eggs.length,1);return s.petLife.eggs[0];}
function counted(){let draws=0;const root={ShuAquariumMutations:{...M,draw(...args){draws++;return M.draw(...args);}}};vm.runInNewContext(fs.readFileSync(require.resolve('../pet-life.js'),'utf8'),root);return {core:root.ShuPetLife,count:()=>draws};}

test('Kamatsuka albino uses one winning accepted ticket per thousand and the existing generation, seed and rule boundaries',()=>{
 const s=pair();let wins=0,calls=0;for(let n=0;n<1000;n++)wins+=M.draw(s,egg(),()=>[n]).kind==='albino';assert.equal(wins,1);
 const hash=()=>{calls++;return [0];};for(const generation of [undefined,null,-1,0,1,1.5,21])assert.equal(M.draw(s,{...egg(),generation},hash).kind,'normal');assert.equal(calls,0);
 for(const generation of [2,20])assert.equal(M.draw(s,egg(generation),hash).kind,'albino');assert.equal(calls,2);
 assert.equal(M.ticket(seed,egg()),0);assert.equal(M.ticket('00000000000000000000000000000403',{...egg(),species:'funa'}),0);assert.equal(M.ticket('0000000000000000000000000000018b',{...egg(),species:'koi'}),0);
 assert.equal(M.VERSION,6);assert.equal(M.RULE_VERSION,1);assert.equal(M.goldForm('kamatsuka'),null);assert.equal(M.form('kamatsuka','albino').title,'白化カマツカ');
 s.petLife.mutationSeed=null;assert.equal(M.draw(s,egg(),hash).checked,false);assert.equal(calls,2);
 const future=pair();future.petLife.mutationRuleVersion=2;assert.equal(M.draw(future,egg(),hash).reason,'unsupported-rule');assert.equal(calls,2);
});
test('Kamatsuka breeding saves both outcomes once, replays pre-spawn saves and postpones a full tank hatch without rerolling',()=>{
 for(const adventureSeed of [seed,'a'.repeat(32)]){const c=counted(),s=pair(c.core,adventureSeed),before=copy(s),e=copy(lay(s,c.core));assert.equal(e.hatchDay,6);assert.equal(e.mutation.kind,adventureSeed===seed?'albino':'normal');assert.equal(c.count(),1);
  const reloaded=copy(before);P.normalize(reloaded,catalog,dogs,0);assert.deepEqual(copy(lay(reloaded)),e);
  for(let n=3;n<=5;n++)s.petLife.fish.push({...copy(s.petLife.fish[0]),uid:'pet-'+n});s.petLife.nextId=6;
  c.core.sync(s,catalog,6);assert.equal(s.petLife.eggs.length,1);assert.equal(c.count(),1);s.petLife.fish.pop();c.core.sync(s,catalog,6);
  assert.equal(s.petLife.eggs.length,0);assert.equal(c.count(),1);assert.deepEqual(copy(s.petLife.fish.at(-1).mutation),e.mutation);
 }
});
test('v5 and v6 ordinary Kamatsuka and already-existing eggs receive no retroactive draw',()=>{
 for(const version of [5,6]){const c=counted(),s=pair();s.petLife.version=version;s.petLife.eggs=[{...egg(),mutation:M.normal()}];delete s.petLife.breeding;
  c.core.normalize(s,catalog,dogs,3);c.core.sync(s,catalog,6);assert.equal(c.count(),0);assert.equal(s.petLife.eggs.length,0);assert.ok(s.petLife.fish.every(f=>f.mutation.kind==='normal'));assert.deepEqual(s.caught,{kamatsuka:1});
 }
});
test('albino Kamatsuka keeps its colour and nickname through fry growth, moving and round-trip saves without a price or score bonus',()=>{
 const s=pair(),e=copy(lay(s));P.sync(s,catalog,6);const f=s.petLife.fish.find(f=>f.uid==='pet-3');assert.equal(P.lifeStage(f,catalog),'fry');assert.equal(A.appearance(f,catalog).artId,'kamatsukaAlbino');assert.equal(A.appearance(f,catalog).rare,true);assert.equal(M.isGold(f),false);
 assert.equal(P.renameFish(s,f.uid,'しらすな').ok,true);assert.equal(P.moveFish(s,f.uid,1,catalog,6).ok,true);
 for(let day=6;day<20;day++){P.care(s,f.uid,'feed',day,catalog);P.care(s,f.uid,'water',day,catalog);P.sync(s,catalog,day+1);}
 assert.equal(P.lifeStage(f,catalog),'adult');assert.equal(A.appearance(f,catalog).artId,'kamatsukaAlbino');assert.equal(f.nickname,'しらすな');assert.deepEqual(f.mutation,e.mutation);
 assert.deepEqual(P.buyBackQuote(f,catalog),P.buyBackQuote({...f,mutation:M.normal()},catalog));assert.deepEqual(P.fishScore(f),P.fishScore({...f,mutation:M.normal()}));
 const snapshot=copy(s);P.normalize(s,catalog,dogs,20);assert.deepEqual(s,snapshot);assert.deepEqual(s.caught,{kamatsuka:1});
});
test('albino parents do not pass on colour or change food, growth, water, stars, experience or length limits',()=>{
 const a=pair(P,'a'.repeat(32)),b=copy(a);P.normalize(b,catalog,dogs,0);a.petLife.fish.forEach(f=>f.mutation=copy(albino));assert.deepEqual(copy(lay(a)),copy(lay(b)));assert.equal(a.petLife.eggs[0].mutation.kind,'normal');
 const strip=s=>({...s,petLife:{...s.petLife,fish:s.petLife.fish.map(({mutation,...f})=>f)}});assert.deepEqual(strip(a),strip(b));
});
test('all eight discoveries commit or roll back together and unknown or wrong-species colours are not announced',()=>{
 const s=pair();for(const [species,kind,uid]of [['funa','gold','pet-8'],['koi','gold','pet-9'],['namazu','albino','pet-10'],['medaka','gold','pet-11'],['unagi','albino','pet-12'],['dojo','albino','pet-13'],['madai','blue','pet-14'],['kamatsuka','albino','pet-15']]){M.discover(s.petLife,{species,uid,mutation:{...albino,kind}},5);M.discover(s.petLife,{species,uid:'pet-15',mutation:{...albino,kind}},6);}
 for(const [species,kind]of [['kamatsuka','gold'],['kamatsuka','blue'],['funa','albino'],['kamatsuka','future_pearl'],['__proto__','albino']]){assert.equal(M.form(species,kind),null);M.discover(s.petLife,{species,uid:'pet-16',mutation:{...albino,kind}},5);}
 assert.equal(s.petLife.mutationDiscoveries.length,8);assert.deepEqual(M.acknowledge(s,()=>false),[]);assert.deepEqual(M.acknowledge(s,()=>{throw Error('quota');}),[]);assert.ok(s.petLife.mutationDiscoveries.every(d=>!d.notified));
 assert.equal(M.acknowledge(s,()=>{assert.ok(s.petLife.mutationDiscoveries.every(d=>d.notified));return true;}).length,8);assert.deepEqual(M.acknowledge(s,()=>{throw Error('must not write');}),[]);
});
test('the real aquarium and notebook show albino Kamatsuka, its alias and all seven prior rare discoveries',()=>{
 const {boot,read}=require('./game-harness.cjs'),variant=require('./aquarium-mutation-kamatsuka-fixture.cjs'),a=boot(variant.fixture()),w=a.window;
 try{assert.equal(read(w,'s.petLife.eggs[0].mutation.kind'),'albino');w.eval('ShuPetNotebook.grant(s,petCatalog,188,"existing");s.gameMinutes=191*1440+360;ShuPetLife.sync(s,petCatalog,191);petUi.open("aquarium")');
  assert.match(w.document.querySelector('.pet-discovery').textContent,/白化カマツカ/);w.document.querySelector('[data-pet-inspect="pet-13"]').click();assert.match(w.document.querySelector('[data-pet-size-rank]').textContent,/白化.*稚魚/);
  w.document.querySelector('[data-pet-action="records"]').click();const records=w.document.querySelector('.pet-discoveries').textContent;for(const title of ['黄金のフナ','黄金のコイ','白化ナマズ','黄金のメダカ','白化ウナギ','白化ドジョウ','蒼鱗マダイ','白化カマツカ'])assert.ok(records.includes(title));
  for(const record of variant.fixture().petLife.mutationDiscoveries)assert.deepEqual(read(w,`s.petLife.mutationDiscoveries.find(d=>d.species==="${record.species}")`),record);
  w.eval('ShuPetLife.renameFish(s,"pet-13","しらすな");petUi.open("notebook")');w.document.querySelector('[data-notebook-species="kamatsuka"]').click();w.document.querySelector('[data-notebook-fish="pet-13"]').click();
  assert.match(w.document.querySelector('.pet-notebook-page').textContent,/しらすな/);assert.match(w.document.querySelector('.pet-notebook-page').textContent,/白化カマツカ/);assert.equal(w.document.querySelector('[data-notebook-fish="pet-13"] [data-pet-mutation]').textContent,'白化');assert.equal(read(w,'fish.length'),60);
  w.eval('petUi.open("aquarium")');w.document.querySelector('[data-pet-action="help"]').click();assert.match(w.document.querySelector('.pet-help-cards').textContent,/ドジョウ・カマツカは白化/);assert.deepEqual(a.errors,[]);
 }finally{a.dispose();}
});
test('unknown or wrong-species Kamatsuka colours survive normalization and safely use ordinary artwork',()=>{
 for(const kind of ['gold','blue','future_pearl']){const s=pair();s.petLife.fish[0].mutation={...albino,kind};P.normalize(s,catalog,dogs,0);const f=s.petLife.fish[0];assert.equal(f.mutation.kind,kind);assert.equal(M.label(f),'未対応の色');assert.equal(M.mutationForm(f),null);assert.equal(A.appearance(f,catalog).artId,undefined);}
 assert.equal(M.mutationForm({species:'kamatsuka',mutation:{...albino,checked:false}}),null);
});
test('dedicated albino art covers eight poses and 97 turn positions with clean alpha and the ordinary physical scale',async()=>{
 const {createCanvas,loadImage}=require('@napi-rs/canvas'),root=path.resolve(__dirname,'..'),sha=file=>crypto.createHash('sha256').update(fs.readFileSync(path.join(root,file))).digest('hex');
 assert.equal(sha('assets/aquarium-kamatsuka-albino-v252-22.png'),'136f2d4a60dcaad0726688676de88e73e1cde7a3ecfcae00560e1ce8d1baa620');assert.equal(sha('assets/fish-kamatsuka-v227.png'),'b0bcd287942620961eb0c99852a01e38c923301b1df7c90765932170e3e0eeeb');
 assert.equal(Art.species.kamatsukaAlbino,undefined);assert.equal(Object.keys(Art.species).length,60);assert.equal(Art.aquarium.kamatsukaAlbino.boxes.length,8);
 const image=await loadImage(path.join(root,Art.aquarium.kamatsukaAlbino.asset));assert.equal(image.width,1536);assert.equal(image.height,1024);
 const samples=Array.from({length:97},(_,i)=>[7,i/16]);samples.push([3,0],[3,1],[3,2]);
 for(const [cells,frame]of samples){assert.deepEqual(Art.pose('kamatsukaAlbino',cells,frame),Art.pose('kamatsuka',cells,frame));const c=createCanvas(448,224),ctx=c.getContext('2d');assert.equal(Art.draw(ctx,image,'kamatsukaAlbino',cells,frame,()=>image),true);const d=ctx.getImageData(0,0,448,224).data;let visible=0,pale=0;for(let i=0;i<d.length;i+=4)if(d[i+3]>=128){visible++;if(Math.min(d[i],d[i+1],d[i+2])>130&&Math.max(d[i],d[i+1],d[i+2])-Math.min(d[i],d[i+1],d[i+2])<95)pale++;}
  assert.ok(visible>2000&&visible<448*224*.7,'isolated visible turn '+frame);assert.ok(pale/visible>.25,'pale albino body '+frame);assert.equal(d[3],0);assert.equal(d[d.length-1],0);
 }
 const pixels=createCanvas(1536,1024).getContext('2d');pixels.drawImage(image,0,0);assert.equal(pixels.getImageData(768,512,1,1).data[3],0);
 for(const [n,b]of Art.aquarium.kamatsukaAlbino.boxes.entries()){const d=pixels.getImageData(...b).data;let visible=0,pale=0,ruby=0;for(let i=0;i<d.length;i+=4)if(d[i+3]>=128){visible++;if(Math.min(d[i],d[i+1],d[i+2])>130&&Math.max(d[i],d[i+1],d[i+2])-Math.min(d[i],d[i+1],d[i+2])<95)pale++;if(d[i]>d[i+1]*1.5&&d[i]>d[i+2]*1.2&&d[i]>120)ruby++;}assert.ok(pale/visible>.25,'authored albino pose '+n);assert.ok(ruby>20,'ruby-pink eyes '+n);}
 const ordinary=await loadImage(path.join(root,Art.species.kamatsuka.asset));
 for(const [cells,frame]of [[7,0],[7,2],[7,3],[7,4],[7,6],[3,2]]){const widths=[];for(const [id,im]of [['kamatsuka',ordinary],['kamatsukaAlbino',image]]){const c=createCanvas(448,224),ctx=c.getContext('2d');Art.draw(ctx,im,id,cells,frame,()=>im);const d=ctx.getImageData(0,0,448,224).data;let left=448,right=0;for(let y=0;y<224;y++)for(let x=0;x<448;x++)if(d[(y*448+x)*4+3]>=128){left=Math.min(left,x);right=Math.max(right,x);}widths.push(right-left+1);}assert.ok(widths[1]/widths[0]>.85&&widths[1]/widths[0]<1.15,'same physical scale as ordinary Kamatsuka '+cells+':'+frame);}
 assert.ok(fs.readFileSync(path.join(root,'sw.js'),'utf8').includes('"./assets/aquarium-kamatsuka-albino-v252-22.png"'));
});
