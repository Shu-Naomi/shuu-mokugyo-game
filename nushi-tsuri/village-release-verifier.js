/* Candidate startup only: no storage access, no worker/cache deletion. */
(function(root){
 'use strict';
 root.ShuVillageReleaseVerifier={async verify(){
  const c=root.ShuVillageReleaseCandidate;
  if(!c)return {ok:false,reason:'missing-release-manifest'};
  if(document.readyState!=='complete')await new Promise(resolve=>window.addEventListener('load',resolve,{once:true}));
  if(c.failed.length||c.expectedUrls.some(url=>!c.loaded.has(new URL(url,location.href).href)))return {ok:false,reason:'release-dependency-mismatch'};
  if(!root.ShuVillageReference?.enabled||!crypto.subtle)return {ok:false,reason:'release-verification-unavailable'};
  const abort=new AbortController(),timer=setTimeout(()=>abort.abort(),15000);
  try{
   const response=await fetch(c.mapURL,{signal:abort.signal});if(!response.ok)throw Error('map-fetch');
   const bytes=await response.arrayBuffer(),digest=await crypto.subtle.digest('SHA-256',bytes);
   const hash=Array.from(new Uint8Array(digest),n=>n.toString(16).padStart(2,'0')).join('');
   if(hash!==c.mapSHA256)return {ok:false,reason:'release-map-mismatch'};
   // Paint exactly the verified bytes, not a second potentially mixed-cache fetch.
   root.ShuVillageReference.source.asset=URL.createObjectURL(new Blob([bytes],{type:'image/png'}));
   return {ok:true,mapSHA256:hash};
  }catch(_){return {ok:false,reason:'release-map-unavailable'};}finally{clearTimeout(timer);}
 }};
})(globalThis);
