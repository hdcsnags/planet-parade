import { chime, tone } from '../../audio/audio.js';
import { hush, say, sayQueue } from '../../audio/speech.js';
import { logUse, settings } from '../../core/settings.js';
import { $, pick } from '../../core/util.js';
import { label } from '../../engine/art.js';
import { Body } from '../../engine/body.js';
import { rowsLayout } from '../../engine/layout.js';
import { sparkle } from '../../engine/particles.js';
import { H, T, W, cx } from '../../engine/stage.js';
import { after } from '../../engine/timers.js';
import { PLANETS, SCALE, SUN } from '../../engine/world.js';
import { bang, cap, pfact, pname, t } from '../../i18n/i18n.js';

/* ================= Game 1: Tap & Hear ================= */
function FreeMode() {
  let sun = null, bodies = [], idle = 0, singing = false;
  const taps = new Map();
  // Planet Song: each planet lights up in order and sings its name on its own pentatonic note.
  // The voice pitch climbs with the scale; the beat is slow enough to sing along, and it loops.
  const BEAT = 1.35;
  function sing(i) {
    if (!singing) return;
    if (i >= bodies.length) { after(1.8, () => sing(0)); return; }
    const b = bodies[i];
    b.bounce(5); b.glow = 1; chime(SCALE[i + 1]); sparkle(b.x, b.y - b.R * .8, 8);
    say(cap(pname(b.p)) + bang(), { pitch: .85 + i * .09 });
    after(BEAT, () => { b.glow = 0; sing(i + 1); });
  }
  function setSong(on) {
    singing = on; $('#songBtn').setAttribute('aria-pressed', on);
    bodies.forEach(b => { b.glow = 0; });
    if (on) { say(t('song')); after(1.9, () => sing(0)); } else hush();
  }
  return {
    song() { setSong(!singing); },
    layout() {
      if (!sun) sun = new Body(SUN, 0, 0, 10);
      if (!bodies.length) bodies = PLANETS.map(p => new Body(p, 0, 0, 10));
      let ax, ay, aw, ah;
      if (W >= H * 1.05) { sun.R = H * .42; sun.x = sun.tx = -sun.R * .42; sun.y = sun.ty = H * .55; ax = sun.x + sun.R + 24; aw = W - ax - 20; ay = Math.max(H * .16, 100); ah = H - ay - 16; }
      else { sun.R = W * .42; sun.x = sun.tx = W / 2; sun.y = sun.ty = -sun.R * .4; ay = sun.y + sun.R + 24; ah = H - ay - 20; ax = 16; aw = W - 32; }
      rowsLayout(PLANETS, ax, ay, aw, ah, 4, .4, Math.min(W, H) * .14).forEach((q, i) => { const b = bodies[i]; b.R = q.R; b.x = b.tx = q.x; b.y = b.ty = q.y; });
    },
    start() {
      say(t('tapPlanet'));
      bodies.forEach((b, i) => after(.25 + i * .12, () => { b.bounce(3); tone(SCALE[i + 1], .35, { vol: .08 }); }));
    },
    repeat() { say(t('tapPlanet')); },
    tap(x, y) {
      idle = 0;
      const b = [...bodies].reverse().find(o => o.hit(x, y)) || (sun.hit(x, y) ? sun : null);
      if (!b) { sparkle(x, y, 6); tone(pick(SCALE) * 2, .3, { vol: .06, type: 'triangle' }); return; }
      const rec = taps.get(b) || { n: 0, t: -9 };
      if (T - rec.t < .35) return;
      rec.n++; rec.t = T; taps.set(b, rec);
      b.bounce(5); chime(SCALE[b.p.i + 1]); sparkle(b.x, b.y - b.R * .8, 10);
      const name = t('nameBang', { p: cap(pname(b.p)) });
      if (b.p.id !== 'sun') logUse('words', b.p.id);
      // Name and fact are separate lines so each can use a recorded clip.
      if (settings.facts && rec.n % 2 === 0) sayQueue([{ text: name }, { text: pfact(b.p) }]); else say(name);
    },
    update(dt) {
      idle += dt; sun.update(dt); bodies.forEach(b => b.update(dt));
      if (idle > 10 && !singing) { idle = 4; const b = pick(bodies); b.bounce(3); b.wiggle(); }
    },
    draw(t) { sun.draw(cx, t); bodies.forEach(b => { b.draw(cx, t); label(b); }); },
  };
}

export { FreeMode };
