import { say } from '../audio/speech.js';
import { packById, packForTemplate } from '../content/packs.js';
import { setMode } from '../hub/router.js';
import { t } from '../i18n/i18n.js';
import { applyProbe, packState, recordResult } from '../progress/progress.js';
import { TEMPLATES } from '../templates/index.js';
import { fireworks } from './particles.js';
import { T } from './stage.js';
import { after } from './timers.js';

// A short play session at one station: the current level of that pack, round after round, until
// mastery moves her up, a gentle step back, 5 rounds, or ~3 minutes, whichever comes first. Then a
// shared celebration and back to the Space Map. The child never sees levels or scores.
//
// start(sub): 'tenframe'            → the pack's current level
//             'tenframe.8'          → level 8, for the screenshot tour / grown-ups preview (no progress saved)
//             'tenframe.probe'      → placement probe: 3 items two levels up ("Try harder?")










const MAX_ROUNDS = 5, MAX_SECONDS = 180;

export function SessionRunner() {
  let pack = null, levelIdx = 0, tpl = null, rounds = 0, t0 = 0, preview = false, probe = null, ended = false;
  function finish(change) {
    ended = true;
    fireworks(change > 0 ? 8 : 4);
    say(change > 0 ? t('hub.newMoon') : t('hub.back'));
    after(3.2, () => setMode('hub', change > 0 ? `lit.${pack.id}` : pack.id));
  }
  const run = {
    roundDone(firstTry) {
      rounds++;
      let change = 0;
      if (probe) {
        probe.results.push(firstTry);
        if (probe.results.length >= 3) { change = applyProbe(pack, probe.level, probe.results) ? 1 : 0; after(2.6, () => finish(change)); return; }
      } else if (!preview) change = recordResult(pack, firstTry);
      after(2.6, () => {
        if (ended) return;
        if (change !== 0 || rounds >= MAX_ROUNDS || T - t0 > MAX_SECONDS) finish(change);
        else tpl.nextRound();
      });
    },
  };
  return {
    start(sub = '') {
      const [id, arg] = String(sub).split('.');
      pack = packById(id) || packForTemplate(id);
      if (!pack) { setMode('hub'); return; }
      const st = packState(pack);
      levelIdx = st.level;
      if (arg === 'probe') { levelIdx = Math.min(pack.levels.length - 1, st.level + 2); probe = { level: levelIdx, results: [] }; }
      else if (/^\d+$/.test(arg || '')) { levelIdx = Math.max(0, Math.min(pack.levels.length - 1, +arg - 1)); preview = true; }
      const level = pack.levels[levelIdx], Tpl = TEMPLATES[level.template];
      t0 = T;
      tpl = new Tpl(run, level);
      tpl.start();
    },
    layout() { if (tpl) tpl.layout(); },
    tap(x, y) { if (tpl && !ended) tpl.tap(x, y); },
    update(dt) { if (tpl) tpl.update(dt); },
    draw(tt) { if (tpl) tpl.draw(tt); },
    repeat() { if (tpl && !ended) tpl.repeat(); },
    get pack() { return pack; },
  };
}

export { MAX_ROUNDS, MAX_SECONDS };
