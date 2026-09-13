const {test}=require('node:test');
const assert=require('node:assert/strict');
const T=require('../tournament.js'), N=require('../tournament-npcs.js');
const {boot,seed,read}=require('./game-harness.cjs');

test('masters gain three player attempts while every seeded rival fish keeps its original size',()=>{
  assert.equal(T.maxCasts('lakeFuna'),9);
  assert.equal(T.maxCasts('lakeMasters'),12);
  const oldDefinition={...T.definitions.lakeMasters,duration:90,regulationVersion:1};
  for(let seed=0;seed<1000;seed++){
    const old=N.generate(oldDefinition,seed), current=T.create('lakeMasters',500,seed);
    assert.deepEqual(current.participants.map(p=>p.catches.map(f=>f.hundredths)),old.map(p=>p.catches.map(f=>f.hundredths)));
    for(let i=0;i<old.length;i++)
      assert.deepEqual(current.participants[i].catches.map(f=>f.cast),old[i].catches.map(f=>Math.ceil(f.cast*12/9)));
  }
  const t=T.create('lakeMasters',500,17);
  for(let cast=1;cast<=12;cast++){
    assert.equal(T.commitCast(t,'lake'),true);
    T.finishCast(t,cast===1?{fishId:'funa',hundredths:4999}:null);
    assert.equal(t.phase,cast===12?'result':'active');
    assert.equal(T.remaining(t),120-cast*10);
  }
  assert.equal(T.resultReward(t).completed,true);
  assert.equal(T.commitCast(t,'lake'),false);
});

test('v179 entries keep nine attempts and pending or completed prizes across reloads',()=>{
  const old={...T.create('lakeMasters',500,77),casts:9,regulationVersion:undefined};
  old.participants=N.generate({...T.definitions.lakeMasters,duration:90},77);
  old.creel=Array.from({length:5},()=>({fishId:'funa',hundredths:4000}));
  const pending=T.normalize({...old,pending:{fishId:'funa',hundredths:4999}});
  assert.equal(T.maxCasts(pending),9);
  assert.equal(T.remaining(pending),0);
  assert.equal(pending.phase,'active');
  assert.equal(T.canCast(pending,'lake'),false);
  T.choose(pending,0);
  assert.equal(pending.phase,'result');
  assert.equal(T.resultReward(pending).trophy,true);
  assert.equal(T.resultReward(T.normalize(JSON.parse(JSON.stringify(pending))))?.trophy,true);
  const inFlight=T.normalize({...old,inFlight:true});
  assert.equal(inFlight.recoveredCast,true);
  assert.equal(inFlight.phase,'result');
  assert.equal(T.resultReward(inFlight).completed,true);
  assert.deepEqual(inFlight.participants,old.participants);
  assert.equal(T.maxCasts(T.create('lakeMasters',590,77)),12,'the next entry accepts the new regulation');
});

test('A reaches the visible narrow river beside the sign and both banks without opening another interaction',()=>{
  const app=boot({...seed(),soundEnabled:false}),w=app.window;
  try{
    // This shoreline fixture has already been harvested. Random collectible
    // placement is tested separately and legitimately takes the next A press.
    w.eval('ensureForageCycle().active={}');
    const original=read(w,'({money:s.money,baits:s.baits,clock:s.gameMinutes})');
    for(const [x,y,d]of [[119,68,'left'],[119,72,'left'],[115,72,'left'],[119,76,'left'],[115,92,'left'],[103,92,'right']]){
      w.eval(`s.x=${x};s.y=${y};s.direction=${JSON.stringify(d)};render()`);
      assert.equal(w.isWalkableWorld(x,y),true);
      assert.match(w.document.querySelector('#hint').textContent,/川辺.*Aで釣る/);
      const spot=w.fishingWaterNearPlayer();
      assert.equal(w.waterZoneAtWorld(spot.x,spot.y),'river');
      w.action();
      assert.equal(read(w,'battle.waterZone'),'river');
      assert.equal(w.document.querySelector('.modal.open'),null);
      assert.equal(read(w,'battle.phase'),'prep');
      w.beginFishing();w.wait();
    }
    assert.deepEqual(read(w,'({money:s.money,baits:s.baits,clock:s.gameMinutes})'),original);
    for(const [x,y,d]of [[119,72,'right'],[109,84,'up'],[109,84,'down'],[123,73,'left']])
      assert.equal(w.fishingWaterNearPlayer(x,y,d),null,'away from water, bridge span or sign base');
    assert.deepEqual(app.errors,[]);
  }finally{app.dispose();}
});

