/* Dan's short automatic race. Distance is in course units, time in seconds. */
(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  else root.ShuVillageFishRace = api;
})(typeof globalThis === "undefined" ? this : globalThis, function () {
  "use strict";

  const GATE_IN = 40, GATE_OUT = 50, LAST_STRAIGHT = 75, FINISH = 100;
  const STEP = 1 / 60, SPURT_SECONDS = 2.35;
  const courses = { gate:"水草の門", mill:"水車の分かれ道" };
  const routes = { wheel:"水車側（近道）", bank:"岸側（遠回り）" };
  const FORK = 23, MERGE = 72, JET_START = 42, JET_END = 54;
  const WHEEL_PERIOD = 4.6, FIRST_SURGE = 1.95, SURGE_SECONDS = 1.5, WARN_SECONDS = .85;

  // The wheel begins from the same spoke on every start, including retries.
  function millFlow(time) {
    const phase = (time - FIRST_SURGE + WHEEL_PERIOD) % WHEEL_PERIOD;
    if (phase < SURGE_SECONDS) return "surge";
    return phase >= WHEEL_PERIOD - WARN_SECONDS ? "warning" : "calm";
  }
  // First straight, gate exit, home straight. Every entrant starts on the same line.
  const pace = {
    launch:   {opening:7.04, exit:6.90, home:6.72, earlyBoost:3.55, lateBoost:1.50},
    finish:   {opening:7.00, exit:7.36, home:7.60, earlyBoost:1.40, lateBoost:4.25},
    sprinter: {opening:7.27, exit:6.85, home:6.60, earlyBoost:1.65, lateBoost:1.65},
    closer:   {opening:6.77, exit:7.48, home:8.10, earlyBoost:3.05, lateBoost:3.05},
    millFront:{opening:7.40, exit:6.85, home:6.02, earlyBoost:1.65, lateBoost:1.65},
    millLate: {opening:7.05, exit:7.48, home:7.90, earlyBoost:3.05, lateBoost:3.05},
  };
  const rentals = [
    {uid:"rental-funa", species:"funa", name:"フナ", style:"launch"},
    {uid:"rental-ayu", species:"ayu", name:"アユ", style:"finish"},
  ].map(f => ({...f, rental:true, generation:null, generationLabel:"レンタル"}));
  const rivals = [
    {species:"oikawa", name:"はやて", role:"front"},
    {species:"ugui", name:"しぶき", role:"late"},
  ];

  function createRace(style = "launch", care = 0, options = {}) {
    const course = options.course === "mill" ? "mill" : "gate";
    const kinds = [style === "finish" ? "finish" : "launch",
      course === "mill" ? "millFront" : "sprinter", course === "mill" ? "millLate" : "closer"];
    const route = options.route === "bank" ? "bank" : "wheel";
    const training = Number.isInteger(options.training) ? Math.max(-2, Math.min(2, options.training)) : 0;
    return {course, elapsed:0, carry:0, gateOwner:null, passages:0, finished:false,
      runners:kinds.map((kind, index) => ({
        index, kind, x:0, spurtAt:null, spurtX:null, spurtDuration:SPURT_SECONDS,
        training:index === 0 ? training : 0, spurtForce:1,
        route:index === 0 ? route : index === 1 ? "wheel" : "bank", mergeTime:null,
        gateOrder:0, gateArrival:null, waited:0, finishTime:null,
        care:index === 0 ? Math.min(.14, Math.max(0, Number(care) || 0)) : 0,
      }))};
  }
  function startSpurt(fish, time) {
    fish.spurtAt = time;
    fish.spurtX = fish.x;
    if (fish.x < GATE_OUT) fish.spurtForce = 1 - fish.training * .19;
    else fish.spurtDuration = SPURT_SECONDS + fish.training * .43;
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
      if (age < fish.spurtDuration) {
        const boost = fish.x < GATE_OUT ? profile.earlyBoost : profile.lateBoost;
        v += boost * fish.spurtForce * Math.min(1, (age + .1) / .24, (fish.spurtDuration - age) / .4);
      }
    }
    return v;
  }
  function finishStep(race, fish, next, speed) {
    if (next >= FINISH) {
      fish.finishTime = race.elapsed + (FINISH - fish.x) / speed;
      next = FINISH;
    }
    fish.x = next;
  }
  function millStep(race) {
    const surging = millFlow(race.elapsed) === "surge";
    for (const fish of race.runners) {
      if (fish.finishTime !== null) continue;
      let speed = velocity(fish, race.elapsed);
      if (fish.x >= FORK && fish.x < MERGE) speed *= fish.route === "wheel" ? 1.09 : .91;
      let next = fish.x + speed * STEP;
      if (surging && fish.route === "wheel" && fish.x < JET_END && next >= JET_START) {
        // Water pushes swimmers back toward the lip, then holds them there.
        next = Math.max(JET_START, Math.min(fish.x, fish.x + (speed - 14) * STEP));
      }
      if (fish.mergeTime === null && next >= MERGE) {
        fish.mergeTime = race.elapsed + (MERGE - fish.x) / speed;
      }
      finishStep(race, fish, next, speed);
    }
  }
  function gateStep(race) {
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
      finishStep(race, fish, next, v);
    }
  }
  function tick(race) {
    const [, front, late] = race.runners;
    if (front.spurtAt === null && front.x >= 30) startSpurt(front, race.elapsed);
    if (late.spurtAt === null && late.x >= 76) startSpurt(late, race.elapsed);
    if (race.course === "mill") millStep(race);
    else gateStep(race);
    race.elapsed += STEP;
    race.finished = race.runners.every(fish => fish.finishTime !== null);
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
  function millLane(index, x, route) {
    const normal = [50, 27, 74][index];
    const branch = route === "wheel" ? [35, 23, 32][index] : [67, 72, 83][index];
    if (x < FORK) return normal;
    if (x < 35) return normal + (branch - normal) * (x - FORK) / (35 - FORK);
    if (x < 61) return branch;
    // The two channels meet at the tip of the island; the field fans out again downstream.
    const junction = [50, 45, 55][index];
    if (x < MERGE) return branch + (junction - branch) * (x - 61) / (MERGE - 61);
    return junction + (normal - junction) * Math.min(1, (x - MERGE) / 12);
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
    const motionPreference = win.matchMedia?.("(prefers-reduced-motion: reduce)");
    let phase = "entry", race = null, runId = null, current = null, disposed = false;
    let raf = 0, lastFrame = null, lastPaint = -Infinity, lastArt = -Infinity, blurred = false;
    let printed = null, previousMessage = "", views = [];
    const entrants = [...ctx.entrants(), ...rentals];
    const byUid = new Map(entrants.map(f => [f.uid, f]));
    let selectedUid = entrants[0].uid, course = "gate", route = "wheel";
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
    // Sprites composed at race scale; the larger result portrait and unusual
    // aquarium forms retain their individual aquarium illustrations.
    const swimmerRows = {funa: 0, ayu: 1, oikawa: 2, ugui: 3};
    function formArt(node, fish, frame) {
      const row = swimmerRows[fish.species];
      if (!node.classList.contains("dan-race-fish") || row === undefined ||
          fish.appearance?.rare || fish.appearance?.fry) {
        ctx.drawFish(node, fish.species, Math.floor(frame), fish.specimen || null);
        return;
      }
      let sprite = node.firstElementChild;
      if (!sprite) {
        sprite = el("span", "dan-swimmer-sprite");
        sprite.setAttribute("aria-hidden", "true");
        sprite.dataset.species = fish.species;
        sprite.style.backgroundPositionY = (row / 3 * 100) + "%";
        node.append(sprite);
      }
      const column = Math.floor(frame * 12 / 8) % 12;
      if (sprite.dataset.frame !== String(column)) {
        sprite.dataset.frame = String(column);
        sprite.style.backgroundPositionX = (column / 11 * 100) + "%";
      }
    }

    const timeText = cs => (cs / 100).toFixed(2) + "秒";
    let status, cueButton, selection, track, scoreboard;
    function makeWake(layer) {
      const marks = Array.from({length: 3}, () => {
        const node = el("span", "dan-race-wake");
        node.hidden = true;
        layer.append(node);
        return {node, born: -Infinity};
      });
      return {marks, next: 0, lastX: 0, lastTime: 0};
    }
    function paintWake(wake, swimmer, xPercent, yPercent, boosting) {
      const now = race.elapsed;
      // Use actual distance along the course. The gate and the mill can
      // hold a swimmer stationary even while the tail is still beating.
      if (swimmer.finishTime === null && swimmer.x - wake.lastX >= .8 &&
          now - wake.lastTime >= (boosting ? .23 : .31)) {
        const mark = wake.marks[wake.next];
        wake.next = (wake.next + 1) % wake.marks.length;
        wake.lastX = swimmer.x;
        wake.lastTime = mark.born = now;
        mark.node.style.left = xPercent;
        mark.node.style.top = yPercent;
        mark.node.toggleAttribute("data-spurt", boosting);
        mark.node.hidden = false;
      }
      for (const {node, born} of wake.marks) {
        if (node.hidden) continue;
        const stage = Math.floor((now - born) / .17);
        if (stage >= 4) node.hidden = true;
        else if (node.dataset.stage !== String(stage)) node.dataset.stage = String(stage);
      }
    }
    function buildCourse(fish) {
      const mill = course === "mill";
      track = el("div", "dan-race-course");
      track.dataset.danCourse = course;
      for (const patch of ["west", "southwest", "north", "east", "south", "far-bank"]) {
        const ripple = el("span", "dan-race-ripple");
        ripple.dataset.patch = patch;
        ripple.setAttribute("aria-hidden", "true");
        track.append(ripple);
      }
      track.setAttribute("role", "img");
      track.setAttribute("aria-label", mill
        ? "水車の分かれ道。上は逆流する水車側、下は穏やかな岸側。小島の先で合流してゴール。"
        : "水草の門。左からスタート、水草の切れ目、最後の直線、ゴール。");
      const wakeLayer = race ? el("div", "dan-race-wakes") : null;
      if (wakeLayer) {
        wakeLayer.setAttribute("aria-hidden", "true");
        track.append(wakeLayer);
      }
      const landmarks = mill
        ? [["island"], ["wheel"], ["flow"], ["route-wheel", "内 · 水車側"], ["route-bank", "外 · 岸側"]]
        : [["gate"]];
      for (const [name, text] of [...landmarks, ["finish"]]) {
        const decoration = el("span", "dan-race-" + name, text);
        decoration.setAttribute("aria-hidden", "true");
        track.append(decoration);
      }
      track.append(el("span", "dan-race-course-name", courses[course]));
      scoreboard = el("div", "dan-race-scoreboard");
      scoreboard.setAttribute("aria-label", "自分の順位と進行");
      track.append(scoreboard);
      views = [fish, ...rivals].map((identity, i) => {
        const runner = el("div", "dan-race-runner");
        runner.dataset.racer = i ? identity.role : "player";
        const art = el("span", "dan-race-fish");
        const tag = el("span", "dan-race-tag", i ? identity.name : "自分");
        runner.append(art, tag);
        track.append(runner);
        formArt(art, identity, 0);
        return {runner, art, identity, wake: wakeLayer ? makeWake(wakeLayer) : null};
      });
      positionFish();
      return track;
    }
    function positionFish() {
      if (scoreboard) {
        const player = race?.runners[0];
        const rank = player ? 1 + race.runners.filter(f => f.x > player.x || (f.finishTime !== null && player.finishTime !== null && f.finishTime < player.finishTime)).length : 1;
        scoreboard.textContent = player ? `自分 ${rank}位 / 3  ·  ${Math.min(100, Math.floor(player.x))}%` : "魚レース · 出走準備";
      }
      if (course === "mill") {
        const t = race?.elapsed ?? 0;
        track.dataset.flow = millFlow(t);
        track.dataset.route = route;
        track.style.setProperty("--wheel-angle", ((t - FIRST_SURGE) / WHEEL_PERIOD * 360).toFixed(1) + "deg");
      }
      views.forEach(({runner, wake}, i) => {
        const swimmer = race?.runners[i];
        const progress = swimmer?.x || 0;
        const boosting = Boolean(swimmer && swimmer.spurtAt !== null &&
          swimmer.finishTime === null && race.elapsed - swimmer.spurtAt < swimmer.spurtDuration);
        runner.classList.toggle("is-spurting", boosting);
        const xPercent = (7 + .87 * progress).toFixed(2) + "%";
        const y = course === "mill" ? millLane(i, progress, swimmer?.route ?? route) : laneY(i, progress);
        const yPercent = y.toFixed(2) + "%";
        runner.style.left = xPercent;
        runner.style.top = yPercent;
        if (wake && !motionPreference?.matches) paintWake(wake, swimmer, xPercent, yPercent, boosting);
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
    function picker(entry, id, title) {
      const label = el("label", "", title);
      label.htmlFor = id;
      const select = el("select");
      select.id = id;
      entry.append(label, select);
      return {label, select};
    }
    function addChoices(select, choices, selected) {
      for (const [value, title] of Object.entries(choices)) {
        const option = el("option", "", title);
        option.value = value;
        select.append(option);
      }
      select.value = selected;
    }
    function previewTip() {
      const fish = byUid.get(selectedUid);
      const style = fishStyle(fish) === "launch" ? "先行型" : "差し型";
      const tilt = fish.specimen && win.ShuPetLife?.raceTrainingLabel(fish.specimen);
      const best = ctx.getRaceBest?.(selectedUid, courses[course]);
      const hint = course === "gate" ? "水草の隙間は一匹ずつだ。"
        : route === "wheel" ? "水車側は近道。白波が立ったら、逆流が来るぞ！" : "岸側は遠回り。流れは穏やかだ。";
      setMessage("ダン「" + hint + "スパートは一度！」 " + style + (tilt ? " · " + tilt : "") +
        (best == null ? "" : " ／ 自己ベスト " + timeText(best)));
    }
    function preview() {
      phase = root.dataset.racePhase = "entry";
      race = null;
      root.replaceChildren();
      const entry = el("div", "dan-race-entry");
      selection = picker(entry, "danEntrantPicker", "出走魚").select;
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
      const coursePicker = picker(entry, "danCoursePicker", "コース").select;
      addChoices(coursePicker, courses, course);
      const routePicker = picker(entry, "danRoutePicker", "進路");
      addChoices(routePicker.select, routes, route);
      routePicker.label.hidden = routePicker.select.hidden = routePicker.select.disabled = course !== "mill";
      root.append(entry, buildCourse(byUid.get(selectedUid)));
      const footer = foot();
      root.append(footer);
      previewTip();
      if (ctx.claimSamples && !ctx.getSampleStatus()) {
        const sample = button("danRaceSamples", "育成おやつをもらう", () => {
          const claim = ctx.claimSamples();
          setMessage(claim.message + (claim.ok ? " 飼育水槽で一匹を選んであげてね。" : ""));
          if (claim.ok) {
            sample.remove();
            cueButton.focus({preventScroll:true});
          }
        });
        footer.append(sample);
      }
      cueButton = button("danRaceStart", "レース開始", start);
      footer.append(cueButton);
      selection.addEventListener("change", () => {
        selectedUid = selection.value;
        const fish = byUid.get(selectedUid);
        const art = el("span", "dan-race-fish");
        views[0].art.replaceWith(art);
        views[0].art = art;
        views[0].identity = fish;
        formArt(art, fish, 0);
        previewTip();
      });
      coursePicker.addEventListener("change", () => {
        course = coursePicker.value;
        routePicker.label.hidden = routePicker.select.hidden = routePicker.select.disabled = course !== "mill";
        const previous = track;
        previous.replaceWith(buildCourse(byUid.get(selectedUid)));
        previewTip();
      });
      routePicker.select.addEventListener("change", () => {
        route = routePicker.select.value;
        positionFish();
        previewTip();
      });
    }
    function start() {
      if (disposed || phase !== "entry") return false;
      current = byUid.get(selectedUid);
      runId = ctx.newRunId();
      printed = null;
      race = createRace(fishStyle(current), careBonus(current), {course, route, training:current.specimen?.raceTraining});
      phase = root.dataset.racePhase = "running";
      root.replaceChildren();
      root.append(buildCourse(current));
      const footer = foot();
      root.append(footer);
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
      if (course === "mill") {
        if (player.x < FORK) return route === "wheel" ? "小島の上、水車側の近道へ！" : "岸側へ向かう。小島の下を大回り！";
        if (player.x < MERGE) {
          if (route === "bank") return "岸側は穏やか。小島の先で二つの流れが合流する。";
          if (player.x <= JET_END) {
            const flow = millFlow(race.elapsed);
            if (flow === "warning") return "白い泡が集まってきた。間もなく水車から逆流！";
            if (flow === "surge") return player.x >= JET_START
              ? "水車の逆流に押し戻されている！" : "水車が逆流中！ 白波が引けば近道が開く。";
            return "水車側の流れが緩んだ。近道を抜けるチャンス！";
          }
          return "白波を抜けた！ 合流点が見えてきた。";
        }
        const rank = 1 + race.runners.filter(f => f.x > player.x).length;
        return "合流を抜けて" + (rank === 1 ? "先頭" : rank + "番手") + "！ " +
          (player.spurtAt === null ? "最後の直線、Aでスパート！" : "もうすぐゴール！");
      }
      if (player.x === GATE_IN && player.gateOrder === 0) return "ダン「先客が門を通ってるぞ！」";
      if (player.spurtAt !== null && race.elapsed - player.spurtAt < player.spurtDuration)
        return current.name + "がスパート！";
      if (player.x < GATE_IN) return "水草の門が近い。先に出るか、力を残すか？";
      if (player.x < GATE_OUT) return "ダン「" + player.gateOrder + "番手で門へ入った！」";
      return "最後の直線！ " + (player.spurtAt === null ? "Aでスパートできる。" : "ゴールまであと少し。");
    }
    function paint() {
      positionFish();
      const reduced = motionPreference?.matches;
      if (!reduced && race.elapsed - lastArt >= 1 / 15) {
        lastArt = race.elapsed;
        views.forEach(({art, identity}, i) => {
          const swimmer = race.runners[i];
          if (swimmer.finishTime !== null) return;
          const gait = win.ShuAquariumLife.gait(identity.species);
          // Accumulate only the extra swim time spent sprinting, so neither
          // entering nor leaving a spurt skips to a different tail stroke.
          const boostTime = swimmer.spurtAt === null ? 0 : Math.min(race.elapsed - swimmer.spurtAt, swimmer.spurtDuration);
          const swimTime = race.elapsed + boostTime * .35;
          const frame = win.ShuFishMotion.phase(identity.species, swimTime, gait.speed, false, i);
          formArt(art, identity, frame);
        });
      }
      setMessage(raceMessage());
    }
    function finishCommentary(player, rank, mergeRank) {
      if (course === "gate") {
        return "門を" + player.gateOrder + "番手で通過。" + (player.spurtX === null ? "スパートを温存してゴール。" :
          player.spurtX < GATE_IN ? "門の手前でスパート！" : player.spurtX < GATE_OUT ? "門を通りながらスパート！" : "門の先でスパート！");
      }
      const from = (route === "wheel" ? "水車側" : "岸側") + "から" + mergeRank + "番手で合流。";
      if (rank < mergeRank) return from + "最後の直線で" + (mergeRank - rank) + "匹を追い抜いて" + rank + "着！";
      if (rank > mergeRank) return from + "最後の直線で" + (rank - mergeRank) + "匹にかわされ、" + rank + "着。";
      return from + (rank === 1 ? "ゴールでも先頭、1着！" : "ゴールでも" + rank + "着。");
    }
    function makeResult() {
      const player = race.runners[0];
      const order = finishOrder(race);
      const rank = order.indexOf(player) + 1;
      const timeCs = Math.round(player.finishTime * 100);
      const resultData = {runId, uid:current.uid, species:current.species, name:current.name, generation:current.generation,
        course:courses[course], route:course === "mill" ? route : null, rental:Boolean(current.rental), timeCs, rank};
      phase = root.dataset.racePhase = "result";
      root.replaceChildren();
      const result = el("div", "dan-race-result");
      result.dataset.timeCs = String(timeCs);
      const heading = el("h3", "", current.name + "　" + rank + "着");
      heading.id = "danRaceRank";
      heading.dataset.rank = String(rank);
      const ranking = el("ol");
      for (const fish of order) {
        const identity = views[fish.index].identity;
        const row = el("li");
        const name = el("b", "", (fish.index ? "" : "自分 · ") + identity.name);
        row.append(name, el("span", "", timeText(Math.round(fish.finishTime * 100))));
        ranking.append(row);
      }
      const portrait = el("span", "dan-race-portrait");
      portrait.setAttribute("aria-hidden", "true");
      formArt(portrait, current, 0);
      const mergeRank = course === "mill" ? [...race.runners].sort((a, b) => a.mergeTime - b.mergeTime || a.index - b.index).indexOf(player) + 1 : null;
      if (mergeRank !== null) result.dataset.mergeRank = String(mergeRank);
      const commentary = el("p", "dan-race-commentary", finishCommentary(player, rank, mergeRank));
      const best = el("p", "dan-race-best");
      best.id = "danRaceBest";
      best.setAttribute("role", "status");
      result.append(heading, portrait, ranking, commentary, best);
      const footer = foot();
      let record = null;
      const retry = button("danRaceRetryBest", "タイムを再保存", saveTime);
      function saveTime() {
        if (record || phase !== "result" || disposed) return;
        record = ctx.finishRace(resultData);
        retry.hidden = Boolean(record);
        if (!record) {
          best.textContent = "タイムを保存できなかった。";
          return;
        }
        result.dataset.personalBest = String(record.isBest);
        const time = timeText(timeCs);
        if (record.previousCs === null) best.textContent = "初記録！ この子の自己ベスト " + time;
        else if (record.isBest) best.textContent = "自己新！ " + time + "（" + timeText(record.previousCs - timeCs) + "短縮）";
        else if (timeCs === record.bestCs) best.textContent = "自己ベストと同タイム · " + time;
        else best.textContent = "自己ベスト " + timeText(record.bestCs) + " ／ 今回は +" + timeText(timeCs - record.bestCs);
      }
      saveTime();
      const printedButton = button("danRacePrint", "この一走を記念札に", () => {
        if (printed || disposed || phase !== "result") return;
        saveTime();
        if (!record) return;
        printed = ctx.printCard(resultData);
        if (printed) {
          printedButton.disabled = true;
          printedButton.textContent = "記念札を受け取った";
          setMessage("「" + current.name + " · " + rank + "着」の記念札。リアオの店で使えるよ。");
        } else {
          setMessage("記念札を保存できなかった。もう一度試してみて。");
        }
      });
      footer.append(retry, printedButton, button("danRaceAgain", "この子でもう一走", () => {
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
  return Object.freeze({createRace, advance, spurt, millFlow, open});
});
