const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),run=require('./browser-v232.shops-ui.cjs');
const root=path.resolve(__dirname,'..');
const server=http.createServer((req,res)=>{try{const u=new URL(req.url,'http://localhost'),p=u.pathname.replace(/^\/nushi-tsuri\//,'')||'index.html',f=path.resolve(root,p);if(!f.startsWith(root+path.sep))throw Error('path');const type={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.png':'image/png','.webp':'image/webp','.svg':'image/svg+xml','.mp3':'audio/mpeg','.wav':'audio/wav'}[path.extname(f)]||'application/octet-stream';res.writeHead(200,{'Content-Type':type,'Cache-Control':'no-store'});fs.createReadStream(f).on('error',()=>res.destroy()).pipe(res);}catch{res.writeHead(404);res.end();}});
(async()=>{
 await new Promise(r=>server.listen(0,'127.0.0.1',r));
 const url='http://127.0.0.1:'+server.address().port+'/nushi-tsuri/';
 try{
  const failures=[];
  for(const [mobile,options] of [[false,{}],[true,{}],[true,{viewport:{width:820,height:366},dpr:1.875}]]){
   try{await run(url,mobile,options);}catch(e){failures.push(e.stack);console.error(e);}
  }
  // The remaining legacy scenarios exercise recipes and guide links that now
  // live on catalogue pages. Keep every original assertion and use real controls.
  const directory=path.join(__dirname,'browser-evidence-v232');fs.mkdirSync(directory,{recursive:true});
  const originalLog=console.log,logPath=path.join(directory,'legacy-tail.log');
  console.log=(...args)=>{const line=args.map(String).join(' ');fs.appendFileSync(logPath,line+'\n');originalLog(/_SCREENSHOT\s/.test(line)?line.split(/\s/)[0]+' [saved in legacy-tail.log]':line);};
  try{
   for(const file of ['browser-v209.features.cjs','browser-v213.features.cjs','browser-v215.features.cjs','browser-v217.features.cjs','browser-v214.features.cjs'])for(const mobile of [false,true]){
    try{await require('./'+file)(url,mobile);}catch(e){failures.push(file+' '+mobile+'\n'+e.stack);console.error(file,mobile,e);}
   }
  }finally{console.log=originalLog;}
  if(failures.length)throw Error(failures.join('\n'));
 }finally{await new Promise(r=>server.close(r));}
})().catch(e=>{console.error(e);process.exitCode=1;});
