const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs"), path = require("node:path");
const { createCanvas, loadImage } = require("@napi-rs/canvas");
const R = require("../rival-anglers.js"), T = require("../tournament.js"), N = require("../tournament-npcs.js");
const { boot, seed, read, saveKey } = require("./game-harness.cjs");
const click = (w, selector) => { const b = w.document.querySelector(selector); assert.ok(b, selector); b.click(); return b; };
const saved = w => JSON.parse(w.localStorage.getItem(saveKey));
function offer(w) { w.eval('renderSamShop(); open("store")'); click(w, "#tournamentOffer"); }
function enter(w) { offer(w); click(w, '[data-tournament-select="lakeMasters"]'); click(w, '[data-tournament-action="start"]'); }
const progress = w => read(w, "({money:s.money,items:s.items,baits:s.baits,caught:s.caught,dog:s.dog,clock:s.gameMinutes,tournament:s.tournament})");

test("three stronger, distinct plans are reproducible and never reveal a future catch", () => {
  const definition = T.definition("lakeMasters");
  for (let seed = 0; seed < 1000; seed++) {
    const t = T.create("lakeMasters", 500, seed * 317 + 19);
    assert.deepEqual(t.participants.map(p => p.id), ["liao", "asual", "dancer"]);
    for (const record of t.participants) {
      const p = R.profiles.find(p => p.id === record.id);
      assert.ok(record.catches.length >= p.count[0] && record.catches.length <= p.count[1]);
      for (const f of record.catches) {
        assert.ok(f.hundredths >= p.length[0] && f.hundredths <= p.length[1]);
        assert.ok(f.cast >= 1 && f.cast <= 9);
      }
      if (record.id === "dancer") assert.deepEqual(record.catches.map(c => c.hundredths),
        record.catches.map(c => c.hundredths).sort((a,b)=>a-b), "technical rival improves through later swaps");
    }
    for (let cast = 0; cast <= 9; cast++) {
      t.casts = cast;
      const rows = T.standings(t);
      assert.equal(rows.length, 4);
      for (const row of rows.filter(r => r.id !== "player")) {
        assert.ok(row.count <= Math.min(5, cast));
        if (cast === 9) {
          const p = definition.npcProfiles.find(p => p.id === row.id);
          assert.ok(row.total >= p.total[0] && row.total <= p.total[1]);
          assert.ok(row.total > 11000, "stronger than the village leader's final ceiling");
        }
      }
    }
    const normalized = T.normalize(t);
    assert.deepEqual(normalized.participants, t.participants);
    t.casts = 1; t.inFlight = true;
    assert.ok(T.standings(t).every(r => r.count === 0));
  }
  assert.deepEqual(T.create("lakeFuna",500,3).participants.map(p=>p.id), ["gen","mina","take","haru"]);
});

test("choosing the masters advertises four entrants and charges the accepted fee only once", () => {
  const app = boot(), w = app.window;
  try {
    const before = progress(w);
    offer(w); click(w, '[data-tournament-select="lakeMasters"]');
    assert.equal(w.document.querySelector("#tournamentTitle").textContent, "星湖名手挑戦");
    assert.match(w.document.querySelector("#tournamentBody").textContent, /名手3人の計4人/);
    assert.match(w.document.querySelector("#tournamentBody").textContent, /星湖名手杯/);
    assert.deepEqual([...w.document.querySelectorAll("[data-tournament-portrait]")].map(e=>e.dataset.tournamentPortrait), ["liao","asual","dancer"]);
    assert.deepEqual(progress(w), before, "selecting a mode is a preview");
    const start = click(w, '[data-tournament-action="start"]');
    w.handleTournamentAction({target:start});
    assert.equal(read(w,"s.money"), before.money - 3000);
    assert.equal(read(w,"s.tournament.id"), "lakeMasters");
    assert.equal(w.document.querySelectorAll("#tournamentNpcLayer [data-tournament-npc]").length,3);
    assert.equal(w.document.querySelectorAll("#rivalLayer [data-rival]").length,4,"only companion dogs in the separate layer");
    assert.deepEqual(app.errors,[]);
  } finally { app.dispose(); }
});

