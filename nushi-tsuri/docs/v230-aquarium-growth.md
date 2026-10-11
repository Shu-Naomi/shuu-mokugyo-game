# v230 水槽の個体選択・稚魚・ぬし総合水槽

アスアルの買い取りで全水槽の魚が一度に並び、個体を見分けにくかった。水槽選択 → 選んだ水槽の個体一覧 → 一匹と価格の確認に変更した。個体画像、体長、サイズ、個体番号、世代、元気、アスアルのコメントを表示する。成長途中の子も観察できるが、買い取り条件を満たすまでは売れない。

確定で選んだ一匹だけを手放す。戻る操作・閲覧に費用や時間はかからない。二重タップでも代金を重ねて受け取らない。ぬしは買い取り対象外。

## 個体の大きさと成長

- 個別観察と買い取り画像は、その魚種の最大体長を共通の基準として現在の体長を反映する。小さい子は最低14pxの表示を確保する。水槽全体は従来どおりcmに基づく物理縮尺。
- 今後孵化する子は、魚種の極小サイズの下限より小さな「稚魚（繁殖限定）」として生まれる。整数0.01cmの既存単位を使い、出生サイズと現在のサイズを個体に保存する。ショップや野生のサイズ区分は変更しない。
- 稚魚の成長・性別・世代・星・経験値・お世話日は再読み込み後も保持する。旧版で生まれた魚の出生サイズや成長済みサイズを縮めない。
- 水槽個体のニジマスには幼魚のパーマークを加え、育つと薄くする。イサキは24cmから縞の目立たない成魚画像を使う。実際の成長でニジマスの幼魚斑が薄れることは[森の中の水族館。スタッフブログ（2015-03-22）](https://morinonakanosuizokukan.kikyouya.co.jp/category/blog/page/154/)、イサキの24cm以上の模様変化は[新潟市水族館マリンピア日本海の図鑑](https://www.marinepia.or.jp/picturebook/fish/entry-11019.html)を参照した。ニジマスの表示上のフェード区間はゲームの成長速度に合わせた作画判断。
- 見た目の変化は飼育個体の描画だけに渡す。戦闘・釣果・図鑑の共通魚画像と魚の性能は変更しない。従来の向き・尾びれアニメーションを維持する。

## ぬし専用総合水槽

通常6槽・各5匹に、淡水ぬし総合水槽と海水ぬし総合水槽を追加する。それぞれ8匹まで。対応する水のぬしを釣ると無料で解放し、アスアルの「ぬしの飼育」から釣った魚種ごとに一匹を迎えられる。迎える時の体長は保存済みの最大釣果、記録がない旧セーブは魚種の初期体長とする。

現行の湖・渓流・沿岸・地底湖・星湖のぬしに対応。未釣獲のぬしの名前は売り場に並べない。通常魚をぬし水槽に入れず、淡水・海水のぬしも混ぜない。ぬしも毎日のエサと水で成長するが、繁殖・売却・託す操作は対象外。

既存の通常水槽内のヌシは、UID・体長・出生サイズ・成長・お世話記録を保ち、淡水の専用水槽へ移行する。普通の魚を退かす必要はない。迎え済みの権利も保持し、複製を防ぐ。保存形式はpetLife version 5。

## 検証

専用回帰では、通常30匹を保持したまま全5種のぬしを迎える、水の分離、迎え直し防止、旧ヌシ移行、孵化と成長、既存の成長記録保持、画像サイズ差、買い取りの個体指定・取り消し・二重確定・再読み込み、成魚イサキ25方向の透明度とシルエットを確認する。

実ブラウザー検査はPC1280×720と横画面タッチ844×390で、水槽選択・個体画像・確認・取り消し・売却、専用水槽、実際のお世話による卵と孵化、幼魚／成魚画像、成長、保存と再読み込みを操作する。これとは別に既存の全回帰も実行する。公開の結果は作業完了時に記録する。

## 成魚イサキ画像の制作記録

内蔵image_genによる既存画像の編集。元画像 assets/fish-isaki-v220.png を維持し、生成された透明PNGを新しい assets/aquarium-isaki-adult-v230.png に保存。1536×1024・26フレームの配置と向きを維持し、ネイティブの切り出し座標を再利用する。25方向で旧画像との不透明領域面積の差が2%未満であることを確認した。

最終プロンプト：

```text
Use case: precise-object-edit.
Asset type: aquarium-only adult isaki fish game animation atlas.
Input image 1 is the edit target: the existing 1536x1024 fish-isaki-v220.png sheet, with 26 individual fish frames (five columns by five full rows, plus one open-mouth frame at lower left).
Primary request: remove the three prominent dark lengthwise juvenile stripes from EVERY fish, replacing only those stripes with natural adult isaki grey-golden brown scale shading. The grown adult has an unstriped golden-grey upper body and pale silvery belly.
Invariants: Keep the original sheet dimensions 1536x1024. Preserve every fish frame's exact position, bounding silhouette, size, fin shape, eye, mouth, swim heading, pose and frame count. Keep the detailed retro game fish art style and all original lighting, golden fins and silver bellies. Do not move, enlarge, crop, duplicate or add any fish. Each fish must fit exactly in its existing position so original atlas crop coordinates still work.
Background: genuinely transparent alpha outside the fish silhouettes, no brown backdrop, no shadow, no text, no grid lines, no checkerboard painted into the image.
Change only the juvenile body stripe coloration and remove the background; do not redesign the fish.
```
