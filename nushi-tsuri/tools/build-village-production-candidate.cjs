'use strict';
// Deterministic entry generation. Production requires an explicit source template.
// Does not register workers or modify service-worker code.
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const hash = bytes => crypto.createHash('sha256').update(bytes).digest();
function withMetadata({root = path.resolve(__dirname, '..'), sourcePath, outputPath = 'village-production-candidate.html', production = false, mapSource = 'assets/village-reference-pilot.png'} = {}) {
  root = fs.realpathSync(path.resolve(root));
  if (production && !sourcePath) throw Error('Production requires explicit sourcePath');
  function inside(value, exists) {
    const resolved = path.resolve(root, value);
    if (!resolved.startsWith(root + path.sep)) throw Error('Build path escapes root');
    const real = exists ? fs.realpathSync(resolved) : path.join(fs.realpathSync(path.dirname(resolved)), path.basename(resolved));
    if (!real.startsWith(root + path.sep)) throw Error('Build path escapes root through symlink');
    if (!exists && fs.existsSync(resolved) && fs.lstatSync(resolved).isSymbolicLink()) throw Error('Output must not be a symlink');
    return real;
  }
  sourcePath = inside(sourcePath || 'index.html', true);
  outputPath = inside(outputPath, false);
  if (path.dirname(outputPath) !== root) throw Error('Output must be in game root to preserve resource URLs');
  if (sourcePath === outputPath) throw Error('Source and output must differ');
  let html = fs.readFileSync(sourcePath, 'utf8');
  if (html.includes('id="villageCandidateBootstrap"')) throw Error('Generated HTML cannot be used as source');
  const opening = '    <script>\n      // Abort this same script';
  const start = html.indexOf(opening), end = html.indexOf('    </script>', start);
  if (start < 0 || end < 0) throw Error('Runtime boundary changed');
  let runtime = html.slice(start + '    <script>'.length, end);
  const guard = 'if (new URLSearchParams(location.search).get("villageReference") === "1") {';
  const migration = "if(ShuVillageReference.enabled&&s.referenceVillageLayout!=='source-11016-1'){";
  if (!runtime.includes(guard) || !runtime.includes(migration)) throw Error('Preview migration boundary changed');
  runtime = runtime.replace(guard, 'if (!globalThis.ShuVillageProductionSession) {')
    .replace(migration, "if(ShuVillageReference.enabled&&!globalThis.ShuVillageProductionSession&&s.referenceVillageLayout!=='source-11016-1'){");
  const workerGuard = 'if (new URLSearchParams(location.search).get("villageReference") !== "1" && "serviceWorker" in navigator)';
  if (!runtime.includes(workerGuard)) throw Error('Service worker registration boundary changed');
  runtime = runtime.replace(workerGuard, 'if (!globalThis.ShuVillageProductionSession && new URLSearchParams(location.search).get("villageReference") !== "1" && "serviceWorker" in navigator)');
  runtime += '\nglobalThis.ShuVillageRuntimeReady = true;\n';
  const scripts = ['village-save-migration', 'village-save-store', 'village-save-adapter', 'village-release-verifier', 'village-release-gate'];
  html = html.slice(0, start) + '<script type="text/plain" id="villageDeferredRuntime">' + runtime + '</script>\n' +
    scripts.map(n => '<script src="' + n + '.js"></script>').join('\n') + html.slice(end + '    </script>'.length);
  const expectedUrls = [];
  // Match complete script elements too, so text/plain runtime and inline JS are
  // opaque: HTML-like strings inside game code must never be transformed.
  html = html.replace(/<script\b[^>]*>[\s\S]*?<\/script\s*>|<link\b[^>]*>/gi, element => {
    const openEnd = element.indexOf('>'), tag = element.slice(0, openEnd + 1);
    const script = /^<script\b/i.test(tag);
    if (!script && !/\brel\s*=\s*(["'])stylesheet\1/i.test(tag)) return element;
    const attr = script ? 'src' : 'href';
    const match = tag.match(new RegExp('\\b' + attr + '\\s*=\\s*(["\'])(.*?)\\1', 'i'));
    if (!match) return element;
    const original = match[2].replace(/&amp;/g, '&');
    if (/^(?:[a-z][\w+.-]*:|\/\/)/i.test(original)) return element;
    const url = new URL(original, 'https://candidate.invalid/');
    const local = path.resolve(root, '.' + decodeURIComponent(url.pathname));
    if (!local.startsWith(root + path.sep)) throw Error('Resource escapes candidate root: ' + original);
    const digest = hash(fs.readFileSync(local));
    url.searchParams.set('sha256', digest.toString('hex'));
    const resource = url.pathname.slice(1) + url.search + url.hash;
    expectedUrls.push(resource);
    let next = tag.replace(match[0], attr + '="' + resource.replace(/&/g, '&amp;') + '"')
      .replace(/\s+(?:integrity|crossorigin)\s*=\s*(["'])[\s\S]*?\1/gi, '');
    next = next.replace(/\s*\/?>$/, ' integrity="sha256-' + digest.toString('base64') + '" crossorigin="anonymous">');
    return next + element.slice(openEnd + 1);
  });
  const image = fs.readFileSync(inside(mapSource, true));
  const mapSHA256 = hash(image).toString('hex');
  const mapURL = 'assets/village-reference-' + mapSHA256.slice(0, 16) + '.png';
  const manifest = {expectedUrls: [...new Set(expectedUrls)], mapURL, mapSHA256, ...(production ? {workerURL: './sw.js?v=252-83'} : {})};
  const config = JSON.stringify(manifest).replace(/</g, '\\u003c');
  const bootstrap = `<script id="villageCandidateBootstrap">\n(function(){\n  const config = ${config};\n  config.expectedUrls = config.expectedUrls.map(url => new URL(url, location.href).href);\n  config.mapURL = new URL(config.mapURL, location.href).href;\n  config.loaded = new Set(); config.failed = [];\n  globalThis.ShuVillageReleaseCandidate = config;\n  function blocked() {\n    if (!config.failed.length || !document.body || document.getElementById('villageCandidateFailure')) return;\n    const notice = document.createElement('div');\n    notice.id = 'villageCandidateFailure'; notice.setAttribute('role', 'alert');\n    notice.style.cssText = 'position:fixed;inset:0;z-index:2147483647;background:#10202b;color:white;padding:24px;display:grid;place-content:center;font:18px sans-serif';\n    notice.textContent = '起動を止めました。必要なファイルを確認できませんでした。保存データは変更していません。接続を確認して再読み込みしてください。';\n    document.body.appendChild(notice);\n  }\n  document.addEventListener('DOMContentLoaded', blocked, {once:true});\n  function record(event) {\n    const target = event.target;\n    if (!target || !/^(SCRIPT|LINK)$/.test(target.tagName)) return;\n    const url = target.src || target.href;\n    if (!config.expectedUrls.includes(url)) return;\n    if (event.type === 'load') config.loaded.add(url);\n    else { if (!config.failed.includes(url)) config.failed.push(url); blocked(); }\n  }\n  document.addEventListener('load', record, true);\n  document.addEventListener('error', record, true);\n})();\n</script>`;
  if (!/<head\b[^>]*>/i.test(html)) throw Error('Head missing');
  // Encoding declaration must remain within the first 1024 bytes, before the large manifest.
  html = html.replace(/<meta\b[^>]*\bcharset\s*=\s*(["'])[^"']*\1[^>]*>/gi, '');
  html = html.replace(/<head\b[^>]*>/i, head => head + '\n<meta charset="utf-8">\n' + bootstrap);
  html = html.replace(/^[ \t]+$/gm, '');
  // Finish all validation/reads before writing either generated artifact.
  fs.writeFileSync(path.join(root, mapURL), image);
  fs.writeFileSync(outputPath, html);
  return {html, manifest, outputPath, sourcePath};
}
function build(options) { return withMetadata(options).html; }
build.withMetadata = withMetadata;
if (require.main === module) build();
module.exports = build;
