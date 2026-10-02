const {test}=require('node:test'),assert=require('node:assert/strict');
const {boot,seed,read,saveKey}=require('./game-harness.cjs');
const kinds=[['shirogisu','shirogisuFillet','shirogisuTempura'],['ayu','ayuFillet','ayuShioyaki'],['madai','madaiFillet','madaiUshiojiru']];

test('each real special-species catch keeps exactly one correct portion, while practice supplies none',()=>{
  const app=boot({...seed(),cookingIngredients:{}}),w=app.window;
  try{
    for(const [id,ingredient]of kinds){
      w.eval(`hideCatchCard();cast(fishingSpots[0]);beginFishing();battle.f=fish.find(f=>f.id==='${id}');battle.specimen=null;caught();hideCatchCard()`);
      assert.equal(read(w,`s.cookingIngredients.${ingredient}`),1);
      assert.equal(read(w,'s.cookingIngredients.fishFillet'),0);
    }
    const before=read(w,'s.cookingIngredients');
    w.eval('openPracticePond();beginFishing();battle.f=fish.find(f=>f.id==="funa");caught();hideCatchCard()');
    assert.deepEqual(read(w,'s.cookingIngredients'),before);assert.deepEqual(app.errors,[]);
  }finally{app.dispose();}
});

test('the three dishes require their own fish and cook through the actual kitchen buttons',()=>{
  const app=boot({...seed(),cookingIngredients:{shirogisuFillet:1,ayuFillet:1,madaiFillet:1},items:{wildGreens:2},baits:{shell:1}}),w=app.window;
  try{
    assert.equal(w.cookRecipe('shirogisuTempura'),false,'no kitchen means no recipe');
    w.openLocationInterior('diner');
    for(const [,ingredient,meal]of kinds){
      const button=w.document.querySelector(`[data-cook-recipe="${meal}"]`);assert.equal(button.disabled,false);button.click();
      assert.equal(read(w,`s.cookingIngredients.${ingredient}`),0);assert.equal(read(w,`s.preparedMeals.${meal}`),1);
    }
    assert.equal(read(w,'s.items.wildGreens'),0);assert.equal(read(w,'s.baits.shell'),0);
    assert.equal(w.cookRecipe('shirogisuTempura'),false);assert.equal(read(w,'s.preparedMeals.shirogisuTempura'),1);
    assert.deepEqual(app.errors,[]);
  }finally{app.dispose();}
});

test('an absent required species cannot spend other fish portions, materials or money',()=>{
  const app=boot({...seed(),cookingIngredients:{fishFillet:4,ayuFillet:2},items:{wildGreens:3}}),w=app.window;
  try{
    w.openLocationInterior('diner');const before=read(w,'({ingredients:s.cookingIngredients,items:s.items,money:s.money,meals:s.preparedMeals})');
    assert.equal(w.cookRecipe('shirogisuTempura'),false);
    assert.equal(w.document.querySelector('[data-cook-recipe="shirogisuTempura"]').disabled,true);
    assert.deepEqual(read(w,'({ingredients:s.cookingIngredients,items:s.items,money:s.money,meals:s.preparedMeals})'),before);
    assert.deepEqual(app.errors,[]);
  }finally{app.dispose();}
});

test('old fish recipes accept named portions once and spend the generic portion first',()=>{
  const app=boot({...seed(),cookingIngredients:{fishFillet:1,shirogisuFillet:1},baits:{shell:2},preparedMeals:{}}),w=app.window;
  try{
    w.openLocationInterior('diner');assert.equal(w.cookRecipe('shellSoup'),true);
    assert.equal(read(w,'s.cookingIngredients.fishFillet'),0);assert.equal(read(w,'s.cookingIngredients.shirogisuFillet'),1);
    assert.equal(w.cookRecipe('shellSoup'),true);assert.equal(read(w,'s.cookingIngredients.shirogisuFillet'),0);
    assert.equal(read(w,'s.preparedMeals.shellSoup'),2);assert.equal(w.cookRecipe('shellSoup'),false);
    assert.deepEqual(app.errors,[]);
  }finally{app.dispose();}
});

test('eating heals within maximum HP, replaces the daily effect and persists once across reload',()=>{
  const app=boot({...seed(),hp:80,preparedMeals:{shirogisuTempura:1,ayuShioyaki:1,madaiUshiojiru:1}}),w=app.window;let loaded;
  try{
    assert.equal(w.eatPreparedMeal('shirogisuTempura'),true);assert.equal(read(w,'s.hp'),100);
    assert.equal(w.eatPreparedMeal('shirogisuTempura'),false);assert.equal(read(w,'mealEffectBonus("tensionResistance")'),.08);
    w.eval('s.hp=30;eatPreparedMeal("ayuShioyaki")');assert.equal(read(w,'s.hp'),55);
    assert.equal(read(w,'mealEffectBonus("tensionResistance")'),0);assert.equal(read(w,'mealEffectBonus("rareForage")'),.2);
    w.eval('eatPreparedMeal("madaiUshiojiru")');assert.equal(read(w,'s.hp'),90);
    const saved=JSON.parse(w.localStorage.getItem(saveKey));loaded=boot(saved);
    assert.equal(read(loaded.window,'s.hp'),90);assert.equal(read(loaded.window,'s.preparedMeals.madaiUshiojiru'),0);
    assert.equal(read(loaded.window,'mealEffectBonus("dogDiscovery")'),.35);
    loaded.window.eval('s.gameMinutes=s.activeMeal.expiresAt');assert.equal(read(loaded.window,'activeMealEntry()'),null);
    assert.deepEqual(app.errors,[]);assert.deepEqual(loaded.errors,[]);
  }finally{app.dispose();loaded?.dispose();}
});
