const test = require('node:test');
const assert = require('node:assert/strict');
const { boot, seed, read, saveKey } = require('./game-harness.cjs');
const { fixture } = require('./aquarium-identity-fixture.cjs');

function enter(w, game) {
  const [x, y] = game === 'race' ? [35, 60] : [74, 39.5];
  w.eval(`s.x=${x};s.y=${y};s.direction="up";render();action()`);
  assert.ok(w.document.querySelector(`#villageFishGames.open[data-game="${game}"]`));
}

function choose(w, selector) {
  const button = w.document.querySelector(selector);
  assert.ok(button && !button.disabled, selector + ' can be selected');
  button.click();
}

const cardAction = action => `[data-card-action="${action}"]`;
const play = w => choose(w, cardAction('play'));
const verdict = w => w.document.querySelector('.card-verdict').textContent;

function clock(w) {
  let time = w.performance.now(), nextId = -1;
  const frames = new Map();
  w.requestAnimationFrame = callback => { const id = nextId--; frames.set(id, callback); return id; };
  w.cancelAnimationFrame = id => frames.delete(id);
  w.performance.now = () => time;
  return ms => {
    for (let elapsed = 0; elapsed < ms; elapsed += 40) {
      time += Math.min(40, ms - elapsed);
      const current = Array.from(frames);
      frames.clear();
      for (const [, callback] of current) callback(time);
    }
  };
}

test('the net protects a points lead; winning the tied challenge needs a different fish', () => {
  const app = boot({ ...seed(), soundEnabled: false }), w = app.window;
  try {
    const before = read(w, '[s.money,s.gameMinutes,s.caught,s.petLife.fish]');
    enter(w, 'cards');
    choose(w, '[data-card-challenge="harbor-lead"]');
    play(w);
    assert.match(verdict(w), /3対3/);
    assert.deepEqual(read(w, 's.villageFishGames?.cleared || []'), []);
    choose(w, cardAction('replay'));
    choose(w, '[data-card-tackle="net"]'); play(w);
    assert.match(verdict(w), /最終局は 4対4/);
    assert.match(verdict(w), /合計 4対2/);
    choose(w, cardAction('shop')); choose(w, '[data-card-challenge="harbor-tie"]');
    choose(w, '[data-card-tackle="net"]'); play(w);
    assert.match(verdict(w), /合計 3対3/);
    assert.deepEqual(read(w, 's.villageFishGames.cleared'), ['harbor-lead']);
    choose(w, cardAction('replay')); choose(w, '[data-card-fish="suzuki"]');
    choose(w, '[data-card-tackle="net"]'); play(w);
    assert.match(verdict(w), /最終局は 5対4/);
    assert.deepEqual(read(w, 's.villageFishGames.cleared'), ['harbor-lead', 'harbor-tie']);
    const persisted = JSON.parse(w.localStorage.getItem(saveKey));
    assert.deepEqual(persisted.villageFishGames.cleared, ['harbor-lead', 'harbor-tie']);
    assert.deepEqual(read(w, '[s.money,s.gameMinutes,s.caught,s.petLife.fish]'), before);
    assert.deepEqual(app.errors, []);
  } finally { app.dispose(); }
});


test('the race adds pixel-water detail without changing course interactions', () => {
  const app = boot({...seed(), soundEnabled:false}), w = app.window;
  try {
    const advance = clock(w);
    enter(w, 'race');
    let surface = w.document.querySelector('.dan-race-water-detail');
    assert.ok(surface, 'a separate water pixel layer exists');
    assert.equal(surface.width, 720);
    assert.equal(surface.height, 192);
    assert.equal(surface.getAttribute('aria-hidden'), 'true');
    const picker = w.document.querySelector('#danCoursePicker');
    picker.value = 'mill';
    picker.dispatchEvent(new w.Event('change', {bubbles:true}));
    surface = w.document.querySelector('[data-dan-course="mill"] .dan-race-water-detail');
    assert.ok(surface, 'the water layer is rebuilt when the course changes');
    choose(w, '#danRaceStart');
    assert.ok(w.document.querySelector('[data-race-phase="running"] .dan-race-water-detail'));
    advance(1200);
    assert.equal(w.document.querySelectorAll('.dan-race-runner').length, 3);
    assert.deepEqual(app.errors, []);
  } finally { app.dispose(); }
});

