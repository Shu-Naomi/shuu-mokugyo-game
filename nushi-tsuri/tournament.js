/* Tournament rules and saved state. No random draws, inventory, clock or UI
 * side effects: the existing cast/catch flow remains their single owner. */
(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  else root.ShuTournament = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";
  const definitions = {
    lakeFuna: {
      id: "lakeFuna", name: "星湖フナ大会", fishId: "funa", fishName: "フナ",
      waterZones: ["lake"], venue: "星降る湖", duration: 90, castMinutes: 10,
      capacity: 5, fixedMinute: 360, periodLabel: "朝", rule: "totalLength",
      // Stage 1 has one transparent reference entry, not simulated villagers.
      references: [{ id: "sam", name: "サム（参考記録）",
        fish: [2450, 2200, 1950, 1750, 1600].map(hundredths => ({ hundredths })) }],
    },
  };
  const definition = value => definitions[typeof value === "string" ? value : value?.id] || null;
  const maxCasts = value => {
    const d = definition(value);
    return d ? Math.floor(d.duration / d.castMinutes) : 0;
  };
  function create(id, gameMinutes) {
    const d = definition(id);
    if (!d) return null;
    return { version: 1, id, phase: "active", startMinutes: Math.max(0, Math.floor(gameMinutes)),
      casts: 0, inFlight: false, creel: [], pending: null, reason: "", recoveredCast: false };
  }
  function specimen(value, d) {
    return value?.fishId === d.fishId && Number.isSafeInteger(value.hundredths) &&
      value.hundredths > 0 && value.hundredths <= 100000
      ? { fishId: value.fishId, hundredths: value.hundredths } : null;
  }
  function normalize(value) {
    const d = definition(value);
    if (!d || value.version !== 1 || !Number.isFinite(value.startMinutes) ||
        value.startMinutes < 0) return null;
    const state = create(d.id, value.startMinutes);
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
    return d ? rank([{ id: "player", name: "あなた", fish: state.creel }, ...d.references]) : [];
  }
  const cm = hundredths => (hundredths / 100).toFixed(2);
  return { definitions, definition, create, normalize, maxCasts, elapsed, remaining,
    sceneMinutes, canCast, commitCast, finishCast, choose, finishEarly, score, rank, standings, cm };
});
