import { chime, fanfare, whoosh } from '../../audio/audio.js';
import { say, sayQueue } from '../../audio/speech.js';
import { settings } from '../../core/settings.js';
import { TAU, clamp, ease } from '../../core/util.js';
import { drawRocket, label, tapGate } from '../../engine/art.js';
import { Body } from '../../engine/body.js';
import { COLORS, burst, fireworks, trail } from '../../engine/particles.js';
import { H, T, W, camX, cx, setCamX } from '../../engine/stage.js';
import { after } from '../../engine/timers.js';
import { PLANETS, SCALE, SUN } from '../../engine/world.js';
import { cap, pfact, pname, t } from '../../i18n/i18n.js';

/* ================= Game 3: Rocket Trip ================= */
function RocketMode() {
  let sun = null, pl = [], R0 = 0, sunR = 0, s = 0, at = -1, fl = null, orbitA = Math.PI, idle = 0, done = false;
  const rk = { x: 0, y: 0, ang: -.15, thrust: .25 };
  const orbitPos = (b, a) => { const k = b.p.wf > 1.5 ? 2.35 : 1.8; return { x: b.x + Math.cos(a) * b.R * k, y: b.y + Math.sin(a) * b.R * .6, dx: -Math.sin(a) * b.R * k, dy: Math.cos(a) * b.R * .6 }; };
  const sunPark = () => ({ x: sun.x + sunR * 1.35, y: sun.y - sunR * .15 + Math.sin(T * 2) * sunR * .03 });
  const dest = i => i < 0 ? sunPark() : orbitPos(pl[i], Math.PI);
  function go(i) { fl = { to: i, t: 0, dur: i < 0 ? 2.8 : 1.7, x0: rk.x, y0: rk.y }; whoosh(fl.dur); }
  function arrive(i) {
    at = i; orbitA = Math.PI;
    if (i < 0) { sun.bounce(4); chime(SCALE[0]); done = false; say(t('homeSun')); return; }
    const b = pl[i];
    b.bounce(6); chime(SCALE[i + 1]); burst(b.x, b.y - b.R * .2, 18, COLORS, .7);
    sayQueue([{ text: t('nameBang', { p: cap(pname(b.p)) }) }, ...(settings.facts ? [{ text: pfact(b.p) }] : [])]);
    if (i === 7) { done = true; after(settings.facts ? 3.2 : 1.6, () => { say(t('allEight')); fanfare(); fireworks(7); }); }
  }
  function drawShip(t) { drawRocket(cx, rk.x, rk.y, s, rk.ang, t, rk.thrust); }
  return {
    repeat() { if (at < 0) say(t('rocketGo')); else say(t('nameBang', { p: cap(pname(pl[at].p)) })); },
    layout() {
      R0 = Math.min(H * .16, W * .17); sunR = Math.min(H * .36, W * .3); s = R0 * .5;
      if (!sun) sun = new Body(SUN, 0, 0, sunR);
      sun.R = sunR; sun.x = sun.tx = W * .08; sun.y = sun.ty = H * .54;
      if (!pl.length) pl = PLANETS.map(p => new Body(p, 0, 0, 10));
      const spacing = Math.max(W * .5, R0 * 4.4);
      pl.forEach((b, i) => { b.R = R0 * (.72 + .28 * b.p.r / 1.3); b.x = b.tx = sun.x + sunR * 1.25 + R0 * 2.2 + spacing * i; b.y = b.ty = H * .58 + Math.sin(i * 1.9 + .6) * H * .13; });
      if (!fl) { const p = at < 0 ? sunPark() : orbitPos(pl[at], orbitA); rk.x = p.x; rk.y = p.y; }
    },
    start() { say(t('rocketGo')); },
    tap(x, y) {
      idle = 0;
      if (fl) return;
      if (at >= 0 && pl[at].hit(x, y)) { if (!tapGate(pl[at])) return; pl[at].bounce(5); chime(SCALE[at + 1]); say(t('nameBang', { p: cap(pname(pl[at].p)) })); return; }
      go(done ? -1 : at + 1);
    },
    update(dt) {
      idle += dt; sun.update(dt); pl.forEach(b => b.update(dt));
      if (fl) {
        fl.t += dt / fl.dur;
        const e = ease(Math.min(1, fl.t)), d = dest(fl.to), u = 1 - e;
        const qx = (fl.x0 + d.x) / 2, qy = Math.min(fl.y0, d.y) - H * (fl.to < 0 ? .38 : .3);
        rk.x = u * u * fl.x0 + 2 * u * e * qx + e * e * d.x;
        rk.y = u * u * fl.y0 + 2 * u * e * qy + e * e * d.y;
        rk.ang = Math.atan2(2 * u * (qy - fl.y0) + 2 * e * (d.y - qy), 2 * u * (qx - fl.x0) + 2 * e * (d.x - qx));
        rk.thrust = 1;
        trail(rk.x - Math.cos(rk.ang) * s * .8, rk.y - Math.sin(rk.ang) * s * .8);
        if (fl.t >= 1) { const to = fl.to; fl = null; arrive(to); }
      } else if (at >= 0) {
        orbitA -= dt * .8; // clockwise: glides down in front of the planet, then back behind it
        const p = orbitPos(pl[at], orbitA);
        rk.x = p.x; rk.y = p.y; rk.ang = Math.atan2(-p.dy, -p.dx); rk.thrust = .35;
      } else {
        const p = sunPark(); rk.x = p.x; rk.y = p.y;
        const d = ((-.15 - rk.ang + Math.PI) % TAU + TAU) % TAU - Math.PI; rk.ang += d * Math.min(1, dt * 3); rk.thrust = .25;
      }
      const tgt = clamp(rk.x - W * .45, 0, pl[7].x + R0 * 3 - W);
      setCamX(camX + (tgt - camX) * Math.min(1, dt * 3));
    },
    draw(t) {
      sun.draw(cx, t);
      if (!fl) {
        const d = dest(done ? -1 : at + 1), qx = (rk.x + d.x) / 2, qy = Math.min(rk.y, d.y) - H * .3;
        cx.save(); cx.setLineDash([6, 12]); cx.lineDashOffset = -t * 30; cx.strokeStyle = 'rgba(255,255,255,.22)'; cx.lineWidth = 3; cx.lineCap = 'round';
        cx.beginPath(); cx.moveTo(rk.x, rk.y); cx.quadraticCurveTo(qx, qy, d.x, d.y); cx.stroke(); cx.restore();
      }
      let drawn = false;
      pl.forEach((b, i) => {
        if (!drawn && !fl && i === at && Math.sin(orbitA) < 0) { drawShip(t); drawn = true; }
        b.draw(cx, t); label(b);
      });
      if (!drawn) drawShip(t);
      if (!fl && idle > 3.5) {
        const d = dest(done ? -1 : at + 1), a = Math.atan2(d.y - rk.y, d.x - rk.x);
        cx.save(); cx.strokeStyle = '#6ef0c2'; cx.lineWidth = s * .13; cx.lineCap = 'round'; cx.lineJoin = 'round';
        for (let k = 0; k < 3; k++) {
          const dist = s * 1.5 + k * s * .5, px = rk.x + Math.cos(a) * dist, py = rk.y + Math.sin(a) * dist;
          cx.globalAlpha = .25 + .75 * Math.max(0, Math.sin(t * 6 - k * .9));
          cx.save(); cx.translate(px, py); cx.rotate(a); cx.beginPath(); cx.moveTo(-s * .15, -s * .25); cx.lineTo(s * .1, 0); cx.lineTo(-s * .15, s * .25); cx.stroke(); cx.restore();
        }
        cx.restore();
      }
    },
  };
}

export { RocketMode };
