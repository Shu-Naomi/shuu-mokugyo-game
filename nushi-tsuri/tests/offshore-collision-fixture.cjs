// Independent floor landmarks read from the unchanged 1672x941 island painting.
// These are regression points, not the collision polygons or their vertices.
const floors=[
 {id:'beach-west',x:94,y:80,radius:1.2},
 {id:'beach-middle',x:104,y:79,radius:1.2},
 {id:'quay-right',x:148,y:86,radius:1.2},
 {id:'shelter-front',x:108,y:55,radius:1.2},
 {id:'lighthouse-west',x:125,y:22,radius:1.2},
 {id:'east-bend',x:175,y:56,radius:1.2},
 {id:'east-low-path',x:190,y:63,radius:1.2},
 {id:'east-stairs',x:207,y:58,radius:1.2},
 {id:'west-path-edge',x:80,y:52,radius:1.2},
 {id:'reported-road',x:143,y:56,radius:.4},
];
const blocked=[
 [181,51],[190,55], // Trees crossed by the former eastern shortcut.
 [103,35],[130,50],[170,75], // Forest and cliff faces.
 [120,96],[140,96],[105,84],[230,55],[10,10],[238,133], // Open water.
];
// Paired road/obstacle landmarks read from the painting, including the user's
// screenshot north of the shelter-east road. Limits are ground edges, not
// offsets computed from the product's trails or widths.
const verges=[
 {id:'reported-bushes',x:143,y:56,direction:'up',axis:'y',min:54.5,blocked:[143,52]},
 {id:'shelter-east-trees',x:150,y:53,direction:'up',axis:'y',min:51,blocked:[150,47]},
 {id:'junction-planter',x:155,y:51,direction:'up',axis:'y',min:49.5,blocked:[155,47]},
 {id:'eastern-trees',x:180,y:59,direction:'up',axis:'y',min:57,blocked:[180,55]},
 {id:'eastern-cliff',x:190,y:63,direction:'down',axis:'y',max:64,blocked:[190,65]},
 {id:'western-forest',x:88,y:54,direction:'down',axis:'y',max:55.5,blocked:[88,60]},
 {id:'lighthouse-rock',x:158,y:44,direction:'left',axis:'x',min:156.5,blocked:[151,44]},
];
blocked.push(...verges.map(p=>p.blocked));
module.exports={floors,blocked,verges};
