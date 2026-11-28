'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs'), path = require('node:path'), crypto = require('node:crypto');
const { execFileSync } = require('node:child_process');
const runner = require('./browser-reference-village-evidence.cjs');
const repository = path.join(__dirname, '../..');
// This is a published v252-92 evidence fixture, not a hash of the candidate.
const frozenCommit = '12cf8855c00da8859ffc2399214545f0a7b1cee5';
function git(args) {
  return execFileSync('git', args, { cwd: repository, encoding: 'utf8', timeout: 30_000, env: { ...process.env, GIT_TERMINAL_PROMPT: '0' } }).trim();
}
test('the frozen village release stays pinned and agrees with the workflow guard', () => {
  try {
    git(['cat-file', '-e', frozenCommit + '^{commit}']);
  } catch (error) {
    // Actions' default shallow checkout may omit the archived commit.
    if (git(['rev-parse', '--is-shallow-repository']) !== 'true') throw error;
    git(['fetch', '--no-tags', '--depth=1', '--no-write-fetch-head', 'origin', frozenCommit]);
  }
  assert.equal(runner.runtimeTreeDigest(frozenCommit), runner.RUNTIME_TREE_SHA256);
  const workflow = fs.readFileSync(path.join(__dirname, '../../.github/workflows/reference-village-pilot.yml'), 'utf8');
  assert.ok(workflow.includes("if(digest!=='" + runner.RUNTIME_TREE_SHA256 + "')"));
  assert.equal((workflow.match(/github\.head_ref == 'codex\/village-safe-recovery-20261114'/g) || []).length, 2,
    'both browser jobs may run on this branch if a later PR is explicitly authorized');
  assert.equal(runner.FROZEN, 'map-offline-252-92');
});
test('the original reference painting stays byte-identical during preparation', () => {
  const bytes = fs.readFileSync(path.join(__dirname, '../assets/village-reference-pilot.png'));
  assert.equal(crypto.createHash('sha256').update(bytes).digest('hex'),
    '2bdd42f26e3f1ed82bfedee17466af59816c7bc597ac1b5358ecd2a17669e0a6');
});
