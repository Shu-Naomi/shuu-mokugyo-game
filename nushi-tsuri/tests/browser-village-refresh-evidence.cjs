// LOCAL-ONLY runner. Do not execute in an environment where Chromium or its
// loopback server was denied. Requires separate approval of a capable runner.
const fs=require('node:fs'),path=require('node:path'),http=require('node:http');
const run=require('./browser-village-refresh.cjs');
const root=path.resolve(__dirname,'..');
const screens=[{width:1280,height:720,mobile:false,dpr:1},{width:844,height:390,mobile:true,dpr:1},{width:820,height:366,mobile:true,dpr:1.875}];
const requested=process.argv.slice(2).map(Number),selected=requested.length?screens.filter(s=>requested.includes(s.width)):screens;
if(!selected.length||requested.some(width=>!screens.some(s=>s.width===width)))throw Error('Supported screen widths: 1280, 844, 820');
const types={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.png':'image/png','.webp':'image/webp','.jpg':'image/jpeg','.svg':'image/svg+xml','.mp3':'audio/mpeg','.wav':'audio/wav','.json':'application/json','.webmanifest':'application/manifest+json'};
const server=http.createServer((req,res)=>{
 try{
  const pathname=new URL(req.url,'http://localhost').pathname;
  if(!pathname.startsWith('/nushi-tsuri/'))throw Error('path');
  const relative=decodeURIComponent(pathname.slice('/nushi-tsuri/'.length))||'index.html',file=path.resolve(root,relative);
  if(!file.startsWith(root+path.sep)||!fs.statSync(file).isFile())throw Error('path');
  res.writeHead(200,{'Content-Type':types[path.extname(file)]||'application/octet-stream','Cache-Control':'no-store'});
  fs.createReadStream(file).on('error',()=>res.destroy()).pipe(res);
 }catch{res.writeHead(404);res.end();}
});
(async()=>{
 await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(0,'127.0.0.1',resolve);});
 try{for(const screen of selected)await run('http://127.0.0.1:'+server.address().port+'/nushi-tsuri/',screen);}
 finally{await new Promise(resolve=>server.close(resolve));}
})().catch(error=>{console.error(error);process.exitCode=1;});
