// Content checks that fail the build. (Pack schema validation is added below once packs exist.)
import { readFileSync } from 'node:fs';
const LANGS = ['en', 'fr', 'fa'];
const errors = [];
const keysOf = (o, p = '') => Object.entries(o).flatMap(([k, v]) => k.startsWith('_') ? [] :
  (v && typeof v === 'object' && !Array.isArray(v)) ? keysOf(v, p ? `${p}.${k}` : k) : [p ? `${p}.${k}` : k]);
const packs = Object.fromEntries(LANGS.map(l => [l, JSON.parse(readFileSync(`content/i18n/${l}.json`, 'utf8'))]));
const en = new Set(keysOf(packs.en));
for (const l of LANGS.slice(1)) {
  const have = new Set(keysOf(packs[l]));
  for (const k of en) if (!have.has(k)) errors.push(`i18n: "${k}" missing in ${l}.json`);
  for (const k of have) if (!en.has(k)) errors.push(`i18n: "${k}" in ${l}.json but not in en.json`);
}
if (errors.length) { console.error(errors.join('\n')); process.exit(1); }
console.log(`validate: i18n ok (${en.size} keys × ${LANGS.length} languages)`);
