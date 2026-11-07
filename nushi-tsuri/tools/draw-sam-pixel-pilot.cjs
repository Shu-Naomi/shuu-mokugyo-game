// Original pixel artwork. Every mark is authored on a 120 x 96 grid.
// No source image, quantizer, sharpening filter, antialiasing or random noise.
// Run from this repository: node nushi-tsuri/tools/draw-sam-pixel-pilot.cjs
const fs=require('node:fs'),path=require('node:path');
const {createCanvas}=require('@napi-rs/canvas');
const colors={ink:'#302e35',deep:'#48424b',slate:'#626573',roof:'#81858d',glint:'#b2b5ad',
 woodDark:'#71432c',wood:'#a65f2f',oak:'#cf883e',gold:'#f2b857',cream:'#ffe1a0',
 sand:'#ffc17d',sandLight:'#ffd398',sandShade:'#eba667',stoneDark:'#9e8170',stone:'#c2a48b',stoneLight:'#debf9e',
 greenDark:'#345b30',green:'#567b32',leaf:'#8eaa3c',leafLight:'#c5cd63',
 blueDark:'#20505f',blue:'#28849b',aqua:'#75c6c4',white:'#e4e3c1',
 red:'#b65444',redLight:'#df8060',orange:'#dd8d47',brown:'#644e3d'};
