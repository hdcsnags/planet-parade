import { settings } from '../core/settings.js';
import { TAU, clamp, rand, reduced } from '../core/util.js';
import { drawPlanet, drawSun } from './art.js';
import { T, camX, pointer } from './stage.js';

/* ---------- a planet on stage: springy, blinking, curious ---------- */
function spring(o, dt) { o.sv += (-160 * (o.scale - 1) - 11 * o.sv) * dt; o.scale += o.sv * dt; }
class Body {
  constructor(p, x, y, R) {
    Object.assign(this, { p, x, y, R, tx: x, ty: y, scale: 1, sv: 0, wob: 0, happy: 0, glow: 0, blinkT: rand(1, 4), blink: 1, phase: rand(0, TAU), alpha: 1, fly: null });
    this.isSun = p.id === 'sun';
  }
  bounce(power = 4) { this.sv += power; this.happy = 1.4; }
  wiggle() { this.wob = 1; }
  update(dt) {
    spring(this, dt);
    this.wob = Math.max(0, this.wob - dt * 1.6);
    this.happy = Math.max(0, this.happy - dt);
    this.blinkT -= dt;
    if (this.blinkT < 0) { this.blink = Math.max(0, this.blink - dt * 14); if (this.blink <= 0) this.blinkT = rand(2, 5.5); }
    else this.blink = Math.min(1, this.blink + dt * 10);
    if (!this.fly) { const k = Math.min(1, dt * 5); this.x += (this.tx - this.x) * k; this.y += (this.ty - this.y) * k; }
  }
  hit(x, y) {
    const r = Math.max(this.R * this.scale * (this.isSun ? 1 : 1.2), 46) * (this.p.wf > 1.5 ? 1.3 : 1);
    return Math.hypot(x - this.x, y - this.y) < r;
  }
  draw(c, t) {
    if (this.alpha <= .01) return;
    const bob = (reduced || this.fly) ? 0 : Math.sin(t * 1.4 + this.phase) * this.R * .05;
    const x = this.x, y = this.y + bob;
    if (this.glow > 0) {
      const pulse = .55 + .45 * Math.sin(t * 5), gr = c.createRadialGradient(x, y, this.R * .9, x, y, this.R * 1.8);
      gr.addColorStop(0, `rgba(110,240,194,${.6 * pulse})`); gr.addColorStop(1, 'rgba(110,240,194,0)');
      c.fillStyle = gr; c.beginPath(); c.arc(x, y, this.R * 1.8, 0, TAU); c.fill();
    }
    let look;
    if (T - pointer.t > 4) look = { x: Math.sin(t * .5 + this.phase) * .5, y: Math.cos(t * .37 + this.phase) * .3 };
    else { const dx = pointer.x + camX - x, dy = pointer.y - y, d = Math.hypot(dx, dy) || 1, m = Math.min(1, d / (this.R * 2.5)); look = { x: dx / d * m, y: dy / d * m }; }
    const s = Math.max(.001, this.scale), sq = clamp(this.sv * .02, -.15, .15);
    const o = { face: settings.faces && this.R > 9, look, blink: this.sleep ? 0 : this.blink, yawn: this.yawn > 0, happy: this.happy > 0 && !this.sleep, sx: s * (1 + sq), sy: s * (1 - sq), rot: Math.sin(t * 28) * .16 * this.wob };
    c.save(); c.globalAlpha = this.alpha;
    if (this.isSun) drawSun(c, x, y, this.R, t, o); else drawPlanet(c, this.p, x, y, this.R, t, o);
    c.restore();
  }
}

export { Body, spring };
