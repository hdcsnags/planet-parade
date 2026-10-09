// Difficulty rungs inside a level (the "levels ramp").
//
// A level's `params` describe the whole step; its optional `ramp` lists overlays from the gentlest
// rung to the full objective (the last entry). The SessionRunner climbs a rung after two first-try
// rounds in a row and eases one after two misses in a row; the highest rung reached is remembered
// (progress.js), so the next visit starts where she left off. Mastery counts only visits that end on
// the top rung, so the two-day rule keeps its meaning: she masters the objective, not the warm-up.
//
// Levels without a `ramp` get a generic two-rung ramp: a gentle rung (lower half of each numeric
// range, one fewer choice, one smaller step) and the full params. Item pools (rover puzzles) have
// none. The child never sees a rung; the grown-ups panel shows a word for it.

const RANGE_KEYS = ['n', 'range', 'whole', 'target', 'start', 'recipients'];
const isRange = v => Array.isArray(v) && v.length === 2 && Number.isInteger(v[0]) && Number.isInteger(v[1]) && v[1] > v[0];

export function rungsOf(lv) {
  if (Array.isArray(lv.ramp) && lv.ramp.length) return lv.ramp;
  if (lv.items) return [{}];
  const p = lv.params || {}, gentle = {};
  for (const k of RANGE_KEYS) if (isRange(p[k])) gentle[k] = [p[k][0], p[k][0] + Math.ceil((p[k][1] - p[k][0]) / 2)];
  if (Number.isInteger(p.choices) && p.choices > 2) gentle.choices = p.choices - 1;
  if (Number.isInteger(p.maxStep) && p.maxStep > 1) gentle.maxStep = p.maxStep - 1;
  return Object.keys(gentle).length ? [gentle, {}] : [{}];
}
export const topRung = lv => rungsOf(lv).length - 1;
export const clampRung = (lv, r) => Math.max(0, Math.min(topRung(lv), r | 0));
export const rungParams = (lv, r) => rungsOf(lv)[clampRung(lv, r)] || {};
// A grown-up-facing word for where she is on the ramp (never shown to the child).
export const rungWord = (lv, r) => { const top = topRung(lv); return top === 0 ? '' : r >= top ? 'full level' : r === 0 ? 'gentle start' : 'building up'; };
