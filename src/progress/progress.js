import { settings } from '../core/settings.js';

// Learning progress, stored on this device only (localStorage). Nothing is sent anywhere.
//
// Per child profile (hooks ready for cousins: name, age band, language), per pack:
//   level: the level she plays next      start: the grown-up's chosen starting level
//   hist:  recent first-try results (1/0) done: levels she has mastered (these light up the map)
// Mastery: `need` first-try wins inside the last `window` rounds moves up one level.
// Struggle: `struggle` misses inside the window steps back one level, gently and silently.


const KEY = 'planet-parade-progress';
const DEFAULT_MASTERY = { window: 5, need: 4, struggle: 3 };
function load() {
  let d = null;
  try { d = JSON.parse(localStorage.getItem(KEY) || 'null'); } catch (e) {}
  if (!d || d.v !== 1) d = { v: 1, active: 'child1', profiles: {} };
  if (!d.profiles[d.active]) d.profiles[d.active] = { name: '', band: '2-3', lang: settings.lang || 'en', packs: {} };
  return d;
}
let data = load();
const save = () => { try { localStorage.setItem(KEY, JSON.stringify(data)); } catch (e) {} };

export const profile = () => data.profiles[data.active];
export function setProfile(fields) { Object.assign(profile(), fields); save(); }
export function packState(pack) {
  const pk = profile().packs;
  if (!pk[pack.id]) pk[pack.id] = { level: 0, start: 0, hist: [], done: [] };
  const st = pk[pack.id];
  st.level = Math.max(0, Math.min(pack.levels.length - 1, st.level));
  return st;
}
// The grown-up picks where a strand starts (e.g. "she already knows this").
export function setStartLevel(pack, n) {
  const st = packState(pack);
  st.start = st.level = Math.max(0, Math.min(pack.levels.length - 1, n));
  st.hist = []; save();
}
// Record one round. Returns +1 (mastered, moved up), -1 (struggling, stepped back) or 0.
export function recordResult(pack, firstTry) {
  const st = packState(pack), lv = pack.levels[st.level], m = { ...DEFAULT_MASTERY, ...(lv.mastery || {}) };
  st.hist.push(firstTry ? 1 : 0);
  if (st.hist.length > m.window) st.hist.shift();
  const wins = st.hist.reduce((a, b) => a + b, 0), missed = st.hist.length - wins;
  let change = 0;
  if (wins >= m.need) {
    if (!st.done.includes(st.level)) st.done.push(st.level);
    if (st.level < pack.levels.length - 1) { st.level++; change = 1; } else change = 1;
    st.hist = [];
  } else if (missed >= m.struggle && st.level > 0) { st.level--; st.hist = []; change = -1; }
  save();
  return change;
}
// Placement probe ("Try harder?"): after 3 items at a harder level, move there if all were first-try.
export function applyProbe(pack, probeLevel, results) {
  const ok = results.length >= 3 && results.every(Boolean);
  if (ok) { const st = packState(pack); for (let i = 0; i < probeLevel; i++) if (!st.done.includes(i)) st.done.push(i); st.level = probeLevel; st.hist = []; save(); }
  return ok;
}
export const doneCount = pack => packState(pack).done.length;

export { DEFAULT_MASTERY, KEY, data, load, save };
