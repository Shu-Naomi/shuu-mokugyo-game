const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const {createCanvas,loadImage}=require('@napi-rs/canvas');
const R=require('../rival-anglers.js'),T=require('../tournament.js');
const {boot,seed,read}=require('./game-harness.cjs');
const progress=w=>read(w,'({money:s.money,hp:s.hp,baits:s.baits,items:s.items,caught:s.caught,clock:s.gameMinutes,dog:s.dog,affinity:s.dogAffinity,tournament:s.tournament})');
function controlledReactions(w){
  let now=1000;const plays=[];
  Object.defineProperty(w.performance,'now',{value:()=>now,configurable:true});
  for(const id of ['rivalDogBark','rivalDogWhine']){
    const sample=w.gameAudioSample(id);
    sample.play=function(){this.paused=false;plays.push({id,rate:this.playbackRate});return Promise.resolve();};
  }
  return {plays,advance(ms){now+=ms;const id=read(w,'rivalDogAnimation');if(id){w.cancelAnimationFrame(id);w.animateRivalDogReaction(now);}},
    pending:()=>Boolean(read(w,'rivalDogAnimation'))};
}
function approach(w,id){
  const p=R.dogPlacements.find(p=>p.id===id);
  const reached=w.eval(`(()=>{
    for(let x=${p.x-6};x<=${p.x+6};x+=2)for(let y=${p.y-6};y<=${p.y+6};y+=2)
    for(const direction of ['up','down','left','right']){
      if(!isWalkableWorld(x,y))continue;s.x=x;s.y=y;s.direction=direction;
      if(nearbyRival()?.id===${JSON.stringify(id)}){render();return true;}
    }return false;
  })()`);
  assert.equal(reached,true,id);
}

test('each dog answers actual A presses with its voice and three reactions, without changing fishing or affinity',()=>{
  const app=boot({...seed(),soundEnabled:true,tournament:T.create('lakeMasters',500,181)}),w=app.window;
  const clock=controlledReactions(w);
  try{
    const before=progress(w);
    for(const dog of R.dogs){
      approach(w,dog.id);w.action();
      const voiceCount=clock.plays.length;
      assert.equal(clock.plays.at(-1).rate,R.dogGreetings[dog.id].rate);
      assert.match(w.document.querySelector('#tournamentTalkLine').textContent,/ワ[ンフ]/);
      w.renderRivalTalk(false);w.renderRivals();
      assert.equal(clock.plays.length,voiceCount,'an image load/redraw must not bark again');
      const lines=new Set();
      for(let turn=0;turn<3;turn++){
        if(turn){clock.advance(400);w.document.querySelector('#tournamentTalkMore').click();}
        lines.add(w.document.querySelector('#tournamentTalkLine').textContent);
        clock.advance(650);
        const node=w.document.querySelector(`[data-rival="${dog.id}"]`);
        assert.equal(node.dataset.reaction,R.dogGreeting(dog.id,turn).action);
        if(turn===1){
          assert.equal(clock.plays.at(-1).id,'rivalDogWhine');
          assert.ok(Number(node.style.getPropertyValue('--greeting-heart'))>0);
          const state=read(w,'rivalDogReaction');
          assert.ok(Math.hypot(state.approachX,state.approachY)<=1.250001);
          assert.equal(w.isWalkableWorldSegment(state.placement.x,state.placement.y,
            state.placement.x+state.approachX,state.placement.y+state.approachY),true);
        }
      }
      assert.equal(lines.size,3);
      clock.advance(3000);assert.equal(read(w,'rivalDogReaction'),null);assert.equal(clock.pending(),false);
      w.close();clock.advance(400);
    }
    assert.deepEqual(progress(w),before);
    assert.deepEqual(app.errors,[]);
  }finally{app.dispose();}
});

