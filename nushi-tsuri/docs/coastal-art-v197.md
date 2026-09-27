# 沿岸アート v197

v196 のカヌーは形こそ改善したが、240×135 の単色背景と64×48の乗船表示が、既存の村マップに対して粗かった。v197 は村の既存素材を参考に沿岸の完成背景と乗船用アトラスを追加する。

## 組み込み素材

| ファイル | サイズ | 用途 |
| --- | --- | --- |
| `assets/coast-world-v197.webp` | 1672×941 | 海面、浅瀬、白砂・岩礁の島、三つの桟橋、休憩所 |
| `assets/coast-canoe-v197.webp` | 2048×768 | 男女それぞれ上・右・下・左の乗船姿勢 |
| `assets/coast-canoe-stroke-v197.webp` | 2048×768 | 腕と一本パドルの二コマ目 |

画像は組み込み ImageGen で生成・修正した。PNGからWebPへの保存は可逆圧縮のみで、RGBAの全画素一致を確認済み。透過部分を含め、生成後の手作業による画素編集はしていない。

背景の描画面を1536×864、乗船の描画面を192×144にした。CSS上の大きさ、カメラ、島・桟橋の座標、移動幅、体力消費、セーブ形式は変更していない。方向ごとの船体中心を基準に切り出すため、パドルを含めた外接矩形の差で船体が左右に跳ねない。停止中は一コマ目、移動中のみ二コマの漕ぎ姿勢を使う。

画像は非同期で先読みし、完了後に直近の向き・主人公・時間帯を再描画する。読み込み失敗時の既存描画、タライのv196アトラスは残す。釣りの水中画面、釣果画面、魚のv196画像・行動設定には変更を加えていない。

## 生成に用いた最終指示

背景（編集対象: 既存の沿岸描画、スタイル参照: `terrain-world-v54.png`）:

> Replace the coarse placeholder graphics with finished detailed SFC-era pixel-art scenery matching the existing village map. Preserve the 16:9 framing, island and dock positions, sizes and coastline silhouettes. Open ocean above, sandy island center-right, rocky island lower-left, harbor pontoon near bottom center-right. Deep blue-teal sea with tiny irregular wavelets, shallow aqua bands, delicate broken foam. Warm granular sand with shells and tufts; a small pine grove and wooden rest shelter at the existing rest point. Weathered tidal rocks, moss and tide pools on the reef. Detailed timber piers at the existing positions. Overhead RPG perspective, muted natural colors, crisp small pixel clusters. No characters, boats, UI, text, labels, frames, blur or photorealistic rendering.

乗船の最終修正（編集対象: 男女の既存キャラクターを元に生成した乗船アトラス）:

> Correct the canoe atlas for an overhead map. Keep 2048×768, four columns by two rows, boy above and girl below, north/east/south/west column order and true transparency. Use a camera about 65 degrees above the water; narrow pointed canoes with visible interior floor planks, low gunwales, braces and benches. Seat each character naturally in the center, with space in front and behind. Preserve the boy's navy cap, teal shirt and tan vest, and the girl's red cap and vest. North shows the back, south the face, east and west natural profiles. Exactly one single-bladed paddle held with both hands; remove the second northern paddle. Preserve cedar grain, dark outlines and wood highlights. Crisp controlled pixel clusters, no blur. No background, gradient, halo, grid or text; only a tiny waterline directly against the hull.

漕ぎ二コマ目（編集対象: 完成した一コマ目）:

> Produce frame 2 of a subtle rowing animation. Preserve the exact canvas, positions, hull outlines, scale, texture, colors, characters and four-direction/two-avatar layout. Only move forearms and the single paddle a small amount: its blade moves about 24px backwards along the same side, pivoting naturally in both hands. Body, head, hat, face and boat remain still. Tiny ripples at the blade may change. No shifting, cropping, extra paddle, backdrop, grid, text, glow or haze. Preserve true transparency and crisp pixel-art style.

## 確認方法

`tests/coastal-render-harness.cjs` は製品の `coast-voyage.js` と実画像を使用し、ゲームと同じ240%マップ拡大率・カメラ計算・舟のCSS寸法で確認画像を出力する。

```sh
cd nushi-tsuri/tests
node coastal-render-harness.cjs /path/to/review
node --test *.test.cjs
```

`coastal-render-v197.test.cjs` は全八方向・主人公の表示、パドルの切れ、漕ぎ姿勢、夜の明るさ、画像の遅延読み込み後の表示を検証する。既存の沿岸・釣りテストがA操作、移動時の体力2消費、上陸・休憩・帰港、砂浜と岩礁の釣り場遷移を検証する。
