'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs'), path = require('node:path'), vm = require('node:vm');
const Migration = require('../village-save-migration.js');
const reference = require('../village-reference.js');
const otherRegions = ['coast', 'offshore', ...Object.keys(require('../mountain-region.js').regions)];
const options = { reference, otherRegions };
const save = () => ({ mapVersion: 102, mapRegion: 'village', x: 74, y: 39.5, direction: 'up',
  money: 4321, hp: 37, gameMinutes: 500, caught: { funa: 2 }, baits: { worm: 7 },
  dog: 'shuu', dogAffinity: { shuu: 44 }, questCompletions: 4,
  petLife: { boarding: [{ id: 'fixture-only-fish', name: '山川', age: 4 }] },
  futureFeature: { nested: [null, false, { text: '引用 " と }, [ ] \\ 改行\n' }] } });
function storage(initial = {}) {
  const values = new Map(Object.entries(initial)), reads = [], writes = [];
  return { values, reads, writes,
    getItem(key) { reads.push(key); return values.get(key) ?? null; },
    setItem(key, value) { writes.push(['set', key]); values.set(key, String(value)); },
    removeItem(key) { writes.push(['remove', key]); values.delete(key); } };
}
function preserved(value) {
  const copy = JSON.parse(JSON.stringify(value));
  for (const field of ['x', 'y', 'direction', Migration.marker]) delete copy[field];
  return copy;
}

