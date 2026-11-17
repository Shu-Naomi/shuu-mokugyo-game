const assert=require('node:assert/strict');
function marketAsset(pageURL,assetURL){
 const base=new URL('./',pageURL),asset=new URL(assetURL,base);
 assert.equal(asset.origin,base.origin);
 assert.ok(asset.pathname.startsWith(base.pathname),'asset outside this game');
 const relative=asset.pathname.slice(base.pathname.length);
 assert.match(relative,/^assets\/[A-Za-z0-9_-]+\.png$/);
 return {relative,pathname:asset.pathname};
}
module.exports={marketAsset};
