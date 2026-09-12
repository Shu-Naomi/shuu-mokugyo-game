const { test } = require("node:test");
const assert = require("node:assert/strict");
const T = require("../tournament.js");
const { boot, seed, read, saveKey } = require("./game-harness.cjs");
const fish = hundredths => ({ fishId: "funa", hundredths });
const click = (w, selector) => {
  const button = w.document.querySelector(selector);
  assert.ok(button, `missing control: ${selector}`);
  button.click();
  return button;
};
function offer(w) {
  w.eval('renderSamShop(); open("store");');
  click(w, "#tournamentOffer");
}
const balances = w => read(w, "({money:s.money,items:s.items,baits:s.baits})");
const saved = w => JSON.parse(w.localStorage.getItem(saveKey));
function result(rank = 1) {
  const t = T.create("lakeFuna", 500, 12);
  Object.assign(t, { phase: "result", reason: "complete", casts: 9 });
  const opponents = T.standings(t).filter(row => row.id !== "player");
  const total = rank === 1 ? opponents[0].total + 1000 : rank === 5 ? 5 :
    Math.floor((opponents[rank - 2].total + opponents[rank - 1].total) / 2);
  t.creel = Array.from({ length: 5 }, (_, i) => fish(Math.floor(total / 5) + (i < total % 5 ? 1 : 0)));
  assert.equal(T.resultReward(t).rank, rank, "fixture uses the real NPC ranking");
  return t;
}

test("insufficient funds cannot enter; exact fee, repeated clicks and reload charge once", () => {
  let app = boot({ ...seed(), money: 2999 }), w = app.window;
  try {
    offer(w);
    const before = balances(w);
    const button = click(w, '[data-tournament-action="start"]');
    assert.equal(button.disabled, true);
    w.handleTournamentAction({ target: button });
    assert.equal(read(w, "s.tournament"), null);
    assert.deepEqual(balances(w), before);
    assert.match(w.document.querySelector(".tournament-entry-fee").textContent, /あと1円/);
    click(w, '[data-tournament-action="records"]');
    assert.match(w.document.querySelector("#tournamentTitle").textContent, /大会の記録/);
    click(w, '[data-tournament-action="entry"]');
    assert.deepEqual(balances(w), before, "viewing records does not spend money");
    app.dispose(); app = boot({ ...seed(), money: 3000 }); w = app.window;
    offer(w);
    const start = click(w, '[data-tournament-action="start"]');
    assert.equal(read(w, "s.money"), 0);
    w.handleTournamentAction({ target: start });
    assert.equal(read(w, "s.money"), 0);
    assert.equal(read(w, "s.tournament.rewardRulesVersion"), 1);
    const paid = saved(w);
    app.dispose(); app = boot(paid); w = app.window;
    assert.equal(read(w, "s.money"), 0);
    assert.equal(read(w, "s.tournament.casts"), 0);
    assert.deepEqual(app.errors, []);
  } finally { app.dispose(); }
});

test("all five ranks preview and award their exact money, food and bait once", () => {
  const expected = [
    { money: 1500, items: { starGrapes: 3 }, baits: { liveMinnow: 3 } },
    { money: 800, items: { starGrapes: 1 }, baits: { shrimp: 3 } },
    { money: 300, items: {}, baits: { shrimp: 2 } },
    { money: 0, items: {}, baits: { worm: 3 } },
    { money: 0, items: {}, baits: { worm: 3 } },
  ];
  for (let rank = 1; rank <= 5; rank++) {
    const original = { ...seed(), tournament: result(rank), items: { starGrapes: 2 } };
    const app = boot(original), w = app.window;
    try {
      const before = balances(w), ordinary = read(w, "({caught:s.caught,clock:s.gameMinutes})");
      w.renderTournament(); w.renderTournament();
      assert.deepEqual(balances(w), before, "preview grants nothing");
      assert.equal(read(w, "s.tournamentRecords.lakeFuna.played"), 0);
      const finish = click(w, '[data-tournament-action="finish"]');
      const after = structuredClone(before), prize = expected[rank - 1];
      after.money += prize.money;
      for (const kind of ["items", "baits"])
        for (const [id, count] of Object.entries(prize[kind])) after[kind][id] = (after[kind][id] || 0) + count;
      assert.deepEqual(balances(w), after, `rank ${rank}`);
      assert.deepEqual(read(w, "({caught:s.caught,clock:s.gameMinutes})"), ordinary);
      assert.equal(read(w, "s.tournament"), null);
      const record = read(w, "s.tournamentRecords.lakeFuna");
      assert.equal(record.played, 1); assert.equal(record.completed, 1);
      assert.equal(record.bestRank, rank); assert.equal(record.wins, rank === 1 ? 1 : 0);
      w.finishTournamentResults(); w.handleTournamentAction({ target: finish });
      assert.deepEqual(balances(w), after);
      assert.deepEqual(saved(w).tournamentRecords.lakeFuna, record);
      assert.equal(saved(w).tournament, null);
      assert.deepEqual(app.errors, []);
    } finally { app.dispose(); }
  }
});

