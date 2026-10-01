const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const tracks=require('../music-tracks.js');
const root=path.resolve(__dirname,'..'),folder=path.join(root,'assets/audio/music-v204');
const previous=JSON.parse(fs.readFileSync(path.join(folder,'arrangement.json'),'utf8'));
const heavy=JSON.parse(fs.readFileSync(path.join(root,'assets/audio/music-v205/arrangement.json'),'utf8'));
const audit={...previous,tracks:{...previous.tracks,...heavy.tracks}};
const sha=bytes=>crypto.createHash('sha256').update(bytes).digest('hex');

// Read the saved performance independently of the Python arranger. Channel 0
// is the actual foreground part sent to the sampled-instrument renderer.
function performance(bytes){
  assert.equal(bytes.toString('ascii',0,4),'MThd');
  const ppq=bytes.readUInt16BE(12),count=bytes.readUInt16BE(10),result=[];
  let offset=14,tempo,loopTicks;
  for(let index=0;index<count;index++){
    assert.equal(bytes.toString('ascii',offset,offset+4),'MTrk');
    const end=offset+8+bytes.readUInt32BE(offset+4);offset+=8;
    let ticks=0,name='';const notes=[],held=new Map();
    function variable(){let value=0,b;do{b=bytes[offset++];value=(value<<7)|(b&127);}while(b&128);return value;}
    while(offset<end){
      ticks+=variable();const status=bytes[offset++];
      if(status===255){
        const type=bytes[offset++],length=variable(),data=bytes.subarray(offset,offset+length);offset+=length;
        if(type===3)name=data.toString('utf8');
        if(type===0x51)tempo=data.readUIntBE(0,3);
        if(type===6&&data.toString()==='LOOP_END')loopTicks=ticks;
      }else{
        const type=status>>4,channel=status&15,pitch=bytes[offset++];
        const value=(type===12||type===13)?null:bytes[offset++];
        if(channel===0&&type===9&&value>0){
          assert.ok(!held.has(pitch),'foreground repeated before its previous note ended');
          const note={pitch,ticks,velocity:value};held.set(pitch,note);notes.push(note);
        }else if(channel===0&&(type===8||(type===9&&value===0))){
          const note=held.get(pitch);assert.ok(note,'noteoff has an onset');note.length=ticks-note.ticks;held.delete(pitch);
        }
      }
    }
    assert.equal(held.size,0,'every foreground note ends');
    if(name==='Original melody (unchanged)')result.push(...notes);
  }
  return {ppq,tempo,loopTicks,notes:result};
}

test('all sixteen sampled arrangements preserve the original performed melody, tempo and loop length',()=>{
  assert.equal(audit.version,204);assert.equal(audit.sampleRate,44100);
  assert.deepEqual(Object.keys(audit.tracks).sort(),Object.keys(tracks).sort());
  for(const [id,record] of Object.entries(audit.tracks)){
    assert.equal(tracks[id].src,record.audioSrc||`assets/audio/music-v204/${id}.mp3`);
    assert.equal(tracks[id].duration,record.duration,id+' exact original score duration');
    assert.equal(tracks[id].bpm,record.bpm);
    assert.equal(sha(fs.readFileSync(path.join(root,record.source))),record.sourceSha256,id+' original composer remains unchanged');
    const data=fs.readFileSync(path.join(root,tracks[id].src.replace(/\.mp3$/,'.mid')));
    assert.equal(sha(data),record.midiSha256);
    const played=performance(data),beat=60/record.bpm,tolerance=beat/played.ppq*1.5;
    assert.equal(played.tempo,Math.round(60000000/record.bpm),id+' original tempo');
    assert.ok(Math.abs(played.loopTicks/played.ppq*beat-record.duration)<tolerance);
    assert.equal(played.notes.length,record.originalMelody.length,id+' no omitted or new lead notes');
    played.notes.forEach((note,index)=>{
      const original=record.originalMelody[index];
      assert.equal(note.pitch,original.pitch,id+' note '+index+' original octave and pitch');
      assert.ok(Math.abs(note.ticks/played.ppq*beat-original.start)<tolerance,id+' note '+index+' original onset');
      assert.ok(Math.abs(note.length/played.ppq*beat-original.duration)<tolerance,id+' note '+index+' original articulation');
    });
    assert.equal(sha(fs.readFileSync(path.join(root,tracks[id].src))),record.audioSha256,id+' deployed audio matches the audited performance');
  }
});

test('masters retains the sparse bridge and complete return, with acoustic drums, bass, guitars and strings',()=>{
  const record=audit.tracks['tournament-masters'],notes=record.originalMelody;
  assert.equal(record.bpm,152);assert.equal(notes.length,203);
  assert.deepEqual(notes.slice(0,7).map(n=>n.pitch),[76,83,79,83,88,86,83]);
  const beat=60/152,bridge=notes.filter(n=>n.start>=16*4*beat&&n.start<24*4*beat);
  assert.ok(bridge.length>0);
  assert.ok(bridge.every(n=>Math.abs(n.start/beat-Math.round(n.start/beat))<1e-8),'the original bridge omits alternate half-beat cells');
  const programs=Object.values(record.instruments).map(n=>n.program);
  for(const program of [29,30,34,48,44])assert.ok(programs.includes(program));
  assert.ok(record.instruments['9'],'sampled percussion part');
  assert.ok(record.pcmPeak<.82&&record.pcmRms>.07);
  assert.equal(heavy.version,205);
  assert.deepEqual(Object.keys(heavy.tracks),['tournament-masters']);
  assert.deepEqual(record.originalMelody,previous.tracks['tournament-masters'].originalMelody,'the heavier version keeps every original note');
  for(const [id,old] of Object.entries(previous.tracks))if(id!=='tournament-masters'){
    assert.equal(tracks[id].src,`assets/audio/music-v204/${id}.mp3`);
    assert.equal(sha(fs.readFileSync(path.join(root,tracks[id].src))),old.audioSha256,'other fifteen recordings remain exact');
  }
});

test('sample bank license and provenance ship with the recordings; the game downloads only rendered music',()=>{
  const license=fs.readFileSync(path.join(folder,'GeneralUser-GS-LICENSE.txt'),'utf8');
  assert.match(license,/GeneralUser GS v2\.0\.3/);
  assert.equal(audit.soundfont.sha256,'9575028c7a1f589f5770fccc8cff2734566af40cd26ed836944e9a5152688cfe');
  const sw=fs.readFileSync(path.join(root,'sw.js'),'utf8');
  assert.doesNotMatch(sw,/\.sf2|music-v20[45]\/[^"\n]+\.mid/);
  assert.doesNotMatch(sw,/music-v(?:170|183|186)\/(?!lake-birds|harbor-birds)[^"\n]+\.mp3/);
});
