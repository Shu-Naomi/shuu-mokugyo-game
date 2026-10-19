# v245 ぬし釣り式の水中・首振り・糸切れの追走

ぬし釣り式の横へ動くカメラに合わせ、ゲージ式の固定視点とは別の広い水中背景を用意した。水中の遠景、底の近景、浮遊粒子が異なる速さで流れ、逃走の速さと巻き寄せの向きに連動する。湖・川・海の色味、水深と時刻の暗さも反映する。ルアーの誘いからアワセ後まで同じ背景・カメラを継続する。動きを減らす設定でも専用背景を表示し、移動を止める。

首振りは均一な細かい震えから、振り始めの力みと強弱を持つ横への往復へ変更した。既存の魚種ごとの絵で頭の向きを変え、胴と尾を逆へしならせる。魚の唇は描画の基準点に固定し、表示されている姿勢から針と糸の接点を求める。魚種ごとの引ける時間、0.72秒の反応猶予、危険な引きによる糸切れ条件はv244のまま。

ぬし釣り式で実際に糸が切れたときは、すぐフィールドへ戻る代わりに約4.3秒の追走を行う。糸と仕掛け、操作ボタンを消し、同じ魚が尾を振って元気に泳ぐ姿をカメラで追う。最初に「糸が切れた……」、0.6秒後から「魚は元気よく泳いで行った」と表示する。最後に魚が少し遠ざかって泳ぎ去り、フィールドへ戻る。魚を釣ったことにはせず、報酬・消費・時間を追加しない。早合わせや回収、ゲージ式の終了は従来通り。

音は本作用の短いオリジナル曲。約2.7秒の三角波の下がるフレーズと小さな跳ねる音、低音で、少し残念でちょっとからかう後味にした。原作の曲を採譜・複製したものではない。既存の音設定とマスター音量に従い、大会BGMをいったん止め、水中音を小さくする。消音・背面・終了で予約した音を全て止め、復帰時は残っている部分だけを鳴らす。遅れた更新で見ていない追走を飛ばさず、中断中は魚・背景・演出の経過時間を止める。

## 画像

プロジェクト内の保存先：`nushi-tsuri/assets/nushi-open-water-v245.webp`。内蔵画像生成を使用。生成された原寸画をWebPへ圧縮して組み込んだ。

使用プロンプト：

> Use case: stylized-concept. Asset type: a production background panorama for a Japanese retro fishing game's underwater side-following camera. Create one very wide 3:1 panorama of beautiful open freshwater underwater, a natural lake/slow river volume seen from a fish's eye level, facing horizontally. Detailed hand-painted 1990s Japanese game scenery, painterly natural textures and restrained fine pixel-like detail, elegant and atmospheric, not simplistic tiles. Composition: top 75 percent is uninterrupted transparent blue-green water with subtle distant submerged terrain dissolving into teal haze and diffuse light from above, no visible sky, no shoreline, no angler, no horizon, no walls, no big framing plants on the edges. Bottom 25 percent has a low gently rolling bed of small smooth stones, sand, a few sparse short pondweed leaves, all with strong atmospheric distance; the bed must continue level through both left and right edges so it can scroll horizontally. Keep the middle 60 percent mostly open water where the fish sprite can be read clearly. Very wide field of view, no central vanishing point or tunnel. Restrained deep turquoise and jade water, muted slate stones, warm sandy bottom, soft caustics. Natural daylight. Left and right edges similar density and height, no distinctive repeated landmark. No fish, no creatures, no bubbles, no UI, no text, no frames, no watermark. This is the underwater background only, not a screenshot. Output landscape panorama as wide as possible.

## 確認の対応

- `nushi-presentation-v245.test.cjs`：背景の画面被覆と正逆移動／静止設定、首と胴の逆しなり・唇・描画端、追走の長さ、遅延・中断、音の予約・取消・残りの再生、釣果・消費の不変性、終了後の掃除。
- `browser-v245.fishing.cjs`：PCとタッチ2サイズ × 2方式。ルアーから同じ個体の自然な取り込みと保存再読込、表示の背景選択・首振りと針の接点、危険な引きで実際に糸切れ、追走・テロップ・元気な尾振り・背面復帰、PCで実際の音声コンテキストと消音・終了。
- 魚種ごとの引く／離す動作と海ヌシ、巨大個体、通常の回帰は既存の確認を継続。
- 携帯実機は未確認。タッチ想定ブラウザによる確認と区別する。
