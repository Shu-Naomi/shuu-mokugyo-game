const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const {createCanvas,loadImage}=require('@napi-rs/canvas');
const R=require('../rival-anglers.js');
const {boot,read}=require('./game-harness.cjs');

test('Sam hosts beside Chappie in entry, creel, result and guide while the existing shop art stays in place',()=>{
  const app=boot(),w=app.window;
  const click=selector=>w.document.querySelector(selector).click();
  const pair=pose=>{
    const host=w.document.querySelector('#tournamentBody .tournament-host');assert.ok(host);
    assert.equal(host.querySelector('[data-rival-art="sam"]').dataset.rivalPose,pose);
    assert.ok(host.querySelector('[data-rival-art="chappie"]'));
  };
  try{
    w.eval('renderSamShop();open("store")');click('#tournamentOffer');pair('greeting');
    click('[data-tournament-select="lakeMasters"]');pair('greeting');
    assert.match(w.document.querySelector('#tournamentBody').textContent,/120分・最大12投/);
    assert.match(w.document.querySelector('.tournament-prizes + p').textContent,/12投/);
    click('[data-tournament-action="start"]');click('#tournamentHud');pair('fishing');
    assert.equal(read(w,'ShuTournament.standings(s.tournament).length'),4,'host is not an extra entrant');
    click('[data-tournament-action="confirm-withdraw"]');click('[data-tournament-action="withdraw"]');pair('greeting');
    click('[data-tournament-action="finish"]');
    w.eval('renderSamShop();open("store")');click('#rivalGuideOffer');
    const cards=w.document.querySelectorAll('.rival-guide-card');assert.equal(cards.length,4);
    assert.ok(cards[3].querySelector('[data-rival-art="sam"]'));
    assert.ok(cards[3].querySelector('[data-rival-art="chappie"]'));
    assert.equal(w.document.querySelector('.shopkeeper-sam-svg').getAttribute('href'),'assets/sam-front.png');
    assert.equal(w.document.querySelector('.shopkeeper-sam-svg').getAttribute('x'),'570');
    assert.deepEqual(app.errors,[]);
  }finally{app.dispose();}
});

test('both Sam poses have real transparency and fit the same renderer as the other three pairs',async()=>{
  const root=path.join(__dirname,'..');
  const [humans,dogs,sam]=await Promise.all([R.asset,R.dogAsset,R.hostAsset].map(f=>loadImage(path.join(root,f))));
  const sample=createCanvas(96,128),ctx=sample.getContext('2d');
  for(const talking of [false,true]){
    assert.equal(R.draw(sample,sam,'sam',{talking}),true);
    const pixels=ctx.getImageData(0,0,96,128).data;let clear=0,opaque=0;
    for(let i=3;i<pixels.length;i+=4){if(pixels[i]<5)clear++;if(pixels[i]>180)opaque++;}
    assert.ok(clear>4000,'transparent area around the full pose');
    assert.ok(opaque>2200,'the body and rod remain visible at game size');
    assert.ok(pixels[3]<5&&pixels.at(-1)<5,'no baked background or prior-frame pixels');
  }
  const face=createCanvas(160,160);assert.equal(R.drawPortrait(face,sam,'sam'),true);
  if(process.env.SAM_QA_PATH){
    const sheet=createCanvas(1000,370),c=sheet.getContext('2d');c.fillStyle='#203943';c.fillRect(0,0,1000,370);
    for(const [col,person]of [...R.anglers,R.host].entries())for(const [row,talking]of [true,false].entries()){
      const human=createCanvas(96,128),dog=createCanvas(128,96);
      R.draw(human,person.id==='sam'?sam:humans,person.id,{talking});R.draw(dog,dogs,person.dogId,{sitting:true});
      c.drawImage(human,col*250+8,row*185+8);c.drawImage(dog,col*250+108,row*185+40);
      c.fillStyle='#ffedbf';c.font='15px sans-serif';c.fillText(person.shortName==='サム'?'sam / chappie':person.id+' / '+person.dogId,col*250+12,row*185+158);
    }
    fs.writeFileSync(process.env.SAM_QA_PATH,sheet.toBuffer('image/png'));
    fs.writeFileSync(process.env.SAM_QA_PATH.replace('.png','-portrait.png'),face.toBuffer('image/png'));
  }
  const sw=fs.readFileSync(path.join(root,'sw.js'),'utf8');assert.ok(sw.includes(R.hostAsset));
});
