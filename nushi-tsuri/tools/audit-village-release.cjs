#!/usr/bin/env node
'use strict';
/* Dormant, read-only release preparation tool. No application imports or execution.
 * Usage (repository root): node nushi-tsuri/tools/audit-village-release.cjs --baseline <published-commit>
 * Exit 1 means source/cache blockers; exit 0 is NOT approval to ship (see pendingGates).
 * Parser intentionally supports this repository's literal manifests, not arbitrary JS.
 */
const fs = require('node:fs');
const path = require('node:path');
const {execFileSync} = require('node:child_process');
const local = value => {
  if (/^(?:[a-z]+:|\/\/|#)/i.test(value)) return null;
  const normalized = value.replace(/^\.\//, '');
  return normalized && !normalized.startsWith('/') && !normalized.split(/[?#]/)[0].split('/').includes('..') ? normalized : null;
};
const fileOf = url => url.split(/[?#]/)[0];
function htmlUrls(html) {
  const urls = [];
  for (const tag of html.match(/<(?:script|link)\b[^>]*>/gi) || []) {
    if (/^<link/i.test(tag) && !/\brel\s*=\s*["']stylesheet["']/i.test(tag)) continue;
    const match = tag.match(/\b(?:src|href)\s*=\s*["']([^"']+)["']/i);
    if (match && local(match[1])) urls.push(local(match[1]));
  }
  return urls;
}
function manifest(sw) {
  const match = sw.match(/\bconst\s+CORE_ASSETS\s*=\s*\[([\s\S]*?)\]\s*;/);
  if (!match) throw new Error('CORE_ASSETS must be a literal array');
  const body = match[1].replace(/\/\/[^\n]*|\/\*[\s\S]*?\*\//g, '');
  const values = [...body.matchAll(/["']([^"'\n]+)["']/g)].map(m => m[1]);
  if (body.replace(/["'][^"'\n]+["']/g, '').replace(/[\s,]/g, '')) throw new Error('Unsupported computed CORE_ASSETS entry');
  return values.map(local).filter(Boolean);
}
function metadata(html, sw) {
  return {
    hud: html.match(/id=["']gameRelease["'][^>]*>\s*v([^<\s]+)/)?.[1] || null,
    registration: html.match(/serviceWorker\.register\(\s*["']\.\/sw\.js\?v=([^"']+)/)?.[1] || null,
    cache: sw.match(/\bconst\s+CACHE_NAME\s*=\s*["']([^"']+)/)?.[1] || null
  };
}
/** read(file) => UTF-8 source; exists(file) => boolean. changedPaths must be the
 * complete baseline-to-working-tree diff, including untracked dependencies. */
function audit({baseline, current, changedPaths}) {
  const findings = [];
  const add = (code, detail) => findings.push({code, detail});
  const html = current.read('index.html'), sw = current.read('sw.js');
  const oldHtml = baseline.read('index.html'), oldSw = baseline.read('sw.js');
  let precache = [], oldPrecache = [];
  try { precache = manifest(sw); oldPrecache = manifest(oldSw); }
  catch (error) { add('UNREADABLE_MANIFEST', error.message); }
  const discover = (snapshot, document) => {
    const urls = htmlUrls(document), dependencies = new Set(urls);
    const pilotSources = [...new Set(urls.map(fileOf))].filter(file => /\.js$/.test(file) && snapshot.exists(file))
      .filter(file => /ShuVillageReference|villageReference|village-reference/.test(snapshot.read(file)));
    // Apply identical discovery to both releases: an unprecached baseline asset
    // may still be stored by the worker's runtime cache or the browser cache.
    // Dynamic URLs and indirect module dependencies require separate review.
    for (const file of pilotSources) {
      for (const match of snapshot.read(file).matchAll(/["'`](\.?\/?assets\/[^"'`\s${}]+)["'`]/g)) {
        if (local(match[1]) && /\.(?:png|webp|jpe?g|gif|svg|mp3|ogg|wav|woff2?)(?:[?#].*)?$/i.test(match[1])) dependencies.add(local(match[1]));
      }
    }
    return {dependencies, pilotSources};
  };
  const {dependencies, pilotSources} = discover(current, html);
  const oldKnown = new Set([...oldPrecache, ...discover(baseline, oldHtml).dependencies]);
  const known = new Set([...precache, ...dependencies]);
  for (const file of pilotSources) {
    if (/^(?:<<<<<<< |=======\s*$|>>>>>>> )/m.test(current.read(file))) add('MERGE_CONFLICT', file);
  }
  for (const file of ['index.html', 'sw.js']) if (/^(?:<<<<<<< |=======\s*$|>>>>>>> )/m.test(current.read(file))) add('MERGE_CONFLICT', file);
  for (const url of dependencies) {
    if (!precache.includes(url)) add('MISSING_PRECACHE_DEPENDENCY', url);
    if (!current.exists(fileOf(url))) add('MISSING_DEPENDENCY_FILE', url);
  }
  for (const url of precache) if (!current.exists(fileOf(url))) add('MISSING_PRECACHE_FILE', url);
  const changed = new Set(changedPaths);
  for (const url of known) {
    if (changed.has(fileOf(url)) && !/\.html?$/.test(fileOf(url)) && oldKnown.has(url)) {
      add('CHANGED_SAME_URL', url + ' changed bytes but retains a previously loaded/cacheable URL');
    }
  }
  const release = metadata(html, sw), previousRelease = metadata(oldHtml, oldSw);
  if (!release.hud || !release.registration || !release.cache || release.hud !== release.registration || !release.cache.endsWith('-' + release.hud)) {
    add('RELEASE_METADATA_MISMATCH', JSON.stringify(release));
  }
  if (changedPaths.some(file => file === 'index.html' || [...known].some(url => fileOf(url) === file)) && release.cache === previousRelease.cache) {
    add('UNCHANGED_CACHE_NAMESPACE', release.cache || 'missing cache name');
  }
  const pendingGates = [
    'Production save migration and rollback must be integrated and verified against both slots; isolated pilot imports do not prove production upgrades.',
    'Verify old-worker/new-HTML and new-worker/old-tab combinations, offline reload, interrupted upgrades, and concurrent writers in real browsers.',
    'Obtain visual placement approval and physical-device/touch review before enabling or deploying the village.'
  ];
  if (/skipWaiting\s*\(/.test(sw) || /clients\.claim\s*\(/.test(sw)) pendingGates.push('Worker forces activation or claims existing tabs; demonstrate a safe mixed-version/concurrent-tab upgrade protocol.');
  if (/caches\.delete\s*\(/.test(sw)) pendingGates.push('Worker deletes old caches; prove already-open old tabs can still load their dependencies after activation.');
  return {
    sourceCacheReady: findings.length === 0,
    productionReady: false,
    findings, release, pilotSources, dependencyCount: dependencies.size, pendingGates,
    limitations: [
      'Static literal-source audit only; does not execute code, validate behavior, or certify isolated pilot safety.',
      'Exact URL identity includes query parameters. Dynamic/computed dependencies and fetch policy semantics need manual review.',
      'Baseline must be the actual published release; this tool cannot verify deployment history or cached client contents.',
      'A dormant migration helper without runtime integration or old-tab exclusion is preparation only, not production save-upgrade evidence.',
      'No release, save data, cache, worker, runtime, or assets are modified.'
    ]
  };
}
function main(args) {
  if (args.length !== 2 || args[0] !== '--baseline') throw new Error('Usage: node tools/audit-village-release.cjs --baseline <published-commit>');
  const root = path.resolve(__dirname, '../..'), prefix = 'nushi-tsuri/';
  const git = (...argv) => execFileSync('git', argv, {cwd: root, encoding: 'utf8', maxBuffer: 32 * 1024 * 1024});
  const revision = git('rev-parse', '--verify', args[1] + '^{commit}').trim();
  const files = new Set(git('ls-tree', '-r', '--name-only', revision, '--', prefix).trim().split('\n').map(file => file.slice(prefix.length)));
  const changedPaths = [...new Set((git('diff', '--name-only', revision, '--', prefix) + git('ls-files', '--others', '--exclude-standard', '--', prefix)).trim().split('\n').filter(Boolean).map(file => file.slice(prefix.length)))];
  const cache = new Map();
  const baseline = {exists: file => files.has(file), read: file => {
    if (!cache.has(file)) cache.set(file, git('show', revision + ':' + prefix + file));
    return cache.get(file);
  }};
  const current = {exists: file => fs.existsSync(path.join(root, prefix, file)), read: file => fs.readFileSync(path.join(root, prefix, file), 'utf8')};
  const report = {baseline: revision, ...audit({baseline, current, changedPaths})};
  process.stdout.write(JSON.stringify(report, null, 2) + '\n');
  process.exitCode = report.sourceCacheReady ? 0 : 1;
}
module.exports = {audit, htmlUrls, manifest, metadata};
if (require.main === module) {
  try { main(process.argv.slice(2)); } catch (error) { console.error(error.message); process.exitCode = 2; }
}
