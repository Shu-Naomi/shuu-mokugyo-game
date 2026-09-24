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
    harbor: { name: "星見港", land: { x:154,y:123 }, water: { x:161,y:123 }, radius: 8 },
    sand: { name: "白砂の小島", land: { x:115,y:77 }, water: { x:105,y:77 }, radius: 8 },
    reef: { name: "岩礁の小島", land: { x:88,y:92 }, water: { x:98,y:92 }, radius: 8 },
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
  function water(x,y) { return Number.isFinite(x) && Number.isFinite(y) && x>=2 && x<=width-2 && y>=2 && y<=height-2 && !shore(x,y); }
  function near(a,b,r=8) { return Math.hypot(a.x-b.x,a.y-b.y)<=r; }
  function coastName(x) { return x<103 ? "reef" : "sand"; }
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
  function paintBoat(canvas,id="tarai",direction="up",frame=0) {
    if(!canvas?.getContext)return;
    const ctx=canvas.getContext("2d");ctx.clearRect(0,0,canvas.width,canvas.height);
    const factor=canvas.width/32;ctx.save();ctx.scale(factor,canvas.height/24);ctx.imageSmoothingEnabled=false;
    const sway=frame%2;
    ctx.fillStyle="#d0eeee";ctx.fillRect(3,17+sway,27,2);
    ctx.fillStyle="#273d40";ctx.fillRect(id==="canoe"?1:5,11, id==="canoe"?30:22,8);
    ctx.fillStyle=id==="canoe"?"#a85632":"#a8956b";ctx.fillRect(id==="canoe"?3:6,10,id==="canoe"?26:20,6);
    ctx.fillStyle="#d9b27b";ctx.fillRect(11,6,9,7);ctx.fillStyle="#223d55";ctx.fillRect(11,4,9,3);
    ctx.fillStyle="#f0d1a1";ctx.fillRect(14,6,4,3);
    ctx.fillStyle="#493d32";ctx.fillRect(direction==="left"?5:direction==="right"?25:23,5,2,13);
    ctx.fillStyle="#d3aa76";ctx.fillRect(direction==="left"?5:direction==="right"?25:23,14,3,4);
    ctx.restore();
  }
  return {width,height,islands,docks,restPoint,inside,shore,water,near,coastName,stepFor,costFor,paint,paintBoat};
});
