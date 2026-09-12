/* Village identities, event placements and bounded catch plans. The private
 * PRNG never consumes the player's fishing/size random-number stream. */
(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  else root.ShuTournamentNpcs = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";
  const roster = [
    { id: "gen", name: "源じい", role: "釣り好きのおじいさん", column: 0,
      greeting: ["今日は負けんぞ。草の際には、ええフナがおる。", "フナの口に合うエサを選ぶんじゃ。道具の値段だけでは決まらんぞ。"],
      fishing: ["浮きが沈んでも慌てんことじゃ。相手の調子を読むんじゃよ。", "ワシは練り餌でじっくり待つ。おぬしは何で狙っとる？"],
      won: ["優勝おめでとう！ ワシもまだまだ修行じゃな。", "見事じゃ。いいエサ選びと腕がそろった釣りだったのう。"],
      ahead: ["今回はワシの勝ちじゃな。次も手加減はせんぞ。", "長く釣っとると、こういう日もある。次はおぬしの番かもしれんな。"] },
    { id: "mina", name: "ミナ", role: "魚屋", column: 1,
      greeting: ["店はひと休み。今日は魚を見る目より、釣る腕の勝負ね！", "いいフナを選ぶのは得意よ。釣るほうも負けないからね。"],
      fishing: ["同じフナでも大きさがずいぶん違うのね。そこが面白いわ。", "まだ入れ替えの余地があるわ。最後の一投まで狙っていくよ。"],
      won: ["優勝おめでとう！ うちの店にも飾りたくなるようなフナだったね。", "今日の一番はあなたね。私も次は負けないよ！"],
      ahead: ["今回は私の勝ちね。でも、次の大会も楽しみにしてる。", "今日はエサがうまく合ったみたい。次もお互い頑張ろうね。"] },
    { id: "take", name: "タケ", role: "八百屋", column: 2,
      greeting: ["今日は野菜の重さじゃなく、フナの長さで勝負だ！", "うちのトウモロコシ、フナにも好評だといいんだがな。"],
      fishing: ["静かに待つのも釣りのうちか。つい声が大きくなるんだよ。", "ビクの五匹をどうそろえるか。なかなか頭を使うな！"],
      won: ["優勝おめでとう！ いやあ、立派な釣りっぷりだったな！", "お見事！ 次は俺も、大きさをそろえて勝負するぞ。"],
      ahead: ["今回は俺の勝ちだな！ また湖で勝負しようぜ。", "今日は調子が良かった！ 次も同じとは限らないからな。"] },
    { id: "haru", name: "ハル", role: "釣りが大好きな子ども", column: 3,
      greeting: ["今日はぼくも選手だよ！ 大きなフナ、釣れるかな。", "おじいちゃんたちに負けないぞ。まずは一匹、ちゃんと釣りたいな。"],
      fishing: ["浮きを見てると、時間がすぐ過ぎちゃうね。", "エサを変えると釣れる魚も変わるんだね。ぼく、覚えたよ！"],
      won: ["優勝おめでとう！ ぼくもいつか一番になるんだ！", "すごかったね！ 次はぼくも負けないぞ！"],
      ahead: ["やった、今日はぼくのほうが上だった！ また一緒に釣ろうね。", "ぼく、こんなに釣れたの初めてかも。次も頑張るよ！"] },
  ];
  const venues = {
    lakeFuna: [
      { id: "gen", x: 157, y: 31, facing: "left", place: "湖の東岸" },
      { id: "mina", x: 145, y: 49, facing: "left", place: "湖の南東岸" },
      { id: "take", x: 91, y: 49, facing: "right", place: "湖の南西岸" },
      { id: "haru", x: 77, y: 27, facing: "right", place: "湖の西岸" },
    ],
  };
  const asset = "assets/tournament-villagers-v175.png";
  // Source rectangles select the two complete poses from the original alpha
  // atlas without modifying the artwork. Feet share a bottom-centre anchor.
  const frames = [
    [[20, 58, 342, 501], [78, 568, 281, 491]],
    [[374, 58, 345, 501], [450, 568, 257, 491]],
    [[748, 57, 335, 502], [790, 570, 290, 488]],
    [[1103, 95, 320, 464], [1186, 650, 233, 408]],
  ];
  const byId = id => roster.find(npc => npc.id === id) || null;
  function random(seed) {
    let value = Number(seed) >>> 0;
    return () => { value = (Math.imul(value, 1664525) + 1013904223) >>> 0; return value / 4294967296; };
  }
  const integer = (rng, lo, hi) => lo + Math.floor(rng() * (hi - lo + 1));
  function shuffle(items, rng) {
    for (let i = items.length - 1; i > 0; i--) {
      const j = integer(rng, 0, i);
      [items[i], items[j]] = [items[j], items[i]];
    }
    return items;
  }
  function generate(definition, seed) {
    const rng = random(seed), limit = Math.floor(definition.duration / definition.castMinutes);
    return (definition.npcProfiles || []).map(profile => {
      const count = integer(rng, Math.min(limit, profile.count[0]), Math.min(limit, profile.count[1]));
      const kept = Math.min(count, definition.capacity), [min, max] = profile.length;
      const low = Math.max(kept * min, profile.total[0]);
      const high = Math.min(kept * max, profile.total[1]);
      let remaining = integer(rng, Math.min(low, high), Math.max(low, high));
      const lengths = [];
      for (let i = 0; i < kept; i++) {
        const left = kept - i - 1;
        const lo = Math.max(min, remaining - left * max), hi = Math.min(max, remaining - left * min);
        const size = integer(() => (rng() + rng()) / 2, lo, hi);
        lengths.push(size); remaining -= size;
      }
      for (let i = kept; i < count; i++) lengths.push(integer(rng, min, Math.min(...lengths)));
      shuffle(lengths, rng);
      const casts = shuffle(Array.from({ length: limit }, (_, i) => i + 1), rng).slice(0, count).sort((a, b) => a - b);
      return { id: profile.id, catches: lengths.map((hundredths, i) => ({ cast: casts[i], hundredths })) };
    });
  }
  function normalize(records, definition, seed) {
    const expected = (definition.npcProfiles || []).map(p => p.id);
    const limit = Math.floor(definition.duration / definition.castMinutes);
    if (!Array.isArray(records) || records.length !== expected.length) return generate(definition, seed);
    const normalized = [];
    for (const id of expected) {
      const record = records.find(r => r?.id === id);
      if (!record || !Array.isArray(record.catches) || record.catches.length > limit ||
          record.catches.some(f => !Number.isInteger(f?.cast) || f.cast < 1 || f.cast > limit ||
            !Number.isSafeInteger(f?.hundredths) || f.hundredths <= 0 || f.hundredths > 100000) ||
          new Set(record.catches.map(f => f.cast)).size !== record.catches.length) return generate(definition, seed);
      normalized.push({ id, catches: record.catches.map(f => ({ cast: f.cast, hundredths: f.hundredths })).sort((a, b) => a.cast - b.cast) });
    }
    return normalized;
  }
  function creel(record, completedCasts, capacity, fishId) {
    return (record?.catches || []).filter(f => f.cast <= completedCasts)
      .sort((a, b) => b.hundredths - a.hundredths).slice(0, capacity)
      .map(f => ({ fishId, hundredths: f.hundredths }));
  }
  function dialogue(id, context, previous = "", roll = 0) {
    const npc = byId(id);
    if (!npc) return "";
    let lines;
    if (context.after) {
      lines = context.reason !== "complete" ? ["また都合のいいときに、一緒に最後まで釣ろう。", "今日はお疲れさま。次の大会も待ってるよ。"]
        : context.playerCount === 0 ? ["釣れない日もあるよ。エサや深さを変えて、また挑戦しよう。", "次の一匹が、きっといいきっかけになるよ。また湖で会おう。"]
        : context.playerRank === context.npcRank ? ["同じ順位だったね！ 次はどっちが上になるかな。", "いい勝負だったね。最後の一匹まで気が抜けなかったよ。"]
        : context.playerRank === 1 ? npc.won
        : context.npcRank < context.playerRank ? npc.ahead
        : ["今回は負けちゃったね。次は負けないぞ！", "いい釣果だったね。次はもっと大きいのをそろえてくるよ。"];
    } else {
      lines = context.completedCasts === 0 ? npc.greeting
        : context.count === 0 ? ["まだ全然釣れないなあ。エサを見直して、もう少し粘ってみよう。", "浮きは動いたんだけど、まだビクは空っぽ。次こそ！"]
        : context.caughtLast ? ["さっき、いいフナが来たよ。ビクをのぞくたびにうれしくなるね。", "今の一匹で、少し順位が動いたかな。まだまだこれから！", ...npc.fishing]
        : ["さっき大きそうなのを逃しちゃった。次は落ち着いて合わせよう。", ...npc.fishing];
    }
    const choices = lines.filter(line => line !== previous);
    return choices[Math.min(choices.length - 1, Math.floor(Math.max(0, Math.min(.999999, roll)) * choices.length))] || lines[0];
  }
  function draw(canvas, atlas, id, { talking = false, facing = "left" } = {}) {
    const npc = byId(id);
    if (!npc || !atlas?.complete || !atlas.naturalWidth) return false;
    const ctx = canvas.getContext("2d"), [sx, sy, sw, sh] = frames[npc.column][talking ? 1 : 0];
    const targetHeight = canvas.height * (id === "haru" ? .78 : .96);
    const scale = Math.min((canvas.width - 6) / sw, targetHeight / sh);
    const width = sw * scale, height = sh * scale;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.imageSmoothingEnabled = false;
    ctx.save();
    ctx.translate(canvas.width / 2, canvas.height - 2);
    if (!talking && facing === "right") ctx.scale(-1, 1);
    ctx.drawImage(atlas, sx, sy, sw, sh, -width / 2, -height, width, height);
    ctx.restore();
    return true;
  }
  return { roster, byId, venues, asset, frames, random, generate, normalize, creel, dialogue, draw };
});