test('racing a named aquarium fish prints a chosen finish once and the same card can be played after reload', () => {
  const saved = fixture();
  const pet = saved.petLife.fish.find(f => f.uid === 'pet-33');
  pet.nickname = 'ほし丸';
  const app = boot(saved), w = app.window;
  let persisted, original;
  try {
    original = read(w, 's.petLife.fish');
    const advance = clock(w);
    enter(w, 'race');
    const picker = w.document.querySelector('#danEntrantPicker');
    assert.match([...picker.options].find(option => option.value === 'pet-34').textContent, /世代不明/);
    const own = [...picker.options].find(option => option.textContent.includes(pet.nickname));
    assert.ok(own, 'the named aquarium entrant is available');
    picker.value = own.value; picker.dispatchEvent(new w.Event('change', { bubbles: true }));
    choose(w, '#danRaceStart'); advance(2200);
    const cue = w.document.querySelector('#danRaceSpurt');
    cue.dispatchEvent(new w.KeyboardEvent('keydown', { key: 'z', bubbles: true, repeat: true }));
    assert.equal(cue.disabled, false, 'holding the key from the start preserves the one signal');
    cue.dispatchEvent(new w.KeyboardEvent('keydown', { key: 'z', bubbles: true }));
    assert.equal(cue.disabled, true);
    advance(25000);
    assert.ok(w.document.querySelector('[data-race-phase="result"]'));
    assert.deepEqual(read(w, 's.villageFishGames?.records || []'), [], 'printing is optional');
    const print = w.document.querySelector('#danRacePrint');
    w.eval('saveSuppressed=true');
    print.click();
    assert.equal(print.disabled, false, 'a failed slot write can be retried');
    assert.deepEqual(read(w, 's.villageFishGames?.records || []'), []);
    w.eval('saveSuppressed=false');
    print.click(); print.click();
    const records = read(w, 's.villageFishGames.records');
    assert.equal(records.length, 1); assert.equal(records[0].name, pet.nickname);
    assert.equal(records[0].species, pet.species);
    assert.equal(records[0].uid, pet.uid); assert.equal(records[0].generation, 3);
    assert.ok(records[0].rank >= 1 && records[0].rank <= 3);
    assert.equal(records[0].rental, false);
    assert.deepEqual(read(w, 's.petLife.fish'), original, 'racing preserves the fish and its care');
    persisted = JSON.parse(w.localStorage.getItem(saveKey));
    assert.deepEqual(persisted.villageFishGames.records, records);
    assert.deepEqual(app.errors, []);
  } finally { app.dispose(); }

  const resumed = boot(persisted), rw = resumed.window;
  try {
    const id = persisted.villageFishGames.records[0].id;
    enter(rw, 'cards'); choose(rw, cardAction('album'));
    assert.equal(rw.document.querySelector('[data-card-record]').value, id);
    assert.equal(rw.document.querySelector(cardAction('foil')).disabled, true);
    choose(rw, cardAction('practice'));
    const ownCard = () => rw.document.querySelector('.fish-playing-card[data-record-id]');
    assert.equal(ownCard().dataset.recordId, id);
    assert.match(ownCard().textContent, /ほし丸/);
    choose(rw, '[data-card-tackle="net"]'); play(rw);
    assert.equal(ownCard().dataset.recordId, id, 'the actual played card retains its race identity');
    assert.match(verdict(rw), /最終局は 4対3/);
    assert.deepEqual(read(rw, 's.petLife.fish'), original);
    assert.deepEqual(resumed.errors, []);
  } finally { resumed.dispose(); }
});

test('the first arrival keeps the narrow gate, while different racers benefit from different spurt timing', () => {
  const race = require('../village-fish-race.js');
  const waiting = race.createRace('launch');
  waiting.elapsed = 6; waiting.gateOwner = 1; waiting.passages = 1;
  Object.assign(waiting.runners[1], { x: 49, gateOrder: 1 });
  waiting.runners[2].x = 39.95; waiting.runners[0].x = 39.8;
  race.advance(waiting, .5);
  assert.equal(waiting.runners[2].gateOrder, 2);
  assert.equal(waiting.runners[0].gateOrder, 0, 'the earlier arrival goes next even if its index is higher');

  function run(style, signalAt) {
    const r = race.createRace(style);
    for (let frame = 0; frame < 1800 && !r.finished; frame++) {
      const player = r.runners[0];
      if (player.x >= signalAt && player.spurtAt === null) {
        assert.equal(race.spurt(r), true);
        assert.equal(race.spurt(r), false, 'one signal per race');
      }
      race.advance(r, 1 / 60);
      assert.ok(r.runners.filter(f => f.x > 40 && f.x < 50).length <= 1, 'one fish fits through the gate at a time');
    }
    assert.ok(r.finished);
    return { rank: 1 + r.runners.filter(f => f.finishTime < r.runners[0].finishTime).length,
      gate: r.runners[0].gateOrder };
  }
  assert.equal(run('launch', 24).gate, 1);
  assert.ok(run('launch', 24).rank < run('launch', 70).rank);
  assert.ok(run('finish', 70).rank < run('finish', 24).rank);
  assert.ok(run('launch', Infinity).rank > 1, 'the field also finishes without an input');
});

