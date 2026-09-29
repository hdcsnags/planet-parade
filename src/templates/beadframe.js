import { chime } from '../audio/audio.js';
import { say } from '../audio/speech.js';
import { TAU, clamp, randInt, shuffle } from '../core/util.js';
import { roundRect } from '../engine/art.js';
import { drawTile, hitTile, layoutTiles, makeTile, stepTiles } from '../engine/components.js';
import { sparkle } from '../engine/particles.js';
import { H, W, cx } from '../engine/stage.js';
import { Template } from '../engine/template.js';
import { after } from '../engine/timers.js';
import { SCALE } from '../engine/world.js';
import { bang, cap, num, t } from '../i18n/i18n.js';

// Bead frame (rekenrek / soroban idea): two rows of five beads with a colour change at five.
// Tapping a bead slides it AND every bead before it on that row to the left (or back to the right).
// build:      "Show 7!" (one full row and two); the count is spoken as she slides
// complement: 7 is already shown; "How many more make ten?" → tiles, then the rest slide over
// params: rows 1|2, perRow 5, target [min,max], mode 'build'|'complement', fiveColour, choices












export class BeadFrame extends Template {
  makeRound() {
    const p = this.p; this.rows = p.rows || 2; this.per = p.perRow || 5;
    const total = this.rows * this.per, [lo, hi] = p.target || [1, total];
    this.target = randInt(lo, Math.min(hi, total));
    this.left = Array.from({ length: this.rows }, () => 0); // beads slid left, per row
    this.tiles = []; this.anim = [];
    if (p.mode === 'complement') {
      this.target = randInt(Math.max(lo, 1), Math.min(hi, total - 1));
      this.setCount(this.target);
      this.answer = total - this.target;
      const opts = new Set([this.answer]);
      for (let d = 1; opts.size < (p.choices || 3); d++) { if (this.answer + d <= total) opts.add(this.answer + d); if (opts.size < (p.choices || 3) && this.answer - d >= 0) opts.add(this.answer - d); }
      this.tiles = shuffle([...opts]).map(v => makeTile(v));
      this.ask(t('tpl.beads.complement', { a: cap(num(this.target)), z: num(total) }));
    } else this.ask(t('tpl.beads.build', { a: num(this.target) }));
  }
  setCount(n) { for (let r = 0; r < this.rows; r++) { this.left[r] = Math.max(0, Math.min(this.per, n - r * this.per)); } }
  get count() { return this.left.reduce((a, b) => a + b, 0); }
  layout() {
    const top = Math.max(H * .28, 215), bottom = this.tiles.length ? H * .68 : H * .86;
    this.fw = Math.min(W - 64, 860); this.fx = W / 2 - this.fw / 2;
    this.rowH = Math.min((bottom - top) / this.rows, 130); this.fy = top + ((bottom - top) - this.rowH * this.rows) / 2;
    this.br = Math.min(this.rowH * .36, this.fw / (this.per * 2 + 6) * .95);
    layoutTiles(this.tiles, W / 2, H * .85, clamp(H * .15, 84, 130), W - 48);
  }
  beadX(r, i) { // left-parked beads pack from the left edge; the rest wait on the right
    const onLeft = i < this.left[r], d = this.br * 2.1;
    return onLeft ? this.fx + this.br * 1.6 + i * d : this.fx + this.fw - this.br * 1.6 - (this.per - 1 - i) * d;
  }
  rowY(r) { return this.fy + (r + .5) * this.rowH; }
  onTap(x, y) {
    if (this.tiles.length) {
      const tl = hitTile(this.tiles, x, y); if (!tl) return;
      if (tl.n === this.answer) {
        tl.sv = 6;
        const total = this.rows * this.per;
        for (let k = this.count; k < total; k++) after((k - this.count) * .12, () => { this.setCount(k + 1); chime(SCALE[Math.min(8, (k % 8) + 1)]); });
        this.win(t('tpl.beads.compSay', { a: cap(num(this.target)), b: num(this.answer), z: num(total) }));
      } else { tl.wob = 1; this.miss(cap(num(tl.n)) + bang()); }
      return;
    }
    // which bead? tap near a row: slide that bead and every bead before it (or back)
    for (let r = 0; r < this.rows; r++) {
      if (Math.abs(y - this.rowY(r)) > this.rowH * .5) continue;
      let best = -1, bd = 1e9;
      for (let i = 0; i < this.per; i++) { const d = Math.abs(x - this.beadX(r, i)); if (d < bd) { bd = d; best = i; } }
      if (best < 0 || bd > this.br * 1.6) return;
      if (best < this.left[r]) this.left[r] = best; else this.left[r] = best + 1;
      // the second row only counts once the first is full (rekenrek habit); if not, fill row one first
      if (r > 0 && this.left[0] < this.per && this.left[r] > 0) { this.left[0] = this.per; }
      const n = this.count; chime(SCALE[Math.min(8, n % 9)]); sparkle(this.beadX(r, Math.max(0, this.left[r] - 1)), this.rowY(r), 5);
      if (n === this.target) this.win(this.fiveAnd(n));
      else say(cap(num(n)) + bang());
      return;
    }
  }
  fiveAnd(n) { return n > 5 && n < 10 ? t('tpl.beads.fiveAnd', { b: num(n - 5), n: num(n) }) : n === 10 ? t('tpl.beads.ten') : t('countYes', { a: num(n) }); }
  step(dt) { stepTiles(this.tiles, dt); if (this.hint) { const g = this.tiles.find(q => q.n === this.answer); if (g) g.glow = 1; } }
  render(tt) {
    const c = cx;
    c.save();
    c.fillStyle = 'rgba(22,29,79,.9)'; roundRect(c, this.fx - 16, this.fy - 16, this.fw + 32, this.rowH * this.rows + 32, 22); c.fill();
    c.lineWidth = 6; c.strokeStyle = '#c9b48a'; c.stroke();
    for (let r = 0; r < this.rows; r++) {
      const y = this.rowY(r);
      c.strokeStyle = 'rgba(232,236,255,.7)'; c.lineWidth = 4; c.beginPath(); c.moveTo(this.fx, y); c.lineTo(this.fx + this.fw, y); c.stroke();
      for (let i = 0; i < this.per; i++) {
        const x = this.beadX(r, i), five = this.p.fiveColour !== false && r % 2 === 1;
        const g = c.createRadialGradient(x - this.br * .3, y - this.br * .35, this.br * .1, x, y, this.br);
        if (five) { g.addColorStop(0, '#cfe3ff'); g.addColorStop(1, '#2b5fc0'); } else { g.addColorStop(0, '#ffd1e6'); g.addColorStop(1, '#c2407a'); }
        c.fillStyle = g; c.beginPath(); c.arc(x, y, this.br, 0, TAU); c.fill();
        if (this.hint && !this.tiles.length) { const want = Math.max(0, Math.min(this.per, this.target - r * this.per)); if (i === want - 1 && this.left[r] !== want) { c.strokeStyle = '#6ef0c2'; c.lineWidth = 4; c.stroke(); } }
      }
    }
    c.restore();
    this.tiles.forEach(tl => drawTile(c, tl, tt, { dots: true }));
  }
}
