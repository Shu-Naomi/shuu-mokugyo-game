(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  root.ShuMountain = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
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
      waters:{highPond:[[89,32],[104,29],[126,29],[145,34],[166,39],[187,48],[199,62],[194,78],[179,90],[157,97],[137,100],[113,98],[91,94],[69,87],[50,76],[44,60],[52,46],[69,39]]},
      trails:[[[120,133],[123,119],[120,109],[101,110],[78,107],[56,98],[42,87],[31,73],[30,56],[40,42],[57,33],[75,25],[97,23],[120,22],[145,24],[170,30],[194,39],[210,51],[216,68],[210,83],[196,95],[176,103],[153,108],[134,109],[120,109]],
        [[210,51],[214,41],[222,32],[225,23],[224,12],[224,2]]],
      landmarks:[{id:"marsh",x:224,y:8,name:"沼へ続く尾根",message:"尾根の先に、葦の揺れる水辺が見える。"}]},
    mountainMarsh:{asset:"assets/pass-marsh-v202.png",name:"峠の沼",entry:{x:43,y:128,direction:"up"},
      returnGate:{left:35,right:51,top:122,bottom:133},bridges:[],
      waters:{highMarsh:[[73,26],[95,28],[114,23],[139,24],[157,28],[169,34],[173,44],[185,53],[198,63],[207,74],[198,86],[180,99],[158,102],[142,102],[125,107],[111,103],[93,98],[73,96],[60,90],[55,79],[44,65],[43,50],[55,38],[65,32]]},
      trails:[[[43,133],[41,118],[45,107],[51,99],[44,86],[37,72],[29,58],[34,45],[44,34],[59,26],[71,21],[84,20],[97,23],[113,18],[133,16],[151,19],[166,24],[177,37],[180,47],[195,54],[211,61],[225,73],[225,86],[217,95],[202,103],[183,109],[160,108],[143,112],[130,110],[115,114],[96,107],[80,103],[64,104],[51,99]]],landmarks:[]},
    cave:{asset:"assets/cave-lake-v202.png",name:"岩窟の地下湖",entry:{x:120,y:128,direction:"up"},
      returnGate:{left:112,right:128,top:122,bottom:133},bridges:[],
      waters:{underground:[[90,18],[112,17],[136,19],[157,23],[176,27],[192,33],[207,42],[217,55],[219,71],[210,86],[192,98],[169,102],[146,105],[126,106],[104,103],[88,99],[69,94],[53,88],[37,77],[28,63],[31,47],[42,37],[58,29],[74,24]]},
      trails:[[[120,133],[122,120],[120,112],[97,112],[77,108],[56,101],[39,91],[25,78],[19,59],[29,42],[47,27],[74,16],[101,13],[132,13],[160,17],[187,23],[211,35],[226,49],[229,69],[221,87],[207,99],[186,109],[161,114],[138,114],[120,112]]],landmarks:[]},
  };
  const isRegion=id=>Object.hasOwn(regions,id);
  const regionData=id=>regions[id]||regions.stream;
  function exitAt(x,y,region="stream"){
    const data=regionData(region);
    if(inRect(x,y,data.returnGate))return region==="stream"
      ?{region:"village",...villageReturn}:region==="mountainMarsh"
        ?{region:"mountainPond",x:224,y:12,direction:"down"}:region==="cave"
          ?{region:"stream",x:215,y:34,direction:"down"}:{region:"stream",x:73,y:12,direction:"down"};
    const landmark=data.landmarks.find(p=>Math.hypot(x-p.x,y-p.y)<6);
    if(landmark?.id==="pass")return {region:"mountainPond",...regions.mountainPond.entry};
    if(landmark?.id==="cave")return {region:"cave",...regions.cave.entry};
    if(landmark?.id==="marsh")return {region:"mountainMarsh",...regions.mountainMarsh.entry};
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
    if(data.treeBases?.some(p=>((x-p.x)/p.rx)**2+((y-p.y)/p.ry)**2<=1))return false;
    if(onBridge(x,y,region))return true;
    if(waterType(x,y,region))return false;
    if(inRect(x,y,data.returnGate))return true;
    if(data.trails.some(path=>path.slice(1).some((b,i)=>segmentDistance(x,y,path[i],b)<=(data.trailRadius||4))))return true;
    // Dry stone banks remain available for fishing. The waterfall is cliff-bound.
    return Object.entries(data.waters).some(([id,poly])=>(id!=="stream"||y>=26) && edgeDistance(x,y,poly)<=6);
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
      if(type)return {zone:type==="stream"?"river":"lake",type,x:px,y:py};
      if(!walkable(px,py,region))ray.blocked=true;
    }
    return null;
  }
  function landmarkAt(x,y,region="stream") { return regionData(region).landmarks.find(p=>Math.hypot(x-p.x,y-p.y)<6)||null; }
  const names={stream:"星見渓流",pond:"木漏れ日の池",marsh:"葦の沼",highPond:"峠の池",highMarsh:"峠の沼",underground:"岩窟の地下湖"};
  const populations={
    stream:[{iwana:.24,amago:.18,kajika:.22,yamame:.16,ayu:.12,moroko:.08},
      {iwana:.28,amago:.28,kajika:.12,yamame:.16,nijimasu:.10,ayu:.04,unagi:.02},
      {iwana:.31,amago:.15,kajika:.26,yamame:.08,nijimasu:.12,unagi:.04,namazu:.04}],
    pond:[{moroko:.31,funa:.46,bass:.23},
      {funa:.38,koi:.24,bass:.28,namazu:.10},
      {koi:.43,funa:.19,bass:.20,namazu:.18}],
    marsh:[{funa:.40,bass:.33,moroko:.27},
      {bass:.35,namazu:.32,unagi:.19,funa:.14},
      {namazu:.36,unagi:.37,koi:.16,bass:.11}],
  };
  populations.highPond=populations.pond;populations.highMarsh=populations.marsh;
  populations.underground=[{funa:.45,koi:.2,namazu:.2,unagi:.15},{namazu:.4,unagi:.35,koi:.15,funa:.1},{namazu:.42,unagi:.38,koi:.15,funa:.05}];
  const spots=Object.keys(names).flatMap(type=>["shallow","mid","deep"].map((depth,i)=>({
    id:`mountain-${type}-${depth}`,zone:type==="stream"?"river":"lake",depth,
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
