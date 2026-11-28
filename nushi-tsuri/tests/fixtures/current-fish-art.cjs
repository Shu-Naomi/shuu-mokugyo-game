const currentScripts = require('./current-game-scripts.cjs');
const {readFileSync} = require('node:fs');
const {join} = require('node:path');
const {compileFunction} = require('node:vm');

// The shared renderer also serves older offline releases. Attach the same
// species definitions and motion profiles that the current page loads.
const runtime = {
  ShuFishAdditions: currentScripts.load('fish-additions'),
  ShuFishMotion: currentScripts.load('fish-motion'),
};
const renderer = join(__dirname, '../..', currentScripts.file('fish-art'));
compileFunction(readFileSync(renderer, 'utf8'), ['globalThis', 'module'], {filename: renderer})(runtime, undefined);
module.exports = runtime.ShuFishArt;
