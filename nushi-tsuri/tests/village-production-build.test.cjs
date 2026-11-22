'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),os=require('node:os'),vm=require('node:vm');
const build=require('../tools/build-village-production-candidate.cjs');
function fixture(t){
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'village-production-'));
 t.after(()=>fs.rmSync(root,{recursive:true,force:true}));
 fs.mkdirSync(path.join(root,'tools/templates'),{recursive:true});fs.mkdirSync(path.join(root,'assets'));
 fs.writeFileSync(path.join(root,'assets/village-reference-pilot.png'),'original png bytes');
 for(const name of ['village-save-migration','village-save-store','village-save-adapter','village-release-verifier','village-release-gate'])fs.writeFileSync(path.join(root,name+'.js'),'/* '+name+' */');
 const source=`<!doctype html><html><head><meta charset="utf-8"></head><body>
    <script>
      // Abort this same script
if (new URLSearchParams(location.search).get("villageReference") === "1") { throw Error(); }
if(ShuVillageReference.enabled&&s.referenceVillageLayout!=='source-11016-1'){ migrate(); }
if (new URLSearchParams(location.search).get("villageReference") !== "1" && "serviceWorker" in navigator)
 navigator.serviceWorker.register('./sw.js?v=252-65');
    </script></body></html>`;
 fs.writeFileSync(path.join(root,'tools/templates/game-index.html'),source);fs.writeFileSync(path.join(root,'index.html'),source);
 return {root,source};
}
test('production requires explicit template and preserves it across reproducible actual-index builds',t=>{
 const {root,source}=fixture(t);
 assert.throws(()=>build({root,production:true}),/explicit sourcePath/);
 const options={root,production:true,sourcePath:'tools/templates/game-index.html',outputPath:'index.html'};
 const first=build.withMetadata(options),second=build.withMetadata(options);
 assert.equal(first.html,second.html);assert.deepEqual(first.manifest,second.manifest);
 assert.equal(fs.readFileSync(path.join(root,options.sourcePath),'utf8'),source);
 assert.equal(fs.readFileSync(path.join(root,'index.html'),'utf8'),first.html);
 assert.equal(first.manifest.workerURL,'./sw.js?v=252-86');assert.equal(first.manifest.expectedUrls.length,5);
 assert.match(first.manifest.mapURL,/^assets\/village-reference-[a-f0-9]{16}\.png$/);
 assert.ok(Buffer.byteLength(first.html.slice(0,first.html.indexOf('<meta charset="utf-8">'))) < 1024);
 assert.ok(first.html.indexOf('<meta charset="utf-8">') < first.html.indexOf('villageCandidateBootstrap'));
 const ctx={URL,Set,location:{href:'https://example.test/nushi-tsuri/index.html'},document:{addEventListener(){}}};
 vm.runInNewContext(first.html.match(/<script id="villageCandidateBootstrap">([\s\S]*?)<\/script>/)[1],ctx);
 assert.equal(ctx.ShuVillageReleaseCandidate.workerURL,'./sw.js?v=252-86');
 assert.equal(ctx.ShuVillageReleaseCandidate.expectedUrls[0].startsWith('https://example.test/nushi-tsuri/'),true);
 assert.throws(()=>build({root,sourcePath:'index.html'}),/Generated HTML/);
});
test('explicit absolute template and default candidate output remain supported without production worker registration',t=>{
 const {root}=fixture(t),sourcePath=path.join(root,'tools/templates/game-index.html');
 const result=build.withMetadata({root,sourcePath});
 assert.equal(result.sourcePath,sourcePath);assert.equal(result.outputPath,path.join(root,'village-production-candidate.html'));
 assert.equal(Object.hasOwn(result.manifest,'workerURL'),false);
 assert.equal(build({root,sourcePath}),result.html);
});
test('reject source overwrite, paths outside root, and symlink output before altering source',t=>{
 const {root,source}=fixture(t);
 assert.throws(()=>build({root,sourcePath:'index.html',outputPath:'index.html'}),/must differ/);
 assert.throws(()=>build({root,sourcePath:'../outside.html'}),/escapes root/);
 assert.throws(()=>build({root,outputPath:'../outside.html'}),/escapes root/);
 assert.throws(()=>build({root,outputPath:'tools/nested.html'}),/game root/);
 fs.symlinkSync(path.join(root,'index.html'),path.join(root,'alias.html'));
 assert.throws(()=>build({root,outputPath:'alias.html'}),/symlink/);
 assert.equal(fs.readFileSync(path.join(root,'index.html'),'utf8'),source);
});
