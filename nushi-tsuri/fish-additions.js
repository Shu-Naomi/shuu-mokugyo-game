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
 ];
 const art = {"kawamutsu":{"asset":"assets/fish-kawamutsu-v238.png","boxes":[[17,185,451,211],[492,169,349,240],[882,164,273,266],[1233,162,274,268],[29,615,296,262],[337,641,385,228],[729,670,409,200],[1155,673,369,196]],"heads":[[0.99,0.65],[0.98,0.7],[0.82,0.72],[0.5,0.72],[0.18,0.72],[0.02,0.7],[0.01,0.65],[0.99,0.6]],"continuousBody":true},"herabuna":{"asset":"assets/fish-herabuna-v238.png","boxes":[[18,123,454,317],[500,116,363,331],[919,108,268,346],[1237,108,271,350],[30,583,350,338],[391,595,350,318],[745,613,388,285],[1145,612,381,291]],"heads":[[0.99,0.65],[0.98,0.7],[0.82,0.72],[0.5,0.72],[0.18,0.72],[0.02,0.7],[0.01,0.65],[0.99,0.6]],"continuousBody":true},"himemasu":{"asset":"assets/fish-himemasu-v238.png","boxes":[[27,237,463,186],[534,216,343,225],[917,191,268,256],[1273,182,238,273],[25,654,307,226],[344,654,349,201],[695,685,376,164],[1100,674,425,181]],"heads":[[0.99,0.65],[0.98,0.7],[0.82,0.72],[0.5,0.72],[0.18,0.72],[0.02,0.7],[0.01,0.65],[0.99,0.6]],"continuousBody":true},"mahaze":{"asset":"assets/fish-mahaze-v238.png","boxes":[[12,189,435,180],[458,170,331,245],[865,154,321,273],[1212,142,311,275],[21,588,347,272],[395,615,336,212],[745,633,394,184],[1153,647,370,170]],"heads":[[0.99,0.65],[0.98,0.7],[0.82,0.72],[0.5,0.72],[0.18,0.72],[0.02,0.7],[0.01,0.65],[0.99,0.6]],"continuousBody":true},"sayori":{"asset":"assets/fish-sayori-v238.png","boxes":[[26,233,544,112],[556,176,399,225],[998,159,278,248],[1297,131,200,284],[24,609,330,237],[313,613,411,205],[669,671,425,119],[1109,670,420,114]],"heads":[[0.99,0.6],[0.99,0.8],[0.99,0.93],[0.5,0.98],[0.01,0.95],[0.01,0.8],[0.01,0.55],[0.99,0.6]],"continuousBody":true},"masaba":{"asset":"assets/fish-masaba-v238.png","boxes":[[16,215,496,208],[508,181,382,268],[893,189,300,273],[1223,124,286,342],[22,636,340,254],[352,671,398,212],[735,688,394,175],[1132,680,388,195]],"heads":[[0.99,0.65],[0.98,0.7],[0.82,0.72],[0.5,0.72],[0.18,0.72],[0.02,0.7],[0.01,0.65],[0.99,0.6]],"continuousBody":true}};
 const pools={
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
  for(const spot of fishingSpots)if(pools[spot.id])Object.assign(spot.weights,pools[spot.id]);
 }
 return {definitions,art,pools,install};
});
