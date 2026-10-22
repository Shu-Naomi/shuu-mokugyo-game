const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),run=require('./browser-v251.offshore.cjs');
const root=path.resolve(__dirname,'..'),width=Number(process.env.V251_WIDTH||1280),height=Number(process.env.V251_HEIGHT||720),mobile=process.env.V251_TOUCH==='1',dpr=Number(process.env.V251_DPR||1),options={viewport:{width,height},dpr};
const server=http.createServer((req,res)=>{try{const p=new URL(req.url,'http://localhost').pathname.replace(/^\/nushi-tsuri\//,'')||'index.html',f=path.resolve(root,p);if(!f.startsWith(root+path.sep)||!fs.statSync(f).isFile())throw Error('path');const type={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.png':'image/png','.webp':'image/webp','.jpg':'image/jpeg','.svg':'image/svg+xml','.mp3':'audio/mpeg','.wav':'audio/wav'}[path.extname(f)]||'application/octet-stream';res.writeHead(200,{'Content-Type':type,'Cache-Control':'no-store'});fs.createReadStream(f).pipe(res);}catch{res.writeHead(404);res.end();}});
(async()=>{await new Promise(r=>server.listen(0,'127.0.0.1',r));try{
 await run('http://127.0.0.1:'+server.address().port+'/nushi-tsuri/',mobile,options);
 if(process.env.NUSHI_PUBLIC_GAMEPLAY==='1'){
  const url='https://shu-naomi.github.io/shuu-mokugyo-game/nushi-tsuri/?v=251';let ready=false;
  for(let attempt=0;attempt<60;attempt++){const response=await fetch(url,{cache:'no-store'}),html=await response.text();if(response.ok&&html.includes('<span>v251</span>')){ready=true;break;}await new Promise(r=>setTimeout(r,2000));}
  if(!ready)throw Error('Pages has not published v251');await run(url,mobile,{...options,public:true});
 }
 }finally{await new Promise(r=>server.close(r));}})().catch(e=>{console.error(e);process.exitCode=1;});
