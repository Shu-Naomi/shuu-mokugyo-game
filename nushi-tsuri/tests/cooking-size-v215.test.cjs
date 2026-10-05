const {test}=require('node:test'),assert=require('node:assert/strict');
const {boot,seed,read,saveKey}=require('./game-harness.cjs');
const distribution=w=>read(w,`(()=>{const f=fish.find(f=>f.id==='funa'),counts={};for(let i=0;i<10000;i++){let n=0;const p=rollFishSpecimen(f,()=>n++?.5:(i+.5)/10000);counts[p.tierId]=(counts[p.tierId]||0)+1;}return counts;})()`);
test('cooking and eating the big-fish meal moves the real Funa draw from 14 to 25 percent with no size guarantees',()=>{
 const app=boot({...seed(),cookingIngredients:{fishFillet:1},items:{wildGreens:1},preparedMeals:{}}),w=app.window;
 try{
  const plain=distribution(w);assert.equal(plain.large+plain.giant,1400);
  w.openLocationInterior('diner');const money=read(w,'s.money');
  w.document.querySelector('[data-cook-recipe="bigFishPlate"]').click();assert.equal(read(w,'s.preparedMeals.bigFishPlate'),1);
  assert.equal(read(w,'s.cookingIngredients.fishFillet'),0);assert.equal(read(w,'s.items.wildGreens'),0);assert.equal(read(w,'s.money'),money);
  w.document.querySelector('[data-eat-prepared-meal="bigFishPlate"]').click();const fed=distribution(w);
  assert.equal(fed.large+fed.giant,2500);assert.ok(fed.tiny>0&&fed.giant<fed.large,'small fish remain and giants stay rarer');
  assert.equal(read(w,'s.preparedMeals.bigFishPlate'),0);assert.match(w.document.querySelector('.cooking-kitchen-status').textContent,/14%→25%/);
  assert.deepEqual(app.errors,[]);
 }finally{app.dispose();}
});
test('the meal preserves all 25 species size ranges and pulls only twice from the player random stream',()=>{
 const app=boot({...seed(),preparedMeals:{bigFishPlate:1}}),w=app.window;
 try{
  w.eatPreparedMeal('bigFishPlate');
  const result=read(w,`(()=>{let checked=0;for(const f of fish){for(let i=0;i<1000;i++){let calls=0;const p=rollFishSpecimen(f,()=>calls++?.37:(i+.5)/1000),tier=fishSizeTierById(f.id,p.tierId);if(calls!==2||p.hundredths<tier.minHundredths||p.hundredths>tier.maxHundredths)throw Error(f.id+' invalid specimen');checked++;}}return checked;})()`);
  assert.equal(result,25000);assert.deepEqual(app.errors,[]);
 }finally{app.dispose();}
});
test('eating again does not stack; another meal replaces the bonus; expiry and reload keep the original rules',()=>{
 const app=boot({...seed(),preparedMeals:{bigFishPlate:2,shellSoup:1}}),w=app.window;let saved;
 try{
  w.eatPreparedMeal('bigFishPlate');w.eatPreparedMeal('bigFishPlate');const d=distribution(w);assert.equal(d.large+d.giant,2500);
  saved=JSON.parse(w.localStorage.getItem(saveKey));assert.equal(saved.preparedMeals.bigFishPlate,0);
  w.eatPreparedMeal('shellSoup');const plain=distribution(w);assert.equal(plain.large+plain.giant,1400);assert.equal(read(w,'mealTensionMultiplier()'),.92);
  assert.deepEqual(app.errors,[]);
 }finally{app.dispose();}
 const restored=boot(saved);
 try{
  const d=distribution(restored.window);assert.equal(d.large+d.giant,2500);
  restored.window.eval('s.gameMinutes=s.activeMeal.expiresAt');const plain=distribution(restored.window);assert.equal(plain.large+plain.giant,1400);
  assert.equal(read(restored.window,'s.activeMeal'),null);assert.deepEqual(restored.errors,[]);
 }finally{restored.dispose();}
});
test('large-fish cooking changes neither rival scores nor the stored catch history before a real catch',()=>{
 const app=boot({...seed(),preparedMeals:{bigFishPlate:1}}),w=app.window;
 try{
  const before=read(w,'({caught:s.caught,records:s.sizeRecords,clock:s.gameMinutes,money:s.money,npcs:ShuTournament.create("lakeMasters",s.gameMinutes,1234).participants})');
  w.eatPreparedMeal('bigFishPlate');distribution(w);
  assert.deepEqual(read(w,'({caught:s.caught,records:s.sizeRecords,clock:s.gameMinutes,money:s.money,npcs:ShuTournament.create("lakeMasters",s.gameMinutes,1234).participants})'),before);assert.deepEqual(app.errors,[]);
 }finally{app.dispose();}
});
