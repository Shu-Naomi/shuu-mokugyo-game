/* Whole-fish frames with measured unequal gutters and registered snouts. */
(function(root,factory){const api=factory();if(typeof module==="object"&&module.exports)module.exports=api;
  if(root)root.ShuNushiAtlas=api;
})(typeof globalThis!=="undefined"?globalThis:this,function(){
  "use strict";
  const width=1774,height=887;
  const bounds={
    streamNushi:{turn:[0,455,747,994,1310,1774],mouth:[0,596,1186,1774],
      heads:[[436,136],[878,136],[1318,136],[1758,136],[436,357],[878,357],[1318,357],[1758,357],
        [436,579],[729,575],[885,580],[1009,579],[1334,575],[546,790],[1134,794],[1724,814]],sideWidths:[420,510,482,456]},
    coastNushi:{turn:[0,455,744,1018,1315,1774],mouth:[0,573,1159,1774],
      heads:[[436,129],[878,129],[1320,129],[1766,129],[436,350],[878,350],[1320,350],[1766,350],
        [436,572],[723,576],[885,585],[1052,578],[1336,575],[532,797],[1114,810],[1700,841]],sideWidths:[424,487,489,509]},
    caveNushi:{turn:[0,454,752,1027,1319,1774],mouth:[0,560,1145,1774],
      heads:[[430,123],[873,123],[1317,123],[1758,123],[430,344],[873,344],[1317,344],[1758,344],
        [430,567],[723,586],[886,601],[1063,580],[1335,565],[508,782],[1092,798],[1676,813]],sideWidths:[425,503,497,505]},
    starNushi:{turn:[0,457,779,1036,1324,1774],mouth:[0,444,887,1328],
      heads:[[433,134],[876,134],[1319,134],[1762,134],[433,355],[876,355],[1319,355],[1762,355],
        [433,573],[760,593],[914,597],[1065,592],[1340,572],[433,795],[876,795],[1319,817]],sideWidths:[425,425,425,425]},
  };
  function frame(id,cells,pose){
    const data=bounds[id];if(!data)return null;
    const index=cells===5?8+Math.min(4,pose):cells===3?13+Math.min(2,pose):Math.min(7,pose);
    let row,col,edges,top,bottom;
    if(index<8){row=Math.floor(index/4);col=index%4;edges=[0,444,887,1331,1774];top=row?223:0;bottom=row?442:222;}
    else if(index<13){row=2;col=index-8;edges=data.turn;top=444;bottom=666;}
    else{row=3;col=index-13;edges=data.mouth;top=668;bottom=887;}
    return {index,rect:[edges[col],top,edges[col+1]-edges[col],bottom-top],head:data.heads[index],
      sideWidth:row===3?data.sideWidths[col+1]:data.sideWidths[0]};
  }
  function draw(ctx,image,id,cells,pose,canvasWidth=480,canvasHeight=240){
    const f=frame(id,cells,pose);if(!f)return false;
    const [x,y,w,h]=f.rect,ratioX=image.naturalWidth/width,ratioY=image.naturalHeight/height;
    const target=cells===5?[[.9,.6],[.79,.66],[.5,.69],[.21,.66],[.1,.6]][Math.min(4,pose)]
      :[.9,.6+(cells===3?[0,.035,.085][Math.min(2,pose)]:0)];
    const scale=canvasWidth*.82/f.sideWidth;ctx.imageSmoothingEnabled=false;
    ctx.drawImage(image,x*ratioX,y*ratioY,w*ratioX,h*ratioY,
      Math.round(target[0]*canvasWidth-(f.head[0]-x)*scale),
      Math.round(target[1]*canvasHeight-(f.head[1]-y)*scale),Math.round(w*scale),Math.round(h*scale));return true;
  }
  return {width,height,bounds,frame,draw};
});