test("all seven visitors have reachable, dry conversation approaches on every four-unit grid", () => {
  const app=boot(),w=app.window;
  try {
    w.Math.random=()=>.999999;
    const before=progress(w);
    for(const p of [...R.placements,...R.dogPlacements]) {
      assert.equal(w.isWalkableWorld(p.x,p.y),true,p.id);
      for(let ox=0;ox<4;ox++) for(let oy=0;oy<4;oy++) {
        const reached=w.eval(`(() => {
          for(let x=${Math.floor((p.x-7)/4)*4+ox};x<=${p.x+7};x+=4)
          for(let y=${Math.floor((p.y-7)/4)*4+oy};y<=${p.y+7};y+=4)
          for(const direction of ["up","down","left","right"]){
            if(!isWalkableWorld(x,y))continue;
            s.x=x;s.y=y;s.direction=direction;
            if(nearbyRival()?.id===${JSON.stringify(p.id)})return true;
          } return false;
        })()`);
        assert.equal(reached,true,`${p.id} grid ${ox},${oy}`);
        w.action();
        assert.equal(w.document.querySelector("#tournamentTalkName").textContent,R.character(p.id).name);
        assert.equal(read(w,"battle"),null);
        w.close();
      }
    }
    assert.deepEqual(progress(w),before,"greetings leave the player's catches, dog, clock and money intact");
    assert.deepEqual(app.errors,[]);
  } finally {app.dispose();}
});

test("ordinary greetings use bottom portraits, vary lines and own A/B/keyboard without casting", () => {
  const app=boot({...seed(),x:155,y:28,direction:"down"}),w=app.window;
  try {
    const before=progress(w);
    w.action();
    const dialog=w.document.querySelector("#tournamentTalk"),line=w.document.querySelector("#tournamentTalkLine");
    assert.equal(dialog.classList.contains("open"),true);
    assert.equal(dialog.style.transform,"none");
    assert.equal(w.document.querySelector("#tournamentTalkName").textContent,"リアオ・ダモディ");
    for(const key of ["z","Enter"]){const old=line.textContent;w.dispatchEvent(new w.KeyboardEvent("keydown",{key,bubbles:true}));assert.notEqual(line.textContent,old);}
    click(w,"#action");
    assert.equal(read(w,"battle"),null);
    const position=read(w,"[s.x,s.y]");w.move("right");assert.deepEqual(read(w,"[s.x,s.y]"),position);
    assert.deepEqual(progress(w),before);
    click(w,"#back");assert.equal(dialog.classList.contains("open"),false);
    assert.equal(read(w,"activeRivalId"),null);
    assert.deepEqual(app.errors,[]);
  } finally {app.dispose();}
});

test("shop guide pairs all four owners and dogs; Chappie conversation returns to Sam", () => {
  const app=boot(),w=app.window;
  try {
    const before=progress(w);
    w.eval('renderSamShop();open("store")');
    assert.equal(w.document.querySelector('[data-rival="chappie"]'),null,"Chappie appears indoors instead of twice");
    assert.equal(w.document.querySelector(".shopkeeper-sam-svg").getAttribute("href"),"assets/sam-front.png");
    click(w,"#rivalGuideOffer");
    const cards=[...w.document.querySelectorAll(".rival-guide-card")];
    assert.equal(cards.length,4);
    for(const [i,p] of [...R.anglers,{name:"サミュエル・オールドマン",dogId:"chappie"}].entries()) {
      assert.ok(cards[i].textContent.includes(p.name));
      assert.ok(cards[i].textContent.includes(R.dogById(p.dogId).name));
    }
    click(w,"#rivalGuideBack");
    click(w,"#chappieTalk");
    assert.equal(w.document.querySelector("#tournamentTalkName").textContent,"チャッピー");
    assert.match(w.document.querySelector("#tournamentTalkStatus").textContent,/サムの相棒/);
    click(w,"#back");
    assert.equal(w.document.querySelector("#store").classList.contains("open"),true);
    assert.equal(w.document.querySelector("#tournamentTalk").classList.contains("open"),false);
    assert.deepEqual(progress(w),before);
    w.close();assert.ok(w.document.querySelector('[data-rival="chappie"]'));
    assert.deepEqual(app.errors,[]);
  } finally {app.dispose();}
});

