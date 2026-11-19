/* Dan's short automatic race. Distance is in course units, time in seconds. */
(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  else root.ShuVillageFishRace = api;
})(typeof globalThis === "undefined" ? this : globalThis, function () {
  "use strict";

  const GATE_IN = 40, GATE_OUT = 50, LAST_STRAIGHT = 75, FINISH = 100;
  const STEP = 1 / 60, SPURT_SECONDS = 2.35, COURSE = "水草の門";
  // First straight, gate exit, home straight. Every entrant starts on the same line.
  const pace = {
    launch:   {opening:7.04, exit:6.90, home:6.72, earlyBoost:3.55, lateBoost:1.50},
    finish:   {opening:7.00, exit:7.36, home:7.60, earlyBoost:1.40, lateBoost:4.25},
    sprinter: {opening:7.27, exit:6.85, home:6.60, earlyBoost:1.65, lateBoost:1.65},
    closer:   {opening:6.77, exit:7.48, home:8.10, earlyBoost:3.05, lateBoost:3.05},
  };
  const rentals = [
    {uid:"rental-funa", species:"funa", name:"フナ", style:"launch"},
    {uid:"rental-ayu", species:"ayu", name:"アユ", style:"finish"},
  ].map(f => ({...f, rental:true, generation:null, generationLabel:"レンタル"}));
  const rivals = [
    {species:"oikawa", name:"はやて", role:"front"},
    {species:"ugui", name:"しぶき", role:"late"},
  ];

  function createRace(style = "launch", care = 0) {
    const kinds = [style === "finish" ? "finish" : "launch", "sprinter", "closer"];
    return {elapsed:0, carry:0, gateOwner:null, passages:0, finished:false,
      runners:kinds.map((kind, index) => ({
        index, kind, x:0, spurtAt:null, spurtX:null, gateOrder:0, gateArrival:null, waited:0, finishTime:null,
        care:index === 0 ? Math.min(.14, Math.max(0, Number(care) || 0)) : 0,
      }))};
  }
  function startSpurt(fish, time) {
    fish.spurtAt = time;
    fish.spurtX = fish.x;
  }
  function spurt(race) {
    const player = race.runners[0];
    if (player.finishTime !== null || player.spurtAt !== null) return false;
    startSpurt(player, race.elapsed);
    return true;
  }
  function velocity(fish, time) {
    const profile = pace[fish.kind];
    const base = fish.x < GATE_OUT ? profile.opening : fish.x < LAST_STRAIGHT ? profile.exit : profile.home;
    let v = base + fish.care;
    if (fish.spurtAt !== null) {
      const age = time - fish.spurtAt;
      if (age < SPURT_SECONDS) {
        const boost = fish.x < GATE_OUT ? profile.earlyBoost : profile.lateBoost;
        v += boost * Math.min(1, (age + .1) / .24, (SPURT_SECONDS - age) / .4);
      }
    }
    return v;
  }
  function tick(race) {
    const [player, front, late] = race.runners;
    if (front.spurtAt === null && front.x >= 30) startSpurt(front, race.elapsed);
    if (late.spurtAt === null && late.x >= 76) startSpurt(late, race.elapsed);
    // Compare arrival at the gate, even when two fish would cross in the same tick.
    const active = race.runners.filter(fish => fish.finishTime === null).map(fish => {
      const v = velocity(fish, race.elapsed);
      return {fish, v, gateTime:fish.gateArrival ?? race.elapsed + (GATE_IN - fish.x) / v};
    });
    active.sort((a, b) => (a.fish.gateOrder && !b.fish.gateOrder ? -1 :
      b.fish.gateOrder && !a.fish.gateOrder ? 1 : a.gateTime - b.gateTime) || a.fish.index - b.fish.index);
    for (const {fish, v, gateTime} of active) {
      let next = fish.x + v * STEP;
      if (!fish.gateOrder && next >= GATE_IN) {
        fish.gateArrival = gateTime;
        if (race.gateOwner !== null) {
          next = GATE_IN;
          fish.waited += STEP;
        } else {
          race.gateOwner = fish.index;
          fish.gateOrder = ++race.passages;
        }
      }
      if (race.gateOwner === fish.index && next >= GATE_OUT) race.gateOwner = null;
      if (next >= FINISH) {
        fish.finishTime = race.elapsed + (FINISH - fish.x) / v;
        next = FINISH;
      }
      fish.x = next;
    }
    race.elapsed += STEP;
    race.finished = player.finishTime !== null && front.finishTime !== null && late.finishTime !== null;
  }
  function advance(race, seconds) {
    if (!Number.isFinite(seconds) || seconds <= 0 || race.finished) return;
    race.carry += seconds;
    while (race.carry + 1e-9 >= STEP && !race.finished) {
      race.carry -= STEP;
      tick(race);
    }
  }
  function finishOrder(race) {
    return [...race.runners].sort((a,b) => (a.finishTime ?? Infinity) - (b.finishTime ?? Infinity) || a.index - b.index);
  }
  function laneY(index, x) {
    // The player's middle lane is straight. Both rivals visibly funnel through the same opening.
    const lane = [50, 23, 77][index];
    // Queued fish hold their own approach lane until the opening is free.
    const entry = x < GATE_IN ? Math.max(0, (x - 32) / 8) * .23 : .23 + (x - GATE_IN) * .17;
    const converge = Math.max(0, Math.min(1, entry, (60 - x) / 10));
    return lane + (50 - lane) * converge;
  }

  function open(host, ctx) {
    const doc = host.ownerDocument, win = doc.defaultView;
    let phase = "entry", race = null, runId = null, current = null, disposed = false;
    let raf = 0, lastFrame = null, lastPaint = -Infinity, lastArt = -Infinity, blurred = false;
    let printed = null, previousMessage = "", views = [];
    const entrants = [...ctx.entrants(), ...rentals];
    const byUid = new Map(entrants.map(f => [f.uid, f]));
    let selectedUid = entrants[0].uid;
    const root = doc.createElement("div");
    root.className = "dan-race";
    host.replaceChildren(root);

    function el(tag, className, text) {
      const node = doc.createElement(tag);
      if (className) node.className = className;
      if (text !== undefined) node.textContent = text;
      return node;
    }
    function button(id, label, handler) {
      const node = el("button", "", label);
      node.type = "button";
      node.id = id;
      node.addEventListener("click", handler);
      return node;
    }
    function labelFish(fish) {
      const species = fish.speciesName || ctx.fishName(fish.species);
      return fish.name && fish.name !== species ? fish.name + "（" + species + "）" : species;
    }
    function fishStyle(fish) {
      if (fish.style) return fish.style;
      const gait = win.ShuAquariumLife.gait(fish.species);
      return gait.speed >= 1 ? "finish" : "launch";
    }
    function careBonus(fish) {
      return Math.min(.14, Math.max(0, (fish.specimen?.careDays || 0) * .004 + ((fish.specimen?.stars || 1) - 1) * .014));
    }
    function formArt(node, fish, frame) {
      ctx.drawFish(node, fish.species, frame, fish.specimen || null);
    }

    let status, cueButton, selection, printedButton;
    function buildCourse(fish) {
      const track = el("div", "dan-race-course");
      track.dataset.danCourse = "";
      track.setAttribute("role", "img");
      track.setAttribute("aria-label", "水草の門。左からスタート、水草の切れ目、最後の直線、ゴール。");
      for (const cls of ["dan-race-gate", "dan-race-finish"]) {
        const decoration = el("span", cls);
        decoration.setAttribute("aria-hidden", "true");
        track.append(decoration);
      }
      track.append(el("span", "dan-race-course-name", COURSE));
      const field = [fish, ...rivals];
      views = field.map((identity, i) => {
        const runner = el("div", "dan-race-runner");
        runner.dataset.racer = i ? identity.role : "player";
        const art = el("span", "dan-race-fish");
        const tag = el("span", "dan-race-tag", i ? identity.name : "自分");
        runner.append(art, tag);
        track.append(runner);
        formArt(art, identity, 0);
        return {runner, art, identity};
      });
      positionFish();
      return track;
    }
    function positionFish() {
      views.forEach(({runner}, i) => {
        const swimmer = race?.runners[i];
        const progress = swimmer?.x || 0;
        runner.classList.toggle("is-spurting", Boolean(swimmer && swimmer.spurtAt !== null &&
          swimmer.finishTime === null && race.elapsed - swimmer.spurtAt < SPURT_SECONDS));
        runner.style.left = (7 + .87 * progress).toFixed(2) + "%";
        runner.style.top = laneY(i, progress).toFixed(2) + "%";
        runner.dataset.progress = progress.toFixed(2);
      });
    }
    function setMessage(message) {
      if (message !== previousMessage) {
        status.textContent = message;
        previousMessage = message;
      }
    }
    function foot() {
      const footer = el("div", "dan-race-foot");
      status = el("p", "dan-race-status");
      status.setAttribute("role", "status");
      previousMessage = "";
      footer.append(status);
      return footer;
    }
    function preview() {
      phase = root.dataset.racePhase = "entry";
      race = null;
      root.replaceChildren();
      const entry = el("div", "dan-race-entry");
      const label = el("label", "", "出走魚");
      label.htmlFor = "danEntrantPicker";
      selection = el("select");
      selection.id = label.htmlFor;
      const groups = new Map();
      for (const fish of entrants) {
        const groupName = fish.rental ? "ダンのレンタル魚" : "自分の水槽";
        if (!groups.has(groupName)) {
          const group = el("optgroup");
          group.label = groupName;
          groups.set(groupName, group);
          selection.append(group);
        }
        const option = el("option", "", labelFish(fish) + (fish.rental ? " · レンタル" : " · " + fish.generationLabel + " #" + fish.uid.replace(/^pet-/, "")));
        option.value = fish.uid;
        groups.get(groupName).append(option);
      }
      selection.value = selectedUid;
      entry.append(label, selection);
      root.append(entry);
      const selected = byUid.get(selectedUid);
      const track = buildCourse(selected);
      const footer = foot();
      root.append(track, footer);
      const styleTip = fish => fishStyle(fish) === "launch" ? "この子は門の手前で勢いがつく先行型。" : "この子は門を抜けてから伸びる差し型。";
      setMessage("ダン「水草の隙間は一匹ずつだ。スパートは一度！」 " + styleTip(selected));
      cueButton = button("danRaceStart", "レース開始", start);
      footer.append(cueButton);
      selection.addEventListener("change", () => {
        selectedUid = selection.value;
        const fish = byUid.get(selectedUid);
        views[0].identity = fish;
        formArt(views[0].art, fish, 0);
        setMessage("ダン「水草の隙間は一匹ずつだ。スパートは一度！」 " + styleTip(fish));
      });
    }
    function start() {
      if (disposed || phase !== "entry") return false;
      current = byUid.get(selectedUid);
      runId = ctx.newRunId();
      printed = null;
      race = createRace(fishStyle(current), careBonus(current));
      phase = root.dataset.racePhase = "running";
      root.replaceChildren();
      const track = buildCourse(current);
      const footer = foot();
      root.append(track, footer);
      cueButton = button("danRaceSpurt", "A スパート", signal);
      footer.append(cueButton);
      cueButton.focus({preventScroll:true});
      lastPaint = lastArt = -Infinity;
      lastFrame = null;
      paint();
      resume();
      return true;
    }
    function signal() {
      if (disposed || phase !== "running" || doc.hidden || blurred || !spurt(race)) return false;
      cueButton.disabled = true;
      cueButton.textContent = "スパート済み";
      paint();
      return true;
    }
    function raceMessage() {
      const player = race.runners[0];
      if (player.finishTime !== null) return current.name + "、ゴール！";
      if (player.x === GATE_IN && player.gateOrder === 0) return "ダン「先客が門を通ってるぞ！」";
      if (player.spurtAt !== null && race.elapsed - player.spurtAt < SPURT_SECONDS)
        return current.name + "がスパート！";
      if (player.x < GATE_IN) return "水草の門が近い。先に出るか、力を残すか？";
      if (player.x < GATE_OUT) return "ダン「" + player.gateOrder + "番手で門へ入った！」";
      return "最後の直線！ " + (player.spurtAt === null ? "Aでスパートできる。" : "ゴールまであと少し。");
    }
    function paint() {
      positionFish();
      const reduced = win.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
      if (!reduced && race.elapsed - lastArt >= .12) {
        lastArt = race.elapsed;
        views.forEach(({art, identity}, i) => {
          const swimmer = race.runners[i], boosting = swimmer.spurtAt !== null && race.elapsed - swimmer.spurtAt < SPURT_SECONDS;
          if (swimmer.finishTime !== null) return;
          const gait = win.ShuAquariumLife.gait(identity.species);
          const frame = Math.floor(win.ShuFishMotion.phase(identity.species, race.elapsed, gait.speed * (boosting ? 1.35 : 1), false, i));
          formArt(art, identity, frame);
        });
      }
      setMessage(raceMessage());
    }
    function makeResult() {
      const player = race.runners[0];
      const order = finishOrder(race);
      const rank = order.indexOf(player) + 1;
      phase = root.dataset.racePhase = "result";
      root.replaceChildren();
      const result = el("div", "dan-race-result");
      const heading = el("h3", "", current.name + "　" + rank + "着");
      heading.id = "danRaceRank";
      heading.dataset.rank = String(rank);
      const ranking = el("ol");
      for (const fish of order) {
        const identity = views[fish.index].identity;
        const row = el("li");
        const name = el("b", "", (fish.index ? "" : "自分 · ") + identity.name);
        row.append(name, el("span", "", fish.finishTime.toFixed(2) + "秒"));
        ranking.append(row);
      }
      const portrait = el("span", "dan-race-portrait");
      portrait.setAttribute("aria-hidden", "true");
      formArt(portrait, current, 0);
      result.append(heading, portrait, ranking);
      const footer = foot();
      setMessage("門を" + player.gateOrder + "番手で通過。"
        + (player.spurtX === null ? "スパートを温存してゴール。" :
          player.spurtX < GATE_IN ? "門の手前でスパート！" :
            player.spurtX < GATE_OUT ? "門を通りながらスパート！" : "最後の直線でスパート！"));
      printedButton = button("danRacePrint", "この一走を記念札に", () => {
        if (printed || disposed || phase !== "result") return;
        printed = ctx.printCard({runId, species:current.species, name:current.name,
          uid:current.uid, generation:current.generation, rank, course:COURSE, rental:Boolean(current.rental)});
        if (printed) {
          printedButton.disabled = true;
          printedButton.textContent = "記念札を受け取った";
          setMessage("「" + current.name + " · " + rank + "着」の記念札。リアオの店で使えるよ。");
        } else {
          setMessage("記念札を保存できなかった。もう一度試してみて。");
        }
      });
      footer.append(printedButton, button("danRaceAgain", "もう一走", () => {
        preview();
        selection.focus({preventScroll:true});
      }));
      root.append(result, footer);
      heading.tabIndex = -1;
      heading.focus({preventScroll:true});
    }
    function animate(now) {
      raf = 0;
      if (disposed || phase !== "running" || doc.hidden || blurred) {lastFrame=null;return;}
      if (lastFrame !== null) advance(race, Math.min(.12, Math.max(0, (now - lastFrame) / 1000)));
      lastFrame = now;
      if (race.finished) {makeResult();return;}
      if (race.elapsed - lastPaint >= 1/30) {paint();lastPaint=race.elapsed;}
      resume();
    }
    function resume() {
      if (!disposed && phase === "running" && !raf && !doc.hidden && !blurred) raf = win.requestAnimationFrame(animate);
    }
    function pause() {
      if (raf) win.cancelAnimationFrame(raf);
      raf = 0;
      lastFrame = null;
    }
    function onVisibility() { if (doc.hidden) pause(); else resume(); }
    function onBlur() {blurred=true;pause();}
    function onFocus() {blurred=false;resume();}
    doc.addEventListener("visibilitychange", onVisibility);
    win.addEventListener("blur", onBlur);
    win.addEventListener("focus", onFocus);
    preview();
    return {
      pressA() {
        if (disposed || doc.hidden || blurred) return false;
        if (phase === "entry") return start();
        return phase === "running" && signal();
      },
      stop() {
        disposed = true;
        pause();
        doc.removeEventListener("visibilitychange", onVisibility);
        win.removeEventListener("blur", onBlur);
        win.removeEventListener("focus", onFocus);
      },
    };
  }
  return Object.freeze({createRace, advance, spurt, open});
});
