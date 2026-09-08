/* Starfall Lake — original, code-drawn pixel scenery. No landscape bitmaps.
 * Coordinates and collision geometry come from the game. Integer drawing,
 * seeded decoration and cached scene layers keep art out of gameplay RNG.
 */
(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  else root.ShuPixel = api;
})(typeof globalThis === "object" ? globalThis : this, function () {
  "use strict";
  const SEASON_DAYS = 30;
  const seasons = ["spring", "summer", "autumn", "winter"];
  const periods = ["dawn", "morning", "day", "evening", "night"];
  const seasonNames = ["春", "夏", "秋", "冬"];
  const periodNames = { dawn: "明け方", morning: "朝", day: "昼", evening: "夕", night: "夜" };
  function calendar(minutes = 360) {
    const total = Number.isFinite(Number(minutes)) ? Math.max(0, Math.floor(Number(minutes))) : 360;
    const day = Math.floor(total / 1440), time = total % 1440;
    const seasonIndex = Math.floor(day / SEASON_DAYS) % 4;
    const period = time >= 240 && time < 360 ? "dawn" : time >= 360 && time < 600 ? "morning"
      : time >= 600 && time < 1020 ? "day" : time >= 1020 && time < 1140 ? "evening" : "night";
    return { season: seasons[seasonIndex], seasonLabel: seasonNames[seasonIndex],
      seasonDay: day % SEASON_DAYS + 1, year: Math.floor(day / (SEASON_DAYS * 4)) + 1,
      period, periodLabel: periodNames[period], key: seasons[seasonIndex] + ":" + period };
  }
  const base = {
    ink: "#202d35", dark: "#263e42", wood0: "#483c32", wood1: "#76503b", wood2: "#ab7650", wood3: "#d1a777",
    cream: "#e1cd98", roof0: "#293e50", roof1: "#3a596b", roof2: "#5b7d89", roof3: "#99afad",
    stone0: "#56655f", stone1: "#859281", stone2: "#b7baa0", sand0: "#b99561", sand1: "#d5b77d", sand2: "#eddaa2",
    grass0: "#456140", grass1: "#6c894c", grass2: "#9fb768", leaf0: "#254c3d", leaf1: "#3f7544", leaf2: "#6a9a4d", leaf3: "#a4bb64",
    water0: "#174d63", water1: "#286e84", water2: "#418fa1", water3: "#79b7b6", foam: "#bedbcc",
    blue: "#43799d", red: "#b95445", gold: "#e0b86e", sky0: "#709dad", sky1: "#a7c9c4", sky2: "#d8ddbd", cloud: "#e7e8ca",
    bloom: "#e8a9ac", lamp: "#ffe6a0", snow: "#e2e7dc",
  };
  const seasonal = {
    spring: {},
    summer: { grass0: "#375943", grass1: "#567b43", grass2: "#88a859", leaf0: "#204b40", leaf1: "#316b43", leaf2: "#599345", leaf3: "#92b957", sky0: "#518ca5", sky1: "#9bc2c5" },
    autumn: { grass0: "#74633f", grass1: "#a18a4c", grass2: "#c7a55b", leaf0: "#693f36", leaf1: "#9e583c", leaf2: "#ce7d46", leaf3: "#e5b060", bloom: "#dd9d50", sky0: "#6f93a3", sky1: "#b9c7bf" },
    winter: { grass0: "#899b9e", grass1: "#ccd7d1", grass2: "#e7ece0", leaf0: "#364f53", leaf1: "#617c7b", leaf2: "#aebfba", leaf3: "#e3e9db", sand0: "#9ba9a6", sand1: "#bdc9c3", sand2: "#e0e5d8", sky0: "#738a9e", sky1: "#bccdd0", sky2: "#e0e3d8", bloom: "#d2dfdf" },
  };
  const timeTints = { dawn: ["#786388", .29], morning: ["#c8d4c2", .06], day: ["#ffffff", 0], evening: ["#a45357", .29], night: ["#152641", .62] };
  function mix(a, b, t) {
    const aa = parseInt(a.slice(1), 16), bb = parseInt(b.slice(1), 16);
    return "#" + [16, 8, 0].map((shift) => Math.round(((aa >> shift) & 255) * (1 - t) + ((bb >> shift) & 255) * t).toString(16).padStart(2, "0")).join("");
  }
  function palette(env = calendar(), indoors = false) {
    const p = { ...base, ...(seasonal[env.season] || {}) };
    const waterColors = {
      spring: ["#174d63", "#286e84", "#418fa1", "#79b7b6"],
      summer: ["#175467", "#247988", "#469faa", "#90c4bd"],
      autumn: ["#294c61", "#376c81", "#5791a0", "#99b9b6"],
      winter: ["#274563", "#456a87", "#6b99af", "#b0c7cf"],
    }[env.season] || [base.water0,base.water1,base.water2,base.water3];
    waterColors.forEach((color,i)=>{p['water'+i]=color;});
    const [tint, amount] = timeTints[env.period] || timeTints.day;
    for (const key of Object.keys(p)) p[key] = mix(p[key], tint, indoors ? amount * .42 : amount);
    if (env.period === "dawn") Object.assign(p, { sky0: "#555576", sky1: "#ad8495", sky2: "#efd2a5", cloud: "#c6a5b1" });
    if (env.period === "evening") Object.assign(p, { sky0: "#656980", sky1: "#c48679", sky2: "#ecc58f", cloud: "#d6a39a" });
    if (env.period === "night") Object.assign(p, { sky0: "#14273f", sky1: "#263d57", sky2: "#486078", cloud: "#425369" });
    p.lamp = ["night", "dawn", "evening"].includes(env.period) ? "#f5ce86" : p.sky1;
    return p;
  }
  function hash(x, y, seed = 0) {
    let n = Math.imul(x + seed * 17, 374761393) ^ Math.imul(y + seed, 668265263);
    n = Math.imul(n ^ (n >>> 13), 1274126177);
    return ((n ^ (n >>> 16)) >>> 0) / 4294967296;
  }
  function painter(ctx) {
    ctx.imageSmoothingEnabled = false;
    const rect = (x, y, w, h, color) => {
      ctx.fillStyle = color; ctx.fillRect(Math.round(x), Math.round(y), Math.max(1, Math.round(w)), Math.max(1, Math.round(h)));
    };
    function line(x0, y0, x1, y1, color, width = 1) {
      x0 = Math.round(x0); y0 = Math.round(y0); x1 = Math.round(x1); y1 = Math.round(y1);
      const dx = Math.abs(x1 - x0), sx = x0 < x1 ? 1 : -1, dy = -Math.abs(y1 - y0), sy = y0 < y1 ? 1 : -1;
      let error = dx + dy;
      for (let i = 0; i < 10000; i++) {
        rect(x0 - Math.floor(width / 2), y0 - Math.floor(width / 2), width, width, color);
        if (x0 === x1 && y0 === y1) break;
        const e = error * 2;
        if (e >= dy) { error += dy; x0 += sx; }
        if (e <= dx) { error += dx; y0 += sy; }
      }
    }
    function poly(points, color) {
      const minY = Math.floor(Math.min(...points.map(p => p[1]))), maxY = Math.ceil(Math.max(...points.map(p => p[1])));
      for (let y = minY; y < maxY; y++) {
        const edges = [];
        for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
          const [ax, ay] = points[i], [bx, by] = points[j];
          if ((ay <= y && by > y) || (by <= y && ay > y)) edges.push(ax + (y - ay) * (bx - ax) / (by - ay));
        }
        edges.sort((a, b) => a - b);
        for (let i = 0; i + 1 < edges.length; i += 2) rect(Math.ceil(edges[i]), y, Math.max(1, Math.floor(edges[i + 1]) - Math.ceil(edges[i])), 1, color);
      }
    }
    function oval(x, y, rx, ry, color) {
      for (let row = -Math.ceil(ry); row <= ry; row++) {
        const span = Math.round(rx * Math.sqrt(Math.max(0, 1 - (row * row) / (ry * ry))));
        if (span) rect(x - span, y + row, span * 2 + 1, 1, color);
      }
    }
    return { ctx, rect, line, poly, oval };
  }
  function frame(d, x, y, w, h, p, fill = p.wood1) {
    d.rect(x, y, w, h, p.ink); d.rect(x + 1, y + 1, w - 2, h - 2, p.wood3);
    d.rect(x + 2, y + 3, w - 4, h - 5, fill);
  }
  function boards(d, x, y, w, h, p, stone = false) {
    d.rect(x, y, w, h, stone ? p.stone1 : p.wood2);
    const row = stone ? 7 : 6;
    for (let yy = 0; yy < h; yy += row) {
      d.rect(x, y + yy, w, 1, stone ? p.stone0 : p.wood1);
      for (let xx = (yy / row % 2) * 12; xx < w; xx += stone ? 19 : 39) {
        d.rect(x + xx, y + yy + 1, 1, Math.min(row - 1, h - yy - 1), stone ? p.stone0 : p.wood1);
        if (xx + 4 < w) d.rect(x + xx + 2, y + yy + 2, Math.min(stone ? 8 : 22, w - xx - 3), 1, stone ? p.stone2 : p.wood3);
      }
    }
  }
  function windowTile(d, x, y, w, h, p) {
    frame(d, x, y, w, h, p, p.blue);
    d.rect(x + 3, y + 4, w - 6, Math.max(2, h * .3), p.lamp);
    d.rect(x + 3, y + h * .67, w - 6, Math.max(1, h * .12), p.water0);
    d.rect(x + 4, y + 5, Math.max(1, w * .12), Math.max(2, h * .25), p.foam);
    d.rect(x + w / 2, y + 2, 2, h - 3, p.wood1); d.rect(x + 2, y + h / 2, w - 4, 2, p.wood1);
    d.rect(x - 1, y + h, w + 2, 2, p.wood3);
  }
  function pot(d, x, y, size, p, flower = false) {
    d.rect(x - size * .45, y - size * .45, size * .9, size * .4, p.wood1);
    d.rect(x - size * .35, y - size * .3, size * .7, size * .3, p.wood2);
    d.oval(x, y - size * .6, size * .6, size * .35, p.leaf0);
    for (let i = 0; i < 7; i++) {
      const xx = x + (hash(i, 9) - .5) * size, yy = y - size * (.5 + hash(i, 3) * .5);
      d.rect(xx, yy, 3, 2, i % 3 ? p.leaf2 : flower ? p.bloom : p.leaf3);
    }
  }
  function barrel(d, x, y, w, h, p, open = false) {
    d.rect(x + 2, y - h, w - 4, h, p.ink); d.rect(x, y - h + 3, w, h - 6, p.wood1);
    for (let i = 2; i < w - 2; i += 4) d.rect(x + i, y - h + 3, 2, h - 4, p.wood2);
    d.rect(x, y - h + 4, w, 2, p.stone1); d.rect(x, y - 5, w, 2, p.stone0);
    d.oval(x + w / 2, y - h + 2, w / 2, 3, open ? p.dark : p.wood3);
  }
  function crate(d, x, y, w, h, p) {
    frame(d, x, y - h, w, h, p); d.line(x + 3, y - h + 4, x + w - 4, y - 4, p.wood3, 2);
    d.rect(x + 3, y - h + 3, w - 6, 2, p.wood2); d.rect(x + 3, y - 4, w - 6, 2, p.wood2);
  }
  function rocks(d, x, y, size, p) {
    d.oval(x, y, size, size * .3, p.grass0);
    d.poly([[x-size,y-2],[x-size*.6,y-size*.6],[x+size*.4,y-size*.75],[x+size,y-2],[x+size*.6,y+2],[x-size*.5,y+2]],p.stone0);
    d.poly([[x-size*.7,y-3],[x-size*.5,y-size*.5],[x+size*.4,y-size*.6],[x+size*.7,y-3]],p.stone2);
    d.line(x - size * .3, y - size * .45, x + size * .2, y - size * .5, p.stone1);
  }
  function tree(d, x, y, size, p, env, seed = 0) {
    d.oval(x, y + 1, size * .42, size * .14, p.grass0);
    d.rect(x - 3, y - size * .55, 7, size * .55, p.wood0); d.rect(x, y - size * .48, 2, size * .44, p.wood2);
    d.line(x, y - size * .28, x - size * .15, y - size * .57, p.wood1, 2);
    const blossom = env.season === "spring" && seed % 3 === 0;
    const colors = blossom ? [p.leaf0, mix(p.bloom,p.wood1,.4),p.bloom,mix(p.bloom,p.cream,.45)] : [p.leaf0,p.leaf1,p.leaf2,p.leaf3];
    for (const [cx, cy, rx, ry] of [[0,-.63,.42,.31],[-.22,-.49,.23,.21],[.23,-.49,.23,.24],[0,-.87,.24,.18]]) {
      d.oval(x+cx*size,y+cy*size,rx*size,ry*size,colors[0]);
      d.oval(x+(cx-.035)*size,y+(cy-.04)*size,rx*size*.84,ry*size*.8,colors[1]);
    }
    for (let i=0;i<45;i++) {
      const angle=hash(i,seed)*Math.PI*2, r=Math.sqrt(hash(i,seed+7));
      const xx=x+Math.cos(angle)*r*size*.36, yy=y-size*.65+Math.sin(angle)*r*size*.29;
      d.rect(xx,yy,3+hash(i,seed+3)*5,2+hash(i,seed+4)*3,colors[i%4===0?3:2]);
    }
    if(env.season==="winter") for(let i=0;i<5;i++) d.rect(x-size*.27+i*size*.11,y-size*(.74+hash(i,seed)*.15),size*.16,3,p.snow);
  }
  const worldTrees = [
    [9,13],[18,21],[9,33],[22,39],[11,46],[21,59],[12,68],[22,94],[10,104],
    [59,12],[68,23],[60,39],[69,49],[59,59],[60,96],[86,94],[87,65],
    [171,14],[170,28],[174,44],[162,51],[221,12],[231,20],[221,35],[232,44],[219,55],[231,62],
  ].map(([x,y],i)=>({x,y,size:8+(i%3),seed:i}));
  const worldPaths = [
    [[2,79],[98,79]],[[120,80],[216,94]],[[43,34],[61,34],[68,48],[79,79]],
    [[40,65],[42,79]],[[78,77],[85,102],[68,110]],[[124,80],[141,53],[164,47],[175,65],[195,67]],
    [[174,65],[178,34],[198,33]],[[145,78],[151,82],[145,106],[135,123]],
    [[57,33],[78,15],[112,10],[154,14],[177,34]],
  ];
  function onPath(x,y) {
    return worldPaths.some(points=>points.some((b,i)=>{
      if(!i)return false;const a=points[i-1],dx=b[0]-a[0],dy=b[1]-a[1];
      const t=Math.max(0,Math.min(1,((x-a[0])*dx+(y-a[1])*dy)/(dx*dx+dy*dy)));
      return Math.hypot(x-a[0]-t*dx,y-a[1]-t*dy)<3.4;
    }));
  }
  function propSolid(x,y) { return worldTrees.some(t=>Math.abs(x-t.x)<1.1&&Math.abs(y-t.y)<.65); }
  function worldTile(x,y,g) {
    if(g.isPracticePondWater(x,y))return "pond";
    if(g.isLakeWater(x,y))return "lake";
    if(g.isRiverWater(x,y))return "river";
    if(g.isSeaWater(x,y))return "sea";
    if(g.isOnRiverBridge(x,y)||g.isOnLakeDock(x,y)||g.isOnHarborWalkway(x,y))return "pier";
    if(x>121&&y>94)return "stone";
    if(y>g.seaWaterY(x)-10)return "sand";
    if(onPath(x,y))return "path";
    return "grass";
  }
  function roof(d,x,y,w,h,p,env) {
    d.poly([[x-3,y+h],[x+w*.18,y],[x+w*.82,y],[x+w+3,y+h]],p.ink);
    for(let row=2;row<h-1;row+=4) {
      const inset=(1-row/h)*w*.18;
      d.rect(x+inset,y+row,w-inset*2,3,p.roof1);
      d.rect(x+inset,y+row,w-inset*2,1,p.roof2);
      for(let xx=inset+2;xx<w-inset-2;xx+=7)d.rect(x+xx,y+row,1,3,p.roof0);
    }
    d.rect(x-4,y+h,w+8,3,p.wood0);d.rect(x-4,y+h,w+8,1,p.roof3);
    d.rect(x+w*.18-2,y-2,w*.64+4,3,p.roof2);
    if(env.season==="winter"){
      d.rect(x+w*.18,y-2,w*.64,2,p.snow);d.rect(x-2,y+h-1,w+4,2,p.snow);
    }
  }
  function building(d,b,p,env,scale=4) {
    const x=b.left*scale,y=b.top*scale,w=(b.right-b.left)*scale,h=(b.bottom-b.top)*scale;
    if(b.id==="quest-board"){
      d.rect(x+2,y+4,3,h,p.wood0);d.rect(x+w-5,y+4,3,h,p.wood0);frame(d,x,y,w,h-3,p);
      for(let i=0;i<3;i++)d.rect(x+4+i*5,y+4,4,h-10,i%2?p.sand2:p.cream);roof(d,x-1,y-5,w+2,5,p,env);return;
    }
    const shrine=b.id.includes("shrine"), bodyY=y+h*.38,bodyH=h*.62;
    d.poly([[x+5,y+h],[x+w+2,y+h],[x+w+9,y+h+5],[x+10,y+h+5]],p.grass0);
    d.rect(x+3,bodyY+4,w-6,bodyH-3,p.ink);boards(d,x+5,bodyY+2,w-10,bodyH-4,p);
    d.rect(x+7,bodyY+3,w-14,bodyH*.46,shrine?p.red:p.cream);
    for(let xx=7;xx<w-3;xx+=Math.max(15,w/4))d.rect(x+xx,bodyY+1,3,bodyH-2,p.wood0);
    const doorH=Math.min(29,bodyH-6),doorW=Math.min(17,w*.22),doorX=x+w*.51-doorW/2;
    frame(d,doorX,y+h-doorH,doorW,doorH,p,p.wood0);
    for(let xx=3;xx<doorW-2;xx+=4)d.rect(doorX+xx,y+h-doorH+3,1,doorH-5,p.wood2);
    d.rect(doorX+doorW-4,y+h-doorH*.4,2,2,p.gold);
    if(w>45){windowTile(d,x+10,bodyY+9,Math.min(20,w*.23),Math.min(20,bodyH*.5),p);windowTile(d,x+w-29,bodyY+9,18,Math.min(20,bodyH*.5),p);}
    roof(d,x,y,w,h*.38,p,env);
    d.rect(x+3,y+h-2,w-6,3,p.stone0);
    if(shrine){
      d.rect(x+w*.24,bodyY+2,w*.53,2,p.gold);
      d.line(x+w*.49,bodyY+4,x+w*.49,bodyY+15,p.cream,2);
      d.rect(x+w*.46,bodyY+13,6,4,p.gold);
    }
    if(["sam-shop","yaoya","diner","fish-market","harbor-shop"].includes(b.id)){
      const c=b.id==="yaoya"?p.leaf1:b.id==="diner"?p.red:p.blue;
      d.rect(x+5,bodyY-1,w-10,7,c);
      for(let xx=6;xx<w-6;xx+=10)d.rect(x+xx,bodyY-1,4,7,p.cream);
      frame(d,x+w*.32,y+h*.29,w*.38,8,p,p.wood0);
      const label={"sam-shop":"SAM","yaoya":"VEG","diner":"DINER","fish-market":"FISH","harbor-shop":"BOAT"}[b.id];
      text(d,label,x+w*.33+2,y+h*.29+2,p.cream);
    }
    if(b.id==="watermill"){
      d.oval(x+w-7,y+h-17,15,15,p.wood0);d.oval(x+w-7,y+h-17,12,12,p.wood2);d.oval(x+w-7,y+h-17,8,8,p.dark);
      for(let a=0;a<8;a++){const angle=a*Math.PI/4;d.line(x+w-7,y+h-17,x+w-7+Math.cos(angle)*14,y+h-17+Math.sin(angle)*14,p.wood3,2);}
    }
    if(b.id==="yaoya"){
      for(let i=0;i<3;i++){crate(d,x+7+i*10,y+h-3,9,8,p);d.oval(x+11+i*10,y+h-9,3,2,[p.red,p.leaf2,p.cream][i]);}
    }else if(b.id==="sam-shop"){
      for(let i=0;i<3;i++)d.line(x+7+i*3,y+h-4,x+12+i*3,bodyY+5,p.wood3);
    }else if(b.id==="diner"){
      d.rect(x+w-11,bodyY+8,5,10,p.ink);d.rect(x+w-10,bodyY+9,3,7,p.gold);
    }else if(b.id==="fish-market"){
      d.rect(x+5,y+h-9,w*.24,6,p.wood1);d.rect(x+6,y+h-9,w*.22,3,p.foam);
      for(let i=0;i<3;i++)d.rect(x+8+i*5,y+h-8,4,1,p.blue);
    }
  }
  const font={A:["010","101","111","101","101"],B:["110","101","110","101","110"],C:["011","100","100","100","011"],D:["110","101","101","101","110"],E:["111","100","110","100","111"],F:["111","100","110","100","100"],G:["011","100","101","101","011"],H:["101","101","111","101","101"],I:["111","010","010","010","111"],K:["101","101","110","101","101"],L:["100","100","100","100","111"],M:["10101","11111","10101","10101","10101"],N:["1001","1101","1011","1001","1001"],O:["010","101","101","101","010"],P:["110","101","110","100","100"],R:["110","101","110","101","101"],S:["011","100","010","001","110"],T:["111","010","010","010","010"],U:["101","101","101","101","111"],V:["101","101","101","101","010"],W:["10101","10101","10101","11111","01010"],Y:["101","101","010","010","010"]};
  function text(d,value,x,y,color) {
    for(const char of value){const glyph=font[char];if(glyph)glyph.forEach((row,j)=>[...row].forEach((cell,i)=>{if(cell==="1")d.rect(x+i,y+j,1,1,color);}));x+=(glyph?.[0].length||2)+1;}
  }
  function boat(d,x,y,size,p) {
    d.poly([[x-size,y],[x-size*.7,y-size*.35],[x+size*.65,y-size*.35],[x+size,y],[x+size*.6,y+size*.25],[x-size*.65,y+size*.2]],p.ink);
    d.poly([[x-size*.85,y-1],[x-size*.6,y-size*.25],[x+size*.55,y-size*.25],[x+size*.85,y],[x+size*.55,y+size*.12],[x-size*.6,y+size*.1]],p.wood2);
    d.rect(x-size*.5,y-size*.15,size,3,p.wood0);d.rect(x-2,y-size*.23,4,size*.36,p.cream);
  }
  function drawWorld(canvas,g,env=calendar()) {
    const d=painter(canvas.getContext("2d")),p=palette(env),scale=4;
    canvas.width=960;canvas.height=540;d.ctx.imageSmoothingEnabled=false;
    for(let y=0;y<540;y+=4)for(let x=0;x<960;x+=4){
      const kind=worldTile((x+2)/scale,(y+2)/scale,g),n=hash(x/4,y/4,31);
      const wet=["pond","lake","river","sea"].includes(kind);
      const colors=wet?[p.water0,p.water1,p.water2]:kind==="grass"?[p.grass0,p.grass1,p.grass2]:kind==="pier"?[p.wood1,p.wood2,p.wood3]:kind==="stone"?[p.stone0,p.stone1,p.stone2]:[p.sand0,p.sand1,p.sand2];
      d.rect(x,y,4,4,kind==="grass"&&hash(x/24|0,y/24|0,16)>.7?mix(p.grass1,p.grass2,.13):colors[1]);
      if(wet){if(n>.75)d.rect(x,y+2,n>.95?4:2,1,colors[n>.96?2:0]);}
      else if(kind==="pier"){d.rect(x,y+3,4,1,colors[0]);if(n>.5)d.rect(x+1,y+1,2,1,colors[2]);}
      else if(kind==="stone"){if((y/4)%2===0)d.rect(x,y+3,4,1,colors[0]);if((x/4+(y/8|0)%2)%3===0)d.rect(x,y,1,3,colors[0]);}
      else if(n>(kind==="grass"?.88:.7)){d.rect(x+1,y+1,2,1,colors[n>.97?2:0]);if(kind==="grass"&&n>.985)d.rect(x+2,y,1,3,colors[2]);}
    }
    // Riprap/reeds lie inside water, leaving every shore approach clear.
    for(let y=3;y<134;y+=2)for(let x=2;x<239;x+=2){
      const kind=worldTile(x,y,g);if(!["lake","river","sea","pond"].includes(kind))continue;
      const bank=[[1,0],[-1,0],[0,1],[0,-1]].some(([dx,dy])=>!["lake","river","sea","pond"].includes(worldTile(x+dx,y+dy,g)));
      if(bank){d.rect(x*4,y*4,5,1,p.foam);if(hash(x,y)>.65)d.rect(x*4+1,y*4+1,3,2,p.water3);}
    }
    for(const bounds of g.structureBounds)building(d,bounds,p,env);
    // The game's doorway and corner cut-outs are drawn as actual paving.
    for(const b of [g.mainShrineApproachBounds,g.samShopApproachBounds,g.harborCornerPassageBounds])
      boards(d,b.left*4,b.top*4,(b.right-b.left)*4,(b.bottom-b.top)*4,p,true);
    for(const t of worldTrees)if(!g.isBlockedStructure(t.x,t.y))tree(d,t.x*4,t.y*4,t.size*4,p,env,t.seed);
    // Flowers/leaves are ground details; never invisible collision objects.
    for(let i=0;i<340;i++){
      const x=4+hash(i,2)*232,y=5+hash(i,3)*104;
      if(worldTile(x,y,g)!=="grass"||g.isBlockedStructure(x,y))continue;
      d.rect(x*4,y*4,2,2,env.season==="winter"?p.snow:env.season==="autumn"?p.leaf2:p.bloom);
      if(env.season!=="winter")d.rect(x*4,y*4+2,1,2,p.leaf0);
    }
    boat(d,183*4,119*4,22,p);boat(d,165*4,126*4,17,p);boat(d,236*4,124*4,17,p);
    d.rect(11,307,3,13,p.wood0);frame(d,3,299,25,12,p);d.line(9,305,21,305,p.cream,2);d.line(9,305,13,302,p.cream);d.line(9,305,13,308,p.cream);
    text(d,"HOME",5,292,p.cream);
    return {width:960,height:540};
  }
  function sky(d,w,h,p,env) {
    for(let row=0;row<12;row++){
      const t=row/11,color=t<.5?mix(p.sky0,p.sky1,t*2):mix(p.sky1,p.sky2,(t-.5)*2);
      d.rect(0,h*row/12,w,h/12+1,color);
    }
    if(env.period==="night"){
      for(let i=0;i<64;i++)if(hash(i,73)>.3)d.rect(hash(i,8)*w,hash(i,9)*h*.8,1,1,i%5?p.roof3:p.cream);
      d.oval(w*.77,h*.33,7,7,p.cream);d.oval(w*.77+3,h*.33-2,6,6,p.sky0);
    }else{
      const sy=env.period==="dawn"||env.period==="evening"?h*.85:h*.31;
      d.oval(w*(env.period==="evening"?.73:.27),sy,8,8,p.gold);
      for(let i=0;i<7;i++){const x=hash(i,3)*w,y=8+hash(i,7)*h*.55;
        d.rect(x,y,23,3,p.cloud);d.rect(x+6,y-3,12,3,p.cloud);d.rect(x-5,y+3,35,2,p.cloud);}
    }
  }
  function mountains(d,w,y,p,env) {
    for(let layer=0;layer<3;layer++){
      const pts=[[0,y+18]];
      for(let x=0;x<=w+20;x+=20)pts.push([x,y-15-layer*3-hash(x,layer+33)*(28-layer*6)]);
      pts.push([w,y+18]);d.poly(pts,[mix(p.roof2,p.sky1,.5),p.leaf1,p.leaf0][layer]);
    }
    if(env.season==="winter")for(let i=0;i<5;i++)d.poly([[i*w/5,y-39],[i*w/5-6,y-30],[i*w/5+6,y-31]],p.snow);
  }
  function water(d,x,y,w,h,p,seed=5) {
    d.rect(x,y,w,h,p.water1);
    for(let yy=0;yy<h;yy+=3)for(let xx=0;xx<w;xx+=7){const n=hash(xx,yy,seed);
      if(n>.62)d.rect(x+xx,y+yy,Math.min(w-xx,2+n*8),1,n>.87?p.water3:p.water0);}
  }
  function reeds(d,x,y,p,env) {
    for(let i=0;i<5;i++){const xx=x+i*3,top=y-7-hash(i,x)*9;
      d.line(xx,y,xx-2,top,env.season==="winter"?p.wood2:p.leaf1);
      d.rect(xx-3,top,2,4,p.wood0);d.line(xx,y-2,xx+3,top+6,p.leaf2);}
  }
  function drawSurface(canvas,kind,env=calendar()) {
    const w=canvas.width,h=canvas.height,d=painter(canvas.getContext("2d")),p=palette(env);
    sky(d,w,h*.25,p,env);mountains(d,w,h*.3,p,env);water(d,0,h*.29,w,h*.72,p);
    d.poly([[0,h*.29],[w*.2,h*.3],[w*.45,h*.285],[w*.72,h*.31],[w,h*.285],[w,h*.325],[0,h*.325]],p.grass0);
    d.rect(0,h*.325,w,1,p.water3);
    // All cast lanes are deliberately inside this common open-water basin.
    const beach=kind==="beach",harbor=kind==="harbor",river=kind==="river",pond=kind==="pond";
    if(river){
      d.poly([[0,h*.25],[w*.43,h*.25],[w*.43,h*.36],[w*.34,h*.55],[w*.3,h],[0,h]],p.grass1);
      d.poly([[w*.72,h*.26],[w,h*.24],[w,h],[w*.89,h],[w*.78,h*.58]],p.grass1);
      for(let i=0;i<9;i++){tree(d,w*(.08+hash(i,4)*.24),h*(.4+hash(i,6)*.4),25+hash(i,5)*15,p,env,i);rocks(d,w*.79+i*5,h*.42+i*9,5,p);}
    }else if(harbor){
      for(let i=0;i<5;i++)building(d,{id:i%2?"fish-market":"harbor-shop",left:20+i*25,right:41+i*25,top:16,bottom:28},p,env,w/240);
      boards(d,w*.82,h*.39,w*.18,h*.54,p,true);boards(d,w*.9,h*.84,w*.1,h*.16,p);
      for(let i=0;i<4;i++)barrel(d,w*.88,h*(.49+i*.12),8,11,p);
      boat(d,w*.77,h*.44,12,p);boat(d,w*.93,h*.95,14,p);
    }else if(pond){
      d.rect(0,h*.27,w*.31,h*.73,p.grass1);d.rect(w*.89,h*.28,w*.11,h*.72,p.grass1);
      for(let i=0;i<8;i++)tree(d,i*w/8,h*.32,30,p,env,i);
      for(let i=0;i<5;i++){d.rect(w*.12,h*(.44+i*.08),3,9,p.wood1);d.rect(w*.07,h*(.44+i*.08),w*.1,2,p.wood3);}
    }else if(!beach){
      for(let i=0;i<12;i++)tree(d,i*w/11,h*.32,18+(i%3)*5,p,env,i);
      d.poly([[0,h*.4],[w*.19,h*.53],[w*.28,h],[0,h]],p.grass1);
      for(let i=0;i<5;i++)reeds(d,w*.12+i*7,h*.7+i*9,p,env);
    }
    if(beach){
      d.poly([[0,h*.76],[w*.32,h*.8],[w*.58,h],[0,h]],p.sand1);
      for(let i=0;i<60;i++){const x=hash(i,4)*w*.3,y=h*(.81+hash(i,5)*.19);d.rect(x,y,2,1,p.sand0);}
      for(let i=0;i<8;i++)rocks(d,w*(.83+hash(i,2)*.16),h*(.47+hash(i,6)*.3),5+hash(i,7)*9,p);
    }
    // Near-bank detail is assembled from the same grasses, pebbles and
    // seasonal petals as the walkable village, with open cast water intact.
    if(!beach&&!harbor){
      for(let i=0;i<170;i++){
        const x=hash(i,91)*w*.23,y=h*(.36+hash(i,92)*.64);
        if(!river&&!pond&&x>w*(.19+(y/h-.53)*.2))continue;
        d.rect(x,y,3,1,i%8?p.grass0:env.season==="winter"?p.snow:p.bloom);
        if(i%4===0)d.rect(x+1,y-2,1,3,p.grass2);
      }
      for(let i=0;i<5;i++)rocks(d,w*(.05+hash(i,19)*.17),h*(.62+hash(i,17)*.21),3+hash(i,12)*3,p);
    }
    if(beach){
      for(let i=0;i<9;i++){const x=hash(i,61)*w*.29,y=h*(.86+hash(i,62)*.13);d.rect(x,y,4,2,p.cream);d.rect(x+1,y-1,2,1,p.sand2);}
      d.line(w*.04,h*.87,w*.17,h*.91,p.wood1,3);d.line(w*.045,h*.864,w*.16,h*.897,p.wood3);
    }
    // Stable landing underneath the angler in every scene, with no plank
    // crossing the selectable lanes (which begin at x >= 52%).
    const px=w*.3,py=h*.87;
    if(beach)d.poly([[w*.2,h*.8],[w*.48,h*.86],[w*.51,h],[w*.1,h]],p.sand1);
    else{
      boards(d,px-13,py,w*.21,h*.13,p,harbor);
      for(const xx of [px-11,px+w*.19]){d.rect(xx,py+3,3,h*.13,p.wood0);d.rect(xx-1,py-1,5,3,p.wood3);}
    }
    return {kind,season:env.season,period:env.period};
  }
  function drawUnderwater(canvas,zone,depth,env=calendar(),flatfish=false) {
    const d=painter(canvas.getContext("2d")),w=canvas.width,h=canvas.height,p=palette(env);
    const deep=depth==="deep",mid=depth==="mid";
    d.rect(0,0,w,h,p.water0);
    for(let y=0;y<h;y+=8)d.rect(0,y,w,8,mix(p.water1,p.ink,(deep?.42:mid?.2:0)+y/h*.32));
    for(let i=0;i<6;i++){
      const x=w*(.08+i*.2);d.poly([[x,0],[x+4,0],[x+w*.12,h],[x+w*.05,h]],mix(p.water2,p.water0,.77));
    }
    const bedY=h*(deep?.88:mid?.85:.8),sand=zone==="sea"||flatfish;
    d.poly([[0,bedY+5],[w*.24,bedY-3],[w*.6,bedY+6],[w,bedY-2],[w,h],[0,h]],sand?p.sand0:p.stone0);
    for(let i=0;i<150;i++){
      const x=hash(i,3)*w,y=bedY+hash(i,5)*(h-bedY);
      if(sand)d.rect(x,y,2,1,i%3?p.sand1:p.sand2);else rocks(d,x,y,2+hash(i,8)*4,p);
    }
    if(!flatfish)for(let i=0;i<14;i++){
      const x=i<7?i*w*.027:w*(.83+(i-7)*.028),height=14+hash(i,8)*(deep?20:44);
      for(let j=0;j<3;j++){
        const xx=x+j*3;d.line(xx,bedY+8,xx-3,bedY-height,p.leaf1,2);
        for(let k=0;k<5;k++)d.line(xx-1,bedY-height+k*5,xx+(k%2?-6:6),bedY-height+k*5-3,p.leaf2,2);
      }
    }
    for(let i=0;i<30;i++)d.rect(hash(i,33)*w,hash(i,34)*h,1,1,p.water2);
    d.rect(0,0,w,2,p.water3);
  }
  function furniture(d,id,x,y,w,h,p,env) {
    if(id==="bed"){
      frame(d,x,y,w,h,p);d.rect(x+3,y+3,w-6,h-6,p.cream);d.rect(x+4,y+5,w-8,h*.22,p.snow);
      d.rect(x+3,y+h*.31,w-6,h*.58,p.blue);d.rect(x+5,y+h*.33,2,h*.54,p.roof2);
      d.rect(x+2,y-4,3,h+6,p.wood0);d.rect(x+w-5,y-4,3,h+6,p.wood1);d.rect(x,y+h-7,w,4,p.wood2);
    }else if(id==="table"||id==="counter"){
      d.rect(x+3,y+5,w-6,h,p.wood0);boards(d,x,y,w,h-3,p);d.rect(x,y,w,2,p.wood3);
      if(id==="table"){d.rect(x+w*.29,y+h*.28,w*.4,h*.38,p.blue);pot(d,x+w*.47,y+h*.49,9,p,true);d.oval(x+w*.68,y+h*.46,4,2,p.cream);}
    }else if(id==="kitchen"){
      frame(d,x,y,w,h,p);d.rect(x+2,y+2,w-4,h*.47,p.stone2);
      d.rect(x+5,y+5,w*.4,h*.29,p.stone0);d.rect(x+7,y+7,w*.35,h*.2,p.blue);
      d.line(x+w*.23,y+5,x+w*.23,y-3,p.roof3,2);d.line(x+w*.23,y-3,x+w*.29,y-3,p.roof3,2);
      for(let i=0;i<2;i++){d.oval(x+w*(.63+i*.23),y+h*.2,6,4,p.ink);d.oval(x+w*(.63+i*.23),y+h*.2,3,2,p.stone0);}
      d.rect(x+w*.5,y+h*.52,1,h*.44,p.ink);d.rect(x+w*.39,y+h*.65,3,2,p.gold);d.rect(x+w*.62,y+h*.65,3,2,p.gold);
    }else if(id==="tank"){
      frame(d,x,y,w,h,p);d.rect(x+2,y+3,w-4,h*.49,p.water0);d.rect(x+w*.05,y+h*.06,w*.9,h*.4,p.water1);
      d.rect(x+4,y+6,w-8,1,p.water3);d.rect(x+5,y+7,2,h*.3,p.foam);
      d.rect(x+3,y+h*.51,w-6,2,p.wood3);
      for(let i=0;i<5;i++){const xx=x+5+i*w*.18;d.line(xx,y+h*.45,xx-2,y+h*(.22+hash(i,1)*.13),p.leaf2,2);}
      d.rect(x+w*.48,y+h*.6,1,h*.35,p.wood0);d.rect(x+w*.4,y+h*.7,2,2,p.gold);d.rect(x+w*.56,y+h*.7,2,2,p.gold);
    }else if(id==="dogs"){
      d.rect(x,y,w,h,p.grass0);
      for(let i=0;i<3;i++){
        const xx=x+4+i*w*.29,c=[p.blue,p.leaf1,p.sand0][i];
        d.oval(xx+w*.1,y+h*.4,w*.11,h*.32,p.ink);d.oval(xx+w*.1,y+h*.38,w*.1,h*.29,c);d.oval(xx+w*.1,y+h*.42,w*.065,h*.18,p.roof0);
        d.oval(xx+w*.1,y+h*.88,w*.045,h*.08,p.cream);d.oval(xx+w*.1,y+h*.86,w*.032,h*.05,p.wood0);
      }
    }else if(id==="rods"){
      frame(d,x,y,w,h,p,p.wood0);d.rect(x+2,y+h*.75,w-4,3,p.wood3);
      for(let i=0;i<4;i++){const xx=x+5+i*(w-8)/4;d.line(xx,y+h-3,xx+3,y+3,p.wood3);d.rect(xx,y+h*.66,2,8,p.ink);d.oval(xx-2,y+h*.7,2,3,p.stone2);}
    }else if(id==="stool"){
      d.rect(x+1,y+3,2,h,p.wood0);d.rect(x+w-3,y+3,2,h,p.wood0);frame(d,x,y,w,h*.6,p,p.grass1);
    }else if(id==="shelf"){
      frame(d,x,y,w,h,p,p.wood0);
      for(let j=0;j<3;j++){for(let i=0;i<4;i++){const xx=x+4+i*(w-7)/4,yy=y+5+j*(h-7)/3;d.rect(xx,yy,Math.max(3,w/7),h/6,[p.blue,p.leaf2,p.cream,p.red][i]);d.rect(xx,yy,Math.max(3,w/7),1,p.gold);}d.rect(x+2,y+(j+1)*h/3,w-4,2,p.wood2);}
    }else crate(d,x,y+h,w,h,p);
  }
  // Percent-based furniture layout is also the home's collision source.
  const homeFurniture = [
    {id:"bed",x:16.8,y:24,w:11.2,h:30.5}, {id:"shelf",x:12.7,y:25,w:4.8,h:14},
    {id:"kitchen",x:54.4,y:24,w:18.4,h:14}, {id:"table",x:36.5,y:35.2,w:12.5,h:17.2},
    {id:"stool",x:40.5,y:50,w:4,h:8.5}, {id:"rods",x:75,y:24,w:12.5,h:16.4},
    {id:"chest",x:85.5,y:38.5,w:3.5,h:4.8}, {id:"tank",x:72.8,y:46.8,w:15,h:27.7},
    {id:"chest",x:15.2,y:69,w:11.6,h:16.5}, {id:"shelf",x:11,y:63,w:4.6,h:22.5},
    {id:"dogs",x:60.8,y:76,w:27.5,h:11},
  ];
  function roomShell(d,w,h,p,env) {
    d.rect(0,0,w,h,p.ink);boards(d,w*.1,h*.17,w*.8,h*.77,p);
    d.rect(w*.1,h*.04,w*.8,h*.22,p.wood1);
    for(let y=h*.065;y<h*.25;y+=7)d.rect(w*.1,y,w*.8,1,p.wood2);
    for(let x=w*.1;x<w*.91;x+=w*.16){d.rect(x,h*.04,4,h*.23,p.wood0);d.rect(x+1,h*.04,1,h*.23,p.wood3);}
    d.rect(w*.1,h*.04,w*.8,4,p.wood3);d.rect(w*.1,h*.25,w*.8,4,p.wood0);
    d.rect(w*.1,h*.04,4,h*.9,p.wood0);d.rect(w*.895,h*.04,4,h*.9,p.wood0);
    windowTile(d,w*.38,h*.075,w*.13,h*.16,p);
    frame(d,w*.19,h*.095,w*.105,h*.1,p,p.cream);
    d.oval(w*.24,h*.145,w*.027,h*.019,p.blue);
    d.poly([[w*.258,h*.145],[w*.276,h*.13],[w*.276,h*.16]],p.blue);
    d.rect(w*.345,h*.06,2,h*.07,p.wood0);d.rect(w*.337,h*.115,w*.023,h*.07,p.ink);
    d.rect(w*.34,h*.12,w*.017,h*.05,p.lamp);d.rect(w*.336,h*.18,w*.026,2,p.wood2);
    if(env.period!=="night")d.poly([[w*.4,h*.27],[w*.49,h*.27],[w*.58,h*.43],[w*.38,h*.43]],mix(p.wood2,p.gold,.26));
  }
  function drawInterior(canvas,id,env=calendar()) {
    const d=painter(canvas.getContext("2d")),w=canvas.width,h=canvas.height,p=palette(env,true);
    roomShell(d,w,h,p,env);
    if(id==="player-home"){
      for(const f of homeFurniture)furniture(d,f.id,f.x*w/100,f.y*h/100,f.w*w/100,f.h*h/100,p,env);
      d.rect(w*.1,h*.86,w*.31,4,p.wood0);d.rect(w*.52,h*.86,w*.38,4,p.wood0);
      boards(d,w*.41,h*.84,w*.11,h*.16,p);d.rect(w*.425,h*.89,w*.08,h*.07,p.leaf1);
    }else if(id==="main-shrine"){
      d.rect(w*.28,h*.2,w*.45,h*.24,p.red);
      for(let i=0;i<7;i++)d.rect(w*(.29+i*.065),h*.2,2,h*.24,p.gold);
      d.line(w*.33,h*.26,w*.67,h*.26,p.cream,3);d.line(w*.5,h*.25,w*.5,h*.48,p.cream,2);d.oval(w*.5,h*.36,4,5,p.gold);
      furniture(d,"chest",w*.37,h*.5,w*.26,h*.17,p,env);text(d,"STAR",w*.45,h*.55,p.cream);
      pot(d,w*.21,h*.5,18,p);pot(d,w*.79,h*.5,18,p);
    }else if(id==="farmhouse"){
      for(let j=0;j<2;j++)for(let i=0;i<3;i++){
        const x=w*(.17+i*.22),y=h*(.37+j*.24);d.rect(x,y,w*.21,h*.23,p.grass1);d.rect(x+2,y+2,w*.2,h*.21,p.grass2);
        for(let yy=0;yy<h*.2;yy+=3)d.rect(x+3,y+3+yy,w*.2-3,1,p.grass1);
      }
      furniture(d,"table",w*.42,h*.47,w*.18,h*.2,p,env);furniture(d,"bed",w*.19,h*.38,w*.12,h*.28,p,env);
      furniture(d,"kitchen",w*.67,h*.22,w*.2,h*.18,p,env);
    }else if(id==="diner"){
      furniture(d,"kitchen",w*.58,h*.22,w*.29,h*.2,p,env);furniture(d,"counter",w*.16,h*.35,w*.36,h*.13,p,env);
      for(let i=0;i<3;i++)furniture(d,"table",w*(.18+i*.23),h*.65,w*.15,h*.14,p,env);
      for(let i=0;i<4;i++)furniture(d,"stool",w*(.2+i*.075),h*.5,w*.035,h*.055,p,env);
    }else if(id==="yaoya"||id==="fish-market"){
      for(let j=0;j<2;j++)for(let i=0;i<4;i++){
        const x=w*(.16+i*.18),y=h*(.31+j*.3);furniture(d,"chest",x,y,w*.15,h*.19,p,env);
        if(id==="yaoya")for(let k=0;k<6;k++)d.oval(x+w*(.025+k%3*.045),y+h*(.05+Math.floor(k/3)*.06),4,3,[p.red,p.leaf2,p.cream,p.gold][i]);
        else{d.rect(x+3,y+3,w*.15-6,h*.14,p.foam);for(let k=0;k<3;k++){d.oval(x+w*.06,y+h*(.035+k*.035),7,2,p.blue);d.poly([[x+w*.09,y+h*(.035+k*.035)],[x+w*.12,y+h*(.02+k*.035)],[x+w*.12,y+h*(.05+k*.035)]],p.water0);}}
      }
    }else{
      for(let i=0;i<3;i++)furniture(d,"shelf",w*(.16+i*.24),h*.22,w*.2,h*.25,p,env);
      furniture(d,"rods",w*.77,h*.4,w*.1,h*.41,p,env);
      // Sam's original identity: broad hat, white beard, blue shirt.
      d.rect(w*.46,h*.47,16,24,p.blue);d.oval(w*.46+8,h*.45,7,9,p.cream);
      d.rect(w*.46-1,h*.39,18,5,p.wood1);d.rect(w*.46+2,h*.36,12,6,p.wood2);
      d.poly([[w*.46+1,h*.47],[w*.46+15,h*.47],[w*.46+8,h*.52]],p.snow);
      furniture(d,"counter",w*.25,h*.6,w*.43,h*.19,p,env);text(d,"SAM",w*.41,h*.67,p.cream);
    }
    return {id,season:env.season,period:env.period};
  }
  function drawHomeExterior(canvas,env=calendar()) {
    const d=painter(canvas.getContext("2d")),w=canvas.width,h=canvas.height,p=palette(env);
    d.rect(0,0,w,h,p.grass1);water(d,0,0,w*.33,h*.56,p);
    for(let y=0;y<h;y+=4)for(let x=0;x<w;x+=4){if(x<w*.33&&y<h*.56)continue;
      if(hash(x,y)>.65)d.rect(x,y,2,1,hash(x,y)>.92?p.grass2:p.grass0);}
    // These floor rectangles exactly mirror the existing garden walkways.
    for(const r of [[2,70,96,13],[29,65.5,61,17.5],[47,61,10,23],[44,81,21,6],[48,84,14,14]]){
      d.rect(r[0]*w/100,r[1]*h/100,r[2]*w/100,r[3]*h/100,p.sand1);
    }
    for(let i=0;i<11;i++)tree(d,w*(.07+i*.085),h*(i<3?.64:.28),h*(.25+(i%3)*.04),p,env,i);
    // House footprint / door / stairs use the same 100×100 local coordinates.
    const x=w*.37,y=h*.08,bw=w*.35,bh=h*.525;
    d.rect(x,y+bh*.37,bw,bh*.63,p.wood0);boards(d,x+3,y+bh*.37,bw-6,bh*.63-2,p);
    d.rect(x+4,y+bh*.39,bw-8,bh*.23,p.cream);
    roof(d,x,y,bw,bh*.4,p,env);
    const dx=w*.486,dy=h*.433,dw=w*.068,dh=h*.172;
    frame(d,dx,dy,dw,dh,p,p.wood0);for(let i=3;i<dw-3;i+=5)d.rect(dx+i,dy+3,2,dh-6,p.wood2);
    d.rect(dx+dw-5,dy+dh*.57,2,2,p.gold);
    windowTile(d,w*.61,h*.41,w*.08,h*.14,p);
    boards(d,w*.47,h*.61,w*.1,h*.08,p,true);
    furniture(d,"rods",w*.395,h*.44,w*.04,h*.2,p,env);barrel(d,w*.44,h*.65,w*.025,h*.07,p,true);
    furniture(d,"counter",w*.59,h*.57,w*.09,h*.08,p,env);barrel(d,w*.78,h*.65,w*.027,h*.075,p,true);crate(d,w*.82,h*.65,w*.04,h*.08,p);
    pot(d,w*.71,h*.6,h*.1,p,true);
    d.rect(w*.07,h*.64,3,h*.065,p.wood0);frame(d,w*.045,h*.605,w*.065,h*.06,p);d.line(w*.057,h*.635,w*.093,h*.635,p.cream,2);d.line(w*.057,h*.635,w*.067,h*.62,p.cream,2);
  }
  return Object.freeze({SEASON_DAYS,seasons,periods,calendar,palette,hash,painter,mix,worldTrees,worldPaths,
    homeFurniture,worldTile,propSolid,drawWorld,drawSurface,drawUnderwater,drawInterior,drawHomeExterior});
});
