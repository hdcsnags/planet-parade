import { pop } from '../audio/audio.js';
import { TAU, clamp, pick, rand, randInt, shuffle } from '../core/util.js';
import { roundRect } from '../engine/art.js';
import { drawButton, drawTile, hitButton, hitTile, layoutTiles, makeButton, makeTile, stepTiles } from '../engine/components.js';
import { H, W, cx } from '../engine/stage.js';
import { Template } from '../engine/template.js';
import { after } from '../engine/timers.js';
import { num, t } from '../i18n/i18n.js';

// Subitizing: a small structured collection of lights glows, then a dome covers it; she picks how
// many. "Peek" shows it again any time (unlimited, no penalty), and nothing is timed: peekMs is how
// long the lights stay uncovered, never a response timer (CURRICULUM.md: no speed tests).
// params: n [min,max], arrangement [dice|line|scatter|fiveFrame|tenFrame|dicePair], peekMs, replay,
//         choices, sayAs 'plain'|'fiveAnd'









const DICE = { 1: [[0, 0]], 2: [[-1, -1], [1, 1]], 3: [[-1, -1], [0, 0], [1, 1]], 4: [[-1, -1], [1, -1], [-1, 1], [1, 1]], 5: [[-1, -1], [1, -1], [0, 0], [-1, 1], [1, 1]], 6: [[-1, -1], [1, -1], [-1, 0], [1, 0], [-1, 1], [1, 1]] };
export class Subitize extends Template {
  makeRound() {
    const p = this.p, [lo, hi] = p.n || [1, 4];
    this.n = randInt(lo, hi);
    let arr = [].concat(p.arrangement || ['dice']);
    if (this.transfer && arr.length > 1) arr = arr.slice(1); // transfer: a different arrangement
    // only arrangements that can show n: a die holds up to 6, a five-frame 5, a ten-frame 10, a pair of dice 2–11
    const fits = { dice: this.n <= 6, fiveFrame: this.n <= 5, tenFrame: this.n <= 10, dicePair: this.n >= 2 && this.n <= 11, line: true, scatter: true };
    const ok = arr.filter(a => fits[a]);
    this.arr = ok.length ? pick(ok) : (this.n <= 10 ? 'tenFrame' : 'line');
    this.points = this.makePoints();
    this.covered = false;
    const opts = new Set([this.n]);
    for (let d = 1; opts.size < (p.choices || 2); d++) { if (this.n + d <= Math.max(hi, this.n + 1)) opts.add(this.n + d); if (opts.size < (p.choices || 2) && this.n - d >= 1) opts.add(this.n - d); }
    this.tiles = shuffle([...opts]).map(v => makeTile(v));
    this.peekBtn = makeButton('peek');
    this.ask(t('tpl.subitize.watch'), () => this.cover());
    this.hideTimer = after((p.peekMs || 2000) / 1000 + 1.2, () => this.cover());
  }
  cover() { if (this.covered || this.busy) return; this.covered = true; pop(); this.ask(t('tpl.subitize.ask')); }
  makePoints() {
    const n = this.n, a = this.arr;
    if (a === 'dice') return DICE[n].map(([x, y]) => [x * .55, y * .55]);
    if (a === 'dicePair') { const l = Math.min(5, n - 1), r = n - l; return [...DICE[l].map(([x, y]) => [-1.05 + x * .38, y * .38]), ...DICE[r].map(([x, y]) => [1.05 + x * .38, y * .38])]; }
    if (a === 'fiveFrame' || a === 'tenFrame') return Array.from({ length: n }, (_, i) => [(-2 + (i % 5)) * .42, (Math.floor(i / 5) - (n > 5 ? .5 : 0)) * .5]);
    if (a === 'line') return Array.from({ length: n }, (_, i) => [(i - (n - 1) / 2) * Math.min(.42, 2.2 / n), 0]);
    const pts = []; // scatter, never overlapping
    for (let tries = 0; pts.length < n && tries < 500; tries++) { const q = [rand(-1, 1), rand(-.6, .6)]; if (pts.every(o => Math.hypot(o[0] - q[0], o[1] - q[1]) > .38)) pts.push(q); }
    return pts;
  }
  layout() {
    this.box = { x: W / 2, y: Math.max(H * .44, 320), w: Math.min(W * .62, 560), h: Math.min(H * .34, 250) };
    layoutTiles(this.tiles, W / 2, H * .85, clamp(H * .15, 84, 130), W - 180);
    this.peekBtn.r = clamp(Math.min(W, H) * .06, 34, 48); this.peekBtn.x = W - 24 - this.peekBtn.r; this.peekBtn.y = H * .85;
  }
  onTap(x, y) {
    if (this.p.replay !== false && hitButton([this.peekBtn], x, y)) {
      // peek again: uncover for a moment (replaying is never a penalty)
      this.covered = false; this.peekBtn.sv = 4; pop();
      after((this.p.peekMs || 2000) / 1000, () => { if (!this.busy) this.covered = true; });
      return;
    }
    const tl = hitTile(this.tiles, x, y); if (!tl) return;
    if (tl.n === this.n) {
      tl.sv = 6; this.covered = false;
      const five = this.p.sayAs === 'fiveAnd' && this.n > 5;
      this.win(five ? t('tpl.beads.fiveAnd', { b: num(this.n - 5), n: num(this.n) }) : t('countYes', { a: num(this.n) }));
    } else { tl.wob = 1; this.miss(t('tpl.subitize.peekHint')); }
  }
  explain() { this.covered = false; this.together(this.n); } // uncover for good and count the lights together
  step(dt) { stepTiles(this.tiles, dt); if (this.hint) { const g = this.tiles.find(q => q.n === this.n); if (g) g.glow = 1; } this.peekBtn.sv += (-160 * (this.peekBtn.scale - 1) - 11 * this.peekBtn.sv) * dt; this.peekBtn.scale += this.peekBtn.sv * dt; }
  render(tt) {
    const c = cx, b = this.box, u = Math.min(b.w / 2.6, b.h / 1.5);
    c.save();
    c.fillStyle = 'rgba(22,29,79,.92)'; roundRect(c, b.x - b.w / 2, b.y - b.h / 2, b.w, b.h, 26); c.fill();
    if (this.arr === 'fiveFrame' || this.arr === 'tenFrame') {
      const rows = this.arr === 'tenFrame' || this.n > 5 ? 2 : 1;
      c.strokeStyle = 'rgba(159,180,255,.5)'; c.lineWidth = 2;
      for (let r = 0; r < rows; r++) for (let i = 0; i < 5; i++) { const cx0 = b.x + (-2 + i) * .42 * u, cy0 = b.y + (r - (rows === 2 ? .5 : 0)) * .5 * u; c.strokeRect(cx0 - .2 * u, cy0 - .23 * u, .4 * u, .46 * u); }
    }
    if (this.arr === 'dicePair') for (const sx of [-1.05, 1.05]) { c.fillStyle = 'rgba(255,255,255,.08)'; roundRect(c, b.x + (sx - .6) * u, b.y - .6 * u, 1.2 * u, 1.2 * u, 16); c.fill(); }
    if (!this.covered) {
      for (const [px, py] of this.points) {
        const x = b.x + px * u, y = b.y + py * u, r = u * .14;
        const g = c.createRadialGradient(x, y, 1, x, y, r * 2.2); g.addColorStop(0, 'rgba(255,243,176,1)'); g.addColorStop(.45, 'rgba(255,201,60,.9)'); g.addColorStop(1, 'rgba(255,201,60,0)');
        c.fillStyle = g; c.beginPath(); c.arc(x, y, r * 2.2, 0, TAU); c.fill();
      }
    } else {
      const g = c.createLinearGradient(0, b.y - b.h / 2, 0, b.y + b.h / 2); g.addColorStop(0, '#e8ecff'); g.addColorStop(1, '#8f9bd6');
      c.fillStyle = g; c.beginPath(); c.ellipse(b.x, b.y + b.h * .45, b.w * .48, b.h * .9, 0, Math.PI, TAU); c.fill();
      c.fillStyle = 'rgba(255,255,255,.5)'; c.beginPath(); c.ellipse(b.x - b.w * .18, b.y - b.h * .1, b.w * .05, b.h * .16, -.4, 0, TAU); c.fill();
    }
    c.restore();
    this.tiles.forEach(tl => drawTile(c, tl, tt, { dots: this.p.sayAs !== 'fiveAnd' || tl.n <= 5, label: this.p.sayAs === 'fiveAnd' ? null : '' }));
    drawButton(c, this.peekBtn, tt, '#2a3380', (g2, r) => {
      g2.strokeStyle = '#f6f2ff'; g2.lineWidth = r * .12; g2.beginPath(); g2.ellipse(0, 0, r * .6, r * .34, 0, 0, TAU); g2.stroke();
      g2.fillStyle = '#f6f2ff'; g2.beginPath(); g2.arc(0, 0, r * .16, 0, TAU); g2.fill();
    });
  }
}

export { DICE };
