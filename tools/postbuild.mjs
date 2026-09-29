// After `vite build`: write dist/sw.js with a content-hash cache version, and (optionally) the artifact
// variant of the page (no doctype/html/head/body wrapper, no PWA/standalone head block).
//   node tools/postbuild.mjs [artifactOut.html]
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
const html = readFileSync('dist/index.html', 'utf8');
const h = createHash('sha256').update(html);
for (const f of ['manifest.webmanifest', 'icons/icon-192.png', 'icons/icon-512.png', 'icons/icon-maskable-512.png']) h.update(readFileSync(`dist/${f}`));
const version = h.digest('hex').slice(0, 10);
writeFileSync('dist/sw.js', readFileSync('tools/sw.template.js', 'utf8').replace('__VERSION__', version));
console.log(`dist/index.html ${Math.round(html.length / 1024)} KB · sw cache v${version}`);
const out = process.argv[2];
if (out) {
  let page = html.replace(/<!--PP:STANDALONE-->[\s\S]*?<!--\/PP:STANDALONE-->\n?/, '')
    .replace(/<link rel="(manifest|icon|apple-touch-icon)"[^>]*>\n?/g, '')
    .replace(/^<!doctype html>\s*<html[^>]*>\s*<head>\s*/i, '')
    .replace(/<meta charset="utf-8">\n?|<meta name="viewport"[^>]*>\n?/g, '')
    .replace(/<\/head>\s*<body>\s*/i, '\n').replace(/\s*<\/body>\s*<\/html>\s*$/i, '\n');
  // the artifact reads its <title> from the first 8 KB, so hoist it to the top
  const title = (page.match(/<title>.*?<\/title>/) || [''])[0];
  page = title + '\n' + page.replace(title, '');
  writeFileSync(out, page);
  console.log(`artifact page → ${out} (${Math.round(page.length / 1024)} KB)`);
}
