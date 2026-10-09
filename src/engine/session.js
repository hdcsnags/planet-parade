import { say } from '../audio/speech.js';
import { PACKS } from '../content/packs.js';
import { setMode } from '../hub/router.js';
import { t } from '../i18n/i18n.js';
import { applyProbe, commitVisit, current, lastMasteredAt, nextAt, playable, rungOf, setRung } from '../progress/progress.js';
import { TEMPLATES } from '../templates/index.js';
import { fireworks } from './particles.js';
import { rungParams, topRung } from './ramp.js';
import { T } from './stage.js';
import { after } from './timers.js';

// One visit to a station, under ~3 minutes, then back to the Space Map with a shared celebration.
//   warm-up: 1 round from the last level mastered here (never scored)
//   main:    up to 4 rounds of the station's next level; variants cycle round by round and the
//            last main round is the transfer item (a different representation)
//   ramp:    main rounds play at the level's current rung (engine/ramp.js): two first-try rounds in
//            a row climb one rung, two misses in a row ease one (this visit only); the highest rung
//            reached is remembered. Warm-up, support, probe and preview rounds use the top rung.
//   support: 3 misses inside the window → the rest of THIS visit plays the prerequisite; the next
//            visit comes back to the same level. Mastery is never erased.
// Mastery needs two passing visits on different days, each ending on the top rung (progress.js), so
// a single visit never "levels up" on the spot; the map shows a new moon when it happens. After a
// passing visit the station moves on to the next level for the rest of the day ("pending").
//
// start(sub): 'station:mars' · 'probe:number' (prerequisite, target, transfer)
//             'preview:number.7' · 'tpl:bond:min|max'  (tour / grown-ups preview: nothing is saved)










const MAIN_ROUNDS = 4, MAX_SECONDS = 180;
const levelById = id => { for (const p of PACKS) { const l = p.levels.find(x => x.id === id); if (l) return [p, l]; } return [null, null]; };

export function SessionRunner() {
  let queue = [], qi = 0, tpl = null, tplLevel = null, t0 = 0, ended = false, backSub = '';
  let pack = null, target = null, res = [], transferWins = 0, misses = [], stepped = false, probe = null, preview = false;
  let rung = 0, playedRung = 0, streak = 0, missRun = 0; // playedRung: the rung the last main round was actually played at
  const prereqOf = lv => { const id = (lv.requires || [])[0]; const [, l] = id ? levelById(id) : [null, null]; return l && l.status !== 'planned' ? l : null; };
  function roundFor(item) {
    const lv = item.level, vs = lv.variants || [];
    const variant = vs.length ? vs[(item.k || 0) % vs.length] : {};
    if (!tpl || tplLevel !== lv) { const Tpl = TEMPLATES[lv.template]; tpl = new Tpl(run, lv); tplLevel = lv; }
    const main = item.role === 'main' && lv === target && !preview && !probe, r = main ? rung : topRung(lv);
    if (main) playedRung = r;
    tpl.p = { ...lv.params, ...variant, ...rungParams(lv, r) };
    tpl.transfer = !!item.transfer;
    tpl.nextRound();
  }
  function finish(newly) {
    ended = true;
    fireworks(newly ? 8 : 4);
    say(newly ? t('hub.newMoon') : t('hub.back'));
    after(3.2, () => setMode('hub', newly && target ? `lit.${target.station}` : backSub));
  }
  function endVisit() {
    let newly = false;
    if (probe) applyProbe(target, probe);
    else if (!preview && target) newly = commitVisit(target, res, transferWins, playedRung);
    finish(newly);
  }
  const run = {
    roundDone(firstTry) {
      const item = queue[qi];
      if (item.role === 'main' && item.level === target) {
        res.push(firstTry ? 1 : 0); if (item.transfer && firstTry) transferWins++;
        misses.push(firstTry ? 0 : 1); if (misses.length > (target.mastery.window || 5)) misses.shift();
        // the ramp: climb after two first-try rounds in a row, ease after two misses in a row
        if (firstTry) { streak++; missRun = 0; if (streak >= 2 && rung < topRung(target)) { rung++; streak = 0; setRung(target, rung); } }
        else { missRun++; streak = 0; if (missRun >= 2 && rung > 0) { rung--; missRun = 0; } }
        // struggling: for the rest of this visit, play the prerequisite instead (never saved)
        if (!stepped && misses.reduce((a, b) => a + b, 0) >= (target.mastery.struggle || 3)) {
          const pre = prereqOf(target);
          if (pre) { stepped = true; queue = queue.slice(0, qi + 1).concat(queue.slice(qi + 1).map(q => ({ ...q, level: pre, role: 'support' }))); }
        }
      }
      if (probe) probe.push(firstTry);
      qi++;
      after(2.6, () => {
        if (ended) return;
        if (qi >= queue.length || T - t0 > MAX_SECONDS) endVisit();
        else roundFor(queue[qi]);
      });
    },
  };
  function plan(sub) {
    const [kind, a, b] = String(sub).split(':');
    if (kind === 'tpl' || kind === 'preview') {
      preview = true;
      let lv = null;
      if (kind === 'tpl') { const all = PACKS.flatMap(p => p.levels).filter(l => l.template === a && l.status !== 'planned'); lv = b === 'max' ? all[all.length - 1] : all[0]; }
      else lv = levelById(a)[1];
      if (!lv) return false;
      [pack] = levelById(lv.id); target = lv; backSub = lv.station;
      queue = Array.from({ length: MAIN_ROUNDS }, (_, k) => ({ level: lv, role: 'main', k, transfer: k === MAIN_ROUNDS - 1 }));
      return true;
    }
    if (kind === 'probe') {
      pack = PACKS.find(p => p.id === a); target = pack && current(pack);
      if (!target) return false;
      const pre = prereqOf(target) || target;
      probe = []; backSub = target.station;
      queue = [{ level: pre, role: 'probe', k: 0 }, { level: target, role: 'probe', k: 0 }, { level: target, role: 'probe', k: 1, transfer: true }];
      return true;
    }
    // station visit
    const station = a;
    pack = PACKS.find(p => p.levels.some(l => l.station === station && playable(p, l)));
    target = pack && nextAt(pack, station);
    if (!target) return false;
    backSub = station; rung = playedRung = rungOf(target.id);
    const warm = lastMasteredAt(pack, station);
    queue = [];
    if (warm && warm !== target) queue.push({ level: warm, role: 'warmup', k: 0 });
    for (let k = 0; k < MAIN_ROUNDS; k++) queue.push({ level: target, role: 'main', k, transfer: k === MAIN_ROUNDS - 1 });
    return true;
  }
  return {
    start(sub = '') {
      if (!plan(sub)) { setMode('hub'); return; }
      t0 = T; roundFor(queue[0]);
    },
    layout() { if (tpl) tpl.layout(); },
    tap(x, y) { if (tpl && !ended) tpl.tap(x, y); },
    move(x, y) { if (tpl && !ended && tpl.move) tpl.move(x, y); },
    up(x, y) { if (tpl && !ended && tpl.up) tpl.up(x, y); },
    update(dt) { if (tpl) tpl.update(dt); },
    draw(tt) { if (tpl) tpl.draw(tt); },
    repeat() { if (tpl && !ended) tpl.repeat(); },
  };
}

export { MAIN_ROUNDS, MAX_SECONDS, levelById };
