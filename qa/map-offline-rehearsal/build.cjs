'use strict';
// Local rehearsal only. A hosting rollout must expose every staged byte before
// it replaces the worker, while keeping canonical index and old assets intact.
const fs = require('node:fs'), path = require('node:path'), vm = require('node:vm');
const {createHash} = require('node:crypto');
const base = path.resolve(__dirname,'../baseline/nushi-tsuri');
const next = path.resolve(__dirname,'../repo/nushi-tsuri');
const out = path.resolve(__dirname,'../stage');
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const read = (root,url) => {
  if (!/^\.\/[a-zA-Z0-9_./-]+(?:\?[^#]*)?$/.test(url) || url.includes('/../')) throw Error(url);
  return fs.readFileSync(path.resolve(root,url.split('?')[0]));
};
function assetList(root) {
  const ctx = {self:{addEventListener(){}},importScripts(url){vm.runInContext(read(root,url).toString(),ctx);}};
  vm.createContext(ctx);
  return vm.runInContext(read(root,'./sw.js').toString()+'\n;({name:CACHE_NAME,assets:[...new Set(CORE_ASSETS)]})',ctx);
}
const previous = assetList(base), proposed = assetList(next);
const type = url => path.extname(url.split('?')[0]);
const oldKeys = new Map();
for (const url of previous.assets) if(!['./index.html','./'].includes(url)) {
  const key=hash(read(base,url))+type(url);
  if(!oldKeys.has(key)) oldKeys.set(key,url);
}
const staged = new Map(), items=[];
let html = read(next,'./index.html').toString();
const badge = 'aria-label="ゲームのバージョン">v252-85<';
if (html.split(badge).length!==2) throw Error('Badge not unique');
html = html.replace(badge,badge.replace('252-85','252-91'));
staged.set('release-252-91.html',Buffer.from(html));
items.push({url:'./index.html',digest:hash(Buffer.from(html)),stage:'./__stage-252-91/release-252-91.html'});
let total=Buffer.byteLength(html);
for (const url of proposed.assets) {
  if(['./index.html','./'].includes(url)) continue;
  const bytes=read(next,url), digest=hash(bytes), old=oldKeys.get(digest+type(url));
  const file=digest+type(url);
  items.push({url,digest,old,stage:'./__stage-252-91/'+file});
  // Stage fallback bytes for clean installs and repair of missing old keys.
  if (!staged.has(file)) {staged.set(file,bytes);total+=bytes.length;}
}
fs.mkdirSync(path.join(out,'__stage-252-91'),{recursive:true});
for (const [name,bytes] of staged) fs.writeFileSync(path.join(out,'__stage-252-91',name),bytes);
fs.writeFileSync(path.join(out,'release-252-91-manifest.js'),'self.STARFALL_STAGE='+JSON.stringify({previous:previous.name,current:'nushi-tsuri-staged-252-91',items})+';\n');
fs.copyFileSync(path.join(__dirname,'worker.js'),path.join(out,'sw.js'));
console.log(JSON.stringify({items:items.length,borrow:items.filter(i=>i.old).length,stageBytes:total,entryHash:items[0].digest,previousHash:hash(read(base,'./index.html'))}));
