'use strict';
const icons=['🍘','🦴','🐟','🎾','🪵','🐾'];
const skill={easy:.35,normal:.65,hard:.9};
let diff='normal',cards=[],open=[],turn=0,humanScore=0,shuuScore=0;
function shuffle(values){return [...values].sort(()=>Math.random()-.5);}
console.log('犬小屋神経衰弱 ready',shuffle(icons));
