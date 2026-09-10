# v168 キャストの全身コマアニメ

腕の切り抜きを回転させる方式をやめ、キャラクター全体を描いた12コマに変更。肩・胴・腰・膝・左腕も一緒に動く。

各コマの靴底の中心を基準に配置し、描かれた右手の握り位置から装備中の竿を描く。コマ絵に回転・骨格変形・引き伸ばしは適用しない。ため、前への加速、フォロースルー、復帰でコマの表示時間を変えている。

| ファイル | 内容 |
| --- | --- |
| `../assets/player-boy-cast-atlas-v168.webp` | 男の子・12コマの原画 |
| `../assets/player-girl-cast-atlas-v168.webp` | 女の子・12コマの原画 |
| `cast-v168-preview.gif` | 実際の描画コードで出力した動きの確認用 |

原画は内蔵の画像生成ツールで制作。衣装の参照は既存のv73キャラクター。背景がRGBで出力されたため、同じ画像生成ツールでマゼンタの単色に変更し、ゲームの画像読み込み処理が一度だけその色を透過する。WebPへの変換は可逆圧縮で、色・形・配置は維持している。

## 生成プロンプト

```text
Use case: stylized-concept.
Asset type: production game sprite animation atlas, twelve whole-body frames in a strict 4-column by 3-row grid.
Primary request: Redraw the reference fishing protagonist as a cohesive hand-drawn pixel-art casting animation. The current game used separated limbs and looked robotic; every frame must be a newly drawn complete anatomical pose with natural shoulder, torso, hips, elbow and wrist motion together.
Reference image: identity, outfit, colors and detailed pixel style only; change the pose and perspective as described.
Canvas: landscape 1536 by 1152, 4 equal columns, 3 equal rows, twelve equal square cells. Truly transparent alpha background. NO text, numbers, grid lines, scenery, floor, shadow, watermark or checkerboard. One complete character per cell. Keep generous empty space between characters and no overlap or cropping.
Style: detailed 16-bit Japanese fishing game pixel art, crisp deliberate pixel clusters, restrained palette, opaque pixels, dark thin outlines, no blur, no smooth vector edges. Match the reference's proportions and clothing. Full body, rear three-quarter view, angler faces away and slightly to screen right toward water. Same camera, identity, scale and boot baseline in all frames. Head is large but arms and hands have natural child proportions. Keep both boots at consistent ground positions; flex knees and shift weight subtly.
The RIGHT hand holds an invisible fishing rod with a natural closed grip. DO NOT DRAW the rod, reel, line, float, lure or any fishing equipment: the game draws the rod precisely through the grip. Keep the right hand and forearm clearly visible outside the right silhouette, with thumb and closed fingers readable. Only two arms. Left arm relaxes or gently counterbalances close to body, it must not look frozen or stick straight sideways.
Reading order left to right, top row then next row. Twelve distinct sequential poses of ONE gentle one-handed overhead fishing cast:
1 ready: right elbow comfortably bent near side, forearm toward right/front, grip near lower chest, rod would angle up-right 35 degrees.
2 gather: small knee flex and shift onto rear leg, right hand starts rising, shoulders start to turn.
3 lift: hand reaches shoulder height, elbow unfolds naturally, body twists a little with it.
4 backswing: hand near right ear, elbow flexed, shoulder rotates back, rod would lean up-left.
5 loaded backswing: slight torso rotation and weight back, compact relaxed wrist near ear, no extreme contortion.
6 forward initiation: hips and chest lead the cast, elbow comes forward, hand starts moving forward from ear.
7 acceleration: torso follows through, right forearm extends forward/up-right, elbow still gently bent.
8 release: weight comes forward, hand forward at chest height, arm reaches toward water without locking elbow, rod would point shallowly up-right.
9 follow-through: slight forward body lean and knees give, right hand dips gently, left hand counterbalances by thigh.
10 recover: shoulders relax, right elbow comes back toward side, body rises gently.
11 settle: almost the ready pose, wrist relaxed and grip points up-right.
12 ready again: match frame 1 closely for seamless return.
Frame-to-frame changes must be incremental and readable, not twelve copies of a static body with a rotating arm. Do not turn the character to face the viewer; keep a consistent back/three-quarter viewpoint. Preserve a compact believable casting arc and constant limb lengths.
```

男の子の追加指定：The boy wears the same navy backward cap, dark short hair, teal short sleeves, beige fishing vest, dark blue shorts, white socks, brown boots and small right hip pouch.

女の子の追加指定：The girl wears the same red backward cap, chin-length brown hair, red short-sleeved top and vest, khaki shorts, dark blue socks, brown boots and small right hip pouch.

## 背景の調整プロンプト

```text
Use case: precise-object-edit. Production pixel-art game sprite atlas edit. Replace ONLY every gray/white checkerboard background pixel with a completely flat, uniform, vivid solid magenta chroma-key background, exact RGB(255,0,255), #ff00ff. The magenta must have no texture, gradients, noise, grid lines, highlights or shadows. Preserve all twelve full-body characters, their individual poses, outlines, clothing, fingers, relative placement and four-column / three-row layout exactly as shown. Do not redraw or restyle the characters. Preserve white socks and all pale skin inside character outlines. Remove checkerboard in every empty gap, including inside bent elbows and between legs. No checkerboard anywhere. Solid magenta only in all empty space; no text or other changes. This atlas will be consumed by a game that hides the magenta key color.
```
