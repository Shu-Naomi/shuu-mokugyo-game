const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs"), path = require("node:path");
const { createCanvas, loadImage } = require("@napi-rs/canvas");
const T = require("../tournament.js"), N = require("../tournament-npcs.js");
const { boot, seed, read, saveKey } = require("./game-harness.cjs");
const click = (w, selector) => { const b = w.document.querySelector(selector); assert.ok(b, selector); b.click(); };
function enter(w) {
  w.eval('renderSamShop(); open("store")'); click(w, "#tournamentOffer");
  click(w, '[data-tournament-action="start"]');
}

test("four independent nine-cast plans stay within believable per-person lengths, totals and capacity", () => {
  const d = T.definition("lakeFuna");
  const totals = N.roster.map(n => ({ id: n.id, values: [] }));
  for (let seed = 0; seed < 1000; seed++) {
    const t = T.create("lakeFuna", 360, seed * 173 + 11);
    assert.equal(t.participants.length, 4);
    assert.equal(new Set(t.participants.map(p => p.id)).size, 4);
    for (const p of t.participants) {
      const profile = d.npcProfiles.find(n => n.id === p.id);
      assert.ok(p.catches.length >= profile.count[0] && p.catches.length <= profile.count[1]);
      assert.equal(new Set(p.catches.map(c => c.cast)).size, p.catches.length);
      for (const c of p.catches) {
        assert.ok(c.cast >= 1 && c.cast <= 9);
        assert.ok(c.hundredths >= profile.length[0] && c.hundredths <= profile.length[1]);
      }
    }
    for (let cast = 0; cast <= 9; cast++) {
      t.casts = cast;
      const rows = T.standings(t);
      assert.equal(rows.length, 5);
      for (const row of rows.filter(r => r.id !== "player")) {
        assert.ok(row.count <= Math.min(cast, 5), "no future catches or sixth creel slot");
        if (cast === 9) {
          const profile = d.npcProfiles.find(p => p.id === row.id);
          assert.ok(row.total >= profile.total[0] && row.total <= profile.total[1]);
          totals.find(p => p.id === row.id).values.push(row.total);
        }
      }
    }
    t.casts = 1; t.inFlight = true;
    assert.ok(T.standings(t).every(r => r.count === 0), "opponents resolve only after the cast ends");
  }
  assert.ok(totals.every(p => new Set(p.values).size > 100), "the contestants vary between events");
  const expertMean = totals[0].values.reduce((a, b) => a + b, 0) / 1000;
  assert.ok(expertMean > 9700 && expertMean < 10300, "expert stays close to v174's 99.50 cm challenge");
});

test("normalizing or reloading preserves opponents; v174 rounds keep the originally accepted reference", () => {
  const t = T.create("lakeFuna", 1000, 123456);
  t.casts = 5; t.creel = [{ fishId: "funa", hundredths: 2300 }];
  assert.deepEqual(T.normalize(JSON.parse(JSON.stringify(t))), t);
  assert.deepEqual(T.standings(T.normalize(t)), T.standings(t));
  const old = { ...t, version: 1 }; delete old.participants; delete old.seed;
  const resumed = T.normalize(old);
  assert.equal(resumed.version, 1);
  assert.deepEqual(T.standings(resumed).map(r => r.id).sort(), ["player", "sam"]);
  assert.equal(T.standings(resumed).find(r => r.id === "sam").total, 9950);
  assert.equal(T.gathering({ ...resumed, phase: "result" }, 1000), null);
  const broken = { ...t, participants: [{ id: "gen", catches: [{ cast: 12, hundredths: Infinity }] }] };
  assert.deepEqual(T.normalize(broken).participants, t.participants, "invalid plans rebuild from the same private seed");
});

