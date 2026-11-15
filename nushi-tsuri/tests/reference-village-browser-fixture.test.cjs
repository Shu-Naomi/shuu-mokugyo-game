'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const {boot,read,saveKey}=require('./game-harness.cjs');
const {legacyFixture,STORED_MUTATION_SEED,RESOURCE_EXPRESSION}=require('./browser-reference-village-evidence.cjs');
const mutation=require('../aquarium-mutations.js');
test('browser legacy fixture has a stable valid existing mutation identity without replacing crypto',()=>{
 const a=legacyFixture(),b=legacyFixture();
 assert.deepEqual(a,b);assert.ok(mutation.validSeed(a.petLife.mutationSeed));
 assert.equal(a.petLife.mutationSeed,STORED_MUTATION_SEED);
 assert.equal(mutation.prepare(a,()=>{throw Error('Existing mutation seed must not be regenerated');}),true);
});
test('independent normal/reference boots preserve the full compared economy including mutationSeed',()=>{
 const saved=legacyFixture(),raw=JSON.stringify(saved),normal=boot(saved),preview=boot(legacyFixture(),undefined,{url:'http://localhost/nushi-tsuri/?villageReference=1'});
 try{
  assert.deepEqual(normal.errors,[]);assert.deepEqual(preview.errors,[]);
  assert.deepEqual(read(preview.window,RESOURCE_EXPRESSION),read(normal.window,RESOURCE_EXPRESSION));
  for(const app of [normal,preview])assert.equal(read(app.window,'s.petLife.mutationSeed'),STORED_MUTATION_SEED);
  preview.window.save();assert.equal(preview.window.localStorage.getItem(saveKey),raw);
  assert.equal(JSON.parse(preview.window.localStorage.getItem(preview.window.ShuSaveSlots.keyFor(1))).petLife.mutationSeed,STORED_MUTATION_SEED);
 }finally{normal.dispose();preview.dispose();}
});
