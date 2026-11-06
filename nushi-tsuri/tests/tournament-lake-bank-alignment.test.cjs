const { test } = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { createCanvas, loadImage } = require('@napi-rs/canvas');
const N = require('../tournament-npcs.js'), R = require('../rival-anglers.js'), T = require('../tournament.js');
const { boot, seed, read } = require('./game-harness.cjs');
const progress = w => read(w, 'Object.fromEntries(Object.entries(s).filter(([key])=>!["x","y","direction","log"].includes(key)))');
// South-bank figures keep their existing horizontal sprite poses. Their
// water is north of the bank, as in the original tournament placement test.
const bearing = p => ['mina', 'asual', 'take', 'dancer'].includes(p.id) ? 'up' : p.facing;

test('all lake competitors reach painted lake water and relocated feet stand on the new dry bank', async () => {
  const im = await loadImage(path.join(__dirname, '..', require('../scene-layers.js').get('world').source));
  const canvas = createCanvas(im.width, im.height), ctx = canvas.getContext('2d'); ctx.drawImage(im, 0, 0);
  assert.deepEqual([im.width, im.height], [1672, 941]);
  const pixels = ctx.getImageData(0, 0, im.width, im.height).data;
  const rgb = (x, y) => Array.from(pixels.slice((y * im.width + x) * 4, (y * im.width + x) * 4 + 3));
  const blue = (x, y) => { const [r, g, b] = rgb(x, y); return b > r + 20 && g > r + 15; };
  // Only connected lake pixels count, not isolated blue flowers on its bank.
  const water = new Set(['850,230']), queue = [[850, 230]];
  for (let i = 0; i < queue.length; i++) {
    const [x, y] = queue[i];
    for (const [dx, dy] of [[1,0],[-1,0],[0,1],[0,-1],[1,1],[1,-1],[-1,1],[-1,-1]]) {
      const a = x + dx, b = y + dy, key = a + ',' + b;
      if (a >= 660 && a < 1070 && b >= 100 && b <= 350 && !water.has(key) && blue(a, b)) {
        water.add(key); queue.push([a, b]);
      }
    }
  }
  assert.ok(water.size > 50000, 'the actual main lake, not a vacuous pixel sample');
  const app = boot({ ...seed(), soundEnabled: false }), w = app.window;
  try {
    for (const p of [...N.venues.lakeFuna, ...R.placements]) {
      assert.equal(w.isWalkableWorld(p.x, p.y), true, p.id + ' dry feet');
      assert.equal(w.fishingWaterNearPlayer(p.x, p.y, bearing(p))?.zone, 'lake', p.id + ' lake cast');
      const [dx, dy] = { up:[0,-1], down:[0,1], left:[-1,0], right:[1,0] }[bearing(p)];
      let realWater = false;
      for (const slope of [0, -.1875, .1875, -.375, .375]) for (let d = .5; d <= 8; d += .25) {
        const x = p.x + dx * d - dy * slope * d, y = p.y + dy * d + dx * slope * d;
        if (w.isBlockedStructure(x, y) || w.ShuSceneLayers.propSolid(x, y) || w.isOnRiverBridgeSpan(x, y)) break;
        if (water.has(Math.round(x / 240 * im.width) + ',' + Math.round(y / 135 * im.height))) realWater = true;
      }
      assert.equal(realWater, true, p.id + ' forward cast reaches painted blue water, not only the collision margin');
    }
    const moved = [N.venues.lakeFuna.find(p => p.id === 'haru'), N.venues.lakeFuna.find(p => p.id === 'take'),
      R.placements.find(p => p.id === 'dancer'), R.dogPlacements.find(p => p.id === 'jamie')];
    assert.deepEqual(moved.map(p => [p.id, p.x, p.y, p.facing]), [
      ['haru',93,27,'right'], ['take',103,54,'right'], ['dancer',103,54,'right'], ['jamie',103,62,'right'],
    ]);
    for (const p of moved) {
      const [r, g, b] = rgb(Math.round(p.x / 240 * im.width), Math.round(p.y / 135 * im.height));
      assert.ok(r > 200 && r > g * 1.1 && g > b * 1.3, p.id + ' feet are on painted earth');
    }
    for (const p of R.dogPlacements) assert.equal(w.isWalkableWorld(p.x, p.y), true, p.id + ' dry companion');
    for (const [human, dog] of [['liao','crow'], ['asual','cloud'], ['dancer','jamie']]) {
      const a = R.placements.find(p => p.id === human), b = R.dogPlacements.find(p => p.id === dog);
      assert.ok(Math.hypot(a.x - b.x, a.y - b.y) <= 9, dog + ' remains beside their owner');
    }
    assert.deepEqual(app.errors, []);
  } finally { app.dispose(); }
});