test('a rental ayu can earn its own souvenir, then a spare for gold foil with unchanged battle strength', () => {
  const app = boot({ ...seed(), soundEnabled: false }), w = app.window;
  try {
    const advance = clock(w);
    enter(w, 'race');
    const select = w.document.querySelector('#danEntrantPicker');
    select.value = 'rental-ayu'; select.dispatchEvent(new w.Event('change', { bubbles: true }));
    for (let i = 0; i < 2; i++) {
      if (i) choose(w, '#danRaceAgain');
      choose(w, '#danRaceStart'); advance(20000);
      choose(w, '#danRacePrint');
      assert.equal(w.document.querySelector('#danRacePrint').disabled, true);
    }
    const records = read(w, 's.villageFishGames.records');
    assert.equal(records.length, 2); assert.notEqual(records[0].id, records[1].id);
    assert.ok(records.every(record => record.species === 'ayu' && record.rental && record.generation === null));
    w.close(); enter(w, 'cards');
    choose(w, cardAction('album')); choose(w, cardAction('foil'));
    assert.equal(w.document.querySelector(cardAction('foil')).disabled, true);
    choose(w, cardAction('practice')); choose(w, '[data-card-tackle="net"]'); play(w);
    assert.ok(w.document.querySelector('.card-showdown .fish-playing-card.is-foil[data-record-id]'));
    assert.match(verdict(w), /最終局は 4対3/);
    assert.deepEqual(read(w, 's.villageFishGames.foils'), ['ayu']);
    assert.deepEqual(read(w, 's.petLife.fish'), []);
    assert.deepEqual(app.errors, []);
  } finally { app.dispose(); }
});

test('three-round play commits Riao before the reveal and spends each fish and each tackle once', () => {
  const { createMatch, playMatchRound, nextMatchRound } = require('../village-fish-cards.js');
  const options = ['none', 'net', 'chum'];
  const results = new Set();
  const run = (order, tackles) => {
    const match = createMatch(undefined, () => 0.36);
    let points = [0, 0];
    const opponentFish = new Set(), opponentTackle = new Set();
    for (let round = 0; round < 3; round++) {
      const before = { ...match.rivalMove };
      if (round) {
        assert.equal(playMatchRound(match, order[0], 'none'), null, 'a spent card cannot play again');
        if (tackles[0] !== 'none') {
          assert.equal(playMatchRound(match, order[round], tackles[0]), null, 'a spent tackle cannot play again');
        }
        assert.deepEqual(match.rivalMove, before, 'rejected inputs keep the same rival move');
      }
      const played = playMatchRound(match, order[round], tackles[round]);
      assert.ok(played);
      assert.equal(played.playerIndex, order[round]);
      assert.equal(played.rivalIndex, before.index);
      assert.equal(played.rivalTackle, before.tackle);
      assert.ok(!opponentFish.has(played.rivalIndex));
      opponentFish.add(played.rivalIndex);
      if (played.rivalTackle !== 'none') {
        assert.ok(!opponentTackle.has(played.rivalTackle));
        opponentTackle.add(played.rivalTackle);
      }
      const comparison = Math.sign(played.playerStrength - played.rivalStrength);
      points = [points[0] + 1 + comparison, points[1] + 1 - comparison];
      assert.deepEqual([played.playerScore, played.rivalScore], points);
      assert.equal(playMatchRound(match, order[round], 'none'), null, 'a second reveal has no effect');
      assert.equal(match.history.length, round + 1);
      assert.equal(nextMatchRound(match), round < 2);
    }
    results.add(Math.sign(points[0] - points[1]));
  };
  // Vary only the player's choices against the same pre-committed rival.
  for (const first of [0, 1, 2]) {
    for (const second of [0, 1, 2].filter(i => i !== first)) {
      for (const a of options) for (const b of options) for (const c of options) {
        const sequence = [a, b, c], spent = sequence.filter(v => v !== 'none');
        if (new Set(spent).size === spent.length) run([first, second, 3 - first - second], sequence);
      }
    }
  }
  assert.deepEqual([...results].sort(), [-1, 0, 1], 'the same visible cards allow a loss, a draw and a win');
});

