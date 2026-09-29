import { unlockAudio } from '../audio/audio.js';
import { LANG_NAME, NATURAL, hush, say, updateVoiceNote, voiceList, voices } from '../audio/speech.js';
import { saveSettings, saveToday, settings, today } from '../core/settings.js';
import { $ } from '../core/util.js';
import { PLANETS } from '../engine/world.js';
import { MODE_LABEL, applyLang, modeName, setMode } from '../hub/router.js';
import { I18N, LANG, bang, cap, pname, setLang, t } from '../i18n/i18n.js';
import { drawIcons } from './menu-art.js';
import { STANDALONE } from './studio.js';

/* ---------- grown-ups panel: press and hold so little fingers stay out ---------- */
const gear = $('#gearBtn');
let holdStart = 0, holdRaf = 0, wakeOnClose = false;
function cancelHold() { cancelAnimationFrame(holdRaf); gear.style.setProperty('--p', 0); }
gear.addEventListener('pointerdown', e => {
  e.preventDefault(); holdStart = performance.now();
  const step = () => {
    const p = (performance.now() - holdStart) / 1200;
    gear.style.setProperty('--p', Math.min(1, p));
    if (p >= 1) { cancelHold(); openParent(); return; }
    holdRaf = requestAnimationFrame(step);
  };
  step();
});
['pointerup', 'pointerleave', 'pointercancel'].forEach(ev => gear.addEventListener(ev, cancelHold));
gear.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openParent(); } });
function syncVoicePicker() {
  const sel = $('#voicePick'), list = voiceList[LANG];
  $('#voiceFor').textContent = `For ${LANG_NAME[LANG]}. Natural-sounding voices are listed first.`;
  sel.innerHTML = '';
  if (!list.length) { const o = document.createElement('option'); o.textContent = 'No voice on this device'; sel.appendChild(o); sel.disabled = true; $('#voicePlay').disabled = true; return; }
  sel.disabled = false; $('#voicePlay').disabled = false;
  list.forEach(v => {
    const o = document.createElement('option');
    o.value = v.name; o.textContent = (NATURAL.test(v.name) ? '★ ' : '') + v.name.replace(/^Microsoft /, '') + ` (${v.lang})`;
    o.selected = voices[LANG] === v; sel.appendChild(o);
  });
}
$('#voicePick').addEventListener('change', e => {
  const v = voiceList[LANG].find(x => x.name === e.target.value);
  if (!v) return;
  voices[LANG] = v; settings.voiceNames = { ...(settings.voiceNames || {}), [LANG]: v.name }; saveSettings();
  $('#voicePlay').click();
});
$('#voicePlay').addEventListener('click', () => { unlockAudio(); say(`${t('hello')} ${cap(pname(PLANETS[3]))}${bang()}`); });
function syncToday() {
  const mins = Math.round(today.sec / 60);
  const modes = Object.entries(today.modes).map(([k, n]) => `${MODE_LABEL[k] || k} ×${n}`).join(', ') || 'none yet';
  const nums = Object.keys(today.nums).map(Number).sort((a, b) => a - b).join(', ') || 'none yet';
  const words = Object.keys(today.words).map(id => I18N.planets[id] ? I18N.planets[id].en.label : id).slice(0, 12).join(', ') || 'none yet';
  $('#todayText').innerHTML = '';
  [[`${mins} minute${mins === 1 ? '' : 's'} played`], [`Games: ${modes}`], [`Numbers: ${nums}`], [`Words: ${words}`], ['Kept on this device only. Nothing is sent anywhere.']].forEach(([line]) => {
    const d = document.createElement('div'); d.textContent = line; $('#todayText').appendChild(d);
  });
}
function syncParent() {
  document.querySelectorAll('.tog').forEach(b => { const on = !!settings[b.dataset.k]; b.setAttribute('aria-pressed', on); b.textContent = on ? 'On' : 'Off'; });
  document.querySelectorAll('#segChoices button').forEach(b => b.setAttribute('aria-pressed', +b.dataset.n === settings.choices));
  document.querySelectorAll('#segMax button').forEach(b => b.setAttribute('aria-pressed', +b.dataset.m === settings.maxNum));
  document.querySelectorAll('#segLang button').forEach(b => b.setAttribute('aria-pressed', b.dataset.lang === settings.lang));
  document.querySelectorAll('#segStep button').forEach(b => b.setAttribute('aria-pressed', +b.dataset.s === settings.step));
  document.querySelectorAll('#segSession button').forEach(b => b.setAttribute('aria-pressed', +b.dataset.min === settings.session));
  $('#studioBtn').hidden = !STANDALONE;
  updateVoiceNote(); syncVoicePicker(); syncToday();
}
function openParent() {
  // A grown-up opening the panel is what wakes the sleeping planets.
  if (modeName === 'sleep') { today.asleep = false; today.session = 0; saveToday(); wakeOnClose = true; }
  syncParent(); $('#parent').hidden = false;
  $('#parent .sheet').scrollTop = 0; $('#closeParent').focus({ preventScroll: true }); // open at the top
}
document.querySelectorAll('.tog').forEach(b => b.addEventListener('click', () => { settings[b.dataset.k] = !settings[b.dataset.k]; saveSettings(); syncParent(); if (b.dataset.k === 'faces') drawIcons(); if (b.dataset.k === 'voice' && !settings.voice) hush(); }));
document.querySelectorAll('#segChoices button').forEach(b => b.addEventListener('click', () => { settings.choices = +b.dataset.n; saveSettings(); syncParent(); }));
document.querySelectorAll('#segMax button').forEach(b => b.addEventListener('click', () => { settings.maxNum = +b.dataset.m; settings.countLvl = 0; saveSettings(); syncParent(); }));
document.querySelectorAll('#segStep button').forEach(b => b.addEventListener('click', () => { settings.step = +b.dataset.s; saveSettings(); syncParent(); }));
document.querySelectorAll('#segSession button').forEach(b => b.addEventListener('click', () => { settings.session = +b.dataset.min; today.session = 0; saveToday(); saveSettings(); syncParent(); }));
document.querySelectorAll('#segLang button').forEach(b => b.addEventListener('click', () => { settings.lang = b.dataset.lang; setLang(b.dataset.lang); saveSettings(); syncParent(); applyLang(); }));
$('#closeParent').addEventListener('click', () => {
  $('#parent').hidden = true; gear.focus();
  if (wakeOnClose) { wakeOnClose = false; setMode('menu'); }
});
const fsBtn = $('#fsBtn');
if (!document.documentElement.requestFullscreen) fsBtn.hidden = true;
fsBtn.addEventListener('click', () => {
  const p = document.fullscreenElement ? document.exitFullscreen() : document.documentElement.requestFullscreen();
  if (p && p.catch) p.catch(() => {});
});

export { cancelHold, fsBtn, gear, holdRaf, holdStart, openParent, syncParent, syncToday, syncVoicePicker, wakeOnClose };
