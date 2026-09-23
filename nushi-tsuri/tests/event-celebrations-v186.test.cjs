const {test}=require('node:test');
const assert=require('node:assert/strict');
const E=require('../event-ceremony.js'),Sound=require('../soundscape.js'),T=require('../tournament.js');
const {boot,seed,read,saveKey}=require('./game-harness.cjs');
const click=(w,q)=>{const b=w.document.querySelector(q);assert.ok(b,q);assert.equal(b.disabled,false,q);b.click();};
const saved=w=>JSON.parse(w.localStorage.getItem(saveKey));
function reception(w){w.eval('petUi.open("shop")');click(w,'[data-pet-tab="contests"]');}
function select(w,id,value){const el=w.document.getElementById(id);el.value=value;el.dispatchEvent(new w.Event('change',{bubbles:true}));}
function captureMusic(w){w.eval('backgroundMusic.set=id=>{window.selectedMusic=id;return Promise.resolve(true)};backgroundMusic.stop=()=>{window.selectedMusic=null};gameAudio.unlocked=true');}

test('each competitive event has its own music through the fight; ordinary fishing still uses water only',()=>{
  for(const [id,track] of [['lakeFuna','tournament-lake'],['lakeMasters','tournament-masters']])
    for(const phase of ['prep','cast','cast-flight','wait','bite','fight','catch']){
      const scene=Sound.selectScene({active:true,tournament:id,fishing:true,phase,zone:'lake'});
      assert.equal(scene.music,track);
      assert.equal(scene.birds,['fight','catch'].includes(phase)?null:'lakeBirds');
      assert.equal(Sound.selectScene({active:true,fishing:true,phase,contest:'contest-pet'}).music,null);
    }
  assert.equal(Sound.selectScene({active:true,contest:'contest-pet'}).music,'contest-pet');
  assert.equal(Sound.selectScene({active:true,contest:'contest-fish'}).music,'contest-fish');
  assert.equal(Sound.selectScene({active:false,tournament:'lakeMasters',contest:'contest-fish'}).music,null);
});

test('actual event entry, a cast, results and closing switch the single music channel, including mute and background',()=>{
  const app=boot({...seed(),money:10000}),w=app.window;
  try{
    captureMusic(w);w.openTournament();click(w,'[data-tournament-select="lakeMasters"]');click(w,'[data-tournament-action="start"]');
    assert.equal(w.selectedMusic,'tournament-masters');
    w.eval('cast(fishingSpotById("lake-shallow"))');assert.equal(w.selectedMusic,'tournament-masters');
    w.eval('battle.phase="fight";syncExpectedLoopAudio()');assert.equal(w.selectedMusic,'tournament-masters');
    assert.equal(w.gameAudioSampleIsPlaying('underwater'),true);
    w.endBattle();w.eval('ShuTournament.finishEarly(s.tournament);maybePresentTournament()');
    assert.equal(w.selectedMusic,'tournament-masters');
    click(w,'[data-tournament-action="finish"]');assert.equal(w.selectedMusic,'map-spring');
    reception(w);assert.equal(w.selectedMusic,'contest-pet');
    select(w,'petContestKind','tricks');assert.equal(w.selectedMusic,'contest-pet');
    select(w,'petContestKind','fish');assert.equal(w.selectedMusic,'contest-fish');
    w.setSoundEnabled(false);w.syncSceneSound();assert.equal(w.selectedMusic,null);
    w.eval('s.soundEnabled=true;gameAudio.unlocked=true');w.syncSceneSound();assert.equal(w.selectedMusic,'contest-fish');
    Object.defineProperty(w.document,'hidden',{value:true,configurable:true});w.document.dispatchEvent(new w.Event('visibilitychange'));assert.equal(w.selectedMusic,null);
    Object.defineProperty(w.document,'hidden',{value:false,configurable:true});w.document.dispatchEvent(new w.Event('visibilitychange'));w.eval('gameAudio.unlocked=true;syncSceneSound()');assert.equal(w.selectedMusic,'contest-fish');
    click(w,'[data-pet-tab="supplies"]');assert.equal(w.selectedMusic,'map-spring');
    click(w,'[data-pet-tab="contests"]');click(w,'[data-pet-action="close"]');assert.equal(w.selectedMusic,'map-spring');
    assert.deepEqual(app.errors,[]);
  }finally{app.dispose();}
});

