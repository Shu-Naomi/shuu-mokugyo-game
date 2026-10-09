# 星降る湖 v228：実装と検証の作業記録

最終記録：2026-10-09。公開と検証は完了。

[公開ゲームを開く](https://shu-naomi.github.io/shuu-mokugyo-game/nushi-tsuri/?v=228)

## 公開した操作

ぬし釣り式は、糸が緩んだら新しくAを押して引き、魚が力をためる予兆でAを離す。

- 緩みを見て押す受付は最低1800ms。
- 最初の正しい押下から最低1200msは引ける。
- 次の走りの前に900msの予兆。尾の動き、淡い橙色の糸と魚の縁、状態表示、Aボタンの説明をそろえる。
- 予兆の糸色は即時切り替え、高い張力による赤色を優先する。
- 正しく引いて走る前に離せた成果を、次の走りをいなす間も保持する。
- 連打で期限を延長できず、前の走りから押しっぱなしのままでも引きの受付を取得できない。
- ボスの段階変更は現在の引きと予兆を突然打ち切らず、次の動きへ予約する。エラ洗い後と背景移行の期限も整合させる。

竿の性能、魚の抵抗、サイズ倍率、弱い竿のぬし上限、ゲージ式の計算は保持する。原作64の説明書で確認した操作を参考にした、本作独自の時間調整。120msの処理周期により切り替えは次の周期で処理される。

## コードとマージ

- [実装PR229](https://github.com/Shu-Naomi/shuu-mokugyo-game/pull/229) の公開コミット：`67b5f1a37c2849158075137c57e2630d8344946f`。当時のtree `682996738741e33a7bdae5cc4679ba0cc95ee99b` はローカルと一致を確認。
- [検査補修PR230](https://github.com/Shu-Naomi/shuu-mokugyo-game/pull/230) のmain：`e0e97b69d00b9a1b1174509ff7b483aa9c92f760`。補修HEAD `f39c2a7e4b67677e6dec7de6a539abed3fd4e2ae`。
- 補修の変更は `tests/regional-nushi-v202.test.cjs` とCIの実行時間。Git treeの全blob比較で、ゲーム本体のblobが公開済み67b5f1aと同一であることを確認。
- [記録PR231](https://github.com/Shu-Naomi/shuu-mokugyo-game/pull/231) はこの文書のみ。

## 最終検証

[最終main CI37903436043](https://github.com/Shu-Naomi/shuu-mokugyo-game/actions/runs/37903436043) はunitとbrowserの両jobが成功し、記録と後処理まで正常終了。

- unit398/398成功、fail0。自然なモデル検査36条件は全てlanding。
- browser44 PASS、既存36＋新規8。エラーとasset失敗は0。
- 公開先のログに `PUBLIC_RELEASE_VERIFIED e0e97b69d00b9a1b1174509ff7b483aa9c92f760`。HTML・JS・CSS・SW・検査対象の原画・音声が公開コードとバイト単位で一致。
- [補修後Pages37903436031](https://github.com/Shu-Naomi/shuu-mokugyo-game/actions/runs/37903436031) も成功。

海王の竿、ハリ大、適切な餌を使用。モデル36条件は普通／巨大のナマズ・コイ・ライギョ・星湖ぬし・星降るぬし、600msの入力待ちと3乱数条件を含む。普通ナマズには0／360ms待ちの比較もある。押しっぱなしの失敗、受付の遅い押下、連打、正しく離した成果、遅い離し、背景移行、段階変更も確認した。

### 公開URLの自然な釣り上げ

PC1280×720のマウスと横画面844×390のネイティブタッチ入力を使い、投げ込み・アワセ・ファイトから自然なlanding、釣果1、餌20→19、巨大金冠、保存、再読み込みまで全8件で成功。

| 入力 | 魚 | 方式 | サイズcm | 入力待ちms | 釣り上げ秒 |
| --- | --- | --- | ---: | ---: | ---: |
| PCマウス | ナマズ | ぬし釣り | 99.99 | 600 | 81.24 |
| PCマウス | コイ | ぬし釣り | 99.99 | 600 | 72.00 |
| PCマウス | 星湖のヌシ | ぬし釣り | 299.99 | 600 | 139.08 |
| PCマウス | 星湖のヌシ | ゲージ | 299.99 | 0 | 58.20 |
| 横画面タッチ | ナマズ | ぬし釣り | 99.99 | 600 | 75.96 |
| 横画面タッチ | ライギョ | ぬし釣り | 114.99 | 600 | 40.80 |
| 横画面タッチ | 星降るヌシ | ぬし釣り | 899.99 | 600 | 281.04 |
| 横画面タッチ | 星降るヌシ | ゲージ | 899.99 | 0 | 93.36 |

出現条件を満たすテスト用セーブ、出現抽選と最大級サイズの再現用条件を使う。ファイト中の寄せ率・張力・landingを成功値へ変更せず、自然な操作と処理で釣り上げる。時計を進める自動検査であり、人がAndroid実機で遊んだ検証とは区別する。

## 証拠と画面確認

- 最初のsource CI [37897372690](https://github.com/Shu-Naomi/shuu-mokugyo-game/actions/runs/37897372690) は398 unit／44 browser成功。artifact `11601303867`、24025752 bytes、ZIP SHA256 `547b427e3397b21733d0f68fd441bbda1265d75bf6e1a149f7beb84aac8ffa32`。実際に取得してchecksumを照合し、新規14画像を取得。PC／横画面の緩み・引く・予兆、最大級ぬしの釣果画面を表示して確認した。
- 補修source CI [37902036729](https://github.com/Shu-Naomi/shuu-mokugyo-game/actions/runs/37902036729) も398 unit／44 browser成功。artifact `11604060928`、24171069 bytes、GitHub提供digest `5b00985180a325986e94bfd5e9d6d15b425963c9a1aeb2efba96d4c8e8dc5623`。
- 最終公開artifact `11603937687`、23774183 bytes、GitHub提供digest `534de1aa33a9156e15bc62192cb0dfe632cbf2dffec67ea7dc724a0bdee7d707`。

環境切断後の補修source／最終公開ZIPはローカル取得・独自checksum照合・画像の追加表示を行っていない。上記のdigestはGitHubの提供値。ゲーム本体の全blobは同一で、最終公開先でのcomputed style・入力・釣果・保存の判定も通った。

## 検査で直した準備と時間

初回公開CI [37899339372](https://github.com/Shu-Naomi/shuu-mokugyo-game/actions/runs/37899339372) は配信バイトと44のブラウザ結果を確認できたが、unitは397/398。古い竿性能検査がcalm状態とreelingフラグを直接設定し、新しい押下受付を飛ばすため、開始時にcalmが選ばれると強い竿の試験が0.6で止まった。

竿の計算を切り出す固定時計とcalm窓を用意し、releaseBattleAction／pressBattleActionを通してreelingとacceptedを確認する形へ補修。自然な時間進行の釣り上げは別のv228検査で確認する。初回browserの各stepと証拠uploadは成功したが、jobは20分上限でcancelledだったため、上限を30分に延ばした。最終mainでは全検査と記録が正常終了した。

## 引き継ぎの状態

元の引き継ぎファイルは、実装PR229のsource成功とmain反映までを同じファイルへ保存済み（version37）。途中で作業環境がofflineになったため、元のファイルへの最終追記は未保存。この技術記録に補修PR230と最終公開検証を残した。元の将来計画の全文は元の引き継ぎに保持している。

接続が戻った次の作業では、元の引き継ぎの最新版を読み、この文書の完了記録を反映して同じファイルへ保存する。公開ゲームの検証を未完として繰り返す必要はない。

## 再現するコード

- `nushi-tsuri/docs/v228-readable-fight.md`
- `nushi-tsuri/tests/nushi-playability-v228.cjs`
- `nushi-tsuri/tests/nushi-playability-v228.test.cjs`
- `nushi-tsuri/tests/browser-v228.fight.cjs`
- `nushi-tsuri/tests/regional-nushi-v202.test.cjs`
