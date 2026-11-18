'use strict';
// Edit tools/templates/game-index.html, never the generated index.html.
const fs=require('node:fs'),path=require('node:path');
function build(){
 const root=path.resolve(__dirname,'..');
 const result=require('./build-village-production-candidate.cjs').withMetadata({root,sourcePath:'tools/templates/game-index.html',outputPath:'index.html',production:true,mapSource:'assets/village-shop-signs-v252-73.png'});
 const assets=['./index.html',...result.manifest.expectedUrls.map(u=>'./'+u),'./'+result.manifest.mapURL];
 fs.writeFileSync(path.join(root,'village-precache-252-74.js'),'// Generated with index.html; do not edit.\nself.SHU_VILLAGE_PRECACHE = '+JSON.stringify(assets,null,2)+';\n');
 return result;
}
if(require.main===module)build();module.exports=build;
