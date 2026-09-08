const { test } = require("node:test");
const assert = require("node:assert/strict");
const { boot, seed, read, saveKey } = require("./game-harness.cjs");

async function finishTransition(window) {
  for (let count = 0; count < 80; count++) {
    if (!window.eval("playerHomeState.transitioning")) return;
    await new Promise((resolve) => window.setTimeout(resolve, 10));
  }
  throw new Error("Home transition did not finish");
}
async function enterHome(window) {
  window.eval('move("left")');
  await finishTransition(window);
  window.eval('for (let i=0;i<9;i++) move("right"); for (let i=0;i<3;i++) move("up")');
  window.document.querySelector("#action").click();
  await finishTransition(window);
  assert.equal(window.eval("playerHomeState.area"), "interior");
}
function walkTo(window, condition) {
  // Plan on the existing collision map; follow every step using the real
  // movement handler so A, hints and furniture priority are tested together.
  assert.equal(window.eval(`(() => {
    const queue = [{ x:playerHomeState.x, y:playerHomeState.y, path:[] }], seen = new Set();
    for(let index=0;index<queue.length;index++) {
      const point=queue[index], key=point.x+','+point.y;
      if(seen.has(key)) continue; seen.add(key);
      if(${condition}) {
        for(const direction of point.path) if(!movePlayerHome(direction)) throw Error('Blocked route');
        return true;
      }
      for(const direction of ['left','right','up','down']) {
        const next=playerHomeMoveTarget('interior',point.x,point.y,direction);
        if(next.x!==point.x || next.y!==point.y) queue.push({...next,path:[...point.path,direction]});
      }
    }
    return false;
  })()`), true, "an actual walkable route exists");
}

test("three indoor dogs use A to open that dog's existing care; companion and saves stay intact", async () => {
  const saved = seed(); saved.dogTreats = { samBiscuit: 3 };
  const app = boot(saved), { window } = app;
  let reload;
  try {
    assert.equal(window.document.querySelector("#homeDogs").hidden, true);
    assert.equal(window.eval("homeDogAnimationTimer"), 0);
    const before = read(window, "({caught:s.caught,fish:s.homeAquariumFishId,quests:s.questCompletions,money:s.money,baits:s.baits,meals:s.preparedMeals})");
    await enterHome(window);
    assert.equal(window.document.querySelectorAll("[data-home-dog]").length, 3);
    assert.equal(window.document.querySelector("#homeDogs").hidden, false);
    assert.ok(window.eval("homeDogAnimationTimer"));
    window.eval("stopHomeDogAnimation()");
    for (const id of ["riku", "grey", "shuu"]) {
      walkTo(window, `!nearbyPlayerHomeEvent('interior',point.x,point.y) && nearbyHomeDog(point.x,point.y)?.dogId === '${id}'`);
      assert.match(window.document.querySelector("#hint").textContent, /Aで遊ぶ・おやつ/);
      const position = read(window, `homeDogs.find(d=>d.dogId==='${id}')`);
      window.eval("for(let i=0;i<40;i++) advanceHomeDogs(.05); drawHomeDogs()");
      assert.deepEqual(read(window, `homeDogs.filter(d=>d.dogId==='${id}').map(d=>[d.x,d.y])`), [[position.x, position.y]], "nearby dog waits for A");
      window.document.querySelector("#action").click();
      assert.equal(window.document.querySelector("#dogCare").classList.contains("open"), true);
      assert.equal(window.eval("dogCareSelectedId"), id);
      assert.equal(window.eval("s.dog"), "shuu", "opening care does not switch the field companion");
      assert.equal(window.eval("homeDogAnimationTimer"), 0);
      if (id === "riku") {
        assert.equal(window.eval('giveDogTreat("samBiscuit")'), true);
        assert.equal(window.eval('giveDogTreat("samBiscuit")'), false);
        assert.equal(window.eval("s.dogTreats.samBiscuit"), 2);
      }
      window.eval("close(); stopHomeDogAnimation()");
    }
    assert.deepEqual(read(window, "({caught:s.caught,fish:s.homeAquariumFishId,quests:s.questCompletions,money:s.money,baits:s.baits,meals:s.preparedMeals})"), before);
    walkTo(window, "nearbyPlayerHomeEvent('interior',point.x,point.y)?.id === 'interior-door'");
    window.document.querySelector("#action").click();
    await finishTransition(window);
    assert.equal(window.eval("playerHomeState.area"), "exterior");
    assert.equal(window.document.querySelector("#homeDogs").hidden, true);
    assert.equal(window.eval("homeDogAnimationTimer"), 0);
    window.eval("save()");
    const progress = JSON.parse(window.localStorage.getItem(saveKey));
    reload = boot(progress);
    assert.equal(reload.window.eval("s.dogTreats.samBiscuit"), 2);
    assert.deepEqual(read(reload.window, "s.dogAffinity"), read(window, "s.dogAffinity"));
    await enterHome(reload.window);
    assert.equal(reload.window.document.querySelectorAll("[data-home-dog]").length, 3);
    assert.deepEqual(app.errors, []); assert.deepEqual(reload.errors, []);
  } finally { app.dispose(); reload?.dispose(); }
});

