'use strict';
const assert=require('node:assert/strict');
const {test}=require('node:test');
const {boot,read,seed,saveKey}=require('./game-harness.cjs');
const {runFight}=require('./nushi-playability-v228.cjs');
const Rural=require('../rural-canals.js');
const {total}=require('./fixtures/fish-roster-counts.cjs');
const creek=Rural.fishingPoints.find(p=>p.type==='canalBackwater');
const trips=[
  {id:'tenagaebi',name:'テナガエビ',number:81,spot:'river-shallow',bank:{mapRegion:'village',x:818/1672*240,y:880/941*135,direction:'left'}},
  {id:'zarigani',name:'ザリガニ',number:82,spot:'mountain-canalBackwater-shallow',bank:{mapRegion:Rural.id,x:creek.x,y:creek.y,direction:creek.direction}}
].map(trip=>({...trip,bait:'worm',hook:'small',minutes:600}));
for(const trip of trips){
  test(trip.name+' has locally discoverable bite cues and dedicated art',()=>{
    const app=boot({...seed(),...trip.bank,soundEnabled:false,gameMinutes:trip.minutes,selectedBait:trip.bait,
      selectedHook:trip.hook,ownedRods:['starGazer'],selectedRod:'starGazer'});
    const w=app.window, id=JSON.stringify(trip.id), spot=JSON.stringify(trip.spot);
    try {
      assert.equal(read(w,'fish.length'),total);
      assert.equal(read(w,'fishEncyclopediaData['+id+'].number'),trip.number);
      assert.deepEqual(read(w,'fishingSpots.filter(s=>s.weights['+id+']>0).map(s=>s.id)'),[trip.spot]);
      assert.equal(read(w,'ShuFishArt.species['+id+'].asset'),'assets/fish-'+trip.id+'.png');
      w.eval('action();beginFishing();clearInterval(timer)');
      assert.equal(read(w,'battle.phase'),'cast');
      w.eval(`for(let i=0;i<10000;i++){const r=(i+.5)/10000;Math.random=()=>r;
        if(pick(0,${spot})?.id===${id})break;
      } battle.cast=0;launchSurfaceCast();settleSurfaceCast();syncBitePhase(battle.nibbleAt)`);
      assert.equal(read(w,'battle.spot'),trip.spot);
      assert.equal(read(w,'battle.f.id'),trip.id);
      assert.equal(read(w,'battle.phase'),'wait');
      assert.match(w.document.querySelector('#battleMsg').textContent,/ちょんちょん/);
      w.eval('syncBitePhase(battle.biteAt)');
      assert.equal(read(w,'battle.phase'),'bite');
      const float=w.document.querySelector('#castSurface');
      assert.equal(float.classList.contains('shrimp-side-bite'),trip.id==='tenagaebi');
      assert.match(w.document.querySelector('#battleMsg').textContent,trip.id==='tenagaebi'?/横へ走った/:/しっかり掴んだ/);
      if(trip.id==='zarigani'){
        w.eval(`pressBattleAction();releaseBattleAction();battle.fightMode='gauge';
          battle.x=59;battle.startX=59;battle.y=42;battle.startY=42;battle.facing=1;battle.vx=0;battle.vy=0;
          battle.moodTick=0;moveBattleFish(fightProfiles.zarigani.moods[0]);`);
        assert.ok(read(w,'battle.x')<59,'moves backwards');
        assert.equal(read(w,'battle.facing'),1,'does not turn around to move backwards');
        assert.ok(Math.abs(read(w,'battle.targetVx'))>1);
        w.eval('for(let i=0;i<5;i++)moveBattleFish(fightProfiles.zarigani.moods[0])');
        assert.ok(Math.abs(read(w,'battle.targetVx'))<.001,'dart winds down without repeated direction flips');
      }
      assert.deepEqual(app.errors,[]);
    } finally {app.dispose();}
  });
  for(const mode of ['gauge','nushi'])test(trip.name+' lands once in '+mode+' and survives reload',()=>{
    let saved;
    const result=runFight({id:trip.id,mode,regionalTrip:trip,rod:'starGazer',delayMs:350,gaugeThreshold:42,gaugeResumeThreshold:19,onLanding(w){
      w.eval('caught();caught();save()');
      saved=JSON.parse(w.localStorage.getItem(saveKey));
    }});
    assert.equal(result.phase,'landing',JSON.stringify(result));
    assert.deepEqual(result.errors,[]);
    const app=boot(saved);
    try {
      const id=JSON.stringify(trip.id);
      assert.equal(read(app.window,'s.caught['+id+']'),1);
      assert.equal(read(app.window,'s.catchMemories['+id+'].first.spotId'),trip.spot);
      assert.equal(read(app.window,'petCatalog.find(f=>f.id==='+id+').waterLabel'),'淡水');
      assert.deepEqual(app.errors,[]);
    } finally {app.dispose();}
  });
}
