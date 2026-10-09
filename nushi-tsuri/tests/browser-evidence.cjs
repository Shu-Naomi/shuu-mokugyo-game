// Keep the complete screenshots in an artifact and readable results in the job log.
const fs=require('node:fs'),path=require('node:path'),readline=require('node:readline');
const {spawn}=require('node:child_process');
const directory=path.join(__dirname,'browser-evidence');fs.mkdirSync(directory,{recursive:true});
const log=fs.createWriteStream(path.join(directory,'full.log'));
const child=spawn(process.execPath,[path.join(__dirname,'browser-v202.smoke.cjs')],{cwd:__dirname,env:process.env,stdio:['ignore','pipe','pipe']});
for(const [stream,output]of [[child.stdout,process.stdout],[child.stderr,process.stderr]]){
 const lines=readline.createInterface({input:stream,crlfDelay:Infinity});
 lines.on('line',line=>{
  log.write(line+'\n');
  if(/_SCREENSHOT\s/.test(line))output.write(line.split(/\s/)[0]+' [saved in browser-evidence/full.log]\n');
  else output.write(line.replace(/[A-Za-z0-9+/=]{2048,}/g,'[image data saved in browser-evidence/full.log]')+'\n');
 });
}
child.on('error',error=>{console.error(error);log.end();process.exitCode=1;});
child.on('close',code=>{log.end();process.exitCode=code===null?1:code;});
