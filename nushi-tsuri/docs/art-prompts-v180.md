# v180 大会用サムの制作記録

方法：組み込みの画像生成。既存のサムと大会ライバルの絵を確認し、帽子、サングラス、白いひげ、服装、年齢感を記述して制作した。以下の新規生成による透過PNGを採用。背景がRGBの市松模様になった前の2出力は採用していない。採用原画は改変せずに保存し、表示時にポーズを切り出す。

保存先：`assets/sam-tournament-v180.png`。1536×1024 RGBA、釣りと案内の2ポーズ。チャッピーは `assets/rival-dogs-v179.png` の既存の座り姿を並べる。

最終プロンプト：

```text
Create a TRUE TRANSPARENT RGBA PNG game sprite sheet. This is a new production pixel-art asset, without a photographed or illustrated background. Two full-body poses of ONE identical character, Samuel Oldman (Sam), an elderly experienced fishing tournament host. SFC/16-bit Japanese fishing RPG style, detailed crisp pixel clusters and stepped outlines. Sam is an old, stocky, broad-shouldered man with a short white beard and moustache, white side hair, warmly tanned skin, BLACK SUNGLASSES, an OLIVE GREEN FISHING CAP with a small pale fish emblem, a dark NAVY rolled-sleeve shirt, an OCHRE BEIGE multi-pocket fishing vest with a few small fishing floats in the chest pocket, OLIVE cargo trousers, DARK OLIVE knee-high rubber boots. Mature lined face, dignified and calmly confident; never young, slim, heroic or comedic. Exactly these clothes and the same face and cap on both figures. Exactly TWO poses, SIDE BY SIDE, full rods and boots entirely visible, same character body height and same ground baseline, generous clear gap between figures. LEFT: facing three-quarter left, feet apart in a steady veteran angler stance, holding a fishing rod with both hands, rod leaning diagonally up-left, reel next to the grip. RIGHT: standing relaxed facing front-left, fishing rod held vertically at his side in one hand, the other hand open in a natural welcome to tournament entrants. Keep all strokes within their respective halves. Empty transparent space around both silhouettes and between legs, arms and rods. No dog in this asset: his existing dog is composited separately by the game. NO scenery, no labels, no text, no border, no ground plane, no cast shadows. Deliver isolated sprites with a real transparent alpha channel suitable for direct compositing over the game map.
```
