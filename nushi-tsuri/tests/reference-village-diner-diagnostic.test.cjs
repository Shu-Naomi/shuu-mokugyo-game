'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),{webcrypto,createHash}=require('node:crypto');
const {createCanvas}=require('@napi-rs/canvas');
const {dinerLayersReady,dinerVisualMetrics,compareDinerDiagnostics}=require('./browser-reference-village-evidence.cjs');
function diagnosticFixture(){
 const box={left:0,top:0,right:100,bottom:60,width:100,height:60},style={zIndex:'6',position:'absolute',overflow:'visible',objectFit:'fill',transform:'none'};
 const element=(r=box)=>({style:{},dataset:{},textContent:'同条件の食堂の会話',getBoundingClientRect:()=>r});
 const canvas=()=>{const c=createCanvas(4,4);c.style={backgroundImage:'none'};c.dataset={};c.getBoundingClientRect=()=>box;c.getContext('2d').fillRect(0,0,4,4);return c;};
 const base=canvas(),front=canvas(),motion=canvas();motion.dataset.scene='room-diner';
 const nodes={'#locationInterior.open':element(),'#locationPixels':base,'.scenery-foreground[data-for="locationPixels"]':front,'.scenery-motion[data-for="locationPixels"]':motion,'#locationDialogue':element({left:20,top:40,right:90,bottom:80,width:70,height:40}),'.location-scene':element(),'.location-panel':element()};
 const context={document:{querySelector:q=>nodes[q]},getComputedStyle:()=>style,crypto:webcrypto,locationCategory:'food',ShuVillageReference:{enabled:false},gameSceneryEnvironment:()=>({season:'spring',period:'day',weather:'sunny'})};
 return {base,front,motion,nodes,context,ready:()=>vm.runInNewContext(`(${dinerLayersReady.toString()})()`,context),metrics:()=>vm.runInNewContext(`(${dinerVisualMetrics.toString()})()`,context)};
}
test('diner readiness rejects fallback and stale/mismatched split layers',()=>{
 const f=diagnosticFixture();assert.equal(f.ready(),true);
 f.base.style.backgroundImage='url(fallback.png)';assert.equal(f.ready(),false);f.base.style.backgroundImage='none';
 f.motion.dataset.scene='room-farmhouse';assert.equal(f.ready(),false);f.motion.dataset.scene='room-diner';
 f.front.width=5;assert.equal(f.ready(),false);
});
test('diner diagnosis hashes actual base/foreground pixels and records layout overlap without judging origin',async()=>{
 const f=diagnosticFixture(),normal=await f.metrics();
 const bytes=f.base.getContext('2d').getImageData(0,0,4,4).data;
 assert.equal(normal.base.sha256,createHash('sha256').update(bytes).digest('hex'));
 assert.equal(normal.foreground.nonTransparentPixels,16);assert.equal(normal.foregroundOverlapsDialogueRect,true);
 f.context.ShuVillageReference.enabled=true;const reference=await f.metrics(),same=compareDinerDiagnostics(normal,reference);
 assert.equal(same.bothLayersReady,true);assert.equal(same.sameBasePixels,true);assert.equal(same.sameForegroundPixels,true);assert.equal(same.sameDialogueText,true);
 f.front.getContext('2d').clearRect(0,0,1,1);const different=compareDinerDiagnostics(normal,await f.metrics());
 assert.equal(different.sameForegroundPixels,false);assert.equal(different.sameBasePixels,true);assert.match(different.interpretation,/Diagnostic only/);
});
