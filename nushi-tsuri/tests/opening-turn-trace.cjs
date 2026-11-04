// Validate captured native frames, not synthetic poses or one narrow x window.
const assert=require('node:assert/strict');
module.exports=function assertDiaryTurnTrace(frames){
 const spine=324,phaseOrder=['start','rise','cross','settle','settled'];
 assert.ok(new Set(frames.map(frame=>frame.hash)).size>=8,'visible motion needs >=8 actual distinct frames');
 assert.ok(frames.some(frame=>Number(frame.leafEdgeX)>450),'leaf starts on right');
 assert.ok(frames.some(frame=>Number(frame.leafEdgeX)<200),'leaf travels onto left page');
 assert.equal(frames[0]?.turnPhase,'start');assert.equal(frames.at(-1)?.turnPhase,'settled');
 let crossing=null;
 for(let index=0;index<frames.length;index++){
  const frame=frames[index],x=Number(frame.leafEdgeX),phase=phaseOrder.indexOf(frame.turnPhase);
  assert.ok(Number.isFinite(frame.wallMs)&&Number.isFinite(x)&&phase>=0,'capture must contain real time, edge and phase');
  if(!index)continue;
  const previous=frames[index-1],previousX=Number(previous.leafEdgeX),gap=frame.wallMs-previous.wallMs;
  assert.ok(gap>0,'native samples must remain in chronological order');
  assert.ok(previousX>=x,'leaf must move toward the left without reversing');
  assert.ok(phase>=phaseOrder.indexOf(previous.turnPhase),'turn phases must remain ordered');
  // The 1.6s turn moves during 84% of its duration. The maximum speed of
  // cos(pi*smoothstep(t)) is bounded by pi*1.5*192/(.84*1600) px/ms.
  // Sampling can straddle one held 12fps drawing interval; allow that interval
  // and integer rounding, rather than permitting an instantaneous page jump.
  const maxSpeed=Math.PI*1.5*192/(.84*1600),maxTravel=maxSpeed*(gap+1000/12)+2;
  assert.ok(previousX-x<=maxTravel,'leaf must not jump instantaneously across the book');
  if(!crossing&&previous.turnPhase==='cross'&&frame.turnPhase==='cross'&&previousX>=spine&&x<=spine&&previousX>x){
   crossing={fromIndex:index-1,toIndex:index,fromX:previousX,toX:x,fromWallMs:previous.wallMs,toWallMs:frame.wallMs};
  }
 }
 for(const phase of phaseOrder)assert.ok(frames.some(frame=>frame.turnPhase===phase),`native capture must show ${phase}`);
 assert.ok(crossing,'consecutive actual cross-phase samples must bracket the spine');
 return crossing;
};