test("all three greet one at a time and roam, sit and sleep without crossing furniture or each other", () => {
  const app = boot(), { window } = app;
  try {
    const result = window.eval(`(() => {
      Object.assign(playerHomeState, { area:'interior', ...playerHomeAreaData.interior.spawns.exterior });
      let seed=159; Math.random=()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/4294967296);
      const modes=new Set(), greeters=new Set();
      for(let visit=0;visit<12;visit++) {
        initializeHomeDogs(()=>((visit%3)+.5)/3);
        if(homeDogs.filter(d=>d.greeting).length!==1) throw Error('Not exactly one greeter');
        const greeter=homeDogs.find(d=>d.greeting); greeters.add(greeter.dogId);
        for(let step=0;step<2400;step++) {
          const previous=homeDogs.map(d=>({x:d.x,y:d.y}));
          advanceHomeDogs(.05);
          for(const [index,dog] of homeDogs.entries()) {
            modes.add(dog.dogId+':'+dog.mode);
            if(!homeDogPositionWalkable(dog.x,dog.y)) throw Error('Furniture crossing');
            if(!homeDogsSeparated(dog.x,dog.y,dog.dogId)) throw Error('Dogs overlap');
            const door=playerHomeAreaData.interior.events.find(e=>e.id==='interior-door');
            if(Math.hypot(dog.x-door.x,dog.y-door.y)<door.radius) throw Error('Dog in doorway');
            if(Math.hypot(dog.x-previous[index].x,(dog.y-previous[index].y)*.5)>.17001) throw Error('Position jump');
          }
          if(step===400 && greeter.greeting) throw Error('Greeting route remains blocked');
        }
      }
      return { modes:[...modes].sort(), greeters:[...greeters].sort() };
    })()`);
    assert.deepEqual([...result.greeters], ["grey", "riku", "shuu"]);
    for (const id of ["shuu", "riku", "grey"])
      for (const mode of ["walk", "sit", "sleep"])
        assert.ok(result.modes.includes(`${id}:${mode}`), `${id} uses ${mode}`);
    assert.deepEqual(app.errors, []);
  } finally { app.dispose(); }
});

test("furniture wins A, interaction cannot reach through furniture, and dogs never block player routes", async () => {
  const app = boot(), { window } = app;
  try {
    await enterHome(window);
    window.eval("stopHomeDogAnimation()");
    for (const event of ["bed", "kitchen", "aquarium", "interior-door"]) {
      walkTo(window, `nearbyPlayerHomeEvent('interior',point.x,point.y)?.id === '${event}'`);
      // Deliberately overlap a dog with the player to stress priority. Normal
      // roaming avoids these spots, but a future layout must still be safe.
      window.eval("homeDogs[0].x=playerHomeState.x; homeDogs[0].y=playerHomeState.y; renderPlayerHome()");
      window.document.querySelector("#action").click();
      assert.equal(window.document.querySelector("#dogCare").classList.contains("open"), false);
      if (event === "bed") assert.equal(window.eval("s.hp"), window.eval("s.maxHp"));
      if (event === "kitchen") assert.equal(window.eval("activeLocationId"), "player-home");
      if (event === "aquarium") assert.equal(window.document.querySelector("#aquariumModal").classList.contains("open"), true);
      if (event === "interior-door") { await finishTransition(window); assert.equal(window.eval("playerHomeState.area"), "exterior"); }
      window.eval("close(); stopHomeDogAnimation()");
    }
    assert.equal(window.eval("homeDogSegmentClear({x:34,y:50},{x:49,y:50},false)"), false, "table blocks interaction line");
    assert.equal(window.eval("homeDogPositionWalkable(40,50)"), false);
    assert.equal(window.eval("homeDogPositionWalkable(44,94)"), false);
    assert.deepEqual(app.errors, []);
  } finally { app.dispose(); }
});

