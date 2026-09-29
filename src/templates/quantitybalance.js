import { chime, pop } from '../audio/audio.js';
import { say } from '../audio/speech.js';
import { TAU, clamp, rand, randInt, shuffle } from '../core/util.js';
import { drawStar, roundRect } from '../engine/art.js';
import { drawTile, hitTile, layoutTiles, makeTile, stepTiles } from '../engine/components.js';
import { sparkle } from '../engine/particles.js';
import { H, W, cx } from '../engine/stage.js';
import { Template } from '../engine/template.js';
import { SCALE } from '../engine/world.js';
import { bang, cap, num, t } from '../i18n/i18n.js';

// Quantity balance (measurement first, after Davydov): compare, then equalize, then measure with units.
//   compare:   length (antennas), height (towers), mass (a tipped pan balance), volume (fuel tanks)
//              Mass never follows size here: the heavier rock is as often the smaller one, so she
//              can't learn "big means heavy" (a misconception the council warns against).
//   equalize:  tap the shorter track / emptier tank to add one snapped unit until both match
//   unitCount: lay tiles end to end along a strip, then say how many long (half-size tiles variant)
// params: mode, attribute, items 2, ratioMin, alignedBase, maxUnits, units [min,max], unitSizes 1|2, flaw
// (flaw 'gap'/'overlap' spotting is simplified to 'none' for now; see the commit notes.)











