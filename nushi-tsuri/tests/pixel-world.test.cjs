const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const {createCanvas}=require('@napi-rs/canvas');
const Pixel=require('../pixel-world.js'),Cast=require('../pixel-cast.js');
const {boot,read,saveKey}=require('./game-harness.cjs');
const env=(season,period)=>({season,period,key:season+':'+period});
const digest=c=>crypto.createHash('sha256').update(c.getContext('2d').getImageData(0,0,c.width,c.height).data).digest('hex');
const geometry=w=>w.eval('({isLakeWater,isRiverWater,isSeaWater,isPracticePondWater,isOnRiverBridge,isOnLakeDock,isOnHarborWalkway,seaWaterY,isBlockedStructure,structureBounds,mainShrineApproachBounds,samShopApproachBounds,harborCornerPassageBounds})');

test('the saved clock selects all four seasons and five visual periods, including boundaries',()=>{
  const hours={dawn:4,morning:6,day:12,evening:17,night:20};
  for(let season=0;season<4;season++)for(const [period,hour] of Object.entries(hours)){
    const c=Pixel.calendar(season*30*1440+hour*60);
    assert.equal(c.season,Pixel.seasons[season]);assert.equal(c.period,period);assert.equal(c.seasonDay,1);
  }
  for(const [minute,period] of [[239,'night'],[240,'dawn'],[359,'dawn'],[360,'morning'],[599,'morning'],[600,'day'],[1019,'day'],[1020,'evening'],[1139,'evening'],[1140,'night']])assert.equal(Pixel.calendar(minute).period,period);
  assert.equal(Pixel.calendar(30*1440-1).season,'spring');
  assert.equal(Pixel.calendar(120*1440).season,'spring');assert.equal(Pixel.calendar(120*1440).year,2);
  assert.equal(Pixel.calendar(-1).year,1);assert.equal(Pixel.calendar(NaN).period,'morning');
});