function displayCaughtFish(w, species, value = species) {
  // The browser route walks to this same hotspot from the map.
  w.eval(`playerHomeState.area='interior';
    { const tank=playerHomeAreaData.interior.events.find(e=>e.id==='aquarium');
      playerHomeState.x=tank.x;playerHomeState.y=tank.y; }
    renderPlayerHome();playerHomeAction()`);
  assert.ok(w.document.querySelector('#aquariumModal.open'));
  const select = w.document.querySelector('#aquariumFishSelect');
  assert.ok([...select.options].some(o=>o.value===value),'the chosen individual is offered');
  select.value = value;
  select.dispatchEvent(new w.Event('change'));
  choose(w, '#aquariumPlaceFish');
  assert.equal(read(w, 's.homeAquariumFishId'), species);
  w.close(); w.eval("playerHomeState.area=null");
}

function landFuna(w, spot, roll) {
  // Enter the real landing handler with the measured fish and tackle from the cast.
  w.eval(`battle={phase:'landing',f:fish.find(f=>f.id==='funa'),spot:'${spot}',
    waterZone:'lake',castLocale:'lake',rod:'bamboo',bait:'worm',hook:'small',method:'bait',fightMode:'gauge'};
    battle.specimen=rollFishSpecimen(battle.f,()=>${roll});caught();hideCatchCard()`);
}

test('a named measured catch keeps its own shore and aquarium identity on the table and after reload', () => {
  const app = boot({ ...seed(), caught:{}, sizeRecords:{}, soundEnabled:false }), w = app.window;
  const name = 'ほしふるみずうみのみなも';
  let stored, printed, tank;
  try {
    landFuna(w,'river-shallow',0.999); // Keep a different first and largest fish.
    landFuna(w,'lake-shallow',0.42);
    displayCaughtFish(w, 'funa');
    landFuna(w,'river-shallow',0.8);
    const place = read(w, 'fishingSpotById("lake-shallow").name');
    assert.notEqual(place, read(w, 'fishingSpotById("river-shallow").name'));
    const catches = read(w, '[s.caught,s.money,s.homeAquariumSizeHundredths,s.fishCatchRecords]');
    enter(w,'cards'); choose(w,cardAction('catch-print'));
    const nickname = '[data-card-nickname]';
    w.document.querySelector(nickname).value = name;
    w.eval('saveSuppressed=true');
    choose(w,cardAction('print-catch'));
    assert.equal(w.document.querySelector(nickname).value,name,'a failed save keeps the typed name');
    assert.equal(read(w,'s.villageFishGames?.catchCards?.length || 0'),0);
    w.eval('saveSuppressed=false');
    choose(w,cardAction('print-catch'));
    assert.equal(read(w,'s.villageFishGames.catchCards.length'),1);
    printed = read(w,'s.villageFishGames.catchCards[0]');
    assert.equal(printed.name,name);assert.equal(printed.place,place);assert.equal(printed.species,'funa');
    tank = read(w, 's.homeAquariumSpecimen');
    assert.equal(tank.uid,printed.uid);
    assert.deepEqual(read(w,'[s.caught,s.money,s.homeAquariumSizeHundredths,s.fishCatchRecords]'),catches);
    choose(w,cardAction('duel-with-catch'));
    const same = [...w.document.querySelectorAll('[data-card-slot]')].find(n=>n.value===printed.id);
    assert.ok(same);
    for (const other of w.document.querySelectorAll('[data-card-slot]')) {
      if (other!==same) assert.ok([...other.options].find(o=>o.value===printed.id).disabled);
    }
    choose(w,cardAction('duel-start'));
    const myCard=()=>w.document.querySelector('[data-record-id="'+printed.id+'"]');
    assert.equal(myCard().querySelector('.fish-card-imprint').textContent,place);
    choose(w,'[data-record-id="'+printed.id+'"]');
    choose(w,cardAction('duel-play'));
    assert.match(myCard().textContent,new RegExp(name));
    assert.ok(myCard().textContent.includes(place));
    stored = JSON.parse(w.localStorage.getItem(saveKey));
    assert.deepEqual(app.errors,[]);
  } finally {app.dispose();}
  const again=boot(stored), rw=again.window;
  try {
    assert.deepEqual(read(rw,'s.homeAquariumSpecimen'),tank);
    assert.equal(read(rw,'s.homeAquariumFishId'),'funa');
    enter(rw,'cards');choose(rw,cardAction('catch-print'));
    assert.equal(rw.document.querySelector(cardAction('print-catch')),null,'a printed specimen cannot issue a duplicate');
    choose(rw,cardAction('duel-with-catch'));
    choose(rw,cardAction('duel-start'));
    const selected=rw.document.querySelector('[data-record-id="'+printed.id+'"]');
    assert.ok(selected.textContent.includes(printed.name)&&selected.textContent.includes(printed.place));
    assert.deepEqual(read(rw,'s.villageFishGames.catchCards'),[printed]);
    rw.close();
    displayCaughtFish(rw,'funa'); // Switch to the later river fish.
    assert.notEqual(read(rw,'s.homeAquariumSpecimen.uid'),printed.uid);
    assert.equal(read(rw,'s.homeAquariumSpecimen.place'),read(rw,'fishingSpotById("river-shallow").name'));
    const afterSwitch=boot(JSON.parse(rw.localStorage.getItem(saveKey)));
    try {
      displayCaughtFish(afterSwitch.window,'funa',printed.uid);
      const redisplayed=read(afterSwitch.window,'s.homeAquariumSpecimen');
      assert.equal(redisplayed.uid,printed.uid);
      assert.equal(redisplayed.nickname,name);
      assert.equal(redisplayed.place,printed.place);
      assert.deepEqual(read(afterSwitch.window,'s.villageFishGames.catchCards'),[printed]);
      assert.deepEqual(afterSwitch.errors,[]);
    } finally {afterSwitch.dispose();}
    assert.deepEqual(again.errors,[]);
  } finally {again.dispose();}
});

