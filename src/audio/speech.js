import { settings } from '../core/settings.js';
import { $ } from '../core/util.js';
import { LANG, LANGS, faDigits } from '../i18n/i18n.js';
import { syncVoicePicker } from '../ui/parent.js';

/* ---------- speech: one voice per language ---------- */
const canSpeak = 'speechSynthesis' in window;
const voices = { en: null, fr: null, fa: null };
const voiceList = { en: [], fr: [], fa: [] };
let voicesLoaded = false, capTimer = 0;
// Natural/neural voices sound far less robotic: rank them first. Edge exposes "Microsoft Aria Online
// (Natural)" etc., Android Chrome exposes Google's voices, Apple devices expose Siri/Enhanced voices.
const NATURAL = /natural|neural|online|enhanced|premium|siri/i;
function voiceScore(v, lang) {
  let s = 0;
  if (NATURAL.test(v.name)) s += 6;
  if (/google/i.test(v.name)) s += 3;
  if (lang === 'fr' && /fr[-_]ca/i.test(v.lang)) s += 2;
  if (lang === 'en' && /en[-_](us|ca)/i.test(v.lang)) s += 1;
  if (/aria|jenny|samantha|karen|moira|zira|amelie|sylvie|dilara/i.test(v.name)) s += .5;
  return s;
}
function pickVoices() {
  const vs = speechSynthesis.getVoices();
  voicesLoaded = vs.length > 0;
  const chosen = settings.voiceNames || {};
  for (const l of LANGS) {
    voiceList[l] = vs.filter(v => v.lang.toLowerCase().replace('_', '-').startsWith(l)).sort((a, b) => voiceScore(b, l) - voiceScore(a, l));
    voices[l] = voiceList[l].find(v => v.name === chosen[l]) || voiceList[l][0] || null;
  }
  updateVoiceNote();
  if (typeof syncVoicePicker === 'function' && !$('#parent').hidden) syncVoicePicker();
}
if (canSpeak) { pickVoices(); speechSynthesis.onvoiceschanged = pickVoices; }
const LANG_NAME = { en: 'English', fr: 'French', fa: 'Farsi' };
function updateVoiceNote() {
  const el = $('#voiceNote');
  if (!el) return;
  const missing = LANGS.filter(l => !voices[l]);
  if (!canSpeak) { el.textContent = 'This browser cannot speak. Captions only.'; el.hidden = false; return; }
  if (!voicesLoaded || !missing.length) { el.hidden = true; return; }
  el.textContent = missing.map(l => `No ${LANG_NAME[l]} voice on this device. Captions only.`).join(' ') + ' You can install one in Android Settings → Text-to-speech.';
  el.hidden = false;
}
// Before the voice list loads, English can still use the browser default voice.
const hasVoice = lang => settings.voice && canSpeak && !!(voices[lang] || (lang === 'en' && !voicesLoaded));
function utter(text, lang, pitch) {
  const v = voices[lang], u = new SpeechSynthesisUtterance(text);
  if (v) { u.voice = v; u.lang = v.lang; } else u.lang = 'en-US';
  // Natural voices already sound warm and get worse when pitched up: keep them at 1.0.
  const nat = !!v && NATURAL.test(v.name);
  u.rate = nat ? .95 : lang === 'en' ? .88 : .85;
  u.pitch = pitch ?? (nat ? 1 : 1.12);
  return u;
}
// Recorded clips (Recording Studio, standalone file only) beat any computer voice.
const clips = new Map(); // `${lang}|${text}` -> object URL
let currentAudio = null;
function playClip(url) { stopAudio(); const a = new Audio(url); currentAudio = a; a.play().catch(() => {}); }
function stopAudio() { if (currentAudio) { currentAudio.onended = currentAudio.onerror = null; try { currentAudio.pause(); } catch (e) {} currentAudio = null; } }
// Android Chrome often drops an utterance spoken in the same tick as cancel(), so the new one
// starts ~60 ms later. `onend` fires exactly once: when the voice finishes, or after a length-based
// estimate when there is no voice. Anything newer (another say, hush) makes a stale onend a no-op.
let speechGen = 0, speakTimer = 0, endTimer = 0;
function speak(text, lang, onend, pitch) {
  const gen = ++speechGen;
  clearTimeout(speakTimer); clearTimeout(endTimer); stopAudio();
  let done = false;
  const finish = () => { if (done || gen !== speechGen) return; done = true; clearTimeout(endTimer); if (onend) onend(); };
  const est = 1200 + text.length * 70;
  const clip = settings.voice ? clips.get(`${lang}|${text}`) : null;
  if (clip) {
    try { if (canSpeak) speechSynthesis.cancel(); } catch (e) {}
    const a = new Audio(clip); currentAudio = a;
    a.onended = a.onerror = finish; a.play().catch(finish);
    endTimer = setTimeout(finish, 15000);
    return;
  }
  if (!hasVoice(lang)) { endTimer = setTimeout(finish, est); return; }
  try { speechSynthesis.cancel(); } catch (e) {}
  speakTimer = setTimeout(() => {
    if (gen !== speechGen) return;
    try { const u = utter(text, lang, pitch); u.onend = u.onerror = finish; speechSynthesis.speak(u); } catch (e) { finish(); return; }
    endTimer = setTimeout(finish, est + 5000); // some engines never fire onend
  }, 60);
}
function say(text, { lang = LANG, onend = null, persist = false, pitch } = {}) {
  showCaption(text, lang, persist);
  speak(text, lang, onend, pitch);
}
function sayQueue(items, onend) { // [{text, lang}] one after another, each in its own voice
  const step = i => { if (i >= items.length) { if (onend) onend(); return; } say(items[i].text, { lang: items[i].lang || LANG, onend: () => step(i + 1) }); };
  step(0);
}
function hush() {
  speechGen++; clearTimeout(speakTimer); clearTimeout(endTimer); clearTimeout(capTimer); stopAudio();
  $('#caption').hidden = true;
  try { if (canSpeak) speechSynthesis.cancel(); } catch (e) {}
}
function showCaption(text, lang = LANG, persist = false) {
  const el = $('#caption');
  el.textContent = lang === 'fa' ? faDigits(text) : text;
  el.dir = lang === 'fa' ? 'rtl' : 'ltr'; el.lang = lang; el.classList.toggle('fa', lang === 'fa');
  el.hidden = false;
  el.classList.remove('pop'); void el.offsetWidth; el.classList.add('pop');
  clearTimeout(capTimer);
  if (!persist) capTimer = setTimeout(() => { el.hidden = true; }, 2600 + text.length * 45);
}

export { LANG_NAME, NATURAL, canSpeak, capTimer, clips, currentAudio, endTimer, hasVoice, hush, pickVoices, playClip, say, sayQueue, showCaption, speak, speakTimer, speechGen, stopAudio, updateVoiceNote, utter, voiceList, voiceScore, voices, voicesLoaded };
