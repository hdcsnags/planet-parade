import en from '../../content/i18n/en.json';
import fr from '../../content/i18n/fr.json';
import fa from '../../content/i18n/fa.json';
import { settings } from '../core/settings.js';
import { FONT, PERSIAN_FONT } from '../core/util.js';

/* ---------- every word she hears, in English, French and Farsi ----------
   The words live in content/i18n/{en,fr,fa}.json. One language per session, never mixed inside a
   sentence. French is Canadian-neutral; Farsi is conversational Iranian Persian. Review status per
   line is in each file's `_reviewed` map (see TRANSLATIONS.md). */
const LANG_PACKS = { en, fr, fa };
// Legacy lookup shape used by the original six games: I18N.ui[key][lang], I18N.planets[id][lang], ...
function byLang(section, isList) {
  const out = {};
  for (const [l, pk] of Object.entries(LANG_PACKS)) {
    const sec = pk[section];
    if (isList) { out[l] = sec; continue; }
    for (const [k, v] of Object.entries(sec)) (out[k] ||= {})[l] = v;
  }
  return out;
}
const I18N = {
  ui: byLang('ui'), planets: byLang('planets'), numbers: byLang('numbers', true), objects: byLang('objects'),
  words: byLang('words'), acts: byLang('acts'), positions: byLang('positions', true), posShort: byLang('posShort', true),
};
// Nested lookup for new content keys like "tpl.tenframe.fill" (falls back to English).
function lookup(path, lang) {
  const get = pk => path.split('.').reduce((o, k) => (o == null ? o : o[k]), pk);
  const v = get(LANG_PACKS[lang]);
  return v != null ? v : get(LANG_PACKS.en);
}
// Review status for the grown-ups panel: lines not yet checked by a person.
function unreviewedCount(lang) {
  const pk = LANG_PACKS[lang], rev = pk._reviewed || {};
  if (rev['*'] && !String(rev['*']).startsWith('ai-')) return 0;
  let n = 0;
  const walk = (o, path) => {
    for (const [k, v] of Object.entries(o)) {
      if (k.startsWith('_')) continue;
      const p = path ? `${path}.${k}` : k;
      if (typeof v === 'string') { const r = rev[p]; if (!r || String(r).startsWith('ai-')) n++; }
      else if (v && typeof v === 'object') walk(v, p);
    }
  };
  walk(pk, '');
  return n;
}
const LANGS = ['en', 'fr', 'fa'];
let LANG = LANGS.includes(settings.lang) ? settings.lang : 'en';
function setLang(l) { if (LANGS.includes(l)) LANG = l; }
const FA_DIGITS = '۰۱۲۳۴۵۶۷۸۹';
const faDigits = s => String(s).replace(/\d/g, d => FA_DIGITS[d]);
const fmt = (n, lang = LANG) => lang === 'fa' ? faDigits(n) : String(n);
const cap = s => s ? s.charAt(0).toUpperCase() + s.slice(1) : s;
const bang = (lang = LANG) => lang === 'fr' ? ' !' : '!';
function t(key, vars = {}, lang = LANG) {
  let s;
  if (key.includes('.')) s = lookup(key, lang);
  else { const e = I18N.ui[key]; s = e ? (e[lang] ?? e.en) : undefined; }
  if (s == null) s = key;
  return String(s).replace(/\{(\w+)\}/g, (_, k) => vars[k] ?? '');
}
const pinfo = (p, lang = LANG) => I18N.planets[p.id][lang];
const pname = (p, lang = LANG) => pinfo(p, lang).name;
const plabel = (p, lang = LANG) => pinfo(p, lang).label;
const pfact = (p, lang = LANG) => pinfo(p, lang).fact;
const num = (n, lang = LANG) => I18N.numbers[lang][n] ?? fmt(n, lang);
const plural = (kind, lang = LANG) => I18N.objects[kind][lang][1];
function qty(n, kind, lang = LANG) {
  const [one, many] = I18N.objects[kind][lang];
  if (lang === 'fa') return n === 1 ? `یه ${one}` : `${num(n, lang)} تا ${one}`;
  if (lang === 'fr') return `${n === 1 ? 'une' : num(n, lang)} ${n === 1 ? one : many}`;
  return `${num(n, lang)} ${n === 1 ? one : many}`;
}
const word = (id, lang = LANG) => I18N.words[id][lang];
// i: 0 = screen left, 1 = middle, 2 = screen right (never mirrored for RTL).
const posWord = (i, lang = LANG) => I18N.positions[lang][i];
const posLabel = (i, lang = LANG) => I18N.posShort[lang][i];
const fontFor = () => LANG === 'fa' ? PERSIAN_FONT : FONT;

export { FA_DIGITS, I18N, LANG, LANGS, LANG_PACKS, bang, byLang, cap, faDigits, fmt, fontFor, lookup, num, pfact, pinfo, plabel, plural, pname, posLabel, posWord, qty, setLang, t, unreviewedCount, word };
