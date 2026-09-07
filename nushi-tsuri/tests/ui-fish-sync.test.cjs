const { test } = require("node:test");
const assert = require("node:assert/strict");
const { boot, read } = require("./game-harness.cjs");

const key = (window, target, value) => {
  const event = new window.KeyboardEvent("keydown", { key: value, bubbles: true, cancelable: true });
  target.dispatchEvent(event);
  return event;
};
function prepareCast(window, practice = false) {
  window.eval(`${practice ? "openPracticePond()" : "cast(fishingSpots[0])"};
    beginFishing(); clearInterval(timer); battle.cast=50; launchSurfaceCast(); settleSurfaceCast();`);
}
function manualBattleTick(window) {
  const setInterval = window.setInterval;
  let tick;
  window.setInterval = (callback, delay, ...args) => {
    if (delay === 120) { tick = callback; return 0; }
    return setInterval(callback, delay, ...args);
  };
  try { window.eval("battleTick()"); }
  finally { window.setInterval = setInterval; }
  assert.equal(typeof tick, "function");
  return tick;
}
function sizeBattle(window, width = 800, height = 360) {
  const scene = window.document.querySelector("#fishScene");
  const sprite = window.document.querySelector("#battleFish");
  for (const [node, property, value] of [
    [scene, "clientWidth", width], [scene, "clientHeight", height],
    [sprite, "offsetWidth", 180], [sprite, "offsetHeight", 100],
  ]) Object.defineProperty(node, property, { configurable: true, value });
}

test("an open menu owns A/B and keyboard input; native controls still work", () => {
  const app = boot(), { window } = app;
  try {
    window.eval('open("record")');
    const before = read(window, "s");
    window.document.querySelector("#action").click();
    key(window, window.document.querySelector('[data-fishdex-filter="all"]'), "Enter");
    assert.deepEqual(read(window, "s"), before, "field action cannot run underneath a menu");
    assert.equal(window.eval("battle"), null);
    key(window, window.document.body, "Escape");
    assert.equal(window.document.querySelector(".modal.open"), null);

    window.eval('cast(fishingSpots[0]); wait()');
    assert.equal(window.document.querySelector("#tackle").classList.contains("open"), true);
    const baitButton = window.document.querySelector('#tackle [data-pick-bait="shell"]');
    key(window, baitButton, "Enter");
    assert.equal(window.eval("battle.phase"), "prep", "Enter on a menu button cannot start a cast behind it");
    baitButton.click();
    assert.equal(window.eval("s.selectedBait"), "shell");
    key(window, window.document.body, "Escape");
    assert.equal(window.document.querySelector(".modal.open"), null, "B closes the tackle menu before affecting fishing");
    assert.equal(window.eval("battle.phase"), "prep");
    window.eval('endBattle(); open("aquariumModal")');
    const select = window.document.querySelector("#aquariumFishSelect");
    assert.equal(key(window, select, "ArrowDown").defaultPrevented, false, "native select navigation is preserved");
    window.document.querySelector("#back").click();
    assert.equal(window.document.querySelector(".modal.open"), null);
    assert.deepEqual(app.errors, []);
  } finally { app.dispose(); }
});

test("tackle changes refresh preparation text, HUD and the bait used by the next cast", () => {
  const app = boot(), { window } = app;
  try {
    window.eval("s.ownedRods=Object.keys(rodData); cast(fishingSpots[0]); wait()");
    const rod = read(window, "Object.keys(rodData).find(id => id !== s.selectedRod)");
    window.document.querySelector('#tackle [data-pick-bait="shell"]').click();
    window.document.querySelector(`#tackle [data-pick-rod="${rod}"]`).click();
    window.document.querySelector("#back").click();
    const names = read(window, "[rodData[s.selectedRod].name, baitData.shell.name]");
    const text = window.document.querySelector("#battleMsg").textContent;
    for (const name of names) assert.ok(text.includes(name), `preparation shows ${name}`);
    assert.ok(text.includes("×2"));
    assert.equal(window.document.querySelector("#rod").textContent, names[0]);
    window.eval("pull(); clearInterval(timer); launchSurfaceCast(); settleSurfaceCast()");
    assert.equal(window.eval("battle.bait"), "shell");
    assert.equal(window.eval("s.baits.shell"), 1);
    assert.deepEqual(app.errors, []);
  } finally { app.dispose(); }
});