test('the browser and offline cache load the same detailed scene modules',()=>{
  const html=fs.readFileSync(path.join(__dirname,'../index.html'),'utf8');
  const worker=fs.readFileSync(path.join(__dirname,'../sw.js'),'utf8');
  assert.doesNotMatch(html,/ShuPixel\.draw(?:World|Surface|Underwater|Interior|HomeExterior)\(/);
  for(const file of ['pixel-world.js','pixel-cast.js','pixel-scenes.css','scene-layers.js','layered-scenery.js']){
    const url=[...html.matchAll(/(?:src|href)="([^"]+)"/g)].map(match=>match[1]).find(url=>url.startsWith(file+'?'));
    assert.ok(url&&worker.includes('./'+url),`${file}: offline cache uses the exact browser URL`);
  }
  const scenery=fs.readFileSync(path.join(__dirname,'../layered-scenery.js'),'utf8');
  const workerUrl=scenery.match(/new Worker\('([^']+)'\)/)?.[1];
  assert.ok(workerUrl&&worker.includes('./'+workerUrl),'offline cache uses the actual scenery Worker URL');
  const sceneryWorker=fs.readFileSync(path.join(__dirname,'../scenery-worker.js'),'utf8');
  for(const match of sceneryWorker.matchAll(/'([^']+\.js\?[^']+)'/g))
    assert.ok(worker.includes('./'+match[1]),'Worker imports are available in the same offline cache');
});

test('rendered water uses actual collision geometry and all landmarks remain reachable',()=>{
  const app=boot(),w=app.window;
  try{
    const g=geometry(w);
    for(let y=3;y<133;y+=2)for(let x=3;x<238;x+=2){
      const type=Pixel.worldTile(x,y,g),water=['lake','river','sea','pond'].includes(type);
      const expected=g.isLakeWater(x,y)||g.isRiverWater(x,y)||g.isSeaWater(x,y)||g.isPracticePondWater(x,y);
      assert.equal(water,expected,`water and shore ${x},${y}`);
      if(water)assert.equal(w.eval(`isWalkableWorld(${x},${y})`),false);
    }
    const result=w.eval(`(()=>{
      const visited=new Set(),queue=[{x:10,y:79}],reached=new Set();
      for(let i=0;i<queue.length;i++){
        const a=queue[i],key=a.x+','+a.y;if(visited.has(key))continue;visited.add(key);
        for(const spot of worldLandmarks)if(Math.hypot(a.x-spot.x,a.y-spot.y)<spot.radius)reached.add(spot.id);
        if(isAtSamShopEntrance(a.x,a.y))reached.add('sam-shop');
        if(isNearPracticePond(a.x,a.y))reached.add('practice-pond');
        for(const [dx,dy] of [[2,0],[-2,0],[0,2],[0,-2]]){
          const b={x:a.x+dx,y:a.y+dy};
          if(!visited.has(b.x+','+b.y)&&isWalkableWorldSegment(a.x,a.y,b.x,b.y))queue.push(b);
        }
      }
      return {expected:worldLandmarks.map(l=>l.id).concat(['sam-shop','practice-pond']),reached:[...reached]};
    })()`);
    for(const id of result.expected)assert.ok(result.reached.includes(id),id+' has a path from home');
    const bounds=read(w,'playerHomeAreaData.interior.blocked');
    for(const f of Pixel.homeFurniture)assert.ok(bounds.some(b=>Math.abs(b.left-f.x)<1e-8&&Math.abs(b.bottom-f.y-f.h)<1e-8),'each painted furnishing is solid: '+f.id);
  }finally{app.dispose();}
});

test('scenery is cached across movement, updates on time changes, and survives save/load without new state',()=>{
  const app=boot(),w=app.window;
  try{
    const count=w.eval('pixelScenePaints');
    w.eval('for(let i=0;i<10;i++){render();}');
    assert.equal(w.eval('pixelScenePaints'),count,'walking does not repaint the entire map');
    const original=read(w,'({money:s.money,caught:s.caught,baits:s.baits,dogAffinity:s.dogAffinity,questCompletions:s.questCompletions})');
    w.eval('s.gameMinutes=95*1440+280;render();save()');
    assert.equal(w.eval('pixelScenePaints'),count+1);
    assert.match(w.document.querySelector('#time').textContent,/冬6日.*明け方/);
    assert.deepEqual(read(w,'({money:s.money,caught:s.caught,baits:s.baits,dogAffinity:s.dogAffinity,questCompletions:s.questCompletions})'),original);
    const saved=JSON.parse(w.localStorage.getItem(saveKey)),again=boot(saved);
    try{assert.deepEqual(read(again.window,'ShuPixel.calendar(s.gameMinutes)'),read(w,'ShuPixel.calendar(s.gameMinutes)'));assert.deepEqual(again.errors,[]);}finally{again.dispose();}
    w.eval('open("store")');assert.ok(w.document.querySelector('#shopPixels'));
    w.eval('close();openLocationInterior("diner")');assert.match(w.document.querySelector('#locationPixels').getAttribute('aria-label'),/食堂/);
    assert.deepEqual(app.errors,[]);
  }finally{app.dispose();}
});

test('both pixel anglers keep hands, rod and planted feet continuous on wide and tall screens',()=>{
  for(const [width,height] of [[640,274],[640,320],[640,960]]){
    const canvas=createCanvas(width,height);
    for(const avatar of ['boy','girl'])for(const rod of ['bamboo','youngBamboo','clearStream','starGazer','moroko']){
      let previous;
      for(let frame=0;frame<=120;frame++){
        const progress=frame/120,m=Cast.draw(canvas,{avatar,rod,progress,flying:true,target:{x:width*.7,y:height*.5}});
        for(const point of [m.tip,m.hand,m.support,m.butt,m.bobber,m.leftFoot,m.rightFoot])assert.ok(point.x>=0&&point.x<=width&&point.y>=0&&point.y<=height,'entire rig stays visible');
        if(previous){
          assert.deepEqual(m.leftFoot,previous.leftFoot);assert.deepEqual(m.rightFoot,previous.rightFoot);
          assert.ok(Math.hypot(m.hand.x-previous.hand.x,m.hand.y-previous.hand.y)<4*m.box.scale,'no pose teleport');
          assert.ok(Math.hypot(m.tip.x-previous.tip.x,m.tip.y-previous.tip.y)<15*m.box.scale,'rod follows the same smooth motion');
        }
        previous=m;
      }
      assert.deepEqual(previous.pose.hand,Cast.pose(0).hand,'settle returns to the same grip without a snap');
      assert.ok(Math.hypot(previous.bobber.x-width*.7,previous.bobber.y-height*.5)<1e-7,'landing exactly matches the selected point');
    }
  }
});

test('real cast launch uses one flight clock and one resource deduction; line follows the rendered rod',()=>{
  const app=boot(),w=app.window;
  try{
    w.eval('s.soundEnabled=false;s.avatar="girl";s.selectedRod="bamboo";cast(fishingSpots[0]);beginFishing()');
    // beginFishing is the existing preparation button handler; only the cast
    // timestamp is controlled below, never the motion or resource handlers.
    assert.equal(w.eval('battle.phase'),'cast');
    const before=read(w,'({minutes:s.gameMinutes,bait:s.baits[s.selectedBait]})');
    w.eval('battle.cast=60;launchSurfaceCast();clearInterval(timer)');
    assert.equal(w.eval('battle.phase'),'cast-flight');
    assert.equal(w.eval('s.gameMinutes'),before.minutes+10);assert.equal(w.eval('s.baits[s.selectedBait]'),before.bait-1);
    for(const progress of [0,.18,.41,.58,.81,.99]){
      w.eval(`syncSurfaceCastRig(surfaceCastMotionStartedAt+SURFACE_CAST_MOTION_MS*${progress})`);
      const origin=read(w,'castLineOrigin()'),m=read(w,'pixelCastModel');
      const c=w.document.querySelector('#castActor');
      assert.ok(Math.abs(origin.x-m.tip.x/c.width*1000)<1e-8);
      assert.ok(Math.abs(origin.y-m.tip.y/c.height*500)<1e-8);
      const line=w.document.querySelector('#castLinePath').getAttribute('d');
      assert.ok(line.startsWith(`M ${origin.x} ${origin.y} L `));
    }
    assert.equal(w.eval('launchSurfaceCast()'),false,'A during flight cannot consume twice');
    w.eval('settleSurfaceCast()');assert.equal(w.eval('battle.phase'),'wait');
    assert.equal(w.eval('s.baits[s.selectedBait]'),before.bait-1);
    const again=w.eval('settleSurfaceCast()');assert.equal(again,false);
    assert.deepEqual(app.errors,[]);
  }finally{app.dispose();}
});