test('the noticeboard has an approachable front on every movement grid and ignores its back and sides',()=>{
  const app=boot(),w=app.window;
  try{
    for(let ox=0;ox<4;ox++)for(let oy=0;oy<4;oy++){
      const positions=[];
      for(let x=116+ox;x<=128;x+=4)for(let y=72+oy;y<=80;y+=4)
        if(w.isAtQuestBoardFront(x,y,'up'))positions.push([x,y]);
      assert.ok(positions.length,`front approachable ${ox},${oy}`);
      const [x,y]=positions[0];w.eval(`s.x=${x};s.y=${y};s.direction="up";render()`);w.action();
      assert.equal(w.document.querySelector('#questBoard').classList.contains('open'),true);
      w.close();
      for(const d of ['left','right','down'])assert.notEqual(w.nearbyWorldLandmark(x,y,d)?.id,'quest-board');
    }
    for(const [x,y]of [[119,68],[119,72],[119,76],[123,68],[127,72],[123,80]])
      for(const d of ['up','left','right','down'])assert.notEqual(w.nearbyWorldLandmark(x,y,d)?.id,'quest-board');
    assert.deepEqual(app.errors,[]);
  }finally{app.dispose();}
});

// Drive the real scheduling/interaction handlers synchronously. Other game
// clocks and rewards are untouched; only wall-clock timeout delivery is held.
function clock(w){
  w.hideFieldMenu();w.hideIdleStatus();
  const clear=w.clearTimeout.bind(w),tasks=new Map();let now=0,id=100000;
  w.setTimeout=(fn,delay=0,...args)=>{const key=++id;tasks.set(key,{at:now+delay,fn,args});return key;};
  w.clearTimeout=key=>{if(!tasks.delete(key))clear(key);};
  return ms=>{const end=now+ms;for(;;){const next=[...tasks].filter(([,t])=>t.at<=end).sort((a,b)=>a[1].at-b[1].at)[0];if(!next)break;now=next[1].at;tasks.delete(next[0]);next[1].fn(...next[1].args);}now=end;};
}

test('status retains its short delay, auto-menu waits five seconds and fresh input restarts the wait',()=>{
  const app=boot({...seed(),x:123,y:92,direction:'down',soundEnabled:false}),w=app.window;
  try{
    const advance=clock(w);w.scheduleIdleStatus();w.scheduleFieldMenu();
    advance(649);assert.equal(w.document.querySelector('#idleStatus').classList.contains('show'),false);
    advance(1);assert.equal(w.document.querySelector('#idleStatus').classList.contains('show'),true);
    advance(4349);assert.equal(w.fieldMenuIsOpen(),false);
    w.action();assert.equal(read(w,'battle'),null);
    advance(4999);assert.equal(w.fieldMenuIsOpen(),false);
    advance(1);assert.equal(w.fieldMenuIsOpen(),true);
    w.hideFieldMenu();w.document.querySelector('#menu').click();assert.equal(w.fieldMenuIsOpen(),true,'manual menu is immediate');
    w.eval('open("store");close()');
    advance(450);assert.equal(w.fieldMenuIsOpen(),false,'closing a dialog cannot restore the old 450ms delay');
    assert.equal(w.document.querySelector('#idleStatus').classList.contains('show'),true);
    advance(4549);assert.equal(w.fieldMenuIsOpen(),false);advance(1);assert.equal(w.fieldMenuIsOpen(),true);
    assert.deepEqual(app.errors,[]);
  }finally{app.dispose();}
});

test('rapid successive casts remain clear of the menu and pay bait and time once each',()=>{
  const original={...seed(),x:119,y:72,direction:'left',soundEnabled:false};
  const app=boot(original),w=app.window;
  try{
    w.eval('ensureForageCycle().active={}');
    const advance=clock(w);
    for(let i=0;i<4;i++){
      w.action();assert.equal(read(w,'battle.phase'),'prep');assert.equal(w.fieldMenuIsOpen(),false);
      w.beginFishing();w.launchSurfaceCast();w.wait();
      assert.equal(read(w,'battle'),null);
      advance(1000);assert.equal(w.fieldMenuIsOpen(),false);
    }
    assert.equal(read(w,'s.baits.worm'),original.baits.worm-4);
    assert.equal(read(w,'s.gameMinutes'),original.gameMinutes+40);
    advance(3999);assert.equal(w.fieldMenuIsOpen(),false);advance(1);assert.equal(w.fieldMenuIsOpen(),true);
    assert.deepEqual(app.errors,[]);
  }finally{app.dispose();}
});
