# v224 — 丸い舟の主人公を詳細な乗船画像へ修正

直美から、カヌーに乗った主人公が再び四角い粗い姿になっているという報告とv222の画面写真を受け取った。写真の楕円形の木舟は、保存ID `tarai` が使用するv196の64×48画像と一致する。最新v223でもこの経路が残っていた。`canoe` の二本オールの詳細画像はv201のまま正しく使われており、古い画面のキャッシュだけを原因にしていない。

`coast-voyage.js` の `tarai` を新しい画像へ差し替えた。男の子は紺の帽子・青緑のシャツ・生成りのベスト、女の子は赤い帽子・赤い服・茶色の髪。丸い木舟と一本パドルを維持する。男女各四方向の休止／漕ぎ、全16姿勢を192×144のCanvasへ描く。1254×1254の原画には均等なセルを越えるパドルがあるため、空白の境界と船体の中心を実測して切り出す。画像は非同期で先読みし、遅延読み込みでも最新の舟・向き・主人公・漕ぎ状態を描く。

装備ID・価格・移動速度・体力消費・釣り・保存形式は維持する。HUDはv224、舟描画とService Workerは224-1。水面描画はv223の穏やかな波を引き続き使う。

## 本番画像

- 保存先: `nushi-tsuri/assets/coast-tarai-v224.png`（1254×1254、RGBA、透明背景）。
- 組み込みImageGenで制作。生成したPNGをそのままコピーし、画素の手作業編集や不可逆圧縮はしていない。
- スタイル・人物の基準: `assets/coast-rowboat-v201.png`、`assets/player-boy.png`、`assets/player-girl.png`。丸い舟の基準: `assets/coast-boat-v196.png` の下四行。
- 同じ舟を別方向へ引き伸ばす処理は使わず、実際の姿勢を読み込む。

## 検証

`boat-character-v224.test.cjs` は全16姿勢の完成描画・余白・透明アルファ・細部、舟と主人公を切り替えた後の遅延読み込み、配信とオフライン資産を検査する。既存の詳細ボートの描画検査も継続する。

`browser-v224.boats.cjs` はPC1280×720・横画面スマホ844×390で、両舟・男女・四方向の実Canvasと画面内への配置、休止と漕ぎの差分、実際のキー／タッチ入力による移動と体力・時間の消費、漕ぎアニメーションから休止への復帰、セーブ再読込を確認する。両舟の画像も公開mainと配信バイトを照合する。

検証用の原画・ゲームサイズの出力は `tests/coastal-render-harness.cjs` で再生成できる。ソースと公開URLの検証結果、PR・SHA・Actionsの具体的な記録は作業引き継ぎへ保存する。

## 最終生成指示

Use case: identity-preserve. Asset type: production transparent sprite atlas for a Japanese retro fishing RPG, replacing the coarse wooden-tub boat seated-hero sprites. Input images: image 1 coast-rowboat-v201.png is the exact approved character, detail, palette and camera style reference; image 2 coast-boat-v196.png is ONLY the round wooden tub silhouette and single-paddle layout reference for its bottom four rows; image 3 player-boy.png and image 4 player-girl.png are standing character identity and clothing references, never include their beige backgrounds. Create ONLY a new WOODEN TUB boat atlas, 2048 by 2048, exact four equal columns by four equal rows, sixteen complete separate sprites, transparent RGBA background. Every sprite entirely within its 512 by 512 cell with generous empty gutters. Columns: facing north/up (back of head visible), east/right (profile), south/down (face visible), west/left (profile). Rows: boy resting, boy rowing stroke, girl resting, girl rowing stroke. A round oval wooden washbasin-like tub, NOT a canoe or pointed rowboat, with warm cedar staves, visible curved rim and interior floor/seat, subtle wood grain and narrow dark wooden hoops. Both heroes sit naturally low inside the tub with knees and arms visible; proportions and face match approved rowboat reference, readable eyes and hair, rounded detailed cap, no blank cuboid heads. Boy: navy cap, teal shirt, cream fishing vest, dark blue shorts. Girl: red backward cap, brown bob hair, red shirt and red fishing vest, tan shorts. Exactly ONE single-bladed wooden paddle per sprite, held naturally with both hands over the near rim. No second paddle or oarlocks. North sees the back, south sees the face, natural side profiles. Camera looks diagonally down about 60 to 65 degrees from above, compatible with overhead village map. Rich but crisp finely clustered pixel-art detail, muted natural palette, subtle dark outlines, SFC-era RPG finish matching input 1. All hulls have identical size and centre; all sixteen have the same scale, character head size and lighting. Rest and rowing row pair preserve the identical hull, head, hat, torso, seat and centre; change only hands/forearms and single paddle by a small natural stroke. Put hull centre at the same relative point of every cell, approximately (256,310). Minimal tiny waterline against the hull and paddle only. No background, no solid fill, no gradient, no halo, no checkerboard drawn into artwork, no labels, no text, no UI, no cell borders, no objects beyond these sixteen tub-and-hero sprites. Preserve true transparency outside each silhouette.
