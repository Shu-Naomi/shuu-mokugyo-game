const test=require('node:test'),assert=require('node:assert/strict');
const {marketAsset}=require('./market-walk-assets.cjs');
const map='assets/village-reference-071ffb660a32ff9e.png',girl='assets/player-girl-front-walk-v252-8.png';
for(const [name,base] of [['local','http://localhost:8799/nushi-tsuri/'],['Pages','https://shu-naomi.github.io/shuu-mokugyo-game/nushi-tsuri/']]){
 test(name+' uses the same checkout asset, but checks the full served resource path',()=>{
  const game=base+'?v=252-69';
  for(const file of [map,girl]){
   const served=new URL(file,base);
   assert.deepEqual(marketAsset(game,served.href),{relative:file,pathname:served.pathname});
   assert.deepEqual(marketAsset(game,file),marketAsset(game,served.href));
  }
  for(const other of ['../assets/other.png','https://invalid.test/'+map,'assets/a%2Fb.png'])assert.throws(()=>marketAsset(game,other));
 });
}
