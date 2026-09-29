import { tone } from '../../audio/audio.js';
import { say } from '../../audio/speech.js';
import { FONT, clamp, pick, reduced } from '../../core/util.js';
import { Body } from '../../engine/body.js';
import { rowsLayout } from '../../engine/layout.js';
import { H, W, cx } from '../../engine/stage.js';
import { after } from '../../engine/timers.js';
import { PLANETS, SUN } from '../../engine/world.js';
import { t } from '../../i18n/i18n.js';

/* ================= Goodnight: the screen-time wind-down ================= */
// When the grown-ups' play time is up, the planets yawn, the lights dim and a soft lullaby plays.
// The game then rests here; only a grown-up's gear-hold (the parent panel) wakes it.
function SleepMode() {
  let sun = null, bodies = [], dim = .3, zs = [], zt = 0;
  function lullaby(vol) { [392, 329.63, 261.63, 293.66, 261.63].forEach((f, i) => tone(f, 1.6, { vol, delay: i * .95 })); }
  return {
    layout() {
      if (!sun) { sun = new Body(SUN, 0, 0, 10); bodies = PLANETS.map(p => new Body(p, 0, 0, 10)); [sun, ...bodies].forEach(b => { b.sleep = true; b.yawn = 3; }); }
      sun.R = Math.min(W, H) * .12; sun.x = sun.tx = W / 2; sun.y = sun.ty = Math.max(H * .24, 150);
      const ay = sun.y + sun.R * 1.6;
      rowsLayout(PLANETS, 16, ay, W - 32, H - ay - 20, 2, .5, Math.min(W, H) * .1).forEach((q, i) => { const b = bodies[i]; b.R = q.R; b.x = b.tx = q.x; b.y = b.ty = q.y; });
    },
    start() {
      after(.8, () => say(t('goodnight'), { persist: true }));
      lullaby(.08); after(9, () => lullaby(.05)); after(18, () => lullaby(.03));
    },
    tap() {},
    update(dt) {
      dim = Math.min(.62, dim + dt * .08);
      [sun, ...bodies].forEach(b => { b.update(dt); b.yawn = Math.max(0, (b.yawn || 0) - dt); });
      zt -= dt;
      if (zt < 0 && !reduced) { zt = 1.1; const b = pick([sun, ...bodies]); zs.push({ x: b.x + b.R * .6, y: b.y - b.R * .6, life: 3, s: clamp(b.R * .5, 14, 34) }); }
      zs = zs.filter(z => (z.life -= dt) > 0);
      zs.forEach(z => { z.y -= 22 * dt; z.x += Math.sin(z.life * 3) * 12 * dt; });
    },
    draw(t) {
      sun.draw(cx, t); bodies.forEach(b => b.draw(cx, t));
      cx.fillStyle = `rgba(3,4,18,${dim})`; cx.fillRect(0, 0, W, H);
      cx.save(); cx.fillStyle = '#c7d2ff'; cx.textAlign = 'center';
      zs.forEach(z => { cx.globalAlpha = Math.min(1, z.life / 1.2) * .85; cx.font = `800 ${z.s}px ${FONT}`; cx.fillText('z', z.x, z.y); });
      cx.restore();
    },
  };
}

export { SleepMode };
