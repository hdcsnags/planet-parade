import { pop, unlockAudio } from '../audio/audio.js';
import { LANG_NAME, hush, say } from '../audio/speech.js';
import { logUse, saveToday, today } from '../core/settings.js';
import { $ } from '../core/util.js';
import { parts } from '../engine/particles.js';
import { SessionRunner } from '../engine/session.js';
import { T, camX, cv, pointer, setCamX } from '../engine/stage.js';
import { clearTimers } from '../engine/timers.js';
import { LANG, LANGS, setLang, t } from '../i18n/i18n.js';
import { CountMode } from '../templates/legacy/count.js';
import { FindMode } from '../templates/legacy/find.js';
import { FreeMode } from '../templates/legacy/free.js';
import { MenuMode } from '../templates/legacy/menu.js';
import { OrderMode } from '../templates/legacy/order.js';
import { RocketMode } from '../templates/legacy/rocket.js';
import { SleepMode } from '../templates/legacy/sleep.js';
import { WordsMode } from '../templates/legacy/words.js';
import { drawIcons } from '../ui/menu-art.js';
import { HubMode } from './hub.js';

/* ---------- mode switching + HUD ---------- */
const MENU_GAMES = ['free', 'find', 'rocket', 'order', 'count', 'words'];
const MODES = { hub: HubMode, play: SessionRunner, menu: MenuMode, freeplay: MenuMode, free: FreeMode, find: FindMode, rocket: RocketMode, order: OrderMode, count: CountMode, words: WordsMode, sleep: SleepMode };
const MODE_LABEL = { free: 'Tap & Hear', find: 'Find It', rocket: 'Rocket Trip', order: 'Line Up', count: 'Count & Add', words: 'Space Words' };
let M = null, modeName = 'menu';
function setStars(n) { [...$('#stars').children].forEach((el, i) => el.classList.toggle('on', i < n)); }
$('#stars').innerHTML = Array.from({ length: 5 }, () => '<span><svg viewBox="0 0 24 24"><path d="M12 2.6l2.9 6 6.5.8-4.8 4.5 1.2 6.5L12 17.3l-5.8 3.1 1.2-6.5L2.6 9.4l6.5-.8z" stroke-linejoin="round"/></svg></span>').join('');
function setMode(name, sub) {
  hush(); // also makes any pending onend from the previous game a no-op
  clearTimers(); parts.length = 0; setCamX(0); modeName = name;
  M = MODES[name](); M.layout();
  // hub = the Space Map; freeplay = the original six-game menu; play = a curriculum session
  const inMenu = name === 'menu' || name === 'freeplay', asleep = name === 'sleep', onMap = name === 'hub';
  if (MODE_LABEL[name]) logUse('modes', name);
  document.body.classList.toggle('in-game', !inMenu && !onMap);
  $('#menu').hidden = !inMenu; $('#homeBtn').hidden = onMap || asleep; $('#gearBtn').hidden = !(onMap || inMenu || asleep);
  $('#langBtn').hidden = asleep;
  $('#repeatBtn').hidden = !M.repeat || onMap; // the map's gear sits in that corner $('#stars').hidden = name !== 'find'; $('#findBtn').hidden = name !== 'words';
  $('#songBtn').hidden = name !== 'free'; $('#songBtn').setAttribute('aria-pressed', false);
  if (M.start) M.start(sub);
}
function goToSleep() { today.asleep = true; saveToday(); $('#parent').hidden = true; $('#studio').hidden = true; setMode('sleep'); }
function applyLang() {
  document.body.classList.toggle('lang-fa', LANG === 'fa');
  document.querySelectorAll('[data-i18n]').forEach(el => {
    el.textContent = t(el.dataset.i18n);
    el.dir = LANG === 'fa' ? 'rtl' : 'ltr'; el.lang = LANG;
  });
  const lb = $('#langBtn');
  lb.textContent = { en: 'EN', fr: 'FR', fa: 'فا' }[LANG];
  lb.classList.toggle('fa', LANG === 'fa');
  lb.setAttribute('aria-label', `Language: ${LANG_NAME[LANG]}. Tap to change.`);
  if (LANG === 'fa' && document.fonts && document.fonts.load) document.fonts.load(`800 24px Vazirmatn`).then(drawIcons).catch(() => {});
  drawIcons();
}
$('#langBtn').addEventListener('click', () => {
  unlockAudio();
  setLang(LANGS[(LANGS.indexOf(LANG) + 1) % LANGS.length]);
  applyLang(); M.layout(); // Line Up flips its reading direction for Farsi (left/right answers never flip)
  say(t('hello'), { onend: () => { if (M.repeat && modeName !== 'menu') M.repeat(); } });
});
let wakeWanted = false, playing = false;
function wakeLock() { wakeWanted = true; try { navigator.wakeLock && navigator.wakeLock.request('screen').catch(() => {}); } catch (e) {} }
document.querySelectorAll('.mode').forEach(btn => btn.addEventListener('click', () => { unlockAudio(); wakeLock(); pop(); setMode(btn.dataset.mode); }));
// Home always leads back: a game → its menu (free play) or the Space Map; free play → the Space Map.
$('#homeBtn').addEventListener('click', () => { pop(); setMode(MENU_GAMES.includes(modeName) ? 'freeplay' : 'hub'); });
$('#repeatBtn').addEventListener('click', () => { unlockAudio(); M.repeat && M.repeat(); });
$('#findBtn').addEventListener('click', () => { unlockAudio(); pop(); M.toggle && M.toggle(); });
$('#songBtn').addEventListener('click', () => { unlockAudio(); M.song && M.song(); });
addEventListener('keydown', e => { if (e.key === 'Escape' && modeName !== 'hub' && modeName !== 'sleep') setMode(MENU_GAMES.includes(modeName) ? 'freeplay' : 'hub'); });
addEventListener('pointerdown', () => { unlockAudio(); playing = true; }, true);
addEventListener('contextmenu', e => e.preventDefault());
// Only the primary pointer plays: the palm or thumb holding the tablet can't also tap.
cv.addEventListener('pointerdown', e => {
  if (!e.isPrimary) return;
  pointer.x = e.clientX; pointer.y = e.clientY; pointer.t = T;
  if (M.tap) M.tap(e.clientX + camX, e.clientY);
});
cv.addEventListener('pointercancel', () => { pointer.t = -99; }); // the system took the touch; eyes go back to wandering
cv.addEventListener('pointermove', e => { pointer.x = e.clientX; pointer.y = e.clientY; pointer.t = T; if (e.isPrimary && M.move) M.move(e.clientX, e.clientY); });
// The Space Map acts on release, so a drag can scroll it instead of tapping a planet.
cv.addEventListener('pointerup', e => { if (e.isPrimary && M.up) M.up(e.clientX + camX, e.clientY); });

export { M, MENU_GAMES, MODES, MODE_LABEL, applyLang, goToSleep, modeName, playing, setMode, setStars, wakeLock, wakeWanted };
