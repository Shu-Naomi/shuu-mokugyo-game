(function (root, factory) {
  const api = factory(typeof module === "object" && module.exports ? require("./world-life.js") : root.ShuWorldLife);
  if (typeof module === "object" && module.exports) module.exports = api;
  root.ShuMountain = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function (Life) {
  "use strict";
  const width = 240, height = 135;
  const asset = "assets/mountain-world-v201.png";
  const villageGate = { left:116, right:132, top:2, bottom:10 };
  const returnGate = { left:146, right:158, top:125, bottom:133 };
  const entry = { x:152, y:128, direction:"up" };
  const villageReturn = { x:124, y:8, direction:"down" };
  const bridge = { left:87, right:140, top:69.5, bottom:74.5 };
  // Traced against the finished painting, in the same 240 x 135 world units
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
    [[139,72],[147,72],[156,68],[164,66],[172,65],[174,58],[177,52],[187,47],[194,44],[202,39],[211,34],[219,30]],
    // West-bank trail, pond shore and northern pass.
    [[87,72],[82,70],[79,68],[79,61],[79,55],[80,46],[80,39],[78,33],
      [75,26],[74,18],[71,10],[73,2]],
    [[79,69],[73,66],[64,64],[59,61],[56,58],[48,54],[39,53],[31,50],[24,46],[19,41],[20,35],[24,31]],
    [[24,31],[28,26],[43,24],[59,22],[71,25],[75,26]],
    // The ridge follows the painted switchback, rather than crossing a cliff.
    [[211,34],[217,29],[212,24],[201,24],[190,24],[181,22],[173,18],[167,12],[158,7],[152,2]],
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
    {x:180.7,y:62,rx:1.8,ry:1.4}, {x:55.6,y:56.2,rx:1.9,ry:1.5},
    {x:40.6,y:55.5,rx:1.8,ry:1.3}, {x:74.1,y:51.7,rx:1.8,ry:1.4},
    {x:73.3,y:73.6,rx:1.8,ry:1.5},
  ];
  const landmarks = [
    { id:"pass", x:73, y:8, name:"北の峠", message:"尾根を渡る風が、遠くの森の匂いを運んでくる。" },
    { id:"cave", x:219, y:30, name:"岩窟の入口", message:"岩窟の奥から、かすかな水音が聞こえる。" },
  ];
  const regions={
    stream:{asset,name:"星見渓流",waters,trails,trailRadius:4.5,treeBases,bridges:[bridge],entry,returnGate,landmarks},
    mountainPond:{asset:"assets/pass-pond-v202.png",name:"峠の池",entry:{x:120,y:128,direction:"up"},
      returnGate:{left:112,right:128,top:122,bottom:133},bridges:[],
      // v241: independently measured shoreline and dirt centreline in the
      // original 1672 x 941 painting. The old ring cut through the outer trees.
      waters:{highPond:[[120,27.3],[133.6,29.6],[146,32.8],[158.7,36.9],[172.2,42.6],
        [182,48.3],[193,52.9],[198.2,59.1],[200.7,65],[198.5,71],[192.5,78.6],
        [183,85.2],[169.7,90.4],[156.5,94.8],[142.7,98.4],[130,101],[118.1,102.2],
        [103.5,97.3],[88.6,92.7],[74.9,88.1],[63,83.5],[50.8,77.8],[45.5,72.3],
        [39.8,65.3],[39.6,58],[48,51.3],[60,44.3],[75,38.9],[93,32.7]]},
      trails:[[[120,133],[121,126],[124,118],[122,113],[120,107.5],[107,104.7],
        [95,101],[83,97.8],[70.5,94.8],[58,91.4],[47.7,86.8],[39.2,81.3],
        [32.2,74.2],[27.6,67.3],[23.4,62],[24.6,56.1],[30.6,50.5],[38.2,45.5],
        [44.6,40.6],[51.1,35.6],[60.3,31.3],[72.2,27.4],[85.3,23.5],[96.7,20.5],
        [107.7,19.2],[120,19.7],[133.3,20.8],[146.8,23.8],[160.2,28.3],
        [172.2,32.7],[183.7,38.9],[194.9,45.2],[204.4,51.2],[209.9,57.5],
        [213.7,63.6],[215,69.2],[212.6,75.5],[206.8,80.9],[198,85.9],
        [187.5,90.8],[175.8,95.4],[164.1,99.1],[151.7,102.7],[140.2,105.4],
        [128.5,107.6],[120,107.5]],
        // Follow the painted switchbacks; the former straight route ran up the cliff.
        [[188,41],[190,40],[195,38],[198,36],[197,34],[190,32],[184,30],[184,28],[191,26],[201,25],
          [210,23],[212,21],[207,20],[198,18],[193,16],[193,14],[196,11],[205,10],
          [214,9],[219,7],[220,4],[218,2]]],trailRadii:[2.7,2.8],bankRadius:3,
      landmarks:[{id:"marsh",x:219,y:8,name:"沼へ続く尾根",message:"尾根の先に、葦の揺れる水辺が見える。"}]},
    mountainMarsh:{asset:"assets/pass-marsh-v202.png",name:"峠の沼",entry:{x:48,y:128,direction:"up"},
      returnGate:{left:45,right:54,top:126,bottom:133},trailRadius:3.1,bankRadius:2.5,
      // Trace the dirt, shore and timber decks in the finished 1672 x 941 art.
      // The old outline covered the northern road and missed several bends.
      bridges:[{left:48,right:56,top:32,bottom:35.5},{left:113,right:123,top:19.5,bottom:22.5},
        {left:168,right:178,top:24,bottom:27.5},{left:192,right:203,top:51,bottom:55.5},
        {left:48,right:53,top:76.5,bottom:83},{left:53,right:61,top:76,bottom:79},
        {left:106,right:114,top:104,bottom:108.5},{left:150,right:161,top:104,bottom:108}],
      waters:{highMarsh:[[43,40],[54,37],[61,36],[64,30],[71,29],[82,29],[89,31],[101,29],
        [110,25],[123,24],[128,19],[144,19],[153,22],[163,26],[176,29],[175,35],[175,40],
        [185,45],[193,51],[200,59],[210,63],[218,68],[221,77],[216,81],[208,85],[207,93],
        [202,96],[192,99],[182,100],[170,101],[158,102],[150,100],[138,101],[127,99],
        [119,100],[113,103],[108,107],[103,109],[97,106],[89,102],[80,99],[67,100],[54,99],
        [56,92],[57,84],[55,76],[47,72],[40,65],[32,62],[31,55],[33,48],[37,44]]},
      trails:[[[50,133],[46,124],[43,119],[42,113],[41,108],[42,104]],
        [[42,104],[48,96],[52,90],[53,85],[50,80],[48,73],[42,68],[34,64],[28,60],[27,55],
          [28,50],[32,43],[39,39],[46,36],[52,34],[60,33],[64,29],[67,25],[76,23],[83,25],
          [92,27],[98,25],[107,21],[116,21],[123,19],[129,15],[139,14],[147,15],[158,20],
          [168,24],[174,26],[178,29],[178,35],[178,39],[184,42],[191,47],[196,51],[198,54],
          [203,59],[214,63],[221,67],[226,71],[228,77],[224,83],[219,87],[214,90],[213,94],
          [209,98],[202,101],[193,104],[185,104],[177,105],[167,106],[154,106],[146,105],
          [140,104],[131,102],[123,102],[118,105],[113,109],[106,112],[100,113],[94,110],
          [85,106],[77,103],[67,104],[59,103],[52,102],[46,102],[42,104]],
        [[50,78],[60,78]],[[113,109],[110,107]]],trailRadii:[3.1,3.1,1.4,1.4],
      landmarks:[{id:"wetland",x:221,y:86,name:"湿地へ下る道",message:"山道の先に、睡蓮の池と葦の広がる水郷が見える。"}]},
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
  const isRegion=id=>Object.hasOwn(regions,id);
  const regionData=id=>regions[id]||regions.stream;
  function exitAt(x,y,region="stream"){
    const data=regionData(region);
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
  function onBridge(x,y,region="stream") { return regionData(region).bridges.some(b=>inRect(x,y,b)); }
  function waterType(x,y,region="stream") {
    if(!Number.isFinite(x)||!Number.isFinite(y)||x<2||x>238||y<2||y>133||onBridge(x,y,region))return null;
    return Object.entries(regionData(region).waters).find(([,poly])=>inside(x,y,poly))?.[0] || null;
  }
  function walkable(x,y,region="stream") {
    if(!Number.isFinite(x)||!Number.isFinite(y)||x<2||x>238||y<2||y>133)return false;
    const data=regionData(region);
    if(Life?.solid(x,y,region))return false;
    if(data.treeBases?.some(p=>((x-p.x)/p.rx)**2+((y-p.y)/p.ry)**2<=1))return false;
    if(onBridge(x,y,region))return true;
    if(waterType(x,y,region))return false;
    if(Life?.access(x,y,region))return true;
    if(inRect(x,y,data.returnGate))return true;
    if(data.trails.some((path,trail)=>path.slice(1).some((b,i)=>segmentDistance(x,y,path[i],b)<=(data.trailRadii?.[trail]??data.trailRadius??4))))return true;
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
    if(!walkable(x,y,region)||onBridge(x,y,region))return null;
    const [dx,dy]={up:[0,-1],right:[1,0],down:[0,1],left:[-1,0]}[direction]||[0,-1];
    const rays=[0,-.1875,.1875,-.375,.375].map(slope=>({slope,blocked:false}));
    for(let d=.5;d<=8;d+=.5)for(const ray of rays) {
      if(ray.blocked)continue;
      const px=x+dx*d-dy*ray.slope*d,py=y+dy*d+dx*ray.slope*d;
      if(onBridge(px,py,region)){ray.blocked=true;continue;}
      const type=waterType(px,py,region);
      if(type)return {zone:["stream","wetCreek"].includes(type)?"river":"lake",type,x:px,y:py};
      if(!walkable(px,py,region))ray.blocked=true;
    }
    return null;
  }
  function landmarkAt(x,y,region="stream") { return regionData(region).landmarks.find(p=>Math.hypot(x-p.x,y-p.y)<6)||null; }
  const names={stream:"星見渓流",pond:"木漏れ日の池",marsh:"葦の沼",highPond:"峠の池",highMarsh:"峠の沼",underground:"岩窟の地下湖",wetPond:"睡蓮の池",wetCreek:"砂底の小川",wetMarsh:"水郷の葦の沼"};
  const populations={
    stream:[{ugui:.13,iwana:.24,amago:.18,kajika:.22,yamame:.16,ayu:.12,moroko:.08},
      {ugui:.12,iwana:.28,amago:.28,kajika:.12,yamame:.16,nijimasu:.10,ayu:.04,unagi:.02},
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
  const spots=Object.keys(names).flatMap(type=>["shallow","mid","deep"].map((depth,i)=>({
    id:`mountain-${type}-${depth}`,zone:["stream","wetCreek"].includes(type)?"river":"lake",depth,
    name:`${names[type]}・${["岸際","流心・中層","淵・深場"][i]}`,
    role:`${names[type]}の${["浅場","中層","深場"][i]}`,weights:populations[type][i],
  })));
  const images={};let pendingScene;
  function paint(canvas,environment={},region="stream") {
    if(!canvas?.getContext)return;
    pendingScene=[canvas,{...environment},region];
    if(!images[region] && typeof Image!=="undefined") {
      const img=new Image();images[region]=img;img.decoding="async";
      img.onload=()=>{if(pendingScene?.[2]===region)paint(...pendingScene);};img.src=regionData(region).asset;
    }
    const image=images[region];
    const ctx=canvas.getContext("2d");ctx.save();ctx.imageSmoothingEnabled=false;
    if(image?.complete && image.naturalWidth>0)ctx.drawImage(image,0,0,canvas.width,canvas.height);
    else {ctx.fillStyle="#183b31";ctx.fillRect(0,0,canvas.width,canvas.height);}
    const tint=region==="cave"?null:{night:"rgba(9,20,48,.49)",evening:"rgba(115,46,23,.19)",morning:"rgba(255,220,159,.06)"}[environment.period||environment.time];
    if(tint){ctx.fillStyle=tint;ctx.fillRect(0,0,canvas.width,canvas.height);}ctx.restore();
  }
  return {width,height,asset,villageGate,returnGate,entry,villageReturn,bridge,waters,trails,
    landmarks,names,spots,regions,isRegion,regionData,exitAt,inRect,onBridge,waterType,walkable,moveTarget,atVillageGate,atReturnGate,fishingWater,landmarkAt,paint};
});
