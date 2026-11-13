'use strict';
// Wait for the exact commit's deployment, not merely an older reachable site.
const PAGES_PATH = 'dynamic/pages/pages-build-deployment';
async function waitForPages({ repository, sha, token, fetchImpl = fetch,
  now = Date.now, sleep = ms => new Promise(resolve => setTimeout(resolve, ms)),
  timeoutMs = 15 * 60 * 1000, log = console.log }) {
  if (!repository || !sha || !token) throw new Error('Missing repository, commit or Actions token');
  const deadline = now() + timeoutMs;
  while (now() < deadline) {
    const url = `https://api.github.com/repos/${repository}/actions/runs?head_sha=${encodeURIComponent(sha)}&per_page=100`;
    const response = await fetchImpl(url, {
      headers: { Authorization: `Bearer ${token}`, Accept: 'application/vnd.github+json', 'X-GitHub-Api-Version': '2022-11-28' },
      signal: AbortSignal.timeout(30000),
    });
    if (!response.ok) throw new Error(`Pages status lookup failed: HTTP ${response.status}`);
    const data = await response.json();
    const runs = (data.workflow_runs || []).filter(run => run.path === PAGES_PATH && run.head_sha === sha)
      .sort((a, b) => b.id - a.id);
    const run = runs[0];
    if (run?.status === 'completed') {
      if (run.conclusion !== 'success') throw new Error(`Pages deployment ${run.id}: ${run.conclusion}`);
      log(`PAGES_DEPLOYMENT_READY ${sha} ${run.html_url || run.id}`);
      return run.id;
    }
    log(`PAGES_DEPLOYMENT_WAIT ${sha}: ${run ? run.status : 'not started'}`);
    await sleep(10000);
  }
  throw new Error(`Pages deployment not successful within ${timeoutMs / 1000}s for ${sha}`);
}
module.exports = { waitForPages };
if (require.main === module) waitForPages({repository: process.env.GITHUB_REPOSITORY,
  sha: process.env.GITHUB_SHA, token: process.env.GITHUB_TOKEN}).catch(error => {
  console.error(error.message); process.exitCode = 1;
});
