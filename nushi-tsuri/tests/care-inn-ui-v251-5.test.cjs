const {test}=require('node:test'),assert=require('node:assert/strict');
const {boot,seed,read,saveKey}=require('./game-harness.cjs'),{verifyFrames}=require('./care-inn-frame-checks.cjs');
const click=(w,q)=>{const button=w.document.querySelector(q);assert.ok(button,q);assert.equal(button.disabled,false,q);button.click();};

test('all 651 dog/animation samples show only the original dog reaction and hearts',async()=>{const result=await verifyFrames();assert.equal(result.frames,651);});

test('inn selection and rearrangement preserve native controls, cooking, overnight and saves',()=>{
 const app=boot({...seed(),items:{wildGreens:2}}),w=app.window;
 try{
  const canvas=w.document.querySelector('#locationPixels');
  w.openLocationInterior('farmhouse');const modal=w.document.querySelector('#locationInterior'),before=read(w,'({money:s.money,time:s.gameMinutes,caught:s.caught,meals:s.preparedMeals,items:s.items,ingredients:s.cookingIngredients})');
  assert.ok(modal.classList.contains('compact-inn'));assert.equal(modal.querySelectorAll('.inn-scene-title').length,1);assert.ok(modal.querySelector('.compact-window-heading #locationCategories'));assert.ok(modal.querySelector('.location-layout > .compact-scene-dialogue #locationDialogue'));
  click(w,'[data-location-category="meals"]');click(w,'[data-location-category="recipes"]');assert.deepEqual(read(w,'({money:s.money,time:s.gameMinutes,caught:s.caught,meals:s.preparedMeals,items:s.items,ingredients:s.cookingIngredients})'),before);
  click(w,'[data-cook-recipe="bigFishPlate"]');assert.equal(read(w,'s.preparedMeals.bigFishPlate'),1);assert.equal(read(w,'s.cookingIngredients.fishFillet'),before.ingredients.fishFillet-1);assert.equal(read(w,'s.items.wildGreens'),1);
  click(w,'#locationAction');assert.equal(read(w,'s.gameMinutes'),(Math.floor(before.time/1440)+1)*1440+360);assert.equal(read(w,'s.money'),before.money);assert.equal(read(w,'s.hp'),100);
  w.close();w.openLocationInterior('yaoya');assert.equal(modal.classList.contains('compact-inn'),false);assert.equal(modal.querySelector('.inn-scene-title'),null);assert.equal(w.document.querySelector('#locationPixels'),canvas);assert.ok(modal.querySelector('.location-panel #locationCategories'));
  w.close();w.openLocationInterior('farmhouse');assert.equal(modal.querySelectorAll('#locationCategories').length,1);assert.equal(modal.querySelectorAll('.inn-scene-title').length,1);w.save();const saved=JSON.parse(w.localStorage.getItem(saveKey));assert.equal(saved.preparedMeals.bigFishPlate,1);assert.equal(saved.items.wildGreens,1);assert.deepEqual(app.errors,[]);
 }finally{app.dispose();}
});

test('a slower petting display keeps the existing award, daily usage and companion data',()=>{
 const app=boot(),w=app.window;
 try{w.openDogCare('shuu');const before=read(w,'s'),expected=JSON.parse(JSON.stringify(before)),gain=w.ShuPetLife.pet(expected,'shuu',w.gameClockAt(before.gameMinutes).dayIndex);click(w,'#dogCarePet');assert.equal(read(w,'s.dogAffinity.shuu'),before.dogAffinity.shuu+gain);assert.deepEqual(read(w,'s.petLife.dogDaily'),expected.petLife.dogDaily);assert.equal(read(w,'dogCareScene.duration'),3600);for(const key of ['dog','ownedDogToys','dogTreats','dogTricks','caught','money','baits'])assert.deepEqual(read(w,'s.'+key),before[key]);assert.deepEqual(app.errors,[]);}finally{app.dispose();}
});