test("talk uses catch progress and final rank, offers varied replies, and never re-rolls fish", () => {
  for (const npc of N.roster) {
    const cases = [
      { completedCasts: 0, count: 0 },
      { completedCasts: 3, count: 0 },
      { completedCasts: 5, count: 2, caughtLast: true },
      { completedCasts: 5, count: 2, caughtLast: false },
      { after: true, reason: "complete", playerCount: 5, playerRank: 1, npcRank: 2 },
      { after: true, reason: "complete", playerCount: 2, playerRank: 4, npcRank: 2 },
      { after: true, reason: "complete", playerCount: 3, playerRank: 2, npcRank: 4 },
      { after: true, reason: "complete", playerCount: 3, playerRank: 2, npcRank: 2 },
      { after: true, reason: "complete", playerCount: 0, playerRank: 5, npcRank: 1 },
      { after: true, reason: "withdrawn", playerCount: 0, playerRank: 5, npcRank: 1 },
    ];
    for (const context of cases) {
      const first = N.dialogue(npc.id, context, "", 0);
      assert.ok(first);
      assert.notEqual(N.dialogue(npc.id, context, first, 0), first);
    }
    assert.match(N.dialogue(npc.id, cases[4], "", 0), /優勝おめでとう/);
    assert.doesNotMatch(N.dialogue(npc.id, cases[8], "", 0), /負け|勝ち|優勝/);
  }
});

