# 潮風島：見た目の道を広げ、歩ける線を合わせる（v252-18）

直美の画像10596.pngでは、シマアジと灯台への移動はできたが、西の磯へ下る曲がり角で主人公が草地へ出たように見えていた。「もっと道を広く」という提案を受け、道の絵と通行判定を一緒に変更する。

## 絵と通行範囲

新しい背景 `assets/offshore-world-v252-18.png` は1672×941のまま、土の道・分岐・休憩所前・階段の踊り場を広げる。西の下り道の小さな箱、柵、低い草木を道端から退け、急な曲がり角にも土の余裕を作る。灯台、休憩所、船着き場、海岸線と3つの釣り場は元の位置を使う。元画像は上書きせず残す。

スクリーンショットの屋根を原画と照合すると、主人公の足元はおよそ世界座標(77.2,60.4)。この周囲は新しい絵で土の道となり、(77,60.5)など隣接する12地点を歩ける。西の下り道の中心を土へ移し、旧版の柵ぎわを通る線を置き換える。通行の半幅は道・階段ごとに1.35〜2.2。草地・森・崖・海は通行範囲に含めない。

## 互換性と検証

- 既存の料金・釣り・所持品・セーブ形式は変更しない。既存の道上セーブは維持し、通行不可となった位置は既存の近傍復帰処理で道へ戻す。
- 独立した床13地点、障害19地点、道端8組を使用する。西の報告地点と隣の車線を実方向ボタンで歩き、森へ向けた連続入力で停止する画面を残す。
- 新しい単体3件は手元で成功。隣接する12地点、森4地点、通常の4単位移動による接続、背景の寸法・SHA256・キャッシュ参照を確認する。全体の単体検査、PC1280×720・タッチ844×390・820×366/DPR1.875の島操作、3魚種の実釣、保存再開、無料帰港は既存CIで確認する。画面条件はChromium相当であり、物理端末ではない。
- 公開後はHTML・島JS・SW・新背景の4ファイルのSHA256一致を確認してから公開画面を操作する。背景だけ旧版で判定だけ新版となる状態を検証成功にしない。
- 島JS・SW登録・キャッシュを252-18へ更新。希少色・ノートのCIは対象ブランチと公開URLのみ変更し、実行環境・依存・権限・安全設定・時間上限は維持する。

新背景SHA256: `27c4f29ddb3acdd2ce40612235bb74a4f2e2eafbcf2ef708fdf8fb5e97a7ff0f`。
元背景SHA256: `58cb82c22b3ae8cc4b10b4ba6e72720d206458b8b2f7e9f2abb2ef2c7e17b9c9`。

## 画像編集の記録

組み込みのImageGenを使用。原画から道を広げた後、西の下り道の柵・箱による狭まりを追加で編集した。最終成果物は上記のリポジトリ内PNGへコピーして使う。最終編集で使用した指示は次の通り。

> Use case: precise-object-edit. Asset: final 1672x941 background for this pixel-art island game. Edit only a small part of the input landscape: the LOWER western sandy path, southwest of the wooden shelter, along the north edge of the forested cliff. Keep the framing and all other areas unchanged. The upper-western branch, lighthouse trail, eastern trails, shelter, docks, coast and ocean must remain exactly in place.
>
> The lower west path is still pinched between small stone boxes along the rocky shore above it and the short wooden fence/forest edge below it. Make this lower west path comfortably wide and continuous, about 45–55 source pixels across even at its bends. The target corridor goes roughly from source pixel (550,370), down to (530,405), then (490,430), (460,450), (410,470), and (350,480). Use those coordinates only to locate the existing path, never draw coordinate labels or guide marks. Move the path-side small boxes, fence and low shrubs away from the trail, or remove small obstructing path-side boxes as needed; push the immediately bordering forest edge back so the sandy ground remains broad. Especially keep the sandy bend near (530,420) and the next bend near (460,450) wide and unobstructed. Preserve the forested cliff, larger rocky shore platforms and seawater; do not paint walkways over water or cliff faces. Match the existing tan dirt, detailed pixel-art style, lighting and texture. No people, animals, UI, letters, lines, markers or overlays. Return only the edited landscape, same 1672x941 composition.
