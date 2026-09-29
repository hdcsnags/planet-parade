import { clips, playClip } from '../audio/speech.js';
import { $ } from '../core/util.js';
import { PLANETS, SUN } from '../engine/world.js';
import { I18N, LANG, bang, cap, faDigits, num, pfact, pname, t, word } from '../i18n/i18n.js';
import { WORD_IDS, act } from '../templates/legacy/words.js';
import { openParent } from './parent.js';

/* ---------- Recording Studio: standalone file only (the artifact frame blocks the microphone) ---------- */
// Grown-ups record any line; the game then plays that recording instead of the computer voice.
// Clips live in this device's IndexedDB, keyed by language + the exact sentence. Export/Import moves
// them between devices as one JSON file.
const STANDALONE = !!window.PP_STANDALONE;
const idb = (() => {
  let dbp = null;
  const open = () => dbp || (dbp = new Promise((res, rej) => {
    const r = indexedDB.open('planet-parade-voice', 1);
    r.onupgradeneeded = () => r.result.createObjectStore('clips');
    r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error);
  }));
  const write = (fn) => open().then(db => new Promise((res, rej) => { const tx = db.transaction('clips', 'readwrite'); fn(tx.objectStore('clips')); tx.oncomplete = () => res(); tx.onerror = () => rej(tx.error); }));
  return {
    put: (k, v) => write(st => st.put(v, k)),
    del: k => write(st => st.delete(k)),
    all: () => open().then(db => new Promise((res, rej) => {
      const out = [], r = db.transaction('clips').objectStore('clips').openCursor();
      r.onsuccess = () => { const c = r.result; if (c) { out.push([c.key, c.value]); c.continue(); } else res(out); };
      r.onerror = () => rej(r.error);
    })),
  };
})();
function loadClips() {
  if (!STANDALONE || !window.indexedDB) return Promise.resolve();
  return idb.all().then(rows => { clips.forEach(u => URL.revokeObjectURL(u)); clips.clear(); rows.forEach(([k, b]) => clips.set(k, URL.createObjectURL(b))); }).catch(() => {});
}
// Every fixed sentence the game can say in a language (sentences with a changing number or name
// are listed once per planet / number where that is how the game says them).
function studioPhrases(lang) {
  const out = new Set(), add = s => out.add(s);
  Object.values(I18N.ui).forEach(e => { const s = e[lang]; if (s && !s.includes('{')) add(s); });
  [SUN, ...PLANETS].forEach(p => { add(cap(pname(p, lang)) + bang(lang)); add(pfact(p, lang)); });
  PLANETS.forEach(p => { add(t('whereIs', { p: pname(p, lang) }, lang)); add(t('yesThats', { p: pname(p, lang) }, lang)); });
  for (let n = 1; n <= 10; n++) add(cap(num(n, lang)) + bang(lang));
  WORD_IDS.forEach(id => { add(cap(word(id, lang)) + bang(lang)); add(act(id, lang)); });
  return [...out];
}
let studioLang = 'en', recState = null;
const canRecord = () => !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia && window.MediaRecorder);
function studioNote(text) { const n = $('#studioNote'); n.textContent = text; n.hidden = !text; }
function openStudio() {
  if (!STANDALONE) return;
  studioLang = LANG; $('#parent').hidden = true; $('#studio').hidden = false;
  studioNote(canRecord() ? '' : 'This browser can’t record here. Open this file in Chrome, or record on another device and use Import.');
  renderStudio();
}
function renderStudio() {
  document.querySelectorAll('#studioLang button').forEach(b => b.setAttribute('aria-pressed', b.dataset.lang === studioLang));
  const list = $('#studioList'); list.innerHTML = '';
  studioPhrases(studioLang).forEach(text => {
    const key = `${studioLang}|${text}`, has = clips.has(key);
    const row = document.createElement('div'); row.className = 'srow' + (has ? ' has' : '');
    row.innerHTML = '<span class="dot"></span><span class="txt"></span><button class="rec"></button><button class="play" aria-label="Play recording">▶</button><button class="del" aria-label="Delete recording">✕</button>';
    const tx = row.querySelector('.txt'); tx.textContent = studioLang === 'fa' ? faDigits(text) : text; tx.dir = studioLang === 'fa' ? 'rtl' : 'ltr'; tx.lang = studioLang;
    const rec = row.querySelector('.rec'); rec.textContent = has ? 'Re-record' : '● Record'; rec.disabled = !canRecord();
    const play = row.querySelector('.play'), del = row.querySelector('.del'); play.disabled = del.disabled = !has;
    rec.onclick = () => toggleRecord(key, row, rec);
    play.onclick = () => { playClip(clips.get(key)); };
    del.onclick = () => idb.del(key).then(() => { URL.revokeObjectURL(clips.get(key)); clips.delete(key); renderStudio(); });
    list.appendChild(row);
  });
}
function toggleRecord(key, row, btn) {
  if (recState) { const same = recState.key === key; recState.rec.stop(); if (same) return; }
  navigator.mediaDevices.getUserMedia({ audio: true }).then(stream => {
    const chunks = [], rec = new MediaRecorder(stream);
    recState = { key, rec };
    row.classList.add('rec'); btn.textContent = '■ Stop'; studioNote('');
    rec.ondataavailable = e => { if (e.data.size) chunks.push(e.data); };
    rec.onstop = () => {
      stream.getTracks().forEach(tr => tr.stop()); if (recState && recState.rec === rec) recState = null;
      const blob = new Blob(chunks, { type: rec.mimeType || 'audio/webm' });
      idb.put(key, blob).then(() => { if (clips.has(key)) URL.revokeObjectURL(clips.get(key)); clips.set(key, URL.createObjectURL(blob)); renderStudio(); })
        .catch(() => { studioNote('Could not save that recording on this device.'); renderStudio(); });
    };
    rec.start();
    setTimeout(() => { if (rec.state === 'recording') rec.stop(); }, 12000); // every line is short
  }).catch(() => studioNote('The microphone was blocked. Allow it for this page in the browser settings, then try again.'));
}
const blobToDataURL = b => new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(String(r.result)); r.onerror = rej; r.readAsDataURL(b); });
$('#studioBtn').addEventListener('click', openStudio);
document.querySelectorAll('#studioLang button').forEach(b => b.addEventListener('click', () => { studioLang = b.dataset.lang; renderStudio(); }));
$('#studioClose').addEventListener('click', () => { if (recState) recState.rec.stop(); $('#studio').hidden = true; openParent(); });
$('#studioExport').addEventListener('click', () => {
  idb.all().then(rows => Promise.all(rows.map(([k, b]) => blobToDataURL(b).then(data => ({ key: k, data }))))).then(items => {
    const file = new Blob([JSON.stringify({ app: 'planet-parade', version: 1, clips: items })], { type: 'application/json' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(file); a.download = 'planet-parade-voices.json';
    document.body.appendChild(a); a.click(); a.remove();
    studioNote(items.length ? `Exported ${items.length} recording${items.length === 1 ? '' : 's'}.` : 'There are no recordings to export yet.');
  }).catch(() => studioNote('Export failed.'));
});
$('#studioImport').addEventListener('change', e => {
  const f = e.target.files[0];
  if (!f) return;
  f.text().then(txt => {
    const j = JSON.parse(txt);
    if (j.app !== 'planet-parade' || !Array.isArray(j.clips)) throw new Error('not ours');
    return Promise.all(j.clips.map(c => fetch(c.data).then(r => r.blob()).then(b => idb.put(c.key, b)))).then(() => j.clips.length);
  }).then(n => loadClips().then(() => { renderStudio(); studioNote(`Imported ${n} recording${n === 1 ? '' : 's'}.`); }))
    .catch(() => studioNote('That file isn’t a Planet Parade recordings file.'));
  e.target.value = '';
});
loadClips();

export { STANDALONE, blobToDataURL, canRecord, idb, loadClips, openStudio, recState, renderStudio, studioLang, studioNote, studioPhrases, toggleRecord };
