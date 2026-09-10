// Shared DOM harness: real game code with explicit layout, Canvas, image and audio doubles.
const fs = require("node:fs");
const path = require("node:path");
const { JSDOM, VirtualConsole } = require("jsdom");
// Load the same local scene modules/styles the browser loads, without HTTP.
const html = fs.readFileSync(path.join(__dirname, "../index.html"), "utf8")
  .replace(/<script src="((?:pixel-(?:world|cast)|weather|music-tracks|soundscape|scene-layers|layered-scenery)\.js)\?[^\"]+"><\/script>/g,
    (_, name) => `<script>${fs.readFileSync(path.join(__dirname, "..", name), "utf8")}</script>`)
  .replace(/<link rel="stylesheet" href="(pixel-scenes\.css)\?[^\"]+" \/>/,
    (_, name) => `<style>${fs.readFileSync(path.join(__dirname, "..", name), "utf8")}</style>`);
const saveKey = "nushi-inugoya-v2";
const seed = () => ({
  mapVersion: 102, money: 4321, hp: 37, maxHp: 100, gameMinutes: 500,
  caught: { funa: 2, nijimasu: 3, mebaru: 1, hirame: 1 },
  baits: { worm: 7, shell: 2 }, cookingIngredients: { fishFillet: 3 },
  preparedMeals: { shellSoup: 1 }, dog: "shuu", dogAffinity: { shuu: 44 },
  questCompletions: 4, x: 10, y: 79, direction: "left",
});

function boot(saved = seed(), tankSizes = { homeAquarium: [101, 45], aquariumPreview: [440, 180] }) {
  const errors = [];
  let dispose;
  const virtualConsole = new VirtualConsole();
  virtualConsole.on("jsdomError", (error) => errors.push(error.message));
  const dom = new JSDOM(html, {
    url: "http://localhost/nushi-tsuri/", runScripts: "dangerously",
    pretendToBeVisual: true, virtualConsole,
    beforeParse(window) {
      // The game declares a global close() for its menus. Keep JSDOM's real
      // teardown before that function shadows window.close, or timers linger.
      dispose = window.close.bind(window);
      window.localStorage.setItem(saveKey, JSON.stringify(saved));
      // JSDOM has no layout engine. Supply explicit phone-sized tank boxes
      // so containment tests exercise real sizing math instead of 0x0 DOMs.
      const bounds = window.Element.prototype.getBoundingClientRect;
      window.Element.prototype.getBoundingClientRect = function () {
        const size = tankSizes[this.id];
        return size ? new window.DOMRect(0, 0, ...size) : bounds.call(this);
      };
      window.matchMedia = () => ({ matches: false, addEventListener() {}, removeEventListener() {} });
      window.ResizeObserver = class { observe() {} disconnect() {} };
      window.Path2D = class {};
      window.DOMMatrix = class {};
      window.navigator.vibrate = () => true;
      window.HTMLCanvasElement.prototype.getContext = function () {
        const gradient = { addColorStop() {} };
        return this.context ||= new Proxy({
          canvas: this, measureText: (text) => ({ width: String(text).length * 8 }),
          createLinearGradient: () => gradient, createRadialGradient: () => gradient,
          createImageData: (w, h) => ({ data: new Uint8ClampedArray(w * h * 4), width: w, height: h }),
          getImageData: (x, y, w, h) => ({ data: new Uint8ClampedArray(w * h * 4), width: w, height: h }),
        }, { get: (target, key) => key in target ? target[key] : () => {} });
      };
      window.Image = function () {
        const image = window.document.createElement("img");
        Object.defineProperties(image, {
          complete: { value: true }, naturalWidth: { value: 320 }, naturalHeight: { value: 160 },
          src: { get() { return this._src; }, set(value) {
            this._src = value;
            window.setTimeout(() => this.dispatchEvent(new window.Event("load")), 0);
          } },
        });
        image.decode = () => Promise.resolve();
        return image;
      };
      window.Audio = class {
        constructor(src) { Object.assign(this, { src, paused: true, currentTime: 0, volume: 1 }); }
        play() { this.paused = false; return Promise.resolve(); }
        pause() { this.paused = true; }
        load() {} setAttribute() {} addEventListener() {} removeEventListener() {}
      };
    },
  });
  dom.window.document.querySelector("#start").click();
  return { dom, window: dom.window, errors, dispose };
}
const read = (window, expression) => JSON.parse(window.eval(`JSON.stringify(${expression})`));

module.exports = { boot, seed, read, saveKey };
