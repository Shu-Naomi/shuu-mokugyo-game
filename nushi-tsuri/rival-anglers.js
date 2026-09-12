/* Rival identities and original sprite frames. No player state, clock or RNG
 * is consumed here. The tournament engine owns their saved catch plans. */
(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  else root.ShuRivals = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";
  const asset = "assets/rival-anglers-v179.png";
  const dogAsset = "assets/rival-dogs-v179.png";
  const anglers = [
    { id: "liao", name: "リアオ・ダモディ", shortName: "リアオ", role: "再現性を追う理論派", dogId: "crow", column: 0,
      color: "#355640", style: "精密・安定型", strength: "同じ条件を丁寧に再現し、大きさのそろった五匹を集める。",
      description: "丸メガネと天然パーマが目印。慎重で手帳を手放さない。サムとは顔を合わせれば釣りの理屈で張り合うが、魚と犬にはやさしい。",
      greeting: ["一匹の偶然より、五匹の再現性だ。さあ、条件をそろえよう。", "サムの『長年の勘』か。数値にしてくれれば検討できるんだがね。", "クローが落ち着いた。僕も準備完了だ。今回は手強いよ。"],
      fishing: ["深さはそのまま。エサの大きさだけ変える。理由の分かる一投にしよう。", "派手な一匹はいらない。そろえた五匹で、最後に差がつく。"],
      empty: ["まだ仮説の途中さ。記録を取り直して、次の条件を試そう。", "反応がないのも記録だ。同じ失敗は繰り返さないよ。"],
      caught: ["今の一匹で仮説を確かめられた。次も同じ精度でいくよ。", "数値どおり……いや、少し上か。こういう誤差は歓迎だね。"],
      won: ["君の優勝だ。再現できる腕前だった。次は僕の手帳に、対策を増やそう。", "見事だね。結果は正直だ。君の釣り方を、もう一度見せてほしい。"],
      ahead: ["今回は僕の勝ちだ。一投ずつ積んだ差が、最後に残ったね。", "計画どおり、とは言い切れないな。君のおかげで、最後まで考えさせられた。"],
      behind: ["君のほうが上だった。敗因は持ち帰って、次の一投に生かすよ。", "負けた記録も捨てない。クロー、帰ったら作戦を練り直そう。"],
      tied: ["合計も最大魚も同じか。実に興味深い勝負だったね。", "同順位だ。次に差が出る条件を、考えておくよ。"],
      unfinished: ["今日はここまでだね。次は九投分の答えを、一緒に出そう。", "無理は精度を落とす。休んでから、また勝負しよう。"],
      noFish: ["釣れない条件が分かった。それも次の一匹につながる記録だよ。", "深さとエサを、一つずつ変えてみよう。君の次の挑戦を待っている。"],
      idle: ["サムは『勘を信じろ』と言う。僕は『その勘を記録しろ』と言う。いつもそこで言い合いだ。", "クローは浮きより先に僕の焦りに気づく。いい相棒には、ごまかしが利かないね。", "勝負なら、サムの受付で星湖名手挑戦を選んでくれ。準備はいつでもできているよ。"] },
    { id: "asual", name: "アスアル・マダケン", shortName: "アスアル", role: "大物を見抜く名手", dogId: "cloud", column: 1,
      color: "#253d60", style: "選別・大物型", strength: "良い反応を見極めて大型を選ぶ。一匹で順位を動かす力がある。",
      description: "金髪を低く結び、濃紺のジャケットを端正に着こなす。クールだが勝負には誠実。道具の扱いと手入れにも隙がない。",
      greeting: ["運も勝負のうち。でも、準備まで運任せにはしないわ。", "良い勝負にしましょう。私も、最後の一投まで譲らない。", "クラウド、ここで待っていて。今日は大きい魚の気配がする。"],
      fishing: ["小さな反応を全部追う必要はないわ。狙う魚を決めて、待つの。", "今は動かさない。大きい魚ほど、静かな間合いが必要ね。"],
      empty: ["まだ狙った反応が来ていないだけ。焦って道具は変えないわ。", "待つことも選択よ。次の一投は、少し沖を探す。"],
      caught: ["いい重さだったわ。大きさを選んだ甲斐があった。", "この一匹は残す。次は、いちばん小さい魚の入れ替えね。"],
      won: ["優勝おめでとう。あなたの判断も、最後の一投も見事だったわ。", "今回はあなたが一番ね。次はもっと良い勝負をしましょう。"],
      ahead: ["今回は私の勝ちね。油断できる一投は、ひとつもなかったわ。", "大物を待つ判断が実ったわ。次も正々堂々、勝負しましょう。"],
      behind: ["あなたの釣りが上だったわ。良い勝負をありがとう。", "次は私も精度を上げてくる。今日の結果は、きちんと受け止めるわ。"],
      tied: ["同順位ね。どちらも最後まで譲らなかった、ということかしら。", "合計も最大魚も同じ。次の勝負も楽しみね。"],
      unfinished: ["無理をしても良い判断はできないわ。次は万全で会いましょう。", "今日はここまでね。次の挑戦も、同じ条件で待っているわ。"],
      noFish: ["今日は難しかったわね。道具を整えて、また一匹から始めましょう。", "釣れない日もあるわ。次はあなたが選んだ一投を、見せてほしい。"],
      idle: ["道具は高ければいいわけではないわ。手に合うか、丁寧に確かめること。", "クラウドは足場を見るのが上手なの。私より先に安全な場所で待っているわ。", "星湖名手挑戦で会いましょう。私は手加減しないし、あなたの勝利もきちんと認めるわ。"] },
    { id: "dancer", name: "ダンサー・イチャピ", shortName: "ダンサー", role: "流れを読む技巧派", dogId: "jamie", column: 2,
      color: "#745365", style: "対応・入れ替え型", strength: "手数と判断を両立し、後半も小さな魚を入れ替えて合計を伸ばす。",
      description: "短髪と細いメガネ、日焼けした肌。すらりとした中性的な雰囲気で場を和らげる。竿を握ると動きに無駄がなくなる。",
      greeting: ["肩の力は抜こう。でも勝負は、最後まで本気でいくよ。", "ジェイミーも見てるからね。きれいな一投から始めようか。", "大きい一匹も、小さな判断も大切。どちらも積んでいこう。"],
      fishing: ["さっきの深さは少し違ったね。半歩ずつ、魚のいる場所へ寄せていこう。", "五匹そろってからが面白い。何を残すかで、同じ釣果も変わるから。"],
      empty: ["まだ合っていないだけさ。呼吸を整えて、エサの動きを見直そう。", "急がなくていい。次は浮きの動きに、少し長く付き合ってみるよ。"],
      caught: ["いい一匹だ。今度はビクの小さい魚を、一つ入れ替えられるね。", "流れがつかめてきた。この調子で、最後まで丁寧にいこう。"],
      won: ["優勝おめでとう！ 最後まで丁寧だったね。気持ちのいい勝負だったよ。", "君の勝ちだね。ジェイミーまでうれしそうだ。また一緒に競おう。"],
      ahead: ["今回は僕の勝ちだね。小さな入れ替えが、最後に効いたみたい。", "最後まで分からなかったね。良い勝負をありがとう、またやろう。"],
      behind: ["今日は君が一枚上手だったね。次までに、僕も磨いてくるよ。", "負けたけど、いい一投をたくさん見られた。また一緒に釣ろう。"],
      tied: ["ぴったり同順位だね。どっちも最後まで良い判断をしたんだと思う。", "これは引き分けだね。次の一投から、また勝負しようか。"],
      unfinished: ["今日はゆっくり休もう。次は最後まで、隣で釣れたらうれしいな。", "無理をしないのも大事な判断だよ。また湖で会おう。"],
      noFish: ["今日は魚の調子と合わなかったね。次は、まず一匹を一緒に探そう。", "一度息を吐いてから投げてみよう。焦らない一投が、案外いちばん近道だよ。"],
      idle: ["リアオとサムがまた言い合い？ じゃあ僕らは、その間にいい釣り場を探しておこうか。", "ジェイミーが隣にいると、僕も呼吸がゆっくりになる。急がないことも技術なんだ。", "本気の勝負なら星湖名手挑戦へ。のんびりした顔でも、ビクの五匹は譲らないよ。"] },
  ];
  const dogs = [
    { id: "crow", name: "クロー", ownerId: "liao", owner: "リアオ", breed: "ボーダーコリー", row: 0,
      color: "黒×白", collar: "朱橙の首輪・四角い真鍮札", description: "細い白い額筋と大きな黒い背中。片耳の先が折れ、低い飾り尾を持つ、仕事上手な相棒。",
      idle: ["クローは静かに耳を動かし、リアオの手元と水面を交互に見ている。", "こちらを見ると小さく尾を振り、すぐに相棒のそばへ視線を戻した。"],
      fishing: ["クローは足元で姿勢を正し、浮きを見つめるリアオを落ち着いて待っている。", "手帳を閉じる音に片耳がぴくり。声を出さず、次の一投を待っている。"] },
    { id: "cloud", name: "クラウド", ownerId: "asual", owner: "アスアル", breed: "ボーダーコリー", row: 1,
      color: "ブルーマール×白", collar: "濃紺の首輪・ひし形の銀札", description: "青灰色に大きな濃灰のまだら。白い胸と長い飾り尾が映える、上品で俊敏な相棒。",
      idle: ["クラウドは軽い足取りで向き直り、銀色の迷子札をきらりと揺らした。", "白い尾先が静かに動く。アスアルの声を聞くと、すっと姿勢を整えた。"],
      fishing: ["クラウドは道具から少し離れ、アスアルが竿を振れる場所を空けている。", "水音に耳を向けても飛び出さない。相棒の合図を、落ち着いて待っている。"] },
    { id: "jamie", name: "ジェイミー", ownerId: "dancer", owner: "ダンサー", breed: "ラブラドール", row: 2,
      color: "クリーム寄りの白", collar: "青緑の首輪・丸い真鍮札", description: "丸い垂れ耳と太くまっすぐな尾。短いクリーム色の毛並み、やさしい目つきの穏やかな相棒。",
      idle: ["ジェイミーは穏やかに座り、太い尾をゆっくり振って迎えてくれた。", "ダンサーの足元であくびをひとつ。こちらにも、やさしい目を向けている。"],
      fishing: ["ジェイミーはダンサーの足元に座り、静かに一投が終わるのを待っている。", "魚が跳ねると耳が少し動いた。相棒の『待っててね』に、尾だけで返事をした。"] },
    { id: "chappie", name: "チャッピー", ownerId: "sam", owner: "サム", breed: "ハスキー", row: 3,
      color: "赤茶×白", collar: "鋼青の太い首輪・真鍮の横長札", description: "白い顔模様と青い目、厚い胸毛と高く曲がる房尾。サムの横で落ち着いて構える、風格ある大型犬。",
      idle: ["チャッピーは白い眉を少し上げ、静かにこちらを見た。サムの店を長く見守ってきた目だ。", "サムが呼ぶと、チャッピーの厚い尾が一度だけゆったり揺れた。", "『リアオのやつ、また理屈を並べおって』。サムのぼやきに、チャッピーは落ち着いて鼻を鳴らした。"],
      fishing: ["チャッピーは店先で静かに座っている。大会の帰りを待つ、頼もしい姿だ。", "サムが釣り人たちの話をするたび、チャッピーは片耳を向けて聞いている。"] },
  ];
  const placements = [
    { id: "liao", x: 157, y: 31, facing: "left", place: "湖の東岸" },
    { id: "asual", x: 145, y: 49, facing: "left", place: "湖の南東岸" },
    { id: "dancer", x: 91, y: 49, facing: "right", place: "湖の南西岸" },
  ];
  const dogPlacements = [
    { id: "crow", x: 164, y: 31, facing: "left", place: "リアオのそば" },
    { id: "cloud", x: 153, y: 52, facing: "left", place: "アスアルのそば" },
    { id: "jamie", x: 83, y: 52, facing: "right", place: "ダンサーのそば" },
    { id: "chappie", x: 208, y: 96, facing: "left", place: "サムの店先" },
  ];
  const profiles = [
    { id: "liao", count: [5, 7], length: [2200, 3450], total: [12500, 14400] },
    { id: "asual", count: [4, 6], length: [2400, 4100], total: [13200, 16900] },
    { id: "dancer", count: [6, 8], length: [2100, 3600], total: [12000, 15300], finishStrong: true },
  ];
  // Select original alpha artwork only at render time; no rebuilt sprites or
  // painted backgrounds. Atlas gutters vary, so use measured source bounds.
  const frames = [
    [[110, 18, 352, 478], [178, 501, 240, 506]],
    [[585, 10, 328, 488], [668, 504, 220, 505]],
    [[1077, 25, 320, 472], [1132, 499, 278, 510]],
  ];
  const portraits = [[236, 533, 134], [721, 525, 142], [1186, 519, 142]];
  const dogFrames = [
    [[106, 5, 421, 370], [671, 10, 323, 365]],
    [[109, 378, 450, 361], [673, 378, 327, 361]],
    [[76, 739, 457, 338], [667, 739, 324, 338]],
    [[76, 1077, 472, 443], [667, 1077, 328, 443]],
  ];
  const dogPortraits = [[655, 9, 197], [660, 378, 197], [660, 738, 195], [662, 1077, 205]];
  const byId = id => anglers.find(n => n.id === id) || null;
  const dogById = id => dogs.find(n => n.id === id) || null;
  const character = id => byId(id) || dogById(id);
  function choose(lines, previous = "", roll = 0) {
    const choices = lines.filter(line => line !== previous);
    return choices[Math.min(choices.length - 1, Math.floor(Math.max(0, Math.min(.999999, roll)) * choices.length))] || lines[0];
  }
  function dialogue(id, context = {}, previous = "", roll = 0) {
    const dog = dogById(id), npc = byId(id);
    if (dog) return choose(context.after || !context.tournament ? dog.idle : dog.fishing, previous, roll);
    if (!npc) return "";
    let lines;
    if (!context.tournament && !context.after) lines = npc.idle;
    else if (context.after) lines = context.reason !== "complete" ? npc.unfinished
      : context.playerCount === 0 ? npc.noFish : context.playerRank === context.npcRank ? npc.tied
      : context.playerRank === 1 ? npc.won : context.npcRank < context.playerRank ? npc.ahead : npc.behind;
    else lines = context.completedCasts === 0 ? npc.greeting : context.count === 0 ? npc.empty
      : context.caughtLast ? npc.caught : npc.fishing;
    return choose(lines, previous, roll);
  }
  function draw(canvas, atlas, id, { talking = false, sitting = talking, facing = "left" } = {}) {
    const npc = byId(id), dog = dogById(id);
    if ((!npc && !dog) || !atlas?.complete || !atlas.naturalWidth) return false;
    const frame = dog ? dogFrames[dog.row][sitting ? 1 : 0] : frames[npc.column][talking ? 1 : 0];
    const [sx, sy, sw, sh] = frame, ctx = canvas.getContext("2d");
    const target = dog ? (id === "chappie" ? .99 : .86) : id === "liao" ? .9 : id === "dancer" ? .96 : .99;
    const scale = Math.min((canvas.width - 4) / sw, (canvas.height - 2) * target / sh);
    ctx.clearRect(0, 0, canvas.width, canvas.height); ctx.imageSmoothingEnabled = false;
    ctx.save(); ctx.translate(canvas.width / 2, canvas.height - 2);
    if (!(dog ? sitting : talking) && facing === "right") ctx.scale(-1, 1);
    ctx.drawImage(atlas, sx, sy, sw, sh, -sw * scale / 2, -sh * scale, sw * scale, sh * scale);
    ctx.restore(); return true;
  }
  function drawPortrait(canvas, atlas, id) {
    const npc = byId(id), dog = dogById(id);
    if ((!npc && !dog) || !atlas?.complete || !atlas.naturalWidth) return false;
    const [x, y, size] = dog ? dogPortraits[dog.row] : portraits[npc.column];
    const ctx = canvas.getContext("2d"); ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(atlas, x, y, size, size, 0, 0, canvas.width, canvas.height); return true;
  }
  return { anglers, dogs, byId, dogById, character, placements, dogPlacements, profiles,
    asset, dogAsset, frames, portraits, dogFrames, dogPortraits, dialogue, draw, drawPortrait };
});