test("visitor layer never duplicates entrants and restores correctly after a village event or reload", () => {
  let app=boot(),w=app.window;
  try {
    assert.equal(w.document.querySelectorAll("#rivalLayer [data-rival]").length,7);
    offer(w);click(w,'[data-tournament-action="start"]');
    assert.equal(w.document.querySelectorAll("#rivalLayer [data-rival]").length,1);
    assert.equal(w.document.querySelectorAll("#tournamentNpcLayer [data-tournament-npc]").length,4);
    const active=saved(w);app.dispose();app=boot(active);w=app.window;
    assert.deepEqual(read(w,"s.tournament.participants"),active.tournament.participants);
    assert.equal(w.document.querySelectorAll("#rivalLayer [data-rival]").length,1);
    w.eval('ShuTournament.finishEarly(s.tournament);maybePresentTournament()');
    click(w,'[data-tournament-action="finish"]');
    w.eval('s.gameMinutes+=60;render()');
    assert.equal(w.document.querySelectorAll("#rivalLayer [data-rival]").length,7);
    assert.equal(w.document.querySelector("#tournamentNpcLayer").hidden,true);
    assert.deepEqual(app.errors,[]);
  } finally {app.dispose();}
});

test("masters casting, final choice and reloading preserve plans and award only the masters trophy", () => {
  let app=boot({...seed(),baits:{worm:20},tournamentRecords:{lakeFuna:{played:1,completed:1,wins:1,bestRank:1,bestTotal:13000,bestLargest:3000,firstWinAt:400}}}),w=app.window;
  try {
    enter(w);const plan=read(w,"s.tournament.participants");
    for(let i=0;i<9;i++){
      w.eval('cast(fishingSpotById("lake-shallow"));beginFishing();battle.cast=25;launchSurfaceCast();');
      w.eval(`battle.f=fish.find(f=>f.id==="funa");battle.specimen=rollFishSpecimen(battle.f,()=>.5);Object.assign(battle.specimen,{hundredths:${3900+i},cm:${3900+i}/100,cmText:((${3900+i})/100).toFixed(2)});caught();`);
      w.hideCatchCard();w.maybePresentTournament();
      if(i>=5&&i<8){click(w,'[data-tournament-replace="0"]');click(w,'[data-tournament-action="close"]');}
    }
    assert.ok(read(w,"s.tournament.pending"));
    const ninth=saved(w);app.dispose();app=boot(ninth);w=app.window;
    assert.deepEqual(read(w,"s.tournament.participants"),plan);
    click(w,'[data-tournament-replace="1"]');
    assert.equal(read(w,"ShuTournament.resultReward(s.tournament).rank"),1);
    assert.match(w.document.querySelector(".tournament-reward").textContent,/星湖名手杯/);
    const money=read(w,"s.money");
    click(w,'[data-tournament-action="finish"]');
    assert.equal(read(w,"s.money"),money+1500);
    assert.equal(read(w,"s.baits.worm"),11);
    assert.equal(read(w,"s.gameMinutes"),590);
    assert.equal(read(w,"s.caught.funa"),seed().caught.funa+9);
    assert.equal(read(w,"s.tournamentRecords.lakeFuna.wins"),1);
    assert.equal(read(w,"s.tournamentRecords.lakeMasters.wins"),1);
    assert.equal(read(w,"s.tournamentRecords.lakeFuna.firstWinAt"),400);
    const claimed=saved(w);app.dispose();app=boot(claimed);w=app.window;
    w.finishTournamentResults();assert.equal(read(w,"s.money"),money+1500);
    w.eval('s.x=155;s.y=28;s.direction="down";render()');w.action();
    assert.equal(w.document.querySelector("#tournamentTalkName").textContent,"リアオ・ダモディ");
    assert.match(w.document.querySelector("#tournamentTalkStatus").textContent,/大会結果/);
    assert.ok(R.byId("liao").won.some(line=>w.document.querySelector("#tournamentTalkLine").textContent.includes(line)));
    assert.deepEqual(app.errors,[]);
  } finally {app.dispose();}
});

