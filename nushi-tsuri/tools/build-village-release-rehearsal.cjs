'use strict';
// Generates a local/CI-only entry from the exact current game. Never deployed.
const fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..');
function build(){let html=fs.readFileSync(path.join(root,'index.html'),'utf8');
 const start=html.indexOf('    <script>\n      // Abort this same script');if(start<0)throw Error('Runtime boundary changed');
 const end=html.indexOf('    </script>',start);if(end<0)throw Error('Runtime end missing');
 let runtime=html.slice(start+'    <script>'.length,end);
 runtime=runtime.replace('if (new URLSearchParams(location.search).get("villageReference") === "1") {','if (!globalThis.ShuVillageProductionSession) {');
 const old="if(ShuVillageReference.enabled&&s.referenceVillageLayout!=='source-11016-1'){";
 if(!runtime.includes(old))throw Error('Preview migration boundary changed');runtime=runtime.replace(old,"if(ShuVillageReference.enabled&&!globalThis.ShuVillageProductionSession&&s.referenceVillageLayout!=='source-11016-1'){");
 html=html.slice(0,start)+'<script type="text/plain" id="villageDeferredRuntime">'+runtime+'</script>\n'+['village-save-migration','village-save-store','village-save-adapter','village-release-gate'].map(n=>'<script src="'+n+'.js"></script>').join('\n')+html.slice(end+'    </script>'.length);
 fs.writeFileSync(path.join(root,'village-release-rehearsal.html'),html);return html;
}
if(require.main===module)build();module.exports=build;
