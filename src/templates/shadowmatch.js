import { pop } from '../audio/audio.js';
import { TAU, ease, pick, rand, shuffle } from '../core/util.js';
import { drawPlanet, drawRocket, roundRect } from '../engine/art.js';
import { sparkle } from '../engine/particles.js';
import { H, W, cx } from '../engine/stage.js';
import { Template } from '../engine/template.js';
import { PLANETS } from '../engine/world.js';
import { lookup, t } from '../i18n/i18n.js';

// Shadow match: shapes and solids.
//   outline: a shaped pod waits at the top; tap the bay (outline) with the same shape
//   named:   "Find the triangle!" among three, rotated and non-prototypical (thin triangles,
//            sideways points, long rectangles) so she learns the idea, not one picture
//   views:   "Find the cone!" among solids; the transfer round shows a real thing (planet, crate,
//            fuel can, rocket nose) and asks which solid it is
// params: mode 'outline'|'named'|'views', shapes [...], solids [...], rotate [min,max], nonPrototypical, choices









const REAL = { sphere: 'planet', cube: 'crate', cylinder: 'can', cone: 'nose' };
export class ShadowMatch extends Template {
  makeRound() {
    const p = this.p; this.mode = p.mode || 'outline';
    const pool = this.mode === 'views' ? [].concat(p.solids || ['sphere', 'cube', 'cylinder', 'cone']) : [].concat(p.shapes || ['circle', 'square', 'triangle']);
    this.target = pick(pool);
    const others = shuffle(pool.filter(s => s !== this.target)).slice(0, (p.choices || 3) - 1);
    const [r0, r1] = p.rotate || [0, 0];
    this.opts = shuffle([this.target, ...others]).map(id => ({ id, rot: rand(r0, r1) * Math.PI / 180, skew: p.nonPrototypical ? rand(-.35, .35) : 0, wob: 0 }));
    this.fly = null; this.done = false;
    this.real = this.mode === 'views' && this.transfer ? REAL[this.target] : null;
    const name = lookup(`tpl.shape.names.${this.target}`);
    if (this.mode === 'outline') this.ask(t('tpl.shape.outline'));
    else if (this.real) this.ask(t('tpl.shape.whichSolid'));
    else this.ask(t('tpl.shape.find', { s: name }));
  }
  layout() {
    const n = this.opts.length, cw = Math.min((W - 64) / n, 260);
    this.opts.forEach((o, i) => { o.x = W / 2 + (i - (n - 1) / 2) * cw; o.y = this.mode === 'outline' ? H * .74 : Math.max(H * .56, 380); o.r = Math.min(cw * .32, 90); });
    this.pod = { x: W / 2, y: Math.max(H * .4, 300), r: this.opts[0] ? this.opts[0].r * .85 : 60 };
  }
  onTap(x, y) {
    if (this.fly || this.done) return;
    const o = this.opts.find(q => Math.hypot(x - q.x, y - q.y) < Math.max(q.r * 1.3, 56));
    if (!o) return;
    if (o.id === this.target) {
      pop(); sparkle(o.x, o.y, 14);
      if (this.mode === 'outline') { this.fly = { to: o, t: 0 }; return; }
      this.done = true; this.win(t('tpl.shape.yes', { s: lookup(`tpl.shape.names.${o.id}`) }), o.x, o.y);
    } else { o.wob = 1; this.miss(t('tpl.shape.thats', { s: lookup(`tpl.shape.names.${o.id}`) })); }
  }
  step(dt) {
    this.opts.forEach(o => { o.wob = Math.max(0, o.wob - dt * 1.6); });
    if (this.fly) { this.fly.t += dt / .6; if (this.fly.t >= 1) { const o = this.fly.to; this.fly = null; this.done = true; this.win(t('tpl.shape.fits'), o.x, o.y); } }
  }
  render(tt) {
    const c = cx;
    this.opts.forEach(o => {
      c.save(); c.translate(o.x, o.y); c.rotate(o.rot + Math.sin(tt * 28) * .12 * o.wob);
      const hint = this.hint && o.id === this.target;
      if (this.mode === 'outline') { c.setLineDash([10, 8]); c.lineWidth = 6; c.strokeStyle = hint ? `rgba(110,240,194,${.6 + .4 * Math.sin(tt * 5)})` : 'rgba(255,255,255,.6)'; shapePath(c, o.id, o.r, 0); c.stroke(); }
      else if (this.mode === 'views') { if (hint) { c.fillStyle = 'rgba(110,240,194,.2)'; c.beginPath(); c.arc(0, 0, o.r * 1.4, 0, TAU); c.fill(); } drawSolid(c, o.id, o.r); }
      else { if (hint) { c.shadowColor = 'rgba(110,240,194,.95)'; c.shadowBlur = 24; } c.fillStyle = ['#ff7eb6', '#5ea8ff', '#ffc93c', '#6ef0c2'][this.opts.indexOf(o) % 4]; shapePath(c, o.id, o.r, o.skew); c.fill(); }
      c.restore();
    });
    // outline mode: the pod that must be parked; views transfer: the real thing to name
    if (this.mode === 'outline' && !this.done) {
      let { x, y } = this.pod;
      if (this.fly) { const e = ease(Math.min(1, this.fly.t)); x += (this.fly.to.x - x) * e; y += (this.fly.to.y - y) * e - Math.sin(e * Math.PI) * 60; }
      c.save(); c.translate(x, y); c.fillStyle = '#ffc93c'; shapePath(c, this.target, this.pod.r, 0); c.fill(); c.lineWidth = 4; c.strokeStyle = '#fff3b0'; c.stroke(); c.restore();
    } else if (this.mode === 'outline') { const o = this.opts.find(q => q.id === this.target); c.save(); c.translate(o.x, o.y); c.fillStyle = '#ffc93c'; shapePath(c, this.target, o.r * .95, 0); c.fill(); c.restore(); }
    if (this.real) drawReal(c, this.real, this.pod.x, this.pod.y, this.pod.r, tt);
  }
}
function shapePath(c, id, r, skew) {
  c.beginPath();
  if (id === 'circle') c.arc(0, 0, r, 0, TAU);
  else if (id === 'square') roundRect(c, -r * .85, -r * .85, r * 1.7, r * 1.7, 8);
  else if (id === 'rectangle') roundRect(c, -r * 1.15, -r * .6, r * 2.3, r * 1.2, 8);
  else { c.moveTo(-r + skew * r, r * .8); c.lineTo(r, r * .8); c.lineTo(skew * r * 1.6, -r * .95); c.closePath(); }
}
function drawSolid(c, id, r) {
  c.lineWidth = 3; c.strokeStyle = 'rgba(255,255,255,.7)';
  if (id === 'sphere') { const g = c.createRadialGradient(-r * .3, -r * .35, r * .1, 0, 0, r); g.addColorStop(0, '#cfe3ff'); g.addColorStop(1, '#2b5fc0'); c.fillStyle = g; c.beginPath(); c.arc(0, 0, r * .9, 0, TAU); c.fill(); }
  else if (id === 'cube') { const s = r * .75, d = r * .35; c.fillStyle = '#ff7eb6'; c.fillRect(-s, -s + d, s * 1.6, s * 1.6); c.fillStyle = '#ffb3d3'; c.beginPath(); c.moveTo(-s, -s + d); c.lineTo(-s + d, -s); c.lineTo(s * .6 + d, -s); c.lineTo(s * .6, -s + d); c.closePath(); c.fill(); c.fillStyle = '#c2407a'; c.beginPath(); c.moveTo(s * .6, -s + d); c.lineTo(s * .6 + d, -s); c.lineTo(s * .6 + d, s * .6); c.lineTo(s * .6, s * .6 + d); c.closePath(); c.fill(); }
  else if (id === 'cylinder') { const w = r * .7, h = r * 1.5; c.fillStyle = '#ffc93c'; c.fillRect(-w, -h / 2, w * 2, h); c.beginPath(); c.ellipse(0, h / 2, w, w * .3, 0, 0, Math.PI); c.fill(); c.fillStyle = '#fff3b0'; c.beginPath(); c.ellipse(0, -h / 2, w, w * .3, 0, 0, TAU); c.fill(); }
  else { const w = r * .8, h = r * 1.6; c.fillStyle = '#6ef0c2'; c.beginPath(); c.moveTo(0, -h / 2); c.lineTo(w, h / 2); c.ellipse(0, h / 2, w, w * .3, 0, 0, Math.PI); c.lineTo(-w, h / 2); c.closePath(); c.fill(); }
}
function drawReal(c, kind, x, y, r, tt) {
  if (kind === 'planet') drawPlanet(c, PLANETS[2], x, y, r * .9, tt, {});
  else if (kind === 'crate') { c.fillStyle = '#c9b48a'; roundRect(c, x - r * .8, y - r * .8, r * 1.6, r * 1.6, 6); c.fill(); c.strokeStyle = '#8a7650'; c.lineWidth = 5; c.beginPath(); c.moveTo(x - r * .8, y - r * .8); c.lineTo(x + r * .8, y + r * .8); c.moveTo(x + r * .8, y - r * .8); c.lineTo(x - r * .8, y + r * .8); c.stroke(); }
  else if (kind === 'can') { c.fillStyle = '#e8ecff'; c.fillRect(x - r * .55, y - r * .8, r * 1.1, r * 1.6); c.fillStyle = '#ff5a6e'; c.fillRect(x - r * .55, y - r * .2, r * 1.1, r * .4); c.fillStyle = '#fff'; c.beginPath(); c.ellipse(x, y - r * .8, r * .55, r * .16, 0, 0, TAU); c.fill(); }
  else drawRocket(c, x, y + r * .5, r * 1.3, -Math.PI / 2, tt, 0);
}

export { REAL, drawReal, drawSolid, shapePath };
