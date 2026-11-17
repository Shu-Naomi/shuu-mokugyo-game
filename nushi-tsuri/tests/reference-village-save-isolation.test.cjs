'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const source=fs.readFileSync(path.join(__dirname,'../save-slots.js'),'utf8');
const ordinary={1:'nushi-inugoya-v2',2:'nushi-inugoya-v2-slot2'},last='nushi-inugoya-last-slot';
function load(enabled,search){const c={module:{exports:{}},URL,URLSearchParams,ShuVillageReference:{enabled}};if(search!==undefined)c.location={search};vm.runInNewContext(source,c);return c.module.exports;}
function storage(initial={}){const map=new Map(Object.entries(initial)),writes=[];return {
 getItem:k=>map.has(k)?map.get(k):null,setItem:(k,v)=>{writes.push(['set',k]);map.set(k,String(v));},
 removeItem:k=>{writes.push(['remove',k]);map.delete(k);},map,writes};}
const progress=n=>({mapVersion:102,money:4321+n,hp:37,caught:{funa:2},baits:{worm:7},dog:'shuu',dogAffinity:{shuu:44},questCompletions:4,x:74,y:39.5});

test('requested preview remains isolated even when its geometry module fails to load',()=>{
 const a=load(false,'?villageReference=1'),raw=JSON.stringify(progress(1)),s=storage({[ordinary[1]]:raw}),api=a.create(()=>s);
 assert.equal(a.preview,true);assert.notEqual(a.keyFor(1),ordinary[1]);api.write(1,progress(7));
 assert.equal(s.getItem(ordinary[1]),raw);assert.ok(s.writes.every(([,k])=>!Object.values(ordinary).includes(k)&&k!==last));
});

test('ordinary mode retains both exact established save keys and last-slot key',()=>{
 const a=load(false);assert.equal(a.preview,false);assert.deepEqual(JSON.parse(JSON.stringify(a.keys)),ordinary);assert.equal(a.lastSlotKey,last);
 const s=storage({[ordinary[1]]:JSON.stringify(progress(1))});const api=a.create(()=>s);
 assert.equal(s.writes.length,0);assert.equal(api.read(1).data.money,4322);
 api.write(1,progress(5));assert.equal(JSON.parse(s.getItem(ordinary[1])).money,4326);
});

test('reference mode copies both slots raw and writes only isolated preview keys',()=>{
 const a=load(true),one='  '+JSON.stringify(progress(1)),two=JSON.stringify(progress(2));
 const s=storage({[ordinary[1]]:one,[ordinary[2]]:two,[last]:'2'}),api=a.create(()=>s);
 assert.equal(a.preview,true);assert.notEqual(a.keys[1],ordinary[1]);assert.notEqual(a.keys[2],ordinary[2]);
 assert.equal(s.getItem(a.keys[1]),one);assert.equal(s.getItem(a.keys[2]),two);assert.equal(api.initial(),2);
 const state=api.read(1).data;state.x=120;state.y=80;api.write(1,state);api.remember(1);
 assert.equal(s.getItem(ordinary[1]),one);assert.equal(s.getItem(ordinary[2]),two);assert.equal(s.getItem(last),'2');
 assert.ok(s.writes.every(([,k])=>!Object.values(ordinary).includes(k)&&k!==last));
 assert.equal(api.read(1).data.money,4322);assert.equal(api.read(1).data.dogAffinity.shuu,44);
});

test('reopening preserves an existing preview and cannot overwrite newer ordinary progress',()=>{
 const a=load(true),s=storage({[ordinary[1]]:JSON.stringify(progress(1))}),api=a.create(()=>s);
 const preview=progress(50);preview.x=134;api.write(1,preview);
 const newer=JSON.stringify(progress(999));s.map.set(ordinary[1],newer);
 const again=a.create(()=>s);assert.equal(again.read(1).data.money,4371);assert.equal(s.getItem(ordinary[1]),newer);
 assert.equal(again.writeIfUnchanged(1,progress(6),'stale'),false);assert.equal(again.remove(1,'stale'),false);
 const capture=again.capture(1);assert.equal(again.remove(1,capture.raw),true);assert.equal(s.getItem(ordinary[1]),newer);
 const reopened=a.create(()=>s);assert.equal(reopened.read(1).exists,false,'deleted pilot slot must not import the ordinary save again');
 assert.equal(s.getItem(ordinary[1]),newer);
});

test('corrupt source is copied verbatim and remains protected from writes',()=>{
 const a=load(true),bad='{broken:',s=storage({[ordinary[2]]:bad}),api=a.create(()=>s);
 assert.equal(s.getItem(a.keys[2]),bad);assert.equal(api.read(2).ok,false);
 assert.equal(api.write(2,progress(1)),false);assert.equal(api.writeNew(2,progress(1)),false);
 assert.equal(s.getItem(ordinary[2]),bad);assert.equal(s.getItem(a.keys[2]),bad);
});

test('preview launch/title navigation keeps its opt-in flag without contaminating ordinary links',()=>{
 const a=load(true),href='http://localhost/nushi-tsuri/?villageReference=1';
 const launched=new URL(a.launchUrl(href,2,{avatar:'girl',dog:'shuu',playerName:'test'}));
 assert.equal(launched.searchParams.get('villageReference'),'1');assert.equal(launched.searchParams.get('saveSlot'),'2');
 const title=new URL(a.titleUrl(launched.href,1));assert.equal(title.searchParams.get('villageReference'),'1');assert.equal(title.searchParams.has('play'),false);
 assert.equal(new URL(a.launchUrl('http://localhost/nushi-tsuri/',1)).searchParams.has('villageReference'),false);
});
