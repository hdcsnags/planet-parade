import { pop, whoosh } from '../audio/audio.js';
import { TAU, clamp, ease, pick, shuffle } from '../core/util.js';
import { drawAstronaut, drawPlanet, drawRocket, drawSatellite, roundRect } from '../engine/art.js';
import { sparkle } from '../engine/particles.js';
import { H, W, cx } from '../engine/stage.js';
import { Template } from '../engine/template.js';
import { MOON_P } from '../engine/world.js';
import { t } from '../i18n/i18n.js';

// Place scene: "Put the rover under the bridge!" She taps one of three big glowing places; the thing
// flies there. Wrong place: it floats back and the sentence comes again.
// Scenes: bridge (on / under / beside / in the box), pads (left / middle / right / between — the
// child's real screen sides, never mirrored in Farsi), rocket (in / on / next to; promptKind 'action').
// params: relations [...], steps 1, zones 3, promptKind 'position'|'action', mirrorRTL false









export class PlaceScene extends Template {
  makeRound() {
    const rel = [].concat(this.p.relations || ['on', 'under', 'beside']);
    this.scene = rel.some(r => ['left', 'middle', 'right', 'between'].includes(r)) ? 'pads' : this.p.promptKind === 'action' ? 'rocket' : 'bridge';
    this.rel = pick(rel);
    const pool = { bridge: ['on', 'under', 'beside', 'in'], pads: ['left', 'middle', 'right'], rocket: ['in', 'on', 'next-to'] }[this.scene];
    if (this.scene === 'pads' && this.rel === 'between') this.zonesWanted = ['left-out', 'between', 'right-out'];
    else this.zonesWanted = shuffle([this.rel, ...shuffle(pool.filter(r => r !== this.rel)).slice(0, (this.p.zones || 3) - 1)]);
    this.fly = null; this.at = null;
    this.ask(t(`tpl.place.${this.scene}.${this.rel}`));
  }
  layout() {
    const top = Math.max(H * .3, 230), gy = H * .8; this.gy = gy;
    this.home = { x: Math.min(110, W * .12), y: top + 20 };
    const s = clamp(Math.min(W, H) * .16, 70, 140); this.s = s;
    const cxp = W / 2;
    const Z = {
      // bridge scene: a stone arch in the middle, an open box to the right
      on: { x: cxp, y: gy - s * 1.55 }, under: { x: cxp, y: gy - s * .45 }, beside: { x: cxp - s * 2.2, y: gy - s * .45 }, in: { x: cxp + s * 2.3, y: gy - s * .55 },
      // pads scene (screen sides; never mirrored)
      left: { x: W * .22, y: gy - s * .5 }, middle: { x: W * .5, y: gy - s * .5 }, right: { x: W * .78, y: gy - s * .5 },
      'left-out': { x: W * .16, y: gy - s * .5 }, between: { x: W * .5, y: gy - s * .5 }, 'right-out': { x: W * .84, y: gy - s * .5 },
      // rocket scene
      'next-to': { x: cxp + s * 1.9, y: gy - s * .6 },
    };
    if (this.scene === 'rocket') { Z.in = { x: cxp, y: gy - s * 1.2 }; Z.on = { x: cxp, y: gy - s * 2.75 }; }
    this.zones = this.zonesWanted.map(id => ({ id, ...Z[id], r: s * .55 }));
  }
  onTap(x, y) {
    if (this.fly) return;
    const z = this.zones.find(q => Math.hypot(x - q.x, y - q.y) < q.r * 1.25);
    if (!z) return;
    this.fly = { to: z, t: 0, ok: z.id === this.rel }; whoosh(.5);
  }
  step(dt) {
    if (!this.fly) return;
    const f = this.fly; f.t += dt / .6;
    if (f.t < 1) return;
    if (f.ok) { this.at = f.to; this.fly = null; sparkle(f.to.x, f.to.y, 14); pop(); this.win(t('tpl.place.done'), f.to.x, f.to.y); }
    else if (!f.back) { f.back = true; f.t = 0; this.miss(t('tpl.place.notThere')); }
    else this.fly = null;
  }
  render(tt) {
    const c = cx, s = this.s, gy = this.gy, cxp = W / 2;
    c.save();
    c.fillStyle = 'rgba(201,100,58,.35)'; c.fillRect(0, gy, W, H - gy); // ground
    if (this.scene === 'bridge') {
      c.fillStyle = '#8f7fd6'; c.beginPath();
      c.moveTo(cxp - s * 1.4, gy); c.lineTo(cxp - s * 1.4, gy - s * 1.1); c.lineTo(cxp + s * 1.4, gy - s * 1.1); c.lineTo(cxp + s * 1.4, gy);
      c.lineTo(cxp + s * .85, gy); c.arc(cxp, gy, s * .85, 0, Math.PI, true); c.closePath(); c.fill();
      c.fillStyle = '#b3a6ff'; c.fillRect(cxp - s * 1.5, gy - s * 1.2, s * 3, s * .14);
      c.fillStyle = '#c9b48a'; roundRect(c, cxp + s * 1.75, gy - s * 1.05, s * 1.1, s * 1.05, 10); c.fill();
      c.fillStyle = '#8a7650'; c.fillRect(cxp + s * 1.83, gy - s * 1.0, s * .94, s * .2);
    } else if (this.scene === 'pads') {
      const between = this.rel === 'between';
      (between ? [W * .33, W * .67] : [W * .22, W * .5, W * .78]).forEach(x => {
        if (between) drawPlanet(c, MOON_P, x, gy - s * .55, s * .45, tt, {});
        else { c.fillStyle = '#6c7bd6'; c.beginPath(); c.ellipse(x, gy - 6, s * .7, s * .18, 0, 0, TAU); c.fill(); }
      });
    } else {
      drawRocket(c, cxp, gy - s * 1.35, s * 1.5, -Math.PI / 2, tt, 0);
    }
    // the three places to choose from
    this.zones.forEach(z => {
      if (this.at === z) return;
      c.save(); c.fillStyle = 'rgba(159,180,255,.1)'; c.beginPath(); c.arc(z.x, z.y, z.r, 0, TAU); c.fill();
      c.setLineDash([10, 8]); c.lineDashOffset = -tt * 20; c.lineWidth = 5;
      c.strokeStyle = this.hint && z.id === this.rel ? `rgba(110,240,194,${.6 + .4 * Math.sin(tt * 5)})` : 'rgba(255,255,255,.4)';
      c.beginPath(); c.arc(z.x, z.y, z.r, 0, TAU); c.stroke(); c.restore();
    });
    // the thing she is placing
    let px = this.home.x, py = this.home.y;
    if (this.at) { px = this.at.x; py = this.at.y; }
    else if (this.fly) { const f = this.fly, e = ease(Math.min(1, f.t)), a = f.back ? f.to : this.home, b = f.back ? this.home : f.to; px = a.x + (b.x - a.x) * e; py = a.y + (b.y - a.y) * e - Math.sin(e * Math.PI) * 60; }
    const k = s * .6;
    if (this.scene === 'bridge') drawRover(c, px, py, k);
    else if (this.scene === 'pads') drawSatellite(c, px, py, k * .9, tt);
    else drawAstronaut(c, px, py, k * .9, tt);
    c.restore();
  }
}
function drawRover(c, x, y, s) {
  c.save(); c.translate(x, y);
  c.fillStyle = '#e8ecff'; roundRect(c, -s * .8, -s * .35, s * 1.6, s * .6, 10); c.fill();
  c.fillStyle = '#2b3a8f'; for (const sx of [-.55, 0, .55]) { c.beginPath(); c.arc(sx * s, s * .38, s * .22, 0, TAU); c.fill(); }
  c.strokeStyle = '#e8ecff'; c.lineWidth = 4; c.beginPath(); c.moveTo(s * .4, -s * .35); c.lineTo(s * .5, -s * .8); c.stroke();
  c.fillStyle = '#5ea8ff'; c.beginPath(); c.arc(s * .5, -s * .85, s * .12, 0, TAU); c.fill();
  c.restore();
}

export { drawRover };
