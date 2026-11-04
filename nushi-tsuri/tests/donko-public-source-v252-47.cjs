// Read-only deployment check. Run only after publication is separately authorized
// and merged; local implementation does not imply that the public site matches.
const fs = require('node:fs'), path = require('node:path'), crypto = require('node:crypto'), assert = require('node:assert/strict');
const root = path.resolve(__dirname, '..');
const base = process.env.DONKO_PUBLIC_BASE || 'https://shu-naomi.github.io/shuu-mokugyo-game/nushi-tsuri/';
const files = ['index.html','fish-additions.js','fish-art.js','fish-motion.js','fishing-duel.js','aquarium-life.js','sw.js',require('../fish-art.js').species.donko.asset];
const sha = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
async function main() {
  const expected = new Map(files.map(file => [file, sha(fs.readFileSync(path.join(root, file)))]));
  const pending = new Set(files), matched = [], lastObserved = {};
  const deadline = Date.now() + 15 * 60 * 1000;
  while (pending.size && Date.now() < deadline) {
    for (const file of [...pending]) try {
      const url = new URL(file, base); url.searchParams.set('donko-source', process.env.GITHUB_SHA || expected.get(file));
      const response = await fetch(url, { cache: 'no-store', signal: AbortSignal.timeout(15000) });
      const actual = response.ok ? sha(Buffer.from(await response.arrayBuffer())) : null;
      lastObserved[file] = { status: response.status, sha256: actual };
      if (response.ok && actual === expected.get(file)) {
        pending.delete(file); matched.push({ file, sha256: actual }); console.log('PUBLIC_DONKO_SOURCE_MATCH ' + file);
      } else console.log(`PUBLIC_DONKO_SOURCE_WAIT ${file} HTTP ${response.status} source=${actual || 'unavailable'}`);
    } catch (error) { lastObserved[file] = { error: error.name }; console.log(`PUBLIC_DONKO_SOURCE_WAIT ${file} ${error.name}`); }
    if (pending.size) await new Promise(resolve => setTimeout(resolve, 10000));
  }
  const directory = path.resolve(process.env.DONKO_EVIDENCE_DIR || path.join(__dirname, 'donko-evidence'));
  fs.mkdirSync(directory, { recursive: true });
  fs.writeFileSync(path.join(directory, 'public-source.json'), JSON.stringify({ commit: process.env.GITHUB_SHA, base, matched, pending: [...pending], lastObserved }, null, 2));
  assert.equal(pending.size, 0, 'published Donko files did not match: ' + [...pending].join(', '));
  console.log('PUBLIC_DONKO_SOURCE_PASS ' + matched.length);
}
module.exports = { files, sha };
if (require.main === module) main().catch(error => { console.error(error); process.exitCode = 1; });
