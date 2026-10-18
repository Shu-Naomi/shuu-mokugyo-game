const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),assert=require('node:assert/strict');
const {chromium}=require('playwright'),{seed,saveKey}=require('./game-harness.cjs'),run=require('./browser-v241.fixes.cjs'),root=path.resolve(__dirname,'..');
const server=http.createServer((req,res)=>{try{const p=new URL(req.url,'http://localhost').pathname.replace(/^\/nushi-tsuri\//,'')||'index.html',f=path.resolve(root,p);if(!f.startsWith(root+path.sep)||!fs.existsSync(f))throw Error('path');const type={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.png':'image/png','.webp':'image/webp','.jpg':'image/jpeg','.svg':'image/svg+xml','.mp3':'audio/mpeg','.wav':'audio/wav'}[path.extname(f)]||'application/octet-stream';res.writeHead(200,{'Content-Type':type,'Cache-Control':'no-store'});fs.createReadStream(f).pipe(res);}catch{res.writeHead(404);res.end();}});
(async()=>{await new Promise(r=>server.listen(0,'127.0.0.1',r));const browser=await chromium.launch({headless:true});
 try{for(const [mobile,viewport,dpr]of [[false,{width:1280,height:720},1],[true,{width:844,height:390},1],[true,{width:820,height:366},1.875]]){
  const context=await browser.newContext({viewport,deviceScaleFactor:dpr,isMobile:mobile,hasTouch:mobile,locale:'ja-JP',serviceWorkers:'block'}),page=await context.newPage(),errors=[],failed=[];
  page.on('pageerror',e=>errors.push(e.message));page.on('response',r=>{if(r.status()>=400)failed.push(r.status()+' '+new URL(r.url()).pathname);});
  await context.addInitScript(({key,state})=>{localStorage.setItem('nushi-inugoya-options-v1',JSON.stringify({textSpeed:'instant'}));localStorage.setItem(key,JSON.stringify(state));},{key:saveKey,state:{...seed(),hp:100,soundEnabled:false,gameMinutes:600}});
  try{await page.goto('http://127.0.0.1:'+server.address().port+'/nushi-tsuri/');await page.locator('#start')[mobile?'tap':'click']();if(await page.locator('#lakeIntroSkip').isVisible())await page.locator('#lakeIntroSkip')[mobile?'tap':'click']();await run(page,mobile,viewport);assert.deepEqual(errors,[]);assert.deepEqual(failed,[]);}
  finally{await context.close();}
 }}finally{await browser.close();server.closeAllConnections();await new Promise(r=>server.close(r));}
})().catch(e=>{console.error(e);process.exitCode=1;});
