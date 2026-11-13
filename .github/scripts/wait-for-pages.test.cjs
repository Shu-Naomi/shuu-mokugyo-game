'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { waitForPages } = require('./wait-for-pages.cjs');
const run = (fields = {}) => ({ id: 7, path: 'dynamic/pages/pages-build-deployment', head_sha: 'abc', status: 'completed', conclusion: 'success', ...fields });
function harness(batches) {
  let time = 0, call = 0;
  return { repository: 'owner/repo', sha: 'abc', token: 'test', log: () => {},
    now: () => time, sleep: async ms => { time += ms; }, timeoutMs: 30000,
    fetchImpl: async (url, options) => {
      assert.match(url, /head_sha=abc/); assert.equal(options.headers.Authorization, 'Bearer test');
      return { ok: true, json: async () => ({workflow_runs: batches[Math.min(call++, batches.length - 1)]}) };
    } };
}
test('waits through missing, queued and running deployment to success', async () => {
  const options = harness([[], [run({status:'queued'})], [run({status:'in_progress'})], [run()]]);
  options.timeoutMs = 40000;
  assert.equal(await waitForPages(options), 7);
});
test('does not accept other commits or workflows', async () => {
  await assert.rejects(waitForPages(harness([[run({head_sha:'old'}), run({path:'.github/workflows/test.yml'})]])), /not successful/);
});
for (const conclusion of ['failure', 'cancelled', 'skipped', 'timed_out', null]) {
  test(`rejects deployment conclusion ${conclusion}`, async () => {
    await assert.rejects(waitForPages(harness([[run({conclusion})]])), /Pages deployment 7/);
  });
}
test('no deployment is not success', async () => {
  await assert.rejects(waitForPages(harness([[]])), /not successful/);
});
test('latest deployment wins over older success', async () => {
  await assert.rejects(waitForPages(harness([[run(),run({id:8,conclusion:'failure'})]])), /deployment 8: failure/);
});
test('API errors are not success', async () => {
  await assert.rejects(waitForPages({...harness([[]]), fetchImpl: async () => ({ok:false,status:403})}), /HTTP 403/);
});
test('requires credentials and exact commit', async () => {
  await assert.rejects(waitForPages({...harness([[]]),sha:''}), /Missing/);
});
