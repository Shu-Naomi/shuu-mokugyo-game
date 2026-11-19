'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs'), path = require('node:path'), crypto = require('node:crypto');
const runner = require('./browser-reference-village-evidence.cjs');
test('future browser checks pin the rebuilt runtime and agree with the workflow guard', () => {
  assert.equal(runner.runtimeTreeDigest(), runner.RUNTIME_TREE_SHA256);
  const workflow = fs.readFileSync(path.join(__dirname, '../../.github/workflows/reference-village-pilot.yml'), 'utf8');
  assert.ok(workflow.includes("if(digest!=='" + runner.RUNTIME_TREE_SHA256 + "')"));
  assert.equal((workflow.match(/github\.head_ref == 'codex\/village-safe-recovery-20261114'/g) || []).length, 2,
    'both browser jobs may run on this branch if a later PR is explicitly authorized');
  assert.equal(runner.FROZEN, 'fish-card-race-252-79');
});
test('the original reference painting stays byte-identical during preparation', () => {
  const bytes = fs.readFileSync(path.join(__dirname, '../assets/village-reference-pilot.png'));
  assert.equal(crypto.createHash('sha256').update(bytes).digest('hex'),
    '2bdd42f26e3f1ed82bfedee17466af59816c7bc597ac1b5358ecd2a17669e0a6');
});