export class QuantityBalance extends Template {
  makeRound() {
    const p = this.p;
    this.mode = p.mode || 'compare';
    this.attr = [].concat(p.attribute || 'length');
    this.attr = this.attr[Math.floor(Math.random() * this.attr.length)];
    this.tiles = []; this.placed = 0; this.tilt = 0;
    if (this.mode === 'compare') {
      const r = Math.max(p.ratioMin || 1.5, 1.2), small = rand(.3, .55), big = Math.min(.95, small * rand(r, r + .5));
      this.ans = randInt(0, 1); this.q = this.ans ? [small, big] : [big, small];
      // the transfer round breaks the easy cue: bases no longer line up
      this.offset = this.attr === 'length' && (this.transfer || p.alignedBase === false) ? [rand(0, .12), rand(0, .12)] : [0, 0];
      if (this.attr === 'mass') { this.size = [rand(.6, 1), rand(.6, 1)]; this.tilt = this.ans ? .15 : -.15; }
      this.ask(t(`tpl.qb.${{ length: 'longer', height: 'taller', mass: 'heavier', volume: 'fuller' }[this.attr]}`));
    } else if (this.mode === 'equalize') {
      const max = p.maxUnits || 8; this.n = [randInt(3, max), 0]; this.n[1] = randInt(1, this.n[0] - 1); this.short = 1;
      if (Math.random() < .5) { this.n.reverse(); this.short = 0; }
      this.ask(t(this.attr === 'volume' ? 'tpl.qb.equalizeVol' : 'tpl.qb.equalizeLen'));
    } else {
      const [lo, hi] = p.units || [3, 8]; this.L = randInt(lo, hi); this.k = p.unitSizes === 2 ? 2 : 1; this.need = this.L * this.k;
      this.ask(t('tpl.qb.unitGo'));
    }
  }
  layout() {
    this.area = { x0: W * .12, x1: W * .88, y0: Math.max(H * .27, 215), y1: H * (this.mode === 'unitCount' ? .7 : .86) };
    layoutTiles(this.tiles, W / 2, H * .86, clamp(H * .14, 80, 120), W - 48);
  }
  item(i) { // hit box of item i (two side by side, or stacked for lengths)
    const a = this.area, w = a.x1 - a.x0;
    if (this.attr === 'length' || this.mode === 'unitCount') { const h = (a.y1 - a.y0) / 2; return { x: a.x0, y: a.y0 + i * h, w, h }; }
    return { x: a.x0 + i * w / 2, y: a.y0, w: w / 2, h: a.y1 - a.y0 };
  }
  onTap(x, y) {
    if (this.tiles.length) {
      const tl = hitTile(this.tiles, x, y); if (!tl) return;
      if (tl.n === this.need) { tl.sv = 6; this.win(t('tpl.qb.unitSay', { n: num(this.need) })); }
      else { tl.wob = 1; this.miss(cap(num(tl.n)) + bang()); }
      return;
    }
    if (this.mode === 'unitCount') {
      if (this.placed >= this.need) return;
      this.placed++; chime(SCALE[Math.min(8, this.placed % 9)]); say(cap(num(this.placed)) + bang());
      if (this.placed === this.need) {
        const opts = new Set([this.need]); for (let d = 1; opts.size < 3; d++) { opts.add(this.need + d); if (opts.size < 3 && this.need - d > 0) opts.add(this.need - d); }
        this.tiles = shuffle([...opts]).map(v => makeTile(v)); this.layout(); this.ask(t('tpl.qb.unitAsk'));
      }
      return;
    }
    const i = [0, 1].find(k => { const b = this.item(k); return x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h; });
    if (i === undefined) return;
    if (this.mode === 'equalize') {
      if (i !== this.short) { this.miss(t(this.attr === 'volume' ? 'tpl.qb.equalizeVol' : 'tpl.qb.equalizeLen')); return; }
      this.n[i]++; pop(); chime(SCALE[Math.min(8, this.n[i] % 9)]);
      if (this.n[0] === this.n[1]) { const b = this.item(i); this.win(t('tpl.compare.equalDone'), b.x + b.w / 2, b.y + b.h / 2); }
      return;
    }
    const b = this.item(i);
    if (i === this.ans) { sparkle(b.x + b.w / 2, b.y + b.h / 2, 12); this.win(t(`tpl.qb.${{ length: 'longerYes', height: 'tallerYes', mass: 'heavierYes', volume: 'fullerYes' }[this.attr]}`), b.x + b.w / 2, b.y + b.h / 2); }
    else { this.wob = { i, t: 1 }; this.miss(t('tpl.qb.lookAgain')); }
  }
  step(dt) { stepTiles(this.tiles, dt); if (this.wob) { this.wob.t -= dt * 1.6; if (this.wob.t <= 0) this.wob = null; } if (this.hint) { const g = this.tiles.find(q => q.n === this.need); if (g) g.glow = 1; } }
  glowBox(c, i, tt) { if (!(this.hint && i === (this.mode === 'equalize' ? this.short : this.ans))) return; const b = this.item(i); c.save(); c.strokeStyle = `rgba(110,240,194,${.5 + .4 * Math.sin(tt * 5)})`; c.lineWidth = 5; roundRect(c, b.x + 6, b.y + 6, b.w - 12, b.h - 12, 20); c.stroke(); c.restore(); }
  render(tt) {
    const c = cx;
    for (const i of [0, 1]) {
      const b = this.item(i), wob = this.wob && this.wob.i === i ? Math.sin(tt * 28) * 6 * this.wob.t : 0;
      c.save(); c.translate(wob, 0);
      if (this.mode === 'unitCount') { if (i === 0) this.drawStrip(c, b, tt); c.restore(); continue; }
      if (this.mode === 'equalize') this.drawUnits(c, b, i, tt);
      else if (this.attr === 'length') { const L = this.q[i], x0 = b.x + this.offset[i] * b.w, len = L * b.w * .85, y = b.y + b.h / 2; c.fillStyle = i ? '#9fb4ff' : '#ff9a5c'; roundRect(c, x0, y - 12, len, 24, 12); c.fill(); c.fillStyle = '#ffc93c'; drawStar(c, x0 + len + 10, y, 18, tt); }
      else if (this.attr === 'height') { const Hh = this.q[i] * b.h * .9, x = b.x + b.w / 2; c.fillStyle = i ? '#9fb4ff' : '#ff9a5c'; roundRect(c, x - 34, b.y + b.h - Hh, 68, Hh, 14); c.fill(); c.fillStyle = '#e8ecff'; c.beginPath(); c.moveTo(x - 34, b.y + b.h - Hh + 4); c.lineTo(x, b.y + b.h - Hh - 34); c.lineTo(x + 34, b.y + b.h - Hh + 4); c.fill(); }
      else if (this.attr === 'volume') { const x = b.x + b.w / 2, th = b.h * .8, tw = Math.min(b.w * .5, 150), ty = b.y + b.h * .1; c.fillStyle = 'rgba(232,236,255,.12)'; roundRect(c, x - tw / 2, ty, tw, th, 20); c.fill(); c.save(); roundRect(c, x - tw / 2, ty, tw, th, 20); c.clip(); c.fillStyle = '#6ef0c2'; c.fillRect(x - tw / 2, ty + th * (1 - this.q[i]), tw, th * this.q[i]); c.restore(); c.lineWidth = 4; c.strokeStyle = '#e8ecff'; roundRect(c, x - tw / 2, ty, tw, th, 20); c.stroke(); }
      c.restore();
      this.glowBox(c, i, tt);
    }
    if (this.mode === 'compare' && this.attr === 'mass') this.drawBalance(c, tt);
    this.tiles.forEach(tl => drawTile(c, tl, tt));
  }
  drawBalance(c, tt) {
    const a = this.area, cxp = W / 2, top = a.y0 + (a.y1 - a.y0) * .3, arm = (a.x1 - a.x0) * .34;
    c.save(); c.fillStyle = '#6c7bd6'; roundRect(c, cxp - 12, top, 24, a.y1 - top, 8); c.fill();
    c.translate(cxp, top); c.rotate(this.tilt); c.strokeStyle = '#ffc93c'; c.lineWidth = 12; c.lineCap = 'round'; c.beginPath(); c.moveTo(-arm, 0); c.lineTo(arm, 0); c.stroke(); c.restore();
    for (const i of [0, 1]) {
      const sg = i ? 1 : -1, ex = cxp + sg * arm * Math.cos(this.tilt), ey = top + sg * arm * Math.sin(this.tilt), py = ey + 110;
      c.strokeStyle = 'rgba(255,243,176,.7)'; c.lineWidth = 3; c.beginPath(); c.moveTo(ex, ey); c.lineTo(ex - 80, py); c.moveTo(ex, ey); c.lineTo(ex + 80, py); c.stroke();
      c.strokeStyle = '#ffc93c'; c.lineWidth = 4; c.beginPath(); c.ellipse(ex, py, 96, 26, 0, 0, Math.PI); c.stroke();
      const r = 58 * this.size[i]; c.fillStyle = '#9a8f89'; c.beginPath(); c.ellipse(ex, py - r * .6, r, r * .75, 0, 0, TAU); c.fill(); c.fillStyle = '#7a706b'; c.beginPath(); c.arc(ex - r * .3, py - r * .8, r * .2, 0, TAU); c.fill();
    }
  }
  drawUnits(c, b, i, tt) {
    const n = this.n[i], max = Math.max(...this.n, 1);
    if (this.attr === 'volume') { const x = b.x + b.w / 2, th = b.h * .8, tw = Math.min(b.w * .5, 150), ty = b.y + b.h * .1, uh = th / Math.max(this.p.maxUnits || 8, max); c.lineWidth = 4; c.strokeStyle = '#e8ecff'; roundRect(c, x - tw / 2, ty, tw, th, 20); c.stroke(); for (let k = 0; k < n; k++) { c.fillStyle = k % 2 ? '#6ef0c2' : '#4fd4a8'; c.fillRect(x - tw / 2 + 6, ty + th - (k + 1) * uh, tw - 12, uh - 2); } return; }
    const uw = (b.w * .9) / Math.max(this.p.maxUnits || 8, max), y = b.y + b.h / 2;
    for (let k = 0; k < n; k++) { c.fillStyle = k % 2 ? '#ff9a5c' : '#ffb380'; roundRect(c, b.x + k * uw, y - 18, uw - 4, 36, 8); c.fill(); }
    void tt;
  }
  drawStrip(c, b, tt) {
    const y = b.y + b.h * .9, len = b.w * .9, uw = len / this.need;
    c.fillStyle = 'rgba(232,236,255,.12)'; roundRect(c, b.x, y - 34, len, 68, 12); c.fill(); c.strokeStyle = '#e8ecff'; c.lineWidth = 3; c.stroke();
    for (let k = 0; k < this.placed; k++) { c.fillStyle = k % 2 ? '#9fb4ff' : '#c7d2ff'; roundRect(c, b.x + k * uw + 2, y - 28, uw - 4, 56, 8); c.fill(); }
    if (this.placed < this.need && this.hint) { c.strokeStyle = '#6ef0c2'; c.lineWidth = 4; roundRect(c, b.x + this.placed * uw + 2, y - 28, uw - 4, 56, 8); c.stroke(); }
    void tt;
  }
}
