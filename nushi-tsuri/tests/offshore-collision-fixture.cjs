// Independent floor landmarks read from the 1672x941 island painting.
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
 {id:'wide-west-reported',x:77,y:60,radius:.4},
 {id:'wide-west-inner-lane',x:76,y:60,radius:.4},
 {id:'wide-west-lower-lane',x:70,y:64,radius:.4},
 {id:'upper-west-reported',x:69,y:42,radius:.4},
 {id:'junction-reported',x:80,y:58,radius:.4},
 {id:'junction-crossing',x:88,y:58,radius:.4},
 {id:'forecourt-wide-lane',x:96,y:60,radius:.4},
];
const blocked=[
 [181,51],[190,55], // Trees crossed by the former eastern shortcut.
 [103,35],[130,50],[170,75], // Forest and cliff faces.
 [120,96],[140,96],[105,84],[230,55],[10,10],[238,133], // Open water.
 [72,37],[74,38], // The two boxes north of the upper western road.
];
// Paired road/obstacle landmarks read from the painting, including the user's
// screenshot north of the shelter-east road. Limits are ground edges, not
// offsets computed from the product's trails or widths.
const verges=[
 {id:'reported-bushes',x:143,y:56,direction:'up',axis:'y',min:54,blocked:[143,52]},
 {id:'shelter-east-trees',x:150,y:53,direction:'up',axis:'y',min:51,blocked:[150,47]},
 {id:'junction-planter',x:155,y:51,direction:'up',axis:'y',min:49,blocked:[155,47]},
 {id:'eastern-trees',x:180,y:60,direction:'up',axis:'y',min:57,blocked:[180,55]},
 {id:'eastern-cliff',x:190,y:63,direction:'down',axis:'y',max:64,blocked:[190,65]},
 {id:'western-forest',x:88,y:54,direction:'down',axis:'y',max:59.25,blocked:[88,60]},
 {id:'lighthouse-rock',x:157,y:44,direction:'left',axis:'x',min:156,blocked:[151,44]},
 // The user's 10596.png foot anchor is now inside the widened dirt bend.
 // The neighboring southern bushes remain beyond the walking boundary.
 {id:'wide-west-forest-edge',x:77,y:60,direction:'down',axis:'y',max:62.5,blocked:[78,64]},
 {id:'upper-west-lower-fence',x:69,y:42,direction:'down',axis:'y',max:43.5,blocked:[69,46]},
 {id:'upper-west-left-fence',x:68,y:42,direction:'left',axis:'x',min:67.5,blocked:[66,42]},
 {id:'junction-branch',x:92,y:56,direction:'down',axis:'y',max:57.5,blocked:[92,59]},
];
blocked.push(...verges.map(p=>p.blocked));
// Fixed button sequences read from the painted ground in 10622/10623.png.
// Unlike route planning, these must cross the open dirt even if a product
// regression would tell a pathfinder to take a detour around an invisible wall.
const transits=[
 {id:'upper-west-road',from:{x:69,y:42},steps:[['left',68,42],['right',72,42],['down',72,45],['right',76,45],['down',76,49],['down',76,53],['right',80,53],['down',80,57],['right',84,57]]},
 {id:'west-junction',from:{x:80,y:58},steps:[['right',84,58],['right',88,58],['up',88,54],['left',84,54],['left',80,54],['down',80,58]]},
 {id:'shelter-forecourt',from:{x:96,y:56},steps:[['right',100,56],['right',104,56],['right',108,56],['down',108,60],['left',104,60],['left',100,60],['left',96,60],['up',96,56]]},
];
module.exports={floors,blocked,verges,transits};
