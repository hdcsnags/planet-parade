import { chime, pop } from '../audio/audio.js';
import { clamp, shuffle } from '../core/util.js';
import { drawRocket, drawWordArt } from '../engine/art.js';
import { sparkle } from '../engine/particles.js';
import { H, W, cx } from '../engine/stage.js';
import { Template } from '../engine/template.js';
import { SCALE } from '../engine/world.js';
import { LANG, t } from '../i18n/i18n.js';

// Line up by size: three rockets (or stars) to put in order, shortest → tallest (or smallest →
// biggest). She taps them in order; each slides into the next place. The line follows reading
// order: left-to-right, right-to-left in Farsi.
// params: count 2–4, attribute 'length'|'size', minRatio









export class LineUp extends Template {
  makeRound() {
    const p = this.p, n = p.count || 3, r = p.minRatio || 1.25;
    this.attr = p.attribute === 'size' ? 'size' : 'length';
    const sizes = Array.from({ length: n }, (_, i) => Math.pow(r + .1, i)).map(v => v / Math.pow(r + .1, n - 1));
    this.items = shuffle(sizes.map((k, i) => ({ k, rank: i, placed: -1, wob: 0 })));
    this.next = 0;
    this.ask(t(this.attr === 'size' ? 'tpl.lineup.size' : 'tpl.lineup.length'));
  }
  layout() {
    const n = this.items.length, cw = Math.min((W - 64) / n, 260);
    this.items.forEach((o, i) => { o.hx = W / 2 + (i - (n - 1) / 2) * cw; o.hy = Math.max(H * .4, 300); });
    this.slotX = i => W / 2 + (LANG === 'fa' ? -1 : 1) * (i - (n - 1) / 2) * cw;
    this.slotY = H * .8; this.u = clamp(Math.min(cw, H * .3) * .9, 80, 200);
  }
  onTap(x, y) {
    const o = this.items.find(q => q.placed < 0 && Math.abs(x - q.hx) < this.u * .45 && Math.abs(y - q.hy) < this.u * .6);
    if (!o) return;
    if (o.rank === this.next) {
      o.placed = this.next++; pop(); chime(SCALE[this.next + 2]); sparkle(this.slotX(o.placed), this.slotY, 8);
      if (this.next === this.items.length) this.win(t(this.attr === 'size' ? 'tpl.lineup.sizeDone' : 'tpl.lineup.lengthDone'), W / 2, this.slotY);
      else this.ask(t('tpl.lineup.next'));
    } else { o.wob = 1; this.miss(t(this.attr === 'size' ? 'tpl.lineup.size' : 'tpl.lineup.length')); }
  }
  step(dt) { this.items.forEach(o => { o.wob = Math.max(0, o.wob - dt * 1.6); }); }
  render(tt) {
    const c = cx;
    c.strokeStyle = 'rgba(159,180,255,.3)'; c.lineWidth = 4; c.beginPath(); c.moveTo(W * .15, this.slotY + this.u * .5); c.lineTo(W * .85, this.slotY + this.u * .5); c.stroke();
    this.items.forEach(o => {
      const x = o.placed >= 0 ? this.slotX(o.placed) : o.hx, yBase = o.placed >= 0 ? this.slotY : o.hy;
      c.save(); c.translate(x, yBase); c.rotate(Math.sin(tt * 28) * .1 * o.wob);
      if (this.hint && o.placed < 0 && o.rank === this.next) { c.shadowColor = 'rgba(110,240,194,.95)'; c.shadowBlur = 24; }
      if (this.attr === 'length') { const h = this.u * o.k; drawRocket(c, 0, this.u * .5 - h * .5, h * .55, -Math.PI / 2, tt, 0); }
      else drawWordArt(c, 'star', 0, 0, this.u * .45 * o.k, tt);
      c.restore();
    });
  }
}
