# v246 — 音量設定と3魚種

BGMは初期45%、SE・環境音は初期80%。オプションの先頭で独立して0〜100%を調節でき、操作した場で反映する。既存のサウンドON/OFFも維持し、オプションから切り替え・ジングル試聴ができる。端末共通の `nushi-inugoya-options-v1` に保存し、セリフ速度の変更や冒険の削除で音量を消さない。保存に失敗した場合は、画面も音も保存前の値を維持する。

Web Audioは音楽用・効果音用のGainNodeを分けて既存の0.48マスターに接続。HTMLAudioの水音・リール・鳥・犬などにも同じマスターとSE設定を適用する。従来はこれらの録音がマスターを通らず、合成ジングルに比べて強く鳴っていた。各音の元の強さを保持して再計算するため、スライダー操作で音量を累乗したりループを再開したりしない。主・大物のファンファーレと試聴中は音楽を16%、水音・鳥を18%まで一時的に下げ、終了時は最新の設定へ戻す。糸切れの追走は既存どおりBGMを止め、水中音を弱める。消音・画面離脱・オプション終了で試聴と一時減音を清掃する。

| 図鑑番号 | 魚 | 主なゲーム内釣り場 | 推奨 | 引き |
| --- | --- | --- | --- | --- |
| 47 | ブルーギル | 星降る湖／睡蓮の池・岸際〜中層 | ミミズ・ハリ小 | 素早い横走り |
| 48 | アブラハヤ | 民家川／星見渓流／砂底の小川・岸際〜中層 | 川虫・ハリ小 | 小さく短い走り |
| 49 | マゴチ | 潮見浜・港／白砂の小島・中層〜深場 | 活き小魚・ハリ大 | 底へ突っ込む強い引き |

全49種。エサとスプーンの抽選、両ファイト方式、サイズ6段階、口・針の接点、釣果記録と思い出、図鑑、料理素材、魚の販売と水槽・成長を共通処理へ接続。新しい通常魚を追加しても、既存の地域ぬし解放課題の対象は変更しない。値段・出現率・サイズの階級・引きの強さ・時刻補正はゲーム用の調整。

## 原画

内蔵の画像生成で各種を新規生成し、同じ内蔵機能で背景除去を実施。参照は既存 `assets/fish-gigi-v241.png` の画風のみ。既存の別種の絵の色替えではない。各PNGは1536×1024、透明RGBA、独立した8原画（右・斜め2枚・正面・左斜め2枚・左・開口）。アトラス内の魚の連結領域を測定し、各魚の唇を向きごとに指定する。元画像は加工せず既存Canvas描画で連続する向きと尾振りを作る。

- `assets/fish-bluegill-v246.png` — built-in generation + background removal, transparent.
- `assets/fish-aburahaya-v246.png` — built-in generation + background removal, transparent.
- `assets/fish-magochi-v246.png` — built-in generation + background removal, transparent.

共通生成プロンプト：

> Create a production-ready original fish sprite atlas for a Japanese nostalgic fishing RPG. Use the attached atlas ONLY as a visual style reference (fine hand-painted pixel-art, detailed natural fish anatomy). Do NOT draw the reference catfish species. Transparent RGBA background, no glow, no cast shadows, no ground, no water, no labels, no text, no outlines around cells. Canvas landscape 1536x1024, exactly FOUR columns and TWO rows, each cell 384x512. A single COMPLETE fish in the center of each cell, fins and tail entirely inside its cell, generous transparent padding. All 8 views depict exactly the same individual, same colors, size and fin structure. Views in reading order: (1) right-facing side profile, (2) right-facing three-quarter 30-degree turn toward viewer, (3) right-facing near-front 60-degree turn toward viewer, (4) centered front-facing view, (5) left-facing near-front 60-degree turn toward viewer, (6) left-facing three-quarter 30-degree turn toward viewer, (7) left-facing side profile, (8) right-facing side profile with mouth OPEN for the bite. Naturalistic fish, no character face, no accessories. This is a sprite sheet, not a diagram.

種ごとの追記：

- Bluegill / Lepomis macrochirus: deep tall laterally compressed oval sunfish, small mouth, dark navy opercular ear flap, olive blue-green scaled flanks with subtle vertical bars, yellow-orange breast, continuous spiny and soft dorsal fin, slightly forked tail.
- Aburahaya / Rhynchocypris lagowskii steindachneri: slim torpedo-shaped minnow, blunt short snout, small terminal mouth, tiny scales, olive-brown back, silvery beige belly, dark lateral stripe, translucent ochre-gray fins, single dorsal fin, forked tail; no whiskers or adipose fin.
- Magochi / Platycephalus sp.2: long marine flathead, broad flattened bony head, high symmetrical eyes, wide mouth, slender tapered body, sandy-brown mottling, two separated dorsal fins, broad pectorals; not flounder anatomy, no whiskers.

背景除去プロンプト：

> Edit this exact fish sprite atlas. Preserve all EIGHT fish drawings, their exact pixel positions, scale, complete fins, natural anatomy, colors, and 4-by-2 arrangement. REMOVE THE ENTIRE BACKGROUND, including ALL brown smoky glow, all brown gradient, all gray haze between fish, and all shadows. Outside the eight actual fish silhouettes must be pure empty transparent alpha=0. The fins remain translucent naturally. This is a strict background-removal cutout; do not add a glow or matte of any color. No text or grid. Keep landscape 1536x1024.

## 生態の参照

2026-10-19に一次資料を確認。本文・写真は転載せず、図鑑の短い説明を新たに執筆した。

- 国立環境研究所 [ブルーギル](https://www.nies.go.jp/biodiversity/invasive/DB/detail/50310.html)：学名、体形、えらぶたの斑、止水環境。
- 国立環境研究所 [アブラハヤ標本](https://www.nies.go.jp/biwako_specimens/contents/species.php?spid=4)：学名。神奈川県 [淡水魚類図鑑](https://www.pref.kanagawa.jp/docs/a4y/images/aburahaya.html)：上〜中流域・食性。
- 鳥羽水族館 [マゴチ](https://aquarium.co.jp/picturebook/platycephalus-sp-2.html)：図鑑の学名表記は同館の `Platycephalus sp.2` に合わせる。三重県 [おさかな図鑑](https://www.mpstpc.pref.mie.lg.jp/SUI/zukan/asp/detail.asp?record=1470)：沿岸砂泥底、平たい頭、小魚とエビを捕食。資料間でsp.番号の表記が異なるため学名は一方に統一。

## 検証の範囲

`audio-options-v246.test.cjs` は既存設定の移行、保存の独立、0%と100%、別経路の即時反映、ループ位置維持、減音解除、保存失敗を検証。`fish-species-v246.test.cjs` は3種×両方式の通常釣果、重複報酬防止、同じサイズの記録、水槽・給餌・翌日の成長と復元、97段階の向きの体と唇を検証。

`browser-v246.audio-fish.cjs` はPCとタッチ2サイズで、オプション内の実スライダー操作、再読み込み、実AudioContextでのジングル再生と減音解除、ネイティブWeb Audioによるジングル／水音のRMS比較、3種×両方式の釣果・保存を確認する。タッチはChromiumのCDPエミュレーション。実スマートフォンは未検証。
