const {test}=require('node:test'),assert=require('node:assert/strict');
const Guide=require('../village-guide.js'),Slots=require('../save-slots.js'),{boot,seed,read,saveKey}=require('./game-harness.cjs');
const click=(w,q)=>w.document.querySelector(q).click();
const fresh=extra=>({...seed(),soundEnabled:false,lakeStory:{version:2,introVersion:2,introSeen:true},villageGuide:Guide.create(),...extra});
const stock=w=>read(w,'({money:s.money,hp:s.hp,time:s.gameMinutes,baits:s.baits,caught:s.caught,ownedRods:s.ownedRods,equipment:s.equipment,petLife:s.petLife,avatar:s.avatar,dog:s.dog,names:s.dogNames,player:s.playerName})');
async function settle(w){for(let n=0;n<100;n++){if(!w.eval('playerHomeState.transitioning'))return;await new Promise(r=>w.setTimeout(r,10));}throw Error('Home transition stalled');}
function walkHome(w,condition){
 assert.equal(w.eval(`(()=>{const area=playerHomeState.area,q=[{x:playerHomeState.x,y:playerHomeState.y,path:[]}],seen=new Set();
 for(let i=0;i<q.length;i++){const p=q[i],key=p.x+','+p.y;if(seen.has(key))continue;seen.add(key);if(${condition}){for(const d of p.path)if(!movePlayerHome(d))throw Error('Blocked step');return true;}
 for(const d of ['left','right','up','down']){const next=playerHomeMoveTarget(area,p.x,p.y,d);if(next.x!==p.x||next.y!==p.y)q.push({...next,path:[...p.path,d]});}}return false;})()`),true,'destination has a route');
}
async function enterHome(w){while(!w.playerHomeIsActive()){w.move('left');await settle(w);}walkHome(w,"nearbyPlayerHomeEvent(area,p.x,p.y)?.id==='front-door'");w.action();await settle(w);assert.equal(w.eval('playerHomeState.area'),'interior');w.stopHomeDogAnimation();}