test('rapid input, mute, closing and backgrounding cannot pile up or leave greeting sounds or animation running',()=>{
  const app=boot({...seed(),soundEnabled:true}),w=app.window,clock=controlledReactions(w);
  try{
    approach(w,'jamie');w.action();const initial=clock.plays.length;
    for(let i=0;i<15;i++)w.action();
    assert.equal(clock.plays.length,initial,'rapid taps do not create an audio pile-up');
    clock.advance(300);w.action();assert.equal(clock.plays.length,initial+1);
    w.setSoundEnabled(false);assert.equal(w.gameAudioSampleIsPlaying('rivalDogBark'),false);
    assert.equal(w.gameAudioSampleIsPlaying('rivalDogWhine'),false);
    clock.advance(400);w.action();assert.equal(clock.plays.length,initial+1);
    assert.notEqual(read(w,'rivalDogReaction'),null,'silent greetings still move');
    w.close();assert.equal(clock.pending(),false);assert.equal(read(w,'rivalDogReaction'),null);
    w.setSoundEnabled(true);clock.advance(400);w.action();
    Object.defineProperty(w.document,'hidden',{value:true,configurable:true});
    w.document.dispatchEvent(new w.Event('visibilitychange'));
    assert.equal(clock.pending(),false);assert.equal(read(w,'rivalDogReaction'),null);
    for(const id of ['rivalDogBark','rivalDogWhine'])assert.equal(w.gameAudioSampleIsPlaying(id),false);
    const count=clock.plays.length;
    Object.defineProperty(w.document,'hidden',{value:false,configurable:true});
    w.document.dispatchEvent(new w.Event('visibilitychange'));w.renderRivalTalk(false);
    assert.equal(clock.plays.length,count,'returning from the background does not replay a voice');
    assert.deepEqual(app.errors,[]);
  }finally{app.dispose();}
});

test('reduced motion keeps the spoken and written greeting without scheduling a dog animation',()=>{
  const app=boot({...seed(),soundEnabled:true}),w=app.window,clock=controlledReactions(w);
  try{
    w.matchMedia=query=>({matches:query.includes('prefers-reduced-motion')});
    approach(w,'crow');w.action();assert.equal(clock.plays.length,1);
    assert.match(w.document.querySelector('#tournamentTalkLine').textContent,/クロー/);
    assert.equal(read(w,'rivalDogReaction'),null);assert.equal(clock.pending(),false);
    w.close();assert.equal(w.gameAudioSampleIsPlaying('rivalDogBark'),false);
    assert.deepEqual(app.errors,[]);
  }finally{app.dispose();}
});

test('conversation controls replace the obscured world buttons, and shop Chappie remains visible then returns to Sam',()=>{
  const app=boot(),w=app.window;
  try{
    w.eval('s.x=199;s.y=96;renderSamShop();open("store")');
    w.document.querySelector('#chappieTalk').click();
    const controls=w.document.querySelector('.controls'),world=w.document.querySelector('#world');
    assert.ok(w.document.querySelector('[data-rival="chappie"]'),'Chappie can react on the map while the shop conversation is open');
    assert.equal(controls.inert,true);assert.equal(controls.getAttribute('aria-hidden'),'true');
    assert.equal(w.getComputedStyle(controls).visibility,'hidden');
    assert.equal(w.getComputedStyle(w.document.querySelector('#fieldNotices')).visibility,'hidden');
    const before=read(w,'[s.x,s.y]');w.move('up');assert.deepEqual(read(w,'[s.x,s.y]'),before);
    w.document.querySelector('#tournamentTalk [data-close]').click();
    assert.equal(w.document.querySelector('#store').classList.contains('open'),true);
    assert.equal(w.document.querySelector('[data-rival="chappie"]'),null);
    assert.equal(controls.inert,false);assert.equal(world.classList.contains('talking'),false);
    w.close();assert.equal(w.getComputedStyle(controls).visibility,'visible');
    assert.deepEqual(app.errors,[]);
  }finally{app.dispose();}
});

