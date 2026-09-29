/* ---------- settings (per-device convenience only) ---------- */
const settings = { voice: true, facts: true, faces: true, sound: true, choices: 3, maxNum: 5, step: 1, lang: 'en', session: 0, voiceNames: {}, countLvl: 0 };
try { Object.assign(settings, JSON.parse(localStorage.getItem('planet-parade') || '{}')); } catch (e) {}
const saveSettings = () => { try { localStorage.setItem('planet-parade', JSON.stringify(settings)); } catch (e) {} };

/* ---------- "Today" for grown-ups: stored on this device only, never sent anywhere ---------- */
const localDay = () => { const d = new Date(); return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`; };
function loadToday() {
  let d = null;
  try { d = JSON.parse(localStorage.getItem('planet-parade-today') || 'null'); } catch (e) {}
  if (!d || d.day !== localDay()) d = { day: localDay(), sec: 0, session: 0, modes: {}, nums: {}, words: {}, asleep: false };
  return d;
}
let today = loadToday();
const saveToday = () => { try { localStorage.setItem('planet-parade-today', JSON.stringify(today)); } catch (e) {} };
// Only this module reassigns `today`.
function rolloverToday() { if (today.day !== localDay()) today = loadToday(); }
const logUse = (bucket, key) => { today[bucket][key] = (today[bucket][key] || 0) + 1; };

export { loadToday, localDay, logUse, rolloverToday, saveSettings, saveToday, settings, today };
