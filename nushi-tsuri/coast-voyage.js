(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  root.ShuCoast = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";
  const width = 240, height = 135;
  const islands = {
    sand: [[122,52],[144,47],[166,52],[182,64],[184,81],[169,96],[143,103],[119,95],[109,78],[113,64]],
    reef: [[48,79],[62,71],[81,73],[92,87],[89,102],[76,113],[58,111],[44,100]],
  };
  const docks = {
    harbor: { name: "星見港", land: { x:154,y:123 }, water: { x:166,y:123 }, radius: 8 },
    sand: { name: "白砂の小島", land: { x:115,y:77 }, water: { x:100,y:77 }, radius: 8 },
    reef: { name: "岩礁の小島", land: { x:88,y:92 }, water: { x:104,y:92 }, radius: 8 },
  };
  const restPoint = { x:146,y:70 };
  function inside(x,y,polygon) {
    let hit=false;
    for(let i=0,j=polygon.length-1;i<polygon.length;j=i++) {
      const [xi,yi]=polygon[i],[xj,yj]=polygon[j];
      if ((yi>y)!==(yj>y) && x<(xj-xi)*(y-yi)/(yj-yi)+xi) hit=!hit;
    }
    return hit;
  }
  function shore(x,y) { return Object.values(islands).some(poly=>inside(x,y,poly)); }
  function water(x,y) { return Number.isFinite(x) && Number.isFinite(y) && x>=2 && x<=width-2 && y>=2 && y<=height-2 && !shore(x,y) && !(x>=148 && x<=157 && y>=119 && y<=129); }
  function near(a,b,r=8) { return Math.hypot(a.x-b.x,a.y-b.y)<=r; }
  function coastName(x,y) {
    if (!Number.isFinite(y)) return x<103 ? "reef" : "sand";
    const distanceToIsland = polygon => Math.min(...polygon.map(([ax,ay],index) => {
      const [bx,by]=polygon[(index+1)%polygon.length];
      const progress=Math.max(0,Math.min(1,((x-ax)*(bx-ax)+(y-ay)*(by-ay))/((bx-ax)**2+(by-ay)**2)));
      return Math.hypot(x-(ax+(bx-ax)*progress),y-(ay+(by-ay)*progress));
    }));
    return distanceToIsland(islands.reef) < distanceToIsland(islands.sand) ? "reef" : "sand";
  }
  function stepFor(vehicle) { return vehicle==="canoe" ? 5 : 3; }
  function costFor(vehicle) { return vehicle==="canoe" ? 2 : 1; }
  function paint(canvas,environment={}) {
    if (!canvas?.getContext) return;
    const ctx=canvas.getContext("2d");
    const night=environment.period==="night" || environment.time==="night";
    const scaleX=canvas.width/width, scaleY=canvas.height/height;
    ctx.save();ctx.scale(scaleX,scaleY);ctx.imageSmoothingEnabled=false;
    ctx.fillStyle=night?"#12344a":"#236888";ctx.fillRect(0,0,width,height);
    for(let y=0;y<height;y+=4) for(let x=0;x<width;x+=8) {
      const noise=(x*7+y*13)%31;
      if(noise<9) { ctx.fillStyle=night?"#23536a":"#388a9f";ctx.fillRect(x+(y%3),y,4,1); }
      else if(noise>27) {ctx.fillStyle=night?"#568391":"#92c7c1";ctx.fillRect(x+2,y,2,1);}
    }
    for(const [id,poly] of Object.entries(islands)) {
      ctx.fillStyle="#e8f2cf";ctx.beginPath();poly.forEach(([x,y],i)=>i?ctx.lineTo(x,y):ctx.moveTo(x,y));ctx.closePath();ctx.fill();
      ctx.fillStyle=id==="reef"?"#536567":"#d4c895";ctx.beginPath();poly.forEach(([x,y],i)=>i?ctx.lineTo(x,y):ctx.moveTo(x,y));ctx.closePath();ctx.fill();
    }
    // Layer individual rocks, grass and beach lines on the same low-resolution grid.
    for(let i=0;i<48;i++) {
      const id=i%3===0?"reef":"sand", origin=id==="reef"?{x:68,y:93}:{x:147,y:75};
      const x=Math.round(origin.x+Math.sin(i*13.7)*(id==="reef"?18:31));
      const y=Math.round(origin.y+Math.cos(i*9.3)*(id==="reef"?15:21));
      if(!inside(x,y,islands[id]))continue;
      ctx.fillStyle=id==="reef"?(i%3?"#718685":"#a0aaa0"):(i%4?"#dcd09e":"#7b9b65");
      ctx.fillRect(x,y,i%4+1,i%3+1);
    }
    ctx.fillStyle="#567c59";ctx.fillRect(138,59,22,13);ctx.fillStyle="#9fb16d";ctx.fillRect(141,61,18,8);
    ctx.fillStyle="#bc613e";ctx.fillRect(143,66,9,4);ctx.fillStyle="#e7b565";ctx.fillRect(145,63,5,4);
    ctx.fillStyle="#643f30";ctx.fillRect(145,71,3,2);
    for(const [id,dock] of Object.entries(docks)) {
      if(id==="harbor")continue;
      const dir=id==="reef"?1:-1;
      ctx.fillStyle="#433c3e";ctx.fillRect(dock.land.x+(dir<0?-8:0),dock.land.y-2,10,6);
      ctx.fillStyle="#aa8661";ctx.fillRect(dock.land.x+(dir<0?-8:0),dock.land.y-2,10,3);
      ctx.fillStyle="#eee0a5";ctx.fillRect(dock.land.x-1,dock.land.y-5,2,4);
    }
    ctx.fillStyle="#705e51";ctx.fillRect(148,119,9,10);ctx.fillStyle="#d6bb84";ctx.fillRect(149,119,8,4);
    ctx.fillStyle="#f3ebc4";ctx.fillRect(145,115,2,3);
    ctx.restore();
  }
  let boatAtlas;
  let pendingBoat;
  function paintBoat(canvas,id="tarai",direction="up",frame=0,avatar="boy",rowing=false) {
    if(!canvas?.getContext)return;
    const ctx=canvas.getContext("2d");
    pendingBoat=[canvas,id,direction,frame,avatar,rowing];
    if(!boatAtlas && typeof Image !== "undefined") {
      boatAtlas=new Image();
      boatAtlas.onload=()=>{
        if(pendingBoat)paintBoat(...pendingBoat);
      };
      boatAtlas.src="assets/coast-boat-v196.png";
    }
    ctx.clearRect(0,0,canvas.width,canvas.height);
    if(!boatAtlas?.complete || !boatAtlas.naturalWidth)return;
    const column={up:0,right:1,down:2,left:3}[direction] ?? 0;
    const row=(id==="canoe"?0:4)+(avatar==="girl"?2:0)+(rowing&&frame%2?1:0);
    ctx.imageSmoothingEnabled=false;
    ctx.drawImage(boatAtlas,column*64,row*48,64,48,0,0,canvas.width,canvas.height);
  }
  return {width,height,islands,docks,restPoint,inside,shore,water,near,coastName,stepFor,costFor,paint,paintBoat};
});
