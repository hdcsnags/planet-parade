// Import the council's vetted curriculum (content/curriculum/curriculum.json) as the canonical
// ladder: one pack per strand in content/packs/<strand>.json.
//   node tools/import-curriculum.mjs
// Each level gets `status`: ready (template built and solid), lab (built, still being tried out:
// visible only with the grown-ups' Family Lab switch) or planned (template not built yet; skipped).
// Rover levels get generated puzzles whose shortest plan fits their slots (re-checked by validate).
import { readFileSync, writeFileSync, readdirSync, unlinkSync } from 'node:fs';
import { roverSolve } from '../src/templates/rover-solve.js';

const C = JSON.parse(readFileSync('content/curriculum/curriculum.json', 'utf8'));
const registry = [...readFileSync('src/templates/index.js', 'utf8').matchAll(/^\s+(\w+): \w+,?\s*(?:\/\/\s*(lab))?$/gm)].map(m => [m[1], m[2] ? 'lab' : 'ready']);
const BUILT = Object.fromEntries(registry);
const ORDER = { number: 1, space: 2, logic: 3, science: 4, language: 5, music: 6 };

// Levels whose template exists but needs content the template can't draw yet stay planned.
function unsupported(l) {
  const p = l.params || {}, vs = l.variants || [], by = [].concat(p.by || [], ...vs.map(v => v.by || []));
  if (l.template === 'sort' && by.some(a => !['kind', 'color', 'size'].includes(a))) return true; // sky / temp / bodyType picture sets
  if (l.template === 'pattern' && (p.token === 'rhythm' || vs.some(v => v.token === 'rhythm'))) return true;
  return false;
}
const bandOf = age => { const a = parseFloat(String(age)); return a < 4 ? '2-3' : a < 6 ? '4-5' : '6-7'; };
let seed = 20260929;
const rnd = () => ((seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648);
const ri = (a, b) => a + Math.floor(rnd() * (b - a + 1));
function roverItems({ cols, rows, slots }, count = 6) {
  const turns = slots <= 2 ? 0 : slots === 3 ? [0, 1] : slots <= 4 ? [1] : [1, 2, 3];
  const rocks = slots >= 5 ? [1, 2] : [0];
  const out = [], seen = new Set();
  for (let tries = 0; out.length < count && tries < 40000; tries++) {
    const nr = [].concat(rocks)[ri(0, [].concat(rocks).length - 1)];
    const item = { start: [ri(0, cols - 1), ri(0, rows - 1), ri(0, 3)], goal: [ri(0, cols - 1), ri(0, rows - 1)], rocks: [] };
    while (item.rocks.length < nr) { const r = [ri(0, cols - 1), ri(0, rows - 1)]; if (!item.rocks.some(q => q[0] === r[0] && q[1] === r[1])) item.rocks.push(r); }
    if (item.rocks.some(r => (r[0] === item.start[0] && r[1] === item.start[1]) || (r[0] === item.goal[0] && r[1] === item.goal[1]))) continue;
    const plan = roverSolve(item, cols, rows, slots);
    if (!plan || plan.length !== slots || ![].concat(turns).includes(plan.filter(o => o !== 'F').length)) continue;
    const k = JSON.stringify(item); if (seen.has(k)) continue; seen.add(k);
    out.push({ ...item, answer: plan.join(''), prompt: 'tpl.rover.goal' });
  }
  if (out.length < 3) throw new Error(`rover puzzles for ${cols}x${rows}/${slots}`);
  return out;
}

for (const f of readdirSync('content/packs')) unlinkSync(`content/packs/${f}`); // seed ladders are replaced
const counts = { ready: 0, lab: 0, planned: 0 };
for (const s of C.strands) {
  const levels = s.levels.map(l => {
    const rule = C.mastery_rules[l.mastery.rule] || C.mastery_rules.M;
    const { desc, ...m } = rule;
    const lv = {
      id: l.id, n: l.n, track: l.track, age: l.age, band: bandOf(l.age), skill: l.skill,
      objective: typeof l.objective === 'string' ? l.objective : l.objective.en,
      template: l.template, params: l.params, ...(l.variants ? { variants: l.variants } : {}),
      mastery: { rule: l.mastery.rule, ...m }, station: l.station, requires: l.requires || [],
      ...(l.example ? { example: l.example } : {}), ...(l.evidence ? { evidence: l.evidence } : {}), ...(l.raise ? { raise: l.raise } : {}),
      status: unsupported(l) ? 'planned' : (BUILT[l.template] || 'planned'),
    };
    if (l.template === 'rovercode') lv.items = roverItems(l.params);
    else lv.generator = { kind: 'random' };
    counts[lv.status]++;
    return lv;
  });
  const pack = { $schema: '../schema/pack.schema.json', id: s.id, strand: s.id, station: s.station, order: ORDER[s.id], name: s.name, name_key: `strands.${s.id}`, levels };
  writeFileSync(`content/packs/${s.id}.json`, JSON.stringify(pack, null, 2) + '\n');
}
console.log(`imported ${C.strands.length} strands, ${counts.ready + counts.lab + counts.planned} levels: ${counts.ready} ready, ${counts.lab} lab, ${counts.planned} planned`);
