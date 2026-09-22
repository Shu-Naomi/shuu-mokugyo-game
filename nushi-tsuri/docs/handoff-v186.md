# v186 引き継ぎ

- リポジトリ: Shu-Naomi/shuu-mokugyo-game
- 公開: https://shu-naomi.github.io/shuu-mokugyo-game/nushi-tsuri/
- 基点: 253d2a534bd01c1d9dcbf0e7c33da78b1d407e98（v185、PR #188）
- 作業ブランチ: codex/event-celebrations-v186
- 内容: updates-v186.md
- 全依頼: roadmap-v184-plus.md
- 再開時はmain・このブランチのPR・Pagesを確認し、最新mainから続ける。公開確認はPR本文が最新。

## 実装

- tools/compose-events-v186.py で4曲生成。music-tracks.js に登録し soundscape.js の selectScene に tournament/contest を渡す。
- index.html の currentSoundScene で大会IDと petUi.music を渡す。startCastingWaterSound は通常釣りなら従来どおり無音楽、大会なら専用BGM。既存の水中音・巻き音は維持。
- event-ceremony.js/css は結果の装飾と表示だけ。markup/scene/pose/create を提供。DOMの開いているモーダル内のみ描画。約8fps、単一RAF、非表示・ページ終了・閉じると停止、動きを減らす設定では静止画。
- eventCeremonies は index.html の共通制御。魚には drawAquariumSprite、犬には drawDogCareSprite を使用。犬画像の読み込み後も再描画する。
- pet-life-ui.js の presentationChanged でタブ・結果・種目切り替えと音／演出を同期。pet-life.js の lastResult に subject を追加し、本人以外の絵へのすり替わりを防ぐ。旧データは既知の名前一致から絵を表示。採点や報酬は既存処理のまま。
- 上級NPCは大会レイヤーだけに描く。通常レイヤーには名手挑戦中の相棒犬と常設チャッピーだけ。名手大会後の gathering は作らず、既存の gathering も表示しない。村人の通常大会後の挨拶は維持。

関連71テスト成功。テスト一覧・内容はupdatesを参照。全ゲームテストではない。Android実機は未確認。

## 次に進める項目

- UIの選択・インタラクトの短いSE。ミュート／長押し／再描画を考慮。
- 同種の雄雌が健康な状態で数日同居すると稚魚誕生。世代による星の伸びやすさ。
- 育成魚をアスアルへ売却（既存の「託す」は返金なしなので別扱い）。
- 新規ゲームの水槽を購入で解放。既存所持槽と魚は保護する。
- 生体販売は、自分で釣って図鑑登録した魚種から解放。

ユーザーは大型更新の段階公開を了承済み。実装・GitHubマージは許可済み。プログラム操作をユーザーへ丸投げしない。
