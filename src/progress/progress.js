import { PACKS } from '../content/packs.js';
import { localDay, settings } from '../core/settings.js';
import { clampRung, topRung } from '../engine/ramp.js';

// Learning progress, stored on this device only (localStorage). Nothing is sent anywhere.
//
// Per child profile (hooks ready for cousins: name, age band, language):
//   strands[id] = { advanced }                          the grown-up's advanced-track switch
//   levels[id]  = { status: 'placed'|'mastered'|null, rung, visits: [{ day, res: [1,0,…], transfer, rung }] }
// Rules (content/curriculum/CURRICULUM.md):
//   * mastery M: ≥need of the last `window` first-try results in each of `sessions` visits on
//     different days, and each of those visits has ≥`transfer` successful transfer items, and ended
//     on the level's top rung (engine/ramp.js). A visit that passes is "pending" until the second day.
//   * rung: the highest difficulty rung she has reached on the level; it only ever goes up.
//   * pending: a level with a passing visit but no moon yet counts for `requires` and, for the rest
//     of that day, the station moves on to the next level instead of replaying it.
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
// The name she is greeted by. Several names separated by / , or | take turns at random; empty = no name.
export function childName() { const names = String(profile().name || '').split(/\s*[/,|]\s*/).map(s => s.trim()).filter(Boolean); return names.length ? names[Math.floor(Math.random() * names.length)] : ''; }
const lvState = id => (profile().levels[id] ||= { status: null, visits: [] });
export const strandState = id => (profile().strands[id] ||= { advanced: false });
export const isMastered = id => lvState(id).status === 'mastered';
export const isPlaced = id => lvState(id).status === 'placed';
export const satisfied = id => { const s = lvState(id).status; return s === 'mastered' || s === 'placed'; };
export const rungOf = id => lvState(id).rung || 0;
// Remember the highest rung reached on a level (never lowered: a bad day changes only that visit).
export function setRung(lv, r) { const st = lvState(lv.id); r = clampRung(lv, r); if (r > (st.rung || 0)) { st.rung = r; save(); } }
// One visit counts toward mastery if its window passes, it had its transfer win(s), and it ended on the top rung.
function passes(lv, v) {
  const m = lv.mastery || {}, win = m.window || 5, need = m.need || 4, tr = m.transfer ?? 1, w = v.res.slice(-win);
  return w.length >= Math.min(win, need) && w.reduce((a, b) => a + b, 0) >= need && v.transfer >= tr && (v.rung ?? topRung(lv)) >= topRung(lv);
}
const passingVisits = lv => lvState(lv.id).visits.filter(v => passes(lv, v));
const levelOf = id => { for (const p of PACKS) { const l = p.levels.find(x => x.id === id); if (l) return l; } return null; };
export const isPending = id => { const lv = levelOf(id); return !!lv && !isMastered(id) && passingVisits(lv).length > 0; };
export const pendingToday = id => { const lv = levelOf(id); return !!lv && !isMastered(id) && passingVisits(lv).some(v => v.day === localDay()); };
export function setAdvanced(strand, on) { strandState(strand).advanced = !!on; save(); }

// Can this level be played now? Built (or Family Lab), and its track/prerequisites allow it.
export function playable(pack, lv) {
  if (lv.status === 'planned' || (lv.status === 'lab' && !settings.familyLab)) return false;
  if (lv.track === 'advanced' && !strandState(pack.strand).advanced) return false;
  // a prerequisite whose template isn't built yet can't block her: it counts as met until it ships
  return (lv.requires || []).every(id => satisfied(id) || isPending(id) || plannedIds.has(id));
}
// The level a station plays next: the first playable, not-yet-satisfied level at that station,
// in strand order, skipping one she already passed today (it waits for another day). If
// everything there is done, replay the last mastered one (a happy review).
export function nextAt(pack, station) {
  const here = pack.levels.filter(l => l.station === station);
  return here.find(l => !satisfied(l.id) && !pendingToday(l.id) && playable(pack, l)) || [...here].reverse().find(l => isMastered(l.id) && playable(pack, l)) || null;
}
export const lastMasteredAt = (pack, station) => [...pack.levels].reverse().find(l => l.station === station && isMastered(l.id)) || null;
export const masteredAt = (packs, station) => packs.flatMap(p => p.levels).filter(l => l.station === station && isMastered(l.id)).length;
export const current = pack => pack.levels.find(l => !satisfied(l.id) && playable(pack, l)) || null;

// One visit's results for a level. Returns true if this visit made it mastered.
export function commitVisit(lv, res, transferWins, rung = topRung(lv)) {
  if (!res.length) return false;
  const st = lvState(lv.id), m = lv.mastery || {};
  // exploration (rule X) is never assessed: one visit simply places it, so it never blocks the next step
  if (m.rule === 'X') { if (!st.status) st.status = 'placed'; save(); return false; }
  st.visits.push({ day: localDay(), res, transfer: transferWins, rung: clampRung(lv, rung) });
  if (st.visits.length > 12) st.visits.shift();
  let newly = false;
  if (st.status !== 'mastered') {
    if (new Set(passingVisits(lv).map(v => v.day)).size >= (m.sessions || 2)) { st.status = 'mastered'; newly = true; }
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
// First-launch age band: start each strand at its first level meant for that age (guide ages in the
// packs; never a gate afterwards) and open the advanced track from 4 up. Mastered levels stay.
const AGE_FLOOR = { '2-3': 0, '4-5': 4, '6-7': 5 };
export function applyBand(band) {
  const floor = AGE_FLOOR[band] ?? 0;
  for (const pack of PACKS) {
    let idx = pack.levels.findIndex(l => parseFloat(String(l.age || '0')) >= floor);
    if (idx < 0) idx = pack.levels.length - 1;
    setStart(pack, idx);
    setAdvanced(pack.strand, floor >= 4);
  }
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
