'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),{JSDOM}=require('jsdom'),{webcrypto,createHash}=require('node:crypto'),fs=require('node:fs'),path=require('node:path');
const source=fs.readFileSync(path.join(__dirname,'../village-release-verifier.js'),'utf8');
async function run({missing=false,failed=false,mapBad=false,fetchFails=false}={}){
 const dom=new JSDOM('<!doctype html><body>',{url:'https://game.test/nushi-tsuri/candidate.html?villageReference=1',runScripts:'dangerously'}),w=dom.window,bytes=Buffer.from('verified-map-fixture');let calls=0;
 w.ShuVillageReference={enabled:true,source:{asset:'old.png'}};w.ShuVillageReleaseCandidate={expectedUrls:['https://game.test/a.js'],loaded:new Set(missing?[]:['https://game.test/a.js']),failed:failed?['https://game.test/a.js']:[],mapURL:'https://game.test/map.png',mapSHA256:mapBad?'0'.repeat(64):createHash('sha256').update(bytes).digest('hex')};
 Object.defineProperty(w.crypto,'subtle',{value:webcrypto.subtle});w.URL.createObjectURL=()=> 'blob:verified-map';w.fetch=async()=>{calls++;if(fetchFails)throw Error('offline');return{ok:true,arrayBuffer:async()=>bytes};};w.eval(source);
 const result=await w.ShuVillageReleaseVerifier.verify();const asset=w.ShuVillageReference.source.asset;dom.window.close();return{result,asset,calls};
}
test('verified dependencies and exact map bytes permit startup with pinned image bytes',async()=>{const r=await run();assert.equal(r.result.ok,true);assert.equal(r.asset,'blob:verified-map');});
for(const option of ['missing','failed'])test(option+' dependency fails before image fetch or save access',async()=>{const r=await run({[option]:true});assert.equal(r.result.reason,'release-dependency-mismatch');assert.equal(r.calls,0);assert.equal(r.asset,'old.png');});
for(const option of ['mapBad','fetchFails'])test(option+' map blocks startup and retains original source',async()=>{const r=await run({[option]:true});assert.equal(r.result.ok,false);assert.equal(r.asset,'old.png');});
