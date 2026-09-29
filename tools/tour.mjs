// Screenshot tour with real frames (Playwright driving the installed Microsoft Edge; no browser download).
//   node tools/tour.mjs            → every route in ROUTES, all three languages where marked
//   node tools/tour.mjs legacy     → only routes tagged "legacy"
// Writes tours/<set>/<name>.png, a contact sheet tours/<set>/_sheet.png, and fails on page errors.
import { chromium } from 'playwright-core';
import { mkdirSync, writeFileSync, existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { tmpdir } from 'node:os';
import { spawn } from 'node:child_process';
import { pathToFileURL } from 'node:url';

const set = process.argv[2] || 'all';
const PAGE = pathToFileURL(resolve('dist/index.html')).href;
const L = ['en', 'fr', 'fa'];
const TEMPLATE_IDS = [...readFileSync('src/templates/index.js', 'utf8').matchAll(/^\s+(\w+): \w+,/gm)].map(m => m[1]);
// [name, hash, tags, langs]
const ROUTES = [
  ['menu', 'freeplay', ['legacy'], ['en', 'fa']],
  ['free', 'free', ['legacy'], ['en']],
  ['find-where', 'find_where', ['legacy'], ['en', 'fa']],
  ['rocket', 'rocket', ['legacy'], ['en']],
  ['order', 'order', ['legacy'], ['en', 'fa']],
  ['count-make', 'count_make', ['legacy'], ['en']],
  ['words', 'words', ['legacy'], ['en']],
  ['sleep', 'sleep', ['legacy'], ['en']],
  ['grownups', 'freeplay_grownups', ['legacy', 'new'], ['en']],
  ['hub', 'hub', ['new'], L],
  // every registered curriculum template at its lowest and highest level, in all three languages
  ...TEMPLATE_IDS.flatMap(tp => ['min', 'max'].map(lv => [`${tp}-L${lv}`, `${tp}-L${lv}`, ['new'], L])),
];
const routes = ROUTES.filter(r => set === 'all' || r[2].includes(set));
const out = resolve('tours', set); rmSync(out, { recursive: true, force: true }); mkdirSync(out, { recursive: true });

// Playwright's pipe launch hangs with current Edge builds, so start Edge ourselves (new headless mode)
// on a debugging port and attach over CDP.
const EDGE = ['C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', 'C:/Program Files/Microsoft/Edge/Application/msedge.exe'].find(existsSync);
const profile = mkdtempSync(join(tmpdir(), 'pp-tour-'));
const port = 9300 + Math.floor(Math.random() * 400);
const edge = spawn(EDGE, ['--headless=new', `--remote-debugging-port=${port}`, `--user-data-dir=${profile}`, '--no-first-run',
  '--hide-scrollbars', '--mute-audio', '--disable-extensions', 'about:blank'], { stdio: 'ignore' });
let browser;
for (let i = 0; i < 60 && !browser; i++) {
  try { browser = await chromium.connectOverCDP(`http://127.0.0.1:${port}`); } catch { await new Promise(r => setTimeout(r, 500)); }
}
if (!browser) { edge.kill(); throw new Error('could not reach Edge on the debugging port'); }
const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 }, deviceScaleFactor: 1 });
const errors = [], shots = [];
for (const [name, hash, , langs] of routes) {
  for (const lang of langs) {
    const page = await ctx.newPage();
    page.on('pageerror', e => errors.push(`${name}/${lang}: ${e.message}`));
    page.on('console', m => { if (m.type() === 'error' && !/manifest|favicon|Failed to load resource/i.test(m.text())) errors.push(`${name}/${lang} console: ${m.text()}`); });
    await page.goto(`${PAGE}#${hash}-${lang}`);
    await page.waitForTimeout(1600);
    const file = `${name}-${lang}.png`;
    await page.screenshot({ path: resolve(out, file) });
    shots.push(file);
    await page.close();
  }
}
// Contact sheet: lay the shots out in a grid page and screenshot that.
const cols = 4, w = 320, h = 200;
const sheetHtml = `<body style="margin:0;background:#fff;font:11px sans-serif;display:grid;grid-template-columns:repeat(${cols},${w}px);gap:4px">` +
  shots.map(f => `<figure style="margin:0"><img src="${pathToFileURL(resolve(out, f)).href}" width="${w}" height="${h}"><figcaption>${f}</figcaption></figure>`).join('') + '</body>';
writeFileSync(resolve(out, '_sheet.html'), sheetHtml);
const sp = await ctx.newPage();
await sp.setViewportSize({ width: cols * (w + 4), height: Math.ceil(shots.length / cols) * (h + 20) });
await sp.goto(pathToFileURL(resolve(out, '_sheet.html')).href);
await sp.waitForTimeout(500);
await sp.screenshot({ path: resolve(out, '_sheet.png'), fullPage: true });
await browser.close(); edge.kill();
console.log(`tour "${set}": ${shots.length} shots → ${out}`);
if (errors.length) { console.error('PAGE ERRORS:\n' + [...new Set(errors)].join('\n')); process.exit(1); }
