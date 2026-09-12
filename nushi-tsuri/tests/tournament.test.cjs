const { test } = require("node:test");
const assert = require("node:assert/strict");
const T = require("../tournament.js");
const { boot, seed, read, saveKey } = require("./game-harness.cjs");
const funa = hundredths => ({ fishId: "funa", hundredths });
const click = (w, selector) => {
  const button = w.document.querySelector(selector);
  assert.ok(button, `missing control: ${selector}`);
  button.click();
};
function enter(w) {
  w.eval('renderSamShop(); open("store");');
  click(w, "#tournamentOffer");
  click(w, '[data-tournament-action="start"]');
}
function launch(w) {
  w.eval('cast(fishingSpotById("lake-shallow")); beginFishing(); battle.cast=25; launchSurfaceCast();');
}
function catchFish(w, id, hundredths) {
  // Resolve a controlled specimen through the real catch/dex/quest/payment path.
  w.eval(`battle.f=fish.find(f=>f.id===${JSON.stringify(id)});
    battle.specimen=rollFishSpecimen(battle.f,()=>.5);
    Object.assign(battle.specimen,{hundredths:${hundredths},cm:${hundredths}/100,cmText:(${hundredths}/100).toFixed(2)});
    caught();`);
}
function continueCatch(w) { w.hideCatchCard(); w.maybePresentTournament(); }

test("nine attempts, five slots, explicit swaps/releases and final choice before scoring", () => {
  const t = T.create("lakeFuna", 700);
  for (let i = 0; i < 5; i++) {
    assert.equal(T.commitCast(t, "lake"), true);
    assert.equal(T.commitCast(t, "lake"), false, "one resource commit per attempt");
    assert.equal(T.finishCast(t, funa(1800 + i)), "kept");
    assert.equal(T.finishCast(t, funa(4999)), "none", "duplicate callbacks never add fish");
  }
  T.commitCast(t, "lake"); T.finishCast(t, funa(3000));
  assert.equal(T.canCast(t, "lake"), false);
  assert.equal(T.choose(t, 5), false);
  assert.equal(T.choose(t, 0), true);
  T.commitCast(t, "lake"); T.finishCast(t, { fishId: "nushi", hundredths: 20000 });
  assert.equal(t.pending, null, "non-target and nushi do not enter the creel");
  T.commitCast(t, "lake"); T.finishCast(t, funa(800)); T.choose(t);
  T.commitCast(t, "lake"); T.finishCast(t, funa(3200));
  assert.equal(T.remaining(t), 0);
  assert.equal(t.phase, "active", "the ninth catch still gets a replacement decision");
  assert.equal(T.choose(t, 1), true);
  assert.equal(t.phase, "result");
  assert.equal(T.commitCast(t, "lake"), false);
  assert.equal(t.creel.length, 5);
  assert.equal(T.elapsed(t), 90);
});

test("exact hundredth-centimetre totals, largest-fish tiebreak and genuine equal ranks", () => {
  const entries = [
    { id: "a", fish: [funa(1001), funa(1999)] },
    { id: "b", fish: [funa(2000), funa(1000)] },
    { id: "c", fish: [funa(1000), funa(2000)] },
    { id: "empty", fish: [] },
  ];
  assert.deepEqual(T.rank(entries).map(r => [r.id, r.rank, r.total, r.largest]),
    [["b", 1, 3000, 2000], ["c", 1, 3000, 2000], ["a", 3, 3000, 1999], ["empty", 4, 0, 0]]);
  assert.equal(T.normalize({ id: "unknown" }), null);
  const malformed = { ...T.create("lakeFuna", 100), casts: 3,
    creel: [funa(1800), funa(-4), funa(NaN), { fishId: "koi", hundredths: 2000 }] };
  assert.deepEqual(T.normalize(malformed).creel, [funa(1800)]);
});

test("time and venue are definition-driven, including a night event in another water zone", () => {
  T.definitions.nightTest = { ...T.definitions.lakeFuna, id: "nightTest",
    waterZones: ["river"], fixedMinute: 1260, duration: 60 };
  try {
    const t = T.create("nightTest", 3 * 1440 + 500);
    assert.equal(T.sceneMinutes(t, 9000), 3 * 1440 + 1260);
    assert.equal(T.canCast(t, "lake"), false);
    assert.equal(T.canCast(t, "river"), true);
    assert.equal(T.maxCasts(t), 6);
  } finally { delete T.definitions.nightTest; }
  assert.equal(T.sceneMinutes(null, 800), 800);
});

