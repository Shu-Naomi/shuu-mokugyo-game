const { test } = require("node:test");
const assert = require("node:assert/strict");
const { boot, seed, read, saveKey } = require("./game-harness.cjs");

// Coordinates come from visible paths/steps on the detailed map, not from
// collision bounds. Each of these routes was blocked before v173.
const paths = [
  { name: "reported river path beside the sign", start: [119, 64], direction: "down", delta: [0, 4], count: 4 },
  { name: "west shrine central steps", start: [35, 68], direction: "up", delta: [0, -4], count: 3 },
  { name: "northeast lakeside path", start: [155, 20], direction: "down", delta: [0, 4], count: 6 },
];

test("the actual four-unit movement traverses the three painted paths in both directions and preserves a saved game", () => {
  const original = { ...seed(), x: 119, y: 64, soundEnabled: false };
  const app = boot(original), w = app.window;
  let saved;
  try {
    w.Math.random = () => .999999; // No incidental dog-foraging event during a walk.
    const inventory = read(w, "({money:s.money,caught:s.caught,baits:s.baits,ownedRods:s.ownedRods,items:s.items})");
    for (const route of paths) {
      w.eval(`s.x=${route.start[0]};s.y=${route.start[1]};render()`);
      let [x, y] = route.start;
      for (let i = 0; i < route.count; i++) {
        w.move(route.direction); x += route.delta[0]; y += route.delta[1];
        assert.deepEqual(read(w, "[s.x,s.y]"), [x, y], route.name);
      }
      if (route.name.includes("shrine")) {
        assert.equal(w.nearbyWorldLandmark(x, y).id, "west-shrine");
        w.action();
        assert.match(read(w, "s.log[0]"), /水守りの社に手を合わせた/);
      }
      const reverse = route.direction === "down" ? "up" : "down";
      for (let i = 0; i < route.count; i++) {
        w.move(reverse); x -= route.delta[0]; y -= route.delta[1];
        assert.deepEqual(read(w, "[s.x,s.y]"), [x, y], route.name + " return");
      }
    }
    // The sign remains usable from the newly opened path beside it.
    w.eval("s.x=119;s.y=72;render()"); w.action();
    assert.ok(w.document.querySelector("#questBoard").classList.contains("open"));
    w.close(); w.save();
    assert.deepEqual(read(w, "({money:s.money,caught:s.caught,baits:s.baits,ownedRods:s.ownedRods,items:s.items})"), inventory);
    saved = JSON.parse(w.localStorage.getItem(saveKey));
    assert.deepEqual(app.errors, []);
  } finally { app.dispose(); }
  const resumed = boot(saved);
  try {
    assert.deepEqual(read(resumed.window, "[s.x,s.y]"), [119, 72]);
    resumed.window.move("down");
    assert.deepEqual(read(resumed.window, "[s.x,s.y]"), [119, 76]);
    assert.equal(read(resumed.window, "s.money"), original.money);
    assert.deepEqual(resumed.errors, []);
  } finally { resumed.dispose(); }
});

test("water, sign feet and shrine walls stay solid; the opened steps do not tunnel through the building", () => {
  const app = boot(), w = app.window;
  try {
    // Open lake water, river on either side of the bridge, sea and practice pond.
    for (const [x, y] of [[145,25],[148,30],[147,35],[120,30],[112,70],[109,92],[180,118],[222,78]])
      assert.equal(w.isWalkableWorld(x, y), false, `water ${x},${y}`);
    for (const [x, y] of [[123,73],[35,52],[30,56],[43,56],[79,65],[143,65],[197,80]])
      assert.equal(w.isWalkableWorld(x, y), false, `visible solid ${x},${y}`);
    assert.equal(w.isWalkableWorldSegment(35,56,35,52), false);
    assert.equal(w.isWalkableWorldSegment(35,64,35,48), false, "cannot jump through the shrine");
    assert.equal(w.isWalkableWorldSegment(119,68,127,76), false, "cannot cross the sign base diagonally");
    for (const [ax,ay,bx,by] of [[95,80,123,80],[95,84,123,84],[155,108,155,124],[131,124,155,124],[220,96,220,108],[212,108,232,108]])
      assert.equal(w.isWalkableWorldSegment(ax,ay,bx,by), true, "bridge or harbor walkway");
    assert.deepEqual(app.errors, []);
  } finally { app.dispose(); }
});

test("all facilities, piers and home remain reachable on every four-unit movement grid", () => {
  const app = boot(), w = app.window;
  try {
    const failures = w.eval(`(() => {
      const failures = [];
      const targetIds = worldLandmarks.map(p => p.id).concat(['sam-shop','practice-pond','home','lower-pier','east-pier']);
      for (let ox=0; ox<4; ox++) for (let oy=0; oy<4; oy++) {
        const queue = [[120+ox,92+oy]], visited = new Set(), reached = new Set();
        for (let i=0; i<queue.length; i++) {
          const [x,y]=queue[i], key=x+','+y;
          if (visited.has(key)) continue;
          visited.add(key);
          for (const p of worldLandmarks) if (Math.hypot(x-p.x,y-p.y)<p.radius) reached.add(p.id);
          if (isAtSamShopEntrance(x,y)) reached.add('sam-shop');
          if (isNearPracticePond(x,y)) reached.add('practice-pond');
          if (inWorldRect(x,y,PLAYER_HOME_MAP_ENTRY)) reached.add('home');
          if (x>=149&&x<=157&&y>=120&&y<=127) reached.add('lower-pier');
          if (x>=224&&x<=232&&y>=106&&y<=113) reached.add('east-pier');
          for (const [dx,dy] of [[4,0],[-4,0],[0,4],[0,-4]]) {
            if (!visited.has((x+dx)+','+(y+dy)) && isWalkableWorldSegment(x,y,x+dx,y+dy)) queue.push([x+dx,y+dy]);
          }
        }
        const missing = targetIds.filter(id=>!reached.has(id));
        if (missing.length) failures.push({ox,oy,missing});
      }
      return failures;
    })()`);
    assert.deepEqual(JSON.parse(JSON.stringify(failures)), []);
    assert.deepEqual(app.errors, []);
  } finally { app.dispose(); }
});
