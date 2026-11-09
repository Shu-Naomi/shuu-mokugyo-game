'use strict';
// Review report assembled from the game's actual static Canvas compositor.
// This is not a browser screenshot or a modification of either source image.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const {createCanvas,loadImage,GlobalFonts}=require('@napi-rs/canvas');
const Data=require('../scene-layers.js'),Art=require('../layered-scenery.js'),Reference=require('../village-reference.js');
const root=path.join(__dirname,'..'),out=path.resolve(process.argv[2]||path.join(__dirname,'../../../terrain-plan/review'));
GlobalFonts.registerFromPath('/usr/share/fonts/opentype/noto/NotoSansCJK-Regular.ttc','Noto Sans CJK JP');
GlobalFonts.registerFromPath('/usr/share/fonts/opentype/noto/NotoSansCJK-Bold.ttc','Noto Sans CJK JP');
const env={season:'spring',period:'day',weather:'sunny'};
const text=(g,s,x,y,size=24,color='#d7dfd7',bold=false)=>{g.fillStyle=color;g.font=`${bold?'bold ':''}${size}px "Noto Sans CJK JP"`;g.fillText(s,x,y);};
const canvas=(w,h)=>{const c=createCanvas(w,h);c.getContext('2d').imageSmoothingEnabled=false;return c;};
async function render(referenceVillage,environment=env){
 const d=Data.get('world',{...environment,referenceVillage}),im=await loadImage(path.join(root,d.source));
 const s=Art.prepare(im,im,d,environment,canvas),c=canvas(im.width,im.height);Art.compose(c,s,{motionTime:0});return c;
}
function mark(g,label,px,py,color='#ffd98d'){
 g.fillStyle='#15291ee6';g.strokeStyle=color;g.lineWidth=3;g.beginPath();g.arc(px,py,18,0,Math.PI*2);g.fill();g.stroke();
 g.textAlign='center';text(g,label,px,py+8,24,color,true);g.textAlign='left';
}
(async()=>{
 fs.mkdirSync(out,{recursive:true});const current=await render(false),reference=await render(true),board=canvas(2160,1450),g=board.getContext('2d');
 g.fillStyle='#14211c';g.fillRect(0,0,board.width,board.height);
 text(g,'参考原画をそのまま使う、村の試作',32,55,40,'#eff2df',true);
 text(g,'非公開・専用モードのみ。原画は無加工。リアオと依頼看板は仮配置です。',32,100,27,'#d5c59c');
 text(g,'現行の村（比較用）',32,148,30,'#f1dfb5',true);text(g,'参考原画を基準にした試作',1098,148,30,'#bde0c0',true);
 const width=1030,height=941*width/1672;g.drawImage(current,32,170,width,height);g.drawImage(reference,1098,170,width,height);
 text(g,'同じ描画条件：春・昼・晴れ。ゲーム本体の描画処理による静止比較です。',32,790,26);
 const crops=[
  {title:'① 主人公宅へ続く左端の道',rect:[0,390,470,260],note:'左上の建物は宿。主人公宅は左の道の先です。'},
  {title:'② 橋と川・両岸の通路',rect:[520,380,470,260],note:'絵の橋と水際に、実際の通行判定を合わせます。'},
  {title:'③ リアオと依頼看板（仮）',rect:[1180,60,470,260],note:'魚看板の建物と、その右の立て看板が候補です。'}
 ];
 for(let i=0;i<crops.length;i++){
  const x=32+i*711,crop=crops[i];text(g,crop.title,x,850,27,'#e4eadc',true);
  g.drawImage(reference,...crop.rect,x,872,674,373);
  text(g,crop.note,x,1280,21,'#b7c7b7');
 }
 text(g,'通常の2スロットは変更せず、コピーした試作セーブで入口・移動・保存再開を確認します。',32,1330,26);
 text(g,'建物の描き直し・公開・マージはまだ行いません。配置と道の見え方を先に確認する段階です。',32,1375,26);
 text(g,'実ブラウザ／スマホ実機の確認は未実施。この画像を実プレイ画面の検証結果とは扱いません。',32,1420,24,'#d8be91');
 fs.writeFileSync(path.join(out,'reference-village-review.png'),board.toBuffer('image/png'));
 fs.writeFileSync(path.join(out,'reference-village-neutral.png'),reference.toBuffer('image/png'));
 const inspect=canvas(1672,941),a=inspect.getContext('2d');a.drawImage(reference,0,0);
 const point=(x,y)=>[x/240*1672,y/135*941];
 // Debug layer belongs only to this report; no markers are painted into art.
 for(let y=2;y<133;y+=1.3)for(let x=2;x<238;x+=1.3){if(!Reference.walkable(x,y))continue;const [px,py]=point(x,y);a.fillStyle='#baff6a88';a.fillRect(px-1.5,py-1.5,3,3);}
 for(const [id,v]of Object.entries(Reference.landmarks)){const [x,y]=point(v.x,v.y);mark(a,id==='riao-tcg-shop'?'R':id==='quest-board'?'Q':'•',x,y);}
 fs.writeFileSync(path.join(out,'reference-village-debug-walkability.png'),inspect.toBuffer('image/png'));
 const report={environment:env,sourceSha256:crypto.createHash('sha256').update(fs.readFileSync(path.join(root,Reference.source.asset))).digest('hex'),sourceUnmodified:true,reportOnlyOverlays:true,browserScreenshot:false,physicalDeviceTest:false,productionChanged:false,provisional:['Riao upper-right fish-sign building','Quest board on adjacent standing sign','Ferry boarding location on reachable north quay'],output:path.join(out,'reference-village-review.png')};
 fs.writeFileSync(path.join(out,'review-metadata.json'),JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));
})().catch(e=>{console.error(e);process.exitCode=1;});
