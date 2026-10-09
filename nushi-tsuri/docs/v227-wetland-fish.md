# v227: 水郷の湿地と普通魚6種

峠の沼を東側へ歩き、「湿地へ下る道」でAを押すと水郷の湿地に入る。睡蓮の池・砂底の小川・葦の沼を歩いて巡り、小川を中央の木橋で渡れる。北東の来た道でAを押すと峠の沼へ戻る。

既存の33魚種と図鑑番号を保持し、普通魚6種を34〜39として追加した。新しい魚は湿地だけに出現する。既存の地域ぬしの解放条件には追加しない。

| 番号 | 魚 | 主な水辺 | 基本の仕掛け |
| --- | --- | --- | --- |
| 34 | タナゴ | 睡蓮の池／葦の沼の岸際 | 練りエサ＋ハリ小 |
| 35 | モツゴ | 池・小川・葦の沼 | 川虫＋ハリ小 |
| 36 | メダカ | 池・小川・葦の沼の岸際、朝〜昼に多い | 川虫＋ハリ小 |
| 37 | カマツカ | 砂底の小川 | ミミズ＋ハリ小 |
| 38 | ニゴイ | 小川／葦の沼の中層〜深場 | ミミズ＋ハリ中 |
| 39 | ライギョ（カムルチー） | 葦の沼、昼〜夕方に多い | 活き小魚＋ハリ大、丈夫な竿 |

二方式のファイト、六段階のサイズ、最大記録、釣果と図鑑、魚料理材料、水槽の表示・成長・繁殖、セーブ枠の既存経路へ統合した。小魚の細かな動き、砂底で粘るニゴイ、水草へ突進するライギョを既存の操作で狙える。価格・サイズ・餌の倍率・時間帯の倍率はゲーム用の調整値。

## 原画

六魚種は組み込みImageGenで生成済みの透明8姿勢原画を使用。PNGを改変せず、7つの向きと呼吸姿勢を実測した矩形で切り出し、既存の連続描画へ接続する。26方向の原画としては扱わない。実測矩形は `fish-art-v227.json`。

湿地マップも生成済みの原画をそのまま使用。今回、組み込みImageGenで追加生成した湿地の釣り画面は `assets/wetland-cast-v227.png`。原画 `generated_images/exec-3226507b-9911-48f3-a4b4-6f0936214dee.png`、生成指示は `v227-cast-prompt.txt`。2×2原画の左上＝睡蓮、右上＝小川、左下＝葦の沼、右下は未使用。元のピクセルと透明度を保持し、描画時に必要な範囲を利用する。

| ファイル | サイズ | 形式 | バイト数 | SHA256 |
| --- | --- | --- | --- | --- |
| assets/fish-kamatsuka-v227.png | 1536×1024 | RGBA | 1882682 | b0bcd287942620961eb0c99852a01e38c923301b1df7c90765932170e3e0eeeb |
| assets/fish-medaka-v227.png | 1536×1024 | RGBA | 1634672 | 345540dd3998b807d2d316534def3ba83c3153e74852be0e25cb608b172d1f04 |
| assets/fish-motsugo-v227.png | 1536×1024 | RGBA | 1806526 | 3d925ca82d026dee43fd3c0f4ea5c51972aa902aad170e5e194520b449cfb0ea |
| assets/fish-nigoi-v227.png | 1536×1024 | RGBA | 1929590 | 2f336e6cdfbb83c278e8ce48b310eac0f7a90178268cb5cb368bf715d898484f |
| assets/fish-raigyo-v227.png | 1536×1024 | RGBA | 1913508 | ddda38f0e0a0ee709aea43636c9d443ec911b6f73dfd9addb30037fc06b76716 |
| assets/fish-tanago-v227.png | 1536×1024 | RGBA | 2007015 | 8c55e2fd1b816ea5d180f87a6adc0f4bca11b325d6e3a7b6ed68be81a95545ba |
| assets/wetland-cast-v227.png | 1536×1024 | RGB | 3656379 | 25e65dbd2b740ef9b728d7da6d044bc6ebefd6c53ada6e1c25ebb171530de9d0 |
| assets/wetland-world-v227.png | 1672×941 | RGB | 4238026 | b457a3b0fc330dbeae3adff983ada359f91a5010aa9f8267b4f33d403e609542 |

## 検証

- 追加の5検査は実ゲームの徒歩移動・3水域と木橋・往復・保存再開・6魚種の投下と釣果・料理材料・水槽描画・39番号・オフライン資産を確認する。
- 六魚種それぞれ97サンプルの実画像描画で、シルエットの可視性、端の切れ、体の位置と幅の急変を確認する。
- 実ChromiumはPC1280×720と横画面スマホ844×390の入力で、峠の沼からの入場、3岸への移動、6魚種の表層と水中、ゲージ式／ぬし釣り式、餌1個の消費、釣果・材料・保存再開、徒歩での帰還を検査する。
- ソースPRの全検査を通してからマージする。公開URLでも配信ファイルがmainのバイトと一致することと実入力を確認する。結果の確定記録は作業引き継ぎに保存する。

## 図鑑の参考資料

図鑑本文は下の資料を確認した独自の短い説明。餌・釣り条件はゲーム用の設定で、現実の捕獲や飼育の案内ではない。

- 国立科学博物館 [タナゴ](https://www.kahaku.go.jp/research/db/zoology/uodas_freshdb/area/cyprinnidae/acheilognathinae/acheilognathus/075.html)、[モツゴ](https://www.kahaku.go.jp/research/db/zoology/uodas_freshdb/area/cyprinnidae/sarcocheilichthyinae/112.html)
- 国立環境研究所 [メダカ](https://www.nies.go.jp/biodiversity/invasive/DB/detail/50910.html)、[カムルチー](https://www.nies.go.jp/biodiversity/invasive/DB/detail/50420.html)
- 愛媛大学 [現生魚類骨格標本](https://earth.sci.ehime-u.ac.jp/~nkusu/fish_j.html)（ニゴイ／カマツカの学名）
- 国土交通省 [霞ヶ浦の淡水魚](https://www.ktr.mlit.go.jp/kasumi/kasumi00076.html)（モツゴ／カムルチーの形態と水辺）

## 計画の扱い

ファストトラベル・マップ時間送り、表ぬし＋素材・最高峰竿・巨大ラスボス・真の最強竿・超万能ミミズ・DLCは未実装。既存の歩行の時間ルール、v226の船の支点とオールの動き、v223の静かな水面を保持する。
