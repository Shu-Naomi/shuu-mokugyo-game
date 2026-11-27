'use strict';
importScripts('./release-252-91-manifest.js');
const {previous,current,items}=self.STARFALL_STAGE;
const abs = p => new URL(p,self.registration.scope).href;
const declared = new Map(items.map(item=>[abs(item.url),item]));
const entry = items[0];
const ready = abs('./__stage-252-91/installed');
async function valid(response,digest) {
  if(!response || response.status!==200 || response.redirected) return false;
  const bytes = await response.clone().arrayBuffer();
  const computed = Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes)),n=>n.toString(16).padStart(2,'0')).join('');
  return computed===digest;
}
self.addEventListener('install',event=>event.waitUntil((async()=>{
  const old=await caches.has(previous)?await caches.open(previous):null;
  // This name belongs only to this immutable release. No existing version
  // can be affected by writes or by a rejected installation.
  if(await caches.has(current)){
    const existing=await caches.open(current);
    if((await existing.match(ready))?.status===200) return;
    await caches.delete(current);
  }
  const fresh=await caches.open(current);
  try {
    for(const item of items){
      if(item.old && old && await valid(await old.match(abs(item.old)),item.digest)) continue;
      const response=await fetch(abs(item.stage),{cache:'no-store',redirect:'error'});
      if(!await valid(response,item.digest)) throw Error('Invalid staged file: '+item.url);
      await fresh.put(abs(item.url),response);
    }
    await fresh.put(ready,new Response(entry.digest));
  } catch(error) {
    await caches.delete(current);
    throw error;
  }
})()));
// Waiting worker must not force old tabs to adopt new assets mid-session.
self.addEventListener('fetch',event=>{
  const request=event.request;
  if(request.method!=='GET') return;
  const url=new URL(request.url),scope=new URL(self.registration.scope);
  if(url.origin!==scope.origin) return;
  const canonical=request.mode==='navigate' && (url.pathname===scope.pathname || url.pathname===scope.pathname+'index.html');
  const item=canonical?entry:declared.get(request.url);
  if(!item) return;
  event.respondWith((async()=>{
    if(await caches.has(current)){
      const hit=await (await caches.open(current)).match(abs(item.url));
      if(hit) return hit;
    }
    if(item.old && await caches.has(previous)){
      const hit=await (await caches.open(previous)).match(abs(item.old));
      if(await valid(hit,item.digest)) return hit;
    }
    const response=await fetch(abs(item.stage),{cache:'no-store',redirect:'error'});
    if(!await valid(response,item.digest)) return Response.error();
    return response;
  })().catch(()=>Response.error()));
});