test("genuine first-place tie receives the full prize and trophy", () => {
  const t = result(1);
  t.creel = T.standings(t).find(row => row.id !== "player").fish.map(f => ({ ...f }));
  assert.equal(T.standings(t).filter(row => row.rank === 1).length, 2);
  const reward = T.resultReward(t);
  assert.equal(reward.rank, 1); assert.equal(reward.trophy, true);
  assert.equal(reward.money, 1500);
  assert.deepEqual(reward.items, { starGrapes: 3 });
  const app = boot({ ...seed(), tournament: t }), w = app.window;
  try {
    assert.match(w.document.querySelector("#tournamentBody").textContent, /同率1位/);
    click(w, "#tournamentClose");
    assert.equal(read(w, "s.tournamentRecords.lakeFuna.wins"), 1);
    assert.equal(read(w, "s.money"), seed().money + 1500);
  } finally { app.dispose(); }
});

test("withdrawal, rescue and no target fish cannot claim a rank prize or trophy", () => {
  for (const [reason, casts, creel, tier] of [
    ["withdrawn", 0, [], "none"],
    ["withdrawn", 1, [fish(9999)], "participation"],
    ["rescue", 2, [fish(9999)], "participation"],
    ["complete", 9, [], "participation"],
  ]) {
    const t = Object.assign(result(1), { reason, casts, creel });
    const reward = T.resultReward(t);
    assert.equal(reward.tier, tier); assert.equal(reward.trophy, false);
    assert.equal(reward.money, 0);
    const app = boot({ ...seed(), money: 1321, tournament: t }), w = app.window;
    try {
      click(w, '[data-tournament-action="finish"]');
      assert.equal(read(w, "s.money"), 1321, "entry fee is not refunded");
      assert.equal(read(w, "s.baits.worm"), 7 + (casts ? 3 : 0));
      const record = read(w, "s.tournamentRecords.lakeFuna");
      assert.equal(record.played, 1); assert.equal(record.wins, 0);
      assert.equal(record.bestRank, null);
      assert.equal(record.completed, reason === "complete" ? 1 : 0);
    } finally { app.dispose(); }
  }
});

