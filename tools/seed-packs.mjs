// Seed ladders for the six new templates: 8 levels each, to be replaced by the curriculum council's
// vetted scope and sequence. Writes content/packs/*.json. Rover puzzles are found by search so each
// level has an exact shortest-plan length (tools/validate.mjs re-solves them).
//   node tools/seed-packs.mjs
import { writeFileSync, mkdirSync } from 'node:fs';
import { roverSolve } from '../src/templates/rover-solve.js';

const M = { window: 5, need: 4, struggle: 3 };
const lv = (pack, n, band, skill, objective, template, params, extra = {}) =>
  ({ id: `${pack}.${n}`, band, skill, objective, template, params, generator: { kind: 'random' }, mastery: M, ...extra });

// Deterministic PRNG so the seed puzzles never change between runs.
let seed = 20260929;
const rnd = () => ((seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648);
const ri = (a, b) => a + Math.floor(rnd() * (b - a + 1));
function roverPuzzles({ cols, rows, len, turns, rocks, count = 3 }) {
  const out = [], seen = new Set();
  for (let tries = 0; out.length < count && tries < 20000; tries++) {
    const item = { start: [ri(0, cols - 1), ri(0, rows - 1), ri(0, 3)], goal: [ri(0, cols - 1), ri(0, rows - 1)], rocks: [] };
    while (item.rocks.length < rocks) { const r = [ri(0, cols - 1), ri(0, rows - 1)]; if (!item.rocks.some(q => q[0] === r[0] && q[1] === r[1])) item.rocks.push(r); }
    if (item.rocks.some(r => (r[0] === item.start[0] && r[1] === item.start[1]) || (r[0] === item.goal[0] && r[1] === item.goal[1]))) continue;
    const plan = roverSolve(item, cols, rows, len);
    if (!plan || plan.length !== len || plan.filter(o => o !== 'F').length !== turns) continue;
    // rocks must matter: without them the plan would be shorter
    if (rocks && roverSolve({ ...item, rocks: [] }, cols, rows, len).length === len) continue;
    const k = JSON.stringify(item); if (seen.has(k)) continue; seen.add(k);
    out.push({ ...item, answer: plan.join(''), prompt: 'tpl.rover.goal', reviewed_by: { en: 'michael', fr: null, fa: null } });
  }
  if (out.length < count) throw new Error(`could not find rover puzzles for ${JSON.stringify({ cols, rows, len, turns, rocks })}`);
  return out;
}
const rv = (n, band, skill, objective, g) => {
  const items = roverPuzzles(g);
  return { id: `rovercode.${n}`, band, skill, objective, template: 'rovercode', params: { cols: g.cols, rows: g.rows, slots: g.len }, items, mastery: { window: 4, need: 3, struggle: 3 } };
};

const PACKS = [
  { id: 'tenframe', strand: 'number', station: 'mercury', order: 1, name_key: 'stations.tenframe', levels: [
    lv('tenframe', 1, '2-3', 'count-out-3', 'Counts out up to 3 things', 'tenframe', { mode: 'fill', range: [1, 3] }),
    lv('tenframe', 2, '2-3', 'count-out-5', 'Counts out up to 5 things', 'tenframe', { mode: 'fill', range: [2, 5] }),
    lv('tenframe', 3, '2-3', 'subitize-5', 'Says how many (up to 5) in a ten-frame', 'tenframe', { mode: 'count', range: [1, 5], choices: 2 }),
    lv('tenframe', 4, '4-5', 'count-out-10', 'Counts out up to 10 things', 'tenframe', { mode: 'fill', range: [5, 10] }),
    lv('tenframe', 5, '4-5', 'bond-5', 'Fills up to 5: sees how many more make 5', 'tenframe', { mode: 'bond', whole: 5 }),
    lv('tenframe', 6, '4-5', 'bond-10', 'Fills up to 10: sees how many more make 10', 'tenframe', { mode: 'bond', whole: 10 }),
    lv('tenframe', 7, '4-5', 'bond-10-recall', 'Knows how many more make 10', 'tenframe', { mode: 'bondPick', whole: 10, choices: 3 }),
    lv('tenframe', 8, '6-7', 'teens', 'Sees teen numbers as ten and some more (11–20)', 'tenframe', { mode: 'teen', range: [11, 19], choices: 3 }),
  ] },
  { id: 'numberline', strand: 'number', station: 'jupiter', order: 2, name_key: 'stations.numberline', levels: [
    lv('numberline', 1, '2-3', 'count-on', 'Hops and counts along a number line', 'numberline', { op: 'hop', max: 10, maxStep: 3 }),
    lv('numberline', 2, '2-3', 'add-within-5', 'Adds 1 or 2 by hopping (within 5)', 'numberline', { op: 'add', max: 5, maxStep: 2 }),
    lv('numberline', 3, '4-5', 'add-within-10', 'Adds by hopping (within 10)', 'numberline', { op: 'add', max: 10, maxStep: 3 }),
    lv('numberline', 4, '4-5', 'add-within-10-predict', 'Predicts where a sum lands (within 10)', 'numberline', { op: 'add', max: 10, maxStep: 3, predict: true, choices: 2 }),
    lv('numberline', 5, '4-5', 'sub-within-10', 'Takes away by hopping back (within 10)', 'numberline', { op: 'sub', max: 10, maxStep: 3 }),
    lv('numberline', 6, '6-7', 'add-sub-within-20', 'Adds and subtracts within 20', 'numberline', { op: 'mix', max: 20, maxStep: 5, predict: true, choices: 3 }),
    lv('numberline', 7, '6-7', 'skip-2', 'Counts by 2s to 20', 'numberline', { op: 'skip', step: 2, max: 20 }),
    lv('numberline', 8, '6-7', 'skip-10', 'Counts by 10s to 100', 'numberline', { op: 'skip', step: 10, max: 100, predict: true, choices: 3 }),
  ] },
  { id: 'compare', strand: 'number', station: 'saturn', order: 3, name_key: 'stations.compare', levels: [
    lv('compare', 1, '2-3', 'more', 'Sees which group has more (up to 5)', 'compare', { mode: 'more', max: 5, minDiff: 2 }),
    lv('compare', 2, '2-3', 'less', 'Sees which group has less (up to 5)', 'compare', { mode: 'less', max: 5, minDiff: 2 }),
    lv('compare', 3, '2-3', 'equal', 'Makes two groups the same', 'compare', { mode: 'equal', max: 5, minDiff: 1 }),
    lv('compare', 4, '4-5', 'more-close', 'Compares groups up to 10, even when close', 'compare', { mode: 'more', max: 10, minDiff: 1 }),
    lv('compare', 5, '4-5', 'bigger-10', 'Says which number is bigger (to 10)', 'compare', { mode: 'bigger', max: 10, minDiff: 1 }),
    lv('compare', 6, '4-5', 'smaller-10', 'Says which number is smaller (to 10)', 'compare', { mode: 'smaller', max: 10, minDiff: 1 }),
    lv('compare', 7, '6-7', 'bigger-20', 'Compares numbers to 20', 'compare', { mode: 'bigger', max: 20, minDiff: 1 }),
    lv('compare', 8, '6-7', 'biggest-20', 'Finds the biggest of three numbers to 20', 'compare', { mode: 'biggest', max: 20, choices: 3 }),
  ] },
  { id: 'pattern', strand: 'logic', station: 'earth', order: 4, name_key: 'stations.pattern', levels: [
    lv('pattern', 1, '2-3', 'ab-color', 'Continues an AB colour pattern', 'pattern', { unit: 'AB', token: 'color', choices: 2, cars: 5 }),
    lv('pattern', 2, '2-3', 'ab-planet', 'Continues an AB pattern of planets', 'pattern', { unit: 'AB', token: 'planet', choices: 2, cars: 5 }),
    lv('pattern', 3, '4-5', 'aab', 'Continues AAB patterns', 'pattern', { unit: 'AAB', token: 'color', choices: 2, cars: 6 }),
    lv('pattern', 4, '4-5', 'abb', 'Continues ABB patterns', 'pattern', { unit: 'ABB', token: 'shape', choices: 3, cars: 6 }),
    lv('pattern', 5, '4-5', 'abc', 'Continues ABC patterns', 'pattern', { unit: 'ABC', token: 'shape', choices: 3, cars: 6 }),
    lv('pattern', 6, '4-5', 'missing', 'Finds the missing piece of a pattern', 'pattern', { unit: 'AB', token: 'planet', blank: 'middle', choices: 3, cars: 6 }),
    lv('pattern', 7, '6-7', 'grow-1', 'Continues a growing pattern (1, 2, 3…)', 'pattern', { unit: 'grow', choices: 3, cars: 4 }),
    lv('pattern', 8, '6-7', 'grow-2', 'Continues a pattern that grows by 2', 'pattern', { unit: 'grow2', choices: 3, cars: 4 }),
  ] },
  { id: 'sort', strand: 'logic', station: 'venus', order: 5, name_key: 'stations.sort', levels: [
    lv('sort', 1, '2-3', 'sort-kind', 'Sorts stars from moons', 'sort', { by: ['kind'], groups: 2, count: 4 }),
    lv('sort', 2, '2-3', 'sort-color', 'Sorts by colour', 'sort', { by: ['color'], groups: 2, count: 5 }),
    lv('sort', 3, '2-3', 'sort-size', 'Sorts big from small', 'sort', { by: ['size'], groups: 2, count: 5 }),
    lv('sort', 4, '4-5', 'sort-kind-3', 'Sorts into three groups by kind', 'sort', { by: ['kind'], groups: 3, count: 6 }),
    lv('sort', 5, '4-5', 'sort-color-3', 'Sorts into three groups by colour', 'sort', { by: ['color'], groups: 3, count: 6 }),
    lv('sort', 6, '4-5', 'sort-two-attrs', 'Sorts by two things at once (kind and colour)', 'sort', { by: ['kind', 'color'], groups: 4, count: 6 }),
    lv('sort', 7, '6-7', 'sort-size-kind', 'Sorts by size and kind together', 'sort', { by: ['size', 'kind'], groups: 4, count: 8 }),
    lv('sort', 8, '6-7', 'sort-two-attrs-8', 'Sorts eight things by kind and colour', 'sort', { by: ['kind', 'color'], groups: 4, count: 8 }),
  ] },
  { id: 'rovercode', strand: 'logic', station: 'mars', order: 6, name_key: 'stations.rovercode', levels: [
    rv(1, '2-3', 'seq-2', 'Plans 2 moves forward', { cols: 4, rows: 3, len: 2, turns: 0, rocks: 0 }),
    rv(2, '2-3', 'seq-3', 'Plans 3 moves forward', { cols: 4, rows: 3, len: 3, turns: 0, rocks: 0 }),
    rv(3, '4-5', 'one-turn', 'Plans a path with one turn', { cols: 4, rows: 3, len: 3, turns: 1, rocks: 0 }),
    rv(4, '4-5', 'one-turn-4', 'Plans a 4-step path with a turn', { cols: 4, rows: 4, len: 4, turns: 1, rocks: 0 }),
    rv(5, '4-5', 'around-rock', 'Drives around a rock', { cols: 4, rows: 4, len: 5, turns: 2, rocks: 1 }),
    rv(6, '6-7', 'two-turns', 'Plans a path with two turns', { cols: 5, rows: 4, len: 5, turns: 2, rocks: 0 }),
    rv(7, '6-7', 'rocks-6', 'Plans 6 steps around rocks', { cols: 5, rows: 4, len: 6, turns: 2, rocks: 2 }),
    rv(8, '6-7', 'rocks-6-3', 'Plans 6 steps with three turns', { cols: 5, rows: 5, len: 6, turns: 3, rocks: 3 }),
  ] },
];
mkdirSync('content/packs', { recursive: true });
for (const p of PACKS) writeFileSync(`content/packs/${p.id}.json`, JSON.stringify({ $schema: '../schema/pack.schema.json', ...p }, null, 2) + '\n');
console.log(`seeded ${PACKS.length} packs × 8 levels`);