test("indoor sprites reuse the correct cells for four directions, steps, sit and sleep", () => {
  const app = boot(), { window } = app;
  try {
    const result = window.eval(`(() => {
      playerHomeState.area='interior'; initializeHomeDogs(()=>.5);
      const calls=[];
      const canvas={getContext:()=>({clearRect(){},drawImage(image,...args){calls.push({src:image.src,args});}})};
      for(const dog of homeDogs) {
        for(const direction of ['down','left','right','up']) {
          dog.direction=direction;
          for(let frame=0;frame<4;frame++) drawHomeDogSprite(canvas,dog,'walk',frame);
        }
        drawHomeDogSprite(canvas,dog,'sit',0); drawHomeDogSprite(canvas,dog,'sleep',0);
      }
      renderHomeDogs(); stopHomeDogAnimation();
      const nodes=[...document.querySelectorAll('[data-home-dog] canvas')];
      for(let i=0;i<20;i++) drawHomeDogs();
      return {calls, sameNodes:nodes.every((node,i)=>node===document.querySelectorAll('[data-home-dog] canvas')[i])};
    })()`);
    assert.equal(result.calls.length, 54);
    assert.equal(result.sameNodes, true, "animation never rebuilds sprite nodes");
    for (const [index, id] of ["shuu", "riku", "grey"].entries()) {
      const cells = result.calls.slice(index * 18, index * 18 + 18);
      const size = id === "riku" ? 362 : 320;
      for (let direction = 0; direction < 4; direction++) {
        for (let frame = 0; frame < 4; frame++) {
          const cell = cells[direction * 4 + frame];
          assert.match(cell.src, new RegExp(`${id}-walk.png`));
          assert.equal(cell.args[0], direction * size);
          assert.equal(cell.args[1], [0, 1, 2, 1][frame] * size);
          assert.ok(cell.args.every(Number.isFinite));
        }
      }
      assert.match(cells[16].src, /dog-idles.png/);
      assert.match(cells[17].src, /dog-idles.png/);
      assert.equal(cells[16].args[0], 0); assert.equal(cells[17].args[0], 320);
      assert.equal(cells[16].args[1], index * 320); assert.equal(cells[17].args[1], index * 320);
    }
    assert.deepEqual(app.errors, []);
  } finally { app.dispose(); }
});

test("menus, page hiding and room transitions stop motion; resume cannot catch up with a jump", async () => {
  const app = boot(), { window } = app;
  try {
    await enterHome(window);
    for (const pause of ["menu", "hidden", "pagehide"]) {
      assert.ok(window.eval("homeDogAnimationTimer"));
      if (pause === "menu") window.eval("openInventory()");
      else if (pause === "hidden") {
        Object.defineProperty(window.document, "hidden", { configurable: true, value: true });
        window.document.dispatchEvent(new window.Event("visibilitychange"));
      } else window.dispatchEvent(new window.Event("pagehide"));
      assert.equal(window.eval("homeDogAnimationTimer"), 0);
      assert.equal(window.eval("homeDogLastTime"), null);
      const stopped = read(window, "homeDogs");
      await new Promise((resolve) => window.setTimeout(resolve, 90));
      assert.deepEqual(read(window, "homeDogs"), stopped);
      if (pause === "menu") window.eval("close()");
      else if (pause === "hidden") {
        Object.defineProperty(window.document, "hidden", { configurable: true, value: false });
        window.document.dispatchEvent(new window.Event("visibilitychange"));
      } else window.dispatchEvent(new window.Event("pageshow"));
      assert.ok(window.eval("homeDogAnimationTimer"));
      assert.equal(window.eval("homeDogLastTime"), null);
    }
    window.eval("stopHomeDogAnimation()");
    const before = read(window, "homeDogs.map(d=>[d.x,d.y])");
    window.eval("advanceHomeDogs(120)");
    const after = read(window, "homeDogs.map(d=>[d.x,d.y])");
    for (let i = 0; i < 3; i++)
      assert.ok(Math.hypot(after[i][0] - before[i][0], (after[i][1] - before[i][1]) * .5) <= .17001);
    window.eval("transitionPlayerHome('exterior','interior')");
    assert.equal(window.eval("homeDogAnimationTimer"), 0);
    await finishTransition(window);
    assert.equal(window.document.querySelector("#homeDogs").hidden, true);
    assert.deepEqual(app.errors, []);
  } finally { app.dispose(); }
});
