'use strict';
// Edit tools/templates/game-index.html, never the generated entry documents.
const path = require('node:path');
const { withMetadata } = require('./build-village-production-candidate.cjs');
const { writeOfflineRelease } = require('./build-offline-release.cjs');

function build() {
  const root = path.resolve(__dirname, '..');
  const version = '252-95';
  const candidate = withMetadata({
    root,
    sourcePath:'tools/templates/game-index.html',
    outputPath:'release-' + version + '.html',
    production:true,
    mapSource:'assets/village-shop-signs-v252-73.png',
  });
  const assets = ['./index.html', ...candidate.manifest.expectedUrls.map(url => './' + url), './' + candidate.manifest.mapURL];
  const html = writeOfflineRelease(root, version, assets, candidate.html);
  return {...candidate, html, outputPath:path.join(root, 'index.html')};
}

if (require.main === module) build();
module.exports = build;
