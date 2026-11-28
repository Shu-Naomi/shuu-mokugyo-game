'use strict';
const fs = require('node:fs');
const path = require('node:path');
const { createHash } = require('node:crypto');
const writeGeneratedFile = require('./write-generated-file.cjs');
const sha256 = bytes => createHash('sha256').update(bytes).digest('hex');

// This runs at the top of the network entry, before any candidate game script.
// The published v252-85 worker writes every online navigation into index.html,
// but leaves its other, separately installed copy under the directory URL alone.
function resumeLegacyPage(candidateEntry) {
  const controller = navigator.serviceWorker?.controller;
  if (!controller) return;
  const worker = new URL(controller.scriptURL);
  const oldWorker = new URL('./sw.js?v=252-85', location.href);
  if (worker.href !== oldWorker.href) return;

  const candidate = new URL(candidateEntry, location.href);
  candidate.search = location.search;
  candidate.hash = location.hash;

  // Consume the remainder of the response as inert text during this navigation.
  // A new worker serves the runnable entry directly, even if its registration
  // still uses the previous worker's URL.
  document.write('<plaintext hidden>');
  document.addEventListener('DOMContentLoaded', async function restore() {
    try {
      const directory = new URL('./', location.href).href;
      const response = await caches.match(directory, {
        cacheName: 'nushi-tsuri-v252-shiokakure-display-252-85',
      });
      if (!response) throw Error('Previous offline page unavailable');
      const bytes = await response.arrayBuffer();
      const raw = await crypto.subtle.digest('SHA-256', bytes);
      const digest = Array.from(new Uint8Array(raw), b => b.toString(16).padStart(2, '0')).join('');
      // Only execute the exact previously published v252-85 page.
      if (digest !== '12df7ef16788f4d489cdec5b5be2010da08dedeb1e19619f7ba29647c3ebe098') {
        throw Error('Previous offline page changed');
      }
      const oldPage = new TextDecoder().decode(bytes);
      document.open();
      document.write(oldPage);
      document.close();
    } catch (_) {
      // A visitor whose old cache has been evicted can start the new entry.
      location.replace(candidate.href);
    }
  }, { once: true });
}

function writeOfflineRelease(root, version, assets, html) {
  if (!/^\d+-\d+$/.test(version)) throw Error('Invalid release number');
  const worker = fs.readFileSync(path.join(root, 'sw.js'), 'utf8');
  const declared = /const CORE_ASSETS = \[([\s\S]*?)\];/.exec(worker);
  if (!declared) throw Error('Missing offline asset inventory');
  const directAssets = [...declared[1].matchAll(/"(\.\/[^"]*)"/g)].map(match => match[1]);
  const candidateEntry = './release-' + version + '.html';
  const index = path.join(root, 'index.html');
  const charset = '<meta charset="utf-8">';
  if (!html.includes(charset) || html.includes('id="previousOfflinePage"')) throw Error('Expected a newly built game entry');
  const gate = '<script id="previousOfflinePage">(' + resumeLegacyPage.toString() + ')(' + JSON.stringify(candidateEntry) + ');</script>';

  const digests = Object.create(null);
  for (const url of new Set([...assets, ...directAssets])) {
    const file = url.slice(2).split('?')[0] || 'index.html';
    if (!url.startsWith('./') || file.split('/').includes('..')) throw Error('Invalid offline asset: ' + url);
    if (!Object.hasOwn(digests, file)) {
      digests[file] = sha256(file === 'index.html' ? html : fs.readFileSync(path.join(root, file)));
    }
    const pinned = new URL(url, 'https://game.invalid/').searchParams.get('sha256');
    if (pinned && pinned !== digests[file]) throw Error('Stale asset hash: ' + url);
  }
  const build = sha256(JSON.stringify([version, assets, directAssets, digests]));
  const manifest = '// Generated with index.html; do not edit.\n' +
    'self.SHU_VILLAGE_PRECACHE = ' + JSON.stringify(assets, null, 2) + ';\n' +
    'self.SHU_VILLAGE_ENTRY = ' + JSON.stringify(candidateEntry) + ';\n' +
    'self.SHU_VILLAGE_BUILD = ' + JSON.stringify(build) + ';\n' +
    'self.SHU_VILLAGE_DIGESTS = ' + JSON.stringify(digests, null, 2) + ';\n';
  writeGeneratedFile(path.join(root, 'village-precache-' + version + '.js'), manifest);
  const networkPage = html.replace(charset, charset + '\n' + gate);
  writeGeneratedFile(index, networkPage);
  return networkPage;
}
module.exports = { writeOfflineRelease };
