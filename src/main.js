import './styles.css';
import './generated/fonts.css';
import { hush } from './audio/speech.js';
import { PACKS } from './content/packs.js';
import { rolloverToday, saveToday, settings, today } from './core/settings.js';
import { drawParts, updateParts } from './engine/particles.js';
import { drawSky, makeStars, paintSkyBackdrop } from './engine/sky.js';
import { T, advanceClock, camX, cx, setViewport } from './engine/stage.js';
import { runTimers } from './engine/timers.js';
import { M, MODES, applyLang, goToSleep, modeName, playing, setMode, wakeLock, wakeWanted } from './hub/router.js';
import { LANGS, setLang } from './i18n/i18n.js';
import { TEMPLATES } from './templates/index.js';
import { maybeFirstRun } from './ui/firstrun.js';
import { drawIcons } from './ui/menu-art.js';

/* ---------- boot ---------- */
function resize() {
  setViewport();
  makeStars(); paintSkyBackdrop();
  if (M) M.layout();
}
addEventListener('resize', resize);
resize();
drawIcons();
if (document.fonts && document.fonts.ready) document.fonts.ready.then(drawIcons);
// Deep links (plain tokens only): #hub · #freeplay · #rocket-fa · #find_where-fa · #freeplay_grownups
// · #bond-Lmin-fr / #bond-Lmax (a curriculum template at its lowest / highest level; preview only)
// · #number-L7 (one curriculum level; preview only, nothing is saved).
const tokens = (location.hash || '').slice(1).split('-').filter(Boolean);
let deepLevel = null;
for (const tk of tokens.slice(1)) { if (/^L(\d+|min|max)$/.test(tk)) deepLevel = tk.slice(1); else if (LANGS.includes(tk)) setLang(tk); }
const [deepMode, deepSub] = (tokens[0] || '').split('_');
applyLang();
// If play time ran out earlier today, the planets are still asleep until a grown-up wakes them.
if (today.asleep) setMode('sleep');
else if (TEMPLATES[tokens[0]]) setMode('play', `tpl:${tokens[0]}:${deepLevel === 'max' ? 'max' : 'min'}`); // ids like bead_frame contain '_'
else if (PACKS.some(p => p.id === deepMode) && deepLevel) setMode('play', `preview:${deepMode}.${deepLevel}`);
else if (MODES[deepMode] && deepMode !== 'menu' && deepMode !== 'play') setMode(deepMode, deepSub);
else setMode('hub');
// First launch on the map (bare link or #hub): one tap picks an age band and a starting point.
if (modeName === 'hub') maybeFirstRun();

// Play time: counted only after the first touch and while the page is visible. When the grown-ups'
// session length is reached, the gentle goodnight begins (never an abrupt cut).
let saveIn = 5;
function tickPlayTime(dt) {
  if (!playing || modeName === 'sleep') return;
  today.sec += dt; today.session += dt;
  if ((saveIn -= dt) <= 0) {
    saveIn = 5;
    rolloverToday();
    saveToday();
  }
  if (settings.session && today.session >= settings.session * 60) goToSleep();
}
let last = performance.now(), raf = 0;
function frame(now) {
  const dt = Math.min(.05, (now - last) / 1000); last = now; advanceClock(dt);
  runTimers(dt); M.update(dt); updateParts(dt); tickPlayTime(dt);
  drawSky(T, dt);
  cx.save(); cx.translate(-camX, 0); M.draw(T); drawParts(); cx.restore();
  raf = requestAnimationFrame(frame);
}
raf = requestAnimationFrame(frame);
// Hidden tab: stop drawing and talking. Back again: resume, and ask for the wake lock again,
// since the browser releases it whenever the page is hidden.
document.addEventListener('visibilitychange', () => {
  if (document.hidden) { cancelAnimationFrame(raf); raf = 0; hush(); }
  else {
    if (wakeWanted) wakeLock();
    if (!raf) { last = performance.now(); raf = requestAnimationFrame(frame); }
  }
});
