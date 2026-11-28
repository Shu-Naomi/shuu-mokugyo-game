// Actual casting positions: village lake and harbor, two banks on the
// stream map, and an equipped canoe beside the coastal reef.
module.exports = [
  {id:'aouo', number:76, name:'アオウオ', spot:'lake-deep', bait:'shell', hook:'large', minutes:720,
    bank:{mapRegion:'village', x:135, y:48, direction:'up'}, water:'淡水'},
  {id:'sougyo', number:77, name:'ソウギョ', spot:'mountain-marsh-mid', bait:'paste', hook:'large', minutes:720,
    bank:{mapRegion:'stream', x:172, y:100, direction:'right'}, water:'淡水'},
  {id:'maanago', number:78, name:'マアナゴ', spot:'sea-deep', bait:'liveMinnow', hook:'medium', minutes:1260,
    bank:{mapRegion:'village', x:123, y:116, direction:'down'}, water:'海水'},
  {id:'gonzui', number:79, name:'ゴンズイ', spot:'coast-reef-mid', bait:'smallShrimp', hook:'small', minutes:1260,
    bank:{mapRegion:'coast', x:95, y:84, direction:'up', boatActive:true, ownedVehicles:['canoe'],
      equipment:{hands:null,vehicle:'canoe'}}, water:'海水'},
  {id:'itou', number:80, name:'イトウ', spot:'mountain-stream-deep', bait:'liveMinnow', hook:'large', minutes:420,
    bank:{mapRegion:'stream', x:125, y:68, direction:'left'}, water:'淡水'},
];