test("a delayed tick cannot leave fishing stuck in wait after the bite window", () => {
  for (const practice of [false, true]) {
    const app = boot(), { window } = app;
    try {
      prepareCast(window, practice);
      const tick = manualBattleTick(window);
      const before = read(window, "({ baits:s.baits, time:s.gameMinutes, caught:s.caught })");
      const late = window.eval("battle.biteAt + 40000");
      window.Date.now = () => late;
      tick();
      if (practice) {
        assert.equal(window.eval("battle.phase"), "wait");
        assert.ok(window.eval("battle.biteAt") > late, "practice queues a new chance");
      } else assert.equal(window.eval("battle"), null, "normal fishing resolves the missed bite");
      assert.deepEqual(read(window, "({ baits:s.baits, time:s.gameMinutes, caught:s.caught })"), before);
      assert.deepEqual(app.errors, []);
    } finally { app.dispose(); }
  }
});

test("A uses the actual bite deadline even when the timer has not refreshed the phase", () => {
  for (const [phase, offset, succeeds] of [["wait", 0, true], ["wait", 1050, true], ["wait", 1051, false], ["bite", 1051, false], ["wait", -1, false]]) {
    const app = boot(), { window } = app;
    try {
      prepareCast(window);
      const now = window.eval("battle.biteAt") + offset;
      window.eval(`battle.phase=${JSON.stringify(phase)}`);
      window.Date.now = () => now;
      window.eval("pull()");
      assert.equal(window.eval('battle?.phase === "fight"'), succeeds, `${phase} at ${offset}ms`);
      assert.deepEqual(app.errors, []);
    } finally { app.dispose(); }
  }
});

test("the hook anchor matches the rendered transform for every fish, facing, pose and viewport", () => {
  const app = boot(), { window } = app;
  try {
    prepareCast(window);
    window.eval("startFight(); clearInterval(timer); finishHookReveal()");
    const ids = read(window, "fish.map(f => f.id)");
    const sprite = window.document.querySelector("#battleFish");
    for (const [width, height] of [[800, 360], [640, 300], [360, 640]]) {
      sizeBattle(window, width, height);
      for (const id of ids) for (const facing of [-1, 1]) for (const mode of ["swim", "mouth", "turn", "ground"]) {
        if (mode === "ground" && id !== "hirame") continue;
        window.eval(`Object.assign(battle, {
          f:fish.find(f=>f.id===${JSON.stringify(id)}), x:50, y:54, facing:${facing}, frame:2,
          sandLifted:${mode !== "ground"}, turning:${mode === "turn" ? `{from:${facing},to:${-facing}}` : "null"},
          turnSpriteFrame:3, turnArcY:-3.567, turnRoll:4.5, renderAngle:-8.2,
          bodyStretch:1.08, bodySquash:.93, visualOffsetX:1.234, visualOffsetY:2.678,
          specimenVisualScale:.8, renderScale:1.03, mouthState:${JSON.stringify(mode === "mouth" ? "open" : "closed")}
        }); renderBattleFish()`);
        const transform = sprite.style.transform.match(/translate\(calc\(-50% \+ ([-\d.]+)px\), calc\(-50% \+ ([-\d.]+)px\)\) rotate\(([-\d.]+)deg\) scaleX\(([-\d.]+)\) scaleY\(([-\d.]+)\) scale\(([-\d.]+)\)/);
        assert.ok(transform, "the rendered transform is inspectable");
        const [dx, dy, angle, scaleX, scaleY, scale] = transform.slice(1).map(Number);
        const data = read(window, `(() => {
          const el=$("#battleFish"), mode=el.dataset.spriteMode, frame=Number(el.dataset.hookPoseFrame ?? el.dataset.spriteFrame);
          return { profile:fishMouthProfiles[battle.f.id], pose:fishHookPoseOverrides[battle.f.id]?.[mode]?.[frame] || fishHookPoseFrames[mode]?.[frame], mode };
        })()`);
        const { profile, pose } = data;
        const projection = data.mode === "turn" ? pose.xScale : facing * (pose?.xScale || 1);
        const px = profile.x * 180 * scale * Math.abs(scaleX) * projection;
        const py = (profile.y + (pose?.yOffset || 0)) * 100 * scale * scaleY;
        const rad = angle * Math.PI / 180, cos = Math.cos(rad), sin = Math.sin(rad);
        const lipX = width * .5 + dx + px * cos - py * sin;
        const lipY = height * .54 + dy + px * sin + py * cos;
        const expectedX = lipX - projection * cos * profile.inset - sin * profile.drop;
        const expectedY = lipY - projection * sin * profile.inset + cos * profile.drop;
        const anchor = read(window, "battleMouthAndHook()");
        const label = `${id} ${facing} ${mode} ${width}x${height}`;
        assert.ok(Math.abs(anchor.rootX * width / 1000 - expectedX) < .0001, `${label} hook x`);
        assert.ok(Math.abs(anchor.rootY * height / 500 - expectedY) < .0001, `${label} hook y`);
        assert.equal(anchor.angle, angle, `${label} hook rotation`);
      }
    }
    assert.deepEqual(app.errors, []);
  } finally { app.dispose(); }
});

