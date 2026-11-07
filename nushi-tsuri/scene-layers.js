/* Art-space masks, never movement/collision tiles. The original painted pixels
 * are the atlas. Later entries own overlaps; every pixel has exactly one owner.
 * Coordinates refer to the unscaled master, independently of game coordinates.
 */
(function(root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.ShuSceneLayers = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function() {
  'use strict';
  const rect = (x,y,w,h) => [[x,y],[x+w,y],[x+w,y+h],[x,y+h]];
  const part = (id,kind,polygon,extra={}) => ({id,kind,polygons:[polygon],...extra});
  const box = (id,kind,x,y,w,h,extra) => part(id,kind,rect(x,y,w,h),extra);
  const vegetation = {filter:'foliage'};
  const water = {filter:'water',effect:'ripple'};
  const surfaceWater = style => ({filter:'water',effect:'surface-wave',surfaceMotion:style});
  const world = {
    id:'world', source:'assets/village-world-v252-55-riao-clear.png',
    underlay:'assets/village-underlay-v252-55-riao.png', units:[1536,864],coherentGrade:true,
    // Review-only pilot: one original 120×96 pixel drawing at exactly 2×.
    // Native-master points are converted per axis; gameplay geometry is absent.
    // Keep the original village, water, facilities and all outside pixels intact.
    edits:[{
      id:'sam-sfc-pilot',source:'assets/sam-sfc-pixel-pilot.png',
      to:[1240/1672*1536,472/941*864,240/1672*1536,192/941*864],
      clip:[[1250,552],[1270,552],[1270,542],[1294,542],[1294,482],
        [1322,482],[1322,472],[1336,472],[1336,482],[1440,482],
        [1440,498],[1444,498],[1444,512],[1450,512],[1450,528],
        [1460,528],[1460,552],[1476,552],[1476,608],[1480,608],
        [1480,636],[1474,636],[1474,648],[1468,648],[1468,656],
        [1254,656],[1254,648],[1248,648],[1248,636],[1240,636],
        [1240,570],[1250,570]]
        .map(([x,y])=>[x/1672*1536,y/941*864]),
    }],
    waterColorMasks:[[[0,680],[145,680],[294,700],[461,735],[584,775],[663,790],[740,790],[740,864],[0,864]]],
    parts:[
      box('meadow','grass',0,0,1536,864,vegetation),
      box('paths','path',0,0,1536,864,{filter:'earth'}),
      part('lake','water',[[718.392,100.081],[668.785,101.917],[666.029,111.099],[641.225,119.362],[623.77,148.744],[632.957,156.089],[625.608,160.68],[638.469,168.944],[636.632,179.044],[670.622,214.852],[666.029,228.625],[679.809,240.561],[663.273,248.825],[666.947,258.925],[684.402,265.352],[655.005,266.27],[660.517,294.733],[701.856,304.833],[711.962,320.442],[734.01,320.442],[747.789,308.506],[831.388,303.915],[860.785,295.651],[870.89,278.206],[924.172,269.024],[926.01,256.17],[939.789,255.252],[970.105,213.934],[959.081,212.098],[955.407,187.307],[941.627,179.044],[949.895,161.598],[927.847,158.844],[926.928,145.989],[874.565,135.889],[840.574,115.69],[720.23,100.081]],water),
      part('stream','water',[[709.206,316.769],[745.952,316.769],[746.871,349.824],[745.952,377.369],[739.522,403.996],[739.522,417.768],[732.172,433.377],[723.904,445.313],[721.148,460.922],[714.718,485.713],[711.962,513.258],[714.718,549.067],[719.311,584.876],[723.904,613.339],[731.254,639.048],[726.66,666.593],[718.392,694.138],[709.206,723.52],[711.043,751.065],[725.742,780.446],[746.871,810.746],[779.024,839.209],[799.234,864.0],[597.129,864.0],[597.129,835.537],[610.909,806.155],[625.608,776.774],[624.689,750.147],[637.55,722.601],[653.167,695.056],[664.191,664.757],[671.541,636.293],[665.11,607.83],[661.435,583.957],[657.761,560.085],[655.923,534.376],[657.761,509.586],[665.11,485.713],[675.215,457.25],[690.833,430.623],[697.263,403.078],[709.206,378.287],[706.45,349.824]],water),
      part('sea','water',[[0,711],[142,713],[294,742],[461,777],[584,816],[663,829],[740,824],[802,858],[933,857],[961,818],[1060,807],[1135,737],[1243,662],[1434,663],[1484,709],[1479,791],[1536,849],[1536,864],[0,864]],water),
      part('harbor-water','water',[[944,709],[1052,667],[1157,646],[1270,648],[1383,634],[1407,599],[1536,576],[1536,864],[938,864]],water),
      part('practice-pond','water',[[1372,479],[1387,466],[1423,465],[1457,478],[1474,502],[1460,526],[1424,536],[1386,520]],water),
      box('north-forest','trees',0,0,1536,68,vegetation),
      part('west-forest','trees',[[0,0],[144,0],[126,178],[82,277],[45,372],[0,493]],vegetation),
      part('east-forest','trees',[[1450,0],[1536,0],[1536,315],[1441,274],[1417,185]],vegetation),
      box('west-coast-bushes','foreground',0,483,203,159,vegetation),
      box('east-coast-bushes','foreground',1484,365,52,234,vegetation),
      box('riao-tcg-shop','buildings',342,82,252,183),
      box('shrine-tree','trees',385,274,64,88),
      box('river-tree','trees',516,516,58,63),
      box('east-tree','trees',1061,88,111,135),
      box('west-cherry','trees',42,248,112,101),
      box('east-cherry','trees',1430,321,106,112),
      box('lake-reeds','grass',635,241,52,78,vegetation),
      box('river-reeds','grass',731,388,28,82,vegetation),
      part('farmhouse','buildings',[[176,110],[193,76],[277,68],[288,80],[332,77],[334,102],[351,110],[348,183],[181,183]]),
      part('watermill','buildings',[[1189,117],[1233,81],[1306,83],[1317,98],[1341,114],[1347,168],[1304,184],[1192,182]]),
      box('dan-race-venue','buildings',133,253,224,192),
      box('wayside-shrine','buildings',47,331,58,65),
      part('yaoya','buildings',[[429,393],[449,350],[506,347],[519,362],[565,360],[580,401],[586,469],[559,489],[439,486]]),
      part('diner','buildings',[[835,398],[855,352],[987,350],[1004,395],[1006,479],[851,489]]),
      part('main-shrine','buildings',[[1151,278],[1209,240],[1232,221],[1254,247],[1301,270],[1327,293],[1302,311],[1310,363],[1254,401],[1170,361],[1172,304],[1142,306]]),
      part('sam-shop','buildings',[[1151,509],[1184,490],[1184,443],[1236,443],[1265,438],[1329,443],[1350,506],[1355,589],[1327,604],[1151,601]]),
      part('fish-market','buildings',[[935,580],[963,562],[994,544],[1055,556],[1088,552],[1106,599],[1108,648],[952,656],[925,632]]),
      part('harbor-shop','buildings',[[794,715],[827,687],[873,668],[915,685],[928,716],[927,771],[818,784],[798,768]]),
      box('stone-bridge','rocks',636,479,108,77),
      box('lake-dock','props',678,89,37,33),
      box('farm-fences','fences',138,170,198,76,{filter:'wood'}),
      box('west-torii','fences',163,371,110,77),
      box('shrine-fence','fences',1095,305,329,106,{filter:'wood'}),
      box('beach-stones','rocks',0,733,204,98,{filter:'stone'}),
      box('north-bank-stones','rocks',528,79,424,61,{filter:'stone'}),
      box('diner-props','props',788,420,58,60),
      box('diner-parasol','props',1006,416,54,65),
      box('village-board','props',758,439,39,44),
      box('sam-bait-chest','props',1200,575,23,16,{parent:'sam-shop'}),
      box('sam-front-pail','props',1224,579,14,14,{parent:'sam-shop'}),
      box('inn-noren','props',264,146,25,13,{parent:'farmhouse'}),
      box('inn-doorstep','rocks',263,177,21,17,{parent:'farmhouse'}),
      box('market-noren','props',999,609,28,16,{parent:'fish-market'}),
      box('market-fish-counter','props',966,630,34,14,{parent:'fish-market'}),
      box('market-ice-chest','props',1051,641,20,14,{parent:'fish-market'}),
      box('market-handcart','props',1088,631,20,20,{parent:'fish-market'}),
      box('beach-umbrella','props',418,650,32,35),
      box('west-boat','props',957,784,71,41),
      box('middle-boat','props',1118,704,69,39),
      box('east-boat','props',1195,675,84,44),
      box('harbor-pier','props',1320,659,179,117),
    ],
    // Both dock links are painted into the cohesive master. No tiled patches.
    patches:[],
  };
  const garden = {
    id:'home-exterior',source:'assets/player-home-exterior-v160.webp',
    underlay:'assets/layered-v163/home-exterior-underlay.png', units:[1774,887],
    parts:[
      box('garden-grass','grass',0,0,1774,887,vegetation),
      part('garden-path','path',[[0,608],[175,624],[450,646],[941,619],[1515,651],[1774,611],[1774,772],[1219,772],[1042,769],[1100,887],[833,887],[850,769],[0,763]],{filter:'earth'}),
      part('lakeside','water',[[0,0],[435,0],[409,60],[502,100],[658,130],[654,328],[495,385],[436,455],[88,547],[0,524]],water),
      part('bank-stones','rocks',[[360,0],[518,0],[698,121],[684,345],[527,419],[472,488],[370,467],[489,347],[607,298],[601,159],[362,70]],{filter:'stone'}),
      box('rear-trees','trees',435,0,1339,175,vegetation),
      part('right-tree','trees',[[1325,36],[1489,0],[1774,0],[1774,245],[1693,289],[1649,376],[1574,365],[1553,269],[1413,234],[1315,128]],{motion:'sway'}),
      part('left-tree','trees',[[183,250],[245,220],[334,223],[357,286],[381,337],[428,398],[410,451],[330,482],[303,565],[264,571],[244,480],[176,464],[149,400],[169,307]],{motion:'sway'}),
      part('cottage','buildings',[[651,342],[663,119],[853,103],[985,41],[1008,46],[1127,112],[1291,190],[1296,346],[1252,362],[1254,554],[1024,567],[1005,624],[828,624],[822,567],[689,550],[686,348]]),
      box('rods-and-bucket','props',667,346,164,217,{parent:'cottage'}),
      box('porch-bench','props',1051,504,156,80,{parent:'cottage'}),
      box('crates-and-pails','props',1364,476,157,115),
      box('left-fence','fences',26,460,450,110,{filter:'wood'}),
      box('return-sign','props',136,504,88,107,{offset:[1460,0],flipX:true}),
      box('garden-flowers','grass',472,383,199,233,{...vegetation,motion:'sway'}),
      box('porch-flowers','grass',1202,396,144,194,{...vegetation,motion:'sway'}),
      box('foreground-left-fence','fences',209,795,340,92),
      box('foreground-right-fence','fences',1370,797,226,90),
      box('foreground-left','foreground',0,682,213,205,vegetation),
      box('foreground-center','foreground',528,735,281,152,vegetation),
      box('foreground-right','foreground',1425,697,349,190,vegetation),
    ],
  };
  const room = {
    id:'home-interior',source:'assets/player-home-interior-v160.webp',
    underlay:'assets/layered-v163/home-interior-underlay.png', units:[1774,887],indoor:true,
    parts:[
      box('back-wall','walls',183,0,1414,263),
      box('left-wall','walls',100,83,110,672),
      box('right-wall','walls',1590,81,82,683),
      box('window','light',601,60,217,133),
      box('bedside-storage','props',233,194,89,147),
      box('bed','furniture',307,192,191,288),
      box('bed-rug','props',228,344,79,117),
      box('table','furniture',640,296,237,174),
      box('stool','furniture',718,439,72,84),
      box('kitchen','furniture',961,179,327,159),
      box('rod-rack','props',1330,77,113,270),
      box('tackle-storage','furniture',1451,150,108,193),
      box('basket','props',1515,313,51,75),
      box('tank-cabinet','furniture',1290,414,269,248),
      // Glass remains its own layer. The live saved fish is another DOM layer.
      box('tank-water','water',1305,475,237,96,{filter:'water',parent:'tank-cabinet'}),
      box('tank-plant','grass',1497,398,66,139,{...vegetation,parent:'tank-cabinet'}),
      box('left-plant','grass',182,543,92,124),
      box('right-plant','grass',1558,534,72,184),
      box('storage-chest','furniture',264,607,212,151),
      box('storage-bucket','props',162,665,91,94),
      box('dog-beds','props',1076,674,337,90),
      box('dog-bowls','props',1416,697,161,67),
      box('front-wall','foreground',101,762,571,72),
      box('front-wall-right','foreground',964,762,708,72),
      box('door-mat','props',739,788,167,83),
    ],
  };
  const rooms = {
    'sam-shop':'sam-shop',farmhouse:'fishing-inn',yaoya:'yaoya',diner:'minato-diner',
    'main-shrine':'star-shrine','fish-market':'fish-market',
  };
  function surface(kind,period) {
    if (kind === 'coast-sand' || kind === 'coast-reef') {
      const source = `assets/cast-${kind}-v198.webp`;
      return {id:'surface-'+kind,source,units:[100,100],objectPosition:'center bottom',parts:[
        box('island-base','ground',0,0,100,100),
        box('sky','sky',0,0,100,24),
        box('distant-islands','trees',0,16,100,16,vegetation),
        box('open-water','water',0,23,100,58,surfaceWater('sea')),
        box('shore','path',0,73,100,27,{filter:'earth'}),
        box('left-rocks','rocks',0,30,24,70,{filter:'stone'}),
        box('right-rocks','rocks',78,30,22,70,{filter:'stone'}),
      ]};
    }
    const prefix={lake:'cast-lake',river:'cast-river',beach:'cast-sea-beach',harbor:'cast-sea-harbor',pond:'cast-sam-pond'}[kind] || 'cast-lake';
    const version=kind==='pond'?78:['beach','harbor'].includes(kind)?76:77;
    const time={dawn:'morning',morning:'morning',day:'day-soft',evening:'evening',night:'night'}[period] || 'day-soft';
    const harbor=kind==='harbor';
    const parts=[
      box('distant-land','ground',0,0,100,100),
      box('sky','sky',0,0,100,24,{filter:'water'}),
      box('foliage','trees',0,0,100,65,vegetation),
      box('shore','path',0,20,100,80,{filter:'earth'}),
      box('open-water','water',0,harbor?28:24,100,100,surfaceWater(kind==='river'?'river':['beach','harbor'].includes(kind)?'sea':'lake')),
      box('left-bank','rocks',0,55,26,45,{filter:'stone'}),
      box('right-bank','rocks',80,52,20,48,{filter:'stone'}),
    ];
    // The warm sunset reflection is water even when it contains no blue.
    // Conservative art-space polygons stay clear of all near banks.
    if(kind==='lake'||kind==='pond')parts.push(part('reflection-water','water',
      kind==='lake'?[[20,42],[80,42],[84,62],[75,76],[27,68],[18,55]]:[[30,36],[78,36],[75,60],[32,60]],
      {effect:'surface-wave',surfaceMotion:'lake'}));
    if(harbor) parts.push(
      box('fishmongers','buildings',12,9,31,20),
      box('sam-shop','buildings',48,0,22,26),
      box('shrine','buildings',42,0,9,10),
      box('quay','rocks',12,26,64,9),
      box('pier','props',73,25,24,24),
      box('west-boat','props',13,31,12,9),
      box('middle-boat','props',36,31,14,8),
      box('east-boat','props',58,31,10,7),
    );
    return {id:'surface-'+kind,source:`assets/${prefix}-${time}-v${version}.jpg`,units:[100,100],photographedTime:true,objectPosition:harbor?'center 20%':'center bottom',parts};
  }
  function underwater(zone,depth,flatfish) {
    zone=['lake','river','sea'].includes(zone)?zone:'lake';
    depth=['shallow','mid','deep'].includes(depth)?depth:'shallow';
    return {
      id:`underwater-${zone}-${depth}-${!!flatfish}`,
      source:flatfish?'assets/underwater-sea-sand-flatfish-v97.jpg':`assets/underwater-${zone}-${depth}-v${zone==='sea'?65:64}.jpg`,
      units:[100,100],underwater:true,
      parts:[
        box('water-column','water',0,0,100,75,{effect:'shafts'}),
        box('bed','ground',0,65,100,35),
        box('water-plants','grass',0,15,100,85,vegetation),
        box('left-stones','rocks',0,42,27,58,{filter:'stone'}),
        box('right-stones','rocks',72,45,28,55,{filter:'stone'}),
        box('surface-light','light',0,0,100,16),
      ],
    };
  }
  const mountainSurfaces={canalCurrent:[0,0,1,1],canalBackwater:[0,0,1,1],stream:[0,0,.5,.5],pond:[.5,0,.5,.5],highPond:[.5,0,.5,.5],marsh:[0,.5,.5,.5],highMarsh:[0,.5,.5,.5],underground:[.5,.5,.5,.5],wetPond:[0,0,.5,.5],wetCreek:[.5,0,.5,.5],wetMarsh:[0,.5,.5,.5]};
  function mountainSurface(kind){
    return {id:'surface-mountain-'+kind,source:kind==='canalCurrent'?'assets/rural-canal-cast-v252-48.webp':kind==='canalBackwater'?'assets/rural-backwater-cast-v252-48.webp':kind.startsWith('wet')?'assets/wetland-cast-v227.png':'assets/mountain-cast-v219.png',sourceRect:mountainSurfaces[kind],units:[640,320],indoor:kind==='underground',objectPosition:'center bottom',
      parts:[box('far-bank','trees',0,0,640,kind.startsWith('canal')?67:95),box('open-water','water',0,kind.startsWith('canal')?67:95,640,kind.startsWith('canal')?198:167,surfaceWater(['stream','wetCreek','canalCurrent'].includes(kind)?'river':kind==='underground'?'cave':['marsh','highMarsh','wetMarsh','canalBackwater'].includes(kind)?'marsh':'lake')),box('near-bank','ground',0,262,640,58)]};
  }
  function get(id,env={period:'day'}) {
    if(id.startsWith('surface-mountain-')&&mountainSurfaces[id.slice(17)])return mountainSurface(id.slice(17));
    if(id==='world') return world;
    if(id==='home-exterior') return garden;
    if(id==='home-interior'||id==='room-player-home') return room;
    if(id.startsWith('surface-')) return surface(id.slice(8),env.period);
    if(id.startsWith('underwater-')) {
      const [,zone,depth,flatfish]=id.split('-'); return underwater(zone,depth,flatfish==='true');
    }
    const name=rooms[id.replace(/^room-/,'')] || 'fishing-inn';
    return {id,source:name==='fishing-inn'?'assets/layered-v163/fishing-inn-master.png':`assets/interior-${name}-v55.png`,units:[100,100],indoor:true,
      parts:[box('walls','walls',0,0,100,54),box('floor','ground',0,54,100,46),
        box('left-furnishings','furniture',0,24,30,68),box('right-furnishings','furniture',72,25,28,68),
        box('back-counter','furniture',29,40,44,26),box('front-props','foreground',0,88,100,12)]};
  }
  const ids=['world','home-exterior','home-interior',...Object.keys(mountainSurfaces).map(id=>'surface-mountain-'+id),...Object.keys(rooms).map(id=>'room-'+id),
    ...['lake','river','beach','harbor','pond','coast-sand','coast-reef'].map(id=>'surface-'+id),
    ...['lake','river','sea'].flatMap(z=>['shallow','mid','deep'].map(d=>`underwater-${z}-${d}-false`)),
    'underwater-sea-deep-true'];
  function assets() {
    const urls=new Set();
    for(const id of ids) for(const period of ['dawn','morning','day','evening','night']) {
      const d=get(id,{period}); urls.add(d.source); if(d.underlay)urls.add(d.underlay);
      for(const edit of d.edits||[])urls.add(edit.source);
    }
    return [...urls];
  }
  // Measured foot anchors in the 1672×941 cohesive village master. Keep
  // these small solids on the trunks, never on neighboring widened roads.
  const villageArtSize=[1672,941];
  const trunks=[[459,384],[584,635],[1184,240],[1227,240],[108,369],[1583,430]];
  const shopProps=[[187.5,190.8,90,92],[191.3,193.4,90.6,92.5]];
  const propSolid=(x,y)=>trunks.some(([px,py])=>Math.abs(x-px/villageArtSize[0]*240)<.85&&Math.abs(y-py/villageArtSize[1]*135)<.55)||
    shopProps.some(([left,right,top,bottom])=>x>=left&&x<=right&&y>=top&&y<=bottom);
  return {get,ids,assets,propSolid};
});
