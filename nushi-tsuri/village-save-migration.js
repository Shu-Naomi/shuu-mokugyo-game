/* Dormant production preparation. Not loaded by the game; never writes storage. */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.ShuVillageSaveMigration = api;
})(typeof globalThis === 'object' ? globalThis : this, function () {
  'use strict';
  const layout = 'reference-11016-v1';
  const marker = 'villageLayoutVersion';
  const keys = Object.freeze({ 1: 'nushi-inugoya-v2', 2: 'nushi-inugoya-v2-slot2' });
  const own = (object, key) => Object.prototype.hasOwnProperty.call(object, key);
  const blocked = reason => Object.freeze({ ok: false, status: 'blocked', reason });
  function keyFor(slot) {
    if (slot !== 1 && slot !== 2) throw new TypeError('Expected numeric save slot 1 or 2');
    return keys[slot];
  }

  // Locate only top-level values after validating the entire JSON document.
  // Unchanged fields retain their exact bytes, including unknown fields, number
  // spellings and integers too large for JavaScript to represent exactly.
  function objectFields(raw) {
    const fields = new Map();
    const space = i => { while (/\s/.test(raw[i] || '') && i < raw.length) i++; return i; };
    function stringEnd(i) {
      for (i++; i < raw.length; i++) {
        if (raw[i] === '\\') i++;
        else if (raw[i] === '"') return i + 1;
      }
      throw new SyntaxError('Unterminated string');
    }
    function valueEnd(i) {
      if (raw[i] === '"') return stringEnd(i);
      if (raw[i] !== '[' && raw[i] !== '{') {
        while (i < raw.length && !/[\s,}\]]/.test(raw[i])) i++;
        return i;
      }
      let depth = 0;
      for (; i < raw.length; i++) {
        if (raw[i] === '"') { i = stringEnd(i) - 1; continue; }
        if (raw[i] === '[' || raw[i] === '{') depth++;
        if (raw[i] === ']' || raw[i] === '}') {
          depth--;
          if (depth === 0) return i + 1;
        }
      }
      throw new SyntaxError('Unterminated value');
    }
    let cursor = space(raw.indexOf('{') + 1);
    while (raw[cursor] !== '}') {
      const end = stringEnd(cursor), name = JSON.parse(raw.slice(cursor, end));
      if (fields.has(name)) throw new SyntaxError('Duplicate top-level field: ' + name);
      const start = space(space(end) + 1), finish = valueEnd(start);
      fields.set(name, { start, end: finish });
      cursor = space(finish);
      if (raw[cursor] === ',') cursor = space(cursor + 1);
    }
    return { fields, close: cursor };
  }
  function patchFields(raw, parsed, changes) {
    const edits = [], additions = [];
    for (const [name, value] of Object.entries(changes)) {
      const field = parsed.fields.get(name), text = JSON.stringify(value);
      if (field) edits.push({ ...field, text });
      else additions.push(JSON.stringify(name) + ':' + text);
    }
    if (additions.length) edits.push({ start: parsed.close, end: parsed.close,
      text: (parsed.fields.size ? ',' : '') + additions.join(',') });
    for (const edit of edits.sort((a, b) => b.start - a.start))
      raw = raw.slice(0, edit.start) + edit.text + raw.slice(edit.end);
    return raw;
  }

  function plan(raw, options = {}) {
    if (raw === null) return Object.freeze({ ok: true, status: 'empty', beforeRaw: null, afterRaw: null });
    if (typeof raw !== 'string') return blocked('invalid-raw-type');
    let state, parsed;
    try {
      state = JSON.parse(raw);
      if (!state || typeof state !== 'object' || Array.isArray(state)) return blocked('invalid-save-root');
      parsed = objectFields(raw);
    } catch (_) { return blocked('invalid-or-ambiguous-json'); }
    // A copied preview is not accepted even if it also contains a production
    // marker. That mixed provenance needs a separate, explicit import decision.
    if (own(state, 'referenceVillageLayout')) return blocked('preview-save-requires-explicit-import');
    if (own(state, marker)) {
      if (state[marker] !== layout) return blocked('unknown-layout-version');
      return Object.freeze({ ok: true, status: 'unchanged', beforeRaw: raw, afterRaw: raw });
    }
    const region = own(state, 'mapRegion') ? state.mapRegion : 'village';
    if (region !== 'village' && (typeof region !== 'string' ||
        !Array.isArray(options.otherRegions) || !options.otherRegions.includes(region))) return blocked('unknown-region');
    const changes = { [marker]: layout };
    if (region === 'village') {
      if (state.boatActive === true) return blocked('inconsistent-village-boat-state');
      const reference = options.reference, arrival = reference?.exits?.home?.return;
      if (reference?.source?.reference !== '11016(1).png' ||
          !arrival || !Number.isFinite(arrival.x) || !Number.isFinite(arrival.y) ||
          !['up', 'down', 'left', 'right'].includes(arrival.direction) ||
          typeof reference.walkable !== 'function') return blocked('unverified-arrival');
      try { if (!reference.walkable(arrival.x, arrival.y)) return blocked('blocked-arrival'); }
      catch (_) { return blocked('unverified-arrival'); }
      Object.assign(changes, { x: arrival.x, y: arrival.y, direction: arrival.direction });
    }
    const afterRaw = patchFields(raw, parsed, changes);
    return Object.freeze({ ok: true, status: 'prepared', beforeRaw: raw, afterRaw,
      changedFields: Object.freeze(Object.keys(changes)), region });
  }

  function prepareSlot(storage, slot, options) {
    const key = keyFor(slot);
    let raw;
    try { raw = storage.getItem(key); } catch (_) { return blocked('storage-unavailable'); }
    const result = plan(raw, options);
    if (!result.ok) return result;
    return Object.freeze({ ...result, slot, key,
      backupKey: key + ':before-' + layout, backupRaw: raw });
  }

  function checkSnapshot(storage, preparation) {
    if (!preparation?.ok || preparation.key !== keys[preparation.slot] ||
        ![1, 2].includes(preparation.slot) ||
        (preparation.beforeRaw !== null && typeof preparation.beforeRaw !== 'string'))
      return blocked('invalid-preparation');
    try {
      if (storage.getItem(preparation.key) !== preparation.beforeRaw) return blocked('save-changed');
      return Object.freeze({ ok: true, status: 'snapshot-matches', mayWrite: false,
        reason: 'snapshot-is-not-a-lock-or-old-tab-exclusion' });
    } catch (_) { return blocked('storage-unavailable'); }
  }
  return Object.freeze({ layout, marker, keys, keyFor, plan, prepareSlot, checkSnapshot });
});
