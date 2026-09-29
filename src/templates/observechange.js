import { pop, tone } from '../audio/audio.js';
import { say } from '../audio/speech.js';
import { TAU, clamp, ease, pick } from '../core/util.js';
import { drawSun, roundRect } from '../engine/art.js';
import { drawButton, hitButton, makeButton } from '../engine/components.js';
import { sparkle } from '../engine/particles.js';
import { H, W, cx } from '../engine/stage.js';
import { Template } from '../engine/template.js';
import { after } from '../engine/timers.js';
import { lookup, t } from '../i18n/i18n.js';

// Observe & change (predict → demonstrate → observe). Only the OBSERVATION is scored (rule E); the
// guess never counts against her.
//   sink_float: "Will the wooden log sink or float? Guess!" → drop → "What happened?" A big log
//               floats and a tiny pebble sinks, so "heavy things sink" is never what she learns.
//   shadow:     the lamp moves; the rover's shadow falls on the other side (short, under it, when the
//               lamp is overhead). "Where is the shadow now?"
//   ice_melt:   the same ice in the sun and in the shade; "Which melted first?"
// Status: built, in Family Lab until each fact has a reviewed source (no invented URLs).











const OBJECTS = { log: 'float', pebble: 'sink', apple: 'float', coin: 'sink', duck: 'float', key: 'sink' };
export class ObserveChange extends Template {
  makeRound() {
    this.exp = this.p.experiment || 'sink_float'; this.phase = 'guess'; this.anim = 0; this.btns = [];
    if (this.exp === 'sink_float') {
      this.obj = pick(Object.keys(OBJECTS)); this.truth = OBJECTS[this.obj];
      this.btns = [makeButton('float'), makeButton('sink')];
      this.ask(t('tpl.observe.will', { o: lookup(`tpl.observe.obj.${this.obj}`) }));
    } else if (this.exp === 'shadow') {
      this.lamp = pick(['left', 'top', 'right']); this.lampNow = 'top'; this.truth = { left: 'right', right: 'left', top: 'under' }[this.lamp];
      this.btns = ['left', 'under', 'right'].map(id => makeButton(id));
      this.ask(t(`tpl.observe.lamp.${this.lamp}`));
    } else {
      this.truth = pick(['a', 'b']); // which tray is in the sun
      this.btns = [makeButton('a'), makeButton('b')];
      this.ask(t('tpl.observe.iceWill'));
    }
  }
  layout() {
    const r = clamp(Math.min(W, H) * .07, 44, 60), n = this.btns.length;
    this.btns.forEach((b, i) => { b.r = r; b.x = W / 2 + (i - (n - 1) / 2) * r * 3; b.y = H * .86; });
    this.stage = { x: W / 2, y: Math.max(H * .58, 420), s: clamp(Math.min(W, H) * .17, 80, 150) }; // clear of a two-line caption
  }
  onTap(x, y) {
    const b = hitButton(this.btns, x, y); if (!b) return;
    b.sv = 4; pop();
    if (this.phase === 'guess') { // any guess is welcome; then watch what happens
      this.phase = 'watch'; this.busy = true; say(t('tpl.observe.findOut'));
      after(1.2, () => { this.anim = .001; tone(300, .5, { vol: .1, slide: .5 }); });
      after(4.2, () => { this.phase = 'observe'; this.busy = false; this.ask(t(this.exp === 'ice_melt' ? 'tpl.observe.iceWhat' : this.exp === 'shadow' ? 'tpl.observe.shadowWhat' : 'tpl.observe.what')); });
      return;
    }
    if (this.phase !== 'observe') return;
    if (b.id === this.truth) {
      sparkle(b.x, b.y, 12);
      const line = this.exp === 'sink_float' ? t(`tpl.observe.${this.truth}s`) : this.exp === 'shadow' ? t(`tpl.observe.shadow.${this.truth}`) : t('tpl.observe.iceYes');
      this.win(line, this.stage.x, this.stage.y);
    } else this.miss(t('tpl.qb.lookAgain'));
  }
  step(dt) {
    if (this.anim > 0 && this.anim < 1) this.anim = Math.min(1, this.anim + dt / 2.6);
    this.btns.forEach(b => { b.sv += (-160 * (b.scale - 1) - 11 * b.sv) * dt; b.scale += b.sv * dt; b.glow = this.hint && this.phase === 'observe' && b.id === this.truth ? 1 : 0; });
  }
  render(tt) {
    const c = cx, { x, y, s } = this.stage, e = ease(this.anim);
    if (this.exp === 'sink_float') {
      const tw = s * 2.4, th = s * 1.6, top = y - th * .3;
      c.fillStyle = 'rgba(94,168,255,.35)'; roundRect(c, x - tw / 2, top, tw, th, 16); c.fill(); c.strokeStyle = '#cfe3ff'; c.lineWidth = 4; c.stroke();
      const surface = top + th * .12, oy = this.anim === 0 ? top - s * .7 : this.truth === 'float' ? mix(top - s * .7, surface, e) + Math.sin(tt * 3) * 3 : mix(top - s * .7, top + th - s * .3, e);
      drawThing(c, this.obj, x, oy, s * .38);
    } else if (this.exp === 'shadow') {
      const gy = y + s * .6, lampPos = this.anim === 0 ? 'top' : this.lamp;
      c.fillStyle = 'rgba(201,100,58,.35)'; c.fillRect(0, gy, W, H - gy);
      const lx = { left: x - s * 2.2, top: x, right: x + s * 2.2 }[lampPos], ly = lampPos === 'top' ? y - s * 1.25 : y - s * .5;
      if (this.anim > .95 || this.phase === 'observe') {
        const sx = { right: x + s * 1.1, left: x - s * 1.1, under: x }[this.truth];
        c.fillStyle = 'rgba(0,0,0,.45)'; c.beginPath(); c.ellipse(sx, gy + 6, this.truth === 'under' ? s * .45 : s * .9, s * .14, 0, 0, TAU); c.fill();
      }
      c.fillStyle = '#e8ecff'; roundRect(c, x - s * .4, y + s * .1, s * .8, s * .45, 8); c.fill();
      c.fillStyle = '#2b3a8f'; for (const k of [-.28, 0, .28]) { c.beginPath(); c.arc(x + k * s, y + s * .58, s * .1, 0, TAU); c.fill(); }
      const g = c.createRadialGradient(lx, ly, 4, lx, ly, s * .6); g.addColorStop(0, 'rgba(255,243,176,1)'); g.addColorStop(1, 'rgba(255,201,60,0)'); c.fillStyle = g; c.beginPath(); c.arc(lx, ly, s * .6, 0, TAU); c.fill();
      c.fillStyle = '#ffc93c'; c.beginPath(); c.arc(lx, ly, s * .16, 0, TAU); c.fill();
    } else {
      [['a', x - s * 1.2], ['b', x + s * 1.2]].forEach(([id, tx]) => {
        const sunny = this.truth === id, melt = this.anim === 0 ? 0 : e * (sunny ? .9 : .35);
        if (sunny) drawSun(c, tx, y - s * 1.05, s * .3, tt, {}); else { c.fillStyle = '#9aa3c8'; c.beginPath(); c.moveTo(tx - s * .6, y - s * .55); c.quadraticCurveTo(tx, y - s * 1.1, tx + s * .6, y - s * .55); c.fill(); }
        c.fillStyle = '#c9b48a'; roundRect(c, tx - s * .55, y + s * .2, s * 1.1, s * .2, 6); c.fill();
        c.fillStyle = 'rgba(159,210,255,.5)'; c.beginPath(); c.ellipse(tx, y + s * .2, s * .5 * melt, s * .08, 0, 0, TAU); c.fill();
        const k = 1 - melt; c.fillStyle = 'rgba(220,240,255,.95)'; roundRect(c, tx - s * .3 * k, y + s * .2 - s * .6 * k, s * .6 * k, s * .6 * k, 8); c.fill();
      });
    }
    this.btns.forEach(b => drawButton(c, b, tt, '#2a3380', (g, r) => {
      g.fillStyle = '#f6f2ff'; g.strokeStyle = '#f6f2ff'; g.lineWidth = r * .1;
      if (b.id === 'float' || b.id === 'sink') { g.strokeStyle = '#5ea8ff'; g.beginPath(); g.moveTo(-r * .6, -r * .05); g.lineTo(r * .6, -r * .05); g.stroke(); g.fillStyle = '#ffc93c'; g.beginPath(); g.arc(0, b.id === 'float' ? -r * .22 : r * .42, r * .18, 0, TAU); g.fill(); }
      else if (b.id === 'a' || b.id === 'b') { g.fillStyle = 'rgba(220,240,255,.95)'; g.fillRect(-r * .3, -r * .3, r * .6, r * .6); g.fillStyle = '#ffc93c'; g.font = `800 ${r * .5}px sans-serif`; g.textAlign = 'center'; g.fillText(b.id === 'a' ? '◀' : '▶', 0, r * .75); }
      else { g.fillStyle = 'rgba(0,0,0,.6)'; const ox = { left: -r * .35, under: 0, right: r * .35 }[b.id]; g.beginPath(); g.ellipse(ox, r * .3, r * .3, r * .1, 0, 0, TAU); g.fill(); g.fillStyle = '#e8ecff'; g.fillRect(-r * .2, -r * .15, r * .4, r * .3); }
    }));
  }
}
const mix = (a, b, k) => a + (b - a) * k;
function drawThing(c, id, x, y, r) {
  c.save(); c.translate(x, y);
  if (id === 'log') { c.fillStyle = '#9a6a3a'; roundRect(c, -r * 1.3, -r * .35, r * 2.6, r * .7, r * .3); c.fill(); c.fillStyle = '#c9975f'; c.beginPath(); c.ellipse(r * 1.25, 0, r * .18, r * .33, 0, 0, TAU); c.fill(); }
  else if (id === 'pebble') { c.fillStyle = '#8c807b'; c.beginPath(); c.ellipse(0, 0, r * .28, r * .2, 0, 0, TAU); c.fill(); }
  else if (id === 'apple') { c.fillStyle = '#ff5a6e'; c.beginPath(); c.arc(0, 0, r * .55, 0, TAU); c.fill(); c.fillStyle = '#3fa34d'; c.beginPath(); c.ellipse(r * .15, -r * .62, r * .2, r * .09, -.5, 0, TAU); c.fill(); }
  else if (id === 'coin') { c.fillStyle = '#ffc93c'; c.beginPath(); c.ellipse(0, 0, r * .35, r * .35, 0, 0, TAU); c.fill(); c.strokeStyle = '#c98a1c'; c.lineWidth = 3; c.stroke(); }
  else if (id === 'duck') { c.fillStyle = '#ffd23c'; c.beginPath(); c.ellipse(0, r * .1, r * .6, r * .35, 0, 0, TAU); c.fill(); c.beginPath(); c.arc(r * .35, -r * .3, r * .25, 0, TAU); c.fill(); c.fillStyle = '#ff9a3c'; c.beginPath(); c.moveTo(r * .55, -r * .3); c.lineTo(r * .8, -r * .25); c.lineTo(r * .55, -r * .18); c.fill(); }
  else { c.strokeStyle = '#c0c7d6'; c.lineWidth = r * .14; c.beginPath(); c.arc(-r * .3, 0, r * .25, 0, TAU); c.moveTo(-r * .05, 0); c.lineTo(r * .6, 0); c.moveTo(r * .45, 0); c.lineTo(r * .45, r * .18); c.stroke(); }
  c.restore();
}

export { OBJECTS, drawThing, mix };
