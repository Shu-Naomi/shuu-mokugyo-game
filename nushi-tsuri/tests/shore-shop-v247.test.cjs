const {test}=require('node:test'),assert=require('node:assert/strict'),path=require('node:path'),{createHash}=require('node:crypto');
const {createCanvas,loadImage}=require('@napi-rs/canvas'),{boot,seed,read,saveKey}=require('./game-harness.cjs'),C=require('../pixel-cast.js');
const click=(w,q)=>{const n=w.document.querySelector(q);assert.ok(n,q);assert.equal(n.disabled,false,q);n.click();return n;};
const snapshot=w=>read(w,'({money:s.money,time:s.gameMinutes,hp:s.hp,caught:s.caught,baits:s.baits,fish:s.petLife.fish})');
test('fresh and sea shelves contain only self-caught ordinary fish; selection, paging and details never buy a fish',()=>{
 const a=boot({...seed(),money:100000,soundEnabled:false}),w=a.window;
 try{
  w.eval('for(const f of fish)s.caught[f.id]=1;petUi.open("shop")');const before=snapshot(w);
  assert.equal(w.document.querySelectorAll('.pet-fish-sales [data-pet-buy]').length,50);
  assert.ok(w.document.querySelector('.pet-fish-sales.compact-sam-list'));
  assert.equal(w.document.querySelectorAll('[data-pet-water]').length,3);
  for(const [category,label,id]of [['fresh','淡水','oyanirami'],['sea','海水','ishidai']]){
   click(w,'[data-pet-water="'+category+'"]');
   const ids=[...w.document.querySelectorAll('[data-pet-buy]')].map(n=>n.dataset.petBuy);
   assert.deepEqual(ids,read(w,`petCatalog.filter(f=>!f.legendary&&f.waterLabel==='${label}').map(f=>f.id)`));
   const target=w.document.querySelector('[data-pet-buy="'+id+'"]').closest('.compact-product'),pick=target.querySelector('[data-compact-select]');pick.click();
   assert.equal(pick.getAttribute('aria-selected'),'true');target.querySelector('[data-compact-info]').click();
   assert.ok(w.document.querySelector('.compact-sheet-body').textContent.includes(label));click(w,'[data-compact-sheet-close]');
   assert.deepEqual(snapshot(w),before);
  }
  click(w,'[data-pet-water="fresh"]');assert.equal(w.document.querySelector('[data-pet-buy="oyanirami"]').closest('.compact-product').querySelector('[data-compact-select]').getAttribute('aria-selected'),'true');
  click(w,'[data-pet-water="sea"]');assert.equal(w.document.querySelector('[data-pet-buy="ishidai"]').closest('.compact-product').querySelector('[data-compact-select]').getAttribute('aria-selected'),'true');
  assert.deepEqual(snapshot(w),before);assert.deepEqual(a.errors,[]);
 }finally{a.dispose();}
});
test('a new fish uses the selected compatible tank, preserves the shelf and saves exactly one payment per purchase',()=>{
 const a=boot({...seed(),money:100000,caught:{oyanirami:1,ishidai:1},soundEnabled:false}),w=a.window;let saved;
 try{
  w.eval('s.petLife.unlockedTanks=2;petUi.open("shop")');click(w,'[data-pet-water="fresh"]');const before=snapshot(w),price=read(w,'petCatalog.find(f=>f.id==="oyanirami").price');
  click(w,'[data-pet-buy="oyanirami"]');assert.equal(read(w,'s.money'),before.money-price);assert.equal(read(w,'s.petLife.fish.length'),1);
  assert.equal(w.document.querySelector('[data-pet-water="fresh"]').getAttribute('aria-pressed'),'true');
  click(w,'[data-pet-water="sea"]');let b=w.document.querySelector('[data-pet-buy="ishidai"]');assert.equal(b.disabled,true);assert.match(w.document.querySelector('.pet-stock-reason').textContent,/この水槽は淡水/);const blocked=snapshot(w);b.click();assert.deepEqual(snapshot(w),blocked);
  const select=w.document.querySelector('#petTankSelect');select.value='1';select.dispatchEvent(new w.Event('change',{bubbles:true}));
  assert.equal(w.document.querySelector('[data-pet-water="sea"]').getAttribute('aria-pressed'),'true');const seaPrice=read(w,'petCatalog.find(f=>f.id==="ishidai").price');
  click(w,'[data-pet-buy="ishidai"]');assert.equal(read(w,'s.money'),before.money-price-seaPrice);assert.deepEqual(read(w,'s.petLife.fish.map(f=>[f.species,f.tank])'),[['oyanirami',0],['ishidai',1]]);assert.deepEqual(read(w,'s.caught'),before.caught);
  w.eval('save()');saved=JSON.parse(w.localStorage.getItem(saveKey));assert.deepEqual(a.errors,[]);
 }finally{a.dispose();}
 const b=boot(saved);try{assert.deepEqual(read(b.window,'s.petLife.fish.map(f=>[f.species,f.tank])'),[['oyanirami',0],['ishidai',1]]);assert.deepEqual(b.errors,[]);}finally{b.dispose();}
});
test('an empty water category explains the unlock, and full tanks block payment with a visible reason',()=>{
 const a=boot({...seed(),money:100000,caught:{oyanirami:1},soundEnabled:false}),w=a.window;
 try{
  w.eval('petUi.open("shop")');click(w,'[data-pet-water="sea"]');assert.equal(w.document.querySelectorAll('[data-pet-buy]').length,0);assert.match(w.document.querySelector('.compact-catalog-empty').textContent,/海水魚.*図鑑/);
  click(w,'[data-pet-water="fresh"]');for(let i=0;i<5;i++)click(w,'[data-pet-buy="oyanirami"]');assert.match(w.document.querySelector('.pet-stock-reason').textContent,/満員/);const before=snapshot(w);w.document.querySelector('[data-pet-buy]').click();assert.deepEqual(snapshot(w),before);assert.deepEqual(a.errors,[]);
 }finally{a.dispose();}
});
test('both quay avatars animate the whole body and keep the painted hand on the moving rod through release',async()=>{
 for(const avatar of ['boy','girl']){
  const img=await loadImage(path.join(__dirname,'..',C.frontArtwork[avatar].src)),canvas=createCanvas(1280,650),ctx=canvas.getContext('2d'),shapes=new Set(),hands=[];
  for(let i=0;i<12;i++){
   const m=C.draw(canvas,{avatar,frontCastSprite:img,ground:C.groundFor('harbor'),progress:C.timeline[i]/C.DURATION,flying:true,target:{x:780,y:550},env:{season:'summer',period:'day'}});
   assert.equal(m.facing,'down');assert.equal(m.frame,i);assert.ok(m.tip.y>=0);hands.push(m.hand.x);
   const r=Math.ceil(m.box.scale*2),p=ctx.getImageData(Math.round(m.hand.x)-r,Math.round(m.hand.y)-r,2*r+1,2*r+1).data;
   assert.ok(p.some((v,j)=>j%4===0&&v>160&&p[j+1]>80&&p[j+1]<210&&p[j+2]<150&&p[j+3]>180),avatar+' grip '+i);
   shapes.add(createHash('sha256').update(ctx.getImageData(0,0,1280,650).data).digest('hex'));
   assert.ok(Math.abs(m.leftFoot.y-C.layout(1280,650,C.groundFor('harbor')).ground.y)<1);
  }
  assert.equal(shapes.size,12);assert.ok(Math.max(...hands)-Math.min(...hands)>30,'hand follows the shoulder, rather than a fixed front-view grip');
  const ready=C.frontPose(0,avatar),end=C.frontPose(1,avatar);assert.deepEqual({...end,t:0},ready);
 }
});
