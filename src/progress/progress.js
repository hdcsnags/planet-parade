import { PACKS } from '../content/packs.js';
import { localDay, settings } from '../core/settings.js';

// Learning progress, stored on this device only (localStorage). Nothing is sent anywhere.
//
// Per child profile (hooks ready for cousins: name, age band, language):
//   strands[id] = { advanced }                          the grown-up's advanced-track switch
//   levels[id]  = { status: 'placed'|'mastered'|null, visits: [{ day, res: [1,0,…], transfer }] }
// Rules (content/curriculum/CURRICULUM.md):
//   * mastery M: ≥need of the last `window` first-try results in each of `sessions` visits on
//     different days, and each of those visits has ≥`transfer` successful transfer items.
//   * "placed" (a probe or the grown-up's starting point) satisfies `requires` but adds no moons.
//   * mastered is never erased; struggling only changes what THIS visit plays.
//   * the child never sees any of this.



const KEY = 'planet-parade-progress';
const plannedIds = new Set(PACKS.flatMap(p => p.levels).filter(l => l.status === 'planned').map(l => l.id));
function load() {
  let d = null;
  try { d = JSON.parse(localStorage.getItem(KEY) || 'null'); } catch (e) {}
  if (!d || d.v !== 2) d = { v: 2, active: 'child1', profiles: {} }; // v1 (seed ladders) is not carried over
  if (!d.profiles[d.active]) d.profiles[d.active] = { name: '', band: '2-3', lang: settings.lang || 'en', strands: {}, levels: {} };
  return d;
}
let data = load();
const save = () => { try { localStorage.setItem(KEY, JSON.stringify(data)); } catch (e) {} };

export const profile = () => data.profiles[data.active];
export function setProfile(fields) { Object.assign(profile(), fields); save(); }
const lvState = id => (profile().levels[id] ||= { status: null, visits: [] });
export const strandState = id => (profile().strands[id] ||= { advanced: false });
export const isMastered = id => lvState(id).status === 'mastered';
export const isPlaced = id => lvState(id).status === 'placed';
export const satisfied = id => { const s = lvState(id).status; return s === 'mastered' || s === 'placed'; };
export function setAdvanced(strand, on) { strandState(strand).advanced = !!on; save(); }

// Can this level be played now? Built (or Family Lab), and its track/prerequisites allow it.
export function playable(pack, lv) {
  if (lv.status === 'planned' || (lv.status === 'lab' && !settings.familyLab)) return false;
  if (lv.track === 'advanced' && !strandState(pack.strand).advanced) return false;
  // a prerequisite whose template isn't built yet can't block her: it counts as met until it ships
  return (lv.requires || []).every(id => satisfied(id) || plannedIds.has(id));
}
// The level a station plays next: the first playable, not-yet-satisfied level at that station,
// in strand order. If everything there is done, replay the last mastered one (a happy review).
export function nextAt(pack, station) {
  const here = pack.levels.filter(l => l.station === station);
  return here.find(l => !satisfied(l.id) && playable(pack, l)) || [...here].reverse().find(l => isMastered(l.id) && playable(pack, l)) || null;
}
export const lastMasteredAt = (pack, station) => [...pack.levels].reverse().find(l => l.station === station && isMastered(l.id)) || null;
export const masteredAt = (packs, station) => packs.flatMap(p => p.levels).filter(l => l.station === station && isMastered(l.id)).length;
export const current = pack => pack.levels.find(l => !satisfied(l.id) && playable(pack, l)) || null;

// One visit's results for a level. Returns true if this visit made it mastered.
export function commitVisit(lv, res, transferWins) {
  if (!res.length) return false;
  const st = lvState(lv.id), m = lv.mastery || {};
  st.visits.push({ day: localDay(), res, transfer: transferWins });
  if (st.visits.length > 12) st.visits.shift();
  let newly = false;
  if (st.status !== 'mastered') {
    const win = m.window || 5, need = m.need || 4, sessions = m.sessions || 2, tr = m.transfer ?? 1;
    const passing = st.visits.filter(v => { const w = v.res.slice(-win); return w.length >= Math.min(win, need) && w.reduce((a, b) => a + b, 0) >= need && v.transfer >= tr; });
    if (new Set(passing.map(v => v.day)).size >= sessions) { st.status = 'mastered'; newly = true; }
  }
  save();
  return newly;
}
// Grown-up's starting point: every level before `lv` in the strand becomes "placed" (unless mastered).
export function setStart(pack, idx) {
  pack.levels.forEach((l, i) => {
    const st = lvState(l.id);
    if (st.status === 'mastered') return;
    st.status = i < idx ? 'placed' : null;
  });
  save();
}
export function startIndex(pack) { const i = pack.levels.findIndex(l => !satisfied(l.id)); return i < 0 ? pack.levels.length : i; }
// Placement probe result (prerequisite, target, transfer): 3/3 places the target (provisional).
export function applyProbe(target, results) {
  const ok = results.length >= 3 && results.every(Boolean);
  if (ok && !isMastered(target.id)) { lvState(target.id).status = 'placed'; save(); }
  return ok;
}
export function resetProgress() { profile().levels = {}; profile().strands = {}; save(); }

export { KEY, data, load, lvState, plannedIds, save };