test("every rival's result lines fit their own voice without generic villagers' dialogue", () => {
  for(const npc of R.anglers) for(const [context,allowed] of [
    [{after:false,completedCasts:0},npc.greeting],
    [{after:false,completedCasts:4,count:0},npc.empty],
    [{after:true,reason:"complete",playerCount:5,playerRank:1,npcRank:2},npc.won],
    [{after:true,reason:"complete",playerCount:5,playerRank:3,npcRank:1},npc.ahead],
    [{after:true,reason:"complete",playerCount:5,playerRank:2,npcRank:3},npc.behind],
    [{after:true,reason:"withdrawn"},npc.unfinished],
    [{after:true,reason:"complete",playerCount:0},npc.noFish],
  ]) {const first=N.dialogue(npc.id,context,"",0);assert.ok(allowed.includes(first));assert.notEqual(N.dialogue(npc.id,context,first,0),first);}
});

test("original alpha atlases render all fourteen poses and seven face portraits without old-sprite residue", async () => {
  const root=path.join(__dirname,"..");
  const [humans,dogs]=await Promise.all([loadImage(path.join(root,R.asset)),loadImage(path.join(root,R.dogAsset))]);
  const sheet=createCanvas(7*150,2*170),ctx=sheet.getContext("2d");ctx.fillStyle="#253c48";ctx.fillRect(0,0,sheet.width,sheet.height);
  const canvas=createCanvas(128,128), c=canvas.getContext("2d");
  for(const [column,person] of [...R.anglers,...R.dogs].entries())for(const [row,talking] of [false,true].entries()){
    const atlas=R.dogById(person.id)?dogs:humans;
    assert.equal(R.draw(canvas,atlas,person.id,{talking,sitting:talking}),true);
    const pixels=c.getImageData(0,0,128,128).data;
    let opaque=0,clear=0;for(let i=3;i<pixels.length;i+=4){if(pixels[i]>180)opaque++;if(pixels[i]<5)clear++;}
    assert.ok(opaque>1700,person.id+" full visible pose");
    assert.ok(clear>2800,person.id+" real transparency around the body");
    assert.ok(pixels[3]<5,"previous frame cannot survive in a cleared corner");
    ctx.drawImage(canvas,column*150+11,row*170+5);
    ctx.fillStyle="#fff1c9";ctx.font="14px sans-serif";ctx.fillText(person.id+(talking?" / talk":" / field"),column*150+5,row*170+156);
    const portrait=createCanvas(160,160);assert.equal(R.drawPortrait(portrait,atlas,person.id),true);
    const face=portrait.getContext("2d").getImageData(0,0,160,160).data;
    assert.ok(face.some((value,i)=>i%4===3&&value>180));
  }
  if(process.env.RIVAL_QA_PATH)fs.writeFileSync(process.env.RIVAL_QA_PATH,sheet.toBuffer("image/png"));
  const html=fs.readFileSync(path.join(root,"index.html"),"utf8"),sw=fs.readFileSync(path.join(root,"sw.js"),"utf8");
  for(const source of ["rival-anglers.js?v=179-1",R.asset,R.dogAsset]) assert.ok(sw.includes(source),source+" cached offline");
  assert.ok(html.includes("rival-anglers.js?v=179-1"));
});
