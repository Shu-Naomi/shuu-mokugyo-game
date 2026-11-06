// Wait for GitHub Pages to serve this exact release, not just a matching badge.
const fs=require('node:fs'),path=require('node:path'),{createHash}=require('node:crypto');
const {expectedRelease}=require('./browser-release.cjs');
const base='https://shu-naomi.github.io/shuu-mokugyo-game/nushi-tsuri/',root=path.resolve(__dirname,'..');
const files=['index.html','tackle-balance.js','tackle-art.js','lake-research.js','sw.js','mountain-region.js','lake-story.js','assets/pass-pond-v252-51.png'];
const sha=data=>createHash('sha256').update(data).digest('hex');
(async()=>{
 const pending=new Map(files.map(file=>[file,sha(fs.readFileSync(path.join(root,file)))])),deadline=Date.now()+8*60*1000;
 while(pending.size&&Date.now()<deadline){
  for(const [file,expected]of pending)try{const response=await fetch(base+file+'?release='+expectedRelease.slice(1),{cache:'no-store',signal:AbortSignal.timeout(15000)});if(response.ok&&sha(Buffer.from(await response.arrayBuffer()))===expected){pending.delete(file);console.log('PUBLIC_SOURCE_MATCH',file,expected);}}catch(error){console.log('PUBLIC_SOURCE_WAIT',file,error.message);}
  if(pending.size)await new Promise(r=>setTimeout(r,10000));
 }
 if(pending.size)throw Error('Public deployment did not match: '+[...pending.keys()].join(', '));
 console.log('HOOK_PUBLIC_SOURCE_PASS',files.length);
})().catch(error=>{console.error(error);process.exitCode=1;});