test('rank stages distinguish the actual rank and event; ties stay ties and early retirement never shows a winner trophy',()=>{
  const app=boot(),w=app.window;
  try{
    for(const kind of ['angling','bond','tricks','fish'])for(let rank=1;rank<=5;rank++){
      const node=w.document.createElement('div');node.innerHTML=E.markup({kind,rank,subject:'shuu',tied:rank===2});
      assert.equal(node.querySelector('.event-ceremony').dataset.eventRank,String(rank));
      assert.equal(node.querySelector('.event-caption strong').textContent,(rank===2?'同率':'')+rank+'位');
      assert.ok(node.querySelector('svg'));
    }
    const node=w.document.createElement('div');node.innerHTML=E.markup({kind:'angling',rank:1,completed:false,subject:'funa'});
    assert.equal(node.querySelector('.event-ceremony').dataset.eventTier,'thanks');
    assert.doesNotMatch(node.textContent,/優勝/);assert.match(node.textContent,/参考 1位/);
    assert.doesNotMatch(E.markup({kind:'<script>',rank:NaN,subject:'" onclick="evil()'}),/onclick|<script>/);
    const poses=rank=>Array.from({length:32},(_,i)=>E.pose('bond',rank,i/8));
    assert.ok(Math.min(...poses(1).map(p=>p.y))<Math.min(...poses(2).map(p=>p.y)));
    assert.ok(poses(3).some(p=>p.angle>0));
    assert.notDeepEqual(poses(4),poses(5));
  }finally{app.dispose();}
});

test('pet results retain the actual animal across selection, close and reload; ceremony redraws never award or reroll',()=>{
  for(const kind of ['bond','tricks','fish']){
    let app=boot({...seed(),money:10000,dogAffinity:{shuu:100,riku:0}}),w=app.window;
    try{
      w.Math.random=()=>0;
      if(kind==='fish')w.eval('ShuPetLife.acquire(s,"mebaru",petCatalog,gameClockAt(s.gameMinutes).dayIndex,0);save()');
      reception(w);select(w,'petContestKind',kind);
      const before=read(w,'s.money');click(w,'[data-pet-action="enter"]');
      const result=read(w,'s.petLife.lastResult'),after=read(w,'s.money');
      assert.equal(after,before-100+result.reward);
      const expected=kind==='fish'?'mebaru':'shuu';assert.equal(result.subject,expected);
      assert.equal(w.document.querySelector('.event-ceremony').dataset.eventSubject,expected);
      assert.equal(read(w,'eventCeremonies.running'),true);
      if(kind!=='fish')select(w,'petContestParticipant','riku');
      for(let i=0;i<5;i++)w.eval('petUi.render();eventCeremonies.sync()');
      assert.equal(read(w,'s.money'),after);assert.deepEqual(read(w,'s.petLife.lastResult'),result);
      click(w,'[data-pet-action="close"]');assert.equal(read(w,'eventCeremonies.running'),false);
      const state=saved(w);app.dispose();app=boot(state);w=app.window;reception(w);
      assert.equal(w.document.querySelector('.event-ceremony').dataset.eventSubject,expected);
      assert.equal(read(w,'s.money'),after);assert.deepEqual(read(w,'s.petLife.lastResult'),result);
      assert.deepEqual(app.errors,[]);
    }finally{app.dispose();}
  }
});

