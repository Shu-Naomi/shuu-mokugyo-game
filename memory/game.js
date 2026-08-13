'use strict';
const icons=['🍘','🦴','🐟','🎾','🪵','🐾'];
let cards=[];
let turn='human';
function shuffle(values){return [...values].sort(()=>Math.random()-.5);}
console.log('犬小屋神経衰弱 ready',shuffle(icons));
