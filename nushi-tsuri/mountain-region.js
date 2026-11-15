(function (root, factory) {
  const api = factory(typeof module === "object" && module.exports ? require("./world-life.js") : root.ShuWorldLife, typeof module === "object" && module.exports ? require("./rural-canals.js") : root.ShuRural);
  if (typeof module === "object" && module.exports) module.exports = api;
  root.ShuMountain = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function (Life, Rural) {
  "use strict";
  // Geometry is opt-in and captured after village-reference.js loads.
  const reference = globalThis.ShuVillageReference?.enabled ? globalThis.ShuVillageReference : null;
  const width = 240, height = 135;
  const asset = "assets/mountain-world-v252-31.png";
  // Approved hillside redesign is composited only inside this region. The river,
  // bridge, ponds and every pixel outside it retain the original painting.
  const hillside = {asset:"assets/valley-hillside-v2.png",clip:[[145,0],[240,0],[240,45],[213,52],[190,63],[183,77],[140,77],[140,64],[134,59],[140,49],[145,42],[149,31],[148,20]]};
  const villageGate = reference?.routes.mountain.gate || { left:116, right:132, top:2, bottom:10 };
  const returnGate = { left:146, right:158, top:125, bottom:133 };
  const entry = { x:152, y:128, direction:"up" };
  // v252-55: return on the renewed north road, with a straight clear step to the gate.
  const villageReturn = reference?.routes.mountain.return || { x:120, y:8, direction:"down" };
  const bridge = { left:87, right:140, top:69, bottom:75.5 };
  // v252-31: widened dirt and bridge traced against the finished painting, in the same 240 x 135 world units
  // as the village. The deck covers the stream; the waterfall and cliffs do not.
  const waters = {
    stream: [[129,2],[139,2],[132,13],[123,21],[133,26],[136,33],
      [130,43],[122,55],[123,64],[126,74],[120,87],[109,96],
      [105,110],[94,123],[92,133],[67,133],[68,124],[79,112],
      [82,104],[91,92],[96,86],[101,75],[101,66],[99,60],
      [104,53],[109,43],[110,36],[106,32],[108,27],[116,22],[121,14]],
    pond: [[28,29],[42,27],[55,27],[66,30],[72,38],[70,48],
      [60,52],[45,52],[36,46],[26,42],[23,36]],
    marsh: [[185,81],[199,78],[214,80],[223,86],[226,94],
      [221,103],[214,110],[209,114],[196,111],[182,104],[178,95],[179,87]],
  };
  const trails = [
    // Village road, bridge approach, and the east bank fork.
    [[150,133],[152,125],[154,119],[154,113],[156,105],[155,100],[152,94],[148,86],[147,77],[147,72],[139,72]],
    [[139,72],[147,72],[156,71],[171,70],[179,64],[181,58],[187,53],[194,47],[200,40],[207,35],[219,30]],
    // West-bank trail, pond shore and northern pass.
    [[87,72],[82,70],[79,68],[79,61],[79,55],[80,46],[80,39],[78,33],
      [75,26],[74,18],[71,10],[73,2]],
    [[79,69],[73,66],[64,64],[59,61],[56,58],[48,54],[39,53],[31,50],[24,46],[19,41],[20,35],[24,31]],
    [[24,31],[28,26],[43,24],[59,22],[71,25],[75,26]],
    // The ridge follows the painted switchback, rather than crossing a cliff.
    [[207,35],[202,29],[200,24],[194,20],[185,17],[175,15],[166,12],[158,7],[152,2]],
    // Marsh approach, with both banks reachable on foot.
    [[170,79],[165,86],[167,95],[170,102],[185,109],[198,114],[211,117],[221,111]],
    [[147,74],[158,76],[170,79],[185,78],[198,76],[216,78],[228,84],[231,96],[225,108],[221,111]],
    [[156,105],[163,105],[170,102]],
  ];
  // Only the ground around a trunk is solid; overhanging foliage does not
  // turn a neighbouring dirt road into an invisible wall.
  const treeBases=[
    {x:143.6,y:127.6,rx:2.1,ry:1.6}, {x:144,y:116,rx:2.2,ry:1.6},
    {x:137.1,y:95.4,rx:1.8,ry:1.4}, {x:164.5,y:81.5,rx:1.8,ry:1.4},
    {x:55.6,y:56.2,rx:1.9,ry:1.5},
    {x:40.6,y:55.5,rx:1.8,ry:1.3}, {x:74.1,y:51.7,rx:1.8,ry:1.4},
    {x:73.3,y:73.6,rx:1.8,ry:1.5},
  ];
  const landmarks = [
    { id:"pass", x:73, y:8, name:"北の峠", message:"尾根を渡る風が、遠くの森の匂いを運んでくる。" },
    { id:"cave", x:219, y:30, name:"岩窟の入口", message:"岩窟の奥から、かすかな水音が聞こえる。" },
  ];
  const regions={
    stream:{asset,overlay:hillside,name:"星見渓流",waters,trails,trailRadius:5.2,treeBases,bridges:[bridge],entry,returnGate,landmarks,
      // Level interior of the shop terrace; the retaining wall stays outside.
      trailRadii:[5.2,3.8,5.2,5.2,5.2,3.2,5.2,5.2,5.2],
      clearings:[[[140,69],[145,62],[151,57],[165,53],[176,53],[180,57],[179,67],[174,73],[155,76],[143,74]],
        [[156,38],[159,34],[177,34],[184,38],[190,40],[190,44],[181,45],[170,46],[158,44]]],
      // Solid downhill retaining faces separate the two terraces. Walk around
      // their eastern end instead of stepping through a painted cliff.
      walls:[[[149,46],[157,46],[166,47],[175,47],[183,46],[184,48],[176,50],[165,50],[154,49],[149,48]]]},
    mountainPond:{asset:"assets/pass-pond-v252-51.png",name:"峠の池",entry:{x:120,y:128,direction:"up"},
      returnGate:{left:106,right:134,top:122,bottom:133},bridges:[],
      // v252-51: visibly widened roads, retraced from the final 1671 x 941 art.
      // Radius follows usable dirt width, not the old narrow centre corridor.
      // Water, the house and explicit switchback cliff faces stay solid.
      waters:{highPond:[[120,27.3],[133.6,29.6],[146,32.8],[158.7,36.9],[172.2,42.6],
        [182,48.3],[193,52.9],[198.2,59.1],[200.7,65],[198.5,71],[192.5,78.6],
        [183,85.2],[169.7,90.4],[156.5,94.8],[142.7,98.4],[130,101],[118.1,102.2],
        [103.5,97.3],[88.6,92.7],[74.9,88.1],[63,83.5],[50.8,77.8],[45.5,72.3],
        [39.8,65.3],[39.6,58],[48,51.3],[60,44.3],[75,38.9],[93,32.7]]},
      trails:[
        // The old approach drifted east and blocked the painted west half.
        [[120,133],[121,126],[120.5,121],[121,116],[121,112],[120,107.5]],
        [[120,107.5],[106.5,108.4],
        [93.9,104.9],[81.8,101.9],[69.7,97.6],[57.4,93.4],[46.2,89.7],[36.9,84.7],
        [28.1,77.8],[23,70.4],[20.5,62.2],[24,55.6],[29.5,49.1],[38.2,45.5],
        [42.4,38.1],[50.4,34.1]],
        [[50.4,34.1],[59.3,28.7],[71.4,24.9],[84.4,19.8],[96.7,19],
        [107.6,18.4],[120.1,18],[133.6,20],[146.4,25.6],[159.2,31]],
        [[159.2,31],[170,37.6],[182.8,41.5],[194.6,45.6],[204.2,51.5],[209.2,58]],
        [[209.2,58],[215.3,63.1],[218.2,69.2],[215.2,77.5],[208.5,83.2],[198.3,87.2]],
        [[198.3,87.2],
        [189.3,94.5],[177,98.7],[164.7,101.7],[152.1,104.9],[140.3,106.3],
        [128.7,109.2],[120,107.5]],
        // Follow the painted switchbacks; the former straight route ran up the cliff.
        [[188,41],[190,40],[195,38],[199,37],[197,34],[190,32],[184,30],[184,28],[191,26],[201,25],
          [210,23],[212,21],[207,20],[198,18],[192,16],[191,14],[196,11],[205,10],
          [214,9],[219,7],[220,4],[218,2]]],trailRadii:[12,7.2,5.2,6.4,7.4,6.2,5.2],bankRadius:3,
      // Keep the vertical cliff faces between widened switchback legs solid.
      walls:[[[177,15.5],[181,16],[184,17.7],[188,19.2],[193,20.3],[198.5,21],[200.5,22.2],[198.6,23.3],[192,24],[185,24.4],[179,24.3],[175,23],[174,19]],[[191.6,30.3],[194.5,29.6],[199,29.3],[205,28.8],[209,28.1],[212,26.8],[216,26],[221,28],[223,33],[220,38],[212,38],[205,35.2],[200,34],[195.5,32.8],[192.5,31.7],[191.6,31]],[[174.8,34.4],[178,34.9],[181,36],[184,36.8],[185.3,37.5],[181,37.2],[177,36.6],[175,35.8]],[[198.5,14.8],[202.7,13.2],[207,12.6],[211,11.5],[214.5,10.5],[218,9],[223,6.8],[229,7.3],[232,11],[232,24],[222,25],[216,22],[214.2,19],[210.8,18],[206,16.8],[201.8,16.1],[199,15.6]]],
      landmarks:[{id:"marsh",x:219,y:8,name:"沼へ続く尾根",message:"尾根の先に、葦の揺れる水辺が見える。"}]},
    mountainMarsh:{asset:"assets/pass-marsh-v252-50.webp",name:"峠の沼",entry:{x:48,y:128,direction:"up"},
      returnGate:{left:45,right:54,top:126,bottom:133},trailRadius:5.1,bankRadius:0,
      // v252-50: independently traced from the rebuilt 1671 x 941 painting.
      // Only timber floors bridge the marsh. Rails, posts and the bench stay solid.
      bridges:[{left:42,right:214,top:63.5,bottom:77},
        {left:97,right:145.2,top:57.1,bottom:85.7}],
      bridgeFishingEdges:[{left:116,right:129,top:57.1,bottom:61.5,direction:"up"},
        {left:116,right:129,top:81.3,bottom:85.7,direction:"down"}],
      bridgeHint:"沼を渡る木の橋。中央の広場の、柵が開いた上と下で釣れるよ。",
      waters:{highMarsh:[[36,44],[45,39],[56,36],[70,36],[84,33],[98,27],[109,22],
        [119,21],[129,17],[143,19],[155,23],[167,26],[176,29],[177,36],[181,41],
        [192,46],[202,51],[210,58],[213.8,66],[214,77],[217,85],[209,91],[203,98],
        [191,102],[174,105],[160,105],[147,105],[134,103],[123,103],[112,104],
        [101,108],[92,107],[83,103],[72,101],[60,102],[51,103],[45,98],[43,94],
        [46,88],[46,81],[42.1,77.5],[42.1,63],[33,61],[31,55],[32,49]]},
      trails:[[[50,133],[48,125],[47,116],[46,111],[42,106]],
        [[42,106],[37,102],[36,96],[40,88],[40,81],[37,73],[32,65],[27,57],
          [27,52],[30,46],[36,40],[44,35],[56,32],[69,32],[81,30],[93,26],
          [105,19],[117,14],[130,13],[144,14],[158,18],[173,22],[181,27],
          [183,34],[186,39],[197,43],[208,48],[216,54],[220,62],[221,71],
          [223,80],[223,84],[216,89],[212,96],[205,102],[194,107],[177,110],
          [160,111],[146,110],[131,108],[119,108],[106,112],[94,112],
          [82,108],[72,107],[61,108],[51,110],[42,106]],
        [[55,32],[61,26],[68,22],[77,23],[82,27]],
        [[221,82],[230,82],[238,83]],
        // Dry abutments join the last planks to both banks without a water seam.
        [[37,70],[44,70]],[[212,70],[222,70]]],trailRadii:[5.4,5.1,5.1,5.2,6.6,6.6],
      clearings:[[[57,19],[62,16],[72,16],[81,21],[82,26],[73,29],[60,28],[56,24]]],
      walls:[
        // Upper and lower rail footprints along both bridge wings.
        [[42,59],[97,59],[97,63.5],[42,63.5]],
        [[145.2,59],[214,59],[214,63.5],[145.2,63.5]],
        [[42,77.1],[97,77.1],[97,82],[42,82]],
        [[145.2,77.1],[214,77.1],[214,82],[145.2,82]],
        // Terrace rail sections leave the two explicit casting windows open.
        [[96,51.5],[115,51.5],[115,57.1],[96,57.1]],
        [[130,51.5],[146.2,51.5],[146.2,57.1],[130,57.1]],
        [[96,83.5],[115,83.5],[115,88],[96,88]],
        [[130,83.5],[146.2,83.5],[146.2,88],[130,88]],
        [[95.5,55],[97,55],[97,63.5],[95.5,63.5]],
        [[145.2,55],[146.5,55],[146.5,63.5],[145.2,63.5]],
        [[95.5,77],[97,77],[97,87],[95.5,87]],
        [[145.2,77],[146.5,77],[146.5,87],[145.2,87]],
        // Bench, basket and lantern, all above the unobstructed through route.
        [[99.5,56],[117.5,56],[117.5,62.7],[99.5,62.7]]],
      landmarks:[{id:"wetland",x:228,y:82,name:"湿地へ下る道",message:"山道の先に、睡蓮の池と葦の広がる水郷が見える。"}]},
    wetland:{asset:"assets/wetland-world-v227.png",name:"水郷の湿地",entry:{x:224,y:6,direction:"down"},
      returnGate:{left:216,right:231,top:2,bottom:10},returnDirection:"up",trailRadius:3.2,
      // Shores and paths traced from the final 1672 x 941 background.
      bridges:[{left:99,right:126,top:55,bottom:60}],
      waters:{
        wetPond:[[26,27],[34,20],[49,18],[67,20],[79,26],[88,37],[87,47],[80,57],[66,62],[50,63],[35,58],[24,51],[21,39]],
        wetCreek:[[113,2],[130,2],[130,13],[123,28],[121,41],[117,50],[119,62],[117,72],[111,91],[104,111],[99,133],[81,133],[87,111],[93,93],[101,73],[105,62],[107,49],[108,37],[109,25],[113,12]],
        wetMarsh:[[183,38],[199,36],[220,37],[233,43],[233,57],[230,72],[224,83],[222,96],[217,105],[204,112],[185,114],[164,110],[151,104],[140,94],[131,81],[127,70],[130,56],[143,47],[162,41]],
      },
      trails:[
        [[224,2],[218,16],[207,29],[189,32],[167,34],[145,40],[133,47],[128,55],[124,58]],
        [[100,58],[96,60],[89,66],[74,70],[57,71],[39,67],[24,62],[16,52],[15,36],[23,21],[37,13],[52,11],[70,12],[83,19],[92,31],[96,45],[96,60]],
        [[128,55],[128,70],[133,85],[144,102],[159,115],[185,120],[207,119],[224,111],[231,98],[235,80],[238,61],[238,43],[231,34],[213,30],[189,32]],
      ],landmarks:[]},
    cave:{asset:"assets/cave-lake-v202.png",name:"岩窟の地下湖",entry:{x:120,y:128,direction:"up"},
      returnGate:{left:112,right:128,top:122,bottom:133},bridges:[],
      waters:{underground:[[90,18],[112,17],[136,19],[157,23],[176,27],[192,33],[207,42],[217,55],[219,71],[210,86],[192,98],[169,102],[146,105],[126,106],[104,103],[88,99],[69,94],[53,88],[37,77],[28,63],[31,47],[42,37],[58,29],[74,24]]},
      trails:[[[120,133],[122,120],[120,112],[97,112],[77,108],[56,101],[39,91],[25,78],[19,59],[29,42],[47,27],[74,16],[101,13],[132,13],[160,17],[187,23],[211,35],[226,49],[229,69],[221,87],[207,99],[186,109],[161,114],[138,114],[120,112]]],landmarks:[]},
  };
  regions[Rural.id]=Rural.data;
  const isRegion=id=>Object.hasOwn(regions,id);
  const regionData=id=>regions[id]||regions.stream;
  function exitAt(x,y,region="stream"){
    const data=regionData(region);
    if(inRect(x,y,data.returnGate) && data.returnTarget)return {...data.returnTarget};
    if(inRect(x,y,data.returnGate))return region==="wetland"
      ?{region:"mountainMarsh",x:227,y:78,direction:"up"}:region==="stream"
      ?{region:"village",...villageReturn}:region==="mountainMarsh"
        ?{region:"mountainPond",x:212,y:10,direction:"left"}:region==="cave"
          ?{region:"stream",x:215,y:34,direction:"down"}:{region:"stream",x:73,y:12,direction:"down"};
    const landmark=data.landmarks.find(p=>Math.hypot(x-p.x,y-p.y)<6);
    if(landmark?.id==="pass")return {region:"mountainPond",...regions.mountainPond.entry};
    if(landmark?.id==="cave")return {region:"cave",...regions.cave.entry};
    if(landmark?.id==="marsh")return {region:"mountainMarsh",...regions.mountainMarsh.entry};
    if(landmark?.id==="wetland")return {region:"wetland",...regions.wetland.entry};
    return null;
  }
  function inRect(x,y,r) { return x>=r.left && x<=r.right && y>=r.top && y<=r.bottom; }
  function inside(x,y,poly) {
    let hit=false;
    for(let i=0,j=poly.length-1;i<poly.length;j=i++) {
      const [xi,yi]=poly[i],[xj,yj]=poly[j];
      if((yi>y)!==(yj>y) && x<(xj-xi)*(y-yi)/(yj-yi)+xi)hit=!hit;
    }
    return hit;
  }
  function segmentDistance(x,y,a,b) {
    const d=(b[0]-a[0])**2+(b[1]-a[1])**2;
    const t=Math.max(0,Math.min(1,((x-a[0])*(b[0]-a[0])+(y-a[1])*(b[1]-a[1]))/d));
    return Math.hypot(x-a[0]-t*(b[0]-a[0]),y-a[1]-t*(b[1]-a[1]));
  }
  function edgeDistance(x,y,poly) {
    return Math.min(...poly.map((a,i)=>segmentDistance(x,y,a,poly[(i+1)%poly.length])));
  }
  function onBridge(x,y,region="stream") { return regionData(region).bridges.some(b=>b.polygon?inside(x,y,b.polygon):inRect(x,y,b)); }
  function waterType(x,y,region="stream") {
    if(!Number.isFinite(x)||!Number.isFinite(y)||x<2||x>238||y<2||y>133||onBridge(x,y,region))return null;
    return Object.entries(regionData(region).waters).find(([,poly])=>inside(x,y,poly))?.[0] || null;
  }
  function walkable(x,y,region="stream") {
    if(!Number.isFinite(x)||!Number.isFinite(y)||x<2||x>238||y<2||y>133)return false;
    const data=regionData(region);
    if(data.walls?.some(polygon=>inside(x,y,polygon)))return false;
    if(Life?.solid(x,y,region))return false;
    if(data.treeBases?.some(p=>((x-p.x)/p.rx)**2+((y-p.y)/p.ry)**2<=1))return false;
    if(onBridge(x,y,region))return true;
    if(waterType(x,y,region))return false;
    if(Life?.access(x,y,region))return true;
    if(data.clearings?.some(polygon=>inside(x,y,polygon)))return true;
    if(inRect(x,y,data.returnGate))return true;
    if(data.trails.some((path,trail)=>path.slice(1).some((b,i)=>segmentDistance(x,y,path[i],b)<=(data.trailRadii?.[trail]??data.trailRadius??4))))return true;
    // Zero means no implicit bank path, including exact polygon boundaries.
    // Otherwise a former save can remain stranded on a zero-width shoreline.
    if(data.bankRadius===0)return false;
    // Dry stone banks remain available for fishing. The waterfall is cliff-bound.
    return Object.entries(data.waters).some(([id,poly])=>(id!=="stream"||y>=26) && edgeDistance(x,y,poly)<=(data.bankRadius??6));
  }
  function moveTarget(x,y,direction="up",stride=4,region="stream") {
    const delta={up:[0,-1],right:[1,0],down:[0,1],left:[-1,0]}[direction];
    if(!delta||!Number.isFinite(stride)||stride<=0||!walkable(x,y,region))return {x,y};
    const [dx,dy]=delta;
    // A rejected final tile must not cancel the safe approach to a corner.
    // Sweep every quarter unit, retaining each complete safe one-unit step.
    for(let moved=0;moved<stride;moved+=1){
      const amount=Math.min(1,stride-moved);
      if(![.25,.5,.75,1].every(t=>walkable(x+dx*amount*t,y+dy*amount*t,region)))break;
      x+=dx*amount;y+=dy*amount;
    }
    return {x,y};
  }
  function atVillageGate(x,y) { return inRect(x,y,villageGate); }
  function atReturnGate(x,y,region="stream") { return inRect(x,y,regionData(region).returnGate); }
  function fishingWater(x,y,direction="up",region="stream") {
    if(!walkable(x,y,region))return null;
    const data=regionData(region),fromBridge=onBridge(x,y,region);
    // A terrace opening is an explicit exception, not permission to cast from
    // every bridge or through its rails. Keep the cast aligned with the bay.
    const bridgeEdge=fromBridge && data.bridgeFishingEdges?.find(edge=>edge.direction===direction&&inRect(x,y,edge));
    if(fromBridge&&!bridgeEdge)return null;
    const [dx,dy]={up:[0,-1],right:[1,0],down:[0,1],left:[-1,0]}[direction]||[0,-1];
    const rays=(bridgeEdge?[0]:[0,-.1875,.1875,-.375,.375]).map(slope=>({slope,blocked:false}));
    for(let d=.5;d<=8;d+=.5)for(const ray of rays) {
      if(ray.blocked)continue;
      const px=x+dx*d-dy*ray.slope*d,py=y+dy*d+dx*ray.slope*d;
      if(data.walls?.some(p=>inside(px,py,p)) || Life?.solid(px,py,region)){ray.blocked=true;continue;}
      if(onBridge(px,py,region)){if(!bridgeEdge)ray.blocked=true;continue;}
      const type=waterType(px,py,region);
      if(type)return {zone:["stream","wetCreek","canalCurrent"].includes(type)?"river":"lake",type,x:px,y:py};
      if(!walkable(px,py,region))ray.blocked=true;
    }
    return null;
  }
  function landmarkAt(x,y,region="stream") { return regionData(region).landmarks.find(p=>Math.hypot(x-p.x,y-p.y)<6)||null; }
  const names={stream:"星見渓流",pond:"木漏れ日の池",marsh:"葦の沼",highPond:"峠の池",highMarsh:"峠の沼",underground:"岩窟の地下湖",wetPond:"睡蓮の池",wetCreek:"砂底の小川",wetMarsh:"水郷の葦の沼"};
  const populations={
    stream:[{ugui:.13,iwana:.24,amago:.18,kajika:.22,yamame:.16,ayu:.12,moroko:.08},
      {ugui:.12,iwana:.28,amago:.33,kajika:.12,yamame:.16,nijimasu:.10,ayu:.04,unagi:.02},
      {ugui:.08,iwana:.31,amago:.15,kajika:.26,yamame:.08,nijimasu:.12,unagi:.04,namazu:.04}],
    pond:[{wakasagi:.22,moroko:.23,funa:.35,bass:.20},
      {wakasagi:.28,funa:.28,koi:.18,bass:.18,namazu:.08},
      {wakasagi:.16,koi:.37,funa:.16,bass:.16,namazu:.15}],
    marsh:[{dojo:.28,funa:.29,bass:.24,moroko:.19},
      {dojo:.22,bass:.29,namazu:.25,unagi:.14,funa:.10},
      {dojo:.12,namazu:.32,unagi:.32,koi:.14,bass:.10}],
  };
  populations.highPond=populations.pond;
  // Give the upper reed marsh its own small-fish and predator population.
  // These species already use the shared tackle, art and catch-record systems.
  populations.highMarsh=[{dojo:.20,tanago:.20,motsugo:.19,medaka:.17,funa:.12,moroko:.08,bass:.04},
    {dojo:.16,tanago:.14,motsugo:.12,raigyo:.18,namazu:.14,funa:.12,bass:.08,unagi:.06},
    {dojo:.12,raigyo:.24,namazu:.24,unagi:.20,koi:.12,bass:.08}];
  populations.underground=[{funa:.45,koi:.2,namazu:.2,unagi:.15},{namazu:.4,unagi:.35,koi:.15,funa:.1},{namazu:.42,unagi:.38,koi:.15,funa:.05}];
  populations.wetPond=[{tanago:.28,motsugo:.25,medaka:.26,funa:.13,moroko:.08},
    {tanago:.30,motsugo:.28,medaka:.12,funa:.18,koi:.12},
    {tanago:.18,motsugo:.22,funa:.26,koi:.24,namazu:.10}];
  populations.wetCreek=[{kamatsuka:.34,motsugo:.23,medaka:.14,nigoi:.10,ugui:.10,dojo:.09},
    {kamatsuka:.35,nigoi:.28,motsugo:.14,ugui:.15,dojo:.08},
    {kamatsuka:.22,nigoi:.42,ugui:.14,dojo:.08,unagi:.14}];
  populations.wetMarsh=[{raigyo:.15,tanago:.18,motsugo:.22,medaka:.14,dojo:.18,funa:.13},
    {raigyo:.32,nigoi:.12,namazu:.22,funa:.16,dojo:.18},
    {raigyo:.39,nigoi:.18,namazu:.23,unagi:.12,koi:.08}];
  Object.assign(names,Rural.names);
  Object.assign(populations,Rural.populations);
  const spots=Object.keys(names).flatMap(type=>["shallow","mid","deep"].map((depth,i)=>({
    id:`mountain-${type}-${depth}`,zone:["stream","wetCreek","canalCurrent"].includes(type)?"river":"lake",depth,
    name:`${names[type]}・${["岸際","流心・中層","淵・深場"][i]}`,
    role:`${names[type]}の${["浅場","中層","深場"][i]}`,weights:populations[type][i],
  })));
  const images={};let pendingScene,blendedHillside;
  const canPaintPending=region=>pendingScene?.[2]===region && (!pendingScene[0].dataset?.region || pendingScene[0].dataset.region===region) && (typeof document==="undefined" || !document.hidden && !document.querySelector(".modal.open") && !document.querySelector("#fieldMenu.show"));
  function hillsideLayer(image,overlay){
    if(blendedHillside)return blendedHillside;
    const c=typeof OffscreenCanvas!=="undefined"?new OffscreenCanvas(image.naturalWidth,image.naturalHeight):typeof document!=="undefined"?document.createElement("canvas"):null;
    if(!c)return image;
    c.width=image.naturalWidth;c.height=image.naturalHeight;const g=c.getContext("2d");
    const outline=()=>{g.beginPath();overlay.clip.forEach(([x,y],i)=>i?g.lineTo(x/width*c.width,y/height*c.height):g.moveTo(x/width*c.width,y/height*c.height));g.closePath();};
    g.save();outline();g.clip();g.drawImage(image,0,0);g.globalCompositeOperation="destination-out";g.lineJoin="round";
    // Feather inward only: no altered pixels escape the approved hillside.
    for(let i=24;i>=1;i--){g.globalAlpha=1/i;g.lineWidth=i*2;outline();g.stroke();}
    g.restore();blendedHillside=c;return c;
  }
  function paint(canvas,environment={},region="stream") {
    if(!canvas?.getContext)return;
    pendingScene=[canvas,{...environment},region];
    if(!images[region] && typeof Image!=="undefined") {
      const img=new Image();images[region]=img;img.decoding="async";
      img.onload=()=>{if(canPaintPending(region))paint(...pendingScene);};img.src=regionData(region).asset;
    }
    const overlay=regionData(region).overlay;
    if(overlay && !images[overlay.asset] && typeof Image!=="undefined"){
      const img=new Image();images[overlay.asset]=img;img.decoding="async";
      img.onload=()=>{if(canPaintPending(region))paint(...pendingScene);};img.src=overlay.asset;
    }
    const image=images[region];
    const ctx=canvas.getContext("2d");ctx.save();ctx.imageSmoothingEnabled=false;
    if(image?.complete && image.naturalWidth>0)ctx.drawImage(image,0,0,canvas.width,canvas.height);
    else {ctx.fillStyle="#183b31";ctx.fillRect(0,0,canvas.width,canvas.height);}
    const patch=overlay && images[overlay.asset];
    if(patch?.complete && patch.naturalWidth>0){
      ctx.save();ctx.beginPath();overlay.clip.forEach(([x,y],i)=>i?ctx.lineTo(x/width*canvas.width,y/height*canvas.height):ctx.moveTo(x/width*canvas.width,y/height*canvas.height));ctx.closePath();ctx.clip();
      ctx.drawImage(hillsideLayer(patch,overlay),0,0,canvas.width,canvas.height);ctx.restore();
    }
    const tint=region==="cave"?null:{night:"rgba(9,20,48,.49)",evening:"rgba(115,46,23,.19)",morning:"rgba(255,220,159,.06)"}[environment.period||environment.time];
    if(tint){ctx.fillStyle=tint;ctx.fillRect(0,0,canvas.width,canvas.height);}ctx.restore();
    return Boolean(image?.complete && image.naturalWidth>0 && (!overlay || patch?.complete && patch.naturalWidth>0));
  }
  return {width,height,asset,villageGate,returnGate,entry,villageReturn,bridge,waters,trails,
    landmarks,names,spots,regions,isRegion,regionData,exitAt,inRect,onBridge,waterType,walkable,moveTarget,atVillageGate,atReturnGate,fishingWater,landmarkAt,paint};
});
