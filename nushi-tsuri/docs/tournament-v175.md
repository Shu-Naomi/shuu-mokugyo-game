# 大会NPC・第2段階（v175）

星湖フナ大会に、源じい（釣り好きのおじいさん）、ミナ（魚屋）、タケ（八百屋）、ハル（子ども）が参加する。サムは主催者。新しく参加する大会は主人公を含めた5人で競う。

## 釣りと会話

4人はそれぞれ湖の東岸・南東岸・南西岸・西岸に立つ。対岸や建物越しには話しかけられず、近づいて相手のほうを向き、Aで話しかける。会話には釣果がないとき、釣れた直後、待っているときの台詞があり、連続して同じ台詞を選ばない。会話中は主人公のA操作が釣りへ抜けない。

大会ビクには参加者の現在の匹数と合計サイズ、会話画面にはその人の暫定順位を表示する。相手の釣果は主人公と同じ投数まで進み、未来の釣果は途中経過に含めない。6匹以上釣った相手は大きい5匹を残す。

結果画面を閉じると通常の時間と音へ戻り、参加者はゲーム内60分だけ湖畔に残る。Aで話しかけると、優勝の祝福、順位に応じた再戦の約束、同順位の感想、釣果ゼロや途中終了への励ましを返す。歓談中の結果は保存・再開でき、60分経過か新しい大会への参加で切り替わる。これは直近の大会の会話用データで、恒久的な優勝記録や報酬ではない。

## バランスと保存

| 参加者 | 対象魚の釣果数 | 1匹のサイズ | 最終ビクの合計範囲 |
| --- | --- | --- | --- |
| 源じい | 4〜6匹 | 17〜30cm | 90〜110cm |
| ミナ | 3〜5匹 | 16〜32cm | 65〜105cm |
| タケ | 2〜5匹 | 13〜29cm | 38〜93cm |
| ハル | 1〜4匹 | 10〜28cm | 18〜76cm |

投数や匹数から不可能な合計にならないよう、人数別の範囲と保持容量を満たす釣果を生成する。大会開始時に独立したシードと投ごとの釣果を保存し、再読み込みや会話で抽選し直さない。1,000大会の確認で源じいの平均は100.00239cmとなり、第1段階の99.50cmの参考記録に近い。

`tournament-npcs.js` に人物・会話・釣果生成・会場ごとの配置・画像の描画を分けた。`tournament.js` の大会定義が人数、サイズ範囲と時間・対象魚を指定する。主人公の魚種抽選、サイズ抽選、釣具・エサの相性、代金・図鑑の処理は変更しない。参加費、賞品、専用BGM、新大会、新マップは次段階以降。

v174で参加済みのセーブは、その大会を終えるまでサムの参考記録を維持する。次に参加すると村人大会になる。

## 検証

`tests/tournament-npcs.test.cjs` は1,000大会の釣果範囲、投数に連動する順位、保存の再現性、旧大会の継続、実UIでのA会話と通常釣り、終了後の台詞と期限、全4歩グリッドからの接近、道の通過、原画の8ポーズと透過、オフラインの依存ファイルを検証する。第1段階と既存の移動・天気・音・釣りUI・ガチャ・Service Workerの回帰テストも実行する。

## 原画

保存先：`nushi-tsuri/assets/tournament-villagers-v175.png`。組み込みの imagegen で制作した4列×2段の透過アトラス。画像自体を加工せず、描画時に原画内の各ポーズを切り出し、足元を合わせて使用する。

制作プロンプト：

> Use case: stylized-concept. Asset type: transparent pixel-art character sprite atlas for a cozy Japanese lakeside fishing RPG, detailed SNES / Super Famicom era Japanese game pixel art. Create ONE precisely arranged 4-column by 2-row sprite atlas, transparent background, 1024x768 canvas preferred, 8 equal 256x384 cells, generous transparent padding inside each cell, every character completely inside its cell. Four distinct village fishing contestants, SAME identities repeated in the two rows. Columns left to right: (1) short stocky elderly Japanese fisherman, grey beard, olive bucket hat, ochre fishing vest over cream shirt, olive trousers and brown boots; (2) adult female fishmonger, dark hair tied back with teal headscarf, teal apron over coral shirt, dark trousers and rubber boots; (3) adult male greengrocer, indigo bandana, green work apron over cream striped short sleeve shirt, tan trousers and brown shoes; (4) small elementary school-age boy, red cap, mustard yellow T-shirt, navy shorts, sneakers. ROW 1: each character in a relaxed believable fishing stance, three-quarter view facing upper LEFT, left side visible, holding a short thin bamboo fishing rod that points diagonally toward the upper-left, both arms proportionate, elbows bent naturally, rod grip sensible, no fish, no line beyond their cell. ROW 2: exact same four characters now facing toward camera, cheerful calm conversation stance, holding their rod vertically to one side, natural balanced human arms and anatomy, same clothes and relative size as row1. Characters around 3 heads tall in detailed retro RPG proportions; child a little smaller. Depict full body, clean dark pixel contours, subtle 3-tone cluster shading, textured cloth in crisp square pixels, consistent overhead light and slightly top-down RPG camera. Clearly visible hands, feet, expressive friendly faces. Dense crafted pixel art rather than flat icon or block mannequin. Each adult's visible body about 235 pixels high, equally aligned feet at 350 pixels within each cell; keep the rod and hat inside cell. True alpha transparency with zero background or floor; no checkerboard baked in; no grid, no border, no text, no shadows outside characters, no labels, no logos. Exactly 8 sprite cells, no additional characters.