test("unpaid result survives reload; Escape settles once and saved trophies survive reopening", () => {
  let app = boot({ ...seed(), tournament: result(1) }), w = app.window;
  try {
    const before = balances(w);
    w.save(); const preview = saved(w);
    app.dispose(); app = boot(preview); w = app.window;
    assert.deepEqual(balances(w), before);
    assert.match(w.document.querySelector(".tournament-reward").textContent, /星湖フナ杯を獲得/);
    w.dispatchEvent(new w.KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
    const claimed = saved(w), after = balances(w);
    assert.equal(claimed.tournament, null);
    assert.equal(claimed.tournamentRecords.lakeFuna.wins, 1);
    app.dispose(); app = boot(claimed); w = app.window;
    w.finishTournamentResults(); w.maybePresentTournament();
    assert.deepEqual(balances(w), after);
    offer(w); click(w, '[data-tournament-action="records"]');
    assert.match(w.document.querySelector(".tournament-trophy").textContent, /獲得済み · 優勝1回/);
    assert.equal(w.document.querySelectorAll(".tournament-trophy:not(.locked)").length, 1);
    assert.match(w.tournamentInventoryTrophies(), /優勝1回/);
    assert.deepEqual(app.errors, []);
  } finally { app.dispose(); }
});

test("repeated paid wins retain one trophy and the first victory date", () => {
  const app = boot({ ...seed(), money: 10000, tournament: result(1) }), w = app.window;
  try {
    click(w, '[data-tournament-action="finish"]');
    const first = read(w, "s.tournamentRecords.lakeFuna.firstWinAt");
    offer(w); click(w, '[data-tournament-action="start"]');
    assert.equal(read(w, "s.money"), 8500);
    // Complete a second entered round through the real tournament rules.
    w.eval(`for(let i=0;i<9;i++) {
      ShuTournament.commitCast(s.tournament,"lake");
      ShuTournament.finishCast(s.tournament,i<5?{fishId:"funa",hundredths:3000}:null);
    } s.gameMinutes+=90; maybePresentTournament();`);
    click(w, '[data-tournament-action="finish"]');
    assert.equal(read(w, "s.money"), 10000);
    assert.equal(read(w, "s.tournamentRecords.lakeFuna.wins"), 2);
    assert.equal(read(w, "s.tournamentRecords.lakeFuna.played"), 2);
    assert.equal(read(w, "s.tournamentRecords.lakeFuna.firstWinAt"), first);
    offer(w); click(w, '[data-tournament-action="records"]');
    assert.equal(w.document.querySelectorAll(".tournament-trophy:not(.locked)").length, 1);
    assert.match(w.document.querySelector(".tournament-trophy").textContent, /優勝2回/);
    assert.equal(read(w, "s.items.starGrapes"), 6);
    assert.equal(read(w, "s.baits.liveMinnow"), 6);
    assert.deepEqual(app.errors, []);
  } finally { app.dispose(); }
});

test("both legacy tournament formats finish on original terms then enter the paid rules", () => {
  for (const version of [1, 2]) {
    const old = result(1); old.version = version; delete old.rewardRulesVersion;
    assert.equal(T.entryFee(T.normalize(old)), 0);
    const app = boot({ ...seed(), tournament: old }), w = app.window;
    try {
      const before = balances(w);
      assert.match(w.document.querySelector("#tournamentBody").textContent, /参加時の無料・賞品なし/);
      click(w, '[data-tournament-action="finish"]');
      assert.deepEqual(balances(w), before);
      assert.equal(read(w, "s.tournamentRecords.lakeFuna.played"), 0);
      offer(w); click(w, '[data-tournament-action="start"]');
      assert.equal(read(w, "s.money"), before.money - 3000);
      assert.equal(read(w, "s.tournament.rewardRulesVersion"), 1);
      assert.equal(read(w, "s.tournament.participants.length"), 4);
      assert.deepEqual(app.errors, []);
    } finally { app.dispose(); }
  }
});

test("failed storage leaves settlement intact in memory and retry saves a single award", () => {
  let app = boot({ ...seed(), tournament: result(1) }), w = app.window;
  try {
    w.save();
    const setItem = w.Storage.prototype.setItem;
    w.Storage.prototype.setItem = () => { throw new Error("quota exceeded"); };
    click(w, '[data-tournament-action="finish"]');
    const after = balances(w);
    assert.equal(w.document.querySelector("#saveStatus").hidden, false);
    assert.equal(read(w, "s.tournament"), null);
    w.finishTournamentResults();
    assert.deepEqual(balances(w), after);
    w.Storage.prototype.setItem = setItem;
    assert.equal(w.save(), true);
    const complete = saved(w);
    assert.equal(w.document.querySelector("#saveStatus").hidden, true);
    app.dispose(); app = boot(complete); w = app.window;
    w.finishTournamentResults();
    assert.deepEqual(balances(w), after);
    assert.equal(read(w, "s.tournamentRecords.lakeFuna.wins"), 1);
    assert.deepEqual(app.errors, []);
  } finally { app.dispose(); }
});

test("active or unresolved results cannot settle; malformed records normalize safely", () => {
  for (const patch of [{ phase: "active" }, { pending: fish(3000) }, { inFlight: true }]) {
    const t = Object.assign(result(1), patch);
    assert.equal(T.resultReward(t), null);
    assert.equal(T.recordResult(null, t, 500).lakeFuna.played, 0);
  }
  const records = T.normalizeRecords({ lakeFuna: {
    played: 2, completed: 8, wins: 9, bestRank: -1, bestTotal: NaN,
    bestLargest: Infinity, firstWinAt: -1,
    last: { at: 100, rank: 8, reason: "<script>" },
  }, unknown: { wins: 100 } });
  assert.deepEqual(records.lakeFuna, { played: 2, completed: 2, wins: 2,
    bestRank: null, bestTotal: 0, bestLargest: 0, firstWinAt: null, last: null });
  assert.deepEqual(Object.keys(records).sort(), Object.keys(T.definitions).sort());
  assert.deepEqual(T.prize("lakeFuna", "toString"), { money: 0, items: {}, baits: {} });
});
