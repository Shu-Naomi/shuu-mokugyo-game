# 黄金のフナ — 希少突然変異パイロット v251-8

基点main: `fc820b119be1a900e45da5f12a2e598c19d4936b`。対象は既存の `funa` と黄金 `gold` の一組のみ。通常55種＋ぬし5種の実カタログは60種のまま。通常魚の原画・釣りの抽選・本編図鑑・真エンド条件は変更しない。

## 抽選と保存

`petLife.version` を5から **6** に更新する。卵の生成時だけ、子の内部世代が2以上（表示は3代目以降）のフナを抽選する。両親の世代から子の世代を求める既存の `min(20, max(mother, father) + 1)` は維持する。

| 保存項目 | 内容 |
| --- | --- |
| `mutationSeed` | 冒険ごとの128bitの種。Web Cryptoで一度用意し、JSONへ保存してから抽選に使う |
| `mutationRuleVersion` | 現在は1。未知のルールで新しい抽選を勝手に解釈しない |
| 卵・魚の `mutation` | `checked`, `kind`, `ruleVersion`。通常色も明示的に保存 |
| 卵の `parents` | 産卵時の母・父のUID。後から親を探し直さない |
| `mutationDiscoveries` | 色ごとの初発見日・最初の個体UID・通知済み状態。売却後も残す |

種・卵UID・母と父のUID・産卵日・魚種・子の世代・ルール版から、同期のSHA-256で決定的な値を作る。32bit値の `4294967000` 以上を捨て、残りの値を0〜999へ均等に対応させる。0だけが黄金で、出現率は **1/1000**。拒否された値は同じ卵キーの次のハッシュ語・次ブロックで処理するので、単純な剰余の偏りを加えない。

タイトルでは保存を書き換えない。Start時にv6へ正規化済みの状態と種を先に保存し、その後に未処理の成長・繁殖日を同期する。同じ産卵前の保存地点から、同じ親と日付で同じ卵を作り直しても結果は同じ。卵生成後は結果を読み、再同期・描画・孵化・満員による孵化延期で抽選しない。孵化した魚には卵の結果をコピーし、水槽移動・成長・保存再開で維持する。

種の保存が失敗した間は抽選器を呼ばず、その卵を `checked:false, kind:normal, reason:seed-unavailable` とする。既存の未保存表示と通常の進行は維持する。その卵には後付け抽選をせず、保存に成功した後の新しい卵から抽選する。種はメモリでも作り直さず、成功時に同じ種を保存する。未知の将来のルールも未判定のまま保持する。

通常のロードへの対策であり、セーブJSONの手編集への対策ではない。種をまだ導入していない時代に作った保存データの別コピー間の同一性は復元できない。

## 旧データ・既存の育成

- v5以前の魚と既存卵は通常色・旧記録（`checked:true, kind:normal, ruleVersion:0`）へ移行し、後付け抽選しない。旧データに紛れた色項目を有効化しない。
- v6の未知の色IDは、魚と卵の正規化・孵化で落とさず保持する。表示は通常原画へ安全に戻し、未対応の色と表示する。
- 性別・世代の旧欠損表示は、既存の表示専用メモのまま。変異や系譜の推測には利用しない。
- 成魚の雌雄、元気70%以上、水質68%以上での産卵判定、3日の世話、フナの孵化2日、通常水槽5匹、卵による空き予約、稚魚サイズ、成長、経験値、星を維持する。
- 色は遺伝しない。黄金の親からでも新しい子は同じ独立抽選。能力・体長上限・売値・品評会得点への補正はない。

## 表示と発見

一覧と詳細へ「黄金」を添え、専用8姿勢の原画を使う。原画の切り替えは個体の `mutation` だけで決まり、通常フナや他の魚・水槽にCSSフィルターをかけない。稚魚・成魚、折り返しと口の開閉でも同じ色を保つ。

最初の黄金フナの孵化を記録し、水槽で最初に会ったときに短い一文と穏やかな強調を表示する。通知済みを先に保存できた場合だけ表示するので、再開時に同じ通知を繰り返さない。保存失敗時は未通知のまま残す。動きを減らす設定ではフェードを使わない。「記録・管理」に初発見日と個体番号を残す。

## 検証

新規の境界・互換・描画検査と既存の重点検査を専用CIで実行する。SHA-256はNodeの独立した実装と比較し、0/1/999、32bit拒否境界、子の世代1/2/20、親が異世代、抽選一回、通常結果、産卵前後のロード、種の保存失敗、二つのセーブ、旧魚と旧卵、未知ID、孵化延期、成長・移動・保存再開、通知の保存順、補正なしを確認する。

ブラウザはPC1280×720、タッチ844×390、タッチ820×366/DPR1.875。検査専用の保存済み種から実際の産卵処理で当たり卵を作り、孵化前は色を明かさないこと、黄金の稚魚、初発見、旧欠損表示、通常の他魚、日々の給餌と水換えで成魚まで成長、水槽移動、保存再開を検査する。ゲーム内に当たりを強制する機能は加えていない。スマホはChromiumの端末相当条件。

マージ後は公開runtime11ファイル（黄金PNGを含む）のSHA256一致と、公開版でも同じ3画面の操作を専用CIで確認する。完了結果とCIのリンクはPR本文へ記録する。未実施の検査は成功扱いにしない。

## 原画の制作記録

組み込みimagegenで生成。通常フナの8姿勢をゲームの既存原画から参照用に並べ、同じ順番の黄金色を別原画として作った。元ファイルは変更しない。

- 追加原画: `assets/aquarium-funa-gold-v251-8.png`、1536×1024、透過PNG。
- 追加原画SHA256: `602c861e1b1f7e60dc9bc84c135fd187cd56cba880580f6ce74dfb62ffc4326d`。
- 通常フナの元原画: `assets/fish-lake-v208.png`。SHA256 `d15babca220116e0d0c04bf4fed6b667d373b237f7c3f9cd64c4ebe9c87dd119` と一致することを検査する。
- アルファ輪郭に合わせた8個の切り出し範囲と口位置を `fish-art.js` の水槽専用 `funaGold` に追加。魚種データには追加しない。

生成指示（原文）:

```text
Use case: precise-object-edit. Asset type: transparent 8-frame sprite atlas for an existing Japanese fishing game. Input image is the edit target, showing 8 poses of ONE existing crucian carp (funa), arranged in 4 columns by 2 rows. Create a GOLDEN rare-color variant of exactly this same crucian carp. Change only the scale/skin and fins palette to distinctly rich warm metallic gold, luminous pale-gold belly, ochre/bronze shadows, restrained gold highlights; keep black eyes with small natural highlights. Preserve the eight poses in order, the anatomy, shape, scale details, fin placement, head locations, open mouth in the final frame, and relative sizes. Same 1536 by 1024 composition, each pose centered in its original grid cell with ample transparent spacing. Pixel-art inspired detailed retro game illustration, match the reference's rendering. Remove stray red/yellow colored background fringe artifacts outside the silhouettes: clean alpha edges. Actual transparent background. Exactly 8 fish poses, no extra fish, no added accessories, no sparkles/glow outside the fish, no water, no text, no grid lines, no shadow or backdrop. Do not turn the fish into a fancy goldfish: same plain crucian carp body and short natural fins.
```