test('a legacy tank without a recorded shore never substitutes the current village location', () => {
  const app=boot({...seed(),homeAquariumFishId:'funa',homeAquariumSizeHundredths:1670,soundEnabled:false}), w=app.window;
  try {
    enter(w,'cards');choose(w,cardAction('catch-print'));
    assert.match(w.document.querySelector('[data-card-screen="catch-print"]').textContent,/釣り場不明/);
    choose(w,cardAction('print-catch'));
    const [card]=read(w,'s.villageFishGames.catchCards');
    assert.equal(card.place,null);
    assert.equal(read(w,'s.homeAquariumFishId'),'funa');
    assert.deepEqual(app.errors,[]);
  } finally {app.dispose();}
});

function pick(w,selector,value) {
  const select=w.document.querySelector(selector);
  assert.ok(select && [...select.options].some(option=>option.value===value),selector+' offers '+value);
  select.value=value;
  select.dispatchEvent(new w.Event('change',{bubbles:true}));
}

test('mill branches share a repeatable current and rivals; training changes the chosen spurt phase', () => {
  const {createRace,advance,spurt}=require('../village-fish-race.js');
  function run(style,route,training,signalAt) {
    const race=createRace(style,0,{course:'mill',route,training});
    if(signalAt!=null){
      advance(race,signalAt);assert.ok(spurt(race));assert.equal(spurt(race),false);
    }
    advance(race,30);
    assert.equal(race.finished,true);
    return race.runners.map(f=>({route:f.route,merge:f.mergeTime,finish:f.finishTime}));
  }
  const empty=run('finish','wheel',0,null),late=run('finish','bank',0,11);
  assert.deepEqual(run('finish','wheel',0,null),empty,'retries start the wheel cycle at the same point');
  assert.deepEqual(run('finish','wheel',2,null),empty,'training alone never changes automatic speed');
  assert.deepEqual(late.slice(1),empty.slice(1),'both opponents keep their routes and splits');
  assert.ok(late[0].merge>Math.max(late[1].merge,late[2].merge),'the bank entrant is last at the merge');
  assert.ok(late[0].finish<Math.min(late[1].finish,late[2].finish),'one late spurt overtakes both rivals');
  assert.ok(run('launch','wheel',-2,3.5)[0].finish<run('launch','wheel',2,3.5)[0].finish);
  assert.ok(run('finish','bank',2,11)[0].finish<run('finish','bank',-2,11)[0].finish);
});

