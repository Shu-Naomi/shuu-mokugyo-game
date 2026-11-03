// Shared fixtures execute against the unmodified game globals in JSDOM and Chromium.
// Real UI entry and native-timer checks live in browser-render-efficiency.cjs.
function enterHomeFixture() {
  close();
  Object.assign(playerHomeState, {area: 'interior', transitioning: false, ...playerHomeAreaData.interior.spawns.exterior});
  s.homeAquariumFishId = 'funa';
  initializeHomeDogs(() => .5);
  render();
}
function measureHomePaints(hz) {
  const old = {dog: drawHomeDogs, fish: drawAquariumFish, advance: advanceHomeDogs,
    raf: window.requestAnimationFrame, random: Math.random};
  stopHomeDogAnimation(); stopAquariumAnimation();
  const initial = JSON.parse(JSON.stringify(homeDogs)), initialSave = JSON.stringify(s);
  let randomState, dogPaints = 0, aquariumPaints = 0, movementSteps = 0;
  const resetRandom = () => {randomState = 357; Math.random = () => ((randomState = (Math.imul(randomState, 1664525) + 1013904223) >>> 0) / 4294967296);};
  try {
    // Pre-change reference: these loops painted once per RAF, with the same
    // elapsed-time updates. Replay those updates, not a guessed speed formula.
    resetRandom();
    let previous = null, referenceElapsed = 0, beforePaints = 0;
    for (let i = 0; i <= hz; i++) {
      const now = i * 1000 / hz;
      if (previous !== null) {
        old.advance((now - previous) / 1000);
        referenceElapsed += Math.min(50, Math.max(0, now - previous)) / 1000;
      }
      previous = now; beforePaints++;
    }
    const referenceDogs = JSON.parse(JSON.stringify(homeDogs));
    homeDogs = JSON.parse(JSON.stringify(initial)); resetRandom();
    drawHomeDogs = () => {dogPaints++;}; drawAquariumFish = () => {aquariumPaints++;};
    advanceHomeDogs = delta => {movementSteps++; old.advance(delta);};
    window.requestAnimationFrame = () => 987654;
    aquariumElapsed = 0; aquariumRenderedFishId = 'funa'; aquariumCovered = false;
    for (let i = 0; i <= hz; i++) {
      const now = i * 1000 / hz;
      animateHomeDogs(now); advanceAquariumAnimation(now);
    }
    return {hz, beforePaints, dogPaints, aquariumPaints, movementSteps,
      elapsed: aquariumElapsed, referenceElapsed, referenceDogs,
      dogs: JSON.parse(JSON.stringify(homeDogs)), saveUnchanged: JSON.stringify(s) === initialSave};
  } finally {
    drawHomeDogs = old.dog; drawAquariumFish = old.fish; advanceHomeDogs = old.advance;
    window.requestAnimationFrame = old.raf; Math.random = old.random;
    stopHomeDogAnimation(); stopAquariumAnimation();
  }
}
async function checkFishRasterKeys() {
  const savedArt = ShuFishArt, element = document.createElement('div');
  const targets = new Set([element]);
  const asset = ShuFishArt.species.nijimasu.asset;
  const cached = fishAtlasImage(asset);
  await Promise.all(ShuFishArt.assets('nijimasu').map(name => fishAtlasImage(name).decode()));
  let draws = 0, failOnce = false;
  const painted = [], oldCache = fishAtlasImageCache.get(asset);
  ShuFishArt = {...savedArt, draw: (...args) => {
    if (!targets.has(args[0].canvas.parentElement)) return savedArt.draw(...args);
    draws++;
    if (failOnce) {failOnce = false; return false;}
    painted.push({frame: args[4], swim: args[6]?.swimFrame});
    return savedArt.draw(...args);
  }};
  const look = {kind: 'parr', strength: .7, key: 'parr:0.700:0'};
  const paint = (frame, appearance = null, pose = null) => drawFishAtlasFrame(element, asset, 8, frame, 'nijimasu', appearance, pose);
  try {
    paint(0); const first = draws;
    for (let n = 0; n < 100; n++) paint(0);
    const repeated = draws;
    paint(1); const changedFrame = draws;
    paint(1, look, {yaw: 0, swimFrame: 1}); const appearance = draws;
    paint(1, look, {yaw: Math.PI / 3, swimFrame: 1}); const yaw = draws;
    paint(1, {...look, strength: .2, key: 'parr:0.200:0'}, {yaw: Math.PI / 3, swimFrame: 1});
    const changedAppearance = draws;
    const canvas = element.querySelector('canvas');
    canvas.width = 1; paint(1, {...look, strength: .2, key: 'parr:0.200:0'}, {yaw: Math.PI / 3, swimFrame: 1});
    const resized = draws;
    failOnce = true; paint(2); const failedMemoized = canvas.dataset.artPaintKey === canvas.dataset.atlasKey;
    paint(2); const retried = !failedMemoized && canvas.dataset.artPaintKey === canvas.dataset.atlasKey;

    // Simulate separate load and decode completions, including an image whose
    // dimensions are known before it is drawable. Use a real decoded bitmap
    // underneath the readiness flags so Chromium still executes real raster code.
    let ready = false, finishDecode;
    const delayed = document.createElement('img');
    if (delayed.decode) {
      const loaded = new Promise((resolve, reject) => {
        delayed.addEventListener('load', resolve, {once: true});
        delayed.addEventListener('error', reject, {once: true});
      });
      delayed.src = cached.src; await Promise.all([loaded, delayed.decode()]);
    } else delayed.src = cached.src;
    const width = delayed.naturalWidth || cached.naturalWidth, height = delayed.naturalHeight || cached.naturalHeight;
    Object.defineProperties(delayed, {complete: {get: () => ready},
      naturalWidth: {get: () => width}, naturalHeight: {get: () => height}});
    const decoded = new Promise(resolve => {finishDecode = resolve;}); delayed.decode = () => decoded;
    fishAtlasImageCache.set(asset, delayed);
    const beforeLoad = draws;
    paint(3); paint(3); paint(4); paint(4);
    const incompletePaints = draws - beforeLoad;
    const incompleteMemoized = canvas.dataset.artPaintKey === canvas.dataset.atlasKey;
    ready = true; delayed.dispatchEvent(new Event('load')); finishDecode();
    await Promise.resolve(); await Promise.resolve();
    const afterLoad = draws - beforeLoad, latestFrame = painted.at(-1).frame;
    paint(4); const afterRepeat = draws - beforeLoad;

    const wrapper = document.createElement('div'); targets.add(wrapper);
    const specimen = {species: 'nijimasu', length: 1400, bornSize: 1400, origin: 'caught', generation: 0};
    const beforeWrapper = draws;
    drawAquariumSprite(wrapper, 'nijimasu', 1, {spriteMode: 'swim', yaw: 0}, specimen);
    drawAquariumSprite(wrapper, 'nijimasu', 1, {spriteMode: 'swim', yaw: Math.PI / 3}, specimen);
    const wrapperYawPaints = draws - beforeWrapper;
    const beforeTurn = draws;
    drawAquariumSprite(wrapper, 'nijimasu', 1, {spriteMode: 'turn', yaw: Math.PI / 3}, specimen);
    drawAquariumSprite(wrapper, 'nijimasu', 2, {spriteMode: 'turn', yaw: Math.PI / 3}, specimen);
    const wrapperTailPaints = draws - beforeTurn;
    return {first, repeated, changedFrame, appearance, yaw, changedAppearance, resized,
      failedMemoized, retried, incompletePaints, incompleteMemoized, afterLoad, afterRepeat,
      latestFrame, wrapperYawPaints, wrapperTailPaints, size: [canvas.width, canvas.height]};
  } finally {ShuFishArt = savedArt; fishAtlasImageCache.set(asset, oldCache);}
}
module.exports = {enterHomeFixture, measureHomePaints, checkFishRasterKeys};
