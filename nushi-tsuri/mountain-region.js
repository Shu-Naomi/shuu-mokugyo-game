(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  root.ShuMountain = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";
  const width = 240, height = 135;
  const asset = "assets/mountain-world-v201.png";
  const villageGate = { left:116, right:132, top:2, bottom:10 };
  const returnGate = { left:140, right:156, top:125, bottom:133 };
  const entry = { x:148, y:128, direction:"up" };
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
    [[148,133],[147,124],[144,115],[145,101],[150,92],[162,80],[152,76],[139,73]],
    [[139,73],[156,71],[176,65],[180,59],[193,51],[201,46],[215,38],[219,30]],
    // West-bank trail, pond shore and northern pass.
    [[88,72],[84,69],[75,66],[69,63],[76,55],[78,46],[80,36],[84,31],
      [79,25],[76,18],[71,10],[73,2]],
    [[69,63],[59,59],[50,56],[42,54],[34,50],[25,47],[21,40],[24,32]],
    [[24,32],[31,26],[43,24],[59,23],[73,24],[79,25]],
    // The ridge follows the painted switchback, rather than crossing a cliff.
    [[215,38],[203,34],[192,29],[185,27],[177,19],[166,12],[155,7],[152,2]],
    // Marsh approach, with both banks reachable on foot.
    [[160,81],[167,84],[169,91],[172,101],[185,109],[197,117],[208,120],[220,113]],
    [[176,65],[184,73],[185,77],[198,76],[216,78],[228,84],[230,95],[225,108],[220,113]],
  ];
  const landmarks = [
    { id:"pass", x:73, y:8, name:"北の峠", message:"尾根を渡る風が、遠くの森の匂いを運んでくる。" },
    { id:"cave", x:219, y:30, name:"岩窟の入口", message:"岩窟の奥から、かすかな水音が聞こえる。" },
  ];
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
  function onBridge(x,y) { return inRect(x,y,bridge); }
  function waterType(x,y) {
    if(!Number.isFinite(x)||!Number.isFinite(y)||x<2||x>238||y<2||y>133||onBridge(x,y))return null;
    return Object.keys(waters).find(id=>inside(x,y,waters[id])) || null;
  }
  function walkable(x,y) {
    if(!Number.isFinite(x)||!Number.isFinite(y)||x<2||x>238||y<2||y>133)return false;
    if(onBridge(x,y))return true;
    if(waterType(x,y))return false;
    if(inRect(x,y,returnGate))return true;
    if(trails.some(path=>path.slice(1).some((b,i)=>segmentDistance(x,y,path[i],b)<=4)))return true;
    // Dry stone banks remain available for fishing. The waterfall is cliff-bound.
    return Object.entries(waters).some(([id,poly])=>(id!=="stream"||y>=26) && edgeDistance(x,y,poly)<=6);
  }
  function atVillageGate(x,y) { return inRect(x,y,villageGate); }
  function atReturnGate(x,y) { return inRect(x,y,returnGate); }
  function fishingWater(x,y,direction="up") {
    if(!walkable(x,y)||onBridge(x,y))return null;
    const [dx,dy]={up:[0,-1],right:[1,0],down:[0,1],left:[-1,0]}[direction]||[0,-1];
    const rays=[0,-.1875,.1875,-.375,.375].map(slope=>({slope,blocked:false}));
    for(let d=.5;d<=8;d+=.5)for(const ray of rays) {
      if(ray.blocked)continue;
      const px=x+dx*d-dy*ray.slope*d,py=y+dy*d+dx*ray.slope*d;
      if(onBridge(px,py)){ray.blocked=true;continue;}
      const type=waterType(px,py);
      if(type)return {zone:type==="stream"?"river":"lake",type,x:px,y:py};
      if(!walkable(px,py))ray.blocked=true;
    }
    return null;
  }
  function landmarkAt(x,y) { return landmarks.find(p=>Math.hypot(x-p.x,y-p.y)<6)||null; }
  const names={stream:"星見渓流",pond:"木漏れ日の池",marsh:"葦の沼"};
  const populations={
    stream:[{yamame:.40,nijimasu:.21,ayu:.29,moroko:.10},
      {yamame:.32,nijimasu:.33,ayu:.25,unagi:.10},
      {yamame:.22,nijimasu:.37,unagi:.23,namazu:.18}],
    pond:[{moroko:.31,funa:.46,bass:.23},
      {funa:.38,koi:.24,bass:.28,namazu:.10},
      {koi:.43,funa:.19,bass:.20,namazu:.18}],
    marsh:[{funa:.40,bass:.33,moroko:.27},
      {bass:.35,namazu:.32,unagi:.19,funa:.14},
      {namazu:.36,unagi:.37,koi:.16,bass:.11}],
  };
  const spots=Object.keys(names).flatMap(type=>["shallow","mid","deep"].map((depth,i)=>({
    id:`mountain-${type}-${depth}`,zone:type==="stream"?"river":"lake",depth,
    name:`${names[type]}・${["岸際","流心・中層","淵・深場"][i]}`,
    role:`${names[type]}の${["浅場","中層","深場"][i]}`,weights:populations[type][i],
  })));
  let image,pendingScene;
  function paint(canvas,environment={}) {
    if(!canvas?.getContext)return;
    pendingScene=[canvas,{...environment}];
    if(!image && typeof Image!=="undefined") {
      image=new Image();image.decoding="async";
      image.onload=()=>{if(pendingScene)paint(...pendingScene);};image.src=asset;
    }
    const ctx=canvas.getContext("2d");ctx.save();ctx.imageSmoothingEnabled=false;
    if(image?.complete && image.naturalWidth>0)ctx.drawImage(image,0,0,canvas.width,canvas.height);
    else {ctx.fillStyle="#183b31";ctx.fillRect(0,0,canvas.width,canvas.height);}
    const tint={night:"rgba(9,20,48,.49)",evening:"rgba(115,46,23,.19)",morning:"rgba(255,220,159,.06)"}[environment.period||environment.time];
    if(tint){ctx.fillStyle=tint;ctx.fillRect(0,0,canvas.width,canvas.height);}ctx.restore();
  }
  return {width,height,asset,villageGate,returnGate,entry,villageReturn,bridge,waters,trails,
    landmarks,names,spots,inRect,onBridge,waterType,walkable,atVillageGate,atReturnGate,fishingWater,landmarkAt,paint};
});
