// Exercise the new artwork and care/recipe controls in the real browser.
const assert=require('node:assert/strict'),{chromium}=require('playwright');
const {seed,saveKey}=require('./game-harness.cjs');
module.exports=async function features(url,mobile){
  const browser=await chromium.launch({headless:true}),errors=[],failedAssets=[];
  const context=await browser.newContext({viewport:mobile?{width:844,height:390}:{width:1280,height:720},
    isMobile:mobile,hasTouch:mobile,locale:'ja-JP'});
  await context.addInitScript(({key,state})=>{
    if(!localStorage.getItem(key))localStorage.setItem(key,JSON.stringify(state));
  },{key:saveKey,state:{...seed(),x:10,y:79,direction:'left',hp:80,soundEnabled:false,
    cookingIngredients:{shirogisuFillet:1,ayuFillet:1,madaiFillet:1},items:{wildGreens:2},baits:{shell:1},
    dogTreats:{samBiscuit:3},ownedDogToys:['rubberBall']}});
  const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));
  page.on('response',r=>{if(r.status()>=400&&/\/assets\/fish-.*\.(png|webp)|fish-art\.js/.test(r.url()))failedAssets.push(r.url());});
  const press=selector=>page.locator(selector)[mobile?'tap':'click']();
  const settle=()=>page.waitForFunction(()=>!playerHomeState.transitioning);
  const careIdle=()=>page.waitForFunction(()=>!dogCareIsBusy());
  async function enterHome(){
    await press('[data-move="left"]');await settle();
    await page.evaluate(()=>{for(let i=0;i<9;i++)move('right');for(let i=0;i<3;i++)move('up');});
    await press('#action');await settle();assert.equal(await page.evaluate(()=>playerHomeState.area),'interior');
  }
  const screenshot=async name=>console.log(name+'_SCREENSHOT '+(mobile?'mobile':'desktop')+
    ' data:image/jpeg;base64,'+(await page.screenshot({type:'jpeg',quality:75})).toString('base64'));
  async function walkHome(target){
    assert.equal(await page.evaluate(target=>{
      const queue=[{x:playerHomeState.x,y:playerHomeState.y,path:[]}],seen=new Set();
      for(let i=0;i<queue.length;i++){
        const p=queue[i],key=p.x+','+p.y;if(seen.has(key))continue;seen.add(key);
        const event=nearbyPlayerHomeEvent('interior',p.x,p.y),dog=nearbyHomeDog(p.x,p.y);
        if(target==='door'?event?.id==='interior-door':!event&&dog?.dogId===target){
          for(const direction of p.path)if(!movePlayerHome(direction))throw Error('Blocked home path');return true;
        }
        for(const direction of ['left','right','up','down']){
          const next=playerHomeMoveTarget('interior',p.x,p.y,direction);
          if(next.x!==p.x||next.y!==p.y)queue.push({...next,path:[...p.path,direction]});
        }
      }return false;
    },target),true,'reachable home '+target);
  }
  try{
    await page.goto(url,{waitUntil:'domcontentloaded'});await press('#start');
    // Material-specific dishes are made and eaten through the kitchen UI.
    await page.evaluate(()=>openLocationInterior('diner'));
    for(const meal of ['shirogisuTempura','ayuShioyaki','madaiUshiojiru']){
      const selector=`#locationInterior [data-cook-recipe="${meal}"]`;assert.equal(await page.locator(selector).isDisabled(),false);
      await press(selector);assert.equal(await page.evaluate(id=>s.preparedMeals[id],meal),1);
      assert.equal(await page.locator(selector).isDisabled(),true,'one portion cooks once');
    }
    assert.deepEqual(await page.evaluate(()=>({fish:s.cookingIngredients,greens:s.items.wildGreens,shell:s.baits.shell})),
      {fish:{fishFillet:0,shirogisuFillet:0,ayuFillet:0,madaiFillet:0},greens:0,shell:0});
    await press('#locationInterior [data-eat-prepared-meal="shirogisuTempura"]');assert.equal(await page.evaluate(()=>s.hp),100);
    await page.evaluate(()=>{s.hp=30;});await press('#locationInterior [data-eat-prepared-meal="ayuShioyaki"]');
    assert.equal(await page.evaluate(()=>s.hp),55);await press('#locationInterior [data-eat-prepared-meal="madaiUshiojiru"]');
    assert.equal(await page.evaluate(()=>s.hp),90);assert.equal(await page.evaluate(()=>mealEffectBonus('dogDiscovery')),.35);
    await screenshot('COOKING');await press('#locationInterior [data-close]');
    await page.reload({waitUntil:'domcontentloaded'});await press('#start');
    assert.equal(await page.evaluate(()=>s.hp),90);assert.equal(await page.evaluate(()=>s.preparedMeals.madaiUshiojiru),0);
    assert.equal(await page.evaluate(()=>mealEffectBonus('dogDiscovery')),.35);
    // Reach a roaming dog and open its care screen with the field A button.
    await enterHome();
    await walkHome('riku');await press('#action');assert.equal(await page.evaluate(()=>dogCareSelectedId),'riku');
    assert.equal(await page.evaluate(()=>s.dog),'shuu','opening care does not choose a companion');
    await page.waitForFunction(()=>dogIdleImage.complete&&dogIdleImage.naturalWidth>0);
    const careArt=await page.evaluate(()=>['shuu','riku','grey'].map((id,row)=>{
      const actual=document.createElement('canvas'),original=document.createElement('canvas');
      actual.width=original.width=320;actual.height=original.height=180;
      const ctx=actual.getContext('2d'),ref=original.getContext('2d');
      ctx.imageSmoothingEnabled=ref.imageSmoothingEnabled=false;
      drawDogCareCloseup(ctx,id,'idle',0,10000);
      const size=id==='riku'?220:188,scale=size/320,paw={shuu:298,riku:232,grey:300}[id];
      ref.setTransform(scale,0,0,scale,144-size/2,166-paw*scale);
      ref.drawImage(dogIdleImage,0,row*320,320,320,0,0,320,320);
      const pixels=ctx.getImageData(0,0,320,180).data,source=ref.getImageData(0,0,320,180).data;
      let altered=0;for(let i=0;i<pixels.length;i++)if(pixels[i]!==source[i])altered++;
      return {id,altered};
    }));
    for(const portrait of careArt)assert.equal(portrait.altered,0,portrait.id+' intact original portrait');
    const handArt=await page.evaluate(()=>{
      const canvas=document.createElement('canvas');canvas.width=320;canvas.height=180;
      const ctx=canvas.getContext('2d');drawDogCareHand(ctx,150,40,null,1,'stroke');
      const pixels=ctx.getImageData(0,0,320,180).data;let upper=0,side=0,below=0,contact=0,left=320,right=0;
      for(let y=0;y<180;y++)for(let x=0;x<320;x++){
        const i=(y*320+x)*4;if(pixels[i+3]<180)continue;
        if(!y)upper++;if(x===319)side++;
        if(pixels[i]>170&&pixels[i]-pixels[i+2]>55&&pixels[i+1]<220){
          if(y>51)below++;
          if(y>=38&&y<=42){contact++;left=Math.min(left,x);right=Math.max(right,x);}
        }
      }
      return {upper,side,below,contact,span:right-left};
    });
    assert.ok(handArt.span>40&&handArt.contact>90);assert.equal(handArt.below,0);
    assert.ok(handArt.upper>10);assert.equal(handArt.side,0);
    const layout=await page.locator('#dogCare').evaluate(el=>{
      const bounds=el.getBoundingClientRect(),stage=document.querySelector('#dogCareStage').getBoundingClientRect(),
        hero=el.querySelector('.dog-care-hero').getBoundingClientRect();
      return {inside:bounds.top>=-1&&bounds.bottom<=innerHeight+1,horizontal:el.scrollWidth<=el.clientWidth+1,
        wide:stage.width>=innerWidth*.4,height:stage.height,stageInside:stage.top>=hero.top&&stage.bottom<=hero.bottom,
        buttons:[...el.querySelectorAll('.dog-care-footer button')]
          .every(b=>{const r=b.getBoundingClientRect();return r.top>=bounds.top&&r.bottom<=bounds.bottom+1&&r.width>=100;})};
    });
    await screenshot('DOG_LAYOUT');
    assert.ok(layout.inside&&layout.horizontal&&layout.wide&&layout.stageInside&&layout.buttons&&layout.height>=100,'care layout '+JSON.stringify(layout));
    let rotationResume=null;
    if(mobile){
      await page.setViewportSize({width:390,height:844});
      assert.equal(await page.locator('.landscape-warning').isVisible(),true,'portrait phone asks for landscape');
      await screenshot('DOG_PORTRAIT_HINT');
      await page.setViewportSize({width:844,height:390});
      assert.equal(await page.locator('.landscape-warning').isVisible(),false);
      assert.equal(await page.locator('#dogCare').isVisible(),true);
      assert.equal(await page.evaluate(()=>dogCareSelectedId),'riku','rotation preserves the care screen');
      await press('#dogCarePet');
      await page.waitForFunction(()=>dogCareScene.mode==='pet'&&Date.now()-dogCareScene.startedAt>400);
      await screenshot('DOG_ROTATION_RETURN');await careIdle();
      rotationResume={portraitHint:true,carePreserved:true,petAfterRotation:true};
    }
    // Petting, eating and the outbound/return training motion for every dog.
    for(const id of ['riku','shuu','grey']){
      await press(`[data-dog-care-id="${id}"]`);await press('#dogCarePet');
      assert.equal(await page.locator('#dogCareTakeFishing').isDisabled(),true,'busy motion cannot change companion');
      await page.waitForFunction(()=>dogCareScene.mode==='pet'&&Date.now()-dogCareScene.startedAt>400);
      assert.match(await page.locator('#dogCareSceneLabel').innerText(),/目を細め/);
      await screenshot(id==='riku'?'DOG_PET':'DOG_PET_'+id.toUpperCase());await careIdle();
      const before=await page.evaluate(()=>s.dogTreats.samBiscuit);await press('[data-give-dog-treat="samBiscuit"]');
      await page.waitForFunction(()=>dogCareScene.mode==='treat'&&Date.now()-dogCareScene.startedAt>1500);
      assert.match(await page.locator('#dogCareSceneLabel').innerText(),/もぐもぐ/);
      assert.equal(await page.evaluate(()=>s.dogTreats.samBiscuit),before-1);if(id==='riku')await screenshot('DOG_TREAT');
      await careIdle();assert.equal(await page.locator('[data-give-dog-treat="samBiscuit"]').isDisabled(),true);
      await press('#dogCareTrain');await page.waitForFunction(()=>/走って/.test(document.querySelector('#dogCareSceneLabel').textContent));
      await page.waitForFunction(()=>/戻ろう/.test(document.querySelector('#dogCareSceneLabel').textContent));
      if(id==='riku')await screenshot('DOG_RETURN');await careIdle();assert.equal(await page.locator('#dogCareTrain').isDisabled(),true);
    }
    // Catch three genuine throws by tapping the stage as each target lights up.
    await press('[data-dog-care-id="riku"]');await press('[data-play-dog-toy="rubberBall"]');
    for(let i=0;i<3;i++){
      await page.waitForFunction(i=>dogCatchGame?.throwIndex===i&&dogCatchGame.phase==='throw'&&
        dogCatchPosition(dogCatchGame,Date.now()).ready,i);
      await press('#dogCareStage');
      if(i===0){await page.waitForFunction(()=>dogCatchGame.phase==='result');assert.match(await page.locator('#dogCareSceneLabel').innerText(),/持って帰る/);}
    }
    await careIdle();assert.equal(await page.evaluate(()=>s.dogCatchBest.riku),3);
    await press('#dogCareTakeFishing');assert.equal(await page.evaluate(()=>s.dog),'riku');
    assert.equal(await page.locator('[data-home-dog]').count(),3);await walkHome('riku');await press('#action');
    await press('#dogCareStayHome');assert.equal(await page.evaluate(()=>s.dogFollowing),false);
    assert.equal(await page.locator('[data-home-dog]').count(),3);await page.reload({waitUntil:'domcontentloaded'});await press('#start');
    assert.equal(await page.evaluate(()=>s.dogFollowing),false);assert.equal(await page.locator('#dog').isVisible(),false);
    await enterHome();await walkHome('riku');await press('#action');await press('#dogCareTakeFishing');
    await walkHome('door');await press('#action');await settle();
    await page.evaluate(()=>transitionPlayerHome('map'));await settle();
    assert.equal(await page.locator('.companion:visible').count(),1);assert.match(await page.locator('#dog').getAttribute('class'),/riku/);
    // Real images paint 24 fish in swim, seven turn headings and mouth poses.
    const fishResult=await page.evaluate(async()=>{
      await Promise.all([...new Set(Object.keys(ShuFishArt.species).flatMap(id=>ShuFishArt.assets(id)))].map(async src=>{
        const image=fishAtlasImage(src);await image.decode();
      }));
      const results=[];
      for(const mode of ['gauge','nushi']){
        s.fightMode=mode;openPracticePond();beginFishing();battle.cast=50;
        launchSurfaceCast();settleSurfaceCast();battle.biteAt=Date.now();pull();clearInterval(timer);timer=0;finishHookReveal();
        for(const id of Object.keys(ShuFishArt.species))for(const heading of [null,0,1,2,3,4,5,6,'mouth']){
          Object.assign(battle,{f:fish.find(f=>f.id===id),specimen:null,mouthState:heading==='mouth'?'open':'closed',
            turning:typeof heading==='number'?{from:1,to:-1}:null,turnSpriteFrame:typeof heading==='number'?heading:0,
            sandLifted:true,x:50,y:58,facing:1,frame:2});renderBattleFish();drawBattle();
          const canvas=document.querySelector('#battleFish canvas'),pixels=canvas.getContext('2d').getImageData(0,0,canvas.width,canvas.height).data;
          let opaque=0;for(let i=3;i<pixels.length;i+=4)if(pixels[i]>100)opaque++;
          let tallFins=null;
          if(heading===null&&['moroko','ayu','shirogisu'].includes(id)){
            const top=[];let left=448,right=0;
            for(let x=0;x<448;x++){
              let y=0;while(y<224&&pixels[(y*448+x)*4+3]<100)y++;
              top[x]=y;if(y<224){left=Math.min(left,x);right=Math.max(right,x);}
            }
            const a=Math.round(left+(right-left)*.2),b=Math.round(left+(right-left)*.8);
            let run=0;tallFins=0;
            for(let x=a;x<=b+1;x++){
              const back=top[a]+(top[b]-top[a])*(x-a)/(b-a);
              if(x<=b&&back-top[x]>(right-left)*.05)run++;
              else if(run){if(run>=8)tallFins++;run=0;}
            }
          }
          const hook=battleMouthAndHook();results.push({mode,id,heading,opaque,art:canvas.dataset.artSpecies,
            hook:[hook.rootX,hook.rootY,hook.lineX,hook.lineY],atlas:canvas.dataset.atlasKey,tallFins});
        }
        close();
      }return results;
    });
    assert.equal(fishResult.length,24*9*2);
    for(const r of fishResult){assert.equal(r.art,r.id);assert.ok(r.opaque>3500,r.id+' painted '+r.heading);assert.ok(r.hook.every(Number.isFinite));
      if(r.tallFins!==null)assert.equal(r.tallFins,r.id==='shirogisu'?2:1,r.id+' actual dorsal silhouette');}
    await page.evaluate(()=>{s.fightMode='nushi';openPracticePond();beginFishing();battle.cast=50;launchSurfaceCast();settleSurfaceCast();
      battle.biteAt=Date.now();pull();clearInterval(timer);timer=0;finishHookReveal();battle.f=fish.find(f=>f.id==='nushi');
      battle.turning={from:1,to:-1};battle.turnSpriteFrame=3;battle.x=50;battle.y=58;drawBattle();});
    await screenshot('FISH_TURN');assert.deepEqual(errors,[]);assert.deepEqual(failedAssets,[]);
    for(const id of ['moroko','ayu','shirogisu']){
      await page.evaluate(id=>{Object.assign(battle,{f:fish.find(f=>f.id===id),turning:null,mouthState:'closed',frame:0});
        renderBattleFish();drawBattle();},id);
      await screenshot('FISH_'+id.toUpperCase());
    }
    console.log('V212_FEATURE_SMOKE_PASS '+JSON.stringify({mobile,fish:24,poses:432,fightModes:2,recipes:3,
      speciesArt:fishResult.filter(r=>r.tallFins!==null).map(({mode,id,tallFins})=>({mode,id,tallFins})),
      dogs:3,careArt,handArt,catchScore:3,companion:true,stayHomeReload:true,layout,rotationResume,errors}));
  }finally{await browser.close();}
};
