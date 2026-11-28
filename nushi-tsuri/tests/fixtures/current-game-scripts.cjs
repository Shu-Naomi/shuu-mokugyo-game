const fs = require('node:fs');
const path = require('node:path');
const gameRoot = path.resolve(__dirname, '../..');
const template = fs.readFileSync(path.join(gameRoot, 'tools/templates/game-index.html'), 'utf8');
const urls = new Map();
for (const [, url, logicalName] of template.matchAll(/<script src="(([a-z][a-z-]*?)(?:-\d+(?:-\d+)*)?\.js(?:\?[^"]*)?)"/g)) {
  if (urls.has(logicalName)) throw Error('Duplicate game script: ' + logicalName);
  urls.set(logicalName, url);
}

// Older releases keep their physical files for offline use. Test the module
// the current page actually loads, even when its release differs from the HUD.
function url(name) {
  if (!urls.has(name)) throw Error('Unknown game script: ' + name);
  return urls.get(name);
}
const file = name => url(name).split('?')[0];
const load = name => require(path.join(gameRoot, file(name)));
module.exports = {url, file, load};