test("map A conversation, turn-taking, owned input, partial rankings and save resume use real UI", () => {
  let app = boot({ ...seed(), x: 155, y: 28, direction: "down" }), w = app.window;
  try {
    enter(w);
    assert.equal(w.document.querySelector("#tournamentNpcLayer").hidden, false);
    assert.equal(w.document.querySelectorAll("[data-tournament-npc]").length, 4);
    const before = read(w, "({money:s.money,baits:s.baits,caught:s.caught,minutes:s.gameMinutes,participants:s.tournament.participants})");
    w.eval("Math.random=()=>{throw Error('NPC dialogue must not use fishing RNG')}");
    assert.equal(read(w, "nearbyTournamentNpc().id"), "gen");
    w.action();
    assert.equal(w.document.querySelector("#tournamentTalk").classList.contains("open"), true);
    assert.equal(w.document.querySelector("#tournamentTalkName").textContent, "源じい");
    const first = w.document.querySelector("#tournamentTalkLine").textContent;
    click(w, "#tournamentTalkMore");
    assert.notEqual(w.document.querySelector("#tournamentTalkLine").textContent, first);
    w.action(); w.move("down");
    assert.equal(read(w, "battle"), null, "A does not cast through dialogue");
    assert.deepEqual(read(w, "[s.x,s.y]"), [155, 28]);
    assert.deepEqual(read(w, "({money:s.money,baits:s.baits,caught:s.caught,minutes:s.gameMinutes,participants:s.tournament.participants})"), before);
    w.dispatchEvent(new w.KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
    assert.equal(w.document.querySelector("#tournamentTalk").classList.contains("open"), false);
    w.eval("Math.random=()=>.999999; s.x=155;s.y=31;s.direction='left';render()");
    assert.equal(read(w, "nearbyTournamentNpc()"), null, "facing the lake away from an NPC still selects fishing");
    w.action();
    assert.equal(read(w, "battle.phase"), "prep");
    w.beginFishing(); w.launchSurfaceCast(); w.wait();
    const standings = read(w, "ShuTournament.standings(s.tournament)");
    w.save(); const saved = JSON.parse(w.localStorage.getItem(saveKey));
    app.dispose(); app = boot(saved); w = app.window;
    assert.deepEqual(read(w, "ShuTournament.standings(s.tournament)"), standings);
    assert.equal(w.document.querySelectorAll("[data-tournament-npc]").length, 4);
    assert.deepEqual(app.errors, []);
  } finally { app.dispose(); }
});

test("the gathering restores normal time/music, persists congratulations and clears after an hour or new event", () => {
  const t = T.create("lakeFuna", 500, 94);
  t.casts = 9; t.phase = "result"; t.reason = "complete";
  t.creel = Array.from({ length: 5 }, () => ({ fishId: "funa", hundredths: 3000 }));
  let app = boot({ ...seed(), tournament: t, gameMinutes: 590, x: 155, y: 28, direction: "down" }), w = app.window;
  try {
    click(w, '[data-tournament-action="finish"]');
    assert.equal(read(w, "s.tournament"), null);
    assert.equal(read(w, "sceneGameMinutes()"), 590);
    assert.ok(read(w, "currentSoundScene().music"));
    assert.equal(w.document.querySelector("#tournamentNpcLayer").hidden, false);
    w.action();
    assert.match(w.document.querySelector("#tournamentTalkLine").textContent, /優勝おめでとう|見事/);
    assert.match(w.document.querySelector("#tournamentTalkStatus").textContent, /大会結果/);
    w.close(); w.save(); const saved = JSON.parse(w.localStorage.getItem(saveKey));
    app.dispose(); app = boot(saved); w = app.window;
    assert.equal(w.document.querySelector("#tournamentNpcLayer").hidden, false);
    assert.equal(read(w, "s.tournamentGathering.tournament.creel.length"), 5);
    w.eval("s.gameMinutes=649;render()");
    assert.equal(w.document.querySelector("#tournamentNpcLayer").hidden, false);
    w.eval("s.gameMinutes=650;render()");
    assert.equal(read(w, "s.tournamentGathering"), null);
    assert.equal(w.document.querySelector("#tournamentNpcLayer").hidden, true);
    enter(w);
    assert.equal(read(w, "s.tournamentGathering"), null);
    assert.equal(read(w, "s.tournament.version"), 2);
    assert.deepEqual(app.errors, []);
  } finally { app.dispose(); }
});

test("all placements are dry, face reachable water, allow approach on every movement grid and preserve existing paths", () => {
  const app = boot(), w = app.window;
  try {
    for (const npc of N.venues.lakeFuna) {
      assert.equal(w.isWalkableWorld(npc.x, npc.y), true, npc.id);
      assert.equal(w.fishingWaterNearPlayer(npc.x, npc.y, npc.id === "mina" || npc.id === "take" ? "up" : npc.facing)?.zone, "lake");
      for (let ox = 0; ox < 4; ox++) for (let oy = 0; oy < 4; oy++) {
        const approaches = [];
        for (let x = ox; x < 240; x += 4) for (let y = oy; y < 135; y += 4)
          if (Math.hypot(x - npc.x, y - npc.y) <= 6.5 && w.isWalkableWorldSegment(x, y, npc.x, npc.y)) approaches.push([x, y]);
        assert.ok(approaches.length, `${npc.id} grid ${ox},${oy}`);
      }
    }
    enter(w); w.eval("Math.random=()=>.999999;s.x=155;s.y=20;s.direction='down';render()");
    for (let i = 0; i < 6; i++) w.move("down");
    assert.deepEqual(read(w, "[s.x,s.y]"), [155, 44], "NPCs never reinstate the invisible path obstruction");
    assert.deepEqual(app.errors, []);
  } finally { app.dispose(); }
});

test("the actual transparent atlas renders every fishing and talking pose, with both modules cached offline", async () => {
  const root = path.join(__dirname, "..");
  const atlas = await loadImage(path.join(root, N.asset));
  for (const npc of N.roster) for (const talking of [false, true]) {
    const canvas = createCanvas(96, 128);
    assert.equal(N.draw(canvas, atlas, npc.id, { talking }), true);
    const data = canvas.getContext("2d").getImageData(0, 0, 96, 128).data;
    let opaque = 0, transparent = 0;
    for (let i = 3; i < data.length; i += 4) { if (data[i] > 64) opaque++; else transparent++; }
    assert.ok(opaque > (npc.id === "haru" ? 1400 : 2200), `${npc.id} ${talking}: a full visible character`);
    assert.ok(transparent > 2200, "transparent padding, no baked checkerboard");
  }
  const html = fs.readFileSync(path.join(root, "index.html"), "utf8"), sw = fs.readFileSync(path.join(root, "sw.js"), "utf8");
  for (const source of ["tournament-npcs.js?v=175-1", "tournament.js?v=175-1"]) {
    assert.ok(html.includes(source)); assert.ok(sw.includes(source));
  }
  assert.ok(sw.includes(N.asset));
});
