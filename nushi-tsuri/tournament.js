/* Tournament rules and saved state. No player RNG, inventory, clock or UI
 * side effects: the existing cast/catch flow remains their single owner. */
(function (root, factory) {
  const api = factory(typeof module === "object" && module.exports
    ? require("./tournament-npcs.js") : root.ShuTournamentNpcs);
  if (typeof module === "object" && module.exports) module.exports = api;
  else root.ShuTournament = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function (Npcs) {
  "use strict";
  // Keep the accepted prize rules with each entry, independently of the NPC
  // save format. Older rounds retain their original free, prize-free terms.
  const rewardRules = {
    1: {
      entryFee: 3000,
      prizes: {
        first: { money: 1500, items: { starGrapes: 3 }, baits: { liveMinnow: 3 } },
        second: { money: 800, items: { starGrapes: 1 }, baits: { shrimp: 3 } },
        third: { money: 300, items: {}, baits: { shrimp: 2 } },
        participation: { money: 0, items: {}, baits: { worm: 3 } },
        none: { money: 0, items: {}, baits: {} },
      },
    },
  };
  const definitions = {
    lakeFuna: {
      id: "lakeFuna", name: "星湖フナ大会", fishId: "funa", fishName: "フナ",
      waterZones: ["lake"], venue: "星降る湖", duration: 90, castMinutes: 10,
      capacity: 5, fixedMinute: 360, periodLabel: "朝", rule: "totalLength",
      rewardRulesVersion: 1, trophyName: "星湖フナ杯",
      npcProfiles: [
        { id: "gen", count: [4, 6], length: [1700, 3000], total: [9000, 11000] },
        { id: "mina", count: [3, 5], length: [1600, 3200], total: [6500, 10500] },
        { id: "take", count: [2, 5], length: [1300, 2900], total: [3800, 9300] },
        { id: "haru", count: [1, 4], length: [1000, 2800], total: [1800, 7600] },
      ],
      // Preserve the opponent of a v174 tournament already in progress.
      references: [{ id: "sam", name: "サム（参考記録）",
        fish: [2450, 2200, 1950, 1750, 1600].map(hundredths => ({ hundredths })) }],
    },
  };
  const definition = value => {
    const id = typeof value === "string" ? value : value?.id;
    return Object.prototype.hasOwnProperty.call(definitions, id) ? definitions[id] : null;
  };
  const maxCasts = value => {
    const d = definition(value);
    return d ? Math.floor(d.duration / d.castMinutes) : 0;
  };
  function create(id, gameMinutes, seed = Number(gameMinutes) ^ 0x75af128d) {
    const d = definition(id);
    if (!d) return null;
    return { version: 2, id, phase: "active", startMinutes: Math.max(0, Math.floor(gameMinutes)),
      rewardRulesVersion: d.rewardRulesVersion,
      seed: Number(seed) >>> 0, participants: Npcs.generate(d, seed),
      casts: 0, inFlight: false, creel: [], pending: null, reason: "", recoveredCast: false };
  }
  function specimen(value, d) {
    return value?.fishId === d.fishId && Number.isSafeInteger(value.hundredths) &&
      value.hundredths > 0 && value.hundredths <= 100000
      ? { fishId: value.fishId, hundredths: value.hundredths } : null;
  }
  function normalize(value) {
    const d = definition(value);
    if (!d || ![1, 2].includes(value.version) || !Number.isFinite(value.startMinutes) ||
        value.startMinutes < 0) return null;
    const state = create(d.id, value.startMinutes, value.seed);
    state.version = value.version;
    state.rewardRulesVersion = value.version === 2 &&
      Object.prototype.hasOwnProperty.call(rewardRules, value.rewardRulesVersion)
      ? value.rewardRulesVersion : 0;
    state.participants = value.version === 1 ? [] : Npcs.normalize(value.participants, d, state.seed);
    state.casts = Math.min(maxCasts(d), Math.max(0, Math.floor(Number(value.casts) || 0)));
    state.creel = (Array.isArray(value.creel) ? value.creel : [])
      .map(f => specimen(f, d)).filter(Boolean).slice(0, Math.min(d.capacity, state.casts));
    state.pending = state.creel.length === d.capacity && state.casts > d.capacity
      ? specimen(value.pending, d) : null;
    state.phase = value.phase === "result" ? "result" : "active";
    state.reason = ["complete", "withdrawn", "rescue"].includes(value.reason) ? value.reason : "";
    // A cast's bait and ten minutes were saved before flight. Loading consumes
    // that attempt, never retries it for free or invents an uncaught specimen.
    state.recoveredCast = Boolean(value.inFlight || value.recoveredCast);
    if (state.pending) state.phase = "active";
    else completeIfReady(state);
    return state;
  }
  function elapsed(state) {
    return definition(state) ? state.casts * definition(state).castMinutes : 0;
  }
  function remaining(state) {
    return Math.max(0, (definition(state)?.duration || 0) - elapsed(state));
  }
  function sceneMinutes(state, ordinaryMinutes) {
    const d = definition(state);
    return d ? Math.floor(state.startMinutes / 1440) * 1440 + d.fixedMinute : ordinaryMinutes;
  }
  function canCast(state, zone) {
    const d = definition(state);
    return Boolean(d && state.phase === "active" && !state.pending && !state.inFlight &&
      state.casts < maxCasts(d) && d.waterZones.includes(zone));
  }
  function commitCast(state, zone) {
    if (!canCast(state, zone)) return false;
    state.casts += 1;
    state.inFlight = true;
    state.recoveredCast = false;
    return true;
  }
  function completeIfReady(state) {
    if (!state.inFlight && !state.pending && state.casts >= maxCasts(state)) {
      state.phase = "result";
      state.reason ||= "complete";
    }
  }
  function finishCast(state, caughtSpecimen = null) {
    const d = definition(state);
    if (!d || state.phase !== "active" || !state.inFlight) return "none";
    state.inFlight = false;
    const f = specimen(caughtSpecimen, d);
    let outcome = "none";
    if (f) {
      if (state.creel.length < d.capacity) { state.creel.push(f); outcome = "kept"; }
      else { state.pending = f; outcome = "choice"; }
    }
    completeIfReady(state);
    return outcome;
  }
  function choose(state, replaceIndex = null) {
    if (!state?.pending || state.phase !== "active") return false;
    if (replaceIndex !== null) {
      if (!Number.isInteger(replaceIndex) || replaceIndex < 0 || replaceIndex >= state.creel.length)
        return false;
      state.creel[replaceIndex] = state.pending;
    }
    state.pending = null;
    completeIfReady(state);
    return true;
  }
  function finishEarly(state, reason = "withdrawn") {
    if (!definition(state) || state.inFlight || state.pending) return false;
    state.phase = "result";
    state.reason = reason;
    return true;
  }
  function score(fish) {
    const lengths = fish.map(f => f.hundredths);
    return { count: lengths.length, total: lengths.reduce((a, b) => a + b, 0),
      largest: Math.max(0, ...lengths) };
  }
  function rank(entries) {
    const rows = entries.map(entry => ({ ...entry, ...score(entry.fish) }))
      .sort((a, b) => b.total - a.total || b.largest - a.largest);
    for (let i = 0; i < rows.length; i++) {
      const previous = rows[i - 1];
      rows[i].rank = previous && previous.total === rows[i].total && previous.largest === rows[i].largest
        ? previous.rank : i + 1;
    }
    return rows;
  }
  function standings(state) {
    const d = definition(state);
    if (!d) return [];
    const opponents = state.version === 1 ? d.references : (state.participants || []).map(record => ({
      id: record.id, name: Npcs.byId(record.id)?.name || record.id,
      fish: Npcs.creel(record, completedCasts(state), d.capacity, d.fishId),
    }));
    return rank([{ id: "player", name: "あなた", fish: state.creel }, ...opponents]);
  }
  function completedCasts(state) {
    return Math.max(0, (state?.casts || 0) - (state?.inFlight ? 1 : 0));
  }
  function gathering(state, gameMinutes) {
    return state?.version === 2 && state.phase === "result" && !state.pending
      ? { endedAt: gameMinutes, expiresAt: gameMinutes + 60, tournament: normalize(state) } : null;
  }
  function normalizeGathering(value, gameMinutes) {
    if (!value || !Number.isFinite(value.endedAt) || value.endedAt > gameMinutes ||
        !Number.isFinite(value.expiresAt) || value.expiresAt <= gameMinutes ||
        value.expiresAt > value.endedAt + 60) return null;
    const tournament = normalize(value.tournament);
    return tournament?.version === 2 && tournament.phase === "result"
      ? { endedAt: value.endedAt, expiresAt: value.expiresAt, tournament } : null;
  }
  function rulesFor(value) {
    const candidate = typeof value === "string" ? definition(value) : value;
    return definition(value) && candidate?.version !== 1 && Object.prototype.hasOwnProperty.call(rewardRules, candidate?.rewardRulesVersion)
      ? rewardRules[candidate.rewardRulesVersion] : null;
  }
  const entryFee = value => rulesFor(value)?.entryFee || 0;
  function prize(value, tier) {
    const prizes = rulesFor(value)?.prizes;
    const reward = prizes && Object.prototype.hasOwnProperty.call(prizes, tier) ? prizes[tier] : null;
    return reward ? { money: reward.money, items: { ...reward.items }, baits: { ...reward.baits } }
      : { money: 0, items: {}, baits: {} };
  }
  function resultReward(state) {
    if (!definition(state) || state.phase !== "result" || state.pending || state.inFlight) return null;
    const player = standings(state).find(row => row.id === "player");
    const eligible = Boolean(rulesFor(state));
    const completed = state.reason === "complete" && state.casts === maxCasts(state);
    const ranked = eligible && completed && player.count > 0;
    const tier = ranked && player.rank <= 3 ? ["first", "second", "third"][player.rank - 1]
      : eligible && state.casts > 0 ? "participation" : "none";
    return { ...prize(state, tier), tier, eligible, completed, ranked,
      rank: player.rank, score: score(state.creel), trophy: ranked && player.rank === 1 };
  }
  const safeCount = (value, max = Number.MAX_SAFE_INTEGER) =>
    Number.isSafeInteger(value) && value >= 0 ? Math.min(value, max) : 0;
  function normalizeRecords(value) {
    const records = {};
    for (const d of Object.values(definitions)) {
      const old = value?.[d.id], played = safeCount(old?.played), completed = Math.min(played, safeCount(old?.completed));
      const wins = Math.min(completed, safeCount(old?.wins));
      const bestRank = Number.isInteger(old?.bestRank) && old.bestRank >= 1 && old.bestRank <= 5
        ? old.bestRank : null;
      const last = old?.last;
      records[d.id] = {
        played, completed, wins,
        bestRank: completed ? bestRank : null,
        bestTotal: completed ? safeCount(old?.bestTotal, d.capacity * 100000) : 0,
        bestLargest: completed ? safeCount(old?.bestLargest, 100000) : 0,
        firstWinAt: wins && Number.isSafeInteger(old?.firstWinAt) && old.firstWinAt >= 0 ? old.firstWinAt : null,
        last: played && last && Number.isSafeInteger(last.at) && last.at >= 0 &&
          Number.isInteger(last.rank) && last.rank >= 1 && last.rank <= 5 &&
          ["complete", "withdrawn", "rescue"].includes(last.reason)
          ? { at: last.at, rank: last.rank, reason: last.reason,
            total: safeCount(last.total, d.capacity * 100000), count: safeCount(last.count, d.capacity) }
          : null,
      };
    }
    return records;
  }
  function recordResult(records, state, gameMinutes) {
    const next = normalizeRecords(records), reward = resultReward(state);
    if (!reward?.eligible) return next;
    const record = next[state.id], at = safeCount(gameMinutes);
    record.played = safeCount(record.played + 1);
    if (reward.completed) {
      record.completed = safeCount(record.completed + 1);
      record.bestTotal = Math.max(record.bestTotal, reward.score.total);
      record.bestLargest = Math.max(record.bestLargest, reward.score.largest);
    }
    if (reward.ranked) record.bestRank = Math.min(record.bestRank || reward.rank, reward.rank);
    if (reward.trophy) {
      record.wins = safeCount(record.wins + 1);
      record.firstWinAt ??= at;
    }
    record.last = { at, rank: reward.rank, reason: state.reason,
      total: reward.score.total, count: reward.score.count };
    return next;
  }
  const cm = hundredths => (hundredths / 100).toFixed(2);
  return { definitions, definition, create, normalize, maxCasts, elapsed, remaining,
    sceneMinutes, canCast, commitCast, finishCast, choose, finishEarly, score, rank, standings,
    completedCasts, gathering, normalizeGathering, entryFee, prize, resultReward,
    normalizeRecords, recordResult, cm };
});
