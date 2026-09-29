// Content checks that fail the build:
//  1. every pack matches content/schema/pack.schema.json
//  2. level ids unique, templates exist, rover puzzles are solvable within their slots
//  3. i18n: en/fr/fa have the same keys; every key the code or packs use exists in en.json
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import Ajv from 'ajv';
import { roverSolve } from '../src/templates/rover-solve.js';

const LANGS = ['en', 'fr', 'fa'];
const errors = [], warn = [];
const json = p => JSON.parse(readFileSync(p, 'utf8'));
const ajv = new Ajv({ allErrors: true, strict: false });
ajv.addFormat('uri', s => /^https?:\/\/\S+$/.test(s));
const validate = ajv.compile(json('content/schema/pack.schema.json'));

const templates = new Set([...readFileSync('src/templates/index.js', 'utf8').matchAll(/(\w+): \w+(?=[,\s}])/g)].map(m => m[1]));
const packs = readdirSync('content/packs').filter(f => f.endsWith('.json')).map(f => ({ f, p: json(`content/packs/${f}`) }));
const ids = new Set();
for (const { f, p } of packs) {
  if (!validate(p)) validate.errors.forEach(e => errors.push(`${f}${e.instancePath}: ${e.message}`));
  for (const lv of p.levels || []) {
    if (ids.has(lv.id)) errors.push(`${f}: duplicate level id ${lv.id}`); ids.add(lv.id);
    if (!templates.has(lv.template)) errors.push(`${f}: ${lv.id} uses unknown template "${lv.template}"`);
    if (lv.template === 'rovercode') for (const [i, it] of (lv.items || []).entries()) {
      const plan = roverSolve(it, lv.params.cols, lv.params.rows, 12);
      if (!plan) errors.push(`${f}: ${lv.id} item ${i} has no solution`);
      else if (plan.length > lv.params.slots) errors.push(`${f}: ${lv.id} item ${i} needs ${plan.length} blocks but has ${lv.params.slots} slots`);
    }
  }
}

const keysOf = (o, p = '') => Object.entries(o).flatMap(([k, v]) => k.startsWith('_') ? [] :
  (v && typeof v === 'object' && !Array.isArray(v)) ? keysOf(v, p ? `${p}.${k}` : k) : [p ? `${p}.${k}` : k]);
const i18n = Object.fromEntries(LANGS.map(l => [l, json(`content/i18n/${l}.json`)]));
const en = new Set(keysOf(i18n.en));
for (const l of LANGS.slice(1)) {
  const have = new Set(keysOf(i18n[l]));
  for (const k of en) if (!have.has(k)) errors.push(`i18n: "${k}" missing in ${l}.json`);
  for (const k of have) if (!en.has(k)) errors.push(`i18n: "${k}" in ${l}.json but not in en.json`);
}
const has = k => en.has(k) || en.has(`ui.${k}`) || [...en].some(x => x.startsWith(k + '.'));
// keys used by packs
for (const { f, p } of packs) {
  if (!has(p.name_key)) errors.push(`${f}: name_key "${p.name_key}" not in en.json`);
  for (const lv of p.levels || []) for (const it of lv.items || []) for (const k of [it.prompt, it.fact, ...(it.i18n || [])].filter(Boolean)) if (!has(k)) errors.push(`${f}: ${lv.id} uses missing key "${k}"`);
}
// keys used in code: t('a.b.c' …) and lookup('a.b' …) with literal dotted keys
const files = [];
(function walk(d) { for (const n of readdirSync(d)) { const p = join(d, n); statSync(p).isDirectory() ? (n !== 'generated' && walk(p)) : n.endsWith('.js') && files.push(p); } })('src');
for (const file of files) for (const m of readFileSync(file, 'utf8').matchAll(/\b(?:t|lookup)\('([a-z]+(?:\.[a-zA-Z]+)+)'/g)) if (!has(m[1])) errors.push(`${file}: uses missing key "${m[1]}"`);

// Unreviewed lines are allowed in the family phase; count them so the build log shows the debt.
for (const l of ['fr', 'fa']) { const rev = i18n[l]._reviewed || {}; const n = [...en].filter(k => !rev[k] || String(rev[k]).startsWith('ai-')).length; warn.push(`${l}: ${n} of ${en.size} lines not yet checked by a person`); }
if (errors.length) { console.error('validate FAILED:\n  ' + errors.join('\n  ')); process.exit(1); }
console.log(`validate: ${packs.length} packs, ${ids.size} levels, ${en.size} i18n keys × ${LANGS.length} ok · ${warn.join(' · ')}`);