const c=createCanvas(120,96),g=c.getContext('2d');g.imageSmoothingEnabled=false;
function rect(x,y,w,h,k){g.fillStyle=colors[k];g.fillRect(x,y,w,h);}
function line(x0,y0,x1,y1,k){let dx=Math.abs(x1-x0),sx=x0<x1?1:-1,dy=-Math.abs(y1-y0),sy=y0<y1?1:-1,err=dx+dy;for(;;){rect(x0,y0,1,1,k);if(x0===x1&&y0===y1)break;const e=2*err;if(e>=dy){err+=dy;x0+=sx;}if(e<=dx){err+=dx;y0+=sy;}}}
function poly(points,k){const min=Math.min(...points.map(p=>p[1])),max=Math.max(...points.map(p=>p[1]));for(let y=min;y<=max;y++){const cross=[];for(let a=0,b=points.length-1;a<points.length;b=a++){const p=points[a],q=points[b];if((p[1]>y+.5)!==(q[1]>y+.5))cross.push(p[0]+(y+.5-p[1])*(q[0]-p[0])/(q[1]-p[1]));}cross.sort((a,b)=>a-b);for(let a=0;a<cross.length;a+=2)rect(Math.ceil(cross[a]),y,Math.max(0,Math.ceil(cross[a+1])-Math.ceil(cross[a])),1,k);}}
function outline(points,k='ink'){for(let i=0;i<points.length;i++)line(...points[i],...points[(i+1)%points.length],k);}
function shape(points,k){poly(points,k);outline(points);}
function shrub(x,y,w=12){poly([[x,y+5],[x+2,y+2],[x+5,y+2],[x+7,y],[x+w-2,y+1],[x+w,y+4],[x+w-1,y+8],[x+2,y+9]],'greenDark');rect(x+3,y+3,w-5,4,'green');rect(x+5,y+1,4,2,'leaf');rect(x+2,y+4,3,2,'leaf');rect(x+w-4,y+3,2,2,'leafLight');}
function pot(x,y,k='blue',w=7,h=8){rect(x,y,w,2,'ink');rect(x+1,y+2,w-2,h-2,k);rect(x+2,y+2,1,h-3,'aqua');rect(x+1,y+h-1,w-2,1,'ink');rect(x,y+1,w,1,'glint');}
function barrel(x,y,w=9,h=12){rect(x+1,y,w-2,h,'ink');rect(x,y+2,w,h-4,'woodDark');rect(x+2,y+1,w-4,h-2,'oak');rect(x+3,y+2,1,h-3,'gold');rect(x+1,y+3,w-2,1,'deep');rect(x+1,y+h-3,w-2,1,'deep');rect(x+2,y,w-4,1,'cream');}
function fish(x,y,k='aqua'){rect(x,y,5,2,k);rect(x+1,y-1,3,1,k);rect(x+5,y-1,1,4,k);rect(x,y,1,1,'ink');}
// Path and short grass verge. Sparing clustered marks, never a noise filter.
rect(0,0,120,96,'sand');
poly([[0,0],[120,0],[120,13],[111,16],[111,21],[103,24],[27,21],[20,27],[10,32],[0,31]],'leaf');
poly([[0,0],[120,0],[120,8],[110,10],[110,16],[102,17],[27,15],[18,22],[10,25],[0,24]],'green');
for(const [x,y] of [[4,9],[16,2],[111,3],[107,17],[3,27],[115,70],[5,55]]){rect(x,y,3,1,'leafLight');rect(x+1,y-2,1,2,'leaf');}
for(const [x,y] of [[7,39],[20,32],[2,48],[7,69],[13,90],[109,27],[114,43],[112,90]]){rect(x,y,3,1,'sandLight');rect(x+2,y+2,2,1,'sandShade');}
// Paving apron stops above the existing quay. Grout follows a small tile grid.
poly([[11,77],[95,77],[102,79],[117,78],[120,83],[120,96],[0,96],[0,84]],'stoneDark');
for(let row=0;row<4;row++)for(let col=-1;col<11;col++){const x=col*13+(row%2?6:0),y=80+row*5;rect(x+1,y+1,11,3,'stone');rect(x+2,y,9,1,'stoneLight');}
// Soft-looking cast shadows are replaced by two deliberate solid pixel steps.
poly([[10,69],[110,69],[116,78],[110,83],[26,84],[10,78]],'stoneDark');
shrub(1,18,16);shrub(105,58,13);shrub(104,9,14);
// Lamppost remains near the old left-road landmark.
rect(4,9,2,14,'woodDark');rect(3,22,4,1,'brown');rect(1,7,9,2,'ink');rect(2,6,7,1,'oak');rect(4,3,3,3,'woodDark');rect(5,3,1,2,'gold');rect(3,9,4,2,'gold');
// Side tackle shed: same footprint and passage as the original shop.
shape([[11,44],[31,35],[36,60],[9,64]],'slate');
for(let i=0;i<5;i++)line(12,46+i*3,32,37+i*3,'roof');
line(10,63,36,58,'ink');rect(12,62,21,16,'woodDark');rect(14,63,18,11,'wood');
rect(15,64,6,10,'blueDark');rect(16,65,4,3,'slate');rect(25,62,2,17,'gold');
for(let y=65;y<77;y+=4){rect(26,y,6,1,'oak');}
// Main wooden walls; entrance center stays at source x=1376, feet y=636.
rect(31,43,75,34,'ink');rect(33,45,71,30,'wood');
for(let y=48;y<76;y+=5){rect(33,y,71,1,'woodDark');rect(34,y+1,69,1,'oak');}
rect(98,43,9,32,'woodDark');for(let y=47;y<76;y+=5)rect(99,y,7,1,'wood');
rect(31,45,3,33,'gold');rect(103,45,3,33,'oak');rect(34,74,69,3,'brown');
// Slate roof, built from intentional alternating 3px tile columns.
shape([[29,8],[96,8],[105,41],[109,44],[28,44]],'slate');
for(let x=31;x<102;x+=4){const top=x>96?8+(x-96)*3:10;line(x,top,x,41,'roof');line(x+2,top,x+2,42,'deep');for(let y=14;y<41;y+=6){rect(x,y,2,1,'glint');rect(x,y+1,2,1,'deep');}}
rect(29,7,68,2,'ink');rect(31,7,64,1,'roof');rect(28,42,80,3,'ink');rect(30,42,75,1,'glint');rect(31,45,74,2,'gold');rect(33,47,70,1,'woodDark');for(let x=35;x<102;x+=6){rect(x,46,2,1,'cream');rect(x,47,2,1,'wood');}
// End caps and chimney have stepped silhouettes instead of antialiased curves.
rect(28,6,3,5,'ink');rect(29,6,1,3,'glint');rect(96,6,3,5,'ink');rect(97,6,1,3,'glint');
rect(41,2,7,12,'ink');rect(42,3,5,10,'stone');rect(43,3,3,2,'stoneLight');rect(43,6,3,4,'deep');rect(42,12,5,2,'gold');
// Small gable behind sign.
shape([[48,25],[65,12],[83,25]],'woodDark');poly([[52,24],[65,15],[79,24]],'oak');line(65,15,65,24,'gold');rect(59,21,4,3,'blueDark');rect(67,21,4,3,'blueDark');
line(48,25,65,12,'glint');line(65,12,83,25,'glint');
// Hand-set 3x5 bitmap lettering, readable without system-font smoothing.
rect(42,27,44,15,'ink');rect(43,28,42,13,'woodDark');rect(44,29,40,11,'gold');rect(46,30,36,9,'oak');
const glyphs={S:['111','100','111','001','111'],A:['010','101','111','101','101'],M:['10001','11011','10101','10001','10001']};
let tx=56;for(const ch of 'SAM'){const a=glyphs[ch];for(let y=0;y<5;y++)for(let x=0;x<a[y].length;x++)if(a[y][x]==='1'){rect(tx+x,y+32,1,1,'ink');rect(tx+x,y+31,1,1,'cream');}tx+=a[0].length+2;}
fish(47,34,'cream');rect(80,33,2,2,'cream');
// Left display window has chunky lure shapes, shelves and coherent highlights.
rect(35,49,27,22,'ink');rect(36,50,25,20,'blueDark');
rect(37,50,8,5,'blue');rect(47,50,5,5,'blue');rect(55,50,5,5,'blue');
for(const [x,y,k]of [[38,53,'aqua'],[44,53,'gold'],[50,53,'redLight'],[56,53,'aqua'],[38,61,'aqua'],[45,61,'white'],[52,61,'gold'],[39,68,'leafLight'],[49,68,'aqua'],[56,68,'orange']]){rect(x,y-2,3,2,k);rect(x+1,y-3,1,1,k);}
rect(35,56,27,2,'woodDark');rect(35,57,27,1,'gold');rect(35,63,27,2,'woodDark');rect(35,64,27,1,'oak');rect(35,70,27,2,'gold');rect(36,71,25,1,'cream');rect(45,49,1,21,'woodDark');
// Door and right window. Light gets two hard-edged values, not a gradient.
rect(65,48,15,27,'ink');rect(66,49,13,25,'gold');rect(68,51,9,12,'blueDark');rect(69,52,7,10,'blue');rect(69,52,3,5,'aqua');rect(72,51,1,12,'oak');rect(68,57,9,1,'oak');rect(68,60,9,1,'oak');rect(67,64,11,1,'woodDark');rect(68,66,9,7,'oak');rect(68,66,1,7,'cream');rect(77,64,1,2,'ink');
rect(83,49,16,11,'ink');rect(84,50,14,9,'blueDark');for(let x=85;x<98;x+=5){rect(x,51,3,3,'blue');rect(x,55,3,2,'aqua');}rect(83,59,16,1,'gold');
// Two-tone lantern and a potted plant frame the door.
rect(63,52,2,9,'woodDark');rect(63,53,2,6,'cream');rect(63,55,2,1,'gold');
pot(62,70,'green',3,6);
// Pegboard with fishing rods / landing net, all snapped to the same art grid.
rect(83,62,17,10,'oak');line(85,63,85,71,'ink');line(89,63,89,71,'ink');line(93,63,93,71,'blueDark');rect(84,63,2,1,'gold');rect(88,62,2,1,'cream');rect(92,63,2,1,'gold');
rect(64,75,18,2,'woodDark');rect(63,77,20,2,'gold');rect(62,79,22,2,'woodDark');rect(62,81,22,2,'stoneLight');
// Tackle baskets stay over existing small prop collision rectangles.
barrel(36,77,8,9);pot(45,78,'blue',7,9);barrel(53,77,7,10);
barrel(17,73,8,9);pot(25,76,'red',7,7);rect(15,72,10,2,'cream');
rect(32,72,2,11,'woodDark');rect(58,72,2,6,'woodDark');
// Right-side floats, crates and landing net.
rect(106,65,1,12,'brown');outline([[103,58],[106,56],[109,59],[109,64],[106,66],[103,63]]);line(104,59,108,63,'stoneLight');line(108,59,104,63,'stoneLight');
rect(100,77,15,5,'woodDark');rect(101,78,13,3,'oak');rect(102,77,11,1,'gold');
for(const [x,y,k]of [[101,73,'red'],[107,72,'orange'],[112,73,'aqua']]){rect(x,y,3,5,k);rect(x+1,y-2,1,2,'brown');rect(x,y,1,2,'cream');}
// Explicit palette + binary alpha are part of the authored-asset contract.
const output=path.resolve(__dirname,'../assets/sam-sfc-pixel-pilot.png');
fs.writeFileSync(output,c.toBuffer('image/png'));
if(require.main===module)console.log(output);
module.exports={colors,width:120,height:96};