test('production migration helper is pure on import and loaded only as a dependency of verified save-safe startup', () => {
  const source = fs.readFileSync(path.join(__dirname, '../village-save-migration.js'), 'utf8');
  const context = { globalThis: {} };
  for (const name of ['localStorage', 'sessionStorage', 'indexedDB', 'document', 'fetch']) {
    for (const target of [context, context.globalThis]) Object.defineProperty(target, name, {
      get() { throw Error('import must not access ' + name); }
    });
  }
  vm.runInNewContext(source, context);
  assert.equal(typeof context.globalThis.ShuVillageSaveMigration.plan, 'function');
  assert.deepEqual(Object.keys(context.globalThis), ['ShuVillageSaveMigration'], 'only public helper API is installed');
  assert.equal('write' in Migration, false); assert.equal('commit' in Migration, false);
  const html=fs.readFileSync(path.join(__dirname, '../index.html'),'utf8');
  const {JSDOM}=require('jsdom'),dom=new JSDOM(html);
  try {
    const scripts=[...dom.window.document.querySelectorAll('script')];
    const runtime=dom.window.document.getElementById('villageDeferredRuntime');
    assert.equal(runtime?.type,'text/plain','game cannot run before startup gate');
    const names=['village-save-migration','village-save-store','village-save-adapter','village-release-verifier','village-release-gate'];
    let previous=scripts.indexOf(runtime);
    const offline=require('./release-assets.cjs').releaseAssets();
    for(const name of names){
      offline.assertPageAsset(name+'.js');
      const index=scripts.findIndex(script=>script.getAttribute('src')?.startsWith(name+'.js?'));
      assert.ok(index>previous,name+' dependency order');previous=index;
    }
    for(const script of scripts.filter(script=>!script.src&&script.type!=='text/plain'))
      assert.doesNotMatch(script.textContent,/ShuVillageSaveMigration\.(?:plan|prepare|apply)\s*\(/,'inline bootstrap cannot invoke migration');
  } finally {dom.window.close();}
  const gate=fs.readFileSync(path.join(__dirname,'../village-release-gate.js'),'utf8');
  const verify=gate.indexOf('ShuVillageReleaseVerifier?.verify()'),acquire=gate.indexOf('await ShuVillageSaveStore.acquire'),imports=gate.indexOf('session.importSlot(slot)'),start=gate.indexOf('document.body.append(script)');
  assert.ok(verify>=0&&verify<acquire&&acquire<imports&&imports<start,'verification, exclusive acquisition and imports precede runtime');
  assert.match(gate,/if\(!check\?\.ok\)[^\n]*return;/,'failed verification stops before acquisition');
  assert.match(gate,/if\(!session.ok\)[^\n]*return;/,'failed lock stops before import');
});

test('village preparation changes only position, direction and distinct production marker', () => {
  const before = save(), raw = JSON.stringify(before), plan = Migration.plan(raw, options);
  assert.equal(plan.status, 'prepared'); assert.equal(plan.beforeRaw, raw);
  const after = JSON.parse(plan.afterRaw);
  assert.deepEqual(preserved(after), preserved(before));
  assert.deepEqual([after.x, after.y, after.direction],
    [reference.exits.home.return.x, reference.exits.home.return.y, reference.exits.home.return.direction]);
  assert.equal(reference.walkable(after.x, after.y), true);
  assert.equal(after[Migration.marker], Migration.layout);
  assert.equal(after.referenceVillageLayout, undefined);
  assert.equal(JSON.stringify(before), raw, 'input is not mutated');
  assert.equal(Object.isFrozen(plan), true); assert.equal(Object.isFrozen(plan.changedFields), true);
});

test('missing legacy region is village, without adding or resetting mapRegion or mapVersion', () => {
  const old = save(); delete old.mapRegion; delete old.mapVersion;
  const after = JSON.parse(Migration.plan(JSON.stringify(old), options).afterRaw);
  assert.equal(Object.hasOwn(after, 'mapRegion'), false); assert.equal(Object.hasOwn(after, 'mapVersion'), false);
  assert.equal(after.money, old.money);
});

test('already migrated save remains byte-identical and never teleports again', () => {
  const raw = ' \n' + JSON.stringify({ ...save(), x: 115, y: 79, [Migration.marker]: Migration.layout }, null, 2) + '\t';
  const result = Migration.plan(raw, options);
  assert.equal(result.status, 'unchanged'); assert.equal(result.afterRaw, raw);
  const once = Migration.plan(JSON.stringify(save()), options);
  assert.equal(Migration.plan(once.afterRaw, options).afterRaw, once.afterRaw);
});

for (const region of otherRegions) test('preserves all coordinates, vehicle state and progress in ' + region, () => {
  const before = { ...save(), mapRegion: region, x: 118, y: 104, boatActive: region === 'coast',
    ownedVehicles: ['canoe'], equipment: { vehicle: 'canoe' } };
  const result = Migration.plan(JSON.stringify(before), options), after = JSON.parse(result.afterRaw);
  assert.deepEqual(result.changedFields, [Migration.marker]);
  delete after[Migration.marker]; assert.deepEqual(after, before);
});

test('never overwrites an unknown layout or silently promotes a copied preview', () => {
  for (const version of ['future-v2', null, 5, false])
    assert.equal(Migration.plan(JSON.stringify({ ...save(), [Migration.marker]: version }), options).reason, 'unknown-layout-version');
  assert.equal(Migration.plan(JSON.stringify({ ...save(), referenceVillageLayout: 'source-11016-1' }), options).reason,
    'preview-save-requires-explicit-import');
  assert.equal(Migration.plan(JSON.stringify({ ...save(), referenceVillageLayout: 'source-11016-1',
    [Migration.marker]: Migration.layout }), options).reason, 'preview-save-requires-explicit-import');
});

test('unknown regions and inconsistent village boat state stop preparation', () => {
  for (const region of ['future-region', '', null, false, {}, []])
    assert.equal(Migration.plan(JSON.stringify({ ...save(), mapRegion: region }), options).reason, 'unknown-region');
  assert.equal(Migration.plan(JSON.stringify({ ...save(), mapRegion: 'coast' }), { reference, otherRegions: 'coast' }).ok, false);
  assert.equal(Migration.plan(JSON.stringify({ ...save(), boatActive: true }), options).reason, 'inconsistent-village-boat-state');
});

test('requires the reference arrival to exist, be finite, and be walkable', () => {
  const raw = JSON.stringify(save());
  for (const bad of [null, {}, { ...reference, source: { reference: 'other.png' } },
    { ...reference, walkable: () => false }, { ...reference, walkable() { throw Error('broken'); } },
    { ...reference, exits: { home: { return: { x: NaN, y: 4, direction: 'right' } } } }])
    assert.equal(Migration.plan(raw, { ...options, reference: bad }).ok, false);
});

test('corrupt roots and duplicate or escaped-duplicate top-level keys are rejected unchanged', () => {
  for (const raw of ['{broken', 'null', '[]', '5', '"save"', '', '{"x":1,"x":2}', '{"x":1,"\\u0078":2}',
    '{"villageLayoutVersion":"reference-11016-v1","villageLayoutVersion":"later"}']) {
    const result = Migration.plan(raw, options); assert.equal(result.ok, false, raw);
    assert.equal(result.afterRaw, undefined);
  }
  for (const raw of [undefined, 123, {}, []]) assert.equal(Migration.plan(raw, options).ok, false);
});

test('patches only top-level value spans, preserving every other raw byte and unsafe integer literal', () => {
  const raw = ' \n{ "x" : -0, "y":1e0, "direction":"up", "money":9007199254740993, "hp":1.2500, "future":{"x":99,"text":"} \\\" ["}, "array":[1,{"y":8}] }\n';
  const result = Migration.plan(raw, options);
  const prefix = raw.replace('"x" : -0', '"x" : ' + reference.exits.home.return.x)
    .replace('"y":1e0', '"y":' + reference.exits.home.return.y).replace('"direction":"up"', '"direction":"right"');
  const close = prefix.lastIndexOf('}');
  assert.equal(result.afterRaw, prefix.slice(0, close) + ',"' + Migration.marker + '":"' + Migration.layout + '"' + prefix.slice(close));
  assert.match(result.afterRaw, /9007199254740993/); assert.match(result.afterRaw, /1\.2500/);
  assert.doesNotThrow(() => JSON.parse(result.afterRaw));
});

test('handles empty objects, escaped property names and nested JSON deterministically', () => {
  const minimal = Migration.plan(' { } ', options); assert.equal(minimal.ok, true);
  assert.equal(JSON.parse(minimal.afterRaw).direction, 'right');
  for (let n = 0; n < 80; n++) {
    const before = { ...save(), nested: Array.from({ length: n % 7 }, (_, i) => ({ text: '\\"},[]:' + i, a: [n, null, true, {}] })) };
    let raw = JSON.stringify(before, null, n % 4);
    if (n % 2) raw = raw.replace('"x"', '"\\u0078"');
    const result = Migration.plan(raw, options); assert.equal(result.ok, true);
    assert.deepEqual(preserved(JSON.parse(result.afterRaw)), preserved(before));
    assert.equal(Migration.plan(result.afterRaw, options).afterRaw, result.afterRaw);
  }
});

test('both slots are read independently, backup bytes are exact, and all storage remains untouched', () => {
  const first = '  ' + JSON.stringify(save()), second = JSON.stringify({ ...save(), money: 2222, mapRegion: 'offshore' });
  const store = storage({ [Migration.keys[1]]: first, [Migration.keys[2]]: second,
    'nushi-inugoya-last-slot': '2', 'nushi-reference-village-pilot-v1-slot1': 'preview' });
  const before = [...store.values];
  for (const slot of [1, 2]) {
    const result = Migration.prepareSlot(store, slot, options);
    assert.equal(result.key, Migration.keys[slot]); assert.equal(result.backupRaw, slot === 1 ? first : second);
    assert.equal(result.backupKey, Migration.keys[slot] + ':before-' + Migration.layout);
    assert.equal(Migration.checkSnapshot(store, result).mayWrite, false, 'matching bytes do not authorize unsafe writes');
  }
  assert.deepEqual([...store.values], before); assert.deepEqual(store.writes, []);
  assert.deepEqual([...new Set(store.reads)], Object.values(Migration.keys));
});

test('empty and corrupt slots are not created or repaired; unavailable storage is explicit', () => {
  const store = storage({ [Migration.keys[2]]: '{broken' });
  assert.equal(Migration.prepareSlot(store, 1, options).status, 'empty');
  assert.equal(Migration.prepareSlot(store, 2, options).ok, false);
  assert.deepEqual(store.writes, []);
  const fail = { getItem() { throw Error('denied'); } };
  assert.equal(Migration.prepareSlot(fail, 1, options).reason, 'storage-unavailable');
  for (const slot of [0, 3, '1', null, '__proto__']) assert.throws(() => Migration.prepareSlot(store, slot, options), /numeric save slot/);
});

test('snapshot check detects any competing update or deletion, but is not a compare-and-swap', () => {
  const key = Migration.keys[1], raw = JSON.stringify(save()), store = storage({ [key]: raw });
  const prepared = Migration.prepareSlot(store, 1, options);
  assert.equal(Migration.checkSnapshot(store, prepared).status, 'snapshot-matches');
  store.values.set(key, raw + ' '); assert.equal(Migration.checkSnapshot(store, prepared).reason, 'save-changed');
  store.values.delete(key); assert.equal(Migration.checkSnapshot(store, prepared).reason, 'save-changed');
  assert.equal(Migration.checkSnapshot(store, {}).reason, 'invalid-preparation');
  assert.equal(Migration.checkSnapshot({ getItem() { throw Error(); } }, prepared).reason, 'storage-unavailable');
  assert.deepEqual(store.writes, []);
});
