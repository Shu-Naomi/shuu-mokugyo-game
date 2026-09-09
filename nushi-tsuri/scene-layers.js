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
  const world = {
    id:'world', source:'assets/terrain-world-v54.png',
    underlay:'assets/layered-v163/world-underlay.png', units:[1536,864],
    parts:[
      box('meadow','grass',0,0,1536,864,vegetation),
      box('paths','path',0,0,1536,864,{filter:'earth'}),
      part('lake','water',[[532,110],[667,90],[771,89],[866,106],[940,141],[974,195],[970,234],[938,272],[887,296],[775,319],[658,300],[576,274],[539,244],[528,196]],water),
      part('stream','water',[[710,309],[754,312],[736,411],[708,480],[707,560],[725,601],[716,655],[705,699],[721,745],[718,786],[745,832],[671,856],[650,818],[674,749],[657,679],[675,620],[667,571],[658,520],[689,442]],water),
      part('sea','water',[[0,711],[142,713],[294,742],[461,777],[584,816],[663,829],[740,824],[802,858],[933,857],[961,818],[1060,807],[1135,737],[1243,662],[1434,663],[1484,709],[1479,791],[1536,849],[1536,864],[0,864]],water),
      part('harbor-water','water',[[944,709],[1052,667],[1157,646],[1270,648],[1383,634],[1407,599],[1536,576],[1536,864],[938,864]],water),
      part('practice-pond','water',[[1372,479],[1387,466],[1423,465],[1457,478],[1474,502],[1460,526],[1424,536],[1386,520]],water),
      box('north-forest','trees',0,0,1536,68,vegetation),
      part('west-forest','trees',[[0,0],[144,0],[126,178],[82,277],[45,372],[0,493]],vegetation),
      part('east-forest','trees',[[1450,0],[1536,0],[1536,315],[1441,274],[1417,185]],vegetation),
      box('west-coast-bushes','foreground',0,483,203,159,vegetation),
      box('east-coast-bushes','foreground',1484,365,52,234,vegetation),
      box('farm-tree','trees',376,122,80,124,{motion:'sway'}),
      box('shrine-tree','trees',385,274,64,88,{motion:'sway'}),
      box('river-tree','trees',516,516,58,63,{motion:'sway'}),
      box('east-tree','trees',1061,88,111,135,{motion:'sway'}),
      box('west-cherry','trees',42,248,112,101,{motion:'sway'}),
      box('east-cherry','trees',1430,321,106,112,{motion:'sway'}),
      box('lake-reeds','grass',577,273,83,32,{...vegetation,motion:'sway'}),
      box('river-reeds','grass',731,388,28,82,{...vegetation,motion:'sway'}),
      part('farmhouse','buildings',[[176,110],[193,76],[277,68],[288,80],[332,77],[334,102],[351,110],[348,183],[181,183]]),
      part('watermill','buildings',[[1189,117],[1233,81],[1306,83],[1317,98],[1341,114],[1347,168],[1304,184],[1192,182]]),
      part('west-shrine','buildings',[[171,299],[187,264],[269,263],[280,280],[310,296],[309,362],[180,371]]),
      box('wayside-shrine','buildings',47,331,58,65),
      part('yaoya','buildings',[[429,393],[449,350],[506,347],[519,362],[565,360],[580,401],[586,469],[559,489],[439,486]]),
      part('diner','buildings',[[835,398],[855,352],[987,350],[1004,395],[1006,479],[851,489]]),
      part('main-shrine','buildings',[[1151,278],[1209,240],[1232,221],[1254,247],[1301,270],[1327,293],[1302,311],[1310,363],[1254,401],[1170,361],[1172,304],[1142,306]]),
      part('sam-shop','buildings',[[1165,509],[1192,491],[1190,453],[1232,453],[1265,447],[1317,453],[1334,511],[1336,573],[1308,597],[1163,589]]),
      part('fish-market','buildings',[[935,580],[963,562],[994,544],[1055,556],[1088,552],[1106,599],[1108,648],[952,656],[925,632]]),
      part('harbor-shop','buildings',[[794,715],[827,687],[873,668],[915,685],[928,716],[927,771],[818,784],[798,768]]),
      box('stone-bridge','rocks',636,479,108,77),
      box('lake-dock','props',678,89,37,33),
      box('farm-fences','fences',143,172,240,76,{filter:'wood'}),
      box('west-torii','fences',163,371,110,77),
      box('shrine-fence','fences',1095,305,329,106,{filter:'wood'}),
      box('beach-stones','rocks',0,733,204,98,{filter:'stone'}),
      box('north-bank-stones','rocks',528,79,424,61,{filter:'stone'}),
      box('diner-props','props',788,420,58,60),
      box('diner-parasol','props',1006,416,54,65),
      box('village-board','props',771,437,22,40),
      box('beach-umbrella','props',418,650,32,35),
      box('west-boat','props',957,784,71,41),
      box('middle-boat','props',1118,704,69,39),
      box('east-boat','props',1195,675,84,44),
      box('harbor-pier','props',1320,659,179,117),
    ],
    // These two links were already walkable in v161. Reuse the master's own
    // dock planks so the retained collision paths also have a visible surface.
    patches:[
      {id:'lower-pier-link',kind:'props',sample:[984,756,26,18],to:[967,722,42,40]},
      {id:'east-pier-link',kind:'props',sample:[984,756,26,18],to:[1389,627,37,55]},
    ],
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
      box('return-sign','props',136,504,88,107),
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
    const prefix={lake:'cast-lake',river:'cast-river',beach:'cast-sea-beach',harbor:'cast-sea-harbor',pond:'cast-sam-pond'}[kind] || 'cast-lake';
    const version=kind==='pond'?78:['beach','harbor'].includes(kind)?76:77;
    const time={dawn:'morning',morning:'morning',day:'day-soft',evening:'evening',night:'night'}[period] || 'day-soft';
    const harbor=kind==='harbor';
    const parts=[
      box('distant-land','ground',0,0,100,100),
      box('sky','sky',0,0,100,24,{filter:'water'}),
      box('foliage','trees',0,0,100,65,vegetation),
      box('shore','path',0,20,100,80,{filter:'earth'}),
      box('open-water','water',0,harbor?28:24,100,100,water),
      box('left-bank','rocks',0,55,26,45,{filter:'stone'}),
      box('right-bank','rocks',80,52,20,48,{filter:'stone'}),
    ];
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
    return {id:'surface-'+kind,source:`assets/${prefix}-${time}-v${version}.jpg`,units:[100,100],photographedTime:true,parts};
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
  function get(id,env={period:'day'}) {
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
  const ids=['world','home-exterior','home-interior',...Object.keys(rooms).map(id=>'room-'+id),
    ...['lake','river','beach','harbor','pond'].map(id=>'surface-'+id),
    ...['lake','river','sea'].flatMap(z=>['shallow','mid','deep'].map(d=>`underwater-${z}-${d}-false`)),
    'underwater-sea-deep-true'];
  function assets() {
    const urls=new Set();
    for(const id of ids) for(const period of ['dawn','morning','day','evening','night']) {
      const d=get(id,{period}); urls.add(d.source); if(d.underlay)urls.add(d.underlay);
    }
    return [...urls];
  }
  // Only the visible trunks in the detailed master have small foot collisions.
  // Building/water/path geometry continues to belong to the existing game.
  const trunks=[[416,223],[420,345],[543,568],[1112,214],[92,344],[1483,413]];
  const propSolid=(x,y)=>trunks.some(([px,py])=>Math.abs(x-px/6.4)<.85&&Math.abs(y-py/6.4)<.55);
  return {get,ids,assets,propSolid};
});