test('hint, creel and long notices flow in one column and scroll together outside the status panel',()=>{
  const app=boot({...seed(),tournament:T.create('lakeMasters',500,181)}),w=app.window;
  try{
    w.showRescueToast('🎣 星湖名手挑戦開始！ 湖へ向かおう。大会ビクで残り時間を確認できるよ。',4200);
    const stack=w.document.querySelector('#fieldNotices');
    assert.deepEqual([...stack.children].map(e=>e.id),['hint','tournamentHud','rescueToast']);
    assert.equal(w.getComputedStyle(stack).flexDirection,'column');
    for(const child of stack.children)assert.equal(w.getComputedStyle(child).position,'static');
    assert.equal(w.document.querySelector('#idleStatus').parentElement.contains(stack),true);
    w.document.querySelector('#world').scrollLeft=125;w.document.querySelector('#world').scrollTop=77;
    w.positionTournamentHud();assert.equal(stack.style.transform,'translate(125px, 77px)');
    assert.equal(w.document.querySelector('#tournamentHud').style.transform,'');
    w.showFieldMenu();assert.equal(w.getComputedStyle(w.document.querySelector('#hint')).display,'none');
    assert.notEqual(w.getComputedStyle(w.document.querySelector('#tournamentHud')).visibility,'hidden','the creel stays accessible with the menu open');
    w.hideFieldMenu();assert.notEqual(w.getComputedStyle(w.document.querySelector('#hint')).display,'none');
    assert.deepEqual(app.errors,[]);
  }finally{app.dispose();}
});

test('all animated poses retain transparent margins and recognizable artwork',async()=>{
  const atlas=await loadImage(path.join(__dirname,'..',R.dogAsset));
  const sheet=createCanvas(960,460),ctx=sheet.getContext('2d');ctx.fillStyle='#203943';ctx.fillRect(0,0,960,460);
  for(const [row,dog] of R.dogs.entries()){
    for(const [column,ms] of [0,600,1100,1600,2100,2600].entries()){
      const canvas=createCanvas(128,96),motion=R.dogReactionPose(dog.id,'nuzzle',ms);
      assert.equal(R.draw(canvas,atlas,dog.id,{sitting:motion.sitting,motion}),true);
      const pixels=canvas.getContext('2d').getImageData(0,0,128,96).data;
      let visible=0,edge=0;
      for(let y=0;y<96;y++)for(let x=0;x<128;x++)if(pixels[(y*128+x)*4+3]>100){visible++;if(x===0||x===127||y===0||y===95)edge++;}
      assert.ok(visible>1800,dog.id+' body');assert.ok(edge<5,dog.id+' no clipped edges');
      ctx.drawImage(canvas,column*160+16,row*115);
      ctx.fillStyle='#fff0bd';ctx.font='12px sans-serif';ctx.fillText(dog.id+' '+ms+'ms',column*160+16,row*115+109);
    }
  }
  if(process.env.DOG_QA_PATH)fs.writeFileSync(process.env.DOG_QA_PATH,sheet.toBuffer('image/png'));
});

test('the friendly whine is a short, unclipped offline asset',()=>{
  const file='assets/audio/dog-friendly-whine-v181.wav',data=fs.readFileSync(path.join(__dirname,'..',file));
  assert.equal(data.toString('ascii',0,4),'RIFF');assert.equal(data.readUInt32LE(24),24000);
  const duration=data.readUInt32LE(40)/2/24000;assert.ok(duration>.5&&duration<1.2);
  let peak=0;for(let i=44;i<data.length;i+=2)peak=Math.max(peak,Math.abs(data.readInt16LE(i)));
  assert.ok(peak>10000&&peak<30000);assert.ok(Math.abs(data.readInt16LE(44))<10);
  assert.ok(Math.abs(data.readInt16LE(data.length-2))<10);
  assert.ok(fs.readFileSync(path.join(__dirname,'../sw.js'),'utf8').includes(file));
});
