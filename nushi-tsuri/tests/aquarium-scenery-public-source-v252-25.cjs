// Compare deployment with this merged source before testing the public page.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..'),base='https://shu-naomi.github.io/shuu-mokugyo-game/nushi-tsuri/';
const files=['index.html','pet-life-ui.js','pet-life.css','sw.js','assets/aquarium-fresh-v252-25.webp','assets/aquarium-salt-v252-25.webp'];
const sha=bytes=>crypto.createHash('sha256').update(bytes).digest('hex');
(async()=>{
 const expected=new Map(files.map(file=>[file,sha(fs.readFileSync(path.join(root,file)))])),pending=new Set(files),matched=[];
 const deadline=Date.now()+15*60*1000;
 while(pending.size&&Date.now()<deadline){
  for(const file of [...pending])try{
   const url=new URL(file,base);url.searchParams.set('scenery-source',process.env.GITHUB_SHA||expected.get(file));
   const response=await fetch(url,{cache:'no-store',signal:AbortSignal.timeout(15000)});
   if(response.ok&&sha(Buffer.from(await response.arrayBuffer()))===expected.get(file)){
    pending.delete(file);matched.push({file,sha256:expected.get(file)});console.log('PUBLIC_SCENERY_SOURCE_MATCH '+file);
   }
  }catch(error){console.log('PUBLIC_SCENERY_SOURCE_WAIT '+file+' '+error.name);}
  if(pending.size)await new Promise(resolve=>setTimeout(resolve,10000));
 }
 const directory=path.join(__dirname,'aquarium-scenery-evidence');fs.mkdirSync(directory,{recursive:true});
 fs.writeFileSync(path.join(directory,'public-source.json'),JSON.stringify({commit:process.env.GITHUB_SHA,matched,pending:[...pending]},null,2));
 assert.equal(pending.size,0,'published scenery files did not match: '+[...pending].join(', '));
 console.log('PUBLIC_SCENERY_SOURCE_PASS '+matched.length);
})().catch(error=>{console.error(error);process.exitCode=1;});
