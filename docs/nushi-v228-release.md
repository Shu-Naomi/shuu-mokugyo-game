# 星降る湖 v228：実装と検証の作業記録

更新日：2026-10-09。公開ゲーム：https://shu-naomi.github.io/shuu-mokugyo-game/nushi-tsuri/?v=228

## 現在の状態

ゲーム本体の調整はPR229で公開済み。既存の竿性能検査の準備とCIの実行時間をPR230で補修し、398/398の成功後にマージ済み。最終公開CIを確認中。この記録は技術的な進捗を残すためのもの。元の引き継ぎにある将来計画の本文は移していない。

- 実装PR：https://github.com/Shu-Naomi/shuu-mokugyo-game/pull/229
- ゲーム本体の公開コミット：`67b5f1a37c2849158075137c57e2630d8344946f`
- 本体のtree：`682996738741e33a7bdae5cc4679ba0cc95ee99b`
- 検査補修PR：https://github.com/Shu-Naomi/shuu-mokugyo-game/pull/230 （マージ済み）
- 補修後main：`e0e97b69d00b9a1b1174509ff7b483aa9c92f760`。変更は検査とCI、ゲーム本体のblobは公開済み67b5f1aと同一。

## 操作の調整

ぬし釣り式は、糸が緩んだら新しくAを押して引き、魚が力をためる予兆でAを離す。

- 緩みを見て押す受付は最低1800ms。
- 最初の正しい押下から最低1200msは引ける。
- 次の走りの前に900msの予兆。尾の動き、淡い橙色の糸と魚の縁、状態表示、Aボタンの説明をそろえる。
- 予兆の糸色は即時切り替え。高い張力による赤色を優先する。
- 正しく引いて走る前に離せた成果を、次の走りをいなす間も保持する。
- 連打で期限を延長できず、前の走りから押しっぱなしのままでも引きの受付を取得できない。
- ボスの段階変更は現在の引きと予兆を突然打ち切らず、次の動きへ予約する。エラ洗い後と背景移行の期限も整合させる。

竿の性能、魚の抵抗、サイズ倍率、弱い竿のぬし上限とゲージ式の計算は保持する。原作64の説明書で確認した操作を参考にした、本作独自の時間調整。

## 公開前の検証

source CI [37897372690](https://github.com/Shu-Naomi/shuu-mokugyo-game/actions/runs/37897372690)：

- unit398/398成功、fail0。自然なモデル検査36条件は全てlanding。
- browser44のPASS。既存36と新規8の結果。
- 海王の竿、ハリ大、適切な餌を使用。普通／巨大のナマズ・コイ・ライギョ・星湖ぬし・星降るぬし、600msの入力待ちと3乱数条件を含む。
- 押しっぱなしは失敗することを確認。受付の遅い押下、連打、正しく離した成果、遅い離し、背景移行、段階変更も検査。

source artifact `11601303867` は24025752 bytes、ZIP SHA256 `547b427e3397b21733d0f68fd441bbda1265d75bf6e1a149f7beb84aac8ffa32`。実際に取得してchecksumを照合した。新規画像14枚を取得し、PC／横画面の緩み・引く・予兆、最大級ぬしの釣果画面を表示して確認した。

## 公開URLの確認

Pages [37899338877](https://github.com/Shu-Naomi/shuu-mokugyo-game/actions/runs/37899338877) のbuild・deploy・report成功。

公開CI [37899339372](https://github.com/Shu-Naomi/shuu-mokugyo-game/actions/runs/37899339372) のログに `PUBLIC_RELEASE_VERIFIED 67b5f1a37c2849158075137c57e2630d8344946f`。HTML・JS・CSS・SW・検査対象の原画・音声が公開コードとバイト単位で一致することを確認。さらに作業環境からHTML・fishing-duel.js・fishing-duel.css・sw.jsを取得し、HTTP200と4ファイルのSHA256一致を確認した。

公開URLでの新規8件：

| 入力 | 魚 | 方式 | サイズcm | 入力待ちms | 釣り上げ秒 |
| --- | --- | --- | ---: | ---: | ---: |
| PCマウス | ナマズ | ぬし釣り | 99.99 | 600 | 99.24 |
| PCマウス | コイ | ぬし釣り | 99.99 | 600 | 64.08 |
| PCマウス | 星湖のヌシ | ぬし釣り | 299.99 | 600 | 163.20 |
| PCマウス | 星湖のヌシ | ゲージ | 299.99 | 0 | 68.28 |
| 横画面タッチ | ナマズ | ぬし釣り | 99.99 | 600 | 90.60 |
| 横画面タッチ | ライギョ | ぬし釣り | 114.99 | 600 | 54.36 |
| 横画面タッチ | 星降るヌシ | ぬし釣り | 899.99 | 600 | 317.40 |
| 横画面タッチ | 星降るヌシ | ゲージ | 899.99 | 0 | 109.08 |

全件で自然なlandingから釣果1、餌20→19、巨大金冠、保存、再読み込みを確認。エラーとasset失敗は0。PC1280×720／横画面844×390の実ブラウザ入力であり、人がAndroid実機で遊んだ検証とは区別する。

ブラウザには44のPASSが記録され、検査と証拠uploadの各stepは成功した。ただしjobの最終状態は20分上限でcancelled。artifact `11602776892`、23739725 bytes、GitHub提供のdigest `28c3b78b8f277c91779467e02daf235737cf28e223607c0c8bb57bf284a69991`。作業環境の接続が切れた後のため、このZIPのローカル取得・独自checksum照合・画像の追加表示は行っていない。

## 検査の補修と残りの確認

公開CIのunitは397/398。古い地域ぬしの竿性能検査はcalm状態とreelingフラグを直接設定していた。開始時にcalmが選ばれると、新しい受付窓が未acceptedのまま残って強い竿の試験が0.6で止まる。

PR230では、竿の計算を切り出す固定時計とcalm窓を用意し、実ゲームのreleaseBattleAction／pressBattleActionを通してreelingとacceptedを確認する。自然な時間進行の釣り上げは別のv228モデル／ブラウザ検査で確認する。browser jobの実行時間上限は30分とし、全検査と後処理まで完了させる。

補修ソースCI [37902036729](https://github.com/Shu-Naomi/shuu-mokugyo-game/actions/runs/37902036729) のunitは398/398、fail0。問題だった竿検査も成功。ソースのbrowserはゲーム本体が同一で、複製検査の完了を確認中。PR230は期待HEADを指定してマージ済み。残りは最終mainのunit／公開browser成功の確認。完了後はこの状態欄を更新する。元の引き継ぎファイルは直前の作業内容を保存済みだが、接続が戻るまでは最終追記ができない。

## 再現するコード

- `nushi-tsuri/docs/v228-readable-fight.md`
- `nushi-tsuri/tests/nushi-playability-v228.cjs`
- `nushi-tsuri/tests/nushi-playability-v228.test.cjs`
- `nushi-tsuri/tests/browser-v228.fight.cjs`
- `nushi-tsuri/tests/regional-nushi-v202.test.cjs`