test("real nine-cast flow keeps ordinary catches, fixed morning, saved ninth-fish choice and normal return", () => {
  const original = { ...seed(), gameMinutes: 1435, baits: { worm: 20 }, activeMeal: { id: "shellSoup", expiresAt: 1450 } };
  let app = boot(original), w = app.window;
  try {
    enter(w);
    assert.equal(read(w, "s.money"), original.money - 3000, "entry fee is paid once");
    w.eval('cast(fishingSpotById("lake-shallow")); beginFishing(); wait();');
    assert.equal(read(w, "s.tournament.casts"), 0, "pre-throw cancellation costs nothing");
    assert.equal(read(w, "s.gameMinutes"), 1435);
    assert.equal(w.sleepAtPlayerHome(), false);
    w.openPracticePond();
    w.eval('cast(fishingSpotById("river-shallow"))');
    assert.equal(read(w, "battle"), null, "practice and other venues cannot count");
    for (const [i, size] of [1800, 2000, 2200, 2400, 2500, 2750, 3200, 900, 3100].entries()) {
      launch(w);
      assert.equal(read(w, "s.tournament.casts"), i + 1);
      assert.equal(read(w, "sceneGameMinutes()"), 360);
      assert.equal(read(w, "gameSceneryEnvironment().period"), "morning");
      assert.equal(w.document.querySelector("#weather").dataset.weather, "sunny", "event day stays fixed across midnight");
      assert.equal(read(w, "currentSoundScene().music"), null, "cast scene retains ambience without BGM");
      catchFish(w, i === 6 ? "koi" : "funa", size);
      const count = read(w, "s.caught.funa");
      w.caught();
      assert.equal(read(w, "s.caught.funa"), count, "no duplicate ordinary catch");
      assert.equal(w.document.querySelector("#tournamentModal").classList.contains("open"), false,
        "the catch card completes before a creel decision/result opens");
      continueCatch(w);
      if (i === 5) { click(w, '[data-tournament-replace="0"]'); click(w, '[data-tournament-action="close"]'); }
      if (i === 7) { click(w, '[data-tournament-action="release"]'); click(w, '[data-tournament-action="close"]'); }
    }
    assert.equal(read(w, "activeMealEntry()"), null, "ordinary timed effects expire on the real clock");
    assert.equal(read(w, "s.baits.worm"), 11);
    assert.equal(read(w, "s.gameMinutes"), 1525);
    assert.equal(read(w, "s.caught.funa"), original.caught.funa + 8);
    assert.equal(read(w, "s.caught.koi"), 1);
    assert.equal(read(w, "s.fishCatchRecords.funa.last.period"), "morning");
    assert.equal(read(w, "s.sizeRecords.funa.hundredths"), 3100);
    assert.equal(read(w, "s.tournament.pending.hundredths"), 3100);
    const saved = JSON.parse(w.localStorage.getItem(saveKey));
    const money = saved.money;
    app.dispose(); app = boot(saved); w = app.window;
    assert.equal(w.document.querySelector("#tournamentModal").classList.contains("open"), true);
    w.dispatchEvent(new w.KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
    assert.equal(w.document.querySelector("#tournamentModal").classList.contains("open"), true, "required choice cannot be skipped");
    assert.equal(read(w, "s.tournament.phase"), "active");
    w.eval('cast(fishingSpotById("lake-shallow"))');
    assert.equal(read(w, "battle"), null, "no tenth cast while choosing");
    click(w, '[data-tournament-replace="1"]');
    assert.equal(read(w, "s.tournament.phase"), "result");
    assert.equal(read(w, "ShuTournament.score(s.tournament.creel).total"), 12950);
    assert.equal(read(w, "ShuTournament.standings(s.tournament)[0].id"), "player");
    w.save();
    const resultsSave = JSON.parse(w.localStorage.getItem(saveKey));
    app.dispose(); app = boot(resultsSave); w = app.window;
    assert.match(w.document.querySelector("#tournamentTitle").textContent, /結果/);
    click(w, '[data-tournament-action="finish"]');
    assert.equal(read(w, "s.tournament"), null);
    assert.equal(read(w, "s.money"), money + 1500, "only the first-place prize is added at results");
    assert.equal(read(w, "s.tournamentRecords.lakeFuna.wins"), 1);
    assert.equal(read(w, "sceneGameMinutes()"), 1525);
    assert.equal(w.document.querySelector("#weather").dataset.weather, "cloudy");
    assert.equal(read(w, "gameClockAt(sceneGameMinutes()).period"), "night");
    assert.ok(read(w, "currentSoundScene().music"), "ordinary map BGM returns");
    assert.equal(w.document.querySelector("#tournamentHud").hidden, true);
    launch(w); w.wait();
    assert.equal(read(w, "s.gameMinutes"), 1535, "ordinary casting continues at ten minutes");
    assert.equal(read(w, "s.baits.worm"), 10);
    assert.deepEqual(app.errors, []);
  } finally { app.dispose(); }
});

test("loading during the final throw consumes that paid attempt once and reaches results with zero catches", () => {
  let app = boot({ ...seed(), baits: { worm: 12 } }), w = app.window;
  try {
    enter(w);
    for (let i = 0; i < 8; i++) { launch(w); w.wait(); }
    launch(w);
    const saved = JSON.parse(w.localStorage.getItem(saveKey));
    assert.equal(saved.tournament.inFlight, true);
    app.dispose(); app = boot(saved); w = app.window;
    assert.equal(read(w, "s.tournament.phase"), "result");
    assert.equal(read(w, "s.tournament.inFlight"), false);
    assert.equal(read(w, "s.tournament.creel.length"), 0);
    assert.equal(read(w, "s.baits.worm"), 3);
    assert.equal(read(w, "s.gameMinutes"), 590);
    assert.deepEqual(read(w, "s.caught"), saved.caught);
    click(w, '[data-tournament-action="finish"]');
    assert.equal(read(w, "s.tournament"), null);
    assert.deepEqual(app.errors, []);
  } finally { app.dispose(); }
});

test("early exit, empty bait, old saves, movement and practice remain usable", () => {
  const app = boot({ ...seed(), baits: { worm: 0 } }), w = app.window;
  try {
    assert.equal(read(w, "s.tournament"), null);
    enter(w);
    const start = read(w, "[s.x,s.y]");
    w.move("right");
    assert.notDeepEqual(read(w, "[s.x,s.y]"), start);
    click(w, "#tournamentHud");
    click(w, '[data-tournament-action="confirm-withdraw"]');
    click(w, '[data-tournament-action="withdraw"]');
    assert.equal(read(w, "s.tournament.reason"), "withdrawn");
    click(w, "#tournamentClose");
    assert.equal(read(w, "s.gameMinutes"), 500);
    w.sleepAtPlayerHome();
    assert.equal(read(w, "s.gameMinutes"), 1800);
    w.openPracticePond(); w.beginFishing(); w.launchSurfaceCast();
    assert.equal(read(w, "battle.practice"), true);
    assert.equal(read(w, "s.baits.worm"), 0);
    assert.equal(read(w, "s.gameMinutes"), 1800);
    assert.deepEqual(app.errors, []);
  } finally { app.dispose(); }
});

test("emergency recovery closes tournament eligibility without losing the ordinary rescue clock", () => {
  const app = boot(), w = app.window;
  try {
    enter(w);
    launch(w); w.wait();
    assert.equal(read(w, "s.gameMinutes"), 510);
    w.resolveCatchHazard({ name: "カサゴ", hazardDamage: 100 });
    w.maybePresentTournament();
    assert.equal(read(w, "s.tournament.reason"), "rescue");
    assert.equal(read(w, "s.gameMinutes"), 1800);
    assert.equal(read(w, "s.hp"), 50);
    click(w, '[data-tournament-action="finish"]');
    assert.equal(read(w, "sceneGameMinutes()"), 1800);
    assert.equal(read(w, "s.tournament"), null);
    assert.deepEqual(app.errors, []);
  } finally { app.dispose(); }
});
