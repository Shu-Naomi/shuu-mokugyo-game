(function(root,factory){
  const api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;
  else root.ShuFishArt=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(){
  'use strict';
  // Generated artwork is cropped by the actual silhouette, not an assumed
  // grid. Some source drawings deliberately cross a nominal cell boundary.
  const groups = {"lake":{"ids":["moroko","funa","koi","ayu"],"boxes":[[20,44,327,103],[378,40,312,114],[759,32,216,129],[1097,23,133,134],[57,181,228,124],[364,181,240,122],[638,188,299,117],[962,188,269,114],[23,321,313,152],[388,319,277,153],[733,322,206,158],[1064,318,159,156],[38,483,241,147],[348,483,235,145],[631,489,301,145],[957,492,275,141],[20,638,335,146],[390,640,306,149],[736,640,261,157],[1075,642,163,140],[32,793,267,151],[348,795,255,149],[625,810,301,129],[948,813,286,129],[22,973,335,105],[384,965,311,118],[768,953,193,138],[1093,953,139,138],[21,1109,269,116],[352,1099,246,129],[628,1114,320,110],[963,1115,271,111]]},"stream":{"ids":["yamame","nijimasu","namazu","unagi"],"boxes":[[31,31,324,119],[398,29,238,128],[716,28,187,133],[1044,29,149,134],[73,171,236,135],[364,171,243,133],[651,180,307,124],[973,186,264,118],[21,340,345,130],[403,328,231,151],[721,335,177,149],[1037,322,162,166],[79,487,226,157],[366,495,249,139],[646,503,312,132],[975,505,259,128],[26,681,363,107],[403,667,291,140],[720,663,242,147],[1043,653,169,158],[38,807,268,136],[323,812,300,138],[643,840,309,91],[968,831,271,110],[30,1006,359,67],[430,958,239,131],[777,957,141,144],[1064,963,129,125],[67,1102,207,118],[318,1122,302,79],[635,1144,316,69],[972,1142,264,71]]},"swimmers":{"ids":["bass","aji","bora","suzuki"],"boxes":[[24,36,333,112],[383,30,260,120],[713,29,229,124],[1061,29,149,124],[40,174,264,125],[346,180,236,121],[622,183,304,111],[949,178,293,121],[26,336,322,120],[396,332,245,131],[718,327,205,135],[1059,324,153,142],[48,487,258,131],[384,487,195,122],[620,498,307,112],[946,493,294,118],[25,649,338,116],[391,650,247,124],[736,652,193,122],[1063,644,154,132],[37,809,275,124],[354,809,239,121],[623,812,305,117],[949,811,292,118],[24,963,330,111],[386,952,255,127],[707,950,236,133],[1061,946,162,137],[28,1103,287,128],[354,1110,246,116],[617,1102,321,117],[952,1101,290,127]]},"reef":{"ids":["kurodai","kasago","mebaru","hirame"],"boxes":[[34,7,311,148],[395,6,263,149],[745,6,233,158],[1068,7,169,156],[57,155,226,153],[343,160,252,145],[644,160,276,147],[946,165,284,145],[22,316,309,158],[379,312,271,161],[757,312,196,168],[1035,315,208,158],[43,466,234,158],[330,460,257,156],[629,467,290,157],[943,477,296,147],[23,619,323,152],[402,617,258,160],[743,615,203,163],[1050,617,183,161],[54,769,232,150],[341,761,241,161],[631,779,291,151],[945,781,282,149],[19,927,320,147],[375,925,280,155],[729,924,233,157],[1065,929,169,151],[42,1081,257,149],[345,1075,238,152],[632,1088,294,145],[946,1087,293,146]]},"coastal":{"ids":["shirogisu","ainame","madai","streamNushi"],"boxes":[[32,44,333,109],[386,41,272,117],[727,44,201,119],[1025,41,161,125],[44,191,256,113],[373,191,233,111],[631,194,315,110],[961,200,274,109],[34,345,334,129],[389,344,276,135],[735,345,202,137],[1010,340,199,143],[55,497,250,120],[388,498,223,120],[631,505,316,127],[963,500,270,132],[38,635,311,154],[391,632,264,165],[736,637,197,163],[1020,635,197,161],[68,800,230,145],[381,788,242,163],[646,807,308,145],[975,808,255,144],[33,957,335,129],[391,955,272,140],[744,956,211,142],[1025,957,176,138],[54,1098,279,123],[373,1100,248,127],[628,1110,325,126],[968,1104,265,133]]},"legendary":{"ids":["coastNushi","caveNushi","starNushi","nushi"],"boxes":[[25,29,333,140],[398,22,260,150],[718,21,230,153],[1061,19,166,155],[40,189,277,144],[393,188,196,146],[637,203,297,127],[955,202,277,127],[18,356,353,126],[400,355,277,149],[704,348,290,158],[1055,348,180,150],[31,509,311,136],[362,512,269,132],[649,527,333,110],[998,518,245,126],[17,660,331,135],[368,661,301,137],[694,662,265,131],[1044,660,201,146],[20,814,290,123],[342,810,266,126],[644,815,318,123],[967,815,268,118],[31,955,323,135],[395,949,257,149],[711,950,277,154],[1044,945,194,158],[20,1094,316,142],[349,1098,290,138],[659,1102,310,134],[979,1105,260,132]]}};
  groups.char={ids:["iwana"],boxes:[[19,223,469,205],[506,205,359,255],[907,188,299,280],[1228,187,269,291],[13,594,288,272],[325,607,349,239],[688,640,422,189],[1128,641,395,189]]};
  const species={};
  for(const [group,definition]of Object.entries(groups))
    definition.ids.forEach((id,index)=>species[id]={group,index,asset:`assets/fish-${group}-v208.png`});
  species.iwana.asset="assets/fish-iwana-v219.png";
  for(const id of ["amago","kajika"])species[id]={group:"char",index:0,asset:`assets/fish-${id}-v219.png`};
  for(const id of ["wakasagi","dojo","isaki"])species[id]={group:"regional",index:0,asset:`assets/fish-${id}-v220.png`};
  // Species-specific originals have 25 authored yaw poses and one
  // breathing pose. Keep their true dorsal anatomy and rounded front views.
  const native={
    isaki:{"asset":"assets/fish-isaki-v220.png","dense":true,"continuousBody":true,"boxes":[[36,28,302,138],[370,32,289,138],[690,32,263,139],[1001,29,225,141],[1302,25,187,147],[70,195,210,149],[394,194,207,151],[704,193,179,154],[1015,187,158,163],[1315,186,164,167],[83,356,170,171],[396,357,171,172],[688,355,188,173],[983,358,188,171],[1293,363,190,164],[47,533,242,160],[360,532,244,157],[661,534,245,152],[946,535,255,152],[1231,537,270,150],[24,706,281,150],[337,706,279,150],[640,706,278,150],[934,706,274,150],[1226,707,287,149],[33,863,301,144]],"heads":[[0.995,0.61],[0.995,0.6],[0.99,0.62],[0.99,0.65],[0.99,0.67],[0.995,0.62],[0.995,0.62],[0.99,0.66],[0.98,0.675],[0.8,0.66],[0.72,0.61],[0.63,0.65],[0.48,0.63],[0.4,0.62],[0.16,0.59],[0.012,0.54],[0.012,0.56],[0.01,0.58],[0.01,0.575],[0.01,0.567],[0.01,0.58],[0.01,0.58],[0.01,0.58],[0.01,0.58],[0.01,0.577],[0.99,0.638]]},
    dojo:{"asset":"assets/fish-dojo-v220.png","dense":true,"continuousBody":true,"boxes":[[21,55,349,88],[392,55,284,88],[702,56,254,87],[981,56,249,94],[1253,56,254,96],[35,209,317,100],[392,209,279,105],[703,209,244,113],[983,211,239,114],[1258,210,238,118],[52,373,270,123],[405,372,229,126],[731,372,127,126],[992,370,183,128],[1266,371,216,129],[40,540,286,123],[380,542,268,121],[673,543,272,115],[955,539,264,121],[1236,539,265,125],[18,712,315,99],[341,712,312,101],[657,717,292,99],[954,718,277,95],[1236,720,287,92],[21,874,345,96]],"heads":[[0.96,0.625],[0.975,0.66],[0.98,0.63],[0.96,0.63],[0.96,0.656],[0.95,0.61],[0.946,0.657],[0.93,0.7],[0.925,0.69],[0.9,0.73],[0.915,0.77],[0.85,0.77],[0.5,0.75],[0.68,0.8],[0.22,0.73],[0.1,0.7],[0.07,0.65],[0.052,0.56],[0.04,0.55],[0.045,0.53],[0.054,0.657],[0.045,0.673],[0.045,0.646],[0.043,0.663],[0.05,0.663],[0.97,0.563]],"scales":{"0":0.9,"5":0.8,"25":0.91}},
    wakasagi:{"asset":"assets/fish-wakasagi-v220.png","dense":true,"continuousBody":true,"boxes":[[16,52,282,78],[322,48,285,84],[632,38,281,97],[950,31,264,105],[1262,26,247,114],[33,196,251,110],[350,190,232,120],[674,187,209,123],[989,186,189,126],[1299,185,165,129],[87,347,147,132],[407,347,137,134],[705,347,133,135],[993,347,132,133],[1288,346,172,133],[58,520,208,120],[349,522,233,118],[643,523,243,116],[931,524,262,114],[1229,527,284,108],[23,698,274,103],[324,701,277,100],[623,702,279,101],[924,702,279,101],[1228,701,281,102],[19,875,280,86]],"heads":[[0.995,0.55],[0.995,0.6],[0.995,0.69],[0.995,0.695],[0.99,0.78],[0.99,0.6],[0.99,0.67],[0.99,0.71],[0.99,0.754],[0.99,0.78],[0.94,0.77],[0.78,0.78],[0.5,0.79],[0.28,0.8],[0.035,0.78],[0.01,0.55],[0.01,0.57],[0.01,0.59],[0.01,0.6],[0.01,0.61],[0.01,0.525],[0.01,0.55],[0.01,0.58],[0.01,0.63],[0.01,0.61],[0.995,0.57]]},
    iwana:{"asset":"assets/fish-iwana-v219.png","dense":true,"boxes":[[28,41,302,145],[339,40,262,149],[610,45,256,147],[875,45,258,147],[1164,46,212,149],[48,216,245,166],[350,218,222,168],[630,217,199,170],[903,221,182,167],[1176,222,169,171],[75,403,184,172],[395,404,138,171],[628,403,182,173],[924,408,132,166],[1189,407,162,168],[48,593,211,163],[333,593,230,165],[593,594,244,165],[872,594,230,165],[1142,595,241,160],[28,776,266,147],[309,774,261,149],[578,776,264,146],[851,777,265,147],[1112,780,270,145],[28,938,291,149]],"heads":[[0.995,0.72],[0.995,0.7],[0.995,0.73],[0.995,0.71],[0.995,0.73],[0.99,0.74],[0.985,0.75],[0.97,0.78],[0.95,0.8],[0.92,0.81],[0.87,0.8],[0.72,0.81],[0.5,0.79],[0.25,0.8],[0.17,0.78],[0.105,0.74],[0.055,0.74],[0.025,0.73],[0.02,0.73],[0.015,0.72],[0.01,0.68],[0.01,0.65],[0.01,0.65],[0.01,0.64],[0.01,0.64],[0.995,0.72]]},
    amago:{"asset":"assets/fish-amago-v219.png","dense":true,"boxes":[[20,60,294,133],[325,59,274,135],[606,59,262,134],[877,59,245,134],[1150,59,224,137],[35,227,263,145],[337,228,238,147],[630,231,208,146],[912,234,178,146],[1181,234,163,147],[73,406,182,152],[392,406,134,154],[635,410,170,153],[918,409,139,152],[1188,410,160,151],[57,583,201,147],[341,583,213,149],[603,587,239,146],[874,586,235,147],[1139,588,246,146],[18,761,284,142],[319,765,270,139],[599,766,264,138],[872,767,254,137],[1135,768,252,137],[21,935,284,135]],"heads":[[0.995,0.65],[0.995,0.65],[0.995,0.67],[0.995,0.68],[0.995,0.7],[0.99,0.7],[0.98,0.73],[0.97,0.75],[0.95,0.78],[0.92,0.8],[0.88,0.79],[0.73,0.8],[0.5,0.76],[0.27,0.78],[0.18,0.78],[0.1,0.74],[0.055,0.73],[0.025,0.73],[0.02,0.73],[0.015,0.72],[0.01,0.66],[0.01,0.66],[0.01,0.65],[0.01,0.64],[0.01,0.64],[0.995,0.69]]},
    kajika:{"asset":"assets/fish-kajika-v219.png","dense":true,"boxes":[[22,21,284,105],[347,20,290,109],[678,19,273,112],[1011,19,244,117],[1314,19,194,120],[48,181,225,124],[377,180,203,127],[703,180,187,129],[1039,181,166,129],[1340,182,153,131],[91,351,156,136],[408,350,160,139],[703,350,170,140],[1014,350,162,140],[1311,352,158,137],[69,529,174,132],[380,530,191,133],[676,530,222,134],[980,531,222,133],[1268,532,237,130],[21,702,262,121],[344,702,263,118],[643,703,262,116],[947,703,258,114],[1237,710,282,110],[22,874,285,115]],"heads":[[0.995,0.66],[0.995,0.69],[0.995,0.7],[0.995,0.72],[0.995,0.73],[0.99,0.74],[0.985,0.75],[0.97,0.77],[0.95,0.79],[0.92,0.8],[0.85,0.81],[0.7,0.83],[0.5,0.82],[0.29,0.83],[0.18,0.82],[0.105,0.79],[0.055,0.77],[0.025,0.74],[0.02,0.74],[0.015,0.73],[0.01,0.7],[0.01,0.69],[0.01,0.69],[0.01,0.68],[0.01,0.67],[0.995,0.8]]},
    suzuki:{"asset":"assets/fish-suzuki-v216.png","dense":true,"boxes":[[20,80,288,130],[320,80,264,131],[598,83,258,130],[872,81,243,136],[1142,82,230,136],[42,240,261,147],[337,241,239,147],[625,243,211,147],[899,244,190,149],[1175,244,174,149],[73,413,187,156],[388,413,136,157],[629,409,175,165],[914,413,135,156],[1187,415,156,153],[76,589,166,154],[342,593,201,150],[600,596,226,149],[882,597,215,145],[1150,595,221,145],[27,773,266,141],[314,776,262,136],[592,775,266,137],[866,777,247,130],[1119,777,266,132],[21,942,288,136]],"heads":[[0.99,0.65],[0.99,0.68],[0.99,0.68],[0.99,0.7],[0.99,0.73],[0.98,0.75],[0.98,0.75],[0.97,0.75],[0.95,0.76],[0.92,0.78],[0.88,0.78],[0.72,0.8],[0.5,0.77],[0.24,0.77],[0.17,0.76],[0.1,0.76],[0.055,0.77],[0.025,0.76],[0.02,0.75],[0.015,0.73],[0.01,0.68],[0.01,0.68],[0.01,0.68],[0.01,0.68],[0.01,0.68],[0.99,0.69]]},
    kurodai:{"asset":"assets/fish-kurodai-v216.png","dense":true,"boxes":[[11,86,249,152],[264,86,230,156],[502,87,210,158],[739,88,191,159],[969,90,168,157],[23,292,234,188],[284,294,202,187],[520,293,194,191],[759,291,170,195],[984,291,136,198],[76,516,138,202],[305,514,146,201],[492,517,182,199],[714,518,154,200],[949,515,143,208],[26,748,189,203],[248,754,199,195],[464,760,205,187],[681,759,219,193],[901,763,237,188],[19,990,228,175],[252,993,211,169],[466,996,214,165],[685,994,183,167],[878,998,251,163],[8,1193,254,162]],"heads":[[0.99,0.7],[0.99,0.7],[0.99,0.71],[0.99,0.72],[0.99,0.73],[0.98,0.73],[0.97,0.75],[0.96,0.77],[0.94,0.8],[0.88,0.81],[0.78,0.81],[0.66,0.8],[0.5,0.74],[0.31,0.76],[0.22,0.8],[0.13,0.77],[0.07,0.77],[0.045,0.77],[0.03,0.75],[0.015,0.74],[0.01,0.68],[0.01,0.68],[0.01,0.67],[0.01,0.65],[0.015,0.66],[0.99,0.7]]},
    moroko:{"asset":"assets/fish-moroko-v215.png","dense":true,"boxes":[[22,53,265,121],[315,52,261,122],[606,50,242,126],[888,47,236,132],[1172,47,214,132],[44,213,241,145],[340,212,225,149],[633,212,202,151],[927,221,182,144],[1216,224,157,141],[90,396,164,150],[383,401,152,146],[646,395,146,157],[926,397,158,151],[1192,397,145,151],[51,571,190,148],[332,572,209,146],[606,574,219,145],[876,576,230,144],[1133,575,245,144],[17,752,254,138],[306,753,258,136],[589,757,258,133],[861,759,250,131],[1132,759,256,130],[22,940,264,124]],"heads":[[0.99,0.63],[0.99,0.63],[0.99,0.65],[0.99,0.68],[0.99,0.71],[0.98,0.72],[0.98,0.73],[0.97,0.75],[0.95,0.78],[0.91,0.8],[0.82,0.81],[0.76,0.82],[0.51,0.79],[0.25,0.8],[0.18,0.81],[0.1,0.78],[0.045,0.76],[0.025,0.75],[0.015,0.74],[0.01,0.73],[0.01,0.68],[0.01,0.68],[0.01,0.68],[0.01,0.68],[0.01,0.69],[0.99,0.65]]},
    ayu:{"asset":"assets/fish-ayu-v215.png","dense":true,"boxes":[[19,58,282,124],[314,55,261,131],[595,55,246,135],[879,55,227,137],[1158,55,198,142],[53,234,229,146],[352,232,200,151],[637,233,177,148],[932,232,161,154],[1223,230,143,159],[98,417,182,162],[389,417,171,164],[631,422,175,160],[902,423,162,158],[1179,425,154,158],[69,614,188,159],[338,615,210,158],[599,613,220,159],[873,616,225,153],[1146,619,236,149],[20,803,267,147],[305,804,257,145],[577,811,259,138],[849,811,258,137],[1120,818,262,123],[18,971,287,134]],"heads":[[0.99,0.68],[0.99,0.67],[0.99,0.69],[0.99,0.7],[0.99,0.73],[0.98,0.72],[0.98,0.75],[0.96,0.77],[0.94,0.8],[0.89,0.81],[0.78,0.79],[0.69,0.8],[0.5,0.73],[0.28,0.76],[0.2,0.79],[0.12,0.77],[0.055,0.77],[0.035,0.73],[0.02,0.75],[0.015,0.74],[0.01,0.64],[0.01,0.64],[0.01,0.65],[0.01,0.62],[0.01,0.56],[0.99,0.63]]},
  };
  for(const id of ["iwana","amago","kajika"])native[id].continuousBody=true;
  for(const [id,definition]of Object.entries(native))species[id].asset=definition.asset;
  const assets=id=>[species[id].asset];
  const projection=()=>1;
  // A few loach originals use a larger drawing scale. Normalize both axes
  // together, preserving their anatomy while keeping the same individual.
  const cellScale=(id,cell)=>native[id]?.scales?.[cell]||1;
  const cellAsset=id=>species[id].asset;
  const turn=[1,.72,.36,0,-.36,-.72,-1].map((xScale,i)=>({xScale,yOffset:[0,.025,.06,.08,.06,.025,0][i]}));
  const mouth=[{xScale:1,yOffset:0},{xScale:1,yOffset:.025},{xScale:1,yOffset:.05}];
  const heads=[[.985,.62],[.985,.68],[.98,.75],[.5,.75],[.02,.72],[.015,.65],[.015,.62],[.985,.72]];
  const headOffset=.32;
  const lerp=(a,b,t)=>a+(b-a)*t;
  const clamp=(value,min,max)=>Math.max(min,Math.min(max,Number(value)||0));
  const specialHeads={
    iwana:[[.995,.66],[.98,.74],[.78,.78],[.50,.77],[.22,.76],[.015,.73],[.015,.64],[.995,.51]],
    namazu:[[.91,.65],[.85,.74],[.835,.74],[.43,.75],[.10,.74],[.146,.70],[.09,.65],[.95,.59]],
    unagi:[[.985,.65],[.96,.90],[.78,.92],[.50,.93],[.03,.78],[.015,.72],[.015,.65],[.985,.64]],
    caveNushi:[[.985,.51],[.96,.52],[.95,.55],[.50,.56],[.04,.55],[.015,.51],[.015,.51],[.93,.45]],
    nushi:[[.97,.52],[.95,.57],[.87,.62],[.50,.67],[.08,.60],[.05,.58],[.03,.52],[.96,.56]],
  };
  // Select progressively frontal loach originals, then matching smelt/loach
  // leftward poses. A late Kurodai drawing also needs its opposite-side pair.
  // Keep the source pixels intact while preventing an accidental reverse turn.
  const turnCells={dojo:{10:11,11:13}};
  const mirroredTurns={kurodai:{23:1},wakasagi:Object.fromEntries(Array.from({length:12},(_,i)=>[13+i,11-i])),dojo:Object.fromEntries([13,11,9,8,7,6,5,4,3,2,1,0].map((cell,i)=>[13+i,cell]))};
  function pose(id,cells,frame){
    const clock=Math.max(0,Number(frame)||0),index=Math.floor(clock);
    if(cells===7||cells===5){
      const heading=cells===5?[0,2,3,4,6][Math.min(4,index)]:Math.round(clamp(clock,0,6)*16)/16;
      const from=Math.floor(heading),to=Math.min(6,from+1),mix=heading-from;
      if(native[id]?.dense){
        const authored=heading*4,a=Math.floor(authored),b=Math.min(24,a+1);
        const cell=Math.round(authored),mirror=mirroredTurns[id]?.[cell];
        return {cell:mirror??turnCells[id]?.[cell]??cell,heading,flip:mirror!==undefined,jaw:0,
          target:[.5+headOffset*lerp(turn[from].xScale,turn[to].xScale,mix),
            .62+lerp(turn[from].yOffset,turn[to].yOffset,mix)],
          beat:0,from:a/4,to:b/4,mix:authored-a};
      }
      return {cell:from===6?0:from,heading,flip:from===6,jaw:0,
        target:[.5+headOffset*lerp(turn[from].xScale,turn[to].xScale,mix),
          .62+lerp(turn[from].yOffset,turn[to].yOffset,mix)],beat:0,from,to,mix};
    }
    if(cells===3){const jaw=Math.min(2,index);return {cell:jaw?(native[id]?.dense?25:7):0,jaw,target:[.5+headOffset,.62+mouth[jaw].yOffset],beat:0};}
    return {cell:0,jaw:0,target:[.5+headOffset,.62],beat:clock%8/8*Math.PI*2};
  }
  function hookPose(id,cells,frame){
    const p=pose(id,cells,frame);
    return {xScale:(p.target[0]-.5)/headOffset,yOffset:p.target[1]-.62};
  }
  function sourceHead(id,cell,flip=false){
    const point=native[id]?.heads[cell]||specialHeads[id]?.[cell]||heads[cell];
    // Barbels extend past the actual lip: never attach the hook to a whisker.
    return flip?[1-point[0],point[1]]:point;
  }
  function source(id,cell){const d=species[id];return native[id]?.boxes[cell]||groups[d.group].boxes[d.index*8+cell];}
  const isolatedCells=new WeakMap();
  function isolatedCell(ctx,image,id,cell){
    let cache=isolatedCells.get(image);
    if(!cache){cache=new Map();isolatedCells.set(image,cache);}
    const key=id+':'+cell;
    if(cache.has(key))return cache.get(key);
    const box=source(id,cell),original={image,box};
    try{
      // Atlas rows sometimes overlap by a few pixels. Keep the connected
      // fish silhouette, so a neighbouring fin cannot appear beside it.
      const tile=ctx.canvas.ownerDocument?.createElement('canvas')||new ctx.canvas.constructor(box[2],box[3]);
      tile.width=box[2];tile.height=box[3];
      const painter=tile.getContext('2d');painter.drawImage(image,...box,0,0,tile.width,tile.height);
      const pixels=painter.getImageData(0,0,tile.width,tile.height),data=pixels.data;
      const width=tile.width,height=tile.height,labels=new Int32Array(width*height),queue=new Int32Array(labels.length);
      let label=0,largest=0,best=0;
      for(let start=0;start<labels.length;start++){
        if(labels[start]||data[start*4+3]<48)continue;
        let count=1,read=0;queue[0]=start;labels[start]=++label;
        while(read<count){
          const n=queue[read++],x=n%width,y=Math.floor(n/width);
          for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++){
            if(x+dx<0||x+dx>=width||y+dy<0||y+dy>=height)continue;
            const next=n+dy*width+dx;
            if(!labels[next]&&data[next*4+3]>=48){labels[next]=label;queue[count++]=next;}
          }
        }
        if(count>best){best=count;largest=label;}
      }
      if(best<100){cache.set(key,original);return original;}
      for(let n=0;n<labels.length;n++){
        // Ignore barely visible colored alpha fringes around generated
        // dense atlases. The source PNG remains untouched.
        if(native[id]?.dense&&data[n*4+3]<48){data[n*4+3]=0;continue;}
        if(labels[n]===largest||!data[n*4+3])continue;
        let keep=false;
        // Preserve soft outline pixels touching the fish, including barbels.
        if(!labels[n]){
          const x=n%width,y=Math.floor(n/width);
          for(let dy=-1;dy<=1&&!keep;dy++)for(let dx=-1;dx<=1;dx++)
            if(x+dx>=0&&x+dx<width&&y+dy>=0&&y+dy<height&&labels[n+dy*width+dx]===largest){keep=true;break;}
        }
        if(!keep)data[n*4+3]=0;
      }
      painter.putImageData(pixels,0,0);
      const result={image:tile,box:[0,0,width,height]};cache.set(key,result);return result;
    }catch{cache.set(key,original);return original;}
  }
  const scales={};
  function scaleFor(id){
    if(scales[id])return scales[id];
    let scale=Infinity;
    const count=native[id]?.dense?25:7,step=native[id]?.dense ? .25 : 1;
    for(const p of [...Array.from({length:count},(_,i)=>pose(id,7,i*step)),pose(id,3,2)]){
      const raw=source(id,p.cell),box=[raw[0],raw[1],raw[2]*projection(id,p.cell)*cellScale(id,p.cell),raw[3]*cellScale(id,p.cell)],head=sourceHead(id,p.cell,p.flip),tx=p.target[0]*448,ty=p.target[1]*224;
      for(const [room,extent]of [[tx-22,head[0]*box[2]],[448-tx-22,(1-head[0])*box[2]],[ty-8,head[1]*box[3]],[224-ty-8,(1-head[1])*box[3]]])
        if(extent>0)scale=Math.min(scale,room/extent);
    }
    scales[id]=scale;return scale;
  }
  const meshes=new WeakMap(),turnCache=new Map(),imageKeys=new WeakMap();let nextImageKey=0;
  function cellMesh(ctx,image,id,cell,flip=false){
    const isolated=isolatedCell(ctx,image,id,cell);
    let cache=meshes.get(image);if(!cache){cache=new Map();meshes.set(image,cache);}
    const key=id+':'+cell+':'+flip;if(cache.has(key))return cache.get(key);
    const box=isolated.box,tile=ctx.canvas.ownerDocument?.createElement('canvas')||new ctx.canvas.constructor(box[2],box[3]);
    tile.width=box[2];tile.height=box[3];const painter=tile.getContext('2d');
    if(flip){painter.translate(tile.width,0);painter.scale(-1,1);}
    painter.drawImage(isolated.image,...box,0,0,tile.width,tile.height);
    const data=painter.getImageData(0,0,tile.width,tile.height).data,top=[],bottom=[];
    for(let x=0;x<tile.width;x++){
      let a=tile.height,b=-1;for(let y=0;y<tile.height;y++)if(data[(y*tile.width+x)*4+3]>32){a=Math.min(a,y);b=y;}
      top[x]=a;bottom[x]=b+1;
    }
    const result={image:tile,top,bottom,pixels:data,head:sourceHead(id,cell,flip),
      width:tile.width*scaleFor(id)*projection(id,cell)*cellScale(id,cell),height:tile.height*scaleFor(id)*cellScale(id,cell)};
    cache.set(key,result);return result;
  }
  function mesh(ctx,image,id,heading){const p=pose(id,7,heading);return cellMesh(ctx,image,id,p.cell,p.flip);}
  function paintTurn(ctx,image,id,p,resolveImage){
    // One inverse-mapped raster keeps every destination pixel tied to one
    // original. Overlapping drawImage strips and translucent whole-fish
    // blends duplicated eyes, fins and scales in the intermediate headings.
    if(!imageKeys.has(image))imageKeys.set(image,++nextImageKey);
    const heading=Math.round(p.heading*16)/16,key=imageKeys.get(image)+':'+id+':'+heading;
    let tile=turnCache.get(key);
    if(!tile){
      const q=pose(id,7,heading),aPose=pose(id,7,q.from),bPose=pose(id,7,q.to);
      const a=mesh(ctx,native[id]?resolveImage(cellAsset(id,aPose.cell)):image,id,q.from);
      const b=mesh(ctx,native[id]?resolveImage(cellAsset(id,bPose.cell)):image,id,q.to);
      tile=ctx.canvas.ownerDocument?.createElement('canvas')||new ctx.canvas.constructor(448,224);
      tile.width=448;tile.height=224;const painter=tile.getContext('2d'),pixels=painter.createImageData(448,224);
      const t=q.mix,m=t<.5?a:b,h=m.head[0],tx=q.target[0]*448,ty=q.target[1]*224;
      const width=lerp(a.width,b.width,t),angle=heading/6*Math.PI;
      const leftExtent=lerp(a.head[0]*a.width,b.head[0]*b.width,t);
      const rightExtent=lerp((1-a.head[0])*a.width,(1-b.head[0])*b.width,t);
      const bodyOffset=u=>{
        if(!native[id]?.continuousBody)return 0;
        // The source lip stays fixed. Move the rear/fin endpoints gradually
        // instead of jumping when a new authored mouth coordinate is selected.
        return u<h?(h*width-leftExtent)*Math.pow((h-u)/Math.max(.001,h),1.5):
          (rightExtent-(1-h)*width)*Math.pow((u-h)/Math.max(.001,1-h),1.5);
      };
      const bend=u=>{
        const right=Math.pow(Math.max(0,(h-u)/Math.max(.001,h)),1.6);
        const left=Math.pow(Math.max(0,(u-h)/Math.max(.001,1-h)),1.6);
        const rear=lerp(left,right,(1+Math.cos(angle))/2);
        // A yaw bend is projected through the slightly elevated camera only
        // during a turn. Normal tail beats never shift any row vertically.
        return {x:-width*.05*Math.sin(angle)*Math.cos(angle)*rear,
          y:-Math.min(18,width*.075)*Math.sin(angle*2)*rear};
      };
      // Use a uniform projection around the lip. Matching a frontal mouth to
      // a side-view outline stretched the two pixels before the lip into a
      // long false beak. Only the rear bends; the face keeps its proportions.
      const project=u=>tx+(u-h)*width+bodyOffset(u)+bend(u).x;
      let u=0;
      for(let x=Math.max(0,Math.ceil(project(0)));x<Math.min(448,Math.ceil(project(1)));x++){
        let low=u,high=1;
        for(let n=0;n<12;n++){const middle=(low+high)/2;if(project(middle)<x+.5)low=middle;else high=middle;}
        u=(low+high)/2;
        const index=Math.min(m.image.width-1,Math.floor(u*m.image.width));
        if(m.bottom[index]<=m.top[index])continue;
        // Keep the spine, scale rows and fin roots together. Stretching each
        // column to a different outline tore the pattern across its back.
        const vertical=lerp(a.height,b.height,t);
        const top=(m.top[index]/m.image.height-m.head[1])*vertical;
        const bottom=(m.bottom[index]/m.image.height-m.head[1])*vertical;
        const sy=ty+top+clamp(bend(u).y,8-ty-top,216-ty-bottom),height=bottom-top;
        for(let y=Math.max(0,Math.ceil(sy));y<Math.min(224,Math.ceil(sy+height));y++){
          const sourceY=Math.min(m.image.height-1,Math.max(0,Math.floor(m.top[index]+(y+.5-sy)/Math.max(.001,height)*(m.bottom[index]-m.top[index]))));
          const from=(sourceY*m.image.width+index)*4,to=(y*448+x)*4;
          pixels.data[to]=m.pixels[from];pixels.data[to+1]=m.pixels[from+1];pixels.data[to+2]=m.pixels[from+2];pixels.data[to+3]=m.pixels[from+3];
        }
      }
      painter.putImageData(pixels,0,0);
      if(turnCache.size>=48){
        const oldest=turnCache.keys().next().value,expired=turnCache.get(oldest);
        expired.width=1;expired.height=1;turnCache.delete(oldest);
      }
      turnCache.set(key,tile);
    }
    ctx.drawImage(tile,0,0);
  }
  function paint(ctx,image,id,p,alpha=1,resolveImage){
    if(native[id])image=resolveImage(cellAsset(id,p.cell));
    const originalImage=image,isolated=isolatedCell(ctx,image,id,p.cell),box=isolated.box,head=sourceHead(id,p.cell,p.flip),scale=scaleFor(id)*cellScale(id,p.cell);
    image=isolated.image;
    const width=box[2]*scale*projection(id,p.cell),height=box[3]*scale,x=p.target[0]*448-head[0]*width,y=p.target[1]*224-head[1]*height;
    ctx.save();ctx.globalAlpha=alpha;
    if(p.flip){ctx.translate(448,0);ctx.scale(-1,1);}
    const dx=p.flip?448-x-width:x;
    if(!p.beat||p.heading!==undefined){ctx.drawImage(image,...box,dx,y,width,height);ctx.restore();return;}
    // Sample each pixel once. Thin overlapping strips left vertical seams and
    // blurred the scale pattern, particularly when enlarged on a phone.
    const warp=u=>u+.035*Math.sin(p.beat-u*1.3)*Math.pow(Math.max(0,(.7-u)/.7),2);
    const m=cellMesh(ctx,originalImage,id,p.cell),pixels=ctx.createImageData(448,224);
    let u=0;
    for(let x=Math.max(0,Math.ceil(dx+warp(0)*width));x<Math.min(448,Math.ceil(dx+width));x++){
      let low=u,high=1;
      for(let n=0;n<12;n++){const middle=(low+high)/2;if(dx+warp(middle)*width<x+.5)low=middle;else high=middle;}
      u=x+.5>=dx+.7*width?(x+.5-dx)/width:(low+high)/2;
      const sourceX=Math.min(m.image.width-1,Math.floor(u*m.image.width));
      if(m.bottom[sourceX]<=m.top[sourceX])continue;
      const top=y+m.top[sourceX]/m.image.height*height,bottom=y+m.bottom[sourceX]/m.image.height*height;
      for(let py=Math.max(0,Math.ceil(top));py<Math.min(224,Math.ceil(bottom));py++){
        const sourceY=Math.min(m.image.height-1,Math.max(0,Math.floor((py+.5-y)/height*m.image.height)));
        const from=(sourceY*m.image.width+sourceX)*4,to=(py*448+x)*4;
        pixels.data[to]=m.pixels[from];pixels.data[to+1]=m.pixels[from+1];pixels.data[to+2]=m.pixels[from+2];pixels.data[to+3]=m.pixels[from+3];
      }
    }
    ctx.putImageData(pixels,0,0);
    ctx.restore();
  }
  function draw(ctx,image,id,cells=8,frame=0,resolveImage,motion){
    if(!species[id])return false;
    const p=pose(id,cells,frame);
    // Wait for the requested original rather than cropping the wrong image.
    if(native[id]&&(!resolveImage||!resolveImage(cellAsset(id,p.cell))||
      p.heading!==undefined&&(!resolveImage(cellAsset(id,pose(id,7,p.from).cell))||!resolveImage(cellAsset(id,pose(id,7,p.to).cell)))))return false;
    ctx.clearRect(0,0,448,224);ctx.imageSmoothingEnabled=false;
    if(p.heading!==undefined){
      try{paintTurn(ctx,image,id,p,resolveImage);}catch{paint(ctx,image,id,p,1,resolveImage);}
    }else if(cells===3&&p.jaw===1){
      if(motion?.swimFrame!==undefined)p.beat=motion.swimFrame/8*Math.PI*2;
      paint(ctx,image,id,p,1,resolveImage);
    }else{
      if(motion?.swimFrame!==undefined)p.beat=motion.swimFrame/8*Math.PI*2;
      paint(ctx,image,id,p,1,resolveImage);
    }
    return true;
  }
  return Object.freeze({species,groups,turn,mouth,headOffset,pose,hookPose,sourceHead,scaleFor,draw,assets});
});