test('old named results get the correct existing art without modifying the stored reward',()=>{
  const app=boot(),w=app.window;
  try{
    w.eval('s.petLife.lastResult={kind:"fish",course:"beginner",name:"メバル",day:0,score:65,rank:2,reward:125,detail:"以前の成績",marks:[]};save()');
    const money=read(w,'s.money');reception(w);
    assert.equal(w.document.querySelector('.event-ceremony').dataset.eventSubject,'mebaru');
    assert.equal(read(w,'s.money'),money);assert.equal(read(w,'s.petLife.lastResult.reward'),125);
    assert.deepEqual(app.errors,[]);
  }finally{app.dispose();}
});

test('result animation stops on close, hidden page and reduced motion, then resumes without hidden-time jumps',()=>{
  const app=boot({...seed(),dogAffinity:{shuu:100}}),w=app.window;
  try{
    reception(w);click(w,'[data-pet-action="enter"]');
    const before=read(w,'({money:s.money,result:s.petLife.lastResult})');
    Object.defineProperty(w.document,'hidden',{value:true,configurable:true});w.document.dispatchEvent(new w.Event('visibilitychange'));
    assert.equal(read(w,'eventCeremonies.running'),false);assert.ok(w.document.querySelector('.event-ceremony').classList.contains('event-paused'));
    Object.defineProperty(w.document,'hidden',{value:false,configurable:true});w.document.dispatchEvent(new w.Event('visibilitychange'));
    assert.equal(read(w,'eventCeremonies.running'),true);
    w.eval('eventCeremonies.stop()');
    const media={matches:true,addEventListener(_type,listener){this.change=listener;}};w.matchMedia=()=>media;
    const controller=w.ShuEventCeremony.create({document:w.document,paintSubject(){}});controller.sync();assert.equal(controller.running,false);
    media.matches=false;media.change();assert.equal(controller.running,true);
    w.close();controller.sync();assert.equal(controller.running,false);
    assert.deepEqual(read(w,'({money:s.money,result:s.petLife.lastResult})'),before);assert.deepEqual(app.errors,[]);
  }finally{app.dispose();}
});

test('masters and their dogs attend only their tournament, including old gathering saves; Asual remains a usable shopkeeper',()=>{
  let app=boot({...seed(),caught:{...seed().caught,moroko:1},money:10000}),w=app.window;
  try{
    assert.deepEqual(read(w,'currentRivalPlacements().map(p=>p.id)'),['chappie']);
    w.openTournament();click(w,'[data-tournament-select="lakeMasters"]');click(w,'[data-tournament-action="start"]');
    assert.equal(read(w,'currentTournamentNpcPlacements().length'),3);assert.equal(read(w,'currentRivalPlacements().length'),4);
    const active=saved(w);app.dispose();app=boot(active);w=app.window;
    assert.equal(read(w,'currentTournamentNpcPlacements().length'),3);
    w.eval('ShuTournament.finishEarly(s.tournament);maybePresentTournament()');
    const legacy=read(w,'ShuTournament.gathering(s.tournament,s.gameMinutes)');
    click(w,'[data-tournament-action="finish"]');assert.equal(read(w,'currentTournamentNpcPlacements().length'),0);assert.deepEqual(read(w,'currentRivalPlacements().map(p=>p.id)'),['chappie']);
    const state=saved(w);state.tournamentGathering=legacy;app.dispose();app=boot(state);w=app.window;
    assert.equal(w.document.querySelector('#tournamentNpcLayer').hidden,true);assert.equal(read(w,'currentTournamentNpcPlacements().length'),0);
    w.eval('s.x=199;s.y=36;render()');click(w,'#action');assert.match(w.document.querySelector('#petLifeTitle').textContent,/アスアル/);
    assert.ok(w.document.querySelector('#petLifeModal [data-rival-art="asual"]'));const money=read(w,'s.money');click(w,'[data-pet-buy="moroko"]');assert.ok(read(w,'s.money')<money);
    assert.deepEqual(app.errors,[]);
  }finally{app.dispose();}
});