test('both tournament rosters remain connected to public paths on all sixteen grids with safe A conversations', () => {
  for (const event of ['lakeFuna', 'lakeMasters']) {
    const app = boot({ ...seed(), soundEnabled:false, tournament:T.create(event, 500, 186) }), w = app.window;
    try {
      w.Math.random = () => .999999;
      const before = progress(w);
      const routes = read(w, `(() => {
        const targets = currentTournamentNpcPlacements().concat(currentRivalPlacements());
        const results = [];
        for (let ox = 0; ox < 4; ox++) for (let oy = 0; oy < 4; oy++) {
          const queue = [{x:120+ox,y:92+oy}], seen = new Set([queue[0].x+','+queue[0].y]), found = new Set();
          for (let i = 0; i < queue.length && found.size < targets.length; i++) {
            const p = queue[i]; s.x=p.x; s.y=p.y;
            for (const target of targets) if (!found.has(target.id) && p.from && Math.hypot(p.x-target.x,p.y-target.y)<=6.5) {
              for (const direction of ['up','down','left','right']) {
                s.direction=direction;
                const npc=nearbyTournamentNpc(),rival=nearbyRival();
                const selected=rival&&(!npc||rival.distance<npc.distance)?rival:npc;
                if (selected?.id === target.id) {
                  results.push({id:target.id,ox,oy,x:p.x,y:p.y,from:p.from,step:p.step,direction});found.add(target.id);break;
                }
              }
            }
            for (const [dx,dy,step] of [[4,0,'right'],[-4,0,'left'],[0,4,'down'],[0,-4,'up']]) {
              const x=p.x+dx,y=p.y+dy,key=x+','+y;
              if (!seen.has(key) && isWalkableWorldSegment(p.x,p.y,x,y)) {
                seen.add(key);queue.push({x,y,from:[p.x,p.y],step});
              }
            }
          }
          const missing=targets.filter(p=>!found.has(p.id));
          if(missing.length)throw Error('Unreachable grid '+ox+','+oy+': '+missing.map(p=>p.id));
        }
        return results;
      })()`);
      const roster = event === 'lakeFuna' ? [...N.venues.lakeFuna, R.dogPlacements.find(p => p.id === 'chappie')]
        : [...R.placements, ...R.dogPlacements];
      assert.equal(routes.length, roster.length * 16);
      // The graph proves public-path connectivity; now use the real movement
      // and A handlers for the final approach on every phase of moved figures.
      for (const r of routes.filter(r => ['take','haru','dancer','jamie'].includes(r.id))) {
        w.eval(`s.x=${r.from[0]};s.y=${r.from[1]};s.direction=${JSON.stringify(r.step)};render()`);
        w.move(r.step);
        assert.deepEqual(read(w, '[s.x,s.y]'), [r.x,r.y], r.id + ' normal final step grid ' + r.ox + ',' + r.oy);
        w.eval(`s.direction=${JSON.stringify(r.direction)};render()`);
        const npc = w.nearbyTournamentNpc(), rival = w.nearbyRival();
        assert.equal((rival && (!npc || rival.distance < npc.distance) ? rival : npc).id, r.id);
        w.action();
        assert.ok(w.document.querySelector('#tournamentTalk.open'), r.id + ' opens the existing conversation');
        assert.equal(read(w, 'activeTournamentNpcId || activeRivalId'), r.id);
        assert.equal(read(w, 'battle'), null, 'A does not accidentally cast');
        w.close();
        assert.deepEqual(progress(w), before, 'movement and greetings preserve resources, progress and seeded tournament plans');
      }
      assert.deepEqual(app.errors, []);
    } finally { app.dispose(); }
  }
});
