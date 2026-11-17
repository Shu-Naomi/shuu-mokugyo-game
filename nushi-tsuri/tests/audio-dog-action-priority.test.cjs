'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const {boot,seed,read}=require('./game-harness.cjs');
test('audio fixture chooses each dog ahead of nearer tournament NPCs through normal action',()=>{
 const app=boot({...seed(),soundEnabled:true,tournament:require('../tournament.js').create('lakeMasters',500,186)},undefined,{url:'http://localhost/nushi-tsuri/?villageReference=1'});
 try{const w=app.window;w.eval("render();");
 for(const id of ['crow','cloud','jamie','chappie']){
  const reached=w.eval(`(()=>{close();const id=${JSON.stringify(id)},p=ShuRivals.dogPlacements.find(p=>p.id===id);for(let x=p.x-6;x<=p.x+6;x+=2)for(let y=p.y-6;y<=p.y+6;y+=2)for(const direction of ['up','down','left','right']){if(!isWalkableWorld(x,y))continue;s.x=x;s.y=y;s.direction=direction;const rival=nearbyRival(),npc=nearbyTournamentNpc();if(rival?.id===id&&(!npc||rival.distance<npc.distance)){render();return true;}}return false;})()`);
  assert.equal(reached,true,id);w.eval('action()');assert.deepEqual(read(w,'({rival:activeRivalId,npc:activeTournamentNpcId,reaction:rivalDogReaction?.id})'),{rival:id,npc:null,reaction:id});
 }
 }finally{app.dispose();}
});
