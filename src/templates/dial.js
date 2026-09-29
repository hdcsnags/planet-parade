import { pop } from '../audio/audio.js';
import { TAU, clamp, pick, randInt } from '../core/util.js';
import { drawPlanet, drawSun } from '../engine/art.js';
import { sparkle } from '../engine/particles.js';
import { H, W, cx } from '../engine/stage.js';
import { Template } from '../engine/template.js';
import { MOON_P, PLANETS } from '../engine/world.js';
import { lookup, t } from '../i18n/i18n.js';

// Dial: turn things a quarter at a time to see how day/night and Moon phases work.
//   globe: the Sun shines from the left. Tap to turn Earth a quarter turn until our home (the little
//          house) is in daytime / night-time. Day and night come from Earth turning.
//          https://spaceplace.nasa.gov/days/
//   moon:  tap to move the Moon a quarter of the way around Earth. The Sun always lights the half of
//          the Moon facing it; the inset shows what we see from home: new, first quarter, full, last
//          quarter. Phases are NOT Earth's shadow. https://science.nasa.gov/moon/moon-phases/
// params: scene 'globe'|'moon', positions 4, targets [...], landmarks [...], showSun









const PHASES = ['new', 'firstQuarter', 'full', 'lastQuarter']; // moon position k: angle 180°, 270°, 0°, 90° (math, y up)
export class Dial extends Template {
  makeRound() {
    const p = this.p; this.scene = p.scene || 'globe';
    this.turn = 0; this.anim = 0;
    if (this.scene === 'globe') {
      this.target = pick([].concat(p.targets || ['day', 'night']));
      this.pos = randInt(0, 3); // home's quarter: 0 faces the Sun (left)
      if (this.isGoal()) this.pos = (this.pos + 2) % 4;
      this.ask(t(this.target === 'day' ? 'tpl.dial.day' : 'tpl.dial.night'));
    } else {
      this.target = pick([].concat(p.landmarks || PHASES));
      this.pos = randInt(0, 3); if (this.isGoal()) this.pos = (this.pos + 1) % 4;
      this.ask(t('tpl.dial.moonTo', { ph: lookup(`tpl.dial.phase.${this.target}`) }));
    }
  }
  isGoal() {
    if (this.scene === 'globe') return this.target === 'day' ? this.pos === 0 : this.pos === 2; // facing the Sun, or away
    return PHASES[this.pos] === this.target;
  }
  layout() { this.c = { x: W / 2 + W * .06, y: Math.max(H * .55, 380) }; this.R = clamp(Math.min(W, H) * .17, 80, 150); }
  onTap(x, y) {
    if (this.anim > 0) return;
    this.pos = (this.pos + 1) % 4; this.anim = 1; pop();
    if (this.isGoal()) { sparkle(this.c.x, this.c.y, 14); this.win(t(this.scene === 'globe' ? (this.target === 'day' ? 'tpl.dial.dayYes' : 'tpl.dial.nightYes') : 'tpl.dial.moonYes', { ph: lookup(`tpl.dial.phase.${this.target}`) }), this.c.x, this.c.y); }
  }
  step(dt) { this.anim = Math.max(0, this.anim - dt * 3); }
  render(tt) {
    const c = cx, { x, y } = this.c, R = this.R;
    // sunlight from the left
    drawSun(c, clamp(W * .1, 70, 150), y, clamp(R * .7, 50, 110), tt, {});
    if (this.scene === 'globe') {
      const ang = Math.PI - this.pos * Math.PI / 2 + this.anim * Math.PI / 2; // home angle (math coords, y up)
      drawPlanet(c, PLANETS[2], x, y, R, tt * .2, {});
      c.fillStyle = 'rgba(5,6,24,.72)'; c.beginPath(); c.arc(x, y, R + 1, -Math.PI / 2, Math.PI / 2); c.fill(); // night side (away from the Sun)
      const hx = x + Math.cos(ang) * R * .92, hy = y - Math.sin(ang) * R * .92;
      c.save(); c.translate(hx, hy); c.rotate(-ang + Math.PI / 2);
      c.fillStyle = '#ffc93c'; c.fillRect(-12, -10, 24, 18); c.fillStyle = '#ff5a6e'; c.beginPath(); c.moveTo(-16, -10); c.lineTo(0, -24); c.lineTo(16, -10); c.fill();
      c.restore();
      if (this.hint) { c.strokeStyle = `rgba(110,240,194,${.6 + .4 * Math.sin(tt * 5)})`; c.lineWidth = 5; const gx = this.target === 'day' ? x - R : x + R; c.beginPath(); c.arc(gx, y, 26, 0, TAU); c.stroke(); }
    } else {
      drawPlanet(c, PLANETS[2], x, y, R * .45, tt * .2, {});
      const orbit = R * 1.5; c.strokeStyle = 'rgba(255,255,255,.2)'; c.setLineDash([6, 8]); c.beginPath(); c.arc(x, y, orbit, 0, TAU); c.stroke(); c.setLineDash([]);
      const angs = [Math.PI, Math.PI * 1.5, 0, Math.PI * .5], a = angs[this.pos] - this.anim * Math.PI / 2;
      const mx = x + Math.cos(a) * orbit, my = y - Math.sin(a) * orbit, mr = R * .22;
      drawPlanet(c, MOON_P, mx, my, mr, tt, {});
      c.fillStyle = 'rgba(5,6,24,.75)'; c.beginPath(); c.arc(mx, my, mr + 1, -Math.PI / 2, Math.PI / 2); c.fill(); // the half away from the Sun is dark
      if (this.hint) { const ga = angs[PHASES.indexOf(this.target)]; c.strokeStyle = `rgba(110,240,194,${.6 + .4 * Math.sin(tt * 5)})`; c.lineWidth = 5; c.beginPath(); c.arc(x + Math.cos(ga) * orbit, y - Math.sin(ga) * orbit, mr * 1.5, 0, TAU); c.stroke(); }
      // what we see from home
      const ix = W - clamp(W * .12, 90, 170), iy = Math.max(H * .3, 230), ir = clamp(R * .55, 44, 80);
      c.fillStyle = 'rgba(22,29,79,.95)'; c.beginPath(); c.arc(ix, iy, ir * 1.35, 0, TAU); c.fill(); c.strokeStyle = '#9fb4ff'; c.lineWidth = 3; c.stroke();
      drawPhase(c, ix, iy, ir, PHASES[this.pos]);
    }
  }
}
// The Moon as seen from Earth (northern hemisphere): lit part in light grey, the rest dark.
function drawPhase(c, x, y, r, ph) {
  c.fillStyle = '#2a2f4a'; c.beginPath(); c.arc(x, y, r, 0, TAU); c.fill();
  c.fillStyle = '#e9e6dd';
  if (ph === 'full') { c.beginPath(); c.arc(x, y, r, 0, TAU); c.fill(); }
  else if (ph === 'firstQuarter') { c.beginPath(); c.arc(x, y, r, -Math.PI / 2, Math.PI / 2); c.fill(); }
  else if (ph === 'lastQuarter') { c.beginPath(); c.arc(x, y, r, Math.PI / 2, Math.PI * 1.5); c.fill(); }
  c.strokeStyle = 'rgba(255,255,255,.35)'; c.lineWidth = 2; c.beginPath(); c.arc(x, y, r, 0, TAU); c.stroke();
}

export { PHASES, drawPhase };
