const {readFileSync} = require('node:fs');
const {join} = require('node:path');
const {compileFunction} = require('node:vm');

// The shared renderer also serves older offline releases. Attach the same
// species definitions and motion profiles that the current page loads.
const runtime = {
  ShuFishAdditions: require('../../fish-additions-252-94.js'),
  ShuFishMotion: require('../../fish-motion-252-94.js'),
};
const renderer = join(__dirname, '../../fish-art.js');
compileFunction(readFileSync(renderer, 'utf8'), ['globalThis', 'module'], {filename: renderer})(runtime, undefined);
module.exports = runtime.ShuFishArt;
