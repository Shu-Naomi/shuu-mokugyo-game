# v225 — 二本オールの取り付けと両手の修正

直美のv224画面写真 `9922.png` では、横向きのボートの二本のオールが両方とも手前の縁から出て、主人公は一本だけ握っているように見えた。本数だけを確認しても自然な漕ぎ方の確認にはならないため、舟の両側の取り付け位置・内側の柄・両手のつながりを描き直した。

- 二本のオールを反対側の縁に一本ずつ取り付けた。横向きでは奥のブレードが舟の上側、手前のブレードが下側へ出る。
- 両手が別々の柄を握り、それぞれの腕・柄・支点・ブレードがつながる姿にした。通常の手漕ぎとして、主人公は船首と反対側を向いて漕ぐ。
- 男女各四方向・休止／漕ぎの16姿勢。男の紺の帽子・青緑と生成りの服、女の赤い帽子と服を保つ。
- 組み込みのImageGenで、既存主人公を基準に新しい座り姿を制作。生成PNGをそのまま本番へコピーし、実際の透明アルファを保った。
- 本番アセット: `nushi-tsuri/assets/coast-rowboat-v225.png`、1434×1097 RGBA、2,022,955 bytes、SHA256 `12b7740352a16dcb3b73d0e12e3b9e6a9b75572807cd55675ddcbb0ea1bda5d7`。
- 生成元: `/workspace/scratch/9cd039af695f/generated_images/exec-a37826a0-5790-4fc9-9eb3-81af1fdc96c0.png`。本番アセットはこの出力と同一のバイト。
- 切り出しは姿勢ごとの実測した余白を使う。最後の二姿勢は段差のある空白を辿って、隣の舟の小片が入らないようCanvasで切り出す。船体中心を基準に位置を合わせ、オールの先を画面端で切らない。
- HUD v225、沿岸モジュールとService Worker 225-1、新しいPNGをオフライン用に追加。装備の保存ID `canoe`、ボート3500円・移動5マス・体力2・2分消費は継続する。タライ、釣り、水面、物語の仕組みは既存のものを使う。

## 確認

実画像の16姿勢、透明な余白、オールの先と隣接画像の混入、遅延読み込み後の直前の装備・主人公の保持をローカル描画で確認する。PC1280×720・横画面スマホ844×390の実ブラウザでは、二種類の舟・男女・四方向・漕ぎ、キー／タッチ移動、体力と時間、保存再開と資産読込を既存検査で確認する。新しいボートの全姿勢を実際の画面サイズで記録し、見た目も確認する。公開URLを検査する際は新PNGを含む配信バイトとmainの一致を先に照合する。

ローカル描画検査:

```sh
NODE_PATH=/opt/codex/runtimes/codex-primary-runtime/dependencies/node/node_modules node --test nushi-tsuri/tests/coastal-render-v197.test.cjs nushi-tsuri/tests/boat-character-v224.test.cjs
```

六項目は失敗0。実ブラウザと全回帰検査の結果はPRと引き継ぎへ記録する。直美の端末での最終的な見た目の合格は、こちらの検査結果から代用しない。

## 最終生成指示

以下の指示で組み込みImageGenを使用。参照は既存の `assets/player-boy.png` と `assets/player-girl.png`。生成PNGはピクセル編集や背景加工をせず保存した。

```text
Use case: stylized-concept
Asset type: final transparent game sprite atlas correcting the rowboat artwork for 星降る湖.
Images 1 and 2 are character identity and clothing references ONLY. Create new seated rowing poses with the same boy and girl; do not repeat the standing sheet or add a background.
Draw a physically coherent little wooden TWO-OAR SCULLING ROWBOAT in a clear high-angle overhead three-quarter view, as precise, finely shaded SFC fishing-RPG pixel sprites. The high camera must show the inside, both gunwales, both separate rowlocks and the rower's two hands. Exactly TWO long single-bladed oars, mounted on OPPOSITE gunwales, exactly ONE hand holding the inner handle of EACH oar. A rower sits on a cross bench with two bent arms, two separated visible grips near their waist, both feet braced safely inside. Every oar is one continuous shaft from grip through its rim rowlock to blade. The rowlocks are mounted across from each other at the SAME lengthwise location; no shaft touches the hair, head, shoulders or back. NO unheld spare paddle; NO two hands holding only one oar.
In a horizontal hull, one oar exits the FAR rim toward the UPPER side of the sprite, and one exits the NEAR rim toward the LOWER side. Show the far handle entering the interior BELOW the hero's head and meeting their far hand. Never attach both oars to the bottom foreground edge, and never stick the far shaft into the back of a head. The figure's forearms and both inboard handles must be plainly visible with natural occlusion.
Conventional rowing: the rower faces the STERN, opposite the pointed bow's heading. Thus in a RIGHT-heading horizontal hull, put the rower on the RIGHT half of the bench FACING LEFT, and BOTH rowlocks on the LEFT of the rower's torso: one on the upper rim and one on the lower rim, with the outer blades extending upper-left and lower-left. The two handles continue diagonally into the hull to the two separate hands at the rower's waist, visibly BELOW the head, not hidden behind it. In a LEFT-heading hull mirror this geometry, drawing new unflipped identity details, the rower faces RIGHT, rowlocks to their RIGHT, blades upper-right and lower-right. In vertical hulls one blade extends left and one right; UP-heading rower faces toward viewer/down, DOWN-heading rower faces up/away.
Layout is EXACTLY 4 equal columns × 4 equal rows (16 sprites), generous transparent margins between cells and around the image. Columns: hull bow UP, RIGHT, DOWN, LEFT. Rows: boy at rest, boy power stroke, girl at rest, girl power stroke. Both oars pivot together and both hands follow them between rest/stroke; same boat size and hull center for each pair. Each full hull, hat and both blades fit within a cell; make each sprite smaller if necessary for transparent gutters. No labels or drawn cell lines.
Boy: navy cap, short dark hair, teal shirt, cream fishing vest, dark shorts. Girl: red cap, brown bob, red fishing vest/shirt, tan shorts. Match the supplied friendly faces, clothes and detailed pixel style. Warm brown timber with grain, cross bench, clearly outlined rims. Crisp readable small-scale shapes and natural hands. Preserve real transparent alpha. Tiny neutral pale blade wakes only; no blue painted water halos, flat vector icons, block people, large heads, blue water backdrop, land, UI, labels, poles, fishing rods, motors, additional figures or third limbs.
```

