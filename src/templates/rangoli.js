import { chime } from '../audio/audio.js';
import { TAU, pick, randInt, shuffle } from '../core/util.js';
import { drawStar } from '../engine/art.js';
import { sparkle } from '../engine/particles.js';
import { H, W, cx } from '../engine/stage.js';
import { Template } from '../engine/template.js';
import { SCALE } from '../engine/world.js';
import { t } from '../i18n/i18n.js';

// Rangoli / kolam mirror (dot-grid symmetry): one wing of a pattern glows; she lights the dots on the
// other side of the mirror line so both wings match. A dot that isn't anyone's twin just blinks and
// goes out ("find its twin"); nothing is lost.
// params: mode 'mirror', grid [cols, rows] (odd), dots, axis 'vertical'|'horizontal'









export class Rangoli extends Template {
  makeRound() {
    const [cols, rows] = this.p.grid || [5, 5];
    this.cols = cols; this.rows = rows; this.axis = this.p.axis || pick(['vertical', 'horizontal']);
    const mid = this.axis === 'vertical' ? (cols - 1) / 2 : (rows - 1) / 2;
    const cells = [];
    for (let y = 0; y < rows; y++) for (let x = 0; x < cols; x++) {
      const k = this.axis === 'vertical' ? x : y;
      if (k < mid) cells.push([x, y]);
    }
    this.given = shuffle(cells).slice(0, randInt(3, Math.min(6, cells.length)));
    this.mirror = ([x, y]) => this.axis === 'vertical' ? [cols - 1 - x, y] : [x, rows - 1 - y];
    this.need = this.given.map(this.mirror);
    this.lit = new Set(); this.blink = null;
    this.ask(t('tpl.rangoli.go'));
  }
  key(x, y) { return `${x},${y}`; }
  layout() {
    const top = Math.max(H * .25, 200), bottom = H - 40, cs = Math.min((W - 80) / this.cols, (bottom - top) / this.rows, 110);
    this.cs = cs; this.gx = W / 2 - (this.cols - 1) * cs / 2; this.gy = top + ((bottom - top) - (this.rows - 1) * cs) / 2;
  }
  pos(x, y) { return [this.gx + x * this.cs, this.gy + y * this.cs]; }
  onTap(px, py) {
    const x = Math.round((px - this.gx) / this.cs), y = Math.round((py - this.gy) / this.cs);
    if (x < 0 || y < 0 || x >= this.cols || y >= this.rows) return;
    const [cxp, cyp] = this.pos(x, y); if (Math.hypot(px - cxp, py - cyp) > this.cs * .45) return;
    const k = this.key(x, y);
    if (this.given.some(g => this.key(...g) === k) || this.lit.has(k)) return;
    if (this.need.some(n => this.key(...n) === k)) {
      this.lit.add(k); chime(SCALE[Math.min(8, this.lit.size + 2)]); sparkle(cxp, cyp, 8);
      if (this.lit.size === this.need.length) this.win(t('tpl.rangoli.done'), W / 2, this.gy + this.cs * (this.rows - 1) / 2);
    } else { this.blink = { k, t: 1 }; this.miss(t('tpl.rangoli.twin')); }
  }
  step(dt) { if (this.blink) { this.blink.t -= dt * 1.4; if (this.blink.t <= 0) this.blink = null; } }
  render(tt) {
    const c = cx, cs = this.cs;
    // the mirror line
    c.save(); c.setLineDash([10, 10]); c.strokeStyle = 'rgba(110,240,194,.6)'; c.lineWidth = 3; c.beginPath();
    if (this.axis === 'vertical') { const x = this.gx + (this.cols - 1) / 2 * cs; c.moveTo(x, this.gy - cs * .6); c.lineTo(x, this.gy + (this.rows - .4) * cs); }
    else { const y = this.gy + (this.rows - 1) / 2 * cs; c.moveTo(this.gx - cs * .6, y); c.lineTo(this.gx + (this.cols - .4) * cs, y); }
    c.stroke(); c.restore();
    const nextNeed = this.need.find(n => !this.lit.has(this.key(...n)));
    for (let y = 0; y < this.rows; y++) for (let x = 0; x < this.cols; x++) {
      const [px, py] = this.pos(x, y), k = this.key(x, y);
      const given = this.given.some(g => this.key(...g) === k), on = this.lit.has(k), blink = this.blink && this.blink.k === k;
      if (given || on) { c.fillStyle = given ? '#ff7eb6' : '#ffc93c'; drawStar(c, px, py, cs * .28, tt * .2); }
      else {
        c.fillStyle = blink ? `rgba(255,126,182,${this.blink.t})` : 'rgba(255,255,255,.35)'; c.beginPath(); c.arc(px, py, cs * .08 + (blink ? cs * .1 : 0), 0, TAU); c.fill();
        if (this.hint && nextNeed && this.key(...nextNeed) === k) { c.strokeStyle = `rgba(110,240,194,${.6 + .4 * Math.sin(tt * 5)})`; c.lineWidth = 4; c.beginPath(); c.arc(px, py, cs * .3, 0, TAU); c.stroke(); }
      }
    }
  }
}