test("resize updates the fish and tackle together without waiting for a battle tick", async () => {
  const app = boot(), { window } = app;
  try {
    prepareCast(window); sizeBattle(window);
    window.eval("startFight(); clearInterval(timer); finishHookReveal(); drawBattle()");
    const before = window.document.querySelector("#linePath").getAttribute("d");
    sizeBattle(window, 640, 300);
    window.dispatchEvent(new window.Event("resize"));
    await new Promise(resolve => window.setTimeout(resolve, 70));
    const path = window.document.querySelector("#linePath").getAttribute("d");
    const anchor = read(window, "battleMouthAndHook()");
    assert.notEqual(path, before);
    assert.ok(path.endsWith(`${anchor.lineX} ${anchor.lineY}`));
    assert.deepEqual(app.errors, []);
  } finally { app.dispose(); }
});

test("fish brake at swim boundaries instead of instantly reversing their velocity", () => {
  const app = boot(), { window } = app;
  try {
    prepareCast(window); window.eval("startFight(); clearInterval(timer); finishHookReveal()");
    for (const id of read(window, "fish.map(f => f.id)")) for (const edge of ["left", "right", "top", "bottom"]) {
      const result = read(window, `(() => {
        battle.f=fish.find(f=>f.id===${JSON.stringify(id)});
        Object.assign(battle,{sandLifted:true,retrieval:0,reeling:false,moodTick:0,swimTick:0,turning:null});
        const bounds=fishSwimBounds();
        const edge=${JSON.stringify(edge)};
        const horizontal=edge==="left" || edge==="right", sign=edge==="left" || edge==="top" ? -1 : 1;
        Object.assign(battle,{
          x:horizontal ? (sign<0 ? bounds.minX+.1 : bounds.maxX-.1) : (bounds.minX+bounds.maxX)/2,
          y:horizontal ? (bounds.minY+bounds.maxY)/2 : (sign<0 ? bounds.minY+.1 : bounds.maxY-.1),
          vx:horizontal ? sign*6.5 : 0, vy:horizontal ? 0 : sign*5.5,
          targetVx:horizontal ? sign*6.5 : 0, targetVy:horizontal ? 0 : sign*5.5
        });
        battle.startX=battle.x; battle.startY=battle.y;
        const mood={motion:"steady",speedX:1,speedY:.2,calm:false};
        moveBattleFish(mood);
        const impact={x:battle.x,y:battle.y,vx:battle.vx,vy:battle.vy};
        const positions=[];
        for(let i=0;i<40;i++){moveBattleFish(mood);positions.push([battle.x,battle.y]);}
        return {bounds,impact,positions};
      })()`);
      const horizontal = edge === "left" || edge === "right";
      const lower = edge === "left" || edge === "top";
      const limit = result.bounds[`${lower ? "min" : "max"}${horizontal ? "X" : "Y"}`];
      assert.equal(result.impact[horizontal ? "x" : "y"], limit, `${id} stops at ${edge}`);
      assert.equal(result.impact[horizontal ? "vx" : "vy"], 0, `${id} no instantaneous bounce at ${edge}`);
      assert.ok(result.positions.some(point => Math.abs(point[horizontal ? 0 : 1] - limit) > .1), `${id} can turn back inward from ${edge}`);
      for (const [x,y] of result.positions) {
        assert.ok(x >= result.bounds.minX && x <= result.bounds.maxX, `${id} horizontal movement bounds`);
        assert.ok(y >= result.bounds.minY && y <= result.bounds.maxY, `${id} vertical movement bounds`);
      }
    }
    assert.deepEqual(app.errors, []);
  } finally { app.dispose(); }
});
