// Same-art study: production retains the original v252-55 artwork and renderer.
// Browser-only interpolation experiments live in browser-sam-pixel-pilot.cjs.
const {test}=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const {createCanvas,loadImage}=require('@napi-rs/canvas');
const Data=require('../scene-layers.js'),Art=require('../layered-scenery.js');
const root=path.resolve(__dirname,'..'),d=Data.get('world');

test('same-art study preserves the original village source and underlay byte for byte',()=>{
 const assets={
  'assets/village-world-v252-55-riao-clear.png':'5354fce75c04ec39c9f2774025193212079bbdaefbcf1a59321ce527f7e8ee55',
  'assets/village-underlay-v252-55-riao.png':'4a22b1aad4bbf415252778387663b3a019f28fee8f7362accc5c30fc25132841'
 };
 assert.deepEqual([d.source,d.underlay],Object.keys(assets));
 for(const [file,sha] of Object.entries(assets))assert.equal(crypto.createHash('sha256').update(fs.readFileSync(path.join(root,file))).digest('hex'),sha);
});

test('rejected new building art is absent and the original source needs no replacement assembly',async()=>{
 assert.deepEqual(d.edits,[]);
 assert.equal(fs.existsSync(path.join(root,'assets/sam-sfc-pixel-pilot.png')),false);
 assert.equal(fs.existsSync(path.join(root,'tools/draw-sam-pixel-pilot.cjs')),false);
 const source=await loadImage(path.join(root,d.source));
 assert.deepEqual([source.width,source.height],[1672,941]);
 let allocations=0;
 const assembled=Art.assembleSource(source,d,[],(...args)=>{allocations++;return createCanvas(...args);});
 assert.strictEqual(assembled,source);assert.equal(allocations,0,'no replacement image or extra assembly canvas');
});

test('native spring-day preparation and composition do not resample or blur any source pixel',async()=>{
 const source=await loadImage(path.join(root,d.source)),underlay=await loadImage(path.join(root,d.underlay));
 const original=createCanvas(source.width,source.height),composed=createCanvas(source.width,source.height);
 original.getContext('2d').drawImage(source,0,0);
 const scene=Art.prepare(source,underlay,d,{season:'spring',period:'day'},createCanvas);
 Art.compose(composed,scene);
 assert.deepEqual([scene.width,scene.height],[1672,941]);
 const rgba=c=>c.getContext('2d').getImageData(0,0,c.width,c.height).data;
 assert.deepEqual(rgba(composed),rgba(original),'all 1,573,352 native RGBA pixels are unchanged');
});

test('rendering experiments are not shipped as production CSS or camera changes',()=>{
 const css=fs.readFileSync(path.join(root,'pixel-scenes.css'),'utf8');
 assert.match(css,/\.pixel-scene[^}]*image-rendering:\s*pixelated/);
 assert.match(css,/\.scenery-motion,\s*\.scenery-foreground[^}]*image-rendering:\s*pixelated/);
 assert.doesNotMatch(css,/crisp-edges|sam-rendering-study/);
 const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
 assert.match(html,/translate3d\(\$\{-cameraX \/ WORLD_SCALE_X\}%, \$\{-cameraY \/ WORLD_SCALE_Y\}%, 0\)/);
 assert.doesNotMatch(html,/sam-sfc-pixel-pilot|sam-rendering-study/);
});

test('original offline scene metadata and assets remain precached without the rejected art',()=>{
 const worker=fs.readFileSync(path.join(root,'scenery-worker.js'),'utf8'),sw=fs.readFileSync(path.join(root,'sw.js'),'utf8');
 for(const url of [...worker.matchAll(/['"]([^'"]+\.js\?v=[^'"]+)['"]/g)].map(m=>m[1]))assert.ok(sw.includes('"./'+url+'"'),'offline worker import '+url);
 for(const file of [d.source,d.underlay])assert.ok(sw.includes('"./'+file+'"'));
 assert.doesNotMatch(sw,/sam-sfc-pixel-pilot|252-5501/);
});
