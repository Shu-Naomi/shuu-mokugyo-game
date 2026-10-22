(function(root,factory){
 const api=factory();
 if(typeof module==='object'&&module.exports)module.exports=api;else root.ShuFishAdditions=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(){
 'use strict';
 // Numeric sizes, prices, strength and bait multipliers are game tuning.
 const definitions=[
  {id:'kawamutsu',name:'カワムツ',base:'oikawa',number:40,price:190,resistance:58,band:'small',hook:'small',
   scientific:'Nipponocypris temminckii',habitats:['river'],rarity:1,label:'川辺の太い縦帯',
   ecology:'体側に太い暗色の帯が走る川魚。流れの穏やかな川辺でも見られる。',
   locations:'民家川／星見渓流／水郷の湿地・砂底の小川（岸際〜中層）',time:'いつでも',
   rods:['youngBamboo','clearStream'],baits:['river','worm','grasshopper'],tip:'川虫＋ハリ小で川の岸際を。短い走りが止まる瞬間に寄せよう。',
   intro:'太い縦帯のカワムツだ。小刻みな方向転換を、落ち着いて追おう。',lengths:[3,5,8,11,14,18,23],
   baitWeights:{river:2.8,worm:1.6,grasshopper:1.7,paste:.5,corn:.15,shrimp:.08,liveMinnow:.02}},
  {id:'herabuna',name:'ヘラブナ',base:'funa',number:41,price:420,resistance:112,band:'medium',hook:'medium',
   scientific:'Carassius cuvieri',habitats:['lake'],rarity:2,label:'銀色の高い背',
   ecology:'ゲンゴロウブナの名でも知られる、体高の高い銀色のフナ。湖や池沼に暮らす。',
   locations:'星降る湖／峠の池／水郷の湿地・睡蓮の池（岸際〜深場）',time:'いつでも',
   rods:['clearStream','starGazer'],baits:['paste','corn','worm'],tip:'練りエサ＋ハリ中で池の中層へ。横へ粘る引きが落ち着くまで待とう。',
   intro:'背の高いヘラブナだ。横へ粘る重い引きを、ゆっくり受け止めよう。',lengths:[8,14,20,27,34,42,52],
   baitWeights:{paste:3,corn:1.6,worm:.7,river:.45,shrimp:.05,liveMinnow:.01}},
  {id:'himemasu',name:'ヒメマス',base:'nijimasu',number:42,price:620,resistance:126,band:'medium',hook:'medium',
   scientific:'Oncorhynchus nerka',habitats:['lake'],rarity:3,label:'峠の池の銀鱗',
   ecology:'湖に暮らす陸封型のベニザケ。通常の姿は青緑の背と銀色の体が目印。',
   locations:'峠の池（中層〜深場）',time:'朝〜昼に多い',
   rods:['clearStream','starGazer'],baits:['river','smallShrimp','shrimp'],tip:'峠の池の中層へ川虫＋ハリ中を。深場へも投げ分けてみよう。',
   intro:'銀色のヒメマスだ。水を切る速い走りが止まるまで、糸を送ろう。',lengths:[10,16,22,28,34,41,50],
   baitWeights:{river:2.6,smallShrimp:2.8,shrimp:1.8,worm:1,paste:.04,corn:.1,liveMinnow:.35}},
  {id:'mahaze',name:'マハゼ',base:'kajika',number:43,price:210,resistance:57,band:'small',hook:'small',
   scientific:'Acanthogobius flavimanus',habitats:['sea'],rarity:1,label:'港の砂泥底の住人',
   ecology:'内湾や河口の砂泥底で見られるハゼ。低い頭と砂色のまだら模様、二つの背びれを持つ。',
   locations:'潮見浜・港／白砂の小島（岸際〜中層）',time:'いつでも',
   rods:['bamboo','shoreReed'],baits:['worm','smallShrimp','shrimp'],tip:'港や砂浜の岸際へミミズ＋ハリ小。砂底で止まる小さな引きを待とう。',
   intro:'砂色のマハゼだ。底を伝う小さな引きを、やさしく追おう。',lengths:[3,6,9,13,17,22,28],
   baitWeights:{worm:2.6,smallShrimp:2.1,shrimp:1.4,river:.6,shell:.3,crab:.3,paste:.03,liveMinnow:.03}},
  {id:'sayori',name:'サヨリ',base:'wakasagi',number:44,price:290,resistance:72,band:'small',hook:'small',
   scientific:'Hyporhamphus sajori',habitats:['sea'],rarity:2,label:'長い下あごの銀線',
   ecology:'下あごが長く伸びた細身の海の魚。内湾や沿岸の水面近くで群れを作る。',
   locations:'潮見浜・港／白砂と岩礁の小島（岸際）',time:'朝〜昼に多い',
   rods:['youngBamboo','shoreReed'],baits:['shrimp','smallShrimp','worm'],tip:'オキアミ＋ハリ小で海の岸際へ。遠投せず、短い距離から探ろう。',
   intro:'長い下あごのサヨリだ。細かな横走りが止まったら、やさしく寄せよう。',lengths:[8,13,18,24,30,36,42],
   baitWeights:{shrimp:2.8,smallShrimp:2.4,worm:.5,river:.2,paste:.1,corn:.02,liveMinnow:.01}},
  {id:'masaba',name:'マサバ',base:'aji',number:45,price:460,resistance:132,band:'medium',hook:'medium',
   scientific:'Scomber japonicus',habitats:['sea'],rarity:2,label:'青い背の波模様',
   ecology:'青緑の背に暗い波状の模様を持つ回遊魚。腹側は銀白色で、尾の付け根が細い。',
   locations:'潮見浜・港／白砂と岩礁の小島（中層〜深場）',time:'朝〜夕方に多い',
   rods:['shoreReed','tideMaster'],baits:['shrimp','smallShrimp','liveMinnow'],tip:'オキアミ＋ハリ中で海の中層へ。群れへ戻る連続した走りをいなそう。',
   intro:'青い背のマサバだ。群れへ戻る連続した走りを、落ち着いていなそう。',lengths:[8,15,22,30,38,46,55],
   baitWeights:{shrimp:2.8,smallShrimp:2.1,liveMinnow:1.4,worm:.4,river:.08,shell:.08,paste:.02}}
  ,{id:'gigi',name:'ギギ',base:'namazu',number:46,price:480,resistance:100,band:'medium',hook:'medium',
   scientific:'Tachysurus nudiceps',habitats:['river','lake'],rarity:2,label:'岩陰の八本ひげ',
   ecology:'口のまわりの八本のひげと、深く二つに分かれた尾びれが目印。昼は岩陰に潜み、水生昆虫やエビ、小魚を食べる。',
   locations:'岩窟の地下湖（岸際〜深場）／星見渓流（淵・深場）',time:'夕方〜夜に狙いやすい',
   rods:['clearStream','starGazer'],baits:['river','worm','smallShrimp'],tip:'地下湖の中層へ川虫＋ハリ中。深場ならミミズや小エビでも探ろう。',
   intro:'八本ひげのギギだ。底へ潜ろうとする短い走りが止まったら、そっと引こう。',lengths:[6,10,14,20,27,35,45],
   baitWeights:{river:2.8,worm:2.2,smallShrimp:2.3,shrimp:1.5,liveMinnow:1.2,paste:.1,corn:.02}}
  ,{id:'bluegill',name:'ブルーギル',base:'funa',number:47,price:160,resistance:80,band:'small',hook:'small',
   scientific:'Lepomis macrochirus',habitats:['lake'],rarity:1,label:'青いえらぶたの丸い魚',
   ecology:'体高が高く、えらぶたの後ろに濃い紺色の斑がある。北米原産で、湖や池、流れの緩やかな場所に暮らす。',
   locations:'星降る湖／水郷の湿地・睡蓮の池（岸際〜中層）',time:'朝〜夕方に多い',
   rods:['youngBamboo','clearStream'],baits:['worm','river','smallShrimp'],tip:'ミミズ＋ハリ小で水草の近くへ。短く横へ走る引きが止まったら寄せよう。',
   intro:'青いえらぶたのブルーギルだ。丸い体で横へ走る引きを受け止めよう。',lengths:[4,7,11,15,19,24,30],
   baitWeights:{worm:3,river:2,smallShrimp:2.1,shrimp:1.2,paste:.35,corn:.2,liveMinnow:.1}},
  {id:'aburahaya',name:'アブラハヤ',base:'kawamutsu',number:48,price:120,resistance:48,band:'small',hook:'small',
   scientific:'Rhynchocypris lagowskii steindachneri',habitats:['river'],rarity:1,label:'なめらかな体の黒い帯',
   ecology:'体側の暗い帯となめらかな小さなうろこが目印の川魚。川の上流から中流にかけて見られる。',
   locations:'民家川／星見渓流／水郷の湿地・砂底の小川（岸際〜中層）',time:'いつでも',
   rods:['bamboo','youngBamboo'],baits:['river','worm','grasshopper'],tip:'川虫＋ハリ小で川の岸際へ。細かな走りを待ち、弱い力でそっと引こう。',
   intro:'黒い帯のアブラハヤだ。小刻みな短い走りを、やさしく追おう。',lengths:[2,4,6,8,11,14,18],
   baitWeights:{river:3,worm:2,grasshopper:1.6,paste:.4,corn:.08,shrimp:.1,liveMinnow:.01}},
  {id:'magochi',name:'マゴチ',base:'ainame',number:49,price:720,resistance:152,band:'large',hook:'large',
   scientific:'Platycephalus sp.2',habitats:['sea'],rarity:3,label:'砂に潜む平たい頭',
   ecology:'幅広く平たい頭と砂色のまだら模様を持つ海の魚。沿岸や内湾の砂泥底に潜み、小魚やエビを捕らえる。',
   locations:'潮見浜・港／白砂の小島（中層〜深場）',time:'朝〜夕方に多い',
   rods:['shoreReed','tideMaster'],baits:['liveMinnow','smallShrimp','shrimp'],tip:'活き小魚＋ハリ大で砂底の深場へ。底へ突っ込む強い引きと、長く寄せられる間を見分けよう。',
   intro:'平たい頭のマゴチだ。砂底へ突っ込む強い引きは、無理せずいなそう。',lengths:[10,18,28,39,50,64,82],
   baitWeights:{liveMinnow:3,smallShrimp:1.8,shrimp:1.7,worm:.6,crab:.8,shell:.15,river:.02,paste:.01}}
 ];
 definitions.push(
  {id:'oyanirami',name:'オヤニラミ',base:'bass',number:50,price:290,resistance:85,band:'small',hook:'small',
   scientific:'Coreoperca kawamebari',habitats:['river','lake'],rarity:3,label:'水草にひそむ眼状紋',
   ecology:'えらぶたの大きな眼状紋が目印の淡水魚。流れのゆるやかな川岸や水草の陰に縄張りを持ち、水生昆虫などを捕らえる。',
   locations:'民家川／水郷の湿地・睡蓮の池と砂底の小川（岸際〜中層）',time:'いつでも',
   rods:['youngBamboo','clearStream'],baits:['river','smallShrimp','worm'],tip:'川虫＋ハリ小で水草の近くへ。急な飛び出しと、止まって寄せられる間を見分けよう。',
   intro:'眼状紋のオヤニラミだ。水草へ戻ろうとする急な飛び出しをいなそう。',lengths:[2,4,6,8,10,13,17],
   baitWeights:{river:3,smallShrimp:2.8,worm:2,shrimp:1.2,liveMinnow:.8,grasshopper:.7,paste:.02,corn:.01}},
  {id:'akakamasu',name:'アカカマス',base:'masaba',number:51,price:520,resistance:142,band:'medium',hook:'medium',
   scientific:'Sphyraena pinguis',habitats:['sea'],rarity:2,label:'銀色の鋭い追跡者',
   ecology:'細長い体と鋭い歯を持つ海の魚。沿岸を群れで泳ぎ、小魚などを捕らえて食べる。',
   locations:'潮見浜・港／白砂と岩礁の小島（中層〜深場）',time:'いつでも',
   rods:['shoreReed','tideMaster'],baits:['liveMinnow','shrimp','smallShrimp'],tip:'活き小魚＋ハリ中で海の中層へ。スプーンにも反応し、鋭く速い走りを見せるよ。',
   intro:'銀色のアカカマスだ。鋭く速い走りが止まるまで、無理せず待とう。',lengths:[7,13,20,28,36,45,56],
   baitWeights:{liveMinnow:3.3,shrimp:1.6,smallShrimp:1.3,worm:.2,crab:.08,shell:.03,river:.02,paste:.01}},
  {id:'ishidai',name:'イシダイ',base:'kurodai',number:52,price:960,resistance:190,band:'large',hook:'large',
   scientific:'Oplegnathus fasciatus',habitats:['sea'],rarity:3,label:'岩礁の黒い縞',
   ecology:'若い個体の黒い横縞が鮮やかな海の魚。浅い海の岩礁に暮らし、丈夫な歯で貝や甲殻類を噛み砕く。',
   locations:'潮見浜・港（深場）／岩礁の小島（中層〜深場）',time:'いつでも',
   rods:['shoreReed','tideMaster'],baits:['shell','crab','shrimp'],tip:'貝かカニ＋ハリ大で岩礁の深場へ。岩へ粘る重い引きには、首振りの合図で竿を休めよう。',
   intro:'黒い縞のイシダイだ。岩場へ戻ろうと粘る重い引きを受け止めよう。',lengths:[8,16,26,38,50,65,82],
   baitWeights:{shell:3.3,crab:3,shrimp:1.3,smallShrimp:.8,worm:.4,liveMinnow:.15,river:.02,paste:.01}}
 );
 const art = {"kawamutsu":{"asset":"assets/fish-kawamutsu-v238.png","boxes":[[17,185,451,211],[492,169,349,240],[882,164,273,266],[1233,162,274,268],[29,615,296,262],[337,641,385,228],[729,670,409,200],[1155,673,369,196]],"heads":[[0.99,0.65],[0.98,0.7],[0.82,0.72],[0.5,0.72],[0.18,0.72],[0.02,0.7],[0.01,0.65],[0.99,0.6]],"continuousBody":true},"herabuna":{"asset":"assets/fish-herabuna-v238.png","boxes":[[18,123,454,317],[500,116,363,331],[919,108,268,346],[1237,108,271,350],[30,583,350,338],[391,595,350,318],[745,613,388,285],[1145,612,381,291]],"heads":[[0.99,0.65],[0.98,0.7],[0.82,0.72],[0.5,0.72],[0.18,0.72],[0.02,0.7],[0.01,0.65],[0.99,0.6]],"continuousBody":true},"himemasu":{"asset":"assets/fish-himemasu-v238.png","boxes":[[27,237,463,186],[534,216,343,225],[917,191,268,256],[1273,182,238,273],[25,654,307,226],[344,654,349,201],[695,685,376,164],[1100,674,425,181]],"heads":[[0.99,0.65],[0.98,0.7],[0.82,0.72],[0.5,0.72],[0.18,0.72],[0.02,0.7],[0.01,0.65],[0.99,0.6]],"continuousBody":true},"mahaze":{"asset":"assets/fish-mahaze-v238.png","boxes":[[12,189,435,180],[458,170,331,245],[865,154,321,273],[1212,142,311,275],[21,588,347,272],[395,615,336,212],[745,633,394,184],[1153,647,370,170]],"heads":[[0.99,0.65],[0.98,0.7],[0.82,0.72],[0.5,0.72],[0.18,0.72],[0.02,0.7],[0.01,0.65],[0.99,0.6]],"continuousBody":true},"sayori":{"asset":"assets/fish-sayori-v238.png","boxes":[[26,233,544,112],[556,176,399,225],[998,159,278,248],[1297,131,200,284],[24,609,330,237],[313,613,411,205],[669,671,425,119],[1109,670,420,114]],"heads":[[0.99,0.6],[0.99,0.8],[0.99,0.93],[0.5,0.98],[0.01,0.95],[0.01,0.8],[0.01,0.55],[0.99,0.6]],"continuousBody":true},"masaba":{"asset":"assets/fish-masaba-v238.png","boxes":[[16,215,496,208],[508,181,382,268],[893,189,300,273],[1223,124,286,342],[22,636,340,254],[352,671,398,212],[735,688,394,175],[1132,680,388,195]],"heads":[[0.99,0.65],[0.98,0.7],[0.82,0.72],[0.5,0.72],[0.18,0.72],[0.02,0.7],[0.01,0.65],[0.99,0.6]],"continuousBody":true},"gigi":{"asset":"assets/fish-gigi-v241.png","boxes":[[13,205,537,218],[530,183,408,267],[942,147,304,318],[1248,160,265,297],[35,550,268,363],[292,596,348,288],[589,637,493,211],[1091,648,430,211]],"heads":[[0.91,0.66],[0.87,0.7],[0.79,0.75],[0.5,0.74],[0.65,0.75],[0.1,0.7],[0.08,0.63],[0.93,0.65]],"continuousBody":true}};
 Object.assign(art,{"bluegill":{"asset":"assets/fish-bluegill-v246.png","boxes":[[23,183,442,269],[525,185,361,276],[924,165,267,305],[1245,167,268,298],[22,600,280,306],[324,624,329,272],[672,646,412,250],[1109,649,414,247]],"heads":[[0.99,0.62],[0.98,0.65],[0.87,0.65],[0.5,0.67],[0.27,0.72],[0.02,0.68],[0.01,0.64],[0.99,0.51]],"continuousBody":true},"aburahaya":{"asset":"assets/fish-aburahaya-v246.png","boxes":[[29,236,456,181],[516,225,376,202],[955,211,249,226],[1277,207,237,221],[63,622,249,233],[364,636,322,218],[664,676,433,177],[1113,679,401,174]],"heads":[[0.99,0.66],[0.98,0.81],[0.87,0.85],[0.5,0.85],[0.28,0.87],[0.02,0.84],[0.01,0.64],[0.99,0.57]],"continuousBody":true},"magochi":{"asset":"assets/fish-magochi-v246.png","boxes":[[34,240,482,186],[540,214,348,232],[937,215,255,231],[1247,199,269,233],[58,600,238,260],[337,621,301,242],[640,668,445,184],[1116,678,400,171]],"heads":[[0.99,0.64],[0.98,0.79],[0.83,0.87],[0.5,0.91],[0.73,0.89],[0.01,0.81],[0.01,0.62],[0.99,0.47]],"continuousBody":true}});
 Object.assign(art,{
  oyanirami:{asset:'assets/fish-oyanirami-v247.png',boxes:[[15,175,491,283],[521,181,404,282],[937,171,289,312],[1249,163,271,318],[15,571,312,302],[323,575,345,303],[672,609,436,269],[1121,608,407,269]],heads:[[.99,.55],[.98,.62],[.97,.65],[.5,.72],[.17,.69],[.02,.67],[.01,.56],[.99,.55]],continuousBody:true},
  akakamasu:{asset:'assets/fish-akakamasu-v247.png',boxes:[[19,207,531,202],[530,195,424,228],[978,187,303,257],[1320,185,206,261],[18,626,309,254],[307,635,372,237],[654,663,445,191],[1109,663,415,193]],heads:[[.99,.64],[.99,.72],[.98,.82],[.5,.75],[.01,.8],[.01,.78],[.01,.7],[.99,.57]],continuousBody:true},
  ishidai:{asset:'assets/fish-ishidai-v247.png',boxes:[[29,145,457,312],[504,144,389,317],[916,136,305,336],[1245,142,272,319],[13,558,305,333],[320,568,362,317],[687,585,415,304],[1122,583,401,306]],heads:[[.99,.62],[.98,.68],[.97,.68],[.5,.72],[.06,.7],[.02,.66],[.01,.62],[.99,.53]],continuousBody:true}
 });
 definitions.push(
  {id:'kawayoshinobori',name:'カワヨシノボリ',base:'mahaze',number:53,price:160,resistance:50,band:'small',hook:'small',
   scientific:'Rhinogobius flumineus',habitats:['river'],rarity:2,label:'川底の小さな吸盤',
   ecology:'一生を川で過ごす小型のハゼの仲間。丸い尾と大きな胸びれを持ち、石の間で小さな水生昆虫などを食べる。',
   locations:'民家川／星見渓流／水郷の湿地・砂底の小川（岸際〜中層）',time:'いつでも',
   rods:['bamboo','youngBamboo'],baits:['river','worm','smallShrimp'],tip:'川虫＋ハリ小で川底の石の近くへ。短く底へ戻る動きを待って、そっと寄せよう。',
   intro:'丸い胸びれのカワヨシノボリだ。石へ戻る小さな走りを、やさしくいなそう。',lengths:[1.2,2,3,4,5,6.5,8],
   baitWeights:{river:3.2,worm:2.4,smallShrimp:1.6,shrimp:.7,paste:.15,corn:.03,liveMinnow:.01}},
  {id:'utsubo',name:'ウツボ',base:'unagi',number:54,price:1050,resistance:205,band:'large',hook:'large',
   scientific:'Gymnothorax kidako',habitats:['sea'],rarity:3,label:'岩穴のまだら模様',
   ecology:'黄色いまだら模様の長い体を持つ海の魚。岩穴に身をひそめ、大きな口と鋭い歯で獲物を捕らえる。胸びれはない。',
   locations:'潮見浜・港（深場）／岩礁の小島（中層〜深場）',time:'いつでも',
   rods:['shoreReed','tideMaster'],baits:['liveMinnow','shrimp','crab'],tip:'活き小魚＋ハリ大で岩礁の深場へ。体をくねらせ岩穴へ戻ろうとする間は、糸を引かずに待とう。',
   intro:'まだら模様のウツボだ。岩穴へ戻ろうとする長い体の力を、無理せず受け流そう。',lengths:[15,28,43,60,78,100,125],
   baitWeights:{liveMinnow:3.2,shrimp:1.8,crab:1.2,smallShrimp:.8,worm:.15,shell:.08,river:.02,paste:.01}},
  {id:'buri',name:'ブリ',base:'suzuki',number:55,price:1200,resistance:220,band:'large',hook:'large',
   scientific:'Seriola quinqueradiata',habitats:['sea'],rarity:3,label:'沖を駆ける黄色い帯',
   ecology:'青緑の背と体側の黄色い帯を持つ海の魚。成長や地方で呼び名が変わる出世魚の一種で、幼魚は流れ藻に集まる。',
   locations:'潮見浜・港／白砂と岩礁の小島（深場）',time:'いつでも',
   rods:['shoreReed','tideMaster'],baits:['liveMinnow','shrimp'],tip:'活き小魚＋ハリ大で沖の深場へ。スプーンも追う力強い回遊魚。長い走りの後に来る引きどころを狙おう。',
   intro:'黄色い帯のブリだ。沖へ向かう力強い走りが止まるのを待とう。',lengths:[12,24,40,57,75,98,125],
   baitWeights:{liveMinnow:3.6,shrimp:1.5,smallShrimp:1,worm:.08,crab:.08,shell:.02,river:.01,paste:.01}}
 );
 Object.assign(art,{
  kawayoshinobori:{asset:'assets/fish-kawayoshinobori-v248.png',boxes:[[9,233,480,181],[516,229,382,195],[928,208,280,225],[1226,173,297,261],[17,612,310,229],[328,649,372,192],[709,665,429,165],[1149,649,377,185]],heads:[[.99,.62],[.99,.74],[.93,.65],[.5,.7],[.02,.65],[.01,.62],[.01,.53],[.99,.43]],continuousBody:true},
  utsubo:{asset:'assets/fish-utsubo-v250.png',boxes:[[8,177,523,236],[473,205,491,223],[925,203,303,246],[1278,176,201,277],[26,607,281,255],[260,617,440,248],[606,613,530,252],[1053,622,477,246]],heads:[[.995,.82],[.995,.88],[.95,.93],[.67,.90],[.23,.91],[.01,.86],[.01,.84],[.01,.84]],scales:{7:1.096},mouthFlip:true,continuousBody:true},
  buri:{asset:'assets/fish-buri-v248.png',boxes:[[15,222,459,197],[503,212,357,229],[890,203,287,244],[1231,189,276,271],[34,611,274,242],[334,618,374,218],[709,631,406,188],[1130,632,392,185]],heads:[[.99,.58],[.99,.68],[.97,.61],[.5,.66],[.02,.67],[.01,.6],[.01,.52],[.99,.41]],continuousBody:true}
 });
 definitions.push(
  {id:'hiramasa',name:'ヒラマサ',base:'buri',number:56,price:1750,resistance:242,band:'large',hook:'large',
   scientific:'Seriola aureovittata',habitats:['sea'],rarity:4,label:'岩礁を駆ける鮮やかな帯',
   ecology:'細身で側扁した体と鮮やかな黄色の帯が目印。上あごの後ろの角が丸く、胸びれは腹びれより短い。岩礁の周辺で小魚を追う。',
   locations:'潮見浜・港（深場）／岩礁の小島（中層〜深場）',time:'いつでも',
   rods:['shoreReed','tideMaster'],baits:['liveMinnow','shrimp'],tip:'活き小魚＋ハリ大で岩礁の沖へ。長く速い走りで距離を戻されるので、糸が緩んだ番に取り返そう。',
   intro:'鮮やかな帯のヒラマサだ。岩礁の沖へ伸びる速い走りをいなそう。',lengths:[18,30,50,75,105,140,190],
   baitWeights:{liveMinnow:3.8,shrimp:1.7,smallShrimp:.9,worm:.05,crab:.05,shell:.01,river:.01,paste:.01}},
  {id:'kanpachi',name:'カンパチ',base:'buri',number:57,price:1800,resistance:250,band:'large',hook:'large',
   scientific:'Seriola dumerili',habitats:['sea'],rarity:4,label:'目を横切る褐色の帯',
   ecology:'ブリやヒラマサより体高があり、目の上を斜めに走る褐色の帯を持つ。岩礁の周辺を泳ぎ、小魚や甲殻類などを捕らえる。',
   locations:'潮見浜・港（深場）／岩礁の小島（中層〜深場）',time:'いつでも',
   rods:['shoreReed','tideMaster'],baits:['liveMinnow','shrimp','smallShrimp'],tip:'活き小魚＋ハリ大で岩礁の深場へ。根へ向かう重い突進と、向きを変えて糸が緩む間を見分けよう。',
   intro:'目の上に褐色の帯があるカンパチだ。根へ向かう重い突進を受け流そう。',lengths:[14,25,43,65,90,120,170],
   baitWeights:{liveMinnow:3.7,shrimp:1.8,smallShrimp:1.2,worm:.04,crab:.15,shell:.02,river:.01,paste:.01}}
 );
 Object.assign(art,{
  hiramasa:{asset:'assets/fish-hiramasa-v250.png',boxes:[[27,198,455,212],[506,190,373,247],[920,164,254,277],[1232,157,271,287],[39,599,260,258],[339,617,385,238],[713,633,404,203],[1127,633,395,208]],heads:[[.985,.51],[.985,.60],[.985,.58],[.5,.75],[.015,.64],[.015,.56],[.015,.52],[.985,.42]],continuousBody:true},
  kanpachi:{asset:'assets/fish-kanpachi-v250.png',boxes:[[17,181,455,261],[497,178,364,275],[903,179,280,286],[1232,166,290,305],[38,600,296,278],[344,604,375,260],[709,610,417,240],[1151,618,371,236]],heads:[[.985,.57],[.985,.66],[.985,.62],[.5,.71],[.015,.60],[.015,.61],[.015,.56],[.985,.49]],continuousBody:true}
 });
 definitions.push(
  {id:'shimaaji',name:'シマアジ',base:'buri',number:58,price:1650,resistance:225,band:'large',hook:'large',scientific:'Pseudocaranx dentex',habitats:['sea'],rarity:4,label:'潮風島を巡る銀色の群れ',
   ecology:'体高のある銀色の体と胸びれの上の黒い斑点が目印。若い個体では黄色の帯が見られる。岩礁の周りで小魚や甲殻類を食べる。',locations:'潮風島・東の潮目（中層〜深場）',time:'いつでも（朝夕が狙い目）',rods:['shoreReed','tideMaster'],baits:['shrimp','liveMinnow'],tip:'漁船で潮風島へ渡り、東の潮目でオキアミ＋ハリ大を中層へ。速い走りをいなし、糸の緩みで寄せよう。',intro:'胸びれの上に黒い斑点。潮目を走るシマアジだ！',lengths:[18,27,38,50,65,82,120],baitWeights:{shrimp:3.7,liveMinnow:2.8,smallShrimp:1.8,worm:.05,crab:.08,shell:.02,river:.01,paste:.01}},
  {id:'ishigakidai',name:'イシガキダイ',base:'ishidai',number:59,price:1500,resistance:230,band:'large',hook:'large',scientific:'Oplegnathus punctatus',habitats:['sea'],rarity:4,label:'離島の磯に潜む石垣模様',
   ecology:'体高のある厚い体に石垣のような細かな黒い斑点を持つ。強い歯で貝や甲殻類をかみ砕く岩礁の魚。イシダイの縞模様とは区別できる。',locations:'潮風島・西の磯（岸際〜深場）',time:'いつでも',rods:['shoreReed','tideMaster'],baits:['shell','crab','smallShrimp'],tip:'潮風島の西の磯で貝＋ハリ大。岩へ戻る重い引きが落ち着いたら、糸の緩んだ間に取り返そう。',intro:'石垣のような斑点のイシガキダイ。磯へ戻る重い引きだ。',lengths:[12,20,30,40,52,65,80],baitWeights:{shell:4.2,crab:3.6,smallShrimp:1.5,shrimp:1.1,liveMinnow:.05,worm:.03,river:.01,paste:.01}},
  {id:'akahata',name:'アカハタ',base:'kasago',number:60,price:950,resistance:150,band:'medium',hook:'medium',scientific:'Epinephelus fasciatus',habitats:['sea'],rarity:3,label:'岩陰にひそむ朱色のハタ',
   ecology:'大きな頭と口を持つ赤いハタ。体には濃い赤色の帯、背びれのとげの先には黒い色が見られる。岩礁で小魚や甲殻類を狙う。',locations:'潮風島・入り江／西の磯（岸際〜中層）',time:'いつでも',rods:['clearStream','shoreReed'],baits:['smallShrimp','liveMinnow','shrimp'],tip:'潮風島の入り江で小エビ＋ハリ中。岩陰への短い突進を受け流し、動きが緩んだら寄せよう。',intro:'赤い帯と黒い背びれの先。岩陰からアカハタが出てきた！',lengths:[8,12,18,24,30,36,45],baitWeights:{smallShrimp:3.4,liveMinnow:3.1,shrimp:2.4,crab:1.7,worm:.25,shell:.08,river:.02,paste:.01}}
 );
 Object.assign(art,{
  shimaaji:{asset:'assets/fish-shimaaji-v251.png',boxes:[[16,142,517,263],[543,124,407,300],[1044,106,197,328],[1274,105,245,329],[17,603,209,324],[255,603,331,323],[592,631,468,269],[1072,634,452,266]],heads:[[.99,.59],[.99,.67],[.90,.74],[.5,.75],[.03,.63],[.01,.65],[.01,.54],[.995,.61]],continuousBody:true},
  ishigakidai:{asset:'assets/fish-ishigakidai-v251.png',boxes:[[28,123,503,332],[539,118,382,352],[946,111,284,364],[1254,111,242,357],[24,595,259,343],[288,586,340,351],[616,615,442,318],[1077,616,445,316]],heads:[[.99,.62],[.99,.66],[.82,.68],[.5,.72],[.18,.63],[.01,.61],[.01,.54],[.995,.57]],continuousBody:true},
  akahata:{asset:'assets/fish-akahata-v251.png',boxes:[[27,208,470,248],[526,203,363,264],[932,199,261,268],[1229,201,269,261],[16,599,253,247],[306,598,334,251],[651,599,426,248],[1096,598,415,248]],heads:[[.99,.61],[.99,.64],[.78,.68],[.5,.74],[.21,.64],[.01,.62],[.01,.57],[.995,.57]],continuousBody:true}
 });
 const pools={
  'mountain-underground-shallow':{dojo:.22,kajika:.18,kamatsuka:.15,ugui:.10,gigi:.18},
  'mountain-underground-mid':{gigi:.34,kamatsuka:.12,ugui:.10,kajika:.08,dojo:.08},
  'mountain-underground-deep':{gigi:.38,kajika:.10,dojo:.08},
  'mountain-stream-deep':{gigi:.12},
  'river-shallow':{kawamutsu:.24},'river-mid':{kawamutsu:.12},
  'mountain-stream-shallow':{kawamutsu:.18},'mountain-stream-mid':{kawamutsu:.1},
  'mountain-wetCreek-shallow':{kawamutsu:.16},'mountain-wetCreek-mid':{kawamutsu:.1},
  'lake-shallow':{herabuna:.15},'lake-mid':{herabuna:.32},'lake-deep':{herabuna:.18},
  'mountain-highPond-shallow':{herabuna:.18},'mountain-highPond-mid':{herabuna:.26,himemasu:.38},'mountain-highPond-deep':{herabuna:.18,himemasu:.34},
  'mountain-wetPond-shallow':{herabuna:.12},'mountain-wetPond-mid':{herabuna:.25},'mountain-wetPond-deep':{herabuna:.18},
  'sea-shallow':{mahaze:.25,sayori:.24},'sea-mid':{mahaze:.1,masaba:.3},'sea-deep':{masaba:.24},
  'coast-sand-shallow':{mahaze:.22,sayori:.14},'coast-sand-mid':{mahaze:.1,masaba:.2},'coast-sand-deep':{masaba:.18},
  'coast-reef-shallow':{sayori:.12},'coast-reef-mid':{masaba:.22},'coast-reef-deep':{masaba:.25}
 };
 Object.assign(pools['lake-shallow'],{bluegill:.28});Object.assign(pools['lake-mid'],{bluegill:.18});
 Object.assign(pools['mountain-wetPond-shallow'],{bluegill:.26});Object.assign(pools['mountain-wetPond-mid'],{bluegill:.2});
 for(const id of ['river-shallow','mountain-stream-shallow','mountain-wetCreek-shallow'])Object.assign(pools[id],{aburahaya:.22});
 for(const id of ['river-mid','mountain-stream-mid','mountain-wetCreek-mid'])Object.assign(pools[id],{aburahaya:.12});
 for(const id of ['sea-mid','coast-sand-mid'])Object.assign(pools[id],{magochi:.13});
 for(const id of ['sea-deep','coast-sand-deep'])Object.assign(pools[id],{magochi:.25});
 for(const id of ['river-shallow','mountain-wetPond-shallow','mountain-wetCreek-shallow'])Object.assign(pools[id],{oyanirami:.14});
 for(const id of ['river-mid','mountain-wetPond-mid','mountain-wetCreek-mid'])Object.assign(pools[id],{oyanirami:.08});
 for(const id of ['sea-mid','coast-sand-mid','coast-reef-mid'])Object.assign(pools[id],{akakamasu:.24});
 for(const id of ['sea-deep','coast-sand-deep','coast-reef-deep'])Object.assign(pools[id],{akakamasu:.16});
 Object.assign(pools['sea-deep'],{ishidai:.16});Object.assign(pools['coast-reef-mid'],{ishidai:.18});Object.assign(pools['coast-reef-deep'],{ishidai:.28});
 for(const id of ['river-shallow','mountain-stream-shallow','mountain-wetCreek-shallow'])Object.assign(pools[id],{kawayoshinobori:.25});
 for(const id of ['river-mid','mountain-stream-mid','mountain-wetCreek-mid'])Object.assign(pools[id],{kawayoshinobori:.12});
 Object.assign(pools['sea-deep'],{utsubo:.1});Object.assign(pools['coast-reef-mid'],{utsubo:.14});Object.assign(pools['coast-reef-deep'],{utsubo:.24});
 for(const id of ['sea-deep','coast-sand-deep','coast-reef-deep'])Object.assign(pools[id],{buri:.2});
 Object.assign(pools['sea-deep'],{hiramasa:.08,kanpachi:.08});
 Object.assign(pools['coast-reef-mid'],{hiramasa:.12,kanpachi:.10});
 Object.assign(pools['coast-reef-deep'],{hiramasa:.20,kanpachi:.22});
 // These fish are exclusive to the distant island's normal encounter pools.
 Object.assign(pools,{
  'offshore-cove-shallow':{akahata:.45,ishigakidai:.12},'offshore-cove-mid':{akahata:.38,ishigakidai:.15},'offshore-cove-deep':{akahata:.14,ishigakidai:.2},
  'offshore-west-shallow':{ishigakidai:.42,akahata:.3},'offshore-west-mid':{ishigakidai:.5,akahata:.24},'offshore-west-deep':{ishigakidai:.55,akahata:.12},
  'offshore-east-shallow':{shimaaji:.18,akahata:.12},'offshore-east-mid':{shimaaji:.55},'offshore-east-deep':{shimaaji:.5}
 });
 function install({fish,fishMouthProfiles,fishMotionProfiles,fishLifeProfiles,fightProfiles,fishSizeProfiles,fishEncyclopediaData,fishingSpots,tackle}){
  for(const d of definitions){
   if(fish.some(f=>f.id===d.id))continue;
   const rename=value=>typeof value==='string'?fish.reduce((text,f)=>text.replaceAll(f.name,d.name),value):value;
   fish.push({id:d.id,name:d.name,price:d.price,resistance:d.resistance,w:0,icon:'🐟',shadowRow:d.band==='small'?1:3});
   fishMouthProfiles[d.id]={...fishMouthProfiles[d.base]};fishMotionProfiles[d.id]={...fishMotionProfiles[d.base],turnFrames:14};fishLifeProfiles[d.id]={...fishLifeProfiles[d.base]};
   fightProfiles[d.id]={...fightProfiles[d.base],intro:d.intro,moods:fightProfiles[d.base].moods.map(m=>({...m,hold:rename(m.hold),loose:rename(m.loose)}))};
   fishSizeProfiles[d.id]=fishSizeProfiles.funa.map((tier,i)=>({...tier,minHundredths:Math.round(d.lengths[i]*100),maxHundredths:Math.round(d.lengths[i+1]*100)-1}));
   fishEncyclopediaData[d.id]={number:d.number,scientific:d.scientific,habitats:d.habitats,rarity:d.rarity,rarityLabel:d.label,ecology:d.ecology,locations:d.locations,time:d.time,rods:d.rods,baits:d.baits,tip:d.tip};
   tackle.species[d.id]={band:d.band,recommendedHook:d.hook,baits:d.baitWeights};
  }
  // Long-bodied morays glide and undulate instead of inheriting the eel's
  // quick zig-zags and rolling turns. The renderer keeps their lips fixed.
  Object.assign(fishMotionProfiles.utsubo,{beat:.42,speedBeat:.065,burst:1.18,thrust:.075,
   recoil:0,sway:0,roll:0,turnTicks:4,turnFrames:18,turnArc:1.6,turnRoll:1.2});
  Object.assign(fishLifeProfiles.utsubo,{wave:.08,bend:0,pulse:0});
  fightProfiles.utsubo={intro:definitions.find(d=>d.id==='utsubo').intro,moods:[
   {id:'crevice-glide',name:'岩陰への泳ぎ',icon:'≋',weight:.34,min:850,max:1300,motion:'steady',speedX:2.4,speedY:.6,tension:6.3,release:5.6,reel:.72,scale:1,frameEvery:2,hold:'ウツボが岩陰へ泳ぐ。糸が緩むまで無理に引かない。',loose:'長い体の波を見て、走りを受け流そう。'},
   {id:'crevice-run',name:'岩穴への突進',icon:'➜',weight:.36,min:750,max:1150,motion:'deep',speedX:4.1,speedY:1.1,tension:8.5,release:6.1,reel:.48,scale:1.03,frameEvery:1,danger:true,hold:'岩穴へ強く戻ろうとする！Aを離して受け流そう。',loose:'岩穴へ戻る走りが落ち着くのを待とう。'},
   {id:'rest',name:'体をほどく',icon:'◎',weight:.30,min:650,max:1000,motion:'rest',speedX:.3,speedY:.2,tension:1.9,release:5.2,reel:1.7,scale:1,frameEvery:3,calm:true,hold:'体をほどいて糸が緩んだ！今が寄せる番。',loose:'糸が緩んでいる。Aでそっと寄せよう。'}
  ]};
  for(const [id,runName,motion,speed,shake]of [['hiramasa','沖への疾走','rush',6.1,.8],['kanpachi','根への突進','deep',5.1,1.6]]){
   fightProfiles[id]={intro:definitions.find(d=>d.id===id).intro,moods:[
    {id:'ocean-run',name:runName,icon:'➜',weight:.40,min:850,max:1400,motion,speedX:speed,speedY:shake,tension:9.2,release:6.3,reel:.42,scale:1.03,frameEvery:1,danger:true,hold:'強い走りだ！Aを離して糸を引き出させよう。',loose:'魚が距離を取り返す。落ち着いて次の引きどころを待とう。'},
    {id:'ocean-drive',name:id==='hiramasa'?'長い走り':'重い粘り',icon:'≋',weight:.28,min:950,max:1500,motion:id==='hiramasa'?'steady':'heavy',speedX:speed*.68,speedY:shake*.5,tension:7.1,release:5.8,reel:.65,scale:1,frameEvery:2,hold:'まだ糸が張っている。魚が向きを変えるまで待とう。',loose:'走る勢いが落ちてきた。糸の緩みを見よう。'},
    {id:'rest',name:'向き直る',icon:'◎',weight:.32,min:700,max:1100,motion:'rest',speedX:.3,speedY:.2,tension:1.7,release:5.4,reel:1.75,scale:1,frameEvery:3,calm:true,hold:'糸が緩んだ！Aで距離を取り返そう。',loose:'引きどころだ。Aを押して寄せよう。'}
   ]};
  }
  for(const [id,runName,speed,force]of [['shimaaji','潮目への疾走',5.5,8.5],['ishigakidai','磯への重い突進',3.8,9],['akahata','岩陰への短い突進',3.4,7.2]]){
   fightProfiles[id]={intro:definitions.find(d=>d.id===id).intro,moods:[
    {id:'island-run',name:runName,icon:'➜',weight:.4,min:800,max:1300,motion:id==='shimaaji'?'rush':'deep',speedX:speed,speedY:.9,tension:force,release:5.8,reel:.5,scale:1.02,frameEvery:1,danger:true,hold:'魚の走りだ！Aを離して受け流そう。',loose:'走りが緩むまで待とう。'},
    {id:'island-drive',name:id==='shimaaji'?'群れへ向かう泳ぎ':'岩際の粘り',icon:'≋',weight:.28,min:800,max:1250,motion:'steady',speedX:speed*.65,speedY:.4,tension:6.8,release:5.3,reel:.72,scale:1,frameEvery:2,hold:'まだ糸が張っている。無理に引かずに待とう。',loose:'魚の向き直りを見ていよう。'},
    {id:'rest',name:'向き直る',icon:'◎',weight:.32,min:750,max:1200,motion:'rest',speedX:.3,speedY:.2,tension:1.8,release:5.3,reel:1.7,scale:1,frameEvery:3,calm:true,hold:'糸が緩んだ！Aで寄せよう。',loose:'今が引きどころ。Aで距離を取り返そう。'}
   ]};
  }
  for(const spot of fishingSpots)if(pools[spot.id])Object.assign(spot.weights,pools[spot.id]);
 }
 return {definitions,art,pools,install};
});
