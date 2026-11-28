'use strict';
const Rural=require('./current-game-scripts.cjs').load('rural-canals');
const creek=Rural.fishingPoints.find(p=>p.type==='canalBackwater');
module.exports=[
  {id:'tenagaebi',name:'テナガエビ',number:81,spot:'river-shallow',bank:{mapRegion:'village',x:818/1672*240,y:880/941*135,direction:'left'}},
  {id:'zarigani',name:'ザリガニ',number:82,spot:'mountain-canalBackwater-shallow',bank:{mapRegion:Rural.id,x:creek.x,y:creek.y,direction:creek.direction}}
].map(trip=>({...trip,bait:'worm',hook:'small',minutes:600}));
