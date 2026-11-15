'use strict';
const {test} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs'), os = require('node:os'), path = require('node:path'), vm = require('node:vm'), crypto = require('node:crypto');
const build = require('../tools/build-village-production-candidate.cjs');
const digest = bytes => crypto.createHash('sha256').update(bytes).digest();
function fixture(t) {
 const root = fs.mkdtempSync(path.join(os.tmpdir(),'village-candidate-'));
 t.after(()=>fs.rmSync(root,{recursive:true,force:true}));
 fs.mkdirSync(path.join(root,'assets'));
 fs.writeFileSync(path.join(root,'assets/village-reference-pilot.png'),Buffer.from([137,80,78,71,0,1,2]));
 for(const name of ['main','village-save-migration','village-save-store','village-save-adapter','village-release-verifier','village-release-gate'])fs.writeFileSync(path.join(root,name+'.js'),'/* '+name+' */');
 fs.writeFileSync(path.join(root,'style.css'),'body{color:red}');
 const html=`<!doctype html><html><head><meta charset="utf-8"><link rel="stylesheet" href="style.css?v=1"></head><body>
<script src="main.js?v=old" integrity="old" crossorigin="use-credentials"></script>
<script src="https://example.org/external.js"></script>
    <script>
      // Abort this same script
if (new URLSearchParams(location.search).get("villageReference") === "1") { throw Error(); }
if(ShuVillageReference.enabled&&s.referenceVillageLayout!=='source-11016-1'){ migrate(); }
if (new URLSearchParams(location.search).get("villageReference") !== "1" && "serviceWorker" in navigator)
  navigator.serviceWorker.register("./sw.js?v=252-64").catch(() => {});
const fake='<link rel="stylesheet" href="not-a-real-file.css">';
    </script></body></html>`;
 fs.writeFileSync(path.join(root,'index.html'),html);return {root,html};
}
function bootstrap(html) {
 const listeners={}, nodes=[];const context={URL,Set,location:{href:'https://game.test/nushi-tsuri/village-production-candidate.html?villageReference=1'},document:{body:null,getElementById:id=>nodes.find(n=>n.id===id),createElement:()=>({style:{},setAttribute(){}}),addEventListener:(type,fn,capture)=>{if(type!=='DOMContentLoaded')assert.equal(capture,true);listeners[type]=fn;}}};
 vm.runInNewContext(html.match(/<script id="villageCandidateBootstrap">([\s\S]*?)<\/script>/)[1],context);
 return {config:context.ShuVillageReleaseCandidate,listeners,document:context.document,nodes};
}
test('candidate hashes every local dependency, defers runtime, preserves source and exact image bytes',t=>{
 const {root,html:original}=fixture(t),html=build({root}),{config}=bootstrap(html);
 assert.equal(fs.readFileSync(path.join(root,'index.html'),'utf8'),original);
 assert.match(html,/<head>\n<script id="villageCandidateBootstrap">/);
 assert.match(html,/<script type="text\/plain" id="villageDeferredRuntime">/);
 assert.match(html,/if \(!globalThis.ShuVillageProductionSession\)/);
 assert.match(html,/ShuVillageReference.enabled&&!globalThis.ShuVillageProductionSession/);
 assert.match(html,/href="not-a-real-file.css"/);
 assert.equal(config.expectedUrls.length,7);
 for(const value of config.expectedUrls){
  const url=new URL(value),name=url.pathname.split('/').pop(),bytes=fs.readFileSync(path.join(root,name));
  assert.equal(url.searchParams.get('sha256'),digest(bytes).toString('hex'));
  assert.ok(html.includes('integrity="sha256-'+digest(bytes).toString('base64')+'" crossorigin="anonymous"'));
 }
 assert.match(html,/<script src="https:\/\/example.org\/external.js"><\/script>/);
 assert.equal(new URL(config.expectedUrls[0]).searchParams.get('v'),'1');
 assert.deepEqual(fs.readFileSync(path.join(root,new URL(config.mapURL).pathname.split('/').slice(-2).join('/'))),fs.readFileSync(path.join(root,'assets/village-reference-pilot.png')));
 assert.equal(config.mapSHA256,digest(fs.readFileSync(path.join(root,'assets/village-reference-pilot.png'))).toString('hex'));
 const last=config.expectedUrls.slice(-5).map(u=>new URL(u).pathname.split('/').pop());
 assert.deepEqual(Array.from(last),['village-save-migration.js','village-save-store.js','village-save-adapter.js','village-release-verifier.js','village-release-gate.js']);
 assert.equal(build({root}),html);
});
test('early capture tracks only expected dependency loads/errors, including stylesheet failures',t=>{
 const {root}=fixture(t),{config,listeners,document,nodes}=bootstrap(build({root}));
 const css=config.expectedUrls[0],js=config.expectedUrls[1];
 listeners.load({type:'load',target:{tagName:'SCRIPT',src:js}});
 listeners.error({type:'error',target:{tagName:'LINK',href:css}});
 listeners.error({type:'error',target:{tagName:'LINK',href:css}});
 listeners.load({type:'load',target:{tagName:'IMG',src:config.mapURL}});
 listeners.load({type:'load',target:{tagName:'SCRIPT',src:'https://other.test/a.js'}});
 assert.deepEqual(Array.from(config.loaded),[js]);assert.deepEqual(Array.from(config.failed),[css]);
 assert.equal(nodes.length,0);document.body={appendChild:node=>nodes.push(node)};listeners.DOMContentLoaded();
 assert.equal(nodes.length,1);assert.match(nodes[0].textContent,/起動を止めました/);
 listeners.error({type:'error',target:{tagName:'SCRIPT',src:js}});assert.equal(nodes.length,1);
});
test('changed bytes change resource hashes; missing dependency fails before output',t=>{
 const {root}=fixture(t),first=bootstrap(build({root})).config;
 fs.writeFileSync(path.join(root,'main.js'),'changed');
 const second=bootstrap(build({root})).config;
 assert.notEqual(first.expectedUrls[1],second.expectedUrls[1]);
 const output=fs.readFileSync(path.join(root,'village-production-candidate.html'),'utf8');
 fs.unlinkSync(path.join(root,'village-release-verifier.js'));
 assert.throws(()=>build({root}),/ENOENT/);
 assert.equal(fs.readFileSync(path.join(root,'village-production-candidate.html'),'utf8'),output);
});

test('candidate session without preview query never registers the legacy worker',t=>{
 const {root}=fixture(t),html=build({root});
 const runtime=html.match(/<script type="text\/plain" id="villageDeferredRuntime">([\s\S]*?)<\/script>/)[1];
 const calls=[];
 const context={URLSearchParams,location:{search:''},ShuVillageProductionSession:{ok:true},ShuVillageReference:{enabled:true},s:{},migrate(){throw Error('preview migration must not run');},navigator:{serviceWorker:{register:url=>{calls.push(url);return Promise.resolve();}}}};
 vm.runInNewContext(runtime,context);
 assert.deepEqual(calls,[]);
 // A missing/changed registration boundary must fail rather than emit unsafe HTML.
 const file=path.join(root,'index.html');fs.writeFileSync(file,fs.readFileSync(file,'utf8').replace('!== "1" && "serviceWorker"','!== "2" && "serviceWorker"'));
 assert.throws(()=>build({root}),/Service worker registration boundary changed/);
});
