// Run after merging: compare the deployed runtime with this exact checkout.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..'),base='https://shu-naomi.github.io/shuu-mokugyo-game/nushi-tsuri/';
const files=['index.html','cast-tackle.css','sw.js','fishing-duel.js','tackle-balance.js','save-slots.js'];
const sha=data=>crypto.createHash('sha256').update(data).digest('hex');
(async()=>{
 const expected=new Map(files.map(file=>[file,sha(fs.readFileSync(path.join(root,file)))])),pending=new Set(files),matched=[];
 const deadline=Date.now()+6*60*1000;
 while(pending.size&&Date.now()<deadline){
  for(const file of [...pending])try{
   const url=new URL(file,base);url.searchParams.set('cast-cancel-source',process.env.GITHUB_SHA||expected.get(file));
   const response=await fetch(url,{cache:'no-store',signal:AbortSignal.timeout(15000)});
   if(response.ok&&sha(Buffer.from(await response.arrayBuffer()))===expected.get(file)){
    pending.delete(file);matched.push({file,sha256:expected.get(file)});console.log('PUBLIC_SOURCE_MATCH '+file+' '+expected.get(file));
   }
  }catch(error){console.log('PUBLIC_SOURCE_WAIT '+file+' '+error.name);}
  if(pending.size)await new Promise(resolve=>setTimeout(resolve,10000));
 }
 const directory=path.join(__dirname,'cast-cancel-evidence');fs.mkdirSync(directory,{recursive:true});
 fs.writeFileSync(path.join(directory,'public-source.json'),JSON.stringify({commit:process.env.GITHUB_SHA,matched,pending:[...pending]},null,2));
 assert.equal(pending.size,0,'published files did not yet match: '+[...pending].join(', '));console.log('CAST_CANCEL_PUBLIC_SOURCE_PASS '+matched.length);
})().catch(error=>{console.error(error);process.exitCode=1;});
