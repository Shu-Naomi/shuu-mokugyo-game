const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const {JSDOM}=require('jsdom');
const {boot,seed,read,saveKey}=require('./game-harness.cjs');
const {assertGeometry,alignmentSelectors,baselineSelectorText,assertPreservedMetrics}=require('./browser-location-layer-alignment-evidence.cjs');
const css=['pixel-scenes.css','compact-ui.css'].map(file=>fs.readFileSync(path.join(__dirname,'..',file),'utf8')).join('\n');

// JSDOM checks selector/cascade contracts, not rendered pixel bounds. The
// companion browser runner measures the actual crop, rectangles and text.
function fixture(classes='compact-location-shop',sam=false){
 const id=sam?'shopPixels':'locationPixels',scene=sam?'shop-interior':'location-scene';
 return new JSDOM(`<style>${css}</style><section id="${sam?'store':'locationInterior'}" class="compact-window ${classes}"><div class="${sam?'shop-layout':'location-layout'}"><div class="${sam?'':'location-visual'}"><div class="${scene}"><canvas id="${id}"></canvas><canvas class="scenery-motion" data-for="${id}"></canvas><canvas class="scenery-foreground" data-for="${id}"></canvas></div><div class="compact-scene-dialogue"><p class="${sam?'shop':'location'}-dialogue">会話</p></div></div></div></section>`);
}
function style(window,node){
 const c=window.getComputedStyle(node);
 return Object.fromEntries(['position','inset','width','height','objectFit','objectPosition'].map(key=>[key,c[key]]));
}
function layers(window){return [...window.document.querySelectorAll('canvas')];}
test('ordinary compact rooms give base, motion and foreground the same reserved dialogue rectangle and crop',()=>{
 const {window}=fixture();try{
  const [base,...overlays]=layers(window),expected=style(window,base);
  assert.equal(expected.inset,'0 0 66px');assert.equal(expected.height,'calc(100% - 66px)');assert.equal(expected.objectFit,'cover');
  for(const canvas of overlays)assert.deepEqual(style(window,canvas),expected,canvas.className);
  assert.equal(window.getComputedStyle(overlays[1]).zIndex,'6','foreground stays in the scenery stack');
  assert.equal(window.getComputedStyle(window.document.querySelector('.compact-scene-dialogue')).zIndex,'4','do not conceal the mismatch with a dialogue z-index');
 }finally{window.close();}
});
test('service and non-compact scenes retain full-height contain layers without reserving dialogue space',()=>{
 for(const classes of ['compact-location-shop compact-service','']){
  const {window}=fixture(classes);try{
   const [base,...overlays]=layers(window);
   for(const canvas of [base,...overlays]){const s=style(window,canvas);assert.equal(s.width,'100%',classes);assert.equal(s.height,'100%',classes);assert.equal(s.objectFit,'contain',classes);}
   // Live base canvases have no pixel-scene class or positioning rule here;
   // only their overlays are absolutely positioned over that full-size box.
   assert.equal(base.className,'');
   for(const canvas of overlays){assert.equal(style(window,canvas).position,'absolute');assert.equal(style(window,canvas).inset,'0');}
  }finally{window.close();}
 }
});
test('the inn override keeps every layer in its separate full-height contain rectangle',()=>{
 const {window}=fixture('compact-location-shop compact-inn');try{
  const [base,...overlays]=layers(window),expected=style(window,base);
  assert.equal(expected.inset,'0');assert.equal(expected.height,'100%');assert.equal(expected.objectFit,'contain');
  for(const canvas of overlays)assert.deepEqual(style(window,canvas),expected);
 }finally{window.close();}
});
test('Sam keeps his existing aligned geometry and dialogue stacking',()=>{
 const {window}=fixture('compact-store',true);try{
  const [base,...overlays]=layers(window);
  for(const canvas of overlays)assert.deepEqual(style(window,canvas),style(window,base));
  assert.equal(style(window,base).height,'calc(100% - 66px)');
  assert.equal(window.getComputedStyle(window.document.querySelector('.compact-scene-dialogue')).zIndex,'8');
 }finally{window.close();}
});
test('the prepared browser check rejects offset, crop and native-size mismatches independently',()=>{
 const layer={x:0,y:0,width:300,height:196,objectFit:'cover',objectPosition:'50% 50%',nativeWidth:1536,nativeHeight:1152};
 const metrics={base:{...layer},motion:{...layer},foreground:{...layer}};
 assertGeometry(metrics,'cover','aligned');
 for(const [key,value] of Object.entries({y:1,height:262,objectFit:'contain',objectPosition:'50% 100%',nativeWidth:320})){
  const wrong={...metrics,foreground:{...layer,[key]:value}};
  assert.throws(()=>assertGeometry(wrong,'cover','regression'),/regression/);
 }
});
test('exception baseline removes only the two fix selectors and rejects changed or unrestored metrics',()=>{
 const before=['#store.compact-store #shopPixels','.compact-store .shop-actors','#locationInterior.compact-location-shop:not(.compact-service) #locationPixels'].join(', ');
 assert.equal(baselineSelectorText(before+', '+alignmentSelectors.join(', ')),before);
 assert.throws(()=>baselineSelectorText(before),/five selectors/);
 assert.throws(()=>baselineSelectorText(before+', .unexpected, '+alignmentSelectors[0]),/exactly the two alignment selectors/);
 const metrics={base:{height:339.390625},motion:{height:286.40625},foreground:{height:286.40625}};
 assertPreservedMetrics(metrics,structuredClone(metrics),structuredClone(metrics),'service');
 assert.throws(()=>assertPreservedMetrics(metrics,{...metrics,base:{height:286.40625}},metrics,'service'),/unchanged/);
 assert.throws(()=>assertPreservedMetrics(metrics,metrics,{...metrics,motion:{height:339.390625}},'service'),/restoring/);
});
test('repeated diner tabs, detail cancellation and service/inn/Sam transitions keep one dialogue and preserve resources',()=>{
 const a=boot({...seed(),items:{wildGreens:2}}),w=a.window;
 const click=q=>{const n=w.document.querySelector(q);assert.ok(n,q);n.click();};
 const resources=()=>read(w,'({money:s.money,hp:s.hp,time:s.gameMinutes,items:s.items,ingredients:s.cookingIngredients,meals:s.preparedMeals,baits:s.baits,equipment:s.equipment,caught:s.caught})');
 try{
  const before=resources(),saved=w.localStorage.getItem(saveKey);
  for(let i=0;i<2;i++){
   w.openLocationInterior('diner');
   for(const tab of ['food','recipes','meals','food'])click(`[data-location-category="${tab}"]`);
   const root=w.document.querySelector('#locationInterior');
   assert.ok(root.matches('.compact-location-shop:not(.compact-service):not(.compact-inn)'));
   assert.equal(root.querySelectorAll('.compact-scene-dialogue').length,1);
   assert.ok(root.querySelector('.location-visual .compact-scene-dialogue #locationDialogue'));
   click('#locationInterior [data-compact-info]');
   assert.equal(root.querySelectorAll('.compact-sheet').length,1);
   if(i===0)click('#locationInterior [data-compact-sheet-close]');
   else root.querySelector('.compact-sheet').dispatchEvent(new w.KeyboardEvent('keydown',{key:'Escape',bubbles:true}));
   assert.equal(root.querySelector('.compact-sheet'),null);
   w.close();
   for(const [id,kind] of [['fish-market','compact-service'],['farmhouse','compact-inn'],['yaoya','compact-location-shop'],['player-home','compact-location-shop'],['main-shrine',null]]){
    w.openLocationInterior(id);if(kind)assert.ok(root.classList.contains(kind));else assert.equal(root.classList.contains('compact-window'),false);
    if(id==='fish-market'){assert.equal(root.querySelector('.compact-scene-dialogue'),null);assert.ok(root.querySelector('.compact-service-card #locationDialogue'));}
    if(id==='farmhouse')assert.ok(root.querySelector('.location-layout > .compact-scene-dialogue'));
    w.close();
   }
   w.eval('renderSamShop();open("store")');assert.equal(w.document.querySelectorAll('#store .compact-scene-dialogue').length,1);w.close();
  }
  assert.deepEqual(resources(),before);assert.equal(w.localStorage.getItem(saveKey),saved);assert.deepEqual(a.errors,[]);
 }finally{a.dispose();}
});
