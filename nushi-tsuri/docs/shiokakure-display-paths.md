# 潮隠れの図鑑・水槽表示と休憩所西の通行（v252-85候補）

基準main: b3c08978b254ee2664b39bcefb97ff1ea5126196（#360）。#356の釣果絵、#357の向き別原画を保持する。

## 原因と変更
- 図鑑の `drawFishAtlasFrame`、飼育水槽・個別拡大・名簿・自宅展示の `drawAquariumSprite` は汎用 `species.shiokakure/native.shiokakure` を使い、初期SVGを参照していた。水中戦の `shiokakureFight` だけが採用済みPNGを使っていた。
- 汎用定義にも既存の `shiokakure-fight.png` と実測8方向セル・口座標を共有。泳ぎの魚種別プロファイル、釣果アニメ、画像ファイル自体は変更しない。
- 添付のマップ画像と現行原画を2269特徴点で照合。足元は約(95,58)、休憩所西側の分岐。木を迂回する土の道の(91,57)→(91,58)に判定の食い込みがある。西側の道端(90.5–92.5,57–58.5)の数頂点のみ土へ合わせた。直進して木の冠へ入る操作は引き続き止まる。
- 出現条件、擬態する小石、ファイト難易度、セーブ形式は変更しない。水・岩・樹冠の既存禁止点と釣り座・船着場を検査する。

## 検証
`node --test --test-concurrency=1 shiokakure-display-paths.test.cjs offshore-shelter-verge.test.cjs offshore-open-ground-v252-19.test.cjs offshore-collision-v252-16.test.cjs release-version.test.cjs cache-upgrade.test.cjs village-release-provenance.test.cjs`

専用CI `Shiokakure display and island paths` は844×390・740×360で実タップを行う。基準mainの衝突モジュールで停止を再現してから修正版へ戻し、同じ操作で往復する。図鑑、飼育水槽、個別拡大、自宅展示、7方向の実描画キー・不透明ピクセル、保存再開を検査する。位置・釣果・飼育個体は明示的fixture。添付原画像はリポジトリ・CIに含めない。

ローカルChromiumはsocket制限で起動できないため、画面検証はCIで行う。物理スマホ・公開版・全マップの再検証は対象外。マージ・公開は行わない。
