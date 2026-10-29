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
];
const blocked=[
 [181,51],[190,55], // Trees crossed by the former eastern shortcut.
 [103,35],[130,50],[170,75], // Forest and cliff faces.
 [120,96],[140,96],[105,84],[230,55],[10,10],[238,133], // Open water.
];
module.exports={floors,blocked};