test('the optional component has an explicit version and never invents progress for legacy or future saves',()=>{
 assert.equal(Guide.version,1);for(const old of [undefined,null,false,[],7])assert.equal(Guide.normalize(old),undefined);
 const future={version:99,anything:{keep:true}};assert.equal(Guide.normalize(future),future);assert.equal(Guide.visible({villageGuide:future}),false);
 assert.deepEqual(Guide.normalize({version:1,enabled:false,home:'true',notebook:true,dogs:['grey','grey','bad','shuu'],sam:1}),{version:1,enabled:false,home:false,notebook:true,dogs:['shuu','grey'],sam:false,fishing:false});
});
test('out-of-order visits and individual dogs are idempotent and affect no game resources',()=>{
 const s=fresh({extraFuture:{keep:true}}),before=structuredClone(s);delete before.villageGuide;
 for(const event of ['sam','fishing']){assert.equal(Guide.record(s,event),true);assert.equal(Guide.record(s,event),false);}
 assert.equal(Guide.goal(s).id,'home');s.villageGuide.enabled=false;
 for(const id of ['grey','riku','shuu']){assert.equal(Guide.record(s,'dog',id),true);assert.equal(Guide.record(s,'dog',id),false);}assert.equal(Guide.record(s,'dog','chappie'),false);
 Guide.record(s,'home');assert.equal(Guide.goal(s).id,'notebook');Guide.record(s,'notebook');assert.equal(Guide.goal(s).id,'done');assert.equal(Guide.visible(s),false);
 const after=structuredClone(s);delete after.villageGuide;assert.deepEqual(after,before);
});
test('only committing a genuinely new adventure starts the guide; another slot remains byte-for-byte intact',()=>{
 const second={...seed(),money:87654},a=boot(null,undefined,{start:false,storage:{[Slots.keys[2]]:second}}),w=a.window;let saved;
 try{const raw=w.localStorage.getItem(Slots.keys[2]);assert.equal(read(w,'Object.hasOwn(s,"villageGuide")'),false);require('./title-test-flow.cjs')(w,{avatar:'girl',name:'湖の旅人',dog:'grey'});assert.equal(read(w,'s.villageGuide.version'),1);assert.equal(w.document.querySelector('#villageGuideOpen').hidden,true);click(w,'#lakeIntroSkip');assert.equal(w.document.querySelector('#villageGuideOpen').hidden,false);assert.match(w.document.querySelector('#villageGuideGoal').textContent,/祖父の家/);saved=JSON.parse(w.localStorage.getItem(saveKey));assert.equal(w.localStorage.getItem(Slots.keys[2]),raw);assert.deepEqual(a.errors,[]);}finally{a.dispose();}
 const b=boot(saved);try{assert.deepEqual(read(b.window,'s.villageGuide'),saved.villageGuide);assert.equal(read(b.window,'s.avatar'),'girl');assert.equal(read(b.window,'s.dog'),'grey');assert.equal(read(b.window,'s.playerName'),'湖の旅人');assert.equal(b.window.document.querySelector('#lakeIntro.open'),null);}finally{b.dispose();}
});
test('old adventures and an old pending opening never acquire or force the new guide, including manual map browsing',()=>{
 for(const lakeStory of [undefined,{version:1,introSeen:true},{version:2,introVersion:2,introPending:true,introStep:'cling'}]){
  const a=boot({...seed(),lakeStory}),w=a.window;
  try{assert.equal(read(w,'Object.hasOwn(s,"villageGuide")'),false);assert.equal(w.document.querySelector('#villageGuideOpen').hidden,true);w.openLakeStory();click(w,'#villageGuideJournal');assert.ok(w.document.querySelector('#fieldGuide.open'));assert.equal(w.document.querySelector('#villageGuideMute').hidden,true);click(w,'#fieldGuideClose');assert.ok(w.document.querySelector('#lakeStory.open'));assert.equal(read(w,'Object.hasOwn(s,"villageGuide")'),false);assert.deepEqual(a.errors,[]);}finally{a.dispose();}
 }
});
test('real home entry, notebook and three existing dogs save milestones without distributing supplies or switching favorite',async()=>{
 const a=boot(fresh({dog:'grey',dogNames:{shuu:'こむぎ',riku:'風太',grey:'夜空'}})),w=a.window;let saved;
 try{const before=stock(w);await enterHome(w);assert.equal(read(w,'s.villageGuide.home'),true);assert.equal(Guide.goal(read(w,'s')).id,'notebook');w.openLakeStory();assert.equal(read(w,'s.villageGuide.notebook'),true);w.close();w.stopHomeDogAnimation();
  for(const id of ['shuu','riku','grey']){walkHome(w,`!nearbyPlayerHomeEvent(area,p.x,p.y)&&nearbyHomeDog(p.x,p.y)?.dogId==='${id}'`);w.action();assert.equal(w.eval('dogCareSelectedId'),id);click(w,'#dogCarePet');assert.ok(read(w,'s.villageGuide.dogs').includes(id));w.close();w.stopHomeDogAnimation();}
  const after=stock(w);assert.deepEqual(after.money,before.money);assert.deepEqual(after.baits,before.baits);assert.deepEqual(after.ownedRods,before.ownedRods);assert.equal(after.dog,'grey');assert.equal(after.time,before.time);assert.deepEqual(after.names,before.names);assert.equal(Guide.goal(read(w,'s')).id,'sam');w.save();saved=JSON.parse(w.localStorage.getItem(saveKey));assert.deepEqual(a.errors,[]);
 }finally{a.dispose();}
 const b=boot(saved);try{assert.deepEqual(read(b.window,'s.villageGuide.dogs'),['shuu','riku','grey']);assert.equal(Guide.goal(read(b.window,'s')).id,'sam');assert.equal(read(b.window,'s.dog'),'grey');assert.deepEqual(b.errors,[]);}finally{b.dispose();}
});
test('the existing map marks real home/shop/practice entry coordinates and returns to the correct source',()=>{
 const a=boot(fresh()),w=a.window;
 try{const before=stock(w);click(w,'#villageGuideOpen');assert.equal(w.document.querySelector('#fieldGuideClose').textContent,'散策に戻る');assert.equal(w.document.querySelector('[aria-pressed="true"][data-guide-place]').dataset.guidePlace,'village-home');const entries=read(w,'villageGuidePlaces()');assert.equal(entries.length,3);assert.equal(w.eval(`isAtPlayerHomeMapEntrance(${entries[0].point.x},${entries[0].point.y})`),true);assert.equal(w.eval(`isAtSamShopEntrance(${entries[1].point.x},${entries[1].point.y})`),true);assert.equal(w.eval(`isNearPracticePond(${entries[2].point.x},${entries[2].point.y})`),true);click(w,'#fieldGuideClose');assert.equal(w.document.querySelector('.modal.open'),null);
  w.openLakeStory(null,'store');click(w,'#villageGuideJournal');click(w,'#fieldGuideClose');assert.ok(w.document.querySelector('#lakeStory.open'));w.close();assert.ok(w.document.querySelector('#store.open'));w.close();assert.deepEqual(stock(w),before);assert.deepEqual(a.errors,[]);
 }finally{a.dispose();}
});
test('hiding the reminder persists, exploration still records real visits, and the journal can show it again',()=>{
 const a=boot(fresh()),w=a.window;let saved;
 try{click(w,'#villageGuideOpen');click(w,'#villageGuideMute');assert.equal(read(w,'s.villageGuide.enabled'),false);click(w,'#fieldGuideClose');assert.equal(w.document.querySelector('#villageGuideOpen').hidden,true);w.open('store');w.close();assert.equal(read(w,'s.villageGuide.sam'),true);w.save();saved=JSON.parse(w.localStorage.getItem(saveKey));assert.deepEqual(a.errors,[]);}finally{a.dispose();}
 const b=boot(saved),v=b.window;try{assert.equal(v.document.querySelector('#villageGuideOpen').hidden,true);v.openLakeStory();click(v,'#villageGuideJournal');click(v,'#villageGuideMute');click(v,'#fieldGuideClose');v.close();assert.equal(v.document.querySelector('#villageGuideOpen').hidden,false);assert.equal(read(v,'s.villageGuide.sam'),true);assert.deepEqual(b.errors,[]);}finally{b.dispose();}
});
test('preparation cancellation keeps the goal incomplete; one real last-bait cast and return completes it safely',()=>{
 const a=boot(fresh({mapRegion:'mountainPond',x:120,y:109,direction:'up',money:1000,dogFollowing:false,baits:{worm:1}})),w=a.window;
 try{w.action();assert.equal(w.document.querySelector('#villageGuideOpen').hidden,true);click(w,'#cancelCastPreparation');assert.equal(read(w,'s.villageGuide.fishing'),false);w.action();w.beginFishing();w.eval('clearInterval(timer);battle.cast=50;launchSurfaceCast();settleSurfaceCast();clearInterval(timer)');assert.equal(read(w,'s.baits.worm'),0);w.wait();assert.equal(read(w,'battle'),null);assert.equal(read(w,'s.villageGuide.fishing'),true);w.action();assert.equal(read(w,'battle'),null);assert.match(w.document.querySelector('#rescueToast').textContent,/餌がないため/);assert.deepEqual(a.errors,[]);}finally{a.dispose();}
});
test('both existing fishing modes keep free training and its exactly-once first lesson reward',()=>{
 for(const mode of ['gauge','nushi']){
  const a=boot(fresh({fightMode:mode,baits:{worm:0}})),w=a.window;
  try{const before=stock(w);w.openPracticePond();assert.equal(w.document.querySelector('#villageGuideOpen').hidden,true);w.beginFishing();assert.equal(read(w,'battle.fightMode'),mode);w.wait();assert.equal(read(w,'s.villageGuide.fishing'),false);assert.deepEqual(stock(w),before);
   for(let n=0;n<2;n++){w.openPracticePond();w.eval('battle.f=fish.find(f=>f.id==="funa");battle.phase="fight";caught()');assert.equal(read(w,'s.baits.worm'),3);w.hideCatchCard();}assert.equal(read(w,'s.practiceTutorialComplete'),true);assert.equal(read(w,'s.villageGuide.fishing'),true);assert.equal(read(w,'s.fightMode'),mode);assert.equal(read(w,'s.money'),before.money);assert.deepEqual(read(w,'s.caught'),before.caught);assert.deepEqual(a.errors,[]);
  }finally{a.dispose();}
 }
});
test('a failed milestone save keeps usable controls and in-memory progress, then retries without any grant',()=>{
 const a=boot(fresh()),w=a.window,set=w.Storage.prototype.setItem;
 try{const before=stock(w),raw=w.localStorage.getItem(saveKey);w.Storage.prototype.setItem=function(k,v){if(k===saveKey)throw Error('quota');return set.call(this,k,v);};w.open('store');assert.equal(read(w,'s.villageGuide.sam'),true);assert.equal(w.localStorage.getItem(saveKey),raw);w.close();assert.equal(w.document.querySelector('.modal.open'),null);assert.equal(w.document.querySelector('#saveStatus').hidden,false);assert.deepEqual(stock(w),before);w.Storage.prototype.setItem=set;assert.equal(w.save(),true);assert.equal(JSON.parse(w.localStorage.getItem(saveKey)).villageGuide.sam,true);assert.deepEqual(a.errors,[]);}finally{w.Storage.prototype.setItem=set;a.dispose();}
});