test('a third-place personal best on the mill persists before printing and imprints exactly one card', () => {
  const older={id:'before-waterwheel',uid:null,species:'ayu',name:'アユ',generation:null,
    course:'水草の門',rank:2,day:1,rental:true};
  const app=boot({...seed(),villageFishGames:{records:[older]}}), w=app.window;
  let saved,record;
  try {
    const advance=clock(w);
    const best=()=>read(w,'s.villageFishGames?.raceBests || []');
    const records=()=>read(w,'s.villageFishGames.records');
    enter(w,'race');
    pick(w,'#danEntrantPicker','rental-ayu');pick(w,'#danCoursePicker','mill');pick(w,'#danRoutePicker','wheel');
    choose(w,'#danRaceStart');
    w.eval('saveSuppressed=true');advance(25000);
    assert.deepEqual(best(),[],'unwritten best is not kept in memory');
    assert.deepEqual(records(),[older]);
    w.eval('saveSuppressed=false');choose(w,'#danRaceRetryBest');
    const [first]=best();
    assert.equal(first.uid,'rental-ayu');assert.ok(first.timeCs>0);
    assert.deepEqual(records(),[older],'recorded times do not create souvenirs');
    assert.equal(w.document.querySelector('.dan-race-result').dataset.personalBest,'false');
    function replay(spurtAt) {
      choose(w,'#danRaceAgain');assert.equal(w.document.querySelector('#danEntrantPicker').value,'rental-ayu');
      assert.equal(w.document.querySelector('#danCoursePicker').value,'mill');
      assert.equal(w.document.querySelector('#danRoutePicker').value,'wheel');
      choose(w,'#danRaceStart');
      if(spurtAt){advance(spurtAt);choose(w,'#danRaceSpurt');}
      advance(24000);
      return w.document.querySelector('.dan-race-result').dataset;
    }
    const tie=replay();
    assert.equal(Number(tie.timeCs),first.timeCs);assert.equal(tie.personalBest,'false');
    const faster=replay(11000);
    assert.equal(w.document.querySelector('#danRaceRank').dataset.rank,'3');
    assert.equal(faster.personalBest,'true');
    assert.ok(Number(faster.timeCs)<first.timeCs);assert.equal(best().length,1);
    assert.equal(best()[0].timeCs,Number(faster.timeCs));
    const print=w.document.querySelector('#danRacePrint');
    w.eval('saveSuppressed=true');print.click();assert.equal(records().length,1);
    w.eval('saveSuppressed=false');print.click();print.click();assert.equal(records().length,2);
    record=records()[1];
    assert.equal(record.personalBest,true);assert.equal(record.timeCs,Number(faster.timeCs));
    assert.equal(record.route,'wheel');assert.equal(record.rank,3);
    choose(w,'#danRaceAgain');pick(w,'#danCoursePicker','gate');choose(w,'#danRaceStart');advance(25000);
    assert.equal(best().length,2,'the old course has a distinct time for the same fish');
    const gate=best().find(r=>r.course==='水草の門');assert.equal(gate.uid,first.uid);
    choose(w,'#danRaceAgain');pick(w,'#danEntrantPicker','rental-funa');pick(w,'#danCoursePicker','mill');
    choose(w,'#danRaceStart');advance(25000);
    assert.equal(best().length,3,'a different fish at the mill establishes its own first time');
    saved=JSON.parse(w.localStorage.getItem(saveKey));
    assert.deepEqual(saved.villageFishGames.raceBests,best());
    assert.deepEqual(app.errors,[]);
  } finally { app.dispose(); }
  const resumed=boot(saved), rw=resumed.window;
  try {
    enter(rw,'cards');choose(rw,cardAction('album'));
    pick(rw,'[data-card-record]',older.id);
    let card=rw.document.querySelector('.fish-playing-card[data-record-id="'+older.id+'"]');
    assert.ok(card);assert.equal(card.querySelector('.fish-card-race-time'),null,'old cards keep their actual untimed imprint');
    pick(rw,'[data-card-record]',record.id);
    card=rw.document.querySelector('.fish-playing-card[data-record-id="'+record.id+'"]');
    assert.equal(card.querySelector('.card-best-stamp').textContent,'自己新');
    assert.ok(card.querySelector('.fish-card-race-time').textContent.includes((record.timeCs/100).toFixed(2)+'秒'));
    assert.deepEqual(resumed.errors,[]);
  } finally { resumed.dispose(); }
});
